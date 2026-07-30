revoke execute on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to postgres, service_role;

revoke execute on function public.activar_nuevo_manager(text, text, text) from public;
grant execute on function public.activar_nuevo_manager(text, text, text) to authenticated, postgres, service_role;;
