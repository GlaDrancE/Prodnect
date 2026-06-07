-- ============================================================================
-- Notifications: expiry reminders for owner + client
-- Adds a dedupe log and a view that powers the in-app alerts panel.
-- Apply after 0001_init.sql.
-- ============================================================================

-- Records which emails have already been sent, so the daily job never
-- double-sends. One row per (subscription, kind, expiry_date): when a
-- subscription is renewed to a new expiry_date, fresh reminders can fire again.
create table public.notification_log (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces (id) on delete cascade,
  subscription_id   uuid not null references public.subscriptions (id) on delete cascade,
  kind              text not null check (kind in ('reminder_3d', 'expiry')),
  expiry_date       date not null,
  owner_email_sent  boolean not null default false,
  client_email_sent boolean not null default false,
  created_at        timestamptz not null default now(),
  unique (subscription_id, kind, expiry_date)
);

create index idx_notification_log_workspace on public.notification_log (workspace_id);

alter table public.notification_log enable row level security;

-- Owner can read their own notification history. Inserts happen via the
-- service-role key in the cron job, which bypasses RLS.
create policy notification_log_select on public.notification_log
  for select using (workspace_id = public.current_workspace_id());

-- ---------------------------------------------------------------------------
-- View: subscriptions that need attention (in-app alerts panel)
--   * active and expiring within 3 days (or already overdue), OR
--   * expired within the last 30 days (still needs removal / recharge follow-up)
-- ---------------------------------------------------------------------------
create view public.v_expiring_subscriptions
with (security_invoker = on) as
select
  s.id                              as subscription_id,
  s.workspace_id,
  s.client_id,
  c.name                           as client_name,
  c.email                          as client_email,
  p.name                           as product_name,
  s.sell_price,
  s.expiry_date,
  (s.expiry_date - current_date)   as days_left,
  s.status,
  case
    when s.expiry_date < current_date  then 'overdue'
    when s.expiry_date = current_date  then 'due_today'
    else 'expiring_soon'
  end                              as bucket
from public.subscriptions s
join public.clients c       on c.id = s.client_id
left join public.products p on p.id = s.product_id
where (s.status = 'active'  and s.expiry_date <= current_date + 3)
   or (s.status = 'expired' and s.expiry_date >= current_date - 30)
order by s.expiry_date asc;
