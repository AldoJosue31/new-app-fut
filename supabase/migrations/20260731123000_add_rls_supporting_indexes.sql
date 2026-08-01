-- Cover the relationship columns traversed by scoped RLS helpers and policies.
create index if not exists courts_league_id_idx
  on public.courts (league_id);
create index if not exists jornadas_tournament_id_idx
  on public.jornadas (tournament_id);
create index if not exists leagues_owner_id_idx
  on public.leagues (owner_id);
create index if not exists match_events_match_id_idx
  on public.match_events (match_id);
create index if not exists matches_jornada_id_idx
  on public.matches (jornada_id);
create index if not exists teams_division_id_idx
  on public.teams (division_id);
create index if not exists tournaments_division_id_idx
  on public.tournaments (division_id);
