// =============================================================================
// lib/import/json-import.ts
// Import JSON — Faza 8.2
// Creează întotdeauna un wedding NOU — niciodată merge în wedding existent
// ID Map complet pentru remaparea tuturor relațiilor
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeText } from "@/lib/sanitize";
import type { WeddingExport } from "@/lib/export/json-export";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportIdMap {
  wedding: string;
  events: Map<string, string>;
  guest_groups: Map<string, string>;
  guests: Map<string, string>;
  guest_events: Map<string, string>;
  tables: Map<string, string>;
  seats: Map<string, string>;
  budget_items: Map<string, string>;
  rsvp_invitations: Map<string, string>;
  rsvp_responses: Map<string, string>;
}

export interface ImportResult {
  success: true;
  new_wedding_id: string;
  counts: Record<string, number>;
}

export interface ImportError {
  success: false;
  error: string;
  step?: string;
}

export type ImportOutcome = ImportResult | ImportError;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newId(): string {
  return crypto.randomUUID();
}

function remap(map: Map<string, string>, oldId: string | null | undefined): string | null {
  if (!oldId) return null;
  return map.get(oldId) ?? null;
}

function buildImportTitle(originalTitle: string, existingTitles: string[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = `${sanitizeText(originalTitle, 200) ?? "Nuntă"} (Import ${date})`;

  if (!existingTitles.includes(base)) return base;

  let counter = 2;
  while (existingTitles.includes(`${base} #${counter}`)) {
    counter++;
  }
  return `${base} #${counter}`;
}

// ─── Main import function ─────────────────────────────────────────────────────

export async function importWeddingJson(
  supabase: SupabaseClient,
  exportData: WeddingExport,
  appUserId: string
): Promise<ImportOutcome> {

  const { data: d } = exportData;
  const idMap: ImportIdMap = {
    wedding: newId(),
    events: new Map(),
    guest_groups: new Map(),
    guests: new Map(),
    guest_events: new Map(),
    tables: new Map(),
    seats: new Map(),
    budget_items: new Map(),
    rsvp_invitations: new Map(),
    rsvp_responses: new Map(),
  };

  // ── Fetch titluri existente pentru naming ─────────────────────────────────
  const { data: existingWeddings } = await supabase
    .from("weddings")
    .select("title");
  const existingTitles = (existingWeddings ?? []).map((w: any) => w.title);

  const importTitle = buildImportTitle(
    (d.wedding as any)?.title ?? "Nuntă",
    existingTitles
  );

  let currentStep = "wedding";

  try {
    // ── 1. Wedding ─────────────────────────────────────────────────────────
    currentStep = "wedding";
    const { error: wErr } = await supabase.from("weddings").insert({
      id: idMap.wedding,
      title: importTitle,
      status: "draft",
      event_date: (d.wedding as any)?.event_date ?? null,
      location_name: sanitizeText((d.wedding as any)?.location_name, 200),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (wErr) return { success: false, error: wErr.message, step: currentStep };

    // ── 2. Wedding member ──────────────────────────────────────────────────
    currentStep = "wedding_members";
    const { error: wmErr } = await supabase.from("wedding_members").insert({
      id: newId(),
      wedding_id: idMap.wedding,
      app_user_id: appUserId,
      role: "owner",
      created_at: new Date().toISOString(),
    });
    if (wmErr) return await markFailed(supabase, idMap.wedding, wmErr.message, currentStep);

    // ── 3. Events ──────────────────────────────────────────────────────────
    currentStep = "events";
    for (const ev of d.events) {
      const newEventId = newId();
      idMap.events.set((ev as any).id, newEventId);
      const { error } = await supabase.from("events").insert({
        id: newEventId,
        wedding_id: idMap.wedding,
        name: sanitizeText((ev as any).name, 200) ?? "Eveniment",
        event_type: (ev as any).event_type ?? "ceremony",
        starts_at: (ev as any).starts_at ?? null,
        ends_at: (ev as any).ends_at ?? null,
        location_name: sanitizeText((ev as any).location_name, 200),
        sort_order: (ev as any).sort_order ?? 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── 4. Guest Groups ────────────────────────────────────────────────────
    currentStep = "guest_groups";
    for (const gg of d.guest_groups) {
      const newGgId = newId();
      idMap.guest_groups.set((gg as any).id, newGgId);
      const { error } = await supabase.from("guest_groups").insert({
        id: newGgId,
        wedding_id: idMap.wedding,
        name: sanitizeText((gg as any).name, 100) ?? "Grup",
        notes: sanitizeText((gg as any).notes, 500),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── 5. Guests ──────────────────────────────────────────────────────────
    currentStep = "guests";
    for (const g of d.guests) {
      const newGuestId = newId();
      idMap.guests.set((g as any).id, newGuestId);
      const { error } = await supabase.from("guests").insert({
        id: newGuestId,
        wedding_id: idMap.wedding,
        first_name: sanitizeText((g as any).first_name, 100) ?? "Invitat",
        last_name: sanitizeText((g as any).last_name, 100),
        display_name: sanitizeText((g as any).display_name, 200) ?? "Invitat",
        email: sanitizeText((g as any).email, 200),
        phone: sanitizeText((g as any).phone, 50),
        notes: sanitizeText((g as any).notes, 500),
        side: (g as any).side ?? null,
        group_id: remap(idMap.guest_groups, (g as any).group_id),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── 6. Guest Events ────────────────────────────────────────────────────
    currentStep = "guest_events";
    for (const ge of d.guest_events) {
      const newGeId = newId();
      idMap.guest_events.set((ge as any).id, newGeId);
      const newGuestId = remap(idMap.guests, (ge as any).guest_id);
      const newEventId = remap(idMap.events, (ge as any).event_id);
      if (!newGuestId || !newEventId) continue;
      const { error } = await supabase.from("guest_events").insert({
        id: newGeId,
        wedding_id: idMap.wedding,
        guest_id: newGuestId,
        event_id: newEventId,
        attendance_status: (ge as any).attendance_status ?? "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── 7. Tables ──────────────────────────────────────────────────────────
    currentStep = "tables";
    for (const t of d.tables) {
      const newTableId = newId();
      idMap.tables.set((t as any).id, newTableId);
      const { error } = await supabase.from("tables").insert({
        id: newTableId,
        wedding_id: idMap.wedding,
        name: sanitizeText((t as any).name, 200) ?? "Masă",
        type: (t as any).type ?? "round",
        seat_count: (t as any).seat_count ?? 8,
        x: (t as any).x ?? 0,
        y: (t as any).y ?? 0,
        rotation: (t as any).rotation ?? 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── 8. Seats ───────────────────────────────────────────────────────────
    currentStep = "seats";
    for (const s of d.seats) {
      const newSeatId = newId();
      idMap.seats.set((s as any).id, newSeatId);
      const newTableId = remap(idMap.tables, (s as any).table_id);
      if (!newTableId) continue;
      const { error } = await supabase.from("seats").insert({
        id: newSeatId,
        wedding_id: idMap.wedding,
        table_id: newTableId,
        seat_index: (s as any).seat_index ?? 0,
        created_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── 9. Seat Assignments ────────────────────────────────────────────────
    currentStep = "seat_assignments";
    for (const sa of d.seat_assignments) {
      const newSeatId = remap(idMap.seats, (sa as any).seat_id);
      const newGuestEventId = remap(idMap.guest_events, (sa as any).guest_event_id);
      if (!newSeatId || !newGuestEventId) continue;
      const { error } = await supabase.from("seat_assignments").insert({
        id: newId(),
        wedding_id: idMap.wedding,
        seat_id: newSeatId,
        guest_event_id: newGuestEventId,
        created_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── 10. Budget Items ───────────────────────────────────────────────────
    currentStep = "budget_items";
    for (const bi of d.budget_items) {
      const newBiId = newId();
      idMap.budget_items.set((bi as any).id, newBiId);
      const { error } = await supabase.from("budget_items").insert({
        id: newBiId,
        wedding_id: idMap.wedding,
        name: sanitizeText((bi as any).name, 200) ?? "Item",
        estimated_amount: (bi as any).estimated_amount ?? 0,
        actual_amount: (bi as any).actual_amount ?? null,
        currency: (bi as any).currency ?? "RON",
        status: (bi as any).status ?? "planned",
        notes: sanitizeText((bi as any).notes, 500),
        sort_order: (bi as any).sort_order ?? 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── 11. Payments ───────────────────────────────────────────────────────
    currentStep = "payments";
    for (const p of d.payments) {
      const newBiId = remap(idMap.budget_items, (p as any).budget_item_id);
      if (!newBiId) continue;
      const { error } = await supabase.from("payments").insert({
        id: newId(),
        wedding_id: idMap.wedding,
        budget_item_id: newBiId,
        amount: (p as any).amount ?? 0,
        currency: (p as any).currency ?? "RON",
        paid_at: (p as any).paid_at ?? null,
        notes: sanitizeText((p as any).notes, 500),
        created_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── 12. RSVP Invitations (fără token) ─────────────────────────────────
    currentStep = "rsvp_invitations";
    for (const ri of d.rsvp_invitations) {
      const newRiId = newId();
      idMap.rsvp_invitations.set((ri as any).id, newRiId);
      const newGuestId = remap(idMap.guests, (ri as any).guest_id);
      const { error } = await supabase.from("rsvp_invitations").insert({
        id: newRiId,
        wedding_id: idMap.wedding,
        guest_id: newGuestId,
        token_hash: crypto.randomUUID(), // token nou generat — cel original nu se restaurează
        delivery_channel: (ri as any).delivery_channel ?? null,
        delivery_status: "draft",
        opened_at: (ri as any).opened_at ?? null,
        last_sent_at: (ri as any).last_sent_at ?? null,
        is_active: false, // linkurile trebuie regenerate explicit
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── 13. RSVP Responses ────────────────────────────────────────────────
    currentStep = "rsvp_responses";
    for (const rr of d.rsvp_responses) {
      const newRrId = newId();
      idMap.rsvp_responses.set((rr as any).id, newRrId);
      const newGeId = remap(idMap.guest_events, (rr as any).guest_event_id);
      const newRiId = remap(idMap.rsvp_invitations, (rr as any).invitation_id);
      if (!newGeId) continue;
      const { error } = await supabase.from("rsvp_responses").insert({
        id: newRrId,
        wedding_id: idMap.wedding,
        event_id: remap(idMap.events, (rr as any).event_id),
        invitation_id: newRiId,
        guest_event_id: newGeId,
        status: (rr as any).status ?? "pending",
        meal_choice: (rr as any).meal_choice ?? null,
        dietary_notes: sanitizeText((rr as any).dietary_notes, 500),
        note: sanitizeText((rr as any).note, 500),
        rsvp_source: "import",
        responded_at: (rr as any).responded_at ?? new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      if (error) return await markFailed(supabase, idMap.wedding, error.message, currentStep);
    }

    // ── Counts ────────────────────────────────────────────────────────────
    const counts = {
      events: d.events.length,
      guests: d.guests.length,
      guest_events: d.guest_events.length,
      guest_groups: d.guest_groups.length,
      tables: d.tables.length,
      seats: d.seats.length,
      seat_assignments: d.seat_assignments.length,
      budget_items: d.budget_items.length,
      payments: d.payments.length,
      rsvp_invitations: d.rsvp_invitations.length,
      rsvp_responses: d.rsvp_responses.length,
    };

    return { success: true, new_wedding_id: idMap.wedding, counts };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await markFailed(supabase, idMap.wedding, message, currentStep);
    return { success: false, error: message, step: currentStep };
  }
}

// ─── Mark Failed ──────────────────────────────────────────────────────────────

async function markFailed(
  supabase: SupabaseClient,
  weddingId: string,
  error: string,
  step: string
): Promise<ImportError> {
  await supabase
    .from("weddings")
    .update({
      title: `[Import eșuat] Wedding`,
      status: "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", weddingId);

  return { success: false, error, step };
}