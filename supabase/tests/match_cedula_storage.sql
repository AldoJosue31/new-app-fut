-- Verificación con permisos authenticated reales; todos los cambios se revierten.
begin;
do $$
declare
  v_match_id bigint;
  v_tournament_id bigint;
  v_league_id bigint;
  v_user_id uuid;
  v_path text;
begin
  select m.id, t.id, d.league_id, la.user_id
    into v_match_id, v_tournament_id, v_league_id, v_user_id
    from public.matches m
    join public.jornadas j on j.id = m.jornada_id
    join public.tournaments t on t.id = j.tournament_id
    join public.divisions d on d.id = t.division_id
    join public.league_admins la on la.league_id = d.league_id
    join public.profiles p on p.id = la.user_id
    where t.status in ('Activo', 'En Curso') and not t.cedula_uploads_locked
      and p.role = 'manager' and not coalesce(p.is_suspended, false)
      and not coalesce(p.is_deleted, false)
    limit 1;
  if v_match_id is null then raise exception 'Se necesita un partido activo para la prueba de permisos'; end if;
  v_path := v_league_id || '/' || v_tournament_id || '/' || v_match_id || '.jpg';
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform set_config('role', 'authenticated', true);

  if not app_private.can_read_match_cedula(v_path) then raise exception 'El administrador no puede leer su cédula'; end if;
  if not app_private.can_write_match_cedula(v_path) then raise exception 'El administrador no puede cargar su cédula'; end if;
  if app_private.can_write_match_cedula(v_league_id || '/' || v_tournament_id || '/999999999999999.jpg') then
    raise exception 'Se permite cargar una foto para un partido inexistente';
  end if;
  if app_private.can_read_match_cedula('../cedula.jpg') then raise exception 'Se acepta una ruta inválida'; end if;
  if app_private.can_read_match_cedula('999999999999999/1/1.jpg') then raise exception 'Se permite leer otra liga'; end if;

  update public.tournaments set cedula_uploads_locked = true where id = v_tournament_id;
  if app_private.can_write_match_cedula(v_path) then raise exception 'Se permite cargar durante la limpieza'; end if;
  if not app_private.can_read_match_cedula(v_path) then raise exception 'La limpieza no puede enumerar archivos'; end if;
  perform set_config('request.jwt.claim.sub', '', true);
  if app_private.can_read_match_cedula(v_path) then raise exception 'Se permite leer sin usuario'; end if;
  perform set_config('role', 'none', true);
end;
$$;
rollback;
