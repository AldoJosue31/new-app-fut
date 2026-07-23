const toGoalCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

export const getScannedPlayerScoreTotals = (players = []) => players.reduce(
  (totals, player) => {
    if (player?.side === "local") {
      totals.local += toGoalCount(player.goals);
      totals.visit += toGoalCount(player.ownGoals);
    } else if (player?.side === "visit") {
      totals.visit += toGoalCount(player.goals);
      totals.local += toGoalCount(player.ownGoals);
    }
    return totals;
  },
  { local: 0, visit: 0 },
);

export const getCedulaScoreDiscrepancies = (scores = {}, players = []) => {
  const teamScores = {
    local: toGoalCount(scores.local),
    visit: toGoalCount(scores.visit),
  };
  const assignablePlayers = players.filter(player => (
    !Object.hasOwn(player || {}, "matched") || Boolean(player?.matched)
  ));
  const playerScores = getScannedPlayerScoreTotals(assignablePlayers);
  const sidesWithMatchedContributions = new Set();
  for (const player of assignablePlayers) {
    if (player?.side === "local") {
      sidesWithMatchedContributions.add("local");
      if (toGoalCount(player.ownGoals) > 0) sidesWithMatchedContributions.add("visit");
    } else if (player?.side === "visit") {
      sidesWithMatchedContributions.add("visit");
      if (toGoalCount(player.ownGoals) > 0) sidesWithMatchedContributions.add("local");
    }
  }

  return ["local", "visit"].flatMap(side => (
    !sidesWithMatchedContributions.has(side) || teamScores[side] === playerScores[side]
      ? []
      : [{
          side,
          teamScore: teamScores[side],
          playerScore: playerScores[side],
          difference: Math.abs(teamScores[side] - playerScores[side]),
        }]
  ));
};

export const resolveCedulaScores = (scores = {}, players = [], resolutions = {}) => {
  const playerScores = getScannedPlayerScoreTotals(players.filter(player => (
    !Object.hasOwn(player || {}, "matched") || Boolean(player?.matched)
  )));
  return {
    local: resolutions.local === "players" ? playerScores.local : toGoalCount(scores.local),
    visit: resolutions.visit === "players" ? playerScores.visit : toGoalCount(scores.visit),
  };
};

const trimGoalField = (roster, field, available) => {
  let remaining = available;
  for (const player of roster) {
    const current = toGoalCount(player[field]);
    const kept = Math.min(current, remaining);
    player[field] = kept;
    remaining -= kept;
  }
  return remaining;
};

export const reconcileRostersToScores = (localRoster = [], visitRoster = [], scores = {}) => {
  const local = localRoster.map(player => ({ ...player }));
  const visit = visitRoster.map(player => ({ ...player }));
  const before = {
    local: local.reduce((total, player) => total + toGoalCount(player.goals), 0)
      + visit.reduce((total, player) => total + toGoalCount(player.ownGoals), 0),
    visit: visit.reduce((total, player) => total + toGoalCount(player.goals), 0)
      + local.reduce((total, player) => total + toGoalCount(player.ownGoals), 0),
  };

  let remainingLocal = trimGoalField(local, "goals", toGoalCount(scores.local));
  remainingLocal = trimGoalField(visit, "ownGoals", remainingLocal);
  let remainingVisit = trimGoalField(visit, "goals", toGoalCount(scores.visit));
  remainingVisit = trimGoalField(local, "ownGoals", remainingVisit);

  return {
    localRoster: local,
    visitRoster: visit,
    unassignedGoals: { local: remainingLocal, visit: remainingVisit },
    discardedIndividualGoals: {
      local: Math.max(0, before.local - toGoalCount(scores.local)),
      visit: Math.max(0, before.visit - toGoalCount(scores.visit)),
    },
  };
};
