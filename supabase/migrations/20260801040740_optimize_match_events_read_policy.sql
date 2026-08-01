-- Resolve the match-to-league lookup outside exposed-schema RLS expansion.
-- Authorization remains identical to the previous policy: active league
-- administrators/owners/global admins and league delegates can read events.
create or replace function app_private.can_read_match_event(p_match_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.matches m
      join public.jornadas j on j.id = m.jornada_id
      join public.tournaments t on t.id = j.tournament_id
      join public.divisions d on d.id = t.division_id
      where m.id = p_match_id
        and (
          app_private.is_league_admin(d.league_id)
          or app_private.is_league_delegate(d.league_id)
        )
    );
$function$;

revoke all on function app_private.can_read_match_event(bigint)
from public, anon, authenticated, service_role;

grant execute on function app_private.can_read_match_event(bigint)
to authenticated;

drop policy if exists scoped_authenticated_read
on public.match_events;

create policy scoped_authenticated_read
on public.match_events
for select
to authenticated
using (app_private.can_read_match_event(match_id));
