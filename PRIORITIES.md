# Priorități implementare — Weddinglist App
# Versiune LOCKED — Mar 27, 2026
# Surse: Claude (Anthropic) + ChatGPT (OpenAI) + Gemini (Google)

## Legendă
- Dificultate: Mică / Medie / Mare / Foarte Mare
- ROI: Mic / Mediu / Mare / Critic
- ✅ = done, ⚠️ = parțial, ⏳ = de făcut

---

## 🔴 MUST NOW (înainte de orice utilizator real)
> ✅ Verificate în sesiunea Mar 27, 2026: #4, #25, #26, #28

| # | Item | Dificultate | ROI | Note |
|---|------|-------------|-----|------|
| 1 | ✅ Source of truth map (WP=identity, Supabase=operational, localStorage=draft) | Mică | Critic | Documentat în CONTEXT |
| 2 | ✅ localStorage vs Supabase conflict policy (după login, Supabase wins) | Mică | Critic | localStorage = draft/recovery, nu adevăr operațional |
| 3 | ✅ Failure mode matrix (WP down / Supabase down / Vercel down / Resend down) | Mică | Critic | Cu fallback behavior concret per serviciu |
| 4 | ✅ generateTestData.js exclus din production bundle | Mică | Critic | Verificat — nu e importat nicăieri în app |
| 5 | ✅ RLS complet — audit + 71 policies pe 18 tabele, 3 helper functions, GRANT anon/authenticated. Verificat în Supabase DEV. | Medie | Critic | Migrație 20260328000001_rls_policies.sql aplicată și în repo. |
| 6 | ✅ CORS/CSRF documentat și configurat pe WP bridge | Medie | Critic | CORS allowlist explicit |
| 7 | ✅ Service role key audit — unde e folosit, unde e interzis | Mică | Critic | |
| 8 | ✅ Sentry PII scrubbing rules — ce NU intră în logs | Mică | Mare | Log behavior, not content |
| 9 | ✅ Structured logging policy (log behavior, not content) | Mică | Mare | Correlation ID / request ID per request |
| 10 | ✅ Environment variables documentate — unde, cine are acces | Mică | Mare | Protected env vars list |
| 11 | ✅ Deploy checklist — pași obligatorii înainte de merge în main | Mică | Mare | Include: teste verzi, lint, preview deploy verificat |
| 12 | ✅ Rollback procedure documentat pas cu pas | Mică | Mare | Rollback decision rule: când automat, când hotfix |
| 13 | ✅ Critical flows list pentru testing (auth, save, assign, RSVP submit) | Mică | Mare | Regression checklist pentru seating — cea mai sensibilă zonă |
| 14 | ✅ Data Model Invariants — constraints existente auditate, constraints lipsă documentate cu SQL gata de aplicat la Faza 3. | Medie | Critic | Nu te baza doar pe logica Next.js. DB = ultima linie de apărare |
| 15 | ✅ State Transitions definite — weddings, guest_events, rsvp_invitations, vendors, budget_items, data_migrations. Implementare în transitions.ts la Faza 3. | Medie | Critic | Tranziții valide only, interdicții clare |
| 16 | Business rules centralizate în domain/rules.ts — NU împrăștiate în hooks | Medie | Mare | Dacă logica RSVP e în 3 hooks = bug de securitate garantat |
| 17 | ✅ Input sanitization — server = securitate, client = UX (nu invers). Pattern + câmpuri documentate în CONTEXT.md. Implementare la Faza 3. | Medie | Critic | |
| 18 | ✅ Error Recovery UX — "Saving failed", "Work is safe locally", localStorage fallback | Medie | Critic | Critic pentru produs event-based. "Nu te îngrijora, am salvat totul în browser" |
| 19 | ✅ User Trust Signals — Saved ✔ / Syncing... / Offline mode | Mică | Mare | Ridică produsul la "tool serios" |
| 20 | ✅ System Boundaries — ce NU face fiecare layer + anti-pattern list | Mică | Mare | UI nu scrie DB direct, data layer nu știe de UI |
| 21 | ✅ Product Principles documentate (guest-first, max 2-3 pași, feedback instant, fără dead ends) | Mică | Mare | |
| 22 | ✅ First-run empty states — primul guest, prima masă, primul vendor | Medie | Mare | Success states, nu doar error states |
| 23 | ✅ Branch-to-environment map documentat | Mică | Mare | main=prod, develop=staging, feature/*=preview |
| 24 | ✅ README setup local de la zero + command cheat sheet | Mică | Medie | |
| 25 | ✅ Gravity Guard — coordonate x/y out-of-bounds resetate la centrul planului înainte de upsert | Mică | Critic | Verificat — Math.max/min pe PLAN_W/H în useSeatingData și useTableInteractions |
| 26 | ✅ Guest Collision — UNIQUE constraint pe guest_event_id în seat_assignments (DB level) | Medie | Critic | Verificat în Supabase DEV — seat_assignments_guest_event_id_key UNIQUE există |
| 27 | ✅ Soft Delete pentru nunți — deleted_at pe weddings, view active_weddings, RLS actualizat, RPC soft_delete_wedding(). Recovery 30 zile. | Mică | Mare | Migrație 20260328000002_soft_delete_weddings.sql aplicată în Supabase DEV și în repo. |
| 28 | ✅ migrateIfNeeded(data) — implementat implicit în storage.js | Mică | Critic | Verificat — sanitizeLoadedTables/Guests/Cam + compatibilitate v13.1→v14 + cleanupLegacyStorage |
| 29 | ✅ Safe write pattern — ADR-029 aprobat. granular writes jsonb_set(), OCC revision guard, rollback 3 layere, debounce, monitoring. docs/adr/ADR-029-safe-write-pattern.md | Medie | Critic | Un bug = wedding distrus complet. Schema version check la write, nu doar la citire |
| 30 | Auth edge cases — sesiune expirată în mijlocul lucrului, desync WP/app, refresh token flow | Medie | Critic | UX: "Session expired — reconnecting..." |
| 31 | ✅ Undo/Redo strategy clară — ce intră (move guest, create/delete table), ce NU intră, limită 20 acțiuni | Medie | Mare | Devine critic la seating cu mulți invitați |
| 32 | ✅ Worst Day Scenario Plan — ziua nunții, app nu merge, pași exacți de urmat | Mică | Critic | Diferența dintre "app" și "produs pe care te bazezi la nuntă" |
| 33 | ✅ Product Rules: NO SURPRISES (userul nu e surprins), REVERSIBILITY (orice se poate anula), VISIBILITY (orice acțiune are feedback) | Mică | Mare | Reguli Apple-level de produs |

---

## 🟡 BEFORE LAUNCH (înainte de utilizatori plătitori)

| # | Item | Dificultate | ROI | Note |
|---|------|-------------|-----|------|
| 1 | Retention policy concretă — câte zile până la ștergere date inactive | Mică | Critic | |
| 2 | Data Controller vs Processor map (Supabase, Vercel, Sentry, Resend) | Mică | Critic | |
| 3 | Resend DPA semnat | Mică | Critic | |
| 4 | Terms of Service în română | Medie | Critic | |
| 5 | Cookie policy detaliată | Mică | Mare | |
| 6 | Subprocessors list intern pregătită | Mică | Mare | |
| 7 | Lawful basis map per feature (account, RSVP, vendor, guests) | Mică | Mare | |
| 8 | Data deletion SLA — în cât timp ștergi la cerere (Art. 17 GDPR) | Mică | Critic | |
| 9 | Export date utilizator (JSON/Excel) — Art. 20 GDPR Right to Portability | Mică | Critic | Cerință legală, safety net imens pentru useri |
| 10 | Children/minors policy clară | Mică | Mare | Nu doar age verification, și ce date permiți despre minori |
| 11 | Uptime monitoring configurat — tool, URL-uri, SLA target | Mică | Mare | |
| 12 | Sentry alerte configurate — threshold-uri, ce triggere alertele | Mică | Mare | Sentry environment tagging: dev/preview/prod |
| 13 | Incident response plan — cine e notificat, în ce ordine | Mică | Mare | |
| 14 | Communication plan downtime — cum anunți utilizatorii | Mică | Mare | |
| 15 | Point-in-time recovery activat Supabase | Mică | Critic | |
| 16 | Backup ownership — cine verifică, unde e documentat | Mică | Mare | |
| 17 | Cost guardrails — storage per wedding, email caps, export caps | Medie | Mare | Monthly review cadence |
| 18 | Rate limiting export PNG | Mică | Mare | |
| 19 | Abuse protection RSVP — rate limiting pe IP, token brute-force protection | Medie | Critic | Cineva poate trimite 10.000 RSVP-uri false. Vercel middleware pe ruta RSVP |
| 20 | Secrets rotation playbook | Mică | Mare | |
| 21 | Audit log minim (delete account, export data, migration retry) | Medie | Mare | |
| 22 | Accessibility minimum — keyboard basics, focus states, contrast WCAG AA | Medie | Mare | Pointer target size, focus clarity |
| 23 | Seating chart — NU e optimizat pentru mobile, mesaj clar utilizatorului | Mică | Medie | "Pentru experiența completă, folosiți un laptop" |
| 24 | Responsive priority per modul (dashboard/guests/RSVP da, seating full edit nu) | Medie | Mare | Breakpoints definite |
| 25 | Meta tags + OG tags pe pagini publice (RSVP page) | Mică | Medie | Indexability policy — ce se indexează, ce nu |
| 26 | Public vs private routes map | Mică | Mare | |
| 27 | Support/onboarding basics — error messages în română, success states, microcopy clar | Medie | Mare | User education prin microcopy, nu tutoriale grele |
| 28 | Destructive action policy — delete cu confirmare, undo window | Medie | Critic | |
| 29 | Unsaved changes policy — warning la navigare cu modificări nesalvate | Medie | Mare | |
| 30 | Product Metrics definite — timp până la prima masă, drop-off points, error rate pe flows | Mică | Mare | Fără asta nu știi ce optimizezi |
| 31 | E2E testing minim pe critical flows | Mare | Mare | |
| 32 | Realistic stress test — 600 invitați, edge cases (nume lungi, caractere speciale, diacritice) | Medie | Mare | |
| 33 | Performance budget seating chart — max frame drops acceptate la 60 mese/600 invitați | Mică | Mare | FPS real măsurat pe device slab, nu estimat |
| 34 | Query budget per screen — câte requesturi la load per pagină | Mică | Mare | |
| 35 | Timeout + retry logic pe fetch-uri critice | Medie | Mare | |
| 36 | Read-only fallback — dacă Supabase e degradat, ce mai merge | Medie | Critic | Utilizatorii trebuie să poată măcar vizualiza datele |
| 37 | Manual operating mode — ce faci dacă RSVP are probleme în ziua nunții | Mică | Critic | Produs event-based = zero toleranță în ziua evenimentului |
| 38 | Offline Export PDF/Image pentru ziua nunții — safety net pentru locații fără semnal | Medie | Critic | Export PNG există, extinde-l. Planner-ul trebuie să lucreze fără cloud |
| 39 | Optimistic UI — update local imediat + rollback la eroare server | Medie | Critic | Latența Supabase pe mobil 500ms-1s. Aplicația trebuie să pară nativă |
| 40 | Impersonation Tool — admin read-only view pe datele unui user pentru debug suport | Medie | Mare | Fără asta faci debug pe orbește prin WhatsApp |
| 41 | WP Sync Hook — dacă userul schimbă emailul în WP, se actualizează și în app_users | Medie | Mare | |
| 42 | Large Assets Guard — limită 2MB pentru orice upload din prima zi | Mică | Mare | Altfel costurile de storage explodează |
| 43 | Competitor monitoring documentat — Bridebook, Zola, SeatPuzzle | Mică | Medie | |
| 44 | Release health checks — după deploy, ce verifici manual | Mică | Mare | Critical journey monitoring: login, save seating, RSVP submit |
| 45 | Safe debug strategy în producție — flags, temporary logs, no secret leakage | Mică | Mare | |
| 46 | Rate limiting /api/guests/import — max 5 imports/min per user (Vercel middleware) | Mică | Mare | Adăugat Mar 28 |
| 47 | Export GET /api/guests/export — format identic cu import pentru round-trip | Mică | Mare | Adăugat Mar 28 |
| 48 | Duplicate names warning în UI Guests | Mică | Mare | API bifat (3.5), UI lipsă |
| 49 | Circuit breaker Maintenance mode — dacă WP bridge e jos, app continuă | Medie | Mare | Adăugat Mar 29 |
| 50 | RESEND_API_KEY configurat în Vercel | Mică | Critic | **Blocker pentru Faza 7.4** — neconfigurat la Mar 31 |
| 51 | wpBridgeEnabled: true în feature-flags.ts la launch | Mică | Critic | Acum e false pentru dev local — schimbă înainte de launch |
| 52 | Migrații aplicate pe Supabase PROD la launch | Mică | Critic | Toate migrațiile din develop aplicate pe PROD |

---

## 🟢 LATER (după primii utilizatori reali)

| # | Item | Dificultate | ROI | Note |
|---|------|-------------|-----|------|
| 1 | DPIA formală — trigger: scară mare, media uploads, analytics agresive, session recording | Mare | Medie | Nu acum, dar notează trigger-ul |
| 2 | Connection pooling Supabase (PgBouncer) | Medie | Medie | |
| 3 | Caching strategy — ce, unde, cât timp | Medie | Medie | |
| 4 | Image optimization policy pentru viitoare uploads | Medie | Medie | |
| 5 | List virtualization guests / vendors / tasks (react-window) | Medie | Mare | |
| 6 | Bundle size budget actual măsurat | Mică | Medie | |
| 7 | Vercel Edge vs Serverless pentru API routes | Medie | Mică | |
| 8 | Memory pressure testing seating chart | Medie | Medie | |
| 9 | Hydration cost pe dashboard / guests | Medie | Medie | |
| 10 | SVG complexity budget — filtre/shadows per table | Mică | Medie | |
| 11 | Shadows dezactivate în pan/zoom, reactivate la onRest | Mică | Mare | Parțial implementat, documentat ca regulă |
| 12 | npm audit rulat regulat | Mică | Medie | |
| 13 | License compliance dependențe | Mică | Medie | Licențe compatibile cu SaaS comercial |
| 14 | Dead code detection | Mică | Mică | |
| 15 | Architecture decision records (lightweight) | Mică | Medie | |
| 16 | Import boundaries / module boundaries formal | Medie | Medie | |
| 17 | TypeScript strict coverage pe tot codul | Mare | Medie | |
| 18 | Feature flags pentru rollout gradual | Mare | Mare | |
| 19 | A/B testing | Mare | Medie | |
| 20 | Session recording (PostHog/Hotjar) | Mică | Mare | |
| 21 | Analytics event taxonomy completă | Medie | Mare | |
| 22 | User feedback loop post-lansare | Mică | Critic | |
| 23 | Multi-user scenarios — conflict handling, "altcineva editează" | Foarte Mare | Mare | Gândit acum, implementat mai târziu |
| 24 | Audit Trail cu deleted_by — cine a șters ce și când | Mică | Mare | Util când ai multi-user. Transformă bug reports în probleme de comunicare |
| 25 | Versioned data formal | Mare | Medie | |
| 26 | Restore drill periodic | Mică | Medie | |
| 27 | Post-mortem process documentat | Mică | Medie | |
| 28 | Runbook scenarii comune (DB plin, auth blocat, export eșuat) | Medie | Mare | |
| 29 | Public status page | Medie | Medie | |
| 30 | i18n infrastructură — string-uri, date format, monedă RON vs EUR | Mare | Mare | Porni cu română-first, nu lăsa stringuri hardcodate în componente noi |
| 31 | Motion policy — prefers-reduced-motion | Mică | Medie | |
| 32 | Non-color cues pentru status | Medie | Medie | |
| 33 | Structured data pentru pagini publice (SEO) | Mică | Mică | |
| 34 | Webhook-uri pentru RSVP responses | Medie | Medie | |
| 35 | API versioning | Mare | Medie | |
| 36 | Backup cross-region | Medie | Medie | |
| 37 | CSRF model complet pentru toate endpointurile | Medie | Mare | |
| 38 | Upload validation (Guest Memories) — mime type, size, count | Medie | Mare | |
| 39 | Canary deployment | Mare | Medie | |
| 40 | Redis / rate limiting avansat | Mare | Medie | |
| 41 | CDN pentru assets statice | Mică | Mică | |
| 42 | Pointer target size (a11y) | Mică | Medie | |
| 43 | Focus states design standard | Mică | Medie | |
| 44 | Screen reader / aria labels pe elementele interactive | Medie | Medie | Seating chart full a11y nu e obiectiv V1 |
| 45 | Visual regression testing | Mare | Medie | Overengineering pentru solo dev V1 |
| 46 | Supabase generated types — elimină cast-urile as GuestWithRelations | Mică | Medie | Adăugat Mar 28 |
| 47 | POST /api/guest-events tranzacțional — RPC pentru 3 queries → 1 | Medie | Medie | Adăugat Mar 28 |
| 48 | Bulk import → RPC pentru 1000+ guests | Medie | Medie | Adăugat Mar 28 |
| 49 | Optimistic UI pattern pe Guests + Budget (fără Zustand/React Query) | Medie | Mare | Adăugat Mar 29 |
| 50 | Snapshot hashing stabil în useSeatingSync (nu JSON.stringify pe obiecte mari) | Mică | Mare | Adăugat din audit Mar 31 |
| 51 | Cancel stale retries / backpressure în useSeatingSync | Mică | Mare | Adăugat din audit Mar 31 |
| 52 | Maintenance mode UX când WP bridge e jos — nu guest illusion | Medie | Mare | Adăugat din audit Mar 31 |
| 53 | Extrage page.js shell în componente mici | Medie | Medie | Adăugat din audit Mar 31 |
| 54 | Metrics pentru sync latency și conflict rate | Medie | Mare | Adăugat din audit Mar 31 |

---

## Sumar executiv

| Categorie | Total itemi | Dificultate dominantă | ROI dominant |
|-----------|------------|----------------------|--------------|
| Must Now | 33 | Mică/Medie | Critic/Mare |
| Before Launch | 52 | Medie | Critic/Mare |
| Later | 54 | Medie/Mare | Medie/Mare |
| **Total** | **139** | | |

---

## Reguli de produs (Product Principles)
- **NO SURPRISES** — userul nu trebuie să fie surprins niciodată
- **REVERSIBILITY** — orice acțiune trebuie să poată fi anulată
- **VISIBILITY** — orice acțiune are feedback instant
- **GUEST-FIRST** — UX gândit din perspectiva invitatului, nu a canvas-ului
- **MAX 2-3 PAȘI** — nicio acțiune nu durează mai mult de 3 pași
- **ZERO DEAD ENDS** — userul are întotdeauna o cale de ieșire

---

## Top 5 cele mai importante
1. **RLS testat real** (#5 Must Now) — cel mai frecvent vector de data leak în Supabase
2. **migrateIfNeeded()** (#28 Must Now) — previne crash la boot după orice update de cod
3. **Guest Collision UNIQUE constraint** (#26 Must Now) — integritate garantată de DB
4. **Error Recovery UX** (#18 Must Now) — critic pentru produs event-based
5. **Offline Export pentru ziua nunții** (#38 Before Launch) — zero toleranță în ziua evenimentului

---

## Nota finală
> Lista aceasta este la nivel **Series A Startup**.
> Dacă bifezi itemii din MUST NOW, ești mai bine pregătit decât 80% din aplicațiile care se lansează azi.
>
> **STOP PLANNING → START EXECUTION**
>
> Ordinea reală:
> 1. 🔴 MUST NOW — finalizează
> 2. ⚡ Seating chart perf + UX perfect
> 3. 🚀 Launch controlled (nu public mare)
> 4. 📊 Feedback real de la utilizatori

---

## Surse analiză
- **Claude** (Anthropic) — arhitectură, performanță, GDPR, system boundaries
- **ChatGPT** (OpenAI) — securitate, source of truth map, failure mode matrix, domain/rules.ts, Supabase VIEW cu deleted_at IS NULL
- **Gemini** (Google) — data resilience, optimistic UI, gravity guard, audit trail, worst day scenario, migrateIfNeeded(), safe write pattern

---

## Update Mar 28, 2026

### Must Now — status final
- ✅ Toate 33 itemi bifați (exceptând #16 și #30 care sunt organice Faza 3+)
- ✅ #16 Business rules — implementat parțial în lib/validation/ (Faza 3)
- ✅ P10 Virtualizare sidebar — VirtualList nativ, flex layout proporțional

### Faza 3 — status
- ✅ 3.1, 3.2, 3.4, 3.5, 3.7 — complete
- ⏳ 3.3 partyId — amânat după UI Guests
- ⏳ 3.6 Limits — DECIZIE CONȘTIENTĂ: skip până la Stripe/planuri plătite. Schema are plan_tier, infrastructura e pregătită.

### Adăugat în Before Launch
- Rate limiting /api/guests/import — max 5 imports/min per user (Vercel middleware)
- Export GET /api/guests/export — format identic cu import pentru round-trip

### Adăugat în Later
- Supabase generated types — elimină cast-urile as GuestWithRelations (după stabilizare schema)
- POST /api/guest-events tranzacțional — RPC pentru 3 queries → 1
- Bulk import → RPC pentru 1000+ guests

---

## 💡 IDEI DE VIITOR
> Neplanificate, necomise. Notate ca potențial valoros pentru versiuni ulterioare.

| # | Idee | Note |
|---|------|------|
| 1 | Contract & Document Vault | Bucket securizat Supabase Storage per vendor_state — contracte + facturi proformă |
| 2 | Live Share Read-Only | Link tokenizat pentru managerul locației — vede seating + meniuri în timp real, fără PDF static |

---

## Update Mar 29, 2026

### Decizii arhitecturale adăugate
- Optimistic UI aprobat fără Zustand/React Query — pattern manual controlat
- Schema Drift: modificări de schemă EXCLUSIV prin Supabase CLI, niciodată manual din Dashboard
- Circuit breaker: timeout agresiv, max 2-3 retry-uri, cooldown 60s
- Task Engine planificat pentru final V1 (după Faza 9)

### Module restructurate
- Module rămase: 9 (Dashboard, Seating, Guests, Budget, Vendors, RSVP, Export, Settings, Guest Moments)
- Eliminate/absorbite: Moodboard, Wishlist, Notes, Checklist, Timeline

### 3.6 Limits — clarificare
- Nu e blocat de Stripe ci de integrarea Voxel bootstrap (plan vine din WP)
- Se implementează când legăm Voxel — plan_tier populat din bootstrap response

### Adăugat în Must Now (post review Gemini)
- RLS negative tests — testăm că userul neautorizat NU poate vedea datele altui wedding

### Adăugat în Before Launch (post review Gemini)
- Duplicate names warning în UI Guests
- Circuit breaker Maintenance mode

---

## Update Mar 30, 2026

### Roadmap — status actualizat

| Fază | Status |
|------|--------|
| Seating Chart | ✅ ~9.0/10 |
| Faza 0A Foundation | ✅ |
| Faza 0B Auth & Data | ✅ |
| Faza 2A Seating Perf | ✅ |
| Faza 3 Guests Core | ✅ ~85% |
| Faza 5 Budget Core | ✅ 5.1, 5.2, 5.3 complete |
| Faza 6 Seating ↔ Guests | ✅ Implementat, mergeuit |
| Faza 2B Seating Perf Validation | ⏳ |
| Faza 4 Vendors Mirror | ⏳ |
| Faza 7 RSVP | ⏳ |
| Faza 8 Export & Compliance | ⏳ |
| Faza 9 Reliability & QA | ⏳ |
| Faza 10 Power Features | ⏳ |

### Teste: 505/505 verzi

---

## Update Mar 31, 2026

### Realizări sesiunea Mar 31, 2026
- ✅ Faza 0B completă — identity provisioning + active planning context
- ✅ WordPress plugin v3.1.1 deployed pe server (confirmat în cPanel)
- ✅ Migrații Supabase DEV aplicate (seating_id_maps fix, extend_table_types, active_wedding_id)
- ✅ session-bridge.ts — expune activeWeddingId, activeEventId, provisioningStatus
- ✅ page.js — state machine strictă cu toate stările
- ✅ 2B.3 — filteredUnassigned memoizat cu useCallback
- ✅ Teste: 505/505 verzi

### Roadmap — status actualizat Mar 31

| Fază | Status |
|------|--------|
| Seating Chart | ✅ ~9.0/10 |
| Faza 0A Foundation | ✅ |
| Faza 0B Auth & Data | ✅ Mar 31, 2026 |
| Faza 2A Seating Perf | ✅ |
| Faza 3 Guests Core | ✅ ~85% |
| Faza 5 Budget Core | ✅ 5.1, 5.2, 5.3 |
| Faza 6 Seating ↔ Guests | ✅ |
| Faza 2B Seating Perf Validation | ✅ parțial (2B.2, 2B.3) |
| Faza 4 Vendors Mirror | ⏳ SĂRIT — blocat pe Voxel |
| **Faza 7 RSVP** | ⏳ **URMĂTOR** |
| Faza 8 Export & Compliance | ⏳ |
| Faza 9 Reliability & QA | ⏳ |
| Faza 10 Power Features | ⏳ |

### Adăugat în Before Launch (Mar 31)
- #50 RESEND_API_KEY configurat în Vercel — blocker pentru Faza 7.4
- #51 wpBridgeEnabled: true la launch
- #52 Migrații aplicate pe Supabase PROD la launch

### Adăugat în Later (din audit Mar 31, scor 87/100)
- #50 Snapshot hashing stabil în useSeatingSync
- #51 Cancel stale retries în useSeatingSync
- #52 Maintenance mode UX când WP bridge e jos
- #53 Extrage page.js shell în componente mici
- #54 Metrics pentru sync latency și conflict rate

### Decizii Mar 31
- wpBridgeEnabled: false pentru dev local — schimbă în true la launch
- Faza 4 Vendors Mirror sărită — revine când Voxel e gata
- Faza 7 RSVP = următoarea fază activă

## Update Apr 1, 2026

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
| **Faza 7 RSVP UI cuplu** | ⏳ **URMĂTOR** |
| Faza 8 Export & Compliance | ⏳ |
| Faza 9 Reliability & QA | ⏳ |
| Faza 10 Power Features | ⏳ |

### Teste: 541/541 verzi (era 505)

### Adăugat în Before Launch (Apr 1)
- #53 Semnează DPA Resend înainte de launch (resend.com/legal/dpa)
- #54 Adaugă NEXT_PUBLIC_APP_URL în Vercel env vars

### Decizii Apr 1, 2026
- RSVP per individ în V1 — party/group RSVP = V2
- rsvp_responses = tabel separat — schema inițială respectată
- Token: SHA-256 hash în DB, raw doar pentru link
- O singură invitație activă per guest — UNIQUE index parțial
- party_id amânat — validat după launch cu useri reali
- UI Lista Invitați netestat vizual până la wpBridgeEnabled: true