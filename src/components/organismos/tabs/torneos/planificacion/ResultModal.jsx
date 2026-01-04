import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v, Modal, BtnNormal, Btnsave } from "../../../../../index";

export function ResultModal({ isOpen, onClose, match, onSave }) {
  const [goals, setGoals] = useState({ home: 0, away: 0 });

  useEffect(() => {
    if (match) {
        setGoals({ home: match.goals1 || 0, away: match.goals2 || 0 });
    }
  }, [match]);

  const handleSave = () => {
    onSave(match.id, goals.home, goals.away);
    onClose();
  };

  if (!match) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <ModalTitle>
            {match.local?.name} vs {match.visitante?.name}
        </ModalTitle>
        <ResultBody>
            <div className="team-score">
                <img src={match.local?.logo_url || v.iconofotovacia} alt="local"/>
                <span>{match.local?.name}</span>
                <input 
                    type="number" min="0" 
                    value={goals.home} onChange={(e)=>setGoals({...goals, home: e.target.value})} 
                />
            </div>
            <div className="vs-divider">-</div>
            <div className="team-score">
                <input 
                    type="number" min="0" 
                    value={goals.away} onChange={(e)=>setGoals({...goals, away: e.target.value})} 
                />
                <span>{match.visitante?.name}</span>
                <img src={match.visitante?.logo_url || v.iconofotovacia} alt="visita"/>
            </div>
        </ResultBody>
        <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'20px'}}>
            <BtnNormal titulo="Cancelar" funcion={onClose}/>
            <Btnsave titulo="Guardar" funcion={handleSave} bgcolor={v.colorPrincipal}/>
        </div>
    </Modal>
  );
}

const ModalTitle = styled.h3` margin-bottom: 20px; text-align: center; color: ${({theme})=>theme.text}; `;
const ResultBody = styled.div`
    display: flex; align-items: center; justify-content: center; gap: 20px; margin: 20px 0;
    .team-score { 
        display: flex; flex-direction: column; align-items: center; gap: 10px; width: 120px;
        img { width: 50px; height: 50px; object-fit: contain; }
        span { font-weight: 600; text-align: center; font-size: 0.9rem; }
        input { width: 60px; height: 50px; font-size: 1.5rem; text-align: center; border-radius: 10px; border: 1px solid ${({theme})=>theme.bg4}; background: ${({theme})=>theme.bg3}; color: ${({theme})=>theme.text}; }
    }
    .vs-divider { font-size: 2rem; font-weight: 300; opacity: 0.5; }
`;