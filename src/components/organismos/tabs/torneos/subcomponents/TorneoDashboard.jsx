import React, { useState } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { RiCalendarEventLine, RiTrophyLine, RiCloseCircleLine, RiAddCircleLine } from "react-icons/ri";
import { IoMdSettings, IoIosArrowDown, IoIosArrowUp, IoMdStopwatch } from "react-icons/io";
import { BtnNormal } from "../../../../../index";
import { TableRowSkeleton } from "../../../../../components/atomos/Skeleton";

// --- STYLES ---
const DashboardGrid = styled.div` display: grid; grid-template-columns: 350px 1fr; gap: 30px; @media (max-width: 900px) { grid-template-columns: 1fr; } `;
const SummaryBox = styled.div` background: ${({theme})=>theme.bg3}; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 12px; border: 1px solid ${({theme})=>theme.bg4}; `;
const SectionTitle = styled.h4` margin: 0 0 15px 0; font-size: 0.95rem; color: ${({theme})=>theme.text}; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; `;
const TeamsList = styled.div` background: ${({theme})=>theme.bgtotal}; border-radius: 10px; padding: 10px; overflow-y: auto; border: 1px solid ${({theme})=>theme.bg4}; margin-bottom: 15px; max-height: 400px; &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background: ${v.bg4}; border-radius: 3px; } `;
const TeamItem = styled.div` display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid ${({theme})=>theme.bg4}; background: ${({theme})=>theme.bgcards}; margin-bottom: 4px; border-radius: 6px; img { width: 28px; height: 28px; object-fit: contain; } .number { font-size: 12px; opacity: 0.5; width: 20px; } .name { flex: 1; font-weight: 500; font-size: 14px; } `;
const ActionButton = styled.button` border: none; background: transparent; cursor: pointer; font-size: 20px; transition: 0.2s; &.remove { color: #e74c3c; } &.add { color: #2ecc71; } &:hover{ transform: scale(1.1); }`;
const ExcludedHeader = styled.div` background: ${({theme})=>theme.bg3}; padding: 12px 15px; cursor: pointer; display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; border-radius: 8px; &:hover{background: ${({theme})=>theme.bg2};} `;
const ReasonBadge = styled.span` font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: ${({$color}) => `${$color}20`}; color: ${({$color}) => $color}; border: 1px solid ${({$color}) => `${$color}40`}; margin-right: 10px;`;

const SummaryItem = ({icon, label, value}) => (
    <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
        <div style={{width:'40px', height:'40px', borderRadius:'50%', background: v.bg2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', color: v.primary}}>{icon}</div>
        <div style={{display:'flex', flexDirection:'column'}}>
            <span style={{fontSize:'11px', opacity:0.6, fontWeight:600, textTransform:'uppercase'}}>{label}</span>
            <span style={{fontSize:'13px', fontWeight:600}}>{value}</span>
        </div>
    </div>
);

export const TorneoDashboard = ({ 
    form, reglas, onEditConfig, 
    participatingTeams, excludedTeams, 
    onInclude, onExclude, isLoading, minPlayers 
}) => {
    const [showExcluded, setShowExcluded] = useState(false);

    const getExclusionReason = (team) => {
        if (team.status === 'Suspendido') return { text: "Suspensión", color: "#e74c3c", canAdd: false };
        if (team.playerCount < minPlayers) return { text: `Falta Jugadores (${team.playerCount}/${minPlayers})`, color: "#f39c12", canAdd: false };
        return { text: "Decisión de Gestor", color: "#3498db", canAdd: true };
    };

    return (
        <DashboardGrid>
            {/* Panel Resumen (Izquierda) */}
            <div className="summary-col">
                <SectionTitle>Configuración Actual</SectionTitle>
                <SummaryBox>
                    <SummaryItem icon={<RiCalendarEventLine/>} label="Temporada" value={form.season || "---"} />
                    <SummaryItem icon={<RiTrophyLine/>} label="Formato" value={form.vueltas === "2" ? "Ida y Vuelta" : "Solo Ida"} />
                    <SummaryItem icon={<IoMdStopwatch/>} label="Juego" value={`${reglas?.minutosPorTiempo || 45} min/tiempo | ${reglas?.cambios || 'Libres'}`} />
                    <SummaryItem icon={<v.iconocorona/>} label="Liguilla" value={form.zonaLiguilla ? `Top ${form.clasificados || 4}` : 'No habilitada'} />
                </SummaryBox>
                <div style={{marginTop: 20}}>
                    <BtnNormal titulo="Editar Reglas" width="100%" icono={<IoMdSettings />} funcion={onEditConfig} />
                </div>
            </div>

            {/* Gestión Equipos (Derecha) */}
            <div className="teams-col">
                <SectionTitle>Equipos Participantes  ({participatingTeams.length}/{form.maxTeams})</SectionTitle> 
                <TeamsList>
                    {isLoading ? <TableRowSkeleton /> : (
                        participatingTeams.length > 0 ? participatingTeams.map((team, idx) => (
                            <TeamItem key={team.id}>
                                <span className="number">{idx + 1}</span>
                                <img src={team.logo_url || v.iconofotovacia} alt="logo" />
                                <span className="name">{team.name}</span>
                                <ActionButton className="remove" onClick={() => onExclude(team.id)}><RiCloseCircleLine /></ActionButton>
                            </TeamItem>
                        )) : <div style={{padding:'20px', textAlign:'center', opacity:0.6}}>Sin equipos</div>
                    )}
                </TeamsList>
                
                <div style={{border: `1px solid ${v.bg4}`, borderRadius: '10px', overflow:'hidden'}}>
                    <ExcludedHeader onClick={() => setShowExcluded(!showExcluded)}>
                        <span>Equipos No Participantes ({excludedTeams.length})</span>
                        {showExcluded ? <IoIosArrowUp /> : <IoIosArrowDown />}
                    </ExcludedHeader>
                    {showExcluded && (
                        <TeamsList style={{border:'none', marginBottom:0, maxHeight:'250px'}}>
                             {excludedTeams.map(team => {
                                const reason = getExclusionReason(team);
                                return (
                                    <TeamItem key={team.id}>
                                        <img src={team.logo_url || v.iconofotovacia} alt="logo" />
                                        <span className="name" style={{opacity:0.8}}>{team.name}</span>
                                        <ReasonBadge $color={reason.color}>{reason.text}</ReasonBadge>
                                        {reason.canAdd && <ActionButton className="add" onClick={() => onInclude(team.id)}><RiAddCircleLine /></ActionButton>}
                                    </TeamItem>
                                );
                            })}
                        </TeamsList>
                    )}
                </div>
            </div>
        </DashboardGrid>
    );
};