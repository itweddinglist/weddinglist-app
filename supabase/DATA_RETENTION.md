\# Data Retention Rules — Weddinglist



\## Principiu general

Stocăm datele strict cât este necesar pentru funcționarea produsului.

Nicio dată nu este păstrată mai mult decât perioada definită mai jos.



\## Reguli per tip de date



\### Date operaționale (guests, tables, seating, budget, vendors, RSVP)

\- Păstrate pe durata contului activ

\- Șterse la 30 de zile după ștergerea contului

\- Implementat prin: ON DELETE CASCADE din weddings → toate tabelele



\### Sesiuni și auth

\- app\_users: păstrat cât contul e activ

\- identity\_links: păstrat cât contul e activ

\- Nu stocăm sesiuni în DB — sesiunile sunt în WordPress



\### Migration logs (data\_migrations)

\- Păstrate 90 de zile după status = completed

\- Scop: debugging și audit

\- Cleanup: manual sau cron job viitor



\### Autosave snapshots (seating\_editor\_states)

\- Păstrate cât contul e activ

\- Șterse odată cu wedding\_id (CASCADE)



\### Date tehnice (Sentry errors)

\- 30 de zile în Sentry EU

\- Fără date personale (scrubbing activ)



\### Backup-uri

\- Nu facem backup-uri cu date personale în afara Supabase

\- Supabase EU Frankfurt — backup automat pe plan plătit



\## Drepturi utilizator (GDPR)

\- Ștergere cont → toate datele șterse în 30 de zile — Faza 8

\- Export date → Faza 8

\- Rectificare → disponibil prin UI



\## Responsabil

\- Operator: \[NUME COMPANIE] SRL

\- Contact: \[EMAIL CONTACT]

\- Ultima actualizare: Martie 2026

