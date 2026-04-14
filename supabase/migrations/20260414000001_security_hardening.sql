-- =============================================================================
-- 20260414000001_security_hardening.sql
-- Faza 11 — Security Hardening (SPEC v5.4 §15)
--
-- 1. allocate_seating_numeric_ids_batch — SECURITY DEFINER + membership check
--    Adaugă p_caller_uid; SECURITY DEFINER bypass-ează RLS →
--    validăm manual ca în sync_seating_editor_state.
--
-- 2. Reindexare idempotentă — DROP IF EXISTS + CREATE IF NOT EXISTS
--    pentru indexurile din migrații vechi fără IF NOT EXISTS.
--    Prioritate: wedding_id pe tabele operaționale critice,
--    apoi indexuri secundare și de audit.
-- =============================================================================

-- =============================================================================
-- PART 1: allocate_seating_numeric_ids_batch cu SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.allocate_seating_numeric_ids_batch(
  p_wedding_id   uuid,
  p_event_id     uuid,
  p_entity_type  text,
  p_entity_uuids uuid[],
  p_caller_uid   uuid
)
RETURNS TABLE (entity_uuid uuid, numeric_id integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uuid       uuid;
  v_numeric_id integer;
  v_missing    uuid[];
BEGIN
  -- ── 1. MEMBERSHIP CHECK (SECURITY DEFINER bypass-ează RLS — validăm manual) ──
  IF NOT EXISTS (
    SELECT 1 FROM wedding_members wm
    WHERE wm.wedding_id  = p_wedding_id
      AND wm.app_user_id = p_caller_uid
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: User is not a member of this wedding'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 2. Identifică UUID-urile fără mapping ─────────────────────────────────────
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

  -- ── 3. Alocă doar pentru cele lipsă (atomic per UUID) ────────────────────────
  IF v_missing IS NOT NULL THEN
    FOREACH v_uuid IN ARRAY v_missing LOOP
      INSERT INTO seating_id_counters (wedding_id, event_id, entity_type, current_val)
      VALUES (p_wedding_id, p_event_id, p_entity_type, 1)
      ON CONFLICT (wedding_id, event_id, entity_type)
      DO UPDATE SET current_val = seating_id_counters.current_val + 1
      RETURNING current_val INTO v_numeric_id;

      INSERT INTO seating_id_maps (wedding_id, event_id, entity_type, entity_uuid, numeric_id)
      VALUES (p_wedding_id, p_event_id, p_entity_type, v_uuid, v_numeric_id)
      ON CONFLICT (wedding_id, event_id, entity_type, entity_uuid) DO NOTHING;
    END LOOP;
  END IF;

  -- ── 4. Un singur RETURN QUERY la final — zero duplicate ──────────────────────
  RETURN QUERY
    SELECT m.entity_uuid, m.numeric_id
    FROM seating_id_maps m
    WHERE m.wedding_id  = p_wedding_id
      AND m.event_id    = p_event_id
      AND m.entity_type = p_entity_type
      AND m.entity_uuid = ANY(p_entity_uuids);
END;
$$;

-- =============================================================================
-- PART 2: Reindexare idempotentă
-- Prioritate 1 — wedding_id pe tabele operaționale critice
-- =============================================================================

-- wedding_members
DROP INDEX IF EXISTS idx_wedding_members_user;
CREATE INDEX IF NOT EXISTS idx_wedding_members_user
  ON wedding_members (app_user_id);

-- guests
DROP INDEX IF EXISTS idx_guests_wedding;
CREATE INDEX IF NOT EXISTS idx_guests_wedding
  ON guests (wedding_id);

DROP INDEX IF EXISTS idx_guests_wedding_name;
CREATE INDEX IF NOT EXISTS idx_guests_wedding_name
  ON guests (wedding_id, display_name);

-- guest_events
DROP INDEX IF EXISTS idx_guest_events_wedding_event;
CREATE INDEX IF NOT EXISTS idx_guest_events_wedding_event
  ON guest_events (wedding_id, event_id);

DROP INDEX IF EXISTS idx_guest_events_status;
CREATE INDEX IF NOT EXISTS idx_guest_events_status
  ON guest_events (wedding_id, attendance_status);

-- tables
DROP INDEX IF EXISTS idx_tables_wedding_event;
CREATE INDEX IF NOT EXISTS idx_tables_wedding_event
  ON tables (wedding_id, event_id);

DROP INDEX IF EXISTS idx_tables_active;
CREATE INDEX IF NOT EXISTS idx_tables_active
  ON tables (wedding_id, event_id, deleted_at)
  WHERE deleted_at IS NULL;

-- seat_assignments
DROP INDEX IF EXISTS idx_seat_assignments_wedding_event;
CREATE INDEX IF NOT EXISTS idx_seat_assignments_wedding_event
  ON seat_assignments (wedding_id, event_id);

-- seating_editor_states
DROP INDEX IF EXISTS idx_seating_editor_states_wedding;
CREATE INDEX IF NOT EXISTS idx_seating_editor_states_wedding
  ON seating_editor_states (wedding_id);

-- seating_id_maps
DROP INDEX IF EXISTS idx_seating_id_maps_lookup;
CREATE INDEX IF NOT EXISTS idx_seating_id_maps_lookup
  ON seating_id_maps (wedding_id, event_id, entity_type);

-- app_users
DROP INDEX IF EXISTS idx_app_users_active_wedding;
CREATE INDEX IF NOT EXISTS idx_app_users_active_wedding
  ON app_users (active_wedding_id);

-- weddings (soft delete)
DROP INDEX IF EXISTS idx_weddings_deleted_at;
CREATE INDEX IF NOT EXISTS idx_weddings_deleted_at
  ON weddings (deleted_at)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- Prioritate 2 — indexuri secundare operaționale
-- =============================================================================

-- events
DROP INDEX IF EXISTS idx_events_wedding_sort;
CREATE INDEX IF NOT EXISTS idx_events_wedding_sort
  ON events (wedding_id, sort_order);

-- guest_groups
DROP INDEX IF EXISTS idx_guest_groups_wedding_sort;
CREATE INDEX IF NOT EXISTS idx_guest_groups_wedding_sort
  ON guest_groups (wedding_id, sort_order);

-- guest_events
DROP INDEX IF EXISTS idx_guest_events_guest;
CREATE INDEX IF NOT EXISTS idx_guest_events_guest
  ON guest_events (guest_id);

-- tables
DROP INDEX IF EXISTS idx_tables_event_sort;
CREATE INDEX IF NOT EXISTS idx_tables_event_sort
  ON tables (event_id, sort_order);

-- guests
DROP INDEX IF EXISTS idx_guests_group;
CREATE INDEX IF NOT EXISTS idx_guests_group
  ON guests (guest_group_id);

-- seats
DROP INDEX IF EXISTS idx_seats_event_table;
CREATE INDEX IF NOT EXISTS idx_seats_event_table
  ON seats (event_id, table_id);

-- budget_items
DROP INDEX IF EXISTS idx_budget_items_status;
CREATE INDEX IF NOT EXISTS idx_budget_items_status
  ON budget_items (wedding_id, status);

DROP INDEX IF EXISTS idx_budget_items_due;
CREATE INDEX IF NOT EXISTS idx_budget_items_due
  ON budget_items (wedding_id, due_date);

-- payments
DROP INDEX IF EXISTS idx_payments_budget_item;
CREATE INDEX IF NOT EXISTS idx_payments_budget_item
  ON payments (budget_item_id);

DROP INDEX IF EXISTS idx_payments_wedding_paid;
CREATE INDEX IF NOT EXISTS idx_payments_wedding_paid
  ON payments (wedding_id, paid_at);

-- vendors
DROP INDEX IF EXISTS idx_vendors_status;
CREATE INDEX IF NOT EXISTS idx_vendors_status
  ON vendors (wedding_id, status);

DROP INDEX IF EXISTS idx_vendors_category;
CREATE INDEX IF NOT EXISTS idx_vendors_category
  ON vendors (wedding_id, category);

-- rsvp_invitations (din initial schema — fără IF NOT EXISTS)
DROP INDEX IF EXISTS idx_rsvp_invitations_wedding_event;
CREATE INDEX IF NOT EXISTS idx_rsvp_invitations_wedding_event
  ON rsvp_invitations (wedding_id, event_id);

DROP INDEX IF EXISTS idx_rsvp_invitations_status;
CREATE INDEX IF NOT EXISTS idx_rsvp_invitations_status
  ON rsvp_invitations (status);

-- rsvp_responses (din initial schema — fără IF NOT EXISTS)
DROP INDEX IF EXISTS idx_rsvp_responses_invitation;
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_invitation
  ON rsvp_responses (invitation_id);

DROP INDEX IF EXISTS idx_rsvp_responses_wedding_event;
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_wedding_event
  ON rsvp_responses (wedding_id, event_id);

-- data_migrations
DROP INDEX IF EXISTS idx_data_migrations_status;
CREATE INDEX IF NOT EXISTS idx_data_migrations_status
  ON data_migrations (status);

-- =============================================================================
-- Prioritate 3 — audit și idempotency
-- DO block defensiv: tabelele pot lipsi pe DEV dacă migrațiile
-- originale au fost marcate applied dar nu executate fizic.
-- =============================================================================

DO $$
BEGIN
  -- idempotency_keys
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'idempotency_keys'
  ) THEN
    DROP INDEX IF EXISTS idx_idempotency_hash;
    CREATE INDEX IF NOT EXISTS idx_idempotency_hash
      ON idempotency_keys (request_hash);

    DROP INDEX IF EXISTS idx_idempotency_created;
    CREATE INDEX IF NOT EXISTS idx_idempotency_created
      ON idempotency_keys (created_at);
  END IF;

  -- audit_logs (partial indexes — WHERE clause obligatorie)
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    DROP INDEX IF EXISTS idx_audit_app_user_id;
    CREATE INDEX IF NOT EXISTS idx_audit_app_user_id
      ON audit_logs (app_user_id)
      WHERE app_user_id IS NOT NULL;

    DROP INDEX IF EXISTS idx_audit_wedding_id;
    CREATE INDEX IF NOT EXISTS idx_audit_wedding_id
      ON audit_logs (wedding_id)
      WHERE wedding_id IS NOT NULL;

    DROP INDEX IF EXISTS idx_audit_action_time;
    CREATE INDEX IF NOT EXISTS idx_audit_action_time
      ON audit_logs (action, created_at DESC);

    DROP INDEX IF EXISTS idx_audit_created_at;
    CREATE INDEX IF NOT EXISTS idx_audit_created_at
      ON audit_logs (created_at DESC);
  END IF;
END $$;
