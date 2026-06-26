-- PicPlanr Version 37.4 media retention
-- Original video footage: 40 days
-- Temporary exports: 7 days
-- Images may be retained according to the customer's plan.

create extension if not exists pgcrypto;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  user_id uuid,
  scheduled_post_id uuid references public.scheduled_posts(id) on delete set null,
  storage_bucket text not null default 'picplanr-media',
  storage_path text not null,
  original_filename text,
  media_type text not null check (media_type in ('image','video','thumbnail')),
  asset_kind text not null default 'original'
    check (asset_kind in ('original','temporary_export','thumbnail','published_copy')),
  size_bytes bigint,
  mime_type text,
  status text not null default 'active'
    check (status in ('pending','active','deleted','failed')),
  uploaded_at timestamptz not null default now(),
  expires_at timestamptz,
  deleted_at timestamptz,
  deletion_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(storage_bucket, storage_path)
);

create or replace function public.set_picplanr_media_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.expires_at is null then
    if new.asset_kind = 'temporary_export' then
      new.expires_at := coalesce(new.uploaded_at, now()) + interval '7 days';
    elsif new.media_type = 'video' then
      new.expires_at := coalesce(new.uploaded_at, now()) + interval '40 days';
    else
      new.expires_at := null;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists media_assets_set_expiry on public.media_assets;

create trigger media_assets_set_expiry
before insert or update of media_type, asset_kind, uploaded_at, expires_at
on public.media_assets
for each row
execute function public.set_picplanr_media_expiry();

create index if not exists media_assets_expiry_idx
on public.media_assets(status, expires_at)
where status = 'active' and expires_at is not null;

create index if not exists media_assets_session_idx
on public.media_assets(session_id);

alter table public.media_assets enable row level security;

-- Server-side cleanup uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS.
-- Add authenticated-user policies when Supabase Auth is connected.
