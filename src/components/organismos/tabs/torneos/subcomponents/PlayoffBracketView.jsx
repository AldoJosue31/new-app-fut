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
      winnerId: pair?.home ? getTeamId(pair.home) : null,
      isComplete: Boolean(pair?.bye),
    };
  }

  const homeId = getTeamId(pair.home);
  const awayId = getTeamId(pair.away);
  const legs = matches.map((match) => {
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

const buildBracketStages = ({ torneo, partidos, jornadas }) => {
  const config = parseConfig(torneo);
  const playoffState = config.playoffState || {};
  const savedStages = Array.isArray(playoffState.stages) ? playoffState.stages : [];
  const settings = getPlayoffSettings(config);

  if (!config.zonaLiguilla && savedStages.length === 0) return [];

  const savedStagesByPhase = new Map(savedStages.map((stage) => [stage.phaseKey, stage]));
  const directCount = Number.parseInt(config.clasificados, 10) || 0;
  const repechajeCount = Number.parseInt(config.repechajeTeams, 10) || 0;
  const savedMainIndexes = savedStages
    .map((stage) => MAIN_PHASE_KEYS.indexOf(stage?.phaseKey))
    .filter((index) => index >= 0);
  const firstSavedMainIndex = savedMainIndexes.length > 0 ? Math.min(...savedMainIndexes) : -1;
  const firstEstimatedMainKey = getPhaseByParticipants(
    directCount + (repechajeCount > 0 ? Math.floor(repechajeCount / 2) : 0) || directCount || 2
  ).key;
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
    const previousCount = phaseIndex > 0 ? nextPlaceholderCount : 0;
    const pairs = savedStage?.pairs?.length
      ? savedStage.pairs
      : buildPlaceholderPairs(previousCount || getInitialPairCount(phaseKey, repechajeCount));
    const stageMatches = getStageMatches({ phaseKey, matches: partidos, jornadas });

    nextPlaceholderCount = Math.max(1, Math.ceil(pairs.length / 2));

    return {
      key: phaseKey,
      label: savedStage?.phaseLabel || getPhaseLabelByKey(phaseKey),
      shortLabel: getPhaseShortLabel(phaseKey),
      isCreated: Boolean(savedStage),
      reseed: settings.reseed,
      matches: pairs.map((pair, pairIndex) => {
        const pairMatches = getPairMatches(pair, stageMatches);
        return {
          pair,
          pairIndex,
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

const MatchCard = ({ row }) => {
  const { pair, result } = row;
  const homeId = getTeamId(pair.home);
  const awayId = getTeamId(pair.away);

  return (
    <MatchCardShell $complete={result.isComplete}>
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
      {result.legs.length > 0 && (
        <LegScores>
          {result.legs.map((leg, index) => (
            <span key={leg.id || index}>
              {result.legs.length > 1 ? `${index + 1}: ` : ""}
              {leg.hasScore ? `${leg.homeGoals}-${leg.awayGoals}` : "Pendiente"}
            </span>
          ))}
        </LegScores>
      )}
    </MatchCardShell>
  );
};

const FutureMatchCard = ({ row, index }) => {
  const { pair } = row;
  const homeName = pair?.home?.name || `Ganador ${index * 2 + 1}`;
  const awayName = pair?.away?.name || `Ganador ${index * 2 + 2}`;

  return (
    <FutureMatchShell>
      <span>{homeName}</span>
      <span>{awayName}</span>
    </FutureMatchShell>
  );
};

export function PlayoffBracketView({ torneo, partidos = [], jornadas = [], isLoading = false }) {
  const stages = useMemo(
    () => buildBracketStages({ torneo, partidos, jornadas }),
    [torneo, partidos, jornadas]
  );
  const currentPhaseKey = parseConfig(torneo).playoffState?.currentPhaseKey || null;

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

  return (
    <BracketShell>
      <BracketScroller>
        <BracketHeaderRail>
          <span className="stage-label">BRACKET</span>
          <PhaseRail>
            {stages.map((stage) => (
              <span
                key={stage.key}
                className={[
                  stage.key === currentPhaseKey ? "current" : "",
                  stage.isCreated ? "created" : "",
                ].filter(Boolean).join(" ")}
                title={stage.label}
              >
                {stage.shortLabel}
              </span>
            ))}
          </PhaseRail>
        </BracketHeaderRail>

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
                  const MatchComponent = stage.isCreated ? MatchCard : FutureMatchCard;

                  return (
                    <ConnectedMatchSlot
                      key={matchKey}
                      $hasNext={stageIndex < stages.length - 1}
                    >
                      <MatchComponent row={row} index={index} />
                      {stageIndex < stages.length - 1 && <ConnectedConnector />}
                    </ConnectedMatchSlot>
                  );
                })}
              </ConnectedMatchList>
            </ConnectedStageColumn>
          ))}
        </ConnectedBracketGrid>
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
  max-width: 1180px;
  margin: 0 auto 22px;
  border: 1px solid var(--bracket-border);
  border-radius: 10px;
  background:
    radial-gradient(circle at 50% 40%, var(--bracket-primary-soft), transparent 34%),
    var(--bracket-item);
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

  @keyframes bracketEnergyFlow {
    from {
      background-position: 120% 0;
    }
    to {
      background-position: -80% 0;
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

const BracketHeaderRail = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin: 0 0 18px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--bracket-border);
  background: var(--bracket-surface);

  .stage-label {
    color: var(--bracket-primary);
    font-size: 0.72rem;
    font-weight: 950;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 8px;
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
    ${({ theme }) => theme.tournamentDashboard?.jornada?.accentStrong || theme.primary}
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
        ${({ theme }) => theme.tournamentDashboard?.jornada?.accentStrong || theme.primary},
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
      ${({ theme }) => theme.tournamentDashboard?.jornada?.accentStrong || theme.primary} 48%,
      rgba(255, 255, 255, 0.0) 70%,
      transparent 100%
    );
    opacity: 0.95;
    background-size: 180% 100%;
    animation: bracketEnergyFlow 1.75s linear infinite;
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

const PhaseRail = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;

  span {
    min-width: 34px;
    min-height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    border-radius: 999px;
    border: 1px solid var(--bracket-border);
    color: var(--bracket-muted);
    background: var(--bracket-item);
    font-size: 0.68rem;
    font-weight: 950;
  }

  span.created {
    border-color: var(--bracket-primary);
    color: var(--bracket-primary);
  }

  span.current {
    background: var(--bracket-primary);
    color: ${({ theme }) => theme.body};
  }
`;

const UpcomingStages = styled.div`
  width: 100%;
  display: grid;
  gap: 9px;
  margin-top: 6px;
`;

const UpcomingStage = styled.div`
  display: grid;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--bracket-border);
  background: var(--bracket-item);

  .upcoming-title {
    min-width: 0;
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    text-align: left;
  }

  .upcoming-title span {
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--bracket-primary-soft);
    color: var(--bracket-primary);
    font-size: 0.62rem;
    font-weight: 950;
  }

  .upcoming-title strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${({ theme }) => theme.text};
    font-size: 0.68rem;
    font-weight: 950;
  }

  .upcoming-matches {
    display: grid;
    gap: 5px;
  }
`;

const FutureMatchShell = styled.div`
  display: grid;
  gap: 3px;
  padding: 6px;
  border-radius: 7px;
  border: 1px dashed var(--bracket-border);
  background: var(--bracket-surface);
  opacity: 0.9;

  span {
    min-height: 21px;
    display: flex;
    align-items: center;
    padding: 0 7px;
    border-radius: 6px;
    background: var(--bracket-item);
    color: var(--bracket-muted);
    font-size: 0.66rem;
    font-weight: 850;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const MatchCardShell = styled.article`
  position: relative;
  display: grid;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid ${({ $complete }) => ($complete ? "var(--bracket-primary)" : "var(--bracket-border)")};
  background: var(--bracket-surface);
  color: ${({ theme }) => theme.text};

  .team-row {
    min-height: 38px;
    display: grid;
    grid-template-columns: 34px 30px minmax(0, 1fr) 28px;
    align-items: center;
    gap: 7px;
    border-radius: 7px;
    padding: 4px 6px;
  }

  .team-row.winner {
    background: var(--bracket-primary-soft);
  }

  .team-row.empty {
    opacity: 0.58;
  }

  .seed {
    color: var(--bracket-primary);
    font-size: 0.76rem;
    font-weight: 950;
    text-align: center;
  }

  .logo {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
    font-size: 0.78rem;
    font-weight: 850;
  }

  .team-row strong {
    text-align: center;
    color: ${({ theme }) => theme.text};
    font-size: 0.9rem;
    font-weight: 950;
  }
`;

const LegScores = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0 6px 2px;

  span {
    min-height: 20px;
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: 999px;
    background: var(--bracket-item);
    color: var(--bracket-muted);
    font-size: 0.64rem;
    font-weight: 850;
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
