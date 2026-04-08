# STATUS.md — WeddingList App
# Spec version active: V5.4
# Last synced with SPEC: 2026-04-07
# Rol: Starea curentă a proiectului. Se actualizează la fiecare sesiune.

---

## 1. PROGRES REAL

**Evaluare sinceră: ~75% din produs funcțional**

> Nota: Procentul anterior (~91%) măsura completarea codului/API-urilor,
> nu calitatea produsului end-to-end validată prin QA cu date reale.

---

## 2. STAREA MODULELOR

| Modul | Status | Note |
|-------|--------|------|
| Seating Chart UI | ✅ Funcțional | Vizualizare, drag & drop |
| Seating Chart Save | ❌ Broken | RPC `sync_seating_editor_state` lipsă |
| Magic Fill | ❌ Broken | Nu funcționează cu date reale Supabase |
| Listă Invitați | ✅ Funcțional | 600 invitați testați |
| RSVP Dashboard | ✅ Funcțional | Buguri mici UI/UX |
| Export JSON | ❌ Broken | "An unexpected error occurred" |
| Export PDF | ❌ Broken | "Wedding not found" |
| Budget | ❌ Lipsă complet | Doar API, fără UI (404) |
| Dashboard | ⚠️ Parțial | Statistici 0, mockup neimplementat |
| Settings | ✅ Vizual | Funcționalitate netestat complet |
| Vendors | ❌ Blocat | Blocat pe Voxel |

---

## 3. MODIFICĂRI LOCALE ACTIVE (NECOMISE)

**ATENȚIE: Aceste fișiere sunt modificate local și NU trebuie pe main/develop fără atenție.**

### 3.1 Dev bypass auth (4 fișiere — DE ÎNLOCUIT în Faza 1)

Scopul: permit testarea locală fără WordPress.
Activare: `NEXT_PUBLIC_DEBUG_AUTH=true` în `.env.local`

| Fișier | Modificare |
|--------|-----------|
| `app/lib/auth/fetch-wordpress-bootstrap.ts` | Returnează mock dacă `NEXT_PUBLIC_DEBUG_AUTH=true` |
| `app/lib/auth/session/session-bridge.ts` | Returnează mock session dacă `debugAuthEnabled` |
| `lib/server-context/get-server-app-context.ts` | Returnează context mock dacă `debugAuthEnabled` |
| `app/guest-list/page.tsx` | Token guard relaxat (nu cere token pentru fetch) |

**Plan:** Toate 4 înlocuite de `lib/auth/dev-session.ts` în Faza 1 din SPEC V5.4.

### 3.2 `.env.local` — variabile adăugate pentru dev

```
NEXT_PUBLIC_DEBUG_AUTH=true
NODE_ENV=development
```

**NU se commitează niciodată.**

### 3.3 `app/dashboard/page.js` — deleted local

Înlocuit cu `app/dashboard/page.tsx` (migrat la TypeScript). Normal, nu e risc.

---

## 4. STAREA SUPABASE DEV

**DEV: typpwztdmtodxfmyrtzw**

### RLS dezactivat temporar pentru QA (NU e dezactivat pe PROD)

```sql
-- Dezactivat pe:
guests, guest_events, tables, seat_assignments,
wedding_members, weddings, events,
seating_id_counters, guest_groups
```

### Date de test introduse

UUID-uri fixe:
- `app_user_id`: `00000000-0000-0000-0000-000000000001`
- `wedding_id`: `00000000-0000-0000-0000-000000000002`
- `event_id`: `00000000-0000-0000-0000-000000000003`

Date: 600 guests + 600 guest_events + 4 guest_groups + 60 tables

### Funcții RPC în DEV (create manual — NU în migrații)

- `allocate_seating_numeric_ids_batch` — **are bug-uri**, de rescris
- `sync_seating_editor_state` — **NU există** nici în DEV nici în PROD

### Cheie Supabase DEV

Cheia anterioară a fost **revocată**.
Noua cheie e în `.env.local` local.

---

## 5. TESTE

- **698/698 verzi** pe develop
- Testele `.test.js` NU migrate la TypeScript (intenționat)

---

## 6. ULTIMELE PR-URI

| PR | Titlu | Status |
|----|-------|--------|
| #112 | fix(auth): corecteaza coloana user_id → app_user_id | ✅ Merged develop |
| #111 | fix(seating): freeze cursor position la primul wheel event | ✅ Merged develop |
| #110 | feat(seating): migrare typescript completa - 15 fisiere | ✅ Merged develop |

---

## 7. PROBLEME CUNOSCUTE

### Critice (blochează launch)
1. `sync_seating_editor_state` RPC lipsă — seating nu salvează nimic
2. `allocate_seating_numeric_ids_batch` RPC cu bug-uri
3. RPC-urile nu sunt în migrații (risc pierdere la reset DB)
4. Magic Fill broken cu date reale
5. Export JSON/PDF broken
6. Budget UI lipsă (404)
7. Dev bypass nestructurat în 4 fișiere

### Importante
8. Dashboard nu respectă mockup-ul de referință
9. Task Engine neintegrat cu date reale
10. Sidebar cu module fantomă (Checklist, Timeline, Wishlist, Moodboard, Notițe)
11. Zoom bug la ZOOM_MIN neconfirmat prin testare reală
12. `app/guest-list/page.tsx` token guard relaxat local

### Pre-launch
13. `wpBridgeEnabled: true` la launch
14. Migrații aplicate pe PROD
15. `RESEND_API_KEY` în Vercel
16. `SHADOW_SESSION_SECRET` în Vercel
17. DNS `app.weddinglist.ro`
18. ToS + Privacy Policy în română
19. RLS reactivat pe DEV după testare
20. Postgres Cron configurat pentru cleanup audit logs

---

## 8. URMĂTORUL TASK

**Faza 0 — Visibility: `/dev` route**

1. `GET /api/dev/session` — returnează session cu `source: "wordpress" | "dev_mock"`
2. `GET /api/dev/flags` — toate feature flags
3. `GET /api/dev/health` — status Supabase + WordPress + isReadOnly
4. `app/dev/page.tsx` — UI minimal

**Imediat după Faza 0:** DB Reality Check pe Supabase PROD (5 minute, blocant pentru RPC-uri).

---

## 9. FAZELE DE IMPLEMENTARE (SPEC V5.4)

| Fază | Task | Status |
|------|------|--------|
| 0 | `/dev` route | ⏳ URMĂTOR |
| 1 | Auth cleanup (`lib/auth/dev-session.ts`) | ⏳ |
| 2 | Shadow session | ⏳ |
| 3 | Idempotency table | ⏳ |
| 4 | Read-only mode | ⏳ |
| 5 | RPC `allocate_seating_numeric_ids_batch` | ⏳ |
| 6 | RPC `sync_seating_editor_state` | ⏳ |
| 7 | Conflict system + client state machine | ⏳ |
| 8 | Silent refetch | ⏳ |
| 9 | Audit system tiered | ⏳ |
| 10 | Data access layer | ⏳ |
| 11 | Security hardening | ⏳ |
| 12 | Product completion | ⏳ |
