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
- `app/seating-chart/` (CSS + geometry layout) — **LOCKED**. Hooks, utils, components — editabile pentru bug fix / refactor tipuri, NU pentru feature nou.

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
- **Ierarhie documente:** `ROADMAP.md` = sursa operationala curenta (prioritizare + scope V1). `SPEC.md` = contract stabil pentru Hard Rules (§1) si contracte tehnice (migrations, auth, RLS), dar scope-ul V1 a divergat de SPEC dupa decizia strategica post-redactare. La conflict: ROADMAP castiga pentru scope/prioritati; SPEC ramane autoritar pentru Hard Rules.
- NU modifica `SPEC.md` Hard Rules (§1) fara motiv tehnic major. Restul SPEC e istoric — actualizeaza ROADMAP liber.
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
  - Subject: lowercase obligatoriu, sub 100 chars
  - Body lines: max 100 chars per linie
  - Pentru subject cu acronime sau body multiline → foloseste `git commit -F .git/COMMIT_MSG_TMP.txt` (scrie message in fisier temp, apoi commit cu `-F` flag, apoi `rm` fisierul)
  - **NEVER `--no-verify`** — Husky pre-commit (ESLint full) + commit-msg (commitlint) ruleaza obligatoriu pe fiecare commit
  - **Auto-link bug in chat preview:** cand lipesti text in Claude Code prin browser, file names cu extensie pot fi convertite in link-uri Markdown false. Pentru content scris pe disk → foloseste wording "X file" (`changelog file`, `handoff file`) in loc de pattern literal cu extensie. Validat la PR #173a/#173b.
  - **Heredoc PowerShell + non-ASCII = double-encoding pe Windows.** Pentru fisiere noi cu emoji/diacritice, evita `@'...'@` heredoc. Solutia: Claude Code creeaza direct fisierul cu `Write` tool (UTF-8 nativ), PowerShell doar citeste/insereaza. Validat la PR #173b recovery.
- **Înainte de commit OBLIGATORIU:**
  - `npx tsc --noEmit` (tsc clean)
  - `npx vitest run` (vitest — 879/879 verzi + 4 skipped)
  - `npm run build` (Next.js Turbopack verde)
- **Migrations:** `supabase/migrations/YYYYMMDDHHMMSS_descriere.sql` — schema changes EXCLUSIV aici, NICIODATĂ direct prin Supabase UI
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

### 5a. AUTH / INFRA PATTERNS

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

### 5b. TYPESCRIPT & DATA INTEGRITY PATTERNS

#### Projection types pentru query-uri partiale
Cand query-ul DB selecteaza doar cateva campuri dintr-un row, tipul TypeScript reflecta EXACT acele campuri — nu tipul complet al tabelului. Pattern: `Pick<TableRow, 'field1' | 'field2'>` co-localizat cu tipul canonic.
Exemplu: `SeatingEventProjection = Pick<GuestEventRow, 'attendance_status' | 'meal_choice' | 'event_id'>` in `types/guests.ts`. Endpoint-ul `/seating/load` selecteaza doar 3 campuri — tipul le reflecta exact. Zero overfetch, zero cast-uri care mint.

#### Spread order in object literals
Spread primul, overrides la final: `{ ...source, overrides }`. NU invers.
Daca pui override-urile inainte de spread, `...source` le suprascrie silent, anuland defensive-ul.
Bug subtil, greu de gasit la review. Standard TypeScript/React.

#### Guardrail tests — doua invariants explicite
Cand un contract e atat compile-time cat si runtime, testul guardrail le documenteaza pe ambele:
- Compile-time: `@ts-expect-error` suprima eroarea TS pe apel invalid
- Runtime: `expect(() => ...).toThrow(TypeError)` afirma ca bypass-ul crash-uieste
Daca oricare invariant pica, PR-ul viitor primeste review explicit pe regresie.

#### Derived constants in teste, nu magic numbers
Cand un test verifica o proprietate derivata din date, extrage constanta la nivelul fisierului cu logica explicita:
`const ELIGIBLE_COUNT = INITIAL_GUESTS.filter(isSeatingEligible).length`
NU hardcoda `11` cu comentariu. Daca datele se schimba, calcul automat.

#### Defensive coding EXCLUSIV la boundary real
Hydration defensive (`g.field ?? []`) merita DOAR la granita cu untrusted input:
- `JSON.parse` peste localStorage — boundary real
- State tipat propagat din pipeline — boundary inventat, NU defensive
Produsul pe develop fara useri reali NU justifica backward-compat pentru date care nu exista. Tipul reflecta realitatea, nu frica.

#### Tipurile reflecta shape-ul real al datelor
Nu shape-ul complet al tabelului DB. Nu shape-ul ideal. Shape-ul EXACT care curge prin pipeline-ul tau. Cand tipul diverge de realitate, bug-uri silent apar la boundary-uri.

---

### 5c. E2E TESTING CONVENTIONS

#### data-testid pattern pentru selector contracts

Pentru E2E tests Playwright, prefera `getByTestId` peste `getByRole({ name })` cand pagina contine repetari semantice (ex: aceleași `MODULES` array randate atat in sidebar nav cat si in module grid). Role-based selectors colide pe accessible name dublu, declanseaza Playwright strict mode violation.

**Naming scheme adoptat (PR #178):**
- `nav-link-{id}` pentru sidebar nav links (AppShell.jsx persistent)
- `module-card-{id}` pentru dashboard module grid (page-local)

`{id}` = identifier stabil din `MODULES` array (ex: `seating-chart`, `guest-list`, `budget`). Doua prefix-uri distincte = zero ambiguity intre nav vs page content.

#### Composite probe pentru DEV bypass auth

Cand un E2E test verifica auth-gated routes cu `NEXT_PUBLIC_DEBUG_AUTH`, foloseste **composite probe** via `/api/dev/session` inainte de navigation:
- Status 200 → DEV_ENDPOINTS_ENABLED gate satisfied
- `body.status === "authenticated"` → NEXT_PUBLIC_DEBUG_AUTH propagated
- `body.app_user_id === MOCK_UUID` → dev-session.ts mock data integritate

Probe orthogonal pe field `source` din `/api/dev/session` e UNRELIABLE — reflecta doar `NODE_ENV`, NU bypass active. Vezi `tests/e2e/helpers/auth.ts` pentru implementare canonica.

#### Playwright webServer.env explicit pentru determinism CI

`playwright.config.ts` `webServer.env` trebuie sa seteze TOATE env vars critice explicit (nu mosteneste tacit din shell):
- `NODE_ENV: "development"` — Playwright nu forteaza, Next.js pastreaza valoarea existing cu warning daca difera
- `NEXT_PUBLIC_DEBUG_AUTH: "true"` — pentru DEV bypass client + server
- `DEV_ENDPOINTS_ENABLED: "true"` — pentru `/api/dev/*` endpoints (CLAUDE.md §8 double gate)

CI runners pot avea `NODE_ENV=test` global → fara override explicit, DEV bypass guard fail silent.

#### Recovery procedure pentru E2E cache corruption

Dacă tests pass o dată și pică ulterior fără modificări la source code:
1. `rm -rf .next/` (cleanup Next.js dev cache)
2. Restart Playwright run (Playwright spawn fresh `next dev`)
3. Pattern documentat în HANDOFF section 4 L20-L21 (HMR + E2E race condition)

---

## 6. DECIZII LOCKED (nu se rediscută fără motiv tehnic solid)

Constants tehnice și boundary statements. Pentru deciziile cumulative LX evolutive (procedural + arhitectural cronologic), vezi fișierul HANDOFF secțiunea 4.

- **STORAGE_KEY seating:** `wedding_seating_v14` (incrementează DOAR la breaking changes)
- **SYNC_DEBOUNCE_MS:** `1500ms` (deliberat pentru drag & drop continuu)
- **SVG vs Canvas:** V1 = SVG; V2 = Canvas DOAR dacă FPS < 45
- **Seating Chart CSS:** izolat de Tailwind, NERESCRIS
- **react-window:** INTERZIS
- **revalidateTag:** nu se aplică (client-side fetching)
- **UNIQUE constraint `(wedding_id, first_name, last_name)`:** NU adăugăm
- **DB la conflict localStorage vs DB:** DB wins
- **Shadow session TTL:** 15 min absolute ceiling (nu 24h)
- **Rate limiting:** 60 req/min per user_id, 20/min per IP fallback, 429 + `Retry-After`

---

## 7. STAREA CURENTĂ

- **Progres:** ~99% funcțional
- **Faze 0–12:** toate ✅ DONE
- **Teste:** 879/879 verzi + 4 skipped (883 total) pe `develop`
- **Build:** `npm run build` ✅ verde (Next.js 16.2.2 Turbopack)
- **Security audit:** 100/100 — SAFE TO LAUNCH

### Hardening Week status

| # | Task (ROADMAP) | Status | Progres granular |
|---|----------------|--------|------------------|
| H1 | CLAUDE.md în repo | ✅ DONE | PR #156 |
| H2 | Duplicate tip SeatingGuest rezolvat | ✅ DONE | PR #158 (Step 1 type hardening) + PR #159 (H2.5 pipeline + filtrare declined) |
| H3 | Business rules centralizate în lib/domain/ | ✅ DONE PR #162-#172 | Etapele 1/3 (#162) + 2/3 (#164-#169) + 3/3 (#172) toate complete |
| H4 | E2E testing Playwright | ⏳ pending H3 complete | — |
| H5 | Re-audit securitate după sprint major | ⏳ pending | — |
| H6 | Manual critical flow end-to-end | ⏳ pending | — |
| H7 | Design tokens centralizați | 🟡 STARTED | Foundation parțial PR #170 (12 semantic aliases) + PR #172 (7 primitives + 9 semantic). Continuă la H7 milestone. |

**Decizii auxiliare executate (nu sunt in ROADMAP ca task-uri distincte):**
- CLAUDE.md v1.1 — TypeScript patterns + AI workflow rules (PR #160)
- CLAUDE.md hierarchy — ierarhie ROADMAP > SPEC pentru scope V1 (PR #161)

**Scope clarificat:** H3 + H4 = V1 conform ROADMAP (SPEC §19 le plasa V2 — decizie suprascrisa post-redactare SPEC).

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

### 8a. AI WORKFLOW RULES

Reguli de lucru pentru sesiuni AI pe acest proiect:

1. **Commit messages scurte, PR descriptions complete.** Subject line < 72 chars, imperativ. Context arhitectural + rationale decizii merg in PR description (markdown, editable). Zero duplicare in git log.

2. **Aprobare per comanda.** Niciodata optiunea "yes, don't ask again" la prompt-uri de confirmare pentru bash/edit. Disciplina costa 30 secunde, previne erori catastrofice.

3. **Verify on disk.** Preview-urile AI au artefacte vizuale consecvente (duplicari, corupții text, linii reordonate). Pentru continut critic (commit messages, tipuri, migrations): verificare cu `cat -n`, `grep -c`, `wc -l` + markeri unici inainte de confirmare.

4. **Nu presupune ca testele existente sunt corecte doar pentru ca trec.** Cand bug-ul rezolvat ar fi trebuit sa pice teste, verifica DE CE nu au picat — probabil testele documentau bug-ul ca feature.

5. **La contradictie intre cod, teste si documentatie — STOP implementare, re-evalueaza contractul.** Nu alege una dintre cele 3 versiuni; gaseste sursa adevarata.

6. **Second opinion extern (ChatGPT/Gemini) pe decizii arhitecturale majore.** Nu pentru validare oarba — pentru a expune presupuneri pe care AI-ul curent le face implicit.

## 9. MULTI-SESSION COLLABORATION (pattern "echipă ștafetă")

Proiectul WeddingList funcționează **permanent** în model echipă ștafetă cross-timezone între sesiuni Claude.ai multiple (conturi diferite, sesiuni diferite în timp). Nu există "Claude.ai-ul principal" — fiecare sesiune e un contribuitor egal care preia context, continuă munca, documentează ce a făcut, predă ștafeta următoarei sesiuni.

### 9a. DOCUMENTE CANONICE

| Fișier                 | Scop                                                |
|------------------------|-----------------------------------------------------|
| `HANDOFF.md`           | Log operațional: stare proiect, decizii LOCKED, open items, protocol schimb de tură. Citit la început de tură, actualizat la sfârșit. |
| `CHANGELOG.md`         | Istoric PR-uri merged în develop (single source-of-truth). Adăugat la PR #173a. |
| `CLAUDE.md` (acesta)   | Convenții & reguli permanente. Rar modificat.       |
| `ROADMAP.md`           | Plan temporal strategic.                            |
| `CONTEXT.md`           | Architectura proiect high-level.                    |
| `SPEC.md`              | Specificație produs + Hard Rules.                   |

### 9b. OBLIGAȚII LA START DE TURĂ

Fiecare sesiune Claude.ai nou pornită TREBUIE să:

1. Citească `HANDOFF.md` integral înainte de orice task
2. Consulte `CLAUDE.md` (acest fișier) pentru convenții
3. Consulte `ROADMAP.md` pentru context strategic, dacă e relevant pentru task
4. Respecte decizii LOCKED din HANDOFF.md — NU le re-deschide pentru dezbatere decât dacă user-ul cere explicit

### 9c. OBLIGAȚII LA SFÂRȘIT DE TURĂ

Înainte de a închide sesiunea (voluntar sau forced de rate limit), TREBUIE update `HANDOFF.md` cu minim:

1. Timestamp + motiv handoff în secțiunea 1
2. Stare proiect la zi (commit SHA, baseline teste, branch-uri deschise) în secțiunea 2
3. PR-uri merged în tură în secțiunea 3
4. Decizii LOCKED noi (dacă există) în secțiunea 4
5. Open items noi/rezolvate în secțiunea 5
6. Prompt-uri produse/folosite în secțiunea 6

Detaliile complete sunt în `HANDOFF.md` secțiunea 9 — Protocol sfârșit de tură.

### 9d. UPDATE DOCS CANONICE PRIN PR

Toate update-urile la `HANDOFF.md`, `CHANGELOG.md`, `CLAUDE.md`, `ROADMAP.md`, `CONTEXT.md` trec prin PR, fără excepție. Motiv: disciplină uniformă, CI, history traceability, rollback trivial.

Branch convention docs:
- `docs/handoff-update-YYYYMMDD` — update operațional
- `docs/audit-update-YYYYMMDD` — bugs adăugate
- `docs/<subject>` — update tematic (ex: `docs/roadmap-h3-complete`)

Excepție: dacă update-ul docs e parte natural dintr-un PR feature/refactor care oricum rulează CI, merge în același PR — un singur push, un singur merge.

### 9e. STYLE INTERACȚIUNE (FIXAT)

- **Claude.ai:** planner arhitectural. Propune, analizează, aprobă strategii.
- **Claude Code:** executant tehnic. Rulează cod, edit files, raportează.
- **User:** curier. Operează 3 canale paralel (Claude.ai browser + Claude Code terminal + PowerShell extern). Transferă rapoarte între canale.

Claude.ai NU are acces direct la repo local. Toate modificările fișiere trec prin user → Claude Code sau user → PowerShell extern.

### 9f. CONTINUITATE LA RATE LIMITS

Rate limits Claude Pro sunt frecvente în proiect (sesiuni lungi, tokens consumați pe PR-uri arhitecturale cu discuții lungi). NU sunt excepție — sunt regulă.

Când tokens sunt aproape de limite, contribuitorul curent:

1. Finalizează task-ul curent dacă e aproape gata (nu lasă PR deschis la jumătate)
2. Actualizează `HANDOFF.md` (obligație 9c) cu stare exactă + next steps
3. Predă explicit ștafeta în conversație ("tokens approaching limit, HANDOFF updated, next session please continue from [specific step]")

Dacă tokens se termină brutal la mijloc de task: nu e catastrofă. Următorul contribuitor citește ultima conversație, ultima versiune `HANDOFF.md`, identifică unde s-a oprit, reia.

---

*Onboarding version: 1.2 — Aprilie 2026 (H3 Etapa 1 merged — lib/domain/ infrastructura + Hardening Week status table)*
*Scope V1: ROADMAP.md (operational). Hard Rules §1 + contracte tehnice: SPEC V5.4 (istoric dar autoritar).*



# CLAUDE.md — Adăugări post-audit (Mai 2026)

> Aceste secțiuni se adaugă la `CLAUDE.md` existent. Detalii complete: `/docs/audit/2026-05-pre-launch.md`.

---

## §10 — Decizii LOCKED post-audit pre-launch (2026-05)

### §10.1 Schema-code consistency (preventive)

**Cauza rădăcină a 7+ bugs blocking confirmate empirical:** schema migrations + application code divergente. Fix structural OBLIGATORIU înainte de orice fix individual.

- **TypeScript types Supabase regenerate OBLIGATORIU** după fiecare migration (Husky pre-commit hook):
  ```bash
  npx supabase gen types typescript --local > types/database.ts
  ```
- **Supabase JS client cu strict typing**: `createClient<Database>(...)` — NU `createClient(...)` generic
- **Schema-guard runtime** (`lib/db/schema-guard.ts`): app refuze să pornească dacă DB schema diferă de schema declarată
- **Migrations CI**: up + down + up testat pe fiecare PR (verifică rollback + idempotency)
- **Niciun ALTER TABLE în Supabase UI** (deja LOCKED, reafirmat — accent zero tolerance)

### §10.2 Tests integration cu DB reală (preventive)

- **Tests unit pe mock-uri = INSUFICIENT.** Pentru orice consumer DB, OBLIGATORIU integration test cu Supabase DEV real.
- **Vitest profile separat** (`vitest.integration.config.ts`) contra Supabase DEV.
- **CI pipeline**: integration tests obligatorii înainte de merge la `develop`.
- **Roundtrip tests** pentru export/import — every PR retests end-to-end.

### §10.3 RSVP architecture

- **Anon zero acces RSVP via Supabase JS direct.** Toate operațiile RSVP trec prin Next.js API routes cu `service_role` server-side.
- **`rsvp_invitations.event_id` rămâne NOT NULL** — invitation = `(guest, event)` pereche, NU `(guest, wedding)`.
- **Pivot table `rsvp_invitation_events`** pentru un link unic cu multiple events.
- **Shadow invitation pattern** pentru manual override (invitation cu `delivery_channel='couple_manual'`, `is_active=false`) — NU `invitation_id: null`.
- **History tracking obligatoriu** — `rsvp_response_versions` + trigger `BEFORE UPDATE`.
- **Sync trigger `AFTER INSERT/UPDATE`** pe `rsvp_responses` → `guest_events.attendance_status` cu mapping enum (`accepted → attending`).
- **Email confirmare guest** la fiecare RSVP submit (defense împotriva link forwarding takeover).
- **`wedding.rsvp_modifiable BOOLEAN`** — host poate configura comportament re-submit (default `true` cu warning + email host la modificare).

### §10.4 Atomicity by default

- **Toate operațiile multi-step → PostgreSQL stored procedures cu BEGIN/COMMIT.** NU HTTP-uri independente prin Supabase JS.
- **Account deletion** via `delete_account_atomic()` RPC.
- **Import wedding** via `import_wedding_v2()` RPC.
- **RSVP submit** rămâne atomic via UPSERT, dar audit log per-step adăugat.

### §10.5 Audit log per-step

- **`wl_audit` apelat OBLIGATORIU** pe:
  - Account deletion (per-step, NU doar requested/completed/failed)
  - RSVP submit (cu before/after pentru overwrite detection)
  - Manual RSVP override
  - Wedding member add/remove/role-change
  - Bulk operations (CSV import, JSON import, bulk RSVP)
  - Privacy ops (export, role changes, account state changes)
- **NICIODATĂ doar `console.warn`** pentru evenimente de audit. Trebuie persistat în `audit_logs`.

### §10.6 GDPR compliance

- **Consent gate înainte de PostHog init.** Banner UI-only theater = forbidden.
- **Privacy policy must reflect realitate empirică.** Niciun "Nu utilizăm cookie-uri de tracking" dacă PostHog rulează.
- **Toate processors declarate în privacy §5** + DPA semnat verificat.
- **GDPR rights endpoints obligatorii**: `/api/gdpr/access`, `/api/gdpr/erasure`, `/api/gdpr/object`.
- **Placeholders privacy.html (`[NUME COMPANIE]`, `[EMAIL CONTACT]`, `[DOMENIU]`) NU pot rămâne necompletate** post-launch — checklist pre-deploy.
- **Schrems II compliance**: PostHog instanță EU prefer, sau SCC + TIA documentat dacă US.

### §10.7 Security headers

- **Toate routes mutating → `checkOrigin` obligatoriu** (CI check enforce — assert via test).
- **Headers OWASP standard pe toate response-urile** (CSP, HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, COOP/CORP).
- **CSP report-only mode 1 săptămână** înainte de enforce — colectează violations.
- **`Cache-Control: no-store`** pe toate API routes care return PII.
- **PostHog dezactivat pe rute publice** (`/rsvp/*`) — minimize public_link_id leak surface + privacy guests anon.
- **Referrer-Policy `no-referrer`** specifică pe rute publice (override global).

### §10.8 Rate limiting

- **Rate limit fail-CLOSED** — refuse requests dacă Redis down + monitoring alert.
- **Per-endpoint rate limits granulare**:
  - RSVP submit: 5/min/IP+token
  - Account delete: 1/hour/user
  - Export: 10/hour/user
  - Bulk operations: 1/minute/user
- **Audit log pe rate limit hits** (cu IP + user + endpoint).

### §10.9 Idempotency framework

- **Pattern atomic `INSERT ON CONFLICT DO NOTHING RETURNING`** — NU `SELECT-then-INSERT` clasic (race-prone).
- **Adopt în toate 20 endpoints mutating** (NU doar 1):
  - RSVP submit, manual override, invitations
  - Guests POST/PATCH/DELETE
  - Guest-events bulk
  - Budget items + payments
  - Migrate-local
  - Import JSON
- **PG Cron cleanup TTL 24h** pe `idempotency_keys` (sau Edge Function scheduled).
- **Audit log pe race detection** — când CONFLICT apare, log "idempotency_race".

### §10.10 RLS roluri (defense-in-depth)

- **`is_wedding_role(_wedding_id, _min_role)`** în loc de `is_wedding_member` (role-blind).
- **RLS policies UPDATE/DELETE pe 14 tabele operaționale** folosesc `is_wedding_role(wedding_id, 'editor')`.
- **Decizie: Supabase Auth integration NU se introduce încă** — dacă/când se introduce, RLS role-aware e precondiție.

### §10.11 Documentation discipline

- **Comentarii cod = OBLIGATORIU să reflecte realitatea.** Niciun "One-time: used_at setat la primul submit valid" dacă codul nu o face.
- **Single source of truth** pentru fiecare decizie arhitecturală: schema + code + comments aliniate.
- **Code review check**: dacă comentariu declară comportament, verifică empirical că cod-ul îl implementează.
- **Comentarii MISLEADING = SEVERE.** Audit a descoperit `idempotency.ts:46` "Race condition safe" care era tehnic adevărat dar ascundea gap-ul real.

### §10.12 Pattern recognition: schema drift e cauza rădăcină

**Bug-uri din clasa "TS verde, runtime DB broken" identificate empirical:**

| Bug | Coloana fantomă / NOT NULL violation |
|-----|--------------------------------------|
| C4 Dashboard stats | `seat_assignments.guest_id` (corect = `guest_event_id`) |
| C5 Export tables | `tables.deleted_at` (fantomă) |
| C5 Import wedding | `weddings.location_name` + `owner_user_id` NOT NULL |
| C5 Import events | `events.ends_at` (fantomă) |
| C5 Import guests | `guests.email`, `phone`, `group_id` (fantomă) |
| C5 Import tables | `tables.type` (fantomă, corect = `table_type`) |
| C7 RSVP invitations | `event_id` NOT NULL (lipsă în INSERT) |
| C8 Manual RSVP | `invitation_id` NOT NULL (set null) |
| C11 Account DELETE | `app_users.status` (fantomă) |

**Toate au aceeași cauză:** TS strict NU verifică schema Supabase + tests rulează pe mock-uri.

**Probably mai există bugs din aceeași clasă** în alte consumers neverificați. **Faza 0 (schema-code consistency pipeline) e PRECONDIȚIE** pentru orice fix individual — altfel reparăm bugs care reapar.

---

## §11 — Status post-audit pre-launch (2026-05)

### Verdict empirical

**WeddingList NU este lansabil în starea actuală.** 9 launch blockers confirmate empirical:

| # | Issue | Categorie | Severity |
|---|-------|-----------|----------|
| S1 | RLS RSVP open la anon | Security | 🔴 Critical |
| S2 | PostHog tracking fără consent + privacy false | GDPR | 🔴 Critical |
| C1 | RSVP nu sincronizează guest_events | Logic | 🔴 Critical |
| C3 | RSVP modificabil fără identity check | GDPR Art. 5 | 🔴 Critical |
| C5 | Import JSON 0% functional | GDPR Art. 20 | 🔴 Critical |
| C6 | Export 0% functional | GDPR Art. 20 | 🔴 Critical |
| C7 | rsvp_invitations.event_id NOT NULL — INSERT eșuează | RSVP | 🔴 HIGH |
| C8 | Manual RSVP invitation_id NULL | RSVP | 🔴 HIGH |
| C11 | Account DELETE broken global | GDPR Art. 17 | 🔴 Critical |

### Implicații cumulative

- **RSVP feature complet nefuncțional** pentru un wedding nou (combinație C7 + C8 + C1)
- **7 violations GDPR confirmate empirical** (Art. 5(1)(d), 6, 13, 15, 17, 20, 28)
- **Pattern systemic schema drift** — cel puțin 9 bugs din aceeași clasă

### Plan acțiune (vezi `/docs/audit/2026-05-pre-launch.md` §6)

- **Total estimat:** 174-276h focused work
- **6 faze** structurate (0: Infrastructure → 1: RSVP → 2: GDPR → 3: Security → 4: Data → 5: Integrity → 6: Polish)
- **Faza 0 PRIMA** — fără infrastructure, restul fixurilor sunt construit pe nisip
