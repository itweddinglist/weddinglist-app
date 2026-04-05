# MARKETING.md — Weddinglist
# Versiune: 1.0 — Apr 5, 2026
# Document consultativ. Features pentru pagina de marketing și copy extern.

---

## Scopul documentului

Definește ce funcționalități pot fi prezentate utilizatorilor în materiale de marketing, landing page, social media și comunicare externă.
NU este un document de prioritizare produs — pentru asta există PRIORITIES.md.

---

## Stare implementare per feature

### ✅ IMPLEMENTAT — poate fi prezentat utilizatorilor

#### Seating Chart
- Plan interactiv al meselor — drag & drop invitați
- Magic Fill — algoritm de alocare automată bazat pe grupuri
- Grupe de invitați alocate la aceeași masă
- Export PNG al planului de mese
- Vizualizare declined guests direct în plan (badge roșu, opacity redusă)
- Statistici live: locuri ocupate, libere, invitați nealocați

#### Lista Invitați
- Adaugă, editează, șterge invitați
- Import CSV în masă
- Export CSV
- Grupuri de invitați
- Meniu ales per invitat (pentru catering)
- Avertizare duplicate de nume la adăugare și import
- Filtrare duplicate din Import Report Panel

#### RSVP
- Link personal per invitat (token securizat)
- Pagina publică RSVP — răspuns cu un click
- Confirmare / Declinare cu opțiuni meniu
- Dashboard RSVP cu statistici (confirmat / declinat / în așteptare)
- Trimitere link prin WhatsApp
- Override manual status RSVP de către cuplu
- Export CSV status RSVP
- Integrare Seating ↔ RSVP: declined nu apar în planul de mese

#### Budget
- Adaugă categorii buget și costuri estimate
- Înregistrare plăți efectuate
- Sumar buget cu totaluri derivate
- Avertizare valute mixte

#### Export & Backup
- Export JSON complet (backup wedding)
- Import JSON (restore pe wedding nou)
- Export PDF — plan mese + lista invitați
- Font cu diacritice românești în PDF

#### Securitate & Reliability
- Rate limiting RSVP (protecție brute-force)
- Protecție anti-bot honeypot pe RSVP
- Optimistic UI — acțiunile sunt instant, fără lag vizibil
- Rollback automat la eroare server
- Audit trail append-only
- GDPR: ștergere cont + date în 9 pași controlați
- Right to portability (Art. 20 GDPR) — export JSON/CSV

#### Analytics
- PostHog EU — analytics GDPR-safe (server Frankfurt)

---

### ⏳ ÎN PROGRES / PLANIFICAT — NU se prezintă utilizatorilor

| Feature | Status | ETA |
|---------|--------|-----|
| Tooltip "Eliberați locul?" pentru declined cu loc alocat | Design pending | V2 |
| Impersonation tool admin | Planificat | After launch |
| Responsive mobile complet (Seating) | Planificat | V2 |
| Multi-user / live sync | Planificat | V3 |
| Guest Moments (QR pe masă, poze, album) | Planificat | Faza 10 |
| Vendors Mirror (Voxel integration) | Blocat pe Voxel | TBD |
| WhatsApp delivery hub complet | Parțial — V2 | V2 |
| E2E testing pe critical flows | Planificat | Before launch |
| Public status page | Planificat | After launch |

---

## Copy sugestii pentru landing page

### Tagline opțiuni
- "Planifică nunta. Nu stresul."
- "Seating chart intelligent. Invitați fericiți."
- "De la lista de invitați la planul meselor — în câteva minute."

### Features cu impact maxim (pentru hero section)
1. **Magic Fill** — "Algoritmul nostru alocă automat invitații la mese, respectând grupurile tale."
2. **RSVP cu un click** — "Fiecare invitat primește un link personal. Răspunde în 10 secunde."
3. **Plan interactiv** — "Drag & drop. Mută invitații între mese instant. Exportă PNG."
4. **Backup complet** — "Datele tale, mereu în siguranță. Export JSON + PDF oricând."

### Social proof angles
- "698 de teste automate. Zero surprize în ziua nunții."
- "Construit pentru Romania — diacritice corecte în PDF, RSVP în română."
- "GDPR complet — datele invitaților tăi sunt protejate."

---

## Reguli

- NU prezenta features din coloana "ÎN PROGRES" ca disponibile
- NU face promisiuni despre date de lansare specifice
- NU prezenta Vendors Mirror ca funcțional (blocat pe Voxel)
- Orice feature nou implementat → actualizează acest document înainte de comunicare externă
