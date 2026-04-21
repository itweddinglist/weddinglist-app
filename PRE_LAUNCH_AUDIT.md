# WeddingList — Pre-Launch Audit

Colecție acumulativă de descoperiri care trebuie rezolvate sau validate înainte de lansarea WeddingList în producție. Organizate pe categorii.

**Ultima actualizare:** 2026-04-21 (prima versiune)

---

## Cum se folosește acest document

### Pentru Claude.ai / Claude Code

La fiecare PR care descoperă o problemă conexă scope-ului curent (raportată în PR body secțiunea "Probleme conexe descoperite"): adaugă observația aici în categoria potrivită. Referință obligatorie la PR-ul sursă.

Format:

- Scurt titlu problemă — descriere 1-2 propoziții
- Impact: [user-facing / datorie tehnică / security / etc.]
- Scope sugerat: [H6 manual flow / H7 design tokens / PR standalone / etc.]
- *Descoperit: PR #NNN*

### Pentru User

La H6 (Manual Flow Walkthrough), acest document e start-point. Deschizi, parcurgi lista, decizi care se rezolvă acum și care devin post-launch backlog.

### Update protocol

Update-uri prin PR (branch convention: docs/audit-update-YYYYMMDD) sau incluse în PR-ul care descoperă problema.

---

## Categorii

- Bugs vizuale
- Bugs funcționale
- Datorie tehnică
- Texte și copywriting
- Edge cases de testat
- Performance
- Security
- Flow-uri manuale de validat (H6)

---

## Bugs vizuale

- [ ] **Dialog shadow inconsistency** — app/rsvp/page.tsx:609 folosește boxShadow literal cu rgba(0,0,0,0.18) (negru pur) pentru modal dialog, în timp ce --shadow-sm + --shadow-md definite în PR #170 folosesc rgba(19, 23, 46, ...) (navy). Discrepanță design tokens.  
  Impact: cosmetic, dialog overlay se vede ușor diferit față de shadow-urile generale.  
  Scope sugerat: H7 design tokens (consolidare scara shadows).  
  *Descoperit: PR #170*

- [ ] **Hex #9DA3BC pentru muted text în pdf-export** — folosit literal la mai multe locuri (labels, footer, table meta) în lib/export/pdf-export.tsx. Nu aliniat cu --muted (#7a7f99) din globals.css.  
  Impact: consistency vizuală cross-medium (PDF vs web).  
  Scope sugerat: H7 design tokens (presentation layer pentru PDF).  
  *Descoperit: PR #168 și PR #169*

- [ ] **--color-text-light temporar egal cu --color-text-muted** — la PR #170, alias pentru var(--muted) pentru că paleta primitive nu avea distincție clară muted vs light. Dacă design-ul cere 2 variante distincte, trebuie adăugată o primitive nouă.  
  Impact: hierarchy tipografică mai subtile nu e posibilă momentan.  
  Scope sugerat: H7 design tokens.  
  *Descoperit: PR #170*

---

## Bugs funcționale

*(momentan gol)*

---

## Datorie tehnică

- [ ] **Supabase types generate** — rsvpResult.data și alte query results sunt cast-uite cu "as unknown as TargetType" pe joins !inner. Generare types oficiale cu supabase gen types typescript va elimina double cast-urile.  
  Impact: type safety mai puțin strictă, risc de mismatch la schema changes.  
  Scope sugerat: PR standalone post-H3 sau ca parte din H5 re-audit securitate.  
  *Descoperit: PR #165*

- [ ] **Duplicare statusLabels + badgeColors locale în app/rsvp/page.tsx** — dashboard definește aceste Record-uri local. După PR #170 (fix CSS vars), dashboard afișează corect, dar duplicarea arhitecturală rămâne vs. getStatusLabel + CSS vars directe.  
  Impact: datorie tehnică, nu bug. Dacă schimbi labels în rsvp-translations.ts, dashboard rămâne cu versiune veche.  
  Scope sugerat: PR follow-up scurt (30-45 min) — import getStatusLabel, păstrează badgeColors local per convenție L4.  
  *Descoperit: PR #168, confirmat PR #170*

- [ ] **mealLabel duplicat pdf-export vs translations** — lib/export/pdf-export.tsx folosește mealLabel("standard") === "Standard" local. lib/rsvp/rsvp-translations.ts are t.meal.standard === "Meniu standard". Match imperfect. Decide care e canonic.  
  Impact: inconsistență UI (web dashboard vs PDF export).  
  Scope sugerat: PR standalone cu decizie: extinde presentation layer sau alineaza translations.  
  *Descoperit: PR #169*

---

## Texte și copywriting

- [ ] **Pluralizare "ZILE RĂMASE"** — sidebar afișează hardcodat plural (ex: "148 ZILE RĂMASE"). Pentru 1 zi ar trebui "ZI RĂMASĂ"; pentru 2-19 zile "ZILE RĂMASE"; pentru 20+ zile verifică formatul RO oficial (în RO pluralizarea e 1, 2-19, 20+).  
  Impact: grammar corectness, vizibil oricărui user.  
  Scope sugerat: util Intl.PluralRules în lib/i18n/ + aplicare la component sidebar.  
  *Descoperit: observație Claude.ai PR #170 screenshot validation*

- [ ] **Labels "Fără link" vs "Manual"** — dashboard RSVP arată pentru invitați fără invitație "Fără link" și label "Manual" în coloana acțiuni. User înțelege diferența? Utilizator test necesar.  
  Impact: UX ambiguity, potențial user-facing.  
  Scope sugerat: H6 manual flow walkthrough, după feedback utilizator real.  
  *Descoperit: observație Claude.ai PR #170 screenshot*

- [ ] **"Cununie civilă" label generalizat** — toți invitații în screenshot PR #170 au label "Cununie civilă". E placeholder test data sau reprezintă un event specific? Dacă e event specific, ar trebui configurabil (event list per wedding).  
  Impact: product decision needed.  
  Scope sugerat: H6 sau discuție cu user pre-H6.  
  *Descoperit: observație Claude.ai PR #170 screenshot*

---

## Edge cases de testat

- [ ] Wedding creation -> invitație publică -> RSVP submit -> dashboard update — flow end-to-end. Ar trebui acoperit de H4 E2E Playwright.
- [ ] PDF export cu 100+ invitați — performance, break-page, font rendering. Testat manual cu date reale sau mock.
- [ ] CSV export deschis în Excel vs Google Sheets vs LibreOffice — encoding UTF-8, caractere diacritice RO (ă, â, î, ș, ț). Cel puțin un test manual cross-tool.
- [ ] RSVP submission cu 10 invitați în același grup — UI overflow pe mobile? Pe desktop? Scrolling necesar?
- [ ] Seating chart cu 50+ mese × 10 invitați fiecare — performance DnD. Post-HWE1 TS migration.
- [ ] Invitații fără nume specificat — ce se afișează? Fallback vizibil? (ex: "Invitat #12")
- [ ] RSVP cu decline + motivație — există câmp pentru motiv? Dacă da, UX-ul e clar?
- [ ] Multi-locale RSVP — RsvpLocale momentan doar 'ro'. Când adăugăm MD/BG, UI-ul suportă switch la runtime sau e build-time?

---

## Performance

- [ ] Polling dashboard 30s — acceptable pentru 500+ invitați? Verifică la load real. Posibil network cost mare.  
  Scope sugerat: H4 E2E cu simulation sau observability post-launch.

- [ ] Bundle size — verifică cu next build --analyze înainte de launch. Target: first load JS < 200KB pe route publice.  
  Scope sugerat: pre-launch optimizare.

- [ ] Seating chart DnD latency — N/A până la HWE1 TS migration.

---

## Security

- [ ] RLS policies Supabase — verificat la PR #165, dar nu audit complet recent. H5 va avea re-audit dedicat.
- [ ] API routes rate limiting — există? Dacă nu, adăugat înainte de launch pentru endpoint-uri publice (RSVP submit). Scope: H5 securitate.
- [ ] Email verification flow — testare end-to-end cu provider real (nu doar Supabase local). Scope: H5 sau H6.
- [ ] Input sanitization pe free-text fields — RSVP notes, guest names, wedding name. XSS prevention. Scope: H5.

---

## Flow-uri manuale de validat (H6)

Checklist pentru Hardening Week sprint H6 (Manual Flow Walkthrough).

### Auth

- [ ] Signup flow complet (email + password)
- [ ] Email verification
- [ ] Login normal
- [ ] Logout + re-login
- [ ] Password reset (dacă există)

### Wedding creation

- [ ] Wizard complet (toate pașii)
- [ ] Validări câmpuri
- [ ] Save partial (recover dacă închide browser)

### Invite generation

- [ ] public_link_id generat corect
- [ ] URL public funcțional
- [ ] Invitație render (web)
- [ ] Print-friendly view (dacă există)

### RSVP flow

- [ ] Accept (cu/fără meal choices)
- [ ] Decline (cu/fără motiv)
- [ ] Maybe
- [ ] Multi-guest submit (group RSVP)
- [ ] Edit existent RSVP (dacă e permis)
- [ ] Dietary notes propagate la accepted guests

### Dashboard

- [ ] Stats refresh (button + polling)
- [ ] Filters (toți / confirmați / refuzați / etc.)
- [ ] Search invitat
- [ ] Sort columns (dacă există)

### Guest list CRUD

- [ ] Add invitat manual
- [ ] Edit invitat
- [ ] Delete invitat (cu confirm dialog)
- [ ] Bulk operations (dacă există)

### Seating chart

- [ ] Drag & drop masă
- [ ] Asignare invitat la masă
- [ ] Rename masă
- [ ] Capacity masă (validare overflow)
- [ ] Export PNG
- [ ] Import/restore plan

### Budget

- [ ] Add item
- [ ] Edit item (amount, status)
- [ ] Delete item
- [ ] Categories navigation
- [ ] Total calculations

### Vendors

- [ ] Add vendor
- [ ] Edit vendor
- [ ] Delete vendor
- [ ] Categories / filters

### Settings

- [ ] Change wedding name
- [ ] Change wedding date
- [ ] Other settings (event list, venue, etc.)

### Export / Import

- [ ] Export JSON (download)
- [ ] Export CSV (deschis în Excel + Google Sheets + LibreOffice)
- [ ] Export PDF (deschis în reader, print test)
- [ ] Export PNG seating (diverse rezoluții)
- [ ] Import JSON (restore complet)

### Cross-cutting

- [ ] Mobile responsive (breakpoints critice)
- [ ] Dark mode (dacă e implementat până la H6)
- [ ] Browser compat (Chrome, Firefox, Safari, Edge)
- [ ] Slow network simulation (offline graceful?)
- [ ] Long session (token refresh, session expiry)

---

## Completări în timp

Pe măsură ce Claude.ai / Claude Code descoperă noi observații în PR-uri viitoare, adăugăm aici în categoria potrivită. Format obligatoriu: titlu + descriere + impact + scope + PR sursă.

Cele listate mai sus sunt cumulate retroactiv din PR #164-#170 (mini-secvența H3 Etapa 2/3 + hotfix #170). Post-H3 va crește.