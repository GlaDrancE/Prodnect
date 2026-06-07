import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  ownerExpiringEmail,
  ownerExpiredEmail,
  clientExpiredEmail,
} from "@/lib/email";

const DAY_MS = 86_400_000;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round(
    (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) /
      DAY_MS,
  );
}

export type NotificationRunSummary = {
  scanned: number;
  remindersSent: number;
  expiryNoticesSent: number;
  clientEmailsSent: number;
  autoExpired: number;
  skipped: number;
  errors: string[];
};

type SubRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  expiry_date: string;
  status: string;
  clients: { name: string; email: string | null } | null;
  products: { name: string } | null;
  workspaces: { owner_id: string; name: string } | null;
};

// Scans all workspaces for subscriptions that are expiring within 3 days or
// already past due, emails the owner (and the client on expiry), records each
// send so it never repeats, and auto-flips lapsed subscriptions to "expired".
export async function runExpiryNotifications(): Promise<NotificationRunSummary> {
  const supabase = createAdminClient();
  const today = todayUTC();
  const horizon = new Date(Date.now() + 3 * DAY_MS).toISOString().slice(0, 10);

  const summary: NotificationRunSummary = {
    scanned: 0,
    remindersSent: 0,
    expiryNoticesSent: 0,
    clientEmailsSent: 0,
    autoExpired: 0,
    skipped: 0,
    errors: [],
  };

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, workspace_id, client_id, expiry_date, status, clients(name,email), products(name), workspaces(owner_id,name)",
    )
    .eq("status", "active")
    .lte("expiry_date", horizon);

  if (error) {
    summary.errors.push(`fetch subscriptions: ${error.message}`);
    return summary;
  }

  const subs = (data ?? []) as unknown as SubRow[];
  summary.scanned = subs.length;

  // Cache owner emails per workspace to avoid repeated admin lookups.
  const ownerEmailCache = new Map<string, string | null>();
  async function ownerEmail(ownerId: string): Promise<string | null> {
    if (ownerEmailCache.has(ownerId)) return ownerEmailCache.get(ownerId)!;
    const { data: u } = await supabase.auth.admin.getUserById(ownerId);
    const email = u?.user?.email ?? null;
    ownerEmailCache.set(ownerId, email);
    return email;
  }

  for (const sub of subs) {
    const productName = sub.products?.name ?? "subscription";
    const clientName = sub.clients?.name ?? "Client";
    const expiry = sub.expiry_date;
    const daysLeft = daysBetween(today, expiry);
    const kind: "reminder_3d" | "expiry" = daysLeft <= 0 ? "expiry" : "reminder_3d";

    // Dedupe: have we already logged this (subscription, kind, expiry)?
    const { data: existing } = await supabase
      .from("notification_log")
      .select("id")
      .eq("subscription_id", sub.id)
      .eq("kind", kind)
      .eq("expiry_date", expiry)
      .maybeSingle();

    if (existing) {
      summary.skipped++;
      continue;
    }

    let ownerSent = false;
    let clientSent = false;

    const ownerTo = sub.workspaces ? await ownerEmail(sub.workspaces.owner_id) : null;

    if (kind === "reminder_3d") {
      if (ownerTo) {
        const tpl = ownerExpiringEmail({ clientName, productName, expiryDate: expiry, daysLeft });
        const r = await sendEmail({ to: ownerTo, ...tpl });
        ownerSent = r.ok;
        if (r.error) summary.errors.push(`owner reminder ${sub.id}: ${r.error}`);
      }
      if (ownerSent) summary.remindersSent++;
    } else {
      // expiry: notify owner + client, and auto-expire the subscription
      if (ownerTo) {
        const tpl = ownerExpiredEmail({ clientName, productName, expiryDate: expiry });
        const r = await sendEmail({ to: ownerTo, ...tpl });
        ownerSent = r.ok;
        if (r.error) summary.errors.push(`owner expiry ${sub.id}: ${r.error}`);
      }
      if (ownerSent) summary.expiryNoticesSent++;

      const clientTo = sub.clients?.email ?? null;
      if (clientTo) {
        const tpl = clientExpiredEmail({ clientName, productName, expiryDate: expiry });
        const r = await sendEmail({ to: clientTo, ...tpl });
        clientSent = r.ok;
        if (clientSent) summary.clientEmailsSent++;
        if (r.error) summary.errors.push(`client expiry ${sub.id}: ${r.error}`);
      }

      const { error: upErr } = await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", sub.id);
      if (upErr) summary.errors.push(`auto-expire ${sub.id}: ${upErr.message}`);
      else summary.autoExpired++;
    }

    // Record the attempt so it never repeats for this expiry cycle.
    const { error: logErr } = await supabase.from("notification_log").insert({
      workspace_id: sub.workspace_id,
      subscription_id: sub.id,
      kind,
      expiry_date: expiry,
      owner_email_sent: ownerSent,
      client_email_sent: clientSent,
    });
    if (logErr) summary.errors.push(`log ${sub.id}: ${logErr.message}`);
  }

  return summary;
}
