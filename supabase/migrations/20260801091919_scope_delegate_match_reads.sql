begin;

-- Enforce the same scope at the database boundary that the delegate UI uses:
-- league managers/admins can read their league, while delegates can read only
-- matches involving an assigned team.
drop policy if exists scoped_authenticated_read on public.matches;

create policy scoped_authenticated_read
on public.matches
for select
to authenticated
using (
  exists (
    select 1
    from public.jornadas jornada
    join public.tournaments tournament on tournament.id = jornada.tournament_id
    join public.divisions division on division.id = tournament.division_id
    where jornada.id = matches.jornada_id
      and (
        app_private.is_league_admin(division.league_id)
        or app_private.is_team_delegate(matches.team1_id)
        or app_private.is_team_delegate(matches.team2_id)
      )
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_policy policy
    join pg_class relation on relation.oid = policy.polrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'matches'
      and policy.polname = 'scoped_authenticated_read'
      and policy.polcmd = 'r'
  ) then
    raise exception 'matches scoped_authenticated_read policy is required';
  end if;
end;
$$;

commit;
