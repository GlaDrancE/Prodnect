# Subscription CRM

Manage clients, sell subscription products (Netflix, Prime, YouTube Premium, software), track expiry and credentials, auto-calculate profit, and generate invoices.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS).

This is **Phase 1, Step 1**: project scaffold, authentication, automatic workspace creation on signup, the full database schema, and a dashboard shell.

---

## 1. Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project

## 2. Install

```bash
npm install
```

## 3. Configure environment

Copy the example file and fill in values from your Supabase project
(**Project Settings → API**):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # "publishable key" (sb_publishable_...), formerly the anon key
SUPABASE_SERVICE_ROLE_KEY=...        # the "secret key" (sb_secret_...), server-only, used later
CREDENTIAL_ENCRYPTION_KEY=...        # used later for credential encryption
```

## 4. Apply the database schema

Open the Supabase **SQL Editor**, paste the contents of
`supabase/migrations/0001_init.sql`, and run it.

This creates all tables, Row-Level Security policies, reporting views, and a
trigger that — on every new signup — automatically creates a workspace, a
profile, and three starter products (Netflix, Amazon Prime, YouTube Premium).

> **Tip — smoother dev signups:** in **Authentication → Providers → Email**,
> turn off *Confirm email* so new accounts sign in immediately. Re-enable it
> before going to production.

## 5. Run

```bash
npm run dev
```

Open http://localhost:3000 → you'll be redirected to **/login**. Create an
account at **/signup** (name + workspace + email + password), and you'll land
on the dashboard.

---

## What's included

```
src/
  app/
    (auth)/          login, signup, server actions (login/signup/signout)
    (app)/           protected area: layout with nav + dashboard
    page.tsx         redirects to /dashboard or /login
  lib/supabase/      browser, server, and middleware clients (@supabase/ssr)
  lib/database.types.ts   typed schema (regenerate with `supabase gen types`)
  middleware.ts      refreshes session + guards protected routes
supabase/migrations/
  0001_init.sql      full schema, RLS, views, triggers
```

### Data model highlights

- **Multi-tenant.** Every table carries `workspace_id`; RLS guarantees one
  workspace can never read another's rows.
- **Profit is a generated column** (`sell_price - cost_price`) — it can't drift.
- **Prices are snapshotted** onto each subscription at sale time, so editing the
  product catalog never rewrites historical profit.
- **Reporting views** (`v_client_totals`, `v_workspace_summary`) power the
  dashboard in a single query and respect RLS (`security_invoker`).

---

## Expiry notifications

A daily job emails you (the owner) and your clients about expiring subscriptions,
and shows a **"Needs attention"** panel on the dashboard.

**When it fires (per subscription):**

- **3 days before expiry** → email to you ("expiring soon").
- **On / past expiry** → email to you ("expired — remove or follow up"), email to
  the client ("your subscription expired, please recharge"), and the subscription
  is auto-flipped to `expired`.

Each notice is sent once per expiry cycle (tracked in `notification_log`), so it
never spams. Renewing a subscription to a new `expiry_date` re-arms the reminders.

**Setup:**

1. Apply `supabase/migrations/0002_notifications.sql` in the Supabase SQL Editor.
2. Add env vars (see `.env.example`): `RESEND_API_KEY`, `EMAIL_FROM`,
   `CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY`.
   - Sign up at [resend.com](https://resend.com) for a free API key. To email
     real clients you must verify a sending domain; until then use
     `onboarding@resend.dev`, which only delivers to your own account address.
   - If `RESEND_API_KEY` is omitted, emails are skipped (logged) and the job
     still runs — handy for local testing.
3. On Vercel, `vercel.json` registers the cron (`/api/cron/expiry-notifications`,
   daily at 09:00 UTC). Vercel sends `CRON_SECRET` automatically; the route
   rejects anything without it.

**Test it manually:**

```bash
curl "http://localhost:3000/api/cron/expiry-notifications?secret=YOUR_CRON_SECRET"
```

Returns a JSON summary (`scanned`, `remindersSent`, `expiryNoticesSent`,
`clientEmailsSent`, `autoExpired`, `skipped`, `errors`).

> Notifications act on **subscription** rows. The sell-a-subscription UI is the
> next roadmap step; until then you can insert test subscriptions via SQL to see
> the panel and emails work.

---

## Invoices

Create an invoice for a client by selecting products from your catalog. Each line
auto-fills its description and price from the product (both editable), with live
subtotal, tax, and total. Saving assigns a sequential number (`INV-YYYY-0001` via
the `next_invoice_number` DB function) and stores the line items.

Each invoice has a **Download PDF** button that streams a professionally styled
PDF — workspace header, billed-to client details, itemized table, and totals —
generated on demand at `/api/invoices/[id]/pdf` (RLS-protected). You can also
mark an invoice **sent** or **paid**, or delete it.

> **Install the PDF library** before using this feature:
>
> ```bash
> npm install
> ```
>
> (adds `@react-pdf/renderer`, already listed in `package.json`).

---

## Roadmap (next steps)

- ✅ Clients CRUD
- ✅ Products CRUD
- ✅ Expiry notifications (owner + client emails, in-app alerts)
- ✅ Invoices + PDF generation
- Sell-a-subscription flow + expiry badges
- AES-256-GCM credential encryption (server-only reveal)

See `CRM-Spec-and-Roadmap.md` for the full plan.
