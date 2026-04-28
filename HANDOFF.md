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

## 1. Ultima actualizare

- **Data:** 2026-04-26 (PR #173a — restructurare docs)
- **Contribuitor:** Claude Opus 4.7 (session Claude.ai, user: itweddinglist@gmail.com)
- **Motiv handoff:** Restructurare docs (5 → 4 active: HANDOFF, ROADMAP, CHANGELOG nou, CLAUDE; STATUS + PRE_LAUNCH_AUDIT deveniți REDIRECT). PR #172 H3 Etapa 3/3 Budget refactor merged ca 48b95b9 anterior (vezi CHANGELOG.md).
- **Next contribuitor așteptat:** continuare cu PR #173b (content update — datorii tehnice + decizii LOCKED L15-L19 + 17 open items consolidați) sau orice sesiune Claude.ai cu acces la noul stack docs.

---

## 2. Stare proiect

- **Branch default:** develop
- **Ultimul commit pe develop:** 795911d — Merge PR #170 (fix CSS vars cross-page)
- **Baseline teste:** 837 passed + 4 skipped (Vitest)
- **Last build:** SUCCESS (Next.js 16.2.2 Turbopack, ~6.4s)
- **Branch-uri deschise:** docs/handoff-audit-session-protocol (curent, pentru PR #171). După merge, zero.

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

**Sumar severitate:** 1 Critical, 7 Medium, 4 Low, 4 Out-of-scope/Convention, 3 Resolved-tracking.


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