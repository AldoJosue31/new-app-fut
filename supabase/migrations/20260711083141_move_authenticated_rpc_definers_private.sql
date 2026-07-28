begin;

do $$
declare
  v_oid oid;
  v_def text;
  v_name text;
begin
  foreach v_name in array array[
    'assign_team_delegate',
    'create_delegate_invitation',
    'procesar_invitacion_delegate',
    'procesar_invitacion_manager',
    'review_delegate_change_request',
    'revoke_delegate_invitation',
    'submit_delegate_change_request',
    'unlink_team_delegate'
  ] loop
    select p.oid into v_oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = v_name
      and p.prokind = 'f'
    order by p.oid
    limit 1;

    if v_oid is null then
      raise exception 'Function public.% not found', v_name;
    end if;

    v_def := pg_get_functiondef(v_oid);
    v_def := replace(v_def, 'FUNCTION public.' || v_name || '(', 'FUNCTION app_private.' || v_name || '(');
    execute v_def;
  end loop;
end $$;

revoke all on function app_private.assign_team_delegate(bigint, uuid, text) from public, anon, authenticated;
revoke all on function app_private.create_delegate_invitation(bigint, text, text, text, timestamp with time zone) from public, anon, authenticated;
revoke all on function app_private.procesar_invitacion_delegate(uuid, uuid, text) from public, anon, authenticated;
revoke all on function app_private.procesar_invitacion_manager(uuid, uuid, text) from public, anon, authenticated;
revoke all on function app_private.review_delegate_change_request(uuid, text, text) from public, anon, authenticated;
revoke all on function app_private.revoke_delegate_invitation(uuid) from public, anon, authenticated;
revoke all on function app_private.submit_delegate_change_request(bigint, text, text, jsonb, bigint) from public, anon, authenticated;
revoke all on function app_private.unlink_team_delegate(bigint) from public, anon, authenticated;

grant execute on function app_private.assign_team_delegate(bigint, uuid, text) to authenticated;
grant execute on function app_private.create_delegate_invitation(bigint, text, text, text, timestamp with time zone) to authenticated;
grant execute on function app_private.procesar_invitacion_delegate(uuid, uuid, text) to authenticated;
grant execute on function app_private.procesar_invitacion_manager(uuid, uuid, text) to authenticated;
grant execute on function app_private.review_delegate_change_request(uuid, text, text) to authenticated;
grant execute on function app_private.revoke_delegate_invitation(uuid) to authenticated;
grant execute on function app_private.submit_delegate_change_request(bigint, text, text, jsonb, bigint) to authenticated;
grant execute on function app_private.unlink_team_delegate(bigint) to authenticated;

create or replace function public.assign_team_delegate(
  p_team_id bigint,
  p_delegate_profile_id uuid,
  p_delegate_name text default null::text
)
returns jsonb
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.assign_team_delegate(p_team_id, p_delegate_profile_id, p_delegate_name);
$$;

create or replace function public.create_delegate_invitation(
  p_team_id bigint,
  p_invited_name text default null::text,
  p_invited_email text default null::text,
  p_invited_phone text default null::text,
  p_expires_at timestamp with time zone default null::timestamp with time zone
)
returns jsonb
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.create_delegate_invitation(p_team_id, p_invited_name, p_invited_email, p_invited_phone, p_expires_at);
$$;

create or replace function public.procesar_invitacion_delegate(
  p_token uuid,
  p_user_id uuid,
  p_contact_phone text default null::text
)
returns jsonb
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.procesar_invitacion_delegate(p_token, p_user_id, p_contact_phone);
$$;

create or replace function public.procesar_invitacion_manager(
  p_token uuid,
  p_user_id uuid,
  p_league_name text
)
returns jsonb
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.procesar_invitacion_manager(p_token, p_user_id, p_league_name);
$$;

create or replace function public.review_delegate_change_request(
  p_request_id uuid,
  p_decision text,
  p_review_notes text default null::text
)
returns jsonb
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.review_delegate_change_request(p_request_id, p_decision, p_review_notes);
$$;

create or replace function public.revoke_delegate_invitation(p_invitation_id uuid)
returns jsonb
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.revoke_delegate_invitation(p_invitation_id);
$$;

create or replace function public.submit_delegate_change_request(
  p_team_id bigint,
  p_entity_type text,
  p_action_type text,
  p_payload jsonb default '{}'::jsonb,
  p_player_id bigint default null::bigint
)
returns jsonb
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.submit_delegate_change_request(p_team_id, p_entity_type, p_action_type, p_payload, p_player_id);
$$;

create or replace function public.unlink_team_delegate(p_team_id bigint)
returns jsonb
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.unlink_team_delegate(p_team_id);
$$;

revoke all on function public.assign_team_delegate(bigint, uuid, text) from public, anon, authenticated;
revoke all on function public.create_delegate_invitation(bigint, text, text, text, timestamp with time zone) from public, anon, authenticated;
revoke all on function public.procesar_invitacion_delegate(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.procesar_invitacion_manager(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.review_delegate_change_request(uuid, text, text) from public, anon, authenticated;
revoke all on function public.revoke_delegate_invitation(uuid) from public, anon, authenticated;
revoke all on function public.submit_delegate_change_request(bigint, text, text, jsonb, bigint) from public, anon, authenticated;
revoke all on function public.unlink_team_delegate(bigint) from public, anon, authenticated;

grant execute on function public.assign_team_delegate(bigint, uuid, text) to authenticated;
grant execute on function public.create_delegate_invitation(bigint, text, text, text, timestamp with time zone) to authenticated;
grant execute on function public.procesar_invitacion_delegate(uuid, uuid, text) to authenticated;
grant execute on function public.procesar_invitacion_manager(uuid, uuid, text) to authenticated;
grant execute on function public.review_delegate_change_request(uuid, text, text) to authenticated;
grant execute on function public.revoke_delegate_invitation(uuid) to authenticated;
grant execute on function public.submit_delegate_change_request(bigint, text, text, jsonb, bigint) to authenticated;
grant execute on function public.unlink_team_delegate(bigint) to authenticated;

commit;;
