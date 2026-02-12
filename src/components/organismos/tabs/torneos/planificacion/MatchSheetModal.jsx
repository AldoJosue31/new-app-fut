import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import { v, Modal, BtnNormal, Btnsave } from "../../../../../index";
import { supabase } from "../../../../../supabase/supabase.config";
import { 
  RiFileDownloadLine, RiUserVoiceLine, RiCalendarEventLine, RiTimeLine, RiMapPinLine
} from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";

export function MatchSheetModal({ isOpen, onClose, matchId }) {
    const [loading, setLoading] = useState(true);
    const [fullMatch, setFullMatch] = useState(null);
    const [players, setPlayers] = useState({ local: [], visit: [] });

    useEffect(() => {
        if (isOpen && matchId) {
            fetchSheetData();
        }
    }, [isOpen, matchId]);

    const fetchSheetData = async () => {
        setLoading(true);
        try {
            // 1. Consulta profunda
            const { data: matchData, error: matchError } = await supabase
                .from('matches')
                .select(`
                    *,
                    local:team1_id (name, logo_url),
                    visitante:team2_id (name, logo_url),
                    referee:referee_id (full_name),
                    jornada:jornada_id (
                        name,
                        tournament:tournament_id (
                            season,
                            division:division_id (
                                name,
                                league:league_id (
                                    name
                                )
                            )
                        )
                    )
                `)
                .eq('id', matchId)
                .single();

            if (matchError) throw matchError;

            // 2. Eventos
            const { data: eventData, error: eventError } = await supabase
                .from('match_events')
                .select(`
                    *,
                    player:player_id (id, first_name, last_name, dorsal, team_id)
                `)
                .eq('match_id', matchId);

            if (eventError) throw eventError;

            setFullMatch(matchData);
            processPlayers(eventData || [], matchData);

        } catch (error) {
            console.error("Error fetching sheet data:", error);
        } finally {
            setLoading(false);
        }
    };

    const processPlayers = (allEvents, matchData) => {
        const localP = [];
        const visitP = [];
        const processedIds = new Set();

        allEvents.forEach(ev => {
            if (!ev.player || processedIds.has(ev.player.id)) return;
            processedIds.add(ev.player.id);

            const playerData = {
                ...ev.player,
                events: allEvents.filter(e => e.player_id === ev.player.id)
            };

            if (ev.player.team_id === matchData.team1_id) {
                localP.push(playerData);
            } else {
                visitP.push(playerData);
            }
        });

        setPlayers({ local: localP, visit: visitP });
    };

    // --- FORMATEO DE FECHA ---
    const formatFullDate = (dateString) => {
        if (!dateString) return "Por definir";
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('es-MX', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
            }).format(date);
        } catch (e) { return "Error fecha"; }
    };

    const formatTime = (dateString) => {
        if (!dateString) return "--:--";
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('es-MX', {
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC'
            }).format(date);
        } catch (e) { return "--:--"; }
    };

    // Datos extraídos
    const leagueName = fullMatch?.jornada?.tournament?.division?.league?.name || "LIGA";
    const tournamentName = fullMatch?.jornada?.tournament?.season || "Torneo";
    const divisionName = fullMatch?.jornada?.tournament?.division?.name || "División";
    const jornadaName = fullMatch?.jornada?.name || "Jornada";

    // Observaciones limpias
    const cleanObservations = useMemo(() => {
        if (!fullMatch?.observations) return "Sin observaciones registradas.";
        let text = fullMatch.observations;
        text = text.replace(/Pen.*:\s*(\d+)\s*-\s*(\d+)/gi, '').replace(/W\.O\./gi, '');
        return text.trim() || "Sin observaciones adicionales.";
    }, [fullMatch]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cédula de Partido" width="850px">
            {loading || !fullMatch ? (
                <LoadingContainer>
                     <div className="spinner"></div>
                     <span>Generando Cédula...</span>
                </LoadingContainer>
            ) : (
                <SheetContainer>
                    {/* ENCABEZADO MEJORADO */}
                    <HeaderSection>
                        <LeagueLabel>{leagueName}</LeagueLabel>
                        <ContextBadges>
                            <span className="badge t-badge">{tournamentName}</span>
                            <span className="divider">•</span>
                            <span className="badge d-badge">{divisionName}</span>
                            <span className="divider">•</span>
                            <span className="badge j-badge">{jornadaName}</span>
                        </ContextBadges>
                        
                        <MetaInfoBar>
                            <div className="left-group">
                                <div className="meta-pill">
                                    <RiCalendarEventLine className="icon"/>
                                    <span>{formatFullDate(fullMatch.date)}</span>
                                </div>
                                <div className="meta-pill">
                                    <RiTimeLine className="icon"/>
                                    <span>{formatTime(fullMatch.date)}</span>
                                </div>
                                <div className="meta-pill">
                                    <RiMapPinLine className="icon"/>
                                    <span className="truncate">{fullMatch.field_name || "Campo Principal"}</span>
                                </div>
                            </div>
                            
                            <div className="right-group">
                                <div className="meta-pill referee">
                                    <RiUserVoiceLine className="icon"/>
                                    <span className="label">Árbitro:</span>
                                    <span className="value">{fullMatch.referee?.full_name || "Por asignar"}</span>
                                </div>
                            </div>
                        </MetaInfoBar>
                    </HeaderSection>

                    {/* MARCADOR RESPONSIVE */}
                    <ScoreSection>
                        {/* LOCAL */}
                        <TeamBox>
                            <span className="team-name">{fullMatch.local?.name}</span>
                            <img src={fullMatch.local?.logo_url || v.iconofotovacia} alt="Local" />
                        </TeamBox>
                        
                        {/* SCORE CENTRAL */}
                        <ResultBox>
                            <div className="big-score">
                                <span>{fullMatch.goals1 ?? 0}</span>
                                <span className="sep">-</span>
                                <span>{fullMatch.goals2 ?? 0}</span>
                            </div>
                            
                            <div className="status-badges">
                                {(fullMatch.observations?.match(/Pen.*:\s*(\d+)\s*-\s*(\d+)/i)) && (
                                    <span className="s-badge pen">Penales: {RegExp.$1}-{RegExp.$2}</span>
                                )}
                                {fullMatch.observations?.includes("W.O.") && (
                                    <span className="s-badge wo">W.O.</span>
                                )}
                                <span className="s-badge status">{fullMatch.status}</span>
                            </div>
                        </ResultBox>

                        {/* VISITA */}
                        <TeamBox $alignRight>
                            <img src={fullMatch.visitante?.logo_url || v.iconofotovacia} alt="Visita" />
                            <span className="team-name">{fullMatch.visitante?.name}</span>
                        </TeamBox>
                    </ScoreSection>

                    {/* ALINEACIONES RESPONSIVE */}
                    <RostersContainer>
                        <RosterColumn>
                            <TeamHeader className="local">
                                <h3>{fullMatch.local?.name}</h3>
                            </TeamHeader>
                            <PlayerTable players={players.local} />
                        </RosterColumn>
                        
                        <div className="vertical-divider"></div>
                        
                        <RosterColumn>
                            <TeamHeader className="visit">
                                <h3>{fullMatch.visitante?.name}</h3>
                            </TeamHeader>
                            <PlayerTable players={players.visit} />
                        </RosterColumn>
                    </RostersContainer>

                    {/* OBSERVACIONES */}
                    <ObsSection>
                        <h4>Observaciones Oficiales</h4>
                        <div className="obs-content">{cleanObservations}</div>
                    </ObsSection>

                    <ActionFooter>
                        <BtnNormal titulo="Cerrar" funcion={onClose} />
                        <Btnsave 
                            titulo="Exportar PDF" 
                            bgcolor={v.colorPrincipal} 
                            icono={<RiFileDownloadLine/>} 
                            funcion={() => alert("Próximamente")} 
                        />
                    </ActionFooter>
                </SheetContainer>
            )}
        </Modal>
    );
}

// --- SUBCOMPONENTE DE TABLA MEJORADO ---
const PlayerTable = ({ players }) => {
    if (!players || players.length === 0) return <EmptyList>Sin alineación</EmptyList>;
    
    return (
        <TableWrapper>
            {players.map(p => {
                const goals = p.events.filter(e => e.event_type === 'goal').length;
                const yellow = p.events.some(e => e.event_type === 'yellow_card');
                const red = p.events.some(e => e.event_type === 'red_card');
                
                return (
                    <div className="p-row" key={p.id}>
                        <span className="num">{p.dorsal || '-'}</span>
                        <span className="p-name">{p.first_name} {p.last_name}</span>
                        
                        <div className="p-stats">
                            {goals > 0 && (
                                <div className="goal-container">
                                    <span className="g-count">{goals}</span>
                                    <IoMdFootball className="ball-icon"/>
                                </div>
                            )}
                            {yellow && <div className="card y"></div>}
                            {red && <div className="card r"></div>}
                        </div>
                    </div>
                );
            })}
        </TableWrapper>
    );
};

// --- ESTILOS RESPONSIVE Y MEJORADOS ---

const LoadingContainer = styled.div` 
    padding: 60px; text-align: center; color: ${({theme})=>theme.text};
    display: flex; flex-direction: column; align-items: center; gap: 15px;
    .spinner { border: 4px solid rgba(0,0,0,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: ${v.colorPrincipal}; animation: spin 1s linear infinite; }
    @keyframes spin { 0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);} }
`;

const SheetContainer = styled.div` 
    background: ${({theme})=>theme.bgtotal}; 
    padding: 20px; 
    border-radius: 10px; 
    color: ${({theme})=>theme.text};
    display: flex; flex-direction: column; gap: 20px;
    
    @media (max-width: 600px) {
        padding: 15px;
        gap: 15px;
    }
`;

// --- HEADER ---
const HeaderSection = styled.div`
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    border-bottom: 2px solid ${({theme})=>theme.bg4}; padding-bottom: 20px;
`;

const LeagueLabel = styled.h4`
    font-size: 0.85rem; letter-spacing: 2px; text-transform: uppercase;
    color: ${({theme})=>theme.text}; opacity: 0.6; font-weight: 800; margin: 0;
`;

const ContextBadges = styled.div`
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center;
    margin-bottom: 10px;

    .badge {
        padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.9rem;
        background: ${({theme})=>theme.bg3}; color: ${({theme})=>theme.text1};
        border: 1px solid ${({theme})=>theme.bg4};
        white-space: nowrap;
    }
    .t-badge { color: ${v.colorPrincipal}; border-color: ${v.colorPrincipal}40; background: ${v.colorPrincipal}10; }
    .divider { color: ${({theme})=>theme.bg4}; font-weight: bold; }
`;

const MetaInfoBar = styled.div`
    display: flex; justify-content: space-between; width: 100%; gap: 10px; flex-wrap: wrap;
    background: ${({theme})=>theme.bg3}; padding: 10px; border-radius: 8px;

    .left-group, .right-group { display: flex; gap: 15px; flex-wrap: wrap; align-items: center; }
    .right-group { justify-content: flex-end; flex: 1; }
    
    @media (max-width: 650px) {
        flex-direction: column; 
        .left-group, .right-group { justify-content: center; flex: none; width: 100%; gap: 10px;}
    }

    .meta-pill {
        display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600;
        color: ${({theme})=>theme.text};
        .icon { color: ${v.colorPrincipal}; font-size: 1.1rem; }
        .truncate { max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        &.referee {
            .label { opacity: 0.7; font-weight: 500; margin-right: 4px; }
            .value { font-weight: 800; color: ${({theme})=>theme.text1}; }
        }
    }
`;

// --- SCORE SECTION RESPONSIVE ---
const ScoreSection = styled.div` 
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    background: ${({theme})=>theme.bg3}; padding: 20px; border-radius: 12px; 
    border: 1px solid ${({theme})=>theme.bg4};
    
    @media (max-width: 600px) {
        padding: 15px 10px;
    }
`;

const TeamBox = styled.div`
    display: flex; align-items: center; gap: 15px; flex: 1; width: 33%;
    ${props => props.$alignRight ? 'justify-content: flex-start; flex-direction: row-reverse; text-align: right;' : 'justify-content: flex-start;'}
    
    img { 
        width: 60px; height: 60px; object-fit: contain; flex-shrink: 0;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
    }
    .team-name { 
        font-weight: 800; font-size: 1rem; color: ${({theme})=>theme.text1}; 
        text-transform: uppercase; line-height: 1.2; word-break: break-word;
    }

    /* Mobile Styles */
    @media (max-width: 600px) {
        flex-direction: column; text-align: center; gap: 8px;
        ${props => props.$alignRight && 'flex-direction: column;'}
        
        img { width: 45px; height: 45px; }
        .team-name { font-size: 0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    }
`;

const ResultBox = styled.div`
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-width: 100px;

    .big-score {
        font-size: 3rem; font-weight: 900; color: ${({theme})=>theme.text1};
        display: flex; align-items: center; gap: 25px; /* AUMENTADO GAP para separar marcadores */
        line-height: 1;
        @media (max-width: 600px) { font-size: 2.2rem; gap: 15px; } /* AUMENTADO GAP MOBILE */
    }
    .sep { color: ${({theme})=>theme.bg4}; margin-top: -5px; }
    
    .status-badges { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 5px; }
    .s-badge { 
        font-size: 0.65rem; padding: 2px 8px; border-radius: 4px; font-weight: 800; text-transform: uppercase;
        &.pen { background: ${({theme})=>theme.bgtotal}; border: 1px solid ${({theme})=>theme.bg4}; }
        &.wo { background: #e74c3c; color: white; }
        &.status { color: ${v.colorPrincipal}; letter-spacing: 0.5px; }
    }
`;

// --- ALINEACIONES RESPONSIVE ---
const RostersContainer = styled.div` 
    display: flex; gap: 20px; 
    .vertical-divider { width: 1px; background: ${({theme})=>theme.bg4}; }
    
    @media (max-width: 768px) {
        flex-direction: column; 
        .vertical-divider { display: none; }
        gap: 30px;
    }
`;

const RosterColumn = styled.div` 
    flex: 1; width: 100%;
`;

const TeamHeader = styled.div`
    margin-bottom: 10px; padding-bottom: 8px; border-bottom: 3px solid;
    &.local { border-color: ${v.colorPrincipal}; color: ${v.colorPrincipal}; }
    &.visit { border-color: ${({theme})=>theme.text1}; color: ${({theme})=>theme.text1}; }
    
    h3 { font-size: 0.9rem; text-transform: uppercase; font-weight: 800; margin: 0; }
`;

// --- TABLA DE JUGADORES ---
const TableWrapper = styled.div`
    display: flex; flex-direction: column; gap: 6px;
    
    .p-row {
        display: flex; align-items: center; padding: 8px 10px; gap: 10px;
        background: ${({theme})=>theme.bg3}; border-radius: 6px;
        transition: 0.2s;
        &:hover { transform: translateX(2px); }
    }

    .num { 
        font-family: monospace; font-weight: 700; width: 25px; 
        color: ${({theme})=>theme.text}; opacity: 0.5; font-size: 0.9rem;
    }
    .p-name { 
        flex: 1; font-weight: 600; font-size: 0.9rem; color: ${({theme})=>theme.text};
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    
    .p-stats { display: flex; align-items: center; gap: 8px; }
    
    /* Goles mejorados */
    .goal-container {
        display: flex; align-items: center; gap: 2px;
        background: ${({theme})=>theme.bgtotal}; padding: 2px 6px; border-radius: 10px;
        border: 1px solid ${({theme})=>theme.bg4};
    }
    .g-count { font-weight: 800; font-size: 0.85rem; color: ${({theme})=>theme.text1}; }
    .ball-icon { color: ${v.colorPrincipal}; font-size: 0.9rem; }

    /* Tarjetas */
    .card { width: 10px; height: 14px; border-radius: 2px; }
    .card.y { background: #f1c40f; border: 1px solid #d4ac0d; }
    .card.r { background: #e74c3c; border: 1px solid #c0392b; }
`;

const EmptyList = styled.div` 
    text-align: center; padding: 15px; font-style: italic; opacity: 0.6; font-size: 0.85rem; 
    background: ${({theme})=>theme.bg3}50; border-radius: 6px;
`;

// --- OBSERVACIONES Y FOOTER ---
const ObsSection = styled.div` 
    h4 { font-size: 0.8rem; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; opacity: 0.7; }
    .obs-content { 
        background: ${({theme})=>theme.bg3}; border: 1px solid ${({theme})=>theme.bg4}; 
        padding: 12px; border-radius: 8px; font-size: 0.9rem; font-family: monospace;
        white-space: pre-wrap; color: ${({theme})=>theme.text};
    }
`;

const ActionFooter = styled.div` 
    display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; 
    border-top: 1px solid ${({theme})=>theme.bg4}; padding-top: 20px; 
`;

export default MatchSheetModal;