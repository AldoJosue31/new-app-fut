import React, { useMemo } from "react";
import styled from "styled-components";
import { Modal } from "../../../../organismos/Modal"; 
import { v } from "../../../../../styles/variables";
import { RiAlertFill, RiTimeLine, RiCalendarLine } from "react-icons/ri";
import { normalizeDate } from "../../../../../utils/matchValidation";

export const ConflictModal = ({ isOpen, onClose, conflicts }) => {
  const filteredConflicts = useMemo(() => {
    if (!conflicts) return [];
    return conflicts.filter(c => c.internal?.status !== 'Finalizado');
  }, [conflicts]);

  const hasConflicts = filteredConflicts.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conflictos de Horario Detectados" width="600px">
      <Container>
        <HeaderAlert>
            <RiAlertFill size={40} />
            <div>
                <h4>{hasConflicts ? "Conflicto de Cancha" : "Advertencia"}</h4>
                <p>El sistema detectó que la cancha ya está ocupada por otro partido en ese horario.</p>
            </div>
        </HeaderAlert>

        {hasConflicts && (
            <ConflictList>
                {filteredConflicts.map((conflict, index) => {
                    const myLocal = conflict.internal?.local?.name || conflict.internal?.local_name || "Tu Local";
                    const myVisita = conflict.internal?.visitante?.name || conflict.internal?.visitante_name || "Tu Visita";
                    const myTime = conflict.internal?.time || conflict.internal?.horaInicio || "--:--";
                    const myDate = normalizeDate(conflict.internal?.date || conflict.internal?.fecha) || "--";

                    const extLocal = (conflict.external?.local && conflict.external.local.name) || conflict.external?.local_name || conflict.external?.local || "Equipo A";
                    const extVisita = (conflict.external?.visitante && conflict.external.visitante.name) || conflict.external?.visitante_name || conflict.external?.visitante || "Equipo B";
                    const extDivision = conflict.external?.division_name || conflict.external?.division || "Otra División";
                    const extTime = conflict.external?.time || conflict.external?.horaInicio || "--:--";
                    const extDate = normalizeDate(conflict.external?.date || conflict.external?.fecha) || "--";

                    return (
                        <ConflictCard key={index}>
                            <div className="section internal">
                                <Label>Tú quieres programar:</Label>
                                <MatchInfo>
                                    <span className="teams">{myLocal} vs {myVisita}</span>
                                    <div className="meta">
                                        <span className="date"><RiCalendarLine/> {myDate}</span>
                                        <TimeBadge><RiTimeLine /> {myTime}</TimeBadge>
                                    </div>
                                </MatchInfo>
                            </div>
                            <Divider><span>OCUPADO POR</span></Divider>
                            <div className="section external">
                                <Label>Ya programado en {extDivision}:</Label>
                                <MatchInfo $isExternal>
                                    <span className="teams">{extLocal} vs {extVisita}</span>
                                    <div className="meta">
                                        <span className="date"><RiCalendarLine/> {extDate}</span>
                                        <TimeBadge $isExternal><RiTimeLine /> {extTime}</TimeBadge>
                                    </div>
                                </MatchInfo>
                            </div>
                        </ConflictCard>
                    );
                })}
            </ConflictList>
        )}
        <Footer>
            <Button onClick={onClose}>Entendido, cambiaré la hora</Button>
        </Footer>
      </Container>
    </Modal>
  );
};

// Styles
const Container = styled.div` display: flex; flex-direction: column; gap: 20px; `;
const HeaderAlert = styled.div` display: flex; align-items: center; gap: 15px; background-color: ${({theme}) => theme.bgtotal}; padding: 15px; border-radius: 10px; border-left: 5px solid #e74c3c; svg { color: #e74c3c; min-width: 40px; } h4 { margin: 0; font-size: 1.1rem; color: ${({theme}) => theme.text}; } p { margin: 5px 0 0; font-size: 0.9rem; opacity: 0.8; }`;
const ConflictList = styled.div` display: flex; flex-direction: column; gap: 15px; max-height: 400px; overflow-y: auto; padding-right: 5px; `;
const ConflictCard = styled.div` border: 1px solid ${({theme}) => theme.bg4}; border-radius: 12px; overflow: hidden; background: ${({theme}) => theme.bgcards}; padding: 12px; `;
const Label = styled.div` font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: ${({theme}) => theme.text}; opacity: 0.6; margin-bottom: 5px; `;
const MatchInfo = styled.div` display: flex; justify-content: space-between; align-items: center; .teams { font-weight: 600; font-size: 1rem; color: ${({theme, $isExternal}) => $isExternal ? theme.text : v.colorPrincipal}; } .meta { display: flex; gap: 10px; align-items: center; font-size: 0.85rem; .date { opacity: 0.7; display: flex; align-items: center; gap: 4px; } }`;
const TimeBadge = styled.div` display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 0.9rem; background: ${({ $isExternal }) => $isExternal ? "#e74c3c20" : "#2ecc7120"}; color: ${({ $isExternal }) => $isExternal ? "#e74c3c" : "#2ecc71"}; `;
const Divider = styled.div` display: flex; align-items: center; justify-content: center; padding: 5px 0; background: ${({theme}) => theme.bg3}; span { font-size: 0.7rem; font-weight: 800; letter-spacing: 1px; color: ${({theme}) => theme.text}; opacity: 0.5; }`;
const Footer = styled.div` display: flex; justify-content: flex-end; margin-top: 10px; `;
const Button = styled.button` background: ${({theme}) => theme.primary}; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; &:hover { opacity: 0.9; transform: translateY(-1px); }`;
