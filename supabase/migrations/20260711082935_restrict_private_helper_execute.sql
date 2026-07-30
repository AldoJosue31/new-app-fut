begin;

revoke execute on function app_private.is_admin() from public, anon;
revoke execute on function app_private.is_league_admin(bigint) from public, anon;
revoke execute on function app_private.is_team_delegate(bigint) from public, anon;
revoke execute on function app_private.team_league_id(bigint) from public, anon;
revoke execute on function app_private.can_manage_logo_path(text, text) from public, anon;
revoke execute on function app_private.logo_path_from_url(text) from public, anon, authenticated;
revoke execute on function app_private.apply_delegate_change(bigint, text, text, jsonb, bigint) from public, anon, authenticated;

grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.is_league_admin(bigint) to authenticated;
grant execute on function app_private.is_team_delegate(bigint) to authenticated;
grant execute on function app_private.team_league_id(bigint) to authenticated;
grant execute on function app_private.can_manage_logo_path(text, text) to authenticated;

commit;;
