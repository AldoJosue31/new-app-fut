revoke execute on function public.activar_nuevo_manager(text, text, text) from anon;
revoke execute on function public.create_delegate_invitation(bigint, text, text, timestamp with time zone) from anon;
revoke execute on function public.assign_team_delegate(bigint, uuid, text) from anon;
revoke execute on function public.revoke_delegate_invitation(uuid) from anon;
revoke execute on function public.submit_delegate_change_request(bigint, text, text, jsonb, bigint) from anon;
revoke execute on function public.review_delegate_change_request(uuid, text, text) from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;;
