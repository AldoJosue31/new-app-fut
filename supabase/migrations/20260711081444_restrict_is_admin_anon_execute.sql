begin;

drop policy if exists "Admin total access" on public.leagues;
create policy "Admin total access"
on public.leagues
for all
to authenticated
using (public.is_admin());

drop policy if exists "Admin ve todos los perfiles" on public.profiles;
create policy "Admin ve todos los perfiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin());

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

commit;;
