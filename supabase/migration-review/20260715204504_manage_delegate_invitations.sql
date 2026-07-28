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

create or replace function public.list_delegate_invitations(
  p_team_ids bigint[]
)
returns jsonb
language sql
stable
set search_path = 'public', 'app_private', 'pg_temp'
as $$
  select app_private.list_delegate_invitations(p_team_ids);
$$;

revoke all on function app_private.list_delegate_invitations(bigint[]) from public;
revoke all on function app_private.list_delegate_invitations(bigint[]) from anon;
grant execute on function app_private.list_delegate_invitations(bigint[]) to authenticated;

revoke all on function public.list_delegate_invitations(bigint[]) from public;
revoke all on function public.list_delegate_invitations(bigint[]) from anon;
grant execute on function public.list_delegate_invitations(bigint[]) to authenticated;
grant execute on function public.list_delegate_invitations(bigint[]) to service_role;

create or replace function app_private.update_delegate_invitation(
  p_invitation_id uuid,
  p_invited_name text default null,
  p_invited_email text default null,
  p_invited_phone text default null,
  p_expires_at timestamp with time zone default null,
  p_restart_duration boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_invitation public.delegate_invitations%rowtype;
  v_league_id bigint;
  v_name text;
  v_email text;
  v_phone text;
  v_expires_at timestamp with time zone;
  v_original_duration interval;
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
      'message', 'No autorizado para editar esta invitacion.'
    );
  end if;

  if v_invitation.is_used then
    return jsonb_build_object(
      'success', false,
      'message', 'Una invitacion utilizada ya no se puede editar.'
    );
  end if;

  v_name := nullif(trim(coalesce(p_invited_name, '')), '');
  v_email := nullif(lower(trim(coalesce(p_invited_email, ''))), '');
  v_phone := nullif(trim(coalesce(p_invited_phone, '')), '');

  if length(coalesce(v_name, '')) > 120 then
    return jsonb_build_object(
      'success', false,
      'message', 'El nombre sugerido no puede superar 120 caracteres.'
    );
  end if;

  if length(coalesce(v_email, '')) > 254
    or (v_email is not null and position('@' in v_email) <= 1) then
    return jsonb_build_object(
      'success', false,
      'message', 'El correo sugerido no es valido.'
    );
  end if;

  if length(coalesce(v_phone, '')) > 30 then
    return jsonb_build_object(
      'success', false,
      'message', 'El numero sugerido no puede superar 30 caracteres.'
    );
  end if;

  if p_restart_duration then
    v_original_duration := least(
      greatest(
        v_invitation.expires_at - v_invitation.created_at,
        interval '5 minutes'
      ),
      interval '365 days'
    );
    v_expires_at := now() + v_original_duration;
  elsif p_expires_at is not null then
    v_expires_at := p_expires_at;
  else
    v_expires_at := v_invitation.expires_at;
  end if;

  if v_expires_at <= now() + interval '1 minute' then
    return jsonb_build_object(
      'success', false,
      'message', 'El vencimiento debe quedar al menos un minuto en el futuro.'
    );
  end if;

  if v_expires_at > now() + interval '365 days' then
    return jsonb_build_object(
      'success', false,
      'message', 'La duracion no puede superar 365 dias.'
    );
  end if;

  if v_invitation.revoked_at is not null
    or v_invitation.expires_at <= now() then
    update public.delegate_invitations
    set revoked_at = now()
    where team_id = v_invitation.team_id
      and id <> v_invitation.id
      and is_used = false
      and revoked_at is null
      and expires_at > now();
  end if;

  update public.delegate_invitations
  set
    invited_name = v_name,
    invited_email = v_email,
    expires_at = v_expires_at,
    revoked_at = null,
    metadata = (
      coalesce(metadata, '{}'::jsonb) - 'invited_phone'
    ) || jsonb_strip_nulls(
      jsonb_build_object('invited_phone', v_phone)
    )
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
    'message', 'No se pudo actualizar la invitacion.'
  );
end;
$$;

create or replace function public.update_delegate_invitation(
  p_invitation_id uuid,
  p_invited_name text default null,
  p_invited_email text default null,
  p_invited_phone text default null,
  p_expires_at timestamp with time zone default null,
  p_restart_duration boolean default false
)
returns jsonb
language sql
set search_path = 'public', 'app_private', 'pg_temp'
as $$
  select app_private.update_delegate_invitation(
    p_invitation_id,
    p_invited_name,
    p_invited_email,
    p_invited_phone,
    p_expires_at,
    p_restart_duration
  );
$$;

revoke all on function app_private.update_delegate_invitation(
  uuid,
  text,
  text,
  text,
  timestamp with time zone,
  boolean
) from public;
revoke all on function app_private.update_delegate_invitation(
  uuid,
  text,
  text,
  text,
  timestamp with time zone,
  boolean
) from anon;
grant execute on function app_private.update_delegate_invitation(
  uuid,
  text,
  text,
  text,
  timestamp with time zone,
  boolean
) to authenticated;

revoke all on function public.update_delegate_invitation(
  uuid,
  text,
  text,
  text,
  timestamp with time zone,
  boolean
) from public;
revoke all on function public.update_delegate_invitation(
  uuid,
  text,
  text,
  text,
  timestamp with time zone,
  boolean
) from anon;
grant execute on function public.update_delegate_invitation(
  uuid,
  text,
  text,
  text,
  timestamp with time zone,
  boolean
) to authenticated;
grant execute on function public.update_delegate_invitation(
  uuid,
  text,
  text,
  text,
  timestamp with time zone,
  boolean
) to service_role;
