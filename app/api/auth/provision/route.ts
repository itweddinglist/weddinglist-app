import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabase/server";
import { rateLimit, getClientIp } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

type ProvisionRequest = {
  wp_user_id: number;
  email: string;
  display_name: string;
};

type ProvisionResponse =
  | { ok: true; app_user_id: string; created: boolean }
  | { ok: false; error: string };

export async function POST(
  req: NextRequest
): Promise<NextResponse<ProvisionResponse>> {
  // Rate limiting
  const ip = getClientIp(req);
  const rl = rateLimit(`provision:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as ProvisionRequest;
    const { wp_user_id, email, display_name: _display_name } = body;

    if (!wp_user_id || !email) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Cautăm identity_link existent
    const { data: existingLink, error: linkError } = await supabaseServer
      .from("identity_links")
      .select("app_user_id")
      .eq("provider", "wordpress")
      .eq("external_user_id", String(wp_user_id))
      .maybeSingle();

    if (linkError) {
      return NextResponse.json(
        { ok: false, error: linkError.message },
        { status: 500 }
      );
    }

    // 2. User există deja — returnăm
    if (existingLink?.app_user_id) {
      return NextResponse.json({
        ok: true,
        app_user_id: existingLink.app_user_id,
        created: false,
      });
    }

    // 3. Creăm app_user nou
    const { data: newUser, error: userError } = await supabaseServer
      .from("app_users")
      .insert({ email })
      .select("id")
      .single();

    if (userError || !newUser) {
      return NextResponse.json(
        { ok: false, error: userError?.message ?? "Failed to create user" },
        { status: 500 }
      );
    }

    // 4. Creăm identity_link
    const { error: identityError } = await supabaseServer
      .from("identity_links")
      .insert({
        app_user_id: newUser.id,
        provider: "wordpress",
        external_user_id: String(wp_user_id),
      });

    if (identityError) {
      return NextResponse.json(
        { ok: false, error: identityError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      app_user_id: newUser.id,
      created: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}