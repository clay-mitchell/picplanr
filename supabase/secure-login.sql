create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create or replace function public.handle_new_picplanr_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id,full_name,email)
  values (new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email)
  on conflict (id) do update set full_name=excluded.full_name,email=excluded.email,updated_at=now();
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_picplanr on auth.users;
create trigger on_auth_user_created_picplanr after insert on auth.users for each row execute function public.handle_new_picplanr_user();
