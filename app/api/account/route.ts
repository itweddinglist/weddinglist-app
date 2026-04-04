// =============================================================================
// app/api/account/route.ts
// DELETE /api/account — Ștergere cont GDPR Art. 17
// Flow sincron, best-effort email, soft delete weddings, hard delete identity
// =============================================================================

import { type NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth";
import { createAuthenticatedClient } from "@/lib/supabase-server";
import { sendAccountDeletionEmail } from "@/lib/gdpr/send-deletion-email";
import { wl_audit } from "@/lib/audit/wl-audit";
import {
  successResponse,
  authErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

export async function DELETE(request: NextRequest): Promise<Response> {
  const auth = extractAuth(request);
  if (!auth.authenticated) return authErrorResponse(auth.error.code, auth.error.message);

  const userId = auth.context.userId;
  const requestId = crypto.randomUUID();
  const supabase = createAuthenticatedClient(auth.context.token);

  // ── Step 1: Verifică status curent ────────────────────────────────────────
  const { data: appUser, error: userErr } = await supabase
    .from("app_users")
    .select("id, status, email")
    .eq("id", userId)
    .single();

  if (userErr || !appUser) {
    return errorResponse(404, "USER_NOT_FOUND", "Contul nu a fost găsit.");
  }

  if (appUser.status === "deleting") {
    return errorResponse(409, "DELETION_IN_PROGRESS", "Ștergerea contului este deja în curs.");
  }

  if (appUser.status === "deletion_failed") {
    return errorResponse(409, "DELETION_FAILED", "O ștergere anterioară a eșuat. Contactează suportul.");
  }

  // ── Step 2: Ownership check ────────────────────────────────────────────────
  const { data: memberships, error: memErr } = await supabase
    .from("wedding_members")
    .select("wedding_id, role")
    .eq("app_user_id", userId);

  if (memErr) return internalErrorResponse(memErr, "DELETE /api/account — memberships");

  const ownedWeddings = (memberships ?? []).filter((m: any) => m.role === "owner");

  for (const owned of ownedWeddings) {
    const { data: otherOwners } = await supabase
      .from("wedding_members")
      .select("id")
      .eq("wedding_id", owned.wedding_id)
      .eq("role", "owner")
      .neq("app_user_id", userId);

    if (!otherOwners || otherOwners.length === 0) {
      return errorResponse(
        409,
        "SOLE_OWNER",
        "Nu îți poți șterge contul cât timp ești singurul owner al unui wedding activ. Șterge mai întâi wedding-ul sau transferă ownership."
      );
    }
  }

  // ── Audit: delete requested ───────────────────────────────────────────────
  await wl_audit("account.delete_requested", {
    request_id: requestId,
    actor_type: "user",
    app_user_id: userId,
  });

  // ── Step 3: Marchează 'deleting' ──────────────────────────────────────────
  const { error: statusErr } = await supabase
    .from("app_users")
    .update({ status: "deleting", updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (statusErr) return internalErrorResponse(statusErr, "DELETE /api/account — set deleting");

  try {
    // ── Step 4: Dezactivează RSVP invitations ─────────────────────────────────
    const weddingIds = (memberships ?? []).map((m: any) => m.wedding_id);

    if (weddingIds.length > 0) {
      const { error: rsvpErr } = await supabase
        .from("rsvp_invitations")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("wedding_id", weddingIds);

      if (rsvpErr) {
        await markDeletionFailed(supabase, userId, requestId);
        return internalErrorResponse(rsvpErr, "DELETE /api/account — rsvp_invitations");
      }
    }

    // ── Step 5: Revocă wedding_members ───────────────────────────────────────
    const { error: memberErr } = await supabase
      .from("wedding_members")
      .delete()
      .eq("app_user_id", userId);

    if (memberErr) {
      await markDeletionFailed(supabase, userId, requestId);
      return internalErrorResponse(memberErr, "DELETE /api/account — wedding_members");
    }

    // ── Step 6: Soft delete weddings fără membri rămași ───────────────────────
    for (const weddingId of weddingIds) {
      const { data: remainingMembers } = await supabase
        .from("wedding_members")
        .select("id")
        .eq("wedding_id", weddingId)
        .limit(1);

      if (!remainingMembers || remainingMembers.length === 0) {
        await supabase
          .from("weddings")
          .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", weddingId);
      }
    }

    // ── Step 7: Email confirmare (best-effort) ────────────────────────────────
    if (appUser.email) {
      await sendAccountDeletionEmail({
        to: appUser.email,
        deletedAt: new Date().toISOString(),
      }).catch((e: unknown) => {
        console.error("[Account Delete] Email failed (non-blocking):", e);
      });
    }

    // ── Step 8: Hard delete identity_links ───────────────────────────────────
    const { error: ilErr } = await supabase
      .from("identity_links")
      .delete()
      .eq("app_user_id", userId);

    if (ilErr) {
      await markDeletionFailed(supabase, userId, requestId);
      return internalErrorResponse(ilErr, "DELETE /api/account — identity_links");
    }

    // ── Step 9: Hard delete app_users ────────────────────────────────────────
    const { error: auErr } = await supabase
      .from("app_users")
      .delete()
      .eq("id", userId);

    if (auErr) {
      await markDeletionFailed(supabase, userId, requestId);
      return internalErrorResponse(auErr, "DELETE /api/account — app_users");
    }

    // ── Audit: delete completed ───────────────────────────────────────────────
    await wl_audit("account.delete_completed", {
      request_id: requestId,
      actor_type: "user",
      app_user_id: userId,
    });

    return successResponse({
      success: true,
      message: "Contul tău a fost șters. Accesul tău a fost eliminat.",
    });

  } catch (err: unknown) {
    await markDeletionFailed(supabase, userId, requestId);
    return internalErrorResponse(err, "DELETE /api/account");
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function markDeletionFailed(
  supabase: any,
  userId: string,
  requestId: string
): Promise<void> {
  await supabase
    .from("app_users")
    .update({ status: "deletion_failed", updated_at: new Date().toISOString() })
    .eq("id", userId)
    .catch((e: unknown) => {
      console.error("[Account Delete] Failed to mark deletion_failed:", e);
    });

  await wl_audit("account.delete_failed", {
    request_id: requestId,
    actor_type: "user",
    app_user_id: userId,
    metadata: { reason_code: "deletion_failed" },
  });
}