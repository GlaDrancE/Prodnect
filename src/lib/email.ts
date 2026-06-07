// Minimal email layer built on Resend's HTTP API (no SDK dependency).
// If RESEND_API_KEY is unset, sends are skipped and logged — so the cron job
// runs safely in dev without a provider configured.

type SendArgs = {
  to: string;
  subject: string;
  html: string;
};

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export async function sendEmail({
  to,
  subject,
  html,
}: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipped email to ${to}`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function layout(title: string, body: string) {
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
    <h2 style="color:#4f46e5;margin-bottom:8px">${title}</h2>
    <div style="font-size:14px;line-height:1.6;color:#334155">${body}</div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:12px;color:#94a3b8">Sent automatically by your Subscription CRM.</p>
  </div>`;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// Owner: a client is approaching expiry (3-day heads-up).
export function ownerExpiringEmail(p: {
  clientName: string;
  productName: string;
  expiryDate: string;
  daysLeft: number;
}) {
  return {
    subject: `Expiring soon: ${p.clientName} — ${p.productName}`,
    html: layout(
      "Subscription expiring soon",
      `<p><strong>${p.clientName}</strong>'s <strong>${p.productName}</strong>
       subscription expires on <strong>${fmtDate(p.expiryDate)}</strong>
       (in ${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"}).</p>
       <p>Reach out to renew, or plan to remove them when it lapses.</p>`,
    ),
  };
}

// Owner: a client has expired — action needed (remove / follow up).
export function ownerExpiredEmail(p: {
  clientName: string;
  productName: string;
  expiryDate: string;
}) {
  return {
    subject: `Expired: ${p.clientName} — ${p.productName}`,
    html: layout(
      "Subscription expired — action needed",
      `<p><strong>${p.clientName}</strong>'s <strong>${p.productName}</strong>
       subscription expired on <strong>${fmtDate(p.expiryDate)}</strong>.</p>
       <p>Their access period is complete. Remove them or follow up to recharge.</p>`,
    ),
  };
}

// Client: your subscription expired — please recharge.
export function clientExpiredEmail(p: {
  clientName: string;
  productName: string;
  expiryDate: string;
}) {
  return {
    subject: `Your ${p.productName} subscription has expired`,
    html: layout(
      "Your subscription has expired",
      `<p>Hi ${p.clientName},</p>
       <p>Your <strong>${p.productName}</strong> subscription expired on
       <strong>${fmtDate(p.expiryDate)}</strong>.</p>
       <p>To keep your access active, please recharge/renew at your earliest
       convenience. Reply to this email if you'd like help.</p>`,
    ),
  };
}
