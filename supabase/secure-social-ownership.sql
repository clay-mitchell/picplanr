-- PicPlanr Version 38.1
-- Secure ownership for Instagram, LinkedIn and TikTok connections.

create extension if not exists pgcrypto;

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null
    check (provider in ('instagram','linkedin','tiktok')),
  provider_account_id text not null,
  username text,
  display_name text,
  account_type text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}'::text[],
  status text not null default 'connected'
    check (status in ('connected','expired','disconnected','revoked','error')),
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id,provider,provider_account_id)
);

create table if not exists public.social_oauth_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null
    check (provider in ('instagram','linkedin','tiktok')),
  state_hash text not null unique,
  redirect_to text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists social_connections_workspace_provider_idx
on public.social_connections(workspace_id,provider,status);

create index if not exists social_connections_user_idx
on public.social_connections(user_id,workspace_id);

create index if not exists social_oauth_states_expiry_idx
on public.social_oauth_states(expires_at);

alter table public.social_connections enable row level security;
alter table public.social_oauth_states enable row level security;

drop policy if exists "Members can view their social connections"
on public.social_connections;

create policy "Members can view their social connections"
on public.social_connections
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Owners can disconnect their social connections"
on public.social_connections;

create policy "Owners can disconnect their social connections"
on public.social_connections
for update
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and user_id=auth.uid()
)
with check (
  public.is_workspace_member(workspace_id)
  and user_id=auth.uid()
);

-- Customers cannot directly insert a connection from the browser.
-- A verified platform callback must create it through the server service role.
revoke insert on public.social_connections from authenticated;
revoke delete on public.social_connections from authenticated;

-- OAuth state rows are created and consumed only by authenticated server routes.
revoke all on public.social_oauth_states from anon;
revoke all on public.social_oauth_states from authenticated;

-- Remove expired or already consumed OAuth states.
create or replace function public.cleanup_social_oauth_states()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.social_oauth_states
  where expires_at < now()
     or consumed_at is not null;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_social_oauth_states() from public;
grant execute on function public.cleanup_social_oauth_states() to service_role;
