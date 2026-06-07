# Subscription CRM — Technical Spec & Build Roadmap

**Stack:** Next.js (App Router) + Supabase (Postgres, Auth, RLS, Storage) + TypeScript
**Audience:** solo/experienced dev building a multi-tenant SaaS
**Goal:** Accounts manage clients, sell subscription products (Netflix, Prime, YouTube Premium, software), track expiry & credentials, auto-calculate profit, generate invoices.

---

## 1. Product scope

### MVP (Phase 1)
- Email/password auth, one account = one tenant (workspace).
- CRUD clients.
- Catalog of products (subscription types).
- Sell a product to a client → a **subscription record** with credentials, cost price, sell price, start/expiry dates.
- Auto-calculated profit (sell − cost) and totals per client / overall.
- Expiry tracking with a dashboard of "expiring soon" and "expired".
- Generate a PDF invoice per client from their active subscriptions.

### Phase 2 (after MVP works)
- Renewal flow (extend expiry, log history).
- Email reminders before expiry (Supabase Edge Function + cron).
- Payment status on invoices (paid/unpaid/partial).
- Dashboard analytics (MRR, profit over time, churn).
- Team members / roles per workspace.

### Phase 3
- Stripe billing for *your* customers (turn it into a real SaaS).
- Client portal (clients log in to see their own subscriptions/invoices).
- Bulk import/export.

---

## 2. Data model

Multi-tenant via a `workspace_id` (or `owner_id`) on every table, enforced by Row-Level Security. Core tables:

```
profiles            (id = auth.users.id, full_name, workspace_id)
workspaces          (id, name, owner_id, created_at)

clients             (id, workspace_id, name, email, phone, notes, created_at)

products            (id, workspace_id, name, category,        -- "Netflix", "software", etc.
                     default_cost_price, default_sell_price, billing_period_days)

subscriptions       (id, workspace_id, client_id, product_id,
                     login_id,                                  -- the product account id
                     login_password_encrypted,                 -- NEVER store plaintext
                     cost_price, sell_price,                    -- snapshot at sale time
                     start_date, expiry_date,
                     status,                                    -- active | expired | cancelled
                     created_at)

invoices            (id, workspace_id, client_id, number,
                     issue_date, due_date, status,              -- draft | sent | paid
                     subtotal, tax, total, currency)

invoice_items       (id, invoice_id, subscription_id, description,
                     quantity, unit_price, line_total)
```

Computed values (`profit = sell_price - cost_price`, client totals, invoice totals) are best done as Postgres **generated columns** or **views**, not stored, so they can't drift.

```sql
-- profit per subscription, always correct
alter table subscriptions
  add column profit numeric generated always as (sell_price - cost_price) stored;
```

---

## 3. Security — read this before storing credentials

You're storing real product logins/passwords. This is the highest-risk part of the app.

- **Never store passwords in plaintext.** Encrypt before insert, decrypt only when shown.
- Two viable approaches:
  1. **App-layer encryption (recommended to start):** encrypt with AES-256-GCM in a server-side route using a key held in an env var / secrets manager. The DB only ever sees ciphertext.
  2. **Postgres `pgcrypto`:** encrypt in the DB. Simpler but the key tends to live closer to the data.
- All credential reads must go through a **server action / route handler**, never the client, so the decryption key never reaches the browser.
- Turn on **RLS on every table** so workspace A can never query workspace B's rows. Policy pattern: `workspace_id = (select workspace_id from profiles where id = auth.uid())`.
- Log access to credentials (who viewed what, when) — cheap to add, valuable later.

---

## 4. Profit & pricing logic

Keep it boringly explicit:

- `profit = sell_price − cost_price` per subscription.
- **Per-client total** = sum of `sell_price` (revenue), sum of `profit` (margin) across their active subscriptions.
- **Overall** = same, aggregated across the workspace, ideally as a SQL view (`v_client_totals`, `v_workspace_summary`) so the dashboard is one query.
- Snapshot `cost_price`/`sell_price` onto the subscription at sale time — don't read live from `products`, or historical profit changes whenever you edit the catalog.

---

## 5. Invoicing

- An invoice is generated from a client's selected subscriptions → creates `invoice` + `invoice_items`.
- Numbering: per-workspace sequence (e.g. `INV-2026-0001`).
- Totals computed from items (subtotal → tax → total).
- **PDF generation:** server-side with `@react-pdf/renderer` or an HTML-to-PDF route (`puppeteer`/`playwright`). Store the file in Supabase Storage, keep the URL on the invoice row.
- Phase 2: mark paid/unpaid, send via email.

---

## 6. Architecture notes (Next.js + Supabase)

- **App Router**, server components for data fetching, **server actions** for mutations (and all credential handling).
- `@supabase/ssr` for auth-aware server/client clients.
- Validation with **Zod** on every mutation input.
- Folder sketch:
  ```
  app/(auth)/login, /signup
  app/(app)/dashboard, /clients, /clients/[id], /products, /subscriptions, /invoices
  app/api/...           -- route handlers (PDF, credential decrypt)
  lib/supabase, lib/crypto, lib/db (queries), lib/validation
  ```
- UI: **shadcn/ui + Tailwind** for fast, clean tables/forms.
- Deploy on **Vercel**; Supabase hosts DB/auth/storage. Keep the encryption key and service-role key in Vercel env vars (server-only).

---

## 7. Phased roadmap (concrete order)

1. **Setup** — Next.js + TS + Tailwind + shadcn; Supabase project; `@supabase/ssr` auth (signup/login/logout); create `profiles` + `workspaces` on signup.
2. **Schema + RLS** — write the migration for all tables, generated `profit` column, RLS policies; seed a few products.
3. **Clients CRUD** — list, create, edit, detail page.
4. **Products CRUD** — catalog with default prices.
5. **Subscriptions** — sell flow: pick client + product, enter credentials (encrypted) + prices + dates; list with status; expiry badges.
6. **Encryption** — AES-256-GCM helper, server-action read/write, "reveal password" gated server-side.
7. **Dashboard** — totals (revenue, profit), expiring-soon and expired lists (SQL views).
8. **Invoices** — generate from subscriptions, items, totals, PDF, store in Storage.
9. **Polish** — empty states, validation, error handling.
10. **Phase 2** — renewals, email reminders (Edge Function + cron), payment status.

---

## 8. How to use me (Claude) most effectively on this

- **Work in this connected folder.** I read and write files here directly, so the codebase lives in one place we both see.
- **Build phase by phase**, not all at once. Each roadmap step above is a good single request — e.g. "Do step 2: write the Supabase migration with RLS." Smaller scopes = better, reviewable code.
- **I scaffold, you steer.** I'll generate migrations, components, server actions, and tests; you review diffs and tell me what to adjust. Ask me to explain any choice.
- **Give me real schema/error output.** Paste failing SQL, type errors, or stack traces and I'll fix against the actual state, not a guess.
- **Lean on me for the risky parts:** RLS policies, the encryption layer, and PDF generation are where bugs hurt most — have me write and a second pass to review them.
- **Let me write tests** alongside features so refactors stay safe.
- **Ask for a Plan** before big steps: I can produce a step-by-step implementation plan for any phase before touching code.
- **I can also make docs** — invoice templates, a README, onboarding emails, pitch deck — when you need them.

**Suggested first message after this:** *"Scaffold Phase 1, step 1 — Next.js + Supabase project with auth and workspace creation on signup."*
