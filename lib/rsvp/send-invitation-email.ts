// =============================================================================
// lib/rsvp/send-invitation-email.ts
// Email stub pentru RSVP — Faza 7.4
// BLOCAT: RESEND_API_KEY neconfigurat în Vercel
// Codul e complet — activat când cheia e adăugată în Vercel env vars
// =============================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.weddinglist.ro";

export interface RsvpEmailPayload {
  to: string;
  guestName: string;
  coupleNames: string;
  weddingDate: string | null;
  rsvpToken: string; // tokenul RAW — nu hash-ul
}

export interface EmailResult {
  sent: boolean;
  reason?: "no_api_key" | "send_failed";
  error?: string;
}

/**
 * Trimite email de invitație RSVP via Resend.
 * Dacă RESEND_API_KEY lipsește → log warning, returnează { sent: false }.
 * Zero erori în producție din cauza cheii lipsă.
 *
 * Activare: adaugă RESEND_API_KEY în Vercel Dashboard → Settings → Env Vars
 */
export async function sendRsvpInvitationEmail(
  payload: RsvpEmailPayload
): Promise<EmailResult> {
  // ── Stub guard ─────────────────────────────────────────────────────────────
  if (!RESEND_API_KEY) {
    console.warn(
      "[RSVP Email] RESEND_API_KEY not configured — email not sent. " +
      "Add RESEND_API_KEY to Vercel env vars to activate."
    );
    return { sent: false, reason: "no_api_key" };
  }

  const rsvpUrl = `${APP_URL}/rsvp/${payload.rsvpToken}`;

  const subject = `Invitație la nunta ${payload.coupleNames}`;

  const html = buildEmailHtml({
  guestName: payload.guestName,
  coupleNames: payload.coupleNames,
  weddingDate: payload.weddingDate,
  rsvpUrl,
  subject,
});

  // ── Send via Resend ────────────────────────────────────────────────────────
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WeddingList <noreply@weddinglist.ro>",
        to: [payload.to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("[RSVP Email] Resend error:", err);
      return { sent: false, reason: "send_failed", error: JSON.stringify(err) };
    }

    return { sent: true };
  } catch (err: any) {
    console.error("[RSVP Email] Network error:", err);
    return { sent: false, reason: "send_failed", error: err.message };
  }
}

// ─── Email HTML builder ───────────────────────────────────────────────────────

function buildEmailHtml(params: {
  guestName: string;
  coupleNames: string;
  weddingDate: string | null;
  rsvpUrl: string;
  subject: string;
}): string {
  const { guestName, coupleNames, weddingDate, rsvpUrl, subject } = params;
  const dateText = weddingDate
    ? new Date(weddingDate).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F5F2EE;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EE;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1E2340;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:14px;color:#C9907A;letter-spacing:0.1em;text-transform:uppercase;">
                wedding<em>list</em>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 40px;">
              <h1 style="margin:0 0 8px;font-size:32px;font-weight:300;color:#1E2340;font-family:Georgia,serif;">
                Bună, ${guestName}!
              </h1>
              <p style="margin:0 0 32px;font-size:16px;color:#6E7490;line-height:1.6;">
                Ne-ar face mare plăcere să fii alături de noi la nunta
                <strong style="color:#1E2340;">${coupleNames}</strong>
                ${dateText ? `pe <strong style="color:#1E2340;">${dateText}</strong>` : ""}.
              </p>

              <p style="margin:0 0 24px;font-size:15px;color:#6E7490;line-height:1.6;">
                Te rugăm să confirmi participarea accesând linkul de mai jos:
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 40px;">
                <tr>
                  <td style="background:#C9907A;border-radius:999px;padding:14px 32px;">
                    <a href="${rsvpUrl}"
                       style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;letter-spacing:0.03em;">
                      Confirmă participarea →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9DA3BC;line-height:1.6;">
                Sau copiază linkul în browser:<br>
                <a href="${rsvpUrl}" style="color:#C9907A;word-break:break-all;">${rsvpUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F5F2EE;padding:24px 40px;text-align:center;border-top:1px solid #E8DDD0;">
              <p style="margin:0;font-size:12px;color:#9DA3BC;">
                Ai primit acest email pentru că ești invitat la nunta ${coupleNames}.<br>
                Dacă crezi că e o eroare, poți ignora acest mesaj.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}