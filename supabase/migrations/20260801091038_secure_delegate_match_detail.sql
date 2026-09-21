begin;

-- A delegate may read events only for a match involving one of their assigned
-- teams. League managers and platform admins keep their existing league scope.
create or replace function app_private.can_read_match_event(p_match_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and app_private.is_active_user()
    and exists (
      select 1
      from public.matches m
      join public.jornadas j on j.id = m.jornada_id
      join public.tournaments t on t.id = j.tournament_id
      join public.divisions d on d.id = t.division_id
      where m.id = p_match_id
        and (
          app_private.is_league_admin(d.league_id)
          or app_private.is_team_delegate(m.team1_id)
          or app_private.is_team_delegate(m.team2_id)
        )
    );
$$;

revoke all on function app_private.can_read_match_event(bigint)
from public, anon, authenticated, service_role;
grant execute on function app_private.can_read_match_event(bigint)
to authenticated;

-- Make the ownership condition explicit on both the old and resulting profile
-- row. Protected role/suspension fields remain guarded by
-- profiles_protect_sensitive_fields.
drop policy if exists profiles_self_update on public.profiles;

create policy profiles_self_update
on public.profiles
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

-- This function deliberately returns a small sports-only projection. It lets an
-- assigned delegate see the rival roster for this match without exposing player
-- birth dates/identity documents or delegate contact information.
create or replace function app_private.get_authorized_match_detail(
  p_match_id bigint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_match record;
  v_result jsonb;
begin
  if p_match_id is null or p_match_id <= 0 then
    raise exception using
      errcode = '22023',
      message = 'Identificador de partido invalido.';
  end if;

  if (select auth.uid()) is null or not app_private.is_active_user() then
    raise exception using
      errcode = '42501',
      message = 'No autorizado para consultar este partido.';
  end if;

  select
    m.id,
    m.jornada_id,
    m.team1_id,
    m.team2_id,
    m.goals1,
    m.goals2,
    m.date,
    m.status,
    m.observations,
    j.name as jornada_name,
    d.league_id
  into v_match
  from public.matches m
  join public.jornadas j on j.id = m.jornada_id
  join public.tournaments tournament on tournament.id = j.tournament_id
  join public.divisions d on d.id = tournament.division_id
  where m.id = p_match_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Partido no encontrado.';
  end if;

  if not (
    app_private.is_league_admin(v_match.league_id)
    or app_private.is_team_delegate(v_match.team1_id)
    or app_private.is_team_delegate(v_match.team2_id)
  ) then
    raise exception using
      errcode = '42501',
      message = 'No autorizado para consultar este partido.';
  end if;

  select jsonb_build_object(
    'id', v_match.id,
    'jornada_id', v_match.jornada_id,
    'jornada_name', v_match.jornada_name,
    'date', v_match.date,
    'status', v_match.status,
    'observations', v_match.observations,
    'goals1', v_match.goals1,
    'goals2', v_match.goals2,
    'teams', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', team.id,
          'name', team.name,
          'logo_url', team.logo_url,
          'color', team.color,
          'side', match_team.side,
          'score', match_team.score,
          'players', coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'id', player.id,
                  'team_id', player.team_id,
                  'first_name', player.first_name,
                  'last_name', player.last_name,
                  'dorsal', player.dorsal,
                  'photo_url', player.photo_url,
                  'goals', event_totals.goals,
                  'own_goals', event_totals.own_goals,
                  'yellow_cards', event_totals.yellow_cards,
                  'red_cards', event_totals.red_cards,
                  'participated', event_totals.total_events > 0
                )
                order by
                  player.dorsal nulls last,
                  player.first_name nulls last,
                  player.last_name nulls last,
                  player.id
              )
              from public.players player
              cross join lateral (
                select
                  count(*) filter (
                    where lower(trim(match_event.event_type)) = 'goal'
                  )::integer as goals,
                  count(*) filter (
                    where lower(trim(match_event.event_type)) = 'own_goal'
                  )::integer as own_goals,
                  count(*) filter (
                    where lower(trim(match_event.event_type)) = 'yellow_card'
                  )::integer as yellow_cards,
                  count(*) filter (
                    where lower(trim(match_event.event_type)) = 'red_card'
                  )::integer as red_cards,
                  count(*)::integer as total_events
                from public.match_events match_event
                where match_event.match_id = v_match.id
                  and match_event.player_id = player.id
              ) event_totals
              where player.team_id = team.id
                and (
                  coalesce(player.is_active, true)
                  or event_totals.total_events > 0
                )
            ),
            '[]'::jsonb
          )
        )
        order by match_team.sort_order
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from (
    values
      (1, 'home'::text, v_match.team1_id, v_match.goals1),
      (2, 'away'::text, v_match.team2_id, v_match.goals2)
  ) as match_team(sort_order, side, team_id, score)
  join public.teams team on team.id = match_team.team_id;

  return v_result;
end;
$$;

revoke all on function app_private.get_authorized_match_detail(bigint)
from public, anon, authenticated, service_role;
grant execute on function app_private.get_authorized_match_detail(bigint)
to authenticated;

create or replace function public.get_match_detail(p_match_id bigint)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.get_authorized_match_detail(p_match_id);
$$;

revoke all on function public.get_match_detail(bigint)
from public, anon, authenticated, service_role;
grant execute on function public.get_match_detail(bigint)
to authenticated;

comment on function public.get_match_detail(bigint) is
  'Read-only sports detail for league managers/admins or a delegate assigned to either team.';

do $$
begin
  if has_function_privilege('anon', 'public.get_match_detail(bigint)', 'execute') then
    raise exception 'anon must not execute get_match_detail';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.get_match_detail(bigint)',
    'execute'
  ) then
    raise exception 'authenticated must execute get_match_detail';
  end if;

  if not exists (
    select 1
    from pg_trigger profile_trigger
    join pg_class relation on relation.oid = profile_trigger.tgrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where not profile_trigger.tgisinternal
      and namespace.nspname = 'public'
      and relation.relname = 'profiles'
      and profile_trigger.tgname = 'profiles_protect_sensitive_fields'
  ) then
    raise exception 'profile security trigger is required';
  end if;
end;
$$;

commit;
