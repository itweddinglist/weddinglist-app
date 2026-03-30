-- =============================================================================
-- 20260330000002_extend_table_types.sql
-- Faza 6 — Extend tables schema pentru seating integration
--
-- NU adăugăm event_id — există deja în schemă.
-- Adăugăm: deleted_at, table_type bar/prezidiu, seat_count >= 0
-- =============================================================================

-- Soft delete
ALTER TABLE tables ADD COLUMN deleted_at timestamptz NULL;

CREATE INDEX idx_tables_active
  ON tables (wedding_id, event_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Extend table_type
ALTER TABLE tables DROP CONSTRAINT tables_table_type_check;
ALTER TABLE tables ADD CONSTRAINT tables_table_type_check
  CHECK (table_type IN ('round', 'rect', 'square', 'prezidiu', 'bar', 'custom'));

-- Allow seat_count = 0 pentru bar/ring
ALTER TABLE tables DROP CONSTRAINT tables_seat_count_check;
ALTER TABLE tables ADD CONSTRAINT tables_seat_count_check
  CHECK (seat_count >= 0);
