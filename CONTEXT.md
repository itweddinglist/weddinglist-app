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
- Rămânem pe SVG pentru V1. Canvas pentru V2 dacă FPS < 45 după toate optimizările.

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
- app/components/ErrorBoundary.jsx:17 — console.error
- app/components/Skeleton.jsx:34 — height unused

## Teste
- 341/341 teste verzi
- useSeatingData.test.js — 80 teste
- useSeatingUI.test.js — 42 teste
- useTableInteractions.test.js — 20 teste (actualizat pentru drag preview)
- TableNode.test.jsx — 21 teste (actualizat pentru assignedGuests)
- useCamera.test.js, geometry.test.js, magicFill.test.js, storage.test.js, camera.test.js, GuestSidebar.test.jsx, StatsPanel.test.jsx, EditPanel.test.jsx, CanvasToolbar.test.jsx

## Optimizări SVG — STATUS COMPLET (50-60 FPS la drag cu 60 mese + 600 invitați)

### Implementate (17 optimizări în 4 faze + extra):
1. EMPTY_ARRAY constant + assignedGuests prop în loc de guestsByTable
2. Comparator custom tableNodeComparator pe React.memo(TableNode)
3. Progressive detail: vzoom<0.2 rect simplu, vzoom<0.4 fără scaune, vzoom>=0.4 complet
4. isDraggingThisTable — fără text/badge/arc/shadow în drag
5. Filtre SVG eliminate la vzoom<0.3 și isDraggingThisTable
6. hoveredGuestClearedRef — hover disabled în drag/pan (o singură dată per sesiune)
7. guestById + tableById Map memoizate în useSeatingData.js (O(1) lookup)
8. Drag preview tranzitoriu — dragPreviewRef + notifyDrag + setDragTick; setTables 0× în RAF, 1× la mouseup
9. Viewport culling — isTableVisible() cu padding 300px în page.js
10. useMemo pentru d și seatPositions bazat pe [t.type, t.seats, t.isRing]
11. pointerEvents: none pe RING ellipse și inner decorative circle
12. willChange: transform pe outer <g>
13. Scaune goale skip când assignedGuests.length === 0 && vzoom < 0.5
14. isDimmed calculat local per masă, aplicat pe outer <g> opacity
15. hoveredGuestRef în useSeatingUI — tooltip nu mai cauzează re-render global
16. Hit zones mai mari — r="28" pe drop zone goale, cerc transparent r="24" pe scaune ocupate
17. occupancyText precomputed
18. React.memo pe GuestSidebar și StatsPanel
19. Eliminat transition CSS și vectorEffect redundant pe elemente decorative
20. Sidebar scroll funcțional (maxHeight: 40vh pe secțiunea grupuri)

### Baseline → Rezultat:
- Baseline: 27-30 FPS la drag cu 60 mese + 600 invitați
- După optimizări: 50-60 FPS

### Tools de performanță:
- FpsCounter.jsx — dev-only, colț dreapta sus, verde>50fps, galben 30-50fps, roșu<30fps
- generateTestData.js — script browser console, 60 mese + 600 invitați

## Task-uri în curs (de continuat în sesiunea următoare)

### Rămase:
- P9 — Zoom < 0.2 rect redus la 60-70% din dimensiune (forma păstrată, continuitate vizuală cu 0.2-0.4)
- P3 — isDimmed opacity 0.3 → 0.6 (de discutat cu utilizatorul înainte de implementare)

### Etapa 3 — Complexe:
- P10 — Virtualizare sidebar cu react-window (600 invitați neatribuiți)
- P11 — Seat swap drag & drop (drag invitat din scaun → alt scaun/masă)

## PR-uri merged în develop (total 27)
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
- #21: fix(p8) tooltip fix complet — onMouseEnter/Leave pe circle r=24, GuestSidebar tooltip AȘEZAȚI
- #22: feat(p8-ux) ring dans editabil, drag fix, card X, toolbar icons (SquircleDashed, GalleryThumbnails)
- #23/24: feat(sidebar-search) diacritice normalize NFD, activeGroupId filtru grup exact, highlight vizual grup
- #25: feat(p6) culori border occupancy la zoom 0.2-0.4 (verde/galben/roșu)
- #27: fix(p2) highlightGroupId reset bug — tableNodeComparator + onMouseEnter SVG
- #28: feat(ux) seat positions echilibrate square, progress border square/rect, nume invitat deasupra/dedesubt

## Modificări arhitecturale sesiunea curentă

### Tooltip (P8):
- onMouseEnter/onMouseLeave mutate pe circle r=24 (hit zone real)
- useTableInteractions: up() — setHoveredGuest(null) doar după drag/pan activ
- handleSvgMouseDown: eliminat setHoveredGuest(null)
- GuestSidebar: tooltip pe avatarul din secțiunea AȘEZAȚI

### Ring Dans:
- Nume editabil (t.name în loc de hardcodat)
- Formă: cerc dashed consistent cu stilul meselor
- Hit zone transparent pentru drag/click/doubleclick
- Buton Ring în toolbar cu icon SquircleDashed
- isRing propagat din modal la createTable

### Toolbar icons:
- Prezidiu: GalleryThumbnails rotit 180°
- Drept: RectangleHorizontal
- Ring: SquircleDashed

### Sidebar search:
- Căutare fără diacritice (normalize NFD) în useSeatingData și GuestSidebar
- activeGroupId separat de searchQuery — click grup filtrează exact (fără false positives)
- Highlight vizual grup activ (background caramiziu)
- Buton × resetează atât searchQuery cât și activeGroupId
- maxHeight grupuri 25vh

### Culori border occupancy (P6):
- La zoom 0.2-0.4: verde/galben/roșu în funcție de ocupare
- occupancyBs pe round, square, rect (prezidiu neatins)

### Fix highlightGroupId (P2):
- tableNodeComparator: re-render toate mesele când grupul se schimbă
- onMouseEnter pe SVG resetează highlightGroupId

### UX seat positions:
- Square: distribuție echilibrată pe 4 laturi (5→2+1+1+1, 6→2+2+1+1 etc.)
- Square/rect: scaune la 8px de masă (consistent cu prezidiu)
- Progress border strokeDasharray pe square și rect (ca arcul de la round)
- Nume invitat deasupra scaunului la rect/prezidiu când e pe rândul de sus
- Card clickedSeat: buton X pentru închidere manuală

## Roadmap
✅ Seating Chart Faza 1, 0A, 0B, 2A, 2B
✅ Fix-uri vizuale și UX (P2, P4, P5, P6, P8 complete)
⏳ P3, P9 — în așteptare
⏳ 3 — Guests Core
⏳ 5 — Budget
⏳ 6 — Seating↔Guests Integration
⏳ 4 — Vendors
⏳ 7 — RSVP
⏳ 8-10 — Polish + Lansare

## Progres total: ~40%