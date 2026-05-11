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
| H4 | E2E testing pe critical flows | 5 | Mare | 🟡 STARTED PR #177-#178 | H4.1 ✅ smoke + Playwright scaffold (PR #177). H4.2.A ✅ auth foundation cu DEV bypass + helper + smoke `/dashboard` (PR #178). H4.2.B/C/D (RSVP/seating/budget flows) + H4.3 (CI integration) pending. |
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



# ROADMAP.md — Faza 13: Pre-launch Hardening (post-audit Mai 2026)

> Adaug această secțiune la ROADMAP.md existent.
> Detalii complete: `/docs/audit/2026-05-pre-launch.md`.

---

## Faza 13 — Pre-launch Hardening (post-audit empirical Mai 2026)

**Status:** 🔴 **BLOCKING LAUNCH** — 9 launch blockers confirmate empirical
**Estimare:** 174-276h focused work (~2-3.5 luni la 4-6h/zi)
**Justificare:** Audit empirical a confirmat că produsul **NU este lansabil** în starea actuală. RSVP feature complet nefuncțional, 7 violations GDPR cumulative, pattern systemic schema drift.

### Sub-faze

#### Faza 13.0 — Infrastructure (PRECONDIȚIE) — 18-30h

**Scop:** Fix-ul care face fix-urile celelalte sustainable. Cauza rădăcină a 7+ bugs e schema drift fără pipeline de validare.

- [ ] 13.0.A.1 — Husky pre-commit hook: `supabase gen types typescript` automatic
- [ ] 13.0.A.2 — Supabase JS client cu strict typing `createClient<Database>(...)`
- [ ] 13.0.A.3 — Schema validation runtime (`lib/db/schema-guard.ts`) — fail rapid pe drift
- [ ] 13.0.A.4 — Vitest profile `vitest.integration.config.ts` cu Supabase DEV
- [ ] 13.0.A.5 — Migration testing CI (up + down + up)
- [ ] 13.0.B.1 — `wl_audit_step()`, `wl_audit_diff()`, `wl_audit_actor()` extensions
- [ ] 13.0.B.2 — Apel audit log pe toate mutațiile sensibile
- [ ] 13.0.B.3 — Reverse-lookup endpoint (DEV only)

#### Faza 13.1 — RSVP Reconstruction — 32-52h

**Scop:** Modulul RSVP refactorizat de la zero contra arhitecturii corecte. Combinație C1 + C2 + C3 + C7 + C8 + S1 face feature-ul complet broken.

- [ ] 13.1.A.1 — Migration `20260501000001_rsvp_reconstruction.sql`
- [ ] 13.1.A.2 — Pivot table `rsvp_invitation_events`
- [ ] 13.1.A.3 — Shadow invitation pattern pentru manual override
- [ ] 13.1.A.4 — History tracking `rsvp_response_versions` + trigger
- [ ] 13.1.A.5 — Sync trigger `AFTER INSERT/UPDATE` pe rsvp_responses → guest_events
- [ ] 13.1.A.6 — Mapping enum `accepted → attending`
- [ ] 13.1.A.7 — Backfill rows existente
- [ ] 13.1.A.8 — `wedding.rsvp_modifiable BOOLEAN` config
- [ ] 13.1.B.1 — RLS strict pentru anon (zero acces RSVP via Supabase JS)
- [ ] 13.1.B.2 — Toate operațiile RSVP prin Next.js API + service_role
- [ ] 13.1.C.1 — POST `/api/rsvp/invitations` rewrite cu `event_ids: string[]`
- [ ] 13.1.C.2 — POST `/api/rsvp/manual` rewrite cu shadow invitation
- [ ] 13.1.C.3 — POST `/api/rsvp/[public_link_id]` rewrite cu partial response
- [ ] 13.1.C.4 — UI guest re-deschidere link cu warning + history
- [ ] 13.1.C.5 — Email confirmare guest la fiecare submit
- [ ] 13.1.D.1 — Schema migration ADD COLUMN `email TEXT` pe guests
- [ ] 13.1.D.2 — CSV import support email
- [ ] 13.1.D.3 — UI guest list email opțional
- [ ] 13.1.D.4 — Email URL fix cu publicLinkId
- [ ] 13.1.D.5 — RESEND_API_KEY configurare

#### Faza 13.2 — GDPR Compliance — 16-28h

**Scop:** 7 violations GDPR rezolvate. Privacy policy aliniat cu realitate empirică.

- [ ] 13.2.A.1 — Consent banner restructurat (3 opțiuni: essential/accept all/personalizează)
- [ ] 13.2.A.2 — PostHog init gated pe consent
- [ ] 13.2.A.3 — Reactive `posthog.opt_out_capturing()` la decline
- [ ] 13.2.A.4 — Defense-in-depth (`disable_session_recording`, `autocapture: false`)
- [ ] 13.2.B.1 — Privacy.html completat (placeholders: nume companie, email, domeniu)
- [ ] 13.2.B.2 — PostHog Inc. declarat în privacy §5 procesatori
- [ ] 13.2.B.3 — DPA cu PostHog verificat/semnat
- [ ] 13.2.B.4 — Cookies §8 detaliat per categorie
- [ ] 13.2.B.5 — GDPR rights endpoints: `/api/gdpr/access`, `/erasure`, `/object`
- [ ] 13.2.C.1 — PostHog instanță verificată (EU vs US)
- [ ] 13.2.C.2 — Migrare la EU instance dacă necesar
- [ ] 13.2.C.3 — TIA documentat dacă US

#### Faza 13.3 — Security Hardening — 17-28h

**Scop:** Defense-in-depth full. CSRF gaps fix, headers OWASP, RLS role-aware.

- [ ] 13.3.A.1 — `next.config.mjs` cu CSP, HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, COOP/CORP
- [ ] 13.3.A.2 — CSP report-only mode 1 săptămână + fine-tune
- [ ] 13.3.A.3 — Referrer-Policy `no-referrer` pe `/rsvp/*`
- [ ] 13.3.A.4 — PostHog dezactivat pe rute publice
- [ ] 13.3.A.5 — `Cache-Control: no-store` pe API PII
- [ ] 13.3.B.1 — `checkOrigin` pe account DELETE, shadow-session POST, import/json POST
- [ ] 13.3.B.2 — CI check assert toate routes mutating au `checkOrigin`
- [ ] 13.3.C.1 — PostgreSQL function `is_wedding_role(_wedding_id, _min_role)`
- [ ] 13.3.C.2 — RLS policies actualizate pe 14 tabele operaționale
- [ ] 13.3.C.3 — Tests integration cu mock JWT pentru fiecare role
- [ ] 13.3.D.1 — Rate limit fail-CLOSED (refuse dacă Redis down)
- [ ] 13.3.D.2 — Per-endpoint granular rate limits
- [ ] 13.3.D.3 — Audit log pe rate limit hits

#### Faza 13.4 — Data Portability — 36-54h

**Scop:** Export/import functional + GDPR Art. 20 compliance.

- [ ] 13.4.A.1 — Format versionat strict `schema_version: "2.0"`
- [ ] 13.4.A.2 — Multi-format (JSON, CSV per entitate, PDF)
- [ ] 13.4.A.3 — Schema validation runtime (folosește schema-guard)
- [ ] 13.4.A.4 — Streaming pentru weddings mari (NDJSON)
- [ ] 13.4.A.5 — Bug `tables.deleted_at` rezolvat
- [ ] 13.4.A.6 — `wedding_members`, `vendors` incluse în export
- [ ] 13.4.B.1 — PostgreSQL function `import_wedding_v2()` tranzacțional
- [ ] 13.4.B.2 — Schema validation strict cu Zod
- [ ] 13.4.B.3 — Idempotency cu `idempotency_key`
- [ ] 13.4.B.4 — Schema migration logic v1.0 → v2.0
- [ ] 13.4.C.1 — Integration test mandatory roundtrip
- [ ] 13.4.C.2 — Property-based tests
- [ ] 13.4.C.3 — CI check roundtrip pe fiecare PR

#### Faza 13.5 — Data Integrity — 30-46h

**Scop:** Idempotency adopt universal + Account DELETE structural rewrite + Dashboard stats fix.

- [ ] 13.5.A.1 — Refactor `withIdempotency` la pattern atomic `INSERT ON CONFLICT DO NOTHING RETURNING`
- [ ] 13.5.A.2 — Adopt în toate 20 endpoints mutating
- [ ] 13.5.A.3 — PG Cron cleanup TTL 24h
- [ ] 13.5.A.4 — Audit log pe race detection
- [ ] 13.5.A.5 — Tests concurrente (property-based)
- [ ] 13.5.B.1 — PostgreSQL function `delete_account_atomic`
- [ ] 13.5.B.2 — Schema migration ADD COLUMN `app_users.status, deletion_requested_at, scheduled_for_deletion_at`
- [ ] 13.5.B.3 — Tabelă `deleted_users` pentru audit/compliance
- [ ] 13.5.B.4 — FK fix `idempotency_keys.app_user_id` ON DELETE CASCADE
- [ ] 13.5.B.5 — FK fix `weddings.owner_user_id` ON DELETE SET NULL
- [ ] 13.5.B.6 — Hard delete real pentru weddings fără alți members
- [ ] 13.5.B.7 — Soft delete cu retention 30 zile + cancel flow
- [ ] 13.5.B.8 — SOLE_OWNER guard cu row lock `FOR UPDATE`
- [ ] 13.5.B.9 — Recovery endpoints (cancel-deletion, admin recovery)
- [ ] 13.5.C.1 — Dashboard stats fix `guest_id` → `guest_event_id`
- [ ] 13.5.C.2 — `Promise.all` → `Promise.allSettled`
- [ ] 13.5.C.3 — Integration test pe `/api/dashboard/stats`

#### Faza 13.6 — Polish + Tests — 25-38h

**Scop:** C9 fix + documentation + test coverage gaps.

- [ ] 13.6.A.1 — `useEffect` cleanup pe `[eventId]` care clear `syncTimerRef`
- [ ] 13.6.B.1 — CLAUDE.md updated cu §10 + §11 (decizii LOCKED post-audit)
- [ ] 13.6.B.2 — HANDOFF.md updated (Faze 13.0-13.6 marcate)
- [ ] 13.6.B.3 — ROADMAP.md updated (status Faza 13)
- [ ] 13.6.B.4 — CHANGELOG.md entries per PR
- [ ] 13.6.C.1 — Integration test suite complete contra Supabase DEV
- [ ] 13.6.C.2 — E2E test suite Playwright (login → wedding → guests → invitations → RSVP → updates)
- [ ] 13.6.C.3 — CI integration: all tests must pass înainte de merge

### Secvența recomandată (paralelizare)

**Ordine STRICT obligatorie:**

1. **Faza 13.0 PRIMA** — fără infrastructure, restul fixurilor sunt construit pe nisip
2. **Faza 13.5.C (dashboard) + 13.6.A (C9)** quick wins paralel cu 13.0
3. **Faza 13.1 (RSVP)** — feature core broken, prioritate maximă după infra
4. **Faza 13.4 (Export/Import)** poate începe în paralel cu 13.1.B după ce schema RSVP e finalizată
5. **Faza 13.2 (GDPR)** — paralel cu 13.1 (nu interactionează)
6. **Faza 13.3 (Security)** — paralel cu 13.5 (independente)
7. **Faza 13.5.A + 13.5.B** — DUPĂ 13.0 + 13.4 (depind de schema-guard + tipuri Supabase regenerate)
8. **Faza 13.6 (Polish)** — final

### Criteriu "DONE" pentru Faza 13

- [ ] Toate 9 launch blockers confirmate empirical sunt REZOLVATE empirical (verificat prin integration test contra DB reală)
- [ ] Pattern systemic schema drift NU mai poate apărea (schema-guard + types + integration tests CI)
- [ ] 7 violations GDPR rezolvate (verificate prin checklist legal)
- [ ] Toate 14 puncte din audit nou + 6 din audit original au verdict ✅ în re-test empirical
- [ ] CI pipeline forțează: TS strict + lint + unit + integration + roundtrip + E2E
- [ ] Documentation aliniată cu cod (no comments care mint)

---

## Faza 13 — Granularitate execuție post-cross-model validation

> **Reformulare granulară a Fazei 13** după validation cross-model ChatGPT.
> Scope-ul Fazei 13 RĂMÂNE NESCHIMBAT (174-276h, toate 9 launch blockers + scope complet).
> Doar **execuția** se sparge în PR-uri concrete pentru reviewability + risk surface mai mic.

### Estimare actualizată: 186-296h (+12-20h pentru 5 risks adăugate A-E)

### Cele 17 PR-uri Faza 13

#### PR 1 — Schema Drift Safety Net (Faza 13.0 partial)

> **Note 2026-05-09 — SPLIT decision LOCKED:** PR 1 monolithic original e split în 4 sub-PRs cross-model validation (vezi HANDOFF.md lesson L38): **PR 1A** Database Types Contract (Layer 1 compile-time, merged `#182` hash `8fe3861`), **PR 1B** integration tests cu DB reală (Layer 2), **PR 1C** CI `db:types:check` + schema fingerprint (Layer 3), **PR 1D** runtime schema-guard la app startup (Layer 4).
>
> Plus 2 sub-PRs adiționale identificate empirical Task 1A.4 markers placement: **PR 1E** Enum Type Narrowing Layer (consolidare Cat3 markers cross-feature) + **PR 1F** RPC + Json Hardening (consolidare Cat4 + Cat5 markers).
>
> **Status sub-PRs (2026-05-11):**
> - **PR 1A** ✅ merged `#182` `8fe3861` (Database Types Contract Layer 1 compile-time)
> - **PR 1B.0** ✅ merged `#187` `988a5f5` (Layer 1 enforcement complete + CI parity local)
> - **PR 1B** ⏳ pending (Integration tests cu DB reală Layer 2, 12-20h estimate)
> - **PR 1C** ⏳ pending (CI `db:types:check` + schema fingerprint Layer 3)
> - **PR 1D** ⏳ pending (Runtime schema-guard la app startup Layer 4)
> - **PR 1E** ⏳ pending (Enum Type Narrowing Layer)
> - **PR 1F** ⏳ pending (RPC + Json Hardening)
>
> Sub-tasks 1.1-1.10 mai jos rămân valide ca scope intent, dar grupare exactă pe sub-PR (1A-1F) e reflectată în Status block de mai sus.

**Scop:** infrastructura care previne următoarele 50 de bugs din clasa schema drift.

- [ ] 1.1 — Husky pre-commit hook: `npx supabase gen types typescript --local > types/database.ts`
- [ ] 1.2 — TypeScript Database type generated + commit
- [ ] 1.3 — Supabase JS client typed: refactor `createClient<Database>(...)`
- [ ] 1.4 — Schema fingerprint script (Risk A): `scripts/schema_fingerprint.sql`
- [ ] 1.5 — Schema-guard runtime (`lib/db/schema-guard.ts`)
- [ ] 1.6 — Vitest profile separat: `vitest.integration.config.ts` contra Supabase DEV
- [ ] 1.7 — 3 integration tests pe endpoints broken (dashboard stats, export JSON, RSVP invitations)
- [ ] 1.8 — CI job nou: integration tests obligatorii pre-merge develop
- [ ] 1.9 — Migration testing CI: up + down + up automatic
- [ ] 1.10 — DEV vs PROD schema fingerprint diff în CI pre-deploy

**Estimare:** 18-30h
**Acceptance:** TS verde pe toate 9 bugs schema drift (compile-time detection); schema fingerprint identical DEV vs PROD în CI.

#### PR 2 — Security/GDPR Emergency Stop (Faza 13.2 + 13.3 + Risk D + E)

**Scop:** stop bleeding pe security + legal exposure înainte de orice user real.

- [ ] 2.1 — RLS RSVP fix (S1): anon zero acces, toate prin Next.js API + service_role
- [ ] 2.2 — Migration `20260505000001_rls_rsvp_close_anon.sql`
- [ ] 2.3 — PostHog consent gate (S2): banner restructurat 3 opțiuni, init gated
- [ ] 2.4 — Reactive `posthog.opt_out_capturing()` la decline
- [ ] 2.5 — PostHog dezactivat pe rute publice (`/rsvp/*`)
- [ ] 2.6 — Security headers complete (S3): CSP, HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, COOP/CORP
- [ ] 2.7 — CSP report-only mode 1 săptămână înainte de enforce
- [ ] 2.8 — Cache-Control: no-store pe API PII (S6)
- [ ] 2.9 — CSRF gaps fix (S5): account DELETE, shadow-session POST, import/json POST
- [ ] 2.10 — CI check assert toate routes mutating au `checkOrigin`
- [ ] 2.11 — Token redaction în logs (Risk E): logger middleware + Sentry beforeSend + Vercel filter
- [ ] 2.12 — Rate limiting public RSVP (Risk D): per IP + per public_link_id, constant-time response
- [ ] 2.13 — Privacy.html completare placeholders (nume companie, email, domeniu)
- [ ] 2.14 — PostHog Inc. declarat în privacy §5 procesatori
- [ ] 2.15 — DPO review prep package documentation

**Estimare:** 20-32h
**Acceptance:** Anon NU poate face SELECT/INSERT/UPDATE pe rsvp; PostHog NU se inițializează fără consent; toate headers OWASP setate; rate limiting funcțional.

#### PR 3 — RSVP Minimal Functional Reconstruction (Faza 13.1 partial + 13.5.C)

**Scop:** RSVP devine funcțional end-to-end cu calitate completă pentru scope-ul minim. NU "cu bugs ramase".

- [ ] 3.1 — Schema migration `20260506000001_rsvp_phase1.sql`
- [ ] 3.2 — `rsvp_invitations.event_id` rămâne NOT NULL (decizie pragmatic)
- [ ] 3.2.A — **C12 SECURITY HIGH:** ADD COLUMN `rsvp_invitations.expires_at TIMESTAMPTZ` (schema currently missing, code references → 22 errors cascade single root cause). Pre-condiție pentru token expiry guard. Cross-ref: HANDOFF.md L43 + registry §E.1 + L46 hidden bugs F13 disclosure.
- [ ] 3.3 — Sync trigger AFTER INSERT/UPDATE pe `rsvp_responses` → `guest_events.attendance_status`
- [ ] 3.4 — Mapping enum `accepted → attending`
- [ ] 3.5 — Backfill rows existente
- [ ] 3.6 — POST /api/rsvp/invitations rewrite: include `event_id` în payload
- [ ] 3.7 — POST /api/rsvp/manual rewrite: shadow invitation pattern (NU `invitation_id: null`)
- [ ] 3.8 — POST /api/rsvp/[public_link_id]: partial response cu warning (NU silent drop C2)
- [ ] 3.9 — Dashboard stats fix (C4): `seat_assignments.guest_id` → `guest_event_id`
- [ ] 3.10 — `Promise.all` → `Promise.allSettled` în dashboard stats
- [ ] 3.11 — E2E test Playwright: host generează → guest răspunde → seating vede status

**Estimare:** 28-40h
**Acceptance:** Host generează invitație fără 500; guest răspunde fără data loss; seating + guest list + RSVP dashboard arată ACEEAȘI valoare; manual override funcționează; dashboard se încarcă fără 500; tokens RSVP expire la `expires_at` (NU never — C12 fix).

#### PR 4 — Account Deletion Atomic (Faza 13.5.B)

**Scop:** GDPR Art. 17 implementabil + zero state hibrid.

- [ ] 4.1 — Schema migration: ADD COLUMN `app_users.status, deletion_requested_at, scheduled_for_deletion_at`
- [ ] 4.2 — PostgreSQL function `delete_account_atomic()` cu BEGIN/COMMIT
- [ ] 4.3 — Tabelă `deleted_users` pentru audit/compliance
- [ ] 4.4 — FK fix: `idempotency_keys.app_user_id` ON DELETE CASCADE
- [ ] 4.5 — FK fix: `weddings.owner_user_id` ON DELETE SET NULL (sau handle structural)
- [ ] 4.6 — Hard delete real pentru weddings fără alți members
- [ ] 4.7 — Soft delete cu retention 30 zile + cancel flow
- [ ] 4.8 — SOLE_OWNER guard cu row lock `FOR UPDATE`
- [ ] 4.9 — Recovery endpoints (`/api/account/cancel-deletion`, `/api/admin/recover-stuck-deletion`)
- [ ] 4.10 — Email confirmare DELETE trimis DUPĂ pașii destructive (nu înainte)
- [ ] 4.11 — Integration test: end-to-end delete pe wedding cu guests, RSVP, seating, budget, payments

**Estimare:** 16-24h
**Acceptance:** Account DELETE funcționează atomic; zero state hibrid posibil; 30-day soft hold + recovery flow.

#### PR 5 — Pivot Table RSVP Multi-event (Faza 13.1.A complete)

**Scop:** arhitectura premium long-term pentru link unic multi-event.

- [ ] 5.1 — Schema migration `20260507000001_rsvp_pivot.sql`: tabela `rsvp_invitation_events`
- [ ] 5.2 — Refactor POST /api/rsvp/invitations cu `event_ids: string[]`
- [ ] 5.3 — RPC tranzacțional pentru creare invitation + N rows pivot atomic
- [ ] 5.4 — Backfill rows existente (1 row pivot per invitation existent)
- [ ] 5.5 — Update toate read paths (host dashboard, public RSVP) pentru pivot
- [ ] 5.6 — Migration data: `rsvp_invitations.event_id` → poate deveni nullable după backfill complet
- [ ] 5.7 — Integration tests pivot multi-event

**Estimare:** 12-18h

#### PR 6 — RSVP History Tracking + Warning UI (Faza 13.1.C)

**Scop:** Defense împotriva link forwarding takeover (C3) + audit trail complet.

- [ ] 6.1 — Schema migration: tabel `rsvp_response_versions` + trigger BEFORE UPDATE
- [ ] 6.2 — `wedding.rsvp_modifiable BOOLEAN` config
- [ ] 6.3 — UI guest re-deschidere link cu warning + history vizibil
- [ ] 6.4 — Audit log per RSVP submit + modificare
- [ ] 6.5 — Host dashboard: timeline schimbări per guest

**Estimare:** 8-14h

#### PR 7 — Email Confirmation RSVP (Faza 13.1.D)

**Scop:** Defense layer + RESEND_API_KEY configurat.

- [ ] 7.1 — Schema migration: ADD COLUMN `email TEXT` pe guests
- [ ] 7.2 — CSV import support email
- [ ] 7.3 — UI guest list email opțional
- [ ] 7.4 — Email URL fix: cu `publicLinkId` (NU `rawToken`)
- [ ] 7.5 — RESEND_API_KEY configurare DEV + PROD
- [ ] 7.6 — Email confirmare guest la fiecare submit
- [ ] 7.7 — Email notification host la modificare RSVP

**Estimare:** 6-10h

#### PR 8 — Export JSON v2.0 + Roundtrip Tests (Faza 13.4.A + 13.4.C)

**Scop:** GDPR Art. 20 implementabil + foundation pentru import.

- [ ] 8.1 — Format versionat strict `schema_version: "2.0"`
- [ ] 8.2 — Bug `tables.deleted_at` rezolvat structural
- [ ] 8.3 — `wedding_members`, `vendors`, `audit_logs` incluse în export
- [ ] 8.4 — Schema validation runtime (folosește schema-guard)
- [ ] 8.5 — Streaming pentru weddings mari (NDJSON)
- [ ] 8.6 — Integration test mandatory roundtrip
- [ ] 8.7 — Property-based tests (fast-check sau similar)
- [ ] 8.8 — CI check roundtrip pe fiecare PR

**Estimare:** 12-18h

#### PR 9 — Import JSON v2.0 (Faza 13.4.B)

**Scop:** complet roundtrip-able + GDPR Art. 20 bidirecțional.

- [ ] 9.1 — PostgreSQL function `import_wedding_v2()` tranzacțional
- [ ] 9.2 — Schema validation strict cu Zod
- [ ] 9.3 — Idempotency cu `idempotency_key`
- [ ] 9.4 — Schema migration logic v1.0 → v2.0
- [ ] 9.5 — Toate 6 coloane fantomă rezolvate
- [ ] 9.6 — Toate 8 NOT NULL violations rezolvate
- [ ] 9.7 — Toate 3 nume coloană greșite rezolvate
- [ ] 9.8 — Mesaje erori traduse RO

**Estimare:** 14-20h

#### PR 10 — PDF Export Complete (Faza 13.4.A continuat)

**Scop:** PDF print-friendly profesional + bug `tables.deleted_at` rezolvat.

- [ ] 10.1 — PDF export query fix
- [ ] 10.2 — Layout polish (couple_names, event details, guests, table plan)
- [ ] 10.3 — Multilingual support (RO + EN)
- [ ] 10.4 — Cache-Control: no-store

**Estimare:** 6-10h

#### PR 11 — Idempotency Framework Adopt Universal (Faza 13.5.A)

**Scop:** scalabilitate + zero race vulnerabilities pe orice mutating endpoint.

- [ ] 11.1 — Refactor `withIdempotency` la pattern atomic `INSERT ON CONFLICT DO NOTHING RETURNING`
- [ ] 11.2 — Adopt în toate 20 endpoints mutating
- [ ] 11.3 — PG Cron cleanup TTL 24h
- [ ] 11.4 — Audit log pe race detection
- [ ] 11.5 — Tests concurrente (property-based, simulate race)
- [ ] 11.6 — Comentariu MISLEADING `idempotency.ts:46` rezolvat (rescris cu adevărul)

**Estimare:** 12-18h

#### PR 12 — RLS Role Hierarchy Complet (Faza 13.3.C)

**Scop:** Defense-in-depth + scalabilitate pentru future Supabase Auth integration.

- [ ] 12.1 — PostgreSQL function `is_wedding_role(_wedding_id, _min_role)`
- [ ] 12.2 — RLS policies actualizate pe 14 tabele operaționale
- [ ] 12.3 — UPDATE/DELETE folosesc `is_wedding_role(wedding_id, 'editor')`
- [ ] 12.4 — Tests integration cu mock JWT pentru fiecare role
- [ ] 12.5 — Roluri partner + planner activate pentru endpoints relevante

**Estimare:** 6-10h

#### PR 13 — Audit Log Infrastructure Consolidation (Faza 13.0.B)

**Scop:** observability + compliance.

- [ ] 13.1 — `wl_audit_step()`, `wl_audit_diff()`, `wl_audit_actor()` extensions
- [ ] 13.2 — Audit log apelat OBLIGATORIU pe toate mutațiile sensibile
- [ ] 13.3 — Reverse-lookup capability (debug endpoint în DEV)
- [ ] 13.4 — Tests audit log coverage

**Estimare:** 6-10h

#### PR 14 — WordPress/Voxel Bridge Tests (Risk B)

**Scop:** elimina cea mai fragilă suprafață a stack-ului.

- [ ] 14.1 — Test suite explicit pentru bootstrap failure modes (happy path, user nou, plan expirat, WP timeout, membership repair race)
- [ ] 14.2 — Webhook WP → Next.js pentru sync plan changes (sau polling)
- [ ] 14.3 — Audit log per bootstrap failure (cu reason code)
- [ ] 14.4 — Fallback graceful (cache TTL scurt) când WP e down

**Estimare:** 8-14h

#### PR 15 — Multi-user Concurrency Policy Explicit (Risk C)

**Scop:** elimina race conditions pe RSVP host + budget + guest list.

- [ ] 15.1 — OCC version pentru RSVP host manual override
- [ ] 15.2 — OCC version pentru budget items
- [ ] 15.3 — OCC version pentru wedding settings
- [ ] 15.4 — UI conflict resolution pentru toate (similar seating)
- [ ] 15.5 — Audit log diff per modificare cu actor identification
- [ ] 15.6 — UI: "modificat ultima dată de X la Y"

**Estimare:** 8-14h

#### PR 16 — C9 useEffect Cleanup + Polish (Faza 13.6.A)

**Scop:** edge case race fix + small polish.

- [ ] 16.1 — `useEffect` cleanup pe `[eventId]` clear `syncTimerRef`
- [ ] 16.2 — Mesaje engleze hardcoded → RO (export, RSVP error messages)
- [ ] 16.3 — Privacy banner UX final polish

**Estimare:** 2-4h

#### PR 17 — DPO Review Final + Privacy Approval

**Scop:** GDPR sign-off pre-launch.

- [ ] 17.1 — DPO review meeting + feedback documented
- [ ] 17.2 — Privacy policy ajustări per DPO recomandări
- [ ] 17.3 — DPA-uri verificate cu toate processors (Supabase, Vercel, PostHog, Sentry, Resend)
- [ ] 17.4 — Schrems II compliance documented (TIA dacă US instances)
- [ ] 17.5 — DPO sign-off oficial documented

**Estimare:** 4-8h

### Secvență recomandată (paralelizare)

**Ordine STRICT obligatorie:**

1. **PR 1 PRIMA** — fără infrastructure, restul fixurilor sunt construit pe nisip
2. **PR 2** — paralel cu PR 1 (independente la nivel de cod)
3. **PR 3** — DUPĂ PR 1 (depinde de schema-guard + types regenerate)
4. **PR 4** — paralel cu PR 3 (independent ca scope, ambele după PR 1)
5. **PR 5-7** — secvențial DUPĂ PR 3 (depind de RSVP minimal functional)
6. **PR 8-10** — paralel cu PR 5-7 (export/import independent de RSVP)
7. **PR 11-13** — paralel între ele DUPĂ PR 1
8. **PR 14-15** — paralel cu restul, DUPĂ PR 1
9. **PR 16** — final polish
10. **PR 17 ULTIMUL** — DPO review obligatoriu pre-launch

### Criteriu "DONE" pentru Faza 13

- [ ] Toate 9 launch blockers + 5 risks (A-E) confirmate REZOLVATE empirical
- [ ] Pattern systemic schema drift NU mai poate apărea (schema-guard + types + integration tests CI + DEV/PROD fingerprint)
- [ ] 7 violations GDPR rezolvate (verificate prin checklist legal + DPO sign-off)
- [ ] Toate 14 puncte din audit nou + 6 din audit original au verdict ✅ în re-test empirical
- [ ] CI pipeline forțează: TS strict + lint + unit + integration + roundtrip + E2E + schema fingerprint
- [ ] Documentation aliniată cu cod (no comments care mint)
- [ ] DPO sign-off oficial pe privacy + processors + DPA-uri
- [ ] Toate 17 PR-uri merged în develop

### Tabel sumar PR-uri

| PR | Titlu | Estimare | Faza originală | Status |
|----|-------|----------|----------------|--------|
| PR 1A | Database Types Contract Layer 1 | — | 13.0 | ✅ `#182` `8fe3861` |
| PR 1B.0 | Layer 1 enforcement CI parity | — | 13.0 | ✅ `#187` `988a5f5` |
| PR 1B | Integration tests DB reală Layer 2 | — | 13.0 | ⏳ pending |
| PR 1C | CI `db:types:check` + schema fingerprint | — | 13.0 | ⏳ pending |
| PR 1D | Runtime schema-guard | — | 13.0 | ⏳ pending |
| PR 1E | Enum Type Narrowing Layer | — | 13.0 | ⏳ pending |
| PR 1F | RPC + Json Hardening | — | 13.0 | ⏳ pending |
| PR 1 (total) | Schema Drift Safety Net (split 1A-1F) | 18-30h | 13.0 | 🟡 partial (2/7 sub-PR done) |
| PR 2 | Security/GDPR Emergency Stop | 20-32h | 13.2 + 13.3 + Risk D + E | ⏳ pending |
| PR 3 | RSVP Minimal Functional | 28-40h | 13.1 + 13.5.C | ⏳ pending |
| PR 4 | Account Deletion Atomic | 16-24h | 13.5.B | ⏳ pending |
| PR 5 | RSVP Pivot Multi-event | 12-18h | 13.1.A complete | ⏳ pending |
| PR 6 | RSVP History + Warning | 8-14h | 13.1.C | ⏳ pending |
| PR 7 | Email Confirmation | 6-10h | 13.1.D | ⏳ pending |
| PR 8 | Export JSON v2.0 + Roundtrip | 12-18h | 13.4.A + 13.4.C | ⏳ pending |
| PR 9 | Import JSON v2.0 | 14-20h | 13.4.B | ⏳ pending |
| PR 10 | PDF Export Complete | 6-10h | 13.4.A continuat | ⏳ pending |
| PR 11 | Idempotency Universal | 12-18h | 13.5.A | ⏳ pending |
| PR 12 | RLS Role Hierarchy | 6-10h | 13.3.C | ⏳ pending |
| PR 13 | Audit Log Infrastructure | 6-10h | 13.0.B | ⏳ pending |
| PR 14 | WP/Voxel Bridge Tests | 8-14h | Risk B | ⏳ pending |
| PR 15 | Multi-user Concurrency | 8-14h | Risk C | ⏳ pending |
| PR 16 | C9 + Polish | 2-4h | 13.6.A | ⏳ pending |
| PR 17 | DPO Review Final | 4-8h | 13.2 final | ⏳ pending |
| **TOTAL** | | **186-296h** | | **2/23 sub-PR done** |

---

## Future tasks

> Items captured ca residual debt din PR-uri precedente sau identificate empirical.
> **Regula 17 LOCKED (lesson L55):** fiecare item TREBUIE sa aiba trigger explicit
> + vizibilitate HANDOFF + trace CHANGELOG. Fara cele 4 ancore = drift garantat.

| ID | Task | Estimare | Trigger explicit | Trace |
|----|------|----------|------------------|-------|
| FT-01 | ROADMAP cleanup PR 1 entry restructure (placeholder L622-626 → 6 entries reale PR 1A-D + PR 1E + PR 1F + update tabel sumar L897-916) | 1-2h focused | Oricare alt PR atinge ROADMAP.md → bundle impreuna (saving 1 PR overhead) | CHANGELOG entry Pachet A |
| FT-02 | Cat 5 mojibake grep audit codebase complet | 30-60 min | PR 11 deschis (Polish) — parte naturala scope. Discovered: `lib/authorization.ts` + `app/api/guests/import/route.ts`. Defer registry §F. | CHANGELOG entry Pachet A |
| FT-03 | Branch hygiene — 58 orphaned local branches cleanup | 5-15 min | User observa `git branch` zgomotos sau pre-launch cleanup sweep | CHANGELOG entry Pachet A |
| FT-04 | DEAD CODE removal — `createAuthenticatedClient` `lib/supabase-server.ts:20` (cross-ref TD-30 HANDOFF) | 15-30 min | PR 11 deschis SAU PR mic dedicat daca review headroom curent. Empirical confirmed: 1 export, 0 imports. | CHANGELOG entry Pachet A |

### Cross-references

- **HANDOFF.md** Section 5 "Medium-term backlog" — vizibilitate per sesiune (FT-01..04 cross-ref)
- **HANDOFF.md** TD-30 entry tabel datorii tehnice — single source DEAD CODE definition
- **CHANGELOG.md** entry Pachet A — trace istoric creare FT-01..FT-04
- **HANDOFF.md** §"Reguli LOCKED (18)" R17 — regula structurala 4 ancore
- **HANDOFF.md** lesson L55 — Future/viitor formulations require triggers

### Regula future tasks

Orice item adaugat aici TREBUIE sa respecte R17 (cele 4 ancore minim):
1. **Locul canonic** (acest tabel ROADMAP.md §"Future tasks") — single source of truth
2. **Vizibilitate per sesiune** (HANDOFF.md secțiune "Medium-term backlog" cross-ref)
3. **Trigger explicit** ("cand deschidem PR X" / "cand user observa Y" / "data Z") — NU "eventual" / "post-launch" simple
4. **Trace istoric** (CHANGELOG entry care l-a creat — pentru audit trail)

Anti-pattern: "vom face mai tarziu" fara ancorare = drift garantat (lesson L55).
