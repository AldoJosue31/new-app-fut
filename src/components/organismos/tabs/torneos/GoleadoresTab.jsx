import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { supabase } from '../../../../supabase/supabase.config';
import { v } from '../../../../styles/variables';
import { ContainerScroll } from '../../../atomos/ContainerScroll';
import { motion } from 'framer-motion';
import { BiLock, BiLockOpen } from "react-icons/bi";
import { RiImageLine } from "react-icons/ri"; 
import { DynamicTeamLogo } from "../../equipos/DynamicTeamLogo";
import GoleadoresExportModal from './subcomponents/GoleadoresExportModal';

export const GoleadoresTab = ({
  torneo = {},
  goleadores = [],
  onRefresh,
  isPublic = false
}) => {
  const [isPublicEnabled, setIsPublicEnabled] = useState(torneo?.is_goleadores_public || false);
  const [updating, setUpdating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    setIsPublicEnabled(torneo?.is_goleadores_public || false);
  }, [torneo?.is_goleadores_public]);

  const hasAnyPhoto = useMemo(() => {
    if (!Array.isArray(goleadores)) return false;
    return goleadores.some(j => j?.photo_url && String(j.photo_url).trim() !== '');
  }, [goleadores]);

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
    } finally { setUpdating(false); }
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

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <ExportButton onClick={() => setShowExportModal(true)} title="Exportar Tabla">
                <RiImageLine size={18}/>
                <span>Exportar</span>
            </ExportButton>
            <StatusIcon $active={isPublicEnabled}>
                {isPublicEnabled ? <BiLockOpen /> : <BiLock />}
            </StatusIcon>
          </div>
        </ControlPanel>
      )}

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
              {goleadores.map((jugador, index) => (
                <Tr key={jugador?.player_id ?? index}>
                  <RankTd><RankBadge $pos={index + 1}>{index + 1}</RankBadge></RankTd>
                  <Td>
                    <PlayerCell $hasPhoto={hasAnyPhoto}>
                      {hasAnyPhoto && <img src={jugador.photo_url || v.sinfoto} onError={(e) => { e.currentTarget.src = v.sinfoto; }} />}
                      <div className="info">
                        <span className="name">{jugador.first_name} {jugador.last_name}</span>
                        {jugador.dorsal && <span className="dorsal">#{jugador.dorsal}</span>}
                      </div>
                    </PlayerCell>
                  </Td>
                  <Td>
                    <TeamCell>
                      {jugador.team_logo ? <img src={jugador.team_logo} /> : <DynamicTeamLogo name={jugador.team_name} color={jugador.team_color} size="24px" />}
                      <span className="tname">{jugador.team_name}</span>
                    </TeamCell>
                  </Td>
                  <Td className="goals">{jugador.goals}</Td>
                </Tr>
              ))}
              {goleadores.length === 0 && (
                <tr><Td colSpan="4" style={{ textAlign: 'center', padding: 20, opacity: 0.6 }}>No hay goleadores registrados.</Td></tr>
              )}
            </tbody>
          </StyledTable>
        </TableScrollWrapper>
      </TableCard>

      <GoleadoresExportModal 
        isOpen={showExportModal} onClose={() => setShowExportModal(false)}
        goleadores={goleadores} torneo={torneo}
      />
    </Container>
  );
};

const Container = styled.div` width: 100%; display: flex; flex-direction: column; `;
const ControlPanel = styled.div` display: flex; justify-content: space-between; align-items: center; width: 98%; max-width: 900px; margin: 0 auto 15px auto; background: ${({ theme }) => theme.bg}; padding: 10px 20px; border-radius: 12px; border: 1px solid ${({ theme }) => theme.color2}; box-shadow: ${v.boxshadowGray}; `;
const ExportButton = styled.button` display: flex; align-items: center; gap: 8px; background: ${({theme}) => theme.bg2}; border: 1px solid ${({theme}) => theme.color2}; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: ${({theme}) => theme.text}; transition: all 0.2s; &:hover { background: ${({theme}) => theme.bg3}; transform: translateY(-2px); } @media (max-width: 600px) { span { display: none; } } `;
const ToggleContainer = styled.div` display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; .track { width: 48px; height: 26px; background-color: ${({ $active, theme }) => $active ? v.verde : theme.bg3}; border-radius: 20px; position: relative; transition: background-color 0.3s ease; border: 1px solid ${({ theme }) => theme.color2}; } .thumb { width: 22px; height: 22px; background-color: #fff; border-radius: 50%; position: absolute; top: 1px; left: 1px; transform: ${({ $active }) => $active ? 'translateX(22px)' : 'translateX(0)'}; transition: transform 0.3s; } .label { font-size: 0.9rem; font-weight: 600; color: ${({ theme }) => theme.text}; } `;
const StatusIcon = styled.div` font-size: 1.5rem; color: ${({ $active, theme }) => $active ? v.verde : theme.text}; opacity: ${({ $active }) => $active ? 1 : 0.5}; `;
const TableCard = styled.div` background-color: ${({ theme }) => theme.bg}; border-radius: 16px; margin: 0 auto; width: 98%; max-width: 900px; overflow: hidden; border: 1px solid ${({theme}) => theme.color2}; box-shadow: ${v.boxshadowGray}; `;
const TableScrollWrapper = styled(ContainerScroll)` max-height: 600px; overflow-y: auto; `;
const StyledTable = styled.table` width: 100%; border-collapse: collapse; `;
const Th = styled.th` background: ${({ theme }) => theme.bgtotal}; color: ${({ theme }) => theme.text}; padding: 12px; text-align: left; font-size: 0.85rem; position: sticky; top: 0; z-index: 10; &.goals { text-align: center; color: ${({ theme }) => theme.primary}; } `;
const ThRank = styled.th` width: 56px; padding: 12px 8px; text-align: center; background: ${({ theme }) => theme.bgtotal}; color: ${({ theme }) => theme.text}; position: sticky; top: 0; z-index: 11; `;
const Td = styled.td` padding: 10px 12px; border-bottom: 1px solid ${({ theme }) => theme.color2}; color: ${({ theme }) => theme.text}; font-size: 0.9rem; &.goals { text-align: center; font-weight: 800; color: ${({ theme }) => theme.primary}; font-size: 1.1rem; } `;
const RankTd = styled.td` width: 56px; padding: 8px 6px; text-align: center; `;
const RankBadge = styled.div` display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; font-weight: 800; color: white; box-shadow: 0 6px 14px rgba(0,0,0,0.35); transition: 0.18s; ${({ $pos }) => $pos === 1 ? 'background: linear-gradient(180deg,#ffd54a 0%, #ffb300 100%); color: rgba(0,0,0,0.85);' : $pos === 2 ? 'background: linear-gradient(180deg,#e6eaf0 0%, #c6ccd6 100%); color: rgba(0,0,0,0.85);' : $pos === 3 ? 'background: linear-gradient(180deg,#d7a17a 0%, #b97745 100%); color: rgba(0,0,0,0.85);' : 'background: transparent; color: inherit; border: 1px solid #ccc; width: 30px; height: 30px;'} `;
const Tr = styled.tr` &:nth-child(even) { background-color: ${({ theme }) => theme.bgAlpha}; } `;
const PlayerCell = styled.div` display: flex; align-items: center; gap: ${({ $hasPhoto }) => ($hasPhoto ? '10px' : '6px')}; img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; } .info { display: flex; flexDirection: column; } .name { font-weight: 600; } .dorsal { font-size: 0.75rem; opacity: 0.6; } `;
const TeamCell = styled.div` display: flex; align-items: center; gap: 8px; img { width: 24px; height: 24px; object-fit: contain; } .tname { font-size: 0.85rem; opacity: 0.8; } `;