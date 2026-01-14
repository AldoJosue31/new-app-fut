import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { v, Modal, BtnNormal } from "../../../../../index";
import { RiArrowLeftRightLine, RiTeamLine, RiCalendarEventLine } from "react-icons/ri";

export function IntercambioMatchModal({ isOpen, onClose, scheduledMatches, pendingCurrentJornada, futureMatches, onSwap }) {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedFutureMatchId, setSelectedFutureMatchId] = useState("");

  const teamsInJornada = useMemo(() => {
    const teams = [];
    const process = (m) => { if(m.local) teams.push(m.local); if(m.visitante) teams.push(m.visitante); };
    scheduledMatches.forEach(process);
    pendingCurrentJornada.forEach(process);
    return Array.from(new Map(teams.map(t => [t.id, t])).values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [scheduledMatches, pendingCurrentJornada]);

  const currentMatch = useMemo(() => {
    if (!selectedTeamId) return null;
    return [...scheduledMatches, ...pendingCurrentJornada].find(m => m.local.id == selectedTeamId || m.visitante.id == selectedTeamId);
  }, [selectedTeamId, scheduledMatches, pendingCurrentJornada]);

  const currentOpponent = useMemo(() => {
    if (!currentMatch) return null;
    return currentMatch.local.id == selectedTeamId ? currentMatch.visitante : currentMatch.local;
  }, [currentMatch, selectedTeamId]);

  const futureOptions = useMemo(() => {
    if (!selectedTeamId) return [];
    return futureMatches.filter(pm => pm.local.id == selectedTeamId || pm.visitante.id == selectedTeamId);
  }, [selectedTeamId, futureMatches]);

  const handleConfirm = () => {
    if (currentMatch && selectedFutureMatchId) {
      onSwap(currentMatch.id, selectedFutureMatchId);
      onClose();
      setSelectedTeamId("");
      setSelectedFutureMatchId("");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Intercambiar Rival/Jornada" width="550px">
      <Container>
        <label><RiTeamLine/> 1. Equipo que juega hoy:</label>
        <select value={selectedTeamId} onChange={(e) => { setSelectedTeamId(e.target.value); setSelectedFutureMatchId(""); }}>
          <option value="">Seleccionar equipo...</option>
          {teamsInJornada.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {currentMatch && currentOpponent && (
          <FadeIn>
            <OpponentCard>
              <span>Rival original para esta jornada:</span>
              <strong>{currentOpponent.name}</strong>
            </OpponentCard>
            <label><RiArrowLeftRightLine/> 2. ¿Con qué partido futuro intercambiar?</label>
            <select value={selectedFutureMatchId} onChange={(e) => setSelectedFutureMatchId(e.target.value)}>
              <option value="">Seleccionar rival futuro...</option>
              {futureOptions.map(fm => {
                const rivalFuturo = fm.local.id == selectedTeamId ? fm.visitante : fm.local;
                return <option key={fm.id} value={fm.id}>Vs {rivalFuturo.name} ({fm.originJornada})</option>
              })}
            </select>
          </FadeIn>
        )}

        {selectedFutureMatchId && (
          <FadeIn>
            <ResultBox>
              <RiCalendarEventLine />
              <p>El partido contra <strong>{currentOpponent.name}</strong> se moverá a la jornada futura, y jugarás contra el nuevo rival hoy.</p>
            </ResultBox>
          </FadeIn>
        )}

        <div className="actions">
          <BtnNormal titulo="Cancelar" funcion={onClose} />
          <BtnNormal titulo="Confirmar" bgcolor={v.colorPrincipal} funcion={handleConfirm} disabled={!selectedFutureMatchId} />
        </div>
      </Container>
    </Modal>
  );
}

const Container = styled.div` display: flex; flex-direction: column; gap: 15px; label { font-size: 0.85rem; font-weight: 700; color: ${v.colorPrincipal}; display: flex; align-items: center; gap: 5px; } select { padding: 12px; border-radius: 8px; background: ${({theme})=>theme.bg3}; color: ${({theme})=>theme.text}; border: 1px solid ${({theme})=>theme.bg4}; outline:none; } .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; } `;
const OpponentCard = styled.div` background: ${({theme})=>theme.bg4}60; padding: 15px; border-radius: 8px; margin-bottom: 10px; span { font-size: 0.75rem; opacity: 0.7; display: block; } strong { font-size: 1.1rem; color: ${v.colorPrincipal}; } `;
const ResultBox = styled.div` background: ${v.colorPrincipal}10; padding: 12px; border-radius: 8px; display: flex; gap: 10px; align-items: center; p { font-size: 0.8rem; margin: 0; line-height: 1.2; } `;
const FadeIn = styled.div` animation: fadeIn 0.3s ease-out; @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } `;