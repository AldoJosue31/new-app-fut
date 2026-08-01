-- Emergency compatibility rollback for authenticated workspaces.
-- It intentionally does not restore anonymous table grants or public USING
-- (true) policies. Public pages continue through get_public_tournament_bundle().
begin;

drop policy if exists scoped_authenticated_read on public.leagues;
drop policy if exists scoped_authenticated_read on public.divisions;
drop policy if exists scoped_authenticated_read on public.courts;
drop policy if exists scoped_authenticated_read on public.tournaments;
drop policy if exists scoped_authenticated_read on public.jornadas;
drop policy if exists scoped_authenticated_read on public.matches;
drop policy if exists scoped_authenticated_read on public.match_events;

create policy authenticated_compatibility_read
on public.leagues for select to authenticated using (true);
create policy authenticated_compatibility_read
on public.divisions for select to authenticated using (true);
create policy authenticated_compatibility_read
on public.courts for select to authenticated using (true);
create policy authenticated_compatibility_read
on public.tournaments for select to authenticated using (true);
create policy authenticated_compatibility_read
on public.jornadas for select to authenticated using (true);
create policy authenticated_compatibility_read
on public.matches for select to authenticated using (true);
create policy authenticated_compatibility_read
on public.match_events for select to authenticated using (true);

commit;
