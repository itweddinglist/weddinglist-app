# Context complet — Weddinglist App

## Cine sunt
Solo dev, Windows, Node.js v24, lucrezi cu Claude + ChatGPT + Gemini pentru review.

## Proiect
Aplicație Next.js pentru plan de mese la nunți (wedding planning SaaS).
Repository: https://github.com/itweddinglist/weddinglist-app
Deploy: Vercel → https://weddinglist-app.vercel.app
WordPress: https://www.weddinglist.ro (Voxel marketplace)
App producție (locked): https://app.weddinglist.ro

## Design System

### Principiu de bază
Dashboardul e hub-ul vizual al produsului. Design-ul lui se propagă în toate paginile noi (Guests, Budget, RSVP, Vendors, Timeline, Tasks etc.).
Seating Chart este izolat — CSS custom propriu, fără Tailwind, nu se atinge.

### Culori (CSS variables în globals.css)
```css
--color-bg:          #F5F2EE;  /* background cald, aproape alb */
--color-surface:     #FFFFFF;  /* cards, sidebar */
--color-accent:      #C9907A;  /* caramiziu — culoarea brandului */
--color-accent-soft: rgba(201,144,122,0.12); /* accent wash */
--color-text:        #1E2340;  /* text principal navy */
--color-text-muted:  #9DA3BC;  /* text secundar gri-albăstrui */
--color-text-light:  #6E7490;  /* text terțiar */
--color-success:     #48BB78;  /* verde confirmat */
--color-warning:     #ECC94B;  /* galben in_asteptare */
--color-danger:      #E53E3E;  /* roșu urgent/plin */
--color-border:      rgba(196,168,130,0.2); /* border subtil */
--shadow-sm:         0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md:         0 4px 12px rgba(0,0,0,0.08);
--radius-sm:         8px;
--radius-md:         12px;
--radius-lg:         16px;
--radius-pill:       999px;
```

### Tipografie
- **Titluri mari**: Cormorant Garamond, serif, italic — ex: "Bună, Andreea!"
- **UI / labels / body**: DM Sans, sans-serif
- **Numere**: DM Sans cu `font-variant-numeric: tabular-nums`
- Același stack ca seating chart — consistent by design

### Componente UI (pattern-uri)
- **Cards**: background alb, border-radius 12-16px, shadow subtil, padding 1.5rem
- **Butoane principale**: background accent caramiziu, text alb, border-radius pill
- **Butoane secundare**: border 1px accent, text accent, background transparent
- **Sidebar**: alb, item activ cu background accent-soft + text accent
- **Badges**: pill shape, culori semantice (URGENT=roșu, Completat=verde, In progres=galben)
- **Iconuri**: Lucide React, strokeWidth 1.5-1.8, size 16-20px

### Reguli de consistență
- Toate paginile noi folosesc `--color-bg` ca background
- Nu se folosesc culori hardcodate în paginile noi — doar CSS variables
- Seating chart NU se atinge — are culorile sale hardcodate și e OK
- Mockup de referință: ChatGPT_Image_Mar_19_2026 (dashboard principal)

## Target audience
- **Principal**: cupluri din România care planifică nunta
- **Secundar**: planificatori de nunți profesioniști (wedding planners)
- **Piață țintă V1**: România + Moldova + Bulgaria + Serbia
- **Piață țintă V2**: Europa de Est (Polonia, Ungaria, Cehia)

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

## Branch-to-environment map (#23)
| Branch | Environment | URL | Supabase |
|--------|-------------|-----|----------|
| main | Production | app.weddinglist.ro | PROD (dtyweqcpanxmckngcyqx) |
| develop | Staging | deploy automat Vercel preview | DEV (typpwztdmtodxfmyrtzw) |
| feature/* | Preview | URL unic Vercel per PR | DEV (typpwztdmtodxfmyrtzw) |

- **Nu se face push direct pe main sau develop** — branch protection activă
- **Preview deployments** — fiecare PR primește URL unic de la Vercel
- **Hotfix** — branch de la main, PR direct în main + cherry-pick în develop
- **Deploy în producție** = PR din develop → main, după teste verzi + preview verificat

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
- Rămânem pe SVG pentru V1. Canvas pentru V2 dacă FPS < 45 după toate optimizările.

## Invalidate definitiv
- Sugestie masă liberă când plină — bordura roșie acoperă nevoia
- Seat Lock — Magic Fill respectă deja asignările manuale
- Scroll to selected guest — sidebar rămâne neschimbat
- Relationship-Aware Seating
- Undo History Panel complex
- Auto Balance Tables
- Table Templates preset
- 3D venue
- Household-based invitation → V2 RSVP

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

## Config centralizat
- app/config/wedding.js — WEDDING (mire, mireasa, data, locatie) + getDaysLeft()

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

## Warnings ESLint existente (non-blocante)
- ✅ app/components/ErrorBoundary.jsx:17 — rezolvat: eslint.config.mjs permite console.error
- ✅ app/components/Skeleton.jsx:34 — rezolvat: height aplicat ca minHeight pe container
- ✅ app/seating-chart/components/CanvasToolbar.jsx — rezolvat: border shorthand fix pe lock button

## Teste
- 541/541 teste verzi
- useSeatingData.test.js — 80 teste
- useSeatingUI.test.js — 42 teste
- useTableInteractions.test.js — 20 teste
- TableNode.test.jsx — 22 teste
- useCamera.test.js, geometry.test.js, magicFill.test.js, storage.test.js, camera.test.js, GuestSidebar.test.jsx, StatsPanel.test.jsx, EditPanel.test.jsx, CanvasToolbar.test.jsx
- lib/rsvp/token.test.ts — 19 teste
- lib/rsvp/validate-rsvp-submission.test.ts — 17 teste

## Optimizări SVG — STATUS COMPLET (50-60 FPS la drag cu 60 mese + 600 invitați)

### Implementate (20 optimizări):
1. ✅ EMPTY_ARRAY constant + assignedGuests prop în loc de guestsByTable
2. ✅ Comparator custom tableNodeComparator pe React.memo(TableNode)
3. ✅ Progressive detail: vzoom<0.2 rect simplu, vzoom<0.4 fără scaune, vzoom>=0.4 complet
4. ✅ isDraggingThisTable — fără text/badge/arc/shadow în drag
5. ✅ Filtre SVG eliminate la vzoom<0.3 și isDraggingThisTable
6. ✅ hoveredGuestClearedRef — hover disabled în drag/pan
7. ✅ guestById + tableById Map memoizate în useSeatingData.js (O(1) lookup)
8. ✅ Drag preview tranzitoriu — dragPreviewRef + notifyDrag + setDragTick
9. ✅ Viewport culling — isTableVisible() cu padding 300px în page.js
10. ✅ useMemo pentru d și seatPositions bazat pe [t.type, t.seats, t.isRing]
11. ✅ pointerEvents: none pe elemente decorative
12. ✅ willChange: transform pe outer <g>
13. ✅ Scaune goale skip când assignedGuests.length === 0 && vzoom < 0.5
14. ✅ isDimmed calculat local per masă
15. ✅ hoveredGuestRef în useSeatingUI — tooltip fără re-render global
16. ✅ Hit zones mai mari — r="28" drop zone, r="24" scaune ocupate
17. ✅ occupancyText precomputed
18. ✅ React.memo pe GuestSidebar și StatsPanel
19. ✅ Eliminat transition CSS și vectorEffect redundant
20. ✅ Sidebar scroll funcțional

### Baseline → Rezultat:
- Baseline: 27-30 FPS la drag cu 60 mese + 600 invitați
- După optimizări: 50-60 FPS

### Tools de performanță:
- FpsCounter.jsx — dev-only, colț dreapta sus, verde>50fps, galben 30-50fps, roșu<30fps
- generateTestData.js — script browser console, 60 mese + 600 invitați

## Modificări arhitecturale sesiunea curentă (Mar 28, 2026)

### Must Now #1 #2 #3 #6 #7 #8 #9 #10 #11 #12 #13 ✅:
- ✅ Source of truth map (WP=identity, Supabase=operational, localStorage=draft)
- ✅ localStorage vs Supabase conflict policy documentată
- ✅ Failure mode matrix per serviciu (WP/Supabase/Vercel/Resend)
- ✅ CORS/CSRF pe WP bridge documentat
- ✅ Service role key audit — unde e folosit, unde e interzis
- ✅ Sentry PII scrubbing rules — log behavior, not content
- ✅ Structured logging policy cu correlation ID
- ✅ Environment variables documentate complet
- ✅ Deploy checklist — pași obligatorii înainte de merge în main
- ✅ Rollback procedure pas cu pas
- ✅ Critical flows list pentru testing manual

### Must Now #22 ✅:
- ✅ Dashboard: banner onboarding cu CTA spre Plan Mese
- ✅ GuestSidebar: allSeated success state cu buton Export PNG
- ✅ GuestSidebar: prop onExport conectat din page.js

### Must Now #18 + #19 ✅:
- ✅ SaveIndicator redesenat complet: saving/saved/error/offline/idle
- ✅ useSeatingData: callback `onSaveStatusChange` pe autosave (saving→saved/error)
- ✅ page.js: `saveStatus` + `isOffline` state, online/offline listeners cu cleanup
- ✅ React.memo pe SaveIndicator — zero impact canvas performance
- ✅ Stale closure safe prin `onSaveStatusChangeRef`
- ✅ O singură sursă de adevăr pentru save (callback pattern, nu hook izolat)

### Sesiunea anterioară (Mar 27, 2026):
### Fix-uri ESLint ✅:
- ✅ CanvasToolbar.jsx — border shorthand mixing fix pe butonul lock
- ✅ eslint.config.mjs — no-console permite console.error și console.warn
- ✅ Skeleton.jsx — height prop aplicat ca minHeight pe SkeletonCard

### Must Now verificate ✅:
- ✅ #4 generateTestData.js — nu e importat în app, safe
- ✅ #25 Gravity Guard — Math.max/min pe PLAN_W/H în useSeatingData și useTableInteractions
- ✅ #26 Guest Collision — UNIQUE constraint seat_assignments_guest_event_id_key există în Supabase DEV
- ✅ #28 migrateIfNeeded — implementat în storage.js prin sanitize + compatibilitate v13→v14
- ✅ #5 RLS policies — complet Mar 28, 2026: 71 policies pe 18 tabele, 3 helper functions, GRANT anon/authenticated. Migrație aplicată și în repo.
- ✅ #29 Safe write pattern — ADR-029 aprobat și în repo (docs/adr/). Scor 9.3/10, review Claude+ChatGPT+Gemini.
- ✅ #17 Input sanitization — pattern documentat, câmpuri identificate per tabel, implementare la Faza 3.
- ✅ #14 Data Model Invariants — constraints existente auditate, lipsă documentate cu SQL.
- ✅ #15 State Transitions — tranziții valide per entitate documentate, implementare transitions.ts la Faza 3.
- ✅ P10 Virtualizare sidebar — VirtualList nativ, flex layout 30/70 fără search, 30/35/35 cu search.
- ✅ #27 Soft Delete — deleted_at pe weddings, view active_weddings, RLS actualizat, RPC soft_delete_wedding(). Migrație aplicată.


### Tooltip (P8) ✅:
- ✅ onMouseEnter/onMouseLeave mutate pe circle r=24 (hit zone real)
- ✅ useTableInteractions: up() — setHoveredGuest(null) doar după drag/pan activ
- ✅ handleSvgMouseDown: eliminat setHoveredGuest(null)
- ✅ GuestSidebar: tooltip pe avatarul din secțiunea AȘEZAȚI

### Ring Dans ✅:
- ✅ Nume editabil (t.name în loc de hardcodat)
- ✅ Formă: cerc dashed consistent cu stilul meselor
- ✅ Hit zone transparent pentru drag/click/doubleclick
- ✅ Buton Ring în toolbar cu icon SquircleDashed
- ✅ isRing propagat din modal la createTable

### Toolbar icons ✅:
- ✅ Prezidiu: GalleryThumbnails rotit 180°
- ✅ Drept: RectangleHorizontal
- ✅ Ring: SquircleDashed

### Sidebar search ✅:
- ✅ Căutare fără diacritice (normalize NFD)
- ✅ activeGroupId separat de searchQuery — fără false positives
- ✅ Highlight vizual grup activ
- ✅ Buton × resetează searchQuery și activeGroupId
- ✅ maxHeight grupuri 25vh

### Culori border occupancy (P6) ✅:
- ✅ La zoom 0.2-0.4: verde/galben/roșu în funcție de ocupare
- ✅ occupancyBs pe round, square, rect (prezidiu neatins)

### Fix highlightGroupId (P2) ✅:
- ✅ tableNodeComparator: re-render toate mesele când grupul se schimbă
- ✅ onMouseEnter pe SVG resetează highlightGroupId

### UX seat positions ✅:
- ✅ Square: distribuție echilibrată pe 4 laturi (5→2+1+1+1 etc.)
- ✅ Square/rect: scaune la 8px de masă (consistent cu prezidiu)
- ✅ Progress border strokeDasharray pe square și rect
- ✅ Nume invitat deasupra scaunului la rect/prezidiu când e pe rândul de sus
- ✅ Card clickedSeat: buton X pentru închidere manuală

## Task-uri în curs (de continuat în sesiunea următoare)

### Rămase seating chart:
- ⏳ P3 — isDimmed opacity 0.3 → 0.6 | Dificultate: Mică
- ⏳ P9 — Zoom < 0.2 rect redus la 60-70% din dimensiune | Dificultate: Mică
- ✅ P10 — Virtualizare sidebar — VirtualList nativ, flex layout proporțional | Dificultate: Medie
- ⏳ P11 — Seat swap drag & drop (drag invitat din scaun → alt scaun/masă) | Dificultate: Mare

## Ordinea recomandată sesiunea următoare
1. **Faza 2B** — Seating Performance Validation (profiling pe date reale, 2B.1/2B.3/2B.4/2B.5/2B.6)
2. **Faza 5** — Budget Core
3. **Faza 6** — Seating ↔ Guests Integration
4. **Faza 4** — Vendors Mirror
5. **Faza 7** — RSVP + UI Guests
→ Task Engine se implementează la final V1 după Faza 9.
→ Dashboard redesign după ce toate modulele au date reale.
→ Module eliminate: Moodboard, Wishlist, Notes, Checklist, Timeline — absorbite în Dashboard/Task Engine.
→ Module rămase: 9 (Dashboard, Seating, Guests, Budget, Vendors, RSVP, Export, Settings, Guest Moments).

## PR-uri merged în develop (total 53)
- #1-4: Foundation, Auth, Data setup
- #5: saveEdit/rotateTable undo, rotații negative
- #6: tableId null safety, ConfirmDialog, getGroupColor, guest initials
- #7: cookie consent, spawn counter, border rect, save edit guard, reset nextId
- #8: toast cleanup, error boundary, memo deps, storage dims, drag undo
- #9: arrow key repeat guard, useEffect deps, highlight group test
- #10: useGuests removed
- #11: wedding config centralizat, hardcoded data eliminat
- #12: CONTEXT.md adăugat
- #13: teste useSeatingData + useSeatingUI (122 teste noi)
- #14: FpsCounter.jsx + generateTestData.js
- #15: fix toast duplicate keys (string id)
- #16: sidebar scroll + cleanup CSS
- #17: SVG optimizări faze 1-4 (17 optimizări)
- #18: P4 shortName zoom 0.2-0.5, P5 Magic Fill toast sumar
- #19: update context SVG optimizări
- #20: P4+P5 shortname toate tipurile mese, magic fill toast
- #21: fix(p8) tooltip fix complet
- #22: feat(p8-ux) ring dans editabil, drag fix, card X, toolbar icons
- #23/24: feat(sidebar-search) diacritice, activeGroupId, highlight vizual grup
- #25: feat(p6) culori border occupancy zoom 0.2-0.4
- #27: fix(p2) highlightGroupId reset bug
- #28: feat(ux) seat positions, progress border, nume invitat
- #29: docs: update context
- #30: fix: border shorthand mixing in lock button canvastoolbar
- #31: fix: resolve eslint warnings in errorboundary and skeleton
- #32: docs: context final + priorities locked
- #33: feat(ux): error recovery ux + user trust signals (#18 #19)
- #34: docs: system boundaries, product principles, branch map, readme (#20 #21 #23 #24)
- #35: feat(ux): first-run empty states + success states (#22)
- #36: docs: source of truth, failure modes, cors, service role, logging, env vars, checklists (#1 #2 #3 #6 #7 #8 #9 #10 #11 #12 #13)
- #37: docs: rls audit + status + policies plan (#5)
- #38: feat(security): rls policies complete — 18 tabele, 71 policies (#5)
- #39: docs: undo strategy, worst day plan, product rules (#31 #32 #33)
- #40: docs: add adr-029 safe write pattern — approved for faza 3 (#29)
- #41: docs: input sanitization pattern + campuri per tabel (#17)
- #42: docs: data model invariants + state transitions (#14 #15)
- #43: feat(db): soft delete weddings — deleted_at, view, rls update, rpc (#27)
- #44: feat(perf): sidebar virtualization - native virtual list, flex layout 3 sections (p10)
- #45: docs: p10 sidebar virtualization done, pr #44 adaugat
- #50: feat(api): guests crud api - routes, validation, sanitization, tests (3.1)
- #51: feat(api): guest events api - routes, bulk, validation, tests (3.2)
- #52: feat(api): duplicate warnings, sanitation tests - guests (3.5, 3.7)
- #53: feat(api): csv import guests - parser rfc4180, validation, dedup, bulk insert (3.4)

## Scor Seating Chart
- Înainte de sesiunea curentă: 8.2/10
- După sesiunea curentă: ~9.0/10
- După P3, P9, P10, P11: 9.5/10

## Roadmap complet

### ✅ Seating Chart Faza 1 — DONE (~9.0/10)
- ✅ Progressive Detail pe Zoom (vzoom < 0.2 / 0.4 / 0.5)
- ✅ Drag & drop mese + invitați
- ✅ Group Highlight pe Canvas (hover grup → fade mese)
- ✅ Export PNG A4
- ✅ Magic Fill automat cu distribuție echilibrată
- ✅ Sidebar search cu diacritice + filtru grup activ
- ✅ Culori border occupancy la zoom 0.2-0.4
- ✅ Progress border pe square și rect (strokeDasharray)
- ✅ Ring Dans editabil cu hit zone
- ✅ Tooltip invitați cu delay 250ms
- ✅ EditPanel modal (rename, resize mese)
- ✅ Auto-save indicator (localStorage)
- ✅ Empty State sidebar (3 stări)
- ✅ Esc închide overlay-uri
- ✅ Card clickedSeat cu buton X
- ✅ 541/541 teste verzi
- ✅ 50-60 FPS cu 60 mese + 600 invitați

### ✅ Faza 0A — Foundation — DONE
- ✅ 0A.1 GitHub + branch protection + environments | Mică
- ✅ 0A.2 Supabase projects separate dev/prod | Mică
- ✅ 0A.3 Schema completă + data integrity + data minimization | Mare
- ✅ 0A.4 Indexing + constraints + UNIQUE seat_assignments | Mică
- ✅ 0A.5 RLS pe toate tabelele operaționale | Medie
- ✅ 0A.6 Sentry + Uptime monitoring + Alerting | Mică
- ✅ 0A.7 Deploy Vercel + Rollback + Preview deployments | Mică
- ✅ 0A.8 Cookie consent + Privacy Policy + Legal basis | Medie
- ✅ 0A.9 Schema versioning — Supabase CLI migrations | Medie
- ✅ 0A.10 Backup + restore testat | Mică
- ✅ 0A.11 Design tokens în globals.css + Tailwind config | Mică
- ✅ 0A.12 Tailwind setup + safelist/pattern policy | Mică
- ✅ 0A.13 Regulă explicită Seating izolat de Tailwind | Mică
- ✅ 0A.14 Visual parity check Seating ↔ AppShell | Mică
- ✅ 0A.15 Bundle size budget | Mică
- ✅ 0A.16 /api/health endpoint | Mică

### ✅ Faza 0B — Auth & Data — DONE
- ✅ 0B.1 Bootstrap endpoint WordPress + API contract stabil | Medie
- ✅ 0B.2 Session Bridge Next.js + Feature flags + Circuit breaker WP (timeout agresiv, max 2-3 retry-uri, cooldown 60s) | Mare
- ✅ 0B.3 Idempotent provisioning + Idempotency API endpoints | Mare
- ✅ 0B.4 localStorage hydration + Migration flow + Race conditions | Mare
- ✅ 0B.5 Autosave + persistence + Saving/Saved/Error indicator | Medie
- ✅ 0B.6 Error boundaries global + per zonă canvas/sidebar | Medie
- ✅ 0B.7 Loading states + Skeleton UI | Mică
- ✅ 0B.8 Rate limiting basic auth + RSVP + export | Medie
- ✅ 0B.9 Data retention regulă minimă | Mică
- ✅ 0B.10 Testing flows critice | Medie

### ✅ Faza 2A — Seating Performance Foundation — DONE
- ✅ 2A.1 Selectors memoizați — guestsByTable, unassigned, occupancy | Mică
- ✅ 2A.2 React.memo + useCallback + props stabile | Mică
- ✅ 2A.3 interactionState separat — draggingTableId, livePosition, hoverSeat | Medie
- ✅ 2A.4 Drag cu RAF — update în ref, commit la drop | Medie
- ✅ 2A.5 Viewport engine — camRef, world space separat | Medie
- ✅ 2A.6 Progressive detail pe zoom | Medie
- ✅ 2A.7 Hit testing strategy — 60 mese apropiate | Medie

### ✅ Faza 3 — Guests Core (~85% completă)
- ✅ 3.1 Guests CRUD — GET/POST/PUT/DELETE /api/guests, 376 teste | Medie
- ✅ 3.2 Event-scoped model — guest_events + bulk endpoint, 403 teste | Mare
- ⏳ 3.3 partyId — amânat după UI Guests (Faza 7) | Medie
- ✅ 3.4 Import CSV — RFC 4180 parser zero deps, dedup, fallback row-by-row, 434 teste | Medie
- ✅ 3.5 Validări — duplicate warnings în POST /api/guests | Mică
- ⏳ 3.6 Limits — amânat până la Stripe / planuri plătite | Mică
- ✅ 3.7 Data sanitation — trim, stripHTML, entities, maxLength activ în lib/sanitize.ts | Mică

### ⏳ Faza 2B — Seating Performance Validation
- ⏳ 2B.1 Profiling real — scenarii 15/120, 35/300, 60/600 | Medie
- ✅ 2B.2 Virtualizare sidebar — VirtualList nativ, flex 30/70 fără search, 30/35/35 cu search | Medie
- ⏳ 2B.3 Tuning filtering + selectors | Mică
- ⏳ 2B.4 Magic Fill tuning pe date reale | Medie
- ⏳ 2B.5 Stress tests 60/600 | Mică
- ⏳ 2B.6 partyId impact pe render + highlight grup | Medie

### ⏳ Faza 5 — Budget Core
- ⏳ 5.1 Budget items — fixed, per_guest, vendor linked, manual | Medie
- ⏳ 5.2 Payments — avans, rest, paid/unpaid, due dates | Medie
- ⏳ 5.3 Derived totals — total, paid, remaining, per event | Mică
- ⏳ 5.4 Plan limits + feature flags din cod | Medie
- ⏳ 5.5 Downgrade behavior — revizuit după Stripe connect | Medie

### ⏳ Faza 6 — Seating ↔ Guests Integration
- ⏳ 6.1 Eligibility rules — doar confirmați, doar event activ | Mică
- ⏳ 6.2 Seat assignment persistence — legat de guest_event | Medie
- ⏳ 6.3 Seat swap / move — manual move, swap logic, validare | Mare
- ⏳ 6.4 Group behavior — party-aware, move group, bulk seat | Mare
- ⏳ 6.5 Capacity warnings — incomplete, overcapacity, imbalance | Mică
- ⏳ 6.6 Conflict detection la drag | Mare

### ⏳ Faza 4 — Vendors Mirror
- ⏳ 4.1 Fetch favorites din WP + cache | Medie
- ⏳ 4.2 vendor_states în Supabase | Mică
- ⏳ 4.3 Degraded mode — cache local, banner discret | Medie
- ⏳ 4.4 Hook în Budget — vendor costs, status | Mică

### ⏳ Faza 7 — RSVP (parțial completată)
- ✅ 7.1 Migrație DB — enums, rsvp_invitations extins, rsvp_responses extins
- ✅ 7.2 Token security — SHA-256, TTL 30 zile, one-time
- ✅ 7.3 API routes — GET + POST public, POST autentificat
- ✅ 7.4 Email stub Resend — activat cu RESEND_API_KEY
- ✅ 7.5 Pagina publică /rsvp/[token]
- ✅ 7.6 Translations RO + structură multilingvă
- ⏳ 7.7 Invite Delivery Hub UI — pentru cuplu
- ⏳ 7.8 RSVP Dashboard UI — pentru cuplu
- ⏳ 7.9 Household-based invitation | V2

### ⏳ Faza 8 — Export & Compliance
- ⏳ 8.1 Export JSON — backup, transfer | Mică
- ⏳ 8.2 Import JSON — restore, support flow | Mică
- ⏳ 8.3 Export PDF | Medie
- ⏳ 8.4 GDPR — account deletion, data export, retention policy | Medie
- ⏳ 8.5 Audit trail opțional | Mică

### ⏳ Faza 9 — Reliability & QA
- ⏳ 9.1 Overview statistici nuntă (invitați, buget, RSVP) | Medie
- ⏳ 9.3 Teste critice — import, export, provisioning, migration | Medie
- ⏳ 9.4 Logging critical flows — auth, hydration, RSVP | Medie
- ⏳ 9.5 Recovery / rollback — backup flow, retry, support tooling | Mare

### ⏳ Faza 10 — Power Features
- ⏳ 10.1 Bulk seat group | Mare
- ⏳ 10.2 Keyboard seating avansat | Medie
- ⏳ 10.3 Touch support + Test iPad real | Mare
- ⏳ 10.4 i18n infrastructură | Medie
- ⏳ 10.5 PWA / Offline support | Medie
- ⏳ 10.6 PostHog usage tracking | Mică
- ⏳ 10.7 Stripe connect — plan limits + downgrade | Medie
- ⏳ 10.8 Command palette Ctrl+K | Mare
- ⏳ 10.9 Right click context menu | Medie
- ⏳ 10.10 Multi-user colaborare | Foarte Mare
- ⏳ 10.11 Redis / rate limiting avansat | Medie
- ⏳ 10.12 Canary deployment | Medie
- ⏳ 10.13 Documentație internă completă | Mică
- ⏳ 10.14 Optimistic UI feedback seating — micro-animație la write in-flight, rollback vizual | Medie
- ⏳ 10.15 Batch writes seating — update_editor_state_batch() pentru layout reorganization | Medie

### V2 — NU în V1
- Tasks / Checklist
- Sticky Notes
- Wedding Day Timeline
- Guest Memories (QR upload)
- Household-based invitation
- Canvas în loc de SVG (dacă FPS < 45)

## STORAGE_KEY — versioning localStorage
- Cheia curentă: `wedding_seating_v14`
- Numărul se incrementează DOAR la breaking changes în schema localStorage
- Exemple de când să incrementezi: adaugi câmp obligatoriu, schimbi tipul unui câmp, redenumești proprietăți, schimbi structura obiectului salvat
- Exemple de când NU incrementezi: adaugi câmp opțional cu default, fix-uri de logică fără schimbări de schemă
- La incrementare: șterge datele vechi din localStorage (utilizatorii pierd datele nesincronizate)

## Cum lucrez cu Claude
- Dau întotdeauna fișierul complet pentru verificare înainte de commit
- Fac modificări local pas cu pas după instrucțiunile Claude
- Commit după fiecare feature/fix, nu bulk commits
- Testele rulează cu `npx vitest run` — baseline curent: 541/541
- PR obligatoriu chiar și când lucrez singur — protect develop și main
- Limbă română în toate conversațiile și commit messages


## Bug-uri cunoscute (nedocumentate în issues)
- ✅ CanvasToolbar.jsx — mixing `border` shorthand cu `borderColor` pe butonul de lock (warning React non-blocant)

## GDPR
- ✅ Supabase EU Frankfurt
- ✅ Sentry EU + DPA semnat
- ✅ Cookie consent activ
- ✅ Privacy Policy în română
- ✅ RLS pe toate tabelele
- ✅ Data minimization în schema
- ✅ Data retention documentat

## System Boundaries (#20)
> Ce NU face fiecare layer — anti-pattern list

| Layer | Responsabilitate | NU face niciodată |
|-------|-----------------|-------------------|
| **useSeatingData** | data + business logic | setClickedSeat, showToast, setModal, nu știe de UI |
| **useSeatingUI** | UI state exclusiv | nu scrie în DB, nu citește localStorage direct |
| **useCamera** | viewport, zoom, pan | nu știe de guests sau tables |
| **useTableInteractions** | keyboard + mouse | nu modifică guests direct, nu apelează Supabase |
| **page.js** | orchestrare layere | nu conține business logic, nu scrie în DB direct |
| **Componente** (TableNode, GuestSidebar) | render + events locale | nu apelează hooks de date direct, primesc totul prin props |
| **API routes** | server-side operations | nu returnează date nesanitizate, nu expun service role key |

**Anti-patterns interzise:**
- UI nu scrie DB direct — trece prin data layer
- Data layer nu importă componente UI
- Hooks nu se apelează condiționat
-  în TypeScript pe date din Supabase
- Business logic în componente — aparține în hooks sau domain/rules.ts
- Fetch fără error handling — orice await are try/catch

## Product Principles (#21)
> Reguli de produs — fiecare decizie de UX se validează față de acestea

- **NO SURPRISES** — userul nu este niciodată surprins. Orice acțiune cu consecințe are confirmare.
- **REVERSIBILITY** — orice acțiune poate fi anulată. Delete cu confirmare, undo disponibil.
- **VISIBILITY** — orice acțiune are feedback instant. Loading state, success state, error state — toate vizibile.
- **GUEST-FIRST** — UX gândit din perspectiva invitatului, nu a canvas-ului sau a developer-ului.
- **MAX 2-3 PAȘI** — nicio acțiune critică nu durează mai mult de 3 pași. Dacă durează mai mult, regândește flow-ul.
- **ZERO DEAD ENDS** — userul are întotdeauna o cale de ieșire. Niciun ecran fără buton de back/cancel/undo.
- **FEEDBACK INSTANT** — latența Supabase nu se simte. Optimistic UI unde e posibil, SaveIndicator unde nu e.
- **MESAJE ÎN ROMÂNĂ** — toate mesajele de eroare, success și empty state sunt în română, clare și umane.

## Source of Truth Map (#1)
> Fiecare tip de date are un singur owner. Conflictele se rezolvă întotdeauna în favoarea owner-ului.

| Date | Owner | Fallback | Regulă |
|------|-------|----------|--------|
| Identitate user (email, nume, rol) | **WordPress** | — | WP e sursa unică de identitate |
| Date operaționale (guests, tables, budget, RSVP) | **Supabase** | — | Supabase e sursa unică pentru date de produs |
| Draft seating nesincronizat | **localStorage** | Supabase la login | localStorage = draft temporar, nu adevăr |
| Sesiune activă | **WordPress cookie** | Redirect la login | Sesiunea e validată prin WP bridge |

**Regula de conflict:** după login, Supabase wins. localStorage se migrează în Supabase și devine obsolet.

## localStorage vs Supabase Conflict Policy (#2)
- **localStorage** = draft de urgență, recovery în caz de crash, stare offline
- **Supabase** = adevărul operațional după autentificare
- **La login:** dacă există date în localStorage → flow de migrare → datele merg în Supabase → localStorage se șterge
- **La conflict** (localStorage mai nou decât Supabase): Supabase wins întotdeauna — userul e notificat
- **Offline:** localStorage e folosit ca write-through cache, sincronizat la reconectare
- **Nu** se merge niciodată date din localStorage în Supabase fără validare explicită

## Failure Mode Matrix (#3)
> Comportament concret per serviciu down. Fără asta, un incident devine o urgență.

| Serviciu | Impact | Fallback | UX |
|----------|--------|----------|-----|
| **WordPress down** | Auth imposibil pentru useri noi | Circuit breaker activ (wp-circuit-breaker.ts) — userii logați rămân activi via cookie | Banner discret "Autentificare temporar indisponibilă" |
| **Supabase down** | Nu se pot salva date noi | localStorage ca buffer temporar — SaveIndicator arată "Offline" | "Salvăm local, sincronizăm când revenim online" |
| **Vercel down** | App inaccesibil complet | — | Status page extern (viitor) |
| **Resend down** | Email-uri RSVP nu se trimit | Queue retry (viitor) — invitații nu primesc email | Admin vede eroare în dashboard, poate retrimite manual |
| **Sentry down** | Erori neloggate | App funcționează normal, fără impact UX | — |

**Regula generală:** degradare grațioasă > oprire completă. Userul trebuie să poată cel puțin vizualiza datele existente.

## CORS/CSRF pe WP Bridge (#6)
- **CORS:** Vercel trimite request-uri la WP endpoint — WP trebuie să permită originile `app.weddinglist.ro` și `*.vercel.app` (preview)
- **Allowlist explicită:** nu `*` — doar originile cunoscute
- **CSRF:** endpoint-urile WordPress bridge folosesc nonce WP + validare origin
- **API routes Next.js** (`/api/auth/provision`, `/api/migrate-local`) — nu expun CORS public, sunt server-to-server
- **Cookie-uri:** `SameSite=Strict` pe cookie-ul de sesiune WP

## Service Role Key Audit (#7)
> Service role key bypass-ează RLS complet. Trebuie tratat ca secret absolut.

**Unde E folosit (corect):**
- `app/lib/supabase/server.ts` — client server-side exclusiv
- `app/api/auth/provision/route.ts` — provizionare user la primul login
- `app/api/migrate-local/route.ts` — migrare date din localStorage

**Unde NU este și NU trebuie să fie:**
- Niciun fișier client-side (`use client`)
- Niciun fișier expus în bundle frontend
- Niciodată în variabile `NEXT_PUBLIC_*`
- Niciodată în logs sau Sentry

**Regulă:** dacă ai nevoie de service role pe client → arhitectura e greșită, creează un API route.

## Sentry PII Scrubbing (#8)
> Ce NU intră în Sentry — GDPR + privacy by design.

**Scrubbed automat (configurat în Sentry):**
- Email-uri utilizatori
- Nume și prenume invitați
- Numere de telefon
- UUID-uri de wedding (pot identifica indirect un user)
- Tokens RSVP
- Orice câmp din `guests`, `rsvp_responses`

**Ce intră în Sentry (comportament, nu conținut):**
- Tipul erorii și stack trace
- Browser + OS
- URL-ul paginii (fără query params cu date personale)
- Versiunea aplicației

**Regulă:** log behavior, not content. "Guest assignment failed" ✅ — "Guest Ion Popescu assignment failed" ❌

## Structured Logging Policy (#9)
> Cum logăm — consistență și GDPR.

- **Log behavior, not content** — acțiunea, nu datele
- **Format:** `[NIVEL] [modul] mesaj` — ex: `[ERROR] [provision] User provisioning failed`
- **Correlation ID:** fiecare request API primește un ID unic pentru tracking cross-service
- **Nu se loghează:** date personale, tokens, UUIDs de user, conținut RSVP
- **Console.error și console.warn** permise în producție pentru erori critice (configurat în eslint.config.mjs)
- **Sentry** pentru erori neașteptate — nu pentru flow normal

## Environment Variables (#10)
> Toate variabilele de mediu ale aplicației.

| Variabilă | Scope | Folosită în | Acces |
|-----------|-------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | supabase/client.ts, supabase/server.ts | Public — OK în bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | supabase/client.ts | Public — RLS protejează |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | supabase/server.ts | **Secret — niciodată în client** |
| `NEXT_PUBLIC_WP_BASE_URL` | Client + Server | fetch-wordpress-bootstrap.ts | Public — doar URL |
| `NODE_ENV` | Server | diverse guards | Automat Next.js |

**Unde sunt stocate:** Vercel Dashboard → Settings → Environment Variables
**Cine are acces:** doar owner-ul proiectului Vercel
**Rotație:** la orice suspiciune de leak — vezi Secrets Rotation Playbook (Before Launch)

## Deploy Checklist (#11)
> Pași obligatorii înainte de merge din develop → main (producție).

1. ✅ `npx vitest run` — toate testele verzi (541/541 baseline)
2. ✅ `npm run lint` — zero erori ESLint
3. ✅ Preview deploy Vercel verificat manual — login, seating chart, save, export
4. ✅ Migrații Supabase aplicate pe PROD dacă există schema changes
5. ✅ CONTEXT.md și PRIORITIES.md actualizate
6. ✅ PR aprobat și review făcut
7. ✅ Rollback plan cunoscut înainte de merge

**Nu se face deploy vineri după-amiaza sau înainte de evenimente importante.**

## Rollback Procedure (#12)
> Pași exacți când ceva merge prost în producție.

**Decizie rollback:** dacă în primele 30 minute după deploy apare eroare critică (auth broken, date pierdute, app inaccesibil).

**Pași:**
1. **Vercel rollback instant** — Dashboard → Deployments → alege deployment anterior → Promote to Production (< 2 minute)
2. **Dacă există migrații Supabase** — rollback manual prin migration inversă (down migration pregătită în avans)
3. **Anunță** — dacă sunt useri activi, postează status (viitor: status page)
4. **Postmortem** — documentează ce s-a întâmplat în 24h

**Rollback automat vs hotfix:**
- Rollback automat dacă eroarea e în cod (Vercel instant)
- Hotfix dacă eroarea e în date sau migrații (necesită analiză)

## Critical Flows pentru Testing (#13)
> Regression checklist — testează manual după orice deploy major.

**Flow 1 — Auth:**
- [ ] Login via WordPress redirect funcționează
- [ ] User nou e provizionat corect în Supabase
- [ ] User existent nu e duplicat
- [ ] Sesiune expirată → redirect la login (nu crash)

**Flow 2 — Seating Chart:**
- [ ] Datele se încarcă din localStorage la boot
- [ ] Drag & drop invitat pe masă funcționează
- [ ] Save indicator apare (Syncing → Saved)
- [ ] Magic Fill distribuie invitații corect
- [ ] Export PNG generează fișierul

**Flow 3 — Save & Persist:**
- [ ] Modificare → salvare automată în 500ms
- [ ] Refresh pagină → datele persistă
- [ ] Offline → SaveIndicator arată "Offline · Salvat local"
- [ ] Online → sincronizare automată

**Flow 4 — RSVP (când e implementat):**
- [ ] Token unic per invitat
- [ ] Submit răspuns → confirmat în DB
- [ ] Token expirat → mesaj clar

## RLS Audit — Status (#5)
> Audit rulat Mar 28, 2026 pe Supabase DEV (typpwztdmtodxfmyrtzw)

**Rezultat audit inițial (Mar 28, 2026):**
- ✅ `rowsecurity = true` pe toate 18 tabele — RLS activat
- ✅ 71 policies aplicate — toate tabelele protejate
- ✅ 3 helper functions: `auth_user_id()`, `is_wedding_member()`, `is_wedding_owner()`
- ✅ GRANT corect pe rolurile `anon` și `authenticated`
- ✅ RSVP public via token_hash, restul membership-gated

**Migrație:** `supabase/migrations/20260328000001_rls_policies.sql` — aplicată și în repo.

**✅ DONE — Policies aplicate și verificate Mar 28, 2026.**

## Undo/Redo Strategy (#31)
> Ce intră în undo, ce nu intră, și de ce.

**Ce INTRĂ în undo (limită 20 acțiuni):**
- Mutare masă pe canvas (drag)
- Creare masă nouă
- Ștergere masă
- Redenumire masă / modificare număr locuri
- Asignare invitat la masă
- Eliminare invitat de la masă
- Magic Fill

**Ce NU intră în undo:**
- Reset plan complet — acțiune destructivă cu confirmare explicită
- Rotație masă — efect vizual minor, nu afectează date
- Modificări de cameră (zoom, pan) — nu sunt date, sunt viewport
- Export PNG — acțiune de output, nu de modificare

**Implementare curentă:**
- `historyRef` în `useSeatingData.js` — array de snapshots `{ guests, tables }`
- Limită: ultimele 20 acțiuni (`historyRef.current.slice(-20)`)
- `saveAction()` apelat înainte de orice modificare care intră în undo
- `undo()` pop din historyRef + `setGuests` + `setTables`

**Reguli:**
- Undo nu traversează sesiuni — la refresh, history se pierde
- Redo nu e implementat în V1 — scope prea mare pentru beneficiul real
- La limita de 20 acțiuni, cel mai vechi snapshot se șterge automat

## Worst Day Scenario Plan (#32)
> Ziua nunții. App nu merge. Pași exacți de urmat.

**Scenariul:** 15 septembrie 2026, ora 12:00. Nunta începe la 18:00. App inaccesibil.

**Pași în ordine:**

**1. Verifică dacă e problema ta sau a serviciului (2 minute)**
- Deschide https://status.vercel.com — dacă Vercel e down, nu poți face nimic rapid
- Deschide https://status.supabase.com — dacă Supabase e down, același lucru
- Încearcă din altă rețea / alt device

**2. Folosește Export PNG din cache (dacă ai exportat anterior)**
- Planul de mese exportat PNG e suficient pentru restaurant
- Restaurantul nu are nevoie de app live — are nevoie de lista de mese

**3. Rollback Vercel (5 minute)**
- Dashboard Vercel → Deployments → deployment anterior → Promote to Production
- Dacă ultimul deploy a stricat ceva, rollback instant

**4. Dacă nimic nu merge — plan de urgență offline**
- localStorage conține ultima stare salvată
- Deschide browser DevTools → Application → Local Storage → `wedding_seating_v14`
- Copiază JSON-ul → paste în https://jsonformatter.org → printează structura
- Sau folosește Export PNG dacă ai făcut export anterior

**5. Contact suport Vercel/Supabase**
- Vercel: vercel.com/support
- Supabase: supabase.com/support

**Prevenție (de făcut cu 1 săptămână înainte de nuntă):**
- [ ] Export PNG salvat local pe laptop + trimis pe email
- [ ] Screenshot plan de mese pe telefon
- [ ] PDF cu lista invitați per masă tipărit fizic
- [ ] Test manual al aplicației cu 48h înainte

**Principiu:** restaurantul și planner-ul trebuie să poată funcționa fără app în ziua nunții. App-ul e un tool de planificare, nu o dependență critică în ziua evenimentului.

## Product Rules (#33)
> Reguli Apple-level de produs — fiecare decizie de UX se validează față de acestea.

**NO SURPRISES**
- Userul nu e niciodată surprins de rezultatul unei acțiuni
- Orice acțiune cu consecințe ireversibile are confirmare explicită
- Mesajele de eroare explică ce s-a întâmplat și ce poate face userul
- Exemplu: ștergere masă → confirmare dialog cu numărul de invitați afectați

**REVERSIBILITY**
- Orice acțiune poate fi anulată (Ctrl+Z sau buton Undo)
- Excepție acceptată: Reset plan complet — prea destructiv, necesită confirmare dublă
- Delete cu confirmare + undo disponibil imediat după
- La Magic Fill: userul poate da undo complet

**VISIBILITY**
- Orice acțiune are feedback instant — nu există acțiuni "silențioase"
- SaveIndicator arată întotdeauna starea salvării
- Progress bar arată câți invitați mai sunt de așezat
- Toast-uri pentru toate acțiunile importante (assign, unassign, create, delete)

**Aplicare practică:**
- Înainte de orice feature nou: "Userul știe ce s-a întâmplat?" → NO SURPRISES
- "Poate anula?" → REVERSIBILITY  
- "Vede că s-a întâmplat ceva?" → VISIBILITY
- Dacă răspunsul la oricare e "nu" → feature-ul nu e gata

## Data Model Invariants (#14)
> DB Check Constraints — ultima linie de apărare. Nu te baza pe logica Next.js.

### Constraints existente în schemă ✅
Schema inițială are deja constraints solide:
- Status enums pe toate tabelele (weddings, events, vendors, budget_items, rsvp_invitations, rsvp_responses, data_migrations)
- Role enum pe wedding_members
- Valori pozitive: seat_count > 0, amount > 0, estimated_amount >= 0, sort_order >= 0
- Rotation range: 0 ≤ rotation < 360
- UNIQUE constraints: token_hash, (table_id, seat_index), (wedding_id, event_id), (provider, external_user_id)

### Constraints lipsă — de adăugat la Faza 3 (migrație nouă)

```sql
-- guests: first_name și display_name nu pot fi string gol
ALTER TABLE guests
  ADD CONSTRAINT guests_first_name_not_empty
    CHECK (length(trim(first_name)) > 0),
  ADD CONSTRAINT guests_display_name_not_empty
    CHECK (length(trim(display_name)) > 0);

-- weddings: title nu poate fi string gol
ALTER TABLE weddings
  ADD CONSTRAINT weddings_title_not_empty
    CHECK (length(trim(title)) > 0);

-- events: name nu poate fi string gol
ALTER TABLE events
  ADD CONSTRAINT events_name_not_empty
    CHECK (length(trim(name)) > 0);

-- tables: name nu poate fi string gol
ALTER TABLE tables
  ADD CONSTRAINT tables_name_not_empty
    CHECK (length(trim(name)) > 0);

-- rsvp_invitations: token_hash trebuie să aibă minim 32 caractere (securitate)
ALTER TABLE rsvp_invitations
  ADD CONSTRAINT rsvp_token_min_length
    CHECK (length(token_hash) >= 32);

-- budget_items: currency trebuie să fie exact 3 caractere
ALTER TABLE budget_items
  ADD CONSTRAINT budget_currency_format
    CHECK (length(currency) = 3);

-- payments: currency la fel
ALTER TABLE payments
  ADD CONSTRAINT payment_currency_format
    CHECK (length(currency) = 3);
```

### Reguli generale
- DB constraints = garantie matematică, nu poate fi ocolită de niciun client
- Nu duplica logica de business în constraints — doar invarianții structurali
- Fiecare constraint nou = migrație separată, nu modificare directă în DB

## State Transitions (#15)
> Tranziții valide per entitate. Interdicții clare.

### weddings.status
```
draft → active → archived
draft → archived (skip active dacă nunta e anulată)
```
- **Interzis:** active → draft (nu poți "dezactiva" o nuntă în progres)
- **Interzis:** archived → orice (arhivarea e finală)

### guest_events.attendance_status
```
pending → invited → attending
pending → invited → declined
pending → invited → maybe
attending → declined (și-a schimbat răspunsul)
maybe → attending
maybe → declined
```
- **Interzis:** attending/declined → pending (resetare manuală interzisă prin UI)
- **Permis prin admin:** orice → pending (support tool)

### rsvp_invitations.status
```
pending → sent → opened → responded
pending → sent → expired
sent → expired
```
- **Interzis:** responded → orice (răspunsul e final)
- **Interzis:** expired → sent (nu poți retrimite un token expirat — generezi unul nou)

### vendors.status
```
lead → contacted → meeting → booked
lead → contacted → declined
meeting → declined
booked → declined (vendor a anulat)
```
- **Interzis:** booked → lead (regresie logică)

### budget_items.status
```
planned → confirmed → paid
planned → cancelled
confirmed → cancelled
```
- **Interzis:** paid → orice (un item plătit nu se mai modifică prin UI)
- **Permis prin admin:** paid → confirmed (corecție eroare)

### data_migrations.status
```
pending → in_progress → completed
pending → in_progress → failed
failed → pending (retry)
```
- **Interzis:** completed → orice

### Implementare
- Tranziții validate în **API routes / RPC functions** — nu în componente React
- Eroare clară la tranziție invalidă: `"Statusul nu poate fi schimbat din X în Y"`
- La Faza 3: `app/lib/domain/transitions.ts` cu funcția `validateTransition(entity, from, to)`

## Input Sanitization (#17)
> Server = securitate. Client = UX. Nu invers.

### Principiu fundamental
- **Server-side** sanitization = obligatorie, ultima linie de apărare
- **Client-side** sanitization = UX feedback rapid, NU securitate
- Un câmp validat doar pe client = vulnerabil. Un câmp validat doar pe server = UX slab.

### Câmpuri care necesită sanitizare

**guests (Faza 3 — prioritate maximă):**
- `first_name`, `last_name`, `display_name` — trim whitespace, max 100 chars, strip HTML
- `notes` — trim, max 500 chars, strip HTML
- `email` (dacă există) — lowercase, validare format RFC 5322
- `meal_choice`, `plus_one_label` — trim, max 100 chars

**weddings:**
- `title` — trim, max 200 chars, strip HTML
- `location_name` — trim, max 200 chars

**events:**
- `name` — trim, max 200 chars
- `location_name` — trim, max 200 chars

**guest_groups:**
- `name` — trim, max 100 chars
- `notes` — trim, max 500 chars

**vendors:**
- `name` — trim, max 200 chars
- `contact_name` — trim, max 100 chars
- `email` — lowercase, validare format
- `phone` — strip non-numeric (păstrează +, spații)
- `website` — validare URL format, max 500 chars
- `notes` — trim, max 1000 chars

**budget_items:**
- `name` — trim, max 200 chars
- `notes` — trim, max 500 chars

**rsvp_responses:**
- `note` — trim, max 500 chars, strip HTML (input public — risc maxim)

### Reguli server-side (API routes / RPC)
```typescript
// Exemplu pattern pentru server-side sanitization
function sanitizeText(input: string | null, maxLength: number): string | null {
  if (!input) return null;
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, ''); // strip HTML tags
}

function sanitizeEmail(input: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  // validare format basic — regex complet la implementare
  return trimmed.includes('@') ? trimmed : null;
}
```

### Reguli client-side (UX feedback)
- Afișează eroare inline sub câmp, nu toast global
- Validare în timp real pe `onChange` pentru email și URL
- Validare pe `onBlur` pentru text fields (nu întrerupe typing)
- Mesaje în română: "Numele este prea lung (max 100 caractere)"

### Ce NU faci
- Nu scapi HTML cu entități (`&lt;`) — strip complet
- Nu folosești regex complex custom pentru email — folosești librărie
- Nu validezi pe client și sari server-side — întotdeauna ambele
- Nu returnezi date nesanitizate din DB direct în API response

### Prioritate implementare
1. **Faza 3** — guests (primul CRUD real)
2. **Faza 7** — rsvp_responses (input public, risc maxim)
3. **Faza 4/5** — vendors, budget_items
4. **Înainte de launch** — audit complet toate câmpurile

## Progres total: ~55% din produs complet

## Recomandări viitoare — acumulate din review-uri (Mar 28, 2026)

### Faza 7 — UI Guests (prioritate după Faza 3)
- Import Summary Card — verde/portocaliu/roșu per rezultat import
- Column Mapping UI — dacă parserul nu recunoaște o coloană, user alege manual
- Preview CSV — primele 3 rânduri înainte de import
- Bulk actions — edit/delete multiple guests
- Filters — attending/declined, side (bride/groom), grup
- Quick edit attendance inline (dropdown)
- Stats per event — % attending, count per event
- Export GET /api/guests/export — format identic cu import (round-trip)

### Faza 3.3 partyId — când se face
- Self-referencing FK sau tabel separat guest_parties
- Impact pe seating: highlight grup, move group, bulk seat (2B.6)
- Impact pe RSVP: unified RSVP per familie (soț confirmă pentru toți)
- lead_guest_id sau guest_group_id folosit mai agresiv

### Faza 4 — Post-launch optimizări API
- Supabase generated types — elimină cast-urile `as GuestWithRelations`
- POST /api/guest-events — 3 queries → 1 RPC pentru latență mai mică
- Bulk guests import → RPC pentru 1000+ guests (în prezent limitat la 500)
- Paginare GET /api/guests cu limit/offset

### Post-launch (Sentry, Rate limiting, etc.)
- Sentry — înlocuiește console.error în internalErrorResponse
- Rate limiting pe /api/guests/import — max 5 imports/min per user (Vercel middleware)
- If-Unmodified-Since pe guests dacă concurența devine problemă reală
- Startup env check separat pentru deploy validation
- UNIQUE constraint (wedding_id, first_name, last_name) — decizie de produs: NU adăugăm (pot exista 2 persoane cu același nume)

### Faza 6 — Seating ↔ Guests (notes arhitecturale)
- revalidateTag nu se aplică — proiectul folosește client-side fetching, nu Server Components cache
- Tranzacționalitate pentru guest_groups create + guests insert — RPC în Faza 4

### Notat din sesiunea Mar 28
- 434 teste verzi la final de sesiune
- lib/plan-limits.ts — creat și revocat (3.6 skip până la Stripe)
- vitest.config.js actualizat să includă *.test.ts și *.test.tsx
- react-window incompatibil cu Turbopack — înlocuit cu VirtualList nativ

## Update Mar 30, 2026

### PR-uri merged în develop (total 59)
- #54: (anterior)
- #55: fix(seating): guest highlight fix
- #56: docs: product.md nou + context + priorities update
- #57: feat(api): budget items and payments crud - validation, routes, tests (faza 5.1, 5.2)
- #58: feat(seating): guests integration - id bridge, sync rpc, wrapper, patch useseatingdata (faza 6)
- #59: fix(budget): total_remaining min 0, round total_paid to 2 decimals

### Teste: 505/505 verzi (era 434)

### Faza 5 — Budget Core — COMPLETATĂ (5.1, 5.2, 5.3)
- ✅ 5.1 Budget items CRUD — GET/POST/PATCH/DELETE cu state transitions
- ✅ 5.2 Payments CRUD — imutabile, DELETE permis doar pe items planned/confirmed
- ✅ 5.3 Derived totals — summary endpoint cu has_mixed_currencies, currency default RON
- ⏳ 5.4 Plan limits — skip până la Voxel bootstrap
- ⏳ 5.5 Downgrade — skip până la Stripe

### Faza 6 — Seating ↔ Guests Integration — COMPLETATĂ (arhitectură + implementare)
- ✅ ID Bridge persistent în Supabase (seating_id_maps + seating_id_counters)
- ✅ RPC allocate_seating_numeric_ids_batch — atomic, fără race conditions
- ✅ RPC sync_seating_editor_state — SECURITY DEFINER, tranzacțional, rollback complet
- ✅ Patch minim useSeatingData.js (4 modificări: semnătură, useState, hydration guard, change detection)
- ✅ page.js wrapper cu useSeatingSync + fallback la comportamentul existent
- ✅ Migrații: seating_id_maps + extend table_types (deleted_at, bar/prezidiu, seat_count >= 0)

### Decizii arhitecturale noi (Mar 30, 2026)
- Budget currency default = RON (schema DB era EUR — migrație aplicată)
- DELETE payment permis doar dacă budget_item.status IN (planned, confirmed)
- BudgetSummary include has_mixed_currencies: boolean — UI afișează warning dacă true
- Soft delete în DB pentru tables (deleted_at), hard delete în editor UX
- sync_seating_editor_state = SECURITY DEFINER cu membership check explicit în corp
- allocate_seating_numeric_ids_batch cu RLS normal (nu SECURITY DEFINER)
- uuidToNumericId hash eliminat — înlocuit cu RPC persistent + counter atomic
- SeatingSnapshot payload minim: { reason, assignments, tables } — fără guest model coupling

### Schema DB — tabele noi (Mar 30, 2026)
- seating_id_maps — mapping UUID ↔ numeric ID, persistent în Supabase
- seating_id_counters — counter atomic per (wedding_id, event_id, entity_type)

### Fișiere noi adăugate
- lib/budget/calculate-summary.ts
- lib/validation/budget-items.ts + .test.ts
- lib/validation/payments.ts + .test.ts
- lib/seating/types.ts
- lib/seating/id-bridge.ts
- lib/seating/map-guests.ts
- lib/seating/map-assignments.ts
- lib/seating/assignment-diff.ts (cu toMove extins)
- lib/seating/use-seating-sync.ts
- types/budget.ts
- types/seating.ts (standalone)
- supabase/migrations/20260329000001_fix_currency_default.sql
- supabase/migrations/20260330000001_seating_id_maps.sql
- supabase/migrations/20260330000002_extend_table_types.sql

### Lecții învățate (workflow)
- npx tsc --noEmit înainte de push — prinde erori de tip înainte de CI
- Fișierele create în ferestre separate (Opus) trebuie trimise la verificare înainte de commit
- types/* standalone când lib/* nu e în același PR


## Update Mar 31, 2026

### Realizări sesiunea Mar 31, 2026
- ✅ Faza 0B completă — identity provisioning + active planning context
- ✅ WordPress plugin v3.1.1 deployed pe server (confirmat în cPanel)
- ✅ Migrații Supabase DEV aplicate:
  - 20260330000001_seating_id_maps.sql (fix bug FOR loop variable)
  - 20260330000002_extend_table_types.sql
  - 20260331115741_active_wedding_id.sql
- ✅ session-bridge.ts — expune activeWeddingId, activeEventId, provisioningStatus
- ✅ fetch-wordpress-bootstrap.ts — tipuri actualizate cu active_event_id, provisioning_status
- ✅ page.js — state machine strictă: loading/guest/error/provisioning_failed/pending/no_wedding/no_event/ready
- ✅ wp-config.php actualizat cu WL_SUPABASE_URL și WL_SUPABASE_SERVICE_KEY (Supabase DEV)
- ✅ 2B.3 — filteredUnassigned memoizat cu useCallback([guests])
- ✅ Teste: 505/505 verzi

### PR-uri merged în develop (total 65 la Mar 31)
- #60: refactor(seating): extract inline css to seating-chart.css
- #61: feat(auth): phase 0b — identity provisioning + active planning context
- #62: fix(seating): correct import paths for session subfolder
- #63: fix(dev): disable wp bridge for local development
- #64: perf(seating): memoize filteredunassigned with usecallback

### Decizii arhitecturale noi (Mar 31, 2026)
- **wpBridgeEnabled: false** în feature-flags.ts pentru development local — schimbă în true la launch
- Bootstrap PHP = sursă canonică pentru active_wedding_id și active_event_id
- weddings[0] eliminat complet — active_wedding_id explicit în DB
- Faza 4 Vendors Mirror sărită complet — revine când Voxel e gata
- Faza 7 RSVP = următoarea fază activă
- **RESEND_API_KEY** de adăugat în Vercel înainte de Faza 7.4

### Schema DB — adăugat Mar 31, 2026
- app_users.active_wedding_id — uuid NULL REFERENCES weddings(id) DEFERRABLE INITIALLY DEFERRED

### Structură lib — actualizată Mar 31, 2026
app/lib/
  auth/
    fetch-wordpress-bootstrap.ts  ← tipuri noi: active_wedding_id, active_event_id, provisioning_status
    use-wordpress-bootstrap.ts
    feature-flags.ts              ← wpBridgeEnabled: false pentru dev local
    session/
      session-bridge.ts           ← expune activeWeddingId, activeEventId, provisioningStatus
      use-session.ts
      wp-circuit-breaker.ts

### Optimizări SVG — actualizat Mar 31, 2026
21. ✅ filteredUnassigned memoizat cu useCallback([guests])

### Checklist launch (când ești gata de main)
- [ ] Schimbă wpBridgeEnabled: true în feature-flags.ts
- [ ] Aplică toate migrațiile pe Supabase PROD
- [ ] Testează bootstrap real cu user WordPress logat pe app.weddinglist.ro
- [ ] Adaugă RESEND_API_KEY în Vercel (pentru Faza 7.4)
- [x] SUPABASE_SERVICE_ROLE_KEY există deja în Vercel pentru ambele environments

### Teste: 505/505 verzi (baseline actualizat Mar 31, 2026)
### Progres total: ~45% din produs complet

## Update Apr 1, 2026

### Realizări sesiunea Apr 1, 2026
- ✅ UI Lista Invitați completă — pagina + 7 componente (PR #66)
- ✅ Restore auth files — eliminat dev bypass (PR #67)
- ✅ Faza 7 RSVP core — token security, API routes, pagina publică, translations, email stub (PR #68)
- ✅ Fix export tipuri lib/budget/calculate-summary.ts
- ✅ Fix lib/sanitize.ts — strip HTML adaugă spațiu
- ✅ Teste: 541/541 verzi (era 505)

### PR-uri merged în develop (total 68 la Apr 1, 2026)
- #66: feat(guests): add guest list ui - page, components, filters, modals
- #67: fix(auth): restore original auth and authorization files
- #68: feat(rsvp): faza 7 - token security, api routes, public page, translations, email stub

### Fișiere noi adăugate
- app/(public)/layout.tsx
- app/(public)/rsvp/[token]/page.tsx
- app/api/rsvp/invitations/route.ts
- app/api/rsvp/[token]/route.ts
- lib/rsvp/token.ts + token.test.ts
- lib/rsvp/validate-rsvp-submission.ts + .test.ts
- lib/rsvp/rsvp-translations.ts
- lib/rsvp/send-invitation-email.ts
- types/rsvp.ts
- supabase/migrations/20260401000001_rsvp_model.sql
- app/guest-list/page.tsx + 7 componente

### Decizii arhitecturale noi (Apr 1, 2026)
- RSVP per individ în V1 — party/group RSVP = V2
- rsvp_responses = tabel separat (schema inițială respectată)
- rsvp_invitations = delivery layer, rsvp_responses = răspuns oficial
- Token: SHA-256 hash în DB, raw doar pentru link
- O singură invitație activă per guest (UNIQUE index parțial)
- Email stub — activat cu RESEND_API_KEY în Vercel
- UI Lista Invitați netestat vizual până la wpBridgeEnabled: true
- party_id amânat — validat după launch cu useri reali

### Roadmap — status actualizat Apr 1, 2026
| Fază | Status |
|------|--------|
| Seating Chart | ✅ ~9.0/10 |
| Faza 0A Foundation | ✅ |
| Faza 0B Auth & Data | ✅ |
| Faza 2A Seating Perf | ✅ |
| Faza 3 Guests Core | ✅ ~85% |
| Faza 5 Budget Core | ✅ 5.1, 5.2, 5.3 |
| Faza 6 Seating ↔ Guests | ✅ |
| Faza 2B Seating Perf Validation | ✅ parțial (2B.2, 2B.3) |
| Faza 4 Vendors Mirror | ⏳ SĂRIT — blocat pe Voxel |
| UI Lista Invitați | ✅ implementat — netestat vizual până la launch |
| Faza 7 RSVP core | ✅ token, API, pagina publică, email stub |
| Faza 7 RSVP UI cuplu | ⏳ URMĂTOR |
| Faza 8 Export & Compliance | ⏳ |
| Faza 9 Reliability & QA | ⏳ |
| Faza 10 Power Features | ⏳ |

### Lecții învățate (Apr 1, 2026)
- Nu modifica lib/auth.ts pentru dev bypass fără a verifica că testarea e posibilă
- Înainte de UI, verifică că auth funcționează în environment-ul de test
- Schema inițială e bine gândită — respectă-o înainte de a o modifica

### Checklist launch (actualizat)
- [ ] Schimbă wpBridgeEnabled: true în feature-flags.ts
- [ ] Aplică toate migrațiile pe Supabase PROD
- [ ] Testează bootstrap real cu user WordPress logat
- [ ] Adaugă RESEND_API_KEY în Vercel
- [ ] Semnează DPA Resend (resend.com/legal/dpa)
- [ ] Adaugă NEXT_PUBLIC_APP_URL în Vercel env vars
- [x] SUPABASE_SERVICE_ROLE_KEY există deja în Vercel

### Teste: 541/541 verzi (baseline actualizat Apr 1, 2026)
### Progres total: ~55% din produs complet
## Update Apr 3, 2026

### Realizări sesiunea Apr 3, 2026
- ✅ Faza 7.8 RSVP Dashboard UI — stats, filtre, lista invitați, WhatsApp, manual override, export CSV (PR #70)
- ✅ Decizii arhitecturale RSVP finalizate — rsvp_responses = truth, rsvp_invitations = delivery
- ✅ Teste: 541/541 verzi (neschimbat)

### PR-uri merged în develop (total 70 la Apr 3, 2026)
- #69: docs: update context, priorities, product — apr 1 session
- #70: feat(rsvp): faza 7.8 - rsvp dashboard ui, stats, filters, whatsapp, manual override

### Fișiere noi adăugate
- app/rsvp/page.tsx — RSVP Dashboard UI
- app/api/rsvp/dashboard/route.ts — stats + lista invitați
- app/api/rsvp/manual/route.ts — manual override status
- app/api/rsvp/invitations/[id]/mark-sent/route.ts — tracking WhatsApp

### Fișiere modificate
- lib/rsvp/rsvp-translations.ts — adăugat whatsapp_message

### Decizii arhitecturale noi (Apr 3, 2026)
- rsvp_responses = source of truth pentru răspuns RSVP
- rsvp_invitations = delivery/tracking layer
- guest_events = relationship/context layer — NU stochează RSVP status
- Manual override scrie în rsvp_responses cu rsvp_source = 'couple_manual'
- Un singur răspuns activ per guest_event_id — upsert pe UNIQUE constraint
- WhatsApp: wa.me fără număr — user alege contactul manual
- Polling 30s în loc de realtime — mai simplu și stabil pentru MVP
- Seating integration cu RSVP = fază separată după launch
- token = null în client — API routes folosesc cookie WP, nu JWT explicit
- Authorization header eliminat din fetch-urile dashboard — de revăzut la #30 Must Now (refresh token flow)

### Cod șters temporar — de readăugat
- Funcția `copyLink` ștearsă din app/rsvp/page.tsx — va fi re-adăugată când implementăm butonul "Copiază link" în dashboard

### Roadmap — status actualizat Apr 3, 2026
| Fază | Status |
|------|--------|
| Seating Chart | ✅ ~9.0/10 |
| Faza 0A Foundation | ✅ |
| Faza 0B Auth & Data | ✅ |
| Faza 2A Seating Perf | ✅ |
| Faza 3 Guests Core | ✅ ~85% |
| Faza 5 Budget Core | ✅ 5.1, 5.2, 5.3 |
| Faza 6 Seating ↔ Guests | ✅ |
| Faza 2B Seating Perf Validation | ✅ parțial (2B.2, 2B.3) |
| Faza 4 Vendors Mirror | ⏳ SĂRIT — blocat pe Voxel |
| UI Lista Invitați | ✅ implementat — netestat vizual până la launch |
| Faza 7 RSVP | ✅ COMPLETĂ (7.1-7.8) |
| **Faza 8 Export & Compliance** | ⏳ **URMĂTOR** |
| Faza 9 Reliability & QA | ⏳ |
| Faza 10 Power Features | ⏳ |

### Lecții învățate (Apr 3, 2026)
- JWT-ul nu e expus în client — API routes autentificate folosesc cookie-ul WP direct
- token eliminat complet din dashboard client — fetch-urile merg fără Authorization header
- Această decizie rămâne până când implementăm refresh token flow (#30 Must Now)

### Teste: 541/541 verzi (neschimbat)
### Progres total: ~60% din produs complet
## Update Apr 4, 2026

### Realizări sesiunea Apr 4, 2026
- ✅ Faza 8.1 Export JSON — API, logică pură, UI (PR #72)
- ✅ Faza 8.2 Import JSON — import cu ID Map complet, validare 3 straturi, preview, UI (PR #73)
- ✅ Faza 8.3 Export PDF — @react-pdf/renderer, font Roboto diacritice, plan mese + lista invitați (PR #74)
- ✅ Faza 8.4 GDPR — account deletion flow complet, settings page, email stub (PR #75)
- ✅ Faza 8.5 Audit Trail — append-only ledger, wl_audit helper, integrat în toate routes (PR #76)
- ✅ Teste: 588/588 verzi

### PR-uri merged în develop (total 76 la Apr 4, 2026)
- #72: feat(export): faza 8.1 - json export api, logic, tests, ui page
- #73: feat(import): faza 8.2 - json import, validation, preview, ui
- #74: feat(export): faza 8.3 - pdf export with diacritics support, seating plan, guest list
- #75: feat(gdpr): faza 8.4 - account deletion flow
- #76: feat(audit): faza 8.5 - audit trail

### Fișiere noi adăugate
- lib/export/json-export.ts + test — 15 teste
- lib/export/pdf-export.tsx
- lib/import/json-import.ts
- lib/import/validate-import.ts + test — 19 teste
- lib/audit/wl-audit.ts + test — 13 teste
- lib/gdpr/send-deletion-email.ts
- app/api/export/json/route.ts
- app/api/export/pdf/route.ts
- app/api/import/json/route.ts
- app/api/account/route.ts
- app/export/page.tsx
- app/settings/page.tsx
- supabase/migrations/20260404000001_audit_logs.sql

### Decizii arhitecturale noi (Apr 4, 2026)

#### Export JSON (8.1)
- Contract: format, schema_version, exported_at, wedding_id, counts, data
- Arrays mereu prezente (niciodată null)
- Ordonare deterministă (sort_order, created_at, id)
- token_hash RSVP exclus din export

#### Import JSON (8.2)
- Import creează ÎNTOTDEAUNA wedding nou — niciodată merge
- ID Map complet pentru toate relațiile (13 entități)
- Ordine strictă: wedding → events → guest_groups → guests → guest_events → tables → seats → seat_assignments → budget_items → payments → rsvp_invitations → rsvp_responses
- Failure → wedding marcat draft cu import_error
- Max 10MB, max 1000 guests, max 200 tables
- Preview înainte de confirmare cu warnings

#### Export PDF (8.3)
- Font Roboto pentru diacritice românești (ț, ș, ă, î, â)
- wrap={false} pe mese — nu se taie între pagini
- Pagina 1: Header + Stats + Plan mese
- Pagina 2: Listă invitați

#### GDPR (8.4)
- Flow: ownership check → deleting → dezactivare RSVP → revoke members → soft delete weddings → email → hard delete identity → hard delete user
- Sole owner protection
- Idempotency — blochează dublu delete
- Email best-effort (nu blochează flow-ul)
- status: active → deleting → [hard deleted] | deletion_failed

#### Audit Trail (8.5)
- Append-only ledger — zero acces direct din client
- Scriere exclusiv prin service_role
- actor_type: 'user' | 'system'
- request_id pentru corelarea logurilor din același flow
- Metadata whitelist: reason_code, filename, counts, route, channel, provider, status_context, requested_wedding_id
- Best-effort but awaited (try/catch swallow controlat)
- 12 acțiuni controlate

### Acțiuni audit controlate
```
account.delete_requested, account.delete_completed, account.delete_failed
export.json_completed, export.pdf_completed
import.json_started, import.json_completed, import.json_failed
auth.provision_started, auth.provision_completed, auth.provision_failed
security.unauthorized_access
```

### Roadmap — status actualizat Apr 4, 2026
| Fază | Status |
|------|--------|
| Seating Chart | ✅ ~9.0/10 |
| Faza 0A Foundation | ✅ |
| Faza 0B Auth & Data | ✅ |
| Faza 2A Seating Perf | ✅ |
| Faza 3 Guests Core | ✅ ~85% |
| Faza 5 Budget Core | ✅ 5.1, 5.2, 5.3 |
| Faza 6 Seating ↔ Guests | ✅ |
| Faza 2B Seating Perf Validation | ✅ parțial (2B.2, 2B.3) |
| Faza 4 Vendors Mirror | ⏳ SĂRIT — blocat pe Voxel |
| UI Lista Invitați | ✅ implementat — netestat vizual până la launch |
| Faza 7 RSVP | ✅ COMPLETĂ (7.1-7.8) |
| Faza 8 Export & Compliance | ✅ COMPLETĂ (8.1-8.5) |
| **Faza 9 Reliability & QA** | ⏳ **URMĂTOR** |
| Faza 10 Power Features | ⏳ |

### Teste: 588/588 verzi
### Progres total: ~67% din produs complet
## Update Apr 4, 2026 — Faza 9 completă

### Realizări sesiunea Apr 4, 2026 (continuare)
- ✅ Faza 9.1 Dashboard statistici reale — endpoint + types + page rescrisă (PR #77)
- ✅ Faza 9.5 Cancel stale retries + snapshot hashing stabil în useSeatingSync (PR #80)
- ✅ Teste: 588/588 verzi (neschimbat)

### PR-uri merged în develop (total 80 la Apr 4, 2026)
- #77: feat(dashboard): faza 9.1 - statistici reale din supabase
- #80: fix(seating): faza 9.5 - cancel stale retries + snapshot hashing stabil

### Fișiere noi adăugate (Faza 9)
- types/dashboard.ts — contract locked DashboardStats
- app/api/dashboard/stats/route.ts — GET endpoint cu 8 queries paralele
- app/dashboard/page.tsx — rescris din page.js, date reale, skeleton loading, error/empty state

### Fișiere modificate (Faza 9)
- lib/seating/use-seating-sync.ts — retryTimerRef + stableSnapshotHash + cleanup complet

### Roadmap — status actualizat Apr 4, 2026
| Fază | Status |
|------|--------|
| Seating Chart | ✅ ~9.0/10 |
| Faza 0A Foundation | ✅ |
| Faza 0B Auth & Data | ✅ |
| Faza 2A Seating Perf | ✅ |
| Faza 3 Guests Core | ✅ ~85% |
| Faza 5 Budget Core | ✅ 5.1, 5.2, 5.3 |
| Faza 6 Seating ↔ Guests | ✅ |
| Faza 2B Seating Perf Validation | ✅ parțial (2B.2, 2B.3) |
| Faza 4 Vendors Mirror | ⏳ SĂRIT — blocat pe Voxel |
| UI Lista Invitați | ✅ implementat — netestat vizual până la launch |
| Faza 7 RSVP | ✅ COMPLETĂ (7.1-7.8) |
| Faza 8 Export & Compliance | ✅ COMPLETĂ (8.1-8.5) |
| **Faza 9 Reliability & QA** | ✅ **COMPLETĂ** |
| Faza 10 Power Features | ⏳ URMĂTOR |

### Teste: 588/588 verzi
### Progres total: ~70% din produs complet

## Update Apr 4, 2026 — Faza 10 + Auth Refactor

### Realizări sesiunea Apr 4, 2026 (continuare)
- ✅ Task Engine — lib/task-engine.ts, funcție pură generateTasks(), 8 reguli, 24 teste (PR #82)
- ✅ Dashboard Selectors — lib/selectors/dashboard-selectors.ts, buildTaskEngineContext din Supabase (PR #83)
- ✅ Dashboard conectat la Task Engine — page.tsx rescris, event_date din Supabase (PR #84)
- ✅ Feature flags activate — wpBridgeEnabled, guestsEnabled, budgetEnabled, rsvpEnabled (PR #85)
- ✅ Server App Context Layer — refactor complet auth intern, lib/server-context/ (PR #86)
- ✅ Teste: 639/639 verzi

### PR-uri merged în develop (continuare Apr 4, 2026)
- #82: feat(dashboard): task engine - functie pura, 24 teste
- #83: feat(dashboard): dashboard selectors - agregare date supabase pentru task engine
- #84: feat(dashboard): conectare task engine in dashboard, event_date din supabase
- #85: feat(auth): activeaza feature flags - wpbridge, guests, budget, rsvp
- #86: feat(auth): server app context layer - refactor auth intern, migrare dashboard stats

### Fișiere noi adăugate (Apr 4, 2026 — sesiunea 2)
- lib/task-engine.ts + lib/task-engine.test.ts — 24 teste
- lib/selectors/dashboard-selectors.ts
- lib/server-context/types.ts
- lib/server-context/cache.ts
- lib/server-context/get-server-app-context.ts + test — 12 teste
- lib/server-context/require-authenticated.ts + test — 5 teste
- lib/server-context/require-wedding-access.ts + test — 10 teste
- lib/server-context/index.ts

### Fișiere modificate (Apr 4, 2026 — sesiunea 2)
- app/dashboard/page.tsx — Task Engine conectat, event_date din Supabase
- app/api/dashboard/stats/route.ts — migrat la Server App Context Layer
- app/lib/auth/feature-flags.ts — wpBridgeEnabled: true, guestsEnabled: true, budgetEnabled: true, rsvpEnabled: true
- types/dashboard.ts — adăugat event_date
- vitest.config.js — adăugat alias @/*

### Auth Layer Refactor — decizii locked (Apr 4, 2026)
- JWT client-side eliminat complet din internal API routes
- Model unic: WP bootstrap (server-side) → ServerAppContext → authorization → Supabase
- extractAuth deprecated pentru browser/internal routes
- getServerAppContext = entry point unic pentru auth
- requireAuthenticatedContext + requireWeddingAccess = helperi standard
- supabaseServer folosit DOAR după auth + authz
- Cache L1 server-side 30s per cookie wordpress_logged_in_*
- Dashboard = active-wedding-only (nu acceptă wedding_id din client)

### Roadmap — status actualizat Apr 4, 2026
| Fază | Status |
|------|--------|
| Seating Chart | ✅ ~9.0/10 |
| Faza 0A Foundation | ✅ |
| Faza 0B Auth & Data | ✅ |
| Faza 2A Seating Perf | ✅ |
| Faza 3 Guests Core | ✅ ~85% |
| Faza 5 Budget Core | ✅ 5.1, 5.2, 5.3 |
| Faza 6 Seating ↔ Guests | ✅ |
| Faza 2B Seating Perf Validation | ✅ parțial (2B.2, 2B.3) |
| Faza 4 Vendors Mirror | ⏳ SĂRIT — blocat pe Voxel |
| UI Lista Invitați | ✅ implementat |
| Faza 7 RSVP | ✅ COMPLETĂ (7.1-7.8) |
| Faza 8 Export & Compliance | ✅ COMPLETĂ (8.1-8.5) |
| Faza 9 Reliability & QA | ✅ COMPLETĂ |
| **Faza 10 Power Features** | ⏳ **ÎN PROGRES** |

### Faza 10 — status
- ✅ Task Engine — generateTasks() funcție pură, 8 reguli
- ✅ Dashboard Selectors — buildTaskEngineContext()
- ✅ Dashboard conectat la Task Engine
- ✅ Auth Layer Refactor — Server App Context Layer
- ⏳ Migrare API routes rămase (guests, budget, rsvp, export)
- ⏳ Bulk seat group (10.1)
- ⏳ Batch writes seating (10.15)
- ⏳ Optimistic UI light (10.14)

### Teste: 639/639 verzi
### Progres total: ~72% din produs complet
