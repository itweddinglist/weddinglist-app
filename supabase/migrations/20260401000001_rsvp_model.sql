-- =============================================================================
-- 20260401000001_rsvp_model.sql
-- Faza 7 — RSVP Model
-- =============================================================================

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE rsvp_attendance_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'maybe'
);

CREATE TYPE rsvp_meal_choice AS ENUM (
  'standard',
  'vegetarian'
);

CREATE TYPE rsvp_delivery_channel AS ENUM (
  'whatsapp',
  'email',
  'sms',
  'facebook',
  'qr',
  'link',
  'manual'
);

CREATE TYPE rsvp_delivery_status AS ENUM (
  'draft',
  'ready',
  'sent',
  'failed'
);

CREATE TYPE rsvp_response_source AS ENUM (
  'guest_link',
  'couple_manual',
  'import'
);

-- ─── Extinde rsvp_invitations ─────────────────────────────────────────────────

ALTER TABLE rsvp_invitations
  ADD COLUMN guest_id         UUID                  NULL REFERENCES guests(id) ON DELETE CASCADE,
  ADD COLUMN delivery_channel rsvp_delivery_channel NULL,
  ADD COLUMN delivery_status  rsvp_delivery_status  NOT NULL DEFAULT 'draft',
  ADD COLUMN opened_at        TIMESTAMPTZ           NULL,
  ADD COLUMN last_sent_at     TIMESTAMPTZ           NULL,
  ADD COLUMN is_active        BOOLEAN               NOT NULL DEFAULT true;

-- ─── Extinde rsvp_responses ───────────────────────────────────────────────────

-- Eliminăm CHECK constraint pe status înainte de conversie la enum
ALTER TABLE rsvp_responses
  DROP CONSTRAINT IF EXISTS rsvp_responses_status_check;

-- Eliminăm CHECK constraint pe meal_choice dacă există
ALTER TABLE rsvp_responses
  DROP CONSTRAINT IF EXISTS rsvp_responses_meal_choice_check;

-- Convertim status la enum
ALTER TABLE rsvp_responses
  ALTER COLUMN status TYPE rsvp_attendance_status
  USING status::rsvp_attendance_status;

-- Convertim meal_choice la enum
ALTER TABLE rsvp_responses
  ALTER COLUMN meal_choice TYPE rsvp_meal_choice
  USING CASE
    WHEN meal_choice IS NULL THEN NULL
    ELSE meal_choice::rsvp_meal_choice
  END;

-- Adaugă câmpuri lipsă
ALTER TABLE rsvp_responses
  ADD COLUMN dietary_notes TEXT                 NULL
    CONSTRAINT rsvp_dietary_notes_length CHECK (char_length(dietary_notes) <= 500),
  ADD COLUMN rsvp_source   rsvp_response_source NOT NULL DEFAULT 'guest_link',
  ADD COLUMN used_at       TIMESTAMPTZ          NULL;

-- ─── Indexuri ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rsvp_invitations_token_hash
  ON rsvp_invitations (token_hash);

CREATE INDEX IF NOT EXISTS idx_rsvp_invitations_guest_id
  ON rsvp_invitations (guest_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rsvp_invitations_wedding
  ON rsvp_invitations (wedding_id, is_active);

CREATE INDEX IF NOT EXISTS idx_rsvp_responses_invitation
  ON rsvp_responses (invitation_id);

CREATE INDEX IF NOT EXISTS idx_rsvp_responses_guest_event
  ON rsvp_responses (guest_event_id);

-- O singură invitație activă per guest
CREATE UNIQUE INDEX idx_rsvp_invitations_active_guest
  ON rsvp_invitations (guest_id)
  WHERE is_active = true AND guest_id IS NOT NULL;

-- ─── Comments ────────────────────────────────────────────────────────────────

COMMENT ON TABLE rsvp_invitations IS
  'Delivery layer — token, canal, tracking. Un token activ per invitat.';

COMMENT ON TABLE rsvp_responses IS
  'Răspunsul oficial al invitatului. Un răspuns per guest_event (UNIQUE constraint existent).';

COMMENT ON COLUMN rsvp_invitations.token_hash IS
  'SHA-256 hex al tokenului raw. Tokenul raw nu se stochează niciodată.';

COMMENT ON COLUMN rsvp_invitations.is_active IS
  'Doar un token activ per guest_id. La regenerare, vechiul token devine is_active=false.';

COMMENT ON COLUMN rsvp_responses.dietary_notes IS
  'Alergii sau preferințe speciale, max 500 caractere. Opțional.';