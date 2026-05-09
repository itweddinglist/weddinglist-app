# WeddingList — Claude.ai Session Handoff

## READ FIRST — Modul de lucru permanent

**Acest proiect funcționează în model "echipă ștafetă cross-timezone"** între sesiuni Claude.ai multiple (conturi diferite, sesiuni diferite în timp). Pattern permanent, NU temporar.

### Principii

1. **Ești parte dintr-o echipă, nu operator solo.** Alte sesiuni Claude.ai au lucrat înaintea ta pe același cod, alte sesiuni vor lucra după tine. Codul e comun, context-ul trebuie să circule.

2. **Citește acest document LA ÎNCEPUTUL TURII** înainte să faci orice altceva. Conține stare proiect, decizii locked, open items, pattern-uri validate.

3. **Respectă deciziile LOCKED.** Nu le re-deschide pentru dezbatere decât dacă user-ul cere explicit. Un predecesor a investit timp și tokens pentru decizia respectivă — re-discuția e waste.

4. **Actualizează acest document LA SFÂRȘITUL TURII** înainte să predai ștafeta. Protocol detaliat la secțiunea 9.

5. **Rate limits sunt normale.** Dacă tokens se termină la mijloc de task, NU panica — predecesorul tău a trecut prin același lucru. Doar asigură-te că HANDOFF.md reflectă unde te-ai oprit ÎNAINTE să închizi sesiunea.

6. **Stilul colaborării:** Claude.ai = planner arhitectural. User = curier între Claude.ai și Claude Code (executant tehnic). User operează paralel 3 canale: Claude.ai browser, Claude Code terminal, PowerShell extern.

7. **Update-uri HANDOFF.md întotdeauna prin PR**, fără excepție. Branch convention: docs/handoff-update-YYYYMMDD. Excepție doar dacă update-ul e parte natural dintr-un PR feature/refactor care oricum rulează CI.

---

## Reguli LOCKED (18) — filtru permanent sesiuni AI

> Reguli operationale aplicate per sesiune Claude.ai + Claude Code.
> Filtru obligatoriu pentru orice decizie. Reconstruite din chat sesiune
> 2026-05-09 post-disk-reset (SCRATCH local pierdut).

1. **Premium fara bug-uri pe termen lung** — quality > speed
2. **Scalabil** — solutia suporta 10x utilizatori fara refactor major
3. **Probleme rezolvate STRUCTURAL** — NU se ocolesc, NU workaround-uri
4. **Probleme rezolvate, NU se uita** — PR target explicit per fix
5. **Plase de siguranta suplimentare** — defense-in-depth pe orice critical path
6. **Timp NU important** — pregatire buna > graba
7. **NICIODATA `--no-verify`** — Husky obligatoriu, fara exceptii
8. **Comentariile reflecta realitatea** — verify-on-disk pattern
9. **Verify-on-disk pattern** — `grep + sed + wc -l`, NU display Claude Code
10. **Granularitate cluster mic** — Edit 2-4 markers max per cluster
11. **Onestate disciplinata** — "nu mergem pe ghicite", raportam exact
12. **Aprobare per comanda** — NICIODATA "Yes allow all" / whitelist
13. **Sursa de adevar: disk + Claude Code** — NU presupuneri user din memorie
14. **Stack tehnic strict** — `Next.js 16.2.2 + TS strict + Supabase + Vercel`
15. **Securitate chei** — NU in chat, NU in commits, NU in logs
16. **ASCII pur context-aware** — strict in code/commits/hooks; UTF-8 OK in markdown body
17. **Future/viitor formulari = trigger explicit obligatoriu** — orice item "amanat" fara conditie de re-activare = drift garantat. Minim 4 ancore: canonic + vizibil + trigger + trace. Cross-ref: lesson L55.
18. **Commit message pattern reusable** — pentru orice commit non-trivial: heredoc stdin (NU `-m` direct), ASCII pur strict (R16 reused), paragraph headers cu DOT suffix (NU colon, evita footer trailer trap), TOATE liniile <100 chars (body-max + footer-max ambele enforced). Pattern validat empirical PR #183 + #184. Cross-ref: lessons L60, L61.

### Reconstruction notes

R1-R16 reconstruite din chat sesiune 2026-05-09 post-disk-reset (SCRATCH_REGULI_LOCKED.md
local pierdut, raportat empirical PAS 0.B Pachet A). R17 auto-catch din chat sesiune
curenta: user a prins drift in formulare "ROADMAP Future tasks" fara trigger conditions
(meta-proces: regula aplicata pe insusi procesul de creare a regulii). Lesson L55
captures pattern.

R18 auto-catch din chat sesiune Pachet B (post-Pachet A, post-Section 1 update):
empirical learned dual rules commitlint (body-max + footer-max line length) +
markdown rendering corruption Windows + planner UTF-8 violations. Pattern reusable
pentru orice commit non-trivial. Lessons L58-L61 capture detalii granular.

---

## 1. Ultima actualizare

- **Data:** 2026-05-09 (Pachet B in-flight, post-Pachet A + Section 1 update merged)
- **Contribuitor:** Claude Opus 4.7 (session Claude Code, user: itweddinglist@gmail.com)
- **Motiv handoff:** 4 livrări consecutive azi pe develop. PR 1A Database Types Contract Layer 1 (#182, `8fe3861`) + Pachet A capture residual (#183, `b309f1e`) + HANDOFF Section 1 update (#184, `2539459`) merged. Pachet B in-flight (acest commit): R18 LOCKED nou (Reguli 17 → 18) + 4 lessons noi L58-L61 (commitlint dual rules + Write tool Windows display + heredoc pattern + planner R16 violations) + Section 1 self-update + 3 CHANGELOG entries (#183 + #184 + Pachet B placeholder).
- **Next contribuitor așteptat:** Faza 13 next sub-PR — candidate PR 1B (Integration tests Layer 2 cu DB reală — natural follow-up Layer 1), PR 1E (Enum Type Narrowing — consolidare Cat3 markers), PR 1F (RPC + Json Hardening — Cat4 + Cat5 markers), sau PR 3 (RSVP Minimal cu C12 SECURITY HIGH escalation). Vezi `ROADMAP.md` §"Faza 13 — Granularitate execuție" pentru detalii granular. Pachet B closes capture residual phase — next phase = code execution Faza 13.

---

## 2. Stare proiect

- **Branch default:** develop
- **Ultimul commit pe develop:** b9aecd7 — Merge PR #177 (H4.1 E2E Playwright Setup) — PR #178 pending merge
- **Baseline teste:** 879 passed + 4 skipped (Vitest, 40 test files) + 4 E2E Playwright (smoke 2 + auth 2)
- **Last build:** SUCCESS (Next.js 16.2.2 Turbopack)
- **Branch-uri deschise:** feat/h4-e2e-auth-setup (curent, pentru PR #178).

### Stack tehnic

- Next.js 16.2.2 + TypeScript strict + Supabase (EU Frankfurt)
- Vitest pentru unit tests, Playwright planificat pentru E2E (H4)
- react-pdf pentru PDF export (NU jsPDF)
- Vercel deployment
- Single dev (solo founder, itweddinglist@gmail.com)

### Environment user

- Windows + PowerShell (external), VS Code
- Claude Code local ca executant tehnic
- Claude Pro subscription (tokens limitați, sesiuni multi-cont)

---

## 3. PR-uri merged recent

> **Migrat în CHANGELOG.md la PR #173a (2026-04-26).**
>
> Pentru istoricul complet (cu date, types, hash-uri merge), vezi
> [CHANGELOG.md](./CHANGELOG.md):
> - SECȚIUNEA ACTIVĂ — Hardening Week PRs #164-#172
> - ARHIVĂ — pre-#164 (PR# numerotate + branch-only entries)
> - SECURITY FIXES — audit 2026-04-16

---

## 4. Decizii LOCKED (nu re-deschide)

Pentru constants tehnice si boundary statements (STORAGE_KEY seating, SVG vs Canvas, react-window INTERZIS, schema constraints), vezi fisierul CLAUDE sectiunea 6. Aici sunt deciziile cumulative LX in ordine cronologica (L1, L2, ... L19+).

### Arhitecturale

**L1. Supabase JS client untyped + !inner joins -> double cast via unknown.**  
Pattern acceptat: result.data ca unknown ca TargetType cu comentariu explicit + TODO post-launch. Cleanup real = generare types cu supabase gen types typescript în PR separat post-H3.

**L2. Pattern predicate type-guarded cu Extract/Exclude inline.**  
Fiecare domeniu business are predicate canonici în lib/domain/*.ts care acceptă Status | null (sau | null | undefined când e cazul) și returnează status is Extract<Status, "X">. Consumer-ii folosesc predicate în loc de status === "X" inline.

**L3. Pattern setAnswers(prev => pureFn(prev, value)).**  
Antidot pentru closure bugs în React state updates. Toate helpers-ii pure primesc prev ca argument, returnează state nou. NU folosim closure peste state variable.

**L4. Sub-opțiunea B pentru presentation layer.**  
UI (browser DOM) folosește CSS variables direct (ex: var(--green)). Helpers hex (RSVP_STATUS_COLORS_HEX, getStatusColorHex) sunt NUMAI pentru consumatori non-DOM (react-pdf, email rendering). Motivul: dark mode compat future (dark mode E în plan, nu în ROADMAP activ). CSS vars se overrid prin @media (prefers-color-scheme: dark), zero TS changes.

**L5. Scope reduction post-validări > scope expansion speculativ (YAGNI matur).**  
La PR #168: propunere inițială getStatusPalette cu {color, background, border} redusă la getStatusColorHex(status): string după descoperire că pdf-export folosește numai color.

**L6. Seating chart TS migration -> sprint dedicat HWE1 post-H7, pre-launch.**  
NU V2, NU incremental. Decis în sesiunea anterioară. Justificare: codul seating actual (.js) e prea intricat pentru refactor incremental. Migrarea TS cere focus 100%.

**L7. Design tokens — layer semantic peste primitives.**  
PR #170 a pus foundation: --color-success: var(--green) pattern. Primitives rămân source of truth (--green, --navy, --rose). Semantic layer e consumer-facing. Viitor H7 va extinde pattern (spacing, typography, motion).

### Procedurale

**L8. Aprobare per comandă.**  
Claude Code cere aprobare per fiecare comandă critică. NICIODATĂ "yes don't ask again" whitelist. User operează manual fiecare GO. CLAUDE.md §8a.

**L9. PAS 0 obligatoriu pentru TOATE PR-urile non-triviale.**  
Extract context read-only înainte de orice plan. Include: repo state, baseline teste, fișier target citit integral, grep pattern-uri relevante, identificare consumers, teste existente. Zero propuneri arhitecturale fără factual audit.

**L10. PowerShell extern pentru fișiere noi multi-line (>40 linii).**  
Bug Claude Code confirmat în 2 instanțe: edit-tool + bash heredoc duplica conținut pe fișiere noi. Workaround matur: user scrie conținutul într-o variabilă PowerShell via here-string, apoi WriteAllText cu UTF8Encoding(false) pentru a evita BOM. Verify post-scriere: Measure-Object -Line pentru număr linii, Select-String cu Pattern pentru grep, Get-Content -Encoding Byte -TotalCount 3 pentru primii bytes (detecție BOM).

**L11. PR body întotdeauna în PowerShell extern.**  
Pentru a evita BOM issues. Pattern identic cu L10.

**L12. Verificări secvențial, NU paralel.**  
npx tsc --noEmit -> (clean) -> npx vitest run -> (green) -> npm run build. La orice eșec -> STOP, raport, discuție. NU "merg paralel pentru că e mai rapid".

**L13. Orice problemă conexă -> RAPORTEAZĂ, nu rezolva silent.**  
Dacă Claude Code descoperă bug în timpul unui PR scope-ul original, raportează în PAS 1 / raport post-edit. User decide: include în scope curent (dacă e root cause al aceleași probleme) sau PR separat. NU fix improvizat.

**L14. Decizii arhitecturale -> Claude.ai propune opțiuni cu trade-offs, NU decide singur.**  
Minim 2-3 opțiuni (A/B/C sau Sub-opțiuni). User aprobă explicit. Dacă decizia afectează multiple PR-uri future (ex: presentation layer), documentat ca LOCKED după aprobare.

**L15. Pre-rescriere TS — separare strictă logic vs UI.**  
Înainte de orice rescriere `.tsx`/`.jsx` în TypeScript, mută toată logica de business + presentation în `lib/`. Componenta UI rămâne thin layer care consumă predicate + helpers. Rescrierea TS atinge doar UI, NU logica. Reduce risc rescriere de 80% — predicate + presentation sunt deja TypeScript curate.

**L16. Design tokens semantici pentru toate consumatorii DOM.**  
Hex hardcoded în `.tsx`/`.jsx` consumatori = datorie tehnică automată. Toate culorile DOM trec prin `var(--*)` (CSS vars). Hex literal NUMAI pentru consumatori non-DOM (react-pdf, email rendering — pattern L4 Sub-opțiunea B). Validat în PR #170 (12 vars semantic aliases) + PR #172 (7 primitives + 9 semantic).

**L17. Pre-rescriere fișiere — extracție completă logic + presentation.**  
Orice fișier programat pentru rescriere TS în viitor, înainte de rescriere se extrage:
1. Toată logica business → `lib/domain/<domain>.rules.ts` (predicate + funcții pure)
2. Toată prezentarea → `lib/<domain>/<domain>-presentation.ts` (labels, colors, transitions)
3. Componenta UI rămâne thin layer

Rescrierea TS NU atinge logic + presentation, ele sunt deja TypeScript curate. Aplicat cu success în PR #172 (`app/budget/page.tsx` 1898 linii pregătit pentru HWE0.5).

**L18. Hover pattern `-soft` alias acceptabil pentru CSS vars.**  
La migrare hex hardcoded → CSS vars, dacă valoarea originală era `bg + alpha 9%` și `--color-X-soft` are alpha 12%, diferența e imperceptibilă vizual. Folosim direct `var(--color-X-soft)` în loc de generare nouă a valorii alpha exacte. Zero churn, foundation curată.

**L19. Investigație pre-edit obligatorie pentru fișiere mari (>1000 linii).**  
Înainte de Edit-uri pe fișier > 1000 linii (ex: `page.tsx` 1898 linii), obligatoriu PAS X.X.1 audit complet:
1. Citește integral fișierul (NU doar zone vizate)
2. Cataloghează TOATE ocurențele pattern-ului target
3. Identifică zone out-of-scope explicit cu justificare
4. Verify dependencies între zone (ex: hover pattern depinde de presence `-soft` alias)

Aplicat cu success în PR #172 PAS 2.3.1 — descoperite 6 inline checks + 4 hex în warning boxes + 3 zone out-of-scope catalogate.

**L20. `.next/` cache corruption recovery — STANDARD procedure, NU patch.**  
Cand `tsc --noEmit` raporteaza errors EXCLUSIV in `.next/dev/types/*` (e.g., `routes.d.ts` cu duplicate fragmente, JSDoc trunchiate, unterminated template literals) si zero errors in source files: cauza root e Next.js dev type generator interrupted la mijlocul scrierii (HMR collision). Recovery procedure: revert orice diagnostic edits temp, `rm -rf .next/`, retry. Next.js regenereaza la urmatorul `next dev` start. NU patch source files — cache corruption nu indica bug aplicatie. Aplicat cu success in PR #178 PAS 6.4-RECOVERY (heading "Se incarca..." stuck timeout + 4 routes.d.ts errors → ambele rezolvate prin cleanup).

**L21. HMR + E2E race condition — cleanup `.next/` dupa modificari component pre-E2E run.**  
Edit-uri component (`*.tsx`/`*.jsx`) DURING dev server live + `next dev` HMR + Playwright E2E run = potential interrupted type regeneration. Simptome: tests care PASS la prima rulare fail dupa edit minor (e.g., adaugare `data-testid` attribute). Workflow recomandat: dupa edit-uri component pre-E2E, `rm -rf .next/` inainte de Playwright run, garanteaza fresh state. Aplicat in PR #178 dupa adaugare `data-testid` pe Link components in AppShell + Dashboard.

---

## 5. Open items (priority-ordered)

### Imediat (next PR)

**PR #172 — H3 Etapa 3/3: Budget type guards + refactor** (PRIORITATE MAXIMĂ)  
Primul PR al mini-secvenței H3 Etapa 3/3. Aplică pattern-urile din Etapa 2/3 (predicate type-guarded, presentation helpers dacă e cazul) pe domeniul Budget.

- Prompt TODO: scris la start de next session cu PAS 0 real pe lib/domain/budget.ts + consumatori.
- Estimare: ~3-4h per PR, probabil 3-4 PR-uri pentru a închide Budget complet.
- NU începe fără PAS 0 extins — Budget nu a fost atins în nicio sesiune anterioară, cere audit complet.

### Scurt termen (1-2 săptămâni)

**PR follow-up — H3 Etapa 3/3 continuare: Attendance refactor.**  
Aplică predicate pe AttendanceStatus. Depinde de complexitatea găsită la PAS 0. Estimare 2-3h.

**PR follow-up — Consolidare isSeatingEligible.**  
Predicate care combină reguli RSVP + Attendance + Guests. Probabil în lib/domain/seating-eligibility.ts. Estimare 2h.

**PR follow-up — Refactor dashboard cu getStatusLabel.**  
Post PR #170, dashboard (app/rsvp/page.tsx) are încă statusLabels + badgeColors locale. Eliminare duplicare cu getStatusLabel din PR #168. NU bug — doar datorie tehnică. Scope: 30-45 min.

### Medium-term

- H4 — E2E Playwright: plasa de siguranță înainte de HWE1 seating TS migration. Setup infra + scenarios critice.
- H5 — Re-audit securitate: post-H3, post-H4, pre-launch.
- H6 — Manual flow walkthrough: folosește datoriile catalogate cu tag pre-launch din sub-section "Datorii tehnice catalogate" (de mai jos) ca start point.
- H7 — Design tokens + typography polish: extindere pattern început la PR #170.

### Future tasks (cross-ref ROADMAP)

> Items captured ca residual debt din PR-uri precedente (Pachet A capture).
> Single source of truth: `ROADMAP.md` §"Future tasks". Acest entry = ANCORA 2 R17 (vizibilitate per sesiune).

- **FT-01** — ROADMAP cleanup PR 1 entry restructure (1-2h focused; trigger: oricare alt PR atinge `ROADMAP.md` → bundle împreună)
- **FT-02** — Cat 5 mojibake grep audit codebase (30-60 min; trigger: PR 11 Polish — natural scope; cross-ref registry §F)
- **FT-03** — Branch hygiene 58 orphaned local branches cleanup (5-15 min; trigger: user observă zgomot `git branch` SAU pre-launch sweep)
- **FT-04** — DEAD CODE removal `createAuthenticatedClient` `lib/supabase-server.ts:20` (15-30 min; trigger: PR 11 SAU PR mic dedicat; cross-ref TD-30 + registry §G.2)

Cross-ref complet: vezi `ROADMAP.md` §"Future tasks" pentru detalii (4 ancore R17, trace CHANGELOG, lesson L55).

### Long-term backlog

- HWE1 — Seating chart TS migration (sprint dedicat post-H7, pre-launch)
- Supabase types cleanup (generare types, elimină cast-uri)
- Cleanup backlog: vezi "Datorii tehnice catalogate" (sub-section de mai jos) cu tag pre-launch

### Datorii tehnice catalogate (PR #173b)

| ID | Datorie | Severitate | Scope target | Cost | Notă |
|---|---|---|---|---|---|
| TD-01 | Browser support matrix nu stabilit oficial | 🔴 Critical | Pre-launch (HWE3) | 1-2h discuție | Blochează decizii CSS modern (color-mix, has, container queries). Influențează deja PR #172 (am ales rgba conservator vs color-mix). |
| TD-02 | vendor.rules placeholder gol fără test/plan | 🟡 Medium | HWE0.5 | 30 min decizie + 1-2h | Decide: implementăm vendor predicate concrete SAU ștergem fișierul. → ROADMAP §0.5 HWE0.5-E |
| TD-03 | GitHub Actions Node.js 20 deprecated warning | 🟡 Medium | PR mic dedicat | 15-30 min | actions/checkout v4 + setup-node v4 rulează pe Node 20. GitHub forțează Node 24 default. |
| TD-04 | Hierarchy docs neclarificată oficial | 🟡 Medium | HWE0.5 | 30 min | Adăugare sectiune 0 în CLAUDE cu Doc hierarchy + scope per fisier. → ROADMAP §0.5 HWE0.5-B |
| TD-05 | CONTEXT sectiunea 14 PR list overlap mare cu CHANGELOG ARHIVĂ | 🟡 Medium | HWE0.5 | 1h | CONTEXT are 33 PR entries (#66-#134) — istoric mai bogat decât CHANGELOG ARHIVĂ. → ROADMAP §0.5 HWE0.5-C |
| TD-06 | CONTEXT sectiunea 13 DECIZII LOCKED overlap cu CLAUDE 6 + HANDOFF 4 | 🟡 Medium | HWE0.5 | 1h | Audit consolidare la HWE0.5. → ROADMAP §0.5 HWE0.5-D |
| TD-07 | Squash vs True Merge inconsistency (PR-uri #164-#172) | 🟡 Medium | PR mic dedicat | 15 min verificare | Toate 9 PR-uri au 2 parents (true merge), GitHub afișa Squash and merge buton verde. |
| TD-08 | app/budget/page.tsx 1898 linii — programat rescriere TS | 🟡 Medium | HWE0.5 | 4-6h | Conform L17: pre-rescriere extracție DEJA făcută în PR #172. Risk redus 80%. → ROADMAP §0.5 HWE0.5-A |
| TD-09 | gitignore lipsește pattern *.bak | ✅ Resolved | PR #175 | DONE | Rezolvat la PR #175. Adăugate 8 patterns: *.bak, *~, *.swp, *.swo, *.tmp, *.temp, Thumbs.db, desktop.ini. |
| TD-10 | Outdated references (HANDOFF L146/L153, CLAUDE L286/L316) | 🟢 Low | PR #173b (acest PR) | inclusă | Fix în Edit-urile actuale. |
| TD-11 | Border tokens lipsesc (color-X-border) | 🟢 Low | H7 Design Tokens | 1h | Foundation pentru complete design system. |
| TD-12 | color-danger-soft + color-danger-text lipsesc | 🟢 Low | H7 Design Tokens | 30 min | Necesare pentru danger pattern complet (page.tsx l.515-807). |
| TD-13 | Domain rules Pick vs direct import inconsistency | 🟢 Low | H7+ refactor | 1h | budget.rules folosește Pick BudgetItemRow vs attendance/rsvp import direct. |
| TD-14 | Domain rules NU re-exportă status types | ⚪ Convention | Acceptat | 0 (decizie) | Toate 4 fișiere consistent — accept ca convenție explicită. |
| TD-15 | Husky pre-commit + commitlint rules nedocumentate explicit | 🟢 Low | PR #173b (acest PR) | inclusă | Fix în CLAUDE sectiunea 3 — paragraf nou commitlint + Husky ESLint detalii. |
| TD-16 | Visual zone l.189 navy overlay 45% (page.tsx) excluse din PR #172 | ⚪ Out of scope | Eventual H7 | 30 min | Out of scope conform investigation PR #172. |
| TD-17 | Visual zone l.515-807 danger 8%/30% (page.tsx) — depinde TD-12 | ⚪ Out of scope | După TD-12 | 1h | Necesită mai întâi color-danger-soft/-text. |
| TD-18 | Visual zone l.1467-1473 cancelled card non-status colors | ⚪ Out of scope | Acceptat | 0 | Out of scope per investigation PR #172 — non-status semantic. |
| TD-19 | STATUS marker outdated în HANDOFF sectiunea 11 | ✅ Resolved | PR #173a | DONE | Rezolvat prin restructurare docs PR #173a. |
| TD-24 | ROADMAP HWE0.5 section missing | ✅ Resolved | PR #176 | DONE | Adăugare ### HWE0.5 sub-section în ROADMAP §0 + cross-reference HANDOFF section 5. Rezolvat înainte de H4.1. |
| TD-25 | Pre-existing npm audit findings (7 vulnerabilities) | 🔴 Critical | HWE0.5-F sau security sprint | 1-3h | 1 Critical (protobufjs RCE GHSA-xq3m-2v4x-88gg via posthog→otel), 2 High (next DoS, vite path traversal), 4 Moderate (dompurify XSS, postcss XSS, uuid bounds, @sentry/webpack via uuid). ZERO contribuție Playwright @1.59.1 — pre-existente în baseline d8bd194. Discovered PR #177 PAS 2.1. |
| TD-26 | Root redirect strategy lipsă (404 la /) | 🟡 Medium | HWE0.5-F sau PR mic dedicat pre-launch | 15-30 min implementare + 5 min smoke test update | App rulează pe subdomeniu (app.weddinglist.ro), domeniu principal e WordPress + Voxel marketing. GET / returnează 404 (no app/page.tsx). Target: redirect / → /login (sau /dashboard authenticated). Smoke test în PR #177 documentează 404 cu `toBeLessThan(500)` — toBe(200) după fix. |
| TD-27 | CHANGELOG missing entries pentru PR #173-#176 | 🟡 Medium | PR mic dedicat docs sau HWE0.5 | 30-45 min | Single source of truth break — PR #173, #174, #175, #176 nu apar în CHANGELOG SECȚIUNEA ACTIVĂ. Discovered PR #177 PAS 6.B. |
| TD-28 | Next.js 16.2.2 "middleware" file convention deprecation | 🟡 Medium | PR dedicat (rename middleware.ts → proxy.ts + update conventions) | 30-60 min | Next.js emite ⚠ "middleware" convention deprecated, use "proxy" instead. Apare la `npm run dev` startup. NU breaks build/runtime, dar future Next.js version va remove suport. Discovered PR #178 PAS 4.2 webServer logs. |
| TD-29 | HMR `.next/` corruption pattern — automated cleanup hook lipsă | 🟢 Low | Eventual sprint dedicate DX | 1-2h | Pattern recognition: dupa edit-uri component live + E2E run, `.next/dev/types/*` poate avea fragmente duplicate trunchiate (cauza HMR interruption). Manual recovery prin `rm -rf .next/` documentat L20 + L21. Eventual: pre-test hook automatizat sau Playwright globalSetup cleanup. Side-note: testele E2E observa și DNS errors (Supabase/WP unreachable din mediu sandboxed) — environment limitation, NU TD separat. Discovered PR #178 PAS 6.4-DEBUG. |
| TD-30 | DEAD CODE — `createAuthenticatedClient` exported but never imported (`lib/supabase-server.ts:20`) | 🟢 Low | PR mic dedicat sau PR 11 (Polish) | 15-30 min | Empirical confirmed PR 1A: `git grep "import.*createAuthenticatedClient"` = zero matches. Function exportata cu zero consumers. Cross-ref: `docs/audit/schema-drift-known-failures.md` §G.2 (L1171-1187). Trigger: PR 11 deschis SAU PR mic dedicat. → ROADMAP §"Future tasks" FT-04. |

**Sumar severitate:** 2 Critical, 10 Medium, 6 Low, 4 Out-of-scope/Convention, 4 Resolved-tracking.


---

## 6. Prompt-uri pregătite pentru execuție

| Fișier                                    | Target PR  | Status  |
|-------------------------------------------|------------|---------|
| PR-164-* până la PR-170-*                 | #164-#170  | USED    |
| PR-171-docs-handoff-audit.md              | #171       | USED (acest PR) |
| Prompt PR #172 Budget type guards         | #172       | TODO (de scris la start next session) |

Prompt-urile sunt în output-ul Claude.ai (sesiunea care le-a produs). Pentru prompt-uri viitoare, format standard:

1. Motto + standard de lucru
2. CONTEXT (PR-uri merged recente, baseline teste, helpers disponibili)
3. TASK (scop, branch name, natura)
4. PAS 0 — Extract context extins (sub-pași 0.1 -> 0.N)
5. PAS 1 — Analiză arhitecturală + STOP (propune strategii)
6. PAS 2 — Execuție (după aprobare)
7. PAS 3 — PR body (PowerShell extern)
8. PAS 4 — Raportare post-merge
9. REGULI ABSOLUTE (CLAUDE.md §8a)
10. Ce NU se atinge (fișiere locked de PR-uri anterioare)
11. Scenarii anticipate (A, B, C cu soluții)

---

## 7. Pattern-uri validate (cheat sheet)

### Prompt structure pattern

- Motto "Nu mai adăuga nimic. Execută."
- PAS 0 extract context -> PAS 1 analiză + STOP -> PAS 2 execuție -> PAS 3 PR body -> PAS 4 raport
- La decizii arhitecturale: minim 2-3 opțiuni cu trade-offs
- "Ce NU se atinge" explicit: lista fișiere locked de PR-uri anterioare

### Workflow patterns

- PowerShell extern pentru fișiere noi multi-line + PR body (L10, L11)
- Verificări secvențial: tsc -> vitest -> build (L12)
- Aprobare per comandă (L8)
- Orice problemă conexă -> raportează (L13)
- Verify on disk post-edit: grep pattern + wc -l + bytes check

### Architectural patterns

- Type guards cu Extract/Exclude inline în predicate (L2)
- Presentation layer Sub-opțiunea B: CSS vars pentru UI, hex pentru non-DOM (L4)
- Pure helpers antidot closure bugs: setState(prev => pureFn(prev, value)) (L3)
- Double cast via unknown pentru Supabase untyped joins (L1)
- Design tokens layered: primitives + semantic aliases (L7)

### Commit message convention

- Sub 72 chars, imperativ, lowercase, conventional commits
- Types folosite: feat, fix, refactor, docs, test, chore
- Scope: domeniu (rsvp, budget, domain, export, styles, theme)
- Exemplu: feat(rsvp): add presentation helpers for labels and hex colors

---

## 8. Style interacțiune user

### Roluri

- **Claude.ai:** planner arhitectural. Produce prompt-uri, analizează rapoarte, aprobă strategii. NU execută cod direct (nu are acces la repo local).
- **Claude Code:** executant tehnic pe mașina user-ului. Rulează git, edit files, vitest, build. Raportează la user, care copiază raportul la Claude.ai.
- **User (itweddinglist@gmail.com):** curier. Operează 3 canale paralel: Claude.ai browser (planning), Claude Code terminal (execuție), PowerShell extern (file ops + PR body).

### Tone

- Bilingual: EN pentru cod/terms tehnice, RO pentru explicații.
- Pragmatic, fără ceremony. User valorifică timpul (tokens limitate).
- User răspunde scurt la întrebări (deseori cu "tu decizi" — dacă e expertiza Claude.ai, decide cu justificare).
- User acceptă bine feedback-ul Claude.ai când e bine argumentat, contestă când nu e convins.

### Waze de comunicare eficientă

- Întrebări cu opțiuni (tap-select) când user e obosit sau pe mobile
- Tabele comparative pentru strategii arhitecturale
- Listă LOCKED pentru decizii ferme vs deschise
- Screenshot-uri de la user pentru validare vizuală post-merge

### Waze de comunicare ineficientă (evitate)

- Ceremony excesivă ("Mulțumesc pentru clarificare!", "Excelentă întrebare!")
- Recapitulări inutile când user e în flow
- Propuneri fără trade-offs concrete
- Amânare decizii când user cere "ce recomanzi"

---

## 9. Protocol sfârșit de tură

Înainte să închizi sesiunea Claude.ai (voluntar sau forced de rate limit), update HANDOFF.md cu următoarele:

### Minim obligatoriu

1. Update secțiunea 1 (Ultima actualizare): timestamp, session info, motiv handoff, next contribuitor așteptat.
2. Update secțiunea 2 (Stare proiect): ultimul commit SHA, baseline teste, branch-uri deschise (dacă e cazul).
3. Update secțiunea 3 (PR-uri merged în tura curentă): append rows la tabel.
4. Update secțiunea 4 (Decizii LOCKED, dacă ai luat decizii noi): adaugă numerotat (L15, L16, etc.).
5. Update secțiunea 5 (Open items): append TODO-uri noi identificate în tură, elimină cele completate.
6. Update secțiunea 6 (Prompt-uri pregătite): markare USED + adăugare TODO-uri noi.

### Opțional (dacă mai sunt tokens)

7. Update secțiunea 7 (Pattern-uri validate): dacă ai descoperit pattern nou reutilizabil.
8. Update secțiunea 10 (Note pentru următorul contribuitor): 2-3 tips/warnings specifice situației.

### Cum committezi update-ul

**Opțiunea A (preferată):** include în PR-ul curent (dacă ai făcut PR feature/refactor în tură).

**Opțiunea B:** PR dedicat docs/handoff-update-YYYYMMDD pe branch nou. Commit message: docs: update HANDOFF.md after [motiv].

**NU push direct pe develop.** Disciplină uniformă (L8-level discipline).

---

## 10. Note pentru următorul contribuitor

### Warnings specifice (context curent la 2026-04-21)

1. **Nu atinge lib/domain/rsvp.ts** decât pentru consultare — PR #164 a stabilizat type guards. Orice modificare la aceste predicate afectează 6+ consumatori RSVP.

2. **lib/rsvp/rsvp-presentation.ts LOCKED** după PR #168. NU extinde API (RSVP_STATUS_COLORS_HEX, getStatusColorHex, getStatusLabel) decât cu approval user explicit. Consumatorii actuali: app/(public)/rsvp/[public_link_id]/page.tsx, lib/export/pdf-export.tsx. Eventual follow-up: app/rsvp/page.tsx dashboard.

3. **PR #170 a introdus 12 CSS aliases în app/globals.css** cu comentariu explicit "Dark mode: override via @media query". Dacă implementezi dark mode, asta e locul, nu hardcoded values.

4. **Budget nu a fost atins în nicio sesiune.** PAS 0 pe Budget va dezvălui probabil duplicare similară cu RSVP pre-refactor (status checks inline, business logic în UI). Plan pentru 3-4 PR-uri, nu 1.

### Tips generale

- User preferă format tap-select pentru decizii cu 2-4 opțiuni — mai ușor decât typing pe mobile.
- User confirmă aproape mereu strategiile recomandate dacă sunt bine argumentate.
- User ridică steaguri când ceva nu e clar ("nu stiu", "ce recomanzi") — NU înseamnă "ocolește decizia", înseamnă "decide tu ca expert cu justificare".
- Rate limits pe cont-ul curent (itweddinglist@gmail.com) sunt reale — planifică pentru oprire în orice moment.

### Known unknowns (pentru investigare la start de tură viitoare)

- Există teste pentru app/rsvp/page.tsx dashboard? (la PR #170 am găsit NO — verifică la Budget)
- BudgetItemStatus shape exact? (nu am văzut încă codul)
- Cum arată consumatorii Budget în UI? (app/budget/page.tsx sau altundeva?)
- Există mealLabel duplicare între pdf-export și translations? (raportat în PR #169 — de verificat la consolidare presentation layer)

---

## 11. Quick reference — surse adevăr proiect

| Fișier | Scop | Stare |
|--------|------|-------|
| **HANDOFF.md** (acest) | Schimb de tură între sesiuni Claude.ai | ACTIV — log operațional |
| **CLAUDE.md** | Convenții și reguli de lucru permanente + arhitectură | ACTIV — regulile jocului |
| **ROADMAP.md** | Plan temporal (H1-H7, HWE0.5+, pre-launch) | ACTIV — direcția strategică |
| **CHANGELOG.md** | Istoric PR-uri merge-uite | ACTIV — single source PR history |
| **CONTEXT.md** | Referință arhitecturală stabilă (system, schema DB, lib structure) | ACTIV — referință permanentă |
| **SPEC.md** | Specification produs + Hard Rules (LOCKED) | ACTIV — source of truth Hard Rules |
| ~~STATUS.md~~ | Snapshots stare proiect | **REDIRECT** — migrat în HANDOFF + CHANGELOG (PR #173a) |
| ~~PRE_LAUNCH_AUDIT.md~~ | Bugs/observații pre-launch | **REDIRECT** — rescriere fresh în PR #173b |

Toate aceste documente sunt în rădăcina repo. **La sesiune start citește:**
1. **HANDOFF.md** (acest fișier) — stare curentă
2. **CLAUDE.md** — reguli AI workflow
3. **ROADMAP.md** — direcția strategică
4. **CHANGELOG.md** — last PR(s) merge-uite

---

*End of HANDOFF.md. Noroc cu tura!*


# HANDOFF.md — Adăugări post-audit (Mai 2026)

> Aceste secțiuni se adaugă la `HANDOFF.md` existent.

---

## Header update (înlocuiește header-ul curent)

**Status proiect:** 🔴 **NOT LAUNCHABLE** (post-audit empirical Mai 2026)
**Faze complete:** 0-12 ✅
**Faza activă:** 13 — Pre-launch Hardening (9 launch blockers confirmate empirical)
**Detalii audit:** `/docs/audit/2026-05-pre-launch.md`

### Verdict empirical

WeddingList NU este lansabil în starea actuală. Audit empirical efectuat 2026-05-04 a confirmat:
- 9 launch blockers (S1, S2, C1, C3, C5, C6, C7, C8, C11)
- 7 violations GDPR cumulative
- Pattern systemic schema drift (cauza rădăcină a 9 bugs)
- RSVP feature complet nefuncțional

### Acțiune curentă

Faza 13.0 (Infrastructure) — schema drift prevention pipeline. PRECONDIȚIE pentru orice fix individual.

---

## Lessons noi L27-L32 (post-audit)

### L27 — Audit empirical, NU "audit de pe documentație"

**Lesson:** Audit-uri pe baza documentației + comments + arhitecturii declarate au valoare ZERO. **Toate 14 puncte din audit nou + 6 din audit original au necesitat verificare empirică prin grep + read pe fișiere reale.**

**Pattern descoperit:** comentarii care mint:
- `lib/rsvp/token.ts` declară "One-time: used_at setat la primul submit valid" — codul nu o face
- `lib/supabase/idempotency.ts:46` declară "Race condition safe" — protejează doar înregistrarea, nu execuția
- `public/privacy.html` declară "Nu utilizăm cookie-uri de tracking" — PostHog rulează necondiționat

**Rule:** când investighez un audit, IGNOR comentariile + documentation declarată. Verific empirical. Comentariu vs realitate divergent → BUG separat de raportat.

### L28 — Schema drift e cauza rădăcină pe care o suspectăm dar nu o verificăm

**Lesson:** 9 bugs din 14 puncte audit confirmate au aceeași cauză rădăcină. Pattern: schema migrations + application code divergent + tipuri Supabase neregenerate post-migration + tests rulează pe mock-uri.

**Recognize early:** dacă văd `column does not exist` sau `null value violates not-null constraint` la runtime în orice handler → **NU e bug izolat, e simptom al pattern-ului**. Pivot direct la verificare structurală pe alte consumers.

**Fix structural:** schema-guard runtime + types regenerate la fiecare migration + integration tests cu DB reală. **NU bug-by-bug.**

### L29 — Tests verzi pe mock-uri = false confidence

**Lesson:** 879/879 tests verzi nu au prins niciun din cele 9 schema drift bugs. Mock-urile reflectă schema declarată în code, NU schema reală în DB.

**Rule:** orice consumer DB nou trebuie să aibă **integration test cu Supabase DEV real**. Unit test cu mock = doar pentru logica pură (validation, transformation, etc.).

**CI gate:** integration tests obligatorii înainte de merge la `develop`.

### L30 — Vulnerabilități compuse > suma componentelor

**Lesson:** S1 (RLS open) + S2 (PostHog leak) + S3 (Referrer-Policy missing) = vulnerabilitate exponențial mai gravă decât oricare individual.

**Lanț de leak descoperit:**
1. PostHog mount root layout → captures `$pageview` cu `public_link_id`
2. Trimis la PostHog Inc. (US-hosted possibly)
3. Atacator cu acces dashboard PostHog → are toate public_link_id
4. Cu RLS open (S1) → exfiltrare totală + falsificare RSVP

**Rule:** investighez vulnerabilități individual + **interacțiunea dintre ele**. Threat modeling cu lanțuri compuse.

### L31 — Audit nou poate fi greșit pe severity, NU pe existence

**Lesson:** Audit nou avea S5 (CSRF gaps) marcat Critical. Realitate empirică: Medium (account)/Low (shadow-session — idempotent refresh, no useful exploit).

**DAR audit nou A RATAT:** import/json POST cu același gap (3rd endpoint). Plus al 4-lea: ratificat C9 ("autosave seating ignoră event_id") ca Critical, realitatea = LOW (edge case 1500ms).

**Rule:** audit external = punct de pornire valoros, **NU sursă de adevăr**. Verific severity empirical + caut bonus findings (pattern: "dacă audit-ul a găsit asta, sunt alte locuri similare?"). În acest audit am descoperit ~20 bonus findings nedocumentate.

### L32 — Time investment în audit empirical = 100% return

**Lesson:** ~2 zile intensive (verificat 14 puncte cu grep + analiză) au prevenit:
- Launch fail public + reputational damage
- GDPR fines (5,000-50,000 RON sau până la 4% turnover)
- Bug-uri din clasa schema drift care reapar lunar
- Vendor lock-in user (export broken)
- Account deletion blocking global

**ROI:** comparativ cu 174-276h fix work, audit-ul a costat ~16h. Return: previne ~10x cost recovery + reputation + legal risk.

**Rule:** pentru orice produs B2C cu PII, **audit empirical pre-launch e investiție, NU cheltuială.** Repetabil pre-fiecare major release.

---

## Decizii LOCKED noi (post-audit)

Toate adăugate în CLAUDE.md §10. Highlights:

- Schema-code consistency: types regenerate + schema-guard + integration tests
- RSVP architecture: anon zero acces, pivot table, shadow invitation, history tracking, sync trigger
- Atomicity: stored procedures cu BEGIN/COMMIT, NU HTTP-uri independente
- Audit log per-step (NU doar success/failure)
- GDPR: consent gate, privacy aliniat cu realitate, GDPR rights endpoints
- Security: headers OWASP complete, CSP report-only, PostHog off pe rute publice
- Idempotency: pattern atomic INSERT ON CONFLICT, adopt universal
- RLS: `is_wedding_role` (role-aware) NU `is_wedding_member` (role-blind)

---

## Lessons noi L33-L37 (post-cross-model validation 2026-05-04)

### L33 — Cross-model validation = util doar cu filtru LOCKED

**Lesson:** ChatGPT 5.5 Thinking a oferit feedback substanțial pe audit-ul Claude.ai (5 riscuri ratate, granularitate PR-uri, calibrare juridică). DAR a propus și 5 puncte care violau direct regulile LOCKED ale user (lista "Top 5 NU merită rezolvate acum" — toate erau ocoliri, nu rezolvări structurale).

**Eroare sistemică ChatGPT:** optimizează default pentru "minimum viable launch" (industry standard pattern). User optimizează pentru "premium long-term, scalabil, fără workaround". Filtrul LOCKED e mecanism de aliniere obligatoriu.

**Rule:** când Claude.ai primește feedback de la ChatGPT/Codex:
1. Clasifică fiecare punct: respectă regulile LOCKED sau le violează?
2. Accept doar puncte care îmbunătățesc quality (granularitate, plase siguranță, gap-uri ratate)
3. Resping fără ezitare orice punct care diluează scope/calitate
4. Documentează decizia per punct cu motivație ancorată în reguli LOCKED
5. NU acceptă blind feedback "rațional" generic — filtrează prin reguli specifice user

### L34 — User este final arbiter pe scope și standard quality

**Lesson:** În răspunsul inițial la feedback ChatGPT, Claude.ai (eu) am acceptat 10 puncte integral, inclusiv "Top 5 NU merită rezolvate acum". User a prins greșeala instant: "propunem o ignorare cand am zis clar ca problemele trebuie rezolvate nu ignorate."

**Pattern:** Claude.ai (orice sesiune) poate ceda în fața argumentului "rațional" generic dacă nu filtrează prin reguli specifice. User este ultim filtru de calibrare.

**Rule:** la cross-model validation:
- Claude.ai propune evaluare per punct
- User ratifică sau reorientează
- Dacă user reorientează → Claude.ai învață și ajustează metodologia (NU doar acel caz)
- Documentez sistemic în HANDOFF.md ca lesson reusable

### L35 — Granularitate ≠ diluare scope

**Lesson:** ChatGPT a propus spargerea Fazei 13.0 în 3 PR-uri concrete (PR 1: types + 3 teste, PR 2: integration harness, PR 3: RLS emergency). Inițial a părut "diluare" prin filtrul LOCKED, dar la analiză onestă:
- Toate componentele Fazei 13.0 RĂMÂN
- PR-uri mai mici = review mai eficient + rollback mai ușor + risk surface mai mic per merge
- Granularitate îmbunătățește calitate, NU o diluează

**Rule:** la cross-model validation, distinge clar:
- "Sparge implementarea în PR-uri mici" = ✅ accept (bună inginerie)
- "Sparge scope-ul, fă doar parte din lucruri" = ❌ resping (ocolire)
- Dacă feedback ChatGPT propune granularitate cu scope păstrat → accept
- Dacă feedback propune scope reducere ("amânăm la post-launch") → resping

### L36 — Filtrul LOCKED e mecanism de aliniere, NU rigiditate

**Lesson:** Filtrul LOCKED nu înseamnă "respinge tot ce vine de la ChatGPT". Înseamnă "evaluează prin reguli specifice user". 

Din 12 observații ChatGPT pe audit:
- ✅ ACCEPT: 10 puncte (puncte 1, 2, 3, 4, 5, 6, 8, 10, 11, 12)
- 🟡 ACCEPT cu precizare: 2 puncte (7 — pivot rămâne LOCKED dar implementare granulară; 9 — accept (a)+(b), resping (c))
- 🔴 RESPING: "Top 5 NU merită rezolvate acum" (5 sub-puncte) + 1 sub-punct din 9

Plus 5 risks (A-E) accept integral — gap-uri reale ale audit-ului.

**Rule:** filtrul LOCKED produce calibrare onestă, nu blocadă. Rezultatul e plan îmbunătățit (5 risks adăugate, granularitate concretă) cu scope păstrat (toate 9 launch blockers + scope rămân).

### L37 — Codex usage = excepție motivată, NU default

**Lesson:** User are acces la Codex ca backup executant. **Codex = util DOAR pentru taskuri mici, izolate, când aduce valoare reală peste Claude Code.**

NU default executant — Claude Code rămâne primary pe orice task complex (migrations, RPCs, RLS, multi-file refactor). Codex = excepție pentru:
- Claude Code rate-limited + task urgent
- Verificare paralelă pe patch mic (Claude Code livrează → Codex verifică independent → comparăm)
- Refactor 1-3 fișiere scope clar

**Rule:** sesiuni Claude.ai viitoare NU recomandă Codex by default. Doar dacă task-ul fits criteria specifice. Default executant = Claude Code.

### L38 — Granularitate execuție split PR mari

**Lesson:** PR-urile mari (>10h focused work) cu scope arhitectural critic au risc surface mare per merge: review superficial, conflict potential, rollback granularity zero, merge timing dependency cumulativ.

**Pattern empirical PR 1A:** PR 1 original (Schema Drift Safety Net, 18-30h, 10 tasks, 4 defense layers) split în 4 sub-PR-uri secvențiale (PR 1A compile-time typing + PR 1B integration tests + PR 1C CI fingerprint + PR 1D runtime guard). Cross-model validation (ChatGPT 5.5 Thinking) + filtrare LOCKED rules → split decision validated.

**Rule:** la PAS 0 al fiecărui PR, dacă scope estimat >10h focused → propune split înainte de execuție. Granularitate per-task max 5 sub-tasks per PR. NU split granular peste 2-3 sub-PR-uri 4-6h fiecare optim (overhead context switch).

### L39 — Husky pre-commit fail-CLOSED structural (Decizia A4)

**Lesson:** Hook-uri Husky care depind de prerequisite externe (Supabase DB / network / services) trebuie să **fail-CLOSED** când prerequisite missing — exit 1 + commit BLOCKED + mesaj user-friendly cu instrucțiuni concrete. NU silent degradation prin auto-fallback.

**Pattern empirical PR 1A:** `db:types:generate` hook (PR 1A.3) face check Supabase local UP. La Supabase DOWN (test scenariu 3 PR 1A.3), opțiunea A propusă = auto-fallback la `db:types:linked` (cloud regen). REJECTED — risc silent degradation: user NU știe că types regenerate dintr-o sursă diferită (cloud schema poate diverge de local schema). Option B adoptat: hook fail cu exit 1 + 3 instrucțiuni clare (start Supabase / regen manual cloud / re-commit). Empirical validated.

**Rule:** orice hook cu prerequisite extern → fail-CLOSED + actionable error message. User decide explicit fix path, NU automat. Aplicabil cross-PR pentru future hooks similar.

### L40 — Defense-in-depth Layer 1 ~70% coverage gap

**Lesson:** Compile-time TS strict cu Database generic (Layer 1) acoperă ~70% schema drift bugs (Insert/Update objects + SELECT cascade + RPC params + enum narrowing). ~30% remain undetected: filter operators column names (`.eq`, `.is`, `.gt`, etc.) accept any string, NOT strict-typed against Database schema.

**Pattern empirical PR 1A:** PR 1A.4 markers placement: 56 markers consumed Layer 1 errors, dar C5 `tables.deleted_at` filter (`.is("deleted_at", null)`) NU a fost detected compile-time (single layer covers ~70%). Empirical proof la sub-cluster placement testing — filter operators escape Layer 1.

**Rule:** Layer 1 typing NU sufficient standalone — false confidence dacă single layer. Plan layered defense obligatoriu: PR 1B integration tests cu DB reală (Layer 2), PR 1C CI `db:types:check` + schema fingerprint (Layer 3), PR 1D runtime schema-guard la app startup (Layer 4). Multi-layer = empirical justified, NU over-engineering.

### L41 — Display Claude Code vs disk (verify-on-disk pattern)

**Lesson:** Claude Code display output (file diffs, tool results, marker count summaries) poate diverge subtle de disk reality. Source of truth = disk verify empirical (`cat`, `wc`, `grep`, `xxd`), NU display.

**Pattern empirical PR 1A:** PR 1A.4 commit body declarat "8 Cat 4 markers" dar `git show e575780 | grep -c "Cat4"` empirical = 7 (reconciled în registry §"Catalog NEW final"). Display report ≠ disk reality. Plus multi-Edit bulk markers RSVP route inițial display "is_active de 3 ori" în diff preview — disk verify confirmed structurally correct (display rendering artefact).

**Rule:** post-Edit / post-Write / post-Bash, ALWAYS verify pe disk cu `grep -c` + `wc -l` + `file` ÎNAINTE de a continua. Display = informativ rapid, NU autoritativ. Decisions empirical pe disk only — pattern aplicabil cross-sesiuni Claude Code (regula §8a verify-on-disk).

### L42 — Supabase CLI stdout contamination

**Lesson:** Supabase CLI commands (gen types, etc.) emit la stdout banners + connection messages care contaminate piped output (ex: `... > file.ts`). Genereaza file invalid TS — first lines = banner text, NU TypeScript code.

**Pattern empirical PR 1A:** PR 1A.1 Task 1A.1 first run `npx supabase gen types typescript --local > types/database.ts` produced file cu prima linie `Connecting to db 5432` + last lines banner `A new version of Supabase CLI is available...`. tsc compile error pe banner text. Hardening required: `stdio: ["inherit", "pipe", "ignore"]` + start/end markers validation în `scripts/db-types-generate.ts`.

**Rule:** pipe Supabase CLI stdout into file = filter output mandatory. Use `stdio: ["inherit", "pipe", "ignore"]` în execSync (ignore stderr) + post-process validation cu start markers (ex: `export type Database`) și end markers. Aplicabil oricărei tool CLI cu side-effect stdout (banners, update notices).

### L43 — Pre-emptive findings durante refactor

**Lesson:** Durante refactor (typing, markers placement, Edit cluster), descoperire finding NEW critical trebuie capturată imediat în scratch — NU defer post-completion. Riscul "țin minte și revin" = pierdut sau diluat în context.

**Pattern empirical PR 1A:** Task 1A.4 marker placement scratch capture: C12 (`rsvp_invitations.expires_at` security HIGH, 22 errors cascade single root cause), NEW-10 (`payments.due_date` dashboard UX silent broken, `paymentDueSoonCount` always 0), F13 RSVP invitations Insert (3 simultaneous bugs disclosed via L46 pattern). Findings reconciled în registry post-Task 1A.5.

**Rule:** Severity criteria capture imediat: (a) security HIGH / data loss / broken core feature, (b) cascade ≥5 errors single root cause, (c) hidden bug masked TS overload (L46), (d) cross-cutting concern multi-PR. PAUSE refactor → document scratch (Finding + Severity + Empirical + Fix + PR target + Marker preview) → resume.

### L44 — Marker placement Pattern A/B per error level

**Lesson:** `@ts-expect-error` consumă DOAR linia imediat următoare. Pentru Insert/Update objects, placement depinde de tipul erorii TS reportate — single pattern wrong → cascade markers (consume errors lineară, NU root cause). Identify pattern ÎNAINTE de placement.

**Pattern empirical PR 1A:** 2 patterns confirmate Task 1A.4: **A** — eroare la `.insert()` line (Insert object incomplet, NOT NULL field missing) → marker deasupra `.insert({...})` line (ex: C5 `weddings.location_name`, C7 `rsvp_invitations.event_id`, NEW-7 `seats.event_id`). **B** — eroare la field line ÎNĂUNTRU object literal (legacy field în cod dar lipsă din schema) → marker ÎNĂUNTRU object, deasupra liniei field-ului (ex: NEW-9 `rsvp_responses.id` legacy remap). Detection: Fișier 2 sub-cluster F — 6 markers added, 4 consumate inițial → mis-placement detected via `tsc` check intermediar → re-Edit → 6 consumed final.

**Rule:** Pre-marker placement: citește eroare TS exact (linie:coloana `tsc.log`) + identifică Pattern A (top-level Insert strict, NOT NULL missing) vs Pattern B (per-field, legacy/extra field). Post-cluster Edit, `tsc` check intermediar OBLIGATORIU — discrepanță count consumed (markers added vs errors removed) = signal mis-placement → fix prin re-Edit.

### L45 — Verify schema empirical ÎNAINTE de marker categorization

**Lesson:** Audit catalog pre-launch (anticipated findings, NEW-N notation) e TENTATIVE STARTING POINT, NU CONFIRMED REALITY. Source of truth = `types/database.ts` (regenerated empirical) + `tsc` log (REAL TS error linie:coloana) + registry `docs/audit/schema-drift-known-failures.md` post-reconcile. Audit anticipated category wrong la majoritatea cases.

**Pattern empirical PR 1A:** 5/5 cases formal re-categorize Task 1A.4 (registry §D) + 1 special case F13 (registry §E.3 L46 disclosure): F8 wl-audit NEW-1 (anticipated `request_id` schema drift) → Cat4-json-meta (`AuditMetadata` index sig); F9 idempotency NEW-2 (anticipated `request_hash` drift) → Cat4-json-response (`Record<string,unknown>` not Json); F17 guest-events NEW-3 (anticipated `wedding_id` drift) → Cat3-narrow `attendance_status` null narrow; NEW-4 manual RSVP (anticipated `rsvp_responses.wedding_id` drift) → C8 naming consolidation (schema HAS `wedding_id`; real bug = `invitation_id` NOT NULL passes null); F15 rsvp/dashboard Cat3-narrow → Cat3-enum subset (`InvitationProjection.delivery_status` missing `"revoked"`); F13 rsvp/invitations NEW (special) → Cat3-enum REPORTED + C12 + C7 HIDDEN (L46 disclosure pattern). Pattern systemic — audit anticipated category ALWAYS wrong empirical (5+1/6 cases).

**Rule:** Pre-marker placement OBLIGATORIU: (1) `grep "<table>:" types/database.ts -A20` confirmă coloane existente, (2) `grep "<file>" /tmp/tsc.log -A6` eroarea exactă, (3) cross-reference category match. NU asume audit catalog correct. Re-categorize transparent în registry post-empirical (regula 11 onestate). Cross-reference: registry §D "Re-categorizations 5 cases" + §E.3 "L46 hidden bugs F13 disclosure".

### L46 — Hidden bugs masked by TS overload selection

**Lesson:** TypeScript reports DOAR primul error în Insert/Update validation chain. Multiple bugs simultane în same Insert object = doar primul vizibil compile-time. `@ts-expect-error` consume primul → restul rămân HIDDEN până post-fix Round 1 sau runtime.

**Pattern empirical PR 1A:** F13 `app/api/rsvp/invitations/route.ts` L106-116 Insert (10 fields) = 3 simultaneous bugs identificate empirical, doar 1 REPORTED by TS: (a) Cat3-enum `delivery_channel` (string \| null vs `rsvp_delivery_channel` enum narrow) REPORTED, (b) C12 `expires_at` extra field schema lipsă HIDDEN, (c) C7 `event_id` NOT NULL missing HIDDEN. Single marker placed pentru REPORTED only — C12 + C7 ar surface DUPĂ fix Cat3-enum Round 1.

**Rule:** Post-fix Round 1 pe orice marker, OBLIGATORIU `npx tsc --noEmit` pentru Round 2 errors discovery. Insert/Update cu 5+ fields = high-risk hidden bugs — pre-investigation: Schema Required (NOT NULL) vs Insert, Schema column names (existence) vs Insert (extra fields), Type narrowing pe enum/nullable. Reviewer note explicit în PR description pentru Round 2 expected.

### L47 — Typing-only refactor pattern (separate Layer 1 PR-uri)

**Lesson:** PR-uri cu scope "Layer 1 typing" (Database generic + `@ts-expect-error` markers placement) trebuie ZERO logic changes — separare clară responsibility (typing layer NU bug fixes inline). Reviewer expectation match: PR review focused exclusiv pe typing correctness.

**Pattern empirical PR 1A:** Task 1A.4 commit `e575780` = `chore(types)` prefix, ZERO logic edits, only typing application + 56 markers placement across consumers. Vitest regression check passes unbreakable (0 delta tests). Decizia LOCKED A2 cross-model validation.

**Rule:** Split PR Layer 1 typing complet separate de PR-uri downstream cu bug fixes (PR 1E, PR 1F, PR 3, PR 4, PR 9, PR 11). Scope contract explicit în PR description: "typing-only, zero logic changes, markers delegate fixes la PR target". Aplicabil oricărui future Layer 1 PR (other defense layers similar pattern).

### L48 — Catalog-with-PR-targets pattern (NU bug fixes în catalog PR)

**Lesson:** PR-uri "catalog" (markers + registry + lessons + ROADMAP placeholder) trebuie ZERO bug fixes inline. Scope = documentation + PR target identification, NU execution. Bug fixes consume markers post-fix per PR target downstream — separation clear pentru reviewability.

**Pattern empirical PR 1A:** 56 markers documented în registry `docs/audit/schema-drift-known-failures.md` + PR targets distribution (PR 1E enum narrowing, PR 1F RPC+Json hardening, PR 3 RSVP minimal, PR 4 account deletion, PR 9 import JSON, PR 11 polish), NU fix-uri inline. Markers = "fix in PR X" delegation explicit. Decizia LOCKED A3 cross-model validation.

**Rule:** Catalog PR scope = identify + categorize + delegate. Fix execution = downstream PR cu marker consumption verify (`npx tsc --noEmit` reduce errors corespunzător markers consumed per PR target). Maintain separation clear pentru reviewability + scope contract.

### L49 — Display artefacte cross-source: math + grep + display reconciliation

**Lesson:** Display Claude Code (counts, summaries, file diffs) poate diverge de disk reality pe trei axe simultan: (a) math empirical recalibrate (estimates ≠ counts reale), (b) display artefacte rendering (multi-Edit preview "is_active de 3 ori"), (c) grep substring false positives (pattern "main" matches "remote/main" + "develop/main"). Extension L41 — pattern multi-axis NU single-axis.

**Pattern empirical Task 1A.5:** 3 instante descoperite simultan: math ROADMAP Edit 1 (estimate "+7 PR-uri", reality "+6" recount empirical), display "Faza 13 PR 1A:" duplicate concern verified empirical → rendering artefact, Step S3 grep substring `git branch | grep "main"` false positives `stale/main`, `develop/main` (NU bug, expected substring behavior).

**Rule:** post-display Claude Code, OBLIGATORIU 3 verify-uri: math recount empirical (`grep -c` + `wc -l`, NU eyeball estimate), disk diff vs display preview (`cat` post-Edit), grep cu word-boundary `\b` sau `-w` flag daca pattern match cu substring risk. Cross-ref: L41 baseline pattern, L46 hidden bugs.

### L50 — Naming + scope + subject discipline (commit hygiene)

**Lesson:** Conventiile de naming (PR sub-numbering, scope tags, subject format) sunt fragile daca schimbate mid-sesiune. Patterns LOCKED early prevent cascade rework.

**Pattern empirical Task 1A.5:** 3 catches: PR sub-PR naming "PR 1.5/1.6" → schimbat la "PR 1E/1F" → regression CHANGELOG entry (Edit 0a fix necesar pentru consistency); subject commit `feat(faza-13): ...` 113 chars + em-dash → ZERO precedent in git log → Option D adopt mixed case `feat: faza 13 pr 1a...` 94 chars ASCII pur (R16); scope tag selection `feat(faza-13)` vs `chore(types)` decided ad-hoc.

**Rule:** la PAS 0 al fiecarui PR, decisively LOCKED inainte de Edit 1: naming sub-PR (1A/1B vs 1.1/1.2 vs descriptive), subject template (max 72 chars, ASCII pur, scope tag) cu preview inainte de commit, scope tag verify pattern existing (`grep "^| #" CHANGELOG.md | head`).

### L51 — Source of truth multi-doc reconciliation

**Lesson:** Cand info exista in multiple locuri (registry vs scratch vs HANDOFF vs CHANGELOG), hierarchy autoritate trebuie LOCKED early. Default = "ultima committed pe disk = canonic". Scratch local + decizii pre-cleanup = transient, NU sursa de adevar.

**Pattern empirical Task 1A.5:** 2 catches: NEW-4 → C8 reconciliation — SCRATCH local zice "NEW-4", registry committed zice "C8 naming consolidation" → registry committed = source of truth (NU scratch incomplete); Decizii LOCKED A2+A3 captured pre-cleanup (typing-only + catalog-with-PR-targets) → L47 + L48 over-rule recomandare "skip — nu sunt critical lessons".

**Rule:** la conflict info intre surse, hierarchy fixa: disk committed > scratch local > memory chat; registry §X latest > older sections; CHANGELOG entry merged > HANDOFF Open Items pending. Document explicit reconciliation in Edit cu nota "reconciled: source X vs Y".

### L52 — Git hygiene preventiv (regula 12 safe variants)

**Lesson:** Git commands cu side-effects (delete, force-push, reset) au 2 variante: safe (`-d`) vs forced (`-D`, `--force`). Default LOCKED = safe variant. Forced doar cu verify-on-disk + raport explicit user.

**Pattern empirical Task 1A.5:** 2 catches: `git branch -d` (safe — refuza daca unmerged) vs `-D` (forced) — adoptat `-d` even daca Claude Code default propus `-D`; `.gitignore` Edit propus → verify net-effect ZERO vs HEAD (preventive cancel-out empirical) → Edit cancelled before commit daca diff e ZERO.

**Rule:** orice git command destructive: safe variant default (`-d`, NU `-D`; `--soft`, NU `--hard`); pre-execution diff vs HEAD verify (mai ales pentru Edit-uri care "ar trebui" sa faca X); ZERO-diff result = STOP, NU commit (cancellation legitima, NU bug).

### L53 — Estimate vs realitate empirical (count discipline)

**Lesson:** Estimates pre-action ("vom curata ~10 stale refs", "~45 orphaned branches") diverg sistematic de realitate empirical. Fara recount post-action, divergence se cumuleaza in docs ca "fapte" false.

**Pattern empirical Task 1A.5:** 2 catches: Step S2 estimate "10 stale refs pruned" → reality "11 stale refs pruned" empirical; Step S3 estimate "~45 orphaned branches" → reality "58 orphaned branches" empirical (count substring inclusiv false positives, dar absolute numbers >>> estimate).

**Rule:** orice action cu count claim in docs: empirical count post-action OBLIGATORIU (`wc -l`, `grep -c`); update doc cu count real, NU keep estimate; nota explicit "empirical NU estimate" daca divergence > 10%.

### L54 — Capture-during-refactor pattern (extension L43)

**Lesson:** Pre-emptive findings discoveries durante refactor (typing, markers, Edit cluster) trebuie captured imediat in scratch — pattern L43. Extension empirical Task 1A.5: nu doar findings critical (security HIGH), dar si **process catches** (math errors, naming drift, scope artefacts) merita capture immediate, pentru lessons HANDOFF post-PR.

**Pattern empirical Task 1A.5:** 11 process catches captured during sub-pas execution in `SCRATCH_CATCHES_TASK1A5.md` (subsequent pierdut disk-reset, reconstructed din chat). Consolidated to 9 lessons L49-L57 prin grouping logic (R10 cluster mic).

**Rule:** durante orice Sub-pas execution: process catch detected (display artefact, naming drift, count error) → scratch capture imediat in chat session OR file local; post-PR consolidation lessons in HANDOFF, grouped logic (NU 1:1 catch:lesson); source-of-truth fallback: daca scratch pierdut, chat session = autoritate pana la compactare (apoi pierdut definitiv).

### L55 — Future/viitor formulations require triggers

**Lesson:** Formulari "future task", "viitor", "amanat", "post-launch", "eventual" fara trigger condition explicit = drift garantat. Item-ul zace pasiv in docs pana cineva il re-gaseste accidental (sau, mai des, NU il re-gaseste deloc).

**Pattern empirical chat curent (Pachet A planning):** Item ROADMAP "Future tasks" propus initial cu format `| FT-01 | task | ROI | complexitate | note |`. User a flag-uit instant: *"future poate insemna oricand"*. Decizie revizuita la triplu-ancorat (ROADMAP + HANDOFF + CHANGELOG) + coloana Trigger explicit per item. Auto-catch in meta-proces (regula aplicata pe insusi procesul de creare a regulii).

**Rule:** orice item categorizat "future" / "later" / "eventual" / "post-launch" / "amanat" trebuie sa aiba 4 ancore minim: locul canonic (ROADMAP §"Future tasks" sau echivalent) — single source of truth; vizibilitate per sesiune (HANDOFF Open items / Medium-term backlog); trigger condition explicit ("cand deschidem PR X" / "cand user observa Y" / "data Z") — ce eveniment il scoate din "future" in "active"; trace istoric (CHANGELOG entry care l-a creat). Cross-ref: R17 din lista Reguli LOCKED.

### L56 — Markdown rendering chat + planner parafrazare = pierderi copy-paste

**Lesson:** Prompt-uri din chat Claude.ai pierd sistematic la copy-paste catre Claude Code din 2 cauze: (a) markdown rendering — backticks inline (`` ` ``), bold (`**text**`), italic, links auto-rendat — chat renderea vizual, clipboard copiaza textul rendat NU sursa raw; (b) planner parafrazare — Claude.ai planner rescrie din summary Claude Code in loc de text disk verbatim, generand old_str-uri inexacte.

**Pattern empirical Pachet A Edit 1 + Edit 3:** Edit 1 prompt initial inclus old_str cu `.next/` (backticks) + `**Sumar severitate:**` (bold) — ambele pierdute la markdown rendering chat → Claude Code detectat empirical, oprit Edit, cerut re-typeaza prompt. Edit 3 prompt v2 inclus old_str cu Rule L48 parafrazat de planner ("Bug fixes pentru ulterior PR-uri") in loc de text disk verbatim ("Fix execution = downstream PR cu marker consumption verify...") — Claude Code detectat empirical, oprit Edit, cerut re-typeaza cu disk reality.

**Rule:** orice prompt Claude.ai → Claude Code cu code references, bold, sau formatare nested: prompt-ul COMPLET in fence cod brut exterior (` ``` ` cu 3 backticks); ZERO fence-uri interne nested; user copy-paste prin buton "Copy" UI Claude.ai (NU select+ctrl+c din rendering); old_str ALWAYS din raport empirical Claude Code (NU parafrazare planner); verify in input Claude Code ca vezi backticks literal inainte de Enter. Daca markdown e mancat sau text e parafrazat: STOP, cere user re-trimitere cu disk verbatim.

### L57 — Etichete numerice ≠ count empirical (gap-aware verify)

**Lesson:** Etichetele numerice (TD-XX, L-XX, PR-XX, FT-XX) pot avea gap-uri istorice. Verify pattern `grep -c "^| TD-"` returneaza count empirical (numar de matches), NU eticheta max. Pre-edit verify trebuie sa foloseasca delta (count post − count pre = +N), NU valoare absoluta (count = max eticheta).

**Pattern empirical Pachet A Edit 1 + Edit 2:** Edit 1 prompt expecta `count = 30` pe baza etichetei TD-30, realitate `count = 26` (gap-uri TD-20..TD-23). Edit 2 prompt expecta `count linii numbered bold = 17`, realitate `count = 32` (15 pre-existente + 17 nou). Discrepante false (Edits corecte, doar verify check off pe valoare absoluta).

**Rule:** verify counts: foloseste delta vs pre-edit baseline (count post − count pre = +N expected), NU valoare absoluta (count = max eticheta); pre-edit OBLIGATORIU: capture count actual (`grep -c "^| TD-"` inainte de Edit) ca baseline; post-edit asteptat: `pre-count + N` (cati ai adaugat); document reconciliation in raport: "count absolut X, delta corect +N vs pre-baseline Y".

### L58 — Conventional Commits dual line-length rules (body + footer max)

**Lesson:** commitlint (Conventional Commits parser) enforces 2 rules independent: `body-max-line-length: 100` si `footer-max-line-length: 100`. Switching paragraph between body si footer trailer pe baza pattern `Key:` colon-prefix la inceput. Practic: TOATE liniile (subject + body + footer) trebuie sub 100 chars regardless de tipul paragraph.

**Pattern empirical Pachet B Edit Section 1 + commit:** initial commit message cu paragraph headers colon-prefix (Edits applied:, Verify:, Cross-ref:) a triggered footer-max-line-length violation pe paragraf >100 chars. Splitting footer in 3 sub-paragrafe NU a rezolvat — alte paragrafe cu colon-prefix au fost tot tratate footer trailers. Workaround: paragraph headers cu DOT suffix (Updates aplicate. NU Updates applied:) + ALL lines <100 chars empirical.

**Rule:** orice commit message non-trivial: paragraph headers cu DOT suffix (NU colon-prefix); ALL lines (subject + body + footer + bullets) <100 chars; pre-commit verify cu `cat -n` count + manual line length check obligatoriu inainte de git commit.

### L59 — Display Write tool corruption Windows terminal + UTF-8

**Lesson:** Claude Code Write tool display preview e corupt vizual cand body file contine caractere UTF-8 speciale (em-dash —, sageata →, paragraph §) + terminal PowerShell Windows. Lines duplicate, characters overwrite, numbers ordering scrambled. Sursa pe disk e curata, dar preview e impossible de verificat vizual.

**Pattern empirical Pachet A commit message + Pachet B prompts:** Write tool display preview rupt reproductibil cand text contine — sau →. Confirmed la 2 instances diferite Pachet A. Sursa Claude Code raportata era curata, dar preview rendering Claude Code arata caractere amestecate. NU e file content corruption, e display rendering artefact.

**Rule:** orice commit message + prompt cu UTF-8 special chars: bypass Write tool entirely; foloseste heredoc stdin pipe (cat <<'EOF' | git commit -F -) sau prompt rewrite ASCII pur strict. Pre-execute: verify body cu cat -n in subshell (NU Write preview) inainte de commit/edit. Daca display preview arata corupt: STOP, NU aproba based on visual.

### L60 — Heredoc stdin pattern reusable (commit message bypass Write)

**Lesson:** Pattern reusable pentru orice commit message non-trivial: heredoc stdin (cat <<'EOF' EOF) pipe direct la git commit -F -. ZERO Write tool, ZERO file intermediar (heredoc = stdin pipe), ZERO fisier scratch. Newlines explicite per linie permit body multi-line cu fiecare linie sub 100 chars. Single-quoted heredoc ('EOF') previne shell expansion ($variables, backticks evaluated).

**Pattern empirical PR 183 + 184:** Pachet A commit failed 5 tentative cu git commit -m direct (footer trap, body line length, etc.). Workaround heredoc stdin succeeded la prima try cu DOT suffix headers. Section 1 update commit reused pattern, succeeded la a 2-a tentativa (1 line length minor adjustment). R18 LOCKED capture pattern.

**Rule:** orice commit message non-trivial: usar heredoc stdin DEFAULT, NU git commit -m direct. Pattern obligatoriu: cat <<'EOF' header subject + body cu DOT suffix headers + bullets ASCII + EOF | git commit -F -. Pre-commit verify: cat <<'EOF' | cat -n in subshell pentru line count + length check.

### L61 — Planner Claude.ai auto-violation R16 (UTF-8 in commit content)

**Lesson:** Claude.ai planner mid-sesiune obosita uita propriile reguli LOCKED. Specific: planner propune commit message body cu UTF-8 special chars (em-dash —, sageata →) violand R16 LOCKED ("ASCII pur strict in commits/hooks"). Recurence pattern: chiar si dupa explicit catch + fix, planner repeta violarea la prompt urmator.

**Pattern empirical Pachet B Edit 1 prompt:** Planner a propus old_str cu diacritice romanesti (amânat, fără, condiție) cand disk reality era ASCII pur (amanat, fara, conditie). Empirical confirmed la 2 instances diferite in chat sesiune. Sursa: planner "umanizeaza" textul automat fara verify-on-disk pre-prompt.

**Rule:** Claude Code = plasa de siguranta empirical pentru R16 in commits + R11 onestate verify-on-disk pentru old_str. Pattern: pre-edit verify obligatoriu raporteaza textul disk verbatim; planner foloseste textul raportat NU memoria proprie. Daca planner-ul propune diacritice/UTF-8 in old_str: STOP, re-ask user pentru re-paste verbatim disk.

---

## Decizii LOCKED noi (post-addendum 01)

Toate adăugate în CLAUDE.md §10.4 (reformulat), §10.6.A (nou), §10.7.A/B (nou), §13 (nou), §12 (reformulat).

Highlights:

- **§10.4 reformulat:** Atomicity granulară per complexitate (RPC pentru atomicitate reală, app-layer cu idempotency pentru CRUD simplu) — NU "RPC by default pe tot"
- **§10.6.A:** DPO review pre-launch obligatoriu pentru privacy policy + processors
- **§10.7.A:** Token redaction în logs (Vercel + Sentry + custom logger middleware)
- **§10.7.B:** Public RSVP rate limiting cu constant-time response
- **§13:** Production drift prevention DEV vs PROD (schema fingerprint în CI)
- **§12 reformulat:** Sursa de adevăr arhitectural = Claude.ai + Claude Code; ChatGPT/Codex = suport, NU surse de decizie; filtrul LOCKED OBLIGATORIU

---

## Status post-addendum 01

**Scope Faza 13:** NESCHIMBAT — toate 9 launch blockers + scope complet rezolvate, NU "amânate post-launch"

**Estimare:** 174-276h → 186-296h (+12-20h pentru 5 risks A-E)

**Granularitate execuție:** 17 PR-uri concrete (vezi ROADMAP.md Faza 13 actualizat)

**Acțiune următoare:** PR 1 — Schema Drift Safety Net (Faza 13.0 partial — types + schema-guard + 3 integration tests + DEV/PROD fingerprint)
