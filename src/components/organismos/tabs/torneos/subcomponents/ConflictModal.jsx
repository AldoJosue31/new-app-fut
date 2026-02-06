import React, { useMemo } from "react";
import styled from "styled-components";
import { Modal } from "../../../../organismos/Modal"; 
import { v } from "../../../../../styles/variables";
import { RiAlertFill, RiTimeLine, RiCalendarLine } from "react-icons/ri";

export const ConflictModal = ({ isOpen, onClose, conflicts }) => {

  // --- MODIFICACIÓN: FILTRADO DE CONFLICTOS ---
  // Filtramos los conflictos para excluir aquellos donde el partido interno
  // ya está 'Finalizado'. Así evitamos alertas por partidos históricos 
  // que ya se jugaron y no deberían impedir la planificación actual.
  const filteredConflicts = useMemo(() => {
    if (!conflicts) return [];
    return conflicts.filter(conflict => {
        const status = conflict.internal?.status;
        // Si el partido ya se jugó (Finalizado), ignoramos el conflicto
        if (status === 'Finalizado') return false; 
        return true;
    });
  }, [conflicts]);

  // Si después de filtrar no hay conflictos reales, y el modal está abierto,
  // visualmente no mostramos lista (o el padre debería encargarse de no abrirlo).
  const hasConflicts = filteredConflicts.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conflictos de Horario Detectados" width="600px">
      <Container>
        <HeaderAlert>
            <RiAlertFill size={40} />
            <div>
                {/* Cambiamos el texto ligeramente para reflejar que hay advertencias activas */}
                <h4>{hasConflicts ? "No se puede confirmar la jornada" : "Conflictos resueltos o ignorados"}</h4>
                <p>
                    {hasConflicts 
                        ? "Se han detectado cruces de horario con partidos de otras divisiones o torneos pendientes."
                        : "Los conflictos detectados pertenecen a partidos ya finalizados y no afectan la planificación actual."
                    }
                </p>
            </div>
        </HeaderAlert>

        {hasConflicts && (
            <ConflictList>
                {filteredConflicts.map((conflict, index) => {
                    // EXTRACCIÓN SEGURA DE DATOS
                    
                    // 1. Partido Interno (el tuyo): 'local' suele ser un objeto con { name: ... }
                    const myLocal = conflict.internal.local?.name || "Tu Local";
                    const myVisita = conflict.internal.visitante?.name || "Tu Visita";
                    const myTime = conflict.internal.time;

                    // 2. Partido Externo (el choque): Viene del servicio
                    const extLocal = conflict.external.local || conflict.external.local_name || "Equipo A";
                    const extVisita = conflict.external.visitante || conflict.external.visitante_name || "Equipo B";
                    const extDivision = conflict.external.division_name || conflict.external.divisionName || "Otra División";
                    const extTime = conflict.external.time;
                    const extDate = conflict.external.date;

                    return (
                        <ConflictCard key={index}>
                            <div className="section internal">
                                <Label>Tu Partido (Intentando programar)</Label>
                                <MatchInfo>
                                    <span className="teams">
                                        {myLocal} vs {myVisita}
                                    </span>
                                    <TimeBadge>
                                        <RiTimeLine /> {myTime}
                                    </TimeBadge>
                                </MatchInfo>
                            </div>
                            
                            <Divider>
                                <span>CHOCA CON</span>
                            </Divider>

                            <div className="section external">
                                <Label>Partido Existente ({extDivision})</Label>
                                <MatchInfo $isExternal>
                                    <span className="teams">
                                        {extLocal} vs {extVisita}
                                    </span>
                                    <div className="meta">
                                        <span className="date"><RiCalendarLine/> {extDate}</span>
                                        <TimeBadge $isExternal>
                                            <RiTimeLine /> {extTime}
                                        </TimeBadge>
                                    </div>
                                </MatchInfo>
                                <Reason>
                                    El horario se solapa considerando la duración del partido ({conflict.duration} min).
                                </Reason>
                            </div>
                        </ConflictCard>
                    );
                })}
            </ConflictList>
        )}

        <Footer>
            <Button onClick={onClose}>
                {hasConflicts ? "Entendido, revisaré los horarios" : "Cerrar y Continuar"}
            </Button>
        </Footer>
      </Container>
    </Modal>
  );
};

// --- STYLES (Sin cambios) ---
const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const HeaderAlert = styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
    background-color: ${({theme}) => theme.bgtotal};
    padding: 15px;
    border-radius: 10px;
    border-left: 5px solid #e74c3c;
    
    svg { color: #e74c3c; min-width: 40px; }
    h4 { margin: 0; font-size: 1.1rem; color: ${({theme}) => theme.text}; }
    p { margin: 5px 0 0; font-size: 0.9rem; opacity: 0.8; }
`;

const ConflictList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 15px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 5px;
`;

const ConflictCard = styled.div`
    border: 1px solid ${({theme}) => theme.bg4};
    border-radius: 12px;
    overflow: hidden;
    background: ${({theme}) => theme.bgcards};
`;

const Label = styled.div`
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: ${({theme}) => theme.text};
    opacity: 0.6;
    margin-bottom: 5px;
`;

const MatchInfo = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .teams {
        font-weight: 600;
        font-size: 1rem;
        color: ${({theme, $isExternal}) => $isExternal ? theme.text : v.colorPrincipal};
    }

    .meta {
        display: flex;
        gap: 10px;
        align-items: center;
        font-size: 0.85rem;
    }
`;

const TimeBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 0.9rem;
    background: ${({ $isExternal }) => $isExternal ? "#e74c3c20" : "#2ecc7120"};
    color: ${({ $isExternal }) => $isExternal ? "#e74c3c" : "#2ecc71"};
`;

const Divider = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px 0;
    background: ${({theme}) => theme.bg3};
    
    span {
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 1px;
        color: ${({theme}) => theme.text};
        opacity: 0.5;
    }
`;

const Reason = styled.div`
    margin-top: 8px;
    font-size: 0.8rem;
    color: #e74c3c;
    font-style: italic;
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
`;

const Button = styled.button`
    background: ${({theme}) => theme.primary};
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
    &:hover { opacity: 0.9; transform: translateY(-1px); }
`;