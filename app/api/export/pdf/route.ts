// =============================================================================
// app/api/export/pdf/route.ts
// GET /api/export/pdf
// Generează PDF cu plan de mese + lista invitați + sumar
// Autentificat — doar membrii wedding-ului pot exporta
// =============================================================================

import { type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { WeddingPdfDocument } from "@/lib/export/pdf-export";
import type { PdfData, PdfGuest, PdfTable } from "@/lib/export/pdf-export";
import { slugifyTitle } from "@/lib/export/json-export";
import { wl_audit } from "@/lib/audit/wl-audit";
import {
  errorResponse,
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

  try {
    // ── Fetch wedding ──────────────────────────────────────────────────────
    const { data: wedding, error: wErr } = await supabaseServer
      .from("weddings")
      .select("title, event_date")
      .eq("id", weddingId)
      .single();

    if (wErr || !wedding) {
      return errorResponse(404, "NOT_FOUND", "Wedding not found.");
    }

    // ── Fetch guests cu rsvp_responses ────────────────────────────────────
    const { data: guestEvents, error: geErr } = await supabaseServer
      .from("guest_events")
      .select(`
        id,
        guest_id,
        guests!inner (
          id,
          display_name
        )
      `)
      .eq("wedding_id", weddingId);

    if (geErr) return internalErrorResponse(geErr, "GET /api/export/pdf — guest_events");

    // ── Fetch rsvp_responses ──────────────────────────────────────────────
    const { data: responses, error: rErr } = await supabaseServer
      .from("rsvp_responses")
      .select("guest_event_id, status, meal_choice, dietary_notes")
      .eq("wedding_id", weddingId);

    if (rErr) return internalErrorResponse(rErr, "GET /api/export/pdf — responses");

    const responseMap = new Map(
      (responses ?? []).map((r: any) => [r.guest_event_id, r])
    );

    // ── Fetch seat assignments ────────────────────────────────────────────
    const { data: assignments, error: aErr } = await supabaseServer
      .from("seat_assignments")
      .select(`
        guest_event_id,
        seats!inner (
          table_id,
          tables!inner (
            name
          )
        )
      `)
      .eq("wedding_id", weddingId);

    if (aErr) return internalErrorResponse(aErr, "GET /api/export/pdf — assignments");

    const assignmentMap = new Map(
      (assignments ?? []).map((a: any) => [
        a.guest_event_id,
        a.seats?.tables?.name ?? null,
      ])
    );

    // ── Fetch tables ──────────────────────────────────────────────────────
    const { data: tables, error: tErr } = await supabaseServer
      .from("tables")
      .select("id, name, seat_count")
      .eq("wedding_id", weddingId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (tErr) return internalErrorResponse(tErr, "GET /api/export/pdf — tables");

    // ── Build PDF data ────────────────────────────────────────────────────
    const guests: PdfGuest[] = (guestEvents ?? []).map((ge: any) => {
      const response = responseMap.get(ge.id);
      const tableName = assignmentMap.get(ge.id) ?? null;
      return {
        display_name: ge.guests.display_name,
        rsvp_status: response?.status ?? "pending",
        meal_choice: response?.meal_choice ?? null,
        dietary_notes: response?.dietary_notes ?? null,
        table_name: tableName,
      };
    });

    // ── Build tables cu guests ────────────────────────────────────────────
    const tableGuestMap = new Map<string, string[]>();
    for (const [geId, tableName] of assignmentMap.entries()) {
      if (!tableName) continue;
      const ge = (guestEvents ?? []).find((g: any) => g.id === geId);
      if (!ge) continue;
      if (!tableGuestMap.has(tableName)) tableGuestMap.set(tableName, []);
      tableGuestMap.get(tableName)!.push((ge.guests as any).display_name);
    }

    const pdfTables: PdfTable[] = (tables ?? []).map((t: any) => ({
      name: t.name,
      seat_count: t.seat_count,
      guests: tableGuestMap.get(t.name) ?? [],
    }));

    // ── Stats ─────────────────────────────────────────────────────────────
    const total = guests.length;
    const accepted = guests.filter((g) => g.rsvp_status === "accepted").length;
    const declined = guests.filter((g) => g.rsvp_status === "declined").length;
    const pending = guests.filter((g) => g.rsvp_status === "pending").length;
    const maybe = guests.filter((g) => g.rsvp_status === "maybe").length;
    const special_meals = guests.filter((g) => g.meal_choice === "vegetarian").length;
    const has_allergies = guests.filter((g) => g.dietary_notes && g.dietary_notes.trim().length > 0).length;

    const pdfData: PdfData = {
      couple_names: wedding.title,
      wedding_date: wedding.event_date ?? null,
      location: null,
      generated_at: new Date().toISOString(),
      stats: { total, accepted, declined, pending, maybe, special_meals, has_allergies },
      tables: pdfTables,
      guests,
    };

    // ── Render PDF ────────────────────────────────────────────────────────
    const buffer = await renderToBuffer(
      React.createElement(WeddingPdfDocument, { data: pdfData }) as any
    );

    const filename = `weddinglist-${slugifyTitle(wedding.title) || "export"}-${new Date().toISOString().slice(0, 10)}.pdf`;

    // ── Audit ──────────────────────────────────────────────────────────────
    await wl_audit("export.pdf_completed", {
      request_id: crypto.randomUUID(),
      actor_type: "user",
      app_user_id: authResult.ctx.app_user_id,
      wedding_id: weddingId,
      metadata: { filename },
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (err) {
    return internalErrorResponse(err, "GET /api/export/pdf");
  }
}
