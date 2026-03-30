# PRODUCT.md — Weddinglist
# Versiune: 1.0 — Mar 29, 2026
# Document consultativ. Se actualizează doar la decizii majore de produs.

---

## 1. ARHITECTURĂ LOCKED

### Stack

- **WordPress + Voxel** = Business Engine (identity, plan, vendors)
- **Next.js** = Product UX Layer + session authority + orchestrator
- **Supabase (Postgres)** = Source of truth pentru toate datele operaționale

### Auth

NU folosim Supabase Auth ca auth principal.

Folosim:
- custom bootstrap endpoint din WordPress: `/wp-json/weddinglist/v1/bootstrap`
- Next.js creează sesiune proprie
- mapping: `wp_user_id → app_user_id → wedding_id`

### Reguli de aur

- `wp_user_id` = identitate externă
- `app_user_id` = identitate internă
- `wedding_id` = cheia operațională principală
- toate datele produsului se leagă de `wedding_id`
- după login, aplicația NU depinde operațional de WordPress pentru funcțiile principale
- WordPress rămâne doar pentru: identity origin, plan/membership, vendor marketplace, favorites/collections

---

## 2. DESIGN / UI LOCKED

### Seating Chart

- este ancora de design
- este deja construit (~90%)
- rămâne pe SVG + React + stilul actual
- NU folosim Tailwind în seating
- NU rescriem seating pentru Tailwind

### Restul aplicației

- folosim Tailwind
- consumă aceleași design tokens ca Seating
- design tokens comune: culori, radius, shadows, typography, spacing

### Principii UI

- premium, clar, fără clutter
- max 2–3 pași per acțiune
- Clarity > Decor
- sistem inteligent, nu checklist fals

---

## 3. STRUCTURA MODULELOR

### Module active (9)

1. Dashboard
2. Seating
3. Guests
4. Budget
5. Vendors
6. RSVP
7. Export
8. Settings
9. Guest Moments (Faza 10)

### Module eliminate / absorbite

- **Moodboard** = removed
- **Wishlist** = removed ca modul separat
- **Checklist** = absorbit în Dashboard ca Task Engine
- **Timeline** = absorbit ca metadata + view simplu în Dashboard/Export
- **Notes** = contextual, nu modul separat

---

## 4. ROLUL MODULELOR

### Dashboard
- orchestrator, nu modul CRUD
- afișează: Next Step, Secondary Tasks, Seating preview, Insights, Timeline light
- consumă date, nu este sursă de adevăr

### Seating
- nucleul produsului, diferențiator principal
- lucrează peste `guest_events` și `seat_assignments`

### Guests
- source of truth pentru invitați + relațiile lor cu evenimentele

### Budget
- costuri reale, plăți, derived totals

### Vendors
- NU este marketplace
- mirror + management layer pentru vendors din Voxel
- status intern, notițe, costuri, integrare cu Budget

### RSVP
- sistem separat, construit peste `guest_events`
- folosește `rsvp_invitations`

### Export
- PNG / PDF / JSON

### Settings
- configurare sistem, wedding settings, event settings

### Guest Moments
- Faza 10: QR pe masă, poze + mesaje + album exportabil

---

## 5. DATA MAP — SINGLE SOURCE OF TRUTH

### Tabele obligatorii

`app_users`, `identity_links`, `weddings`, `wedding_members`, `events`,
`guests`, `guest_events`, `tables`, `seats`, `seat_assignments`,
`budget_items`, `payments`, `vendor_states`, `rsvp_invitations`, `data_migrations`

### Reguli DB

- `identity_links.wp_user_id` = UNIQUE
- `guest_events (guest_id, event_id)` = UNIQUE
- `seat_assignments.seat_id` = UNIQUE
- `seat_assignments.guest_event_id` = UNIQUE
- toate tabelele operaționale au `wedding_id`
- RLS pe toate tabelele operaționale prin `wedding_members`

### Source of truth per zonă

- invitați = `guests`
- stare invitați per event = `guest_events`
- seating real = `seat_assignments`
- buget = `budget_items`
- plăți = `payments`
- vendors state = `vendor_states`
- RSVP delivery/tracking = `rsvp_invitations`

---

## 6. TASK ENGINE

Checklist-ul NU mai există ca modul. Next Steps vin din starea reală a sistemului.

### Structură V1

- 1 PRIMARY task
- max 2 SECONDARY tasks
- Task Engine primește context agregat, nu face fetch-uri direct

### Context minim

```typescript
{
  daysUntilWedding: number
  guestsCount: number
  unassignedGuestsCount: number
  hasLocation: boolean
  hasCatering: boolean
  vendorsInProgressCount: number
  rsvpSentCount: number
  totalBudget: number
  totalEstimated: number
}
```

### Reguli V1 (prioritate descrescătoare)

1. dacă nu există location booked → **HIGH**
2. dacă nu există catering booked → **HIGH**
3. dacă există invitați fără loc → **HIGH**
4. dacă RSVP nu e trimis → **MEDIUM** / **HIGH** dacă `daysUntilWedding < 30`
5. dacă bugetul e problematic → **MEDIUM**
6. dacă un vendor are plată scadentă în < 3 zile → **HIGH** (Payment Reminder)
7. dacă există vendors în progres → **LOW**
8. fallback contextual, nu generic
   - ex: dacă seating e complet → "Trimite invitațiile"
   - ex: dacă 80% invitați alocați → "Mai ai X invitați de alocat"
   - ex: dacă totul e ok → "Continuă cu Export"

### Principii

- Task Engine este state-driven
- nu există checkbox manual
- taskul dispare doar când problema reală dispare
- implementat ca funcție pură fără side effects
- rulat pe fiecare load dashboard

### Implementare (la final V1 — după Faza 9)

```
/lib/taskEngine.ts       — funcție pură generateTasks(context)
/lib/selectors/dashboardSelectors.ts — agregă date din Supabase
```

---

## 7. ROADMAP LOCKED

Ordinea de execuție (nu se schimbă fără aprobare):

1. Seating polish ✅
2. Faza 0A — Foundation ✅
3. Faza 0B — Auth & Data ✅
4. Faza 2A — Seating Performance Foundation ✅
5. Faza 3 — Guests Core ✅ (~85%)
6. Faza 2B — Seating Performance Validation
7. Faza 5 — Budget Core
8. Faza 6 — Seating ↔ Guests Integration
9. Faza 4 — Vendors Mirror
10. Faza 7 — RSVP
11. Faza 8 — Export & Compliance
12. Faza 9 — Reliability & QA
13. Faza 10 — Power Features

---

## 8. WP / VOXEL INTEGRATION

### Roluri

- **WordPress/Voxel** = identity, plan/membership, vendor marketplace
- **Next.js** = sesiune locală, UX, orchestration
- **Supabase** = toate datele operaționale

### Bootstrap endpoint

`GET /wp-json/weddinglist/v1/bootstrap`

Output minim: `wp_user_id`, `user_email`, `plan`, `timestamp`, `signature`

Planul vine prin bootstrap ca `plan_snapshot` în sesiune → feature flags în app layer.

### Circuit breaker V1

- timeout agresiv
- max 2–3 retry-uri simple
- cooldown 60s la failure repetat
- fallback: folosește cache/sesiune locală

### Regula de aur

WP intră în joc la bootstrap și pentru vendors. Supabase conduce produsul după login.

---

## 9. OPTIMISTIC UI

### Decizie arhitecturală

Optimistic UI = DA. Zustand / React Query = NU pentru V1.

### Pattern aprobat

1. user face acțiunea
2. UI se actualizează instant local
3. pornește persist în fundal
4. dacă persist reușește → confirmi
5. dacă persist pică → rollback + mesaj clar

### Unde se aplică

**Da:** Seating move/assign/swap, Guests edit simplu, Vendor status change, Budget item/payment mark

**Cu grijă (nu optimistic):** CSV import, migration, auth/provisioning

### Când reconsiderăm Zustand/React Query

- app devine foarte mare și state-ul e împrăștiat
- multe ecrane consumă aceleași date
- server-state invalidation devine dureros
- multi-user / live sync intră serios în joc

---

## 10. WATCHLIST — RISCURI CUNOSCUTE

### WP Down
Dacă bridge-ul cu WordPress crapă → mod offline/read-only în Next.js bazat pe cache/localStorage. Restul aplicației (guests, seating, budget) trebuie să rămână funcțional.

### Schema Drift
Interzicem modificările manuale în Supabase Dashboard. Toate modificările de schemă se fac exclusiv prin Supabase CLI migrations. Fără excepții.

### Voxel Updates
Dacă Voxel schimbă structura de date pentru Vendors, bridge-ul trebuie să fie suficient de flexibil să nu pice total. Versioning pe bootstrap endpoint.

---

## 11. REGULI DE IMPLEMENTARE

### NU face

- nu rescrie seating în Tailwind
- nu transforma Vendors într-un CRM complex
- nu dubla marketplace-ul din Voxel
- nu adăuga module noi fără aprobare
- nu complica RSVP în V1
- nu face abstracții premature
- nu inventa arhitectură nouă
- nu introduce Zustand/React Query fără aprobare
- nu modifica schema direct în Supabase Dashboard

### DA

- cod clar, TypeScript strict
- componente simple
- business rules explicite
- fără `any` inutil
- fără side effects ascunse
- fără duplicare de source of truth
- orice funcționalitate nouă vine cu teste
- PR fără teste verzi nu se merge
- review multi-AI (Claude + ChatGPT + Gemini) pentru cod complex

---

## 12. REGULI DE COLABORARE

- respectă arhitectura de mai sus
- nu devia de la Data Map
- spune clar: ce faci, ce tabele/flows atingi, ce riscuri există
- dacă există ambiguitate de produs → oprește și semnalează
- dacă e nevoie de o decizie de produs → nu improviza
- lucrăm cu disciplină — obiectivul nu este doar să "meargă" ci să fie premium, coerent, scalabil, sigur

## Update Mar 30, 2026 — post Faza 5 + Faza 6

### Roadmap — actualizat

```
1. Seating polish ✅
2. Faza 0A — Foundation ✅
3. Faza 0B — Auth & Data ✅
4. Faza 2A — Seating Performance Foundation ✅
5. Faza 3 — Guests Core ✅ (~85%)
6. Faza 5 — Budget Core ✅ (5.1, 5.2, 5.3)
7. Faza 6 — Seating ↔ Guests Integration ✅
8. Faza 2B — Seating Performance Validation ⏳
9. Faza 4 — Vendors Mirror ⏳
10. Faza 7 — RSVP ⏳
11. Faza 8 — Export & Compliance ⏳
12. Faza 9 — Reliability & QA ⏳
13. Faza 10 — Power Features ⏳
```

### Schema DB — adăugat Mar 30, 2026
- seating_id_maps — bridge UUID ↔ numeric ID pentru seating engine
- seating_id_counters — counter atomic per (wedding_id, event_id, entity_type)
- tables.deleted_at — soft delete pe mese

### Decizii de produs noi
- Budget currency default = RON
- BudgetSummary.has_mixed_currencies — UI afișează warning dacă valute mixte
- DELETE payment — permis doar pe budget_items cu status planned/confirmed
- Seating ↔ Guests — sync prin RPC tranzacțional, nu prin route handlers JS
- Soft delete în DB pentru tables, hard delete în editor UX
