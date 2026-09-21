-- Run after migrations against an isolated database. This script is read-only.
do $$
declare
  v_relation text;
  v_policy_count integer;
  v_is_security_definer boolean;
  v_function_config text[];
  v_function_definition text;
  v_column text;
begin
  foreach v_relation in array array[
    'account_security_notifications', 'admin_users', 'app_config',
    'categories', 'courts', 'delegate_account_audit_logs',
    'delegate_change_requests', 'delegate_invitations', 'divisions',
    'estadisticas', 'jornadas', 'league_admins', 'leagues',
    'manager_invitations', 'match_events', 'matches', 'players', 'profiles',
    'referees', 'team_delegates', 'teams', 'tournaments',
    'view_clasificacion', 'view_goleadores'
  ]
  loop
    if has_table_privilege('anon', format('public.%I', v_relation), 'SELECT')
       or has_table_privilege('anon', format('public.%I', v_relation), 'INSERT')
       or has_table_privilege('anon', format('public.%I', v_relation), 'UPDATE')
       or has_table_privilege('anon', format('public.%I', v_relation), 'DELETE')
       or has_table_privilege('anon', format('public.%I', v_relation), 'TRUNCATE')
       or has_table_privilege('anon', format('public.%I', v_relation), 'REFERENCES')
       or has_table_privilege('anon', format('public.%I', v_relation), 'TRIGGER') then
      raise exception 'anon still has a table privilege on public.%', v_relation;
    end if;
  end loop;

  select count(*)
  into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any(array[
      'leagues', 'divisions', 'courts', 'tournaments',
      'jornadas', 'matches', 'match_events'
    ])
    and cmd = 'SELECT'
    and 'public' = any(roles)
    and trim(coalesce(qual, '')) = 'true';

  if v_policy_count <> 0 then
    raise exception 'Found % unconditional public SELECT policies', v_policy_count;
  end if;

  if has_function_privilege('anon', 'public.consume_edge_rate_limit(text)', 'EXECUTE') then
    raise exception 'anon can execute the authenticated rate limiter';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.consume_edge_rate_limit(text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute the rate limiter';
  end if;

  if not has_function_privilege(
    'anon',
    'public.get_public_tournament_bundle(bigint)',
    'EXECUTE'
  ) then
    raise exception 'public tournament RPC is no longer available to anon';
  end if;

  if has_function_privilege(
    'anon',
    'app_private.can_read_match_event(bigint)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute the private match-event authorization helper';
  end if;

  if not has_function_privilege(
    'authenticated',
    'app_private.can_read_match_event(bigint)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot evaluate the match-events read policy';
  end if;

  select count(*)
  into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'match_events'
    and policyname = 'scoped_authenticated_read'
    and cmd = 'SELECT'
    and 'authenticated' = any(roles)
    and qual = 'app_private.can_read_match_event(match_id)';

  if v_policy_count <> 1 then
    raise exception 'match_events is not using the optimized scoped read policy';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'matches'
      and column_name = 'result_revision'
      and is_nullable = 'NO'
  ) then
    raise exception 'matches.result_revision is missing or nullable';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_match_result_atomic(bigint, bigint, jsonb, jsonb)',
    'EXECUTE'
  ) then
    raise exception 'anon can save match results atomically';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_match_result_atomic(bigint, bigint, jsonb, jsonb)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot save match results atomically';
  end if;

  if has_function_privilege(
    'anon',
    'public.clear_tournament_results_atomic(bigint)',
    'EXECUTE'
  ) then
    raise exception 'anon can clear tournament results atomically';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.clear_tournament_results_atomic(bigint)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot clear tournament results atomically';
  end if;

  select p.prosecdef, p.proconfig, pg_get_functiondef(p.oid)
  into v_is_security_definer, v_function_config, v_function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid =
      'public.save_match_result_atomic(bigint, bigint, jsonb, jsonb)'::regprocedure;

  if v_is_security_definer is distinct from true then
    raise exception 'save_match_result_atomic must run as SECURITY DEFINER after direct result DML is revoked';
  end if;

  if not coalesce('search_path=""' = any(v_function_config), false) then
    raise exception 'save_match_result_atomic must pin an empty search_path';
  end if;

  if position('for update of m' in lower(v_function_definition)) = 0
     or position('result_revision' in lower(v_function_definition)) = 0
     or position('delete from public.match_events' in lower(v_function_definition)) = 0
     or position('auth.uid' in lower(v_function_definition)) = 0
     or position('app_private.is_active_user' in lower(v_function_definition)) = 0
     or position('public.league_admins' in lower(v_function_definition)) = 0
     or position('for share' in lower(v_function_definition)) = 0 then
    raise exception 'save_match_result_atomic no longer locks, authorizes, and replaces the result atomically';
  end if;

  if position(
    'app_private.is_active_user' in substring(
      lower(v_function_definition)
      from position('for update of m' in lower(v_function_definition))
    )
  ) = 0
     or position(
       'public.league_admins' in substring(
         lower(v_function_definition)
         from position('for update of m' in lower(v_function_definition))
       )
     ) = 0 then
    raise exception 'save_match_result_atomic does not reauthorize after waiting for the row lock';
  end if;

  select p.prosecdef, p.proconfig, pg_get_functiondef(p.oid)
  into v_is_security_definer, v_function_config, v_function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid = 'public.clear_tournament_results_atomic(bigint)'::regprocedure;

  if v_is_security_definer is distinct from true then
    raise exception 'clear_tournament_results_atomic must run as SECURITY DEFINER after direct result DML is revoked';
  end if;

  if not coalesce('search_path=""' = any(v_function_config), false) then
    raise exception 'clear_tournament_results_atomic must pin an empty search_path';
  end if;

  if position('for update of m' in lower(v_function_definition)) = 0
     or position('delete from public.match_events' in lower(v_function_definition)) = 0
     or position('result_revision' in lower(v_function_definition)) = 0
     or position('auth.uid' in lower(v_function_definition)) = 0
     or position('app_private.is_active_user' in lower(v_function_definition)) = 0
     or position('public.league_admins' in lower(v_function_definition)) = 0
     or position('for share' in lower(v_function_definition)) = 0 then
    raise exception 'clear_tournament_results_atomic no longer locks, authorizes, and resets each match atomically';
  end if;

  if position(
    'app_private.is_active_user' in substring(
      lower(v_function_definition)
      from position('for update of m' in lower(v_function_definition))
    )
  ) = 0
     or position(
       'public.league_admins' in substring(
         lower(v_function_definition)
         from position('for update of m' in lower(v_function_definition))
       )
     ) = 0 then
    raise exception 'clear_tournament_results_atomic does not reauthorize after waiting for row locks';
  end if;

  if has_table_privilege('authenticated', 'public.matches', 'UPDATE')
     or has_table_privilege('authenticated', 'public.matches', 'TRUNCATE') then
    raise exception 'authenticated can mutate or truncate matches directly instead of using the atomic result RPC';
  end if;

  if not has_table_privilege('authenticated', 'public.matches', 'DELETE') then
    raise exception 'authenticated cannot remove an eligible fixture';
  end if;

  foreach v_column in array array[
    'jornada_id', 'team1_id', 'team2_id', 'referee_id', 'court_id',
    'date', 'status', 'observations'
  ]
  loop
    if not has_column_privilege('authenticated', 'public.matches', v_column, 'INSERT') then
      raise exception 'authenticated cannot insert fixture column public.matches.%', v_column;
    end if;
  end loop;

  foreach v_column in array array[
    'goals1', 'goals2', 'puntos1', 'puntos2', 'mvp_player_id', 'result_revision'
  ]
  loop
    if has_column_privilege('authenticated', 'public.matches', v_column, 'INSERT') then
      raise exception 'authenticated can insert result column public.matches.% directly', v_column;
    end if;
  end loop;

  for v_column in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'matches'
  loop
    if has_column_privilege('authenticated', 'public.matches', v_column, 'UPDATE') then
      raise exception 'authenticated can update public.matches.% directly', v_column;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.match_events', 'INSERT')
     or has_table_privilege('authenticated', 'public.match_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.match_events', 'DELETE')
     or has_table_privilege('authenticated', 'public.match_events', 'TRUNCATE')
     or not has_table_privilege('authenticated', 'public.match_events', 'SELECT') then
    raise exception 'authenticated match-event privileges do not require the atomic result RPC';
  end if;

  for v_column in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'match_events'
  loop
    if has_column_privilege('authenticated', 'public.match_events', v_column, 'INSERT')
       or has_column_privilege('authenticated', 'public.match_events', v_column, 'UPDATE') then
      raise exception 'authenticated can mutate public.match_events.% directly', v_column;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'matches'
      and policyname = 'matches_direct_fixture_insert_guard'
      and cmd = 'INSERT'
      and permissive = 'RESTRICTIVE'
      and 'authenticated' = any(roles)
      and lower(coalesce(with_check, '')) like '%status%'
      and lower(coalesce(with_check, '')) like '%goals1%'
      and lower(coalesce(with_check, '')) like '%goals2%'
      and lower(coalesce(with_check, '')) like '%puntos1%'
      and lower(coalesce(with_check, '')) like '%puntos2%'
      and lower(coalesce(with_check, '')) like '%mvp_player_id%'
      and lower(coalesce(with_check, '')) like '%result_revision%'
  ) then
    raise exception 'matches direct fixture INSERT guard is missing or permissive';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'matches'
      and policyname = 'matches_direct_fixture_delete_guard'
      and cmd = 'DELETE'
      and permissive = 'RESTRICTIVE'
      and 'authenticated' = any(roles)
      and lower(coalesce(qual, '')) like '%status%'
      and lower(coalesce(qual, '')) like '%goals1%'
      and lower(coalesce(qual, '')) like '%goals2%'
      and lower(coalesce(qual, '')) like '%puntos1%'
      and lower(coalesce(qual, '')) like '%puntos2%'
      and lower(coalesce(qual, '')) like '%mvp_player_id%'
      and lower(coalesce(qual, '')) like '%match_events%'
      and lower(coalesce(qual, '')) like '%confirmada%'
      and lower(coalesce(qual, '')) like '%finalizada%'
  ) then
    raise exception 'matches direct fixture DELETE guard is missing or permissive';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jornadas'
      and policyname = 'jornadas_direct_clean_delete_guard'
      and cmd = 'DELETE'
      and permissive = 'RESTRICTIVE'
      and 'authenticated' = any(roles)
      and lower(coalesce(qual, '')) like '%matches%'
      and lower(coalesce(qual, '')) like '%match_events%'
      and lower(coalesce(qual, '')) like '%confirmada%'
      and lower(coalesce(qual, '')) like '%finalizada%'
  ) then
    raise exception 'jornadas direct DELETE guard is missing or permissive';
  end if;
end;
$$;
