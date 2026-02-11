import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { supabase } from '../../../../supabase/supabase.config';
import { v } from '../../../../styles/variables';
import { ContainerScroll } from '../../../atomos/ContainerScroll';
import { motion } from 'framer-motion';
import { BiLock, BiLockOpen } from "react-icons/bi";

export const GoleadoresTab = ({
    torneo = {},
    goleadores = [],
    onRefresh,
    isPublic = false
}) => {

    const [isPublicEnabled, setIsPublicEnabled] = useState(torneo?.is_goleadores_public || false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        setIsPublicEnabled(torneo?.is_goleadores_public || false);
    }, [torneo?.is_goleadores_public]);

    // --- Nuevo: revisar si al menos 1 jugador tiene foto ---
    const hasAnyPhoto = useMemo(() => {
        if (!Array.isArray(goleadores)) return false;
        return goleadores.some(j => j?.photo_url && String(j.photo_url).trim() !== '');
    }, [goleadores]);

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
            console.error("Error updating goleadores visibility:", error);
            alert("No se pudo actualizar el estado.");
        } finally {
            setUpdating(false);
        }
    };

    const rowVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: (i) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.03 }
        })
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
                                ? "Guardando..."
                                : (isPublicEnabled
                                    ? "Goleadores: PÚBLICO"
                                    : "Goleadores: PRIVADO")}
                        </span>
                    </ToggleContainer>

                    <StatusIcon $active={isPublicEnabled}>
                        {isPublicEnabled ? <BiLockOpen /> : <BiLock />}
                    </StatusIcon>
                </ControlPanel>
            )}

            <TableCard>
                <TableScrollWrapper $height="auto">
                    <StyledTable>
                        <thead>
                            <tr>
                                <Th>#</Th>
                                <Th>Jugador</Th>
                                <Th>Equipo</Th>
                                <Th className="goals">Goles</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {goleadores.map((jugador, index) => {
                                const RowComponent = isPublic ? MotionTr : Tr;
                                const key = jugador?.player_id ?? index;
                                return (
                                    <RowComponent
                                        key={key}
                                        variants={isPublic ? rowVariants : {}}
                                        initial={isPublic ? "hidden" : undefined}
                                        animate={isPublic ? "visible" : undefined}
                                        custom={index}
                                    >
                                        <Td className="rank">{index + 1}</Td>
                                        <Td>
                                            <PlayerCell $hasPhoto={hasAnyPhoto}>
                                                {/* Solo mostramos la img si HAY al menos una foto en la lista.
                                                    Si no hay ninguna, no renderizamos la columna/espacio. */}
                                                {hasAnyPhoto && (
                                                    <img
                                                        src={jugador.photo_url || v.sinfoto}
                                                        onError={(e) => { e.currentTarget.src = v.sinfoto; }}
                                                        alt={`${jugador.first_name} ${jugador.last_name}`}
                                                    />
                                                )}
                                                <div className="info">
                                                    <span className="name">{jugador.first_name} {jugador.last_name}</span>
                                                    {jugador.dorsal && <span className="dorsal">#{jugador.dorsal}</span>}
                                                </div>
                                            </PlayerCell>
                                        </Td>
                                        <Td>
                                            <TeamCell>
                                                <img
                                                    src={jugador.team_logo || v.logoGenerico}
                                                    onError={(e) => { e.currentTarget.src = v.logoGenerico; }}
                                                    alt={jugador.team_name}
                                                />
                                                <span className="tname">{jugador.team_name}</span>
                                            </TeamCell>
                                        </Td>
                                        <Td className="goals">{jugador.goals}</Td>
                                    </RowComponent>
                                );
                            })}

                            {goleadores.length === 0 && (
                                <tr>
                                    <Td colSpan="4" style={{ textAlign: 'center', padding: 20, opacity: 0.6 }}>
                                        No hay goleadores registrados.
                                    </Td>
                                </tr>
                            )}
                        </tbody>
                    </StyledTable>
                </TableScrollWrapper>
            </TableCard>
        </Container>
    );
};

// --- STYLED COMPONENTS ---
const Container = styled.div` width: 100%; display: flex; flex-direction: column; `;
const ControlPanel = styled.div` display: flex; justify-content: space-between; align-items: center; width: 98%; max-width: 900px; margin: 0 auto 15px auto; background: ${({ theme }) => theme.bg}; padding: 10px 20px; border-radius: 12px; border: 1px solid ${({ theme }) => theme.color2}; box-shadow: ${v.boxshadowGray}; `;
const ToggleContainer = styled.div` display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; .track { width: 48px; height: 26px; background-color: ${({ $active, theme }) => $active ? v.verde : theme.bg3}; border-radius: 20px; position: relative; transition: background-color 0.3s ease; border: 1px solid ${({ theme }) => theme.color2}; } .thumb { width: 22px; height: 22px; background-color: #fff; border-radius: 50%; position: absolute; top: 1px; left: 1px; transform: ${({ $active }) => $active ? 'translateX(22px)' : 'translateX(0)'}; transition: transform 0.3s; } .label { font-size: 0.9rem; font-weight: 600; color: ${({ theme }) => theme.text}; } `;
const StatusIcon = styled.div` font-size: 1.5rem; color: ${({ $active, theme }) => $active ? v.verde : theme.text}; opacity: ${({ $active }) => $active ? 1 : 0.5}; `;
const TableCard = styled.div` background-color: ${({ theme }) => theme.bg}; border-radius: 16px; margin: 0 auto; width: 98%; max-width: 900px; overflow: hidden; border: 1px solid ${({theme})=>theme.color2}; box-shadow: ${v.boxshadowGray}; `;
const TableScrollWrapper = styled(ContainerScroll)` max-height: 600px; overflow-y: auto; `;
const StyledTable = styled.table` width: 100%; border-collapse: collapse; `;
const Th = styled.th` background: ${({ theme }) => theme.bgtotal}; color: ${({ theme }) => theme.text}; padding: 12px; text-align: left; font-size: 0.85rem; position: sticky; top: 0; z-index: 10; &.goals { text-align: center; color: ${({ theme }) => theme.primary}; } `;
const Td = styled.td` padding: 10px 12px; border-bottom: 1px solid ${({ theme }) => theme.color2}; color: ${({ theme }) => theme.text}; font-size: 0.9rem; &.rank { text-align: center; font-weight: bold; opacity: 0.6; } &.goals { text-align: center; font-weight: 800; color: ${({ theme }) => theme.primary}; font-size: 1.1rem; } `;
const Tr = styled.tr` &:nth-child(even) { background-color: ${({ theme }) => theme.bgAlpha}; } `;
const MotionTr = motion(Tr);

// Ajuste en PlayerCell: si no hay foto, el gap se reduce automáticamente
const PlayerCell = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ $hasPhoto }) => $hasPhoto ? '10px' : '6px'};
  img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    background: ${({theme})=>theme.bg3};
  }
  .info { display: flex; flex-direction: column; }
  .name { font-weight: 600; }
  .dorsal { font-size: 0.75rem; opacity: 0.6; }
`;
const TeamCell = styled.div` display: flex; align-items: center; gap: 8px; img { width: 24px; height: 24px; object-fit: contain; } .tname { font-size: 0.85rem; opacity: 0.8; } `;
