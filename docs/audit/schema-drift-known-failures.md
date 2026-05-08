# Schema Drift Known Failures Registry

> **Created:** 2026-05-08
> **Source commit:** e575780 (PR 1A.4 — Database generic + ts-expect-error markers)
> **Total markers cataloged:** 56 (RECONCILED EMPIRICAL)
> **Status:** PR 1A.4 catalog phase. Markers consumed at fix time per PR target distribution.
> **Convention:** marker text = `// @ts-expect-error: <CAT> - <descriere> - fix in PR <X>` (single-line, ASCII pur).

## Table of Contents

- [A. Schema drift cataloged (C-series + NEW retained)](#a-schema-drift-cataloged)
- [B. Type narrowing layer (Cat 3)](#b-type-narrowing-layer-cat-3)
- [C. RPC + Json hardening (Cat 4 sub-cats)](#c-rpc--json-hardening-cat-4-sub-cats)
- [D. Re-categorizations (5 cases empirical)](#d-re-categorizations-5-cases-empirical)
- [E. CRITICAL findings (security + dashboard + hidden bugs)](#e-critical-findings)
- [F. Cat 5 mojibake (non-marker finding)](#f-cat-5-mojibake-non-marker-finding)
- [G. Code quality issues (any casts + DEAD CODE)](#g-code-quality-issues)
- [H. PR target distribution (final reconciled)](#h-pr-target-distribution-final-reconciled)

---

## A. Schema drift cataloged

11 distinct findings, 39 markers cumulativ (32 C-series + 7 NEW retained).

### Sumar tabel

| Finding | Markers | Files | PR target |
|---------|---------|-------|-----------|
| C4 | 2 | dashboard/stats/route.ts + selectors/dashboard-selectors.ts | PR 3 |
| C5 | 2 | json-import.ts (location_name + tables.type) | PR 9 |
| C7 | 1 | json-import.ts (rsvp_invitations) | PR 9 |
| C8 | 1 | rsvp/manual/route.ts | PR 3 |
| C11 | 4 | account/route.ts cascade | PR 4 |
| C12 | 22 | rsvp/[public_link_id]/route.ts (3 ROOT + 19 cascade) | PR 3 |
| NEW-5 | 1 | migrate-local/route.ts | PR 9 |
| NEW-7 | 1 | json-import.ts (seats.event_id) | PR 9 |
| NEW-8 | 1 | json-import.ts (seat_assignments.event_id) | PR 9 |
| NEW-9 | 1 | json-import.ts (rsvp_responses.id) | PR 9 |
| NEW-10 | 3 | selectors/dashboard-selectors.ts cascade | PR 11 |
| **TOTAL A** | **39** | | |

---

### C4 — seat_assignments.guest_id column missing

**Markers:** 2

**Files:**
- `app/api/dashboard/stats/route.ts:81` (post-marker placement line)
- `lib/selectors/dashboard-selectors.ts:88`

**Schema empirical (types/database.ts):**
- `seat_assignments.Row` has: `assigned_at`, `created_at`, `event_id`, `guest_event_id`, `id`, `seat_id`, `updated_at`, `wedding_id`
- **NO `guest_id` column.** Real field name: `guest_event_id`.

**Error TS reported:**
```
Property 'guest_id' does not exist on type 'SelectQueryError<"column 'guest_id' does not exist on 'seat_assignments'.">'.
```

**Marker text (both files):**
```
// @ts-expect-error: C4 - seat_assignments.guest_id column missing (real: guest_event_id) - fix in PR 3
```

**Fix in:** PR 3 (RSVP Minimal Functional Reconstruction). Refactor:
- SELECT `guest_event_id` instead of `guest_id`
- Adjust dedup logic: guest_event_id != guest_id; JOIN guest_events for distinct guest count.

---

### C5 — Schema drift în Import JSON (2 separate columns)

**Markers:** 2

**Files:**
- `lib/import/json-import.ts:104` (Insert pe `weddings` — location_name fantom)
- `lib/import/json-import.ts:209` (Insert pe `tables` — type vs table_type)

**Schema empirical:**
- `weddings.Insert` NU are `location_name` field
- `tables.Insert` real field name: `table_type` (NU `type`)

**Error TS reported:**
- weddings: `Object literal may only specify known properties, and 'location_name' does not exist in type ...`
- tables: `Object literal may only specify known properties, and 'type' does not exist in type ...`

**Marker text:**
```
// L104:
// @ts-expect-error: C5 - weddings.location_name column missing in schema - fix in PR 9
// L209:
// @ts-expect-error: C5 - tables.type column missing in schema (real: table_type) - fix in PR 9
```

**Fix in:** PR 9 (Import JSON v2.0). Refactor:
- Eliminate `location_name` from weddings Insert (sau migration ADD COLUMN dacă feature need)
- Rename `type` → `table_type` în Insert tables.

---

### C7 — rsvp_invitations.event_id and public_link_id NOT NULL missing in Insert

**Markers:** 1

**Files:**
- `lib/import/json-import.ts:302`

**Schema empirical:**
- `rsvp_invitations.Insert` REQUIRE: `event_id: string`, `public_link_id: string`, `token_hash: string`, `wedding_id: string` (toate NOT NULL).
- Cod-ul Insert pasează: `id`, `wedding_id`, `guest_id`, `token_hash`, `delivery_channel`, `delivery_status`, `opened_at`, `last_sent_at`, `is_active`, `created_at`, `updated_at`.
- **MISSING `event_id` + `public_link_id`** (ambele NOT NULL).

**Error TS reported:**
```
'event_id' is missing in type '{ ... }' but required in type ...
```

**Marker text:**
```
// @ts-expect-error: C7 - rsvp_invitations.event_id and public_link_id NOT NULL missing in Insert - fix in PR 9
```

**Fix in:** PR 9. Refactor: add `event_id` + `public_link_id` to Insert object (public_link_id strategy per audit §10.3).

---

### C8 — rsvp_responses.invitation_id NOT NULL but code passes null

**Markers:** 1

**Files:**
- `app/api/rsvp/manual/route.ts:67`

**Schema empirical:**
- `rsvp_responses.Insert.invitation_id: string` (NOT NULL).
- Cod-ul (manual override pattern) pasează `invitation_id: null` deliberat.

**Error TS reported:**
```
Type 'null' is not assignable to type 'string'.
```

**Marker text:**
```
// @ts-expect-error: C8 - rsvp_responses.invitation_id NOT NULL but code passes null (manual override pattern) - fix in PR 3
```

**Fix in:** PR 3. Decision per audit §10.3: shadow invitation pattern (insert invitation cu `delivery_channel='couple_manual'`, `is_active=false`, apoi rsvp_response cu invitation_id = shadow id).

---

### C11 — app_users.status column missing (cascade status + email)

**Markers:** 4 (toate cascade)

**Files:**
- `app/api/account/route.ts:40` (status check 1)
- `app/api/account/route.ts:44` (status check 2)
- `app/api/account/route.ts:137` (email check)
- `app/api/account/route.ts:139` (email use)

**Schema empirical (types/database.ts):**
- `app_users.Row` has: `active_wedding_id`, `created_at`, `email`, `id`, `updated_at`
- **NO `status` column.**

**SELECT line root cause:** `.select("id, status, email")` — status field în SELECT string declanșează SelectQueryError, cascade pe property access.

**Error TS reported (cascade pattern):**
```
Property 'status' does not exist on type 'SelectQueryError<...>'.
Property 'email' does not exist on type 'SelectQueryError<...>'.
```

**Marker text (toate 4):**
```
// @ts-expect-error: C11 cascade - SelectQueryError from status SELECT (app_users) - fix in PR 4
```

**Fix in:** PR 4 (Account Deletion Atomic). Decision: migration ADD COLUMN status text DEFAULT 'active', OR refactor flow să folosească alt state mechanism.

---

### C12 — rsvp_invitations.expires_at column missing (SECURITY HIGH)

**Markers:** 22 (3 ROOT + 19 CASCADE)
**Severity:** HIGH security (token expiration mechanism broken)

**Files:**
- `app/api/rsvp/[public_link_id]/route.ts` (RSVP public route GET + POST handlers)

**Schema empirical (types/database.ts:628):**
- `rsvp_invitations.Row` has: `created_at`, `delivery_channel`, `delivery_status`, `event_id`, `guest_id`, `id`, `is_active`, `last_sent_at`, `max_guests`, `opened_at`, `public_link_id`, `responded_at`, `sent_at`, `status`, `token_hash`, `updated_at`, `wedding_id`
- **NO `expires_at` column.**

**Cod usage:** SELECT explicit cu `expires_at` listed (GET L60-64 + POST L200-201) → SelectQueryError. Plus property access direct la L77, L142, L215 în `validateTokenState({ expires_at: invitation.expires_at })`.

**Runtime implication (one of two):**
- RSVP links never expire (security: leaked token valid forever)
- RSVP feature broken at query failure

**Marker text:**
```
ROOT (3 markers):
// @ts-expect-error: C12 - expires_at column missing on rsvp_invitations - fix in PR 3

CASCADE (19 markers):
// @ts-expect-error: C12 cascade - SelectQueryError from expires_at SELECT (rsvp_invitations) - fix in PR 3
```

**Plus 1 secondary marker (Cat3-narrow at L271):** vezi Section B.

**Fix in:** PR 3 (RSVP Minimal). Decision per audit §10.6.A:
- Option A: ALTER TABLE rsvp_invitations ADD COLUMN expires_at timestamptz
- Option B: remove expires_at usage (alternative token expiration mechanism)

**ESCALATION recomandată:** PR 3 priority HIGH (synthesis Onesty #4).

---

### NEW-5 — tables INSERT missing event_id NOT NULL + field mismatches

**Markers:** 1

**Files:**
- `app/api/migrate-local/route.ts:197`

**Schema empirical:**
- `tables.Insert` REQUIRE: `event_id`, `name`, `seat_count`, `table_type`, `wedding_id`, `x`, `y` (toate NOT NULL).
- Cod-ul upsert pasează: `id`, `wedding_id`, `name`, `x`, `y`, `seat_count`, `rotation`, `table_type`.
- **MISSING `event_id`** (NOT NULL).

**Error TS reported:**
```
Property 'event_id' is missing in type ... but required in type ...
```

**Marker text:**
```
// @ts-expect-error: NEW-5 - tables INSERT missing event_id NOT NULL + field mismatches - fix in PR 9
```

**Fix in:** PR 9. Refactor: add `event_id` (default event for wedding migration).

---

### NEW-7 — seats.event_id NOT NULL missing in Insert

**Markers:** 1

**Files:**
- `lib/import/json-import.ts:231`

**Schema empirical:**
- `seats.Insert.event_id: string` (NOT NULL).
- Cod-ul Insert pasează: `id`, `wedding_id`, `table_id`, `seat_index`, `created_at`. **MISSING `event_id`.**

**Error TS reported:**
```
Property 'event_id' is missing in type ... but required in type ...
```

**Marker text:**
```
// @ts-expect-error: NEW-7 - seats.event_id NOT NULL missing in Insert - fix in PR 9
```

**Fix in:** PR 9. Refactor: carry `event_id` from parent table reference.

---

### NEW-8 — seat_assignments.event_id NOT NULL missing in Insert

**Markers:** 1

**Files:**
- `lib/import/json-import.ts:247`

**Schema empirical:**
- `seat_assignments.Insert.event_id: string` (NOT NULL).
- Cod-ul Insert pasează: `id`, `wedding_id`, `seat_id`, `guest_event_id`, `created_at`. **MISSING `event_id`.**

**Error TS reported:**
```
Property 'event_id' is missing in type ... but required in type ...
```

**Marker text:**
```
// @ts-expect-error: NEW-8 - seat_assignments.event_id NOT NULL missing in Insert - fix in PR 9
```

**Fix in:** PR 9. Refactor: derive `event_id` from `guest_event` reference (JOIN guest_events).

---

### NEW-9 — rsvp_responses.id field in Insert (legacy remap pattern)

**Markers:** 1

**Files:**
- `lib/import/json-import.ts:327`

**Schema empirical:**
- `rsvp_responses.Insert.id?` is OPTIONAL (auto-generated by DB).
- Cod-ul Insert pasează `id: newRrId` explicit pentru import remap.

**Error TS reported:**
```
Object literal may only specify known properties, and 'id' does not exist in type ...
```

**Note:** `id?` IS în Insert type ca optional. Eroarea apare datorită Overload 2 (array) inferred type matching strictness.

**Marker text:**
```
// @ts-expect-error: NEW-9 - rsvp_responses.id field in Insert (legacy remap pattern) - fix in PR 9
```

**Fix in:** PR 9. Refactor: capture original_id → new_id post-Insert (via `.select()` returning), NU pre-Insert id presetting.

---

### NEW-10 — payments.due_date column missing (dashboard UX broken silent)

**Markers:** 3 (cascade)
**Severity:** MEDIUM (dashboard UX broken silent, NOT runtime crash)

**Files:**
- `lib/selectors/dashboard-selectors.ts` (cascade pe 3 linii post-shift):
  - L97 `(sum, p) => sum + (p.amount ?? 0)` — cascade din SELECT due_date
  - L104 `if (!p.due_date) return false`
  - L105 `const due = new Date(p.due_date)`

**Schema empirical (types/database.ts:570):**
- `payments.Row` has: `amount`, `budget_item_id`, `created_at`, `currency`, `id`, `note`, `paid_at`, `payment_method`, `wedding_id`
- **NO `due_date` column.**

**SELECT line root cause:** `.select("amount, due_date")` — due_date field declanșează SelectQueryError.

**Runtime implication:** Supabase returnează SelectQueryError → `paymentsResult.data = empty array` → `paymentDueSoonCount = 0` always (false negative dashboard tile "Plăți scadente").

**Marker text (3 cascade):**
```
// @ts-expect-error: NEW-10 cascade - SelectQueryError from due_date SELECT (payments) - fix in PR 11
```

**Fix in:** PR 11 (Polish). Decision: ALTER TABLE ADD due_date, OR remove paymentDueSoonCount feature, OR derive from budget_items JOIN (ambiguity: budget_item.due_date vs payment.due_date).

---

## B. Type narrowing layer (Cat 3)

10 markers cumulativ în 2 sub-cats: **Cat3-narrow** (2) + **Cat3-enum** (8).

Pattern empirical: TypeScript type narrowing fails când custom types (nullable, enum subset, projection) NU match schema strict. Fix structural prin helper `narrowEnum<T>(value, allowed)` (PR 1.5) sau null-check explicit (per-feature PR).

### Sumar tabel

| Sub-cat | Markers | Files | PR target |
|---------|---------|-------|-----------|
| Cat3-narrow event_id null upsert | 1 | rsvp/[public_link_id]/route.ts:271 | PR 3 |
| Cat3-narrow attendance_status null | 1 | guest-events/route.ts:120 | PR 3 |
| Cat3-enum BudgetItemStatus (insert) | 2 | budget/items/route.ts | PR 1.5 |
| Cat3-enum BudgetItemStatus (update) | 2 | budget/items/[itemId]/route.ts | PR 1.5 |
| Cat3-enum BudgetItemForSummary | 1 | budget/summary/route.ts | PR 1.5 |
| Cat3-enum delivery_channel insert | 1 | rsvp/invitations/route.ts | PR 3 |
| Cat3-enum delivery_channel update | 1 | rsvp/invitations/[id]/mark-sent/route.ts | PR 3 |
| Cat3-enum InvitationProjection subset | 1 | rsvp/dashboard/route.ts | PR 3 |
| **TOTAL B** | **10** | | |

---

### Cat3-narrow — event_id (string | null) needs null-check before upsert

**Markers:** 1

**Files:**
- `app/api/rsvp/[public_link_id]/route.ts:271` (POST handler upsert rsvp_responses)

**Schema empirical:**
- `rsvp_responses.Insert.event_id: string` (NOT NULL).
- Cod-ul construct upsertData L255-266: `event_id: validEventMap.get(r.guest_event_id) ?? null` — Map.get poate returna `undefined`, fallback `null`.

**Error TS reported:**
```
Type 'string | null' is not assignable to type 'string'.
```

**Marker text:**
```
// @ts-expect-error: Cat3-narrow - event_id (string | null) needs null-check before upsert - fix in PR 3
```

**Fix in:** PR 3 (RSVP Minimal). Refactor: filter out responses cu event_id null ÎNAINTE de upsert (sau throw explicit dacă map mismatch).

---

### Cat3-narrow — attendance_status (AttendanceStatus | null) vs schema string

**Markers:** 1

**Files:**
- `app/api/guest-events/route.ts:120`

**Schema empirical:**
- `guest_events.Insert.attendance_status?: string` (optional, NU `null`).
- Cod-ul Insert pasează `attendance_status: input.attendance_status` (tipat `AttendanceStatus | null`).
- `null` NU e assignable la `string | undefined`.

**Error TS reported:**
```
Type 'AttendanceStatus | null' is not assignable to type 'string | undefined'.
Type 'null' is not assignable to type 'string | undefined'.
```

**Marker text:**
```
// @ts-expect-error: Cat3-narrow - attendance_status (AttendanceStatus | null) vs schema string (null not assignable) - fix in PR 3
```

**Fix in:** PR 3. Refactor: null check + default value, sau migration to nullable schema.

---

### Cat3-enum — BudgetItemStatus enum narrow (insert + update)

**Markers:** 4 (2 insert + 2 update)

**Files:**
- `app/api/weddings/[weddingId]/budget/items/route.ts` (POST + GET return cu BudgetItemStatus narrow)
- `app/api/weddings/[weddingId]/budget/items/[itemId]/route.ts` (GET + PATCH return cu BudgetItemStatus narrow)

**Schema empirical:**
- `budget_items.status: string` (DB returnează general string).
- Cod-ul folosește `BudgetItemStatus` enum literal (subset stricter): `"pending" | "confirmed" | "paid" | "cancelled"` (sau similar definition în types/budget.ts).

**Error TS reported:**
```
Types of property 'status' are incompatible.
Type 'string' is not assignable to type 'BudgetItemStatus'.
```

**Marker text (toate 4):**
```
// @ts-expect-error: Cat3-enum - string vs BudgetItemStatus enum narrow - fix in PR 1.5 (Enum Type Narrowing Layer)
```

**Fix in:** PR 1.5 (Enum Type Narrowing Layer NEW). Refactor: helper `narrowEnum<T>(value: string, allowed: readonly T[]): T` cu runtime validation. Aplicabil cross-feature pe orice DB enum return.

---

### Cat3-enum — BudgetItemForSummary status narrow

**Markers:** 1

**Files:**
- `app/api/weddings/[weddingId]/budget/summary/route.ts` (calculateBudgetSummary call)

**Schema empirical:**
- `budget_items.status: string` (DB).
- `BudgetItemForSummary` (custom type) extends similar pattern cu `BudgetItemStatus` enum narrow.

**Error TS reported:**
```
Type 'string' is not assignable to type 'BudgetItemStatus'.
```

**Marker text:**
```
// @ts-expect-error: Cat3-enum - BudgetItemForSummary status narrow - fix in PR 1.5 (Enum Type Narrowing Layer)
```

**Fix in:** PR 1.5. Same pattern cu BudgetItemStatus (helper narrowEnum).

---

### Cat3-enum — delivery_channel narrow (insert)

**Markers:** 1

**Files:**
- `app/api/rsvp/invitations/route.ts` (POST insert rsvp_invitations)

**Schema empirical:**
- `rsvp_invitations.Insert.delivery_channel?: rsvp_delivery_channel | null` enum literal (`"email" | "whatsapp" | "sms" | "facebook" | "qr" | "link" | "manual"`).
- Cod-ul Insert pasează `delivery_channel: deliveryChannel ?? null` cu `deliveryChannel: string | null` (input untyped).

**Error TS reported:**
```
Type 'string | null' is not assignable to type '"email" | "whatsapp" | "sms" | "facebook" | "qr" | "link" | "manual" | null | undefined'.
Type 'string' is not assignable to type ...
```

**Marker text:**
```
// @ts-expect-error: Cat3-enum - delivery_channel (string | null) vs rsvp_delivery_channel enum narrow - fix in PR 3
```

**Plus L46 hidden bugs disclosure:** acest insert object are 3 simultaneous bugs (vezi Section E + Section D). Marker consume DOAR primul reportat (delivery_channel narrow).

**Fix in:** PR 3 (RSVP Minimal). Refactor: validateDeliveryChannel + narrowEnum helper, OR insert with null fallback if invalid.

---

### Cat3-enum — delivery_channel narrow (update)

**Markers:** 1

**Files:**
- `app/api/rsvp/invitations/[id]/mark-sent/route.ts` (POST update mark-sent)

**Schema empirical:**
- Same enum `rsvp_delivery_channel` strict.
- Cod-ul Update pasează `delivery_channel: deliveryChannel ?? null` similar cu insert.

**Error TS reported:**
```
Type 'string | null' is not assignable to type '"email" | "whatsapp" | ... | null | undefined'.
```

**Marker text:**
```
// @ts-expect-error: Cat3-enum - delivery_channel (string | null) vs rsvp_delivery_channel enum narrow on update - fix in PR 3
```

**Fix in:** PR 3. Same pattern cu insert version.

---

### Cat3-enum — InvitationProjection.delivery_status enum subset

**Markers:** 1

**Files:**
- `app/api/rsvp/dashboard/route.ts` (Map construction din invitations array)

**Schema empirical:**
- `rsvp_delivery_status` enum schema include 5 values: `"draft" | "ready" | "sent" | "failed" | "revoked"`.
- `InvitationProjection.delivery_status` (custom type) include DOAR 4 values (missing `"revoked"`).
- Schema returnează 5-value union; `InvitationProjection` cere 4-value subset → narrow fail.

**Error TS reported:**
```
Type '"draft" | "ready" | "sent" | "failed" | "revoked"' is not assignable to type 'RsvpDeliveryStatus'.
Type '"revoked"' is not assignable to type 'RsvpDeliveryStatus'.
```

**Marker text:**
```
// @ts-expect-error: Cat3-enum - InvitationProjection.delivery_status enum subset (missing "revoked" from rsvp_delivery_status) - fix in PR 3
```

**Fix in:** PR 3. Decision:
- Option A: extend `InvitationProjection.delivery_status` cu `"revoked"` (full schema match)
- Option B: filter out invitations cu status="revoked" ÎNAINTE de Map construction
- Option C: remove "revoked" din schema dacă deprecated (migration)

---

## C. RPC + Json hardening (Cat 4 sub-cats)

7 markers cumulativ în 5 sub-cats: **Cat4-rpc-json** (2) + **Cat4-rpc-cast** (2) + **Cat4-rpc-name** (1) + **Cat4-json-meta** (1) + **Cat4-json-response** (1).

Pattern empirical: TypeScript type compatibility fails între custom types (RPC params, return types, metadata, response cast) și `Database` strict union (RPC names, Json type, etc.). Fix unificat în PR 1.6 (RPC + Json Hardening NEW): index signatures + RPC name strict typing + Json union compliance.

### Sumar tabel

| Sub-cat | Markers | Files | PR target |
|---------|---------|-------|-----------|
| Cat4-rpc-json | 2 | seating/sync/route.ts (2 RPC calls) | PR 1.6 |
| Cat4-rpc-cast | 2 | seating/sync/route.ts (2 RPC return casts) | PR 1.6 |
| Cat4-rpc-name | 1 | supabase/db.ts:102 | PR 1.6 |
| Cat4-json-meta | 1 | audit/wl-audit.ts:69 (was misnamed NEW-1) | PR 1.6 |
| Cat4-json-response | 1 | supabase/idempotency.ts:84 (was misnamed NEW-2) | PR 1.6 |
| **TOTAL C** | **7** | | |

---

### Cat4-rpc-json — SeatingAssignmentSyncItem[] missing index signature for Json

**Markers:** 2 (2 RPC calls)

**Files:**
- `app/api/weddings/[weddingId]/seating/sync/route.ts` — primary handler RPC call
- `app/api/weddings/[weddingId]/seating/sync/route.ts` — fallback handler RPC call (`else` branch backward compat)

**Schema empirical (types/database.ts):**
- RPC `sync_seating_editor_state.Args.p_assignments: Json` (strict union: `string | number | boolean | null | { [key: string]: Json } | Json[]`).
- Cod-ul pasează `rpcParams` cu `p_assignments: SeatingAssignmentSyncItem[]` (custom type fără index signature).

**Error TS reported:**
```
Type 'SeatingAssignmentSyncItem[]' is not assignable to type 'Json'.
Type 'SeatingAssignmentSyncItem' is not assignable to type '{ [key: string]: Json | undefined; }'.
Index signature for type 'string' is missing in type 'SeatingAssignmentSyncItem'.
```

**Marker text (toate 2):**
```
// @ts-expect-error: Cat4-rpc-json - SeatingAssignmentSyncItem[] missing index signature for Json - fix in PR 1.6
```

**Fix in:** PR 1.6 (RPC + Json Hardening NEW). Refactor:
- Extend `SeatingAssignmentSyncItem` cu `[key: string]: Json` index signature, OR
- Cast explicit `as Json` la RPC call site, OR
- Refactor RPC schema să accepte typed input (decizie per audit pre-launch).

---

### Cat4-rpc-cast — RPC return type cast to SeatingFullSyncResponse

**Markers:** 2 (2 RPC calls)

**Files:**
- `app/api/weddings/[weddingId]/seating/sync/route.ts` — primary handler return
- `app/api/weddings/[weddingId]/seating/sync/route.ts` — fallback handler return (`else` branch)

**Schema empirical:**
- RPC `sync_seating_editor_state.Returns: Json` (strict union).
- Cod-ul cast `return d as SeatingFullSyncResponse` (custom return type cu fields specifice).
- TS detect overlap insufficient → conversion mistake warning.

**Error TS reported:**
```
Conversion of type 'string | number | boolean | { ... } | Json[] | null' to type 'SeatingFullSyncResponse' may be a mistake because neither type sufficiently overlaps with the other.
Type 'Json[]' is missing the following properties from type 'SeatingFullSyncResponse': success, version, synced, bridge_updates, errors
```

**Marker text (toate 2):**
```
// @ts-expect-error: Cat4-rpc-cast - RPC return type cast to SeatingFullSyncResponse - fix in PR 1.6
```

**Fix in:** PR 1.6. Refactor:
- Cast prin `unknown` intermediate: `return d as unknown as SeatingFullSyncResponse`
- OR validate runtime + return typed (preferred): `if (!isSeatingFullSyncResponse(d)) throw...; return d`
- OR refactor RPC schema să returneze typed JSON (decision per audit RPC unification).

---

### Cat4-rpc-name — RPC name string vs Database union strict

**Markers:** 1

**Files:**
- `lib/supabase/db.ts:102` (generic `rpc<T>()` wrapper)

**Schema empirical:**
- `Database['public']['Functions']` keys (RPC names): `"allocate_seating_numeric_ids_batch" | "auth_user_id" | "is_wedding_member" | "is_wedding_owner" | "soft_delete_wedding" | "sync_seating_editor_state"` (strict literal union).
- Cod-ul `name: string` (parameter generic), pasat la `.rpc(name, payload)` care așteaptă union literal.

**Error TS reported:**
```
Argument of type 'string' is not assignable to parameter of type
'"allocate_seating_numeric_ids_batch" | "auth_user_id" | "is_wedding_member" | "is_wedding_owner" | "soft_delete_wedding" | "sync_seating_editor_state"'.
```

**Marker text:**
```
// @ts-expect-error: Cat4-rpc-name - RPC name string vs Database union strict - fix in PR 1.6
```

**Fix in:** PR 1.6. Refactor: parameter `name: keyof Database['public']['Functions']` (strict typed). Wrapper devine `rpc<T extends keyof Database['public']['Functions']>(name: T, payload: ...)`.

---

### Cat4-json-meta — AuditMetadata missing index signature for Json

**Markers:** 1

**Files:**
- `lib/audit/wl-audit.ts:69` (Insert pe `audit_logs`)

**Schema empirical:**
- `audit_logs.Insert.metadata?: Json` (strict union).
- `audit_logs.Insert.request_id?: string | null` ✓ EXISTS (NU schema drift — was misnamed NEW-1 în audit anticipated).
- Cod-ul Insert pasează `metadata: AuditMetadata` (custom type fără index signature).

**Error TS reported:**
```
Type 'AuditMetadata' is not assignable to type 'Json | undefined'.
Type 'AuditMetadata' is not assignable to type '{ [key: string]: Json | undefined; }'.
Index signature for type 'string' is missing in type 'AuditMetadata'.
```

**Marker text:**
```
// @ts-expect-error: Cat4-json-meta - AuditMetadata missing index signature for Json - fix in PR 1.6
```

**Fix in:** PR 1.6. Refactor:
- Extend `AuditMetadata` cu `[key: string]: Json` index signature, OR
- Cast `metadata: auditMetadata as Json` la Insert call site.

> **Note re-categorization:** acest finding era misnamed `NEW-1` în audit anticipated. Empirical verification (schema audit_logs L84) confirmed `request_id: string | null` EXISTS. Real bug = type compatibility, NU schema drift. Re-categorized to **Cat4-json-meta** post-empirical investigation. Vezi Section D Re-categorization 1.

---

### Cat4-json-response — Record<string, unknown> not assignable to Json

**Markers:** 1

**Files:**
- `lib/supabase/idempotency.ts:84` (Insert pe `idempotency_keys`)

**Schema empirical:**
- `idempotency_keys.Insert.response: Json` (strict union).
- `idempotency_keys.Insert.request_hash: string` ✓ EXISTS (NU schema drift — was misnamed NEW-2 în audit anticipated).
- Cod-ul L90 cast `response: result as Record<string, unknown>` — `unknown` violates Json union strictness.

**Error TS reported:**
```
Type 'Record<string, unknown>' is not assignable to type 'Json'.
Type 'Record<string, unknown>' is missing the following properties from type 'Json[]': length, pop, push, concat, and 35 more.
```

**Marker text:**
```
// @ts-expect-error: Cat4-json-response - Record<string, unknown> not assignable to Json (missing index signature) - fix in PR 1.6
```

**Fix in:** PR 1.6. Refactor:
- Type guard `isJson(result)` runtime check ÎNAINTE de cast.
- OR cast intermediate: `response: result as unknown as Json`.
- OR refactor `result` type să fie `Json` din construct.

> **Note re-categorization:** acest finding era misnamed `NEW-2` în audit anticipated. Empirical verification (schema idempotency_keys L489) confirmed `request_hash: string` EXISTS. Real bug = type compatibility, NU schema drift. Re-categorized to **Cat4-json-response** post-empirical investigation. Vezi Section D Re-categorization 2.

---

## D. Re-categorizations (5 cases empirical)

5 cases empirical — finding-uri categorized greșit în audit anticipated vs realitate empirical (schema + tsc log).

Pattern systemic identificat: audit catalog pre-launch e TENTATIVE STARTING POINT, NU CONFIRMED REALITY. Source of truth = `types/database.ts` (regenerated empirical) + `tsc` log (REAL TS error reported). Lesson learned: **L45 — Verify schema empirical ÎNAINTE de marker categorization** (vezi HANDOFF.md L45).

5/5 cases re-categorized empirical — pattern systemic, NU coincidență.

### Sumar tabel

| # | Original (audit) | Re-categorize | PR target | Reason scurt |
|---|------------------|---------------|-----------|--------------|
| 1 | NEW-1 (audit_logs.request_id missing) | Cat4-json-meta | PR 1.6 | Schema HAS request_id; real = AuditMetadata index signature |
| 2 | NEW-2 (idempotency_keys.request_hash missing) | Cat4-json-response | PR 1.6 | Schema HAS request_hash; real = Record<string,unknown> not Json |
| 3 | NEW-3 (guest_events.wedding_id missing) | Cat3-narrow | PR 3 | Schema HAS wedding_id; real = AttendanceStatus null narrow |
| 4 | NEW-4 (rsvp_responses.wedding_id missing) | C8 (naming consolidation) | PR 3 | Schema HAS wedding_id; real = invitation_id NOT NULL passes null |
| 5 | F15 (InvitationProjection Cat3-narrow) | Cat3-enum subset | PR 3 | Real = delivery_status enum subset missing "revoked" |

---

### Re-categorization 1 — NEW-1 → Cat4-json-meta

**Audit anticipated:**
- Label: NEW-1
- Categorie presupusă: schema drift
- Marker text presupus: `audit_logs.request_id column missing in schema`
- PR target presupus: PR 1B (Integration Test Harness)

**Empirical investigation:**

Schema `audit_logs.Row` (types/database.ts L76-86):
```
{
  action: string
  actor_type: string
  app_user_id: string | null
  created_at: string
  id: string
  metadata: Json
  request_id: string | null  ← EXISTS
  wedding_id: string | null
}
```

`request_id` EXISTS în schema. NU schema drift.

Real error TS reported:
```
Type 'AuditMetadata' is not assignable to type 'Json | undefined'.
Index signature for type 'string' is missing in type 'AuditMetadata'.
```

**Conclusion:**
- Real bug = `AuditMetadata` (custom type) missing index signature for `Json` compatibility.
- Re-categorized to **Cat4-json-meta**.
- PR target corect: **PR 1.6** (RPC + Json Hardening) — match scope unified type compatibility.

**Cross-reference:** vezi Section C → Cat4-json-meta entry.

**Lesson learned:** L45 — Verify schema empirical ÎNAINTE de marker categorization.

---

### Re-categorization 2 — NEW-2 → Cat4-json-response

**Audit anticipated:**
- Label: NEW-2
- Categorie presupusă: schema drift
- Marker text presupus: `idempotency_keys.request_hash column missing in schema`
- PR target presupus: PR 1B

**Empirical investigation:**

Schema `idempotency_keys.Row` (types/database.ts L483-493):
```
{
  app_user_id: string
  client_operation_id: string
  created_at: string | null
  id: string
  request_hash: string  ← EXISTS
  response: Json
  rpc_name: string
  wedding_id: string
}
```

`request_hash` EXISTS în schema. NU schema drift.

Real error TS reported:
```
Type 'Record<string, unknown>' is not assignable to type 'Json'.
Type 'Record<string, unknown>' is missing the following properties from type 'Json[]': length, pop, push, concat, and 35 more.
```

Cod offending (L90):
```
response: result as Record<string, unknown>,
```

**Conclusion:**
- Real bug = `Record<string, unknown>` cast NU e assignable la `Json` strict union (`unknown` violates).
- Re-categorized to **Cat4-json-response**.
- PR target corect: **PR 1.6**.

**Cross-reference:** vezi Section C → Cat4-json-response entry.

**Lesson learned:** L45 (same pattern Re-categorization 1).

---

### Re-categorization 3 — NEW-3 → Cat3-narrow

**Audit anticipated:**
- Label: NEW-3
- Categorie presupusă: schema drift (`guest_events.wedding_id missing from Insert type`)
- Marker text presupus: `guest_events.wedding_id missing in Insert`
- PR target presupus: PR 3

**Empirical investigation:**

Schema `guest_events.Insert` (types/database.ts L306-327):
```
{
  attendance_status?: string
  created_at?: string
  event_id: string
  guest_id: string
  id?: string
  meal_choice?: string | null
  plus_one_label?: string | null
  updated_at?: string
  wedding_id: string  ← EXISTS în Insert (NOT NULL)
}
```

Schema HAS `wedding_id` în Insert. Codul L117 `wedding_id: access.wedding_id` e VALID.

Real error TS reported:
```
Overload 1: Type 'AttendanceStatus | null' is not assignable to type 'string | undefined'.
Type 'null' is not assignable to type 'string | undefined'.
```

Cod offending (L120):
```
attendance_status: input.attendance_status,  // tipat AttendanceStatus | null
```

**Conclusion:**
- Real bug = `attendance_status` nullable narrow (`null` not assignable la schema `string | undefined`).
- Re-categorized to **Cat3-narrow**.
- PR target păstrat: **PR 3** (RSVP Minimal — natural fit pentru RSVP-related fixes).

**Cross-reference:** vezi Section B → Cat3-narrow attendance_status entry.

**Lesson learned:** L45.

---

### Re-categorization 4 — NEW-4 → C8 (naming consolidation)

**Audit anticipated:**
- Label: NEW-4 (în catalog naming)
- Categorie presupusă: schema drift (`rsvp_responses.wedding_id missing in Insert`)
- Marker text presupus: `rsvp_responses.wedding_id NOT NULL missing in Insert`
- PR target presupus: PR 3

**Empirical investigation:**

Schema `rsvp_responses.Insert` (types/database.ts L723-749):
```
{
  dietary_notes?: string | null
  event_id: string
  guest_event_id: string
  id?: string
  invitation_id: string  ← NOT NULL
  meal_choice?: ... | null
  ...
  wedding_id: string  ← EXISTS în Insert (NOT NULL)
}
```

Schema HAS `wedding_id` în Insert. Codul pasează `wedding_id: ge.wedding_id` ✓.

Real error TS reported:
```
Overload 1: Type 'null' is not assignable to type 'string'.
```

Cod offending (rsvp/manual L67):
```
invitation_id: null,  // hardcoded null pentru manual override
```

**Audit precedent verification:**
- C8 documented empirical pre-launch: "Manual RSVP invitation_id NULL — INSERT eșuează"
- Match perfect cu eroarea TS reportată (null vs string strict).

**Conclusion:**
- NEW-4 din catalog era **MISNAMED reference la C8** (already documented).
- Naming consolidation: NEW-4 → **C8** (NU re-categorize la sub-cat NEW, just rename to existing C-series finding).
- PR target păstrat: **PR 3**.

**Cross-reference:** vezi Section A → C8 entry.

**Lesson learned:** L45 + audit catalog naming hygiene (avoid duplicate references la same finding).

---

### Re-categorization 5 — F15 InvitationProjection Cat3-narrow → Cat3-enum subset

**Audit anticipated:**
- Label: F15 finding (raportat empirical durante PR 1A.4 markers placement)
- Categorie presupusă: Cat3-narrow (projection mismatch)
- Marker text presupus: `InvitationProjection mismatch (DB row vs typed projection)`
- PR target presupus: PR 3

**Empirical investigation:**

Schema enum `rsvp_delivery_status` (types/database.ts):
```
"draft" | "ready" | "sent" | "failed" | "revoked"  (5 values)
```

`InvitationProjection.delivery_status` (custom type în code):
```
"draft" | "ready" | "sent" | "failed"  (4 values — missing "revoked")
```

Real error TS reported:
```
Type '"draft" | "ready" | "sent" | "failed" | "revoked"' is not assignable to type 'RsvpDeliveryStatus'.
Type '"revoked"' is not assignable to type 'RsvpDeliveryStatus'.
```

**Conclusion:**
- Real bug = enum SUBSET mismatch (custom type narrower than schema enum).
- NU "projection mismatch generic" — specifically enum subset.
- Re-categorized to **Cat3-enum subset**.
- PR target păstrat: **PR 3** (RSVP feature scope).

**Cross-reference:** vezi Section B → Cat3-enum InvitationProjection subset entry.

**Lesson learned:** L45 (5/5 cases empirical confirmation pattern systemic).

---

## E. CRITICAL findings (security + dashboard + hidden bugs)

3 critical findings care necesită reviewer attention focused — subset emphasis pentru priority routing. Detail complet în Section A (schema drift) + Section B (type narrowing). Aici DOAR summary + escalation context.

---

### E.1 — C12 SECURITY HIGH (rsvp_invitations.expires_at column missing)

**Severity:** **HIGH security** (token expiration mechanism broken).
**Markers:** 22 (3 ROOT + 19 CASCADE).
**File:** `app/api/rsvp/[public_link_id]/route.ts` (RSVP public route GET + POST handlers).

**Runtime impact (one of two):**
- **RSVP links never expire** — security risk: leaked RSVP tokens valid forever, anyone cu token can RSVP indefinitely.
- **RSVP feature broken at query failure** — Supabase returnează SelectQueryError, întreg flow RSVP public fail silent.

Empirical confirmation: schema `rsvp_invitations` (types/database.ts:628) NU are `expires_at` column; codul folosește SELECT explicit + property access direct.

**Cross-reference:** vezi Section A → C12 entry (detail complet schema + cod usage + marker text).

**Escalation context:**
- Recommendation: **PR 3 priority HIGH** (sau PR 1.7 dedicat per Onesty #4 synthesis).
- Decision deschisă cu user: păstrare PR 3 ordine (post-PR 1.6) sau bump priority la PR 1.7 imediat după PR 1A-D.
- Fix decision per audit pre-launch §10.6.A: ALTER TABLE ADD COLUMN OR remove expires_at usage.

---

### E.2 — NEW-10 MEDIUM (payments.due_date column missing — dashboard silent broken)

**Severity:** **MEDIUM** (dashboard UX broken silent, NU runtime crash).
**Markers:** 3 (cascade din SELECT due_date).
**File:** `lib/selectors/dashboard-selectors.ts` (cascade pe L97 + L104 + L105).

**Runtime impact:**
- Schema `payments` (types/database.ts:570) NU are `due_date` column.
- Cod-ul SELECT explicit cu `due_date` field → SelectQueryError → `paymentsResult.data = empty array`.
- Calculation `paymentDueSoonCount = 0` ALWAYS — false negative.
- **Dashboard tile "Plăți scadente în <3 zile"** mereu afișează 0, indiferent de date reale.
- **NO runtime crash, NO error visible** — UX broken silent (most insidious type of bug).

**Cross-reference:** vezi Section A → NEW-10 entry (detail complet schema + cod offending + decision options).

**Escalation context:**
- PR target: **PR 11 (Polish)** — task engine refinement / dashboard UX consistency.
- Reviewer attention recommended pentru PR 11: prioritize dashboard UX fixes (low severity individual, dar UX impact cumulative cu alte issues).
- Decision options: ALTER TABLE ADD due_date / remove feature / derive from budget_items JOIN (ambiguity).

---

### E.3 — L46 hidden bugs F13 (3 simultaneous bugs in single Insert)

**Severity:** **MEDIUM** (1 reported + 2 hidden = potential Round 2 surface post-fix).
**Markers:** 1 visible (Cat3-enum delivery_channel — Section B).
**Hidden:** C12 expires_at + C7 event_id NOT NULL (NU markerized — masked by TS overload selection).
**File:** `app/api/rsvp/invitations/route.ts` (POST insert rsvp_invitations).

**Pattern lesson empirical:** L46 — Hidden bugs masked by TS overload selection. TypeScript reports DOAR primul error în Insert/Update validation chain; restul rămân hidden la compile-time.

**3 simultaneous bugs identified empirical:**
1. **Cat3-enum delivery_channel narrow** REPORTED — `string | null` vs `rsvp_delivery_channel` enum literal (markered, vezi Section B).
2. **C12 expires_at column missing HIDDEN** — Insert object include `expires_at: expiresAt.toISOString()` field, schema NU are coloană (same root cause cu RSVP route C12).
3. **C7 event_id NOT NULL HIDDEN** — Insert object NU include `event_id` field (schema requires NOT NULL).

**Runtime impact (post-fix Round 1):**
Dacă reviewer fix DOAR Cat3-enum delivery_channel → C12 + C7 vor surface ca errors NEW post-fix. Necessar Round 2 fix.

**Cross-reference:** vezi Section B → Cat3-enum delivery_channel insert entry (cu disclosure inline).

**Escalation context:**
- PR target: **PR 3** (RSVP Minimal — toate 3 bugs scope unified).
- Reviewer note explicit pentru PR 3: post-fix Round 1, **MUST run `npx tsc --noEmit`** și verify dacă Round 2 errors surface. Dacă da, fix C12 + C7 simultan în same PR.
- Plus: lesson L46 aplicabilă oricărui Insert/Update cu 5+ fields în PRs viitoare. Best practice: empirical investigation pre-marker placement.

---

## F. Cat 5 mojibake (non-marker finding)

Encoding finding empirical — mojibake bytes (UTF-8 caractere corupte) detected în cod source. NU markered ca `@ts-expect-error` (NU TS error), captured în scratch findings ca observation pentru cleanup uniform în PR 11.

### Pattern empirical

Mojibake = sequențe UTF-8 misinterpreted ca alt encoding (Windows-1252 sau Latin-1) → caractere display corupte (ex: `Ã£` în loc de `ă`, `Å£` în loc de `ț`, `Ã®` în loc de `î`).

Cauze frecvente:
- Editor save cu encoding greșit (Notepad default Windows-1252 vs UTF-8)
- Copy-paste din browser cu encoding inconsistent
- Migration de la Latin-1/CP1252 la UTF-8 fără proper conversion
- Tools care NU preserve UTF-8 byte-perfect (older diff/merge tools)

### Findings cataloged

**File 1:** `lib/authorization.ts`
- Mojibake detected în comments header (diacritice corupte)
- Pattern: `Å£` (UTF-8 bytes 0xC5 0xA3 = "Ł £") în loc de `ț` (UTF-8 bytes 0xC8 0x9B)
- Similar pattern pentru alte diacritice românești (ă, î, â)
- Source likely: editor save cu encoding greșit la commit anterior

**File 2:** `app/api/guests/import/route.ts`
- Same pattern mojibake în comments + string literals
- Affected: comments + user-facing strings + log messages
- Similar root cause

### Reproducer

Verify empirical pe disk:

```bash
# Detect non-ASCII bytes (UTF-8 sau mojibake) per file
grep -lRP "[\x80-\xff]" lib/ app/ scripts/

# Per-file count non-ASCII bytes
for f in $(grep -lRP "[\x80-\xff]" lib/ app/ scripts/); do
  count=$(xxd -p "$f" | tr -d '\n' | fold -w 2 | awk 'BEGIN{c=0} {n=strtonum("0x"$0); if (n>127) c++} END{print c}')
  echo "$f: $count non-ASCII bytes"
done

# Detect specific mojibake patterns (Å£ = wrong encoding for ț)
grep -nE "Å£|Ä|Å¢|Ä¢" lib/ app/ -r
```

### Status

- **Markers in PR 1A:** **0** (finding NOT captured ca `@ts-expect-error` — NU TS error).
- **Captured în:** `PR1A_SESSION_FINDINGS_SCRATCH.md` ca observation empirical durante PR 1A.4 marker placement.
- **Empirical detection method:** non-ASCII byte count cross-file via xxd-pair sum.

### PR target: PR 11 (Polish)

**Action items pentru PR 11 audit complet:**
1. Run reproducer commands on full repo (lib/ + app/ + scripts/ + docs/).
2. Identify all files cu mojibake bytes.
3. Replace mojibake → UTF-8 correct (sau strip non-ASCII dacă pure ASCII enforce per file).
4. Add lint rule (sau pre-commit hook) pentru detection automatic future commits.
5. Document encoding convention în CLAUDE.md (ex: "all source files MUST be UTF-8 without BOM, NU Windows-1252 / Latin-1").

### Lesson context

**Encoding hygiene importance:**
- Reviewer experience: mojibake = visual noise, distrage de la review semantic.
- Cross-platform stability: Windows + Mac + Linux text editors handle encoding diferit; mojibake bytes pot break tooling (compilers, formatters, syntax highlighters).
- Long-term maintenance: encoding consistency = baseline pentru any text manipulation (search, replace, refactor).

**Cross-reference:** ROADMAP.md update Task 1A.5 sub-pas 5 va include Cat 5 mojibake în scope PR 11 (Polish).

---

## G. Code quality issues (any casts + DEAD CODE)

2 code quality findings non-marker — NU `@ts-expect-error` markers (NU TS errors), dar concerns calitative care merită addressing post-PR 1A.

---

### G.1 — `any` casts masquerade schema drift

**File:** `app/api/rsvp/[public_link_id]/route.ts` (RSVP public route)

**Pattern detected:**
- L122: `const events = (guestEvents ?? []).map((ge: any) => { ... })`
- L124: `const existing = (existingResponses ?? []).find((r: any) => r.guest_event_id === ge.id)`
- L232 (POST handler): `(validEvents ?? []).map((e: any) => [e.id, e.event_id])`

**Issue:** `any` cast bypassează strict typing → orice schema drift în `guest_events` / `rsvp_responses` rows e hidden la compile-time. TypeScript NU detectează property access greșit.

**Detection reproducer:**

```bash
# Search for any casts în RSVP routes
grep -nE "\((ge|r|e): any\)" app/api/rsvp/

# Broader pattern (any cast în route.ts files)
grep -nE ": any\)" app/api/ -r --include="*.ts"
```

**Implication:**
- Schema drift potențial existing dar NOT detected (any masking).
- Future schema migrations pe `guest_events` sau `rsvp_responses` ar putea introduce silent runtime bugs.
- Reviewer attention: `any` casts în path-uri critic security (RSVP public) = risc enhanced.

**Fix recommendation:**
- Replace `(ge: any)` cu typed interface — derive din `Database['public']['Tables']['guest_events']['Row']` sau projection type explicit.
- Replace `(r: any)` cu `Database['public']['Tables']['rsvp_responses']['Row']`.
- Replace `(e: any)` cu projection `{ id: string; event_id: string }`.

**PR target:** **PR 11 (Polish)** — sau PR mic dedicat post-PR 1A (low risk, isolated cleanup).

**Status markers PR 1A:** **0** (NU TS error — `any` cast e accepted by TypeScript by definition).

---

### G.2 — DEAD CODE: `lib/supabase-server.ts` (`createAuthenticatedClient` never called)

**File:** `lib/supabase-server.ts`

**Function:** `createAuthenticatedClient(jwt: string): SupabaseClient<Database>`
- Exportat din file (line 19).
- Refactorizat în PR 1A.4 cu Database generic typing.
- **Empirical: NICIODATĂ apelat în codebase.**

**Detection reproducer:**

```bash
# Search for createAuthenticatedClient usage cross-repo
grep -rn "createAuthenticatedClient" app/ lib/ scripts/ --include="*.ts" --include="*.tsx"

# Expected output:
# lib/supabase-server.ts:19:export function createAuthenticatedClient(jwt: string)
# (single match — definition only, NO callers)
```

**Empirical confirmation (PR 1A.4):** post-refactor cu `<Database>` typing applied, function compiles clean dar zero call sites identified.

**Implication:**
- Dead code = cognitive overhead pentru reviewer (file appears active dar e legacy).
- Risk de revival accidental cu logică outdated (cineva poate să-l folosească presupunând că e curent).
- Bundle size: minor (function tree-shakeable, dar still în source).

**Fix recommendation:**
- Delete `createAuthenticatedClient` function din `lib/supabase-server.ts`.
- Verify NU breaks imports: dacă `lib/supabase-server.ts` are alte exports, păstrează file; altfel delete file complet.
- Update `app/lib/supabase/server.ts` (corectul, active) ca singur entry point pentru Supabase server client.

**TD-30 reformulat (a 2-a iterație):**

CLAUDE.md TD-30 era generic "supabase-server.ts cleanup needed". A doua iterație clarifică:
> **TD-30:** `lib/supabase-server.ts` conține `createAuthenticatedClient` exportat dar NICIODATĂ apelat în codebase. Refactor PR 1A.4 a aplicat `<Database>` typing pentru consistency, dar funcția rămâne dead code. Action: delete în PR mic dedicat post-PR 1A (low risk, simple delete + import cleanup).

**PR target:** **PR mic dedicat post-PR 1A** — recommended scope (1-3 files modified, simple delete, fast review).

**Status markers PR 1A:** **0** (NU TS error — function compiles clean cu `<Database>` typing aplicat).

---

### Cross-reference action items

- Update CLAUDE.md TD-30 cu reformulare a 2-a iterație (sub-pas separat post-Task 1A.5, sau task creep dacă scope mic în Task 1A.5).
- Update ROADMAP.md cu mention "PR mic dedicat post-PR 1A" pentru DEAD CODE cleanup (G.2).
- Reviewer note pentru PR 11 (Polish): include G.1 `any` casts cleanup în scope.

---

## H. PR target distribution (final reconciled)

Closing summary registry. Tabel cumulative empirical match cu commit `e575780` (PR 1A.4): 56 markers totale + non-marker scope distribution.

### PR target distribution (markers cumulative)

| PR | Markers | Categorii contributoare | Source sections |
|----|---------|------------------------|-----------------|
| **PR 1.5** (Enum Type Narrowing Layer NEW) | **5** | Cat3-enum BudgetItemStatus×4 + BudgetItemForSummary×1 | Section B |
| **PR 1.6** (RPC + Json Hardening NEW) | **7** | Cat4 (rpc-json×2 + rpc-cast×2 + rpc-name + json-meta + json-response) | Section C |
| **PR 3** (RSVP Minimal) | **30** | C12×22 + Cat3-narrow×2 + Cat3-enum RSVP×3 + C4×2 + C8×1 | Section A + B |
| **PR 4** (Account Deletion Atomic) | **4** | C11×4 cascade | Section A |
| **PR 9** (Import JSON v2.0) | **7** | C5×2 + C7×1 + NEW-5×1 + NEW-7×1 + NEW-8×1 + NEW-9×1 | Section A |
| **PR 11** (Polish) | **3** | NEW-10 cascade×3 | Section A |
| **GRAND TOTAL** | **56** ✓ | match commit e575780 | |

### Non-marker scope distribution

Findings care NU au markers committed în PR 1A dar require attention în PRs viitoare:

| PR | Non-marker scope | Source section |
|----|------------------|----------------|
| **PR 11** (Polish) | Cat 5 mojibake encoding cross-file audit + G.1 `any` casts cleanup în RSVP route | Section F + Section G.1 |
| **PR mic dedicat post-PR 1A** | G.2 DEAD CODE — delete `createAuthenticatedClient` din `lib/supabase-server.ts` | Section G.2 |
| **PR 1B/1C/1D** (layered defense) | Defense-in-depth coverage gap ~30% (filter operators column names) — NOT marked în PR 1A, requires runtime schema-guard + integration tests + CI fingerprint | (cross-ref HANDOFF L40 lesson) |

### Closing notes

- **Total markers cataloged:** 56 (RECONCILED EMPIRICAL).
- **Source commit:** `e575780` — chore(types): apply database generic + ts-expect-error markers (PR 1A.4).
- **Reconciliation date:** 2026-05-08.
- **Convention:**
  - Marker code blocks: ASCII pur strict (single-line, match disk exact).
  - Body text descriptive: UTF-8 cu diacritice + em-dash + § (consistent cu HANDOFF.md / CLAUDE.md / docs/audit/ precedent).
- **Maintenance:**
  - Registry updated post-fix per PR (markers consumed → entries marked DONE sau deleted).
  - Reviewer best practice: `npx tsc --noEmit` post-fix → verify markers count reduce corespunzător expected per PR target.
  - Hidden bugs detection (per L46): post-fix Round 1, MUST verify dacă Round 2 errors surface (multiple bugs simultane în same Insert/Update).

### Source of truth references

- **Schema:** `types/database.ts` (regenerated empirical din Supabase schema curent).
- **Markers commit:** `git show e575780 --unified=0 | grep -E "^\+.*ts-expect-error"`.
- **Lessons:** `HANDOFF.md` lessons L38-L46 (post-Task 1A.5 update).
- **PR target distribution decisions:** `ROADMAP.md` Faza 13 (post-Task 1A.5 update cu PR 1.5 + PR 1.6 NEW + C12 escalation).

---

*Registry maintained per Faza 13 PR 1A. Updates post-fix per PR consume markers + adjust entries. Final state expected post-PR 11 merge: zero `@ts-expect-error: C*|NEW-*|Cat3-*|Cat4-*` markers în codebase, registry archived.*
