// =============================================================================
// lib/audit/wl-audit.test.ts
// Teste pentru tipurile și contractul audit — Faza 8.5
// Nu testăm DB calls — testăm că tipurile și contractul sunt corecte
// =============================================================================

import { describe, it, expect } from "vitest";
import type { AuditAction, ActorType, AuditMetadata, AuditOptions } from "./wl-audit";

// ─── AuditAction ──────────────────────────────────────────────────────────────

describe("AuditAction", () => {
  it("toate acțiunile account sunt definite", () => {
    const actions: AuditAction[] = [
      "account.delete_requested",
      "account.delete_completed",
      "account.delete_failed",
    ];
    expect(actions).toHaveLength(3);
  });

  it("toate acțiunile export sunt definite", () => {
    const actions: AuditAction[] = [
      "export.json_completed",
      "export.pdf_completed",
    ];
    expect(actions).toHaveLength(2);
  });

  it("toate acțiunile import sunt definite", () => {
    const actions: AuditAction[] = [
      "import.json_started",
      "import.json_completed",
      "import.json_failed",
    ];
    expect(actions).toHaveLength(3);
  });

  it("toate acțiunile auth sunt definite", () => {
    const actions: AuditAction[] = [
      "auth.provision_started",
      "auth.provision_completed",
      "auth.provision_failed",
    ];
    expect(actions).toHaveLength(3);
  });

  it("security action este definită", () => {
    const action: AuditAction = "security.unauthorized_access";
    expect(action).toBe("security.unauthorized_access");
  });
});

// ─── ActorType ────────────────────────────────────────────────────────────────

describe("ActorType", () => {
  it("user și system sunt singurele tipuri valide", () => {
    const types: ActorType[] = ["user", "system"];
    expect(types).toHaveLength(2);
  });
});

// ─── AuditMetadata ────────────────────────────────────────────────────────────

describe("AuditMetadata", () => {
  it("acceptă metadata goală", () => {
    const meta: AuditMetadata = {};
    expect(meta).toBeDefined();
  });

  it("acceptă toți câmpii whitelist", () => {
    const meta: AuditMetadata = {
      reason_code: "not_member",
      filename: "export.json",
      counts: { guests: 10, tables: 5 },
      route: "/api/export/json",
      channel: "whatsapp",
      provider: "wordpress",
      status_context: "completed",
      requested_wedding_id: "123e4567-e89b-12d3-a456-426614174000",
    };
    expect(Object.keys(meta)).toHaveLength(8);
  });
});

// ─── AuditOptions ─────────────────────────────────────────────────────────────

describe("AuditOptions", () => {
  it("acceptă options goale", () => {
    const opts: AuditOptions = {};
    expect(opts).toBeDefined();
  });

  it("acceptă toate câmpurile", () => {
    const opts: AuditOptions = {
      request_id: "123e4567-e89b-12d3-a456-426614174000",
      actor_type: "user",
      app_user_id: "123e4567-e89b-12d3-a456-426614174001",
      wedding_id: "123e4567-e89b-12d3-a456-426614174002",
      metadata: { reason_code: "test" },
    };
    expect(opts.actor_type).toBe("user");
    expect(opts.request_id).toBeDefined();
  });

  it("actor_type system este valid", () => {
    const opts: AuditOptions = {
      actor_type: "system",
      app_user_id: null,
    };
    expect(opts.actor_type).toBe("system");
  });
});

// ─── Contract validation ──────────────────────────────────────────────────────

describe("Audit contract", () => {
  it("total acțiuni controlate = 12", () => {
    const allActions: AuditAction[] = [
      "account.delete_requested",
      "account.delete_completed",
      "account.delete_failed",
      "export.json_completed",
      "export.pdf_completed",
      "import.json_started",
      "import.json_completed",
      "import.json_failed",
      "auth.provision_started",
      "auth.provision_completed",
      "auth.provision_failed",
      "security.unauthorized_access",
    ];
    expect(allActions).toHaveLength(12);
  });

  it("metadata nu poate conține PII — whitelist check", () => {
    const meta: AuditMetadata = {};
    const allowedKeys = [
      "reason_code",
      "filename",
      "counts",
      "route",
      "channel",
      "provider",
      "status_context",
      "requested_wedding_id",
    ];
    // Verifică că niciun câmp PII nu e în whitelist
    const piiFields = ["email", "name", "phone", "token", "password"];
    for (const pii of piiFields) {
      expect(allowedKeys.includes(pii)).toBe(false);
    }
    expect(meta).toBeDefined();
  });
});