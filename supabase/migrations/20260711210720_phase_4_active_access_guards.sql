
create or replace function app_private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_suspended, false) = false
      and coalesce(p.is_deleted, false) = false
  );
$$;

revoke all on function app_private.is_active_user() from public, anon;
grant execute on function app_private.is_active_user() to authenticated;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.is_active_user()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    );
$$;

create or replace function app_private.is_league_admin(p_league_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.is_active_user()
    and (
      exists (
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
      )
    );
$$;

create or replace function app_private.is_team_delegate(p_team_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.is_active_user()
    and exists (
      select 1
      from public.team_delegates td
      join public.profiles p on p.id = td.delegate_profile_id
      where td.team_id = p_team_id
        and td.delegate_profile_id = auth.uid()
        and p.role = 'delegate'
        and coalesce(p.is_suspended, false) = false
        and coalesce(p.is_deleted, false) = false
    );
$$;

revoke all on function app_private.is_admin() from public, anon;
revoke all on function app_private.is_league_admin(bigint) from public, anon;
revoke all on function app_private.is_team_delegate(bigint) from public, anon;
grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.is_league_admin(bigint) to authenticated;
grant execute on function app_private.is_team_delegate(bigint) to authenticated;

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
  if v_uid is null or not app_private.is_active_user() then
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

revoke all on function app_private.can_manage_logo_path(text, text) from public, anon;
grant execute on function app_private.can_manage_logo_path(text, text) to authenticated;

drop policy if exists "Admins can edit their courts" on public.courts;
create policy "Admins can edit their courts"
on public.courts
as permissive
for all
to authenticated
using (app_private.is_league_admin(courts.league_id))
with check (app_private.is_league_admin(courts.league_id));

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'admin_users','app_config','categories','courts',
    'delegate_change_requests','delegate_invitations','divisions','jornadas',
    'league_admins','leagues','manager_invitations','match_events','matches',
    'players','referees','team_delegates','teams','tournaments'
  ]
  loop
    execute format('drop policy if exists active_authenticated_guard on public.%I', v_table);
    execute format(
      'create policy active_authenticated_guard on public.%I as restrictive for all to authenticated using (app_private.is_active_user()) with check (app_private.is_active_user())',
      v_table
    );
  end loop;
end;
$$;
;
