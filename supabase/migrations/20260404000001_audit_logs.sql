-- =============================================================================
-- 20260404000001_audit_logs.sql
-- Faza 8.5 — Audit Trail
-- Append-only ledger — zero acces direct din client
-- Scriere doar prin service role (server trusted layer)
-- =============================================================================

CREATE TABLE audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID        NULL,
  actor_type  TEXT        NOT NULL CHECK (actor_type IN ('user', 'system')),
  app_user_id UUID        NULL REFERENCES app_users(id) ON DELETE SET NULL,
  wedding_id  UUID        NULL REFERENCES weddings(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexuri ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_audit_app_user_id
  ON audit_logs (app_user_id)
  WHERE app_user_id IS NOT NULL;

CREATE INDEX idx_audit_wedding_id
  ON audit_logs (wedding_id)
  WHERE wedding_id IS NOT NULL;

CREATE INDEX idx_audit_action_time
  ON audit_logs (action, created_at DESC);

CREATE INDEX idx_audit_created_at
  ON audit_logs (created_at DESC);

-- ─── RLS — Append-only ledger ─────────────────────────────────────────────────

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Niciun user autentificat nu poate citi, modifica sau șterge
-- Scriere EXCLUSIV prin service_role (server trusted layer)

CREATE POLICY "audit_logs_insert_service_role"
  ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ─── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE audit_logs IS
  'Append-only audit ledger. Scriere exclusiv server-side (service_role). Zero acces client.';

COMMENT ON COLUMN audit_logs.actor_type IS
  'user = acțiune inițiată de utilizator | system = provisioning, job-uri, retry-uri automate';

COMMENT ON COLUMN audit_logs.request_id IS
  'Correlation ID pentru a lega mai multe loguri din același flow.';

COMMENT ON COLUMN audit_logs.metadata IS
  'Context operațional minim. NU conține PII (email, nume, token, payload raw).';

COMMENT ON COLUMN audit_logs.action IS
  'Valori controlate: account.delete_*, export.json_completed, export.pdf_completed, import.json_*, auth.provision_*, security.unauthorized_access';