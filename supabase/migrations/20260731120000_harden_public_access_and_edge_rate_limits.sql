begin;

-- Public pages read through get_public_tournament_bundle(). Direct table reads
-- are reserved for active league managers and delegates of the same league.
drop policy if exists "Public read access for courts" on public.courts;
drop policy if exists "User read divisions" on public.divisions;
drop policy if exists "Publico ve jornadas" on public.jornadas;
drop policy if exists "Publico lectura ligas" on public.leagues;
drop policy if exists "Publico ve eventos" on public.match_events;
drop policy if exists "Publico ve partidos" on public.matches;
drop policy if exists "Lectura publica tournaments" on public.tournaments;
drop policy if exists "Publico ve torneos" on public.tournaments;

drop policy if exists scoped_authenticated_read on public.leagues;
create policy scoped_authenticated_read
on public.leagues
for select
to authenticated
using (
  app_private.is_league_admin(leagues.id)
  or app_private.is_league_delegate(leagues.id)
);

drop policy if exists scoped_authenticated_read on public.divisions;
create policy scoped_authenticated_read
on public.divisions
for select
to authenticated
using (
  app_private.is_league_admin(divisions.league_id)
  or app_private.is_league_delegate(divisions.league_id)
);

drop policy if exists scoped_authenticated_read on public.courts;
create policy scoped_authenticated_read
on public.courts
for select
to authenticated
using (
  app_private.is_league_admin(courts.league_id)
  or app_private.is_league_delegate(courts.league_id)
);

drop policy if exists scoped_authenticated_read on public.tournaments;
create policy scoped_authenticated_read
on public.tournaments
for select
to authenticated
using (
  exists (
    select 1
    from public.divisions d
    where d.id = tournaments.division_id
      and (
        app_private.is_league_admin(d.league_id)
        or app_private.is_league_delegate(d.league_id)
      )
  )
);

drop policy if exists scoped_authenticated_read on public.jornadas;
create policy scoped_authenticated_read
on public.jornadas
for select
to authenticated
using (
  exists (
    select 1
    from public.tournaments t
    join public.divisions d on d.id = t.division_id
    where t.id = jornadas.tournament_id
      and (
        app_private.is_league_admin(d.league_id)
        or app_private.is_league_delegate(d.league_id)
      )
  )
);

drop policy if exists scoped_authenticated_read on public.matches;
create policy scoped_authenticated_read
on public.matches
for select
to authenticated
using (
  exists (
    select 1
    from public.jornadas j
    join public.tournaments t on t.id = j.tournament_id
    join public.divisions d on d.id = t.division_id
    where j.id = matches.jornada_id
      and (
        app_private.is_league_admin(d.league_id)
        or app_private.is_league_delegate(d.league_id)
      )
  )
);

drop policy if exists scoped_authenticated_read on public.match_events;
create policy scoped_authenticated_read
on public.match_events
for select
to authenticated
using (
  exists (
    select 1
    from public.matches m
    join public.jornadas j on j.id = m.jornada_id
    join public.tournaments t on t.id = j.tournament_id
    join public.divisions d on d.id = t.division_id
    where m.id = match_events.match_id
      and (
        app_private.is_league_admin(d.league_id)
        or app_private.is_league_delegate(d.league_id)
      )
  )
);

-- The anonymous API surface is RPC-only. Authentication, not CORS, enforces
-- this boundary. Storage keeps its separate, path-scoped policy set.
revoke all privileges on table
  public.account_security_notifications,
  public.admin_users,
  public.app_config,
  public.categories,
  public.courts,
  public.delegate_account_audit_logs,
  public.delegate_change_requests,
  public.delegate_invitations,
  public.divisions,
  public.estadisticas,
  public.jornadas,
  public.league_admins,
  public.leagues,
  public.manager_invitations,
  public.match_events,
  public.matches,
  public.players,
  public.profiles,
  public.referees,
  public.team_delegates,
  public.teams,
  public.tournaments,
  public.view_clasificacion,
  public.view_goleadores
from public, anon;

grant select on table
  public.account_security_notifications,
  public.admin_users,
  public.app_config,
  public.categories,
  public.courts,
  public.delegate_account_audit_logs,
  public.delegate_change_requests,
  public.delegate_invitations,
  public.divisions,
  public.estadisticas,
  public.jornadas,
  public.league_admins,
  public.leagues,
  public.manager_invitations,
  public.match_events,
  public.matches,
  public.players,
  public.profiles,
  public.referees,
  public.team_delegates,
  public.teams,
  public.tournaments,
  public.view_clasificacion,
  public.view_goleadores
to authenticated;

-- Future objects must be exposed deliberately. Existing authenticated DML
-- grants stay intact so this migration does not change application workflows.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

create table if not exists app_private.edge_rate_limit_windows (
  subject_id uuid not null,
  scope text not null check (scope in ('procesar-cedula', 'procesar-rol-juego')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (subject_id, scope)
);

create index if not exists edge_rate_limit_windows_started_at_idx
  on app_private.edge_rate_limit_windows (window_started_at);

revoke all privileges on table app_private.edge_rate_limit_windows
  from public, anon, authenticated;

create or replace function app_private.consume_edge_rate_limit(p_scope text)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
volatile
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_subject_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_limit integer;
  v_window_seconds integer := 600;
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if v_subject_id is null or not app_private.is_active_user() then
    raise exception 'An active authenticated user is required.'
      using errcode = '42501';
  end if;

  v_limit := case p_scope
    when 'procesar-cedula' then 20
    when 'procesar-rol-juego' then 10
    else null
  end;

  if v_limit is null then
    raise exception 'Unknown edge rate-limit scope.'
      using errcode = '22023';
  end if;

  insert into app_private.edge_rate_limit_windows as rate_window (
    subject_id,
    scope,
    window_started_at,
    request_count
  )
  values (v_subject_id, p_scope, v_now, 1)
  on conflict (subject_id, scope) do update
  set
    window_started_at = case
      when rate_window.window_started_at
        <= v_now - make_interval(secs => v_window_seconds)
        then v_now
      else rate_window.window_started_at
    end,
    request_count = case
      when rate_window.window_started_at
        <= v_now - make_interval(secs => v_window_seconds)
        then 1
      else least(rate_window.request_count + 1, v_limit + 1)
    end
  returning rate_window.window_started_at, rate_window.request_count
    into v_window_started_at, v_request_count;

  allowed := v_request_count <= v_limit;
  remaining := greatest(v_limit - v_request_count, 0);
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(extract(epoch from (
        v_window_started_at
        + make_interval(secs => v_window_seconds)
        - v_now
      )))::integer
    )
  end;

  return next;
end;
$$;

revoke all on function app_private.consume_edge_rate_limit(text)
  from public, anon;
grant execute on function app_private.consume_edge_rate_limit(text)
  to authenticated;

create or replace function public.consume_edge_rate_limit(p_scope text)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language sql
volatile
security invoker
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.consume_edge_rate_limit(p_scope);
$$;

revoke all on function public.consume_edge_rate_limit(text) from public, anon;
grant execute on function public.consume_edge_rate_limit(text) to authenticated;

comment on function public.consume_edge_rate_limit(text) is
  'Consumes the authenticated user fixed-window quota for an OCR Edge Function.';

commit;
