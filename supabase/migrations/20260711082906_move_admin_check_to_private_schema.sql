begin;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function app_private.is_admin() from public, anon, authenticated;
grant execute on function app_private.is_admin() to authenticated;

create or replace function app_private.can_manage_logo_path(p_name text, p_owner_id text default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public, app_private, storage, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_parts text[] := storage.foldername(p_name);
  v_kind text := (storage.foldername(p_name))[1];
  v_league_id bigint;
  v_team_id bigint;
begin
  if v_uid is null then
    return false;
  end if;

  if p_owner_id is not null and p_owner_id = v_uid::text then
    return true;
  end if;

  if app_private.is_admin() then
    return true;
  end if;

  if v_kind in ('teams', 'players', 'leagues')
     and array_length(v_parts, 1) >= 2
     and v_parts[2] ~ '^[0-9]+$' then
    v_league_id := v_parts[2]::bigint;

    if app_private.is_league_admin(v_league_id) then
      return true;
    end if;
  end if;

  if v_kind = 'teams'
     and array_length(v_parts, 1) >= 5
     and v_parts[2] ~ '^[0-9]+$'
     and v_parts[3] ~ '^[0-9]+$'
     and v_parts[4] = 'delegate-requests' then
    v_league_id := v_parts[2]::bigint;
    v_team_id := v_parts[3]::bigint;

    if exists (
      select 1
      from public.team_delegates td
      join public.teams t on t.id = td.team_id
      join public.divisions d on d.id = t.division_id
      where td.delegate_profile_id = v_uid
        and td.team_id = v_team_id
        and d.league_id = v_league_id
    ) then
      return true;
    end if;
  end if;

  if v_kind = 'players'
     and array_length(v_parts, 1) >= 5
     and v_parts[2] ~ '^[0-9]+$'
     and v_parts[3] ~ '^[0-9]+$'
     and v_parts[4] = 'delegate-requests' then
    v_league_id := v_parts[2]::bigint;
    v_team_id := v_parts[3]::bigint;

    if exists (
      select 1
      from public.team_delegates td
      join public.teams t on t.id = td.team_id
      join public.divisions d on d.id = t.division_id
      where td.delegate_profile_id = v_uid
        and td.team_id = v_team_id
        and d.league_id = v_league_id
    ) then
      return true;
    end if;
  end if;

  if exists (
    select 1
    from public.leagues l
    where app_private.is_league_admin(l.id)
      and p_name in (
        app_private.logo_path_from_url(l.logo_url),
        app_private.logo_path_from_url(l.original_logo_url)
      )
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.teams t
    join public.divisions d on d.id = t.division_id
    where app_private.is_league_admin(d.league_id)
      and p_name in (
        app_private.logo_path_from_url(t.logo_url),
        app_private.logo_path_from_url(t.original_logo_url)
      )
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.players p
    join public.teams t on t.id = p.team_id
    join public.divisions d on d.id = t.division_id
    where app_private.is_league_admin(d.league_id)
      and p_name in (
        app_private.logo_path_from_url(p.photo_url),
        app_private.logo_path_from_url(p.original_photo_url)
      )
  ) then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function app_private.can_manage_logo_path(text, text) to authenticated;

create or replace function app_private.protect_profile_security()
returns trigger
language plpgsql
set search_path = public, app_private, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(current_setting('app.profile_security_bypass', true), 'off') = 'on'
       or current_user in ('postgres', 'service_role')
       or app_private.is_admin() then
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
       or app_private.is_admin() then
      return new;
    end if;

    raise exception 'No autorizado para cambiar campos protegidos del perfil.';
  end if;

  return new;
end;
$$;

drop policy if exists "admin_users_admin_only" on public.admin_users;
create policy "admin_users_admin_only"
on public.admin_users
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "app_config_admin_only" on public.app_config;
create policy "app_config_admin_only"
on public.app_config
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admin total access" on public.leagues;
create policy "Admin total access"
on public.leagues
for all
to authenticated
using (app_private.is_admin());

drop policy if exists "Admin ve todos los perfiles" on public.profiles;
create policy "Admin ve todos los perfiles"
on public.profiles
for select
to authenticated
using (app_private.is_admin());

drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles"
on public.profiles
for update
to authenticated
using (app_private.is_admin());

drop policy if exists "Admins crean invitaciones" on public.manager_invitations;
create policy "Admins crean invitaciones"
on public.manager_invitations
for insert
to authenticated
with check (app_private.is_admin());

drop policy if exists "Admins eliminan invitaciones" on public.manager_invitations;
create policy "Admins eliminan invitaciones"
on public.manager_invitations
for delete
to authenticated
using (app_private.is_admin());

drop policy if exists "Admins pueden actualizar invitaciones" on public.manager_invitations;
create policy "Admins pueden actualizar invitaciones"
on public.manager_invitations
for update
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "manager_invitations_admin_select" on public.manager_invitations;
create policy "manager_invitations_admin_select"
on public.manager_invitations
for select
to authenticated
using (app_private.is_admin());

revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to service_role;

commit;;
