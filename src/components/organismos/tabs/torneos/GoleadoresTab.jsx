import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { supabase } from '../../../../supabase/supabase.config';
import { v } from '../../../../styles/variables';
import { ContainerScroll } from '../../../atomos/ContainerScroll';
import { BiLock, BiLockOpen } from "react-icons/bi";
import { RiImageLine } from "react-icons/ri";
import { FaUserCircle } from "react-icons/fa";
import { DynamicTeamLogo } from "../../equipos/DynamicTeamLogo";
import GoleadoresExportModal from './exports/goleadores/GoleadoresExportModal';
import { StandingsJornadaSelector } from './StandingsJornadaSelector';
import { getTopScorerEventsService } from '../../../../services/estadisticas';
import {
  getOfficialJornadaNumberForMatch,
  useTorneoStandingsLogic,
} from '../../../../hooks/useTorneoStandingsLogic';

const normalizeEventType = (eventType) =>
  String(eventType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const isOwnGoalEventType = (eventType) => {
  const normalized = normalizeEventType(eventType);
  return [
    'auto_gol',
    'autogol',
    'autogoal',
    'own_goal',
    'self_goal'
  ].includes(normalized);
};

const isGoalEventType = (eventType) => {
  const normalized = normalizeEventType(eventType);
  if (!normalized || isOwnGoalEventType(normalized)) return false;

  return [
    'goal',
    'goals',
    'gol',
    'goles'
  ].includes(normalized);
};

export const GoleadoresTab = ({
  torneo = {},
  goleadores = [],
  equipos = [],
  partidos = [],
  onRefresh,
  isPublic = false
}) => {
  const [isPublicEnabled, setIsPublicEnabled] = useState(torneo?.is_goleadores_public || false);
  const [updating, setUpdating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedJornadaView, setSelectedJornadaView] = useState('recent');
  const [scorerEvents, setScorerEvents] = useState([]);
  const [loadingScorerEvents, setLoadingScorerEvents] = useState(false);
  const [scorerEventsLoaded, setScorerEventsLoaded] = useState(false);

  const partidosSyncKey = useMemo(
    () => JSON.stringify((partidos || []).map((partido) => [
      partido?.id,
      partido?.status,
      partido?.goals1,
      partido?.goals2,
      partido?.updated_at || partido?.date || ''
    ])),
    [partidos]
  );

  useEffect(() => {
    setIsPublicEnabled(torneo?.is_goleadores_public || false);
  }, [torneo?.is_goleadores_public]);

  useEffect(() => {
    setSelectedJornadaView('recent');
  }, [partidosSyncKey, torneo?.id]);

  const {
    effectiveJornada,
    jornadasConfirmadasForDropdown,
    activeJornadaName,
    mergedJornadas,
    repositionMappings,
  } = useTorneoStandingsLogic({
    torneo,
    equipos,
    partidos,
    jornadasProp: [],
    reglas: {},
    selectedJornadaView
  });

  useEffect(() => {
    let mounted = true;

    const loadScorerEvents = async () => {
      if (!torneo?.id) {
        if (mounted) {
          setScorerEvents([]);
          setScorerEventsLoaded(true);
        }
        return;
      }

      try {
        setLoadingScorerEvents(true);
        const data = await getTopScorerEventsService({ tournamentId: torneo.id });
        if (mounted) {
          setScorerEvents(Array.isArray(data) ? data : []);
          setScorerEventsLoaded(true);
        }
      } catch (error) {
        console.error('Error loading scorer events:', error);
        if (mounted) {
          setScorerEvents([]);
          setScorerEventsLoaded(true);
        }
      } finally {
        if (mounted) {
          setLoadingScorerEvents(false);
        }
      }
    };

    setScorerEventsLoaded(false);
    loadScorerEvents();

    return () => {
      mounted = false;
    };
  }, [torneo?.id]);

  const selectedJornadaLimit = useMemo(() => {
    if (selectedJornadaView === 'recent') return effectiveJornada;
    const parsed = parseInt(selectedJornadaView, 10);
    return Number.isNaN(parsed) ? effectiveJornada : parsed;
  }, [selectedJornadaView, effectiveJornada]);

  const fallbackPlayersMap = useMemo(() => {
    const map = new Map();
    (goleadores || []).forEach((jugador) => {
      const key = jugador?.player_id ?? jugador?.id;
      if (key != null) {
        map.set(key, jugador);
      }
    });
    return map;
  }, [goleadores]);

  const teamsMap = useMemo(() => {
    const map = new Map();
    (equipos || []).forEach((equipo) => {
      map.set(Number(equipo.id), equipo);
    });
    return map;
  }, [equipos]);

  const computedGoleadores = useMemo(() => {
    if (!Array.isArray(scorerEvents) || scorerEvents.length === 0 || selectedJornadaLimit <= 0) {
      return [];
    }

    const statsMap = new Map();

    scorerEvents.forEach((event) => {
      if (!isGoalEventType(event?.event_type)) return;

      const matchData = event?.matches;
      const jornadaNumber = getOfficialJornadaNumberForMatch(
        matchData,
        mergedJornadas,
        repositionMappings
      );

      if (jornadaNumber <= 0 || jornadaNumber > selectedJornadaLimit) return;

      const player = event?.players;
      const playerId = player?.id ?? event?.player_id;
      if (!playerId) return;

      const fallbackPlayer = fallbackPlayersMap.get(playerId) || {};
      const teamId = Number(player?.team_id ?? fallbackPlayer?.team_id);
      const team = teamsMap.get(teamId) || {};

      if (!statsMap.has(playerId)) {
        statsMap.set(playerId, {
          player_id: playerId,
          first_name: player?.first_name || fallbackPlayer?.first_name || '',
          last_name: player?.last_name || fallbackPlayer?.last_name || '',
          dorsal: player?.dorsal || fallbackPlayer?.dorsal || '',
          photo_url: player?.photo_url || fallbackPlayer?.photo_url || '',
          team_id: teamId || fallbackPlayer?.team_id || null,
          team_name: team?.name || fallbackPlayer?.team_name || 'Sin equipo',
          team_logo: team?.logo_url || fallbackPlayer?.team_logo || null,
          team_color: team?.color || fallbackPlayer?.team_color || '#64748b',
          goals: 0
        });
      }

      statsMap.get(playerId).goals += 1;
    });

    return Array.from(statsMap.values()).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      const nameA = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [fallbackPlayersMap, mergedJornadas, repositionMappings, scorerEvents, selectedJornadaLimit, teamsMap]);

  const displayGoleadores = useMemo(() => {
    if (scorerEventsLoaded) {
      if (computedGoleadores.length > 0) return computedGoleadores;
      if (!scorerEvents.length && Array.isArray(goleadores) && goleadores.length > 0) {
        return goleadores;
      }
      return computedGoleadores;
    }
    return Array.isArray(goleadores) ? goleadores : [];
  }, [computedGoleadores, goleadores, scorerEvents, scorerEventsLoaded]);

  const handleTogglePublic = async () => {
    if (updating) return;
    setUpdating(true);
    const newState = !isPublicEnabled;
    try {
      const { error } = await supabase.from('tournaments').update({ is_goleadores_public: newState }).eq('id', torneo.id);
      if (error) throw error;
      setIsPublicEnabled(newState);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el estado.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Container>
      {!isPublic && (
        <ControlPanel>
          <ToggleContainer onClick={handleTogglePublic} $active={isPublicEnabled}>
            <div className="track"><div className="thumb" /></div>
            <span className="label">
              {updating ? "Guardando..." : (isPublicEnabled ? "Goleadores: PÚBLICO" : "Goleadores: PRIVADO")}
            </span>
          </ToggleContainer>

          <SelectorArea>
            <StandingsJornadaSelector
              selected={selectedJornadaView}
              onChange={setSelectedJornadaView}
              effectiveJornada={effectiveJornada}
              jornadasOptions={jornadasConfirmadasForDropdown}
            />
          </SelectorArea>

          <ActionsArea>
            <ExportButton onClick={() => setShowExportModal(true)} title="Exportar Tabla">
              <RiImageLine size={18} />
              <span>Exportar</span>
            </ExportButton>
            <StatusIcon $active={isPublicEnabled}>
              {isPublicEnabled ? <BiLockOpen /> : <BiLock />}
            </StatusIcon>
          </ActionsArea>
        </ControlPanel>
      )}

      <TableCard>
        <TableHeader>
          <span className="title">Tabla de goleo</span>
          <span className="subtitle">
            {loadingScorerEvents && !scorerEventsLoaded ? 'Actualizando goles...' : `Considerando: ${activeJornadaName}`}
          </span>
        </TableHeader>

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
              {displayGoleadores.map((jugador, index) => (
                <Tr key={jugador?.player_id ?? index}>
                  <RankTd><RankBadge $pos={index + 1}>{index + 1}</RankBadge></RankTd>
                  <Td>
                    <PlayerCell>
                      <PlayerAvatar>
                        {jugador?.photo_url ? (
                          <img
                            src={jugador.photo_url}
                            alt={`${jugador.first_name || ''} ${jugador.last_name || ''}`.trim() || 'Jugador'}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span className="fallback" style={{ display: jugador?.photo_url ? 'none' : 'flex' }}>
                          <FaUserCircle />
                        </span>
                      </PlayerAvatar>
                      <div className="info">
                        <span className="name">{jugador.first_name} {jugador.last_name}</span>
                        {jugador.dorsal && <span className="dorsal">#{jugador.dorsal}</span>}
                      </div>
                    </PlayerCell>
                  </Td>
                  <Td>
                    <TeamCell>
                      {jugador.team_logo ? <img src={jugador.team_logo} alt={jugador.team_name || 'Equipo'} /> : <DynamicTeamLogo name={jugador.team_name} color={jugador.team_color} size="24px" />}
                      <span className="tname">{jugador.team_name}</span>
                    </TeamCell>
                  </Td>
                  <Td className="goals">{jugador.goals}</Td>
                </Tr>
              ))}
              {displayGoleadores.length === 0 && (
                <tr><Td colSpan="4" style={{ textAlign: 'center', padding: 20, opacity: 0.6 }}>No hay goleadores registrados para esta vista.</Td></tr>
              )}
            </tbody>
          </StyledTable>
        </TableScrollWrapper>
      </TableCard>

      <GoleadoresExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        goleadores={displayGoleadores}
        torneo={torneo}
        activeJornadaName={activeJornadaName}
      />
    </Container>
  );
};

const Container = styled.div` width: 100%; display: flex; flex-direction: column; `;
const ControlPanel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 98%;
  max-width: 980px;
  margin: 0 auto 15px auto;
  background: ${({ theme }) => theme.bg};
  padding: 10px 15px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.color2};
  box-shadow: ${v.boxshadowGray};
  flex-wrap: wrap;
  gap: 10px;
`;
const SelectorArea = styled.div`
  width: 280px;
  max-width: 100%;
`;
const ActionsArea = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;
const ExportButton = styled.button` display: flex; align-items: center; gap: 8px; background: ${({theme}) => theme.bg2}; border: 1px solid ${({theme}) => theme.color2}; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: ${({theme}) => theme.text}; transition: all 0.2s; &:hover { background: ${({theme}) => theme.bg3}; transform: translateY(-2px); } @media (max-width: 600px) { span { display: none; } } `;
const ToggleContainer = styled.div` display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; .track { width: 48px; height: 26px; background-color: ${({ $active, theme }) => $active ? v.verde : theme.bg3}; border-radius: 20px; position: relative; transition: background-color 0.3s ease; border: 1px solid ${({ theme }) => theme.color2}; } .thumb { width: 22px; height: 22px; background-color: #fff; border-radius: 50%; position: absolute; top: 1px; left: 1px; transform: ${({ $active }) => $active ? 'translateX(22px)' : 'translateX(0)'}; transition: transform 0.3s; } .label { font-size: 0.9rem; font-weight: 600; color: ${({ theme }) => theme.text}; } @media (max-width: 600px) { .label { display: none; } } `;
const StatusIcon = styled.div` font-size: 1.5rem; color: ${({ $active, theme }) => $active ? v.verde : theme.text}; opacity: ${({ $active }) => $active ? 1 : 0.5}; `;
const TableCard = styled.div` background-color: ${({ theme }) => theme.bg}; border-radius: 16px; margin: 0 auto; width: 98%; max-width: 980px; overflow: hidden; border: 1px solid ${({theme}) => theme.color2}; box-shadow: ${v.boxshadowGray}; `;
const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.color2};
  background: ${({ theme }) => theme.bgAlpha};
  flex-wrap: wrap;

  .title {
    font-size: 0.95rem;
    font-weight: 700;
    color: ${({ theme }) => theme.text};
  }

  .subtitle {
    font-size: 0.82rem;
    font-weight: 600;
    color: ${({ theme }) => theme.text};
    opacity: 0.7;
  }
`;
const TableScrollWrapper = styled(ContainerScroll)` max-height: 600px; overflow-y: auto; `;
const StyledTable = styled.table` width: 100%; border-collapse: collapse; `;
const Th = styled.th` background: ${({ theme }) => theme.bgtotal}; color: ${({ theme }) => theme.text}; padding: 12px; text-align: left; font-size: 0.85rem; position: sticky; top: 0; z-index: 10; &.goals { text-align: center; color: ${({ theme }) => theme.primary}; } `;
const ThRank = styled.th` width: 56px; padding: 12px 8px; text-align: center; background: ${({ theme }) => theme.bgtotal}; color: ${({ theme }) => theme.text}; position: sticky; top: 0; z-index: 11; `;
const Td = styled.td` padding: 10px 12px; border-bottom: 1px solid ${({ theme }) => theme.color2}; color: ${({ theme }) => theme.text}; font-size: 0.9rem; &.goals { text-align: center; font-weight: 800; color: ${({ theme }) => theme.primary}; font-size: 1.1rem; } `;
const RankTd = styled.td` width: 56px; padding: 8px 6px; text-align: center; `;
const RankBadge = styled.div` display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; font-weight: 800; color: white; box-shadow: 0 6px 14px rgba(0,0,0,0.35); transition: 0.18s; ${({ $pos }) => $pos === 1 ? 'background: linear-gradient(180deg,#ffd54a 0%, #ffb300 100%); color: rgba(0,0,0,0.85);' : $pos === 2 ? 'background: linear-gradient(180deg,#e6eaf0 0%, #c6ccd6 100%); color: rgba(0,0,0,0.85);' : $pos === 3 ? 'background: linear-gradient(180deg,#d7a17a 0%, #b97745 100%); color: rgba(0,0,0,0.85);' : 'background: transparent; color: inherit; border: 1px solid #ccc; width: 30px; height: 30px;'} `;
const Tr = styled.tr` &:nth-child(even) { background-color: ${({ theme }) => theme.bgAlpha}; } `;
const PlayerCell = styled.div` display: flex; align-items: center; gap: 10px; .info { display: flex; flex-direction: column; } .name { font-weight: 600; } .dorsal { font-size: 0.75rem; opacity: 0.6; } `;
const PlayerAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ theme }) => theme.bg3};
  border: 1px solid ${({ theme }) => theme.color2};
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.text};
    opacity: 0.55;
    font-size: 1.35rem;
  }
`;
const TeamCell = styled.div` display: flex; align-items: center; gap: 8px; img { width: 24px; height: 24px; object-fit: contain; } .tname { font-size: 0.85rem; opacity: 0.8; } `;
