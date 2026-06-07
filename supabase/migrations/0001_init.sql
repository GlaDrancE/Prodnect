-- ============================================================================
-- Subscription CRM — initial schema
-- Multi-tenant via workspace_id, enforced with Row-Level Security.
-- Target: Supabase (Postgres 15+).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type subscription_status as enum ('active', 'expired', 'cancelled');
create type invoice_status      as enum ('draft', 'sent', 'paid', 'cancelled');

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- Tables
-- ===========================================================================

-- Workspaces (one tenant). invoice_seq backs per-workspace invoice numbering.
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  invoice_seq integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Profiles map an auth user to a workspace.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null,
  email        text,
  phone        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces (id) on delete cascade,
  name                text not null,
  category            text,
  default_cost_price  numeric(12,2) not null default 0,
  default_sell_price  numeric(12,2) not null default 0,
  billing_period_days integer not null default 30,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- A subscription = a product sold to a client. Prices are snapshotted here so
-- historical profit never changes when the catalog is edited.
-- login_password_encrypted holds ciphertext only (encryption added in a later step).
create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid not null references public.workspaces (id) on delete cascade,
  client_id                uuid not null references public.clients (id) on delete cascade,
  product_id               uuid references public.products (id) on delete set null,
  login_id                 text,
  login_password_encrypted text,
  cost_price               numeric(12,2) not null default 0,
  sell_price               numeric(12,2) not null default 0,
  profit                   numeric(12,2) generated always as (sell_price - cost_price) stored,
  start_date               date not null default current_date,
  expiry_date              date not null,
  status                   subscription_status not null default 'active',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table public.invoices (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id    uuid not null references public.clients (id) on delete restrict,
  number       text not null,
  issue_date   date not null default current_date,
  due_date     date,
  status       invoice_status not null default 'draft',
  currency     text not null default 'INR',
  subtotal     numeric(12,2) not null default 0,
  tax          numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  pdf_url      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, number)
);

create table public.invoice_items (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  invoice_id      uuid not null references public.invoices (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  description     text not null,
  quantity        integer not null default 1,
  unit_price      numeric(12,2) not null default 0,
  line_total      numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at      timestamptz not null default now()
);

-- Indexes for common lookups
create index idx_clients_workspace        on public.clients (workspace_id);
create index idx_products_workspace       on public.products (workspace_id);
create index idx_subscriptions_workspace  on public.subscriptions (workspace_id);
create index idx_subscriptions_client     on public.subscriptions (client_id);
create index idx_subscriptions_expiry     on public.subscriptions (expiry_date);
create index idx_invoices_workspace       on public.invoices (workspace_id);
create index idx_invoices_client          on public.invoices (client_id);
create index idx_invoice_items_invoice    on public.invoice_items (invoice_id);

-- updated_at triggers
create trigger trg_workspaces_updated    before update on public.workspaces    for each row execute function public.set_updated_at();
create trigger trg_profiles_updated      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger trg_clients_updated       before update on public.clients       for each row execute function public.set_updated_at();
create trigger trg_products_updated      before update on public.products      for each row execute function public.set_updated_at();
create trigger trg_subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger trg_invoices_updated      before update on public.invoices      for each row execute function public.set_updated_at();

-- ===========================================================================
-- Helper: the caller's workspace (used by every RLS policy)
-- ===========================================================================
create or replace function public.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.profiles where id = auth.uid();
$$;

-- ===========================================================================
-- New-user bootstrap: create a workspace + profile + starter products
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into public.workspaces (name, owner_id)
  values (coalesce(new.raw_user_meta_data ->> 'workspace_name', 'My Workspace'), new.id)
  returning id into new_workspace_id;

  insert into public.profiles (id, full_name, workspace_id)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new_workspace_id);

  insert into public.products (workspace_id, name, category, billing_period_days)
  values
    (new_workspace_id, 'Netflix',         'streaming', 30),
    (new_workspace_id, 'Amazon Prime',    'streaming', 30),
    (new_workspace_id, 'YouTube Premium', 'streaming', 30);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Per-workspace invoice numbering: INV-YYYY-0001
-- ===========================================================================
create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ws uuid := public.current_workspace_id();
  seq integer;
begin
  update public.workspaces
    set invoice_seq = invoice_seq + 1
    where id = ws
    returning invoice_seq into seq;

  return 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 4, '0');
end;
$$;

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table public.workspaces    enable row level security;
alter table public.profiles      enable row level security;
alter table public.clients       enable row level security;
alter table public.products      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices      enable row level security;
alter table public.invoice_items enable row level security;

-- Workspaces: members read; owner updates.
create policy workspaces_select on public.workspaces
  for select using (id = public.current_workspace_id());
create policy workspaces_update on public.workspaces
  for update using (owner_id = auth.uid());

-- Profiles: a user sees/edits only their own profile.
create policy profiles_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_update on public.profiles
  for update using (id = auth.uid());

-- Tenant tables: full CRUD scoped to the caller's workspace.
-- clients
create policy clients_select on public.clients for select using (workspace_id = public.current_workspace_id());
create policy clients_insert on public.clients for insert with check (workspace_id = public.current_workspace_id());
create policy clients_update on public.clients for update using (workspace_id = public.current_workspace_id());
create policy clients_delete on public.clients for delete using (workspace_id = public.current_workspace_id());

-- products
create policy products_select on public.products for select using (workspace_id = public.current_workspace_id());
create policy products_insert on public.products for insert with check (workspace_id = public.current_workspace_id());
create policy products_update on public.products for update using (workspace_id = public.current_workspace_id());
create policy products_delete on public.products for delete using (workspace_id = public.current_workspace_id());

-- subscriptions
create policy subscriptions_select on public.subscriptions for select using (workspace_id = public.current_workspace_id());
create policy subscriptions_insert on public.subscriptions for insert with check (workspace_id = public.current_workspace_id());
create policy subscriptions_update on public.subscriptions for update using (workspace_id = public.current_workspace_id());
create policy subscriptions_delete on public.subscriptions for delete using (workspace_id = public.current_workspace_id());

-- invoices
create policy invoices_select on public.invoices for select using (workspace_id = public.current_workspace_id());
create policy invoices_insert on public.invoices for insert with check (workspace_id = public.current_workspace_id());
create policy invoices_update on public.invoices for update using (workspace_id = public.current_workspace_id());
create policy invoices_delete on public.invoices for delete using (workspace_id = public.current_workspace_id());

-- invoice_items
create policy invoice_items_select on public.invoice_items for select using (workspace_id = public.current_workspace_id());
create policy invoice_items_insert on public.invoice_items for insert with check (workspace_id = public.current_workspace_id());
create policy invoice_items_update on public.invoice_items for update using (workspace_id = public.current_workspace_id());
create policy invoice_items_delete on public.invoice_items for delete using (workspace_id = public.current_workspace_id());

-- ===========================================================================
-- Reporting views (security_invoker = caller's RLS applies)
-- ===========================================================================

-- Per-client revenue & profit across active subscriptions.
create view public.v_client_totals
with (security_invoker = on) as
select
  c.id            as client_id,
  c.workspace_id,
  c.name          as client_name,
  count(s.id) filter (where s.status = 'active')          as active_subscriptions,
  coalesce(sum(s.sell_price) filter (where s.status = 'active'), 0) as revenue,
  coalesce(sum(s.profit)     filter (where s.status = 'active'), 0) as profit,
  min(s.expiry_date) filter (where s.status = 'active')   as next_expiry
from public.clients c
left join public.subscriptions s on s.client_id = c.id
group by c.id, c.workspace_id, c.name;

-- Per-workspace rollup for the dashboard.
-- Clients and subscriptions are aggregated in separate subqueries so the join
-- to workspaces never multiplies rows (avoids inflated totals).
create view public.v_workspace_summary
with (security_invoker = on) as
select
  w.id                                as workspace_id,
  coalesce(cl.total_clients, 0)       as total_clients,
  coalesce(su.active_subscriptions, 0) as active_subscriptions,
  coalesce(su.expiring_within_7d, 0)  as expiring_within_7d,
  coalesce(su.overdue, 0)             as overdue,
  coalesce(su.total_revenue, 0)       as total_revenue,
  coalesce(su.total_profit, 0)        as total_profit
from public.workspaces w
left join (
  select workspace_id, count(*) as total_clients
  from public.clients
  group by workspace_id
) cl on cl.workspace_id = w.id
left join (
  select
    workspace_id,
    count(*) filter (where status = 'active')                                  as active_subscriptions,
    count(*) filter (where status = 'active' and expiry_date <= current_date + 7) as expiring_within_7d,
    count(*) filter (where status = 'active' and expiry_date <  current_date)   as overdue,
    sum(sell_price) filter (where status = 'active')                           as total_revenue,
    sum(profit)     filter (where status = 'active')                           as total_profit
  from public.subscriptions
  group by workspace_id
) su on su.workspace_id = w.id;
