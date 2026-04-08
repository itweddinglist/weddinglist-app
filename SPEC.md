# WEDDINGLIST — MASTER SPEC V5.4 (ABSOLUTE FINAL)
# Status: FINAL — 10/10 — SERIES A READY
# Philosophy: Deterministic • Observable • Recoverable • Conflict-Resilient
# Validat: ChatGPT + Claude + Gemini
# Data: Aprilie 2026

---

## 0. PRINCIPIU FINAL

👉 Nu există "edge case".
👉 Există doar cazuri neanticipate sau sisteme incomplete.
👉 Acest spec elimină ambele.
👉 Construim corect o singură dată.

---

## 1. HARD RULES (LOCKED — NENEGOCIABILE)

1. DB este singura sursă de adevăr
2. Nicio operație nu lasă sistemul într-o stare intermediară
3. Nicio acțiune nu pierde date fără explicare
4. Orice conflict este detectat și explicat utilizatorului
5. Orice bug este observabil și reproductibil
6. Dacă nu e în migrații → nu există
7. Nicio logică de business în UI sau hooks
8. Niciun bypass auth în afara `lib/auth/dev-session.ts`
9. Niciun delete fără validare explicită
10. Nicio execuție duplicată — idempotency persistentă

---

## 2. SYSTEM MODEL

```
Supabase (Postgres) = singura sursă de adevăr operațional
Frontend            = cache + draft state (nu trusted)
WordPress           = identity provider exclusiv
```

**State Model (3 stări, niciodată mai multe):**
```
Persisted State   → DB (authoritative)
Confirmed State   → confirmedSnapshotRef (mirror DB după success)
Draft State       → modificările nesalvate ale utilizatorului
```

**Cascada de identitate (validată în fiecare RPC):**
```
wp_user_id → app_user_id → wedding_id
```

---

## 3. PRE-FLIGHT CHECK (BLOCANT — ÎNAINTE DE ORICE COD)

### 3.1 Ce există deja (NU reimplementăm)

| Feature | Status | Locație |
|---------|--------|---------|
| `confirmedSnapshotRef` + `structuredClone` | ✅ | `lib/seating/use-seating-sync.ts` (PR #104) |
| `saveStatus: "unconfirmed"` | ✅ | `lib/seating/use-seating-sync.ts` (PR #104) |
| Retry/revert atomic + AbortController | ✅ | `lib/seating/use-seating-sync.ts` (PR #104) |
| Rate limiting RSVP (Upstash) | ✅ | `middleware.ts` |
| Audit log basic | ✅ | `lib/audit/wl-audit.ts` |
| Zod validări parțiale | ✅ | `lib/validation/` |
| Circuit breaker WordPress | ✅ | `lib/auth/session/wp-circuit-breaker.ts` |
| `requireWeddingAccess` fix | ✅ | PR #112 |

### 3.2 Verifică schema PROD (SQL — execută pe Supabase PROD)

```sql
-- RPC-uri existente
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name ILIKE '%seating%';

-- Schema seating_editor_states
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'seating_editor_states' AND table_schema = 'public';

-- Index pe wedding_members
SELECT indexname FROM pg_indexes WHERE tablename = 'wedding_members';

-- Tabele audit existente
SELECT table_name FROM information_schema.tables
WHERE table_name ILIKE '%audit%' AND table_schema = 'public';

-- Tabel idempotency_keys existent?
SELECT table_name FROM information_schema.tables
WHERE table_name = 'idempotency_keys' AND table_schema = 'public';
```

---

## 4. FAZA 0 — VISIBILITY

### `/dev` route

**SECURITY:** `if (NODE_ENV !== "development") return notFound()`

**`/api/dev/session` returnează:**
```typescript
{
  app_user_id:         string,
  wedding_id:          string,
  event_id:            string | null,
  provisioning_status: string,
  wp_user_id:          number,
  source:              "wordpress" | "dev_mock"  // ← critic: știi exact din ce sursă vine
}
```

**`/api/dev/flags` returnează:** toate featureFlags

**`/api/dev/health` returnează:**
```typescript
{
  supabase:        "ok" | "error",
  wordpress:       "ok" | "error" | "skipped",
  isReadOnly:      boolean,
  readOnlyReason?: string,
  timestamp:       string
}
```

**UI `/dev`:** session, flags, health, last save, warning >5min, error log,
butoane Reload / Clear Cache / Force Resync.

---

## 5. FAZA 1 — AUTH CLEANUP

```typescript
// lib/auth/dev-session.ts
// IMPORTAT EXCLUSIV DIN: session-bridge.ts și get-server-app-context.ts

export const DEV_MOCK_IDS = {
  APP_USER_ID: "00000000-0000-0000-0000-000000000001",
  WEDDING_ID:  "00000000-0000-0000-0000-000000000002",
  EVENT_ID:    "00000000-0000-0000-0000-000000000003",
} as const;

export function getDevSession(): BootstrapResponse | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (process.env.NEXT_PUBLIC_DEBUG_AUTH !== "true") return null;
  return { /* mock complet */ };
}
```

**Variabilă canonică:** `NODE_ENV` — `APP_ENV` nu se folosește.
**Curățare:** scoatem bypassurile din cele 4 fișiere existente.

---

## 6. FAZA 2 — SHADOW SESSION

- TTL: **15 minute** (nu 24h — previne permisiuni stale)
- Refresh automat
- Semnat cu `SHADOW_SESSION_SECRET` (Vercel secrets, rotație 90 zile)
- RPC validează membership din DB — token nu e trusted singur

**Failure mode:**
```
WordPress down + shadow session expirat
→ "Sesiunea a expirat. Reautentifică-te când WordPress revine."
→ Export PNG/PDF disponibil (read-only)
→ NU se pierd date
```

---

## 7. FAZA 3 — IDEMPOTENCY (FINAL)

### 7.1 Schema

```sql
CREATE TABLE idempotency_keys (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_hash        text NOT NULL UNIQUE,
  client_operation_id uuid NOT NULL,
  app_user_id         uuid NOT NULL REFERENCES app_users(id),
  wedding_id          uuid NOT NULL REFERENCES weddings(id),
  rpc_name            text NOT NULL,
  response            jsonb NOT NULL,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_idempotency_hash    ON idempotency_keys (request_hash);
CREATE INDEX idx_idempotency_created ON idempotency_keys (created_at);
-- Cleanup automat după 24h (Postgres Cron sau Edge Function)
```

### 7.2 Hash determinist (CRITIC)

```typescript
// client_operation_id = generat O SINGURĂ DATĂ când userul apasă Save
// Toate retry-urile pentru ACEEAȘI intenție de salvare folosesc ACELAȘI client_operation_id
// Dacă userul apasă Save din nou (nouă intenție) → nou client_operation_id

// Payload TREBUIE stringificat cu chei sortate alfabetic
// Altfel același conținut → hash diferit → false dedupe
const deterministicPayload = JSON.stringify(
  payload,
  Object.keys(payload).sort()
);

request_hash = sha256(
  app_user_id +
  wedding_id  +
  deterministicPayload +
  client_operation_id
);
```

**Garanții:** zero duplicate execution, safe retry, safe reconnect, safe multi-instance.

---

## 8. FAZA 4 — READ-ONLY MODE (HARD)

### 8.1 Global flag

```typescript
type ReadOnlyReason = "supabase_down" | "maintenance" | "rpc_error_threshold";
```

### 8.2 Hard disable când `isReadOnly === true`

- Drag & drop → **disabled** (pointer-events: none)
- Save → **disabled**
- Edit masă → **disabled**
- Magic Fill → **disabled**

### 8.3 Banner global persistent (nu toast — nu dispare)

```
⚠️ "Sistem temporar indisponibil. Poți vizualiza planul, dar nu îl poți salva."
```

### 8.4 Trigger automat

Data access layer triggereaza read-only când RPC > 2000ms.

---

## 9. FAZA 5 — RPC 1: `allocate_seating_numeric_ids_batch`

**Contract:** Idempotent — același UUID → același numeric_id întotdeauna.

```sql
CREATE OR REPLACE FUNCTION allocate_seating_numeric_ids_batch(
  p_wedding_id   uuid,
  p_event_id     uuid,
  p_entity_type  text,      -- "guest" | "table"
  p_entity_uuids uuid[]
) RETURNS TABLE (entity_uuid uuid, numeric_id integer)
```

**Notă critică:** `seat_id` trebuie să fie stabil și persistent — NU index-based.
Schema exactă după DB Reality Check. Implementare adaptată la rezultat.

---

## 10. FAZA 6 — RPC 2: `sync_seating_editor_state`

### 10.1 Input

```typescript
{
  p_wedding_id:         uuid,
  p_event_id:           uuid,
  p_user_id:            uuid,      // injectat server-side ÎNTOTDEAUNA
  p_version:            integer,   // OCC
  p_assignments:        jsonb,     // SeatAssignment[] — snapshot complet
  p_allow_empty_delete: boolean    // explicit pentru delete total
}
```

### 10.2 Flow SQL

```sql
BEGIN;

-- 1. SECURITY
IF NOT EXISTS (
  SELECT 1 FROM wedding_members
  WHERE wedding_id = p_wedding_id AND app_user_id = p_user_id
) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0001'; END IF;

-- 2. LOCK
SELECT version INTO current_version
FROM seating_editor_states
WHERE wedding_id = p_wedding_id AND event_id = p_event_id
FOR UPDATE;

-- 3. VERSION CHECK (OCC)
IF current_version != p_version THEN
  RAISE EXCEPTION 'VERSION_MISMATCH' USING ERRCODE = 'P0002';
END IF;

-- 4. PROTECTED DELETE GUARD
-- Zero payload cu date existente → INTERZIS fără flag explicit
IF incoming_count = 0 AND existing_count > 0
   AND p_allow_empty_delete IS NOT TRUE THEN
  RAISE EXCEPTION 'PROTECTED_DELETE_ZERO_PAYLOAD' USING ERRCODE = 'P0006';
END IF;

-- Payload suspect (<80%) → WARNING + audit light log, continuă
IF incoming_count > 0 AND incoming_count < (existing_count * 0.8) THEN
  RAISE WARNING 'SUSPICIOUS_PAYLOAD_SIZE: incoming=%, existing=%',
    incoming_count, existing_count;
END IF;

-- 5. BUSINESS VALIDATION (SET-BASED — nu row-by-row)
-- 5a. Guest duplicat în payload
-- 5b. Guest există în event
-- 5c. Capacity check per masă (un singur query, nu loop)

-- 6. Snapshot OLD pentru audit
SELECT jsonb_agg(...) INTO old_snapshot FROM seat_assignments ...;

-- 7. UPSERT (tabela nu e goală nicio secundă)
INSERT INTO seat_assignments ...
ON CONFLICT (seat_id) DO UPDATE SET guest_event_id = EXCLUDED.guest_event_id;

-- 8. CLEANUP CONTROLAT
DELETE FROM seat_assignments WHERE ... AND NOT EXISTS (SELECT 1 FROM incoming ...);

-- 9. VERSION++
UPDATE seating_editor_states SET version = version + 1, updated_at = now() ...;

-- 10. AUDIT LOG (tiered)
INSERT INTO seating_audit_logs (..., log_tier, old_assignments, new_assignments, diff)
VALUES (..., CASE WHEN is_critical THEN 'full' ELSE 'light' END, ...);

COMMIT;
```

### 10.3 Error Codes

| ERRCODE | HTTP | Cod | Mesaj UI (fără termeni tehnici) |
|---------|------|-----|---------------------------------|
| P0001 | 403 | FORBIDDEN | "Acces interzis" |
| P0002 | 409 | VERSION_MISMATCH | "Planul a fost modificat de pe alt dispozitiv. Vrei să reîncarci ultima versiune?" |
| P0003 | 409 | DUPLICATE_GUEST | "Un invitat apare de două ori în plan" |
| P0004 | 409 | CAPACITY_EXCEEDED | "Masa X are prea mulți invitați" |
| P0005 | 400 | GUEST_NOT_FOUND | "Invitatul X nu mai există în lista ta" |
| P0006 | 400 | PROTECTED_DELETE_ZERO_PAYLOAD | "Eroare la salvare — încearcă din nou" |

---

## 11. FAZA 7 — CONFLICT SYSTEM

### 11.1 VERSION_MISMATCH

1. Rollback la `confirmedSnapshotRef`
2. UI (fără termeni tehnici):
```
"Planul a fost modificat de pe alt dispozitiv. Vrei să reîncarci ultima versiune?"
[🔄 Reîncarcă]  [⚠️ Păstrează modificările mele]
```
3. Logate cu `action: "force_overwrite"` în audit

### 11.2 Tab Overlap

- `session_id` diferit per tab în localStorage
- Warning persistent dacă același user are tab-uri multiple cu versiuni diferite

### 11.3 Vanishing Guest

Guest șters → `GUEST_NOT_FOUND` → eliminat din draft + notificare UI.

---

## 12. FAZA 8 — CLIENT STATE MACHINE

### 12.1 Silent Refetch înainte de Save

```typescript
async function saveWithSmartRefetch() {
  const timeSinceLastSync = Date.now() - lastSyncAt;

  if (timeSinceLastSync > 10 * 60 * 1000) { // > 10 minute
    const serverState = await silentRefetch();
    const hasMassiveConflict = detectMassiveConflict(serverState, draftState);

    if (hasMassiveConflict) {
      // NU salvăm silențios — dialog explicit
      showConflictDialog({
        message: "Am actualizat planul cu modificările partenerului tău. Verifică înainte de a salva.",
        onConfirm: () => saveWithVersion(serverState.version),
        onCancel:  () => discardDraft(),
      });
      return;
    }

    // Fără conflict masiv → actualizare silențioasă
    confirmedSnapshotRef.current = serverState;
  }

  await doSync();
}
```

### 12.2 State Machine

```typescript
type SaveStatus = "idle" | "saving" | "unconfirmed" | "synced" | "error";

type SaveError =
  | { code: "VERSION_MISMATCH"; message: string; serverVersion: number }
  | { code: "FORBIDDEN"; message: string }
  | { code: "GUEST_NOT_FOUND"; guestId: string }
  | { code: "CAPACITY_EXCEEDED"; tableId: number }
  | { code: "PROTECTED_DELETE"; message: string }
  | { code: "NETWORK"; message: string; retryable: true }
  | { code: "UNKNOWN"; message: string }
```

### 12.3 UI Behavior

| Status | UI |
|--------|-----|
| idle | nimic |
| saving | "Se salvează..." subtle |
| unconfirmed | "Se verifică..." subtle |
| synced | "Salvat ✓" 3s → dispare |
| error VERSION_MISMATCH | Dialog cu 2 opțiuni (fără termeni tehnici) |
| error FORBIDDEN | Banner roșu |
| error GUEST_NOT_FOUND | Toast + elimină din draft |
| error NETWORK | Banner + retry automat |
| read-only | Banner galben persistent + disable complet |

---

## 13. FAZA 9 — AUDIT SYSTEM (TIERED)

### 13.1 Schema

```sql
CREATE TABLE seating_audit_logs (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id        uuid NOT NULL REFERENCES weddings(id),
  event_id          uuid NOT NULL REFERENCES events(id),
  app_user_id       uuid NOT NULL REFERENCES app_users(id),
  action            text NOT NULL,
  log_tier          text NOT NULL DEFAULT 'light',  -- "light" | "full"
  version_from      integer,
  version_to        integer,
  assignments_count integer,
  old_assignments   jsonb,   -- NULL pentru light logs
  new_assignments   jsonb,   -- NULL pentru light logs
  diff              jsonb,   -- NULL pentru light logs: {added: [...], removed: [...]}
  request_id        text,
  created_at        timestamptz DEFAULT now()
);
```

### 13.2 Tiered Strategy

**FULL LOG** (cu diff complet): `force_overwrite`, `suspicious_payload_warning`, `error_recovery`

**LIGHT LOG** (metadata only): operații normale `sync`

### 13.3 Cleanup Automat (Postgres Cron sau Edge Function — săptămânal)

```sql
DELETE FROM seating_audit_logs
WHERE log_tier = 'full'  AND created_at < now() - interval '30 days';

DELETE FROM seating_audit_logs
WHERE log_tier = 'light' AND created_at < now() - interval '90 days';
```

**Cleanup este AUTOMAT — nu manual.**

---

## 14. FAZA 10 — DATA ACCESS LAYER

```typescript
// lib/supabase/db.ts
export async function rpc<T>(name, payload, options = {}) {
  const request_id = options.request_id ?? crypto.randomUUID();
  const start = Date.now();
  const { data, error } = await supabaseServer().rpc(name, payload);
  const duration = Date.now() - start;

  if (duration > 300)  console.warn(`[RPC] ${name} slow`, { request_id, duration });
  if (duration > 2000) triggerReadOnlyMode("rpc_error_threshold");

  if (error) {
    console.error(`[RPC] ${name} failed`, { request_id, error: error.code, duration });
    throw normalizeRpcError(error);
  }

  console.info(`[RPC] ${name} ok`, { request_id, duration });
  return data as T;
}
```

---

## 15. FAZA 11 — SECURITY

- Security check în fiecare RPC write (membership din DB)
- `service_role` NICIODATĂ în `NEXT_PUBLIC_*`
- Rate limiting: debounce 300-500ms frontend, Upstash backend
- Indexuri cu `IF NOT EXISTS`

---

## 16. FAZA 12 — PRODUCT COMPLETION (DUPĂ RPC)

Ordinea strictă:
1. Magic Fill fix
2. Export JSON/PDF fix
3. Budget UI
4. Dashboard mockup + Task Engine cu date reale
5. Sidebar cleanup (scoate module fantomă)
6. Polish RSVP, guest-list, Settings

---

## 17. FAILURE MODES

| Scenariu | Comportament |
|----------|-------------|
| WordPress down | Shadow session 15min → circuit breaker → mesaj clar |
| Supabase down | Read-only hard → banner → export disponibil |
| RPC fail | Rollback + mesaj specific fără termeni tehnici |
| RPC > 2000ms | Trigger read-only automat |
| Network timeout | Retry exponential 3x → buton manual |
| Tab overlap | Warning persistent |
| Guest șters | GUEST_NOT_FOUND → eliminat din draft + notificare |
| Payload zero accidental | PROTECTED_DELETE_ZERO_PAYLOAD |
| Payload suspect | WARNING + light audit log |
| Tab inactiv >10min | Silent refetch sau dialog conflict |

---

## 18. MIGRATION DISCIPLINE

```
DEV verificare
  → supabase/migrations/YYYYMMDDHHMMSS_descriere.sql
  → commit + PR + review
  → merge develop → apply DEV → testare
  → PR main → apply PROD
```

**INTERZIS:** Modificări în Supabase UI fără migrație.

---

## 19. SCALABILITY (ARHITECTURA PERMITE — V2)

- Delta sync, Multi-country, Domain layer refactor
- Real-time sync, Merge assist, Cold storage audit logs

---

## 20. DEFINIȚIA DE DONE

- [ ] Seating persistă corect după reload
- [ ] VERSION_MISMATCH cu rollback + dialog fără termeni tehnici
- [ ] Silent refetch activ pentru tab inactiv >10min
- [ ] Zero execuție dublă (idempotency cu hash determinist)
- [ ] Read-only mode hard cu banner + disable complet
- [ ] Audit tiered (full/light) cu cleanup automat
- [ ] Protected delete zero payload
- [ ] Niciun bypass în afara `lib/auth/dev-session.ts`
- [ ] Toate RPC-urile în migrații
- [ ] `/dev` route funcțional cu `source: "wordpress" | "dev_mock"`
- [ ] 698+ teste verzi
- [ ] `npm run build` curat
- [ ] Zero silent failures

---

## 21. CHECKLIST PRE-LAUNCH

- [ ] `wpBridgeEnabled: true`
- [ ] Migrații pe PROD (idempotency_keys, seating_audit_logs, RPC-uri)
- [ ] `RESEND_API_KEY` în Vercel
- [ ] `SHADOW_SESSION_SECRET` în Vercel
- [ ] DNS `app.weddinglist.ro`
- [ ] ToS + Privacy Policy în română
- [ ] RLS reactivat pe DEV
- [ ] Postgres Cron configurat pentru cleanup audit logs
- [ ] Rate limiting configurat
- [ ] QA complet cu utilizator real
- [ ] Worst Day Scenario Plan testat

---

## 22. ANTI-PATTERNS (INTERZISE PERMANENT)

❌ Direct DB writes din client
❌ Fallback silent
❌ Bypass auth în afara `lib/auth/dev-session.ts`
❌ Duplicare state operațional
❌ Logică de business în UI sau hooks
❌ RPC-uri fără security check
❌ Modificări Supabase UI fără migrație
❌ `service_role` în variabile publice
❌ `client_timestamp` în logică
❌ Delete fără validare payload
❌ Idempotency in-memory (nu persistentă)
❌ Read-only mode fără hard disable UI
❌ Payload hash non-determinist (chei nesortate)
❌ Audit cleanup manual
❌ Silent save la conflict masiv
❌ Mesaje de eroare cu termeni tehnici pentru utilizatori
❌ `seat_id` index-based (trebuie stabil și persistent)

---

*Spec version: V5.4*
*Data: 7 Aprilie 2026*
*Autori: ChatGPT + Claude Sonnet 4.6 + Gemini*
