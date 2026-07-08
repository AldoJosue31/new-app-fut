import React, { useMemo } from "react";
import styled from "styled-components";
import { RiGitBranchLine, RiTrophyLine } from "react-icons/ri";
import { DynamicTeamLogo } from "../../../equipos/DynamicTeamLogo";
import {
  PLAYOFF_PHASES,
  getPhaseByParticipants,
  getPhaseLabelByKey,
  getPlayoffSettings,
  getStageMatches,
  isFinishedMatchStatus,
  resolveSeriesWinner,
} from "../../../../../utils/playoffUtils";

const MAIN_PHASE_KEYS = PLAYOFF_PHASES.map((phase) => phase.key);
const BRACKET_CARD_WIDTH = 238;
const BRACKET_CARD_HEIGHT = 112;
const BRACKET_COLUMN_GAP = 74;
const BRACKET_ROW_HEIGHT = 124;
const BRACKET_HEADER_HEIGHT = 42;
const PRINT_BRACKET_WIDTH = 652;
const PRINT_BRACKET_HEIGHT = 878;
const PRINT_HEADER_HEIGHT = 38;
const PRINT_CENTER_GAP = 18;
const PRINT_STAGE_GAP = 12;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getPhaseShortLabel = (phaseKey) => ({
  repechaje: "Rep",
  round32: "16F",
  round16: "OF",
  quarterfinals: "CF",
  semifinals: "SF",
  final: "F",
})[phaseKey] || "FF";

const toId = (value) => (value === null || value === undefined ? "" : String(value));

const parseConfig = (torneo = {}) => {
  if (typeof torneo?.config === "string") {
    try {
      return JSON.parse(torneo.config) || {};
    } catch {
      return {};
    }
  }

  return torneo?.config || {};
};

const hasScoreValue = (value) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== "" &&
  Number.isFinite(Number(value));

const getTeamId = (team = {}) => toId(team?.teamId || team?.id);

const getMatchTeamGoals = (match = {}, teamId) => {
  if (toId(match.team1_id) === toId(teamId)) return Number(match.goals1);
  if (toId(match.team2_id) === toId(teamId)) return Number(match.goals2);
  return 0;
};

const getPairMatches = (pair = {}, stageMatches = []) => {
  const homeId = getTeamId(pair.home);
  const awayId = getTeamId(pair.away);
  if (!homeId || !awayId) return [];

  return stageMatches.filter((match) => {
    const ids = [toId(match.team1_id), toId(match.team2_id)];
    return ids.includes(homeId) && ids.includes(awayId);
  });
};

const getPairResult = ({ pair, matches, settings }) => {
  if (!pair?.home || !pair?.away) {
    return {
      homeGoals: null,
      awayGoals: null,
      legs: [],
      winnerId: pair?.bye && pair?.home ? getTeamId(pair.home) : null,
      isComplete: Boolean(pair?.bye && pair?.home),
    };
  }

  const homeId = getTeamId(pair.home);
  const awayId = getTeamId(pair.away);
  const orderedMatches = [...matches].sort((a, b) => {
    const aLabel = String(a?.jornadas?.name || a?.jornada?.name || "");
    const bLabel = String(b?.jornadas?.name || b?.jornada?.name || "");
    if (/\bida\b/i.test(aLabel) && /\bvuelta\b/i.test(bLabel)) return -1;
    if (/\bvuelta\b/i.test(aLabel) && /\bida\b/i.test(bLabel)) return 1;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
  const legs = orderedMatches.map((match) => {
    const hasScore = hasScoreValue(match.goals1) && hasScoreValue(match.goals2);
    return {
      id: match.id,
      hasScore,
      homeGoals: hasScore ? getMatchTeamGoals(match, homeId) : null,
      awayGoals: hasScore ? getMatchTeamGoals(match, awayId) : null,
      isFinished: isFinishedMatchStatus(match.status),
    };
  });
  const scoredLegs = legs.filter((leg) => leg.hasScore);
  const homeGoals = scoredLegs.reduce((sum, leg) => sum + leg.homeGoals, 0);
  const awayGoals = scoredLegs.reduce((sum, leg) => sum + leg.awayGoals, 0);
  const winner = resolveSeriesWinner({ pair, matches, settings });

  return {
    homeGoals: scoredLegs.length > 0 ? homeGoals : null,
    awayGoals: scoredLegs.length > 0 ? awayGoals : null,
    legs,
    winnerId: winner ? getTeamId(winner) : null,
    isComplete: matches.length > 0 && matches.every((match) =>
      isFinishedMatchStatus(match.status) &&
      hasScoreValue(match.goals1) &&
      hasScoreValue(match.goals2)
    ),
  };
};

const buildPlaceholderPairs = (count) =>
  Array.from({ length: Math.max(1, count) }, (_, index) => ({
    id: `placeholder-${index + 1}`,
    home: null,
    away: null,
    placeholder: true,
  }));

const getInitialPairCount = (phaseKey, repechajeCount) => {
  if (phaseKey === "repechaje") return Math.ceil(Math.max(2, repechajeCount) / 2);
  const phase = PLAYOFF_PHASES.find((item) => item.key === phaseKey);
  return Math.max(1, Math.ceil((phase?.participants || 2) / 2));
};

const getPairPrimarySeed = (pair = {}, fallback = 999) => {
  const seeds = [pair.home?.seed, pair.away?.seed]
    .map((seed) => Number(seed))
    .filter((seed) => Number.isFinite(seed));

  return seeds.length > 0 ? Math.min(...seeds) : fallback;
};

const getNextPowerOfTwo = (value) => {
  let size = 1;
  while (size < value) size *= 2;
  return size;
};

const buildBalancedBracketOrder = (slotCount) => {
  const targetSize = getNextPowerOfTwo(Math.max(1, slotCount));
  let order = [1];

  while (order.length < targetSize) {
    const nextSize = order.length * 2;
    order = order.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }

  return order.filter((seed) => seed <= slotCount);
};

const orderPairsByReseedCup = (pairs = [], reseed = false) => {
  if (!reseed) return pairs;

  const sortedPairs = [...pairs].sort((a, b) => {
    const aSeed = getPairPrimarySeed(a, 999);
    const bSeed = getPairPrimarySeed(b, 999);
    if (aSeed !== bSeed) return aSeed - bSeed;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  if (sortedPairs.length <= 2) return sortedPairs;

  const pairsBySeedRank = new Map(
    sortedPairs.map((pair, index) => [index + 1, pair])
  );

  return buildBalancedBracketOrder(sortedPairs.length)
    .map((seedRank) => pairsBySeedRank.get(seedRank))
    .filter(Boolean);
};

const hasClinchedStatus = (row = {}, key) =>
  Array.isArray(row.clinchedStatuses) &&
  row.clinchedStatuses.some((status) => status?.key === key);

const toProjectedSeedTeam = (row = {}, index = 0) => ({
  teamId: row.teamId || row.id,
  id: row.teamId || row.id,
  name: row.name || row.nombre || "Equipo",
  seed: row.seed || index + 1,
  logo_url: row.logo_url || row.logo || null,
  color: row.color || null,
});

const buildSeedSlotPairs = ({ slotCount = 0, teamsBySeed = new Map() }) => {
  const pairs = [];
  let leftSeed = 1;
  let rightSeed = Math.max(0, slotCount);

  while (leftSeed < rightSeed) {
    pairs.push({
      id: `projected-${leftSeed}-${rightSeed}`,
      home: teamsBySeed.get(leftSeed) || null,
      away: teamsBySeed.get(rightSeed) || null,
      projected: true,
    });
    leftSeed += 1;
    rightSeed -= 1;
  }

  if (leftSeed === rightSeed && leftSeed > 0) {
    const home = teamsBySeed.get(leftSeed) || null;
    pairs.push({
      id: `projected-bye-${leftSeed}`,
      home,
      away: null,
      bye: Boolean(home),
      projected: true,
    });
  }

  return pairs;
};

const buildProjectedMainStage = ({ standings = [], phaseKey, participantCount = 0 }) => {
  const slotCount = Number.parseInt(participantCount, 10) || 0;
  if (!phaseKey || slotCount <= 0) return null;

  const clinchedTeams = standings
    .map((row, index) => toProjectedSeedTeam(row, index))
    .filter((team, index) => {
      const sourceRow = standings[index];
      return team.seed <= slotCount && hasClinchedStatus(sourceRow, "liguilla");
    });

  if (clinchedTeams.length === 0) return null;

  const teamsBySeed = new Map(clinchedTeams.map((team) => [team.seed, team]));
  return {
    phaseKey,
    phaseLabel: `${getPhaseLabelByKey(phaseKey)} provisional`,
    pairs: buildSeedSlotPairs({ slotCount, teamsBySeed }),
  };
};

const buildBracketStages = ({ torneo, partidos, jornadas, projectedStandings = [] }) => {
  const config = parseConfig(torneo);
  const playoffState = config.playoffState || {};
  const savedStages = Array.isArray(playoffState.stages) ? playoffState.stages : [];
  const settings = getPlayoffSettings(config);

  if (!config.zonaLiguilla && savedStages.length === 0) return [];

  const savedStagesByPhase = new Map(savedStages.map((stage) => [stage.phaseKey, stage]));
  const directCount = Number.parseInt(config.clasificados, 10) || 0;
  const repechajeCount = Number.parseInt(config.repechajeTeams, 10) || 0;
  const projectedMainParticipantCount =
    directCount + (repechajeCount > 0 ? Math.floor(repechajeCount / 2) : 0);
  const savedMainIndexes = savedStages
    .map((stage) => MAIN_PHASE_KEYS.indexOf(stage?.phaseKey))
    .filter((index) => index >= 0);
  const firstSavedMainIndex = savedMainIndexes.length > 0 ? Math.min(...savedMainIndexes) : -1;
  const firstEstimatedMainKey = getPhaseByParticipants(
    projectedMainParticipantCount || directCount || 2
  ).key;
  const projectedMainStage = buildProjectedMainStage({
    standings: projectedStandings,
    phaseKey: firstEstimatedMainKey,
    participantCount: projectedMainParticipantCount || directCount,
  });
  const estimatedMainIndex = Math.max(0, MAIN_PHASE_KEYS.indexOf(firstEstimatedMainKey));
  const firstMainIndex = firstSavedMainIndex >= 0 ? Math.min(firstSavedMainIndex, estimatedMainIndex) : estimatedMainIndex;
  const hasRepechaje = repechajeCount > 0 || savedStagesByPhase.has("repechaje");
  const phaseKeys = [
    ...(hasRepechaje ? ["repechaje"] : []),
    ...MAIN_PHASE_KEYS.slice(firstMainIndex),
  ];

  let nextPlaceholderCount = 0;
  return phaseKeys.map((phaseKey, phaseIndex) => {
    const savedStage = savedStagesByPhase.get(phaseKey);
    const projectedStage =
      !savedStage && projectedMainStage?.phaseKey === phaseKey ? projectedMainStage : null;
    const previousCount = phaseIndex > 0 ? nextPlaceholderCount : 0;
    const rawPairs = savedStage?.pairs?.length
      ? savedStage.pairs
      : projectedStage?.pairs?.length
      ? projectedStage.pairs
      : buildPlaceholderPairs(previousCount || getInitialPairCount(phaseKey, repechajeCount));
    const pairs = orderPairsByReseedCup(rawPairs, settings.reseed);
    const stageMatches = getStageMatches({ phaseKey, matches: partidos, jornadas });

    nextPlaceholderCount = Math.max(1, Math.ceil(pairs.length / 2));

    return {
      key: phaseKey,
      label: savedStage?.phaseLabel || projectedStage?.phaseLabel || getPhaseLabelByKey(phaseKey),
      shortLabel: getPhaseShortLabel(phaseKey),
      isCreated: Boolean(savedStage),
      isProjected: Boolean(projectedStage),
      reseed: settings.reseed,
      matches: pairs.map((pair, pairIndex) => {
        const pairMatches = getPairMatches(pair, stageMatches);
        return {
          pair,
          pairIndex,
          cupNumber: pairIndex + 1,
          result: getPairResult({ pair, matches: pairMatches, settings }),
        };
      }),
    };
  });
};

const TeamLogo = ({ team }) => {
  if (!team) return <span className="empty-logo" />;
  if (team.logo_url || team.logo) {
    return <img src={team.logo_url || team.logo} alt={team.name || "Equipo"} crossOrigin="anonymous" />;
  }
  return <DynamicTeamLogo name={team.name} color={team.color} size="26px" />;
};

const TeamRow = ({ team, goals, isWinner }) => (
  <div className={["team-row", isWinner ? "winner" : "", !team ? "empty" : ""].filter(Boolean).join(" ")}>
    <span className="seed">{team?.seed ? `#${team.seed}` : "-"}</span>
    <span className="logo"><TeamLogo team={team} /></span>
    <span className="name">{team?.name || "Por definir"}</span>
    <strong>{goals === null || goals === undefined ? "-" : goals}</strong>
  </div>
);

const MatchCard = ({ row, density = "default" }) => {
  const { pair, result } = row;
  const homeId = getTeamId(pair.home);
  const awayId = getTeamId(pair.away);
  const showLegBreakdown = result.legs.length > 1;
  const [firstLeg, secondLeg] = result.legs;
  const formatLegScore = (leg) => {
    if (!leg) return "-";
    return leg.hasScore ? `${leg.homeGoals}-${leg.awayGoals}` : "Pend.";
  };
  const formatGlobalScore = () => {
    if (result.homeGoals === null || result.awayGoals === null) return "-";
    return `${result.homeGoals}-${result.awayGoals}`;
  };

  return (
    <MatchCardShell $complete={result.isComplete} $withBreakdown={showLegBreakdown} $density={density}>
      {!row?.isFinal && (
        <MatchNumberBadge>#{row?.cupNumber || (Number.isFinite(row?.pairIndex) ? row.pairIndex + 1 : 1)}</MatchNumberBadge>
      )}
      <TeamRows>
        <TeamRow
          team={pair.home}
          goals={result.homeGoals}
          isWinner={result.winnerId && result.winnerId === homeId}
        />
        <TeamRow
          team={pair.away}
          goals={result.awayGoals}
          isWinner={result.winnerId && result.winnerId === awayId}
        />
      </TeamRows>
      {showLegBreakdown && (
        <LegBreakdown $density={density}>
          <span>
            <small>Ida</small>
            <strong>{formatLegScore(firstLeg)}</strong>
          </span>
          <span>
            <small>Vuelta</small>
            <strong>{formatLegScore(secondLeg)}</strong>
          </span>
          <span>
            <small>Global</small>
            <strong>{formatGlobalScore()}</strong>
          </span>
        </LegBreakdown>
      )}
    </MatchCardShell>
  );
};

const FutureMatchCard = ({ row, index, density = "default" }) => {
  const { pair } = row;
  const homeProjection = row?.projectedTeams?.home;
  const awayProjection = row?.projectedTeams?.away;
  const homeName = pair?.home?.name || homeProjection?.name || row?.slotLabels?.home || `Ganador cupo ${index * 2 + 1}`;
  const awayName = pair?.away?.name || awayProjection?.name || row?.slotLabels?.away || `Ganador cupo ${index * 2 + 2}`;

  return (
    <FutureMatchShell $density={density}>
      {!row?.isFinal && <MatchNumberBadge>#{row?.cupNumber || index + 1}</MatchNumberBadge>}
      <span className={homeProjection && !pair?.home ? "projected" : ""}>{homeName}</span>
      <span className={awayProjection && !pair?.away ? "projected" : ""}>{awayName}</span>
    </FutureMatchShell>
  );
};

const getRankLabel = (rank, total) => {
  if (rank <= 1) return "Mejor";
  if (rank >= total) return "Peor";
  if (rank === 2) return "2do mejor";
  if (rank === 3) return "3er mejor";
  return `${rank}o mejor`;
};

const getFixedWinnerLabel = (previousStage, sourceIndex) => {
  const previousShortLabel = previousStage?.shortLabel || "fase";
  const sourceNumber = previousStage?.matches?.[sourceIndex]?.cupNumber || sourceIndex + 1;
  return `Ganador de ${previousShortLabel} ${sourceNumber}`;
};

const getReseedWinnerLabel = (previousStage, rank) => {
  const previousShortLabel = previousStage?.shortLabel || "fase";
  const total = Math.max(1, previousStage?.matches?.length || 1);
  return `${getRankLabel(rank, total)} ganador de ${previousShortLabel}`;
};

const getFutureSlotLabels = ({ stages, stageIndex, matchIndex }) => {
  const previousStage = stages[stageIndex - 1];
  if (!previousStage) return null;

  if (previousStage.reseed) {
    const total = Math.max(1, previousStage.matches.length);
    const homeRank = matchIndex + 1;
    const awayRank = total - matchIndex;
    return {
      home: getReseedWinnerLabel(previousStage, homeRank),
      away: getReseedWinnerLabel(previousStage, awayRank),
    };
  }

  const sourceStart = matchIndex * 2;
  return {
    home: getFixedWinnerLabel(previousStage, sourceStart),
    away: getFixedWinnerLabel(previousStage, sourceStart + 1),
  };
};

const getWinnerTeamFromRow = (row) => {
  const winnerId = row?.result?.winnerId;
  if (!winnerId) return null;
  const homeId = getTeamId(row?.pair?.home);
  const awayId = getTeamId(row?.pair?.away);
  if (winnerId === homeId) return row.pair.home;
  if (winnerId === awayId) return row.pair.away;
  return null;
};

const getFutureProjectedTeams = ({ stages, stageIndex, matchIndex }) => {
  const previousStage = stages[stageIndex - 1];
  if (!previousStage) return null;

  const winners = previousStage.matches.map((match) => getWinnerTeamFromRow(match));

  if (previousStage.reseed) {
    const sortedWinners = winners
      .filter(Boolean)
      .sort((a, b) => (a.seed || 999) - (b.seed || 999));
    const homeRank = matchIndex;
    const awayRank = sortedWinners.length - 1 - matchIndex;

    return {
      home: sortedWinners[homeRank] || null,
      away: awayRank >= 0 && awayRank !== homeRank ? sortedWinners[awayRank] : null,
    };
  }

  const sourceStart = matchIndex * 2;
  return {
    home: winners[sourceStart] || null,
    away: winners[sourceStart + 1] || null,
  };
};

const buildBracketGeometry = (stages = []) => {
  const baseCount = Math.max(1, stages[0]?.matches?.length || 1);
  const width = stages.length * BRACKET_CARD_WIDTH + Math.max(0, stages.length - 1) * BRACKET_COLUMN_GAP;
  const height = BRACKET_HEADER_HEIGHT + baseCount * BRACKET_ROW_HEIGHT;

  const getMatchRect = (stageIndex, matchIndex) => {
    const stage = stages[stageIndex];
    const matchCount = Math.max(1, stage?.matches?.length || 1);
    const rowSpan = baseCount / matchCount;
    const centerY = BRACKET_HEADER_HEIGHT + ((matchIndex * rowSpan) + (rowSpan / 2)) * BRACKET_ROW_HEIGHT;

    return {
      x: stageIndex * (BRACKET_CARD_WIDTH + BRACKET_COLUMN_GAP),
      y: centerY - (BRACKET_CARD_HEIGHT / 2),
      centerY,
    };
  };

  const segments = [];
  const reseedBridgeSegments = [];

  stages.slice(0, -1).forEach((stage, stageIndex) => {
    const nextStage = stages[stageIndex + 1];
    const sourceCount = Math.max(1, stage.matches.length);
    const targetCount = Math.max(1, nextStage.matches.length);
    const mergeRatio = Math.max(1, sourceCount / targetCount);
    const reseedGroups = [];

    nextStage.matches.forEach((_, targetIndex) => {
      const targetRect = getMatchRect(stageIndex + 1, targetIndex);
      const sourceStart = Math.floor(targetIndex * mergeRatio);
      const sourceEnd = Math.min(sourceCount - 1, Math.max(sourceStart, Math.floor((targetIndex + 1) * mergeRatio) - 1));
      const sourceRects = [];

      for (let sourceIndex = sourceStart; sourceIndex <= sourceEnd; sourceIndex += 1) {
        sourceRects.push(getMatchRect(stageIndex, sourceIndex));
      }

      const firstSource = sourceRects[0];
      if (!firstSource) return;

      const sourceRightX = firstSource.x + BRACKET_CARD_WIDTH;
      const targetLeftX = targetRect.x;
      const mergeX = sourceRightX + (targetLeftX - sourceRightX) / 2;
      const sourceCenters = sourceRects.map((rect) => rect.centerY);
      const minSourceY = Math.min(...sourceCenters);
      const maxSourceY = Math.max(...sourceCenters);

      reseedGroups.push({ mergeX, minSourceY, maxSourceY });

      sourceRects.forEach((rect) => {
        segments.push({
          x1: sourceRightX,
          y1: rect.centerY,
          x2: mergeX,
          y2: rect.centerY,
        });
      });

      if (sourceRects.length > 1) {
        segments.push({
          x1: mergeX,
          y1: minSourceY,
          x2: mergeX,
          y2: maxSourceY,
        });
      }

      segments.push({
        x1: mergeX,
        y1: targetRect.centerY,
        x2: targetLeftX,
        y2: targetRect.centerY,
      });
    });

    if (stage.reseed && reseedGroups.length > 1) {
      reseedGroups
        .sort((a, b) => a.minSourceY - b.minSourceY)
        .slice(0, -1)
        .forEach((group, index) => {
          const nextGroup = reseedGroups[index + 1];
          reseedBridgeSegments.push({
            x1: group.mergeX,
            y1: group.maxSourceY,
            x2: nextGroup.mergeX,
            y2: nextGroup.minSourceY,
          });
        });
    }
  });

  return { baseCount, width, height, getMatchRect, segments, reseedBridgeSegments };
};

const splitStageForPrint = (stage = {}) => {
  const matches = stage?.matches || [];
  const splitIndex = Math.ceil(matches.length / 2);
  return {
    top: matches.slice(0, splitIndex),
    bottom: matches.slice(splitIndex),
    splitIndex,
  };
};

const getPrintPhaseShortLabel = (stage = {}) =>
  stage.key === "semifinals" ? "SM" : stage.shortLabel;

const buildPrintBracketGeometry = (stages = []) => {
  const stageCount = Math.max(1, stages.length);
  const columnGap = PRINT_STAGE_GAP;
  const cardWidth = clamp(
    Math.floor((PRINT_BRACKET_WIDTH - ((stageCount - 1) * columnGap)) / stageCount),
    104,
    182
  );
  const canvasWidth = (stageCount * cardWidth) + ((stageCount - 1) * columnGap);
  const offsetX = Math.max(0, (PRINT_BRACKET_WIDTH - canvasWidth) / 2);
  const columns = stages.map((stage, stageIndex) => ({
    stage,
    x: offsetX + (stageIndex * (cardWidth + columnGap)),
  }));

  const finalStageIndex = Math.max(0, stages.length - 1);
  const branchStages = stages.slice(0, finalStageIndex);
  const firstSplit = splitStageForPrint(stages[0]);
  const maxBranchMatchCount = Math.max(
    1,
    firstSplit.top.length || 1,
    firstSplit.bottom.length || 1
  );
  const finalHeight = clamp(Math.round(88 - (stageCount * 4)), 58, 78);
  const branchHeight = Math.floor(
    (PRINT_BRACKET_HEIGHT - PRINT_HEADER_HEIGHT - finalHeight - (PRINT_CENTER_GAP * 2)) / 2
  );
  const matchGap = maxBranchMatchCount >= 8 ? 4 : maxBranchMatchCount >= 4 ? 7 : 11;
  const cardHeight = clamp(
    Math.floor((branchHeight - ((maxBranchMatchCount - 1) * matchGap)) / maxBranchMatchCount),
    maxBranchMatchCount >= 8 ? 41 : 48,
    maxBranchMatchCount <= 2 ? 86 : 72
  );
  const topStart = PRINT_HEADER_HEIGHT;
  const finalY = topStart + branchHeight + PRINT_CENTER_GAP;
  const bottomStart = finalY + finalHeight + PRINT_CENTER_GAP;

  const getBranchRects = (stageIndex, side) => {
    const stage = stages[stageIndex];
    const split = splitStageForPrint(stage);
    const matches = split[side] || [];
    const branchStart = side === "top" ? topStart : bottomStart;
    const count = Math.max(1, matches.length);
    const column = columns[stageIndex];

    return matches.map((row, index) => {
      const centerY = branchStart + ((index + 0.5) * (branchHeight / count));
      return {
        row,
        localIndex: index,
        matchIndex: side === "bottom" ? index + split.splitIndex : index,
        stageIndex,
        side,
        x: column.x,
        y: centerY - (cardHeight / 2),
        centerY,
        width: cardWidth,
        height: cardHeight,
      };
    });
  };

  const topRectsByStage = branchStages.map((_, stageIndex) => getBranchRects(stageIndex, "top"));
  const bottomRectsByStage = branchStages.map((_, stageIndex) => getBranchRects(stageIndex, "bottom"));
  const finalRect = {
    row: stages[finalStageIndex]?.matches?.[0],
    stageIndex: finalStageIndex,
    x: columns[finalStageIndex]?.x || offsetX,
    y: finalY,
    centerY: finalY + (finalHeight / 2),
    width: cardWidth,
    height: finalHeight,
  };

  const makeConnector = (sourceRect, targetRect) => {
    const x1 = sourceRect.x + sourceRect.width;
    const x2 = targetRect.x;
    const mergeX = x1 + ((x2 - x1) / 2);
    return [
      { x1, y1: sourceRect.centerY, x2: mergeX, y2: sourceRect.centerY },
      { x1: mergeX, y1: sourceRect.centerY, x2: mergeX, y2: targetRect.centerY },
      { x1: mergeX, y1: targetRect.centerY, x2, y2: targetRect.centerY },
    ];
  };

  const connectBranch = (rectStages) => {
    const lines = [];

    rectStages.slice(0, -1).forEach((sourceRects, stageIndex) => {
      const targetRects = rectStages[stageIndex + 1] || [];
      const sourceCount = Math.max(1, sourceRects.length);
      const targetCount = Math.max(1, targetRects.length);
      const mergeRatio = Math.max(1, sourceCount / targetCount);

      targetRects.forEach((targetRect, targetIndex) => {
        const sourceStart = Math.floor(targetIndex * mergeRatio);
        const sourceEnd = Math.min(
          sourceCount - 1,
          Math.max(sourceStart, Math.floor((targetIndex + 1) * mergeRatio) - 1)
        );

        for (let sourceIndex = sourceStart; sourceIndex <= sourceEnd; sourceIndex += 1) {
          const sourceRect = sourceRects[sourceIndex];
          if (sourceRect) lines.push(...makeConnector(sourceRect, targetRect));
        }
      });
    });

    return lines;
  };

  const topLines = connectBranch(topRectsByStage);
  const bottomLines = connectBranch(bottomRectsByStage);
  const lastTopRects = topRectsByStage[topRectsByStage.length - 1] || [];
  const lastBottomRects = bottomRectsByStage[bottomRectsByStage.length - 1] || [];
  const finalLines = [
    ...lastTopRects.flatMap((rect) => makeConnector(rect, finalRect)),
    ...lastBottomRects.flatMap((rect) => makeConnector(rect, finalRect)),
  ];

  return {
    width: PRINT_BRACKET_WIDTH,
    height: PRINT_BRACKET_HEIGHT,
    cardWidth,
    cardHeight,
    columns,
    topRects: topRectsByStage.flat(),
    bottomRects: bottomRectsByStage.flat(),
    finalRect,
    lines: [...topLines, ...bottomLines, ...finalLines],
  };
};

export function PlayoffBracketView({
  torneo,
  partidos = [],
  jornadas = [],
  projectedStandings = [],
  isLoading = false,
  layoutMode = "default",
}) {
  const stages = useMemo(
    () => buildBracketStages({ torneo, partidos, jornadas, projectedStandings }),
    [torneo, partidos, jornadas, projectedStandings]
  );
  const geometry = useMemo(() => buildBracketGeometry(stages), [stages]);
  const printGeometry = useMemo(() => buildPrintBracketGeometry(stages), [stages]);

  if (isLoading) {
    return (
      <BracketShell>
        <EmptyBracket>
          <RiGitBranchLine />
          <strong>Cargando cuadro final...</strong>
        </EmptyBracket>
      </BracketShell>
    );
  }

  if (stages.length === 0) {
    return (
      <BracketShell>
        <EmptyBracket>
          <RiTrophyLine />
          <strong>Cuadro final no disponible</strong>
          <span>La fase final se mostrara cuando exista liguilla o repechaje configurado.</span>
        </EmptyBracket>
      </BracketShell>
    );
  }

  if (layoutMode === "print-vertical") {
    const renderPrintCard = (rect) => {
      const stage = stages[rect.stageIndex];
      const usesTeamCard = stage?.isCreated || stage?.isProjected;
      const MatchComponent = usesTeamCard ? MatchCard : FutureMatchCard;
      const isFinal = stage?.key === "final";
      const displayRow = usesTeamCard
        ? { ...rect.row, isFinal }
        : {
            ...rect.row,
            isFinal,
            slotLabels: getFutureSlotLabels({
              stages,
              stageIndex: rect.stageIndex,
              matchIndex: rect.matchIndex || 0,
            }),
            projectedTeams: getFutureProjectedTeams({
              stages,
              stageIndex: rect.stageIndex,
              matchIndex: rect.matchIndex || 0,
            }),
          };

      return (
        <AbsoluteMatchNode
          key={`print-${rect.side || "final"}-${stage?.key}-${rect.row?.pair?.id || rect.localIndex || 0}`}
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        >
          <MatchComponent row={displayRow} index={rect.matchIndex || 0} density="print" />
        </AbsoluteMatchNode>
      );
    };

    return (
      <BracketShell $print>
        <PrintBracketCanvas
          className="print-vertical-bracket"
          style={{
            width: printGeometry.width,
            height: printGeometry.height,
            "--print-card-height": `${printGeometry.cardHeight}px`,
          }}
        >
          <PrintPhaseHeader aria-label="Fases del cuadro">
            {printGeometry.columns.map(({ stage, x }) => (
              <div
                key={`print-header-${stage.key}`}
                style={{ left: x, width: printGeometry.cardWidth }}
              >
                <span>{getPrintPhaseShortLabel(stage)}</span>
                <strong>{stage.label}</strong>
              </div>
            ))}
          </PrintPhaseHeader>

          <BracketLines viewBox={`0 0 ${printGeometry.width} ${printGeometry.height}`} aria-hidden="true">
            {printGeometry.lines.map((segment, index) => (
              <line
                key={`print-line-${index}`}
                className="line-base"
                pathLength="1"
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
                style={{ "--line-index": index }}
              />
            ))}
          </BracketLines>

          {printGeometry.topRects.map(renderPrintCard)}
          {printGeometry.finalRect?.row && renderPrintCard({ ...printGeometry.finalRect, side: "final", localIndex: 0 })}
          {printGeometry.bottomRects.map(renderPrintCard)}
        </PrintBracketCanvas>
      </BracketShell>
    );
  }

  return (
    <BracketShell>
      <BracketScroller>
        <DesktopBracketCanvas style={{ width: geometry.width, height: geometry.height }}>
          <BracketLines viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
            {geometry.segments.map((segment, index) => (
              <React.Fragment key={`segment-${index}`}>
                <line
                  className="line-base"
                  pathLength="1"
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  style={{ "--line-index": index }}
                />
                <line
                  className="line-energy"
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  style={{ "--line-index": index }}
                />
              </React.Fragment>
            ))}
            {geometry.reseedBridgeSegments.map((segment, index) => (
              <React.Fragment key={`reseed-bridge-${index}`}>
                <line
                  className="line-base"
                  pathLength="1"
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  style={{ "--line-index": geometry.segments.length + index }}
                />
                <line
                  className="line-energy"
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  style={{ "--line-index": geometry.segments.length + index }}
                />
              </React.Fragment>
            ))}
          </BracketLines>

          {stages.map((stage, stageIndex) => {
            const x = stageIndex * (BRACKET_CARD_WIDTH + BRACKET_COLUMN_GAP);

            return (
              <AbsoluteStageHeader
                key={`header-${stage.key}`}
                style={{ left: x, width: BRACKET_CARD_WIDTH }}
              >
                <span>{stage.shortLabel}</span>
                <strong>{stage.label}</strong>
              </AbsoluteStageHeader>
            );
          })}

          {stages.map((stage, stageIndex) => (
            stage.matches.map((row, index) => {
              const rect = geometry.getMatchRect(stageIndex, index);
              const usesTeamCard = stage.isCreated || stage.isProjected;
              const MatchComponent = usesTeamCard ? MatchCard : FutureMatchCard;
              const isFinal = stage.key === "final";
              const displayRow = usesTeamCard
                ? { ...row, isFinal }
                : {
                    ...row,
                    isFinal,
                    slotLabels: getFutureSlotLabels({ stages, stageIndex, matchIndex: index }),
                    projectedTeams: getFutureProjectedTeams({ stages, stageIndex, matchIndex: index }),
                  };

              return (
                <AbsoluteMatchNode
                  key={`desktop-${stage.key}-${row.pair.id || row.pairIndex}`}
                  style={{
                    left: rect.x,
                    top: rect.y,
                    width: BRACKET_CARD_WIDTH,
                    height: BRACKET_CARD_HEIGHT,
                  }}
                >
                  <MatchComponent row={displayRow} index={index} />
                </AbsoluteMatchNode>
              );
            })
          ))}
        </DesktopBracketCanvas>

        <MobileBracketCanvas>
          <ConnectedBracketGrid $columns={stages.length}>
          {stages.map((stage, stageIndex) => (
            <ConnectedStageColumn key={stage.key}>
              <FutureStageHeader>
                <span>{stage.shortLabel}</span>
                <strong>{stage.label}</strong>
              </FutureStageHeader>
              <ConnectedMatchList>
                {stage.matches.map((row, index) => {
                  const matchKey = row.pair.id || `${stage.key}-${row.pairIndex}`;
                  const usesTeamCard = stage.isCreated || stage.isProjected;
                  const MatchComponent = usesTeamCard ? MatchCard : FutureMatchCard;
                  const isFinal = stage.key === "final";
                  const displayRow = usesTeamCard
                    ? { ...row, isFinal }
                    : {
                        ...row,
                        isFinal,
                        slotLabels: getFutureSlotLabels({ stages, stageIndex, matchIndex: index }),
                        projectedTeams: getFutureProjectedTeams({ stages, stageIndex, matchIndex: index }),
                      };

                  return (
                    <ConnectedMatchSlot
                      key={matchKey}
                      $hasNext={stageIndex < stages.length - 1}
                    >
                      <MatchComponent row={displayRow} index={index} />
                      {stageIndex < stages.length - 1 && <ConnectedConnector />}
                    </ConnectedMatchSlot>
                  );
                })}
              </ConnectedMatchList>
            </ConnectedStageColumn>
          ))}
          </ConnectedBracketGrid>
        </MobileBracketCanvas>
      </BracketScroller>
    </BracketShell>
  );
}

const BracketShell = styled.section`
  --bracket-primary: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
  --bracket-primary-soft: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
  --bracket-surface: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards};
  --bracket-item: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bgtotal};
  --bracket-border: ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
  --bracket-muted: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle};
  width: 100%;
  max-width: ${({ $print }) => ($print ? "none" : "1180px")};
  margin: ${({ $print }) => ($print ? "0" : "0 auto 22px")};
  border: ${({ $print }) => ($print ? "0" : "1px solid var(--bracket-border)")};
  border-radius: ${({ $print }) => ($print ? "0" : "10px")};
  background: ${({ $print }) => ($print
    ? "transparent"
    : `
      radial-gradient(circle at 50% 40%, var(--bracket-primary-soft), transparent 34%),
      var(--bracket-item)
    `)};
  overflow: hidden;

  @keyframes bracketLineDraw {
    from {
      opacity: 0;
      transform: scaleX(0);
    }
    to {
      opacity: 0.92;
      transform: scaleX(1);
    }
  }

  @keyframes bracketPulse {
    0%, 100% {
      opacity: 0.7;
      transform: translateY(-50%) scale(0.86);
    }
    50% {
      opacity: 1;
      transform: translateY(-50%) scale(1.14);
    }
  }

  @keyframes bracketMobileLineDraw {
    from {
      opacity: 0;
      transform: scaleY(0);
    }
    to {
      opacity: 0.82;
      transform: scaleY(1);
    }
  }

  @keyframes bracketMobileEnergy {
    0%, 100% {
      box-shadow: 0 0 0 rgba(28, 176, 246, 0);
    }
    50% {
      box-shadow: 0 0 12px var(--bracket-primary);
    }
  }

  @keyframes bracketSvgLineIn {
    from {
      stroke-dashoffset: 1;
      opacity: 0;
    }
    to {
      stroke-dashoffset: 0;
      opacity: 0.88;
    }
  }

  @keyframes bracketSvgEnergyFade {
    from {
      opacity: 0;
    }
    to {
      opacity: 0.72;
    }
  }

  @keyframes bracketSvgEnergyFlow {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: -28;
    }
  }

  @keyframes bracketConnectorGlow {
    0%, 100% {
      opacity: 0.24;
    }
    50% {
      opacity: 0.56;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 1ms !important;
    }
  }
`;

const BracketScroller = styled.div`
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 22px;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar { height: 5px; }
  &::-webkit-scrollbar-thumb {
    background: var(--bracket-border);
    border-radius: 999px;
  }

  @media (max-width: 640px) {
    overflow: visible;
    padding: 14px;
  }
`;

const DesktopBracketCanvas = styled.div`
  position: relative;
  flex: 0 0 auto;
  margin: 0 auto;

  @media (max-width: 640px) {
    display: none;
  }
`;

const MobileBracketCanvas = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: block;
  }
`;

const BracketLines = styled.svg`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;

  line {
    fill: none;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }

  .line-base {
    stroke: var(--bracket-primary);
    stroke-width: 3;
    opacity: 0.88;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: bracketSvgLineIn 760ms cubic-bezier(0.2, 0.84, 0.24, 1) forwards;
    animation-delay: calc(var(--line-index) * 46ms);
  }

  .line-energy {
    stroke: var(--bracket-primary);
    stroke-width: 5;
    opacity: 0;
    stroke-dasharray: 10 18;
    stroke-dashoffset: 0;
    filter: drop-shadow(0 0 7px var(--bracket-primary));
    animation:
      bracketSvgEnergyFade 420ms ease forwards,
      bracketSvgEnergyFlow 1.35s linear infinite;
    animation-delay: calc(520ms + (var(--line-index) * 46ms)), calc(940ms + (var(--line-index) * 46ms));
  }
`;

const AbsoluteStageHeader = styled.div`
  position: absolute;
  top: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 6px;

  span {
    min-height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--bracket-primary-soft);
    color: var(--bracket-primary);
    font-size: 0.64rem;
    font-weight: 950;
  }

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${({ theme }) => theme.text};
    font-size: 0.72rem;
    font-weight: 950;
  }
`;

const AbsoluteMatchNode = styled.div`
  position: absolute;
  z-index: 2;

  > article,
  > div {
    height: 100%;
  }
`;

const PrintBracketCanvas = styled.div`
  position: relative;
  flex: 0 0 auto;
  margin: 0 auto;
  overflow: visible;

  ${BracketLines} {
    z-index: 1;

    .line-base {
      stroke-width: 2;
      opacity: 0.58;
      animation: none;
    }
  }

  ${AbsoluteMatchNode} {
    z-index: 2;
  }
`;

const PrintPhaseHeader = styled.div`
  position: absolute;
  inset: 0 0 auto;
  height: ${PRINT_HEADER_HEIGHT}px;
  z-index: 3;

  > div {
    position: absolute;
    top: 0;
    display: grid;
    grid-template-columns: 31px minmax(0, 1fr);
    align-items: center;
    gap: 5px;
  }

  span {
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--bracket-primary-soft);
    color: var(--bracket-primary);
    font-size: 0.58rem;
    font-weight: 950;
    line-height: 1;
  }

  strong {
    min-width: 0;
    color: #0f172a;
    font-size: 0.56rem;
    font-weight: 950;
    line-height: 1.08;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }
`;

const ConnectedBracketGrid = styled.div`
  min-width: ${({ $columns }) => Math.max(760, $columns * 228)}px;
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, minmax(190px, 1fr));
  align-items: stretch;
  gap: 34px;

  @media (max-width: 1024px) {
    min-width: ${({ $columns }) => Math.max(700, $columns * 210)}px;
    gap: 28px;
  }

  @media (max-width: 640px) {
    min-width: 0;
    grid-template-columns: 1fr;
    gap: 18px;
  }
`;

const ConnectedStageColumn = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ConnectedMatchList = styled.div`
  flex: 1;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 18px;

  @media (max-width: 640px) {
    min-height: auto;
    gap: 12px;
  }
`;

const ConnectedMatchSlot = styled.div`
  position: relative;
  min-width: 0;

  > article,
  > div:first-child {
    position: relative;
    z-index: 2;
  }

  @media (max-width: 640px) {
    ${({ $hasNext }) => $hasNext && `
      padding-bottom: 18px;

      &::after {
        content: "";
        position: absolute;
        left: 50%;
        bottom: 0;
        width: 3px;
        height: 16px;
        border-radius: 999px;
        background: linear-gradient(180deg, var(--bracket-primary), transparent);
        transform: translateX(-50%);
      }
    `}
  }
`;

const ConnectedConnector = styled.div`
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 100%;
  width: 34px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--bracket-primary),
    var(--bracket-primary)
  );
  opacity: 0.92;
  transform: translateY(-50%);
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    right: -5px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--bracket-primary);
    box-shadow: 0 0 12px var(--bracket-primary);
    transform: translateY(-50%);
  }

  @media (max-width: 1024px) {
    width: 28px;
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const BracketArena = styled.div`
  --arena-gap: 48px;
  --future-gap: 24px;
  min-width: 920px;
  display: grid;
  grid-template-columns:
    minmax(250px, 1fr)
    minmax(165px, 0.78fr)
    minmax(180px, 220px)
    minmax(165px, 0.78fr)
    minmax(250px, 1fr);
  align-items: center;
  gap: var(--arena-gap);
  min-height: 430px;

  @media (max-width: 1024px) {
    --arena-gap: 36px;
    --future-gap: 18px;
    min-width: 960px;
    grid-template-columns:
      minmax(220px, 1fr)
      minmax(150px, 0.78fr)
      minmax(165px, 190px)
      minmax(150px, 0.78fr)
      minmax(220px, 1fr);
  }

  @media (max-width: 640px) {
    --arena-gap: 16px;
    min-width: 0;
    grid-template-columns: 1fr;
    gap: var(--arena-gap);
    min-height: auto;
  }
`;

const BracketSide = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 24px;

  @media (max-width: 640px) {
    order: ${({ $side }) => ($side === "left" ? 1 : 3)};
    gap: 12px;
  }
`;

const FutureRounds = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => Math.max(1, $columns || 1)}, minmax(145px, 1fr));
  gap: var(--future-gap);
  align-items: center;

  @media (max-width: 640px) {
    order: ${({ $side }) => ($side === "left" ? 2 : 4)};
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const FutureStageLane = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 12px;
`;

const FutureStageHeader = styled.div`
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 6px;

  span {
    min-height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--bracket-primary-soft);
    color: var(--bracket-primary);
    font-size: 0.64rem;
    font-weight: 950;
  }

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${({ theme }) => theme.text};
    font-size: 0.7rem;
    font-weight: 950;
  }
`;

const FutureMatchList = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 16px;
`;

const FutureMatchSlot = styled.div`
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;

  > div {
    flex: 1;
  }
`;

const CenterLane = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;

  @media (max-width: 640px) {
    order: 3;
  }
`;

const MatchSlot = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;

  article {
    flex: 1;
  }

  @media (max-width: 640px) {
    &::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -12px;
      width: 3px;
      height: 10px;
      border-radius: 999px;
      background: linear-gradient(
        180deg,
        var(--bracket-primary),
        var(--bracket-primary),
        var(--bracket-primary)
      );
      opacity: 0.82;
      transform-origin: top center;
      animation: bracketMobileLineDraw 520ms ease-out both, bracketMobileEnergy 1.5s ease-in-out infinite 520ms;
    }

    &:last-child::after {
      display: none;
    }
  }
`;

const Connector = styled.div`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === "left" ? "left: 100%;" : "right: 100%;")}
  width: calc(var(--arena-gap) + 2px);
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--bracket-primary) 18%,
    var(--bracket-primary) 82%,
    transparent
  );
  opacity: 0.92;
  pointer-events: none;
  transform-origin: ${({ $side }) => ($side === "left" ? "left center" : "right center")};
  animation: bracketLineDraw 620ms cubic-bezier(0.2, 0.82, 0.25, 1) both;

  &::before {
    content: "";
    position: absolute;
    inset: -2px 0;
    border-radius: inherit;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.0) 26%,
      var(--bracket-primary) 48%,
      rgba(255, 255, 255, 0.0) 70%,
      transparent 100%
    );
    opacity: 0.24;
    animation: bracketConnectorGlow 1.8s ease-in-out infinite 620ms;
  }

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    ${({ $side }) => ($side === "left" ? "right: -4px;" : "left: -4px;")}
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--bracket-primary);
    box-shadow: 0 0 12px var(--bracket-primary);
    transform: translateY(-50%);
    animation: bracketPulse 1.6s ease-in-out infinite;
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const CenterStage = styled.div`
  align-self: stretch;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 14px;
  border-radius: 8px;
  border: 1px solid var(--bracket-border);
  background: var(--bracket-surface);
  text-align: center;

  .stage-label {
    color: var(--bracket-primary);
    font-size: 0.72rem;
    font-weight: 950;
  }

  .stage-icon {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--bracket-primary);
    color: ${({ theme }) => theme.body};
    font-size: 1.7rem;
  }

  strong {
    color: ${({ theme }) => theme.text};
    font-size: 0.98rem;
    line-height: 1.2;
  }

  @media (max-width: 640px) {
    order: 2;
    min-height: auto;
    padding: 16px;
  }
`;

const FutureMatchShell = styled.div`
  position: relative;
  display: grid;
  gap: 3px;
  height: 100%;
  align-content: center;
  padding: 6px;
  border-radius: 7px;
  border: 1px dashed var(--bracket-border);
  background: var(--bracket-surface);
  opacity: 0.9;

  span {
    min-height: ${({ $density }) => ($density === "print" ? "17px" : "21px")};
    display: flex;
    align-items: center;
    padding: ${({ $density }) => ($density === "print" ? "0 5px" : "0 7px")};
    border-radius: ${({ $density }) => ($density === "print" ? "5px" : "6px")};
    background: var(--bracket-item);
    color: var(--bracket-muted);
    font-size: ${({ $density }) => ($density === "print" ? "0.54rem" : "0.66rem")};
    font-weight: 850;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span.projected {
    color: color-mix(in srgb, ${({ theme }) => theme.text} 46%, transparent);
    border: 1px dashed color-mix(in srgb, var(--bracket-border) 78%, transparent);
    background: color-mix(in srgb, var(--bracket-item) 64%, transparent);
    font-style: italic;
  }
`;

const MatchNumberBadge = styled.small`
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 4;
  min-width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 999px;
  border: 1px solid var(--bracket-primary);
  background: var(--bracket-item);
  color: var(--bracket-primary);
  font-size: 0.62rem;
  font-weight: 950;
  line-height: 1;
  box-shadow: 0 0 10px color-mix(in srgb, var(--bracket-primary) 44%, transparent);
`;

const MatchCardShell = styled.article`
  position: relative;
  display: grid;
  grid-template-columns: ${({ $density, $withBreakdown }) => (
    $withBreakdown
      ? `minmax(0, 1fr) ${$density === "print" ? "42px" : "88px"}`
      : "minmax(0, 1fr) 0"
  )};
  gap: ${({ $density, $withBreakdown }) => ($withBreakdown ? ($density === "print" ? "4px" : "8px") : "0")};
  align-items: stretch;
  min-height: 100%;
  height: 100%;
  padding: ${({ $density }) => ($density === "print" ? "5px" : "8px")};
  border-radius: ${({ $density }) => ($density === "print" ? "6px" : "8px")};
  border: 1px solid ${({ $complete }) => ($complete ? "var(--bracket-primary)" : "var(--bracket-border)")};
  background: var(--bracket-surface);
  color: ${({ theme }) => theme.text};

  .team-row {
    min-height: ${({ $density }) => ($density === "print" ? "calc((var(--print-card-height, 56px) - 18px) / 2)" : "38px")};
    display: grid;
    grid-template-columns: ${({ $density }) => ($density === "print" ? "22px 0 minmax(0, 1fr) 20px" : "34px 30px minmax(0, 1fr) 28px")};
    align-items: center;
    gap: ${({ $density }) => ($density === "print" ? "3px" : "7px")};
    border-radius: ${({ $density }) => ($density === "print" ? "5px" : "7px")};
    padding: ${({ $density }) => ($density === "print" ? "2px 4px" : "4px 6px")};
  }

  .team-row.winner {
    background: var(--bracket-primary-soft);
  }

  .team-row.empty {
    opacity: 0.58;
  }

  .seed {
    color: var(--bracket-primary);
    font-size: ${({ $density }) => ($density === "print" ? "0.54rem" : "0.76rem")};
    font-weight: 950;
    text-align: center;
  }

  .logo {
    width: ${({ $density }) => ($density === "print" ? "0" : "28px")};
    height: ${({ $density }) => ($density === "print" ? "0" : "28px")};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  .empty-logo {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px dashed var(--bracket-border);
  }

  .name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${({ $density }) => ($density === "print" ? "0.56rem" : "0.78rem")};
    font-weight: 850;
  }

  .team-row strong {
    text-align: center;
    color: ${({ theme }) => theme.text};
    font-size: ${({ $density }) => ($density === "print" ? "0.62rem" : "0.9rem")};
    font-weight: 950;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: ${({ $withBreakdown }) => ($withBreakdown ? "8px" : "0")};
  }
`;

const TeamRows = styled.div`
  min-width: 0;
  display: grid;
  gap: 6px;
`;

const LegBreakdown = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ $density }) => ($density === "print" ? "2px" : "4px")};

  span {
    min-width: 0;
    display: grid;
    place-items: center;
    gap: 1px;
    padding: ${({ $density }) => ($density === "print" ? "2px" : "4px")};
    border-radius: ${({ $density }) => ($density === "print" ? "5px" : "7px")};
    background: var(--bracket-item);
    border: 1px solid var(--bracket-border);
  }

  small {
    color: var(--bracket-muted);
    font-size: ${({ $density }) => ($density === "print" ? "0.44rem" : "0.54rem")};
    font-weight: 900;
    line-height: 1;
  }

  strong {
    color: ${({ theme }) => theme.text};
    font-size: ${({ $density }) => ($density === "print" ? "0.52rem" : "0.7rem")};
    font-weight: 950;
    line-height: 1.1;
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const EmptyBracket = styled.div`
  min-height: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  color: var(--bracket-muted);

  svg {
    color: var(--bracket-primary);
    font-size: 2.2rem;
  }

  strong {
    color: ${({ theme }) => theme.text};
    font-size: 1rem;
  }

  span {
    max-width: 360px;
    font-size: 0.82rem;
    line-height: 1.4;
  }
`;
