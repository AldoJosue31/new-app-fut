export const resolveTeamDivisionId = (team, division) =>
  division?.id ?? team?.division?.id ?? team?.division_id ?? null;
