// =============================================================================
// app/api/export/json/route.ts
// GET /api/export/json
// Export complet wedding data în format JSON
// Autentificat — doar membrii wedding-ului pot exporta
// Token-uri RSVP excluse din export
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { exportWeddingJson, buildExportFilename } from "@/lib/export/json-export";
import { wl_audit } from "@/lib/audit/wl-audit";
import {
  internalErrorResponse,
} from "@/lib/api-response";

export async function GET(request: NextRequest): Promise<Response> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  // ── Authorization ──────────────────────────────────────────────────────────
  const weddingIdParam = request.nextUrl.searchParams.get("wedding_id");
  const access = await requireWeddingAccess({
    ctx: authResult.ctx,
    requestedWeddingId: weddingIdParam ?? undefined,
  });
  if (!access.ok) return access.response;

  const weddingId = access.wedding_id;

  // ── Export ─────────────────────────────────────────────────────────────────
  const result = await exportWeddingJson(supabaseServer, weddingId);

  if (!result.success) {
    return internalErrorResponse(new Error(result.error), "GET /api/export/json");
  }

  // ── Filename ───────────────────────────────────────────────────────────────
  const weddingTitle = (result.data.data.wedding as any)?.title ?? "export";
  const filename = buildExportFilename(weddingTitle, result.data.exported_at);

  // ── Audit ──────────────────────────────────────────────────────────────────
  await wl_audit("export.json_completed", {
    request_id: crypto.randomUUID(),
    actor_type: "user",
    app_user_id: authResult.ctx.app_user_id,
    wedding_id: weddingId,
    metadata: { filename },
  });

  // ── Response ca file download ──────────────────────────────────────────────
  return new Response(JSON.stringify(result.data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
