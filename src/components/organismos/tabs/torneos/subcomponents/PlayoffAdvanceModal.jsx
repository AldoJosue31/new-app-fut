import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { RiArrowRightLine, RiGitBranchLine, RiRefreshLine } from "react-icons/ri";
import { Modal } from "../../../../../index";
import { DynamicTeamLogo } from "../../../equipos/DynamicTeamLogo";
import {
  PLAYOFF_PHASES,
  getPlayoffSettings,
  pairHighLow,
} from "../../../../../utils/playoffUtils";

const phaseLegFieldMap = {
  round32: "playoffLegsRound32",
  round16: "playoffLegsRound16",
  quarterfinals: "playoffLegsQuarterfinals",
  semifinals: "playoffLegsSemifinals",
  final: "playoffLegsFinal",
};

const splitPairsForBracket = (pairs = [], alternateBySeed = false) => {
  const indexedPairs = pairs.map((pair, pairIndex) => ({ pair, pairIndex }));

  if (alternateBySeed) {
    return indexedPairs.reduce(
      (sides, indexedPair) => {
        const side = indexedPair.pairIndex % 2 === 0 ? "left" : "right";
        sides[side].push(indexedPair);
        return sides;
      },
      { left: [], right: [] }
    );
  }

  const midpoint = Math.ceil(pairs.length / 2);
  return {
    left: indexedPairs.slice(0, midpoint),
    right: indexedPairs.slice(midpoint),
  };
};

const getPairSlotTeam = (pair, side) => (side === "home" ? pair.home : pair.away);

const getAvailableLegPhases = ({ phaseKey, participantsCount }) => {
  if (phaseKey === "repechaje") return [];

  const currentPhaseIndex = PLAYOFF_PHASES.findIndex((phase) => phase.key === phaseKey);
  if (currentPhaseIndex >= 0) {
    return PLAYOFF_PHASES.slice(currentPhaseIndex);
  }

  const safeCount = Math.max(2, Number(participantsCount) || 2);
  const firstPossibleIndex = PLAYOFF_PHASES.findIndex((phase) => safeCount <= phase.participants);
  return firstPossibleIndex >= 0 ? PLAYOFF_PHASES.slice(firstPossibleIndex) : PLAYOFF_PHASES;
};

const TeamBadge = ({ team, side, pairIndex, onDragStart, onDropTeam }) => {
  const isEmpty = !team;

  return (
    <SeedCard
      draggable={!isEmpty}
      $empty={isEmpty}
      onDragStart={(event) => {
        if (isEmpty) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/json", JSON.stringify({ pairIndex, side }));
        onDragStart?.({ pairIndex, side });
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData("application/json");
        if (!raw) return;
        onDropTeam?.(JSON.parse(raw), { pairIndex, side });
      }}
      title={isEmpty ? "Descanso" : "Arrastra para intercambiar equipo"}
    >
      <span className="seed">{team?.seed ? `#${team.seed}` : "-"}</span>
      <span className="logo">
        {team ? (
          team.logo_url ? (
            <img src={team.logo_url} alt={team.name || "Equipo"} />
          ) : (
            <DynamicTeamLogo name={team.name} color={team.color} size="26px" />
          )
        ) : (
          <span className="bye-dot" />
        )}
      </span>
      <span className="team-name">{team?.name || "Descanso"}</span>
    </SeedCard>
  );
};

export function PlayoffAdvanceModal({
  isOpen,
  onClose,
  onConfirm,
  preview,
  isLoading = false,
}) {
  const initialSettings = useMemo(
    () => getPlayoffSettings(preview?.settings || {}),
    [preview?.settings]
  );
  const [settings, setSettings] = useState(initialSettings);
  const [pairs, setPairs] = useState(preview?.pairs || []);
  const [, setDraggedSlot] = useState(null);

  React.useEffect(() => {
    setSettings(initialSettings);
    setPairs(preview?.pairs || []);
    setDraggedSlot(null);
  }, [initialSettings, preview]);

  const bracketSides = useMemo(
    () => splitPairsForBracket(pairs, settings.reseed),
    [pairs, settings.reseed]
  );
  const hasRepechaje = Number(preview?.repechajeCount || 0) > 0 || preview?.phaseKey === "repechaje";
  const availableLegPhases = useMemo(
    () => getAvailableLegPhases({
      phaseKey: preview?.phaseKey,
      participantsCount: preview?.participants?.length,
    }),
    [preview?.phaseKey, preview?.participants?.length]
  );

  const updateSetting = (name, value) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const swapSlots = (from, to) => {
    if (!from || !to) return;
    if (from.pairIndex === to.pairIndex && from.side === to.side) return;

    setPairs((prev) => {
      const next = prev.map((pair) => ({ ...pair }));
      const fromPair = next[from.pairIndex];
      const toPair = next[to.pairIndex];
      if (!fromPair || !toPair) return prev;

      const fromTeam = getPairSlotTeam(fromPair, from.side);
      const toTeam = getPairSlotTeam(toPair, to.side);
      fromPair[from.side] = toTeam || null;
      toPair[to.side] = fromTeam || null;
      fromPair.bye = !fromPair.home || !fromPair.away;
      toPair.bye = !toPair.home || !toPair.away;
      return next;
    });
    setDraggedSlot(null);
  };

  const resetPairs = () => {
    setPairs(pairHighLow(preview?.participants || []));
  };

  const handleConfirm = () => {
    onConfirm({
      ...preview,
      settings,
      pairs,
    });
  };

  if (!preview) return null;

  const headerActions = (
    <HeaderActions>
      <SummaryPill>
        <RiGitBranchLine />
        {pairs.length} cruces
      </SummaryPill>
      <IconButton type="button" onClick={resetPairs} title="Rehacer cruces por siembra" aria-label="Rehacer cruces por siembra">
        <RiRefreshLine />
      </IconButton>
    </HeaderActions>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Avanzar a ${preview.phaseLabel || "fase final"}`}
      width="1160px"
      headerActions={headerActions}
      showCloseButton={false}
      closeOnOverlayClick={false}
    >
      <Container>
        <PreviewHeader>
          <div>
            <h3>Vista previa</h3>
          </div>
        </PreviewHeader>

        {availableLegPhases.length > 0 && (
          <LegsMatrix>
            {availableLegPhases.map((phase) => {
              const field = phaseLegFieldMap[phase.key];

              return (
                <label key={phase.key}>
                  <span>{phase.label}</span>
                  <select
                    value={settings[field] || "single"}
                    onChange={(event) => updateSetting(field, event.target.value)}
                  >
                    <option value="single">Unico</option>
                    <option value="double">Ida/vuelta</option>
                  </select>
                </label>
              );
            })}
          </LegsMatrix>
        )}

        <BracketCanvas>
          <BracketColumn $side="left">
            {bracketSides.left.map(({ pair, pairIndex }) => (
              <MatchNode key={pair.id || `left-${pairIndex}`} $side="left">
                <TeamBadge
                  team={pair.home}
                  side="home"
                  pairIndex={pairIndex}
                  onDragStart={setDraggedSlot}
                  onDropTeam={swapSlots}
                />
                <Connector $side="left" />
                <TeamBadge
                  team={pair.away}
                  side="away"
                  pairIndex={pairIndex}
                  onDragStart={setDraggedSlot}
                  onDropTeam={swapSlots}
                />
              </MatchNode>
            ))}
          </BracketColumn>

          <CenterStage>
            <span className="stage-label">BRACKET</span>
            <div className="trophy">
              <RiGitBranchLine />
            </div>
            <strong>{preview.phaseLabel}</strong>
            <CenterSettings>
              <CenterSettingBox>
                <label>Resiembra</label>
                <select
                  value={settings.reseed ? "yes" : "no"}
                  onChange={(event) => updateSetting("reseed", event.target.value === "yes")}
                >
                  <option value="yes">Primeros vs ultimos</option>
                  <option value="no">Mantener llave</option>
                </select>
              </CenterSettingBox>
              <CenterSettingBox>
                <label>Empate global</label>
                <select
                  value={settings.tieBreaker}
                  onChange={(event) => updateSetting("tieBreaker", event.target.value)}
                >
                  <option value="bestSeed">Mejor posicion</option>
                  <option value="penalties">Penales</option>
                </select>
              </CenterSettingBox>
              <CenterSettingBox>
                <label>Goles en tabla</label>
                <CenterChecks>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!settings.countGoalsPlayoffs}
                      onChange={(event) => updateSetting("countGoalsPlayoffs", event.target.checked)}
                    />
                    Liguilla
                  </label>
                  {hasRepechaje && (
                    <label>
                      <input
                        type="checkbox"
                        checked={!!settings.countGoalsRepechaje}
                        onChange={(event) => updateSetting("countGoalsRepechaje", event.target.checked)}
                      />
                      Repechaje
                    </label>
                  )}
                </CenterChecks>
              </CenterSettingBox>
            </CenterSettings>
          </CenterStage>

          <BracketColumn $side="right">
            {bracketSides.right.map(({ pair, pairIndex }) => {
              return (
                <MatchNode key={pair.id || `right-${pairIndex}`} $side="right">
                  <TeamBadge
                    team={pair.home}
                    side="home"
                    pairIndex={pairIndex}
                    onDragStart={setDraggedSlot}
                    onDropTeam={swapSlots}
                  />
                  <Connector $side="right" />
                  <TeamBadge
                    team={pair.away}
                    side="away"
                    pairIndex={pairIndex}
                    onDragStart={setDraggedSlot}
                    onDropTeam={swapSlots}
                  />
                </MatchNode>
              );
            })}
          </BracketColumn>
        </BracketCanvas>

        <FooterActions>
          <CancelButton type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </CancelButton>
          <ConfirmButton
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            <RiArrowRightLine />
            <span>{isLoading ? "Creando fase..." : "Confirmar cruces"}</span>
          </ConfirmButton>
        </FooterActions>
      </Container>
    </Modal>
  );
}

const Container = styled.div`
  --playoff-primary: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
  --playoff-primary-soft: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
  --playoff-surface: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards};
  --playoff-item: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bgtotal};
  --playoff-border: ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
  --playoff-muted: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle};
  --playoff-stage-accent: ${({ theme }) => theme.tournamentDashboard?.jornada?.accent || theme.primary};
  --playoff-stage-soft: ${({ theme }) => theme.tournamentDashboard?.jornada?.accentSoft || theme.bg6};
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 82vh;
  overflow-y: auto;
  padding-right: 4px;
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  .eyebrow {
    display: block;
    font-size: 0.72rem;
    font-weight: 800;
    color: ${({ theme }) => theme.primary};
    text-transform: uppercase;
  }

  h3 {
    margin: 2px 0 0;
    font-size: 1.35rem;
    color: ${({ theme }) => theme.colortitlecard || theme.text};
  }

  p {
    margin: 4px 0 0;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.text};
    opacity: 0.72;
  }
`;

const HeaderActions = styled.div`
  --playoff-primary: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
  --playoff-primary-soft: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
  --playoff-surface: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards};
  --playoff-item: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bgtotal};
  --playoff-border: ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
  --playoff-muted: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle};
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
`;

const SummaryPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
  border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
  font-weight: 800;
  color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
`;

const IconButton = styled.button`
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
  background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bgtotal};
  color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
    border-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
    transform: translateY(-1px);
  }
`;

const LegsMatrix = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;

  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--playoff-muted);
  }

  select {
    border: 1px solid var(--playoff-border);
    border-radius: 8px;
    padding: 8px;
    background: var(--playoff-item);
    color: ${({ theme }) => theme.text};
    outline: none;

    &:focus {
      border-color: var(--playoff-primary);
      box-shadow: 0 0 0 2px var(--playoff-primary-soft);
    }
  }
`;

const BracketCanvas = styled.div`
  display: grid;
  grid-template-columns: minmax(275px, 1fr) minmax(230px, 260px) minmax(275px, 1fr);
  gap: 44px;
  min-height: 452px;
  padding: 22px 28px;
  border-radius: 8px;
  border: 1px solid var(--playoff-border);
  background:
    radial-gradient(circle at 50% 50%, var(--playoff-stage-soft), transparent 36%),
    var(--playoff-item);

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: 18px;
    padding: 18px;
  }
`;

const BracketColumn = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 26px;
  min-width: 0;
`;

const MatchNode = styled.div`
  --seed-card-height: 46px;
  --connector-arm: 24px;
  --connector-out: 20px;
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 34px;
  overflow: visible;
  z-index: 2;
`;

const Connector = styled.div`
  position: absolute;
  top: calc(var(--seed-card-height) / 2);
  bottom: calc(var(--seed-card-height) / 2);
  ${({ $side }) => ($side === "left" ? "right: calc(var(--connector-arm) * -1);" : "left: calc(var(--connector-arm) * -1);")}
  width: var(--connector-arm);
  border-top: 3px solid var(--playoff-primary);
  border-bottom: 3px solid var(--playoff-primary);
  border-${({ $side }) => ($side === "left" ? "right" : "left")}: 3px solid var(--playoff-primary);
  border-radius: ${({ $side }) => ($side === "left" ? "0 8px 8px 0" : "8px 0 0 8px")};
  opacity: 0.95;
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    ${({ $side }) => ($side === "left" ? "right: calc(var(--connector-out) * -1);" : "left: calc(var(--connector-out) * -1);")}
    width: var(--connector-out);
    border-top: 3px solid var(--playoff-primary);
    transform: translateY(-50%);
  }

  @media (max-width: 860px) {
    display: none;
  }
`;

const CenterStage = styled.div`
  align-self: stretch;
  position: relative;
  min-height: 330px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 18px 14px 16px;
  border-radius: 8px;
  background: var(--playoff-surface);
  border: 1px solid var(--playoff-border);
  text-align: center;
  z-index: 3;

  @media (max-width: 860px) {
    min-height: auto;
  }

  .stage-label {
    font-size: 0.76rem;
    letter-spacing: 0;
    font-weight: 900;
    color: var(--playoff-stage-accent);
  }

  .trophy {
    width: 62px;
    height: 62px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--playoff-stage-accent);
    color: ${({ theme }) => theme.body};
    font-size: 1.9rem;
  }

  strong {
    color: ${({ theme }) => theme.text};
    font-size: 1rem;
  }

  small {
    color: ${({ theme }) => theme.text};
    opacity: 0.7;
    line-height: 1.35;
  }
`;

const CenterSettings = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
`;

const CenterSettingBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--playoff-border);
  background: var(--playoff-item);
  text-align: left;

  label {
    color: var(--playoff-muted);
    font-size: 0.64rem;
    font-weight: 900;
    line-height: 1;
  }

  select {
    width: 100%;
    min-height: 32px;
    border: 1px solid var(--playoff-border);
    border-radius: 7px;
    padding: 6px 8px;
    background: var(--playoff-surface);
    color: ${({ theme }) => theme.text};
    font-size: 0.72rem;
    font-weight: 850;
    outline: none;

    &:focus {
      border-color: var(--playoff-primary);
      box-shadow: 0 0 0 2px var(--playoff-primary-soft);
    }
  }
`;

const CenterChecks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  label {
    min-height: 26px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border-radius: 7px;
    background: var(--playoff-surface);
    color: ${({ theme }) => theme.text};
    font-size: 0.68rem;
    font-weight: 850;
  }

  input {
    accent-color: var(--playoff-primary);
  }
`;

const SeedCard = styled.div`
  min-height: var(--seed-card-height, 46px);
  display: grid;
  grid-template-columns: 42px 34px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ $empty }) => ($empty ? "var(--playoff-border)" : "var(--playoff-primary)")};
  background: var(--playoff-surface);
  color: ${({ theme }) => theme.text};
  cursor: ${({ $empty }) => ($empty ? "default" : "grab")};
  box-shadow: ${({ theme }) => `0 8px 18px rgba(${theme.textRgba}, 0.12)`};

  &:active {
    cursor: grabbing;
  }

  .seed {
    font-weight: 900;
    color: var(--playoff-primary);
    text-align: center;
  }

  .logo {
    width: 28px;
    height: 28px;
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

  .bye-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px dashed var(--playoff-border);
  }

  .team-name {
    min-width: 0;
    font-size: 0.84rem;
    font-weight: 800;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    opacity: ${({ $empty }) => ($empty ? 0.55 : 1)};
  }
`;

const FooterActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--playoff-border);
`;

const ActionButton = styled.button`
  min-height: 43px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease, background 0.18s ease, border-color 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }
`;

const CancelButton = styled(ActionButton)`
  border: 1px solid var(--playoff-border);
  background: var(--playoff-item);
  color: ${({ theme }) => theme.text};

  &:hover:not(:disabled) {
    background: var(--playoff-primary-soft);
    border-color: var(--playoff-primary);
  }
`;

const ConfirmButton = styled(ActionButton)`
  border: 1px solid var(--playoff-primary);
  background: var(--playoff-primary);
  color: ${({ theme }) => (theme.body === "#202020" ? theme.text : theme.body)};

  &:hover:not(:disabled) {
    filter: brightness(1.05);
  }
`;
