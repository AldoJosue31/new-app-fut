-- Run after migrations against an isolated database. This script is read-only.
do $$
declare
  v_relation text;
  v_policy_count integer;
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
    if has_table_privilege('anon', format('public.%I', v_relation),
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
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
end;
$$;
