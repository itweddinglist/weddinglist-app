// =============================================================================
// app/api/import/json/route.ts
// POST /api/import/json
// Import JSON — creează întotdeauna un wedding nou
// Autentificat — userul devine owner al wedding-ului nou
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { validateImportPayload, buildImportPreview, MAX_FILE_SIZE_BYTES } from "@/lib/import/validate-import";
import { importWeddingJson } from "@/lib/import/json-import";
import { wl_audit } from "@/lib/audit/wl-audit";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api-response";

export async function POST(request: NextRequest): Promise<Response> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const requestId = crypto.randomUUID();

  // ── Content-Type check ─────────────────────────────────────────────────────
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return errorResponse(400, "INVALID_CONTENT_TYPE", "Content-Type must be application/json.");
  }

  // ── Size check ─────────────────────────────────────────────────────────────
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE_BYTES) {
    return errorResponse(413, "FILE_TOO_LARGE", "Fișierul depășește limita de 10MB.");
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  // ── Validare payload ───────────────────────────────────────────────────────
  const validation = validateImportPayload(body);
  if (!validation.valid) {
    return validationErrorResponse([{ field: "file", message: validation.error }]);
  }

  const exportData = validation.data;

  // ── Preview mode ───────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  if (searchParams.get("preview") === "true") {
    const preview = buildImportPreview(exportData);
    return successResponse({ preview });
  }

  const userId = authResult.ctx.app_user_id;

  // ── Audit: import started ──────────────────────────────────────────────────
  await wl_audit("import.json_started", {
    request_id: requestId,
    actor_type: "user",
    app_user_id: userId,
    metadata: {
      counts: exportData.counts as unknown as Record<string, number>,
    },
  });

  // ── Import ─────────────────────────────────────────────────────────────────
  const result = await importWeddingJson(supabaseServer, exportData, userId);

  if (!result.success) {
    await wl_audit("import.json_failed", {
      request_id: requestId,
      actor_type: "user",
      app_user_id: userId,
      metadata: {
        reason_code: result.step ?? "unknown",
      },
    });

    return errorResponse(
      422,
      "IMPORT_FAILED",
      `Import eșuat la pasul "${result.step}": ${result.error}`
    );
  }

  // ── Audit: import completed ────────────────────────────────────────────────
  await wl_audit("import.json_completed", {
    request_id: requestId,
    actor_type: "user",
    app_user_id: userId,
    wedding_id: result.new_wedding_id,
    metadata: {
      counts: result.counts,
    },
  });

  return successResponse({
    new_wedding_id: result.new_wedding_id,
    counts: result.counts,
    message: "Import finalizat cu succes. A fost creat un wedding nou.",
  }, 201);
}
