create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null default 'individual' check (account_type in ('business','individual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_default_workspace_per_owner on public.workspaces(owner_user_id);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique (workspace_id,user_id)
);

create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists workspace_members_workspace_id_idx on public.workspace_members(workspace_id);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;

drop policy if exists "Members can view their workspace" on public.workspaces;
create policy "Members can view their workspace" on public.workspaces
for select to authenticated using (public.is_workspace_member(id));

drop policy if exists "Owners can update their workspace" on public.workspaces;
create policy "Owners can update their workspace" on public.workspaces
for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists "Members can view workspace membership" on public.workspace_members;
create policy "Members can view workspace membership" on public.workspace_members
for select to authenticated using (public.is_workspace_member(workspace_id));

create or replace function public.ensure_current_user_workspace(requested_name text default null)
returns table (workspace_id uuid, workspace_name text, member_role text)
language plpgsql security definer set search_path = public as $$
declare
  caller_id uuid := auth.uid();
  resolved_name text;
  existing_workspace_id uuid;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;

  resolved_name := nullif(trim(requested_name),'');
  if resolved_name is null then
    select coalesce(
      nullif(trim(raw_user_meta_data->>'full_name'),'') || '''s Workspace',
      split_part(email,'@',1) || '''s Workspace',
      'My Workspace'
    ) into resolved_name from auth.users where id = caller_id;
  end if;

  select id into existing_workspace_id from public.workspaces where owner_user_id = caller_id limit 1;

  if existing_workspace_id is null then
    insert into public.workspaces(owner_user_id,name)
    values (caller_id,coalesce(resolved_name,'My Workspace'))
    returning id into existing_workspace_id;
  end if;

  insert into public.workspace_members(workspace_id,user_id,role)
  values(existing_workspace_id,caller_id,'owner')
  on conflict (workspace_id,user_id) do update set role='owner';

  return query
  select w.id,w.name,wm.role
  from public.workspaces w
  join public.workspace_members wm on wm.workspace_id=w.id and wm.user_id=caller_id
  where w.id=existing_workspace_id;
end;
$$;

revoke all on function public.ensure_current_user_workspace(text) from public;
grant execute on function public.ensure_current_user_workspace(text) to authenticated;

create or replace function public.handle_new_picplanr_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_workspace_id uuid;
  workspace_name text;
begin
  insert into public.profiles(id,full_name,email)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email)
  on conflict(id) do update set full_name=excluded.full_name,email=excluded.email,updated_at=now();

  workspace_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'),'') || '''s Workspace',
    split_part(new.email,'@',1) || '''s Workspace',
    'My Workspace'
  );

  insert into public.workspaces(owner_user_id,name)
  values(new.id,workspace_name)
  on conflict(owner_user_id) do update set updated_at=now()
  returning id into new_workspace_id;

  insert into public.workspace_members(workspace_id,user_id,role)
  values(new_workspace_id,new.id,'owner')
  on conflict(workspace_id,user_id) do update set role='owner';

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_picplanr on auth.users;
create trigger on_auth_user_created_picplanr after insert on auth.users
for each row execute function public.handle_new_picplanr_user();

do $$
declare
  u record;
  wid uuid;
  wname text;
begin
  for u in select id,email,raw_user_meta_data from auth.users loop
    wname := coalesce(
      nullif(trim(u.raw_user_meta_data->>'full_name'),'') || '''s Workspace',
      split_part(u.email,'@',1) || '''s Workspace',
      'My Workspace'
    );
    insert into public.workspaces(owner_user_id,name)
    values(u.id,wname)
    on conflict(owner_user_id) do update set updated_at=now()
    returning id into wid;
    insert into public.workspace_members(workspace_id,user_id,role)
    values(wid,u.id,'owner')
    on conflict(workspace_id,user_id) do update set role='owner';
  end loop;
end;
$$;
