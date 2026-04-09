-- =============================================================================
-- Faza 7: VERSION_MISMATCH + OCC + SPEC-aligned error codes
--
-- Modificări față de v1:
--   1. Parametrii noi: p_version (OCC), p_force (override conflict)
--   2. OCC check cu seating_editor_states.revision (FOR UPDATE)
--   3. Coduri de eroare aliniate cu SPEC v5.4 (secțiunea 10.3)
--   4. Increment revision la final
--   5. Return version nou în răspuns
--
-- Coduri noi vs vechi:
--   P0002: TABLE_SCOPE_INVALID(event) → VERSION_MISMATCH
--   P0003: SEAT_REDUCTION_BLOCKED     → CAPACITY_EXCEEDED
--   P0004: GUEST_MAPPING_NOT_FOUND    → GUEST_NOT_FOUND
--   P0005: GUEST_EVENT_NOT_FOUND      → GUEST_NOT_FOUND
--   P0006: TABLE_MAPPING_NOT_FOUND    → rămâne (eroare internă)
--   P0007: TABLE_SCOPE_INVALID(del)   → TABLE_DELETED (nou)
--   P0008: NO_FREE_SEAT               → CAPACITY_EXCEEDED
--   P0009: EVENT_NOT_FOUND            → nou (fostul P0002)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_seating_editor_state(
  p_wedding_id  uuid,
  p_event_id    uuid,
  p_caller_uid  uuid,
  p_tables      jsonb,
  p_assignments jsonb,
  p_version     integer DEFAULT -1,
  p_force       boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_table           jsonb;
  v_assignment      jsonb;
  v_table_uuid      uuid;
  v_guest_uuid      uuid;
  v_guest_event_id  uuid;
  v_seat_id         uuid;
  v_numeric_id      integer;
  v_occupied        integer;
  v_current_seats   integer;
  v_rotation        numeric;
  v_current_revision integer;

  -- Counters
  v_tables_created      integer := 0;
  v_tables_updated      integer := 0;
  v_tables_deleted      integer := 0;
  v_seats_created       integer := 0;
  v_seats_deleted       integer := 0;
  v_assignments_created integer := 0;
  v_assignments_deleted integer := 0;
  v_assignments_moved   integer := 0;

  -- Bridge updates
  v_bridge_updates jsonb := '[]'::jsonb;

  -- Request table UUIDs
  v_request_uuids uuid[];
BEGIN
  -- ── 1. MEMBERSHIP CHECK ─────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM wedding_members wm
    WHERE wm.wedding_id  = p_wedding_id
      AND wm.app_user_id = p_caller_uid
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: User is not a member of this wedding'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 2. VERIFICĂ EVENIMENTUL ──────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id AND wedding_id = p_wedding_id
  ) THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND: Event not found for this wedding'
      USING ERRCODE = 'P0009';
  END IF;

  -- ── 3. VERSION CHECK (OCC) ───────────────────────────────────────────────────
  -- Ensure row exists, then lock it
  INSERT INTO seating_editor_states (wedding_id, event_id, state, revision)
  VALUES (p_wedding_id, p_event_id, '{}', 0)
  ON CONFLICT (wedding_id, event_id) DO NOTHING;

  SELECT revision INTO v_current_revision
  FROM seating_editor_states
  WHERE wedding_id = p_wedding_id AND event_id = p_event_id
  FOR UPDATE;

  -- p_version = -1 → skip check (backwards compat)
  IF p_version >= 0 AND NOT p_force AND v_current_revision != p_version THEN
    RAISE EXCEPTION 'VERSION_MISMATCH'
      USING ERRCODE = 'P0002';
  END IF;

  -- ── 4. RECONCILIERE TABLES ───────────────────────────────────────────────────

  SELECT array_agg((t->>'uuid')::uuid)
  INTO v_request_uuids
  FROM jsonb_array_elements(p_tables) t
  WHERE t->>'uuid' IS NOT NULL;

  UPDATE tables
  SET deleted_at = now()
  WHERE wedding_id = p_wedding_id
    AND event_id   = p_event_id
    AND deleted_at IS NULL
    AND (v_request_uuids IS NULL OR id <> ALL(v_request_uuids));

  GET DIAGNOSTICS v_tables_deleted = ROW_COUNT;

  WITH deleted_assignments AS (
    DELETE FROM seat_assignments sa
    USING seats s, tables t
    WHERE sa.seat_id    = s.id
      AND s.table_id    = t.id
      AND t.wedding_id  = p_wedding_id
      AND t.event_id    = p_event_id
      AND t.deleted_at IS NOT NULL
    RETURNING sa.id
  )
  SELECT COUNT(*) INTO v_assignments_deleted FROM deleted_assignments;

  FOR v_table IN SELECT value FROM jsonb_array_elements(p_tables) LOOP
    v_rotation := (((v_table->>'rotation')::numeric % 360) + 360) % 360;

    IF v_table->>'uuid' IS NULL THEN
      INSERT INTO tables (
        wedding_id, event_id, name, table_type,
        seat_count, x, y, rotation, shape_config, sort_order
      )
      VALUES (
        p_wedding_id,
        p_event_id,
        v_table->>'name',
        v_table->>'table_type',
        (v_table->>'seat_count')::integer,
        (v_table->>'x')::numeric,
        (v_table->>'y')::numeric,
        v_rotation,
        CASE WHEN (v_table->>'is_ring')::boolean THEN '{"isRing": true}'::jsonb ELSE NULL END,
        0
      )
      RETURNING id INTO v_table_uuid;

      v_tables_created := v_tables_created + 1;

      INSERT INTO seating_id_counters (wedding_id, event_id, entity_type, current_val)
      VALUES (p_wedding_id, p_event_id, 'table', 1)
      ON CONFLICT (wedding_id, event_id, entity_type)
      DO UPDATE SET current_val = seating_id_counters.current_val + 1
      RETURNING current_val INTO v_numeric_id;

      INSERT INTO seating_id_maps (wedding_id, event_id, entity_type, entity_uuid, numeric_id)
      VALUES (p_wedding_id, p_event_id, 'table', v_table_uuid, v_numeric_id)
      ON CONFLICT DO NOTHING;

      v_bridge_updates := v_bridge_updates || jsonb_build_object(
        'local_id', (v_table->>'id')::integer,
        'uuid', v_table_uuid
      );

      FOR i IN 1..(v_table->>'seat_count')::integer LOOP
        INSERT INTO seats (wedding_id, event_id, table_id, seat_index)
        VALUES (p_wedding_id, p_event_id, v_table_uuid, i);
        v_seats_created := v_seats_created + 1;
      END LOOP;

    ELSE
      v_table_uuid := (v_table->>'uuid')::uuid;

      SELECT seat_count INTO v_current_seats
      FROM tables WHERE id = v_table_uuid;

      IF (v_table->>'seat_count')::integer < v_current_seats THEN
        SELECT COUNT(*) INTO v_occupied
        FROM seat_assignments sa
        INNER JOIN seats s ON sa.seat_id = s.id
        WHERE s.table_id    = v_table_uuid
          AND s.seat_index  > (v_table->>'seat_count')::integer;

        IF v_occupied > 0 THEN
          RAISE EXCEPTION 'CAPACITY_EXCEEDED: Cannot reduce seat_count below occupied seats at table %',
            v_table_uuid
            USING ERRCODE = 'P0003';
        END IF;

        DELETE FROM seats
        WHERE table_id   = v_table_uuid
          AND seat_index > (v_table->>'seat_count')::integer;

        GET DIAGNOSTICS v_seats_deleted = ROW_COUNT;
      END IF;

      UPDATE tables SET
        name        = v_table->>'name',
        table_type  = v_table->>'table_type',
        seat_count  = (v_table->>'seat_count')::integer,
        x           = (v_table->>'x')::numeric,
        y           = (v_table->>'y')::numeric,
        rotation    = v_rotation,
        shape_config = CASE
          WHEN (v_table->>'is_ring')::boolean THEN '{"isRing": true}'::jsonb
          ELSE NULL END,
        updated_at  = now()
      WHERE id = v_table_uuid
        AND wedding_id = p_wedding_id;

      v_tables_updated := v_tables_updated + 1;

      FOR i IN
        COALESCE((SELECT MAX(seat_index) FROM seats WHERE table_id = v_table_uuid), 0) + 1
        ..
        (v_table->>'seat_count')::integer
      LOOP
        INSERT INTO seats (wedding_id, event_id, table_id, seat_index)
        VALUES (p_wedding_id, p_event_id, v_table_uuid, i)
        ON CONFLICT DO NOTHING;
        v_seats_created := v_seats_created + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- ── 5. RECONCILIERE ASSIGNMENTS ──────────────────────────────────────────────

  FOR v_assignment IN SELECT value FROM jsonb_array_elements(p_assignments) LOOP
    SELECT entity_uuid INTO v_guest_uuid
    FROM seating_id_maps
    WHERE wedding_id  = p_wedding_id
      AND event_id    = p_event_id
      AND entity_type = 'guest'
      AND numeric_id  = (v_assignment->>'guest_local_id')::integer;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'GUEST_NOT_FOUND: No UUID for guest numeric_id %',
        v_assignment->>'guest_local_id'
        USING ERRCODE = 'P0004';
    END IF;

    SELECT id INTO v_guest_event_id
    FROM guest_events
    WHERE guest_id = v_guest_uuid
      AND event_id = p_event_id
      AND wedding_id = p_wedding_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'GUEST_NOT_FOUND: No guest_event for guest % in event %',
        v_guest_uuid, p_event_id
        USING ERRCODE = 'P0005';
    END IF;

    IF v_assignment->>'table_local_id' IS NULL THEN
      DELETE FROM seat_assignments
      WHERE guest_event_id = v_guest_event_id;

      IF FOUND THEN
        v_assignments_deleted := v_assignments_deleted + 1;
      END IF;

    ELSE
      SELECT entity_uuid INTO v_table_uuid
      FROM seating_id_maps
      WHERE wedding_id  = p_wedding_id
        AND event_id    = p_event_id
        AND entity_type = 'table'
        AND numeric_id  = (v_assignment->>'table_local_id')::integer;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'TABLE_MAPPING_NOT_FOUND: No UUID for table numeric_id %',
          v_assignment->>'table_local_id'
          USING ERRCODE = 'P0006';
      END IF;

      IF EXISTS (
        SELECT 1 FROM tables
        WHERE id = v_table_uuid AND deleted_at IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'TABLE_DELETED: Table % is deleted', v_table_uuid
          USING ERRCODE = 'P0007';
      END IF;

      SELECT s.id INTO v_seat_id
      FROM seats s
      WHERE s.table_id = v_table_uuid
        AND NOT EXISTS (
          SELECT 1 FROM seat_assignments sa
          WHERE sa.seat_id = s.id
            AND sa.guest_event_id <> v_guest_event_id
        )
      ORDER BY s.seat_index
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'CAPACITY_EXCEEDED: No available seat at table %', v_table_uuid
          USING ERRCODE = 'P0008';
      END IF;

      IF EXISTS (
        SELECT 1 FROM seat_assignments WHERE guest_event_id = v_guest_event_id
      ) THEN
        v_assignments_moved := v_assignments_moved + 1;
      ELSE
        v_assignments_created := v_assignments_created + 1;
      END IF;

      INSERT INTO seat_assignments (wedding_id, event_id, seat_id, guest_event_id)
      VALUES (p_wedding_id, p_event_id, v_seat_id, v_guest_event_id)
      ON CONFLICT (guest_event_id)
      DO UPDATE SET
        seat_id    = EXCLUDED.seat_id,
        updated_at = now();
    END IF;
  END LOOP;

  -- ── 6. INCREMENT VERSION ─────────────────────────────────────────────────────
  UPDATE seating_editor_states
  SET revision   = revision + 1,
      updated_at = now()
  WHERE wedding_id = p_wedding_id AND event_id = p_event_id;

  -- ── 7. RETURN SUMMARY ────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success', true,
    'version', v_current_revision + 1,
    'synced', jsonb_build_object(
      'tables_created',      v_tables_created,
      'tables_updated',      v_tables_updated,
      'tables_deleted',      v_tables_deleted,
      'seats_created',       v_seats_created,
      'seats_deleted',       v_seats_deleted,
      'assignments_created', v_assignments_created,
      'assignments_deleted', v_assignments_deleted,
      'assignments_moved',   v_assignments_moved
    ),
    'bridge_updates', jsonb_build_object(
      'tables', v_bridge_updates
    )
  );
END;
$function$;
