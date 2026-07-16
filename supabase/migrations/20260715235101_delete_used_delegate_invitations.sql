create or replace function app_private.delete_used_delegate_invitation(
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_team_id bigint;
  v_is_used boolean;
  v_league_id bigint;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Autenticacion requerida.'
    );
  end if;

  select team_id, is_used
  into v_team_id, v_is_used
  from public.delegate_invitations
  where id = p_invitation_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'Invitacion no encontrada.'
    );
  end if;

  v_league_id := app_private.team_league_id(v_team_id);

  if not app_private.is_league_admin(v_league_id) then
    return jsonb_build_object(
      'success', false,
      'message', 'No autorizado para eliminar esta invitacion.'
    );
  end if;

  if not v_is_used then
    return jsonb_build_object(
      'success', false,
      'message', 'Solo se pueden eliminar invitaciones utilizadas.'
    );
  end if;

  delete from public.delegate_invitations
  where id = p_invitation_id
    and is_used = true;

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'La invitacion ya no esta disponible para eliminarse.'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'invitation_id', p_invitation_id,
    'team_id', v_team_id
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'message', 'No se pudo eliminar la invitacion.'
  );
end;
$$;

create or replace function public.delete_used_delegate_invitation(
  p_invitation_id uuid
)
returns jsonb
language sql
set search_path = 'public', 'app_private', 'pg_temp'
as $$
  select app_private.delete_used_delegate_invitation(p_invitation_id);
$$;

revoke all on function app_private.delete_used_delegate_invitation(uuid)
from public;
revoke all on function app_private.delete_used_delegate_invitation(uuid)
from anon;
grant execute on function app_private.delete_used_delegate_invitation(uuid)
to authenticated;

revoke all on function public.delete_used_delegate_invitation(uuid)
from public;
revoke all on function public.delete_used_delegate_invitation(uuid)
from anon;
grant execute on function public.delete_used_delegate_invitation(uuid)
to authenticated;
grant execute on function public.delete_used_delegate_invitation(uuid)
to service_role;
