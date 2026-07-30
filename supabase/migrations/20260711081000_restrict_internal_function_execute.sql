begin;

revoke execute on function public.check_division_limit() from public, anon, authenticated;
revoke execute on function public.check_player_limit() from public, anon, authenticated;
revoke execute on function public.check_team_limit() from public, anon, authenticated;
revoke execute on function public.prevent_google_signup() from public, anon, authenticated;

commit;;
