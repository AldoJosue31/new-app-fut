begin;

drop policy if exists "Publico ve jugadores" on public.players;
drop policy if exists "Lectura publica teams" on public.teams;
drop policy if exists "Publico ve todo" on public.teams;
drop policy if exists "Lectura publica arbitros" on public.referees;

revoke select on table public.players from public, anon;
revoke select on table public.teams from public, anon;
revoke select on table public.referees from public, anon;

grant select on table public.players to authenticated;
grant select on table public.teams to authenticated;
grant select on table public.referees to authenticated;

revoke select on table public.view_goleadores from public, anon;
revoke select on table public.view_clasificacion from public, anon;

grant select on table public.view_goleadores to authenticated;
grant select on table public.view_clasificacion to authenticated;

commit;;
