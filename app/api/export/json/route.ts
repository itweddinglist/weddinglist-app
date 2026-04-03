// =============================================================================
// app/api/export/json/route.ts
// GET /api/export/json?wedding_id=...
// Export complet wedding data în format JSON
// Autentificat — doar membrii wedding-ului pot exporta
// Token-uri RSVP excluse din export
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { isWeddingMember } from "@/lib/authorization";
import { isValidUuid } from "@/lib/sanitize";
import { exportWeddingJson, buildExportFilename } from "@/lib/export/json-export";
import {
  authErrorResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

export async function GET(request: NextRequest): Promise<Response> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const { searchParams } = new URL(request.url);
  const weddingId = searchParams.get("wedding_id");

  if (!isValidUuid(weddingId)) {
    return validationErrorResponse([
      { field: "wedding_id", message: "A valid wedding_id (UUID) is required." },
    ]);
  }

  const supabase = createAuthenticatedClient(auth.context.token);

  // ── Authorization ──────────────────────────────────────────────────────────
  const isMember = await isWeddingMember(supabase, weddingId);
  if (!isMember) {
    return errorResponse(403, "FORBIDDEN", "You are not a member of this wedding.");
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const result = await exportWeddingJson(supabase, weddingId);

  if (!result.success) {
    return internalErrorResponse(new Error(result.error), "GET /api/export/json");
  }

  // ── Filename ───────────────────────────────────────────────────────────────
  const weddingTitle = (result.data.data.wedding as any)?.title ?? "export";
  const filename = buildExportFilename(weddingTitle, result.data.exported_at);

  // ── Response ca file download ──────────────────────────────────────────────
  return new Response(JSON.stringify(result.data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}