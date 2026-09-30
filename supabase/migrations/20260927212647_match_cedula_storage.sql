-- Archivos privados: league_id/tournament_id/match_id.jpg, una copia por partido.
alter table public.tournaments add column cedula_uploads_locked boolean not null default false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('match-cedulas', 'match-cedulas', false, 512000, array['image/jpeg']);

create function app_private.can_read_match_cedula(p_name text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select case when p_name ~ '^[1-9][0-9]{0,14}/[1-9][0-9]{0,14}/[1-9][0-9]{0,14}\.jpg$'
    then auth.uid() is not null
      and app_private.is_league_admin(split_part(p_name, '/', 1)::bigint)
    else false end;
$$;

create function app_private.can_write_match_cedula(p_name text)
returns boolean language plpgsql volatile security invoker set search_path = '' as $$
declare v_allowed boolean;
begin
  if not app_private.can_read_match_cedula(p_name) then return false; end if;
  -- Comparte el bloqueo de fila con finalizar: una carga admitida termina antes
  -- de bloquear nuevas cargas y enumerar las fotos a borrar.
  select not t.cedula_uploads_locked and t.status in ('Activo', 'En Curso')
    into v_allowed
    from public.matches m
    join public.jornadas j on j.id = m.jornada_id
    join public.tournaments t on t.id = j.tournament_id
    join public.divisions d on d.id = t.division_id
    where m.id = split_part(split_part(p_name, '/', 3), '.', 1)::bigint
      and t.id = split_part(p_name, '/', 2)::bigint
      and d.league_id = split_part(p_name, '/', 1)::bigint
    for share of t;
  return coalesce(v_allowed, false);
end;
$$;

revoke all on function app_private.can_read_match_cedula(text) from public, anon;
revoke all on function app_private.can_write_match_cedula(text) from public, anon;
grant execute on function app_private.can_read_match_cedula(text) to authenticated;
grant execute on function app_private.can_write_match_cedula(text) to authenticated;

create policy cedulas_select_scoped on storage.objects for select to authenticated
using (bucket_id = 'match-cedulas' and app_private.can_read_match_cedula(name));
create policy cedulas_insert_scoped on storage.objects for insert to authenticated
with check (bucket_id = 'match-cedulas' and app_private.can_write_match_cedula(name));
create policy cedulas_update_scoped on storage.objects for update to authenticated
using (bucket_id = 'match-cedulas' and app_private.can_write_match_cedula(name))
with check (bucket_id = 'match-cedulas' and app_private.can_write_match_cedula(name));
create policy cedulas_delete_scoped on storage.objects for delete to authenticated
using (bucket_id = 'match-cedulas' and app_private.can_read_match_cedula(name));
