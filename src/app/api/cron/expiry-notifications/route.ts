import { NextResponse, type NextRequest } from "next/server";
import { runExpiryNotifications } from "@/lib/notifications";

// Daily job: scans for expiring/expired subscriptions and sends notifications.
// Triggered by Vercel Cron (see vercel.json). Vercel automatically sends the
// CRON_SECRET as a Bearer token; we verify it so the endpoint can't be abused.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Allow manual trigger with ?secret=... for local testing.
  if (request.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runExpiryNotifications();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
