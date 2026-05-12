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

## Reguli LOCKED (21) — filtru permanent sesiuni AI

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
19. **Encoding-aware file writes Windows PowerShell** — pentru orice tool-consumable file (patches, scripts, configs, commit messages): NICIODATA `>` redirect (UTF-16 LE default + CRLF normalization PS5.1) sau pipe stdin la `git commit -F -` (BOM injection). Foloseste `[System.IO.File]::WriteAllText` cu `[System.Text.UTF8Encoding]::new($false)` constructor + content replace CRLF la LF pentru normalization. Recovery point validation MUST include functional check post-creation (`git apply --check`, `npm run X`, etc.) — NU doar hash + size. Pattern validat empirical PR #186 + #187 recovery cycle. Cross-ref: lessons L66, L67, L68, L69.
20. **Discovery Log obligatoriu sesiuni multi-edit** — pentru orice sesiune PR cu >3 edits SAU durata estimata >1h, protocol activ: numerotare contiguous reserved (L-next, TD-next, FT-next, R-next), counter explicit mentinut in fereastra planning, categorii discovery (bug functional + inconsistenta docs + anti-pattern + TD/L/FT/R candidates), decision matrix resolution (fix acum vs fix in-PR vs defer cu tracking), pre-close verify counter vs items cataloagate match exact. Cross-ref L81 + L82 (in-flight Pachet E-2 ETA).
21. **CHANGELOG sync verify obligatoriu pre-commit** — pentru ORICE PR (indiferent de touch CHANGELOG.md): `git log --oneline -20` vs CHANGELOG top table grep + cumulative deltas grep. Gap detection mandatory. Detect gap >=1 PR merged absent → STOP, fix retroactive in current PR INAINTE de scope content nou. Synthesis L76 + L85. Pachet E-1 = prima aplicare empirical strict same-PR.

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

R19 auto-catch din chat sesiune Pachet C (post-Layer 1 enforcement complete, recovery
cycle UTF-16 LE patch backup): empirical learned encoding-aware file writes Windows
PowerShell quirks. Redirect default UTF-16 LE PS5.1 + CRLF normalization combo (dublu
hazard pe tool-consumable files). Pipe stdin la git commit -F injecteaza BOM
(commitlint rejects). Conversion UTF-16 la UTF-8 preserva CRLF (necesita LF normalize
explicit). Recovery point hash match NU implica encoding correctness (necesita
functional check git apply --check). Pattern reusable pentru orice file write Windows
+ tool consumption. Lessons L66-L69 capture detalii granular cycle.

---

## 1. Ultima actualizare

- **Data:** 2026-05-12 (Pachet K closure documentation in-flight post-Pachet J.2 PR-B-impl #199 `7c641fa` merged develop)
- **Contribuitor:** Claude Opus 4.7 (session Claude Code, executant tehnic) + Claude.ai supervisor (Vector, decizii prin filtre + briefing-uri anchored grep) + user: itweddinglist@gmail.com / Ionuț
- **Motiv handoff:** Pachet K closure documentation post PR-B cycle COMPLETE (spec J.1 #198 + impl J.2 #199 + docs K #200 pending). 9 edits applied (2 CHANGELOG backfills/insert + 7 HANDOFF updates: TDs 38→40 +TD-43/TD-44 + TD-35 IN-PROGRESS + L94 NEW lesson + Section 12 IMPLEMENTED + Findings catalog 22 F+DF + Sumar cascade). 8 discovery findings empirical Pachet K (DF1-DF8) — 2 RESOLVED in-session (DF7 Edit #7.1 + DF8 Edit #10 cascade fix) — 1 RESOLVED in-edit (DF7 math fix), 5 cataloagate (DF2/DF3/DF5 → L94/Section 12/L94), 1 process-only (DF1/DF4/DF6). 16 PR-B-impl findings (F1-F16) consolidate audit trail Section 5 sub-section L298. L93 dual-pass mandate validated empirical 5 self-test runs (Phase 1 + Phase 2 + Phase 3 Edits #3-#8). L88 dual-pass mandate empirical proof DF7 catch (same-session fix Edit #7.1). Workflow `.github/workflows/changelog-sync.yml` LIVE develop @ 7c641fa, TD-35 IN-PROGRESS awaiting first empirical trigger post Pachet K #200 merge.
- **Next contribuitor asteptat:** Pachet L post Pachet K merge + workflow first empirical trigger verify (~5 min observation post-merge). Priority queue forward: (1) workflow green verify → TD-35 RESOLVED; (2) PR-C TD-41 Section 2 sync workflow (~3-5h, template PR-B-impl pattern); (3) TD-38 C4 launch blocker Critical investigation (~3-5h, schema fix); (4) TD-43 spec amendment PR-D (~1-2h Section 12 SF-12 + version refs); (5) TD-44 Husky format:check hook (~15-30 min, hygiene quick win). Alternative interleaved: feature work modules (Magic Fill / RSVP / Budget) per priorities runway.

---

## 2. Stare proiect

- **Branch default:** develop
- **Ultimul commit pe develop:** 52c7457 — Merge PR #195 (Pachet H mini: #194 hash + L91 PowerShell catch)
- **Baseline teste:** 879 passed + 4 skipped (Vitest, 40 test files) + 4 E2E Playwright (smoke 2 + auth 2)
- **Last build:** SUCCESS (Next.js 16.2.2 Turbopack)
- **Branch-uri deschise:** docs/pachet-i-1-section-2-fix-plus-5-tds-catalog (curent, pentru PR-I.1).

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

- **FT-01** ✅ RESOLVED — ROADMAP cleanup PR 1 entry restructure DONE Pachet E-1 #190 `0894659` (ALPHA Status block 7 sub-PR + BETA tabel sumar Status column + GAMMA #TBD3 stale fix). Trigger condition satisfied empirical (PR Pachet E-1 atinge ROADMAP.md → bundle FT-01 applied).
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
| TD-31 | GitHub Actions Node.js 20 deprecation warning — `actions/checkout@v4` + `actions/setup-node@v4` running on Node.js 20 (deprecated). GitHub forced upgrade Node.js 24 default in future. | 🟢 Low | Când `actions/checkout@v5` + `actions/setup-node@v5` release stable disponibil, sau forced upgrade GitHub timeline anunțat | 25-40 min (verify v5 release + bump 2 linii ci.yml + PR + Husky + CI verify) | Discovered PR #188 build-and-check job May 10 2026 (Pachet C). Annotation "Node.js 20 actions are deprecated" visible Complete job step. Warning, NU error; build green; zero impact actual. Cross-ref: Pachet D capture. |
| TD-32 | Recovery patches user-local pending cleanup — `$env:USERPROFILE\pr1b0-edits-utf8.patch` (UTF-8 valid recovery) + `pr1b0-edits.patch` (UTF-16 LE corrupt original) | 🟢 Low | Manual cleanup user-local oricând | 2-5 min (`Remove-Item` 2 files) | Created PR 1B.0 #187 recovery cycle May 10 2026. Hygiene only, user-local files NU in repo. Cross-ref: lessons L67 + L68 + L69 (UTF-16 LE redirect + recovery point validation + git apply LF strict). |
| TD-33 | Format patterns reference catalog absent — lessons format `### L<n>`, reguli format `N. **<title>**`, TDs `| TD-N |`, FTs `| FT-N |`. Documenta in CLAUDE.md sau HANDOFF reference section pentru future planner pre-flight. | 🟢 Low | Convention | 20-30 min | Trigger PR mic dedicat sau Pachet F |
| TD-34 | Consolidate section headers lessons HANDOFF.md inconsistency — L27-L32 + L33-L37 sectional headers + L38+ concatenate. Decizie: add complete schema sectional per batch sau remove partial headers concatenate uniform. | 🟢 Low | Cleanup | 30-45 min | Trigger PR mic dedicat sau cleanup sweep pre-launch |
| TD-35 | Workflow YAML changelog-sync.yml audit pre-execution identificat 10 sub-findings security/correctness (shell injection, duplicate entry, self-trigger loop, race condition, regex fragility, zero rollback, zero audit trail, hardcoded branch, date accuracy, type fallback silent). Full detail SF-1..SF-10 în PR-B FULL SPEC section. | 🔴 Critical | Sesiune dedicată PR-B execution (next session, audit security-grade obligatoriu pre-merge) | 3-5h (rewrite design + dry-run 3 scenarii + edge cases gestionate) | Discovered Pachet I.1 pre-flight PR-B audit. Cross-ref PR-B FULL SPEC (Pachet I.2 forward declared) + L90 anti-pattern recurring 3+ structural fix. Blocker PR-B execution până design rewrite. **[STATUS UPDATE Pachet K post PR-B-impl #199 7c641fa merged]:** IN-PROGRESS — workflow LIVE develop @ 7c641fa. Awaiting first empirical trigger post Pachet K #200 merge. RESOLVED defer post first green workflow run observed. |
| TD-36 | Race condition concurrent PR merge în changelog-sync.yml — 2 PR-uri merge simultan (ferestră 5-10s) → 2 workflow instances concurrent → duplicate entries SAU push fail non-fast-forward. Pattern distinct cu implications scalabilitate (NU doar workflow-specific) | 🟡 Medium | Sesiune dedicată PR-B execution (must design idempotent inject pentru scalability per regulă proiect) | 30-60 min (design phase: optimistic concurrency retry loop + duplicate detection grep guard) | Discovered Pachet I.1 pre-flight PR-B audit. Cross-ref TD-35 (umbrella audit). Rar în solo dev curent, dar must design proactive pentru scalability future. |
| TD-37 | .github/workflows/ci.yml lipsește declarație explicită permissions block — folosește default repo-level GITHUB_TOKEN permissions (variable per repo Settings). Încălcare principle of least privilege + self-documenting scope + defense-in-depth. Risk: dacă repo default permissions schimbate, workflow poate escala accidental privilegii | 🟢 Low | PR mic dedicat post-PR-B merged (hygiene security, NU blocker funcțional) | 15-20 min (add permissions: contents: read top-level + CI verify + PR + merge) | Discovered Pachet I.1 pre-flight PR-B output H. Scope micro (~5 linii edit). Defer post-PR-B per regulă "premium fără bug-uri pe termen lung". |
| TD-38 | C4 launch blocker reproduction live — `seat_assignments.guest_id does not exist` (code 42703) surfaced în E2E webserver logs durante Playwright run. API endpoint GET /api/dashboard/stats fail silent (error swallowed by dashboard). Pre-existing known bug per CLAUDE.md §10.12 schema-drift audit | 🔴 Critical | Launch blocker — fix obligatoriu pre-launch (PR dedicat schema migration sau code fix mapping guest_id → guest_event_id) | TBD (require investigation: schema migration vs code mapping fix) | Discovered Pachet I.1 baseline empirical capture (Playwright run, sesiune 2026-05-11). Cross-ref CLAUDE.md §10.12 (existing audit entry). Empirical reproduction confirmation NEW (anterior doar static audit). |
| TD-39 | typescript package NU declarat în package.json dependencies/devDependencies — tsc binary resolves transitively (probabil via eslint-config-next sau supabase deps). Hidden dependency chain risk: build break dacă transitive chain breaks (e.g., upstream dep removes typescript dep) | 🟡 Medium | PR mic dedicat (add typescript la devDependencies explicit, versiune pin) | 15-30 min (add devDep + verify CI green + PR + merge) | Discovered Pachet I.1 baseline empirical capture (package.json grep, sesiune 2026-05-11). Pattern "premium fără bug-uri pe termen lung" — explicit dependencies > transitive resolution. |
| TD-40 | gh CLI absent dev machine — PR creation flows depend manual URL fallback (friction + typo risk title/body). Bash + PowerShell both report "command not found" pe sistem Windows. Workflow improvement, NU blocker funcțional | 🟢 Low | PR mic hygiene install — `winget install GitHub.cli` SAU `choco install gh` | 5-15 min (install + gh auth login + verify gh pr list) | Discovered Pachet I.1 PR #196 creation step (sesiune 2026-05-11). Future PRs benefit automation. Cross-ref discovery counter PR-I.1 finding #8. |
| TD-41 | Section 2 (HANDOFF.md regula 21 + lessons L92 + handoff sections counter) drift 3rd recurrence empirical post-merge — pattern structural distinct de CHANGELOG miss (L76). Workflow separat section-2-sync.yml necesar pentru auto-refresh la fiecare merge HANDOFF edit. | 🟡 Medium | Sesiune dedicată PR-C post PR-B impl merge (structural separat per L83 granularitate + R3 scalability) | 1-2h (workflow similar pattern PR-B impl, lessons learned re-applied) | Discovered Pachet I audit retroactive (3rd recurrence post #195/#196/#197). Cross-ref L90 mandate structural NU tactic. Defer locked PR-B-spec sesiune curentă, execution sesiune separată. |
| TD-42 | actionlint absent dev machine — local YAML workflow validation impossible via standard tooling (`actionlint --version` returns "command not found"). CI-only feedback loop = slower iteration pentru workflow YAML edits future. Workflow improvement, NU blocker funcțional | 🟢 Low | PR mic hygiene install — `winget install rhysd.actionlint` SAU `choco install actionlint` SAU `go install github.com/rhysd/actionlint/cmd/actionlint@latest` | 5-15 min (install + verify `actionlint --version` + test pe ci.yml empirical) | Discovered Pachet J PR-B-spec Phase 2 pre-flight discovery (sesiune 2026-05-12). Future workflow YAML PRs (PR-B impl, PR-C section-2-sync) benefit local validation. Cross-ref TD-40 pattern (gh CLI absent similar hygiene). |
| TD-43 | Section 12 spec amendments pending — sub-A: SF-12 TBD-row edge case (L557 algorithm spec NU cover non-numeric `#TBD` rows at top, empirical impact: workflow IMPLEMENTS Option (a) skip + insert under + `::warning::` per Phase 3 authoring decision PR-B-impl; spec amendment recommended pentru consistency). Sub-B: peter-evans v6 spec (Section 12.2 item 3 + SF-11 + Section 12.6 acceptance L602) → v8.1.0 impl drift confirmed (2 ani vechime între spec date 2024-01-31 și impl actual 2026-05-12). | 🟡 Medium | PR-D dedicated post Pachet K (spec amendment Section 12 SF-12 L557 + version reference L481/L551/L602) | 1-2h (spec amendment edit byte-exact + cross-section consistency dual-pass L93) | Discovered Pachet K Phase 2.5 (F2 SF-12 edge case) + PR-B-impl Phase 3.1 (F3 peter-evans version drift). Cross-ref SF-12 L557 + SF-11 L551 + Section 12.6 L602. |
| TD-44 | format:check Husky pre-commit hook missing — Husky pre-commit currently runs lint + typecheck DAR NU format:check. CI rulează format:check (ci.yml L33-34) deci catch happens DAR la push, NU pre-commit local. F16 process gap surfaced PR-B-impl session: doc edits committed local NU rejected pre-push, surprize CI fail post-push. DX hygiene improvement. | 🟢 Low | PR mic dedicat (add format:check to Husky pre-commit hook + verify works empirical) | 15-30 min (Husky config edit + test commit dirty format file empirical) | Discovered Pachet K Phase 2 / PR-B-impl session (F16 finding). Cross-ref TD-40/TD-42 pattern (hygiene improvements). |

### Findings catalog cumulative: PR-B-impl + Pachet K (24 findings total)

Audit trail layer pre-TD/lesson catalog. Findings cataloagate empirical pe parcurs sesiunilor PR-B-impl + Pachet K, severity tagged 🔴/🟡/🟢/✅. Coverage: 16 findings PR-B-impl (F1-F16) + 8 discovery findings Pachet K (DF1-DF8).

**PR-B-impl session findings (F1-F16, 13 resolved + 3 cataloagate TDs):**
- F1: Briefing omission CHANGELOG format Step 2.5 (🟢 Low, process correction)
- F2: SF-12 spec TBD-row edge case (🟡 Medium → TD-43 sub-A)
- F3: peter-evans v6 → v8.1.0 stale spec (🟡 Medium → TD-43 sub-B)
- F4: SF-1 false positive peter-evans `with:` inputs (🟢 Low, NU violation — action runtime safe)
- F5: seq edge case empty (🟢 Low, fallback handles)
- F6: sed insert fragility (🟡 Medium → RESOLVED awk refactor)
- F7: sed-in-loop O(n²) perf (🟢 Low → RESOLVED single awk pass)
- F8: SF-6 push-or-rollback (🟢 Low, covered peter-evans clean exit + ephemeral runner)
- F9: SF-4 SECONDARY retry loop (🟢 Low, covered peter-evans v8.1.0 octokit-retry intrinsic)
- F10: Literal `\n` în SUMMARY (🟢 Low, acceptable)
- F11: gawk match() syntax extension (🟢 Low, ubuntu-latest stable)
- F12: awk -v interprets escape sequences (🔴 Critical → RESOLVED ENVIRON pattern, Scenariu B safety)
- F13: ENVIRON propagation (🟢 Low, applied consistent)
- F14: Line count discrepancy 266/265/235 (🟢 Low, reconciled — git=265 authoritative)
- F15: PowerShell Get-Content default codepage Windows-1252 (🟢 Low, display-only, file UTF-8 valid)
- F16: Pre-commit `format:check` ratat (🟡 Medium → TD-44 process gap, CI caught)

**Pachet K Phase 1-3 discovery findings (DF1-DF6):**
- DF1: User briefing Section 1 location estimate stale (🟢 Low, process correction only)
- DF2: User briefing `^### TD-` grep wrong format (🟡 Medium → L94 catalog)
- DF3: Section 12 "forward declared" stale post-impl (🟡 Medium → Edit #6 RESOLVED scope addition)
- DF4: Pachet J.1 self-bullet summary preserve vs rewrite (🟢 Low → DECISION (A) preserve verbatim, Edit #1 applied)
- DF5: Briefing TD-43/TD-44 column count mismatch 4-col vs 6-col canonical (🟡 Medium → L94 reinforced 3rd occurrence pattern + Option A 6-col extrapolation applied)
- DF6: Branch creation pending pre-commit (🟢 Low, Phase 4 commit pipeline addresses)
- DF7: Math error severity rollup Edit #7 — Medium 6 vs 7 empirical, Low 15 vs 14 empirical (🟡 Medium → RESOLVED Edit #7.1 same-session math fix, L88 dual-pass mandate empirical proof)
- DF8: Findings catalog sub-section L298-331 STALE post Edit #7.1 — DF7 added at Edit #7.1 but sub-section header/intro/bullets/rollup NOT propagated, caught L93 self-test #6 post Edit #9 (🟡 Medium → RESOLVED Edit #10 cascade fix, L94 lesson 4th occurrence empirical reinforcement)

**Severity rollup F+DF (24 findings):**
- 🔴 Critical: 1 (F12 awk escape — RESOLVED)
- 🟡 Medium: 9 (F2/F3/F6/F16 + DF2/DF3/DF5/DF7/DF8 — 4 F + 5 DF)
- 🟢 Low: 14 (F1/F4/F5/F7/F8/F9/F10/F11/F13/F14/F15 + DF1/DF4/DF6 — 11 F + 3 DF)

**Findings → TD pipeline:**
- F2 + F3 → TD-43 expanded (sub-A + sub-B)
- F16 → TD-44 (Husky format:check hygiene)
- DF2 + DF5 → L94 catalog (lessons philosophy layer, NOT TD)
- DF3 → Edit #6 RESOLVED scope addition (NOT TD)
- DF6 → Phase 4 commit pipeline addresses (NOT TD)
- DF7 → RESOLVED Edit #7.1 same-session math fix (NOT TD escalation)
- DF8 → RESOLVED Edit #10 same-session cascade fix (NOT TD escalation)
- Remaining findings (F1, F4-F11, F13-F15, DF1, DF4) = resolved în implementation OR process correction only, NO TD escalation needed.

Cross-ref: L94 (briefing format verify) + TD-43 (Section 12 spec amendments) + TD-44 (Husky hook). L93 dual-pass mandate applied throughout — empirical 4 self-test runs Pachet K (Phase 1 + Phase 2 + Phase 3 Edits #3-#6).

---

**Sumar severitate:** 4 Critical, 14 Medium, 14 Low, 4 Out-of-scope/Convention, 4 Resolved-tracking (40 TDs cataloagate post-Pachet-K: TD-30..TD-44; +TD-43 sub-A/sub-B + TD-44 din PR-B-impl + Pachet K session).


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

## 12. PR-B FULL SPEC — `.github/workflows/changelog-sync.yml` (IMPLEMENTED Pachet J.2 #199 7c641fa LIVE develop, awaiting first empirical trigger post Pachet K #200 merge)

### 12.1 Context & Justification

**Problem:** L85 paradox empirical — strict same-PR self-application CHANGELOG entry impossible pre-PR# assignment (PR# generated by GitHub post-push, înainte de merge). Workaround tactic L85 Option A (TBD placeholder) requires retroactive fix per PR → L76 pattern recurring (8 occurrences cumulative pre-implementation: #189..#192 + #195/#196 backfill în PR-I.2 #197 + #198 backfill în Pachet K).

**Decision (L90 mandate):** "Investește structural NU continua tactic." Workflow GitHub Action post-merge automation = soluția structurală implementată Pachet J.2 PR #199. Workflow rulează după PR merge, parse PR metadata (number + commit subject + hash), inject entry în CHANGELOG.md cu sorted descending + skip #TBD rows (F2 Option (a) per workflow authoring decision), create ephemeral PR via peter-evans/create-pull-request@c0f553fe...2ece0 (v8.1.0 SHA pinned), manual merge plasă siguranță SF-11.

**Status:** IMPLEMENTED Pachet J.2 #199 7c641fa merged develop 2026-05-12. Workflow LIVE awaiting first empirical trigger post Pachet K #200 merge → TD-35 IN-PROGRESS → RESOLVED post first green workflow run observed. Spec amendments pending TD-43 (sub-A SF-12 TBD-row edge case + sub-B peter-evans version drift v6 spec → v8.1.0 impl). Defer PR-D dedicated.

### 12.2 Scope LOCKED

1. Create `.github/workflows/changelog-sync.yml` (workflow nou greenfield)
2. Workflow trigger: `pull_request: types: [closed]` filtered `if: github.event.pull_request.merged == true` + branches `[develop]`
3. Workflow behavior: extract PR metadata (number + title + merge_commit_sha + merged_at) → parse type from conventional commit prefix → build CHANGELOG entry row → inject sorted by PR# descending (cross-ref SF-12 ordering guarantee) → create ephemeral branch `auto/changelog-#${PR_NUM}` → commit changes → open PR base develop via `peter-evans/create-pull-request@v6` (pinned SHA, NU tag mutable) → PR rămâne open pentru manual merge (review uman plasă siguranță, cross-ref SF-11 architectural mitigation)
4. Permissions: `contents: write` + `pull-requests: write` (least privilege, explicit declared — `pull-requests: write` necesar pentru `peter-evans/create-pull-request` action per SF-11 architectural mitigation)
5. CHANGELOG self-bullet pentru PR-B propriu = acceptat (workflow self-application tactic ULTIM pre-automation activă)

### 12.3 10 sub-findings audit pre-execution (TD-35 umbrella detail)

#### SF-1 — Shell injection via `${{ pr.title }}` interpolation

- **Issue:** PR title cu content malicious `feat: foo"; rm -rf /; echo "` injectat direct în `run:` block bash via `${{ github.event.pull_request.title }}` = arbitrary command execution pe runner cu `contents: write` permissions. Extension: backticks în PR title trigger command substitution dacă variabila eval'd. Markdown special chars (`|`, newlines) break table format chiar și sub env var (data integrity, NU security)
- **Severity:** Critical (CVE-grade vulnerability)
- **Mitigation:** Triple defense: (1) PR metadata passed prin environment variables, NU prin GitHub Actions context interpolation direct în shell, (2) Quoting discipline strict: ALL var usage cu `"$VAR"` (NU `$VAR`) pentru word-splitting + glob protection, (3) ZERO usage `eval` sau `bash -c` cu env var content. Data integrity supplement: sanitize markdown special chars via `tr -d '\n' | sed 's/|/\\|/g'` (cross-ref SF-12 Scenariu B + Scenariu B sanitization step)

#### SF-2 — Duplicate entry on re-run

- **Issue:** Workflow re-rulat manual (admin retry button) sau accidental dublu-trigger → 2 entries identice CHANGELOG → duplicate detection failure
- **Severity:** Medium (data corruption silent)
- **Mitigation:** Guard explicit pre-inject `grep -q "^| #$PR_NUM |" CHANGELOG.md` skip if exists

#### SF-3 — Self-trigger loop risk

- **Issue:** Workflow committă pe develop → trigger event nou → workflow re-rulat infinit → quota exhaustion + N commits auto
- **Severity:** High (cost quota + N data corruption iterations)
- **Mitigation:** Triple defense actualizat post-architectural revision (peter-evans PR creation): (1) Trigger restricted `pull_request: types: [closed]` cu filter `merged == true` + `branches: [develop]` (NU `push`, NU `pull_request: opened`), (2) **Actor filter `if: github.actor != 'github-actions[bot]'` CRITIC** — workflow creează PR-uri ephemeral via peter-evans; fără actor filter, merge auto-PR-urilor declanșează workflow infinit, (3) Commit message `[skip ci]` token în commit-ul ephemeral pentru skip ci.yml pe merge auto-PR-urilor (lint/typecheck/test NU rulează pe CHANGELOG-only changes). Cross-ref SF-11 architectural mitigation.

#### SF-4 — Race condition concurrent PR merge

- **Issue:** 2 PR-uri merge simultan (5-10s overlap) → 2 workflow instances concurrent → ambele creează ephemeral branch + open PR via peter-evans (Section 12.2 item 3 post-revision). Race mai subtle: ambele citesc CHANGELOG state identical, ambele compute sorted insert position based on stale state → potential 2 PR-uri auto cu insert la aceeași poziție sorted. Manual merge serializes (plasă siguranță review uman per SF-11) DAR concurrency group workflow-level eliminates race preventive
- **Severity:** Medium (idempotency concern, NU scalability — race semantic = ordering safety, NU growth. Reclassified post-Phase 4c.7 filter mapping. Rar empirical solo dev, dar mitigation mandatory pentru determinism)
- **Mitigation:** Triple defense: (1) **PRIMARY: `concurrency: group: changelog-sync` workflow-level** — GitHub serializes execution, race eliminated preventive, (2) **SECONDARY: retry loop** (3 attempts max + exponential backoff 5s/15s/45s) — fallback edge case concurrency group failure (GitHub outage), (3) **TERTIARY defense-in-depth:** SF-2 grep guard duplicate detection + SF-12 sorted insert deterministic ordering. Cross-ref Scenariu C (concurrency group serialized empirical) + Scenariu D (out-of-order completion SF-12 validation) + TD-36.

#### SF-5 — Regex type extract fragility

- **Issue:** Type extract via regex `^(feat|fix|docs|chore|refactor|test|perf)` NU acoperă conventional commit breaking change `feat!:` sau `feat(scope)!:` → fallback `chore` silent
- **Severity:** Medium (accuracy)
- **Mitigation:** Regex expansion completă (11 types conventional commits standard): `^(feat|fix|docs|chore|refactor|test|perf|style|build|ci|revert)(\([^)]+\))?(!)?:` + log warning dacă fallback triggered. Cross-ref F2 finding Phase 2 audit (4 types added preventive post-PR-B: style|build|ci|revert pentru anticipated PR-uri TD-31 v5 bump, hygiene future).

#### SF-6 — Zero rollback CHANGELOG modify before push fail

- **Issue:** Workflow modifies CHANGELOG pe ephemeral branch → commit succeeds → peter-evans create-pull-request step fails (auth/network/API error) → ephemeral branch state inconsistent local runner. NOTĂ ephemeral runner caveat: GitHub-hosted ubuntu-latest = fresh state fiecare run, deci "next run dirty" assumption original FALSE — runner state NU persistă. Real impact = clean-exit semantics + visible error reporting, NU state corruption durabilă
- **Severity:** Low (downgrade din Medium post-Phase 3 audit — cosmetic clean-exit semantics pe ephemeral runners, NU state inconsistency durabilă)
- **Mitigation:** Push-or-rollback pattern adaptat post-architecture: `git push origin "auto/changelog-#${PR_NUM}" || { git reset --hard HEAD~1; exit 1 }` aplicat la ephemeral branch (NU develop direct). Clean-exit cosmetic pe ephemeral runners (state nu persistă oricum), DAR error message visible audit trail

#### SF-7 — Zero audit trail granular

- **Issue:** Workflow operates silent — failure modes invisible until manual CHANGELOG inspection
- **Severity:** Low (observability)
- **Mitigation:** Explicit `::notice::` / `::warning::` / `::error::` GitHub Actions annotations per step (extract metadata, check exists, inject, push). **Enhancement opțional F13:** `$GITHUB_STEP_SUMMARY` structured markdown report per run — capture (a) PR# processed, (b) entry injected sau skipped reason (duplicate detection SF-2), (c) sorted insert position (cross-ref SF-12 algorithm), (d) retry attempts dacă concurrency group fallback triggered (SF-4 secondary). Cross-ref Filter Section 12.5 Observability "$GITHUB_STEP_SUMMARY" reference.

#### SF-8 — Hardcoded develop branch

- **Issue:** Branch `develop` hardcoded în workflow → dacă proiect schimbă target branch sync future (ex: `staging` rebrand), workflow break. NOTĂ semantic distinction: project default branch (per CLAUDE.md `main` = prod) ≠ target branch changelog sync (`develop` = staging integration). `github.event.repository.default_branch` ar auto-resolve la `main`, NU comportament dorit
- **Severity:** Low (scalability future-proofing)
- **Mitigation:** Environment variable `TARGET_BRANCH: develop` la top workflow (rename din `DEFAULT_BRANCH` per F8 audit — naming precision: "target branch sync" ≠ "project default branch") + reference `$TARGET_BRANCH` throughout. Cross-ref Filter Section 12.5 Scalability "branch agnostic via env var TARGET_BRANCH".

#### SF-9 — Date computation client-side vs PR merged_at accuracy

- **Issue:** `date -u +%Y-%m-%d` pe runner = runner clock, NU PR actual merge time. Discrepancy posibilă dacă runner queue delay
- **Severity:** Low (accuracy minor)
- **Mitigation:** Env var pattern explicit (consistency SF-1): step-level `env: MERGED_AT: ${{ github.event.pull_request.merged_at }}`, apoi `DATE="${MERGED_AT:0:10}"` bash substring extraction safe (parameter expansion, NU command substitution). Result: YYYY-MM-DD din ISO authoritative GitHub time. **Cross-ref SF-1 consistency: ZERO `${{ }}` direct în run: block, ALL var usage prin env step + `"$VAR"` quoting discipline (F9 audit closure).**

#### SF-10 — Type fallback chore silent

- **Issue:** Dacă PR title NU matches regex (typo, format diferit), fallback `chore` aplicat silent → entry incorect cataloagat fără warning. NOTĂ empirical context: commitlint `commit-msg` hook + CI commitlint step (ci.yml) enforce conventional commit format pre-merge → SF-10 trigger empirical impossible în flow normal. Defensive coverage edge case: rebase mid-PR sau admin override bypass commitlint
- **Severity:** Medium (data accuracy)
- **Mitigation:** Policy decision LOCKED F14 audit: **WARN + fallback chore (NU FAIL)**. Rationale: preserve forward progress (entry inject cu warning audit trail) > block entry creation. Warning explicit `::warning::PR title NU matches conventional commit regex (11 types post-SF-5 expansion), fallback chore aplicat — investigation needed dacă apare în production`. Cross-ref SF-5 regex 11 types expansion (reduce trigger probability) + SF-7 audit annotations (warning visibility).

#### SF-11 — Direct push develop blocked by branch protection

- **Issue:** Workflow attempt `git push origin develop` blocked by branch protection rules (CLAUDE.md §3: "Push direct pe develop INTERZIS — toate modificările prin PR"). `github-actions[bot]` treated identical cu user push → permission denied → workflow fail at push step. Section 12.2 item 3 original design ("commit direct pe develop") = architectural blocker
- **Severity:** Critical (architectural blocker — workflow non-functional fără mitigation)
- **Mitigation:** Pattern `peter-evans/create-pull-request@v6` pinned by SHA (NU tag mutable). Workflow creates ephemeral branch `auto/changelog-#${PR_NUM}`, commit entry, opens PR base develop. PR remains open pentru manual merge (plasă siguranță review uman, NU auto-merge). Permissions: `pull-requests: write` + `contents: write` (least privilege). Token: default `GITHUB_TOKEN` (NU PAT). Cross-ref Section 12.2 item 3 (rewritten Phase 4c.4).

#### SF-12 — Out-of-order workflow completion silent corruption

- **Issue:** Race condition concurrent PR merge (cross-ref SF-4) cu workflow completion order ≠ PR# order. Scenario: PR #200 starts T=0 slow runner, PR #201 starts T=3 fast runner → workflow #201 inject first → top entry = #201. Workflow #200 retry → fetch latest (cu #201 top) → blind top-insert plasează #200 ABOVE #201 → ordine finală `#200 → #201` contradictoriu chronologie descending (newer PR# trebuie above older). Silent data corruption pe fiecare race out-of-order
- **Severity:** High (silent corruption, occurs pe fiecare concurrent merge race, NU edge case rar)
- **Mitigation:** Insert logic = sorted by PR# descending (NU blind top). Algorithm: (1) extract PR# new entry, (2) scan CHANGELOG entries de la separator în jos, (3) parse PR# fiecare row via regex `^\| #(\d+) \|`, (4) find correct sorted position (first row cu PR# < new PR#), (5) inject la poziție corectă (sau top dacă new PR# > all existing). Edge: dacă PR# duplicate (SF-2 grep guard catches first), skip. Cross-ref Section 12.2 item 3 (sorted ordering guarantee) + SF-4 (concurrency primary mitigation). Empirical validation Scenariu D (forward-declared).

### 12.4 3 scenarii dry-run mental (acceptance criteria pre-execution)

#### Scenariu A — PR normal merged

- **Input:** PR #198 title `docs(handoff): cleanup pachet j`, merge_commit_sha `abc1234567...`, merged_at `2026-05-12T14:30:00Z`
- **Expected workflow output:** Entry injected CHANGELOG la poziția sortată (top dacă #198 > top existent PR#): `| #198 | 2026-05-12 | docs | cleanup pachet j | abc1234 |`
- **Verify:** entry format 5 coloane, hash short 7 chars, date `${MERGED_AT:0:10}` din merged_at, type din regex match docs, summary preserved as-is (commitlint enforced lowercase pre-merge, NU conversion în workflow), sorted insert position correct (cross-ref SF-12)
- **Edge case empty summary:** Dacă PR title = `docs:` (no content post-prefix) → summary fallback `(empty)` + `::warning::PR title missing summary content`

#### Scenariu B — PR malicious title

- **Input:** PR title `feat: foo"; rm -rf /; echo bar` SAU PR title cu markdown special chars `feat: pipe | char and newline\ntest`
- **Expected workflow output:** Entry injected SAFE: `| #199 | 2026-05-12 | feat | foo"; rm -rf /; echo bar | def5678 |` (case 1) SAU `| #199 | 2026-05-12 | feat | pipe \| char and newline test | def5678 |` (case 2, markdown escaped)
- **Verify:** ZERO command execution (env var mitigation SF-1 active), markdown table structure preserved (5 coloane intact), `|` chars escaped via `sed 's/|/\\|/g'`, newlines removed via `tr -d '\n'`, entry parseable corect
- **Sanitization step:** `SUMMARY_SAFE=$(echo "${SUMMARY}" | tr -d '\n' | sed 's/|/\\|/g')` post env var extraction, pre-inject

#### Scenariu C — 2 PR-uri concurrent merge (concurrency group serialized)

- **Input:** PR #200 + PR #201 merge la 14:30:00 vs 14:30:03 (3s overlap). GitHub triggers 2 workflow events.
- **Expected workflow output:** SF-4 primary mitigation `concurrency: group: changelog-sync` serializes execution. Workflow #200 starts first, creates ephemeral branch `auto/changelog-#200` + commit + opens PR via peter-evans/create-pull-request → workflow #200 completes. Workflow #201 starts after, repeats same pattern → opens separate PR ephemeral `auto/changelog-#201`. Result: 2 separate PRs open, manual merge serializes by reviewer (plasă siguranță review uman per SF-11).
- **Verify:** zero race condition empirical (concurrency group prevented), 2 ephemeral PRs created independent, ambele entries vor fi în CHANGELOG post manual merge ambele PRs (ordine sorted by PR# via SF-12 algorithm aplicat fiecare merge separat).
- **Edge case retry fallback:** Dacă concurrency group failure (GitHub outage), retry exponential backoff secondary mitigation activă (SF-4). Sorted insert SF-12 garantează ordine corectă chiar și în retry case.

#### Scenariu D — Out-of-order workflow completion (SF-12 empirical validation)

- **Input:** PR #200 merge T=0 slow runner queue (5 min delay), PR #201 merge T=3 fast runner (immediate execution). Workflow B (#201) completes T=4 → inject top: `| #201 | ... |`. Workflow A (#200) resumes T=8 → fetch latest CHANGELOG (cu #201 top).
- **Expected workflow output:** Workflow A NU blind top-insert. Algorithm SF-12: extract new PR# = 200, scan top entries, parse #201 PR# = 201, compare 200 < 201 → walk down, parse next entry PR# (say #199), compare 200 > 199 → inject ÎNTRE #201 și #199. Ordine finală corectă descending: `| #201 | ... |\n| #200 | ... |\n| #199 | ... |`
- **Verify:** sorted insert algorithm triggered (NOT blind top), ordine finală descending strict by PR#, zero silent corruption, ambele entries prezente, audit trail `::notice::Sorted insert position N` annotation
- **Edge case 3+ concurrent:** Algorithm scales N entries (scan up to top 10 lines for safety + log warning dacă scan depth exceeded)

### 12.5 Filtre design mandatory (pre-merge gates)

1. **Security:** SF-1 env var pattern + quoting discipline + SF-3 actor filter + SF-11 PR creation pattern (peter-evans branch protection compat) + permissions least privilege explicit declared
2. **Idempotency:** SF-2 grep guard duplicate detection + SF-4 concurrency group workflow-level (primary mitigation) + SF-6 push-or-rollback (cosmetic clean-exit pe ephemeral runners) + SF-12 sorted insert by PR# descending (deterministic ordering)
3. **Observability:** SF-7 audit annotations `::notice::`/`::warning::`/`::error::` + SF-7 optional `$GITHUB_STEP_SUMMARY` structured report (F13 enhancement) + SF-5/SF-10 fallback warnings explicit
4. **Scalability:** SF-8 branch agnostic via env var `TARGET_BRANCH` + SF-9 authoritative time via `merged_at` env var pattern

### 12.6 Acceptance criteria pre-merge PR-B

- [ ] Workflow file created `.github/workflows/changelog-sync.yml` cu permissions explicit declared (`contents: write` + `pull-requests: write` per SF-11 + Section 12.2 item 4)
- [ ] All 12 SF mitigations implemented (SF-1..SF-10 + SF-11 PR creation + SF-12 sorted insert — verify checklist)
- [ ] Dry-run mental 4 scenarii pass (A normal + B malicious + C concurrent serialized + D out-of-order completion)
- [ ] Local validation: workflow syntax manual YAML review + CI validation (actionlint NU available local — TD-42 pending hygiene install separate)
- [ ] `peter-evans/create-pull-request` action pinned by SHA verified (NU tag mutable per SF-11)
- [ ] Env var `TARGET_BRANCH: develop` at top + `$TARGET_BRANCH` references throughout (per SF-8)
- [ ] Workflow-level `concurrency: group: changelog-sync` declared (per SF-4 PRIMARY)
- [ ] PR-B self-bullet CHANGELOG.md (tactic ultim pre-automation activă)
- [ ] HANDOFF Section 1 refresh (PR-B in-flight)
- [ ] CI green develop pre-merge
- [ ] TD-35 status update PENDING → IN-PROGRESS pe PR-B merge → RESOLVED post first successful workflow trigger empirical

### 12.7 Estimate timing

- **Pre-flight discovery:** 20-30 min (verify ci.yml pattern, CHANGELOG format, permissions)
- **Design audit re-validation:** 30-45 min (re-walk 10 SF cu fresh eyes, scenarii dry-run)
- **Workflow file create + iterate:** 1-2h (YAML structure, mitigations, edge cases)
- **CI validation + PR + merge:** 30-45 min
- **Post-merge empirical verify:** 30 min (next PR merge triggers workflow correctly)
- **Total: 3-5h sesiune dedicată** (NU bundled cu alt scope per L83 + premium)

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

### L62 — Prettier batch concurrency race condition (file lock contention)

**Lesson:** `npm run format` aplicat global pe ~170+ fișiere poate să rateze 1-2 fișiere fără eroare raportată. Output zice "Formatting complete!" dar `npm run format:check` ulterior pică pe acele fișiere ratate. Race condition între worker pool Prettier și file lock Windows file system. Notă: originally numbered L74 in PR #186 description due to planner numerotare incorectă post-compactare conversație. Renumerotat per L57 single source of truth.

**Pattern empirical [PR 1B.0.0 #186]:** `lib/domain/budget.rules.ts` ratat de batch run. Re-run `format:check` confirmă drift. Fix: `npx prettier --write lib/domain/budget.rules.ts` single-file mode → succes immediate.

**Rule:** După `npm run format` global, ALWAYS run `format:check` ca smoke test. Pe orice file resistance, retry single-file mode `npx prettier --write <path>`. NU presupune că batch a terminat clean fără verify.

### L63 — PowerShell `Add-Content -Value ""` semantic ambiguous (PS5.1)

**Lesson:** PowerShell 5.1 `Add-Content -Path file -Value ""` NU produce blank line în file (string empty considered no-op). PS7+ poate diferi. Test pe Windows nativ obligatoriu.

**Pattern empirical [Pachet C planning]:** Tentativă blank line append la end of file `.prettierignore` cu `Add-Content -Value ""` → file unchanged. Hex check confirmă zero bytes adăugați.

**Rule:** Pentru blank line explicit pe Windows PS5.1, folosește `[System.IO.File]::AppendAllText($path, "`n", [System.Text.UTF8Encoding]::new($false))`. NU rely pe `Add-Content -Value ""`. Cross-ref: lesson L67 (encoding-aware writes).

### L64 — PowerShell `Join-String` cmdlet PS7+ only

**Lesson:** Cmdlet `Join-String` (cu pipeline + `-Separator`) NU este disponibil în PowerShell 5.1. Doar PS7+. Folosirea în script crash cu "term not recognized".

**Pattern empirical [Pachet C planning]:** Script verify hex bytes `($bytes | ForEach-Object { '{0:X2}' -f $_ } | Join-String -Separator ' ')` → fail PS5.1.

**Rule:** Pentru cross-version compatibility (PS5.1 + PS7+), folosește `-join` operator nativ: `($bytes | ForEach-Object { '{0:X2}' -f $_ }) -join ' '`. Operatorul există în ambele versiuni.

### L65 — `.prettierignore` original missing trailing newline EOF

**Lesson:** Fișierul `.prettierignore` original al repo-ului NU avea trailing newline la EOF (detected via hex dump last bytes). Append fără preserve newline produs concatenation directă la pattern existing → glob pattern broken.

**Pattern empirical [PR 1B.0.0 #186]:** Append `types/database.ts` la `.prettierignore` cu Write tool a inclus trailing newline corect. Hex verify confirmed last byte `0A` (LF) post-Write.

**Rule:** Pentru orice `*.ignore` config file (`.gitignore`, `.prettierignore`, `.eslintignore`, etc.), verify hex last byte = `0A` post-edit. Folosește Write tool (preserve trailing newline) NU `Add-Content` PowerShell (PS5.1 inconsistent — cross-ref L63).

### L66 — PowerShell pipe stdin to `git commit -F -` injects UTF-8 BOM

**Lesson:** PowerShell `$msg | git commit -F -` pipe stdin pattern injectează UTF-8 BOM (`EF BB BF`) la start of stdin stream pe Windows. Commitlint parser interpretează BOM ca whitespace → "header must not start with whitespace" + 2 followup errors. Commit rejected.

**Pattern empirical [PR 1B.0.0 #186]:** Tentativă commit cu heredoc PowerShell `@'...'@ | git commit -F -` → commitlint fail. Hex check stdin pipe confirmă BOM injection.

**Rule:** NICIODATĂ pipe stdin la `git commit -F -` în PowerShell pe Windows. Folosește Write tool → file → `git commit -F <file>`. File written prin Write tool NU are BOM. Cross-ref: rule R19 LOCKED (encoding-aware file writes).

### L67 — PowerShell `>` redirect default UTF-16 LE encoding + CRLF normalization (PS5.1)

**Lesson:** PowerShell 5.1 `>` redirect operator scrie default UTF-16 LE encoding (`FF FE` BOM la start, every char as 2 bytes). PLUS line endings convertite LF→CRLF la write. Dublă corupție pe tool-consumable files (patches, scripts, configs).

**Pattern empirical [PR 1B.0 #187 recovery]:** `git diff > $env:USERPROFILE\pr1b0-edits.patch` produs patch UTF-16 LE + CRLF. `git apply` raportează "No valid patches in input" exit 128. Hex first 5 bytes = `FF FE 64 00 69` (UTF-16 LE BOM + 'd' high byte + 'i').

**Rule:** NICIODATĂ folosi `>` redirect pentru tool-consumable files. Folosește `[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))` cu `$content -replace "`r`n", "`n"` pentru LF normalization. Cross-ref: R19 LOCKED.

### L68 — Recovery point validation requires functional check

**Lesson:** Hash + size match între copies de patch backup confirmă byte fidelity, NU encoding correctness. Doi copii UTF-16 LE corupte au hash identical → trust fals. Recovery point invalid pentru `git apply` consumption.

**Pattern empirical [PR 1B.0 #187 recovery]:** Backup patch la `$env:TEMP` + `$env:USERPROFILE` ambele UTF-16 LE. Hash match → assume backup valid. Real test `git apply --check` la 18h post-creation revelat encoding issue.

**Rule:** Recovery point validation MUST include functional check post-creation (`git apply --check` pentru patches, `npm run X` pentru scripts, `node -e "require('./file')"` pentru JS). Hash + size = surface check, NU sufficient. Cross-ref: R19 LOCKED.

### L69 — `git apply` default strict on LF (CRLF strip required post UTF-16 conversion)

**Lesson:** `git apply` default mode strict pe LF line endings. Patch cu CRLF (chiar și UTF-8 valid post-conversion) raportează "patch does not apply" cu hash MATCH (file conținut OK, doar separator broken). Confusing fail mode.

**Pattern empirical [PR 1B.0 #187 recovery]:** Conversion UTF-16 LE → UTF-8 cu `[System.IO.File]::WriteAllText` păstrează CRLF din sursă. CRLF count post-conversion = 71 (file 4 hunks). `git apply --check` fail toate 4 fișiere "patch does not apply". Hash files current = MATCH expected → confused.

**Rule:** Post UTF-16 conversion la UTF-8, ALWAYS aplicat `$content = $content -replace "`r`n", "`n"` ÎNAINTE de WriteAllText. Verify zero CRLF post-write cu hex scan loop. Cross-ref: R19 LOCKED.

### L70 — Claude Code `2>&1 | Out-Null` pattern suppress output (verify EXIT only insufficient)

**Lesson:** Claude Code default behavior pentru long-running commands = pipe la `Out-Null` (suppress all stdout/stderr) și raportează doar exit code. Pattern problematic pentru R9 verify-on-disk strict — exit 0 nu confirmă semantic correctness, doar absence de error.

**Pattern empirical [PR 1B.0 #187]:** `npm run ci` rulat de Claude Code cu `2>&1 | Out-Null` → exit 0 raportat după 2min. ZERO output text disponibil. Verify subsequent specific (`npm run format:check 2>&1 | Select-Object -Last 3`) revelat output explicit.

**Rule:** Pentru R9 strict, ALWAYS request explicit `2>&1 | Select-Object -Last N` (N=3-40) în comandă, NU accept `Out-Null` patterns. Plus: după run silent, follow-up cu specific layer verify (`format:check`, `typecheck`, etc.) pentru confirmation explicit text.

### L71 — Conventional Commits footer-leading-blank (commitlint warning)

**Lesson:** Conventional Commits spec require footer trailers (`refs ...`, `signed-off-by:`, `closes #N`) preceded by blank line separator. Lipsa blank line → commitlint warning `footer-leading-blank` (NU error, dar polluat output). Footer block parsed direct după body content fără blank → confused parse.

**Pattern empirical [PR 1B.0 #187 commit]:** Commit message cu lessons bullet list direct urmat de "refs HANDOFF reguli LOCKED..." fără blank line → commitlint warning footer-leading-blank.

**Rule:** Pattern R18 update — în commit message body, ÎNAINTE de footer block (refs, signed-off-by, etc.) ALWAYS blank line separator. Verify pre-commit cu pattern: `[blank line] refs ...` NU `last bullet [newline] refs ...`.

### L72 — Display Claude Code wrap visual artifact (~80-100 chars terminal width, NU disk reality)

**Lesson:** Claude Code display wrap-uie linii lungi mid-content visual la ~80-100 chars terminal width. Linii apar cu line-prefix număr + content fragment + indented continuation. **NU pe disk** — file conține single-line per linie. Verify obligatoriu cu view tool sau Get-Content count pentru confirm semantic.

**Pattern empirical [Pachet C verify cycle multiple]:** commit-msg-pr1b0-0.txt L9, pr-body-pr1b0-0.md L41-L45, HANDOFF.md L810-L886 (Pachet C add L62-L71) toate apparent wrap-uite display, single-line confirmed pe disk via Get-Content lines count.

**Rule:** NU concluzii din display singur. ALWAYS view tool range OR Get-Content count post-edit pentru semantic verify single-line vs multi-line pe disk. Cross-ref: R9 (verify-on-disk strict).

### L73 — PowerShell `Remove-Item` cmdlet PS-only, NOT available in Bash tool

**Lesson:** Claude Code rulează default Bash tool pe Windows. PowerShell cmdlets (`Remove-Item`, `Get-ChildItem`, `Add-Content`, `Set-Clipboard`) NU funcționează în Bash context → `command not found` exit 127. Eroare aparent generică, mascată ca "cmdlet not recognized".

**Pattern empirical [Pachet C Pas 5.9 cleanup]:** `Remove-Item commit-msg-pachet-c.txt` failed exit 127 Bash context; retry cu `rm commit-msg-pachet-c.txt` SUCCESS (cross-platform Unix command).

**Rule:** Pentru file cleanup în Claude Code Bash: use cross-platform Unix commands (`rm`, `ls`, `cat`, `cp`, `mv`). Sau prefix explicit `powershell -Command "Remove-Item ..."` dacă PS-specific necesar. NU presupune cmdlet PS disponibil în Bash.

### L74 — "5 min" estimate trap (R11 onestate violation pattern recurring)

**Lesson:** Estimate-uri "5 min" pentru PR-uri devin sistematic 25-40 min realist. Causes: pre-flight verify subestimat + Husky hooks (~45-90s) + push (~30-60s) + PR open manual (3-5 min Write + clipboard + browser) + CI remote (~90s) + merge cycle. Pattern recurring across sessions = anti-pattern R11.

**Pattern empirical [Pachet D scope discussion]:** TD-31 fix scope inițial estimat "5 min PR" → breakdown honest revelat 25-40 min realist (verify v5 release + edit ci.yml + 4-layer pre-commit + Husky + PR workflow manual + CI + merge). Same pattern observed Pachet C "Edit 4a CHANGELOG stale fix" inițial "1 min update" → realistic 5-10 min cu verify-on-disk + decision tree filter.

**Rule:** Pentru orice "trivial fix" estimate, breakdown explicit total cycle: pre-flight verify + edit + 4-layer pre-commit + Husky + push + PR open + CI remote + merge. Minimum 15-20 min realist pentru orice PR docs/config. Sub-15 min estimates = automatic suspect R11 violation.

### L75 — Claude planner "new file per concern" anti-pattern (caught by user challenge)

**Lesson:** Claude planner tendency = propose new file pentru fiecare nou concern (briefing, lessons, todo, status). Asta violează R3 single source of truth + L57 single source of truth. HANDOFF Section 1 + CHANGELOG sunt canonical sources designed pentru update incremental, NU să fie duplicate prin new files.

**Pattern empirical [Pachet D scope discussion]:** Propus inițial `BRIEFING-NEXT-SESSION.md` file separat → user challenge "vrei să mai facem încă un fișier?" → re-evaluat = anti-pattern recurring. Section 1 existing acoperă exact use-case (Data + Motiv handoff + Next contribuitor). Update incremental preferred.

**Rule:** Verify-on-disk existing canonical sources (HANDOFF Section 1, CHANGELOG, ROADMAP, TD table) BEFORE propose new file. User challenge "do we really need new file?" = legitimate signal anti-pattern. Default = update incremental. New file = only if structural separation justified (e.g., test data, generated artifact).

### L76 — CHANGELOG missing entries cumulative drift (Pachet C ratat #180 + #188 in cumulative deltas)

**Lesson:** CHANGELOG poate avea SIMULTAN: stale entries (hash pending old PR-uri merged dar neactualizate) + missing entries (PR-uri merged complet absente). Detection necesită verify periodic empirical `git log --oneline` last 10-20 commits versus CHANGELOG tabel pentru gap detection. Plus verify cumulative deltas section pentru self-bullet missing post-merge.

**Pattern empirical [Pachet D pre-flight verify]:** Discovery PR #180 missing complet din CHANGELOG (gap între #178 și #182, pre-Pachet C). Plus Pachet C cumulative deltas section ratat self-bullet pentru #188 (am adăugat #185 + #186 + #187 dar uitat self). Root cause both = R11 onestate verify scope incomplet, NU systematic `git log` cross-check.

**Rule:** Post-merge orice PR, verify `git log --all --oneline -20` versus CHANGELOG tabel entries. Detect gaps numerice (#178 → #182 = gap, missing #179/#180/#181). Detect own PR self-bullet missing cumulative deltas. Catch retroactive în next PR scope. Cross-ref: R3 single source of truth + R11 onestate disciplinată.

### L77 — Claude Code Q&A loop interpretation

**Lesson:** Cand Claude Code afiseaza butoane de raspuns active (Q&A widget), paste prompt nou poate fi interpretat ca raspuns la intrebari vechi, NU ca o comanda separata. Output devine confuz, planner ramane stuck.

**Pattern empirical [Pachet E aborted sesiune anterioara]:** Planner Claude.ai a trimis prompt cu instructiuni de executie pas urmator in timp ce Claude Code avea butoane Q&A active din intrebare precedenta. Claude Code a interpretat paste-ul ca selectie buton, NU comanda noua.

**Rule:** Esc primul pentru anula butoane Q&A active. Apoi paste prompt nou. Sau optiunea "Type something" custom daca disponibila in lista butoane.

### L78 — Auto-compactare next-day signal detection

**Lesson:** Quality post-compactare conversatie detectabila empiric prin: planner propune scope creep fara verify trigger conditions cataloagate, sumarizare lessons in loc de details concrete, lipsa verify FT-01..04 INAINTE de scope lock, override decizii utilizator fara filtrare reguli.

**Pattern empirical [Pachet E aborted + Pachet E-2 sesiune curenta]:** Pachet E aborted = scope locked Optiunea 3 fara verify ca FT-01 deja cataloagat formal R17 4-ancore. User R11 catch necesar. Sesiunea curenta Pachet E-1 a confirmat empirical L76 pattern recurring 3x ratat in compactare anterioare.

**Rule:** Pre-flight verify HANDOFF Future Tasks (FT-01..04) INAINTE de scope final daca PR atinge ROADMAP/HANDOFF. Daca observi degradare (semnale enumerate sus) → STOP sesiune fresh. NU continua compactare degradata.

### L79 — Pickup post-pauza anti-pattern

**Lesson:** Planner sare direct cu Pas 2 plan deferred fara confirma user state explicit. "Am revenit" + intrebare ≠ "continua plan exact". User intrebari = solicitare clarification, NU autopilot pe plan vechi.

**Pattern empirical [Pachet E aborted]:** User a zis "am revenit" + a intrebat de Pachet E status. Planner pornit direct executie fara confirm explicit daca user vrea continue plan deferred sau alt scope.

**Rule:** Pickup post-pauza = CONFIRMA user state primul. Intreaba explicit ce vrea, NU auto-pilot pe plan deferred. Anti-pattern R11 onestate violation.

### L80 — Reguli LOCKED application bug (NU regula, ci aplicare concreta)

**Lesson:** O regula LOCKED poate fi formulation correct (general), dar aplicarea concreta in alt loc poate contine motivatie anti-pattern incastrata. Distincte: regula generala vs aplicarea specifica. Bug-ul real e in aplicarea concreta, NU in regula meta.

**Pattern empirical [Pachet E-1 + IOTA edit]:** R17 textul disk = corect (cere 4 ancore + minim trigger explicit). DAR FT-01 trigger column ROADMAP application contine motivatie "saving 1 PR overhead" = anti-pattern "timpul NU important" incastrat in trigger column. Bug-ul era in IOTA target, NU in R17 reformulation.

**Rule:** Audit periodic NU doar reguli LOCKED meta, ci si aplicarile concrete (FT-01..04 trigger columns, TD-XX trigger columns, etc.) pentru motivatie internal vs meta-principii produs. Conflict aplicare vs meta-principiu = aplicarea needs reformulation, NU regula meta. Reasoning: regulile meta sunt general-purpose, aplicarile sunt specific-purpose si pot diverja.

### L81 — Discovery Log protocol obligatoriu sesiuni multi-edit

**Lesson:** Sesiunile lungi (>1h sau >3 edits) au risc HIGH de pierdere discovery ad-hoc daca NU exista protocol explicit de cataloagare in fereastra planning. Memory unreliable, R75 anti-pattern "rezolvam mai tarziu" revine fara tracking.

**Pattern empirical [Pachet E sesiune curenta]:** User a explicitat necesitate "problemele se rezolva NU se ascund NU se ocolesc" → planner a definit Discovery Log protocol cu numerotare contiguous reserved + categories explicit + tracking destinations. Counter update per discovery in fereastra planning. 14 discoveries cataloagate in Pachet E-1 + Pachet E-2, zero pierderi.

**Rule:** La start orice PR multi-edit (>3 edits) sau durata estimata >1h, define protocol Discovery Log cu numerotare contiguous reserved + categories explicit + tracking destinations. Counter update per discovery. Verify counter vs final edits INAINTE de commit. Cross-ref R20 (Discovery Log obligatoriu sesiuni multi-edit).

### L82 — User escalari = signal protocol→regula promotion

**Lesson:** Cand user formuleaza request implicit sau explicit pentru capture sistematic ("noteaza", "nu uita", "sa fie aplicat consistent"), e signal direct ca protocol ad-hoc trebuie promovat la regula LOCKED. NU astepta sesiune viitoare.

**Pattern empirical [Pachet E sesiune curenta]:** User a zis "asta va deveni regula" dupa Discovery Log protocol definit ca raspuns la "nu se uita, nu se ascund". 2 escalari user-driven consecutive (Discovery Log + R20 LOCKED) = pattern. Cataloagat R20 in aceeasi sesiune cu protocol definition.

**Rule:** La user request capture sistematic, propune explicit promovare protocol→regula cu draft formulation LOCKED IN aceeasi sesiune. Aplicare immediate, NU defer.

### L83 — Grep pattern verify pre-flight cu sample-first discovery obligatoriu

**Lesson:** Pre-flight count/structure cu grep pattern guessing (assumption format disk) = anti-pattern R3 violation. Output 0 sau wrong count = pattern wrong, NU disk empty/wrong. Briefing planner cu pattern-uri inferred din memory = risc recurring (off-by-one line numbers, format real diferit de assumption).

**Pattern empirical [Pachet E sesiune curenta]:** Pre-flight pattern `^L[0-9]` returnat 0 — format real disk era `^### L<n>` (H3 header). Pre-flight pattern `^- \*\*R[0-9]` returnat 0 — format real era `^N. \*\*<title>\*\*` (numbered list). Briefing line refs off-by-one recurring (#622/621, #239/238, #928/944). Hash convention briefing greseala (commit hash vs merge hash empirical pattern istoric).

**Rule:** Pre-flight verify count/structure = 2 steps obligatorii. (a) Sample-first discovery: `grep -n "L72\|L76\|R19"` pentru gasire format real. (b) Count derivat din format real disk verified. NU pattern guessing direct. Plus line refs anchor pe text content (Edit tool semantic match), NU pe line numbers absolute. Cross-ref R3 + R9.

### L84 — Briefing handoff count vs max index distinction

**Lesson:** Briefing handoff document poate confunda "count total cataloagat" cu "max index numerotare". Numerotarea poate NU fi contiguous (gaps in history), deci max index > count actual.

**Pattern empirical [Pachet E sesiune curenta]:** Briefing claim "Lessons total 76 cataloagate disk (L1-L76)". Reality: 51 lessons cataloagate cu max index L76. Briefing formulation "76 total" inexact, ar trebui "max L76 / 51 cataloagate".

**Rule:** Briefing handoff template cu count items cataloagate = TREBUIE distinct "count total" vs "max index". Verify empirical primul cu grep count + max index check. NU presupune contiguous.

### L85 — L76 self-application gap commit message claim vs disk reality

**Lesson:** Capturing un lesson in commit message NU echivaleaza aplicare lesson efectiva pe disk. Capture claim ≠ apply claim. Verify-on-disk post-stage pre-commit necesar pentru claim-uri self-application.

**Pattern empirical [Pachet B → C → D → E-1]:** 3 PR-uri consecutive (B → C → D) cu L76 pattern recurring promis vs ratat. Fiecare PR a promis fix retroactiv anterior + preventiv self in commit message, NICIUNUL livrat self preventive complet. Pachet E-1 = primul PR care a livrat empirical disk verified ce promis in commit message (DELTA + EPSILON applied strict same-PR, NU "fix in next PR").

**Rule:** Commit message claims pentru self-application lessons = TREBUIE verified empirical post-stage pre-commit cu grep direct pe claim. Trace explicit: claim "self-bullet #X added cumulative" → `grep -c "#X" CHANGELOG.md` post-stage pre-commit = match count expected. Cross-ref R21 (CHANGELOG sync verify obligatoriu pre-commit).

### L86 — PowerShell clipboard + grep -P cross-platform issues

**Lesson:** Windows Git Bash + PowerShell au limitari cross-platform: (a) `Get-Content` fara `-Raw` flag returneaza array of strings → `Set-Clipboard` pipe input ambiguous (clipboard may receive only last line sau wrong content). (b) `grep -P` (PCRE) fail cu locale C "supports only unibyte and UTF-8 locales" — Windows Git Bash default locale C.

**Pattern empirical [Pachet E-1 commit-msg verify + PR body clipboard]:** Clipboard prima incercare `Get-Content file | Set-Clipboard` a luat content terminal prior, NU file. `Get-Content -Raw file | Set-Clipboard` a functionat. `grep -P "[^\x00-\x7F]"` fail locale, workaround `perl -ne '/[^\x00-\x7F]/'` + POSIX charclasses.

**Rule:** Clipboard helpers Windows PowerShell: ALWAYS `Get-Content -Raw <file> | Set-Clipboard` pentru multi-line content. Non-ASCII verify Windows Git Bash: NU `grep -P`, foloseste `perl -ne` sau `LC_ALL=C grep "[^[:print:][:space:]]"` ca alternative cross-platform.

### L87 — Read tool state stale post-git-pull (re-Read mandatory)

**Lesson:** Post-git pull (fast-forward sau merge), Read tool tracking state pe fisierele schimbate este stale. Edit attempt va fail cu "File modified since read". Pattern aplicabil si la branch-switch state invalidation.

**Pattern empirical [Pachet E-2 DELTA-BIS edit]:** Edit failed first attempt cu "File modified since last Read" cauza: git pull intre Pachet E-1 close si Pachet E-2 open updated CHANGELOG.md. Re-Read necesar pre-Edit retry.

**Rule:** Post-git pull (FastForward sau Merge) sau branch-switch — Read tool state pe fisierele schimbate invalidat. Re-Read affected files INAINTE de Edit attempt. Daca Edit fail cu "File modified", re-Read primul, apoi retry.

### L88 — Briefing content commit message pre-Write static validation obligatoriu

**Lesson:** Briefing sources (planner Claude.ai / user / auto-generated content) pot injecta UTF-8 chars sau uppercase identifier tokens in commit message body sau subject. Husky commitlint prinde post-Write — dar prevenire pre-Write = preferred, evita retry cycles.

**Pattern empirical [Pachet E sesiune 3 violations recurring]:** E-2 commit-msg UTF-8 RESOLVED marker IOTA description, E-3 commit-msg UTF-8 arrow in body L76 pattern enumeration, E-3 commit-msg uppercase L76 token in subject. Plus L61 prior empirical (planner R16 auto-violation Pachet B). 4 violations same family cumulative.

**Rule:** Pre-Write commit message file = 2-pass static check obligatoriu inainte de Write tool invocation: (a) ASCII scan `[^\x00-\x7F]` → STOP daca non-ASCII detected, propose fix. (b) Subject case scan post `:` separator, `[A-Z]` token → STOP daca uppercase tokens (filename refs gen ROADMAP/CHANGELOG sau identifier prefix L<n>/R<n>). Both passes mandatory BEFORE Write. Cross-ref R7 + R18 + L61 + L83.

### L89 — Section 1 stale recurring drift detection

**Lesson:** HANDOFF Section 1 (Ultima actualizare + Motiv handoff + Next contribuitor) e zona cu drift recurring pattern. Frecvent update Section 1 ratat cand pachete docs livrate. State stale = pickup point briefing future invalidat = anti-pattern R3 single source.

**Pattern empirical [Pachet E sesiune curenta + Pachet F pre-flight]:** Section 1 disk current reflecta "Pachet D in-flight" stale post Pachet E-1+E-2+E-3 livrate (3 PR-uri merged consecutive fara Section 1 refresh). Discovery #20 in pre-flight Pachet F. Pattern observat cu Pachet B+C+D anterior similar (Section 1 update doar in Pachet specific edit BETA, NU automat per PR docs).

**Rule:** Orice docs PR care livreaza pachet major (sau >=2 PR-uri docs consecutive in Faza) = Section 1 refresh obligatoriu in same PR sau immediate next PR. Pre-flight verify Section 1 Data vs disk reality state = step standard pentru orice PR docs. Add la R20 Discovery Log protocol pre-close verify checklist: Section 1 sync check obligatoriu. Cross-ref R3 + R4 + R20.

### L90 — Anti-pattern recurring 3+ ocurrente sub workaround tactic = signal structural fix needed

**Lesson:** Anti-pattern recurring cu 3 sau mai multe ocurrente consecutive sub aplicare workaround tactic = signal investitie in solutie structurala. NU continua aplicare workaround infinit. Cost cumulativ workaround tactic > cost setup structural one-time.

**Pattern empirical [L76 5x recurring + L85 paradox]:** L76 pattern CHANGELOG self-bullet missing detectat 5 ocurrente consecutive (Pachet B fix C, C promis D failed, D promis E-1 failed, E-1 self preventive but E-2 broke, E-2 fixed E-3 retroactive, E-3 self preventive but again missed in Pachet F pre-flight). L85 paradox formal (strict same-PR self-bullet impossible pre-PR# assignment GitHub) NU solvabil tactic — 3 strategy options din L85 toate sunt workaround-uri cu trade-off-uri. Total docs overhead Pachet B-E pentru pattern recurring ~6h+ cumulativ.

**Rule:** La 3 ocurrente consecutive sub aplicare workaround tactic, STOP investigatie tactic + investeste structural. Solutii structurale exemple: GitHub Action workflow post-merge automation, Husky hook enforcement, schema constraint database, type system encoding invariant. Cost setup mai mare acceptat sub principiul "problemele se rezolva NU se ocolesc". Cross-ref forward PR-B `.github/workflows/changelog-sync.yml` (Pachet F follow-up scope structural fix L85 paradox).

### L91 — PowerShell wildcard Get-ChildItem inconsistency cu Test-Path

**Lesson:** PowerShell `Test-Path` cu wildcard pattern returneaza True cand match exista, dar `Get-ChildItem` cu acelasi wildcard pattern poate returna empty silent (NU error). Inconsistency cross-cmdlet pe acelasi pattern. Cauza: PSDrive provider quirks Windows long path / Unicode normalization edge cases.

**Pattern empirical [Pachet G TD-32 cleanup user-local]:** `Test-Path $env:USERPROFILE\pr1b0-edits*.patch` = True. `Get-ChildItem $env:USERPROFILE\pr1b0-edits*.patch` = empty. `Get-ChildItem -Path $env:USERPROFILE -Filter pr1b0-edits*.patch -Force` = empty. `Get-ChildItem -Path $env:USERPROFILE -Force | Where-Object Name -like pr1b0-edits*.patch` = empty. Workaround empirical: `cmd /c dir <path>` returneaza 2 files (pr1b0-edits-utf8.patch 2289b + pr1b0-edits.patch 4722b). Bash `ls` returneaza same 2 files. Resolution: Remove-Item -LiteralPath cu explicit paths fiecare succeded.

**Rule:** Pentru orice file operation cu wildcard pe Windows PowerShell, NU presupune Get-ChildItem reflecta accurate disk state. Verify dual: (a) `Test-Path` (boolean exists), (b) fallback `cmd /c dir <pattern>` sau `bash ls <pattern>` pentru enumerare reala. Pentru Remove-Item / Move-Item / Copy-Item, foloseste -LiteralPath cu explicit paths derivate din enumerarea fallback, NU wildcard glob expansion. Cross-ref R3 + R9 + L66 (PowerShell quirks) + L86 (PowerShell clipboard -Raw flag).

---

### L92 — Workflow YAML cu user-controlled input necesită audit security-grade pre-execution

**Lesson:** Audit pre-execution Pachet I PR-B `.github/workflows/changelog-sync.yml` design identificat 10 failures vs reguli absolute pe primul pass (shell injection via `${{ pr.title }}` interpolation, duplicate entry on re-run, self-trigger loop, race condition concurrent merge, regex type extract fragility, zero rollback CHANGELOG modify before push fail, zero audit trail granular, hardcoded develop branch, date computation client-side accuracy, type fallback chore silent). Cross-ref Section 12 PR-B FULL SPEC pentru detail SF-1..SF-10 + 3 scenarii dry-run + mitigations.

**Pattern empirical [Pachet I.1 pre-flight PR-B audit]:** Filtre design aplicate explicit (security, idempotency, observability, scalability) au prins 10 issues care primul pass NU le-a observat. Dual-pass empirical confirmed: pass 1 cu briefing-only catch = 2 sub-findings identificate (TD-35/TD-36 inițial), pass 2 cu explicit re-statement reguli fundamentale anti-amnezie ("orice bug descoperit MUST capture undeva persistent") catch = 8 sub-findings adiționale identificate. 5x improvement între passes (2 → 10 findings).

**Rule:** Orice workflow YAML care procesează user-controlled input (PR title, branch name, commit message, body) cu write permissions = audit security-grade obligatoriu pre-merge, NU good-enough design sub presiune timp. Filtre minimum mandatory: (1) shell injection mitigation via env vars NU `${{ }}` interpolation, (2) idempotency via re-run guards (grep existing before insert), (3) observability via audit trail granular (notice/warning steps), (4) scalability via concurrent execution safe (optimistic concurrency retry SAU lock). Sesiune dedicată recomandată pentru security-grade audit (3-5h, NU bundled cu alt scope).

---

### L93 — Cross-section consistency dual-pass mandatory post architecture revision

**Lesson:** Edit care modifică design decision cross-section (architecture revision, rename canonic, severity reclassify, policy lock) propagă inconsistencies silent la sections care cross-ref. Singular edit pe spec auto-canonical NU = singular consistency surface. Discovery empirical Pachet J.1 PR-B-spec sesiune 2026-05-12: 4 occurrences distincte (F15 permissions item 4 vs SF-11 diverge post Phase 4c.4 architecture, F16 Scenariu C narrative direct-push vs peter-evans post Phase 4c.5, F17 implicit Section 12.5 filtre invocă patterns "quoting discipline" / "concurrency primary" / "TARGET_BRANCH" lipsă din SF-X text original post Phase 4c.7 filter re-mapping, F17 explicit #197 hash CHANGELOG TBD post-merge L76 7th occurrence Phase 4d.a). Pattern recurrence rate empirical 4/4 architectural decisions PR-B-spec = high signal.

**Pattern empirical [Pachet J.1 PR-B-spec audit-driven revision]:** Anchored grep dual-pass post fiecare structural edit prinde inconsistencies care primul pass NU le observă. Self-test live application 4d.a → 4d.a.1 (CHANGELOG self-bullet insert → cross-section consistency grep `| TBD |$` surfaced #197 hash gap → immediate fix same-session). NU defer "polish pass at end" — findings ratate până la implementation sub fatigue. Cost dual-pass empirical: 5-10 min per architectural decision, NU optional. Prevention factor: 100% findings caught in-session vs 0% findings caught post-merge (occurence #5/F17 only caught because deliberate dual-pass applied; would have been silent corruption în CHANGELOG production altfel).

**Rule:** Orice edit care modifică design decision cross-section (architectural revision, canonic rename, severity reclassify, policy lock, hash/counter backfill) DUAL-PASS MANDATORY post-edit. Protocol: (1) Anchored grep pattern per concept (NU per linie), ex: după SF-X rewrite grep `SF-X` cross-doc verify ALL referencing locations consistent cu noul text; (2) Verify cross-ref network sections: filter mappings, scenarii narrative, acceptance criteria, sumar counters, Section 1 motiv + next contribuitor; (3) Surfaced inconsistencies fix same-session (precedent F15 4c.4.1 + F16 4c.6.d + F17 4d.a.1), NU defer "later". Cross-ref L88 (dual-pass pre-Write validation 60% improvement) — L93 extinde L88 cu cross-section post-Write dimension.

---

### L94 — Briefing must verify file format BEFORE specify grep patterns

**Lesson:** Înainte de orice briefing care include grep patterns sau structure assumptions, verifică EMPIRICAL format-ul actual al conținutului target. NU assume heading/section structure când reality poate fi table/list/inline embedded. Pattern recurring 3+ occurrences = signal forte că documentation evolves dar mental model assumptions stale.

**Pattern empirical (3 occurrences cataloagate):**
- Pachet J.1 Phase 4d.b2.a — Section 2 lessons format assumption (heading vs table mismatch)
- Pachet K Phase 1 DF2 — TDs grep `^### TD-` vs reality `^| TD-` (38 matches)
- Pachet K Phase 3 DF5 — TD-43/TD-44 new_string 4-col proposed vs reality 6-col canonical

**Rule:** futuremost briefing-uri grep pe HANDOFF/CHANGELOG/spec docs precedate de min. 1 anchored verify pe format actual (header structure + column count + separator pattern). Mandate aplicat pre-orice str_replace anchor design. Cross-ref L93 cross-section consistency (different concern — L93 = post-edit, L94 = pre-briefing).

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
