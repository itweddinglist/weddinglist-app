// =============================================================================
// app/api/import/json/route.ts
// POST /api/import/json
// Import JSON — creează întotdeauna un wedding nou
// Autentificat — userul devine owner al wedding-ului nou
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { validateImportPayload, buildImportPreview, MAX_FILE_SIZE_BYTES } from "@/lib/import/validate-import";
import { importWeddingJson } from "@/lib/import/json-import";
import {
  successResponse,
  authErrorResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api-response";

export async function POST(request: NextRequest): Promise<Response> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

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

  // ── Preview mode (GET cu ?preview=true simulat prin query param) ───────────
  const { searchParams } = new URL(request.url);
  if (searchParams.get("preview") === "true") {
    const preview = buildImportPreview(exportData);
    return successResponse({ preview });
  }

  // ── Import ─────────────────────────────────────────────────────────────────
  const supabase = createAuthenticatedClient(auth.context.token);

  const result = await importWeddingJson(supabase, exportData, auth.context.userId);

  if (!result.success) {
    return errorResponse(
      422,
      "IMPORT_FAILED",
      `Import eșuat la pasul "${result.step}": ${result.error}`
    );
  }

  return successResponse({
    new_wedding_id: result.new_wedding_id,
    counts: result.counts,
    message: "Import finalizat cu succes. A fost creat un wedding nou.",
  }, 201);
}