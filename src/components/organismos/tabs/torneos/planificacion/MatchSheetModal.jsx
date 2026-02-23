import React, { useEffect, useState, useRef, useMemo } from "react";
import styled, { useTheme } from "styled-components";
import { v, Modal, Btnsave } from "../../../../../index";
import { supabase } from "../../../../../supabase/supabase.config";
import { 
    RiFileDownloadLine, RiImageLine, RiSunLine, RiMoonLine
} from "react-icons/ri";
import { exportElementAsPNG } from "../../../../../utils/imageExporter";
import MatchSheetExportLayout from "./components/MatchSheetExportLayout";

export default function MatchSheetModal({ isOpen, onClose, match }) {
    const theme = useTheme(); 
    const matchId = match?.id || match;

    const [loading, setLoading] = useState(true);
    const [fullMatch, setFullMatch] = useState(null);
    const [players, setPlayers] = useState({ local: [], visit: [] });
    
    const [isDarkExport, setIsDarkExport] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const isAppDark = theme.bgtotal && theme.bgtotal.toLowerCase() !== '#ffffff' && theme.bgtotal.toLowerCase() !== '#f3f4f6';
            setIsDarkExport(isAppDark);
        }
    }, [isOpen, theme]);

    const [previewScale, setPreviewScale] = useState(0.5); 
    const previewContainerRef = useRef(null);
    const exportComponentRef = useRef(null);

    useEffect(() => {
        if (isOpen && matchId) {
            fetchSheetData();
        }
    }, [isOpen, matchId]);

    useEffect(() => {
        const calculateScale = () => {
            const CONTENT_WIDTH = 1240;
            const SCREEN_PADDING = 80; 
            const HEADER_HEIGHT = 100; 

            const availableWidth = window.innerWidth - SCREEN_PADDING;
            const availableHeight = window.innerHeight - HEADER_HEIGHT;

            const scaleX = availableWidth / CONTENT_WIDTH;
            const scaleY = availableHeight / 850; 

            let newScale = Math.min(scaleX, scaleY);
            newScale = newScale * 0.85;
            if (newScale > 1) newScale = 1; 
            
            setPreviewScale(newScale);
        };

        if (isOpen) {
            setTimeout(calculateScale, 100);
            window.addEventListener('resize', calculateScale);
        }
        return () => window.removeEventListener('resize', calculateScale);
    }, [isOpen]);

    const fetchSheetData = async () => {
        setLoading(true);
        try {
            // CORRECCIÓN: Agregar color a la consulta de equipos
            const { data: matchData, error: matchError } = await supabase
                .from('matches')
                .select(`
                    *,
                    local:team1_id (name, logo_url, color),
                    visitante:team2_id (name, logo_url, color),
                    referee:referee_id (full_name),
                    jornada:jornada_id (
                        name,
                        tournament:tournament_id (
                            season,
                            division:division_id (
                                name,
                                league:league_id (name)
                            )
                        )
                    )
                `)
                .eq('id', matchId)
                .single();

            if (matchError) throw matchError;

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
            const playerData = { ...ev.player, events: allEvents.filter(e => e.player_id === ev.player.id) };
            if (ev.player.team_id === matchData.team1_id) localP.push(playerData);
            else visitP.push(playerData);
        });

        const sortDorsal = (a, b) => (parseInt(a.dorsal) || 999) - (parseInt(b.dorsal) || 999);
        localP.sort(sortDorsal);
        visitP.sort(sortDorsal);
        setPlayers({ local: localP, visit: visitP });
    };

    const exportData = useMemo(() => {
        if (!fullMatch) return null;
        const mapLineup = (playerList) => playerList.map(p => ({
            id: p.id, name: p.first_name, lastName: p.last_name, number: p.dorsal,
            goalsCount: p.events.filter(e => e.event_type === 'goal').length,
            hasYellow: p.events.some(e => e.event_type === 'yellow_card'),
            hasRed: p.events.some(e => e.event_type === 'red_card')
        }));
        
        const goals = []; const cards = [];
        const processEvents = (playerList, teamKey) => {
            playerList.forEach(p => {
                p.events.forEach(e => {
                    if (e.event_type === 'goal') goals.push({ minute: e.minute || 0, player: { name: `${p.first_name} ${p.last_name}` }, team: teamKey });
                    else if (e.event_type === 'yellow_card' || e.event_type === 'red_card') cards.push({ minute: e.minute || 0, type: e.event_type === 'yellow_card' ? 'yellow' : 'red', player: { name: `${p.first_name} ${p.last_name}` }, team: teamKey });
                });
            });
        };
        processEvents(players.local, 'home'); processEvents(players.visit, 'away');
        goals.sort((a, b) => a.minute - b.minute); cards.sort((a, b) => a.minute - b.minute);

        // CORRECCIÓN: Enviar logo nulo (sin v.iconofotovacia) y enviar color.
        return {
            match: {
                id: fullMatch.id, 
                date: fullMatch.date, 
                time: fullMatch.time, 
                status: fullMatch.status === 'Finalizado' ? 'completed' : 'scheduled',
                homeTeam: { 
                    name: fullMatch.local?.name || 'Local', 
                    logo: fullMatch.local?.logo_url || null, 
                    color: fullMatch.local?.color || '#000000' 
                },
                awayTeam: { 
                    name: fullMatch.visitante?.name || 'Visita', 
                    logo: fullMatch.visitante?.logo_url || null, 
                    color: fullMatch.visitante?.color || '#000000' 
                },
                competitionName: fullMatch.jornada?.tournament?.division?.league?.name || 'Torneo', 
                stadium: fullMatch.field_name || 'Campo Principal'
            },
            referees: { main: fullMatch.referee?.full_name || 'Por asignar' },
            homeLineup: mapLineup(players.local), 
            awayLineup: mapLineup(players.visit),
            matchEvents: { goals, cards }
        };
    }, [fullMatch, players]);

    const handleExportPNG = () => {
        if (exportComponentRef.current) {
            const safeName = `Cedula_${fullMatch?.local?.name}_vs_${fullMatch?.visitante?.name}_${fullMatch?.id}`;
            const bgColor = isDarkExport ? '#121212' : '#ffffff';
            exportElementAsPNG(exportComponentRef, safeName.replace(/[^a-z0-9_]/gi, ''), bgColor);
        }
    };

    if (!isOpen) return null;

    const modalDynamicWidth = exportData ? `${(1240 * previewScale) + 60}px` : "auto";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Vista Previa" width={modalDynamicWidth}>
            {loading || !fullMatch ? (
                <LoadingContainer><div className="spinner"></div><span>Cargando...</span></LoadingContainer>
            ) : (
                <PreviewWrapper>
                     <div className="preview-header">
                        <div className="left-group">
                            <RiImageLine />
                            <span>Revisa los datos.</span>
                        </div>
                        
                        <div className="right-group">
                            <ThemeToggleBtn onClick={() => setIsDarkExport(!isDarkExport)} title="Cambiar tema de la imagen">
                                {isDarkExport ? <RiSunLine /> : <RiMoonLine />}
                            </ThemeToggleBtn>
                            
                            <div className="separator"></div>

                            <Btnsave 
                                titulo="Descargar" 
                                bgcolor="#27ae60" 
                                icono={<RiFileDownloadLine/>} 
                                funcion={handleExportPNG} 
                            />
                        </div>
                    </div>
                    
                    <div className="preview-viewport" ref={previewContainerRef}>
                        <div 
                            className="scale-box"
                            style={{ 
                                width: 1240 * previewScale, 
                                height: 850 * previewScale, 
                                overflow: 'hidden' 
                            }}
                        >
                            <div 
                                style={{ 
                                    transform: `scale(${previewScale})`, 
                                    transformOrigin: 'top left',
                                    width: '1240px', 
                                }}
                            >
                                {exportData && (
                                    <MatchSheetExportLayout 
                                        ref={exportComponentRef} 
                                        {...exportData} 
                                        themeMode={isDarkExport ? 'dark' : 'light'}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </PreviewWrapper>
            )}
        </Modal>
    );
}

// --- ESTILOS OPTIMIZADOS ---

const LoadingContainer = styled.div`
    padding: 60px; 
    text-align: center; 
    .spinner { 
        border: 4px solid ${({theme}) => theme.bg3}; width: 36px; height: 36px; border-radius: 50%; border-left-color: ${v.colorPrincipal}; animation: spin 1s linear infinite; margin: 0 auto 10px;
    } 
    @keyframes spin { 100% {transform: rotate(360deg);} }
`;

const ThemeToggleBtn = styled.button`
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px;
    border-radius: 50%;
    border: 1px solid ${({theme}) => theme.bg4};
    background: ${({theme}) => theme.bg2};
    color: ${({theme}) => theme.text};
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1.2rem;
    &:hover {
        background: ${({theme}) => theme.bg3};
        color: ${v.colorPrincipal};
    }
`;

const PreviewWrapper = styled.div`
    margin: -25px; 
    width: calc(100% + 50px);
    display: flex; 
    flex-direction: column;
    background: ${({theme}) => theme.bgtotal || theme.bg}; 
    
    .preview-header { 
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        padding: 8px 20px; 
        background: ${({theme}) => theme.bg}; 
        border-bottom: 1px solid ${({theme}) => theme.bg3};
        min-height: 50px;

        .left-group {
            display: flex; align-items: center; gap: 8px;
            color: ${({theme}) => theme.text};
            font-size: 0.9rem;
            font-weight: 500;
            opacity: 0.8;
        }

        .right-group {
            display: flex; align-items: center; gap: 12px;
            .separator { width: 1px; height: 24px; background: ${({theme}) => theme.bg3}; }
        }
    }
    
    .preview-viewport {
        flex: 1;
        display: flex;
        justify-content: center;
        padding-top: 30px; 
        padding-bottom: 30px;
        padding-left: 20px;
        padding-right: 20px;
        overflow: hidden; 
    }

    .scale-box {
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        background: transparent; 
    }
`;