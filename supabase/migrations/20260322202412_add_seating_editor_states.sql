-- ============================================================
-- Add seating_editor_states table
-- Autosave snapshot for seating chart editor
-- ============================================================

CREATE TABLE seating_editor_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id uuid NULL REFERENCES events(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}',
  revision integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, event_id)
);

-- Index pentru fetch rapid
CREATE INDEX idx_seating_editor_states_wedding ON seating_editor_states (wedding_id);

-- RLS
ALTER TABLE seating_editor_states ENABLE ROW LEVEL SECURITY;