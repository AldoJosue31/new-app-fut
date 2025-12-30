import React, { useState } from "react";
import styled from "styled-components";
import { supabase } from "../../../../supabase/supabase.config";
import { v } from "../../../../styles/variables";
import { Btnsave } from "../../../../index";

export function JornadaResultados({ matches, teams, jornadaId, refreshMatches }) {
  const [editingId, setEditingId] = useState(null);
  const [tempScore, setTempScore] = useState({ g1: 0, g2: 0 });

  const getTeam = (id) => teams.find(t => t.id === id);

  const handleEdit = (match) => {
    setEditingId(match.id);
    setTempScore({ g1: match.goals1 || 0, g2: match.goals2 || 0 });
  };

  const handleSave = async (matchId) => {
    try {
        const { error } = await supabase.from('matches').update({
            goals1: tempScore.g1,
            goals2: tempScore.g2,
            status: 'Finalizado'
        }).eq('id', matchId);
        
        if(error) throw error;
        setEditingId(null);
        refreshMatches();
    } catch (error) {
        alert("Error guardando resultado");
    }
  };

  return (
    <Container>
        <h3>Resultados y Marcadores</h3>
        <Grid>
            {matches.map(m => {
                const t1 = getTeam(m.team1_id);
                const t2 = getTeam(m.team2_id);
                const isEditing = editingId === m.id;
                const isPending = m.status === 'Pendiente';

                return (
                    <MatchRow key={m.id} $isPending={isPending}>
                        <div className="date-col">
                            {isPending ? <span className="badge-pending">P.P</span> : (
                                <span>{m.date ? m.date.slice(11, 16) : '--:--'}</span>
                            )}
                        </div>
                        
                        <div className="teams-score">
                            <div className="team t-left">
                                <span>{t1?.name}</span>
                                <img src={t1?.logo_url} alt=""/>
                            </div>
                            
                            <div className="score-box">
                                {isEditing ? (
                                    <div className="inputs">
                                        <input type="number" value={tempScore.g1} onChange={e=>setTempScore({...tempScore, g1: e.target.value})} />
                                        <span>-</span>
                                        <input type="number" value={tempScore.g2} onChange={e=>setTempScore({...tempScore, g2: e.target.value})} />
                                    </div>
                                ) : (
                                    <div className="display">
                                        <span className="sc">{m.status === 'Finalizado' ? m.goals1 : '-'}</span>
                                        <span className="div">:</span>
                                        <span className="sc">{m.status === 'Finalizado' ? m.goals2 : '-'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="team t-right">
                                <img src={t2?.logo_url} alt=""/>
                                <span>{t2?.name}</span>
                            </div>
                        </div>

                        <div className="actions">
                            {isEditing ? (
                                <button className="btn-save" onClick={() => handleSave(m.id)}>OK</button>
                            ) : (
                                <button className="btn-edit" onClick={() => handleEdit(m)} disabled={isPending}>Result</button>
                            )}
                        </div>
                    </MatchRow>
                )
            })}
        </Grid>
    </Container>
  );
}

const Container = styled.div`
    background: ${({theme})=>theme.bgcards}; padding: 20px; border-radius: 16px; border: 1px solid ${({theme})=>theme.bg4};
    h3 { margin-bottom: 20px; opacity: 0.8; }
`;

const Grid = styled.div` display: flex; flex-direction: column; gap: 10px; `;

const MatchRow = styled.div`
    display: grid; grid-template-columns: 80px 1fr 60px; align-items: center; 
    background: ${({theme, $isPending}) => $isPending ? `${theme.bg4}50` : theme.bgtotal}; 
    padding: 10px 15px; border-radius: 12px; border: 1px solid ${({theme})=>theme.bg4};

    .date-col { font-size: 0.9rem; font-weight: 700; opacity: 0.7; text-align: center; }
    .badge-pending { background: #f39c12; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; }

    .teams-score { display: flex; align-items: center; justify-content: center; gap: 20px; }
    .team { display: flex; align-items: center; gap: 10px; width: 150px; font-weight: 600; font-size: 0.9rem; img{width:30px; height:30px; object-fit:contain;} }
    .t-left { justify-content: flex-end; text-align: right; }
    .t-right { justify-content: flex-start; text-align: left; }

    .score-box { 
        width: 80px; display: flex; justify-content: center; 
        .display { font-size: 1.5rem; font-weight: 800; color: ${v.colorPrincipal}; display: flex; gap: 5px; }
        .inputs { display: flex; align-items: center; gap: 5px; input { width: 35px; text-align: center; padding: 5px; border-radius: 5px; border: 1px solid #444; background: ${({theme})=>theme.bgcards}; color: ${({theme})=>theme.text}; font-weight: bold; } }
    }

    .actions { display: flex; justify-content: flex-end; 
        button { padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 700; font-size: 0.8rem; }
        .btn-edit { background: ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; &:hover{background: ${({theme})=>theme.primary}; color: white;} }
        .btn-save { background: ${v.verde}; color: white; }
    }
`;