# ADR-029 — Safe Write Pattern for Seating Chart Persistence

| | |
|---|---|
| **Status** | ✅ Approved |
| **Date** | 2026-03-28 |
| **Issue** | Must Now #29 — PRIORITIES.md |
| **Reviewed by** | Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google) |
| **Score** | 9.3/10 — Ready for implementation |

---

## 1. Context & Problem Statement

The seating chart editor is the most complex write surface in the application. A single save persists the entire editor state: table positions, guest-to-seat assignments, layout metadata, and undo history. Today this state lives in localStorage via `saveStorageState()`, which performs a full overwrite on every save.

### 1.1 Current Flow (localStorage)

The existing implementation in `app/seating-chart/utils/storage.js` follows this pattern:

1. User drags a guest to a seat, or repositions a table.
2. The entire editor state object is serialized to JSON.
3. `localStorage.setItem()` overwrites the previous state completely.
4. No versioning, no conflict detection, no rollback.

### 1.2 Target Flow (Supabase Phase 3)

The `seating_editor_states` table has the following schema:

```
seating_editor_states
├─ wedding_id     uuid    FK → weddings.id
├─ event_id       uuid    FK → events.id
├─ state          jsonb   (the full editor state)
├─ revision       integer (optimistic concurrency control)
├─ updated_at     timestamptz
└─ updated_by     uuid    FK → app_users.id
```

RLS is active on this table: only wedding members can read or write, enforced by `is_wedding_member(wedding_id)`. The 71-policy migration from Phase 2 covers this table with SELECT, INSERT, UPDATE, and DELETE policies.

---

## 2. Decision: Granular Writes with Optimistic Concurrency

### 2.1 Granular Update Model

Instead of persisting one monolithic state blob, we decompose the editor state into discrete, independently-updatable units.

> **Key insight:** Seat assignments are already normalized in the `seat_assignments` table with their own RLS policies. We do NOT duplicate them inside the JSONB blob. The `seating_editor_states.state` field stores only UI-level metadata (positions, preferences, sidebar order) that has no dedicated table.

### 2.2 JSONB Partial Update via `jsonb_set()`

For the `state` JSONB column, we never replace the entire object. Instead, we use PostgreSQL `jsonb_set()` to patch only the changed path:

```sql
-- Move table 'tbl_abc' to new position
UPDATE seating_editor_states
SET
  state = jsonb_set(
    state,
    '{tables_layout,tbl_abc}',
    '{"x": 450, "y": 200, "rotation": 0}'::jsonb
  ),
  revision = revision + 1,
  updated_at = now(),
  updated_by = auth_user_id()
WHERE wedding_id = $1
  AND event_id = $2
  AND revision = $3  -- optimistic lock
RETURNING revision;
```

**Why `jsonb_set()` and not full replace:** When User A moves Table 1 and User B moves Table 2 concurrently, both writes target the same row in `seating_editor_states`. The `SELECT FOR UPDATE` in the RPC serializes access: the second write waits for the first to commit, then detects a revision mismatch and enters the conflict/retry path. On retry, it re-reads the server state (which now includes User A's change) and applies its own change via `jsonb_set()` on a different key. Because `jsonb_set()` patches only the specific path (e.g., `tables_layout.tbl_xyz`), User A's position data is preserved. A full JSONB overwrite would destroy the first user's changes on retry.

**`jsonb_set()` create_missing semantics (explicit decision):**

| Path prefix | Create if missing | Rationale |
|---|---|---|
| `tables_layout.{table_id}` | ✅ Yes | Tables can be created mid-session |
| `preferences.{key}` | ✅ Yes | Preferences are additive |
| `sidebar_order` | ❌ No — replace top-level only | Array replace, no subpath writes |

**`sidebar_order` constraint:** This path is always written as a complete array replacement, never with subpath writes. This prevents partial array corruption.

---

## 3. Schema Version Check at Write Time

The JSONB state blob evolves over time as we add features. A write from an old client with an outdated schema can corrupt state silently.

### 3.1 Schema Version Contract

```json
{
  "_schema_version": 2,
  "_migrated_at": "2026-...",
  "tables_layout": { ... },
  "sidebar_order": [ ... ],
  "preferences": { ... }
}
```

### 3.2 Write-Time Validation

Before any write, the client reads the current revision AND schema version:

1. Client loads state from Supabase; extracts `_schema_version` from JSONB.
2. Client compares against its own `EXPECTED_SCHEMA_VERSION` constant.
3. If server version > client version: **BLOCK write**; show "Please refresh your browser".
4. If server version < client version: **RUN client-side migration**, then write with new version.
5. If equal: proceed normally.

### 3.3 Server-Side CHECK Constraint

```sql
ALTER TABLE seating_editor_states
ADD CONSTRAINT state_has_valid_structure
CHECK (
  (state->>'_schema_version') IS NOT NULL AND
  (state->>'_schema_version')::integer > 0 AND
  (state->'tables_layout' IS NULL OR
   jsonb_typeof(state->'tables_layout') = 'object') AND
  (state->'sidebar_order' IS NULL OR
   jsonb_typeof(state->'sidebar_order') = 'array') AND
  (state->'preferences' IS NULL OR
   jsonb_typeof(state->'preferences') = 'object')
);
```

> **Design note:** The CHECK constraint validates structure (types and required keys), not content. Full content validation stays client-side. The constraint is a safety net, not the primary validator.

---

## 4. Conflict Detection: Optimistic Concurrency Control

### 4.1 How It Works

1. Client reads the current state and notes `revision = N`.
2. Client makes local changes (drag table, assign seat).
3. Client sends UPDATE with `WHERE revision = N`.
4. If another client wrote in the meantime, revision is now `N+1`. The WHERE clause matches 0 rows.
5. Client checks RETURNING: if no rows returned, it is a conflict.

### 4.2 Conflict Resolution Strategy

| Change type | Resolution | Rationale |
|---|---|---|
| Table position | Auto-merge on retry | Different `jsonb_set()` keys — no collision |
| Seat assignment | Show conflict modal | Two users can't share a seat |
| Sidebar order | Last-write-wins | Low stakes, non-destructive |

### 4.3 The Write Function

```javascript
async function safeWrite(weddingId, eventId, path, value) {
  const current = await supabase
    .from('seating_editor_states')
    .select('revision, state')
    .match({ wedding_id: weddingId, event_id: eventId })
    .single();

  const serverVersion = current.state._schema_version;
  if (serverVersion > EXPECTED_SCHEMA_VERSION) {
    throw new SchemaVersionError('Client outdated. Refresh required.');
  }

  const { data, error } = await supabase.rpc('update_editor_state', {
    p_wedding_id: weddingId,
    p_event_id: eventId,
    p_path: path,
    p_value: value,
    p_expected_revision: current.revision,
  });

  if (error?.code === 'CONFLICT') {
    return handleConflict(weddingId, eventId, path, value);
  }
  if (error) {
    await rollback(weddingId, eventId, current);
    throw error;
  }
  return data.new_revision;
}
```

### 4.4 Conflict Handler

> ⚠️ **Critical:** `handleConflict()` MUST re-fetch the server state before retrying. Without a fresh revision number, the client would retry with the same stale `expected_revision` and loop indefinitely.

```javascript
const MAX_CONFLICT_RETRIES = 3;

async function handleConflict(weddingId, eventId, path, value, attempt = 1) {
  if (attempt > MAX_CONFLICT_RETRIES) {
    showErrorToast('Save failed after multiple attempts. Please refresh.');
    throw new MaxRetriesError(`Conflict not resolved after ${MAX_CONFLICT_RETRIES} retries`);
  }

  // MANDATORY: re-fetch current state from server
  const fresh = await supabase
    .from('seating_editor_states')
    .select('revision, state')
    .match({ wedding_id: weddingId, event_id: eventId })
    .single();

  updateLocalState(fresh.state);

  const { data, error } = await supabase.rpc('update_editor_state', {
    p_wedding_id: weddingId,
    p_event_id: eventId,
    p_path: path,
    p_value: value,
    p_expected_revision: fresh.revision, // fresh, not stale
  });

  if (data?.conflict) {
    return handleConflict(weddingId, eventId, path, value, attempt + 1);
  }
  if (error) throw error;
  return data.new_revision;
}
```

### 4.5 Write Debouncing

**Problem:** A drag → drop → micro-adjust sequence in under 300ms generates multiple `safeWrite()` calls for the same path. Each call increments the revision, causing the next call to see a conflict on its own revision — a self-inflicted conflict loop.

**Solution:** Debounce `safeWrite()` per path with a 300-500ms window.

```javascript
const pendingWrites = new Map(); // path -> { timer, value, resolve, reject }

function debouncedWrite(weddingId, eventId, path, value, delayMs = 400) {
  const key = `${weddingId}:${eventId}:${path.join('.')}`;

  if (pendingWrites.has(key)) {
    clearTimeout(pendingWrites.get(key).timer);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(async () => {
      pendingWrites.delete(key);
      try {
        resolve(await safeWrite(weddingId, eventId, path, value));
      } catch (err) {
        reject(err);
      }
    }, delayMs);
    pendingWrites.set(key, { timer, value, resolve, reject });
  });
}

// Best-effort flush on page close (NOT a safety guarantee)
// Real protection comes from: optimistic local state + server history + rollback
function flushPendingWrites() {
  for (const [key, pending] of pendingWrites) {
    clearTimeout(pending.timer);
    pendingWrites.delete(key);
    safeWrite(...parseKey(key), pending.value)
      .then(pending.resolve)
      .catch(pending.reject);
  }
}

// beforeunload: best-effort only — browser does not guarantee async completion
window.addEventListener('beforeunload', flushPendingWrites);
// In React: useEffect(() => () => flushPendingWrites(), []);
```

> ⚠️ **`beforeunload` is best-effort, not a guarantee.** Browsers do not guarantee async requests complete on page close. The real safety net is the server-side history table and client-side rollback, not the flush.

### 4.6 Seat Assignment Conflict Handler

`handleConflict()` handles JSONB state conflicts via the RPC. Seat assignments are direct table writes to `seat_assignments` with their own UNIQUE constraint on `seat_id`. A collision produces a constraint violation (Postgres error `23505`), not a revision mismatch.

```javascript
async function handleSeatConflict(eventId, seatId, guestEventId) {
  const { data: currentAssignments } = await supabase
    .from('seat_assignments')
    .select('*, guests(first_name, last_name)')
    .eq('event_id', eventId);

  updateLocalSeatAssignments(currentAssignments);

  const conflicting = currentAssignments.find(a => a.seat_id === seatId);

  const userChoice = await showSeatConflictModal({
    seatId,
    currentGuest: conflicting?.guests,
    attemptedGuest: guestEventId,
    assignedBy: conflicting?.updated_by,
    assignedAt: conflicting?.updated_at,
  });

  if (userChoice === 'overwrite') {
    await supabase
      .from('seat_assignments')
      .upsert({ seat_id: seatId, guest_event_id: guestEventId, event_id: eventId });
  }
}
```

> **Integration point:** Call `handleSeatConflict()` from the catch block of any `seat_assignments` INSERT/UPDATE when error code is `23505`.

**Consistency note (MVP):** A user action that moves a guest touches both `seat_assignments` (source of truth) and potentially UI metadata in JSONB (secondary/best-effort). These are NOT a common transaction. If one succeeds and the other fails, `seat_assignments` is the authoritative state. This is intentional for MVP — cross-table transactions add complexity that's not justified until Phase 6.

---

## 5. Rollback Strategy

### 5.1 Layer 1 — Client-Side Instant Rollback

**When:** Any write fails (network error, revision mismatch, RLS denial).  
**How:** Before any Supabase write, snapshot local state into `previousState`. If write fails, restore immediately.  
**Latency:** 0ms.

### 5.2 Layer 2 — Server-Side Revision History

```sql
CREATE TABLE seating_editor_state_history (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id    uuid NOT NULL,
  event_id      uuid NOT NULL,
  state         jsonb NOT NULL,
  revision      integer NOT NULL,
  replaced_at   timestamptz DEFAULT now(),
  replaced_by   uuid  -- NULLABLE: NULL = system/service-role write
);

CREATE OR REPLACE FUNCTION archive_editor_state()
RETURNS trigger AS $$
BEGIN
  INSERT INTO seating_editor_state_history
    (wedding_id, event_id, state, revision, replaced_by)
  VALUES
    (OLD.wedding_id, OLD.event_id, OLD.state, OLD.revision,
     NULLIF(public.auth_user_id(),
            '00000000-0000-0000-0000-000000000000'::uuid));
  -- NULL replaced_by = system write (no JWT context), not an error
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_editor_state
  BEFORE UPDATE ON seating_editor_states
  FOR EACH ROW EXECUTE FUNCTION archive_editor_state();

-- Index for efficient restore queries
CREATE INDEX idx_editor_history_lookup
  ON seating_editor_state_history (wedding_id, event_id, revision DESC);
```

**Retention (MVP policy):** Keep last 50 revisions per `(wedding_id, event_id)` pair.  
This is the MVP policy and will be revisited based on production usage.

```sql
CREATE OR REPLACE FUNCTION prune_editor_history(p_keep_count integer DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_deleted integer;
BEGIN
  WITH ranked AS (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY wedding_id, event_id
        ORDER BY revision DESC
      ) AS rn
    FROM public.seating_editor_state_history
  )
  DELETE FROM public.seating_editor_state_history
  WHERE id IN (SELECT id FROM ranked WHERE rn > p_keep_count);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
-- Schedule weekly: SELECT prune_editor_history(50);
```

> ❌ **Anti-pattern:** `DELETE WHERE replaced_at < now() - interval '30 days'` — risks losing recent revisions from intensive editing sessions.

### 5.3 Layer 3 — Manual Admin Recovery

```sql
-- Restore revision 42 for a specific wedding/event
UPDATE seating_editor_states ses
SET
  state = h.state,
  revision = ses.revision + 1,  -- increment, don't restore old revision
  updated_at = now()
FROM seating_editor_state_history h
WHERE h.wedding_id = ses.wedding_id
  AND h.event_id = ses.event_id
  AND h.revision = 42
  AND ses.wedding_id = '<wedding-uuid>';
```

---

## 6. Complete Write Lifecycle

Every editor action follows this exact sequence:

```
User action
  → debouncedWrite() [400ms debounce per path]
    → safeWrite()
      → read current revision + schema version
      → schema version check
      → supabase.rpc('update_editor_state')
        → is_wedding_member() check [Step 0]
        → path allowlist check [Step 1]
        → SELECT FOR UPDATE [Step 2]
        → revision guard [Step 3]
        → jsonb_set() atomic update [Step 4]
        → history trigger fires [archive_editor_state]
      → conflict? → handleConflict() [re-fetch + retry, max 3]
      → error? → rollback() [restore local snapshot]
      → success → update local revision
```

---

## 7. Server-Side RPC Function

```sql
CREATE OR REPLACE FUNCTION update_editor_state(
  p_wedding_id uuid,
  p_event_id uuid,
  p_path text[],
  p_value jsonb,
  p_expected_revision integer
)
RETURNS TABLE(new_revision integer, conflict boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_current_revision integer;
  v_current_schema integer;
BEGIN
  -- 0. AUTHORIZATION: explicit check (SECURITY DEFINER bypasses RLS)
  IF NOT public.is_wedding_member(p_wedding_id) THEN
    RAISE EXCEPTION 'Access denied: not a member of this wedding';
  END IF;

  -- 1. PATH ALLOWLIST
  IF p_path[1] NOT IN ('tables_layout', 'sidebar_order', 'preferences') THEN
    RAISE EXCEPTION 'Invalid path prefix: %. Allowed: tables_layout, sidebar_order, preferences', p_path[1];
  END IF;

  -- 2. Lock row
  SELECT revision, (state->>'_schema_version')::integer
  INTO v_current_revision, v_current_schema
  FROM public.seating_editor_states
  WHERE wedding_id = p_wedding_id AND event_id = p_event_id
  FOR UPDATE;

  IF v_current_revision IS NULL THEN
    RAISE EXCEPTION 'State not found for this wedding/event';
  END IF;

  -- 3. Revision check + conflict logging
  IF v_current_revision != p_expected_revision THEN
    BEGIN
      INSERT INTO public.editor_conflict_log
        (wedding_id, event_id, expected_rev, actual_rev, user_id,
         conflict_kind, created_at)
      VALUES
        (p_wedding_id, p_event_id, p_expected_revision, v_current_revision,
         public.auth_user_id(), p_path[1], now());
    EXCEPTION WHEN OTHERS THEN NULL; -- monitoring never breaks writes
    END;
    RETURN QUERY SELECT v_current_revision, true;
    RETURN;
  END IF;

  -- 4. Atomic update
  UPDATE public.seating_editor_states
  SET
    state = jsonb_set(state, p_path, p_value),
    revision = revision + 1,
    updated_at = now(),
    updated_by = public.auth_user_id()
  WHERE wedding_id = p_wedding_id AND event_id = p_event_id;

  RETURN QUERY SELECT v_current_revision + 1, false;
END;
$$;
```

> **Why SECURITY DEFINER:** Runs as DB owner — RLS does NOT apply inside the function. Security comes from the explicit `is_wedding_member()` check at Step 0, not from RLS. Without Step 0, any authenticated user could write to any wedding.

---

## 8. Conflict Rate Monitoring

```sql
CREATE TABLE editor_conflict_log (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id   uuid NOT NULL,
  event_id     uuid NOT NULL,
  expected_rev integer NOT NULL,
  actual_rev   integer NOT NULL,
  user_id      uuid,
  conflict_kind text,  -- path prefix: tables_layout | sidebar_order | preferences
  created_at   timestamptz DEFAULT now()
);
```

**Alert threshold:** If `conflict_count / total_writes > 10%` per wedding per day → investigate. Likely causes: debounce too short, or more concurrent editors than anticipated.

---

## 9. Explicit Non-Goals

| Out of scope | Reason |
|---|---|
| Real-time collaboration (Realtime channels) | Phase 4 concern |
| CRDT-based conflict resolution | Overkill for 1-2 concurrent editors |
| Offline-first with sync queue | App requires network connectivity |
| Full event sourcing | History table provides sufficient rollback |
| Cross-table transactions (seat_assignments + JSONB) | MVP: seat_assignments is source of truth, JSONB is secondary |

---

## 10. Migration Path from localStorage

### Step 1 — Dual Write (`seating_supabase_write`)
Writes go to both localStorage AND Supabase. Reads from localStorage.

### Step 2 — Dual Read (`seating_supabase_read`)
Reads from Supabase, localStorage as fallback. Log discrepancies.

### Step 3 — Supabase Only (`seating_localstorage_off`)
Remove localStorage writes. Auto-migrate on first load if Supabase is empty.

**Seed race condition (Step 3):**

```javascript
async function initializeEditorState(weddingId, eventId, localState) {
  await supabase
    .from('seating_editor_states')
    .upsert(
      {
        wedding_id: weddingId,
        event_id: eventId,
        state: { ...localState, _schema_version: EXPECTED_SCHEMA_VERSION },
        revision: 1,
      },
      { onConflict: 'wedding_id,event_id', ignoreDuplicates: true }
    );
  // Always read canonical state (ours or the other client's)
  const { data } = await supabase
    .from('seating_editor_states')
    .select('*')
    .match({ wedding_id: weddingId, event_id: eventId })
    .single();
  return data;
}
```

> **Note:** `ON CONFLICT (wedding_id, event_id)` works because `UNIQUE (wedding_id, event_id)` already exists in the schema (migration `20260322202412_add_seating_editor_states.sql`).

---

## 11. Testing Strategy

### Unit Tests
- `safeWrite()` returns new revision on success
- `safeWrite()` throws `SchemaVersionError` when server version > client
- `safeWrite()` calls `handleConflict()` when revision mismatch
- `rollback()` restores `previousState` exactly
- `jsonb_set()` path correctly targets nested keys

### Integration Tests (Supabase DEV)
- Two sequential writes to different `tables_layout` keys produce correct merged state: second write detects conflict, retries with fresh revision, both positions preserved
- Two writes to same key: first succeeds, second gets conflict
- Write with wrong revision returns `conflict = true`
- RLS blocks write from non-member (0 rows, no error leak)
- History trigger creates archive row on every UPDATE

### Chaos Tests
- Kill network mid-write → client restores from snapshot
- Write corrupt JSONB → CHECK constraint rejects
- Attempt schema version downgrade → trigger rejects
- Delete history rows while restoring → fails gracefully

---

## 12. Implementation Notes (from review)

These notes are for the implementor — they don't require ADR changes:

1. **`beforeunload` is best-effort** — don't treat it as primary safety. Real safety = local snapshot + server history.
2. **`jsonb_set` create_missing** — see Section 2.2 table for explicit decision per path.
3. **`sidebar_order` — top-level only** — never pass subpath for sidebar_order writes.
4. **`conflict_kind` in monitoring** — already included in `editor_conflict_log` schema above. Use `p_path[1]` as value.
5. **Seat assignment consistency** — `seat_assignments` = source of truth. JSONB metadata = secondary/best-effort. Not a cross-table transaction.

---

*ADR-029 v3 FINAL — Approved 2026-03-28*  
*Review rounds: 3 (Claude + ChatGPT + Gemini)*
