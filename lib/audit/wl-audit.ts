// =============================================================================
// lib/audit/wl-audit.ts
// Audit Trail helper — Faza 8.5
// Best-effort but awaited — nu blochează flow-ul principal
// Scriere exclusiv prin supabaseServer (service_role) — trece de RLS
// Zero PII în metadata
// =============================================================================

import { supabaseServer } from "@/app/lib/supabase/server";

// ─── Acțiuni controlate ───────────────────────────────────────────────────────

export type AuditAction =
  | "account.delete_requested"
  | "account.delete_completed"
  | "account.delete_failed"
  | "export.json_completed"
  | "export.pdf_completed"
  | "import.json_started"
  | "import.json_completed"
  | "import.json_failed"
  | "auth.provision_started"
  | "auth.provision_completed"
  | "auth.provision_failed"
  | "security.unauthorized_access";

export type ActorType = "user" | "system";

// ─── Metadata whitelist ───────────────────────────────────────────────────────

export interface AuditMetadata {
  reason_code?: string;
  filename?: string;
  counts?: Record<string, number>;
  route?: string;
  channel?: string;
  provider?: string;
  status_context?: string;
  requested_wedding_id?: string;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface AuditOptions {
  request_id?: string;
  actor_type?: ActorType;
  app_user_id?: string | null;
  wedding_id?: string | null;
  metadata?: AuditMetadata;
}

// ─── Helper principal ─────────────────────────────────────────────────────────

export async function wl_audit(
  action: AuditAction,
  options: AuditOptions = {}
): Promise<void> {
  const {
    request_id = null,
    actor_type = "user",
    app_user_id = null,
    wedding_id = null,
    metadata = {},
  } = options;

  try {
    const { error } = await supabaseServer
      .from("audit_logs")
      .insert({
        request_id,
        actor_type,
        app_user_id,
        wedding_id,
        action,
        metadata,
      });

    if (error) {
      console.error(`[Audit] Failed to log action "${action}":`, error.message);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Audit] Exception logging action "${action}":`, message);
  }
}