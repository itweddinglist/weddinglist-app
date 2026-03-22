\# Supabase Migrations — Convenții



\## Regula de bază

Orice schimbare de schemă se face EXCLUSIV prin migration files.

Nu se editează schema direct din Supabase Dashboard.



\## Naming convention

Format: YYYYMMDDHHMMSS\_descriere\_scurta.sql



Exemple:

\- 20260321000001\_initial\_schema.sql

\- 20260322000001\_add\_guest\_notes.sql

\- 20260322000002\_add\_vendor\_index.sql



\## Cum creezi o migration nouă



1\. Generezi fișierul:

npx supabase migration new descriere\_scurta



2\. Editezi fișierul generat în supabase/migrations/



3\. Testezi local:

npx supabase migration list



4\. Aplici pe dev:

npx supabase db push



5\. Verifici în dashboard că e aplicată



6\. Commit + push pe GitHub



\## Reguli stricte



✅ Fiecare migration e idempotentă unde e posibil

✅ Nu ștergi migration files deja aplicate

✅ Nu modifici migration files deja aplicate

✅ Aceeași ordine de migrations pe dev și prod

✅ Testezi pe dev înainte să aplici pe prod



\## Aplicare pe prod



Prod se actualizează MANUAL după validare pe dev:

1\. npx supabase link --project-ref dtyweqcpanxmckngcyqx

2\. npx supabase db push

3\. npx supabase link --project-ref typpwztdmtodxfmyrtzw (relink la dev)



\## Ce NU faci



❌ Nu editezi schema din Supabase Dashboard ca flow principal

❌ Nu rulezi SQL direct pe prod fără migration file

❌ Nu ștergi sau modifici migrations deja aplicate

❌ Nu aplici pe prod fără să testezi pe dev

