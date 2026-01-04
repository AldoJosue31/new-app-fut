import React from "react";
import styled from "styled-components";
import { v } from "../../../../../index";
import { RiDeleteBinLine, RiTrophyLine, RiTimeLine } from "react-icons/ri";

export function ScheduledMatchRow({ 
    match, 
    isConfirmed, 
    onUpdateDate, 
    onUpdateTime, 
    onRemove, 
    onOpenResult, 
    onPostpone 
}) {
  return (
    <Container $isConfirmed={isConfirmed}>
        {/* EQUIPOS Y SCORE */}
        <div className="info">
            <div className="team local">
                <span>{match.local.name}</span>
                {isConfirmed && match.status === 'Finalizado' && <span className="score">{match.goals1}</span>}
            </div>
            <span className="vs">VS</span>
            <div className="team visit">
                {isConfirmed && match.status === 'Finalizado' && <span className="score">{match.goals2}</span>}
                <span>{match.visitante.name}</span>
            </div>
        </div>

        {/* CONFIGURACIÓN / ACCIONES */}
        <div className="settings">
            {isConfirmed ? (
                // VISTA CONFIRMADA
                <div className="confirmed-actions">
                    <div className="datetime-display">
                        <span>{match.date}</span>
                        <small>{match.time}</small>
                    </div>
                    
                    <div className="btns-row">
                        <button 
                            className="action-btn result" 
                            onClick={() => onOpenResult(match)}
                            title="Registrar Resultado"
                        >
                            <RiTrophyLine /> {match.status === 'Finalizado' ? 'Editar' : 'Resultado'}
                        </button>
                        
                        <button 
                            className="action-btn postpone" 
                            onClick={() => onPostpone(match)}
                            title="Posponer (Mover a pendientes)"
                        >
                            <RiTimeLine />
                        </button>
                    </div>
                </div>
            ) : (
                // VISTA EDICIÓN (BORRADOR)
                <>
                    <input 
                        type="date" 
                        value={match.date} 
                        onChange={(e)=> onUpdateDate(e.target.value)}
                    />
                    <input 
                        type="time" 
                        value={match.time} 
                        onChange={(e)=> onUpdateTime(e.target.value)}
                    />
                    <button className="del" onClick={onRemove}><RiDeleteBinLine/></button>
                </>
            )}
        </div>
    </Container>
  );
}

const Container = styled.div`
    display: grid; grid-template-columns: 1fr auto; gap: 10px; 
    background: ${({theme})=>theme.bgtotal}; padding: 10px; border-radius: 8px; 
    border: 1px solid ${({theme, $isConfirmed})=> $isConfirmed ? '#2ecc7140' : theme.bg4}; 
    align-items: center;

    .info { 
        display: flex; gap: 15px; font-weight: 600; justify-content: center; align-items: center; 
        .team { display: flex; align-items: center; gap: 8px; flex:1; }
        .local { justify-content: flex-end; text-align: right; }
        .visit { justify-content: flex-start; }
        .score { font-size: 1.2rem; background: ${({theme})=>theme.bg3}; padding: 2px 8px; border-radius: 4px; }
        .vs { opacity:0.5; font-size:0.8rem; } 
    }

    .settings { 
        display: flex; gap: 5px; 
        input { background: ${({theme})=>theme.bg3}; border: 1px solid ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; padding: 5px; border-radius: 4px; } 
        .del { background: #e74c3c20; color: #e74c3c; border: none; border-radius: 4px; cursor: pointer; padding: 5px 8px; transition:0.2s; &:hover{background:#e74c3c40;} } 
        
        .confirmed-actions {
            display: flex; align-items: center; gap: 15px;
            .datetime-display { display: flex; flex-direction: column; text-align: right; font-size: 0.85rem; opacity: 0.8; small{font-weight:700;} }
            .btns-row { display: flex; gap: 5px; }
            .action-btn {
                border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: 600; font-size: 0.8rem; transition: 0.2s;
                &.result { background: ${v.colorPrincipal}; color: white; &:hover{opacity:0.9;} }
                &.postpone { background: #f1c40f20; color: #f1c40f; &:hover{background:#f1c40f40;} }
            }
        }
    }
    @media(max-width: 600px) { grid-template-columns: 1fr; .settings{justify-content: center; margin-top: 10px;} }
`;