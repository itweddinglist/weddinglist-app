# ROADMAP.md — WeddingList App
# Versiune: 2.3 FINAL — Aprilie 2026
# Surse: SPEC V5.4 + CONTEXT V2.0 + STATUS apr16 + ROADMAP v1.2 + v1.5 (ChatGPT) + Gemini + sesiuni Claude
# Rol: Referință de produs. NU se adaugă nimic nou fără motiv tehnic solid.
# Scor ROI: 1-5 (5 = critic) | Complexitate: Mică / Medie / Mare / Foarte Mare
# Motto: Nu mai adăuga nimic. Execută.

---

# 🎯 PRINCIPII FUNDAMENTALE

- **Server = singura sursă de adevăr** — clientul nu e niciodată trusted
- **Client = ZERO trust** — orice date din body/query sunt validate server-side
- **Fail fast > fallback** — erorile se raportează imediat, nu se ascund
- **Fără silent success** — orice acțiune are feedback explicit
- **Toate acțiunile sunt deterministe** — același input = același output
- **Orice dată trebuie să fie recuperabilă** — soft delete, audit trail, snapshots
- **Orice endpoint trebuie să fie auditabil** — request_id, logging structurat
- **Scalabilitate fără refactor major** — arhitectura suportă 10x utilizatori fără rescris
- **Execuția bate planificarea** — roadmap-ul e ghid, nu scop în sine

---

## ⚡ TOP 5 BLOCKERS REALE PENTRU LAUNCH
> Execută DOAR astea dacă timpul e limitat. Restul = backlog.

| # | Task | De ce e blocker |
|---|------|-----------------|
| 1 | S9 — Rate limiting pe guests/budget/export | Deschis la spam și data scraping acum |
| 2 | S13 — Tenant isolation test explicit | Neconfirmat prin test că user B nu vede datele user A |
| 3 | D1 — Soft delete pe guests | Guest șters cu loc alocat = date corupte în seating |
| 4 | Z1 — Emergency CSV Kit + Force Sync | Ziua nunții fără fallback = catastrofă |
| 5 | I9 — QA cu utilizator real | Cel mai mare risc neadresat la launch |

---

## SECȚIUNEA 0 — THE HARDENING WEEK
> Primele task-uri de făcut, în ordine. Fiecare o deblochează pe următoarea.

| Ord | Task | ROI | Complexitate | Status | Note |
|-----|------|-----|--------------|--------|------|
| H1 | CLAUDE.md în repo | 5 | Mică | ✅ DONE | Orice sesiune AI viitoare știe regulile fără explicații. Fișier cu arhitectură, decizii locked, reguli absolute, workflow standard |
| H2 | Duplicate tip SeatingGuest rezolvat | 4 | Medie | ✅ DONE | `types/seating.ts` vs `lib/seating/types.ts` — previne Heisenbugs la useri reali |
| H3 | Business rules centralizate în `lib/domain/` | 4 | Medie | ✅ DONE PR #162-#172 | Mută logica din hooks — SPEC Hard Rule #7. Permite E2E tests |
| H4 | E2E testing pe critical flows | 5 | Mare | ⏳ TODO | Auth, save seating, RSVP submit. Playwright. Posibil doar după H3 |
| H5 | Re-audit securitate după fiecare sprint major | 4 | Mică | ⏳ TODO | Rulează security audit prompt. Zero critical + zero high = condiție de merge în main |
| H6 | Manual critical flow end-to-end | 5 | Mică | ⏳ TODO | Testare manuală completă înainte de launch — login, seating, RSVP, export |
| H7 | Design tokens centralizați | 3 | Mică | 🟡 STARTED PR #170 + #172 | Culorile, fonturile, spacing în `tailwind.config.ts`. Nu blocker pentru launch, dar important pentru consistență vizuală pe termen lung |

### HWE0.5 — Post-Hardening Week Consolidation
> Blocked by: H4 (E2E) + H7 (Design tokens) complete. Cleanup major + page.tsx rewrite când foundation e ready.

| Ord | Task | ROI | Complexitate | Status | Note |
|-----|------|-----|--------------|--------|------|
| HWE0.5-A | page.tsx 1898 linii TS rewrite | 4 | Mare | ⏳ TODO | TD-08 — split components, type safety, după H7 design tokens |
| HWE0.5-B | Hierarchy docs clarificare | 2 | Mică | ⏳ TODO | TD-04 — 30 min, clarificare relație docs canonice |
| HWE0.5-C | CONTEXT §14 PR list overlap CHANGELOG | 3 | Medie | ⏳ TODO | TD-05 — 1h, elimin overlap, single source CHANGELOG |
| HWE0.5-D | CONTEXT §13 DECIZII LOCKED overlap CLAUDE/HANDOFF | 3 | Medie | ⏳ TODO | TD-06 — 1h, consolidare DECIZII într-un singur fișier |
| HWE0.5-E | vendor.rules.ts decision + impl | 3 | Medie | ⏳ TODO | TD-02 — 30 min decizie + 1-2h impl |

Total estimat HWE0.5: 7-10h efectiv.

---

## SECȚIUNEA 1 — BEFORE LAUNCH
> Tot ce trebuie să existe înainte de primul utilizator real plătitor.

---

### 1A. FAZELE TEHNICE RĂMASE

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| F1 | Idempotency Keys — integrare completă | 5 | Medie | ✅ DONE. Acoperă seating sync + Task Engine (click dublu pe conexiune slabă nu dublează cheltuiala) |
| F2 | Zod validare 100% pe toate API routes | 5 | Medie | Acum parțial. Fără asta = silent data corruption posibil |
| F3 | Query discipline — toate query-urile au `wedding_id` filter | 5 | Mică | Grep toate query-urile fără `wedding_id` — tenant isolation audit |
| F4 | Timeout + retry limitat pe request-uri externe | 3 | Medie | WP bootstrap timeout agresiv există; verificat că se aplică peste tot |
| F5 | withAuth extindere pe 6 endpoint-uri simple | 4 | Medie | ✅ Pilot DONE pe rsvp/manual. Următoarele 6: rsvp/invitations, guests (POST), guest-events (POST), guest-events/bulk, budget/items (POST), guests/import. Endpoint-urile cu weddingId în URL params (seating/sync, budget/items/[itemId]) — după E2E tests |

---

### 1B. SECURITATE (STATUS DUPĂ AUDIT APR 2026)

| # | Task | ROI | Complexitate | Status |
|---|------|-----|--------------|--------|
| S1 | Provision — elimina trust client wp_user_id | 5 | Medie | ✅ DONE |
| S2 | migrate-local auth + validare | 5 | Mică | ✅ DONE |
| S3 | mark-sent IDOR fix | 5 | Mică | ✅ DONE |
| S4 | RSVP event_id data corruption fix | 5 | Mică | ✅ DONE |
| S5 | minRole explicit pe toate 25 API routes | 5 | Medie | ✅ DONE |
| S6 | Shadow session expiration | 4 | Medie | ✅ DONE — chain wordpress→shadow o dată, 15 min hard ceiling |
| S7 | CSRF origin check pe toate rutele mutante | 4 | Medie | ✅ DONE — lib/csrf.ts, 16 rute protejate |
| S8 | error.message eliminat din răspunsuri client | 4 | Mică | ✅ DONE |
| S9 | Rate limiting pe `/api/guests`, `/api/budget`, `/api/export` | 5 | Mică | ❌ BLOCKER. Specificații: **60 req/min per user_id** (autentificat); **20 req/min per IP** (fallback); **429 Too Many Requests + header `Retry-After`**; key: `rateLimit(\`guests:${user_id}\`, ...)` — același pattern ca provision |
| S10 | PII masking în logs | 4 | Mică | Fără email/telefon în Sentry/console |
| S11 | Brute force protection pe RSVP public route | 4 | Mică | Honeypot există; brute-force detection lipsă |
| S12 | Signed export URLs cu expirare 5 min | 3 | Medie | Acum URLs nu expiră |
| S13 | Multi-tenant isolation test explicit | 5 | Mică | ❌ BLOCKER. **PASS/FAIL definit:** User B face `GET /api/guests?wedding_id={A_wedding_id}` → trebuie **403**. User B face `GET /api/guests` (active_wedding_id = B) → trebuie **200 cu date B**. Același test pe `/api/budget`, `/api/rsvp/dashboard`. PASS = toate 403. FAIL = orice 200 cu date din altă nuntă |
| S14 | Debug auth production guard | 4 | Mică | ✅ DONE |
| S15 | Dev endpoints double gate | 4 | Mică | ✅ DONE |
| S16 | CSV max columns | 3 | Mică | ✅ DONE — MAX_COLUMNS = 50 |
| S17 | Rate limiting pe endpoint search/CMD+K | 4 | Mică | Dacă CMD+K se implementează → **30 req/min per user_id**. Fără asta = vector de data scraping |

---

### 1C. DATA SAFETY (CRITIC PENTRU PRODUS)

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| D1 | Soft delete pe `guests` | 5 | Medie | ❌ BLOCKER. **Comportament definit în 5 puncte:** (1) Guest marcat `deleted_at = now()` — nu șters hard. (2) Dispare din guest list (`WHERE deleted_at IS NULL`). (3) `seat_assignments` marcate `deleted_at` în aceeași tranzacție. (4) Seating chart → locul devine liber automat. (5) RSVP responses păstrate pentru audit, guest dispare din dashboard |
| D2 | Soft delete pe `seat_assignments` | 4 | Mică | Parte din D1 — implementat simultan, aceeași tranzacție |
| D3 | Referential integrity — seating consistent după delete | 5 | Medie | Verificare că seating chart nu afișează locuri ocupate de guests cu deleted_at setat |
| D4 | Versioning basic seating — snapshot periodic | 3 | Medie | Snapshot la fiecare save major; recuperare rapidă din DB |
| D5 | Audit trail complet | 4 | Mică | ✅ DONE (seating_audit_logs + wl-audit.ts) |
| D6 | Data recovery flow documentat | 4 | Mică | Pași exacți pentru restaurare din DB la incident |

---

### 1D. PRODUS & UX

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| P1 | Onboarding flow — empty states per modul | 5 | Medie | Primul user vede dashboard gol. Fără asta = drop-off instant |
| P2 | Destructive action policy | 5 | Mică | Delete cu confirmare explicită + undo window 5s pe toate modulele |
| P3 | Unsaved changes warning | 5 | Mică | Warning la navigare cu modificări nesalvate (seating, budget, guests) |
| P4 | Mobile warning seating chart | 4 | Mică | Banner pe ecrane < 1024px |
| P5 | Error messages în română | 4 | Mică | Toate erorile vizibile pentru user = română, fără termeni tehnici |
| P6 | Microcopy complet | 3 | Mică | Labels, placeholders, success states — consistent în română |
| P7 | Tooltip "Eliberați locul?" | 3 | Mică | Pentru declined guests cu loc alocat |
| P8 | CopyLink RSVP verificat end-to-end | 3 | Mică | `public_link_id` verificat că funcționează complet |
| P9 | Responsive priority definită | 3 | Medie | Dashboard/Guests/RSVP responsive, Seating = desktop only |
| P10 | Print-friendly CSS | 2 | Mică | `@media print` pe guest list și budget |
| P11 | Zero-Knowledge Preview RSVP | 5 | Mică | Buton "Preview as Guest" — formularul cu date demo, fără a polua DB |
| P12 | Focus management — scroll la eroare | 3 | Mică | La submit cu eroare → scroll automat la primul câmp invalid |
| P13 | Undo actions — delete guest | 4 | Medie | Undo simplu există în seating; lipsă pe delete guest |
| P14 | CMD+K lean — căutare invitat | 3 | Medie | **Condiționat:** Dacă UI-ul final arată bara de căutare → funcțională pentru căutare invitat. Dacă UI nu o arată → rămâne V2 (V25) |

---

### 1E. ZIUA NUNȚII (zero toleranță)

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| Z1 | Emergency CSV Snapshot + Force Sync & Offline Lock | 5 | Medie | ❌ BLOCKER. **(1)** Buton "Descarcă Kit de Urgență" → CSV + PDF cu toți invitații și locurile alocate. CSV permite Ctrl+F la poarta sălii. **(2)** Buton "Force Sync & Lock Offline" → descarcă toate datele local, afișează indicator `[OK] Synced — [timestamp]`. Util înainte de intrarea în sală unde semnalul e slab |
| Z2 | Offline Export PDF/PNG safety net | 5 | Medie | Locații fără semnal există în RO. Export înainte de eveniment |
| Z3 | Read-only fallback testat real | 5 | Mică | Faza 4 implementată dar netestată cu Supabase degradat real |
| Z4 | Worst Day Scenario Plan — doc actualizat | 4 | Mică | Pași exacți dacă app nu merge în ziua nunții |
| Z5 | Manual operating mode documentat | 4 | Mică | Ce face plannerul dacă RSVP are probleme în ziua evenimentului |

---

### 1F. MONITORING & OPERAȚIONAL

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| M1 | Uptime monitoring configurat | 5 | Mică | UptimeRobot/BetterUptime, URL-uri critice, alerte |
| M2 | Sentry alerte configurate | 4 | Mică | Threshold-uri, environment tagging dev/preview/prod |
| M3 | Observability pattern enforced în cod | 4 | Medie | TOATE erorile API conțin: route, method, user_id, wedding_id, message. Pattern în withAuth — extins pe toate rutele |
| M4 | Release health checks | 4 | Mică | După fiecare deploy: login, save seating, RSVP submit |
| M5 | Incident response plan | 3 | Mică | Cine e notificat, în ce ordine, cum anunți utilizatorii |
| M6 | Point-in-time recovery activat Supabase | 5 | Mică | Dashboard → Settings → Point in Time Recovery |
| M7 | Error spike detection | 4 | Mică | Alert dacă erori 5xx depășesc threshold |
| M8 | Usage analytics — drop-off per modul | 3 | Mică | PostHog există; events definite per modul |
| M9 | Core Web Vitals monitorizate | 3 | Mică | Vercel Analytics sau Lighthouse CI |
| M10 | Feedback Loop Direct | 4 | Mică | Widget "Raportează o problemă" → Slack/Tally cu context automat |

---

### 1G. CALITATE & TESTARE

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| Q1 | E2E testing pe critical flows | 5 | Mare | Auth, save seating, RSVP submit. Playwright |
| Q2 | Edge cases: 0 invitați, 600 invitați, input invalid | 4 | Medie | Stress test cu date reale |
| Q3 | Load testing | 4 | Medie | 50 useri simultani cu 600 invitați |
| Q4 | Regression safety — fiecare fix verificat manual | 4 | Mică | Checklist manual după fiecare PR major |
| Q5 | Stress test diacritice și caractere speciale | 3 | Mică | Nume cu ș, ț, â, î — în toate modulele |

---

### 1H. GDPR & LEGAL (obligatoriu EU)

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| G1 | Terms of Service în română | 5 | Mică | Blocker legal |
| G2 | Privacy Policy actualizată | 5 | Mică | Art. 17 + Art. 20 GDPR |
| G3 | Retention policy concretă | 4 | Mică | Câte zile până la ștergere date inactive |
| G4 | Data deletion SLA | 4 | Mică | Art. 17 — în cât timp ștergi la cerere |
| G5 | Data Controller vs Processor map | 3 | Mică | Supabase, Vercel, Resend, PostHog — roluri clare |
| G6 | Cookie policy detaliată | 3 | Mică | PostHog, Vercel Analytics |
| G7 | Export date utilizator (JSON) | 4 | Mică | Art. 20 GDPR — Export JSON există, de documentat explicit |

---

### 1I. INFRASTRUCTURĂ & DEPLOY

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| I1 | Migrații aplicate pe PROD | 5 | Mică | Include `20260413000001`, `20260414000001` |
| I2 | RESEND_API_KEY configurat în Vercel | 5 | Mică | Blocker pentru email RSVP |
| I3 | SHADOW_SESSION_SECRET configurat în Vercel | 5 | Mică | Blocker pentru shadow session |
| I4 | NEXT_PUBLIC_APP_URL configurat în Vercel | 5 | Mică | Folosit în CSRF origin check și shadow session |
| I5 | DNS app.weddinglist.ro | 5 | Mică | Producție pe domeniu propriu |
| I6 | pg_cron activat Supabase | 4 | Mică | Dashboard → Database → Extensions → pg_cron |
| I7 | wpBridgeEnabled: true la launch | 5 | Mică | Acum false pentru dev local |
| I8 | RLS reactivat pe DEV după testare | 4 | Mică | Dezactivat intenționat pentru QA |
| I9 | QA complet cu utilizator real | 5 | Medie | ❌ BLOCKER — Zero QA cu user real până acum |
| I10 | Pagination pe toate listele | 4 | Medie | Guests, budget items, audit logs |
| I11 | DB Seed Sanity Check | 4 | Mică | Script care verifică config-urile de bază după deploy |
| I12 | Worst Day Scenario testat | 5 | Mică | Simulează Supabase down + WP down |
| I13 | DEV_ENDPOINTS_ENABLED absent din Vercel prod | 5 | Mică | Verificat explicit că nu există în env vars prod |
| I14 | NEXT_PUBLIC_DEBUG_AUTH absent din Vercel prod | 5 | Mică | Verificat explicit că nu există în env vars prod |

---

### 1J. RSVP — FEATURES AMÂNATE

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| R1 | party_id — Group RSVP | 4 | Mare | O familie = un token. Amânat pentru validare cu useri reali |
| R2 | Resend email activat | 5 | Mică | Blocat pe RESEND_API_KEY în Vercel |
| R3 | Invite Delivery Hub UI | 3 | Medie | UI pentru trimitere invitații în masă |
| R4 | RSVP reminder automat | 3 | Medie | Email automat la X zile înainte — V2 |

---

### 1K. MULTI-EVENT

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| ME1 | Documentat explicit: V1 = un singur event activ per wedding | 4 | Mică | Schema DB suportă multiple events, UI nu |
| ME2 | Guest List: coloane `attending_ceremony` + `attending_reception` | 4 | Mică | Soluție lean pentru Cununie vs Masă |

---

### 1L. SEATING CHART POLISH

| # | Task | ROI | Complexitate | Note |
|---|------|-----|--------------|------|
| SC1 | isDimmed opacity 0.3 → 0.6 | 2 | Mică | Visual polish minor |
| SC2 | Zoom < 0.2 rect redus 60-70% | 2 | Mică | Performance visual |
| SC3 | Seat swap drag & drop | 3 | Mare | Risc Mare — după launch, după E2E tests |

---

## SECȚIUNEA 2 — V2
> Nu intră în V1 indiferent de timp disponibil.

### 2A. SEATING

| # | Task | ROI | Complexitate |
|---|------|-----|--------------|
| V1 | Canvas în loc de SVG | 4 | Foarte Mare |
| V2 | Delta sync seating | 4 | Mare |
| V3 | Merge assist conflicte | 3 | Foarte Mare |
| V4 | Bulk seat group | 3 | Medie |
| V5 | Zone spațiale Magic Fill | 3 | Mare |
| V6 | Insights Engine | 4 | Mare |

### 2B. WEBSITE NUNTĂ

| # | Task | ROI | Complexitate |
|---|------|-----|--------------|
| W1 | Pagină publică per nuntă | 5 | Foarte Mare |
| W2 | Countdown timer public | 3 | Mică |
| W3 | Detalii eveniment public | 4 | Medie |
| W4 | Galerie foto | 3 | Mare |
| W5 | RSVP integrat în website | 5 | Medie |
| W6 | Domeniu custom | 3 | Medie |

### 2C. GUEST MOMENTS

| # | Task | ROI | Complexitate |
|---|------|-----|--------------|
| V11 | QR pe masă | 4 | Mare |
| V12 | Upload poze + mesaje | 4 | Foarte Mare |
| V13 | Album exportabil | 3 | Mare |

### 2D. GUESTS & ORGANIZARE

| # | Task | ROI | Complexitate |
|---|------|-----|--------------|
| V14 | Guest Tagging System | 4 | Medie |
| V15 | Multi-event UI complet | 3 | Mare |
| V16 | Household-based invitation | 4 | Mare |

### 2E. SCALABILITATE & PIAȚĂ

| # | Task | ROI | Complexitate |
|---|------|-----|--------------|
| V17 | Multi-country (PL, HU, CZ) | 4 | Foarte Mare |
| V18 | Wedding planner accounts | 4 | Foarte Mare |
| V19 | Webhook system | 3 | Mare |
| V20 | WP Sync Hook | 3 | Medie |

### 2F. POWER FEATURES

| # | Task | ROI | Complexitate |
|---|------|-----|--------------|
| V21 | Impersonation Tool admin | 3 | Mare |
| V22 | Budget Smart Predictions | 3 | Medie |
| V23 | Realtime sync seating | 4 | Foarte Mare |
| V24 | Mobile app nativă | 2 | Foarte Mare |
| V25 | Command palette CMD+K complet | 3 | Mare |
| V26 | Cold storage audit logs | 2 | Medie |

---

## SECȚIUNEA 3 — DECIZII LOCKED
> NU se rediscută fără motiv tehnic solid.

### 3A. STORAGE & PERSISTENȚĂ

**STORAGE_KEY seating chart: `wedding_seating_v14`**
- Incrementează DOAR la breaking changes în schema localStorage
- DB = singura sursă de adevăr. La conflict localStorage vs DB: DB wins

### 3B. TEHNOLOGIE

- **react-window** — INTERZIS (incompatibil cu Turbopack în Next.js 16+)
- **revalidateTag** — NU se aplică (client-side fetching)
- **SVG vs Canvas** — V1 = SVG; V2 = Canvas DOAR dacă FPS < 45
- **SYNC_DEBOUNCE_MS = 1500ms** — deliberat pentru drag & drop continuu
- **Seating Chart CSS** — izolat de Tailwind, nu se atinge, nu se rescrie

### 3C. SCHEMA DB

- **UNIQUE constraint (wedding_id, first_name, last_name)** — NU adăugăm
- **party_id** — amânat după launch, validat cu useri reali
- **Multi-event** — V1 = un singur event activ; schema suportă mai multe, UI nu

### 3D. AUTH & SECURITATE

**Pipeline obligatoriu pentru orice write:**
```
request → checkOrigin() → rateLimit() → getServerAppContext()
       → requireAuthenticatedContext() → requireWeddingAccess(minRole: "editor")
       → validate input → DB write
```

- **Niciun bypass auth** în afara `lib/auth/dev-session.ts`
- **`service_role`** NICIODATĂ în client sau NEXT_PUBLIC_*
- **JWT client-side** = eliminat complet
- **minRole** = obligatoriu explicit, TypeScript enforced
- **withAuth wrapper** = HOF union-safe; pilot pe rsvp/manual ✅; extindere pe 6 endpoint-uri simple; endpoint-urile cu weddingId în URL params după E2E tests
- **Security audit: 100/100 — SAFE TO LAUNCH** (apr 2026)

**Rate limiting standard (valori concrete — locked):**
- Write endpoints autentificate: **60 req/min per user_id**
- Fallback per IP: **20 req/min per IP**
- Search/CMD+K (dacă implementat): **30 req/min per user_id**
- Response: **429 Too Many Requests + Retry-After header**

### 3E. MODULE ELIMINATE DEFINITIV DIN V1

| Modul | Motiv |
|-------|-------|
| Sugestie masă liberă când plină | Bordura roșie acoperă nevoia |
| Seat Lock | Magic Fill respectă asignările manuale |
| Scroll to selected guest | ROI mic, complexitate mare |
| Relationship-Aware Seating | Necesită validare cu useri reali |
| Undo History Panel complex | Undo simplu (20 acțiuni) e suficient |
| Auto Balance Tables | Magic Fill acoperă nevoia |
| Table Templates preset | Complexitate fără ROI clar |
| 3D venue | Out of scope V1 |
| Household-based invitation | → V2 |
| Moodboard | Eliminat din navigare |
| Wishlist | Out of scope V1 |
| Notițe (modul separat) | Contextual, nu modul separat |
| Checklist standalone | Absorbit în Task Engine |
| Timeline standalone | Absorbit în Dashboard/Export |

### 3F. MODULE ACTIVE V1

```
1. Dashboard (cu Task Engine)
2. Plan Mese (Seating Chart)
3. Listă Invitați
4. Budget
5. Vendors (blocat pe Voxel — afișat dar disabled)
6. RSVP
7. Export
8. Settings
9. Guest Moments (viitor)
```

### 3G. RECOMANDĂRI POST-LAUNCH

**API:** Supabase generated types, POST /api/guest-events → 1 RPC, paginare GET /api/guests, Sentry în internalErrorResponse

**UI Guests:** Import Summary Card, Column Mapping UI, Preview CSV, Bulk actions, Export round-trip

---

## SUMARUL PRIORITĂȚILOR BEFORE LAUNCH

**✅ Completed (Hardening Week):**
`H3` — closed PR #162-#172 (Etapele 1/3 + 2/3 + 3/3)

**Blochează launch absolut:**
`S9, S13, D1, D2, D3, Z1, I9, H1, H6, I1-I8, I13-I14, G1, G2, R2, M6, Q4`

**Critic pentru experiența utilizatorului:**
`H2, P1, P2, P3, P11, Z2, Z3, S10, S11, F5, Q1, M3, M10`

**Important dar nu blocant:**
`H4, H5, H7, F2, F3, D4, D6, P4-P13, Z4-Z5, S12, S17, G3-G7, M1-M9, Q2-Q3, Q5, I10-I12, R1, R3, ME1, ME2`

**Nu în V1:**
`SC3, V1-V26, W1-W6, P14 (CMD+K — doar dacă apare în UI final)`

---

## 🚀 GO LIVE CONDITIONS

```
✅ Zero critical vulnerabilities
✅ Zero high vulnerabilities
✅ Flow complet validat manual (auth → seating → RSVP → export)
✅ Dashboard funcțional cu date reale
✅ Soft delete guests implementat corect (D1 + D2 + D3)
✅ Tenant isolation test PASS (S13)
✅ Rate limiting pe toate endpoint-urile (S9)
✅ Emergency CSV Kit + Force Sync funcțional (Z1)
✅ Securitate verificată (audit 100/100 — apr 2026)
✅ Migrații aplicate pe PROD
✅ Env vars configurate în Vercel (RESEND, SHADOW_SECRET, APP_URL)
✅ DEV_ENDPOINTS_ENABLED și DEBUG_AUTH absente din prod
✅ DNS activ
✅ ToS + Privacy Policy în română
✅ QA cu cel puțin un utilizator real
✅ pg_cron activat
✅ Point-in-time recovery activat Supabase
```

---

*Roadmap version: 2.3 FINAL*
*Data: 16 Aprilie 2026*
*Surse: SPEC V5.4 + CONTEXT V2.0 + STATUS apr16 + ROADMAP v1.2 + v1.5 (ChatGPT) + Gemini + sesiuni Claude apr 7-16 + security audit 100/100*
*Motto: Nu mai adăuga nimic. Execută.*
