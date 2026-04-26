# CHANGELOG — WeddingList

> Istoric PR-uri merge-uite în develop.
> Single source-of-truth pentru tot ce s-a livrat.
>
> **Cronologie inversă** — TOP = cel mai nou.
> **Update protocol:** după fiecare merge, adaugă o linie la TOP.

---

## SECȚIUNEA ACTIVĂ — Hardening Week (#164+)

Format full detail: PR # | Date | Type | Summary | Hash merge.

| PR # | Date | Type | Summary | Hash |
|------|------|------|---------|------|
| #172 | 2026-04-26 | feat | H3 Etapa 3/3 — Budget predicates + presentation layer + RSVP fix | 48b95b9 |
| #171 | 2026-04-21 | docs | Multi-session handoff protocol setup | 538b458 |
| #170 | 2026-04-20 | fix | Define semantic color aliases used across pages (12 vars) | 795911d |
| #169 | 2026-04-20 | refactor | export — use presentation helpers in pdf-export | bbf58dd |
| #168 | 2026-04-20 | feat | rsvp — presentation helpers (labels + hex colors) | b3603b0 |
| #167 | 2026-04-19 | refactor | rsvp-public — extract form helpers to lib/rsvp | 74da17b |
| #166 | 2026-04-19 | refactor | rsvp — predicates în stats + validate | 1f38d44 |
| #165 | 2026-04-19 | fix | rsvp — eliminate any types in dashboard route | 0d1611e |
| #164 | 2026-04-19 | feat | domain — upgrade predicates to type guards | d7a988a |

**Cumulative deltas:**
- H3 Etapa 2/3 (#164-#169): +52 teste (801 → 837 baseline)
- H3 Etapa 3/3 (#172): +42 teste (837 → 879 baseline)
- Misc (#170-#171): docs + tokens fix, 0 teste delta

---

## ARHIVĂ — pre-#164 (migrate as-is din STATUS.md §6)

> **Note:** Date metadata absente — preserved verbatim, fără invenție.
> Branch-only entries au fost merge-uite fără numerotare oficială
> (practică inconsistentă trecută — vezi datoria docs).

### PR-uri numerotate (#112-#134)

| PR # | Type | Summary | Status |
|------|------|---------|--------|
| #134 | fix | magic-fill — rescriere algoritm v2.0 + sync_seating_editor_state pgrst203 | merged |
| #133 | fix | sidebar — elimină module fantomă + adaugă RSVP în navigare | merged |
| #132 | docs | actualizează status și context — faza 9 done, 92% | merged |
| #131 | feat | db — faza 9 audit system tiered seating_audit_logs + RPC v3 | merged |
| #130 | docs | actualizează status — faza 0 done, build verde, 90% | merged |
| #129 | fix | seating — tab overlap fals pozitiv la reload (sessionStorage) | merged |
| #119 | feat | seating — faza 7 conflict system OCC + version mismatch | merged |
| #118 | feat | budget — implementare completă UI: CRUD items, payments, state machine | merged |
| #117 | fix | export — repară export JSON și PDF (wedding not found, schema errors) | merged |
| #116 | fix | șterge app/dashboard/page.js duplicat | merged |
| #115 | feat | db — adaugă migrații pentru RPC-urile seating | merged |
| #114 | fix | seating — elimină JSON.stringify din parametrii RPC sync | merged |
| #113 | feat | seating — mută load seating pe server (endpoint GET securizat) | merged |
| #112 | fix | auth — corectează coloana user_id → app_user_id | merged |

### Branch-only entries (no PR#)

| Branch | Type | Summary | Status | Note |
|--------|------|---------|--------|------|
| fix/security-minrole-rbac | fix | RBAC minRole explicit pe toate 25 rute | merged | → SECURITY FIXES |
| fix/security-shadow-session | fix | Shadow session expiration (15 min ceiling) | merged | → SECURITY FIXES |
| fix/security-csrf-origin-check | fix | CSRF origin check pe 16 rute mutante | merged | → SECURITY FIXES |
| fix/security-final-hardening | fix | Error leakage — generic 500 + log server-side | merged | → SECURITY FIXES |
| fix/security-final-audit-findings | fix | Debug auth guard + dev endpoints + CSV cols | merged | → SECURITY FIXES |
| docs/security-audit-status | docs | Status security audit complet 97% → 99% | merged | |
| feat/with-auth-wrapper | feat | withAuth wrapper v2 — union-safe HOF | merged | → SECURITY FIXES |
| fix/rsvp-settings-polish | fix | WhatsApp link, error handling, polling, bulk progress | merged | |
| feat/faza10-data-access-layer | feat | db — normalizeRpcError + RPC wrapper cu timing | merged | |
| feat/faza11-security-hardening | feat | security — membership check security definer | merged | |
| feat/faza8-silent-refetch | feat | seating — silent refetch + massive conflict dialog | merged | |
| feat/faza12-dashboard-refactor | feat | dashboard — refactor auth server-side | merged | |

---

## SECURITY FIXES (audit 2026-04-16)

> Audit de securitate complet aplicat pe branch-uri dedicate, toate merge-uite în develop.
> Detaliile tehnice migrate din STATUS.md §10.

| # | Fix | Branch | Description |
|---|-----|--------|-------------|
| 1 | RBAC minRole explicit | fix/security-minrole-rbac | Eliminat default minRole="viewer" din requireWeddingAccess; toate 25 rute primesc acum minRole explicit — TypeScript enforced |
| 2 | Shadow session expiration | fix/security-shadow-session | Adăugat auth_source + absolute_issued_at în JWT payload; fereastra absolută 15 min; blocat shadow-of-shadow chaining |
| 3 | CSRF origin check | fix/security-csrf-origin-check | Creat lib/csrf.ts cu checkOrigin(); aplicat pe toate 16 rute mutante (POST/PATCH/DELETE/PUT) ca primă verificare |
| 4 | Error leakage (500) | fix/security-final-hardening | Eliminat error.message din răspunsurile client în provision/route.ts și migrate-local/route.ts; log server-side cu console.error, mesaj generic spre client |
| 5 | Debug auth production guard | fix/security-final-audit-findings | console.warn dacă NEXT_PUBLIC_DEBUG_AUTH=true în producție; getDevSession() forțat null prin NODE_ENV check |
| 6 | Dev endpoints double gate | fix/security-final-audit-findings | NODE_ENV === "development" AND DEV_ENDPOINTS_ENABLED === "true" ambele necesare; /api/dev/* inaccesibil fără ambele condiții |
| 7 | CSV max columns | fix/security-final-audit-findings | MAX_COLUMNS = 50 în lib/csv/parse-guests.ts; reject cu eroare clară dacă headers.length > 50 |
| 8 | withAuth wrapper | feat/with-auth-wrapper | lib/api/with-auth.ts — HOF union-safe cu auth chain complet, assertRole(), structured error logging; pilot pe rsvp/manual |

**Verdict audit (post-second-pass):**
- TypeScript clean
- 712/712 teste verzi (la momentul audit-ului)
- **Score: 100/100 — SAFE TO LAUNCH** ✅

---

## BREAKING CHANGES

(none — pre-launch, nu există utilizatori în producție)

---

## Conținut migrat în PR #173a

Acest fișier înlocuiește:
- `STATUS.md` §6 (ULTIMELE PR-URI) → SECȚIUNEA ACTIVĂ + ARHIVĂ
- `STATUS.md` §10 (SECURITY FIXES) → secțiune SECURITY FIXES
- `HANDOFF.md` §3 (PR-uri merged recent) → SECȚIUNEA ACTIVĂ

Last sync: 2026-04-26 (PR #173a — restructurare docs).