create extension if not exists pg_cron;

create or replace function app_private.delete_delegate_invitation(
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_invitation public.delegate_invitations%rowtype;
  v_league_id bigint;
  v_status text;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Autenticacion requerida.'
    );
  end if;

  select *
  into v_invitation
  from public.delegate_invitations
  where id = p_invitation_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'Invitacion no encontrada.'
    );
  end if;

  v_league_id := app_private.team_league_id(v_invitation.team_id);

  if not app_private.is_league_admin(v_league_id) then
    return jsonb_build_object(
      'success', false,
      'message', 'No autorizado para eliminar esta invitacion.'
    );
  end if;

  if not v_invitation.is_used
    and v_invitation.revoked_at is null
    and v_invitation.expires_at > now() then
    return jsonb_build_object(
      'success', false,
      'message', 'Revoca la invitacion activa antes de eliminarla.'
    );
  end if;

  v_status := case
    when v_invitation.is_used then 'used'
    when v_invitation.revoked_at is not null then 'revoked'
    else 'expired'
  end;

  delete from public.delegate_invitations
  where id = p_invitation_id
    and (
      is_used
      or revoked_at is not null
      or expires_at <= now()
    );

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'La invitacion ya no esta disponible para eliminarse.'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'invitation_id', p_invitation_id,
    'team_id', v_invitation.team_id,
    'status', v_status
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'message', 'No se pudo eliminar la invitacion.'
  );
end;
$$;

create or replace function public.delete_delegate_invitation(
  p_invitation_id uuid
)
returns jsonb
language sql
set search_path = 'public', 'app_private', 'pg_temp'
as $$
  select app_private.delete_delegate_invitation(p_invitation_id);
$$;

revoke all on function app_private.delete_delegate_invitation(uuid)
from public;
revoke all on function app_private.delete_delegate_invitation(uuid)
from anon;
grant execute on function app_private.delete_delegate_invitation(uuid)
to authenticated;
grant execute on function app_private.delete_delegate_invitation(uuid)
to service_role;

revoke all on function public.delete_delegate_invitation(uuid)
from public;
revoke all on function public.delete_delegate_invitation(uuid)
from anon;
grant execute on function public.delete_delegate_invitation(uuid)
to authenticated;
grant execute on function public.delete_delegate_invitation(uuid)
to service_role;

create or replace function app_private.reactivate_expired_delegate_invitation(
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_invitation public.delegate_invitations%rowtype;
  v_league_id bigint;
  v_expires_at timestamp with time zone;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Autenticacion requerida.'
    );
  end if;

  select *
  into v_invitation
  from public.delegate_invitations
  where id = p_invitation_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'Invitacion no encontrada.'
    );
  end if;

  v_league_id := app_private.team_league_id(v_invitation.team_id);

  if not app_private.is_league_admin(v_league_id) then
    return jsonb_build_object(
      'success', false,
      'message', 'No autorizado para reactivar esta invitacion.'
    );
  end if;

  if v_invitation.is_used then
    return jsonb_build_object(
      'success', false,
      'message', 'Una invitacion utilizada no se puede reactivar.'
    );
  end if;

  if v_invitation.revoked_at is not null then
    return jsonb_build_object(
      'success', false,
      'message', 'Esta accion solo reactiva invitaciones caducadas.'
    );
  end if;

  if v_invitation.expires_at > now() then
    return jsonb_build_object(
      'success', false,
      'message', 'La invitacion ya se encuentra activa.'
    );
  end if;

  update public.delegate_invitations
  set revoked_at = now()
  where team_id = v_invitation.team_id
    and id <> v_invitation.id
    and is_used = false
    and revoked_at is null
    and expires_at > now();

  v_expires_at := now() + interval '3 days';

  update public.delegate_invitations
  set
    expires_at = v_expires_at,
    revoked_at = null
  where id = p_invitation_id;

  return jsonb_build_object(
    'success', true,
    'invitation_id', p_invitation_id,
    'team_id', v_invitation.team_id,
    'expires_at', v_expires_at
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'message', 'No se pudo reactivar la invitacion.'
  );
end;
$$;

create or replace function public.reactivate_expired_delegate_invitation(
  p_invitation_id uuid
)
returns jsonb
language sql
set search_path = 'public', 'app_private', 'pg_temp'
as $$
  select app_private.reactivate_expired_delegate_invitation(p_invitation_id);
$$;

revoke all on function app_private.reactivate_expired_delegate_invitation(uuid)
from public;
revoke all on function app_private.reactivate_expired_delegate_invitation(uuid)
from anon;
grant execute on function app_private.reactivate_expired_delegate_invitation(uuid)
to authenticated;
grant execute on function app_private.reactivate_expired_delegate_invitation(uuid)
to service_role;

revoke all on function public.reactivate_expired_delegate_invitation(uuid)
from public;
revoke all on function public.reactivate_expired_delegate_invitation(uuid)
from anon;
grant execute on function public.reactivate_expired_delegate_invitation(uuid)
to authenticated;
grant execute on function public.reactivate_expired_delegate_invitation(uuid)
to service_role;

create or replace function app_private.purge_stale_delegate_invitations()
returns bigint
language plpgsql
security invoker
set search_path = 'public', 'pg_temp'
as $$
declare
  v_deleted_count bigint;
begin
  delete from public.delegate_invitations
  where (
    is_used
    and coalesce(used_at, expires_at, created_at) <= now() - interval '14 days'
  )
  or (
    not is_used
    and revoked_at is not null
    and revoked_at <= now() - interval '14 days'
  )
  or (
    not is_used
    and revoked_at is null
    and expires_at <= now() - interval '14 days'
  );

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function app_private.purge_stale_delegate_invitations()
from public;
revoke all on function app_private.purge_stale_delegate_invitations()
from anon;
revoke all on function app_private.purge_stale_delegate_invitations()
from authenticated;

do $$
declare
  v_existing_job_id bigint;
begin
  select jobid
  into v_existing_job_id
  from cron.job
  where jobname = 'purge-stale-delegate-invitations'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  perform cron.schedule(
    'purge-stale-delegate-invitations',
    '17 4 * * *',
    $job$select app_private.purge_stale_delegate_invitations();$job$
  );
end;
$$;
