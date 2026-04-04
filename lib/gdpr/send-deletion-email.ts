// =============================================================================
// lib/gdpr/send-deletion-email.ts
// Email confirmare ștergere cont — GDPR Art. 17
// Best-effort — nu blochează flow-ul de delete
// =============================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.weddinglist.ro";

export interface DeletionEmailPayload {
  to: string;
  deletedAt: string;
}

export interface DeletionEmailResult {
  sent: boolean;
  reason?: "no_api_key" | "send_failed";
  error?: string;
}

export async function sendAccountDeletionEmail(
  payload: DeletionEmailPayload
): Promise<DeletionEmailResult> {
  if (!RESEND_API_KEY) {
    console.warn("[GDPR Email] RESEND_API_KEY not configured — email not sent.");
    return { sent: false, reason: "no_api_key" };
  }

  const deletedAtFormatted = new Date(payload.deletedAt).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>Contul tău a fost închis</title>
</head>
<body style="margin:0;padding:0;background:#F5F2EE;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EE;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1E2340;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:14px;color:#C9907A;letter-spacing:0.1em;text-transform:uppercase;">
                wedding<em>list</em>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:48px 40px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:300;color:#1E2340;font-family:Georgia,serif;">
                Contul tău a fost închis
              </h1>
              <p style="margin:0 0 16px;font-size:15px;color:#6E7490;line-height:1.6;">
                Contul tău WeddingList a fost închis și accesul tău a fost eliminat.
                Datele asociate au fost șterse sau eliminate din accesul activ conform politicii noastre.
              </p>
              <p style="margin:0 0 32px;font-size:14px;color:#9DA3BC;">
                Data: <strong style="color:#1E2340;">${deletedAtFormatted}</strong>
              </p>
              <p style="margin:0;font-size:13px;color:#9DA3BC;line-height:1.6;padding:16px;background:#F5F2EE;border-radius:8px;">
                Dacă nu ai inițiat această acțiune sau crezi că e o eroare,
                contactează suportul nostru imediat la
                <a href="mailto:support@weddinglist.ro" style="color:#C9907A;">support@weddinglist.ro</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F5F2EE;padding:24px 40px;text-align:center;border-top:1px solid #E8DDD0;">
              <p style="margin:0;font-size:12px;color:#9DA3BC;">
                ${APP_URL}
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
        subject: "Contul tău WeddingList a fost închis",
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("[GDPR Email] Resend error:", err);
      return { sent: false, reason: "send_failed", error: JSON.stringify(err) };
    }

    return { sent: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GDPR Email] Network error:", message);
    return { sent: false, reason: "send_failed", error: message };
  }
}