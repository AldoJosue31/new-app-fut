import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { RiArrowRightLine, RiGitBranchLine, RiRefreshLine } from "react-icons/ri";
import { BtnNormal, Btnsave, Modal, v } from "../../../../../index";
import { DynamicTeamLogo } from "../../../equipos/DynamicTeamLogo";
import {
  PLAYOFF_PHASES,
  getPhaseLegMode,
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

const splitPairsForBracket = (pairs = []) => {
  const midpoint = Math.ceil(pairs.length / 2);
  return {
    left: pairs.slice(0, midpoint),
    right: pairs.slice(midpoint),
  };
};

const getPairSlotTeam = (pair, side) => (side === "home" ? pair.home : pair.away);

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
  const [draggedSlot, setDraggedSlot] = useState(null);

  React.useEffect(() => {
    setSettings(initialSettings);
    setPairs(preview?.pairs || []);
    setDraggedSlot(null);
  }, [initialSettings, preview]);

  const bracketSides = useMemo(() => splitPairsForBracket(pairs), [pairs]);
  const hasRepechaje = Number(preview?.repechajeCount || 0) > 0 || preview?.phaseKey === "repechaje";

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Avanzar a ${preview.phaseLabel || "fase final"}`}
      width="1040px"
      closeOnOverlayClick={false}
    >
      <Container>
        <PreviewHeader>
          <div>
            <span className="eyebrow">Vista previa de cruces</span>
            <h3>{preview.phaseLabel}</h3>
            <p>
              Cruces generados desde la tabla actual
              {Number.isFinite(preview.standingsLimit) && preview.standingsLimit !== Number.MAX_SAFE_INTEGER
                ? ` hasta Jornada ${preview.standingsLimit}`
                : ""}.
            </p>
          </div>
          <HeaderActions>
            <SummaryPill>
              <RiGitBranchLine />
              {pairs.length} cruces
            </SummaryPill>
            <IconButton type="button" onClick={resetPairs} title="Rehacer cruces por siembra">
              <RiRefreshLine />
            </IconButton>
          </HeaderActions>
        </PreviewHeader>

        <SettingsGrid>
          <SettingBox>
            <label>Resiembra por ronda</label>
            <select
              value={settings.reseed ? "yes" : "no"}
              onChange={(event) => updateSetting("reseed", event.target.value === "yes")}
            >
              <option value="yes">Primeros vs ultimos</option>
              <option value="no">Mantener llave</option>
            </select>
          </SettingBox>

          <SettingBox>
            <label>Criterio en empate global</label>
            <select
              value={settings.tieBreaker}
              onChange={(event) => updateSetting("tieBreaker", event.target.value)}
            >
              <option value="bestSeed">Avanza mejor posicion</option>
              <option value="penalties">Penales / shootouts</option>
            </select>
          </SettingBox>

          {preview.phaseKey === "repechaje" ? (
            <SettingBox>
              <label>Repechaje</label>
              <select
                value={settings.repechajeLegs}
                onChange={(event) => updateSetting("repechajeLegs", event.target.value)}
              >
                <option value="single">Partido unico</option>
                <option value="double">Ida y vuelta</option>
              </select>
            </SettingBox>
          ) : (
            <SettingBox>
              <label>{preview.phaseLabel}</label>
              <select
                value={getPhaseLegMode(preview.phaseKey, settings)}
                onChange={(event) => {
                  const field = phaseLegFieldMap[preview.phaseKey];
                  if (field) updateSetting(field, event.target.value);
                }}
              >
                <option value="single">Partido unico</option>
                <option value="double">Ida y vuelta</option>
              </select>
            </SettingBox>
          )}

          <SettingBox>
            <label>Goles en tabla de goleo</label>
            <div className="checks">
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
            </div>
          </SettingBox>
        </SettingsGrid>

        {preview.phaseKey !== "repechaje" && (
          <LegsMatrix>
            {PLAYOFF_PHASES.map((phase) => {
              const field = phaseLegFieldMap[phase.key];

              return (
                <label key={phase.key}>
                  <span>{phase.label}</span>
                  <select
                    value={settings[field]}
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
            {bracketSides.left.map((pair, index) => (
              <MatchNode key={pair.id || `left-${index}`} $side="left">
                <TeamBadge
                  team={pair.home}
                  side="home"
                  pairIndex={index}
                  onDragStart={setDraggedSlot}
                  onDropTeam={swapSlots}
                />
                <Connector $side="left" />
                <TeamBadge
                  team={pair.away}
                  side="away"
                  pairIndex={index}
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
            <small>
              {draggedSlot ? "Suelta sobre otro equipo para intercambiar" : "Arrastra equipos para ajustar cruces"}
            </small>
          </CenterStage>

          <BracketColumn $side="right">
            {bracketSides.right.map((pair, rightIndex) => {
              const pairIndex = rightIndex + bracketSides.left.length;
              return (
                <MatchNode key={pair.id || `right-${rightIndex}`} $side="right">
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
          <BtnNormal titulo="Cancelar" funcion={onClose} />
          <Btnsave
            titulo={isLoading ? "Creando fase..." : "Confirmar cruces"}
            bgcolor={v.colorPrincipal}
            icono={<RiArrowRightLine />}
            funcion={handleConfirm}
            disabled={isLoading}
          />
        </FooterActions>
      </Container>
    </Modal>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 76vh;
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
    color: ${({ theme }) => theme.text};
  }

  p {
    margin: 4px 0 0;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.text};
    opacity: 0.72;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SummaryPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.bg2};
  border: 1px solid ${({ theme }) => theme.color2};
  font-weight: 800;
  color: ${({ theme }) => theme.text};
`;

const IconButton = styled.button`
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.color2};
  background: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text};
  cursor: pointer;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
`;

const SettingBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.color2};
  background: ${({ theme }) => theme.bg};

  label {
    font-size: 0.78rem;
    font-weight: 800;
    color: ${({ theme }) => theme.text};
  }

  select {
    width: 100%;
    border: 1px solid ${({ theme }) => theme.color2};
    border-radius: 8px;
    padding: 9px;
    background: ${({ theme }) => theme.bgtotal};
    color: ${({ theme }) => theme.text};
    outline: none;
  }

  .checks {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 700;
    }

    input {
      accent-color: ${v.colorPrincipal};
    }
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
    color: ${({ theme }) => theme.text};
  }

  select {
    border: 1px solid ${({ theme }) => theme.color2};
    border-radius: 8px;
    padding: 8px;
    background: ${({ theme }) => theme.bgtotal};
    color: ${({ theme }) => theme.text};
  }
`;

const BracketCanvas = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(150px, 190px) minmax(260px, 1fr);
  gap: 22px;
  min-height: 430px;
  padding: 18px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.color2};
  background:
    radial-gradient(circle at 50% 50%, rgba(28, 176, 246, 0.16), transparent 36%),
    ${({ theme }) => theme.bg2};

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    min-height: auto;
  }
`;

const BracketColumn = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 18px;
`;

const MatchNode = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
`;

const Connector = styled.div`
  height: 20px;
  width: 50%;
  justify-self: ${({ $side }) => ($side === "left" ? "end" : "start")};
  border-top: 2px solid ${({ theme }) => theme.primary};
  border-bottom: 2px solid ${({ theme }) => theme.primary};
  border-${({ $side }) => ($side === "left" ? "right" : "left")}: 2px solid ${({ theme }) => theme.primary};
  opacity: 0.55;
`;

const CenterStage = styled.div`
  align-self: center;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 14px;
  border-radius: 8px;
  background: ${({ theme }) => theme.bg};
  border: 1px solid ${({ theme }) => theme.color2};
  text-align: center;

  .stage-label {
    font-size: 0.76rem;
    letter-spacing: 0;
    font-weight: 900;
    color: ${({ theme }) => theme.primary};
  }

  .trophy {
    width: 76px;
    height: 76px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: ${({ theme }) => theme.primary};
    color: #fff;
    font-size: 2.3rem;
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

const SeedCard = styled.div`
  min-height: 44px;
  display: grid;
  grid-template-columns: 42px 34px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme, $empty }) => ($empty ? theme.color2 : theme.primary)};
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
  cursor: ${({ $empty }) => ($empty ? "default" : "grab")};
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);

  &:active {
    cursor: grabbing;
  }

  .seed {
    font-weight: 900;
    color: ${({ theme }) => theme.primary};
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
    border: 2px dashed ${({ theme }) => theme.color2};
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
  border-top: 1px solid ${({ theme }) => theme.color2};
`;
