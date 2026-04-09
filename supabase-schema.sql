-- Run this in your Supabase SQL editor

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text default '',
  bio text default '',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Anime list entries
create table if not exists public.list_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mal_id integer not null,
  title text not null,
  image_url text default '',
  episodes integer,
  status text not null check (status in ('watching','completed','plan_to_watch','on_hold','dropped')),
  rating integer check (rating >= 1 and rating <= 10),
  progress integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, mal_id)
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on profiles
  for each row execute procedure update_updated_at();

create trigger list_entries_updated_at before update on list_entries
  for each row execute procedure update_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table list_entries enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);

-- List entries: public read, owner write
create policy "entries_select" on list_entries for select using (true);
create policy "entries_insert" on list_entries for insert with check (auth.uid() = user_id);
create policy "entries_update" on list_entries for update using (auth.uid() = user_id);
create policy "entries_delete" on list_entries for delete using (auth.uid() = user_id);

-- Recommendations ("if you liked X, watch Y")
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_mal_id integer not null,
  source_title text not null,
  source_image_url text default '',
  target_mal_id integer not null,
  target_title text not null,
  target_image_url text default '',
  body text not null check (char_length(body) >= 10),
  created_at timestamptz default now(),
  unique(user_id, source_mal_id, target_mal_id)
);

alter table recommendations enable row level security;
create policy "recs_select" on recommendations for select using (true);
create policy "recs_insert" on recommendations for insert with check (auth.uid() = user_id);
create policy "recs_delete" on recommendations for delete using (auth.uid() = user_id);

-- Genre preferences on profile
alter table profiles add column if not exists favorite_genres text[] default '{}';

-- Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mal_id integer not null,
  anime_title text not null,
  rating integer not null check (rating >= 1 and rating <= 10),
  body text not null check (char_length(body) >= 10),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, mal_id)
);

alter table reviews enable row level security;
create policy "reviews_select" on reviews for select using (true);
create policy "reviews_insert" on reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update" on reviews for update using (auth.uid() = user_id);
create policy "reviews_delete" on reviews for delete using (auth.uid() = user_id);

create trigger reviews_updated_at before update on reviews
  for each row execute procedure update_updated_at();

-- Resolve username -> email for login
create or replace function get_email_by_username(p_username text)
returns text language plpgsql security definer as $$
declare v_email text;
begin
  select u.email into v_email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = p_username
  limit 1;
  return v_email;
end; $$;

-- Storage bucket for avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict do nothing;

create policy "avatars_select" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_insert" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "avatars_update" on storage.objects for update using (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
