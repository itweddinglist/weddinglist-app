-- =============================================================================
-- 20260413000001_drop_old_sync_seating_overloads.sql
-- Cleanup function overloading conflict pe sync_seating_editor_state.
--
-- Existau 3 versiuni cu DEFAULT-uri suprapuse → PostgREST PGRST203
-- (ambiguity error: multiple functions match the call).
--
-- V1: sync_seating_editor_state(uuid,uuid,uuid,jsonb,jsonb)
-- V2: sync_seating_editor_state(uuid,uuid,uuid,jsonb,jsonb,integer,boolean)
-- V3: sync_seating_editor_state(uuid,uuid,uuid,jsonb,jsonb,integer,boolean,text) ← PĂSTRATĂ
--
-- Păstrăm DOAR V3 (PR #131, audit tiered, are p_request_id pentru seating_audit_logs).
-- =============================================================================


-- ── Drop V1: semnătură originală (5 parametri) ───────────────────────────────

DROP FUNCTION IF EXISTS public.sync_seating_editor_state(
  p_wedding_id uuid,
  p_event_id   uuid,
  p_caller_uid uuid,
  p_tables     jsonb,
  p_assignments jsonb
);


-- ── Drop V2: semnătură intermediară (7 parametri, fără p_request_id) ─────────

DROP FUNCTION IF EXISTS public.sync_seating_editor_state(
  p_wedding_id uuid,
  p_event_id   uuid,
  p_caller_uid uuid,
  p_tables     jsonb,
  p_assignments jsonb,
  p_version    integer,
  p_force      boolean
);
