-- =============================================================================
-- 20260405000001_add_public_link_id_rsvp.sql
-- Adaugă public_link_id stabil pe rsvp_invitations.
-- public_link_id = identificator public, opaque, generat o singură dată.
-- Nu înlocuiește token_hash (care rămâne pentru audit/securitate).
-- Ruta publică /rsvp/[public_link_id] va folosi acest ID pentru lookup.
-- =============================================================================

-- ── 1. Extinde enum cu 'revoked' pentru revocarea explicită ──────────────────
ALTER TYPE rsvp_delivery_status ADD VALUE IF NOT EXISTS 'revoked';

-- ── 2. Adaugă coloana cu default temporar pentru rows existente ───────────────
ALTER TABLE rsvp_invitations
  ADD COLUMN IF NOT EXISTS public_link_id varchar(24) NOT NULL DEFAULT '';

-- ── 3. Populează rows existente cu ID-uri unice (16 hex chars lowercase) ─────
--    gen_random_bytes(8) = 8 bytes → encode hex = 16 chars, unic per row.
--    charset [0-9a-f] — subset valid al [0-9a-zA-Z].
UPDATE rsvp_invitations
  SET public_link_id = encode(gen_random_bytes(8), 'hex')
  WHERE public_link_id = '';

-- ── 4. Remove default temporar ───────────────────────────────────────────────
ALTER TABLE rsvp_invitations
  ALTER COLUMN public_link_id DROP DEFAULT;

-- ── 5. Constraint UNIQUE ─────────────────────────────────────────────────────
ALTER TABLE rsvp_invitations
  ADD CONSTRAINT rsvp_invitations_public_link_id_unique UNIQUE (public_link_id);

-- ── 6. Index pentru lookup rapid pe ruta publică ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rsvp_invitations_public_link_id
  ON rsvp_invitations (public_link_id);

-- ── 7. Comment ────────────────────────────────────────────────────────────────
COMMENT ON COLUMN rsvp_invitations.public_link_id IS
  'Identificator public stabil pentru URL-ul de RSVP (/rsvp/{public_link_id}). '
  'Generat o singură dată la creare. Regenerat DOAR la cerere explicită din dashboard.';
