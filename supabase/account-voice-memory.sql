-- PicPlanr Version 40.5
-- Persistent workspace account voice and website analysis memory.

create table if not exists public.workspace_brand_profiles (
  workspace_id uuid primary key
    references public.workspaces(id) on delete cascade,
  updated_by uuid
    references auth.users(id) on delete set null,
  account_type text not null default 'Business',
  context jsonb not null default '{}'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  website_analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspace_brand_profiles enable row level security;

drop policy if exists "Workspace members can view brand profile"
on public.workspace_brand_profiles;

create policy "Workspace members can view brand profile"
on public.workspace_brand_profiles
for select to authenticated
using (public.is_workspace_member(workspace_id));

-- Writes are performed by authenticated PicPlanr server routes.
revoke insert,update,delete
on public.workspace_brand_profiles
from anon,authenticated;

create index if not exists workspace_brand_profiles_updated_idx
on public.workspace_brand_profiles(updated_at desc);
