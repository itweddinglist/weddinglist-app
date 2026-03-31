-- ============================================================
-- Migration: 20260331000001_active_wedding_id.sql
-- Adds active_wedding_id column to app_users.
-- FK is DEFERRABLE to allow simultaneous app_user + wedding creation.
-- ============================================================

ALTER TABLE app_users
ADD COLUMN active_wedding_id uuid NULL
  REFERENCES weddings(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_app_users_active_wedding ON app_users (active_wedding_id);

COMMENT ON COLUMN app_users.active_wedding_id IS
  'Explicit active wedding. Source of truth — no weddings[0] inference.';
