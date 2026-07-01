-- PicPlanr Version 40
-- Subscription plans, monthly limits and workspace usage.

create extension if not exists pgcrypto;

create table if not exists public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan_key text not null default 'starter'
    check (plan_key in ('starter','business','pro')),
  status text not null default 'active'
    check (status in ('active','trialing','past_due','unpaid','cancelled','incomplete','paused')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  metric text not null check (metric in (
    'image_analyses',
    'website_analyses',
    'scheduled_posts',
    'connected_accounts',
    'team_members',
    'caption_regenerations'
  )),
  quantity bigint not null default 0 check (quantity >= 0),
  period_start timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspace_usage_lookup_idx
on public.workspace_usage(workspace_id,period_start,metric);

create unique index if not exists workspace_usage_month_metric_unique
on public.workspace_usage(
  workspace_id,
  metric,
  (date_trunc('month',period_start at time zone 'UTC'))
);

alter table public.workspace_subscriptions enable row level security;
alter table public.workspace_usage enable row level security;

drop policy if exists "Workspace members can view subscription" on public.workspace_subscriptions;
create policy "Workspace members can view subscription"
on public.workspace_subscriptions
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can view usage" on public.workspace_usage;
create policy "Workspace members can view usage"
on public.workspace_usage
for select to authenticated
using (public.is_workspace_member(workspace_id));

-- Subscription and usage changes are server-only through the service role.
revoke insert,update,delete on public.workspace_subscriptions from anon,authenticated;
revoke insert,update,delete on public.workspace_usage from anon,authenticated;

create or replace function public.consume_workspace_usage(
  target_workspace_id uuid,
  usage_metric text,
  usage_quantity bigint,
  usage_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  month_start timestamptz :=
    date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
begin
  if usage_quantity < 0 then
    raise exception 'Usage quantity cannot be negative';
  end if;

  insert into public.workspace_usage(
    workspace_id,metric,quantity,period_start,metadata
  )
  values(
    target_workspace_id,usage_metric,usage_quantity,month_start,usage_metadata
  )
  on conflict (
    workspace_id,
    metric,
    (date_trunc('month',period_start at time zone 'UTC'))
  )
  do update set
    quantity=public.workspace_usage.quantity+excluded.quantity,
    metadata=public.workspace_usage.metadata||excluded.metadata;
end;
$$;

revoke all on function public.consume_workspace_usage(uuid,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.consume_workspace_usage(uuid,text,bigint,jsonb) to service_role;

insert into public.workspace_subscriptions(
  workspace_id,plan_key,status,current_period_start,current_period_end
)
select
  id,
  'starter',
  'active',
  date_trunc('month',now() at time zone 'UTC') at time zone 'UTC',
  (date_trunc('month',now() at time zone 'UTC')+interval '1 month') at time zone 'UTC'
from public.workspaces
on conflict (workspace_id) do nothing;
