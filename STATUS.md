# STATUS.md — WeddingList App
# Spec version active: V5.4
# Last synced with SPEC: 2026-04-15
# Rol: Starea curentă a proiectului. Se actualizează la fiecare sesiune.

---

## 1. PROGRES REAL

**Evaluare sinceră: ~99% din produs funcțional**

---

## 2. STAREA MODULELOR

| Modul | Status | Note |
|-------|--------|------|
| Seating Chart UI | ✅ Funcțional | Vizualizare, drag & drop |
| Seating Chart Save | ✅ Funcțional | RPC sync există + migration + fix JSON.stringify |
| Seating Chart Load | ✅ Funcțional | GET /seating/load server-side, tables din DB |
| Magic Fill | ✅ Funcțional | V2.0, 6 etape deterministe, testat 600 invitați, 344+ așezați |
| Listă Invitați | ✅ Funcțional | 600 invitați testați |
| RSVP Dashboard | ✅ Funcțional | Buguri UI/UX fixate (fix/rsvp-settings-polish) |
| Export JSON | ✅ Fix aplicat | wedding_id din query param, sort_order eliminat |
| Export PDF | ✅ Fix aplicat | location_name eliminat, filename ASCII, Uint8Array |
| Budget | ✅ Funcțional | UI complet: CRUD items, payments, state machine |
| Dashboard | ✅ Funcțional | Statistici reale via API, Task Engine integrat, auth server-side complet (Faza 12.4) |
| Settings | ✅ Funcțional | GDPR export + delete cont, link disabled fix |
| Vendors | ❌ Blocat | Blocat pe Voxel |

---

## 3. MODIFICĂRI LOCALE ACTIVE (NECOMISE)

### 3.1 `.env.local` — variabile adăugate pentru dev

```
NEXT_PUBLIC_DEBUG_AUTH=true
NODE_ENV=development
```

**NU se commitează niciodată.**

---

## 4. STAREA SUPABASE DEV

**DEV: typpwztdmtodxfmyrtzw**

### RLS dezactivat temporar pentru QA (NU e dezactivat pe PROD)

```sql
-- Dezactivat pe:
guests, guest_events, tables, seat_assignments,
wedding_members, weddings, events,
seating_id_counters, guest_groups
```

### Date de test

UUID-uri fixe:
- `app_user_id`: `00000000-0000-0000-0000-000000000001`
- `wedding_id`: `00000000-0000-0000-0000-000000000002`
- `event_id`: `00000000-0000-0000-0000-000000000003`

Date: 600 guests + 600 guest_events + 4 guest_groups + 121 tables (deleted_at resetat)

`app_users.active_wedding_id` setat la `00000000-0000-0000-0000-000000000002`.

### Funcții RPC în DEV

- `allocate_seating_numeric_ids_batch` — **există** + migration `20260409000001` + security hardening `20260414000001`
- `sync_seating_editor_state` — **există** + migration `20260409000002` adăugată

### `seating_id_maps`

Populat corect server-side prin `GET /api/weddings/[id]/seating/load` cu `service_role`.
Nu mai depinde de anon key din browser.

### Cheie Supabase DEV

Cheia anterioară a fost **revocată**.
Noua cheie e în `.env.local` local.

---

## 5. TESTE

- **712/712 verzi** + 4 skipped (716 total) pe develop
- T2, T12, T13, T16 marcate `.skip`
- **`npm run build` ✅** — build producție verde (Next.js 16.2.2 Turbopack)
- Testele `.test.js` NU migrate la TypeScript (intenționat)

---

## 6. ULTIMELE PR-URI

| PR | Titlu | Status |
|----|-------|--------|
| #112 | fix(auth): corecteaza coloana user_id → app_user_id | ✅ Merged develop |
| #113 | feat(seating): muta load seating pe server - endpoint get securizat | ✅ Merged develop |
| #114 | fix(seating): elimina json.stringify din parametrii rpc sync | ✅ Merged develop |
| #115 | feat(db): adauga migratii pentru rpc-urile seating | ✅ Merged develop |
| #116 | fix: sterge app/dashboard/page.js duplicat | ✅ Merged develop |
| #117 | fix(export): repara export json si pdf - wedding not found si erori schema | ✅ Merged develop |
| #118 | feat(budget): implementare completa budget ui - crud items, payments, state machine | ✅ Merged develop |
| #119 | feat(seating): faza 7 - conflict system occ si version mismatch | ✅ Merged develop |
| #129 | fix(seating): tab overlap fals pozitiv la reload - sessionstorage | ✅ Merged develop |
| #130 | docs: actualizeaza status - faza 0 done, build verde, 90% | ✅ Merged develop |
| #131 | feat(db): faza 9 - audit system tiered seating_audit_logs si rpc v3 | ✅ Merged develop |
| #132 | docs: actualizeaza status si context - faza 9 done, 92% | ✅ Merged develop |
| #133 | fix(sidebar): elimina module fantoma si adauga rsvp in navigare | ✅ Merged develop |
| #134 | fix(magic-fill): rescriere algoritm v2.0 + fix sync_seating_editor_state pgrst203 | ✅ Merged develop |
| feat/faza10-data-access-layer | feat(db): faza 10 - normalizerpcrror, rpcerrror class, rpc wrapper cu timing | ✅ Merged develop |
| feat/faza11-security-hardening | feat(security): faza 11 - membership check security definer, reindexare idempotenta | ✅ Merged develop |
| feat/faza8-silent-refetch | feat(seating): faza 8 - silent refetch, massive conflict dialog, save with smart refetch | ✅ Merged develop |
| feat/faza12-dashboard-refactor | feat(dashboard): faza 12 - refactor auth server-side, task context endpoint | ✅ Merged develop |
| fix/rsvp-settings-polish | fix(rsvp): whatsapp public link id, error handling, polling, bulk progress, filter is_active | ✅ Merged develop |

---

## 7. PROBLEME CUNOSCUTE

### Critice (blochează launch)
1. ~~`sync_seating_editor_state` RPC lipsă~~ → **REZOLVAT** (migration + fix)
2. ~~`allocate_seating_numeric_ids_batch` RPC cu bug-uri~~ → **migration adăugată**
3. ~~RPC-urile nu sunt în migrații~~ → **REZOLVAT** (20260409000001 + 20260409000002)
4. ~~Magic Fill netestat cu date reale~~ → **REZOLVAT** (PR #134 — V2.0, 344+ așezați din 600)
5. ~~Export JSON/PDF broken~~ → **REZOLVAT**
6. ~~Budget UI lipsă (404)~~ → **REZOLVAT** (PR #118)
7. ~~Dev bypass nestructurat în 4 fișiere~~ → **REZOLVAT** (lib/auth/dev-session.ts + Faza 1 completă)

### Importante
8. ~~Dashboard auth cu anon key în client~~ → **REZOLVAT** (Faza 12.4: `Promise.all` cookie-auth, zero Supabase client în browser, `GET /api/dashboard/task-context` endpoint nou)
9. ~~Task Engine neintegrat cu date reale~~ → **REZOLVAT** (Faza 12.4: `TaskEngineContext` calculat din `/stats` + `/task-context`, `generateTasks()` apelat server-side via fetch)
10. ~~Sidebar cu module fantomă (Checklist, Timeline, Wishlist, Moodboard, Notițe)~~ → **REZOLVAT** (PR #133)
11. Zoom bug la ZOOM_MIN neconfirmat prin testare reală
12. ~~`app/guest-list/page.tsx` token guard relaxat local~~ → comportament intenționat, auth via cookie (no JWT needed)

### Pre-launch
13. ~~Security audit (RBAC, shadow session, CSRF, error leakage)~~ → **REZOLVAT** (PR #146–#149)
14. `wpBridgeEnabled: true` la launch
15. Migrații aplicate pe PROD — include `20260413000001`, `20260414000001`
16. `RESEND_API_KEY` în Vercel
17. `SHADOW_SESSION_SECRET` în Vercel
18. DNS `app.weddinglist.ro`
19. ToS + Privacy Policy în română
20. RLS reactivat pe DEV după testare
21. Postgres Cron activat: Dashboard → Database → Extensions → `pg_cron` (cleanup audit logs, migration 20260409000004)

---

## 8. URMĂTORUL TASK

**Pre-launch checklist — Infrastructură** — fazele 0-12 + security audit sunt ✅ DONE.

Rămâne (infrastructură):
- `wpBridgeEnabled: true` în feature-flags (înainte de deploy PROD)
- Aplicarea migrațiilor `20260413000001` + `20260414000001` pe PROD
- Verificare env vars în Vercel (RESEND_API_KEY, SHADOW_SESSION_SECRET, NEXT_PUBLIC_APP_URL)
- DNS `app.weddinglist.ro` → Vercel
- ToS + Privacy Policy în română
- RLS reactivat pe DEV
- `pg_cron` activat pe PROD

---

## 10. SECURITY FIXES (2026-04-16)

Audit de securitate complet aplicat pe branch-uri dedicate, toate merguite în `develop`.

| Fix | Branch | Descriere |
|-----|--------|-----------|
| RBAC minRole explicit | `fix/security-minrole-rbac` | Eliminat `minRole = "viewer"` default din `requireWeddingAccess`; toate cele 25 de rute primesc acum `minRole` explicit — TypeScript enforced |
| Shadow session expiration | `fix/security-shadow-session` | Adăugat `auth_source` + `absolute_issued_at` în JWT payload; fereastra absolută de 15 min; blocat shadow-of-shadow chaining |
| CSRF origin check | `fix/security-csrf-origin-check` | Creat `lib/csrf.ts` cu `checkOrigin()`; aplicat pe toate 16 rute mutante (POST/PATCH/DELETE/PUT) ca primă verificare |
| Error leakage (500) | `fix/security-final-hardening` | Eliminat `error.message` din răspunsurile client în `provision/route.ts` și `migrate-local/route.ts`; log server-side cu `console.error`, mesaj generic spre client |

**Stare post-audit:** tsc clean, 712/712 teste verzi.

---

## 9. FAZELE DE IMPLEMENTARE (SPEC V5.4)

| Fază | Task | Status |
|------|------|--------|
| 0 | `/dev` route | ✅ DONE |
| 1 | Auth cleanup (`lib/auth/dev-session.ts`) | ✅ DONE |
| 2 | Shadow session | ✅ DONE |
| 3 | Idempotency table | ✅ DONE |
| 4 | Read-only mode | ✅ DONE |
| 5 | RPC `allocate_seating_numeric_ids_batch` | ✅ DONE (migration + fix) |
| 6 | RPC `sync_seating_editor_state` | ✅ DONE (migration + fix) |
| 7 | Conflict system + client state machine | ✅ DONE (PR #119) |
| 8 | Silent refetch | ✅ DONE (feat/faza8-silent-refetch) |
| 9 | Audit system tiered | ✅ DONE (PR #131) |
| 10 | Data access layer | ✅ DONE (feat/faza10-data-access-layer) |
| 11 | Security hardening | ✅ DONE (feat/faza11-security-hardening) |
| 12 | Product completion | ✅ DONE (feat/faza12-dashboard-refactor + fix/rsvp-settings-polish) |
