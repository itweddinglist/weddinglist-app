-- =============================================================================
-- 20260330000001_seating_id_maps.sql
-- Faza 6 — ID Bridge + Sync RPC
-- =============================================================================

-- ─── seating_id_counters ─────────────────────────────────────────────────────

CREATE TABLE seating_id_counters (
  wedding_id    uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  entity_type   text NOT NULL CHECK (entity_type IN ('guest', 'table')),
  current_val   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (wedding_id, event_id, entity_type)
);

ALTER TABLE seating_id_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seating_id_counters_member_select"
  ON seating_id_counters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM wedding_members wm
    WHERE wm.wedding_id = seating_id_counters.wedding_id
      AND wm.app_user_id = auth.uid()
  ));

CREATE POLICY "seating_id_counters_member_insert"
  ON seating_id_counters FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM wedding_members wm
    WHERE wm.wedding_id = seating_id_counters.wedding_id
      AND wm.app_user_id = auth.uid()
  ));

CREATE POLICY "seating_id_counters_member_update"
  ON seating_id_counters FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM wedding_members wm
    WHERE wm.wedding_id = seating_id_counters.wedding_id
      AND wm.app_user_id = auth.uid()
  ));

-- ─── seating_id_maps ─────────────────────────────────────────────────────────

CREATE TABLE seating_id_maps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id  uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('guest', 'table')),
  entity_uuid uuid NOT NULL,
  numeric_id  integer NOT NULL CHECK (numeric_id > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, event_id, entity_type, entity_uuid),
  UNIQUE (wedding_id, event_id, entity_type, numeric_id)
);

CREATE INDEX idx_seating_id_maps_lookup
  ON seating_id_maps (wedding_id, event_id, entity_type);

ALTER TABLE seating_id_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seating_id_maps_member_select"
  ON seating_id_maps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM wedding_members wm
    WHERE wm.wedding_id = seating_id_maps.wedding_id
      AND wm.app_user_id = auth.uid()
  ));

CREATE POLICY "seating_id_maps_member_insert"
  ON seating_id_maps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM wedding_members wm
    WHERE wm.wedding_id = seating_id_maps.wedding_id
      AND wm.app_user_id = auth.uid()
  ));

-- ─── RPC: allocate_seating_numeric_ids_batch ─────────────────────────────────
-- Batch allocation — un singur apel pentru N UUID-uri.
-- Rulează cu RLS normal (SECURITY INVOKER implicit).
-- Atomic per UUID via ON CONFLICT DO UPDATE pe counter.

CREATE OR REPLACE FUNCTION allocate_seating_numeric_ids_batch(
  p_wedding_id  uuid,
  p_event_id    uuid,
  p_entity_type text,
  p_entity_uuids uuid[]
)
RETURNS TABLE (entity_uuid uuid, numeric_id integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_uuid        uuid;
  v_numeric_id  integer;
  v_missing     uuid[];
BEGIN
  -- FIX 4: filtrează UUID-urile lipsă înainte de loop — fără duplicate în output

  -- 1. Identifică UUID-urile fără mapping
  SELECT array_agg(u)
  INTO v_missing
  FROM unnest(p_entity_uuids) u
  WHERE NOT EXISTS (
    SELECT 1 FROM seating_id_maps m
    WHERE m.wedding_id  = p_wedding_id
      AND m.event_id    = p_event_id
      AND m.entity_type = p_entity_type
      AND m.entity_uuid = u
  );

  -- 2. Alocă doar pentru cele lipsă
  IF v_missing IS NOT NULL THEN
    FOREACH v_uuid IN ARRAY v_missing LOOP
      -- Increment atomic
      INSERT INTO seating_id_counters (wedding_id, event_id, entity_type, current_val)
      VALUES (p_wedding_id, p_event_id, p_entity_type, 1)
      ON CONFLICT (wedding_id, event_id, entity_type)
      DO UPDATE SET current_val = seating_id_counters.current_val + 1
      RETURNING current_val INTO v_numeric_id;

      -- Insert mapping (ON CONFLICT DO NOTHING pentru concurență)
      INSERT INTO seating_id_maps (wedding_id, event_id, entity_type, entity_uuid, numeric_id)
      VALUES (p_wedding_id, p_event_id, p_entity_type, v_uuid, v_numeric_id)
      ON CONFLICT (wedding_id, event_id, entity_type, entity_uuid) DO NOTHING;
    END LOOP;
  END IF;

  -- 3. Un singur RETURN QUERY la final — zero duplicate
  RETURN QUERY
    SELECT m.entity_uuid, m.numeric_id
    FROM seating_id_maps m
    WHERE m.wedding_id  = p_wedding_id
      AND m.event_id    = p_event_id
      AND m.entity_type = p_entity_type
      AND m.entity_uuid = ANY(p_entity_uuids);
END;
$$;

-- ─── RPC: sync_seating_editor_state ──────────────────────────────────────────
-- SECURITY DEFINER — face tot reconcile-ul într-o singură tranzacție.
-- Validare membership explicită în corp — nu depinde de RLS.
-- Rollback complet la orice eroare business.

CREATE OR REPLACE FUNCTION sync_seating_editor_state(
  p_wedding_id  uuid,
  p_event_id    uuid,
  p_caller_uid  uuid,    -- auth.uid() pasat explicit din route handler
  p_tables      jsonb,   -- SeatingTableSyncItem[]
  p_assignments jsonb    -- SeatingAssignmentSyncItem[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Request table UUIDs (cele cu uuid != null)
  v_request_uuids uuid[];
BEGIN
  -- ── 1. MEMBERSHIP CHECK EXPLICIT ─────────────────────────────────────────
  -- SECURITY DEFINER bypass-ează RLS — validăm manual
  IF NOT EXISTS (
    SELECT 1 FROM wedding_members wm
    WHERE wm.wedding_id  = p_wedding_id
      AND wm.app_user_id = p_caller_uid
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: User is not a member of this wedding'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 2. VERIFICĂ EVENIMENTUL ───────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id AND wedding_id = p_wedding_id
  ) THEN
    RAISE EXCEPTION 'TABLE_SCOPE_INVALID: Event not found for this wedding'
      USING ERRCODE = 'P0002';
  END IF;

  -- ── 3. RECONCILIERE TABLES ────────────────────────────────────────────────

  -- Colectează UUID-urile din request (tables existente)
  SELECT array_agg((t->>'uuid')::uuid)
  INTO v_request_uuids
  FROM jsonb_array_elements(p_tables) t
  WHERE t->>'uuid' IS NOT NULL;

  -- Soft delete tables active care lipsesc din request
  UPDATE tables
  SET deleted_at = now()
  WHERE wedding_id = p_wedding_id
    AND event_id   = p_event_id
    AND deleted_at IS NULL
    AND (v_request_uuids IS NULL OR id <> ALL(v_request_uuids));

  GET DIAGNOSTICS v_tables_deleted = ROW_COUNT;

  -- Cleanup seat_assignments pentru mesele șterse
  -- FIX 2: GET DIAGNOSTICS după DELETE pentru count corect
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

  -- Procesează fiecare masă din request
  FOR v_table IN SELECT value FROM jsonb_array_elements(p_tables) LOOP
    -- Normalizează rotația: ((r % 360) + 360) % 360
    v_rotation := (((v_table->>'rotation')::numeric % 360) + 360) % 360;

    IF v_table->>'uuid' IS NULL THEN
      -- ── Masă nouă — create ──
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

      -- Alocă numeric_id în bridge pentru masa nouă
      INSERT INTO seating_id_counters (wedding_id, event_id, entity_type, current_val)
      VALUES (p_wedding_id, p_event_id, 'table', 1)
      ON CONFLICT (wedding_id, event_id, entity_type)
      DO UPDATE SET current_val = seating_id_counters.current_val + 1
      RETURNING current_val INTO v_numeric_id;

      INSERT INTO seating_id_maps (wedding_id, event_id, entity_type, entity_uuid, numeric_id)
      VALUES (p_wedding_id, p_event_id, 'table', v_table_uuid, v_numeric_id)
      ON CONFLICT DO NOTHING;

      -- Adaugă la bridge_updates
      v_bridge_updates := v_bridge_updates || jsonb_build_object(
        'local_id', (v_table->>'id')::integer,
        'uuid', v_table_uuid
      );

      -- Creează seats pentru masa nouă
      FOR i IN 1..(v_table->>'seat_count')::integer LOOP
        INSERT INTO seats (wedding_id, event_id, table_id, seat_index)
        VALUES (p_wedding_id, p_event_id, v_table_uuid, i);
        v_seats_created := v_seats_created + 1;
      END LOOP;

    ELSE
      -- ── Masă existentă — update ──
      v_table_uuid := (v_table->>'uuid')::uuid;

      -- Verifică seat_count vs assignments existente
      SELECT seat_count INTO v_current_seats
      FROM tables WHERE id = v_table_uuid;

      IF (v_table->>'seat_count')::integer < v_current_seats THEN
        -- Verifică dacă reducerea ar afecta seats ocupate
        SELECT COUNT(*) INTO v_occupied
        FROM seat_assignments sa
        INNER JOIN seats s ON sa.seat_id = s.id
        WHERE s.table_id    = v_table_uuid
          AND s.seat_index  > (v_table->>'seat_count')::integer;

        IF v_occupied > 0 THEN
          RAISE EXCEPTION 'SEAT_REDUCTION_BLOCKED: Cannot reduce seat_count below occupied seats at table %',
            v_table_uuid
            USING ERRCODE = 'P0003';
        END IF;

        -- Șterge seats în exces (neocupate)
        DELETE FROM seats
        WHERE table_id   = v_table_uuid
          AND seat_index > (v_table->>'seat_count')::integer;

        GET DIAGNOSTICS v_seats_deleted = ROW_COUNT;
      END IF;

      -- Update table
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

      -- Creează seats lipsă dacă seat_count a crescut
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

  -- ── 4. RECONCILIERE ASSIGNMENTS ───────────────────────────────────────────

  FOR v_assignment IN SELECT value FROM jsonb_array_elements(p_assignments) LOOP
    -- Resolve guest UUID din bridge
    SELECT entity_uuid INTO v_guest_uuid
    FROM seating_id_maps
    WHERE wedding_id  = p_wedding_id
      AND event_id    = p_event_id
      AND entity_type = 'guest'
      AND numeric_id  = (v_assignment->>'guest_local_id')::integer;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'GUEST_MAPPING_NOT_FOUND: No UUID for guest numeric_id %',
        v_assignment->>'guest_local_id'
        USING ERRCODE = 'P0004';
    END IF;

    -- Resolve guest_event_id
    SELECT id INTO v_guest_event_id
    FROM guest_events
    WHERE guest_id = v_guest_uuid
      AND event_id = p_event_id
      AND wedding_id = p_wedding_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'GUEST_EVENT_NOT_FOUND: No guest_event for guest % in event %',
        v_guest_uuid, p_event_id
        USING ERRCODE = 'P0005';
    END IF;

    IF v_assignment->>'table_local_id' IS NULL THEN
      -- Unassign
      DELETE FROM seat_assignments
      WHERE guest_event_id = v_guest_event_id;

      IF FOUND THEN
        v_assignments_deleted := v_assignments_deleted + 1;
      END IF;

    ELSE
      -- Resolve table UUID din bridge
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

      -- Verifică masa nu e soft deleted
      IF EXISTS (
        SELECT 1 FROM tables
        WHERE id = v_table_uuid AND deleted_at IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'TABLE_SCOPE_INVALID: Table % is deleted', v_table_uuid
          USING ERRCODE = 'P0007';
      END IF;

      -- Găsește seat liber la masă
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
        RAISE EXCEPTION 'NO_FREE_SEAT: No available seat at table %', v_table_uuid
          USING ERRCODE = 'P0008';
      END IF;

      -- FIX 3: check esistă înainte de upsert (fără xmax hack)
      IF EXISTS (
        SELECT 1 FROM seat_assignments WHERE guest_event_id = v_guest_event_id
      ) THEN
        v_assignments_moved := v_assignments_moved + 1;
      ELSE
        v_assignments_created := v_assignments_created + 1;
      END IF;

      -- Upsert assignment (move sau create)
      INSERT INTO seat_assignments (wedding_id, event_id, seat_id, guest_event_id)
      VALUES (p_wedding_id, p_event_id, v_seat_id, v_guest_event_id)
      ON CONFLICT (guest_event_id)
      DO UPDATE SET
        seat_id    = EXCLUDED.seat_id,
        updated_at = now();
    END IF;
  END LOOP;

  -- ── 5. RETURN SUMMARY ─────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success', true,
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
$$;
