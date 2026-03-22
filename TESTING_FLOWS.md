\# Testing Flows Critice — 0B.10



\## Cum rulezi testele

Înainte de orice deploy pe main, verifici manual toate flow-urile de mai jos.

Bifează fiecare înainte de merge.



\---



\## Flow 1 — Guest (nelogat)



\*\*Scenariu:\*\* User nelogat folosește seating chart.



Pași:

1\. Deschide `http://localhost:3000/seating-chart`

2\. Adaugă o masă

3\. Adaugă un invitat

4\. Așteaptă 1-2 secunde

5\. Verifică în browser DevTools → Application → localStorage

&#x20;  - Cheia `wedding\_seating\_v14` există

&#x20;  - Conține tables și guests

6\. Reîmprospătează pagina

7\. Verifică că masa și invitatul sunt încă acolo



\*\*Rezultat așteptat:\*\* ✅ Date persistate în localStorage



\---



\## Flow 2 — Bootstrap WordPress



\*\*Scenariu:\*\* Verificare endpoint WP bootstrap.



Pași:

1\. Loghează-te pe `https://www.weddinglist.ro`

2\. Deschide `https://www.weddinglist.ro/wp-json/weddinglist/v1/bootstrap`

3\. Verifică răspunsul



\*\*Rezultat așteptat:\*\*

```json

{

&#x20; "authenticated": true,

&#x20; "user": {

&#x20;   "wp\_user\_id": 123,

&#x20;   "email": "...",

&#x20;   "display\_name": "..."

&#x20; },

&#x20; "weddings": \[]

}

```



\---



\## Flow 3 — Provisioning app\_user



\*\*Scenariu:\*\* Creare app\_user în Supabase.



Pași:

1\. Deschide Supabase dashboard → weddinglist-dev → Table Editor → app\_users

2\. Verifică că tabela e goală

3\. Apelează manual endpoint-ul POST `/api/auth/provision` cu:

```json

{

&#x20; "wp\_user\_id": 1,

&#x20; "email": "test@weddinglist.ro",

&#x20; "display\_name": "Test User"

}

```

4\. Verifică în Supabase că a apărut un row în `app\_users`

5\. Verifică că a apărut un row în `identity\_links`

6\. Apelează din nou același endpoint

7\. Verifică că nu s-au creat duplicate



\*\*Rezultat așteptat:\*\* ✅ Idempotent — un singur user creat



\---



\## Flow 4 — Rate limiting



\*\*Scenariu:\*\* Rate limiting funcționează.



Pași:

1\. Apelează `/api/auth/provision` de 11 ori rapid

2\. Verifică că al 11-lea răspuns are status 429



\*\*Rezultat așteptat:\*\* ✅ 429 Too Many Requests



\---



\## Flow 5 — localStorage Migration



\*\*Scenariu:\*\* Migrare date din localStorage în Supabase.



Pași:

1\. Adaugă date în seating chart ca guest

2\. Verifică că sunt în localStorage

3\. Apelează POST `/api/migrate-local` cu payload corect

4\. Verifică în Supabase că guests și tables au apărut

5\. Apelează din nou același endpoint

6\. Verifică că nu s-au creat duplicate



\*\*Rezultat așteptat:\*\* ✅ Date migrate, idempotent



\---



\## Flow 6 — Error boundary



\*\*Scenariu:\*\* Error boundary prinde erorile corect.



Pași:

1\. Adaugă temporar `throw new Error("test")` într-o componentă

2\. Verifică că apare UI-ul de eroare cu buton "Încearcă din nou"

3\. Apasă butonul

4\. Verifică că componenta se resetează

5\. Scoate `throw new Error("test")`



\*\*Rezultat așteptat:\*\* ✅ Error boundary funcționează



\---



\## Flow 7 — Health endpoint



\*\*Scenariu:\*\* /api/health răspunde corect.



Pași:

1\. Deschide `http://localhost:3000/api/health`

2\. Verifică răspunsul



\*\*Rezultat așteptat:\*\*

```json

{

&#x20; "status": "ok",

&#x20; "timestamp": "...",

&#x20; "environment": "development"

}

```



\---



\## Checklist pre-deploy pe main



\- \[ ] Flow 1 — Guest localStorage ✅

\- \[ ] Flow 2 — Bootstrap WP ✅

\- \[ ] Flow 3 — Provisioning idempotent ✅

\- \[ ] Flow 4 — Rate limiting ✅

\- \[ ] Flow 5 — Migration idempotent ✅

\- \[ ] Flow 6 — Error boundary ✅

\- \[ ] Flow 7 — Health endpoint ✅

\- \[ ] `npm run build` trece fără erori ✅

\- \[ ] `npm run lint` fără erori noi ✅

