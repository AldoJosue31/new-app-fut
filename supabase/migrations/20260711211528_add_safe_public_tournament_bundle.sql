
create or replace function app_private.get_public_tournament_bundle(p_tournament_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tournament record;
  v_matches jsonb := '[]'::jsonb;
  v_jornadas jsonb := '[]'::jsonb;
  v_teams jsonb := '[]'::jsonb;
  v_scorers jsonb := '[]'::jsonb;
  v_goal_events jsonb := '[]'::jsonb;
begin
  if p_tournament_id is null or p_tournament_id <= 0 then
    return jsonb_build_object('success', false, 'locked', false, 'message', 'Torneo no encontrado.');
  end if;

  select
    t.id,
    t.season,
    t.category,
    t.format,
    t.points_per_win,
    t.start_date,
    t.status,
    t.division_id,
    t.config,
    t.is_public,
    t.is_goleadores_public,
    d.name as division_name
  into v_tournament
  from public.tournaments t
  left join public.divisions d on d.id = t.division_id
  where t.id = p_tournament_id
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'locked', false, 'message', 'Torneo no encontrado.');
  end if;

  if coalesce(v_tournament.is_public, false) = false then
    return jsonb_build_object('success', false, 'locked', true, 'message', 'El acceso publico esta desactivado.');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', j.id,
        'tournament_id', j.tournament_id,
        'name', j.name,
        'status', j.status,
        'start_date', j.start_date,
        'end_date', j.end_date
      )
      order by j.id
    ),
    '[]'::jsonb
  )
  into v_jornadas
  from public.jornadas j
  where j.tournament_id = p_tournament_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'jornada_id', m.jornada_id,
        'team1_id', m.team1_id,
        'team2_id', m.team2_id,
        'goals1', m.goals1,
        'goals2', m.goals2,
        'date', m.date,
        'status', m.status,
        'observations', m.observations,
        'puntos1', m.puntos1,
        'puntos2', m.puntos2,
        'jornadas', jsonb_build_object(
          'id', j.id,
          'name', j.name,
          'tournament_id', j.tournament_id,
          'status', j.status
        )
      )
      order by m.id
    ),
    '[]'::jsonb
  )
  into v_matches
  from public.matches m
  join public.jornadas j on j.id = m.jornada_id
  where j.tournament_id = p_tournament_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'color', t.color,
        'logo_url', t.logo_url,
        'status', t.status,
        'division_id', t.division_id
      )
      order by t.name, t.id
    ),
    '[]'::jsonb
  )
  into v_teams
  from public.teams t
  where t.division_id = v_tournament.division_id;

  if coalesce(v_tournament.is_goleadores_public, false) then
    select coalesce(
      jsonb_agg(to_jsonb(s) order by s.goals desc, s.first_name, s.last_name),
      '[]'::jsonb
    )
    into v_scorers
    from (
      select
        vg.player_id,
        vg.first_name,
        vg.last_name,
        vg.dorsal,
        vg.photo_url,
        vg.team_id,
        vg.team_name,
        vg.team_logo,
        vg.team_color,
        vg.tournament_id,
        vg.division_id,
        vg.division_name,
        vg.goals
      from public.view_goleadores vg
      where vg.tournament_id = p_tournament_id
      order by vg.goals desc, vg.first_name, vg.last_name
      limit 20
    ) s;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', me.id,
          'match_id', me.match_id,
          'player_id', me.player_id,
          'event_type', me.event_type,
          'players', jsonb_build_object(
            'id', p.id,
            'first_name', p.first_name,
            'last_name', p.last_name,
            'dorsal', p.dorsal,
            'photo_url', p.photo_url,
            'team_id', p.team_id
          ),
          'matches', jsonb_build_object(
            'id', m.id,
            'status', m.status,
            'team1_id', m.team1_id,
            'team2_id', m.team2_id,
            'jornadas', jsonb_build_object(
              'id', j.id,
              'name', j.name,
              'tournament_id', j.tournament_id
            )
          )
        )
        order by me.id
      ),
      '[]'::jsonb
    )
    into v_goal_events
    from public.match_events me
    join public.players p on p.id = me.player_id
    join public.matches m on m.id = me.match_id
    join public.jornadas j on j.id = m.jornada_id
    where j.tournament_id = p_tournament_id
      and (me.event_type ilike '%gol%' or me.event_type ilike '%goal%');
  end if;

  return jsonb_build_object(
    'success', true,
    'locked', false,
    'tournament', jsonb_build_object(
      'id', v_tournament.id,
      'season', v_tournament.season,
      'category', v_tournament.category,
      'format', v_tournament.format,
      'points_per_win', v_tournament.points_per_win,
      'start_date', v_tournament.start_date,
      'status', v_tournament.status,
      'division_id', v_tournament.division_id,
      'division_nombre', v_tournament.division_name,
      'config', v_tournament.config,
      'is_public', v_tournament.is_public,
      'is_goleadores_public', v_tournament.is_goleadores_public
    ),
    'matches', v_matches,
    'jornadas', v_jornadas,
    'teams', v_teams,
    'scorers', v_scorers,
    'goal_events', v_goal_events
  );
exception when others then
  return jsonb_build_object('success', false, 'locked', false, 'message', 'No se pudo cargar el torneo.');
end;
$$;

revoke all on function app_private.get_public_tournament_bundle(bigint) from public;
grant execute on function app_private.get_public_tournament_bundle(bigint) to anon, authenticated;

create or replace function public.get_public_tournament_bundle(p_tournament_id bigint)
returns jsonb
language sql
stable
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.get_public_tournament_bundle(p_tournament_id);
$$;

revoke all on function public.get_public_tournament_bundle(bigint) from public;
grant execute on function public.get_public_tournament_bundle(bigint) to anon, authenticated;
;
