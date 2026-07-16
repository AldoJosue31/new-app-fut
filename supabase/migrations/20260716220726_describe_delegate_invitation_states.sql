create or replace function app_private.get_delegate_invitation(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_record record;
  v_status text;
begin
  select
    di.id,
    di.team_id,
    di.invited_name,
    di.invited_email,
    di.metadata ->> 'invited_phone' as invited_phone,
    di.is_used,
    di.used_at,
    di.revoked_at,
    di.expires_at,
    t.name as team_name,
    l.id as league_id,
    l.name as league_name
  into v_record
  from public.delegate_invitations di
  join public.teams t on t.id = di.team_id
  join public.divisions d on d.id = t.division_id
  join public.leagues l on l.id = d.league_id
  where di.token = p_token
  limit 1;

  if not found then
    return jsonb_build_object(
      'success', false,
      'status', 'invalid',
      'message', 'La invitacion no existe o el enlace esta incompleto.'
    );
  end if;

  v_status := case
    when v_record.is_used then 'used'
    when v_record.revoked_at is not null then 'revoked'
    when v_record.expires_at <= now() then 'expired'
    else 'active'
  end;

  return jsonb_build_object(
    'success', true,
    'status', v_status,
    'available', v_status = 'active',
    'invitation_id', v_record.id,
    'team_id', v_record.team_id,
    'team_name', v_record.team_name,
    'league_id', v_record.league_id,
    'league_name', v_record.league_name,
    'invited_name', case when v_status = 'active' then v_record.invited_name end,
    'invited_email', case when v_status = 'active' then v_record.invited_email end,
    'invited_phone', case when v_status = 'active' then v_record.invited_phone end,
    'expires_at', v_record.expires_at,
    'used_at', v_record.used_at,
    'revoked_at', v_record.revoked_at
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'status', 'invalid',
    'message', 'No se pudo validar esta invitacion.'
  );
end;
$$;

comment on function app_private.get_delegate_invitation(uuid) is
  'Returns a privacy-limited public description of a delegate invitation and its lifecycle state.';
