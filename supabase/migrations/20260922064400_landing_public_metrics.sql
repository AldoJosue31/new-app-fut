begin;

-- Public marketing metrics contain aggregate counts only. They never expose
-- league, team, player, or match rows to anonymous visitors.
create table if not exists public.landing_public_metrics (
  id smallint primary key default 1,
  leagues_count bigint not null default 0 check (leagues_count >= 0),
  teams_count bigint not null default 0 check (teams_count >= 0),
  players_count bigint not null default 0 check (players_count >= 0),
  matches_count bigint not null default 0 check (matches_count >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint landing_public_metrics_singleton check (id = 1)
);

alter table public.landing_public_metrics enable row level security;

revoke all on table public.landing_public_metrics from public, anon, authenticated;
grant select on table public.landing_public_metrics to anon, authenticated;

drop policy if exists landing_public_metrics_read on public.landing_public_metrics;
create policy landing_public_metrics_read
on public.landing_public_metrics
for select
to anon, authenticated
using (id = 1);

-- This function is intentionally private and has no user-controlled input.
-- It runs with a pinned search_path so trigger execution cannot be hijacked.
create or replace function app_private.refresh_landing_public_metrics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.landing_public_metrics (
    id,
    leagues_count,
    teams_count,
    players_count,
    matches_count,
    updated_at
  )
  values (
    1,
    (select count(*)::bigint from public.leagues),
    (select count(*)::bigint from public.teams where coalesce(status, 'Activo') = 'Activo'),
    (select count(*)::bigint from public.players where coalesce(is_active, true) and not coalesce(is_suspended, false)),
    (select count(*)::bigint from public.matches),
    timezone('utc', now())
  )
  on conflict (id) do update
  set leagues_count = excluded.leagues_count,
      teams_count = excluded.teams_count,
      players_count = excluded.players_count,
      matches_count = excluded.matches_count,
      updated_at = excluded.updated_at;

  return null;
end;
$$;

revoke all on function app_private.refresh_landing_public_metrics() from public, anon, authenticated;

drop trigger if exists refresh_landing_metrics_from_leagues on public.leagues;
create trigger refresh_landing_metrics_from_leagues
after insert or update or delete on public.leagues
for each statement
execute function app_private.refresh_landing_public_metrics();

drop trigger if exists refresh_landing_metrics_from_teams on public.teams;
create trigger refresh_landing_metrics_from_teams
after insert or update or delete on public.teams
for each statement
execute function app_private.refresh_landing_public_metrics();

drop trigger if exists refresh_landing_metrics_from_players on public.players;
create trigger refresh_landing_metrics_from_players
after insert or update or delete on public.players
for each statement
execute function app_private.refresh_landing_public_metrics();

drop trigger if exists refresh_landing_metrics_from_matches on public.matches;
create trigger refresh_landing_metrics_from_matches
after insert or update or delete on public.matches
for each statement
execute function app_private.refresh_landing_public_metrics();

-- Seed the singleton from the current database before the first Realtime event.
insert into public.landing_public_metrics (
  id,
  leagues_count,
  teams_count,
  players_count,
  matches_count,
  updated_at
)
values (
  1,
  (select count(*)::bigint from public.leagues),
  (select count(*)::bigint from public.teams where coalesce(status, 'Activo') = 'Activo'),
  (select count(*)::bigint from public.players where coalesce(is_active, true) and not coalesce(is_suspended, false)),
  (select count(*)::bigint from public.matches),
  timezone('utc', now())
)
on conflict (id) do update
set leagues_count = excluded.leagues_count,
    teams_count = excluded.teams_count,
    players_count = excluded.players_count,
    matches_count = excluded.matches_count,
    updated_at = excluded.updated_at;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'landing_public_metrics'
  ) then
    execute 'alter publication supabase_realtime add table public.landing_public_metrics';
  end if;
end;
$$;

commit;
