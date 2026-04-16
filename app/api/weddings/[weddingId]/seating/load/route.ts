// =============================================================================
// app/api/weddings/[weddingId]/seating/load/route.ts
// GET /api/weddings/[weddingId]/seating/load?event_id=X
//
// Încarcă guests + assignments + alocă numeric IDs, totul server-side cu
// service_role. Înlocuiește 3 apeluri directe anon-key din browser.
//
// Garanții:
//   - Membership check înainte de orice DB access (requireWeddingAccess)
//   - allocate_seating_numeric_ids_batch apelat cu service_role
//   - Upsert în seating_id_maps cu service_role (niciun bypass RLS din client)
// =============================================================================

import { type NextRequest } from "next/server";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { isValidUuid } from "@/lib/sanitize";
import {
  successResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import { mapGuestsToSeating } from "@/lib/seating/map-guests";
import { applyAssignments, type SeatAssignmentRow } from "@/lib/seating/map-assignments";
import type { NumericIdMap, SeatingLoadResponse, SeatingTableLoad } from "@/lib/seating/types";
import type { GuestWithEventData } from "@/lib/seating/map-guests";

type RouteContext = { params: Promise<{ weddingId: string }> };

type AllocRow = { entity_uuid: string; numeric_id: number };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { weddingId } = await context.params;

  if (!isValidUuid(weddingId)) {
    return errorResponse(400, "INVALID_ID", "Wedding ID must be a valid UUID.");
  }

  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  const eventId = request.nextUrl.searchParams.get("event_id");
  if (!eventId || !isValidUuid(eventId)) {
    return errorResponse(400, "EVENT_ID_REQUIRED", "A valid event_id query parameter is required.");
  }

  const access = await requireWeddingAccess({
    ctx: authResult.ctx,
    requestedWeddingId: weddingId,
    minRole: "viewer",
  });
  if (!access.ok) return access.response;

  try {
    // ── 1. Guests ──────────────────────────────────────────────────────────────
    const { data: rawGuests, error: guestsError } = await supabaseServer
      .from("guests")
      .select(`
        id, first_name, last_name,
        guest_group:guest_groups(name),
        guest_events(attendance_status, meal_choice, event_id)
      `)
      .eq("wedding_id", access.wedding_id);

    if (guestsError) return internalErrorResponse(guestsError, "GET seating/load — guests");

    const guestsForEvent: GuestWithEventData[] = (rawGuests ?? []).map((g: any) => ({
      ...g,
      guest_events: g.guest_events?.filter((ge: any) => ge.event_id === eventId) ?? [],
    }));

    // ── 2. Tables ─────────────────────────────────────────────────────────────
    const { data: rawTables, error: tablesError } = await supabaseServer
      .from("tables")
      .select("id, name, table_type, seat_count, x, y, rotation, shape_config")
      .eq("wedding_id", access.wedding_id)
      .eq("event_id", eventId)
      .is("deleted_at", null);

    if (tablesError) return internalErrorResponse(tablesError, "GET seating/load — tables");

    // ── 3. Seat assignments ───────────────────────────────────────────────────
    const { data: rawAssignments, error: assignmentsError } = await supabaseServer
      .from("seat_assignments")
      .select(`
        guest_events!inner(guest_id, event_id, wedding_id),
        seats!inner(table_id)
      `)
      .eq("guest_events.event_id", eventId)
      .eq("guest_events.wedding_id", access.wedding_id);

    if (assignmentsError) {
      return internalErrorResponse(assignmentsError, "GET seating/load — assignments");
    }

    const assignmentRows: SeatAssignmentRow[] = (rawAssignments ?? []).map((row: any) => ({
      guest_id: row.guest_events.guest_id,
      table_id: row.seats.table_id,
    }));

    // ── 4. Allocate numeric IDs ────────────────────────────────────────────────
    const guestUuids = guestsForEvent.map((g) => g.id);
    // Include TOATE mesele din DB + cele din assignments (pot fi disjuncte temporar)
    const tableUuids = [...new Set([
      ...(rawTables ?? []).map((t: any) => t.id as string),
      ...assignmentRows.map((a) => a.table_id),
    ])];

    let guestRows: AllocRow[] = [];
    let tableRows: AllocRow[] = [];

    if (guestUuids.length > 0) {
      const { data, error } = await supabaseServer.rpc(
        "allocate_seating_numeric_ids_batch",
        {
          p_wedding_id:   access.wedding_id,
          p_event_id:     eventId,
          p_entity_type:  "guest",
          p_entity_uuids: guestUuids,
          p_caller_uid:   authResult.ctx.app_user_id,
        }
      );
      if (error) return internalErrorResponse(error, "GET seating/load — allocate guests");
      guestRows = data ?? [];
    }

    if (tableUuids.length > 0) {
      const { data, error } = await supabaseServer.rpc(
        "allocate_seating_numeric_ids_batch",
        {
          p_wedding_id:   access.wedding_id,
          p_event_id:     eventId,
          p_entity_type:  "table",
          p_entity_uuids: tableUuids,
          p_caller_uid:   authResult.ctx.app_user_id,
        }
      );
      if (error) return internalErrorResponse(error, "GET seating/load — allocate tables");
      tableRows = data ?? [];
    }

    // ── 5. Upsert seating_id_maps (service_role) ──────────────────────────────
    if (guestRows.length > 0) {
      const { error } = await supabaseServer
        .from("seating_id_maps")
        .upsert(
          guestRows.map((row) => ({
            wedding_id:  access.wedding_id,
            event_id:    eventId,
            entity_type: "guest",
            entity_uuid: row.entity_uuid,
            numeric_id:  row.numeric_id,
          })),
          { onConflict: "wedding_id,event_id,entity_type,entity_uuid" }
        );
      if (error) return internalErrorResponse(error, "GET seating/load — upsert guest maps");
    }

    if (tableRows.length > 0) {
      const { error } = await supabaseServer
        .from("seating_id_maps")
        .upsert(
          tableRows.map((row) => ({
            wedding_id:  access.wedding_id,
            event_id:    eventId,
            entity_type: "table",
            entity_uuid: row.entity_uuid,
            numeric_id:  row.numeric_id,
          })),
          { onConflict: "wedding_id,event_id,entity_type,entity_uuid" }
        );
      if (error) return internalErrorResponse(error, "GET seating/load — upsert table maps");
    }

    // ── 6. Build NumericIdMap + map guests + map tables ───────────────────────
    const idMaps: NumericIdMap = {
      guests:        new Map(guestRows.map((r) => [r.entity_uuid, r.numeric_id])),
      tables:        new Map(tableRows.map((r) => [r.entity_uuid, r.numeric_id])),
      guestsReverse: new Map(guestRows.map((r) => [r.numeric_id, r.entity_uuid])),
      tablesReverse: new Map(tableRows.map((r) => [r.numeric_id, r.entity_uuid])),
    };

    const seatingGuests = mapGuestsToSeating(guestsForEvent, idMaps);
    const withAssignments = applyAssignments(seatingGuests, assignmentRows, idMaps);

    const seatingTables: SeatingTableLoad[] = (rawTables ?? []).map((t: any) => ({
      id:       idMaps.tables.get(t.id) ?? 0,
      uuid:     t.id as string,
      name:     t.name as string,
      type:     t.table_type as string,
      seats:    t.seat_count as number,
      x:        Number(t.x),
      y:        Number(t.y),
      rotation: Number(t.rotation),
      isRing:   (t.shape_config as any)?.is_ring === true,
    }));

    // ── 7. Version (OCC) ─────────────────────────────────────────────────────
    const { data: editorState } = await supabaseServer
      .from("seating_editor_states")
      .select("revision")
      .eq("wedding_id", access.wedding_id)
      .eq("event_id", eventId)
      .maybeSingle();

    const responseBody: SeatingLoadResponse = {
      guests:     withAssignments,
      tables:     seatingTables,
      guestIdMap: guestRows.map((r) => ({ uuid: r.entity_uuid, numericId: r.numeric_id })),
      tableIdMap: tableRows.map((r) => ({ uuid: r.entity_uuid, numericId: r.numeric_id })),
      version:    (editorState as any)?.revision ?? 0,
    };

    return successResponse<SeatingLoadResponse>(responseBody);
  } catch (err) {
    return internalErrorResponse(err, "GET seating/load");
  }
}
