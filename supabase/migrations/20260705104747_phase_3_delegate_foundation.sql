create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated;

alter table public.leagues
  add column if not exists delegate_changes_require_approval boolean not null default true;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'check_valid_roles'
  ) then
    alter table public.profiles drop constraint check_valid_roles;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'chk_roles'
  ) then
    alter table public.profiles drop constraint chk_roles;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role = any (array['admin'::text, 'manager'::text, 'delegate'::text, 'user'::text]));
  end if;
end $$;

create table if not exists public.team_delegates (
  team_id bigint primary key references public.teams(id) on delete cascade,
  delegate_profile_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  assigned_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create index if not exists team_delegates_delegate_profile_idx
  on public.team_delegates(delegate_profile_id);

create table if not exists public.delegate_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id bigint not null references public.teams(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  invited_name text,
  invited_email text,
  created_by uuid not null references auth.users(id),
  used_by uuid references auth.users(id) on delete set null,
  is_used boolean not null default false,
  revoked_at timestamp with time zone,
  expires_at timestamp with time zone not null default (now() + interval '7 days'),
  created_at timestamp with time zone not null default now(),
  used_at timestamp with time zone,
  metadata jsonb not null default '{}'::jsonb,
  constraint delegate_invitations_token_key unique (token)
);

create index if not exists delegate_invitations_team_status_idx
  on public.delegate_invitations(team_id, is_used, created_at desc);

create table if not exists public.delegate_change_requests (
  id uuid primary key default gen_random_uuid(),
  team_id bigint not null references public.teams(id) on delete cascade,
  league_id bigint not null references public.leagues(id) on delete cascade,
  player_id bigint references public.players(id) on delete cascade,
  entity_type text not null,
  action_type text not null,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  requires_approval boolean not null default true,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_notes text,
  created_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone,
  applied_at timestamp with time zone,
  constraint delegate_change_requests_entity_type_check
    check (entity_type = any (array['team'::text, 'player'::text])),
  constraint delegate_change_requests_action_type_check
    check (action_type = any (array['insert'::text, 'update'::text, 'archive'::text, 'restore'::text])),
  constraint delegate_change_requests_status_check
    check (status = any (array['pending'::text, 'applied'::text, 'rejected'::text])),
  constraint delegate_change_requests_target_check
    check (
      (entity_type = 'team'::text and action_type = 'update'::text and player_id is null)
      or
      (
        entity_type = 'player'::text and (
          (action_type = 'insert'::text and player_id is null)
          or
          (action_type = any (array['update'::text, 'archive'::text, 'restore'::text]) and player_id is not null)
        )
      )
    )
);

create index if not exists delegate_change_requests_league_status_idx
  on public.delegate_change_requests(league_id, status, created_at desc);
create index if not exists delegate_change_requests_team_created_idx
  on public.delegate_change_requests(team_id, created_at desc);
create index if not exists delegate_change_requests_submitted_by_idx
  on public.delegate_change_requests(submitted_by, created_at desc);

create or replace function app_private.team_league_id(p_team_id bigint)
returns bigint
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select d.league_id
  from public.teams t
  join public.divisions d on d.id = t.division_id
  where t.id = p_team_id
  limit 1;
$$;

create or replace function app_private.is_league_admin(p_league_id bigint)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.league_admins la
    where la.league_id = p_league_id
      and la.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.leagues l
    where l.id = p_league_id
      and l.owner_id = auth.uid()
  );
$$;

create or replace function app_private.is_team_delegate(p_team_id bigint)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.team_delegates td
    join public.profiles p on p.id = td.delegate_profile_id
    where td.team_id = p_team_id
      and td.delegate_profile_id = auth.uid()
      and p.role = 'delegate'
      and coalesce(p.is_suspended, false) = false
  );
$$;

grant execute on function app_private.team_league_id(bigint) to anon, authenticated;
grant execute on function app_private.is_league_admin(bigint) to anon, authenticated;
grant execute on function app_private.is_team_delegate(bigint) to anon, authenticated;

create or replace function app_private.protect_profile_security()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(current_setting('app.profile_security_bypass', true), 'off') = 'on'
       or current_user in ('postgres', 'service_role')
       or public.is_admin() then
      return new;
    end if;

    if coalesce(new.role, 'user') <> 'user'
       or coalesce(new.is_deleted, false) <> false
       or coalesce(new.is_suspended, false) <> false
       or new.suspended_at is not null
       or new.suspended_by is not null
       or new.suspension_reason is not null then
      raise exception 'No autorizado para establecer campos protegidos del perfil.';
    end if;

    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_deleted is distinct from old.is_deleted
     or new.is_suspended is distinct from old.is_suspended
     or new.suspended_at is distinct from old.suspended_at
     or new.suspended_by is distinct from old.suspended_by
     or new.suspension_reason is distinct from old.suspension_reason then
    if coalesce(current_setting('app.profile_security_bypass', true), 'off') = 'on'
       or current_user in ('postgres', 'service_role')
       or public.is_admin() then
      return new;
    end if;

    raise exception 'No autorizado para cambiar campos protegidos del perfil.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_sensitive_fields on public.profiles;
create trigger profiles_protect_sensitive_fields
before insert or update on public.profiles
for each row
execute function app_private.protect_profile_security();

create or replace function app_private.apply_delegate_change(
  p_team_id bigint,
  p_entity_type text,
  p_action_type text,
  p_payload jsonb default '{}'::jsonb,
  p_player_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player_id bigint;
  v_first_name text;
  v_last_name text;
begin
  if not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'Equipo no encontrado.';
  end if;

  if p_entity_type = 'team' then
    if p_action_type <> 'update' then
      raise exception 'Accion no permitida para cambios de equipo.';
    end if;

    update public.teams
    set name = coalesce(nullif(trim(p_payload->>'name'), ''), name),
        color = coalesce(nullif(trim(p_payload->>'color'), ''), color),
        logo_url = case when p_payload ? 'logo_url' then nullif(trim(coalesce(p_payload->>'logo_url', '')), '') else logo_url end,
        original_logo_url = case when p_payload ? 'original_logo_url' then nullif(trim(coalesce(p_payload->>'original_logo_url', '')), '') else original_logo_url end,
        delegate_name = case when p_payload ? 'delegate_name' then nullif(trim(coalesce(p_payload->>'delegate_name', '')), '') else delegate_name end,
        contact_phone = case when p_payload ? 'contact_phone' then nullif(trim(coalesce(p_payload->>'contact_phone', '')), '') else contact_phone end
    where id = p_team_id;

    if not found then
      raise exception 'Equipo no encontrado.';
    end if;

    return null;
  end if;

  if p_entity_type = 'player' then
    if p_action_type = 'insert' then
      v_first_name := nullif(trim(coalesce(p_payload->>'first_name', '')), '');
      v_last_name := nullif(trim(coalesce(p_payload->>'last_name', '')), '');

      if v_first_name is null or v_last_name is null then
        raise exception 'El jugador requiere nombre y apellido.';
      end if;

      insert into public.players (
        team_id,
        first_name,
        last_name,
        dorsal,
        position,
        birth_date,
        curp_dni,
        photo_url,
        original_photo_url,
        is_active,
        is_suspended
      )
      values (
        p_team_id,
        v_first_name,
        v_last_name,
        case when coalesce(p_payload->>'dorsal', '') = '' then null else (p_payload->>'dorsal')::integer end,
        nullif(trim(coalesce(p_payload->>'position', '')), ''),
        case when coalesce(p_payload->>'birth_date', '') = '' then null else (p_payload->>'birth_date')::date end,
        nullif(trim(coalesce(p_payload->>'curp_dni', '')), ''),
        nullif(trim(coalesce(p_payload->>'photo_url', '')), ''),
        nullif(trim(coalesce(p_payload->>'original_photo_url', '')), ''),
        coalesce(case when p_payload ? 'is_active' then (p_payload->>'is_active')::boolean else null end, true),
        false
      )
      returning id into v_player_id;

      return v_player_id;
    end if;

    if p_player_id is null then
      raise exception 'Se requiere player_id para esta accion.';
    end if;

    if p_action_type = 'update' then
      update public.players
      set first_name = case when p_payload ? 'first_name' then coalesce(nullif(trim(p_payload->>'first_name'), ''), first_name) else first_name end,
          last_name = case when p_payload ? 'last_name' then coalesce(nullif(trim(p_payload->>'last_name'), ''), last_name) else last_name end,
          dorsal = case when p_payload ? 'dorsal' then case when coalesce(p_payload->>'dorsal', '') = '' then null else (p_payload->>'dorsal')::integer end else dorsal end,
          position = case when p_payload ? 'position' then nullif(trim(coalesce(p_payload->>'position', '')), '') else position end,
          birth_date = case when p_payload ? 'birth_date' then case when coalesce(p_payload->>'birth_date', '') = '' then null else (p_payload->>'birth_date')::date end else birth_date end,
          curp_dni = case when p_payload ? 'curp_dni' then nullif(trim(coalesce(p_payload->>'curp_dni', '')), '') else curp_dni end,
          photo_url = case when p_payload ? 'photo_url' then nullif(trim(coalesce(p_payload->>'photo_url', '')), '') else photo_url end,
          original_photo_url = case when p_payload ? 'original_photo_url' then nullif(trim(coalesce(p_payload->>'original_photo_url', '')), '') else original_photo_url end,
          is_active = case when p_payload ? 'is_active' then (p_payload->>'is_active')::boolean else is_active end
      where id = p_player_id
        and team_id = p_team_id;

      if not found then
        raise exception 'Jugador no encontrado para este equipo.';
      end if;

      return p_player_id;
    end if;

    if p_action_type = 'archive' then
      update public.players
      set is_active = false
      where id = p_player_id
        and team_id = p_team_id;

      if not found then
        raise exception 'Jugador no encontrado para este equipo.';
      end if;

      return p_player_id;
    end if;

    if p_action_type = 'restore' then
      update public.players
      set is_active = true
      where id = p_player_id
        and team_id = p_team_id;

      if not found then
        raise exception 'Jugador no encontrado para este equipo.';
      end if;

      return p_player_id;
    end if;
  end if;

  raise exception 'Tipo de cambio o accion no soportada.';
end;
$$;

revoke all on function app_private.apply_delegate_change(bigint, text, text, jsonb, bigint) from public;
revoke all on function app_private.protect_profile_security() from public;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.procesar_invitacion_manager(p_token uuid, p_user_id uuid, p_league_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation public.manager_invitations%rowtype;
  v_league_id bigint;
  v_final_league_name text;
begin
  select * into v_invitation
  from public.manager_invitations
  where token = p_token
    and is_used = false;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Invitacion invalida.');
  end if;

  v_final_league_name := coalesce(v_invitation.league_name, p_league_name);
  perform set_config('app.profile_security_bypass', 'on', true);

  update public.profiles
  set role = 'manager'
  where id = p_user_id;

  insert into public.leagues (name, owner_id)
  values (v_final_league_name, p_user_id)
  returning id into v_league_id;

  insert into public.league_admins (league_id, user_id)
  values (v_league_id, p_user_id);

  update public.manager_invitations
  set is_used = true
  where id = v_invitation.id;

  return jsonb_build_object('success', true, 'league_id', v_league_id);
exception when others then
  return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

create or replace function public.activar_nuevo_manager(p_email text, p_nombre text, p_nombre_liga text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_league_id bigint;
  v_caller_role text;
begin
  select role into v_caller_role
  from public.profiles
  where id = auth.uid();

  if v_caller_role is distinct from 'admin' then
    raise exception 'ACCESO DENEGADO: No tienes permisos de administrador.';
  end if;

  select id into v_user_id
  from auth.users
  where email = p_email;

  if v_user_id is null then
    raise exception 'No existe usuario con el correo: %', p_email;
  end if;

  perform set_config('app.profile_security_bypass', 'on', true);

  update public.profiles
  set role = 'manager',
      full_name = p_nombre
  where id = v_user_id;

  select id into v_league_id
  from public.leagues
  where name = p_nombre_liga
  limit 1;

  if v_league_id is not null then
    insert into public.league_admins (league_id, user_id)
    values (v_league_id, v_user_id)
    on conflict do nothing;
  else
    insert into public.leagues (owner_id, name)
    values (v_user_id, p_nombre_liga)
    returning id into v_league_id;

    insert into public.league_admins (league_id, user_id)
    values (v_league_id, v_user_id);
  end if;
end;
$$;

create or replace function public.create_delegate_invitation(
  p_team_id bigint,
  p_invited_name text default null,
  p_invited_email text default null,
  p_expires_at timestamp with time zone default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_league_id bigint;
  v_invitation_id uuid;
  v_token uuid;
  v_expires_at timestamp with time zone;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Autenticacion requerida.');
  end if;

  v_league_id := app_private.team_league_id(p_team_id);

  if v_league_id is null then
    return jsonb_build_object('success', false, 'message', 'Equipo no encontrado.');
  end if;

  if not app_private.is_league_admin(v_league_id) then
    return jsonb_build_object('success', false, 'message', 'No autorizado para invitar delegados en este equipo.');
  end if;

  update public.delegate_invitations
  set revoked_at = now()
  where team_id = p_team_id
    and is_used = false
    and revoked_at is null;

  insert into public.delegate_invitations (
    team_id,
    invited_name,
    invited_email,
    created_by,
    expires_at
  )
  values (
    p_team_id,
    nullif(trim(coalesce(p_invited_name, '')), ''),
    nullif(lower(trim(coalesce(p_invited_email, ''))), ''),
    auth.uid(),
    coalesce(p_expires_at, now() + interval '7 days')
  )
  returning id, token, expires_at
  into v_invitation_id, v_token, v_expires_at;

  return jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'team_id', p_team_id,
    'token', v_token,
    'expires_at', v_expires_at
  );
exception when others then
  return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

create or replace function public.revoke_delegate_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_id bigint;
  v_league_id bigint;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Autenticacion requerida.');
  end if;

  select team_id into v_team_id
  from public.delegate_invitations
  where id = p_invitation_id;

  if v_team_id is null then
    return jsonb_build_object('success', false, 'message', 'Invitacion no encontrada.');
  end if;

  v_league_id := app_private.team_league_id(v_team_id);

  if not app_private.is_league_admin(v_league_id) then
    return jsonb_build_object('success', false, 'message', 'No autorizado para revocar esta invitacion.');
  end if;

  update public.delegate_invitations
  set revoked_at = now()
  where id = p_invitation_id
    and is_used = false
    and revoked_at is null;

  if not found then
    return jsonb_build_object('success', false, 'message', 'La invitacion ya no esta activa.');
  end if;

  return jsonb_build_object('success', true, 'invitation_id', p_invitation_id);
exception when others then
  return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

create or replace function public.get_delegate_invitation(p_token uuid)
returns jsonb
language plpgsql
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
    'expires_at', v_record.expires_at
  );
exception when others then
  return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

create or replace function public.procesar_invitacion_delegate(p_token uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation record;
  v_profile public.profiles%rowtype;
begin
  select
    di.id,
    di.team_id,
    di.created_by,
    di.invited_name,
    l.id as league_id
  into v_invitation
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

  select * into v_profile
  from public.profiles
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Perfil no encontrado para el usuario invitado.');
  end if;

  if v_profile.role not in ('user', 'delegate') then
    return jsonb_build_object('success', false, 'message', 'La cuenta ya tiene un rol incompatible para asumir este equipo.');
  end if;

  perform set_config('app.profile_security_bypass', 'on', true);

  if v_profile.role = 'user' then
    update public.profiles
    set role = 'delegate'
    where id = p_user_id;
  end if;

  insert into public.team_delegates (
    team_id,
    delegate_profile_id,
    assigned_by,
    assigned_at
  )
  values (
    v_invitation.team_id,
    p_user_id,
    v_invitation.created_by,
    now()
  )
  on conflict (team_id) do update
    set delegate_profile_id = excluded.delegate_profile_id,
        assigned_by = excluded.assigned_by,
        assigned_at = excluded.assigned_at;

  update public.teams
  set delegate_name = coalesce(
    nullif(trim(coalesce(v_profile.full_name, '')), ''),
    nullif(trim(coalesce(v_invitation.invited_name, '')), ''),
    delegate_name
  )
  where id = v_invitation.team_id;

  update public.delegate_invitations
  set is_used = true,
      used_by = p_user_id,
      used_at = now()
  where id = v_invitation.id;

  update public.delegate_invitations
  set revoked_at = now()
  where team_id = v_invitation.team_id
    and id <> v_invitation.id
    and is_used = false
    and revoked_at is null;

  return jsonb_build_object(
    'success', true,
    'team_id', v_invitation.team_id,
    'league_id', v_invitation.league_id
  );
exception when others then
  return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

create or replace function public.assign_team_delegate(
  p_team_id bigint,
  p_delegate_profile_id uuid,
  p_delegate_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_league_id bigint;
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Autenticacion requerida.');
  end if;

  v_league_id := app_private.team_league_id(p_team_id);

  if v_league_id is null then
    return jsonb_build_object('success', false, 'message', 'Equipo no encontrado.');
  end if;

  if not app_private.is_league_admin(v_league_id) then
    return jsonb_build_object('success', false, 'message', 'No autorizado para asignar delegado en este equipo.');
  end if;

  select * into v_profile
  from public.profiles
  where id = p_delegate_profile_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Perfil no encontrado.');
  end if;

  if v_profile.role not in ('user', 'delegate') then
    return jsonb_build_object('success', false, 'message', 'El perfil seleccionado tiene un rol incompatible.');
  end if;

  perform set_config('app.profile_security_bypass', 'on', true);

  if v_profile.role = 'user' then
    update public.profiles
    set role = 'delegate'
    where id = p_delegate_profile_id;
  end if;

  insert into public.team_delegates (
    team_id,
    delegate_profile_id,
    assigned_by,
    assigned_at
  )
  values (
    p_team_id,
    p_delegate_profile_id,
    auth.uid(),
    now()
  )
  on conflict (team_id) do update
    set delegate_profile_id = excluded.delegate_profile_id,
        assigned_by = excluded.assigned_by,
        assigned_at = excluded.assigned_at;

  update public.teams
  set delegate_name = coalesce(
    nullif(trim(coalesce(p_delegate_name, '')), ''),
    nullif(trim(coalesce(v_profile.full_name, '')), ''),
    delegate_name
  )
  where id = p_team_id;

  return jsonb_build_object(
    'success', true,
    'team_id', p_team_id,
    'delegate_profile_id', p_delegate_profile_id
  );
exception when others then
  return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

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
set search_path = public, pg_temp
as $$
declare
  v_league_id bigint;
  v_requires_approval boolean;
  v_request_id uuid;
  v_applied_player_id bigint;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Autenticacion requerida.');
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
      team_id,
      league_id,
      player_id,
      entity_type,
      action_type,
      status,
      payload,
      requires_approval,
      submitted_by
    )
    values (
      p_team_id,
      v_league_id,
      p_player_id,
      p_entity_type,
      p_action_type,
      'pending',
      coalesce(p_payload, '{}'::jsonb),
      true,
      auth.uid()
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
    team_id,
    league_id,
    player_id,
    entity_type,
    action_type,
    status,
    payload,
    requires_approval,
    submitted_by,
    reviewed_at,
    applied_at
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
$$;

create or replace function public.review_delegate_change_request(
  p_request_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.delegate_change_requests%rowtype;
  v_applied_player_id bigint;
  v_decision text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Autenticacion requerida.');
  end if;

  select * into v_request
  from public.delegate_change_requests
  where id = p_request_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Solicitud no encontrada.');
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object('success', false, 'message', 'La solicitud ya fue procesada.');
  end if;

  if not app_private.is_league_admin(v_request.league_id) then
    return jsonb_build_object('success', false, 'message', 'No autorizado para revisar esta solicitud.');
  end if;

  v_decision := lower(trim(coalesce(p_decision, '')));

  if v_decision = 'approve' then
    v_applied_player_id := app_private.apply_delegate_change(
      v_request.team_id,
      v_request.entity_type,
      v_request.action_type,
      v_request.payload,
      v_request.player_id
    );

    update public.delegate_change_requests
    set status = 'applied',
        player_id = coalesce(player_id, v_applied_player_id),
        reviewed_by = auth.uid(),
        review_notes = p_review_notes,
        reviewed_at = now(),
        applied_at = now()
    where id = p_request_id;

    return jsonb_build_object(
      'success', true,
      'request_id', p_request_id,
      'status', 'applied',
      'player_id', coalesce(v_request.player_id, v_applied_player_id)
    );
  end if;

  if v_decision = 'reject' then
    update public.delegate_change_requests
    set status = 'rejected',
        reviewed_by = auth.uid(),
        review_notes = p_review_notes,
        reviewed_at = now()
    where id = p_request_id;

    return jsonb_build_object(
      'success', true,
      'request_id', p_request_id,
      'status', 'rejected'
    );
  end if;

  return jsonb_build_object('success', false, 'message', 'Decision invalida. Usa approve o reject.');
exception when others then
  return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

alter table public.team_delegates enable row level security;
alter table public.delegate_invitations enable row level security;
alter table public.delegate_change_requests enable row level security;

drop policy if exists "Managers see delegate assignments" on public.team_delegates;
drop policy if exists "Delegates see own assignment" on public.team_delegates;
create policy "Managers see delegate assignments"
  on public.team_delegates
  for select
  to authenticated
  using (app_private.is_league_admin(app_private.team_league_id(team_id)));
create policy "Delegates see own assignment"
  on public.team_delegates
  for select
  to authenticated
  using (delegate_profile_id = auth.uid());

drop policy if exists "Managers see delegate invitations" on public.delegate_invitations;
create policy "Managers see delegate invitations"
  on public.delegate_invitations
  for select
  to authenticated
  using (app_private.is_league_admin(app_private.team_league_id(team_id)));

drop policy if exists "Managers see delegate requests" on public.delegate_change_requests;
drop policy if exists "Delegates see own delegate requests" on public.delegate_change_requests;
create policy "Managers see delegate requests"
  on public.delegate_change_requests
  for select
  to authenticated
  using (app_private.is_league_admin(league_id));
create policy "Delegates see own delegate requests"
  on public.delegate_change_requests
  for select
  to authenticated
  using (submitted_by = auth.uid() or app_private.is_team_delegate(team_id));

grant select on public.team_delegates to authenticated;
grant select on public.delegate_invitations to authenticated;
grant select on public.delegate_change_requests to authenticated;

revoke all on function public.create_delegate_invitation(bigint, text, text, timestamp with time zone) from public;
revoke all on function public.revoke_delegate_invitation(uuid) from public;
revoke all on function public.get_delegate_invitation(uuid) from public;
revoke all on function public.procesar_invitacion_delegate(uuid, uuid) from public;
revoke all on function public.assign_team_delegate(bigint, uuid, text) from public;
revoke all on function public.submit_delegate_change_request(bigint, text, text, jsonb, bigint) from public;
revoke all on function public.review_delegate_change_request(uuid, text, text) from public;

grant execute on function public.create_delegate_invitation(bigint, text, text, timestamp with time zone) to authenticated;
grant execute on function public.revoke_delegate_invitation(uuid) to authenticated;
grant execute on function public.get_delegate_invitation(uuid) to anon, authenticated;
grant execute on function public.procesar_invitacion_delegate(uuid, uuid) to anon, authenticated;
grant execute on function public.assign_team_delegate(bigint, uuid, text) to authenticated;
grant execute on function public.submit_delegate_change_request(bigint, text, text, jsonb, bigint) to authenticated;
grant execute on function public.review_delegate_change_request(uuid, text, text) to authenticated;;
