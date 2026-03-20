// src/components/organismos/tabs/torneos/planificacion/result_modal_components/ConfirmResultOverlay.jsx
import React from "react";
import styled from "styled-components";
import { v, BtnNormal, Btnsave } from "../../../../../../index";
import { RiCheckDoubleLine } from "react-icons/ri";
import { DynamicTeamLogo } from "../../../../equipos/DynamicTeamLogo";

export const ConfirmResultOverlay = ({ 
    match, isOnlyDateUpdate, isWalkover, matchDate, matchTime, 
    totalGoalsLocal, totalGoalsVisit, penalties, isExtraPointEnabled, 
    setShowConfirm, handleFinalSave, loading 
}) => {
    return (
        <Overlay>
            <div className="confirm-card">
                <RiCheckDoubleLine size={50} color={v.colorPrincipal} />
                <h2>{isOnlyDateUpdate && !isWalkover ? '¿Confirmar Fecha y Hora?' : '¿Confirmar Marcador?'}</h2>
                
                {!isOnlyDateUpdate && (
                    <TeamsContainer>
                        <TeamBadge>
                            {match.local?.logo_url ? <img src={match.local.logo_url} alt="L" /> : <DynamicTeamLogo name={match.local?.name} color={match.local?.color} size="50px"/>}
                            <p>{match.local?.name}</p>
                            <span className="score">{totalGoalsLocal}</span>
                        </TeamBadge>
                        <div className="vs">VS</div>
                        <TeamBadge>
                            {match.visitante?.logo_url ? <img src={match.visitante.logo_url} alt="V" /> : <DynamicTeamLogo name={match.visitante?.name} color={match.visitante?.color} size="50px"/>}
                            <p>{match.visitante?.name}</p>
                            <span className="score">{totalGoalsVisit}</span>
                        </TeamBadge>
                    </TeamsContainer>
                )}
                
                {!isOnlyDateUpdate && totalGoalsLocal === totalGoalsVisit && isExtraPointEnabled && !isWalkover && (
                    <div className="pen-score">Penales: {penalties.local} - {penalties.visit}</div>
                )}
                
                <div className="match-datetime-confirm">
                    {/* Condicional para mostrar la fecha preservada en caso de W.O. */}
                    {matchDate && matchTime ? `${matchDate} ${matchTime} ${isWalkover ? '(W.O.)' : ''}` : 'Definido sin fecha (W.O.)'}
                </div>
                
                <div className="confirm-btns">
                    <BtnNormal titulo="Revisar" funcion={() => setShowConfirm(false)} disabled={loading} />
                    
                    <Btnsave 
                        titulo="Si, Guardar" 
                        funcion={handleFinalSave} 
                        loading={loading} 
                    />
                </div>
            </div>
        </Overlay>
    );
};

const Overlay = styled.div` 
    position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; 
    padding: 15px; box-sizing: border-box;
    
    .confirm-card { 
        background: ${({theme})=>theme.bgtotal}; padding: 30px; border-radius: 20px; 
        text-align: center; max-width: 500px; width: 100%;
        
        h2 { margin-bottom: 20px; }
        .pen-score { font-weight: 700; margin-bottom: 15px; color: ${({theme})=>theme.text}; opacity: 0.8; background: ${({theme})=>theme.bg3}; padding: 8px; border-radius: 10px;} 
        .match-datetime-confirm { margin-bottom: 25px; opacity: 0.7; font-size: 0.9rem; font-family: monospace; } 
        .confirm-btns { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; } 
    } 
`;

const TeamsContainer = styled.div`
    display: flex; justify-content: space-around; align-items: center; margin-bottom: 20px;
    background: ${({theme})=>theme.bg3}; border-radius: 15px; padding: 15px;
    .vs { font-weight: 900; opacity: 0.3; font-size: 1.2rem; }
`;

const TeamBadge = styled.div`
    display: flex; flex-direction: column; align-items: center; gap: 10px; width: 40%;
    img { width: 50px; height: 50px; object-fit: contain; }
    p { font-size: 0.8rem; font-weight: 600; text-align: center; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;}
    .score { font-size: 2.2rem; font-weight: 800; color: ${v.colorPrincipal}; line-height: 1;}
`;