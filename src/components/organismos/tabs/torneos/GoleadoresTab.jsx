import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { v } from '../../../../styles/variables';
import { ContainerScroll } from '../../../atomos/ContainerScroll';
import { BiLock, BiLockOpen } from 'react-icons/bi';
import { RiImageLine, RiUser3Line } from 'react-icons/ri';
import { DynamicTeamLogo } from '../../equipos/DynamicTeamLogo';
import GoleadoresExportModal from './exports/goleadores/GoleadoresExportModal';
import { StandingsJornadaSelector } from './StandingsJornadaSelector';
import { useTorneoGoleadoresLogic } from '../../../../hooks/useTorneoGoleadoresLogic';
import { Skeleton } from '../../../atomos/Skeleton';
import { updateTournamentFieldsService } from '../../../../services/torneos';

const PlayerAvatar = ({ src, alt }) => {
  const [hasError, setHasError] = useState(false);
  const hasImage = Boolean(src) && !hasError;

  return (
    <AvatarCircle $hasImage={hasImage}>
      {hasImage ? (
        <img
          src={src}
          alt={alt}
          crossOrigin="anonymous"
          onError={() => setHasError(true)}
        />
      ) : (
        <RiUser3Line size={18} />
      )}
    </AvatarCircle>
  );
};

export const GoleadoresTab = ({
  torneo = {},
  goleadores = [],
  partidos = [],
  equipos = [],
  jornadas = [],
  goalEvents = null,
  reglas = {},
  onRefresh,
  isPublic = false,
}) => {
  const [isPublicEnabled, setIsPublicEnabled] = useState(
    torneo?.is_goleadores_public || false
  );
  const [updating, setUpdating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedJornadaView, setSelectedJornadaView] = useState('recent');

  useEffect(() => {
    setIsPublicEnabled(torneo?.is_goleadores_public || false);
  }, [torneo?.is_goleadores_public]);

  useEffect(() => {
    setSelectedJornadaView('recent');
  }, [torneo?.id]);

  const {
    goleadores: goleadoresMostrados,
    effectiveJornada,
    jornadasConfirmadasForDropdown,
    activeJornadaName,
    activeJornadaSummary,
    isLoading,
  } = useTorneoGoleadoresLogic({
    torneo,
    equipos,
    partidos,
    jornadasProp: jornadas,
    reglas,
    selectedJornadaView,
    goleadoresFallback: goleadores,
    goalEventsProp: goalEvents,
  });

  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [isLoading, selectedJornadaView]);

  const handleTogglePublic = async () => {
    if (updating) return;
    setUpdating(true);
    const newState = !isPublicEnabled;

    try {
      await updateTournamentFieldsService(torneo.id, {
        is_goleadores_public: newState,
      });
      setIsPublicEnabled(newState);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert('No se pudo actualizar el estado.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Container>
      {!isPublic && (
        <ControlPanel>
          <SelectorWrapper>
            {showSkeleton ? (
              <Skeleton width="100%" height="36px" radius="8px" />
            ) : (
              <StandingsJornadaSelector
                selected={selectedJornadaView}
                onChange={setSelectedJornadaView}
                effectiveJornada={effectiveJornada}
                jornadasOptions={jornadasConfirmadasForDropdown}
                currentLabel={
                  effectiveJornada > 0
                    ? `Vista actual (Hasta J. ${effectiveJornada})`
                    : 'Vista actual'
                }
              />
            )}
          </SelectorWrapper>

          <HeaderSpacer />

          <ControlsGroup>
            <ExportButton
              onClick={() => setShowExportModal(true)}
              title="Exportar tabla de goleo"
            >
              <RiImageLine size={18} />
              <span>Exportar</span>
            </ExportButton>
            <ToggleContainer onClick={handleTogglePublic} $active={isPublicEnabled}>
              <div className="track">
                <div className="thumb" />
              </div>
              <span className="label">
                Publico
              </span>
            </ToggleContainer>
            <StatusIcon $active={isPublicEnabled}>
              {isPublicEnabled ? <BiLockOpen /> : <BiLock />}
            </StatusIcon>
          </ControlsGroup>
        </ControlPanel>
      )}

      <TableCard>
        <TableScrollWrapper $height="auto">
          <StyledTable>
            <colgroup>
              <col className="rank-col" />
              <col className="player-col" />
              <col className="team-col" />
              <col className="goals-col" />
            </colgroup>
            <thead>
              <tr>
                <ThRank>#</ThRank>
                <Th>Jugador</Th>
                <Th>Equipo</Th>
                <Th className="goals">Goles</Th>
              </tr>
            </thead>
            <tbody>
              {showSkeleton ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <Tr key={`skeleton-${index}`}>
                    <RankTd>
                      <Skeleton width="30px" height="30px" radius="50%" />
                    </RankTd>
                    <Td>
                      <PlayerCell>
                        <Skeleton width="36px" height="36px" radius="50%" />
                        <div className="info" style={{ gap: '6px', width: '100%' }}>
                          <Skeleton width="170px" height="14px" radius="6px" />
                          <Skeleton width="58px" height="12px" radius="6px" />
                        </div>
                      </PlayerCell>
                    </Td>
                    <Td>
                      <TeamCell>
                        <Skeleton width="24px" height="24px" radius="50%" />
                        <Skeleton width="120px" height="14px" radius="6px" />
                      </TeamCell>
                    </Td>
                    <Td className="goals">
                      <GoalsSkeletonWrap>
                        <Skeleton width="26px" height="20px" radius="6px" />
                      </GoalsSkeletonWrap>
                    </Td>
                  </Tr>
                ))
              ) : (
                goleadoresMostrados.map((jugador, index) => (
                  <Tr key={jugador?.player_id || `${jugador?.team_id || jugador?.team_name}-${jugador?.dorsal || "sin-dorsal"}-${jugador?.name}`}>
                    <RankTd>
                      <RankBadge $pos={index + 1}>{index + 1}</RankBadge>
                    </RankTd>
                    <Td>
                      <PlayerCell>
                        <PlayerAvatar
                          src={jugador?.photo_url}
                          alt={`${jugador?.first_name || ''} ${jugador?.last_name || ''}`}
                        />
                        <div className="info">
                          <span className="name">
                            {jugador?.first_name} {jugador?.last_name}
                          </span>
                          {jugador?.dorsal && (
                            <span className="dorsal">#{jugador.dorsal}</span>
                          )}
                        </div>
                      </PlayerCell>
                    </Td>
                    <Td>
                      <TeamCell>
                        {jugador?.team_logo ? (
                          <img
                            src={jugador.team_logo}
                            alt={jugador?.team_name || 'Equipo'}
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <DynamicTeamLogo
                            name={jugador?.team_name}
                            color={jugador?.team_color}
                            size="24px"
                          />
                        )}
                        <span className="tname">{jugador?.team_name}</span>
                      </TeamCell>
                    </Td>
                    <Td className="goals">{jugador?.goals ?? 0}</Td>
                  </Tr>
                ))
              )}

              {!showSkeleton && goleadoresMostrados.length === 0 && (
                <tr>
                  <Td
                    colSpan="4"
                    style={{ textAlign: 'center', padding: 20, opacity: 0.6 }}
                  >
                    No hay goleadores registrados para esta jornada.
                  </Td>
                </tr>
              )}
            </tbody>
          </StyledTable>
        </TableScrollWrapper>
      </TableCard>

      <GoleadoresExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        goleadores={goleadoresMostrados}
        torneo={torneo}
        activeJornadaName={activeJornadaName}
        activeJornadaSummary={activeJornadaSummary}
      />
    </Container>
  );
};

const Container = styled.div`
  --goleadores-primary: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
  --goleadores-primary-soft: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
  --goleadores-primary-strong: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.primary};
  --goleadores-surface: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bg};
  --goleadores-item-surface: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
  --goleadores-border: ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
  --goleadores-muted: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle};
  --goleadores-success: ${({ theme }) => theme.tournamentDashboard?.metrics?.accent || v.verde};
  --goleadores-success-soft: ${({ theme }) => theme.tournamentDashboard?.metrics?.accentSoft || 'rgba(83, 178, 87, 0.14)'};
  --goleadores-warning: ${({ theme }) => theme.tournamentDashboard?.metrics?.warning || '#f59e0b'};

  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`;

const ControlPanel = styled.div`
  display: grid;
  grid-template-columns: minmax(190px, 360px) minmax(0, 1fr) auto;
  align-items: center;
  width: 98%;
  max-width: 980px;
  margin: 0 auto;
  background: var(--goleadores-surface);
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--goleadores-border);
  gap: 8px;
  min-width: 0;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    grid-template-columns: minmax(0, 1fr) max-content;
    padding: 7px 10px;
    border-radius: 10px;
  }

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    column-gap: 6px;
    row-gap: 8px;
  }
`;

const SelectorWrapper = styled.div`
  width: 100%;
  min-width: 0;

  select {
    border-color: var(--goleadores-border);
    background-color: var(--goleadores-item-surface);
    color: ${({ theme }) => theme.text};
  }

  select:focus {
    border-color: var(--goleadores-primary);
    box-shadow: 0 0 0 3px var(--goleadores-primary-soft);
  }

  @media (max-width: 768px) {
    grid-column: 1;
    grid-row: 1;
    max-width: none;
  }
`;

const HeaderSpacer = styled.div`
  min-width: 0;

  @media (max-width: 768px) {
    display: none;
  }
`;

const ControlsGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    grid-column: 2;
    grid-row: 1;
    flex-wrap: nowrap;
    justify-content: flex-end;
  }

  @media (max-width: 380px) {
    gap: 6px;
  }
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--goleadores-item-surface);
  border: 1px solid var(--goleadores-border);
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;

  &:hover,
  &:focus-visible {
    background: var(--goleadores-primary-soft);
    border-color: var(--goleadores-primary);
    color: var(--goleadores-primary-strong);
    transform: translateY(-1px);
    outline: none;
  }

  @media (max-width: 600px) {
    width: 34px;
    height: 34px;
    padding: 0;
    justify-content: center;
    border-radius: 8px;

    span {
      display: none;
    }
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  cursor: pointer;
  user-select: none;
  min-width: 0;

  .track {
    width: 44px;
    height: 24px;
    background-color: ${({ $active }) =>
      $active ? 'var(--goleadores-success-soft)' : 'var(--goleadores-item-surface)'};
    border-radius: 20px;
    position: relative;
    transition: background-color 0.3s ease, border-color 0.3s ease;
    border: 1px solid ${({ $active }) =>
      $active ? 'var(--goleadores-success)' : 'var(--goleadores-border)'};
  }

  .thumb {
    width: 20px;
    height: 20px;
    background-color: ${({ $active }) =>
      $active ? 'var(--goleadores-success)' : 'var(--goleadores-muted)'};
    border-radius: 50%;
    position: absolute;
    top: 1px;
    left: 1px;
    transform: ${({ $active }) =>
      $active ? 'translateX(20px)' : 'translateX(0)'};
    transition: transform 0.3s, background-color 0.3s ease;
  }

  .label {
    font-size: 0.68rem;
    font-weight: 600;
    color: ${({ $active }) =>
      $active ? 'var(--goleadores-success)' : 'var(--goleadores-muted)'};
    line-height: 1;
    max-width: 48px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    min-width: 0;
  }

  @media (max-width: 380px) {
    .label {
      font-size: 0.62rem;
      max-width: 46px;
    }
  }
`;

const StatusIcon = styled.div`
  font-size: 1.4rem;
  color: ${({ $active }) =>
    $active ? 'var(--goleadores-success)' : 'var(--goleadores-muted)'};
  opacity: ${({ $active }) => ($active ? 1 : 0.75)};
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const TableCard = styled.div`
  background-color: var(--goleadores-surface);
  border-radius: 12px;
  margin: 0 auto;
  width: 98%;
  max-width: 980px;
  overflow: hidden;
  border: 1px solid var(--goleadores-border);

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    border-radius: 10px;
  }
`;

const TableScrollWrapper = styled(ContainerScroll)`
  max-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0;
`;

const StyledTable = styled.table`
  width: 100%;
  min-width: 0;
  border-collapse: collapse;
  table-layout: fixed;

  .rank-col {
    width: 58px;
  }

  .player-col {
    width: 43%;
  }

  .team-col {
    width: 37%;
  }

  .goals-col {
    width: 76px;
  }

  @media (max-width: 768px) {
    .rank-col {
      width: 48px;
    }

    .player-col {
      width: 42%;
    }

    .team-col {
      width: 35%;
    }

    .goals-col {
      width: 50px;
    }
  }

  @media (max-width: 380px) {
    .rank-col {
      width: 42px;
    }

    .player-col {
      width: 43%;
    }

    .team-col {
      width: 34%;
    }

    .goals-col {
      width: 44px;
    }
  }
`;

const Th = styled.th`
  background: var(--goleadores-item-surface);
  color: ${({ theme }) => theme.text};
  padding: 12px;
  text-align: left;
  font-size: 0.85rem;
  position: sticky;
  top: 0;
  z-index: 10;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.goals {
    text-align: center;
    color: var(--goleadores-primary-strong);
  }

  @media (max-width: 768px) {
    padding: 10px 6px;
    font-size: 0.74rem;
  }
`;

const ThRank = styled.th`
  width: 56px;
  padding: 12px 8px;
  text-align: center;
  background: var(--goleadores-item-surface);
  color: var(--goleadores-muted);
  position: sticky;
  top: 0;
  z-index: 11;

  @media (max-width: 768px) {
    width: 48px;
    padding: 10px 4px;
    font-size: 0.78rem;
  }
`;

const Td = styled.td`
  padding: 10px 12px;
  border-bottom: 1px solid var(--goleadores-border);
  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;
  min-width: 0;
  overflow: hidden;

  &.goals {
    text-align: center;
    font-weight: 800;
    color: var(--goleadores-primary-strong);
    font-size: 1.1rem;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    padding: 8px 5px;
    font-size: 0.78rem;

    &.goals {
      font-size: 0.95rem;
      padding-left: 2px;
      padding-right: 2px;
    }
  }

  @media (max-width: 380px) {
    padding-left: 4px;
    padding-right: 4px;
    font-size: 0.74rem;
  }
`;

const RankTd = styled.td`
  width: 56px;
  padding: 8px 6px;
  text-align: center;
  overflow: hidden;

  @media (max-width: 768px) {
    width: 48px;
    padding: 7px 4px;
  }

  @media (max-width: 380px) {
    width: 42px;
    padding-left: 3px;
    padding-right: 3px;
  }
`;

const RankBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-weight: 800;
  color: white;
  box-shadow: ${({ $pos }) =>
    $pos <= 3 ? '0 2px 8px rgba(0, 0, 0, 0.14)' : 'none'};
  transition: 0.18s;
  ${({ $pos }) =>
    $pos === 1
      ? 'background: linear-gradient(180deg,#ffd54a 0%, #ffb300 100%); color: rgba(0,0,0,0.85);'
      : $pos === 2
        ? 'background: linear-gradient(180deg,#e6eaf0 0%, #c6ccd6 100%); color: rgba(0,0,0,0.85);'
        : $pos === 3
          ? 'background: linear-gradient(180deg,#d7a17a 0%, #b97745 100%); color: rgba(0,0,0,0.85);'
          : 'background: var(--goleadores-primary-soft); color: var(--goleadores-primary-strong); border: 1px solid var(--goleadores-border); width: 30px; height: 30px;'}

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: 0.85rem;
    box-shadow: ${({ $pos }) =>
      $pos <= 3 ? '0 2px 6px rgba(0, 0, 0, 0.12)' : 'none'};
    ${({ $pos }) =>
      $pos > 3 &&
      'width: 28px; height: 28px;'}
  }

  @media (max-width: 380px) {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
    ${({ $pos }) =>
      $pos > 3 &&
      'width: 26px; height: 26px;'}
  }
`;

const Tr = styled.tr`
  &:nth-child(even) {
    background-color: var(--goleadores-item-surface);
  }

  &:hover {
    background-color: var(--goleadores-primary-soft);
  }
`;

const PlayerCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  .info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    max-width: 100%;
  }

  .name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dorsal {
    font-size: 0.75rem;
    color: var(--goleadores-muted);
  }

  @media (max-width: 768px) {
    gap: 7px;

    .name {
      font-size: 0.78rem;
    }

    .dorsal {
      font-size: 0.68rem;
    }
  }

  @media (max-width: 380px) {
    gap: 5px;

    .name {
      font-size: 0.74rem;
    }
  }
`;

const AvatarCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--goleadores-border);
  background: ${({ $hasImage, theme }) =>
    $hasImage ? theme.bg2 : 'var(--goleadores-success-soft)'};
  color: var(--goleadores-success);
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;

    svg {
      width: 16px;
      height: 16px;
    }
  }

  @media (max-width: 380px) {
    width: 28px;
    height: 28px;
  }
`;

const TeamCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .tname {
    font-size: 0.85rem;
    color: var(--goleadores-muted);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 768px) {
    gap: 5px;

    img {
      width: 20px;
      height: 20px;
    }

    .tname {
      font-size: 0.74rem;
    }
  }

  @media (max-width: 380px) {
    gap: 4px;

    img {
      width: 18px;
      height: 18px;
    }

    .tname {
      font-size: 0.7rem;
    }
  }
`;

const GoalsSkeletonWrap = styled.div`
  display: flex;
  justify-content: center;
`;
