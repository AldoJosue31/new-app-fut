import React from "react";
import styled from "styled-components";
import { v } from "../../../../../index";
import { RiDeleteBinLine, RiTrophyLine, RiTimeLine } from "react-icons/ri";

export function ScheduledMatchRow({ 
    match, isConfirmed, onUpdateDate, onUpdateTime, onRemove, onOpenResult, onPostpone 
}) {
  
  const formatShortDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year.slice(-2)}`;
  };

  return (
    <Container $isConfirmed={isConfirmed}>
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

        <div className="settings">
            {isConfirmed ? (
                <div className="confirmed-actions">
                    <div className="datetime-display">
                        <span>{formatShortDate(match.date)}</span>
                        <small>{match.time}</small>
                    </div>
                    <div className="btns-row">
                        <button className="action-btn result" onClick={() => onOpenResult(match)}>
                            <RiTrophyLine /> {match.status === 'Finalizado' ? 'Editar' : 'Resultado'}
                        </button>
                        <button className="action-btn postpone" onClick={() => onPostpone(match)}>
                            <RiTimeLine />
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <input type="date" value={match.date} onChange={(e)=> onUpdateDate(e.target.value)} />
                    <input type="time" value={match.time} onChange={(e)=> onUpdateTime(e.target.value)} />
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
    .info { display: flex; gap: 15px; font-weight: 600; justify-content: center; align-items: center; 
        .team { display: flex; align-items: center; gap: 8px; flex:1; }
        .local { justify-content: flex-end; text-align: right; }
        .visit { justify-content: flex-start; }
        .score { font-size: 1.2rem; background: ${({theme})=>theme.bg3}; padding: 2px 8px; border-radius: 4px; }
    }
    .settings { display: flex; gap: 5px; 
        input { background: ${({theme})=>theme.bg3}; border: 1px solid ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; padding: 5px; border-radius: 4px; } 
        .del { background: #e74c3c20; color: #e74c3c; border: none; border-radius: 4px; cursor: pointer; padding: 5px 8px; } 
        .confirmed-actions { display: flex; align-items: center; gap: 15px;
            .datetime-display { display: flex; flex-direction: column; text-align: right; font-size: 0.85rem; opacity: 0.8; small{font-weight:700;} }
            .action-btn { border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: 600; font-size: 0.8rem;
                &.result { background: ${v.colorPrincipal}; color: white; }
                &.postpone { background: #f1c40f20; color: #f1c40f; }
            }
        }
    }
`;