
create or replace function app_private.is_league_delegate(p_league_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.is_active_user()
    and exists (
      select 1
      from public.team_delegates td
      join public.teams t on t.id = td.team_id
      join public.divisions d on d.id = t.division_id
      where td.delegate_profile_id = auth.uid()
        and d.league_id = p_league_id
    );
$$;

revoke all on function app_private.is_league_delegate(bigint) from public, anon;
grant execute on function app_private.is_league_delegate(bigint) to authenticated;

drop policy if exists players_authorized_read on public.players;
create policy players_authorized_read
on public.players
for select
to authenticated
using (
  app_private.is_league_admin(app_private.team_league_id(players.team_id))
  or app_private.is_team_delegate(players.team_id)
);

drop policy if exists teams_authorized_read on public.teams;
create policy teams_authorized_read
on public.teams
for select
to authenticated
using (
  app_private.is_league_admin(app_private.team_league_id(teams.id))
  or app_private.is_team_delegate(teams.id)
);

drop policy if exists referees_authorized_read on public.referees;
create policy referees_authorized_read
on public.referees
for select
to authenticated
using (
  app_private.is_league_admin(referees.league_id)
  or app_private.is_league_delegate(referees.league_id)
);
;
