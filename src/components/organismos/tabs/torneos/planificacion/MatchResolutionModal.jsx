// src/components/organismos/tabs/torneos/planificacion/MatchResolutionModal.jsx
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { Modal } from "../../../../../components/organismos/Modal"; 

export function MatchResolutionModal({ isOpen, onClose, match, onResolve }) {
  const [selectedOption, setSelectedOption] = useState('pendiente');

  useEffect(() => {
    if (isOpen && match?.resolution) {
      if (match.resolution.type === 'pendiente') setSelectedOption('pendiente');
      else if (match.resolution.goals1 > match.resolution.goals2) setSelectedOption('default_local');
      else setSelectedOption('default_visitante');
    } else {
      setSelectedOption('pendiente');
    }
  }, [isOpen, match]);

  if (!match) return null;

  const handleConfirm = () => {
    if (selectedOption === 'pendiente') {
      onResolve({ type: 'pendiente' });
    } else if (selectedOption === 'default_local') {
      onResolve({ type: 'default', goals1: 3, goals2: 0, winnerName: match.local?.name });
    } else if (selectedOption === 'default_visitante') {
      onResolve({ type: 'default', goals1: 0, goals2: 3, winnerName: match.visitante?.name });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Definir Partido Sin Asignar" width="450px">
      <Content>
        <p className="subtitle">Selecciona cómo deseas definir este partido antes de confirmar la jornada:</p>
        <div className="match-teams">
          <span className="team">{match.local?.name || "Local"}</span>
          <span className="vs">VS</span>
          <span className="team">{match.visitante?.name || "Visitante"}</span>
        </div>

        <OptionsGrid>
          <OptionCard $active={selectedOption === 'pendiente'} onClick={() => setSelectedOption('pendiente')}>
            <div className="radio">{selectedOption === 'pendiente' && <div className="dot"/>}</div>
            <div className="info">
                <span>Dejar Pendiente</span>
                <small>Se programará para otra fecha en el futuro.</small>
            </div>
          </OptionCard>

          <OptionCard $active={selectedOption === 'default_local'} onClick={() => setSelectedOption('default_local')}>
            <div className="radio">{selectedOption === 'default_local' && <div className="dot"/>}</div>
            <div className="info">
                <span>Victoria Local (Default)</span>
                <small>Gana {match.local?.name} (3 - 0)</small>
            </div>
          </OptionCard>

          <OptionCard $active={selectedOption === 'default_visitante'} onClick={() => setSelectedOption('default_visitante')}>
            <div className="radio">{selectedOption === 'default_visitante' && <div className="dot"/>}</div>
            <div className="info">
                <span>Victoria Visitante (Default)</span>
                <small>Gana {match.visitante?.name} (0 - 3)</small>
            </div>
          </OptionCard>
        </OptionsGrid>

        <Actions>
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="btn-confirmar" onClick={handleConfirm}>Aplicar Decisión</button>
        </Actions>
      </Content>
    </Modal>
  );
}

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px;

  .subtitle {
    color: ${({ theme }) => theme.text2};
    font-size: 0.9rem;
    margin: 0;
  }

  .match-teams {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    background: ${({ theme }) => theme.bg4};
    padding: 15px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 1.1rem;

    .team { color: ${({ theme }) => theme.text}; text-align: center; flex: 1; }
    .vs { color: #e74c3c; font-size: 0.9rem; }
  }
`;

const OptionsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const OptionCard = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border: 2px solid ${({ $active, theme }) => $active ? v.colorPrincipal : theme.bg4};
  background: ${({ $active, theme }) => $active ? v.colorPrincipal + '15' : theme.bg2};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { border-color: ${v.colorPrincipal}; }

  .radio {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid ${({ $active }) => $active ? v.colorPrincipal : '#ccc'};
    display: flex;
    align-items: center;
    justify-content: center;

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${v.colorPrincipal};
    }
  }

  .info {
    display: flex;
    flex-direction: column;
    span { font-weight: 700; color: ${({ theme }) => theme.text}; }
    small { color: ${({ theme }) => theme.text2}; font-size: 0.8rem; }
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;

  button {
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancelar {
    background: transparent;
    border: 1px solid ${({ theme }) => theme.bg4};
    color: ${({ theme }) => theme.text};
    &:hover { background: ${({ theme }) => theme.bg4}; }
  }

  .btn-confirmar {
    background: ${v.colorPrincipal};
    border: none;
    color: white;
    &:hover { opacity: 0.9; }
  }
`;