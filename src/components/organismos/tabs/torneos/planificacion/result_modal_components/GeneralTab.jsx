// src/components/organismos/tabs/torneos/planificacion/result_modal_components/GeneralTab.jsx
import React from "react";
import styled from "styled-components";
import { v } from "../../../../../../index";
import { RiErrorWarningLine, RiUserStarFill, RiCalendarEventLine, RiTimeLine, RiStickyNoteLine } from "react-icons/ri";

export const GeneralTab = ({ 
    isWalkover, setIsWalkover, woWinnerId, doubleWalkoverId, match, handleWalkoverSelect,
    selectedReferee, setSelectedReferee, referees, matchDate, setMatchDate, matchTime, setMatchTime,
    manualObservations, setManualObservations
}) => {
    return (
        <Container>
            <WalkoverBox $active={isWalkover}>
                <div className="wo-header" onClick={() => setIsWalkover(!isWalkover)}>
                    <RiErrorWarningLine size={24}/><span>Victoria por Default (W.O.)</span>
                </div>
                {isWalkover && (
                <div className="wo-content">
                    <div className="wo-btns">
                        <WalkoverOptionButton
                            type="button"
                            $selected={woWinnerId === match.local?.id}
                            onClick={() => handleWalkoverSelect(match.local?.id)}
                        >
                            {match.local?.name}
                        </WalkoverOptionButton>
                        <WalkoverOptionButton
                            type="button"
                            $selected={woWinnerId === match.visitante?.id}
                            onClick={() => handleWalkoverSelect(match.visitante?.id)}
                        >
                            {match.visitante?.name}
                        </WalkoverOptionButton>
                        <WalkoverOptionButton
                            type="button"
                            $selected={woWinnerId === doubleWalkoverId}
                            $danger
                            onClick={() => handleWalkoverSelect(doubleWalkoverId)}
                        >
                            Ambos pierden
                        </WalkoverOptionButton>
                    </div>
                    {woWinnerId === doubleWalkoverId && (
                        <p className="wo-note">Se guardara 0-0, sin puntos para nadie y con -3 de diferencia para ambos en la tabla.</p>
                    )}
                </div>
                )}
            </WalkoverBox>
            
            {/* Se removió la condición !isWalkover para que estos inputs siempre sean visibles */}
            <GridInputs>
                <InputGroup>
                    <label><RiUserStarFill/> Árbitro Principal *</label>
                    <select value={selectedReferee} onChange={(e) => setSelectedReferee(e.target.value)}>
                        <option value="">Seleccione un árbitro...</option>
                        {referees.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                    </select>
                </InputGroup>
                <InputGroup>
                    <label><RiCalendarEventLine/> Fecha {isWalkover ? '(Opcional)' : '*'}</label>
                    <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} />
                </InputGroup>
                <InputGroup>
                    <label><RiTimeLine/> Hora {isWalkover ? '(Opcional)' : '*'}</label>
                    <input type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} />
                </InputGroup>
            </GridInputs>
            
            <InputGroup style={{marginTop: "15px"}}>
                <label><RiStickyNoteLine/> Observaciones Adicionales (Opcional)</label>
                <TextArea 
                    placeholder="Ingrese incidentes, retrasos, estado de cancha u otros detalles..."
                    value={manualObservations}
                    onChange={(e) => { if(e.target.value.length <= 500) setManualObservations(e.target.value); }}
                />
                <CharCount>{manualObservations.length}/500</CharCount>
            </InputGroup>
        </Container>
    );
};

const Container = styled.div` display: flex; flex-direction: column; width: 100%; `;
const GridInputs = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
`;
const InputGroup = styled.div` 
    display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; width: 100%;
    label { font-weight: 700; display: flex; align-items: center; gap: 8px; color: ${({theme})=>theme.text}; font-size: 0.9rem;} 
    select, input { padding: 12px; border-radius: 10px; background: ${({theme})=>theme.bg3}; border: 2px solid ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; outline: none; transition: 0.3s; width: 100%; box-sizing: border-box; &:focus { border-color: ${v.colorPrincipal}; } } 
`;
const TextArea = styled.textarea` padding: 12px; border-radius: 10px; background: ${({theme})=>theme.bg3}; border: 2px solid ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; outline: none; transition: 0.3s; width: 100%; min-height: 100px; resize: vertical; font-family: inherit; box-sizing: border-box; &:focus { border-color: ${v.colorPrincipal}; } `;
const CharCount = styled.div` text-align: right; font-size: 0.75rem; color: ${({theme})=>theme.text}; opacity: 0.6; margin-top: -5px; `;
const WalkoverBox = styled.div` border: 1px solid ${({$active}) => $active ? '#e74c3c' : 'transparent'}; background: ${({theme, $active}) => $active ? '#e74c3c15' : theme.bg3}; border-radius: 12px; margin-bottom: 20px; .wo-header { padding: 15px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; span { font-weight: 700; flex: 1; } &:hover { opacity: 0.8; } } .wo-content { padding: 0 15px 15px 15px; .wo-btns { display: flex; gap: 10px; flex-wrap: wrap; } .wo-note { margin: 10px 0 0; font-size: 0.82rem; font-weight: 600; color: ${({theme})=>theme.text}; opacity: 0.75; } } `;

const WalkoverOptionButton = styled.button`
    min-height: 44px;
    padding: 10px 18px;
    border-radius: 14px;
    border: 2px solid ${({$selected, $danger, theme}) =>
        $selected ? ($danger ? '#e74c3c' : v.colorPrincipal) : theme.color2};
    border-bottom-width: ${({$selected}) => $selected ? '5px' : '3px'};
    background: ${({$selected, $danger, theme}) =>
        $selected
            ? ($danger ? '#e74c3c' : v.colorPrincipal)
            : theme.bg4};
    color: ${({$selected, theme}) => $selected ? '#fff' : theme.text};
    box-shadow: ${({$selected, $danger}) =>
        $selected ? `0 10px 22px ${$danger ? '#e74c3c' : v.colorPrincipal}35` : 'none'};
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 900;
    line-height: 1.15;
    transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
    transform: ${({$selected}) => $selected ? 'translateY(-3px)' : 'translateY(0)'};

    &:hover {
        filter: brightness(0.98);
        transform: translateY(-3px);
    }

    &:active {
        transform: translateY(0);
        border-bottom-width: 2px;
    }
`;
