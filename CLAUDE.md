# CLAUDE.md — WeddingList App

Onboarding pentru orice sesiune AI care lucrează pe acest proiect.
Surse: SPEC V5.4 + CONTEXT V2.0 + STATUS apr16 + ROADMAP v2.3 FINAL.
Motto: **Nu mai adăuga nimic. Execută.**

---

## 1. ARHITECTURĂ

### Stack
- **Frontend:** Next.js 16.2.2 + React + TypeScript strict
- **DB:** Supabase (PostgreSQL, EU Frankfurt), RLS pe toate tabelele operaționale
- **Identity:** WordPress (Voxel) — identity provider exclusiv
- **Deploy:** Vercel (`main` = prod, `develop` = staging, `feature/*` = preview)
- **Repo:** github.com/itweddinglist/weddinglist-app

### Auth flow (ordinea e sfântă)
```
WordPress /wp-json/weddinglist/v1/bootstrap
  → session-bridge.ts (SINGLE ENTRY POINT)
  → ServerAppContext (lib/server-context/get-server-app-context.ts)
  → requireWeddingAccess (wedding_members.app_user_id)
  → Supabase queries cu service_role
```
Cascada de identitate: `wp_user_id → app_user_id → wedding_id` (validată în fiecare RPC).

### DB isolation key
`wedding_id` pe TOATE tabelele operaționale. Orice query fără filtru `wedding_id` = tenant leak.

### Fișiere critice
- `lib/api/with-auth.ts` — HOF union-safe: checkOrigin + auth chain + assertRole + structured 500
- `lib/auth/dev-session.ts` — singurul loc permis pentru bypass auth (DEV only)
- `lib/auth/shadow-session.ts` — JWT cu `auth_source` + `absolute_issued_at`, 15 min hard ceiling
- `lib/csrf.ts` — `checkOrigin()`, primul check pe rute mutante
- `lib/server-context/get-server-app-context.ts` — WP bootstrap server-side; warn dacă DEBUG_AUTH în prod
- `lib/server-context/require-wedding-access.ts` — membership + role check; `minRole` obligatoriu
- `lib/server-context/require-authenticated.ts` — 401/503/409/403
- `lib/supabase/db.ts` — `rpc<T>()` wrapper cu timing + auto read-only trigger
- `lib/supabase/idempotency.ts` — hash determinist (chei sortate)
- `lib/system/read-only.ts` — Faza 4
- `app/seating-chart/*` — **LOCKED, nu se atinge**

### System Model
```
WordPress (Voxel) = identity + plan + vendors
Next.js           = orchestrator + UX + session authority
Supabase          = source of truth operațional
Frontend          = cache + draft state (NU trusted)
```

---

## 2. REGULI ABSOLUTE (ce NU se face NICIODATĂ)

- NU trust client pentru identitate — `wp_user_id`/`app_user_id`/`wedding_id` vin doar din ServerAppContext
- NU `service_role` în client sau `NEXT_PUBLIC_*`
- NU bypass auth în afara `lib/auth/dev-session.ts`
- NU modifica `SPEC.md`
- NU atinge Seating Chart CSS (izolat de Tailwind, nerescris)
- NU folosi `react-window` (incompatibil Turbopack Next.js 16+)
- NU JWT client-side (eliminat complet)
- NU shadow-of-shadow chaining (respins 401)
- NU direct DB writes din client
- NU logică de business în UI sau hooks (SPEC Hard Rule #7)
- NU modificări Supabase UI fără migration
- NU fallback silent — fail fast
- NU delete hard pe guests (soft delete obligatoriu)
- NU `seat_id` index-based (trebuie stabil + persistent)
- NU `client_timestamp` în logică
- NU idempotency in-memory (trebuie persistentă, hash determinist cu chei sortate)
- NU `error.message` raw către client — log server-side, generic 500 spre client
- NU termeni tehnici în mesaje de eroare user-facing (toate în română)

---

## 3. WORKFLOW STANDARD

- **Branch naming:** `feature/*`, `fix/*`, `feat/*`, `docs/*`, `chore/*`
- **Base branch pentru PR:** `develop` (niciodată `main` direct)
- **Push direct pe `main`/`develop`:** INTERZIS (branch protection activă)
- **Deploy prod:** PR din `develop` → `main`
- **Commit format:** lowercase, commitlint enforced (ex: `fix(seating): elimina json.stringify din parametrii rpc`)
- **Înainte de commit OBLIGATORIU:**
  - `npx tsc --noEmit` (tsc clean)
  - `npx vitest run` (vitest — 712/712 verzi + 4 skipped)
  - `npm run build` (Next.js Turbopack verde)
- **Migrations:** `supabase/migrations/YYYYMMDDHHMMSS_descriere.sql` — schema changes EXCLUSIV aici
- **Fișiere `.js` din seating/teste:** rămân `.js` intenționat, NU migrezi la TS

---

## 4. PIPELINE AUTH OBLIGATORIU (rute mutante POST/PATCH/DELETE/PUT)

```
checkOrigin(request)              ← PRIMUL — CSRF defense-in-depth
rateLimit(...)                    ← 60/min per user_id, 20/min per IP, 429 + Retry-After
getServerAppContext(request)      ← WP bootstrap server-side sau shadow session
requireAuthenticatedContext()     ← 401/503/409/403
requireWeddingAccess({ minRole }) ← membership + role hierarchy, minRole EXPLICIT
validate input (Zod)              ← zero trust pe body/query
DB write                          ← service_role server-side
```

Orice rută mutantă care omite un pas = bug critic. Fără excepții.

---

## 5. PATTERN-URI DE COD

### withAuth wrapper (`lib/api/with-auth.ts`)
HOF union-safe care rulează întreg auth chain + `assertRole()` + structured error logging + generic 500. Pilot pe `rsvp/manual`. De extins pe 6 endpoint-uri simple: `rsvp/invitations`, `guests (POST)`, `guest-events (POST)`, `guest-events/bulk`, `budget/items (POST)`, `guests/import`. Endpoint-urile cu `weddingId` în URL params (`seating/sync`, `budget/items/[itemId]`) — după E2E tests.

### requireWeddingAccess
`minRole` = parametru **obligatoriu explicit**, fără default. TypeScript enforced. Pentru write → `minRole: "editor"`.

### checkOrigin
Primul check pe toate rutele mutante. Validează Origin/Referer împotriva `NEXT_PUBLIC_APP_URL`.

### DEV mock IDs (`lib/auth/dev-session.ts`)
```
APP_USER_ID: 00000000-0000-0000-0000-000000000001
WEDDING_ID:  00000000-0000-0000-0000-000000000002
EVENT_ID:    00000000-0000-0000-0000-000000000003
```
Active DOAR dacă `NODE_ENV === "development"` AND `NEXT_PUBLIC_DEBUG_AUTH === "true"`. Variabilă canonică: `NODE_ENV` (nu `APP_ENV`).

### rpc<T>() wrapper (`lib/supabase/db.ts`)
Timing automat: >300ms warn, >2000ms trigger read-only. `normalizeRpcError()` + `RpcError` class. `request_id` în fiecare log.

### Idempotency hash
`sha256(app_user_id + wedding_id + JSON.stringify(payload, Object.keys(payload).sort()) + client_operation_id)`. Chei sortate = obligatoriu. `client_operation_id` generat **o singură dată** per intenție Save.

---

## 6. DECIZII LOCKED (nu se rediscută fără motiv tehnic solid)

- **STORAGE_KEY seating:** `wedding_seating_v14` (incrementează DOAR la breaking changes)
- **SYNC_DEBOUNCE_MS:** `1500ms` (deliberat pentru drag & drop continuu)
- **SVG vs Canvas:** V1 = SVG; V2 = Canvas DOAR dacă FPS < 45
- **Seating Chart CSS:** izolat de Tailwind, NERESCRIS
- **react-window:** INTERZIS
- **revalidateTag:** nu se aplică (client-side fetching)
- **party_id (Group RSVP):** amânat după launch, validat cu useri reali
- **Multi-event V1:** un singur event activ per wedding; schema suportă multiple, UI nu
- **UNIQUE constraint `(wedding_id, first_name, last_name)`:** NU adăugăm
- **Schema changes:** DOAR prin migrations, niciodată Supabase UI
- **DB la conflict localStorage vs DB:** DB wins
- **Shadow session TTL:** 15 min absolute ceiling (nu 24h)
- **Rate limiting:** 60 req/min per user_id, 20/min per IP fallback, 429 + `Retry-After`
- **Security audit:** 100/100 — SAFE TO LAUNCH (apr 2026)

---

## 7. STAREA CURENTĂ

- **Progres:** ~99% funcțional
- **Faze 0–12:** toate ✅ DONE
- **Teste:** 712/712 verzi + 4 skipped (716 total) pe `develop`
- **Build:** `npm run build` ✅ verde (Next.js 16.2.2 Turbopack)
- **Security audit:** 100/100 — SAFE TO LAUNCH

### TOP 5 blockers rămase pentru launch
1. **S9** — Rate limiting pe `/api/guests`, `/api/budget`, `/api/export`
2. **S13** — Multi-tenant isolation test explicit (User B → wedding A = 403)
3. **D1** — Soft delete pe `guests` (+ `seat_assignments` cascadă în aceeași tranzacție)
4. **Z1** — Emergency CSV Kit + Force Sync & Offline Lock
5. **I9** — QA complet cu utilizator real

Infrastructură pre-launch rămasă: `wpBridgeEnabled: true`, migrații PROD (`20260413000001`, `20260414000001`), env vars Vercel (`RESEND_API_KEY`, `SHADOW_SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`), DNS `app.weddinglist.ro`, ToS + Privacy Policy RO, RLS reactivat DEV, `pg_cron` activat PROD, Point-in-time recovery Supabase.

---

## 8. DEV ENVIRONMENT

### Condiții bypass auth
Ambele obligatorii simultan: `NODE_ENV=development` AND `NEXT_PUBLIC_DEBUG_AUTH=true`.

### Condiții `/api/dev/*`
Ambele obligatorii: `NODE_ENV=development` AND `DEV_ENDPOINTS_ENABLED=true` (double gate).

### Mock IDs (DEV only)
```
app_user_id: 00000000-0000-0000-0000-000000000001
wedding_id:  00000000-0000-0000-0000-000000000002
event_id:    00000000-0000-0000-0000-000000000003
```

### Supabase projects
- **DEV:** `typpwztdmtodxfmyrtzw` (Frankfurt) — CLI linkat aici
- **PROD:** `dtyweqcpanxmckngcyqx` (Frankfurt)

### `.env.local` (NU se commitează niciodată)
```
NEXT_PUBLIC_DEBUG_AUTH=true
NODE_ENV=development
```

### Endpoint-uri dev
```
GET /api/dev/session   — returnează source: "wordpress" | "dev_mock"
GET /api/dev/flags     — toate featureFlags
GET /api/dev/health    — supabase/wordpress/isReadOnly status
```

### Producție — verificări OBLIGATORII absente
`NEXT_PUBLIC_DEBUG_AUTH` și `DEV_ENDPOINTS_ENABLED` NU există în env vars Vercel prod. Production guard: `console.warn` + `getDevSession()` forțat `null`.

---

*Onboarding version: 1.0 — Aprilie 2026*
*Sursă de adevăr pentru reguli: SPEC V5.4 (nu se modifică).*
