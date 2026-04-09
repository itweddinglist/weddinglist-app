# CONTEXT.md — WeddingList App
# Versiune: 2.0 — Aprilie 2026
# Rol: Referință arhitecturală stabilă. Se actualizează doar la decizii majore.

---

## 1. PROIECT

- **Produs:** Wedding planning SaaS pentru România/Moldova/Bulgaria (V1), Europa de Est (V2)
- **Stack:** Next.js 16.2.2 + React + TypeScript strict + Supabase (PostgreSQL) + Vercel
- **Repo:** https://github.com/itweddinglist/weddinglist-app
- **Deploy:** Vercel — `main` = producție, `develop` = staging
- **Dev:** Solo developer, Windows, Node.js v24
- **AI:** Claude Code + Claude.ai + ChatGPT + Gemini pentru review

---

## 2. ARHITECTURĂ (LOCKED)

### Auth Flow
```
WordPress /wp-json/weddinglist/v1/bootstrap
  → session-bridge.ts (SINGLE ENTRY POINT)
  → ServerAppContext (get-server-app-context.ts)
  → requireWeddingAccess (wedding_members.app_user_id — fix PR #112)
  → Supabase queries cu service_role
```

**Cascada de identitate (sfântă — validată în fiecare RPC):**
```
wp_user_id → app_user_id → wedding_id
```

- **NU** folosim Supabase Auth ca auth principal
- JWT client-side = eliminat complet
- `service_role` = NICIODATĂ în client sau `NEXT_PUBLIC_*`

### System Model
```
WordPress (Voxel) = identity + plan + vendors
Next.js           = orchestrator + UX + session authority
Supabase (Postgres) = source of truth operațional
Frontend          = cache + draft state (nu trusted)
```

### Seating Chart (LOCKED — nu se atinge)
- SVG custom, fără Tailwind
- CSS custom propriu, izolat
- Nu se rescrie pentru niciun motiv

---

## 3. DESIGN SYSTEM

### Culori (CSS variables în globals.css)
```css
--color-bg:          #F5F2EE;
--color-surface:     #FFFFFF;
--color-accent:      #C9907A;
--color-accent-soft: rgba(201,144,122,0.12);
--color-text:        #1E2340;
--color-text-muted:  #9DA3BC;
--color-success:     #48BB78;
--color-warning:     #ECC94B;
--color-danger:      #E53E3E;
--color-border:      rgba(196,168,130,0.2);
```

### Tipografie
- Titluri: Cormorant Garamond, serif, italic
- UI/body: DM Sans, sans-serif
- Numere: DM Sans cu `font-variant-numeric: tabular-nums`

### Componente
- Cards: bg alb, border-radius 12-16px, shadow subtil
- Butoane principale: accent caramiziu, text alb, pill
- Butoane secundare: border accent, text accent, transparent
- Iconuri: Lucide React, strokeWidth 1.5-1.8, size 16-20px

---

## 4. MODULE ACTIVE (9)

1. Dashboard
2. Seating Chart (Plan Mese)
3. Listă Invitați
4. Budget
5. Vendors (blocat pe Voxel)
6. RSVP
7. Export
8. Settings
9. Guest Moments (Faza 10 — viitor)

**Module eliminate** (NU în sidebar):
- Checklist → absorbit în Dashboard ca Task Engine
- Timeline → absorbit în Dashboard/Export
- Wishlist → eliminat ca modul separat
- Moodboard → eliminat
- Notițe → contextual, nu modul separat

---

## 5. SCHEMA DB — 22 TABELE

```
app_users, identity_links, weddings, wedding_members,
events, guests, guest_events, guest_groups,
tables, seats, seat_assignments,
budget_items, payments, vendors,
rsvp_invitations, rsvp_responses,
data_migrations, seating_editor_states,
seating_id_maps, seating_id_counters,
audit_logs, idempotency_keys
```

### Constraints cheie
- `identity_links.wp_user_id` = UNIQUE
- `guest_events(guest_id, event_id)` = UNIQUE
- `seat_assignments.seat_id` = UNIQUE
- `seat_assignments.guest_event_id` = UNIQUE
- Toate tabelele operaționale au `wedding_id`
- RLS pe toate tabelele operaționale

### Source of truth per zonă
- Invitați: `guests`
- Stare invitați per event: `guest_events`
- Seating real: `seat_assignments`
- Buget: `budget_items` + `payments`
- RSVP delivery: `rsvp_invitations`
- RSVP răspuns: `rsvp_responses`

---

## 6. SUPABASE

- **DEV:** typpwztdmtodxfmyrtzw (Frankfurt)
- **PROD:** dtyweqcpanxmckngcyqx (Frankfurt)
- CLI linkat la dev
- Migrations în `supabase/migrations/`
- **Schema changes EXCLUSIV prin migrations — INTERZIS direct în UI**

---

## 7. BRANCH STRATEGY

| Branch | Environment | Supabase |
|--------|-------------|----------|
| main | Production (app.weddinglist.ro) | PROD |
| develop | Staging (Vercel preview) | DEV |
| feature/* | Preview (URL unic per PR) | DEV |

- Push direct pe main/develop: **INTERZIS** (branch protection activă)
- Deploy în producție = PR din develop → main

---

## 8. FIȘIERE SEATING CHART (LOCKED — NU MODIFICI)

```
app/seating-chart/page.js
app/seating-chart/components/TableNode.tsx
app/seating-chart/components/GuestSidebar.tsx
app/seating-chart/components/EditPanel.tsx
app/seating-chart/hooks/useTableInteractions.ts
app/seating-chart/hooks/useCamera.ts
app/seating-chart/hooks/useSeatingData.ts
app/seating-chart/hooks/useSeatingUI.ts
app/seating-chart/utils/geometry.ts
app/seating-chart/utils/exportPng.ts
app/seating-chart/utils/storage.ts
```

### Fișiere nemigrate la TypeScript (intenționat)
```
app/seating-chart/page.js                ← prea complex, după launch
app/seating-chart/components/CateringModal.jsx
app/seating-chart/components/ConfirmDialog.jsx
app/seating-chart/components/FpsCounter.jsx
app/seating-chart/components/ToastStack.jsx
app/seating-chart/hooks/useGuestLocator.js
app/seating-chart/utils/applySeatingEffect.js
app/seating-chart/utils/generateTestData.js  ← cod dev
```

---

## 9. STRUCTURĂ LIB

```
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
  migration/
  posthog/
  rate-limit.ts
  supabase/
    client.ts
    server.ts

lib/
  auth/                          ← dev-session.ts va fi creat aici (Faza 1)
  server-context/
    get-server-app-context.ts
    require-wedding-access.ts    ← fix PR #112 (app_user_id corect)
    require-authenticated.ts
  seating/
    use-seating-sync.ts
    id-bridge.ts
    map-guests.ts
    map-assignments.ts
    types.ts                     ← SeatingTable, SeatingTableLoad, SeatingLoadResponse
  system/
    read-only.ts                 ← Faza 4 read-only mode
  supabase/
    idempotency.ts               ← Faza 3 idempotency table
    db.ts                        ← Data access layer (Faza 10)
  mutations/
  validation/
  audit/
    wl-audit.ts
  export/
    json-export.ts
    pdf-export.tsx

app/
  api/
    weddings/[weddingId]/
      seating/
        load/route.ts            ← GET server-side, service_role, returnează tables + guests + id maps
        sync/route.ts
  components/
    ReadOnlyBanner.tsx           ← Faza 4 read-only banner
```

---

## 10. API ENDPOINTS

```
GET  /api/health
POST /api/auth/provision
GET  /api/guests
POST /api/guests
PUT  /api/guests/[id]
DELETE /api/guests/[id]
GET  /api/budget/items
POST /api/budget/items
GET  /api/dashboard/stats
GET  /api/weddings/[id]/seating/load   ← server-side, service_role, returnează tables+guests+idMaps
POST /api/weddings/[id]/seating/sync
GET  /api/rsvp/dashboard
GET  /api/export/json                  ← ?wedding_id= query param
GET  /api/export/pdf                   ← ?wedding_id= query param

DEV ONLY (NODE_ENV=development):
GET  /api/dev/session
GET  /api/dev/flags
GET  /api/dev/health
```

---

## 11. TASK ENGINE

```typescript
generateTasks(ctx) → funcție pură, fără side effects
8 reguli în ordine de prioritate
PRIMARY task + max 2 SECONDARY tasks
Rulează la fiecare load dashboard
```

---

## 12. FEATURE FLAGS

```typescript
// app/lib/auth/feature-flags.ts
wpBridgeEnabled: true          // false în dev local — permite lucrul fără WordPress extern
supabaseEnabled: true
seatingEnabled: true
guestsEnabled: true
budgetEnabled: true
vendorsEnabled: false          // blocat pe Voxel
rsvpEnabled: true
debugAuthEnabled: process.env.NODE_ENV === "development"
```

---

## 13. DECIZII LOCKED

- Seating Chart: CSS custom, NERESCRIS, izolat de Tailwind
- Auth: WP bootstrap → ServerAppContext → Supabase
- `wedding_id` pe toate tabelele operaționale
- Schema changes DOAR prin migrations
- App producție pe app.weddinglist.ro
- TypeScript strict pe tot codul nou
- ESLint strict + Prettier + Husky + commitlint
- Supabase EU Frankfurt pentru ambele proiecte
- SVG pentru V1, Canvas pentru V2 dacă FPS < 45
- RLS pe toate tabelele operaționale
- `service_role` NICIODATĂ în client sau NEXT_PUBLIC_*
- Niciun bypass auth în afara `lib/auth/dev-session.ts`
- `seat_id` trebuie să fie stabil și persistent (NU index-based)

---

## 14. PR-URI ISTORICE RELEVANTE

| PR | Descriere |
|----|-----------|
| #66 | UI Listă Invitați |
| #68 | Faza 7 RSVP core |
| #70 | RSVP Dashboard UI |
| #77 | Dashboard statistici |
| #86-#94 | Auth Layer Refactor + migrare API routes |
| #100 | Next.js upgrade 16.2.2 |
| #101 | Supabase lazy singleton |
| #102 | PostHog EU analytics |
| #103 | Guests optimistic mutations V2 |
| #104 | Seating confirmedSnapshotRef + saveStatus unconfirmed |
| #105 | RSVP public_link_id |
| #106 | RSVP abuse protection (Upstash) |
| #107 | Duplicate names warning UI |
| #108 | Seating ↔ RSVP declined filtering |
| #110 | Migrare TypeScript seating chart (15 fișiere) |
| #111 | Fix zoom cursor freeze la ZOOM_MIN |
| #112 | Fix require-wedding-access: user_id → app_user_id |
| #113 | Mută load seating pe server — endpoint GET securizat cu service_role |
| #114 | Fix seating sync: elimină JSON.stringify din parametrii RPC |
| #115 | Adaugă migrații pentru RPC-urile seating (allocate + sync) |
| #116 | Șterge app/dashboard/page.js duplicat |
| #117 | Fix export JSON + PDF: wedding_id query param, schema corectă, Uint8Array, filename ASCII |
