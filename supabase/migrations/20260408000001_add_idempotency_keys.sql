-- =============================================================================
-- 20260408000001_add_idempotency_keys.sql
-- Tabel idempotency_keys — Faza 3 SPEC secțiunea 7.
--
-- Garantează zero duplicate execution, safe retry, safe reconnect,
-- safe multi-instance. Cleanup automat după 24h (Edge Function sau PG Cron).
-- =============================================================================

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE idempotency_keys (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  request_hash        text        NOT NULL UNIQUE,
  client_operation_id uuid        NOT NULL,
  app_user_id         uuid        NOT NULL REFERENCES app_users(id),
  wedding_id          uuid        NOT NULL REFERENCES weddings(id),
  rpc_name            text        NOT NULL,
  response            jsonb       NOT NULL,
  created_at          timestamptz DEFAULT now()
);

-- ─── Indexuri ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_idempotency_hash    ON idempotency_keys (request_hash);
CREATE INDEX idx_idempotency_created ON idempotency_keys (created_at);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- INSERT: orice utilizator autentificat poate crea propriile chei de idempotență
CREATE POLICY "idempotency_keys_insert_own"
  ON idempotency_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (app_user_id = public.auth_user_id());

-- SELECT: doar owner-ul poate citi propriile chei
CREATE POLICY "idempotency_keys_select_own"
  ON idempotency_keys
  FOR SELECT
  TO authenticated
  USING (app_user_id = public.auth_user_id());

-- UPDATE/DELETE: interzis explicit — cheia de idempotență este imutabilă
-- (nicio politică = implicit deny)

-- ─── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE idempotency_keys IS
  'Cache de răspunsuri pentru operații idempotente. Cleanup automat după 24h.';

COMMENT ON COLUMN idempotency_keys.request_hash IS
  'SHA-256 hex al (app_user_id || wedding_id || deterministicPayload || client_operation_id). Cheia primară de deduplicare.';

COMMENT ON COLUMN idempotency_keys.client_operation_id IS
  'UUID generat de client O SINGURĂ DATĂ per intenție de salvare. Retry-urile refolosesc același UUID.';

COMMENT ON COLUMN idempotency_keys.rpc_name IS
  'Numele RPC-ului sau operației — pentru debugging și audit.';

COMMENT ON COLUMN idempotency_keys.response IS
  'Răspunsul serializat al operației originale, returnat verbatim la retry.';
