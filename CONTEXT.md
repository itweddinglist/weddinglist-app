# Context complet — Weddinglist App

## Cine sunt
Solo dev, Windows, Node.js v24, lucrezi cu Claude + ChatGPT + Gemini pentru review.

## Proiect
Aplicație Next.js pentru plan de mese la nunți (wedding planning SaaS).
Repository: https://github.com/itweddinglist/weddinglist-app
Deploy: Vercel → https://weddinglist-app.vercel.app
WordPress: https://www.weddinglist.ro (Voxel marketplace)
App producție (locked): https://app.weddinglist.ro

## Stack tehnic
- Next.js 16 + React + TypeScript strict
- Tailwind CSS (module noi) + CSS custom (seating chart — NERESCRIS)
- Supabase EU Frankfurt — dev + prod separate
- Vercel deploy
- Sentry EU cu GDPR scrubbing
- Resend pentru email
- WordPress + Voxel — auth bridge

## Branch strategy
- main → producție
- develop → integrare
- feature/* → funcționalități noi
- PR obligatoriu pentru merge în main și develop

## Supabase
- DEV: typpwztdmtodxfmyrtzw (Frankfurt)
- PROD: dtyweqcpanxmckngcyqx (Frankfurt)
- CLI linkat la dev
- Migrations în supabase/migrations/

## Schema DB — 18 tabele
app_users, identity_links, weddings, wedding_members,
events, guests, guest_events, guest_groups,
tables, seats, seat_assignments,
budget_items, payments, vendors,
rsvp_invitations, rsvp_responses,
data_migrations, seating_editor_states

## Decizii arhitecturale locked
- Seating Chart — CSS custom, NERESCRIS, izolat de Tailwind
- Auth prin WordPress bridge (nu Supabase Auth)
- wedding_id pe toate tabelele operaționale
- event_id unde există comportament per eveniment
- Schema changes DOAR prin migrations
- App producție pe app.weddinglist.ro (nu vercel.app)
- TypeScript strict pe tot codul nou
- ESLint strict + Prettier + Husky + commitlint
- Supabase EU Frankfurt pentru ambele proiecte

## Fișiere principale seating chart (LOCKED — nu modifici)
- app/seating-chart/page.js
- app/seating-chart/components/TableNode.jsx
- app/seating-chart/components/GuestSidebar.jsx
- app/seating-chart/components/EditPanel.jsx
- app/seating-chart/hooks/useTableInteractions.js
- app/seating-chart/hooks/useCamera.js
- app/seating-chart/hooks/useSeatingData.js ← canonical data hook
- app/seating-chart/hooks/useSeatingUI.js ← canonical UI hook
- app/seating-chart/utils/geometry.js (GRID=20, PLAN_W/H=10500)
- app/seating-chart/utils/exportPng.js
- app/seating-chart/utils/storage.js (STORAGE_KEY = "wedding_seating_v14")

## Structură lib actuală
app/lib/
  auth/
    fetch-wordpress-bootstrap.ts
    use-wordpress-bootstrap.ts
    feature-flags.ts
    session/
      session-bridge.ts
      use-session.ts
      wp-circuit-breaker.ts
  autosave/
    types.ts
    local-adapter.ts
    supabase-adapter.ts
    use-seating-autosave.ts
  migration/
    use-local-migration.ts
  rate-limit.ts
  supabase/
    client.ts
    server.ts

app/config/
  wedding.js ← date nuntă centralizate (WEDDING, getDaysLeft)

## API endpoints
- GET /api/health
- POST /api/auth/provision (rate limit: 10/min)
- POST /api/migrate-local (rate limit: 5/min)

## Arhitectură seating chart (3 layer-e)
- Layer 1: useCamera — camera, zoom, pan, resize
- Layer 2: useSeatingData — data + business logic (SINGURUL source of truth)
- Layer 3: useSeatingUI — UI state exclusiv (modals, toasts, selection)
- applySeatingEffect — boundary între data și UI
- useTableInteractions — keyboard + mouse interactions
- useGuests.js — ȘTERS (era cod mort, arhitectură veche)

## Warnings ESLint existente (non-blocante, de rezolvat la cleanup)
- app/components/ErrorBoundary.jsx:17 — console.error
- app/components/Skeleton.jsx:34 — height unused

## Roadmap complet

### ✅ Seating Chart Faza 1 — DONE (247 teste verzi)
### ✅ 0A — Foundation — DONE
### ✅ 0B — Auth & Data — DONE

### ✅ 2A — Seating Performance + Refactorizare — DONE
2A.1 Performance baseline — SKIP (vezi mai jos)
2A.2 Selectors + interactionState refactor ✅
2A.3 RAF pentru drag/pan ✅ (implementat în useTableInteractions)
2A.4 React.memo pe componente noi — SKIP (vezi mai jos)
2A.5 useMemo pe guestsByTable ✅ deja implementat
2A.6 Constants file — SKIP (vezi mai jos)
2A.7 JSDoc funcții principale — SKIP (vezi mai jos)
2A.8 Split useGuests ✅ → useSeatingData + useSeatingUI
2A.9 Split useTableInteractions ✅
2A.10 Viewport culling — SKIP (vezi mai jos)

### ✅ Bug fixes sprint (PR #5-#11) — DONE
- saveEdit + rotateTable intră în undo history
- Rotații negative normalizate
- tableId verificat cu != null / == null
- ConfirmDialog optional chaining
- getGroupColor guard pe null/undefined
- guest.prenume[0] optional chaining
- Cookie consent try/catch localStorage
- Spawn logic folosește spawnCounterRef
- borderRect selector cu data-border="1"
- saveEdit guard când editPanel null
- resetPlan nextId derivat din template
- Toast cleanup la unmount
- ErrorBoundary bind în constructor
- filteredUnassigned memo dependență corectă
- loadStorageState cu dimensiuni reale
- Drag masă intră în undo history
- Arrow key repeat guard
- useEffect deps complete în useTableInteractions
- GuestSidebar test pentru setHighlightGroupId
- useGuests.js șters (cod mort)
- Wedding config centralizat în app/config/wedding.js
- Dashboard zile rămase calculate dinamic
- AppShell badge hardcodat eliminat
- SaveIndicator câmp mort eliminat

### Bug sărit — de făcut la Faza 10 (Polish)
- Animații spin duplicate (skeleton-shimmer-spin vs spin) — risc vizual mic,
  valoare mică, lăsat pentru cleanup CSS general din Faza 10

### ⏳ 3 — Guests Core
3.1 Listă invitați — CRUD complet
3.2 Grupuri de invitați (guest_groups)
3.3 Import CSV
3.4 Filtrare + căutare
3.5 Status per eveniment
3.6 Preferințe meniu

### ⏳ 2B — Seating Performance Validation
2B.1 Profiling real cu 600 invitați
2B.2 Stress test 60 mese
2B.3 Virtualizare dacă e nevoie după profiling
2B.4 Performance report final

### ⏳ 5 — Budget Core
### ⏳ 6 — Seating ↔ Guests Integration
### ⏳ 4 — Vendors Mirror
### ⏳ 7 — RSVP
### ⏳ 8 — Account & GDPR Final
### ⏳ 9 — Dashboard complet
### ⏳ 10 — Polish + Lansare (include animații spin cleanup)

## Task-uri sărite din 2A — motive
- **2A.1 Performance baseline** — sărit pentru că nu aveam date reale de test.
  Se face în 2B cu date reale după Guests Core.
- **2A.4 React.memo** — sărit pentru că TableNode are deja React.memo.
  Optimizări agresive se fac după profiling real (2B).
- **2A.6 Constants file** — sărit. Constantele sunt deja în geometry.js,
  camera.js, storage.js. Un fișier constants.js central e nice-to-have,
  nu urgent. De făcut la cleanup general.
- **2A.7 JSDoc** — sărit. De adăugat progresiv pe măsură ce se scrie cod nou.
- **2A.10 Viewport culling** — sărit. Se evaluează după profiling real în 2B.
  Dacă FPS e ok la 60 mese, nu e necesar.

## Teste
- 218/218 teste verzi (după ștergerea useGuests.test.js)
- Test nou adăugat: GuestSidebar — hover pe grup → setHighlightGroupId

## CI/CD
- GitHub Actions — build pică pe SUPABASE_SERVICE_ROLE_KEY lipsă din secrets
  (bug pre-existent, nu legat de codul nostru)
- Vercel deploy funcționează corect

## GDPR
- Supabase EU Frankfurt ✅
- Sentry EU + DPA semnat ✅
- Cookie consent activ ✅
- Privacy Policy în română ✅
- RLS pe toate tabelele ✅
- Data minimization în schema ✅
- Data retention documentat ✅

## Progres total: ~32% din produs complet