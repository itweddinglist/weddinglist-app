# Audit pre-launch WeddingList — Findings empirice (Mai 2026)

> **Status:** verificare empirică completă (14 puncte din audit nou)
> **Data:** 2026-05-04 (sesiune intensivă verificare)
> **Verdict:** **NU launchable**. 9 launch blockers confirmate empirical. RSVP feature complet nefuncțional. 7 violations GDPR cumulative.
> **Plan acțiune:** vezi `/docs/audit/2026-05-action-plan.md` (sau secțiunea 6 din acest document)

---

## Cuprins

1. [Executive summary](#1-executive-summary)
2. [Bilanț complet — 14 puncte verificate](#2-bilanț-complet---14-puncte-verificate)
3. [Pattern systemic: schema drift](#3-pattern-systemic-schema-drift)
4. [GDPR violations matrix](#4-gdpr-violations-matrix)
5. [Bonus findings nedocumentate de audit](#5-bonus-findings-nedocumentate-de-audit)
6. [Plan acțiune complet (6 faze)](#6-plan-acțiune-complet-6-faze)
7. [Decizii LOCKED noi (pentru CLAUDE.md)](#7-decizii-locked-noi)
8. [Plase de siguranță suplimentare](#8-plase-de-siguranță-suplimentare)
9. [Anexă: prompts de investigație folosite](#9-anexă-prompts-de-investigație-folosite)
10. [Anexă: fișiere și linii cheie referențiate](#10-anexă-fișiere-și-linii-cheie-referențiate)

---

## 1. Executive summary

### Verdict

**WeddingList NU este lansabil în starea actuală.** Audit-ul empiric a confirmat 9 launch blockers majore, dintre care unul (RSVP feature) face produsul **nefuncțional la nivel core**.

Bug-urile NU sunt izolate. Există un **pattern systemic** — schema database și application code sunt divergente pentru cel puțin 7 tabele/coloane cheie. Cauza rădăcină: lipsa unei pipeline de validare schema-vs-cod la nivel de CI/CD + tipurile Supabase nu sunt regenerate post-migration.

### 9 Launch Blockers confirmate empirical

| # | Issue | Categorie | Severity |
|---|-------|-----------|----------|
| S1 | RLS RSVP open la anon (orice user citește/scrie toate datele) | Security | 🔴 Critical |
| S2 | PostHog tracking fără consent + privacy policy false | GDPR | 🔴 Critical |
| C1 | RSVP nu sincronizează `guest_events` (3 surse adevăr concurente) | Logic | 🔴 Critical |
| C3 | RSVP modificabil fără identity check (link forwarding takeover) | Logic + GDPR Art. 5 | 🔴 Critical |
| C5 | Import JSON 0% functional (6 coloane fantomă, 8 NOT NULL violations) | Data + GDPR Art. 20 | 🔴 Critical |
| C6 | Export 0% functional (multi-format: JSON broken, PDF broken) | Data + GDPR Art. 20 | 🔴 Critical |
| C7 | `rsvp_invitations.event_id NOT NULL` — INSERT eșuează la fiecare apel | RSVP feature | 🔴 HIGH |
| C8 | Manual RSVP `invitation_id NULL` — UPSERT eșuează | RSVP feature | 🔴 HIGH |
| C11 | Account DELETE broken global (coloana `app_users.status` inexistentă) | GDPR Art. 17 | 🔴 Critical |

### Implicații cumulative

**RSVP feature (core produs):** Combinația C7 + C8 + C1 + C2 + C3 + S1 înseamnă că **modulul RSVP nu funcționează deloc** pentru un wedding nou:
- Nu se pot genera invitații (C7)
- Nu se poate face manual override (C8)
- Chiar dacă ar funcționa, răspunsurile nu se sync (C1)
- Drop silent date (C2)
- Modificabil fără identitate (C3)
- RLS open la anon (S1)

**GDPR (legal):** 7 articole violate cumulativ: Art. 5(1)(d), Art. 6, Art. 13, Art. 15, Art. 17, Art. 20, Art. 28.

**User experience:** Dashboard nu se încarcă (C4 — 500 la primul login). Export/PDF/backup imposibil. Account deletion blocked global. Multiple ecrane arată date diferite pentru același guest.

### High severity (3 confirmate)

| # | Issue | Severity |
|---|-------|----------|
| C2 | RSVP submit silent data loss (drop fără warning) | 🔴 HIGH |
| C4 | Dashboard `/api/dashboard/stats` 500 la fiecare login | 🔴 HIGH |
| S3 | Security headers absente (1/11 OWASP) — amplifier S1+S2 | 🔴 HIGH |

### Medium severity (5 confirmate)

| # | Issue | Severity |
|---|-------|----------|
| C10 | Idempotency framework race window + cleanup gap | 🟡 Medium |
| S4 | RLS role-blind (defense-in-depth gap, NU exploit acum) | 🟡 Medium (future HIGH) |
| Email | RSVP email channel broken (URL mismatch + schema gap) | 🟡 Medium |
| S5 | CSRF gaps pe 3 endpoints (account, shadow-session, import) | 🟡 Medium |
| S6 | Export endpoints fără `Cache-Control: no-store` | 🟡 Medium |

### Low severity (1 confirmat, 1 infirmat)

| # | Issue | Status |
|---|-------|--------|
| C9 | Autosave seating event_id race window | 🟢 LOW (edge case 1500ms) |
| C9 (literal claim) | "Autosave ignoră event_id" | ❌ INFIRMAT — event_id propagat corect |

### Pattern systemic descoperit

**6 din bug-urile blocking au aceeași cauză rădăcină:**

```
Schema migration → ALTER TABLE adds/removes coloana X
        ↓
Application code → folosește coloana Y (inexistentă) sau
                   omite coloana Z (NOT NULL)
        ↓
TypeScript verde (tipuri Supabase NU sunt regenerate)
        ↓
Tests verzi (rulează pe MOCK Supabase, NU DB real)
        ↓
npm run build verde
        ↓
Husky hooks trec
        ↓
PR merged
        ↓
Production deploy
        ↓
Runtime SQL error 42703 / 23502 / NOT NULL violation
        ↓
Endpoint returnează 500 sau silent failure
```

Bug-uri afectate de pattern: C4 (dashboard stats), C5 Export (`tables.deleted_at` fantomă), C5 Import (6 coloane fantomă), C6 (PDF same bug), C7 (rsvp_invitations event_id), C8 (manual RSVP invitation_id), C11 (`app_users.status` fantomă).

**Implicație critică:** Probabil mai există bugs din aceeași clasă în alte consumers pe care nu i-am verificat. Fix-ul **TREBUIE** să fie la nivel pipeline (Faza 0), NU bug-by-bug.

---

## 2. Bilanț complet — 14 puncte verificate

### S1 — RLS RSVP open la anon

**Severity:** 🔴 Critical (Launch blocker)
**Status:** ✅ CONFIRMAT empirical

**Evidență (sursă):**
- `supabase/migrations/20260328000001_rls_policies.sql`:487, 521, 529, 543

**Detaliu:**
- `rsvp_invitations` SELECT pentru anon: `USING (true)` — orice anon citește orice invitație
- `rsvp_responses` SELECT/INSERT/UPDATE pentru anon: `USING (true)` / `WITH CHECK (true)` — orice anon citește/scrie/modifică orice răspuns
- GRANTS pe anon: SELECT pe `rsvp_invitations`; SELECT, INSERT, UPDATE pe `rsvp_responses`

**Capabilities anon (cu `NEXT_PUBLIC_SUPABASE_ANON_KEY` care e bundled în client JS):**
| Operație | Status |
|----------|--------|
| `SELECT * FROM rsvp_invitations` | ✅ permis (any row, any wedding) |
| `SELECT * FROM rsvp_responses` | ✅ permis (any row, any wedding) |
| `INSERT INTO rsvp_responses` cu invitation_id valid | ✅ permis (FK e singurul guard) |
| `UPDATE rsvp_responses SET status = 'declined' WHERE id = X` | ✅ permis (any row) |

**Architectural intent declarat in comments (L491-496):**
> "The app filters by token_hash in the query. The token_hash is a cryptographically random string — unguessable without the invitation link. Validation that the rsvp_invitation_id is real happens via FK constraint."

Pattern numit "secret URL = capability token" — **VALID** pentru poll-uri publice anonime, **INVALID** când:
- Anon key permite query GLOBAL (nu doar pe invitation_id specific)
- Date conțin PII (nume guests, dietary notes, status RSVP)
- Compus cu alte vulnerabilități (PostHog leakage public_link_id — vezi S2+S3)

**Exploit scenario:**
```javascript
// Atacator extrage NEXT_PUBLIC_SUPABASE_ANON_KEY din client bundle
// (e public by design — bundled în orice asset JS)

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Exfiltrare totală invitations
const { data: invitations } = await supabase
  .from('rsvp_invitations')
  .select('*');
// → primește TOATE public_link_id, expires_at, opened_at pentru TOATE weddings

// Exfiltrare totală responses
const { data: responses } = await supabase
  .from('rsvp_responses')
  .select('*');
// → primește TOATE răspunsurile RSVP (nume guests via join, dietary, status)

// Falsificare răspuns
await supabase
  .from('rsvp_responses')
  .update({ status: 'declined' })
  .eq('id', '<UUID exfiltrat>');
// → modificare arbitrară pe orice row din DB
```

**Impact business:**
- **Data breach total** — toate invitațiile + răspunsurile tuturor cuplurilor accesibile
- **Sabotaj** — competitor / glumeț poate modifica RSVP-uri în masă
- **Reputational risk** — un singur articol "platforma X de nuntă lasă oricine să citească datele tuturor cuplurilor" = end of business

**Fix structural (vezi Faza 1.B):**
- Decizie LOCKED: RSVP off-anon Supabase access complet. RLS strict pentru anon (zero acces). Toate operațiile trec prin Next.js API routes cu `service_role` server-side.

---

### S2 — PostHog tracking fără consent + privacy false

**Severity:** 🔴 Critical (Launch blocker GDPR)
**Status:** ✅ CONFIRMAT empirical, AGRAVAT

**Evidență (surse):**
- `app/lib/posthog/provider.tsx`:8 (init necondiționat)
- `app/layout.js`:33 (mount root)
- `app/components/CookieConsent.jsx`:27 (banner UI-only)
- `public/privacy.html`:75-89 (declarație false)

**Detaliu:**

**PostHog flow real:**
```
app/layout.js:33  →  <PostHogProvider>  (mount necondiționat la root)
  ├─ <Suspense>
  │   └─ <PostHogPageView />  (capture pageview pe orice nav)
  ├─ <AppShell>{children}</AppShell>
  └─ <CookieConsent />  (banner sibling, NU gate)

app/lib/posthog/provider.tsx:8-15:
  useEffect(() => {  // ← rulează la primul mount, ÎNAINTE de banner
    posthog.init(NEXT_PUBLIC_POSTHOG_KEY, {
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,  // ← auto pe unload, fără consent
    })
  }, [])

app/lib/posthog/pageview.tsx:12-19:
  useEffect(() => {  // ← per pathname change
    posthog.capture('$pageview', { $current_url: url })
  })
```

**Footprint network/storage activ FĂRĂ consent:**
- ✅ `posthog.init()` — necondiționat
- ✅ Distinct ID anonim (localStorage `ph_<key>_posthog`)
- ✅ Cookie 1st-party (default SDK, fără override)
- ✅ `$pageview` events (URL inclus pathname + searchParams)
- ✅ `$pageleave` events (auto-capture la unload)
- ✅ `$autocapture` (click-uri/form events, default ON)

**Cookie banner ↔ PostHog:**
- Click "Refuz" → doar `localStorage.setItem("cookie_consent", "declined")` + hide banner
- **NU apelează** `posthog.opt_out_capturing()`
- **NU apelează** `posthog.reset()`
- **NU verifică** consent înainte de init

**Banner-ul e UI-only theater. Decizia "Refuz" produce ZERO side-effect tehnic asupra PostHog.**

**Privacy.html declarații FALSE (verificate):**

| Section | Declarație | Realitate |
|---------|-----------|-----------|
| §2 (date colectate) | "Date tehnice: erori tehnice anonimizate, colectate prin Sentry" | + PostHog pageviews, autocapture, IP-derived geo (NEDECLARAT) |
| §3 (lawful basis) | "consimțământ — pentru cookie-uri non-esențiale, dacă este cazul" | Consent NU se cere, PostHog rulează necondiționat |
| §5 (procesatori) | "Supabase, Vercel, Sentry, Resend" | + PostHog Inc. (NEDECLARAT) |
| §8 (cookies) | "Nu utilizăm cookie-uri de tracking sau publicitate" | FACTUAL FALSE — PostHog SDK setează 1st-party cookie |

**Placeholders necompletate (privacy.html L21, L84-87):**
- `[NUME COMPANIE]` (×2)
- `[EMAIL CONTACT]` (×2)
- `[DOMENIU]`

→ **Userul NU are unde scrie pentru exercitarea drepturilor** Art. 15-22 GDPR. Singur placeholder necompletat = sancțiune ANSPDCP.

**4 violations GDPR/ePrivacy simultan:**
1. **Art. 6 GDPR** — niciun lawful basis aplicabil pentru PostHog. Nu se încadrează la executare contract (platforma funcționează fără el), nu la interes legitim erori (privacy declară explicit limitat la Sentry), nu la consent (nu se solicită).
2. **Art. 13 GDPR** — transparency violation prin declarație "Nu utilizăm cookie-uri de tracking" (FALSE).
3. **Art. 28 GDPR** — processor PostHog Inc. nedeclarat în lista §5; DPA cu PostHog probably neîncheiat.
4. **ePrivacy / Legea 506/2004 RO** — stocare cookie/identifier non-strict-necesar fără consent prealabil = încălcare directă, sancționabilă separat de GDPR.

**Plus:** Schrems II issue dacă instanța PostHog e cloud US (`us.i.posthog.com`):
- Standard Contractual Clauses obligatorii
- Transfer Impact Assessment necesar
- Privacy.html §6 menționează SCC doar pentru Vercel/Resend

**Cost real GDPR pentru startup RO (ANSPDCP):**
- Sancțiuni tipice first violation: 5,000 - 50,000 RON
- Pentru breach categorii sensibile sau lawful basis violation: până la 20M EUR sau 4% turnover (Art. 83(5))
- Reclamație guest sau competitor → audit ANSPDCP → fine + remediu obligatoriu + publicitate negativă

**Fix structural (vezi Faza 2):**
- Consent banner restructurat (3 opțiuni: essential / accept all / personalizează)
- PostHog init gated pe consent
- Privacy policy rewrite complet cu PostHog declarat ca processor
- Schrems II: migrare la EU instance sau SCC + TIA documentat
- Placeholders umplute cu valori reale (nume companie, email contact, domeniu)

---

### C1 — RSVP nu sincronizează guest_events

**Severity:** 🔴 Critical (Launch blocker — business broken at core)
**Status:** ✅ CONFIRMAT empirical, AGRAVAT

**Evidență (surse):**
- `supabase/migrations/20260321000001_initial_schema.sql`:100-101 (guest_events.attendance_status)
- `supabase/migrations/20260321000001_initial_schema.sql`:237-249 (rsvp_responses.status)
- `supabase/migrations/20260401000001_rsvp_model.sql`:53-81 (enum redefinition)
- `app/api/rsvp/[public_link_id]/route.ts`:222-289 (POST handler)

**Detaliu:**

**3 surse de adevăr CONCURENTE pentru același guest, în același moment:**

| Sursă | Coloană | Scrie când | Citește cine |
|-------|---------|-----------|--------------|
| `rsvp_responses.status` | enum `accepted`/`declined`/`maybe`/`pending` | Guest submit RSVP, host manual override | RSVP host dashboard |
| `guest_events.attendance_status` | text `attending`/`declined`/`maybe`/`pending`/`invited` | Host edit manual din UI guest list | Seating chart, Guest list, PDF export, GET /api/guests |
| `rsvp_invitations.responded_at` | timestamptz | RSVP submit | Doar filter "Deschis dar fără răspuns" |

**Discrepanță vocabular enum:**

| Concept | rsvp_responses.status | guest_events.attendance_status |
|---------|----------------------|------------------------------|
| Confirmare prezență | `accepted` | `attending` |
| Refuz | `declined` | `declined` |
| Nehotărât | `maybe` | `maybe` |
| Așteptare | `pending` | `pending` |
| Trimis dar fără răspuns | — | `invited` |

→ **NU e doar lipsa de sync — chiar dacă ar exista, ar trebui mapping `accepted → attending`.**

**POST RSVP submit pipeline (`app/api/rsvp/[public_link_id]/route.ts`:222-289):**
1. SELECT `rsvp_invitations` WHERE `public_link_id`
2. `validateTokenState`
3. SELECT `guest_events` (id, event_id) — whitelist
4. UPSERT `rsvp_responses` ON CONFLICT (guest_event_id) ← scrie status RSVP
5. UPDATE `rsvp_invitations` SET responded_at = now ← marker invitație
6. Return success

**`UPDATE guest_events SET attendance_status = ...` — INEXISTENT.**

Verificat empirical:
- `grep "attendance_status\s*=" supabase/migrations/` → zero hits
- `grep "UPDATE guest_events" supabase/migrations/` → zero hits
- `grep "CREATE TRIGGER" supabase/migrations/` → zero hits

**Manual override host (`app/api/rsvp/manual/route.ts`):** scrie EXCLUSIV în `rsvp_responses`. NU scrie în `guest_events.attendance_status`. Aceeași disconnect ca path-ul guest_link.

**Read paths divergente:**

| Consumer | Sursă citită |
|----------|--------------|
| Seating chart (`load/route.ts`:66) | `guest_events.attendance_status` |
| Seating eligibility filter (`seating-eligibility.ts`:22) | `guest_events.attendance_status` |
| Magic Fill / unassigned list (`useSeatingData.ts`:285) | `guest_events.attendance_status` |
| Guest list page (`guest-list/page.tsx`:284-304) | `guest_events.attendance_status` |
| GET /api/guests (`route.ts`:36, 39) | `guest_events.attendance_status` |
| RSVP host dashboard (`api/rsvp/dashboard/route.ts`:6) | `rsvp_responses` (declarat explicit "Source of truth") |

**Comentariu inline confirmă designul tacit incomplet:**
- `app/api/rsvp/dashboard/route.ts`:6 — "Source of truth: rsvp_responses (răspuns) + rsvp_invitations (delivery)"
- `app/api/guests/route.ts`:36 — "guest_events included intentionally: seating chart needs attendance_status per event"

Nicăieri în code/migrations nu apare "sync rsvp_responses → guest_events". Designul tacit assumă surse separate.

**Scenariu observabil end-to-end:**

| Pas | Acțiune | Stare DB |
|-----|---------|----------|
| 1 | Host generează invitație Maria pentru "Ceremonie" | `guest_events.attendance_status = 'pending'` |
| 2 | Host trimite link via WhatsApp | `rsvp_invitations.last_sent_at = now` |
| 3 | Maria deschide link | `rsvp_invitations.opened_at = now` |
| 4 | Maria submit "Confirm" + "vegetarian" | `rsvp_responses.status = 'accepted'`, `meal_choice = 'vegetarian'`. **`guest_events.attendance_status` rămâne `'pending'`** |
| 5 | Host deschide RSVP dashboard | Vede Maria = "Confirmat" ✅ |
| 6 | Host deschide Guest list | Vede Maria = "În așteptare" ❌ |
| 7 | Host deschide Seating chart | Maria în pool unassigned, eligibilă (Magic Fill o consideră candidat) |
| 8 | Host face Magic Fill | Maria primește seat |
| 9 | Maria revine, schimbă în "Decline" | `rsvp_responses.status = 'declined'`. `guest_events.attendance_status` rămâne `'pending'` |
| 10 | Seating chart re-render | Maria rămâne plasată — eligibility check `'pending' !== 'declined'` → true |
| 11 | Dashboard `/api/dashboard/stats` | `rsvp_declined++` în counter, dar `seated_guests_total` NU scade |

**Tri-divergență vizibilă:** Maria apare:
- în RSVP dashboard ca "refuzată"
- în Seating la masă, contând ca prezență confirmată
- în Guest list ca "pending"

**Bonus findings:**

1. **`meal_choice` desincronizat:** `guest_events.meal_choice` (text NULL) și `rsvp_responses.meal_choice` (enum) — DOUĂ coloane independente, fără sync, fără mapping.

2. **`dietary_notes` lipsește din `guest_events`:** Stocat doar în `rsvp_responses`. Niciodată expus în seating/guest list/PDF. **Alergii catering pierdute.**

3. **Manual override pattern broken:** Scrie doar `rsvp_responses` — intervențiile host rămân invizibile pentru seating eligibility.

**Implicații business directe:**
1. **Catering comandă greșit** — meniuri pe baza `guest_events.meal_choice` (null), nu RSVP submit. Alergii ignorate. Posibil incident medical real (alergie nuci servită).
2. **Mese cu invitați refuzați** — seating eligibility nu vede `declined` din `rsvp_responses`. Embarrassment social.
3. **Mese fără invitați confirmați** — la fel.
4. **Hostul nu poate avea încredere în nicio sursă** — fiecare ecran zice altceva.

**Cauza rădăcină identificată:**
Faza 7 (RSVP model migration `20260401000001`) a introdus tabela `rsvp_responses` cu enum-uri proprii **fără să atingă read paths existente** (seating + guest list). CLAUDE.md zice "Faze 0-12 toate DONE" — dar Faza 7 e **incomplet integrată cu Faze 4-6**.

**Fix structural (vezi Faza 1.A):**
- Trigger Postgres `AFTER INSERT/UPDATE ON rsvp_responses` care propagă status la `guest_events.attendance_status`
- Mapping enum: `accepted → attending`
- Backfill pentru rows existente
- Sync `meal_choice` și `dietary_notes` (adăugare coloană pe `guest_events`)
- Read path consolidation (decizie LOCKED: una dintre surse devine canonical, celelalte sunt derived)

---

### C2 — RSVP submit silent data loss

**Severity:** 🔴 HIGH (Trust blocker)
**Status:** ✅ CONFIRMAT empirical

**Evidență (sursă):**
- `app/api/rsvp/[public_link_id]/route.ts`:235-244 (filter silent)
- `app/(public)/rsvp/[public_link_id]/page.tsx`:108-122 (UI ignoră responses_saved)

**Detaliu:**

**Linii exacte care fac filtering (`route.ts`:235-244):**

```javascript
const validResponses = responses.filter((r) => {
  if (!validEventMap.has(r.guest_event_id)) {
    logInternal("RSVP_SKIPPED_INVALID_EVENT", {
      route,
      guest_event_id: r.guest_event_id,
    });
    return false;          // ← SILENT DROP
  }
  return true;
});

if (validResponses.length === 0) {
  return errorResponse(400, "NO_VALID_GUEST_EVENTS", ...);
}
```

**Comportament:**
- Drop individual NU întrerupe procesarea
- Răspuns 400 doar dacă TOATE răspunsurile sunt invalide (`validResponses.length === 0`)
- Dacă măcar unul trece, request e considerat success
- `responses_saved` raportează cantitate **post-filter**, fără semnal de drop

**Server response (L281-285):**
```javascript
return successResponse({
  success: true,
  responses_saved: validResponses.length,
  invitation_id: invitation.id,
});
```

**Niciun warning structural:**
- ❌ Nicio comparație `validResponses.length !== responses.length`
- ❌ Niciun field `responses_dropped` sau `dropped_event_ids` în payload
- ❌ Nicio variantă `partial: true` sau `incomplete: true`

**UI consumer (`page.tsx`:108-122):**
```javascript
if (!json.success) {
  setSubmitError(json.error?.message ?? t.submit.error_generic);
  return;
}
setPageState("submitted");
```

UI ignoră `responses_saved` și `invitation_id`. **Niciun handler pentru "partial success".**

Render success state:
> "Mulțumim! Răspunsul tău a fost înregistrat. Te așteptăm cu drag."

**Identic indiferent dacă au fost salvate 1/3, 2/3 sau 3/3 răspunsuri.**

**Vectori de manifestare reali:**

| Scenariu | Frecvență probabilă |
|----------|---------------------|
| Host modifică events între opened/submitted | Comună pe nuntă cu planning în desfășurare |
| Host face cleanup pe guest_events | Comună la corectări |
| Link WhatsApp cached → guest deschide după săptămâni | **Foarte comună** |
| Mobile abandon-resume (deschis pe mobil → 2h târziu submit) | **Foarte comună** |
| Race tab: 2 tabs deschise + submit între | Mai rară |

**Probability cumulată reală: 5-15% din submit-uri pot avea drop silent pe nuntă cu 100+ invitați și planning activ.**

**Bonus finding — honey pot UI bug:**

Server returnează `responses_saved: 0, invitation_id: null` la honey pot hit (deliberately, anti-bot deception):
```javascript
return successResponse({ success: true, responses_saved: 0, invitation_id: null });
```

DAR: dacă un **user real** activează honey pot accidental (autofill browser, screen reader, accessibility tools, browser extension care simulează submit), userul vede **"Mulțumim!"** deși **nimic nu a fost salvat**.

**Audit log analysis:**
- `wl_audit` table există (folosită pentru `account.delete_*`)
- **NU e folosită pentru RSVP submit**
- Drop-uri ajung doar în `console.warn` → Vercel logs
- Niciun query post-fact "câți useri au avut drop pe ce date"

**Combinație C1 + C2 = invizibil triplu drift:**

Maria submit pentru events [A, B, C] cu accept:
1. **C2 drift**: server filtrează B (event B șters între opened/submit) → salvează doar A+C
2. **C1 drift**: nici A nici C nu propagă în `guest_events.attendance_status`
3. **UI**: Maria vede "Mulțumim!"
4. **Host RSVP dashboard**: vede A=accepted, C=accepted (B nu apare)
5. **Host guest list**: vede A=pending, B=pending, C=pending
6. **Seating eligibility**: A, B, C eligible
7. **Magic Fill**: pune Maria la masă pentru toate 3, inclusiv B (impossible UI confusion)

Sistemul produce **3 surse de adevăr DIFERITE** pentru un singur submit, niciuna corectă.

**TS error message i18n bug:** "No valid guest events found in submission." e engleză, app e RO (CLAUDE.md §2 declară RO obligatoriu).

**Fix structural (vezi Faza 1.C):**
- Server returnează `partial: true` + `dropped_event_ids` + `responses_dropped: count`
- UI afișează warning vizibil când `responses_saved !== submitted_count`
- Pre-submit re-fetch eligible events → previne race
- Audit log per submit cu before/after
- Mesaj UI tradus în RO

---

### C3 — RSVP modificabil fără identity check

**Severity:** 🔴 Critical (Launch blocker — GDPR Art. 5 + business)
**Status:** ✅ CONFIRMAT empirical, AGRAVAT

**Evidență (surse):**
- `lib/rsvp/token.ts`:55-69 (validateTokenState ignoră responded_at)
- `app/api/rsvp/[public_link_id]/route.ts`:235-285 (UPSERT fără guard)
- `app/(public)/rsvp/[public_link_id]/page.tsx`:62-73 (form pre-populat fără warning)

**Detaliu:**

**`validateTokenState` — singurul guard pe POST:**
```javascript
export function validateTokenState(invitation: {
  is_active: boolean;
  responded_at: string | null;        // ← acceptat ca parametru
  expires_at?: string | null;
}): { valid: true } | { valid: false; reason: "expired" | "inactive" } {
  if (!invitation.is_active) return { valid: false, reason: "inactive" };
  if (invitation.expires_at && isTokenExpired(invitation.expires_at))
    return { valid: false, reason: "expired" };
  return { valid: true };
}
```

`responded_at` e citit ca input, dar **NU consultat** în vreo ramură. Funcția acceptă câmpul, îl ignoră complet.

Comentariul header (L7) declară "One-time: used_at setat la primul submit valid" — **nu reflectă codul actual**: nu există `used_at` check, nu există flow one-time.

**`is_active` și `expires_at` post-submit — neschimbate:**
```javascript
// route.ts:276-279
await supabase
  .from("rsvp_invitations")
  .update({ responded_at: now, updated_at: now })
  .eq("id", invitation.id);
```

Doar `responded_at` și `updated_at` setate. Niciun `is_active = false`. Token rămâne activ post-submit.

**UPSERT comportament — overwrite garantat:**
```javascript
const { error: upsertError } = await supabase
  .from("rsvp_responses")
  .upsert(upsertData, { onConflict: "guest_event_id" });
```

UNIQUE constraint pe `(guest_event_id)`:
- Primul submit → INSERT row nou
- Re-submit → UPDATE row existent (toate câmpurile suprascrise: status, meal_choice, dietary_notes, note, responded_at)

**Niciun guard:**
- ❌ `WHERE responded_at IS NULL` să blocheze update
- ❌ Comparator `IF NEW.responded_at < OLD.responded_at THEN reject`
- ❌ Trigger DB pe `rsvp_responses`
- ❌ Version/lock column

**Coloana `used_at` — fantomă funcțional:**
- Adăugată în `20260401000001`:81 cu comentariu "used_at TIMESTAMPTZ NULL"
- `grep "used_at" în app/` → zero hits funcționale (doar declarație tip în `types/rsvp.ts:61`, nepopulată)
- Cineva a planificat one-time enforcement, l-a documentat, **dar nu l-a livrat**. Documentation lies.

**UI re-deschidere link:**

GET pe pagină re-deschisă (`route.ts`:117-134):
```javascript
const { data: existingResponses } = await supabase
  .from("rsvp_responses")
  .select("*")
  .eq("invitation_id", invitation.id);

const events = (guestEvents ?? []).map((ge: any) => {
  const existing = (existingResponses ?? []).find(
    (r: any) => r.guest_event_id === ge.id
  );
  return { ..., current_response: existing ?? null };
});
```

UI pre-populează form (`page.tsx`:62-73):
- `pageState = "ready"` (form interactiv, NU submitted)
- Form pre-populat (status preselected, meal preselected, dietary_notes pre-completate)
- Buton "Trimite răspunsul" activ
- **Niciun mesaj "deja ai răspuns"**
- Niciun lock pe câmpuri
- Niciun warning despre overwrite

→ Guest revine la link și vede form-ul exact așa cum l-a lăsat. Poate modifica orice câmp și submit. **Experiența identică cu primul submit, fără semnal că modifică o decizie deja înregistrată.**

**Tracking schimbări — ZERO infrastructură:**

Schema `rsvp_responses`:
- ❌ Niciun `created_at`
- ❌ Niciun `updated_at`
- ❌ Niciun `response_count` / `version`
- `responded_at` overwrite la fiecare submit → **timestamp original PIERDUT**

Niciun history table: `grep "rsvp.*audit|response.*history"` → zero hits.

`wl_audit` infrastructure există (migration `20260404000001`) dar **NU e apelat pentru RSVP submit**.

**Dashboard host — ZERO vizibilitate schimbări:**
- Niciun count "modificat de N ori"
- Niciun timestamp "primul răspuns"
- Niciun delta vs istoric
- Niciun email/notification către host la schimbare

**Edge cases verificate:**

**A) Guest accepted → revine 1h târziu, declined:**
- Token still active (TTL RSVP = 30 zile)
- UPSERT overwrite → `status: 'declined'` peste `'accepted'`
- `responded_at` overwrite cu nou timestamp; primul timestamp pierdut
- Host vede în dashboard "Refuzat" — niciun semnal că anterior a fost "Confirmat"
- **Comportament: silently overwrite, host în necunoștință de cauză**

**B) Link forwarded la altă persoană:**
- `public_link_id` e secret de capability (16 chars, ~95 bits entropy)
- Cumnata Mariei primește URL-ul prin screenshot WhatsApp
- Cumnata GET → vede `pageData.guest.first_name = "Maria"` + events Maria + răspunsuri actuale Maria
- Cumnata submit → suprascrie răspunsurile Maria
- **Niciun guard de identitate: token-ul e bearer-only**
- Host vede "Maria a refuzat" deși Maria nu a făcut nimic
- **Comportament: link forwarding = preluare totală a identității RSVP**

**C) Host generează link nou → link vechi încă funcționează?**
- Deactivate flow (`api/rsvp/invitations/route.ts`:76-89): link vechi devine `is_active = false` la regenerare
- `validateTokenState` returnează inactive → 404 generic
- **Comportament: regenerate explicit invalidează corect** ✅

**Coliziune temporală — Maria vs cumnată:**

Scenariu compus realist:
1. T+0: Maria primește link via WhatsApp, submit `accepted + vegetarian`
2. T+1h: Catering download dashboard CSV → primește "Maria — vegetarian"
3. T+2h: Maria forward link Mamei sale "uită-te ce site cool"
4. T+3h: Mama deschide link → vede form pre-populat cu vegetarian
5. T+3h: Mama bifează "🍽 Standard" din curiozitate, dă submit
6. T+24h: Catering observă schimbare? NU — folosește CSV-ul download anterior
7. T+30 zile: Nuntă, Maria vine, primește meniu standard, **e vegană strictă, scandal**

**Niciun mecanism previne pasul 5. Niciun mecanism alertează la 6.**

**GDPR Art. 5(1)(d) — Acuratețe:**

GDPR cere ca date personale să fie "accurate and kept up to date". Sistemul actual:
- Permite modificare retroactivă fără identitate verificată
- Nu păstrează istoric
- Nu poate confirma cine a modificat ce

→ **Violation directă.**

**Idempotency framework neapelat:**

`lib/supabase/idempotency.ts` declarat în SPEC, RSVP path îl ignoră complet. Verificat — `grep "withIdempotency" app/api/rsvp/` → zero hits.

**Fix structural (vezi Faza 1.A + 1.C):**
- Schema migration: `rsvp_response_versions` history table + trigger BEFORE UPDATE
- Decizie LOCKED `wedding.rsvp_modifiable BOOLEAN`:
  - Default `true` cu warning UI + email notification host la fiecare modificare
  - Sau opțional `false` (one-time enforcement strict — set `is_active=false` post-submit)
- Audit log per RSVP submit + per modificare
- Email confirmare guest la fiecare submit (defense împotriva link forwarding takeover)
- UI: warning "Modifici răspunsul anterior" + timeline schimbări

---

### C4 — Dashboard stats query pe coloană inexistentă

**Severity:** 🔴 HIGH (UX blocker — dashboard 500 la fiecare login)
**Status:** ✅ CONFIRMAT empirical, ESCALAT

**Evidență (surse):**
- `app/api/dashboard/stats/route.ts`:46 (query broken)
- `supabase/migrations/20260321000001_initial_schema.sql`:145-156 (schema seat_assignments)

**Detaliu:**

**Schema `seat_assignments` (initial L145-156):**
```sql
CREATE TABLE seat_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id      uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  seat_id         uuid NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  guest_event_id  uuid NOT NULL REFERENCES guest_events(id) ON DELETE CASCADE,
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seat_id),
  UNIQUE (guest_event_id)
);
```

**Coloana `guest_id` NU EXISTĂ.** Verificat exhaustiv pe TOATE migrațiile. Coloana corectă e `guest_event_id`.

**Query broken (`route.ts`:46):**
```javascript
supabaseServer.from("seat_assignments").select("guest_id").eq("wedding_id", weddingId),
```

**Consum în handler (L81-82):**
```javascript
const uniqueSeatedGuests = new Set((assignmentsResult.data ?? []).map((a) => a.guest_id))
const seated_guests_total = uniqueSeatedGuests.size
```

**Comportament runtime:**
- PostgREST returnează error 400: `{"code": "42703", "message": "column seat_assignments.guest_id does not exist"}`
- `assignmentsResult.error` non-null → handler intră pe error branch (L61-62):
  ```javascript
  if (assignmentsResult.error)
    return internalErrorResponse(assignmentsResult.error, "GET /api/dashboard/stats — assignments")
  ```
- HTTP 500 către client cu mesaj generic
- **Endpoint TOTAL eșuează** (Promise.all all-or-nothing)
- **TOATE celelalte stats** (wedding, guests, rsvp, tables, seats, budget, payments) — care funcționează — sunt aruncate la coș

**UI consumer (`app/dashboard/page.tsx`:106-119):**
```javascript
if (!statsRes.ok || !statsJson.success) {
  setLoadingState("error")
  setErrorMessage(statsJson.error?.message ?? "Eroare la încărcarea statisticilor.")
  return
}
```

**Dashboard arată "Eroare la încărcarea statisticilor" la fiecare login.**

**De ce nu a fost prins:**
- **Zero test coverage pe ruta `/api/dashboard/stats`** (verificat grep)
- TSC trece pentru că tipurile Supabase generate NU sunt regenerate post-schema
- `npm run build` verde
- ESLint clean
- **Husky pass** — pentru că nu există integration test cu DB reală

**Severity escalat:**
- Audit a folosit "likely" — realitatea e **certitudine**
- Probably afectează **100% useri activi de zile/săptămâni**
- Probably alți consumatori afectați (pattern: "TS pass, DB query fails")

**Fix structural (vezi Faza 5.C):**
- Schimbă `seat_assignments.guest_id` → `seat_assignments.guest_event_id`
- Refactor logic distinct guest count: `COUNT(DISTINCT ge.guest_id) FROM seat_assignments sa JOIN guest_events ge ON sa.guest_event_id = ge.id`
- `Promise.all` → `Promise.allSettled` — un endpoint stats nu trebuie să picure la o sub-query fail
- Integration test pe `/api/dashboard/stats`

---

### C5 — Import JSON 0% functional

**Severity:** 🔴 Critical (Launch blocker GDPR Art. 20)
**Status:** ✅ CONFIRMAT empirical, AGRESIV AGRAVAT

**Evidență (surse):**
- `app/api/import/json/route.ts`
- `lib/import/json-import.ts`
- `lib/import/validate-import.ts`
- `lib/export/json-export.ts`

**Detaliu:**

**Audit zicea:** "Câmpuri lipsă/în plus. Backup inutil."

**Realitate empirică:** Atât export cât și import sunt **non-funcționale pe schema curentă**.

#### Export broken la primul query

`lib/export/json-export.ts`:139:
```javascript
.from("tables").select("*").is("deleted_at", null)
```

Tabela `tables` din `20260321000001_initial_schema.sql`:113-130 NU are coloană `deleted_at`. Verificat exhaustiv — coloanele sunt: `id, wedding_id, event_id, name, table_type, x, y, rotation, seat_count, shape_config, sort_order, created_at, updated_at`.

→ Filtru `.is("deleted_at", null)` pe coloană inexistentă → SQL error 400 → toate exporturile returnează `{success: false, error: "Failed to export tables."}`. **Export-ul în sine e broken pentru orice wedding cu sau fără mese.**

#### Import — 6 coloane fantomă, 8 NOT NULL violations, 3 nume coloană greșite

**Tabel diff complet (entitate × verdict roundtrip):**

| Entitate | Coloane fantomă în INSERT | NOT NULL nesatisfăcute | Nume coloană greșit | Câmpuri silent dropped |
|----------|---------------------------|----------------------|---------------------|----------------------|
| weddings | `location_name` | `owner_user_id` | — | `plan_tier`, `status` overwrite |
| events | `ends_at` | — | — | `is_seating_enabled`, `is_rsvp_enabled` |
| guest_groups | — | — | — | `group_type`, `sort_order` |
| guests | `email`, `phone`, `group_id` | — | `group_id` vs `guest_group_id` | `is_vip` |
| guest_events | — | — | — | `meal_choice`, `plus_one_label` |
| tables | `type` | `event_id`, `table_type` | `type` vs `table_type` | `shape_config`, `sort_order` |
| seats | — | `event_id` | — | `label`, `x_offset`, `y_offset` |
| seat_assignments | — | `event_id` | — | `assigned_at`, `updated_at` |
| budget_items | `sort_order` | — | — | `vendor_id`, `category`, `due_date`; **currency default EUR→RON** |
| payments | `notes` | — | `notes` vs `note` | `payment_method`; **currency default EUR→RON** |
| rsvp_invitations | — | `event_id`, `public_link_id` | — | `expires_at`, `responded_at`, `sent_at`, `max_guests` |
| rsvp_responses | `created_at` | — | — | `used_at` |
| **TOTAL** | **6 coloane fantomă** | **8 NOT NULL violations** | **3 nume greșit** | **~19 câmpuri pierdute silent** |

**Roundtrip mental simulation:**

T+0: User export wedding cu 50 guests, 3 events, 8 tables, 64 seats, 30 budget items.
- Export: tables query are `.is("deleted_at", null)` → coloană inexistentă → **EXPORT EȘUEAZĂ cu HTTP 500**
- User primește mesaj generic eroare, **nu primește deloc fișier JSON**

Dacă export-ul ar funcționa miraculos:
- User salvează `weddinglist-export-...json`, schimbă device, încearcă restore prin import
- `validateImportPayload` ✅ trece
- `importWeddingJson` step 1 (wedding) → INSERT cu `location_name` (coloană inexistentă) + lipsă `owner_user_id` → **FAIL imediat**
- `markFailed` UPDATE pe wedding row inexistent (nu a fost creat încă) — no-op silent
- User primește 422: `Import eșuat la pasul "wedding": column "location_name" of relation "weddings" does not exist`

Dacă wedding step ar fi corectat: events INSERT eșuează la `ends_at`. Și mai departe.

**Concluzie roundtrip: 0% chance ca un export → import să producă un wedding restaurat.**

#### Atomicitate — ZERO

`lib/import/json-import.ts`:100-363 — pattern de procesare:
- Loop prin entități cu `for ... of` + INSERT individual per rând
- La primul `error` non-null: `return await markFailed(supabase, idMap.wedding, ...)`
- `markFailed` (L368-384) NU șterge weddings + entitățile parțial inserate — doar UPDATE titlu la `[Import eșuat] Wedding`
- **Niciun rollback transactional. Niciun BEGIN/COMMIT. Niciun BEGIN/ROLLBACK.**
- Toate INSERT-urile sunt independente HTTP-uri prin Supabase JS

→ La eșuare la step events: `weddings` + `wedding_members` rămân în DB ca orfan.

#### Status reported user

`app/api/import/json/route.ts`:91-95:
```javascript
return errorResponse(
  422,
  "IMPORT_FAILED",
  `Import eșuat la pasul "${result.step}": ${result.error}`
);
```

→ Mesaj user expune raw error message PostgreSQL. **Violare CLAUDE.md §2** "NU error.message raw către client".

#### Bonus findings

**A) `wedding_members` neexportate** — la restore, doar owner-ul se adaugă. Toți partner/planner/editor/viewer adăugați colaborator se pierd la import.

**B) `vendors` neexportate** dar `budget_items.vendor_id` referențiază vendors → la restore, vendor_id ar fi orfan oricum. Code-ul ignoră `vendor_id` la INSERT, deci toate budget_items pierd legătura cu vendor.

**C) `audit_logs` și `seating_audit_logs` neexportate** — istoric pierdut la migrare cont.

**D) Currency default schimbat silent EUR → RON** la import → distorsionare costuri ~5x dacă currency e null.

**E) Schema_version strict "1.0"** — backup-uri vechi devin neimportabile la orice schema migration. Niciun layer de migration logic.

**F) Tests verde + cod broken** — 879/879 teste verzi nu prind divergențe schema vs code. **Aceeași clasă de gap ca C4 (dashboard stats `seat_assignments.guest_id`).**

**G) Mesaje hardcoded engleză** — exportă returnează "Wedding not found.", "Failed to export tables." (engleză). CLAUDE.md §2 declară RO obligatoriu.

#### Cauza rădăcină identificată

**Decuplare totală între iterație schema (migrations) și iterație code (Faze 8.1/8.2 import/export). Niciodată reconciliate.**

Export scris contra schemă **posterioară** (cu `deleted_at` adăugat în iterații anterioare, apoi rollback fără update la export).

Import scris contra **draft schema preliminară** (`email`, `phone` pe guests, `location_name` pe wedding, `ends_at` pe events, `type` în loc de `table_type`, `notes` în loc de `note` — toate inconsistente cu migration finală).

#### Implicații GDPR cumulative

| Drept | Status |
|-------|--------|
| Art. 20 (data portability) | ❌ violat — utilizatorul NU poate "primi datele într-un format structurat utilizabil" |
| Art. 17 (right to deletion) | parțial — DELETE funcționează, dar GDPR Art. 17 + Art. 20 împreună presupun că user poate exporta înainte de delete |
| Privacy policy §7 (Portabilitate) | ❌ promisiune neonorabilă |
| Backup utility | ❌ orice backup făcut e ne-restorabil → false sense of security |
| Migrare device / cont | ❌ nu se poate face funcțional |

**Fix structural (vezi Faza 4):** rewrite complet export + import contra schema curentă, tranzacțional via PostgreSQL function, schema_version "2.0" curat de moștenirea broken, integration tests roundtrip CI.

---

### C6 — Export ≠ Import (multi-format ZERO funcțional)

**Severity:** 🔴 Critical (Launch blocker — compus cu C5)
**Status:** ✅ CONFIRMAT empirical, multi-format

**Evidență (surse):**
- `app/api/export/json/route.ts` (broken același bug ca C5)
- `app/api/export/pdf/route.ts`:110 (broken același bug `tables.deleted_at`)
- `lib/export/pdf-export.tsx`
- `app/rsvp/page.tsx`:252-269 (CSV client-side)

**Detaliu:**

#### Inventar complet export endpoints

| Path | Format | Status |
|------|--------|--------|
| `/api/export/json` | JSON | ❌ broken (`tables.deleted_at` 500) |
| `/api/export/pdf` | PDF | ❌ broken (același bug) |
| `app/rsvp/page.tsx`:252-269 (client-side) | CSV | ✅ parțial (5 col custom, non-roundtrip) |

#### Inventar complet import endpoints

| Path | Format | Status |
|------|--------|--------|
| `/api/import/json` | JSON | ❌ broken (vezi C5) |
| `/api/guests/import` | CSV | ✅ parțial (doar 7 câmpuri demografice) |
| `/api/migrate-local` | (intern) | N/A — migrare localStorage→DB |

#### Matrix export ↔ import

| Format | Export | Import | Roundtrip |
|--------|--------|--------|-----------|
| JSON | ❌ | ❌ | ❌ |
| PDF | ❌ | N/A (read-only design) | ❌ |
| CSV guests | NU EXISTĂ export | ✅ partial | ❌ (no export) |
| CSV RSVP (client) | ✅ partial (5 col) | NU EXISTĂ counterpart | ❌ |
| Excel/XML/ICS/vCard | ❌ | ❌ | ❌ |

#### PDF analysis — read-only by design

`lib/export/pdf-export.tsx` produce 2 pagini A4:
- Pagina 1: Header (couple_names, wedding_date) + Stats grid + Plan mese
- Pagina 2: Tabel guests (display_name, rsvp_status, meal_choice, table_name, dietary_notes)

**Roundtrip teoretic blocat de design:**
- Conține doar `display_name` — fără `first_name`/`last_name`, fără email, phone, notes, is_vip, side, guest_group_id
- Pentru tables: doar name + seat_count. Lipsește event_id, x, y, rotation, table_type, shape_config
- Pentru rsvp: doar status + meal_choice + dietary_notes. Lipsește invitation_id
- **Niciun ID (UUID)** — toate referințele prin nume display
- Niciun event metadata, niciun budget, niciun seat layout

**Plus: bug confirmat C5** — `app/api/export/pdf/route.ts`:110 mirror exact `.is("deleted_at", null)` pe tables → **export PDF BROKEN identic cu JSON**.

#### CSV guests — analiză roundtrip parțial

`lib/csv/parse-guests.ts`:31-64 — HEADER_ALIASES acceptă: `first_name, last_name, display_name, group, side, notes, is_vip`. NU există `email`, `phone`, `attendance_status`, `meal_choice`.

**Counterpart export CSV: NU EXISTĂ.** `app/rsvp/page.tsx`:252 `exportCsv()` client-side exportă rsvp dashboard data cu coloane RO (`Nume, Status, Meniu, Alergii, Data răspuns`) — **niciuna nu se mapează prin HEADER_ALIASES.**

→ Chiar dacă userul ar copia CSV-ul în alt CSV cu coloane corecte, `Status` = atribut RSVP, NU `is_vip`. **Semantic incompatibil.**

#### Privacy policy §7 — Drepturi vs realitate

| Drept GDPR | Promis | Implementabil acum? |
|-----------|--------|---------------------|
| Acces (Art. 15) | ✅ | ❌ export JSON broken |
| Rectificare (Art. 16) | ✅ | ✅ UI permite edit |
| Ștergere (Art. 17) | ✅ | ✅ DELETE funcțional (DAR vezi C11 — broken global) |
| Portabilitate (Art. 20) | ✅ | ❌ niciun format funcțional |
| Opoziție (Art. 21) | ✅ | ⚠️ doar email placeholder necompletat |
| Restricționare (Art. 18) | ✅ | ❌ niciun mecanism |

**Concluzie GDPR: 4 din 6 drepturi promise sunt NEMARCABILE pe codul curent.**

#### Migrare device → device — flow practic

`grep "migrate|migrare|transfer" în app/`:
- `api/migrate-local` — NU device migration; migrarea localStorage browser → DB Supabase
- `api/account` — DELETE cont (nu transfer)
- `settings/page.tsx` — DELETE cont, link "Descarcă datele mai întâi" (`<a href="/export">`)
- `app/export/page.tsx` — UI care apelează `/api/export/json` și `/api/export/pdf` (ambele broken)

**Niciun flow:**
- ❌ "transferă wedding-ul la alt cont"
- ❌ "invită co-owner cu acces complet"
- ❌ "schimbă owner-ul"
- ❌ pagină /help, /faq, /migrate

#### External integrations — ZERO

`grep "google.*drive|dropbox|icloud|webdav"` → zero hits. Niciun fallback "salvează backup în Drive/Dropbox".

#### Bonus C6 (nu în C5)

**A) Settings page linkează `<a href="/export">Descarcă datele mai întâi</a>` ÎNAINTE de DELETE cont** (privacy-friendly pattern intenționat). DAR link-ul duce la export broken → **user-ul șterge contul fără posibilitate reală de a-și salva datele.**

**B) Pagina `/export` UI promite funcționalitate care NU livrează.** User vede butoane "Descarcă JSON" + "Descarcă PDF" → ambele click-uri → 500 error.

**C) Vendor lock-in TOTAL.** User înscris pe platformă → nu poate ieși cu datele. Pentru un produs care promite "nuntă fără stres" → **exact opus.**

**Fix structural (vezi Faza 4):** rewrite export multi-format (JSON v2.0, PDF print-friendly, CSV per entitate) + import idempotent + integration tests roundtrip + opțional integrare Drive/Dropbox.

---

### C7 — rsvp_invitations event_id NOT NULL → INSERT eșuează

**Severity:** 🔴 HIGH (Launch blocker — RSVP feature dead)
**Status:** ✅ CONFIRMAT empirical

**Evidență (surse):**
- `supabase/migrations/20260321000001_initial_schema.sql`:221-235 (event_id NOT NULL)
- `app/api/rsvp/invitations/route.ts`:104-118 (INSERT fără event_id)

**Detaliu:**

**Schema (initial L221-235):**
```sql
CREATE TABLE rsvp_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,   ← NOT NULL
  ...
);
```

ALTER ulterior pe rsvp_invitations (verificate 4 migrations):
- `20260401000001_rsvp_model.sql`:45 — ADD COLUMN guest_id, delivery_channel, etc. — **niciun ALTER event_id**
- `20260405000001_add_public_link_id_rsvp.sql`:13 — ADD public_link_id
- `20260414000001_security_hardening.sql`:212 — reindex

**`event_id` rămâne NOT NULL în starea curentă.**

**Cod creare invitation (`app/api/rsvp/invitations/route.ts`:104-118):**
```javascript
const { data: invitation, error: insertError } = await supabaseServer
  .from("rsvp_invitations")
  .insert({
    wedding_id: weddingId,
    guest_id: guestId,
    token_hash: hash,
    public_link_id: publicLinkId,
    delivery_channel: deliveryChannel ?? null,
    delivery_status: "ready",
    is_active: true,
    expires_at: expiresAt.toISOString(),
    last_sent_at: null,
  })
  .select()
  .single();
```

**Body request (L34-58):** citește doar `guest_id` + opțional `delivery_channel`. **Niciun event_id din body.**

**Niciun derivare server-side** din events table.

**Verdict runtime:**
- Toate INSERT-urile eșuează cu `null value in column "event_id" violates not-null constraint`
- Endpoint-ul POST /api/rsvp/invitations returnează 500 la fiecare apel
- UI dashboard host (`app/rsvp/page.tsx`:107-125 generateLink, L170-183 bulkGenerateLinks, L231-250 regenerateLink) eșuează silent (NU re-throw, doar refetch fără invitation creat)

**Reproducible scenario:** orice click pe "Generează link" / "Regenerează link" / "Generează invitații" în RSVP dashboard → INSERT FAIL → invitation NU se creează → `public_link_id` necesar niciodată produs.

**Mitigare existentă: niciuna.**

**Pattern-ul "TS verde, runtime broken" (al 5-lea bug):**
- Schema cere event_id NOT NULL
- Cod NU setează event_id în payload INSERT
- TypeScript NU verifică schema Supabase (anon key, fără Database generic types)
- Tests rulează pe mock-uri, nu DB real
- npm run build verde, ESLint clean, Husky pass

**Fix structural (vezi Faza 1.A):**
- Decizie LOCKED: invitation = `(guest, event)` pereche → recomandat pivot table `rsvp_invitation_events`
- Body request acceptă `event_ids: string[]`
- Server creează invitation + N rows pivot în tranzacție atomică (RPC)

---

### C8 — Manual RSVP invitation_id NOT NULL → UPSERT eșuează

**Severity:** 🔴 HIGH (Launch blocker — manual override broken)
**Status:** ✅ CONFIRMAT empirical

**Evidență (surse):**
- `supabase/migrations/20260321000001_initial_schema.sql`:237-249 (invitation_id NOT NULL)
- `app/api/rsvp/manual/route.ts`:62-72 (invitation_id literal null)

**Detaliu:**

**Schema (initial L237-249):**
```sql
CREATE TABLE rsvp_responses (
  ...
  invitation_id uuid NOT NULL REFERENCES rsvp_invitations(id) ON DELETE CASCADE,   ← NOT NULL
  ...
);
```

ALTER ulterior `20260401000001`:53-81 — DROP CHECK status + meal_choice, ALTER TYPE enum, ADD dietary_notes + rsvp_source + used_at. **Niciun ALTER pe `invitation_id` — rămâne NOT NULL.**

**Cod manual override (`app/api/rsvp/manual/route.ts`:62-72):**
```javascript
const { error: upsertError } = await supabaseServer
  .from("rsvp_responses")
  .upsert({
    wedding_id: ge.wedding_id,
    event_id: ge.event_id,
    invitation_id: null,            ← LITERAL null
    guest_event_id: guestEventId,
    status,
    rsvp_source: "couple_manual",
    responded_at: new Date().toISOString(),
  }, { onConflict: "guest_event_id" });
```

**Verdict:**
- Schema cere `invitation_id` NOT NULL
- Cod setează `invitation_id: null` literal
- → UPSERT eșuează cu NOT NULL violation la INSERT path (când nu există rând existing)
- **Manual override NU funcționează pentru un guest care nu are deja un rsvp_response.**

**Caz UPDATE path** (când există deja rsvp_response cu guest_event_id):
- ON CONFLICT (guest_event_id) → UPDATE — Supabase upsert înlocuiește toate câmpurile, inclusiv `invitation_id`
- UPDATE `invitation_id = NULL` pe coloană NOT NULL → eșuează cu NOT NULL violation

**Reproducible scenario:** host folosește butonul "Manual" în RSVP dashboard pe un guest fără invitation generată → 500 → `setActionError(...)` cu mesaj generic → guest rămâne pending.

**Severity reală: HIGH (blocking).** Manual override e funcția primară de fallback când:
- Guest nu are smartphone (nu poate completa link-ul)
- Cuplul confirmă RSVP la telefon și introduce manual
- Guest a refuzat verbal — host nu poate fi forțat să trimită link

**Bonus C8:** chiar dacă INSERT ar fi funcționat (cu `invitation_id` setat la un UUID existent), comportamentul UPSERT pe re-apply ar suprascrie tot, **inclusiv un `invitation_id` real cu null** — corupere date dacă există invitation legată anterior.

**Fix structural (vezi Faza 1.C):**
- Decizie LOCKED: opțiunea "shadow invitation" — manual override creează invitație "fantomă" cu `delivery_channel='couple_manual'`, `is_active=false`, doar pentru a satisface FK. Audit trail clar.

---

### C9 — Autosave seating event_id race window

**Severity:** 🟢 LOW (edge case 1500ms)
**Status:** ❌ INFIRMAT (literal claim) / ⚠️ PARȚIAL (edge case race)

**Audit zicea:** "Autosave seating ignoră event_id. Risc: load greșit între evenimente."

**Realitate empirică:** event_id e propagat **CORECT** pe TOATE layerele.

#### Verificare empirical

`app/api/weddings/[weddingId]/seating/sync/route.ts`:
- L62-64: validare body `event_id` UUID (REQUIRED)
- L70-71: `rpcParams.p_event_id = body.event_id`
- L83-90: hash include rpcParams (deci `event_id` e parte din `request_hash` idempotency)
- RPC chemat cu `p_event_id` explicit

`supabase/migrations/20260409000003_rpc_sync_seating_v2_version.sql`:
- L24: `p_event_id uuid` parameter
- L75-82: validare event există în wedding (P0009 EVENT_NOT_FOUND dacă nu)
- L86-93: OCC pe `seating_editor_states (wedding_id, event_id)` — version per-event
- L108-115: scope `tables.event_id = p_event_id`
- Restul: tot scope-uit pe event_id

`app/api/weddings/[weddingId]/seating/load/route.ts`:
- L47-50: required `event_id` query param
- L72-75: filtrează `guest_events.event_id === eventId`
- L82: `tables.event_id = eventId`
- L94: `seat_assignments → guest_events.event_id = eventId`
- L207: `seating_editor_states.event_id = eventId`

`lib/seating/use-seating-sync.ts`:
- L64-66 hook input: `weddingId, eventId`
- L249, L259: GET load cu `?event_id=${eventId}`
- L353-365: POST sync cu body `{event_id: eventId, ...}`
- L460: `useCallback` deps include `eventId` → dacă eventId se schimbă, întreg orchestrator-ul re-init

**Verdict literal claim "autosave seating ignoră event_id" = ❌ INFIRMAT.**

#### Edge case race window

Există o fereastră subtilă de race în debounce timer la event switch:

- `useCallback(doSync, [..., eventId])` — la schimbare eventId, doSync referă eventId nou
- DAR `syncTimerRef.current` setat în `onSeatingStateChanged` (L620) referă funcția în zborul la momentul `setTimeout` call
- Dacă timer fires după event change, va invoca saveWithSmartRefetch din noua versiune a callback-ului → doSync cu eventId nou → **trimite snapshot vechi (event A) cu scope event B**

**Reproducible scenario teoretic:**
1. User pe `/seating-chart?event_id=A` editează drag table 14:30:00.000
2. Debounce setTimeout 1500ms scheduled
3. La 14:30:00.500 user navighează la `/seating-chart?event_id=B`
4. La 14:30:01.500 timer fires, `latestSnapshotRef` are state din A, doSync are `eventId=B`
5. POST `/api/weddings/X/seating/sync` cu body `{event_id: B, tables: [stateA tables], assignments: [stateA assignments]}`
6. RPC aplică reconcilierea: tables din A apar ca "tables nou create" pe event B; tables existing pe B (nu sunt în request) sunt soft-deleted

**Mitigare existentă:**
- OCC `seating_editor_states.revision` per (wedding_id, event_id) previne overwrite necontrolat dacă event-ul B avea state separat
- VERSION_MISMATCH error la sync cu version stale → clientul primește 409 → UI arată dialog conflict
- **DAR** dacă `seating_editor_states` pentru event B e proaspăt (revision = 0), sync-ul cross-event reușește

**Severity: 🟢 LOW** — edge case foarte specific (schimb event sub 1500ms), mitigare prin OCC mostly funcțională.

**Fix simplu (vezi Faza 6.A):** `useEffect` cu deps `[eventId]` și cleanup function care clear `syncTimerRef`:
```javascript
useEffect(() => {
  return () => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  };
}, [eventId]);
```

---

### C10 — Idempotency framework race window + cleanup gap

**Severity:** 🟡 Medium (mitigated by OCC pentru seating)
**Status:** ✅ CONFIRMAT parțial

**Evidență (surse):**
- `lib/supabase/idempotency.ts`:67-98 (pattern SELECT-then-INSERT)
- `supabase/migrations/20260408000001` (tabela idempotency_keys)
- `app/api/weddings/[weddingId]/seating/sync/route.ts`:83-118 (singurul consumer)

**Detaliu:**

#### Framework există + e parțial corect

**Storage:** tabel DB `idempotency_keys` cu:
- `request_hash text NOT NULL UNIQUE` — UNIQUE constraint la DB level ✅
- `client_operation_id uuid NOT NULL`
- `app_user_id, wedding_id, rpc_name, response jsonb, created_at`
- Index pe `request_hash` și `created_at`
- RLS: INSERT/SELECT doar pentru `app_user_id = auth_user_id()`

**Hash:** SHA-256 hex al `app_user_id + wedding_id + JSON.stringify(payload, sortedKeys) + client_operation_id` ✅ chei sortate alfabetic

**`client_operation_id`:** generat client-side cu `crypto.randomUUID()` în `lib/seating/use-seating-sync.ts`:317:
```javascript
if (retryCount === 0) {
  operationIdRef.current = crypto.randomUUID();
}
```
Generat O SINGURĂ DATĂ per intenție de Save, reutilizat la retry-uri. ✅

#### TTL — declarativ doar, ZERO implementare

Comentariu migration L6, L51: "Cleanup automat după 24h (Edge Function sau PG Cron)". 

Verificat empirical: `grep "cleanup_idempotency|pg_cron"` → niciun job de cleanup definit.

**Tabela crește indefinit.** Operațional issue medium-term (storage + index efficiency).

#### Pattern atomic vs race-prone

`lib/supabase/idempotency.ts`:67-98:
```javascript
1. SELECT existing FROM idempotency_keys WHERE request_hash = X (maybeSingle)
2. if (existing !== null) → return existing.response
3. await execute()                          ← OPERAȚIA EFECTIVĂ
4. INSERT into idempotency_keys             ← UNIQUE constraint guard
5. if (insertError) → console.warn, NU re-throw
6. return result
```

**Race window: între pasul 1 (SELECT) și pasul 4 (INSERT) — operația poate dura sute de ms.** Două requests paralele cu același `request_hash` pot trece ambele de pasul 1 (ambele văd `existing === null`), execută operația (pasul 3), apoi:
- Pasul 4 #1 — INSERT reușește
- Pasul 4 #2 — INSERT eșuează cu UNIQUE violation → `console.warn`, NU re-throw, returnează result

**Scenariu real:**
- T+0ms: Request A — SELECT, vede null
- T+5ms: Request B — SELECT, vede null
- T+10-2000ms: **Ambele rulează `execute()` CONCURRENT pe DB**
- Operația în sine devine 2x — 2 sync-uri DB independente

**Race window confirmat la nivel de framework.** UNIQUE constraint blochează duplicarea **înregistrării** idempotency_keys, NU duplicarea **execuției operației**.

**Pattern CORECT ar fi fost:**
```sql
INSERT INTO idempotency_keys (request_hash, ...) 
VALUES (...) 
ON CONFLICT (request_hash) DO NOTHING 
RETURNING id, response;
```

Sau advisory lock: `pg_try_advisory_xact_lock(hash)` la începutul tranzacției.

**Codul actual face SELECT-then-INSERT clasic, vulnerabil între pașii 1 și 4.**

#### Adoption gap

**1 endpoint din 20 mutating folosește framework-ul** (seating/sync). Restul depind de:
- UNIQUE constraints DB (rsvp_responses (guest_event_id), guests, etc.)
- UPSERT cu onConflict
- Disciplină client-side (button disable, isSubmitting flag)
- Fără protecție explicită

**Endpoints care NU folosesc:**
- `/api/rsvp/[public_link_id]` POST (submit RSVP)
- `/api/rsvp/manual` POST
- `/api/rsvp/invitations` POST (regenerate link)
- `/api/guests` POST
- `/api/guest-events/*` (POST/PUT/PATCH/DELETE)
- `/api/guests/import` (CSV import)
- `/api/migrate-local`
- `/api/import/json`
- `/api/budget/*`, `/api/payments/*`
- `/api/account` DELETE
- `/api/auth/shadow-session` POST

#### Mitigare reală — OCC pentru seating

`supabase/migrations/20260409000003_rpc_sync_seating_v2_version.sql`:96:
```sql
IF p_version >= 0 AND NOT p_force AND v_current_revision != p_version THEN
  RAISE EXCEPTION 'VERSION_MISMATCH ...' USING ERRCODE = 'P0002';
END IF;
```

Dacă două requests concurente trec amândouă de idempotency check (race window), primul reușește, schimbă `v_current_revision`. Al doilea ajunge la OCC check, găsește versiune diferită → EXCEPTION P0002 → app-layer mapează la HTTP 409 VERSION_MISMATCH.

**OCC e backstop real** care previne dublu apply pe seating chiar și cu race window în idempotency framework.

#### Bonus findings

**A) Comentariu MISLEADING** în `idempotency.ts`:46:
```
"Race condition safe: INSERT ignoră conflictul pe request_hash (UNIQUE)"
```
Tehnic adevărat la nivel de **înregistrare** idempotency_keys (UNIQUE blochează duplicat), DAR FALSE la nivel de **operație efectivă** (execute() rulează concurent). **Comment-ul ascunde gap-ul real.**

**B) Fail-open silent** pe tabela lipsă (`idempotency.ts`:51):
```
"Non-fatal: dacă tabelul lipsește (ex: DEV fără migrație), operația se execută oricum"
```
Violare CLAUDE.md §2 "NU fallback silent — fail fast". În producție, dacă tabela e dropped accidental → idempotency NO-OP fără warning → toate operațiile devin race-prone silent.

**C) CSV import explicit vulnerabil prin design LOCKED:**
- Decizie LOCKED CLAUDE.md §6: "UNIQUE constraint (wedding_id, first_name, last_name): NU adăugăm" (legitimat — gemeni cu același nume)
- DAR: import CSV de 2x → 2 Marii apar în DB. Race vector documented intentional.

**D) Test coverage gap** — `idempotency.test.ts` testează cu mock-uri, **niciun test concurrent** care simulează race window real cu 2 apeluri paralele. Race-ul e **necovered**.

**Severity reală: 🟡 MEDIUM**

NU e launch blocker. OCC + UPSERT salvează seating + RSVP de catastrofe. DAR:
- Backward compat path fără idempotency — gap real pentru future integrations
- Tabela crește indefinit — operațional issue
- Audit log NU surface drift
- CSV import duplicate posibil

**Fix structural (vezi Faza 5.A):**
- Refactor `withIdempotency` la pattern atomic INSERT ON CONFLICT
- Adopt în toate 20 endpoints mutating
- PG Cron cleanup TTL 24h
- Audit log pe race detection
- Tests concurrente (property-based)

---

### C11 — Account DELETE broken global (coloana app_users.status fantomă)

**Severity:** 🔴 Critical (Launch blocker — GDPR Art. 17)
**Status:** ✅ CONFIRMAT empirical, AGRAVAT prin descoperire colaterală

**Evidență (surse):**
- `app/api/account/route.ts` (handler complet)
- `supabase/migrations/20260321000001_initial_schema.sql`:10-15 (schema app_users fără status)

**Detaliu:**

#### Bug critic NESEMNALAT de audit — coloana fantomă

Schema `app_users` (initial L10-15):
```sql
CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

ALTER pe `app_users`:
- `20260331115741_active_wedding_id.sql`:7-10 — ADD `active_wedding_id`
- **Niciun ALTER ADD COLUMN status în orice migration**

Verificat: `grep "app_users.*status|status.*column.*app_users|app_users.*ADD COLUMN.*status"` → zero hits.

**Coloana `status` referențiată în DELETE handler NU EXISTĂ.**

#### Consecințe runtime

```javascript
// L32
.select("id, status, email")
```

PostgREST: 400 `column app_users.status does not exist` → `userErr` non-null → return 404 USER_NOT_FOUND.

**Endpoint-ul DELETE /api/account returnează 404 USER_NOT_FOUND la PRIMUL pas pentru orice user real.**

**Nimeni nu poate să-și șteargă contul.** Pașii 4-11 nu se execută niciodată în practică.

**Bug funcțional global, prefață orice race/atomicitate.** Endpoint-ul e broken la primul SELECT, ca C4 (dashboard stats `seat_assignments.guest_id` fantomă).

#### Sub presupunerea că bug-ul ar fi fixat — atomicitate

`grep "FUNCTION delete_account|RPC.*account.*delete|delete_user"` → niciun rezultat.

`grep "BEGIN|COMMIT"` aproape de delete-cont logic → niciun rezultat.

**Niciun PostgreSQL stored procedure tranzacțional. Niciun BEGIN/COMMIT block.** Toate cele 9-11 operații sunt HTTP-uri independente prin Supabase JS client.

**Failure între pașii 5-10 lasă state hibrid, fără rollback automat.**

#### Failure scenarios sub bug-fix ipotetic

**Pasul 6 (DELETE wedding_members) ucide membership-urile.** Dacă pasul 7 (soft delete weddings) eșuează → wedding-urile rămân `deleted_at IS NULL` (active), dar niciun member asociat → wedding orfan accesibil prin RLS doar service_role.

**Pasul 9 (DELETE identity_links) elimină providerul WP.** Dacă pasul 10 (DELETE app_users) eșuează → app_users.id rămâne, dar niciun identity_link. Userul:
- Re-login WP → bootstrap caută `identity_links.external_user_id = wp_user_id` → nimic → trigger flow provision → INSERT `app_users` cu noul id → orfanul vechi rămâne în DB pentru totdeauna
- `app_users.email` UNIQUE → dacă email-ul e același la re-provision, INSERT eșuează cu UNIQUE violation → **user blocat la login**

**Pasul 10 (DELETE app_users) are FK constraints în 5+ tabele:**
- `identity_links` ON DELETE CASCADE (deja șters)
- `weddings.owner_user_id` fără ON DELETE CASCADE → DELETE eșuează cu FK violation dacă există weddings cu `owner_user_id = userId` și NOT soft-deleted
- `wedding_members` ON DELETE CASCADE (deja șters)
- `audit_logs.app_user_id` ON DELETE SET NULL ✅
- **`idempotency_keys.app_user_id` REFERENCES `app_users(id)` (NU CASCADE, NU SET NULL)** → DELETE eșuează cu FK violation dacă există rânduri idempotency_keys ale userului
- `app_users.active_wedding_id` REFERENCES weddings — DEFERRABLE INITIALLY DEFERRED, nu blochează direct

→ **Pasul 10 are mai multe motive deterministe să eșueze**, lăsând userul în stare hibrid permanentă cu identity_links șterse.

#### SOLE_OWNER guard — TOCTOU vulnerability

`L56-73`:
```javascript
const ownedWeddings = (memberships ?? []).filter((m: any) => m.role === "owner");
for (const owned of ownedWeddings) {
  const { data: otherOwners } = await supabaseServer
    .from("wedding_members")
    .select("id")
    .eq("wedding_id", owned.wedding_id)
    .eq("role", "owner")
    .neq("app_user_id", userId);
  if (!otherOwners || otherOwners.length === 0) {
    return errorResponse(409, "SOLE_OWNER", ...);
  }
}
```

**Race condition cross-device:**
- userX la T+0: SELECT memberships → vede userX e owner pe A
- userX la T+5: SELECT otherOwners pe A → vede userY → trece guard
- userY la T+10: SELECT memberships → vede userY e owner pe A
- userY la T+15: SELECT otherOwners pe A → vede userX → trece guard
- userX la T+20: DELETE wedding_members(userX) — succes
- userY la T+25: DELETE wedding_members(userY) — succes
- **Wedding A rămâne fără niciun owner viu → orfan permanent**

**Guard NU previne race-ul cross-device.**

#### Recovery flow — INEXISTENT

Sub presupunerea că coloana status ar exista:
- Userul stuck în `status="deleting"` (server crashed): nu poate retry — endpoint blochează la L41
- Userul stuck în `status="deletion_failed"`: nu poate retry — endpoint blochează la L45 cu mesaj "Contactează suportul"
- **Niciun endpoint admin** pentru cleanup state hibrid (`grep "delete_account.*recover|cleanup.*account"` zero hits)
- **Niciun job de reconciliere** (PG Cron, Edge Function)
- **Niciun monitoring** dedicat (nu există Sentry alert specific)

→ Userul cu state hibrid e dependent de intervenție manuală a "suportului" — care, având în vedere placeholder `[EMAIL CONTACT]` în privacy.html, **nu există ca canal funcțional**.

#### GDPR Art. 17 — datele orfane post-"delete"

Sub asumarea că DELETE ar funcționa (ipotetic), date care RĂMÂN:

| Tabel | Conținut orfan | Cauză |
|-------|---------------|-------|
| weddings (soft-deleted) | toate weddings ale userului fără alți members | doar `deleted_at` setat |
| events, guests, guest_events, tables, seats, seat_assignments, vendors, budget_items, payments, rsvp_responses | **toate datele wedding-ului** | weddings soft-deleted, ON DELETE CASCADE NU se declanșează (e UPDATE, nu DELETE) |
| rsvp_invitations | toate invitațiile, doar `is_active=false` | UPDATE flag, nu DELETE |
| audit_logs | evenimentele user → `app_user_id = NULL` | corect — anonimizat ✅ |
| idempotency_keys | toate idempotency records | **FK strict, BLOCHEAZĂ ștergerea app_users** |
| seating_audit_logs | seating events → ON DELETE CASCADE | corect — șterse ✅ |

**Rezultat practic GDPR Art. 17:** "ștergere" e soft delete + dezactivare token + DELETE `app_users` incomplet. **Datele complete (guests cu nume reale, eventul, planul, contractele cu vendor) persistă în DB după "ștergere cont".**

#### Bonus findings

**A)** `app_users.email` UNIQUE NOT NULL + lipsă cleanup orfani → dacă DELETE app_users reușește dar identity_links rămân (ipotetic invers), userul nu se mai poate provisiona cu același email. **Real-world:** dacă userul revine să își refacă contul, e blocked.

**B)** `weddings.owner_user_id` REFERENCES `app_users(id)` fără cascade → DELETE app_users pe user cu weddings (chiar și soft-deleted) → FK violation. **Soft delete păstrează weddings row → owner_user_id NOT NULL → blocked.**

**C)** Email confirmare `sendAccountDeletionEmail` trimis **înainte** de pașii destructive (pasul 7 înainte de pașii 9-10). Dacă pașii 9-10 eșuează, userul a primit deja email "ai fost șters" dar **contul există**. **Mesaj fals.**

**D)** Audit log entries `account.delete_requested` la L76 e scris înainte de orice schimbare. ÎNAINTE de pasul 4 (UPDATE status) care eșuează din cauza coloanei inexistente. **Audit log curent ar arăta `delete_requested` urmat de `delete_failed` pentru fiecare cerere** — pattern util pentru detection că endpoint-ul e broken global.

#### Compus cu C10 + S4

**+ C10:** `idempotency_keys` crește indefinit (lipsă cleanup) + FK strict pe app_users → DELETE app_users blocked silent → state hibrid permanent. **C10 + C11 se compun direct.**

**+ S4:** SOLE_OWNER guard verifică doar `wedding_members.role`, NU `weddings.owner_user_id`. Dacă diverge (transfer ownership flow viitor) → guard fals pozitiv → FK violation la pasul 10.

**Fix structural (vezi Faza 5.B):**
- Schema migration: ADD COLUMN `app_users.status, deletion_requested_at, scheduled_for_deletion_at`
- PostgreSQL function tranzacțional `delete_account_atomic` cu BEGIN/COMMIT
- FK fixes: `idempotency_keys.app_user_id` ON DELETE CASCADE; `weddings.owner_user_id` ON DELETE SET NULL
- Hard delete real (cu CASCADE proper) pentru weddings fără alți members
- Soft delete cu retention 30 zile + cancel flow
- SOLE_OWNER guard cu row lock (`FOR UPDATE`)
- Recovery endpoints (`/api/account/cancel-deletion`, `/api/admin/recover-stuck-deletion`)

---

### S3 — Security headers absente

**Severity:** 🔴 HIGH (Amplifier — compus cu S1+S2)
**Status:** ✅ CONFIRMAT empirical

**Evidență (sursă):**
- `next.config.mjs`:4 (singurul header global)

**Detaliu:**

**1 din 11 headers OWASP setat** (Permissions-Policy parțial cu doar `zoom=()`). 5% acoperire.

| Header | Setat? | Severity context WeddingList |
|--------|--------|----------------------------|
| Content-Security-Policy | ❌ | 🔴 HIGH (PostHog/Sentry/Resend SDK supply chain) |
| Strict-Transport-Security | ⚠️ extern (Vercel default) | 🟡 MEDIUM |
| X-Frame-Options | ❌ | 🔴 HIGH (clickjacking pe RSVP confirm + account delete) |
| Referrer-Policy | ❌ | 🔴 HIGH (compus cu S1 + S2) |
| X-Content-Type-Options | ❌ | 🟡 MEDIUM |
| Permissions-Policy | parțial (zoom=()) | 🟢 LOW |
| COOP/CORP/COEP | ❌ | 🟢 LOW |

#### Combinație critică cu audit-uri anterioare

**Referrer-Policy missing AMPLIFICĂ DIRECT problema S1 + S2:**

- `public_link_id` proiectat ca "secret URL" (95 bits entropy, NICIODATĂ regenerat automat)
- DAR: PostHog mount pe root layout → trimite `$pageview` cu URL-ul `/rsvp/{public_link_id}` la PostHog Inc. **direct**
- DAR: RLS open la anon (S1) → cine află public_link_id poate exfiltra/falsifica direct prin Supabase

**Lanțul de leak:**
1. Guest deschide `/rsvp/abc123xyz`
2. PostHog SDK captures `$pageview` event cu `$current_url=https://app.weddinglist.ro/rsvp/abc123xyz`
3. Trimis la PostHog Inc. (US-hosted possibly)
4. **Atacator cu acces la PostHog dashboard (sau breach PostHog) → are TOATE public_link_id**
5. Cu RLS open (S1) → exfiltrare totală + falsificare RSVP

**Asta e amplificare exponențială**, nu adunare liniară. **S1 + S2 + S3 împreună = vulnerabilitate compusă mult mai gravă decât suma.**

#### Bonus finding nedocumentat de audit

`/api/export/json` + `/api/export/pdf` emit user data **fără `Cache-Control: no-store`** → proxy intermediar / browser cache poate persista date personale.

**Fix structural (vezi Faza 3.A):** `next.config.mjs` updated cu toate headers OWASP standard + CSP report-only mode 1 săptămână înainte de enforce + Referrer-Policy `no-referrer` specific pe rute publice + PostHog dezactivat pe rute publice.

---

### S4 — RLS role-blind (defense-in-depth)

**Severity:** 🟡 MEDIUM acum, 🔴 HIGH future
**Status:** ✅ CONFIRMAT structural, ❌ exploit nu funcționează acum

**Evidență (surse):**
- `supabase/migrations/20260328000001_rls_policies.sql`:35-48 (is_wedding_member)
- 14 policies UPDATE/DELETE pe tabele operaționale

**Detaliu:**

| Layer | Role-aware? |
|-------|-------------|
| **App-layer** (requireWeddingAccess + ROLE_HIERARCHY) | ✅ Funcționează corect, 27 call sites verificate |
| **RLS layer** (is_wedding_member) | ❌ NU diferențiază role — TRUE pentru orice membru |

**De ce exploit-ul nu merge ACUM:**

App-ul folosește **WordPress bootstrap**, NU Supabase Auth. Niciun JWT cu `sub` claim emis pentru useri. Toate request-urile authenticated trec prin `supabaseServer` cu service_role.

Pentru ca atacul să funcționeze, viewer-ul ar avea nevoie să obțină un JWT Supabase valid → nu există flow care să-l producă.

**DAR gap-ul e REAL ca defense-in-depth.** RLS depinde 100% pe app-layer corectness. Dacă vreodată:
1. Se introduce Supabase Auth (planificat?)
2. Se face MCP integration cu JWT generation
3. Un developer uită `minRole` pe endpoint nou
4. Există service_role leak

→ Atunci viewer poate face writes pe orice tabel cu acces.

#### Bonus findings

**A) `partner` și `planner` roluri** (rank 4 și 3) declarate în schema + ROLE_HIERARCHY — dar **NICIUN endpoint** nu folosește `minRole: "partner"` sau `"planner"`. **Roluri dead în codebase**, doar viewer + editor sunt active.

**B) Două surse de adevăr "ownership"**:
- App-layer citește `wedding_members.role = 'owner'`
- `is_wedding_owner()` RLS function citește `weddings.owner_user_id`

Dacă vreodată se implementează "transfer ownership" flow, **drift garantat**.

**C) `data_migrations_delete_owner` = SINGURUL DELETE policy role-aware**. Toate celelalte 15+ tabele permit DELETE pentru orice membru via RLS — bug latent dacă vreodată app-layer se rupe.

**Fix structural (vezi Faza 3.C):**
- PostgreSQL function `is_wedding_role(_wedding_id, _min_role)` cu hierarchy comparison
- RLS policies actualizate pe 14 tabele operaționale: UPDATE/DELETE folosesc `is_wedding_role(wedding_id, 'editor')`
- Tests integration cu mock JWT pentru fiecare role + operation matrix

---

### Email RSVP broken (URL mismatch + schema gap)

**Severity:** 🟡 Medium (Feature dormant — RESEND_API_KEY absent)
**Status:** ✅ CONFIRMAT empirical, AGRAVAT

**Evidență (surse):**
- `lib/rsvp/send-invitation-email.ts`:44 (URL cu rawToken)
- `app/api/rsvp/[public_link_id]/route.ts`:46 (lookup pe public_link_id)
- `app/api/rsvp/invitations/route.ts`:124 (`to: ""` hardcoded)

**Detaliu:**

**Email channel DOUBLE-BROKEN:**

1. **URL mismatch:** email generează `/rsvp/<64-hex-rawToken>` dar public route lookup pe coloana `public_link_id` (16 nanoid chars). Match imposibil — different length, different charset, different source.

2. **`to: ""` hardcoded** + **schema `guests` table NU are coloană email** → chiar și dacă RESEND_API_KEY se configurează, Resend respinge cu 422.

**Status efectiv:**
- Email RSVP NU funcționează (RESEND_API_KEY absent)
- Dacă cineva activează RESEND_API_KEY mâine fără să rezolve cele 2 bugs → email-uri eșuate cu 422 + DB invitations create dar guests nu primesc nimic + log noise
- Workaround-ul WhatsApp/clipboard din dashboard FUNCȚIONEAZĂ (folosește `getPublicRsvpUrl(publicLinkId)` corect)

**Fix structural (vezi Faza 1.D):** Schema migration ADD COLUMN `email TEXT` pe guests + URL fix cu `publicLinkId` în loc de `rawToken` + UI guest list capture email opțional + RESEND_API_KEY configurare pre-launch.

---

### S5 — CSRF gaps (3 endpoints)

**Severity:** 🟡 Medium / 🟢 Low (Defense-in-depth, NU exploitable currently)
**Status:** ✅ CONFIRMAT empirical (audit citat 2, plus 1 bonus finding)

**Evidență (surse):**
- `app/api/account/route.ts`:21 (DELETE fără checkOrigin)
- `app/api/auth/shadow-session/route.ts`:40 (POST fără checkOrigin)
- `app/api/import/json/route.ts`:23 (POST fără checkOrigin) — **bonus finding**

**Detaliu:**

| Endpoint | Audit zicea | Realitate | Severity actuală |
|----------|------------|-----------|------------------|
| `account DELETE` | Critical CSRF gap | Defense-in-depth gap, exploit improbabil în browsere moderne (SameSite=Strict + CORS preflight pe DELETE) | 🟡 Medium |
| `shadow-session POST` | Critical CSRF gap | Idempotent refresh, NO useful exploit possible | 🟢 Low |
| `import/json POST` | NU citat în audit | Same gap | 🟡 Medium (bonus finding) |

**17/20 routes mutating au checkOrigin. 3 nu (+1 by-design pentru RSVP public).**

**Audit-ul a fost factual corect, dar a EXAGERAT severity pe shadow-session** (e literalmente unexploitable cu cookies httpOnly + SameSite=Strict + token JWT signed).

**Bonus catch:** `import/json POST` **NU era în audit**. Asta înseamnă audit-ul nostru e parțial — pot fi alte spots pe care nu le-a verificat. La security sprint, audit complet routes mutating va trebui făcut systematic.

**Fix structural (vezi Faza 3.B):** add `checkOrigin(request)` la cele 3 endpoints + CI check care assert toate routes mutating au checkOrigin.

---

### S6 — Export endpoints fără Cache-Control no-store

**Severity:** 🟡 Medium (Privacy hygiene)
**Status:** ✅ CONFIRMAT (bonus finding din research S3)

**Evidență:**
- `app/api/export/json/route.ts`:62-65 (Content-Type pdf, NU Cache-Control)
- `app/api/export/pdf/route.ts`:181-184 (idem)

**Detaliu:**

Export endpoints emit user data (nume guests, dietary notes, RSVP status, budget, etc.) fără `Cache-Control: no-store`. Proxy intermediar / browser cache poate persista date personale.

**Fix structural (parte din Faza 3.A):** add `Cache-Control: no-store` pe toate API routes care return PII.

---

## 3. Pattern systemic: schema drift

### Cauza rădăcină identificată

**6 din 9 launch blockers (plus C4 HIGH) au aceeași cauză rădăcină:**

```
Schema migration → ALTER TABLE adds/removes coloana X
        ↓
Application code → folosește coloana Y (inexistentă) sau
                   omite coloana Z (NOT NULL)
        ↓
TypeScript verde (tipuri Supabase NU sunt regenerate)
        ↓
Tests verzi (rulează pe MOCK Supabase, NU DB real)
        ↓
npm run build verde
        ↓
Husky hooks trec
        ↓
PR merged
        ↓
Production deploy
        ↓
Runtime SQL error 42703 / 23502 / NOT NULL violation
        ↓
Endpoint returnează 500 sau silent failure
```

### Bug-uri afectate

| # | Issue | Coloana fantomă / NOT NULL violation |
|---|-------|--------------------------------------|
| C4 | Dashboard stats | `seat_assignments.guest_id` (fantomă, corect = `guest_event_id`) |
| C5 Export | tables query | `tables.deleted_at` (fantomă) |
| C5 Import | wedding INSERT | `weddings.location_name` (fantomă), `owner_user_id` NOT NULL (lipsă) |
| C5 Import | events INSERT | `events.ends_at` (fantomă) |
| C5 Import | guests INSERT | `guests.email`, `guests.phone`, `guests.group_id` (fantomă) |
| C5 Import | tables INSERT | `tables.type` (fantomă, corect = `table_type`) |
| C5 Import | budget INSERT | `budget_items.sort_order` (fantomă) |
| C5 Import | payments INSERT | `payments.notes` (fantomă, corect = `note`) |
| C6 | PDF export | same `tables.deleted_at` |
| **C7** | **rsvp_invitations INSERT** | **`event_id` NOT NULL (lipsă)** |
| **C8** | **rsvp_responses UPSERT** | **`invitation_id` NOT NULL (set null)** |
| **C11** | **Account DELETE** | **`app_users.status` (fantomă)** |

### Implicație critică

**Probabil mai există bugs din aceeași clasă** în alte consumers pe care nu i-am verificat. **Fix-ul TREBUIE să fie la nivel pipeline (Faza 0), NU bug-by-bug.**

### Soluție structurală (Faza 0.A)

1. **Supabase TypeScript types regenerated** la fiecare migration:
   - Pre-commit hook: `npx supabase gen types typescript --local > types/database.ts`
   - Husky fail-ează commit dacă types out of sync
   - Supabase JS client cu strict typing: `createClient<Database>(...)`
   - **Asta face TS să prindă INSTANT bugs ca `seat_assignments.guest_id` la compile time**

2. **Integration tests cu Supabase DEV real:**
   - Vitest profile separat (`vitest.integration.config.ts`) contra Supabase DEV
   - Suite per endpoint critic
   - Test fixtures: seed wedding, events, guests
   - CI pipeline: integration tests obligatorii înainte de merge

3. **Schema validation runtime** (defense-in-depth):
   - `lib/db/schema-guard.ts` la app startup face `SELECT column_name FROM information_schema.columns`
   - Compară cu schema declarată în code
   - Drift → throw fatal, refuse to start app
   - **Deploy fail rapid** dacă cineva uită să ruleze migration pe prod

4. **Migration testing CI:**
   - Fiecare PR cu migration nouă → CI rulează up + down + up
   - Testează rollback + idempotency
   - Verifică tipurile post-migration vs cod

---

## 4. GDPR violations matrix

**7 articole GDPR violate cumulativ, confirmate empirical:**

| Articol | Descriere | Violare confirmată în | Severity |
|---------|-----------|----------------------|----------|
| **Art. 5(1)(d)** | Acuratețe — date personale "accurate and kept up to date" | C3 (RSVP overwrite fără audit, fără identity check) | 🔴 Critical |
| **Art. 6** | Lawful basis pentru procesare | S2 (PostHog fără consent, fără basis declarat) | 🔴 Critical |
| **Art. 13** | Information to be provided (transparency) | S2 (privacy.html declară "Nu utilizăm cookie-uri de tracking" — FALSE) | 🔴 Critical |
| **Art. 15** | Right of access | C5+C6 (export broken, user nu poate primi datele) | 🔴 Critical |
| **Art. 17** | Right to erasure | C11 (account DELETE broken global + soft delete păstrează datele complete) | 🔴 Critical |
| **Art. 20** | Right to data portability | C5+C6 (niciun format funcțional, vendor lock-in total) | 🔴 Critical |
| **Art. 28** | Processor agreements | S2 (PostHog Inc. nedeclarat în privacy §5, DPA neîncheiat probably) | 🔴 Critical |

**Plus ePrivacy/Legea 506/2004 RO:**
- Stocare cookies non-strict-necesare fără consent prealabil = încălcare directă, sancționabilă separat de GDPR

**Plus posibil Schrems II issue** dacă PostHog cloud e US-hosted (`us.i.posthog.com`):
- SCC obligatorii
- Transfer Impact Assessment
- Privacy.html §6 menționează SCC doar pentru Vercel/Resend (NU PostHog)

### Cost real GDPR pentru startup RO

**ANSPDCP (autoritatea RO):**
- Sancțiuni tipice first violation: 5,000 - 50,000 RON
- Pentru breach categorii sensibile sau lawful basis violation: până la 20M EUR sau 4% turnover (Art. 83(5))

**Risc real WeddingList:** o reclamație guest sau competitor → audit ANSPDCP → fine + remediu obligatoriu + publicitate negativă.

### Drepturi GDPR care NU sunt implementabile pe codul curent

| Drept | Promis în privacy | Implementabil acum? |
|-------|-------------------|---------------------|
| Art. 15 Acces | ✅ | ❌ export broken |
| Art. 16 Rectificare | ✅ | ✅ UI permite edit |
| Art. 17 Ștergere | ✅ | ❌ DELETE broken global |
| Art. 18 Restricționare | ✅ | ❌ niciun mecanism |
| Art. 20 Portabilitate | ✅ | ❌ niciun format funcțional |
| Art. 21 Opoziție | ✅ | ⚠️ doar email placeholder necompletat |

**4 din 6 drepturi promise sunt NEMARCABILE pe codul curent.**

---

## 5. Bonus findings nedocumentate de audit

Pe parcursul investigației empirice, am descoperit **probleme adiționale care NU erau în audit-ul original**:

1. **`import/json POST` fără CSRF check** (S5 — al treilea endpoint)
2. **Export endpoints fără `Cache-Control: no-store`** (S6 — privacy hygiene)
3. **`partner` și `planner` roluri DEAD în codebase** (S4 — niciun endpoint le folosește)
4. **`is_wedding_owner` comment vs utilizare divergent** (S4)
5. **PDF export broken cu același bug ca JSON** (`tables.deleted_at` fantomă)
6. **Settings page linkează export broken ÎNAINTE de DELETE cont** — user pierde datele
7. **Honey pot UI bug** (C2) — user real care activează accidental honey pot vede "Mulțumim!" dar nu se salvează nimic
8. **Comentariu MISLEADING în idempotency.ts** (C10) — declară "Race condition safe" dar protejează doar înregistrarea, nu execuția
9. **Fail-open silent în idempotency** pe tabela lipsă — violare CLAUDE.md §2 "fail fast"
10. **Email confirmare DELETE trimis ÎNAINTE de pașii destructive** (C11) — mesaj fals dacă DELETE eșuează
11. **`wedding_members` neexportate în JSON export** — colaboratori pierduți la backup
12. **`vendors` neexportate** — orfan FK pe budget_items.vendor_id
13. **Currency default schimbat silent EUR → RON** la import → distorsionare costuri ~5x
14. **Schema_version strict "1.0"** — backups vechi neimportabile la orice migration
15. **Mesaje hardcoded engleză** în export (CLAUDE.md §2 declară RO obligatoriu)
16. **Tests rulează pe mock-uri** — niciun integration test cu DB reală
17. **Tipurile Supabase NU sunt regenerate post-migration** — TS strict NU prinde drift
18. **`idempotency_keys` table grow indefinit** (C10) — lipsă PG Cron cleanup
19. **`used_at` coloana fantomă funcțional** (C3) — declarată în schema + comentariu, niciodată setată/citită
20. **`responded_at` overwrite la fiecare submit RSVP** — primul timestamp pierdut

---

## 6. Plan acțiune complet (6 faze)

### Principii LOCKED pentru tot planul

1. **Zero workaround.** Fiecare bug se rezolvă structural la nivel arhitectural, NU la simptom.
2. **Fix the pipeline before fixing the bugs.** Pattern-ul "TS verde, runtime broken" e cauza rădăcină. Reparat o dată → previne următoarele 50 de bugs din aceeași clasă.
3. **Tests integration cu DB reală** — nu mock-uri.
4. **Atomicity by default.** Toate operațiile multi-step → stored procedures cu BEGIN/COMMIT.
5. **Audit log per-step**, nu doar success/failure coarse.
6. **Defense-in-depth.** RLS + app-layer + UI guards = 3 layere independente.
7. **Documentation = single source of truth.** Schema, types, audit, recovery flows.

### Faza 0 — Infrastructure (PRECONDIȚIE)

**Scop:** Fix-ul care face fix-urile celelalte sustainable.

**Faza 0.A: Schema drift prevention pipeline (12-20h)**

1. Supabase TypeScript types regenerated la fiecare migration (Husky pre-commit hook)
2. Strict typing client: `createClient<Database>(...)`
3. Integration tests cu Supabase DEV real (Vitest profile separat)
4. Schema validation runtime (`lib/db/schema-guard.ts`) — fail rapid pe drift
5. Migration testing CI (up + down + up)

**Faza 0.B: Audit log infrastructure consolidation (6-10h)**

1. `wl_audit_step()`, `wl_audit_diff()`, `wl_audit_actor()` extensions
2. Audit log apelat OBLIGATORIU pe toate mutațiile sensibile
3. Reverse-lookup capability (debug endpoint în DEV)

**Total Faza 0: 18-30h**

### Faza 1 — RSVP Reconstruction (32-52h)

**Scop:** Modulul RSVP refactorizat de la zero contra arhitecturii corecte.

**Faza 1.A: Schema RSVP reconstructed (8-14h)**
- Migration `20260501000001_rsvp_reconstruction.sql`
- Pivot table `rsvp_invitation_events` (un link unic per guest, multiple events)
- Shadow invitation pattern pentru manual override (păstrează FK integrity)
- History tracking `rsvp_response_versions` + trigger BEFORE UPDATE
- Sync trigger AFTER INSERT/UPDATE pe rsvp_responses → guest_events
- Mapping enum: `accepted → attending`
- Backfill rows existente
- One-time/multi-time enforcement opțional (`wedding.rsvp_modifiable BOOLEAN`)

**Faza 1.B: RSVP RLS fix structural (4-8h)**
- Decizie LOCKED: anon zero acces RSVP → toate operațiile prin Next.js API + service_role server-side
- RLS strict pentru anon

**Faza 1.C: RSVP application code refactor (16-24h)**
- POST /api/rsvp/invitations — body cu `event_ids: string[]`, RPC tranzacțional
- POST /api/rsvp/manual — shadow invitation pattern + audit log
- POST /api/rsvp/[public_link_id] — partial response cu warning, pre-submit re-fetch
- UI guest re-deschidere link cu warning + history
- Email confirmare guest la fiecare submit (defense împotriva link forwarding takeover)

**Faza 1.D: Email RSVP fix structural (4-6h)**
- Schema ADD COLUMN `email TEXT` pe guests
- CSV import support email
- UI guest list email opțional
- URL fix cu `publicLinkId`
- RESEND_API_KEY configurare

### Faza 2 — GDPR Compliance (16-28h)

**Faza 2.A: PostHog consent flow proper (6-10h)**
- Consent banner restructurat (3 opțiuni: essential / accept all / personalizează)
- PostHog init gated pe consent
- Reactive `posthog.opt_out_capturing()` la decline
- Defense-in-depth: `disable_session_recording`, `autocapture: false`

**Faza 2.B: Privacy policy + GDPR docs rewrite (8-14h)**
- Privacy.html completat (placeholders, PostHog declarat, cookies detaliat)
- DPA cu PostHog verificat/semnat
- GDPR rights endpoints (`/api/gdpr/access`, `/erasure`, `/object`)
- Cookie banner UX (3 layere)

**Faza 2.C: Schrems II compliance (2-4h)**
- Verifică instanță PostHog (EU vs US)
- Migrare la EU instance dacă necesar
- TIA documentat dacă US

### Faza 3 — Security Hardening (17-28h)

**Faza 3.A: Security headers complete (6-10h)**
- CSP, HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, COOP/CORP
- CSP report-only mode 1 săptămână înainte de enforce
- PostHog dezactivat pe rute publice (`/rsvp/*`)
- `Cache-Control: no-store` pe API routes care return PII

**Faza 3.B: CSRF gaps fix (1-2h)**
- account DELETE, shadow-session POST, import/json POST → checkOrigin
- CI check assert toate routes mutating au checkOrigin

**Faza 3.C: RLS roluri (defense-in-depth) (6-10h)**
- PostgreSQL function `is_wedding_role(_wedding_id, _min_role)`
- RLS policies actualizate pe 14 tabele operaționale
- Tests integration cu mock JWT

**Faza 3.D: Rate limiting hardening (4-6h)**
- Rate limit fail-CLOSED (refuse requests dacă Redis down) + monitoring alert
- Per-endpoint rate limits granulare
- Audit log pe rate limit hits

### Faza 4 — Data Portability & Export/Import (36-54h)

**Faza 4.A: Export rewrite (16-24h)**
- Format versionat strict `schema_version: "2.0"`
- Multi-format (JSON pentru re-import, CSV per tabelă, PDF pentru print)
- Schema validation runtime (folosește schema-guard)
- Streaming pentru weddings mari (NDJSON)
- Bug `tables.deleted_at` fix (decide intenționat sau bug)

**Faza 4.B: Import rewrite (14-20h)**
- Tranzacțional via PostgreSQL function `import_wedding_v2`
- Schema validation strict cu Zod
- Idempotency cu `idempotency_key`
- Schema migration logic v1.0 → v2.0

**Faza 4.C: Tests roundtrip (6-10h)**
- Integration test mandatory: export → import → assert state restored identical
- Property-based tests (fast-check sau similar)
- CI check: every PR runs roundtrip test

### Faza 5 — Data Integrity Hardening (30-46h)

**Faza 5.A: Idempotency framework adoption universal (12-18h)**
- Refactor `withIdempotency` la pattern atomic `INSERT ON CONFLICT DO NOTHING RETURNING`
- Adopt în toate 20 endpoints mutating
- PG Cron cleanup TTL 24h
- Audit log pe race detection

**Faza 5.B: Account deletion structural rewrite (16-24h)**
- PostgreSQL function tranzacțional `delete_account_atomic`
- Schema fix: ADD COLUMN `app_users.status, deletion_requested_at, scheduled_for_deletion_at`
- Tabelă `deleted_users` pentru audit/compliance
- FK fixes: `idempotency_keys.app_user_id` ON DELETE CASCADE; `weddings.owner_user_id` ON DELETE SET NULL
- Hard delete real pentru weddings fără alți members
- Soft delete cu retention 30 zile + cancel flow
- SOLE_OWNER guard cu row lock (`FOR UPDATE`)
- Recovery endpoints

**Faza 5.C: Dashboard stats fix (2-4h)**
- `seat_assignments.guest_id` → `seat_assignments.guest_event_id`
- `Promise.all` → `Promise.allSettled`
- Integration test pe `/api/dashboard/stats`

### Faza 6 — Polish + Tests (25-38h)

**Faza 6.A: C9 fix (1-2h)**
- `useEffect` cleanup pe `[eventId]` care clear `syncTimerRef`

**Faza 6.B: Documentation update (4-6h)**
- CLAUDE.md updated cu decizii LOCKED noi
- HANDOFF.md marcat fazele complete
- ROADMAP.md updated cu Faza 13
- CHANGELOG.md entry per PR

**Faza 6.C: Test coverage gaps (20-30h)**
- Integration test suite complete contra Supabase DEV
- E2E test suite Playwright (login → wedding → guests → invitations → RSVP → updates)
- CI integration: all tests must pass înainte de merge

### SUMĂ TOTALĂ

| Fază | Min | Max |
|------|-----|-----|
| Faza 0 — Infrastructure | 18h | 30h |
| Faza 1 — RSVP Reconstruction | 32h | 52h |
| Faza 2 — GDPR Compliance | 16h | 28h |
| Faza 3 — Security Hardening | 17h | 28h |
| Faza 4 — Data Portability | 36h | 54h |
| Faza 5 — Data Integrity | 30h | 46h |
| Faza 6 — Polish + Tests | 25h | 38h |
| **TOTAL** | **174h** | **276h** |

**Media: ~225h focused work.**

### Secvența recomandată (paralelizare)

**Ordine STRICT obligatorie:**

1. **Faza 0 PRIMA** — fără infrastructure, restul fixurilor sunt construit pe nisip.
2. **Faza 5.C (dashboard) + 6.A (C9)** quick wins paralel cu Faza 0.
3. **Faza 1 (RSVP)** — feature core broken, prioritate maximă după infra.
4. **Faza 4 (Export/Import)** poate începe în paralel cu Faza 1.B după ce schema RSVP e finalizată.
5. **Faza 2 (GDPR)** — paralel cu Faza 1 (nu interactionează).
6. **Faza 3 (Security)** — paralel cu Faza 5 (independente).
7. **Faza 5.A + 5.B** — DUPĂ Faza 0 + Faza 4.
8. **Faza 6 (Polish)** — final.

---

## 7. Decizii LOCKED noi

**Pentru CLAUDE.md §10 — adăugat post-audit pre-launch:**

### Schema-code consistency

- **TypeScript types Supabase regenerate OBLIGATORIU** după fiecare migration (Husky pre-commit hook)
- **Supabase JS client cu strict typing**: `createClient<Database>(...)` — NU `createClient(...)`
- **Schema-guard runtime**: app refuze să pornească dacă DB schema diferă de schema declarată în code
- **Niciun ALTER TABLE în Supabase UI** (deja LOCKED, reafirmat)
- **Migrations: up + down + up testat în CI** — verifică rollback + idempotency

### Tests integration

- **Tests unit pe mock-uri = NU SUFICIENT.** Pentru orice consumer DB, OBLIGATORIU integration test cu Supabase DEV real.
- **CI pipeline: integration tests obligatorii înainte de merge.**

### RSVP architecture

- **Anon zero acces RSVP via Supabase JS direct.** Toate operațiile RSVP trec prin Next.js API routes cu `service_role` server-side.
- **`rsvp_invitations.event_id` rămâne NOT NULL** — invitation = `(guest, event)` pereche, NU `(guest, wedding)`.
- **Pivot table `rsvp_invitation_events`** pentru a permite un link unic cu multiple events.
- **Shadow invitation pattern** pentru manual override (NU `invitation_id: null`).
- **History tracking obligatoriu** — `rsvp_response_versions` + trigger BEFORE UPDATE.
- **Sync trigger AFTER INSERT/UPDATE** pe `rsvp_responses` → `guest_events.attendance_status` cu mapping enum.
- **Email confirmare guest** la fiecare RSVP submit (defense împotriva link forwarding).

### Atomicity

- **Toate operațiile multi-step → PostgreSQL stored procedures cu BEGIN/COMMIT.** NU HTTP-uri independente prin Supabase JS.
- **Account deletion via `delete_account_atomic` RPC** — NU multiple HTTP calls.
- **Import wedding via `import_wedding_v2` RPC** — NU multiple HTTP calls.

### Audit log

- **Audit log per-step** pe toate operații sensibile (NU doar success/failure coarse).
- **`wl_audit` apelat OBLIGATORIU** pe: account deletion (per-step), RSVP submit (cu before/after pentru overwrite), manual override, member add/remove, bulk operations, privacy ops.

### GDPR

- **Consent gate înainte de PostHog init.** Banner UI-only theater = forbidden.
- **Privacy policy must reflect realitate empirică.** Niciun "Nu utilizăm cookie-uri de tracking" dacă PostHog rulează.
- **Toate processors declarate în privacy §5** + DPA semnat.
- **GDPR rights endpoints obligatorii**: `/api/gdpr/access`, `/erasure`, `/object`.

### Security

- **Toate routes mutating → `checkOrigin` obligatoriu** (CI check enforce).
- **Headers OWASP standard pe toate response-urile** (CSP, HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, COOP/CORP).
- **`Cache-Control: no-store`** pe toate API routes care return PII.
- **PostHog dezactivat pe rute publice** (`/rsvp/*`) — minimize public_link_id leak surface.
- **Rate limit fail-CLOSED** — refuse requests dacă Redis down + monitoring alert.

### Idempotency

- **Pattern atomic `INSERT ON CONFLICT DO NOTHING RETURNING`** — NU `SELECT-then-INSERT`.
- **Adopt în toate 20 endpoints mutating** (NU doar 1).
- **PG Cron cleanup TTL 24h** pe `idempotency_keys`.
- **Audit log pe race detection** (când CONFLICT apare).

### RLS

- **`is_wedding_role(_wedding_id, _min_role)`** — NU `is_wedding_member` (role-blind).
- **RLS policies UPDATE/DELETE pe 14 tabele operaționale** folosesc `is_wedding_role(wedding_id, 'editor')`.

### Documentation

- **Comentarii cod = obligatoriu să reflecte realitatea.** Niciun "One-time: used_at setat la primul submit valid" dacă codul nu o face.
- **Single source of truth** pentru fiecare decizie arhitecturală: schema/code/comments aliniate.

---

## 8. Plase de siguranță suplimentare

Dincolo de fix-uri, adăugate pentru defense-in-depth pe termen lung:

1. **Schema drift detection runtime** (Faza 0.A.3) — refuză deploy dacă schema DB ≠ schema cod
2. **Migration testing CI** (Faza 0.A.4) — up + down + up pe fiecare PR
3. **CSP report-only** înainte de enforce — colectează violations 1 săptămână
4. **CSRF audit CI** — assert toate routes mutating au `checkOrigin`
5. **Audit log per-step** pe toate operații sensitive — investigare incident easy
6. **History tracking RSVP modifications** — never lose data + timeline complet
7. **Email confirmare guest** — defense împotriva link forwarding takeover
8. **Account deletion 30-day soft hold** + recovery flow — protecție user împotriva regret/error
9. **Idempotency cleanup PG Cron** — previne table bloat
10. **Schema-guard la app startup** — fail rapid pe drift
11. **Roundtrip tests CI** — every export change retested cu import end-to-end
12. **Integration tests cu DB reală** — prinde bugs ca C4/C5/C7/C8/C11 la PR time
13. **Property-based tests** pentru export/import — fuzz testing real
14. **PostHog dezactivat pe rute publice** — minimize public_link_id leak surface
15. **Rate limit fail-CLOSED** + monitoring — security > availability
16. **Per-endpoint granular rate limits** — RSVP submit ≠ account delete

---

## 9. Anexă: prompts de investigație folosite

Pentru reproductibilitate viitoare, prompts folosite în această sesiune sunt arhivate în:

- Transcript: `/mnt/transcripts/2026-05-03-09-30-38-weddinglist-h42a-audit.txt`
- Format: prompt structurat per claim audit cu Step 1..N de verificare empirică
- Pattern: "Verificare empirical (NU edita)" + cod-search + analiză + verdict structurat

**Template prompt reutilizabil:**

```
INVESTIGAȚIE AUDIT — Punct [X]: [titlu]

Claim audit (citat): "[citat exact din audit]"

Hipoteza care trebuie verificată empirical:
[expansiune hipoteză]

Verificare empirical (NU edita):

Step 1 — [acțiune concretă cu cod-search]
Step 2 — [acțiune]
...

Output structural:
- [ce să găsim]
- [verdict]

NU patch, NU edit. Pure observation.
```

**Lecții metodologice:**

1. **Cere VERIFICARE EMPIRICĂ, NU patch** — Claude Code tinde să propună fix-uri imediate; control prin "NU patch, NU edit"
2. **Citează exact audit-ul** — în prompt, ca să poată verifica fidelitatea claim-ului
3. **Cere TABEL STRUCTURAT pentru output** — fielduri specifice, nu prose
4. **Recunoaște patterns** — bug-uri din aceeași clasă (schema drift) verificate cu același template
5. **Investighează compus** — interacțiunea dintre vulnerabilități (S1 + S2 + S3 leak chain)

---

## 10. Anexă: fișiere și linii cheie referențiate

### Migrations
- `supabase/migrations/20260321000001_initial_schema.sql` — schema base
- `supabase/migrations/20260328000001_rls_policies.sql` — RLS (open la anon RSVP la L487, 521, 529, 543)
- `supabase/migrations/20260330000001_seating_id_maps.sql`
- `supabase/migrations/20260331115741_active_wedding_id.sql`
- `supabase/migrations/20260401000001_rsvp_model.sql` — RSVP model addition (NU touch RLS)
- `supabase/migrations/20260404000001_audit_logs.sql` — audit infrastructure (parțial folosit)
- `supabase/migrations/20260405000001_add_public_link_id_rsvp.sql`
- `supabase/migrations/20260408000001` — idempotency_keys table
- `supabase/migrations/20260409000002` — RPC sync seating
- `supabase/migrations/20260409000003_rpc_sync_seating_v2_version.sql` — OCC version
- `supabase/migrations/20260409000004_audit_system_seating.sql`
- `supabase/migrations/20260414000001_security_hardening.sql` — NU touch RSVP RLS

### API routes
- `app/api/rsvp/[public_link_id]/route.ts`:46 (lookup), 161-289 (POST), 235-244 (silent drop), 268-279 (UPSERT)
- `app/api/rsvp/manual/route.ts`:62-72 (invitation_id null) — same drift pattern
- `app/api/rsvp/dashboard/route.ts`:6 (reads rsvp_responses only)
- `app/api/rsvp/invitations/route.ts`:104-118 (event_id lipsă), 124 (`to: ""` hardcoded)
- `app/api/dashboard/stats/route.ts`:46 (broken query)
- `app/api/account/route.ts`:21 (DELETE no CSRF), L32 (status fantomă)
- `app/api/auth/shadow-session/route.ts`:40 (POST no CSRF)
- `app/api/import/json/route.ts`:23 (POST no CSRF — bonus finding)
- `app/api/export/json/route.ts`:62-65 (no Cache-Control)
- `app/api/export/pdf/route.ts`:110 (deleted_at fantomă), 181-184 (no Cache-Control)
- `app/api/weddings/[weddingId]/seating/load/route.ts`:66 (reads guest_events.attendance_status)
- `app/api/weddings/[weddingId]/seating/sync/route.ts`:83-118 (idempotency consumer)

### Library code
- `lib/auth/dev-session.ts` — DEV bypass mock identity
- `lib/server-context/types.ts`:73-79 — ROLE_HIERARCHY
- `lib/server-context/require-wedding-access.ts`:77-89 — minRole enforcement
- `lib/rsvp/token.ts`:55-69 (validateTokenState ignoră responded_at)
- `lib/rsvp/send-invitation-email.ts`:44 (URL cu rawToken)
- `lib/rsvp/get-public-rsvp-url.ts` — workaround corect WhatsApp/clipboard
- `lib/rsvp/public-link-id.ts` — 16-char nanoid
- `lib/csrf.ts`:42 (returns null if no Origin)
- `lib/supabase/idempotency.ts`:46 (comment misleading), 51 (fail-open silent), 67-98 (race window)
- `lib/seating/use-seating-sync.ts`:317 (operationIdRef), 460 (useCallback deps)
- `lib/import/json-import.ts` — broken pe toate entitățile
- `lib/import/validate-import.ts`:41 (schema_version strict)
- `lib/export/json-export.ts`:139 (deleted_at fantomă)
- `lib/export/pdf-export.tsx` — read-only design
- `lib/csv/parse-guests.ts`:31-64 — HEADER_ALIASES

### UI
- `app/components/CookieConsent.jsx`:27 (banner promises essential only)
- `app/components/AppShell.jsx` — sidebar (data-testid added în PR #178)
- `app/dashboard/page.tsx`:106-119 (UI consumer error)
- `app/(public)/rsvp/[public_link_id]/page.tsx`:62-73 (form pre-populated)
- `app/lib/posthog/provider.tsx`:8 (init unconditional)
- `app/lib/posthog/pageview.tsx`:12-19 (manual capture)
- `app/layout.js`:33 (PostHogProvider mount root)
- `app/settings/page.tsx`:152-160 (modal confirm DELETE)
- `app/rsvp/page.tsx`:107-125 (generateLink), 252-269 (CSV export)
- `app/export/page.tsx` — UI broken
- `app/seating-chart/utils/seating-eligibility.ts`:22

### Config
- `next.config.mjs`:4 (only Permissions-Policy: zoom=())
- `middleware.ts`:110 (rate limit response)
- `playwright.config.ts` — webServer.env explicit
- `vercel.json` — NU EXISTĂ în repo

### Privacy/legal
- `public/privacy.html`:21, 71, 75-89, 84-87 (placeholders + false claims)

---

**Sfârșit document.**

> **Generat:** 2026-05-04
> **Status verificare:** 14/14 puncte audit nou + 6/6 puncte audit precedent confirmate empirical
> **Acțiune următoare:** Faza 0 — Infrastructure setup (vezi secțiunea 6)
