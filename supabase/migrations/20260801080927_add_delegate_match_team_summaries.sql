begin;

create or replace function app_private.get_delegate_match_team_summaries(
  p_tournament_id bigint
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', visible_team.id,
        'name', visible_team.name,
        'logo_url', visible_team.logo_url,
        'color', visible_team.color
      )
      order by visible_team.name, visible_team.id
    ),
    '[]'::jsonb
  )
  from (
    select distinct
      team.id,
      team.name,
      team.logo_url,
      team.color
    from public.matches m
    join public.jornadas j on j.id = m.jornada_id
    join public.teams team on team.id in (m.team1_id, m.team2_id)
    where j.tournament_id = p_tournament_id
      and p_tournament_id is not null
      and p_tournament_id > 0
      and app_private.is_active_user()
      and exists (
        select 1
        from public.team_delegates td
        where td.delegate_profile_id = (select auth.uid())
          and td.team_id in (m.team1_id, m.team2_id)
      )
  ) visible_team;
$$;

revoke all on function app_private.get_delegate_match_team_summaries(bigint)
from public, anon, authenticated, service_role;
grant execute on function app_private.get_delegate_match_team_summaries(bigint)
to authenticated;

create or replace function public.get_delegate_match_team_summaries(
  p_tournament_id bigint
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.get_delegate_match_team_summaries(p_tournament_id);
$$;

revoke all on function public.get_delegate_match_team_summaries(bigint)
from public, anon, authenticated, service_role;
grant execute on function public.get_delegate_match_team_summaries(bigint)
to authenticated;

comment on function public.get_delegate_match_team_summaries(bigint) is
  'Public team summaries for matches involving a team assigned to the current delegate.';

do $$
begin
  if has_function_privilege(
    'anon',
    'public.get_delegate_match_team_summaries(bigint)',
    'execute'
  ) then
    raise exception 'anon must not execute get_delegate_match_team_summaries';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.get_delegate_match_team_summaries(bigint)',
    'execute'
  ) then
    raise exception 'authenticated must execute get_delegate_match_team_summaries';
  end if;
end;
$$;

commit;
