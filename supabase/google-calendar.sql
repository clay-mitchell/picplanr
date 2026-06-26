create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  google_account_id text,
  google_email text,
  calendar_id text not null default 'primary',
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  token_expires_at timestamptz,
  status text not null default 'connected' check (status in ('connected','disconnected','needs_reconnect')),
  reminder_minutes integer not null default 1440 check (reminder_minutes between 0 and 40320),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.google_calendar_connections enable row level security;
alter table public.scheduled_posts
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_id text,
  add column if not exists google_calendar_sync_status text not null default 'not_synced',
  add column if not exists google_last_synced_at timestamptz,
  add column if not exists reminder_minutes integer not null default 1440;
create unique index if not exists scheduled_posts_local_id_unique on public.scheduled_posts(local_id) where local_id is not null;
create index if not exists google_calendar_connections_status_idx on public.google_calendar_connections(status);
