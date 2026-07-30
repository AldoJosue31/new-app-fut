begin;

grant execute on function app_private.can_manage_logo_path(text, text) to authenticated;

commit;;
