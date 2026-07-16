alter table public.delegate_invitations
add column if not exists duration_started_at timestamp with time zone;

update public.delegate_invitations
set duration_started_at = created_at
where duration_started_at is null;

alter table public.delegate_invitations
alter column duration_started_at set default now();

alter table public.delegate_invitations
alter column duration_started_at set not null;

create or replace function app_private.sync_delegate_invitation_duration_start()
returns trigger
language plpgsql
set search_path = 'public', 'pg_temp'
as $$
begin
  if tg_op = 'INSERT' then
    new.duration_started_at := coalesce(
      new.duration_started_at,
      new.created_at,
      now()
    );
  elsif new.expires_at is distinct from old.expires_at then
    new.duration_started_at := now();
  end if;

  return new;
end;
$$;

revoke all on function app_private.sync_delegate_invitation_duration_start()
from public;

drop trigger if exists sync_delegate_invitation_duration_start
on public.delegate_invitations;

create trigger sync_delegate_invitation_duration_start
before insert or update of expires_at
on public.delegate_invitations
for each row
execute function app_private.sync_delegate_invitation_duration_start();

create or replace function app_private.list_delegate_invitations(
  p_team_ids bigint[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_invitations jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Autenticacion requerida.'
    );
  end if;

  if coalesce(cardinality(p_team_ids), 0) = 0 then
    return jsonb_build_object('success', true, 'invitations', '[]'::jsonb);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', di.id,
        'team_id', di.team_id,
        'token', di.token,
        'invited_name', di.invited_name,
        'invited_email', di.invited_email,
        'invited_phone', di.metadata ->> 'invited_phone',
        'is_used', di.is_used,
        'revoked_at', di.revoked_at,
        'expires_at', di.expires_at,
        'created_at', di.created_at,
        'duration_started_at', di.duration_started_at,
        'used_at', di.used_at
      )
      order by
        case
          when di.is_used then 1
          when di.revoked_at is null and di.expires_at > now() then 0
          when di.revoked_at is null then 2
          else 3
        end,
        di.expires_at asc
    ),
    '[]'::jsonb
  )
  into v_invitations
  from public.delegate_invitations di
  where di.team_id = any(p_team_ids)
    and app_private.is_league_admin(
      app_private.team_league_id(di.team_id)
    );

  return jsonb_build_object(
    'success', true,
    'invitations', v_invitations
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'message', 'No se pudieron consultar las invitaciones.'
  );
end;
$$;
