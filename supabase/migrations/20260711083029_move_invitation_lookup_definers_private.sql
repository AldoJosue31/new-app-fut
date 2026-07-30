begin;

create or replace function app_private.get_manager_invitation(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation public.manager_invitations%rowtype;
begin
  select * into v_invitation
  from public.manager_invitations
  where token = p_token
    and is_used = false
    and expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Invitacion invalida o expirada.');
  end if;

  return jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation.id,
    'league_name', v_invitation.league_name,
    'expires_at', v_invitation.expires_at
  );
exception when others then
  return jsonb_build_object('success', false, 'message', 'Invitacion invalida o expirada.');
end;
$$;

create or replace function app_private.get_delegate_invitation(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_record record;
begin
  select
    di.id,
    di.team_id,
    di.invited_name,
    di.invited_email,
    di.metadata ->> 'invited_phone' as invited_phone,
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
    and di.is_used = false
    and di.revoked_at is null
    and di.expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Invitacion invalida o expirada.');
  end if;

  return jsonb_build_object(
    'success', true,
    'invitation_id', v_record.id,
    'team_id', v_record.team_id,
    'team_name', v_record.team_name,
    'league_id', v_record.league_id,
    'league_name', v_record.league_name,
    'invited_name', v_record.invited_name,
    'invited_email', v_record.invited_email,
    'invited_phone', v_record.invited_phone,
    'expires_at', v_record.expires_at
  );
exception when others then
  return jsonb_build_object('success', false, 'message', 'Invitacion invalida o expirada.');
end;
$$;

revoke all on function app_private.get_manager_invitation(uuid) from public, anon, authenticated;
revoke all on function app_private.get_delegate_invitation(uuid) from public, anon, authenticated;
grant execute on function app_private.get_manager_invitation(uuid) to anon, authenticated;
grant execute on function app_private.get_delegate_invitation(uuid) to anon, authenticated;

create or replace function public.get_manager_invitation(p_token uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.get_manager_invitation(p_token);
$$;

create or replace function public.get_delegate_invitation(p_token uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.get_delegate_invitation(p_token);
$$;

revoke all on function public.get_manager_invitation(uuid) from public, anon, authenticated;
revoke all on function public.get_delegate_invitation(uuid) from public, anon, authenticated;
grant execute on function public.get_manager_invitation(uuid) to anon, authenticated;
grant execute on function public.get_delegate_invitation(uuid) to anon, authenticated;

commit;;
