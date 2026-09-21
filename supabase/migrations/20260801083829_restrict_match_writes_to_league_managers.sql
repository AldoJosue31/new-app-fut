-- The active-user guard must be restrictive. As a permissive ALL policy it was
-- OR-ed with the manager policy and unintentionally authorized every active user
-- to write matches.
drop policy if exists active_authenticated_guard on public.matches;

create policy active_authenticated_guard
on public.matches
as restrictive
for all
to authenticated
using ((select app_private.is_active_user()))
with check ((select app_private.is_active_user()));

do $$
begin
  if not exists (
    select 1
    from pg_policy policy
    join pg_class relation on relation.oid = policy.polrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'matches'
      and policy.polname = 'active_authenticated_guard'
      and policy.polpermissive = false
  ) then
    raise exception 'matches active_authenticated_guard must be restrictive';
  end if;
end;
$$;
