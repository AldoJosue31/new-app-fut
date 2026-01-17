import React from "react";
import styled from "styled-components";
import { v } from "../../../../../index";
import { RiDeleteBinLine, RiTrophyLine, RiTimeLine } from "react-icons/ri";
import { Device } from "../../../../../styles/breakpoints";

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
                <span className="name">{match.local.name}</span>
                {isConfirmed && match.status === 'Finalizado' && <span className="score">{match.goals1}</span>}
            </div>
            <span className="vs">VS</span>
            <div className="team visit">
                {isConfirmed && match.status === 'Finalizado' && <span className="score">{match.goals2}</span>}
                <span className="name">{match.visitante.name}</span>
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
                            Aplazar
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <input type="date" className="input-date" value={match.date} onChange={(e)=> onUpdateDate(e.target.value)} />
                    <input type="time" className="input-time" value={match.time} onChange={(e)=> onUpdateTime(e.target.value)} />
                    <button className="del" onClick={onRemove}><RiDeleteBinLine/></button>
                </>
            )}
        </div>
    </Container>
  );
}

const Container = styled.div`
    display: flex;
    flex-direction: column; /* Móvil: Columna */
    gap: 12px;
    background: ${({theme})=>theme.bgtotal}; 
    padding: 12px; 
    border-radius: 8px; 
    border: 1px solid ${({theme, $isConfirmed})=> $isConfirmed ? '#2ecc7140' : theme.bg4}; 
    width: 100%;
    
    /* Desktop: Grid horizontal */
    @media ${Device.tablet} {
        display: grid; 
        grid-template-columns: 1fr auto; 
        align-items: center;
        gap: 10px;
        padding: 10px;
    }

    .info { 
        display: flex; 
        gap: 10px; 
        font-weight: 600; 
        justify-content: space-between; 
        align-items: center; 
        width: 100%;

        .team { display: flex; align-items: center; gap: 8px; flex:1; overflow: hidden; }
        .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.9rem;}
        
        .local { justify-content: flex-start; text-align: left; order: 1; }
        .visit { justify-content: flex-end; text-align: right; order: 3; }
        .vs { order: 2; font-size: 0.8rem; opacity: 0.6; }
        
        @media ${Device.tablet} {
            justify-content: center;
            .local { justify-content: flex-end; text-align: right; }
            .visit { justify-content: flex-start; text-align: left; }
        }

        .score { font-size: 1.1rem; background: ${({theme})=>theme.bg3}; padding: 2px 8px; border-radius: 4px; }
    }

    .settings { 
        display: flex; 
        gap: 8px; 
        width: 100%;
        justify-content: space-between;
        
        @media ${Device.tablet} {
            width: auto;
            justify-content: flex-end;
        }

        input { 
            background: ${({theme})=>theme.bg3}; 
            border: 1px solid ${({theme})=>theme.bg4}; 
            color: ${({theme})=>theme.text}; 
            padding: 8px; /* Más padding para touch */
            border-radius: 6px; 
            flex: 1; /* Inputs ocupan espacio disponible en móvil */
            font-size: 0.9rem;
            
            @media ${Device.tablet} {
                padding: 5px;
                flex: none;
                width: auto;
                font-size: 1rem;
            }
        } 
        
        .del { 
            background: #e74c3c20; 
            color: #e74c3c; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            padding: 8px 12px;
            display: flex; align-items: center; justify-content: center;
        } 

        .confirmed-actions { 
            display: flex; 
            align-items: center; 
            gap: 10px;
            width: 100%;
            flex-direction: column; /* Botones abajo en móvil muy pequeño */
            
            @media (min-width: 450px) {
                flex-direction: row;
                justify-content: space-between;
            }

            @media ${Device.tablet} {
                width: auto;
                gap: 15px;
            }

            .datetime-display { 
                display: flex; 
                flex-direction: row; 
                gap: 10px;
                align-items: center;
                font-size: 0.85rem; 
                opacity: 0.8; 
                width: 100%;
                justify-content: center;
                background: ${({theme})=>theme.bg3};
                padding: 5px;
                border-radius: 6px;

                @media ${Device.tablet} {
                    background: transparent;
                    padding: 0;
                    flex-direction: column;
                    align-items: flex-end;
                    width: auto;
                }
                small{font-weight:700;} 
            }

            .btns-row {
                display: flex;
                gap: 5px;
                width: 100%;
                
                @media ${Device.tablet} {
                    width: auto;
                }
            }

            .action-btn { 
                border: none; 
                padding: 8px 12px; 
                border-radius: 6px; 
                cursor: pointer; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                gap: 5px; 
                font-weight: 600; 
                font-size: 0.8rem;
                flex: 1;

                @media ${Device.tablet} {
                    padding: 6px 12px;
                    flex: none;
                }

                &.result { background: ${v.colorPrincipal}; color: white; }
                &.postpone { background: #f1c40f20; color: #f1c40f; }
            }
        }
    }
`;