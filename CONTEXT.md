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
- 341/341 teste verzi
- useSeatingData.test.js — 80 teste
- useSeatingUI.test.js — 42 teste
- useTableInteractions.test.js — 20 teste
- TableNode.test.jsx — 22 teste
- useCamera.test.js, geometry.test.js, magicFill.test.js, storage.test.js, camera.test.js, GuestSidebar.test.jsx, StatsPanel.test.jsx, EditPanel.test.jsx, CanvasToolbar.test.jsx

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
- ⏳ #5 RLS policies — de scris înainte de Faza 3 (seating chart nu folosește Supabase acum)


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
- ⏳ P10 — Virtualizare sidebar cu react-window (600 invitați neatribuiți) | Dificultate: Medie
- ⏳ P11 — Seat swap drag & drop (drag invitat din scaun → alt scaun/masă) | Dificultate: Mare

## Ordinea recomandată sesiunea următoare
1. **Faza 3** — Guests Core (date reale în DB — critic pentru produs funcțional)
2. **Faza 2B** — Seating Performance Validation (profiling pe date reale)
3. **Faza 6** — Seating ↔ Guests Integration (conectare seating cu guests reali)
4. **Faza 7** — RSVP (prima funcționalitate vizibilă pentru invitați)
→ Faza 5 (Budget) și Faza 4 (Vendors) pot fi paralele sau după Faza 7.

## PR-uri merged în develop (total 33)
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
- ✅ 341/341 teste verzi
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
- ✅ 0B.2 Session Bridge Next.js + Feature flags + Circuit breaker WP | Mare
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

### ⏳ Faza 3 — Guests Core
- ⏳ 3.1 Guests CRUD — add, edit, delete, bulk add | Medie
- ⏳ 3.2 Event-scoped model — guest_events | Mare
- ⏳ 3.3 partyId — schema, logică, UI minimal | Medie
- ⏳ 3.4 Import CSV — mapping, validare, deduplicare | Medie
- ⏳ 3.5 Validări — nume, email, status, duplicate warnings | Mică
- ⏳ 3.6 Limits + warnings — max invitați, max mese | Mică
- ⏳ 3.7 Data sanitation — input normalizat | Mică

### ⏳ Faza 2B — Seating Performance Validation
- ⏳ 2B.1 Profiling real — scenarii 15/120, 35/300, 60/600 | Medie
- ⏳ 2B.2 Virtualizare sidebar finală | Medie
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

### ⏳ Faza 7 — RSVP
- ⏳ 7.1 RSVP model — rsvp_status, meal_choice, dietary_notes | Medie
- ⏳ 7.2 rsvp_invitations — token hash, sent_at, expires_at | Medie
- ⏳ 7.3 Public RSVP page — app.weddinglist.ro/rsvp/[token] | Medie
- ⏳ 7.4 Email via Resend — invite, reminder, confirmation | Medie
- ⏳ 7.5 RSVP token security — lung, random, expirat, one-time | Medie
- ⏳ 7.6 Household-based invitation | V2

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
- Testele rulează cu `npx vitest run` — baseline curent: 341/341
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

## Progres total: ~41% din produs complet
