begin;

-- A result is a compound write: scores, match metadata and all of its event
-- rows must change together. The revision lets an older editor fail safely
-- after another browser has already committed a newer result.
alter table public.matches
  add column if not exists result_revision bigint not null default 0;

alter table public.matches
  drop constraint if exists matches_result_revision_nonnegative_check;

alter table public.matches
  add constraint matches_result_revision_nonnegative_check
  check (result_revision >= 0);

create or replace function public.save_match_result_atomic(
  p_match_id bigint,
  p_expected_revision bigint,
  p_updates jsonb,
  p_events jsonb default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_match record;
  v_saved_match public.matches%rowtype;
  v_event jsonb;
  v_event_type text;
  v_player_id bigint;
  v_goals1 integer;
  v_goals2 integer;
  v_puntos1 integer;
  v_puntos2 integer;
  v_referee_id bigint;
  v_jornada_id bigint;
  v_team1_id bigint;
  v_team2_id bigint;
  v_status text;
  v_observations text;
  v_date timestamp with time zone;
  v_authorized_league_id bigint;
  v_invalid_key text;
  v_participant_ids bigint[] := array[]::bigint[];
  v_actor_ids bigint[] := array[]::bigint[];
  v_allowed_update_keys text[] := array[
    'goals1',
    'goals2',
    'puntos1',
    'puntos2',
    'referee_id',
    'status',
    'observations',
    'date',
    'jornada_id',
    'team1_id',
    'team2_id'
  ];
begin
  if (select auth.uid()) is null
     or not app_private.is_active_user() then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_FORBIDDEN';
  end if;

  if p_match_id is null or p_match_id <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_INVALID_MATCH';
  end if;

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_INVALID_REVISION';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'object' then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_INVALID_PAYLOAD';
  end if;

  select update_key.key
  into v_invalid_key
  from jsonb_object_keys(p_updates) as update_key(key)
  where not (update_key.key = any(v_allowed_update_keys))
  limit 1;

  if found then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_INVALID_FIELD',
      detail = v_invalid_key;
  end if;

  if p_events is not null and jsonb_typeof(p_events) <> 'array' then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_INVALID_EVENTS';
  end if;

  if p_events is not null and jsonb_array_length(p_events) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_TOO_MANY_EVENTS';
  end if;

  -- SECURITY DEFINER intentionally bypasses RLS so result writes remain
  -- available after direct table DML is revoked. Check the same active
  -- league-manager membership that the former write policies required before
  -- acquiring the row lock, then re-check it after the lock below.
  select d.league_id
  into v_authorized_league_id
    from public.matches m
    join public.jornadas j on j.id = m.jornada_id
    join public.tournaments t on t.id = j.tournament_id
    join public.divisions d on d.id = t.division_id
    join public.league_admins la on la.league_id = d.league_id
    where m.id = p_match_id
      and la.user_id = (select auth.uid())
    for share of la;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_FORBIDDEN';
  end if;

  -- The row lock serializes every result save for this match. The expected
  -- revision is checked after waiting for an earlier save to commit.
  select
    m.id,
    m.jornada_id,
    m.team1_id,
    m.team2_id,
    m.status,
    m.goals1,
    m.goals2,
    m.result_revision,
    j.tournament_id,
    t.division_id,
    d.league_id
  into v_match
  from public.matches m
  join public.jornadas j on j.id = m.jornada_id
  join public.tournaments t on t.id = j.tournament_id
  join public.divisions d on d.id = t.division_id
  where m.id = p_match_id
  for update of m;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_MATCH_NOT_FOUND';
  end if;

  if not app_private.is_active_user()
     or v_match.league_id is distinct from v_authorized_league_id
     or not exists (
       select 1
       from public.league_admins la
       where la.league_id = v_match.league_id
         and la.user_id = (select auth.uid())
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_FORBIDDEN';
  end if;

  if p_expected_revision <> v_match.result_revision then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_STALE',
      detail = jsonb_build_object(
        'current_revision',
        v_match.result_revision
      )::text,
      hint = 'Recarga el partido antes de volver a guardar.';
  end if;

  if p_updates ? 'goals1' then
    if p_updates -> 'goals1' = 'null'::jsonb then
      v_goals1 := null;
    elsif (p_updates ->> 'goals1') !~ '^[0-9]+$' then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_GOALS1';
    else
      v_goals1 := (p_updates ->> 'goals1')::integer;
    end if;
  end if;

  if p_updates ? 'goals2' then
    if p_updates -> 'goals2' = 'null'::jsonb then
      v_goals2 := null;
    elsif (p_updates ->> 'goals2') !~ '^[0-9]+$' then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_GOALS2';
    else
      v_goals2 := (p_updates ->> 'goals2')::integer;
    end if;
  end if;

  if p_updates ? 'puntos1' then
    if p_updates -> 'puntos1' = 'null'::jsonb then
      v_puntos1 := null;
    elsif (p_updates ->> 'puntos1') !~ '^[+-]?[0-9]+$' then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_POINTS1';
    else
      v_puntos1 := (p_updates ->> 'puntos1')::integer;
    end if;
  end if;

  if p_updates ? 'puntos2' then
    if p_updates -> 'puntos2' = 'null'::jsonb then
      v_puntos2 := null;
    elsif (p_updates ->> 'puntos2') !~ '^[+-]?[0-9]+$' then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_POINTS2';
    else
      v_puntos2 := (p_updates ->> 'puntos2')::integer;
    end if;
  end if;

  if p_updates ? 'referee_id' then
    if p_updates -> 'referee_id' = 'null'::jsonb then
      v_referee_id := null;
    elsif (p_updates ->> 'referee_id') !~ '^[0-9]+$' then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_REFEREE';
    else
      v_referee_id := (p_updates ->> 'referee_id')::bigint;
      if not exists (
        select 1
        from public.referees r
        where r.id = v_referee_id
          and r.league_id = v_match.league_id
      ) then
        raise exception using errcode = 'P0001', message = 'RESULT_INVALID_REFEREE';
      end if;
    end if;
  end if;

  if p_updates ? 'status' then
    v_status := nullif(trim(p_updates ->> 'status'), '');
    if v_status is null
       or v_status not in ('Pendiente', 'Programado', 'Finalizado', 'Cancelado') then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_STATUS';
    end if;
  end if;

  if p_updates ? 'observations' then
    if p_updates -> 'observations' = 'null'::jsonb then
      v_observations := null;
    elsif jsonb_typeof(p_updates -> 'observations') <> 'string' then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_OBSERVATIONS';
    else
      v_observations := p_updates ->> 'observations';
    end if;
  end if;

  if p_updates ? 'date' then
    if p_updates -> 'date' = 'null'::jsonb
       or nullif(trim(p_updates ->> 'date'), '') is null then
      v_date := null;
    elsif jsonb_typeof(p_updates -> 'date') <> 'string' then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_DATE';
    else
      begin
        v_date := (p_updates ->> 'date')::timestamp with time zone;
      exception
        when others then
          raise exception using errcode = 'P0001', message = 'RESULT_INVALID_DATE';
      end;
    end if;
  end if;

  if p_updates ? 'jornada_id' then
    if (p_updates ->> 'jornada_id') !~ '^[0-9]+$' then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_JORNADA';
    end if;

    v_jornada_id := (p_updates ->> 'jornada_id')::bigint;
    if not exists (
      select 1
      from public.jornadas j
      where j.id = v_jornada_id
        and j.tournament_id = v_match.tournament_id
    ) then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_JORNADA';
    end if;
  end if;

  if p_updates ? 'team1_id' then
    if (p_updates ->> 'team1_id') !~ '^[0-9]+$' then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_TEAM1';
    end if;

    v_team1_id := (p_updates ->> 'team1_id')::bigint;
    if not exists (
      select 1
      from public.teams t
      where t.id = v_team1_id
        and t.division_id = v_match.division_id
    ) then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_TEAM1';
    end if;
  end if;

  if p_updates ? 'team2_id' then
    if p_updates -> 'team2_id' = 'null'::jsonb then
      v_team2_id := null;
    elsif (p_updates ->> 'team2_id') !~ '^[0-9]+$' then
      raise exception using errcode = 'P0001', message = 'RESULT_INVALID_TEAM2';
    else
      v_team2_id := (p_updates ->> 'team2_id')::bigint;
      if not exists (
        select 1
        from public.teams t
        where t.id = v_team2_id
          and t.division_id = v_match.division_id
      ) then
        raise exception using errcode = 'P0001', message = 'RESULT_INVALID_TEAM2';
      end if;
    end if;
  end if;

  if (case when p_updates ? 'team2_id' then v_team2_id else v_match.team2_id end) is not null
     and (case when p_updates ? 'team1_id' then v_team1_id else v_match.team1_id end) =
       (case when p_updates ? 'team2_id' then v_team2_id else v_match.team2_id end) then
    raise exception using errcode = 'P0001', message = 'RESULT_DUPLICATE_TEAMS';
  end if;

  if (
    (p_updates ? 'team1_id' and v_team1_id is distinct from v_match.team1_id)
    or (p_updates ? 'team2_id' and v_team2_id is distinct from v_match.team2_id)
  ) and (
    v_match.status = 'Finalizado'
    or v_match.goals1 is not null
    or v_match.goals2 is not null
    or p_events is not null
    or exists (
      select 1
      from public.match_events event_row
      where event_row.match_id = p_match_id
    )
  ) then
    raise exception using errcode = 'P0001', message = 'RESULT_CANNOT_CHANGE_TEAMS';
  end if;

  if p_events is not null then
    for v_event in
      select event.value
      from jsonb_array_elements(p_events) as event(value)
    loop
      if jsonb_typeof(v_event) <> 'object' then
        raise exception using errcode = 'P0001', message = 'RESULT_INVALID_EVENT';
      end if;

      v_event_type := nullif(trim(v_event ->> 'event_type'), '');
      if v_event_type is null
         or v_event_type not in (
           'participation',
           'goal',
           'own_goal',
           'yellow_card',
           'red_card'
         ) then
        raise exception using errcode = 'P0001', message = 'RESULT_INVALID_EVENT';
      end if;

      if not (v_event ? 'player_id')
         or v_event -> 'player_id' = 'null'::jsonb
         or (v_event ->> 'player_id') !~ '^[0-9]+$' then
        raise exception using errcode = 'P0001', message = 'RESULT_INVALID_EVENT_PLAYER';
      end if;

      v_player_id := (v_event ->> 'player_id')::bigint;
      if not exists (
        select 1
        from public.players p
        where p.id = v_player_id
          and p.team_id in (v_match.team1_id, v_match.team2_id)
      ) then
        raise exception using errcode = 'P0001', message = 'RESULT_EVENT_PLAYER_OUTSIDE_MATCH';
      end if;

      if v_event_type = 'participation' then
        if v_player_id = any(v_participant_ids) then
          raise exception using
            errcode = 'P0001',
            message = 'RESULT_DUPLICATE_PARTICIPATION';
        end if;

        v_participant_ids := array_append(v_participant_ids, v_player_id);
      else
        v_actor_ids := array_append(v_actor_ids, v_player_id);
      end if;
    end loop;

    if exists (
      select 1
      from unnest(v_actor_ids) as actor(player_id)
      where actor.player_id <> all(v_participant_ids)
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'RESULT_EVENT_WITHOUT_PARTICIPATION';
    end if;

    delete from public.match_events
    where match_id = p_match_id;

    insert into public.match_events (match_id, player_id, event_type)
    select
      p_match_id,
      (event.value ->> 'player_id')::bigint,
      event.value ->> 'event_type'
    from jsonb_array_elements(p_events) as event(value);
  end if;

  update public.matches as m
  set
    goals1 = case when p_updates ? 'goals1' then v_goals1 else m.goals1 end,
    goals2 = case when p_updates ? 'goals2' then v_goals2 else m.goals2 end,
    puntos1 = case when p_updates ? 'puntos1' then v_puntos1 else m.puntos1 end,
    puntos2 = case when p_updates ? 'puntos2' then v_puntos2 else m.puntos2 end,
    referee_id = case when p_updates ? 'referee_id' then v_referee_id else m.referee_id end,
    status = case when p_updates ? 'status' then v_status else m.status end,
    observations = case when p_updates ? 'observations' then v_observations else m.observations end,
    date = case when p_updates ? 'date' then v_date else m.date end,
    jornada_id = case when p_updates ? 'jornada_id' then v_jornada_id else m.jornada_id end,
    team1_id = case when p_updates ? 'team1_id' then v_team1_id else m.team1_id end,
    team2_id = case when p_updates ? 'team2_id' then v_team2_id else m.team2_id end,
    result_revision = m.result_revision + 1
  where m.id = p_match_id
  returning m.* into v_saved_match;

  return jsonb_build_object(
    'match',
    jsonb_build_object(
      'id', v_saved_match.id,
      'date', v_saved_match.date,
      'jornada_id', v_saved_match.jornada_id,
      'team1_id', v_saved_match.team1_id,
      'team2_id', v_saved_match.team2_id,
      'goals1', v_saved_match.goals1,
      'goals2', v_saved_match.goals2,
      'observations', v_saved_match.observations,
      'puntos1', v_saved_match.puntos1,
      'puntos2', v_saved_match.puntos2,
      'referee_id', v_saved_match.referee_id,
      'result_revision', v_saved_match.result_revision,
      'status', v_saved_match.status
    )
  );
end;
$function$;

-- The tournament-wide reset is also a compound mutation. It locks every
-- affected match in a stable order so it cannot interleave its event deletes
-- with a concurrent individual result save.
create or replace function public.clear_tournament_results_atomic(
  p_tournament_id bigint
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_match record;
  v_match_count integer := 0;
  v_jornada_count integer := 0;
  v_league_id bigint;
  v_authorized_league_id bigint;
begin
  if (select auth.uid()) is null
     or not app_private.is_active_user() then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_FORBIDDEN';
  end if;

  if p_tournament_id is null or p_tournament_id <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_INVALID_TOURNAMENT';
  end if;

  select d.league_id
  into v_league_id
  from public.tournaments t
  join public.divisions d on d.id = t.division_id
  where t.id = p_tournament_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_INVALID_TOURNAMENT';
  end if;

  select la.league_id
  into v_authorized_league_id
    from public.league_admins la
    where la.league_id = v_league_id
      and la.user_id = (select auth.uid())
    for share;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_FORBIDDEN';
  end if;

  for v_match in
    select m.id, m.date
    from public.matches m
    join public.jornadas j on j.id = m.jornada_id
    where j.tournament_id = p_tournament_id
    order by m.id
    for update of m
  loop
    -- Keep authorization valid while the reset waits for concurrent result
    -- saves. The membership row itself is held FOR SHARE above, so a revocation
    -- cannot interleave after this check.
    if not app_private.is_active_user()
       or v_authorized_league_id is distinct from v_league_id
       or not exists (
         select 1
         from public.league_admins la
         where la.league_id = v_league_id
           and la.user_id = (select auth.uid())
       ) then
      raise exception using
        errcode = 'P0001',
        message = 'RESULT_FORBIDDEN';
    end if;

    delete from public.match_events
    where match_id = v_match.id;

    update public.matches as m
    set
      goals1 = null,
      goals2 = null,
      puntos1 = null,
      puntos2 = null,
      referee_id = null,
      observations = null,
      status = case when v_match.date is null then 'Pendiente' else 'Programado' end,
      result_revision = m.result_revision + 1
    where m.id = v_match.id;

    v_match_count := v_match_count + 1;
  end loop;

  if not app_private.is_active_user()
     or v_authorized_league_id is distinct from v_league_id
     or not exists (
       select 1
       from public.league_admins la
       where la.league_id = v_league_id
         and la.user_id = (select auth.uid())
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'RESULT_FORBIDDEN';
  end if;

  update public.jornadas
  set status = 'Pendiente'
  where tournament_id = p_tournament_id;
  get diagnostics v_jornada_count = row_count;

  return jsonb_build_object(
    'match_count', v_match_count,
    'jornada_count', v_jornada_count
  );
end;
$function$;

revoke all on function public.save_match_result_atomic(bigint, bigint, jsonb, jsonb)
from public, anon, authenticated;

grant execute on function public.save_match_result_atomic(bigint, bigint, jsonb, jsonb)
to authenticated;

revoke all on function public.clear_tournament_results_atomic(bigint)
from public, anon, authenticated;

grant execute on function public.clear_tournament_results_atomic(bigint)
to authenticated;

-- Scores and event rows must be written exclusively through the authenticated
-- RPCs above. Fixture creation and removal retain only the least privilege
-- needed by the current planner; RLS guards below keep those direct operations
-- result-free.
revoke all privileges on table public.match_events
from public, anon, authenticated;

grant select on table public.match_events
to authenticated;

revoke all privileges on table public.matches
from public, anon, authenticated;

grant select, delete on table public.matches
to authenticated;

grant insert (
  jornada_id,
  team1_id,
  team2_id,
  referee_id,
  court_id,
  date,
  status,
  observations
) on table public.matches to authenticated;

drop policy if exists matches_direct_fixture_insert_guard on public.matches;
create policy matches_direct_fixture_insert_guard
on public.matches
as restrictive
for insert
to authenticated
with check (
  coalesce(matches.status, 'Programado') in ('Pendiente', 'Programado')
  and matches.goals1 is null
  and matches.goals2 is null
  and coalesce(matches.puntos1, 0) = 0
  and coalesce(matches.puntos2, 0) = 0
  and matches.mvp_player_id is null
  and matches.result_revision = 0
);

drop policy if exists matches_direct_fixture_delete_guard on public.matches;
create policy matches_direct_fixture_delete_guard
on public.matches
as restrictive
for delete
to authenticated
using (
  coalesce(matches.status, 'Programado') in ('Pendiente', 'Programado')
  and matches.goals1 is null
  and matches.goals2 is null
  and coalesce(matches.puntos1, 0) = 0
  and coalesce(matches.puntos2, 0) = 0
  and matches.mvp_player_id is null
  and exists (
    select 1
    from public.jornadas j
    where j.id = matches.jornada_id
      and coalesce(j.status, 'Pendiente') not in ('Confirmada', 'Finalizada')
  )
  and not exists (
    select 1
    from public.match_events event_row
    where event_row.match_id = matches.id
  )
);

-- Deleting a round cascades to its matches, so it needs the same result-data
-- boundary as direct fixture deletion. Tournament deletion remains its own
-- explicit manager action and is intentionally not repurposed for this flow.
drop policy if exists jornadas_direct_clean_delete_guard on public.jornadas;
create policy jornadas_direct_clean_delete_guard
on public.jornadas
as restrictive
for delete
to authenticated
using (
  coalesce(jornadas.status, 'Pendiente') not in ('Confirmada', 'Finalizada')
  and not exists (
    select 1
    from public.matches m
    where m.jornada_id = jornadas.id
      and (
        coalesce(m.status, 'Programado') not in ('Pendiente', 'Programado')
        or m.goals1 is not null
        or m.goals2 is not null
        or coalesce(m.puntos1, 0) <> 0
        or coalesce(m.puntos2, 0) <> 0
        or m.mvp_player_id is not null
        or exists (
          select 1
          from public.match_events event_row
          where event_row.match_id = m.id
        )
      )
  )
);

commit;
