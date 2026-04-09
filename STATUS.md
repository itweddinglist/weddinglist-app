# STATUS.md — WeddingList App
# Spec version active: V5.4
# Last synced with SPEC: 2026-04-09
# Rol: Starea curentă a proiectului. Se actualizează la fiecare sesiune.

---

## 1. PROGRES REAL

**Evaluare sinceră: ~82% din produs funcțional**

---

## 2. STAREA MODULELOR

| Modul | Status | Note |
|-------|--------|------|
| Seating Chart UI | ✅ Funcțional | Vizualizare, drag & drop |
| Seating Chart Save | ✅ Funcțional | RPC sync există + migration + fix JSON.stringify |
| Seating Chart Load | ✅ Funcțional | GET /seating/load server-side, tables din DB |
| Magic Fill | ⚠️ Netestat | Necesită validare cu date reale |
| Listă Invitați | ✅ Funcțional | 600 invitați testați |
| RSVP Dashboard | ✅ Funcțional | Buguri mici UI/UX |
| Export JSON | ✅ Fix aplicat | wedding_id din query param, sort_order eliminat |
| Export PDF | ✅ Fix aplicat | location_name eliminat, filename ASCII, Uint8Array |
| Budget | ❌ Lipsă complet | Doar API, fără UI (404) |
| Dashboard | ⚠️ Parțial | Statistici reale via API, Task Engine integrat |
| Settings | ✅ Vizual | Funcționalitate netestat complet |
| Vendors | ❌ Blocat | Blocat pe Voxel |

---

## 3. MODIFICĂRI LOCALE ACTIVE (NECOMISE)

**ATENȚIE: Aceste fișiere sunt modificate local și NU trebuie pe main/develop fără atenție.**

### 3.1 Dev bypass auth (4 fișiere — DE ÎNLOCUIT în Faza 1)

Scopul: permit testarea locală fără WordPress.
Activare: `NEXT_PUBLIC_DEBUG_AUTH=true` în `.env.local`

| Fișier | Modificare |
|--------|-----------|
| `app/lib/auth/fetch-wordpress-bootstrap.ts` | Returnează mock dacă `NEXT_PUBLIC_DEBUG_AUTH=true` |
| `app/lib/auth/session/session-bridge.ts` | Returnează mock session dacă `debugAuthEnabled` |
| `lib/server-context/get-server-app-context.ts` | Returnează context mock dacă `debugAuthEnabled` |
| `app/guest-list/page.tsx` | Token guard relaxat (nu cere token pentru fetch) |

**Plan:** Toate 4 înlocuite de `lib/auth/dev-session.ts` în Faza 1 din SPEC V5.4.

### 3.2 `.env.local` — variabile adăugate pentru dev

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

- `allocate_seating_numeric_ids_batch` — **există** + migration `20260409000001` adăugată
- `sync_seating_editor_state` — **există** + migration `20260409000002` adăugată

### `seating_id_maps`

Populat corect server-side prin `GET /api/weddings/[id]/seating/load` cu `service_role`.
Nu mai depinde de anon key din browser.

### Cheie Supabase DEV

Cheia anterioară a fost **revocată**.
Noua cheie e în `.env.local` local.

---

## 5. TESTE

- **706/706 verzi** pe develop
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

---

## 7. PROBLEME CUNOSCUTE

### Critice (blochează launch)
1. ~~`sync_seating_editor_state` RPC lipsă~~ → **REZOLVAT** (migration + fix)
2. ~~`allocate_seating_numeric_ids_batch` RPC cu bug-uri~~ → **migration adăugată**
3. ~~RPC-urile nu sunt în migrații~~ → **REZOLVAT** (20260409000001 + 20260409000002)
4. Magic Fill netestat cu date reale
5. ~~Export JSON/PDF broken~~ → **REZOLVAT**
6. Budget UI lipsă (404)
7. Dev bypass nestructurat în 4 fișiere

### Importante
8. Dashboard nu respectă mockup-ul de referință
9. Task Engine neintegrat cu date reale
10. Sidebar cu module fantomă (Checklist, Timeline, Wishlist, Moodboard, Notițe)
11. Zoom bug la ZOOM_MIN neconfirmat prin testare reală
12. `app/guest-list/page.tsx` token guard relaxat local

### Pre-launch
13. `wpBridgeEnabled: true` la launch
14. Migrații aplicate pe PROD
15. `RESEND_API_KEY` în Vercel
16. `SHADOW_SESSION_SECRET` în Vercel
17. DNS `app.weddinglist.ro`
18. ToS + Privacy Policy în română
19. RLS reactivat pe DEV după testare
20. Postgres Cron configurat pentru cleanup audit logs

---

## 8. URMĂTORUL TASK

**Faza 7 — Conflict system + client state machine** sau **Faza 1 — Auth cleanup**.

---

## 9. FAZELE DE IMPLEMENTARE (SPEC V5.4)

| Fază | Task | Status |
|------|------|--------|
| 0 | `/dev` route | ⏳ |
| 1 | Auth cleanup (`lib/auth/dev-session.ts`) | ⏳ |
| 2 | Shadow session | ⏳ |
| 3 | Idempotency table | ✅ DONE |
| 4 | Read-only mode | ✅ DONE |
| 5 | RPC `allocate_seating_numeric_ids_batch` | ✅ DONE (migration + fix) |
| 6 | RPC `sync_seating_editor_state` | ✅ DONE (migration + fix) |
| 7 | Conflict system + client state machine | ⏳ |
| 8 | Silent refetch | ⏳ |
| 9 | Audit system tiered | ⏳ |
| 10 | Data access layer | ⏳ |
| 11 | Security hardening | ⏳ |
| 12 | Product completion | ⏳ |
