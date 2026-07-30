create index if not exists team_delegates_assigned_by_idx
  on public.team_delegates(assigned_by);

create index if not exists delegate_invitations_created_by_idx
  on public.delegate_invitations(created_by);

create index if not exists delegate_invitations_used_by_idx
  on public.delegate_invitations(used_by);

create index if not exists delegate_change_requests_player_id_idx
  on public.delegate_change_requests(player_id);

create index if not exists delegate_change_requests_reviewed_by_idx
  on public.delegate_change_requests(reviewed_by);;
