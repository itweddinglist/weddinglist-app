// =============================================================================
// lib/export/json-export.ts
// Logică pură pentru export JSON — Faza 8.1
// Queries separate per tabel, ordonare deterministă
// Token-uri RSVP excluse — token_hash nu se exportă niciodată
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export const EXPORT_FORMAT = "weddinglist-export";
export const EXPORT_SCHEMA_VERSION = "1.0";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeddingExport {
  format: typeof EXPORT_FORMAT;
  schema_version: typeof EXPORT_SCHEMA_VERSION;
  exported_at: string;
  wedding_id: string;
  counts: ExportCounts;
  data: ExportData;
}

export interface ExportCounts {
  events: number;
  guests: number;
  guest_events: number;
  guest_groups: number;
  tables: number;
  seats: number;
  seat_assignments: number;
  budget_items: number;
  payments: number;
  rsvp_invitations: number;
  rsvp_responses: number;
}

export interface ExportData {
  wedding: Record<string, unknown>;
  events: Record<string, unknown>[];
  guests: Record<string, unknown>[];
  guest_events: Record<string, unknown>[];
  guest_groups: Record<string, unknown>[];
  tables: Record<string, unknown>[];
  seats: Record<string, unknown>[];
  seat_assignments: Record<string, unknown>[];
  budget_items: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  rsvp_invitations: Record<string, unknown>[];
  rsvp_responses: Record<string, unknown>[];
}

export type ExportResult =
  | { success: true; data: WeddingExport }
  | { success: false; error: string };

// ─── Slugify ──────────────────────────────────────────────────────────────────

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function buildExportFilename(weddingTitle: string, exportedAt: string): string {
  const slug = slugifyTitle(weddingTitle);
  const date = exportedAt.slice(0, 10); // YYYY-MM-DD
  return `weddinglist-export-${slug}-${date}.json`;
}

// ─── Export function ──────────────────────────────────────────────────────────

export async function exportWeddingJson(
  supabase: SupabaseClient,
  weddingId: string
): Promise<ExportResult> {
  try {
    // ── Wedding ──────────────────────────────────────────────────────────────
    const { data: wedding, error: wErr } = await supabase
      .from("weddings")
      .select("*")
      .eq("id", weddingId)
      .single();

    if (wErr || !wedding) {
      return { success: false, error: "Wedding not found." };
    }

    // ── Events ───────────────────────────────────────────────────────────────
    const { data: events, error: evErr } = await supabase
      .from("events")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (evErr) return { success: false, error: "Failed to export events." };

    // ── Guest Groups ──────────────────────────────────────────────────────────
    const { data: guestGroups, error: ggErr } = await supabase
      .from("guest_groups")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (ggErr) return { success: false, error: "Failed to export guest groups." };

    // ── Guests ────────────────────────────────────────────────────────────────
    const { data: guests, error: gErr } = await supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (gErr) return { success: false, error: "Failed to export guests." };

    // ── Guest Events ──────────────────────────────────────────────────────────
    const { data: guestEvents, error: geErr } = await supabase
      .from("guest_events")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (geErr) return { success: false, error: "Failed to export guest events." };

    // ── Tables ────────────────────────────────────────────────────────────────
    const { data: tables, error: tErr } = await supabase
      .from("tables")
      .select("*")
      .eq("wedding_id", weddingId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (tErr) return { success: false, error: "Failed to export tables." };

    // ── Seats ─────────────────────────────────────────────────────────────────
    const { data: seats, error: sErr } = await supabase
      .from("seats")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (sErr) return { success: false, error: "Failed to export seats." };

    // ── Seat Assignments ──────────────────────────────────────────────────────
    const { data: seatAssignments, error: saErr } = await supabase
      .from("seat_assignments")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (saErr) return { success: false, error: "Failed to export seat assignments." };

    // ── Budget Items ──────────────────────────────────────────────────────────
    const { data: budgetItems, error: biErr } = await supabase
      .from("budget_items")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (biErr) return { success: false, error: "Failed to export budget items." };

    // ── Payments ──────────────────────────────────────────────────────────────
    const { data: payments, error: pErr } = await supabase
      .from("payments")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (pErr) return { success: false, error: "Failed to export payments." };

    // ── RSVP Invitations (fără token_hash) ────────────────────────────────────
    const { data: rsvpInvitations, error: riErr } = await supabase
      .from("rsvp_invitations")
      .select("id, wedding_id, event_id, guest_id, delivery_channel, delivery_status, opened_at, sent_at, last_sent_at, responded_at, is_active, created_at, updated_at")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (riErr) return { success: false, error: "Failed to export RSVP invitations." };

    // ── RSVP Responses ────────────────────────────────────────────────────────
    const { data: rsvpResponses, error: rrErr } = await supabase
      .from("rsvp_responses")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (rrErr) return { success: false, error: "Failed to export RSVP responses." };

    // ── Asamblare export ──────────────────────────────────────────────────────
    const exportedAt = new Date().toISOString();

    const data: ExportData = {
      wedding,
      events: events ?? [],
      guests: guests ?? [],
      guest_events: guestEvents ?? [],
      guest_groups: guestGroups ?? [],
      tables: tables ?? [],
      seats: seats ?? [],
      seat_assignments: seatAssignments ?? [],
      budget_items: budgetItems ?? [],
      payments: payments ?? [],
      rsvp_invitations: rsvpInvitations ?? [],
      rsvp_responses: rsvpResponses ?? [],
    };

    const counts: ExportCounts = {
      events: data.events.length,
      guests: data.guests.length,
      guest_events: data.guest_events.length,
      guest_groups: data.guest_groups.length,
      tables: data.tables.length,
      seats: data.seats.length,
      seat_assignments: data.seat_assignments.length,
      budget_items: data.budget_items.length,
      payments: data.payments.length,
      rsvp_invitations: data.rsvp_invitations.length,
      rsvp_responses: data.rsvp_responses.length,
    };

    return {
      success: true,
      data: {
        format: EXPORT_FORMAT,
        schema_version: EXPORT_SCHEMA_VERSION,
        exported_at: exportedAt,
        wedding_id: weddingId,
        counts,
        data,
      },
    };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}