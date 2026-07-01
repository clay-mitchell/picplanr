-- PicPlanr Version 38.0
-- Strict customer data separation.

create extension if not exists pgcrypto;

-- Add workspace ownership to existing records.
alter table if exists public.media_assets
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table if exists public.scheduled_posts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table if exists public.google_calendar_connections
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table if exists public.social_connections
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Tables for generated content saved to a workspace.
create table if not exists public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text,
  description text,
  status text not null default 'draft'
    check (status in ('draft','approved','scheduled','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.captions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_idea_id uuid references public.content_ideas(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  caption_text text not null,
  option_number integer,
  approved boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill existing rows using their user_id.
update public.media_assets as item
set workspace_id=member.workspace_id
from public.workspace_members as member
where item.workspace_id is null
  and item.user_id=member.user_id;

update public.scheduled_posts as item
set workspace_id=member.workspace_id
from public.workspace_members as member
where item.workspace_id is null
  and item.user_id=member.user_id;

update public.google_calendar_connections as item
set workspace_id=member.workspace_id
from public.workspace_members as member
where item.workspace_id is null
  and item.user_id=member.user_id;

-- If this project only has one workspace, safely assign older test rows
-- that were created before login ownership existed.
do $$
declare
  only_workspace uuid;
  workspace_count integer;
begin
  select count(*),min(id)
  into workspace_count,only_workspace
  from public.workspaces;

  if workspace_count=1 then
    update public.media_assets
    set workspace_id=only_workspace
    where workspace_id is null;

    update public.scheduled_posts
    set workspace_id=only_workspace
    where workspace_id is null;

    update public.google_calendar_connections
    set workspace_id=only_workspace
    where workspace_id is null;
  end if;
end;
$$;

-- New records must always belong to a workspace.
alter table if exists public.media_assets
  alter column workspace_id set not null;

alter table if exists public.scheduled_posts
  alter column workspace_id set not null;

-- Google connections may remain nullable temporarily until Number 4
-- migrates the OAuth callback to authenticated workspace ownership.

-- Indexes and conflict rules.
create index if not exists media_assets_workspace_idx
on public.media_assets(workspace_id,created_at desc);

create index if not exists scheduled_posts_workspace_idx
on public.scheduled_posts(workspace_id,scheduled_for);

create index if not exists content_ideas_workspace_idx
on public.content_ideas(workspace_id,created_at desc);

create index if not exists captions_workspace_idx
on public.captions(workspace_id,created_at desc);

drop index if exists public.scheduled_posts_local_id_unique;

create unique index if not exists scheduled_posts_workspace_local_id_unique
on public.scheduled_posts(workspace_id,local_id)
where local_id is not null;

-- Enable Row Level Security.
alter table public.media_assets enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.content_ideas enable row level security;
alter table public.captions enable row level security;

-- Remove older broad policies if they exist.
drop policy if exists "Workspace members can view media" on public.media_assets;
drop policy if exists "Workspace members can create media" on public.media_assets;
drop policy if exists "Workspace members can update media" on public.media_assets;
drop policy if exists "Workspace members can delete media" on public.media_assets;

create policy "Workspace members can view media"
on public.media_assets
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can create media"
on public.media_assets
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and user_id=auth.uid()
);

create policy "Workspace members can update media"
on public.media_assets
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace members can delete media"
on public.media_assets
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can view scheduled posts" on public.scheduled_posts;
drop policy if exists "Workspace members can create scheduled posts" on public.scheduled_posts;
drop policy if exists "Workspace members can update scheduled posts" on public.scheduled_posts;
drop policy if exists "Workspace members can delete scheduled posts" on public.scheduled_posts;

create policy "Workspace members can view scheduled posts"
on public.scheduled_posts
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can create scheduled posts"
on public.scheduled_posts
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and user_id=auth.uid()
);

create policy "Workspace members can update scheduled posts"
on public.scheduled_posts
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace members can delete scheduled posts"
on public.scheduled_posts
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can view content ideas" on public.content_ideas;
drop policy if exists "Workspace members can create content ideas" on public.content_ideas;
drop policy if exists "Workspace members can update content ideas" on public.content_ideas;
drop policy if exists "Workspace members can delete content ideas" on public.content_ideas;

create policy "Workspace members can view content ideas"
on public.content_ideas
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can create content ideas"
on public.content_ideas
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by=auth.uid()
);

create policy "Workspace members can update content ideas"
on public.content_ideas
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace members can delete content ideas"
on public.content_ideas
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can view captions" on public.captions;
drop policy if exists "Workspace members can create captions" on public.captions;
drop policy if exists "Workspace members can update captions" on public.captions;
drop policy if exists "Workspace members can delete captions" on public.captions;

create policy "Workspace members can view captions"
on public.captions
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can create captions"
on public.captions
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by=auth.uid()
);

create policy "Workspace members can update captions"
on public.captions
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace members can delete captions"
on public.captions
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

-- Storage protection for files saved as:
-- workspace-id/filename.ext
insert into storage.buckets (id,name,public)
values ('picplanr-media','picplanr-media',false)
on conflict (id)
do update set public=false;

drop policy if exists "Workspace members can view their storage files" on storage.objects;
drop policy if exists "Workspace members can upload their storage files" on storage.objects;
drop policy if exists "Workspace members can update their storage files" on storage.objects;
drop policy if exists "Workspace members can delete their storage files" on storage.objects;

create policy "Workspace members can view their storage files"
on storage.objects
for select
to authenticated
using (
  bucket_id='picplanr-media'
  and public.is_workspace_member(
    ((storage.foldername(name))[1])::uuid
  )
);

create policy "Workspace members can upload their storage files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id='picplanr-media'
  and public.is_workspace_member(
    ((storage.foldername(name))[1])::uuid
  )
);

create policy "Workspace members can update their storage files"
on storage.objects
for update
to authenticated
using (
  bucket_id='picplanr-media'
  and public.is_workspace_member(
    ((storage.foldername(name))[1])::uuid
  )
)
with check (
  bucket_id='picplanr-media'
  and public.is_workspace_member(
    ((storage.foldername(name))[1])::uuid
  )
);

create policy "Workspace members can delete their storage files"
on storage.objects
for delete
to authenticated
using (
  bucket_id='picplanr-media'
  and public.is_workspace_member(
    ((storage.foldername(name))[1])::uuid
  )
);
