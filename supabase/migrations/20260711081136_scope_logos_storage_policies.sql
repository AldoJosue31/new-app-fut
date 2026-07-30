begin;

create or replace function app_private.logo_path_from_url(p_url text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select nullif(regexp_replace(split_part(coalesce(p_url, ''), '/logos/', 2), '[?#].*$', ''), '');
$$;

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

  if public.is_admin() then
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

revoke all on function app_private.logo_path_from_url(text) from public, anon, authenticated;
revoke all on function app_private.can_manage_logo_path(text, text) from public, anon, authenticated;

drop policy if exists "Permitir actualizar logos a usuarios autenticados 1peuqw_0" on storage.objects;
drop policy if exists "Permitir actualizar logos a usuarios autenticados 1peuqw_1" on storage.objects;
drop policy if exists "Permitir borrar fotos a usuarios logueados" on storage.objects;
drop policy if exists "Permitir borrar logos a usuarios autenticados" on storage.objects;
drop policy if exists "Permitir subida a usuarios autenticados 1peuqw_0" on storage.objects;
drop policy if exists "Permitir subida a usuarios autenticados 1peuqw_1" on storage.objects;
drop policy if exists "logos_insert_scoped" on storage.objects;
drop policy if exists "logos_select_scoped" on storage.objects;
drop policy if exists "logos_update_scoped" on storage.objects;
drop policy if exists "logos_delete_scoped" on storage.objects;

create policy "logos_insert_scoped"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'logos'
  and app_private.can_manage_logo_path(name, owner_id)
);

create policy "logos_select_scoped"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'logos'
  and app_private.can_manage_logo_path(name, owner_id)
);

create policy "logos_update_scoped"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'logos'
  and app_private.can_manage_logo_path(name, owner_id)
)
with check (
  bucket_id = 'logos'
  and app_private.can_manage_logo_path(name, owner_id)
);

create policy "logos_delete_scoped"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'logos'
  and app_private.can_manage_logo_path(name, owner_id)
);

commit;;
