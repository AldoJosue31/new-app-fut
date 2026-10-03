export const hydrateDelegateMatches = ({ matches = [], teams = [], team }) => {
  if (!team?.id) return [];

  const teamsById = new Map(teams.map((entry) => [String(entry.id), entry]));
  teamsById.set(String(team.id), { ...teamsById.get(String(team.id)), ...team });

  return matches
    .filter((match) =>
      String(match.team1_id) === String(team.id) ||
      String(match.team2_id) === String(team.id)
    )
    .map((match) => ({
      ...match,
      team1: teamsById.get(String(match.team1_id)) || { id: match.team1_id, name: "Rival" },
      team2: teamsById.get(String(match.team2_id)) || { id: match.team2_id, name: "Rival" },
    }));
};
