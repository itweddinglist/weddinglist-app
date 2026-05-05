# Audit pre-launch WeddingList — Addendum 01: Cross-model validation

> **Status:** validare cross-model ChatGPT 5.5 Thinking efectuată 2026-05-04
> **Scor încredere ChatGPT (declarat de el): 86/100**
> **Scor încredere ChatGPT (după evaluare prin filtrul LOCKED): util cu eroare sistemică previzibilă**
> **Document principal:** `/docs/audit/2026-05-pre-launch.md`

---

## Cuprins

1. [Context și metodologie](#1-context-și-metodologie)
2. [Filtrul regulilor LOCKED — referință](#2-filtrul-regulilor-locked---referință)
3. [Evaluare onestă punct cu punct (12 observații + 5 risks + scoruri)](#3-evaluare-onestă-punct-cu-punct)
4. [Concluzii cross-model validation](#4-concluzii-cross-model-validation)
5. [5 riscuri adăugate ca findings noi (A-E)](#5-5-riscuri-adăugate-ca-findings-noi)
6. [Reformulare decizii LOCKED post-validation](#6-reformulare-decizii-locked-post-validation)
7. [Plan execuție granular: PR 1, 2, 3 + sequence](#7-plan-execuție-granular)
8. [Tooling clarification (§12 update)](#8-tooling-clarification)
9. [Estimare actualizată](#9-estimare-actualizată)

---

## 1. Context și metodologie

### De ce cross-model validation

Înainte de a investi 174-276h în Faza 13, decizia user a fost: validation cross-model pentru a depista:
- Bugs critice ratate de audit-ul Claude.ai
- Severity rating greșit
- Decizii arhitecturale suboptimale
- Plan ordering issues
- Edge cases nedocumentate

### Tooling folosit

- **Auditor primar:** Claude.ai (Opus 4.7) — audit empirical 2026-05-04 pe 14 puncte
- **Validator cross-model:** ChatGPT 5.5 Thinking (plan user: Plus)
- **Decision authority:** Claude.ai + Claude Code (conform §12 tooling LOCKED)

### Procesul de evaluare

Feedback-ul ChatGPT a fost evaluat **strict prin filtrul regulilor LOCKED ale user**. Nu prin "rationale generic" sau "industry best practices". Acolo unde feedback-ul ChatGPT contrazice principiile user, feedback-ul a fost respins, indiferent cât de "rațional" pare.

**Lessson primary:** ChatGPT optimizează implicit pentru "minimum viable launch" (industry standard). User optimizează pentru "premium long-term, scalabil, fără workaround". Filtrul LOCKED e mecanism de aliniere obligatoriu.

---

## 2. Filtrul regulilor LOCKED — referință

Toate evaluările ChatGPT au fost trecute prin acest filtru:

1. **Premium fără buguri pe termen lung**
2. **Scalabil**
3. **Problemele se rezolvă structural, NU se ocolesc/ignoră**
4. **Plase de siguranță suplimentare**
5. **Timp ne-important**
6. **NICIODATĂ `--no-verify`**
7. **Soluții premium**

Verdict per punct: **respectă filtrul** (accept) sau **violează filtrul** (resping). Fără zonă gri.

---

## 3. Evaluare onestă punct cu punct

### Observațiile critice ChatGPT (1-12)

#### Punct 1 — "NU launchable este corect"

ChatGPT confirmă verdictul de bază. Evidence ancorată în audit (RSVP broken, export broken, RLS public).

**Verdict: ✅ ACCEPT** (validare, nu modificare scope)

---

#### Punct 2 — "Schema drift cauza-rădăcină corect identificată"

ChatGPT confirmă pattern systemic. Listează aceleași exemple ca audit-ul meu (`seat_assignments.guest_id`, `tables.deleted_at`, `weddings.location_name`, etc.).

**Verdict: ✅ ACCEPT**

---

#### Punct 3 — "S1 RLS RSVP severity Critical corect"

ChatGPT confirmă severity. Recomandă verificare directă în Supabase DEV/PROD înainte de PR fix (defense-in-depth, evită presupunere).

**Verdict: ✅ ACCEPT**

---

#### Punct 4 — "PostHog blocker real, dar limbajul GDPR prea absolut"

Două sub-puncte:
- **(a)** "Tehnic corect" — confirmă găsirile mele
- **(b)** "Validare juridică prin avocat/DPO obligatorie pre-launch"

**Filtrare prin reguli:** sub-punctul (b) e **adăugare de plasă de siguranță suplimentară**, NU eliminare scope. Conformitate cu regula 4. DPO review confirmă/calibrează severity, NU diluează findings.

**Verdict: ✅ ACCEPT** (DPO review devine LOCKED Faza 13.2.B)

---

#### Punct 5 — "C1 trei surse adevăr e defect arhitectural real"

ChatGPT confirmă. Adaugă observația că dashboard, guest list, seating, export citesc surse diferite fără contract = defect arhitectural, nu doar bug.

**Verdict: ✅ ACCEPT**

---

#### Punct 6 — "Trigger DB pentru sync RSVP — folosit cu grijă"

ChatGPT propune decompoziție:
- Trigger simplu enum mapping (`accepted → attending`) → OK
- Operații complexe (creare invitații multi-event) → RPC tranzacțional

**Filtrare prin reguli:** "cu grijă" NU înseamnă "evită". Înseamnă "alege contextul corect". Echilibrul propus = arhitectură corectă (decompoziție pe complexitate, NU workaround pe sync).

**Verdict: ✅ ACCEPT** (NU e ocolire, e selecție tool corect per scenariu)

---

#### Punct 7 — "Pivot table rsvp_invitation_events — nu obligatoriu primul pas"

ChatGPT propune două opțiuni:
- **A:** păstrezi `event_id NOT NULL`, invitație per event (pragmatic)
- **B:** introduci pivot, link multi-event (premium)

ChatGPT zice: "dacă vrei produs premium, pivotul e mai bun, dar nu-l băga în același PR cu RLS, history, email și UI."

**Filtrare prin reguli:**
- "Premium" e cerință LOCKED → opțiunea B (pivot) **rămâne decizie arhitecturală**
- "Granularitate PR-uri" = bună inginerie → spargem implementarea în PR-uri (schema migration → application code → tests → backfill)

**Verdict: 🟡 ACCEPT GRANULARITATEA, RESPING DILUAREA**

- Pivot table rămâne LOCKED arhitectural (Faza 13.1.A)
- Implementarea spartă în PR-uri pentru reviewability + risk surface mai mic per merge
- NU "decide între A și B" — decizia e B (pivot), discuție închisă

---

#### Punct 8 — "C3 link forwarding takeover real, dar nu se rezolvă fără login/OTP"

ChatGPT propune:
- "Nu introduce login pentru invitați în MVP"
- "Soluția pragmatică: warning + history + email/WhatsApp confirmation opțional + audit log + setare `rsvp_modifiable`"

**Filtrare prin reguli — atenție specială:**

Întrebarea reală: login pentru invitați e "premium" sau "barieră artificială"?

Pentru context-ul nuntă:
- Bunica nu va face cont să confirme prezența
- Login = anti-UX absolut, NU "premium"
- "Premium" pentru RSVP = experiență smooth + securitate prin layered defense

ChatGPT NU propune să **ignorăm** problema. Propune **rezolvarea structurală prin layered defense** (history + warning + email + audit + token rotation + rate limit). Asta E premium pentru context.

**Verdict: ✅ ACCEPT** (layered defense = soluție structurală + scalabilă)

---

#### Punct 9 — "Export/import blocker, dar Art. 20 trebuie nuanțat"

ChatGPT propune trei sub-puncte:
- **(a)** "Export JSON funcțional pre-launch"
- **(b)** "Account deletion funcțional pre-launch"
- **(c)** "Importul complet poate fi amânat dacă ascundem din UI"

**Filtrare prin reguli — atenție mare:**

- (a) = **rezolvare structurală.** ✅ ACCEPT
- (b) = **rezolvare structurală.** ✅ ACCEPT
- (c) = **OCOLIRE.** ❌ RESPING

Punctul (c) violează DIRECT regula 3 ("problemele se rezolvă structural, NU se ocolesc"). Importul există în code, e broken empirical, GDPR Art. 20 cere data portability bidirecțională. "Ascundem din UI" = pattern workaround clasic.

**Verdict: 🟡 ACCEPT (a) + (b), RESPING (c)**

- Export pre-launch: rezolvat în Faza 13.4.A
- Account deletion pre-launch: rezolvat în Faza 13.5.B
- **Import roundtrip: rezolvat în Faza 13.4.B (NU "ascundem din UI")**

---

#### Punct 10 — "Account deletion broken Critical"

ChatGPT confirmă. Recomandă test end-to-end pe DEV înainte de PR fix.

**Verdict: ✅ ACCEPT**

---

#### Punct 11 — "Plan toate operațiile multi-step → RPC e prea absolut"

ChatGPT propune:
- RPC obligatoriu pentru: import, delete account, RSVP invite multi-event, seating sync (atomicitate reală necesară)
- App-layer + idempotency pentru: mutații simple (CRUD)

**Filtrare prin reguli:**

"Atomicitate by default" în CLAUDE.md §10.4 e principiu corect, dar over-application (RPC pe orice CRUD) violează scalabilitatea long-term:
- Mai greu de testat
- Mai greu de debug
- Business logic îngropat în Postgres
- Refactor mai costisitor

**Întrebarea reală:** "premium long-term scalabil" cere RPC pentru INSERT simplu pe guest? **Nu.** Cere RPC unde **atomicitate e necesară structural** (multi-step destructive operations). Pentru CRUD simplu → app-layer cu idempotency e mai testabil, mai simplu, mai scalabil.

**Verdict: ✅ ACCEPT** (decompoziție corectă, NU diluare — îmbunătățește decizia LOCKED §10.4)

→ §10.4 reformulat la secțiunea 6 din acest addendum.

---

#### Punct 12 — "Faza 0 prea mare pentru un singur PR"

ChatGPT propune granularitate (PR 1: types + 3 teste, PR 2: integration harness, PR 3: RLS emergency).

**Filtrare prin reguli:**

GRANULARITATE ≠ DILUARE. Spargere pe PR-uri = bună inginerie:
- Review mai eficient (PR mic = focus pe schimbare specifică)
- Rollback mai ușor dacă apare bug
- CI mai rapid per PR
- Risk surface mai mic per merge
- Toate componentele Fazei 0 RĂMÂN, doar livrate granular

**Verdict: ✅ ACCEPT INTEGRAL**

---

### Riscuri ratate (A-E)

#### Risc A — Production drift DEV vs PROD

**Severity:** Critical
**De ce ratat de audit:** Eu am acoperit drift cod-vs-DB, NU DEV-vs-PROD. Migrations aplicate diferit pe environments = bug class diferit, posibil ascuns până la deploy.

**Verdict: ✅ ACCEPT** (gap real, plasă de siguranță suplimentară)

→ Devine Risk A din secțiunea 5.

---

#### Risc B — WordPress/Voxel bridge failure modes

**Severity:** High
**De ce ratat:** Audit-ul s-a concentrat pe Next/Supabase. WordPress bootstrap e poate cel mai fragil punct (Voxel down, plan expirat, cookies stripped, membership repair incomplet). Date orfane reale posibile.

**Verdict: ✅ ACCEPT**

→ Devine Risk B din secțiunea 5.

---

#### Risc C — Multi-user concurrency policy explicit

**Severity:** High
**De ce ratat parțial:** Eu am acoperit seating (OCC) + idempotency framework. NU am acoperit policy explicit pentru RSVP host dashboard + budget edit + manual override.

**Verdict: ✅ ACCEPT**

→ Devine Risk C din secțiunea 5.

---

#### Risc D — Rate limiting public RSVP

**Severity:** High
**De ce critic:** După ce închidem anon Supabase (S1 fix), Next.js API devine front door pentru toate request-urile. Bruteforce/scrape/enumeration timing = real risk dacă nu există rate limiting per public_link_id + IP.

**Verdict: ✅ ACCEPT** (gap critic)

→ Devine Risk D din secțiunea 5.

---

#### Risc E — Token leakage Vercel logs / Sentry breadcrumbs

**Severity:** High
**De ce ratat:** Eu am acoperit PostHog leak surface. NU am verificat Vercel logs / Sentry breadcrumbs / Browser referrers către assets externi sau third-party.

**Verdict: ✅ ACCEPT**

→ Devine Risk E din secțiunea 5.

---

### Top 10 corecții (lista ChatGPT)

ChatGPT listează 10 corecții care reformulează priorizat Faza 13 din audit-ul meu. Lista e **echivalentă cu scope-ul Fazei 13**, doar reordonată cu emphasis pe "production safety net first".

**Verdict: ✅ ACCEPT INTEGRAL** (NU e scope nou, e priorizare bună aliniată cu logica "infrastructure precondiție pentru orice fix")

→ Integrată în plan execuție granular (secțiunea 7).

---

### Top 5 NU merită rezolvate acum (lista ChatGPT)

**TOATE 5 RESPINSE.** Acesta e **single biggest divergence** între audit-ul Claude.ai și recomandarea ChatGPT.

**Re-evaluare per punct:**

1. **Import JSON full roundtrip → ChatGPT propune amânare**
   - **VIOLEAZĂ regula 3** ("problemele se rezolvă structural, NU se ocolesc")
   - GDPR Art. 20 cere data portability bidirecțională
   - **Resping. Rămâne în Faza 13.4.B**

2. **PDF export complete → ChatGPT propune "nice-to-have"**
   - Funcție promisă în UI (`/export` page există)
   - Promise broken = produs incomplet
   - **Resping. Rămâne în Faza 13.4.A**

3. **Email confirmation per submit → ChatGPT propune amânare "dacă Resend nu e stabil"**
   - Defense împotriva link forwarding takeover (C3)
   - Layer de securitate, NU accessory
   - "Dependent de Resend" e excuse: RESEND_API_KEY se configurează
   - **Resping. Rămâne în Faza 13.1.D**

4. **RLS role hierarchy 14 tabele → ChatGPT propune "NU exploitable acum"**
   - Adevărat **acum**, dar regula 2 cere "scalabil"
   - Mâine introducem Supabase Auth sau MCP cu JWT → exploit instant
   - Defense-in-depth = **regula 4** ("plase de siguranță suplimentare")
   - **Resping. Rămâne în Faza 13.3.C**

5. **Idempotency 20 endpoints → ChatGPT propune "fă-l pe critical, restul după"**
   - Lasă 16+ endpoints vulnerabile la race în producție
   - Race conditions = bugs reale (dovedit empirical pe seating fără OCC anterior)
   - Regula 1 ("premium fără buguri pe termen lung")
   - **Resping. Rămâne în Faza 13.5.A**

**Verdict: 🔴 RESPING TOATE 5**

**Rationale comun:** Lista "Top 5 NU merită" e exact pattern-ul "minimum viable launch" pe care user îl interzice explicit. ChatGPT optimizează pentru launch fastest. User optimizează pentru produs premium long-term. Filtrul LOCKED REJECTĂ.

---

### Ordinea PR 1-2-3 (lista ChatGPT)

ChatGPT propune execuție:
- **PR 1:** Schema Drift Safety Net (types + 3 integration tests)
- **PR 2:** Security/GDPR Emergency Stop (RLS + PostHog consent + headers)
- **PR 3:** RSVP Minimal Functional Reconstruction (end-to-end working)

**Filtrare prin reguli:**

Asta e **plan de execuție**, NU diluare scope. Toate componentele rămân, doar ordonate cu emphasis pe:
1. Infrastructure first (precondiție pentru orice fix)
2. Stop bleeding (security + GDPR pre-launch)
3. Unblock core feature (RSVP end-to-end)

**Subtilitate critică:** "RSVP Minimal Functional" în PR 3 NU înseamnă "RSVP cu bugs ramase". Înseamnă **end-to-end working scope cu calitate completă pentru acel scope**:
- Host generează invitație (event_id correct, NU per multi-event)
- Guest răspunde
- Seating vede status correct (sync via trigger)
- Manual override funcționează (shadow invitation)

Pivot table multi-event + history tracking + email + warning UI continuă în PR-uri ulterioare (Faza 13.1 sub-PRs), DAR scope-ul rămâne în Faza 13.

**Verdict: ✅ ACCEPT cu precizare**

→ Integrată în plan execuție granular (secțiunea 7).

---

### Scoruri finale ChatGPT

ChatGPT a dat:
- **General:** 86/100
- **Technical findings:** 92/100
- **Severity ratings:** 82/100
- **GDPR/legal framing:** 72/100
- **Action plan realism:** 78/100
- **Usefulness pentru implementare:** 90/100

**Filtrare:** scorurile sunt **calibrare onestă**. Tehnic e foarte solid. GDPR/legal a fost contestat (justificat: eu nu sunt avocat, audit-ul meu e tehnic). Action plan realism contestat pe granularitate (justificat).

**Verdict: ✅ ACCEPT scorul** (recunoaștem unde audit-ul are limitări juridice + granularitate).

---

## 4. Concluzii cross-model validation

### ChatGPT a fost util cu o eroare sistemică previzibilă

**Util pe:**
- 5 riscuri ratate (A-E) — gap-uri reale ale audit-ului
- Granularitate PR-uri — bună inginerie de execuție
- DPO review — plasă de siguranță suplimentară juridică
- Decompoziție RPC vs app-layer — îmbunătățire LOCKED §10.4
- Validation onestă pe puncte tehnice (NU a halucinat findings inexistente)

### Eroare sistemică

ChatGPT optimizează **default** pentru "minimum viable launch" (industry standard pattern). User optimizează pentru "premium long-term, scalabil, fără workaround". ChatGPT NU știe regulile LOCKED — Claude.ai (și user) trebuie să filtreze.

**Lista "Top 5 NU merită"** = manifestare directă a acestei erori sistemice. Toate 5 violau regulile LOCKED. Respinse.

### Lessson metodologic LOCKED

Pentru orice cross-model validation viitoare:

1. ChatGPT/Codex propun, **nu decid**
2. Feedback se trece OBLIGATORIU prin filtrul LOCKED
3. Resping fără ezitare orice propunere care diluează scope/calitate
4. Accept cu motivație ce îmbunătățește (granularitate, plase de siguranță, gap-uri ratate)
5. Documentez în addendum decizia per punct cu motivație ancorată în regulile LOCKED

---

## 5. 5 riscuri adăugate ca findings noi

### Risk A — Production drift DEV vs PROD

**Severity:** 🔴 Critical (Launch precondiție)
**Status:** Necesită verificare nouă

**Detaliu:**

Audit-ul original a confirmat schema drift cod-vs-DB pentru 9 bugs. NU a verificat schema drift DEV-vs-PROD environment. Migrations pot fi aplicate într-un environment și nu în altul, sau în ordine diferită, producând:
- Coloane prezente în DEV, lipsă în PROD (sau invers)
- Constraints diferite (NOT NULL, UNIQUE, FK)
- Indexes diferite (impact performance)
- RLS policies diferite (impact security)
- Functions/triggers diferite (impact behavior)

**Reproducible scenario:**
- Developer testează feature local pe DEV
- Migration aplicată DEV
- Deploy la PROD
- Migration NU aplicată automat (sau aplicată cu eroare silențioasă)
- Production runtime: NULL value violation, column does not exist

**Fix structural (Faza 13.0.A.6 — adăugat la planul existent):**

Script `schema_fingerprint.sql` care produce hash determinist pentru:
- Tabele + coloane + tipuri
- Constraints (NOT NULL, UNIQUE, CHECK, FK)
- Indexes
- RLS policies
- Grants
- Functions + triggers

CI pipeline pre-deploy:
1. Rulează `schema_fingerprint` pe PROD (read-only)
2. Rulează `schema_fingerprint` pe DEV (după aplicare migrations noi)
3. Comparare hash + diff detaliat dacă diferă
4. **Fail deploy dacă diferă nejustificat**

Plus monitoring runtime pe PROD: `schema-guard.ts` la app startup verifică schema reală vs schema declarată în code (deja LOCKED §10.1).

---

### Risk B — WordPress/Voxel bridge failure modes

**Severity:** 🔴 HIGH
**Status:** Necesită verificare nouă

**Detaliu:**

Audit-ul original s-a concentrat pe Next.js + Supabase. WordPress bootstrap e poate cel mai fragil punct al stack-ului:

**Failure modes posibile:**
1. **Voxel user șters din WordPress** — bootstrap returnează 404, dar `app_users` row + `weddings` rows rămân orfane în Supabase
2. **Plan expirat** — bootstrap returnează plan info, dar app-layer NU verifică expirare → user poate continua să modifice date deși NU are plan activ
3. **WP cookies stripped** (browser settings, third-party cookie block, mobile Safari ITP) — bootstrap eșuează silent, user vede "logout aleator"
4. **WP downtime** — bootstrap returnează 500, app-layer NU are fallback → useri blocați total chiar dacă Supabase e up
5. **Membership repair race** — două sesiuni concurente apelează `repairMembership` → INSERT duplicat sau race pe `wedding_members`
6. **Plan downgrade** — user merge de la Premium la Free, dar `app_users.plan_tier` NU se actualizează automat → user păstrează acces premium nelegitim

**Reproducible scenario (cel mai probabil):**
- User upgrade plan în WordPress
- Webhook WP→Next NU e implementat sau e broken
- Plan în Supabase rămâne stale
- User reclamă "am plătit dar nu am acces"

**Fix structural (Faza 13.0.C — adăugat):**

1. Test suite explicit pentru bootstrap failure modes:
   - Happy path (user nou)
   - User existent în WP, NU în Supabase
   - User existent în Supabase, NU în WP (Voxel deleted)
   - Plan expirat
   - WP timeout
   - Membership repair race (concurrent)

2. Webhook WP → Next.js pentru sync plan changes (SAU polling periodic)

3. Audit log per bootstrap failure (cu reason code)

4. Fallback graceful (cache TTL scurt) când WP e down — utilizatorul poate continua read-only, NU write

---

### Risk C — Multi-user concurrency policy explicit

**Severity:** 🔴 HIGH
**Status:** Necesită verificare nouă

**Detaliu:**

Audit-ul original a confirmat OCC pe seating + idempotency framework. NU a definit explicit policy concurrency pentru:

1. **RSVP host dashboard** — doi hosts (cuplul) editează manual override simultan pe același guest → last-write-wins silent
2. **Budget edit** — doi hosts modifică același budget item → overwrite silent
3. **Guest list edit** — doi hosts modifică același guest (nume, telefon) → overwrite silent
4. **Manual RSVP override** — un host setează "accepted" + alt host setează "declined" în ferestre de secunde → ultima câștigă

**Lipsesc:**
- Policy explicit per entitate (latest-wins / version-check / first-wins)
- UI feedback la conflict (warning "altcineva a modificat acest record")
- Audit log diff per modificare (cu actor identification)

**Fix structural (Faza 13.0.D — adăugat):**

Decizie LOCKED concurrency policy per entitate:
- **Seating:** OCC version (deja implementat)
- **RSVP host manual override:** OCC version + warning UI
- **Guest edits (nume, telefon, etc.):** latest-wins + audit log diff vizibil în UI ("modificat ultima dată de X la Y")
- **Budget items:** OCC version + UI conflict resolution (cum la seating)
- **Wedding settings:** OCC version (rare changes, dar critice)

Plus audit log obligatoriu pe toate manual overrides (regula §10.5 deja LOCKED).

---

### Risk D — Rate limiting public RSVP

**Severity:** 🔴 HIGH (Launch precondiție security)
**Status:** Necesită verificare nouă

**Detaliu:**

Audit-ul original a recomandat rate limit fail-CLOSED (Faza 13.3.D). NU a tratat ca prim-blocker rate limit specifically pe `/api/rsvp/[public_link_id]` — ceea ce e CRITIC după ce închidem anon Supabase (S1 fix).

**Vectori de atac post-S1-fix:**
1. **Bruteforce public_link_id:** atacator încearcă URL-uri random `/api/rsvp/abc123` să găsească invitații valide
2. **Scrape automate:** bot scrape multiple invitații
3. **Enumeration timing:** răspuns time diferit pentru invitație existentă vs inexistentă → leak existence
4. **Spam submit:** bot submit-uie RSVP cu date fake, distorsionând statistici host

**Fix structural (Faza 13.3.D.4 — adăugat ca sub-task explicit):**

Rate limit per IP + per public_link_id:
- GET /api/rsvp/[public_link_id]: max 30 requests/min per IP, 10/min per public_link_id
- POST /api/rsvp/[public_link_id]: max 5/min per IP, 3/min per public_link_id

Response identical pentru:
- Public_link_id inexistent
- Public_link_id existent dar `is_active=false`
- Public_link_id existent dar `expires_at < now`
- Rate limit hit

**Toate returnează:** generic 404 cu body identic + delay constant (constant time response, NU short-circuit).

Logging fără PII — log doar `route, ip_hash, public_link_id_hash, timestamp`.

Audit log pe rate limit hits cu pattern detection (alert dacă același IP atinge limita pe multiple link-uri = scan attempt).

---

### Risk E — Token leakage Vercel logs / Sentry breadcrumbs

**Severity:** 🔴 HIGH
**Status:** Necesită verificare nouă

**Detaliu:**

Audit-ul original a acoperit:
- PostHog leak surface (`$pageview` cu URL conținând public_link_id)
- Referrer-Policy missing pentru rute publice

NU a verificat:
1. **Vercel logs:** request URL inclus by default în Vercel Analytics + Function Logs. Public_link_id apare în log-uri.
2. **Sentry breadcrumbs:** dacă apare error în path public RSVP, Sentry capturează URL în breadcrumb → token în error reports
3. **Browser referrer header:** când guest deschide link RSVP și click pe asset extern (CDN, image, font), browser trimite Referer header către third-party
4. **Server-side log statements:** `console.log(req.url)` sau `logInternal` pot capta public_link_id în log-uri Vercel/CloudWatch
5. **Error stack traces:** path-ul cu public_link_id apare în stack traces salvate

**Fix structural (Faza 13.3.A.6 — adăugat):**

1. **Redactare token în logs:**
   - Custom logger middleware care înlocuiește `public_link_id` din URL cu `[REDACTED]` în orice log statement
   - Sentry beforeSend hook: redactare URL-uri cu pattern `/rsvp/[16-char]/...` → `/rsvp/[REDACTED]/...`
   - Vercel: configurare cu environment variable `LOG_REDACT_PATTERNS=rsvp/[a-z0-9_-]{16}`

2. **Browser referrer:**
   - `Referrer-Policy: no-referrer` deja LOCKED pe rute publice (§10.7)
   - Audit pentru toate `<a>`, `<img>`, `<script>`, `<link>` pe pagina RSVP — verificare să NU existe cross-origin requests cu Referer leak

3. **No analytics pe RSVP public:**
   - PostHog dezactivat (deja LOCKED §10.7)
   - Plus Sentry minimal pe public path (doar error tracking, NU breadcrumbs cu URL-uri)
   - Vercel Analytics dezactivat pe `/rsvp/*` route

4. **Defense în profunzime:**
   - Token rotation periodică (TTL invitation 30 zile, regenerable de host)
   - Audit log pe orice GET / POST pe public link — pattern detection pentru abuse

---

## 6. Reformulare decizii LOCKED post-validation

### §10.4 reformulat — Atomicity

**Forma anterioară (CLAUDE.md):**
> "Toate operațiile multi-step → PostgreSQL stored procedures cu BEGIN/COMMIT. NU HTTP-uri independente prin Supabase JS."

**Forma reformulată (post-cross-model validation):**

> **Atomicity granulară per complexitate operație:**
>
> **RPC tranzacțional OBLIGATORIU pentru:**
> - Account deletion (multi-step destructive cu FK constraints)
> - Wedding import (10+ entități, dependencies)
> - RSVP invite creation multi-event (pivot table inserts)
> - Seating sync (multi-table state reconciliation cu OCC)
> - Schema migrations cu data backfill
>
> **App-layer cu idempotency framework pentru:**
> - CRUD simplu (INSERT/UPDATE/DELETE single row)
> - Mutații cu maximum 2 INSERTs (parent + child)
> - Operații care NU au rollback complex
>
> **Rationale:** RPC pe orice CRUD = over-engineering, complică testabilitate și debug. RPC pentru atomicitate reală = arhitectură corectă. Decompoziție pe complexitate, NU "by default" pe toate.

### §10.6 — Adăugare DPO review obligatoriu

**Adăugare nouă:**

> **§10.6.A — DPO review pre-launch obligatoriu**
>
> Privacy policy rewrite + GDPR rights endpoints implementation TREBUIE revizuite de un DPO real (Data Protection Officer) sau avocat specializat GDPR EU înainte de launch public. Audit-ul tehnic confirmă issues, DAR validation juridică finală e OBLIGATORIE pentru:
> - Calibrare severity sancțiuni RO/EU
> - Verificare formulare drepturi user (Art. 15-22)
> - Verificare lawful basis per processor declarat
> - Aprobare Schrems II compliance pentru transferuri non-EU (PostHog)
> - Aprobare DPA-uri semnate cu toate processors

### §10.7 — Adăugare Risk D, E mitigations

**Adăugări la security headers:**

> **§10.7.A — Token redaction în logs**
>
> Redactare obligatorie `public_link_id` din toate destinations de logging:
> - Custom logger middleware (server-side `console.log`, `logInternal`)
> - Sentry `beforeSend` hook
> - Vercel log filtering (env var `LOG_REDACT_PATTERNS`)
>
> **§10.7.B — Public RSVP rate limiting**
>
> Rate limiting per IP + per public_link_id obligatoriu pe toate routes RSVP publice:
> - GET: 30/min IP, 10/min public_link_id
> - POST: 5/min IP, 3/min public_link_id
> - Constant-time response pentru toate cazurile (existent/inexistent/expired/rate-limited)
> - Generic 404 body identic
> - Audit log pattern detection pentru scan attempts

### §13 — Adăugare DEV vs PROD schema fingerprint

**Secțiune nouă:**

> **§13 — Production drift prevention DEV vs PROD**
>
> Schema fingerprint script generat și verificat în CI pre-deploy:
> - Tabele + coloane + tipuri
> - Constraints (NOT NULL, UNIQUE, CHECK, FK)
> - Indexes
> - RLS policies + grants
> - Functions + triggers
>
> CI fail dacă fingerprint DEV ≠ PROD nejustificat. Decision LOCKED: NU permitem deploy cu schema drift între environments.

---

## 7. Plan execuție granular

### PR 1 — Schema Drift Safety Net

**Scop:** infrastructura care previne următoarele 50 de bugs din clasa schema drift.

**Scope (toate componente, NU diluat):**

1. **Husky pre-commit hook**: `npx supabase gen types typescript --local > types/database.ts`
2. **TypeScript Database type generated** + commit în repo
3. **Supabase JS client typed:** refactor `createClient<Database>(...)`
4. **Schema fingerprint script** (Risk A): `scripts/schema_fingerprint.sql` + CI integration
5. **Schema-guard runtime** (`lib/db/schema-guard.ts`): app refuze să pornească dacă DB schema diferă
6. **3 integration tests pe endpoints broken empirical:**
   - `/api/dashboard/stats` (C4)
   - `/api/export/json` (C5/C6)
   - `/api/rsvp/invitations` POST (C7)
7. **Vitest profile separat:** `vitest.integration.config.ts` contra Supabase DEV
8. **CI job nou:** integration tests obligatorii înainte de merge la `develop`
9. **Migration testing CI:** up + down + up automatic

**Estimare:** 18-30h (din Faza 13.0 originală)
**Acceptance criteria:**
- TS verde pe toate 9 bugs schema drift identificate (compile-time detection)
- Schema fingerprint identical DEV vs PROD în CI
- 3 integration tests rulează verde pe DEV (după fix-uri în PR 3)

### PR 2 — Security/GDPR Emergency Stop

**Scop:** stop bleeding pe security + legal exposure înainte de orice user real.

**Scope (toate componente):**

1. **RLS RSVP fix (S1):**
   - Anon zero acces direct Supabase
   - Toate operațiile RSVP prin Next.js API + service_role server-side
   - Migration `20260505000001_rls_rsvp_close_anon.sql`
2. **PostHog consent gate (S2):**
   - Banner restructurat (3 opțiuni)
   - PostHog init gated pe consent
   - Reactive `posthog.opt_out_capturing()` la decline
3. **PostHog dezactivat pe rute publice** (`/rsvp/*`)
4. **Security headers complete (S3):**
   - CSP report-only mode
   - HSTS, X-Frame-Options, Referrer-Policy `no-referrer` pe public, X-Content-Type-Options, COOP/CORP
5. **Cache-Control: no-store** pe API PII (S6)
6. **CSRF gaps fix (S5):** account DELETE, shadow-session POST, import/json POST
7. **Token redaction în logs** (Risk E): logger middleware + Sentry beforeSend + Vercel log filter
8. **Rate limiting public RSVP** (Risk D): per IP + per public_link_id
9. **Privacy policy completare placeholders + PostHog declarat ca processor**
10. **DPO review prep:** package documentation pentru DPO review (Faza 13.2.B)

**Estimare:** 20-32h (combină Faza 13.2 + 13.3 + Risk D + Risk E)
**Acceptance criteria:**
- Anon NU poate face SELECT/INSERT/UPDATE pe rsvp_invitations sau rsvp_responses (verificat empirical)
- PostHog NU se inițializează fără consent (verificat în browser dev tools)
- Toate headers OWASP setate (verificat cu securityheaders.com)
- Rate limiting funcțional cu constant-time response

### PR 3 — RSVP Minimal Functional Reconstruction

**Scop:** RSVP devine funcțional end-to-end cu calitate completă pentru scope-ul minim.

**IMPORTANT:** "minimal functional" = end-to-end working scope, NU "minimal cu bugs ramase". Pivot table multi-event + history tracking + email + warning UI continuă în PR-uri ulterioare DAR rămân în Faza 13.

**Scope PR 3:**

1. **Schema migration `20260506000001_rsvp_phase1.sql`:**
   - `rsvp_invitations.event_id` rămâne NOT NULL (decizie pragmatic per audit cross-model)
   - Sync trigger AFTER INSERT/UPDATE pe `rsvp_responses` → `guest_events.attendance_status` (mapping `accepted → attending`)
   - Backfill rows existente
2. **POST /api/rsvp/invitations rewrite:** include `event_id` în payload din body
3. **POST /api/rsvp/manual rewrite:** shadow invitation pattern (NU `invitation_id: null`)
4. **POST /api/rsvp/[public_link_id]:** partial response cu warning (NU silent drop C2)
5. **Dashboard stats fix (C4):** `seat_assignments.guest_id` → `guest_event_id` + `Promise.allSettled`
6. **E2E test Playwright:** host generează → guest răspunde → seating vede status corect

**Estimare:** 28-40h (din Faza 13.1 + 13.5.C, scope minim)
**Acceptance criteria:**
- Host poate genera invitație fără 500
- Guest poate răspunde fără data loss
- Seating + Guest list + RSVP dashboard arată ACEEAȘI valoare pentru același guest
- Manual override funcționează
- Dashboard se încarcă fără 500

### PR 4+ — Restul Fazei 13

După PR 1-2-3 launch precondiții acoperite. Restul livrat în PR-uri granulare:

- **PR 4:** Account deletion atomic (Faza 13.5.B) — Critical, dar poate veni după unblock RSVP
- **PR 5:** Pivot table `rsvp_invitation_events` migration (Faza 13.1.A — link multi-event)
- **PR 6:** History tracking RSVP + warning UI (Faza 13.1.C)
- **PR 7:** Email confirmation RSVP (Faza 13.1.D)
- **PR 8:** Export JSON v2.0 + tests roundtrip (Faza 13.4.A + 13.4.C)
- **PR 9:** Import JSON v2.0 (Faza 13.4.B)
- **PR 10:** PDF export complete (Faza 13.4.A)
- **PR 11:** Idempotency framework adopt universal (Faza 13.5.A)
- **PR 12:** RLS role hierarchy 14 tabele (Faza 13.3.C)
- **PR 13:** Audit log infrastructure consolidation (Faza 13.0.B)
- **PR 14:** WordPress/Voxel bridge tests (Risk B)
- **PR 15:** Multi-user concurrency policy explicit (Risk C)
- **PR 16:** C9 useEffect cleanup (Faza 13.6.A)
- **PR 17:** DPO review final + privacy policy approval

**Granularitate Faza 13.x = 17 PR-uri totale estimate.** Fiecare review-able în <30 minute, rollback-able independent.

---

## 8. Tooling clarification

### §12 update — Reformulare decisivă

**Adăugare la CLAUDE.md §12 (post-cross-model validation):**

> **Sursa de adevăr arhitectural = Claude.ai + Claude Code.**
>
> ChatGPT + Codex = **suport și verificare**, NU surse de decizie.
>
> Feedback ChatGPT/Codex se evaluează critic prin **filtrul regulilor user LOCKED:**
> - Premium fără buguri pe termen lung
> - Scalabil
> - Probleme rezolvate structural, NU se ocolesc
> - Plase de siguranță suplimentare
> - Timp ne-important
>
> **Feedback care contrazice aceste reguli se RESPINGE**, indiferent cât de "rațional" pare. User este final arbiter pe scope și standard quality.
>
> **Lessson sistemică LOCKED:** ChatGPT optimizează implicit pentru "minimum viable launch" (industry standard). User optimizează pentru "premium long-term". Filtrul LOCKED e mecanism de aliniere obligatoriu.

### Codex usage criteria — adăugare nouă

> **Codex = backup executant pentru taskuri mici, FOLOSIT DOAR când aduce valoare reală peste Claude Code.**
>
> **Folosim Codex când:**
> - Claude Code rate-limited + task urgent + izolat
> - Refactor 1-3 fișiere, scope clar, fără context cross-cutting
> - Lint/format/rename simplu
> - **Verificare paralelă pe un patch mic** (Claude Code livrează → Codex verifică independent → comparăm output)
>
> **NU folosim Codex când:**
> - Task atinge multiple module
> - Migrations, RPCs complexe, RLS policies
> - Schema-guard, integration test harness, decizii arhitecturale
> - Necesită citire CLAUDE.md + HANDOFF.md + ROADMAP.md pentru context complet
>
> **Default executant = Claude Code.** Codex = excepție motivată.

---

## 9. Estimare actualizată

### Estimare originală (audit-ul principal)

**174-276h** focused work, total 6 faze.

### Estimare post-cross-model validation

**174-276h NESCHIMBAT.**

**Justificare:**
- Toate scope-uri rămân (RESPING "Top 5 NU merită rezolvate acum")
- 5 risks adăugate (A-E) = +12-20h estimat
- Granularitate PR-uri = NU reduce timp total, doar îl distribuie
- DPO review = +4-8h (incluse în Faza 13.2 deja)

**Total nou:** 186-296h (174-276h original + 12-20h risks noi).

**Marja:** rămâne la ~225h media (vs 215h original — diferență neglijibilă).

### Scopul priorităților

| Prioritate | Componente | Estimare cumulativă |
|------------|-----------|---------------------|
| **PR 1-3 (precondiție launch)** | Schema drift safety net + Security/GDPR emergency stop + RSVP minimal functional | 66-102h |
| **PR 4-10 (core scope)** | Account delete + Pivot RSVP + History + Email + Export/Import + PDF | 80-130h |
| **PR 11-17 (defense-in-depth + plase siguranță)** | Idempotency universal + RLS roles + Audit log + WP bridge + Concurrency + Polish | 40-64h |
| **TOTAL Faza 13** | | **186-296h** |

**Niciun PR nu e "post-launch backlog". Toate sunt în Faza 13.**

---

## Sfârșit addendum 01.

**Status:** validation cross-model completă cu evaluare onestă prin filtrul LOCKED. **Niciun scope diluat.** Granularitate îmbunătățită. 5 risks adăugate. Decizii LOCKED reformulate per feedback valid. Decizii LOCKED RESPINSE per feedback care violau regulile user.

**Acțiune următoare:** PR 1 — Schema Drift Safety Net (Faza 13.0 granular).
