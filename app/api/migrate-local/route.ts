import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";
import { rateLimit, getClientIp } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

type SeatingGuest = {
  id: number;
  prenume: string;
  nume: string;
  grup: string;
  status: string;
  meniu: string;
  tableId: number | null;
};

type SeatingTable = {
  id: number;
  name: string;
  type: string;
  seats: number;
  x: number;
  y: number;
  rotation: number;
};

type MigrateLocalRequest = {
  app_user_id: string;
  wedding_id: string;
  data: {
    guests: SeatingGuest[];
    tables: SeatingTable[];
    nextId: number;
    cam: { vx: number; vy: number; z: number };
  };
};

type MigrateLocalResponse =
  | { ok: true; status: "completed" | "already_done" | "skipped_has_data" }
  | { ok: false; error: string };

const MIGRATION_KEY = "localstorage_v1";

export async function POST(
  req: NextRequest
): Promise<NextResponse<MigrateLocalResponse>> {
  // Rate limiting
  const ip = getClientIp(req);
  const rl = rateLimit(`migrate:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as MigrateLocalRequest;
    const { app_user_id, wedding_id, data } = body;

    if (!app_user_id || !wedding_id) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Verifică dacă migrarea a fost deja făcută
    const { data: existingMigration } = await supabaseServer
      .from("data_migrations")
      .select("status")
      .eq("wedding_id", wedding_id)
      .eq("migration_key", MIGRATION_KEY)
      .maybeSingle();

    if (
      existingMigration?.status === "completed" ||
      existingMigration?.status === "in_progress"
    ) {
      return NextResponse.json({ ok: true, status: "already_done" });
    }

    // 2. DB wins — dacă există deja guests, nu migrăm
    const { count } = await supabaseServer
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", wedding_id);

    if (count && count > 0) {
      return NextResponse.json({ ok: true, status: "skipped_has_data" });
    }

    // 3. Setăm status in_progress
    await supabaseServer.from("data_migrations").upsert({
      wedding_id,
      migration_key: MIGRATION_KEY,
      status: "in_progress",
      attempt_count: 1,
    });

    // 4. Migrăm guests
    if (data.guests?.length > 0) {
      const guestsToInsert = data.guests.map((g) => ({
        id: String(g.id),
        wedding_id,
        first_name: g.prenume,
        last_name: g.nume || null,
        display_name: `${g.prenume} ${g.nume}`.trim(),
      }));

      await supabaseServer.from("guests").upsert(guestsToInsert, {
        onConflict: "id",
      });
    }

    // 5. Migrăm tables
    if (data.tables?.length > 0) {
      const tablesToInsert = data.tables.map((t) => ({
        id: String(t.id),
        wedding_id,
        name: t.name,
        x: t.x,
        y: t.y,
        seat_count: t.seats,
        rotation: t.rotation ?? 0,
        table_type: t.type ?? "round",
      }));

      await supabaseServer.from("tables").upsert(tablesToInsert, {
        onConflict: "id",
      });
    }

    // 6. Setăm status completed
    await supabaseServer
      .from("data_migrations")
      .update({ status: "completed" })
      .eq("wedding_id", wedding_id)
      .eq("migration_key", MIGRATION_KEY);

    return NextResponse.json({ ok: true, status: "completed" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}