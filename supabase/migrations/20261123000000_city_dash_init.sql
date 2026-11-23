-- =============================================================================
-- CITY DASH 3D - database schema
-- Accounts, profiles, run history, leaderboards, friends and cloud progress.
-- Every table has Row Level Security enabled. Score/stat writes only happen
-- through the SECURITY DEFINER function submit_run(), which validates input.
-- =============================================================================

-- ---------------------------------------------------------------- tables -----

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (char_length(username) between 3 and 20 and username ~ '^[A-Za-z0-9_]+$'),
  avatar text not null default '🦊' check (char_length(avatar) between 1 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.player_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  best_score bigint not null default 0,
  best_distance integer not null default 0,
  total_runs integer not null default 0,
  total_distance bigint not null default 0,
  total_coins bigint not null default 0,
  best_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists player_stats_best_idx on public.player_stats (best_score desc, best_at asc);

create table if not exists public.runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score bigint not null check (score >= 0),
  distance integer not null check (distance >= 0),
  coins integer not null check (coins >= 0),
  duration_ms integer not null check (duration_ms >= 0),
  character text not null check (char_length(character) <= 32),
  created_at timestamptz not null default now()
);
create index if not exists runs_user_idx on public.runs (user_id, created_at desc);

create table if not exists public.player_progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 65536),
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists friendships_friend_idx on public.friendships (friend_id);

-- ------------------------------------------------------------------ RLS ------

alter table public.profiles enable row level security;
alter table public.player_stats enable row level security;
alter table public.runs enable row level security;
alter table public.player_progress enable row level security;
alter table public.friendships enable row level security;

-- Profiles: public read (leaderboards), owner can insert/update their own row.
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Stats: public read, no direct writes (only submit_run).
drop policy if exists "stats are public" on public.player_stats;
create policy "stats are public" on public.player_stats for select to anon, authenticated using (true);

-- Runs: owners can read their history, no direct writes.
drop policy if exists "read own runs" on public.runs;
create policy "read own runs" on public.runs for select to authenticated using (user_id = (select auth.uid()));

-- Progress: private to the owner.
drop policy if exists "read own progress" on public.player_progress;
create policy "read own progress" on public.player_progress for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "insert own progress" on public.player_progress;
create policy "insert own progress" on public.player_progress for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "update own progress" on public.player_progress;
create policy "update own progress" on public.player_progress for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Friendships: you see rows involving you; you manage the rows you created.
drop policy if exists "read own friendships" on public.friendships;
create policy "read own friendships" on public.friendships for select to authenticated using (user_id = (select auth.uid()) or friend_id = (select auth.uid()));
drop policy if exists "add friends" on public.friendships;
create policy "add friends" on public.friendships for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "remove friends" on public.friendships;
create policy "remove friends" on public.friendships for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- grants -----
-- Least privilege: column-level grants on profiles so nobody can change ids/timestamps.

revoke all on public.profiles, public.player_stats, public.runs, public.player_progress, public.friendships from anon, authenticated;
grant select on public.profiles, public.player_stats to anon, authenticated;
grant insert (id, username, avatar) on public.profiles to authenticated;
grant update (username, avatar, updated_at) on public.profiles to authenticated;
grant select on public.runs to authenticated;
grant select, insert, update on public.player_progress to authenticated;
grant select, insert, delete on public.friendships to authenticated;

-- ------------------------------------------------------------- functions -----

-- Create profile + stats + progress rows on sign-up. Picks a unique username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n integer := 0;
  av text;
begin
  base := regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^A-Za-z0-9_]', '', 'g');
  if char_length(base) < 3 then
    base := 'runner' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  base := left(base, 16);
  candidate := base;
  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  av := coalesce(nullif(left(new.raw_user_meta_data ->> 'avatar', 16), ''), '🦊');
  insert into public.profiles (id, username, avatar) values (new.id, candidate, av);
  insert into public.player_stats (user_id) values (new.id) on conflict do nothing;
  insert into public.player_progress (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists progress_touch on public.player_progress;
create trigger progress_touch before update on public.player_progress for each row execute function public.touch_updated_at();

-- Validated score submission. Returns { best_score, is_best, rank }.
create or replace function public.submit_run(
  p_score bigint,
  p_distance integer,
  p_coins integer,
  p_duration_ms integer,
  p_character text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prev_best bigint;
  new_best bigint;
  last_run timestamptz;
  v_rank bigint;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_score is null or p_distance is null or p_coins is null or p_duration_ms is null
     or p_score < 0 or p_distance < 0 or p_coins < 0 or p_duration_ms < 0 then
    raise exception 'invalid run' using errcode = '22023';
  end if;
  if p_character is null or char_length(p_character) > 32 then
    raise exception 'invalid character' using errcode = '22023';
  end if;
  -- Plausibility checks derived from the game rules:
  -- max speed is 34 m/s (allow 10% margin), coins are at most ~1 per metre,
  -- score is (distance + coins*5 + bonuses) * multiplier (max 60).
  if p_distance > 0 and p_duration_ms < (p_distance / 37.4) * 1000 then
    raise exception 'implausible distance' using errcode = '22023';
  end if;
  if p_coins > p_distance + 500 then
    raise exception 'implausible coins' using errcode = '22023';
  end if;
  if p_score > (p_distance::bigint + p_coins::bigint * 5 + 20000) * 60 then
    raise exception 'implausible score' using errcode = '22023';
  end if;
  select max(created_at) into last_run from public.runs where user_id = uid;
  if last_run is not null and last_run > now() - interval '3 seconds' then
    raise exception 'too many submissions' using errcode = '54000';
  end if;

  insert into public.runs (user_id, score, distance, coins, duration_ms, character)
  values (uid, p_score, p_distance, p_coins, p_duration_ms, p_character);

  insert into public.player_stats (user_id) values (uid) on conflict (user_id) do nothing;
  select best_score into prev_best from public.player_stats where user_id = uid for update;

  update public.player_stats set
    total_runs = total_runs + 1,
    total_distance = total_distance + p_distance,
    total_coins = total_coins + p_coins,
    best_score = greatest(best_score, p_score),
    best_distance = greatest(best_distance, p_distance),
    best_at = case when p_score > best_score then now() else best_at end,
    updated_at = now()
  where user_id = uid
  returning best_score into new_best;

  select count(*) + 1 into v_rank from public.player_stats where best_score > new_best;

  return json_build_object('best_score', new_best, 'is_best', p_score > prev_best, 'rank', v_rank);
end;
$$;

-- Global top N (max 100).
create or replace function public.get_leaderboard(p_limit integer default 100)
returns table (rank bigint, user_id uuid, username text, avatar text, best_score bigint, best_distance integer)
language sql
stable
set search_path = public
as $$
  select row_number() over (order by s.best_score desc, s.best_at asc nulls last, p.username) as rank,
         p.id, p.username, p.avatar, s.best_score, s.best_distance
  from public.player_stats s
  join public.profiles p on p.id = s.user_id
  where s.best_score > 0
  order by s.best_score desc, s.best_at asc nulls last, p.username
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

-- Current user's global position (even if outside the top 100).
create or replace function public.get_my_rank()
returns table (rank bigint, best_score bigint, best_distance integer)
language sql
stable
set search_path = public
as $$
  select (select count(*) from public.player_stats o where o.best_score > s.best_score) + 1,
         s.best_score, s.best_distance
  from public.player_stats s
  where s.user_id = auth.uid();
$$;

-- You + everyone you have added as a friend.
create or replace function public.get_friends_leaderboard()
returns table (rank bigint, user_id uuid, username text, avatar text, best_score bigint, best_distance integer, is_me boolean, mutual boolean)
language sql
stable
set search_path = public
as $$
  with ids as (
    select auth.uid() as id
    union
    select f.friend_id from public.friendships f where f.user_id = auth.uid()
  )
  select row_number() over (order by coalesce(s.best_score, 0) desc, p.username) as rank,
         p.id, p.username, p.avatar,
         coalesce(s.best_score, 0), coalesce(s.best_distance, 0),
         p.id = auth.uid(),
         exists (select 1 from public.friendships r where r.user_id = p.id and r.friend_id = auth.uid())
  from ids
  join public.profiles p on p.id = ids.id
  left join public.player_stats s on s.user_id = p.id
  where auth.uid() is not null
  order by coalesce(s.best_score, 0) desc, p.username;
$$;

-- Add a friend by username. Returns the friend's id and username.
create or replace function public.add_friend(p_username text)
returns json
language plpgsql
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fid uuid;
  fname text;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select id, username into fid, fname from public.profiles where lower(username) = lower(trim(p_username));
  if fid is null then
    raise exception 'player not found' using errcode = 'P0002';
  end if;
  if fid = uid then
    raise exception 'you cannot add yourself' using errcode = '22023';
  end if;
  insert into public.friendships (user_id, friend_id) values (uid, fid) on conflict do nothing;
  return json_build_object('id', fid, 'username', fname);
end;
$$;

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)));
$$;

revoke all on function public.submit_run(bigint, integer, integer, integer, text) from public, anon;
grant execute on function public.submit_run(bigint, integer, integer, integer, text) to authenticated;
revoke all on function public.add_friend(text) from public, anon;
grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
grant execute on function public.get_my_rank() to authenticated;
grant execute on function public.get_friends_leaderboard() to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- --------------------------------------------------------------- realtime ----
-- Live leaderboard: clients subscribe to changes on player_stats.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.player_stats;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
