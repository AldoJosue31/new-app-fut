alter table public.delegate_change_requests
  drop constraint delegate_change_requests_target_check;

alter table public.delegate_change_requests
  add constraint delegate_change_requests_target_check
  check (
    (
      entity_type = 'team'
      and action_type = 'update'
      and player_id is null
    )
    or (
      entity_type = 'player'
      and (
        (
          action_type = 'insert'
          and (
            player_id is null
            or (status = 'applied' and player_id is not null)
          )
        )
        or (
          action_type in ('update', 'archive', 'restore')
          and player_id is not null
        )
      )
    )
  );

create or replace function public.submit_delegate_change_request(
  p_team_id bigint,
  p_entity_type text,
  p_action_type text,
  p_payload jsonb default '{}'::jsonb,
  p_player_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_league_id bigint;
  v_requires_approval boolean;
  v_request_id uuid;
  v_applied_player_id bigint;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Autenticacion requerida.');
  end if;

  if p_entity_type = 'player'
    and p_action_type = 'insert'
    and p_player_id is not null then
    return jsonb_build_object('success', false, 'message', 'Una alta de jugador no puede incluir player_id.');
  end if;

  v_league_id := app_private.team_league_id(p_team_id);

  if v_league_id is null then
    return jsonb_build_object('success', false, 'message', 'Equipo no encontrado.');
  end if;

  if not app_private.is_team_delegate(p_team_id) then
    return jsonb_build_object('success', false, 'message', 'No autorizado para enviar cambios en este equipo.');
  end if;

  select delegate_changes_require_approval
  into v_requires_approval
  from public.leagues
  where id = v_league_id;

  if coalesce(v_requires_approval, true) then
    insert into public.delegate_change_requests (
      team_id, league_id, player_id, entity_type, action_type, status,
      payload, requires_approval, submitted_by
    )
    values (
      p_team_id, v_league_id, p_player_id, p_entity_type, p_action_type, 'pending',
      coalesce(p_payload, '{}'::jsonb), true, auth.uid()
    )
    returning id into v_request_id;

    return jsonb_build_object(
      'success', true,
      'request_id', v_request_id,
      'status', 'pending'
    );
  end if;

  v_applied_player_id := app_private.apply_delegate_change(
    p_team_id,
    p_entity_type,
    p_action_type,
    coalesce(p_payload, '{}'::jsonb),
    p_player_id
  );

  insert into public.delegate_change_requests (
    team_id, league_id, player_id, entity_type, action_type, status,
    payload, requires_approval, submitted_by, reviewed_at, applied_at
  )
  values (
    p_team_id,
    v_league_id,
    coalesce(p_player_id, v_applied_player_id),
    p_entity_type,
    p_action_type,
    'applied',
    coalesce(p_payload, '{}'::jsonb),
    false,
    auth.uid(),
    now(),
    now()
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'status', 'applied',
    'player_id', coalesce(p_player_id, v_applied_player_id)
  );
exception when others then
  return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$function$;;
