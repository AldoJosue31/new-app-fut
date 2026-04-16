import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { supabase } from '../../../../supabase/supabase.config';
import { v } from '../../../../styles/variables';
import { ContainerScroll } from '../../../atomos/ContainerScroll';
import { BiLock, BiLockOpen } from 'react-icons/bi';
import { RiImageLine, RiUser3Line } from 'react-icons/ri';
import { DynamicTeamLogo } from '../../equipos/DynamicTeamLogo';
import GoleadoresExportModal from './exports/goleadores/GoleadoresExportModal';
import { StandingsJornadaSelector } from './StandingsJornadaSelector';
import { useTorneoGoleadoresLogic } from '../../../../hooks/useTorneoGoleadoresLogic';
import { Skeleton } from '../../../atomos/Skeleton';

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
      const { error } = await supabase
        .from('tournaments')
        .update({ is_goleadores_public: newState })
        .eq('id', torneo.id);

      if (error) throw error;
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
          <ToggleContainer onClick={handleTogglePublic} $active={isPublicEnabled}>
            <div className="track">
              <div className="thumb" />
            </div>
            <span className="label">
              {updating
                ? 'Guardando...'
                : isPublicEnabled
                  ? 'Goleadores: PUBLICO'
                  : 'Goleadores: PRIVADO'}
            </span>
          </ToggleContainer>

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

          <ControlsGroup>
            <ExportButton
              onClick={() => setShowExportModal(true)}
              title="Exportar tabla de goleo"
            >
              <RiImageLine size={18} />
              <span>Exportar</span>
            </ExportButton>
            <StatusIcon $active={isPublicEnabled}>
              {isPublicEnabled ? <BiLockOpen /> : <BiLock />}
            </StatusIcon>
          </ControlsGroup>
        </ControlPanel>
      )}

      <SummaryCard>
        {showSkeleton ? (
          <>
            <Skeleton width="180px" height="18px" radius="6px" />
            <Skeleton width="260px" height="16px" radius="6px" />
          </>
        ) : (
          <>
            <span className="title">Tabla de goleo</span>
            <span className="subtitle">
              {activeJornadaSummary}
              {activeJornadaName && activeJornadaName !== 'Sin iniciar'
                ? ` - ${activeJornadaName}`
                : ''}
            </span>
          </>
        )}
      </SummaryCard>

      <TableCard>
        <TableScrollWrapper $height="auto">
          <StyledTable>
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
                  <Tr key={`${jugador?.player_id ?? 'jugador'}-${index}`}>
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
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ControlPanel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 98%;
  max-width: 980px;
  margin: 0 auto;
  background: ${({ theme }) => theme.bg};
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.color2};
  box-shadow: ${v.boxshadowGray};
  gap: 10px;
  flex-wrap: wrap;
`;

const SelectorWrapper = styled.div`
  width: 100%;
  max-width: 320px;
  flex: 1;
  min-width: 220px;
`;

const ControlsGroup = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.bg2};
  border: 1px solid ${({ theme }) => theme.color2};
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.bg3};
    transform: translateY(-2px);
  }

  @media (max-width: 600px) {
    span {
      display: none;
    }
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;

  .track {
    width: 48px;
    height: 26px;
    background-color: ${({ $active, theme }) => ($active ? v.verde : theme.bg3)};
    border-radius: 20px;
    position: relative;
    transition: background-color 0.3s ease;
    border: 1px solid ${({ theme }) => theme.color2};
  }

  .thumb {
    width: 22px;
    height: 22px;
    background-color: #fff;
    border-radius: 50%;
    position: absolute;
    top: 1px;
    left: 1px;
    transform: ${({ $active }) =>
      $active ? 'translateX(22px)' : 'translateX(0)'};
    transition: transform 0.3s;
  }

  .label {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${({ theme }) => theme.text};
  }

  @media (max-width: 600px) {
    .label {
      display: none;
    }
  }
`;

const StatusIcon = styled.div`
  font-size: 1.5rem;
  color: ${({ $active, theme }) => ($active ? v.verde : theme.text)};
  opacity: ${({ $active }) => ($active ? 1 : 0.5)};
`;

const SummaryCard = styled.div`
  width: 98%;
  max-width: 980px;
  margin: 0 auto;
  padding: 12px 18px;
  border-radius: 14px;
  background: ${({ theme }) => theme.bg};
  border: 1px solid ${({ theme }) => theme.color2};
  box-shadow: ${v.boxshadowGray};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;

  .title {
    font-size: 1rem;
    font-weight: 800;
    color: ${({ theme }) => theme.text};
  }

  .subtitle {
    font-size: 0.85rem;
    font-weight: 600;
    color: ${({ theme }) => theme.text};
    opacity: 0.75;
  }
`;

const TableCard = styled.div`
  background-color: ${({ theme }) => theme.bg};
  border-radius: 16px;
  margin: 0 auto;
  width: 98%;
  max-width: 980px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color2};
  box-shadow: ${v.boxshadowGray};
`;

const TableScrollWrapper = styled(ContainerScroll)`
  max-height: 600px;
  overflow-y: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  padding: 12px;
  text-align: left;
  font-size: 0.85rem;
  position: sticky;
  top: 0;
  z-index: 10;

  &.goals {
    text-align: center;
    color: ${({ theme }) => theme.primary};
  }
`;

const ThRank = styled.th`
  width: 56px;
  padding: 12px 8px;
  text-align: center;
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  position: sticky;
  top: 0;
  z-index: 11;
`;

const Td = styled.td`
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color2};
  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;

  &.goals {
    text-align: center;
    font-weight: 800;
    color: ${({ theme }) => theme.primary};
    font-size: 1.1rem;
  }
`;

const RankTd = styled.td`
  width: 56px;
  padding: 8px 6px;
  text-align: center;
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
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
  transition: 0.18s;
  ${({ $pos }) =>
    $pos === 1
      ? 'background: linear-gradient(180deg,#ffd54a 0%, #ffb300 100%); color: rgba(0,0,0,0.85);'
      : $pos === 2
        ? 'background: linear-gradient(180deg,#e6eaf0 0%, #c6ccd6 100%); color: rgba(0,0,0,0.85);'
        : $pos === 3
          ? 'background: linear-gradient(180deg,#d7a17a 0%, #b97745 100%); color: rgba(0,0,0,0.85);'
          : 'background: transparent; color: inherit; border: 1px solid #ccc; width: 30px; height: 30px;'}
`;

const Tr = styled.tr`
  &:nth-child(even) {
    background-color: ${({ theme }) => theme.bgAlpha};
  }
`;

const PlayerCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  .info {
    display: flex;
    flex-direction: column;
  }

  .name {
    font-weight: 600;
  }

  .dorsal {
    font-size: 0.75rem;
    opacity: 0.6;
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
  border: 1px solid ${({ theme }) => theme.color2};
  background: ${({ $hasImage, theme }) =>
    $hasImage ? theme.bg2 : `${v.verde}18`};
  color: ${v.verde};
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const TeamCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .tname {
    font-size: 0.85rem;
    opacity: 0.8;
  }
`;

const GoalsSkeletonWrap = styled.div`
  display: flex;
  justify-content: center;
`;
