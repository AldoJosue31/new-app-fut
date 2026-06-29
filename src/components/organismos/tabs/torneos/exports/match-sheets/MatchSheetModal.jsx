import React, { useEffect, useState, useRef, useMemo } from "react";
import styled, { useTheme } from "styled-components";
import { v, Modal } from "../../../../../../index"; 
import { supabase } from "../../../../../../supabase/supabase.config";
import { exportElementAsPNG } from "../../../../../../utils/imageExporter";
import { ExportDownloadButton, ExportPreviewHeader } from '../shared/ExportPreviewHeader';
import MatchSheetExportLayout from "./MatchSheetExportLayout";

const MatchSheetModal = ({ isOpen, onClose, match }) => {
    const theme = useTheme(); 
    const matchId = match?.id || match;

    const [loading, setLoading] = useState(true);
    const [fullMatch, setFullMatch] = useState(null);
    const [players, setPlayers] = useState({ local: [], visit: [] });
    
    const [isDarkExport, setIsDarkExport] = useState(false);
    const [isMobileLayout, setIsMobileLayout] = useState(false);
    const [previewScale, setPreviewScale] = useState(0.5); 
    const [isExporting, setIsExporting] = useState(false);
    const exportComponentRef = useRef(null);

    // Sincronizar tema inicial
    useEffect(() => {
        if (isOpen) {
            const isAppDark = theme.bgtotal && theme.bgtotal.toLowerCase() !== '#ffffff' && theme.bgtotal.toLowerCase() !== '#f3f4f6';
            setIsDarkExport(isAppDark);
            if (matchId) fetchSheetData();
        }
    }, [isOpen, matchId, theme]);

    // Calcular escala dinámica para que quepa en pantalla
    useEffect(() => {
        const calculateScale = () => {
            const CONTENT_WIDTH = isMobileLayout ? 480 : 1240;
            const SCREEN_PADDING = 80; 
            const availableWidth = window.innerWidth - SCREEN_PADDING;
            
            let newScale = availableWidth / CONTENT_WIDTH;
            if (newScale > 1) newScale = 1;
            setPreviewScale(newScale * 0.9); // Margen de seguridad
        };

        if (isOpen) {
            calculateScale();
            window.addEventListener('resize', calculateScale);
        }
        return () => window.removeEventListener('resize', calculateScale);
    }, [isOpen, isMobileLayout]);

    const fetchSheetData = async () => {
        setLoading(true);
        try {
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
                .select(`*, player:player_id (*)`)
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
        if (!matchData) return;
        const local = [];
        const visit = [];
        const processedIds = new Set();

        allEvents.forEach(ev => {
            if (!ev.player || processedIds.has(ev.player.id)) return;
            processedIds.add(ev.player.id);
            const pData = { ...ev.player, events: allEvents.filter(e => e.player_id === ev.player.id) };
            if (ev.player.team_id === matchData.team1_id) local.push(pData); 
            else visit.push(pData);
        });

        const sortDorsal = (a, b) => (parseInt(a.dorsal) || 999) - (parseInt(b.dorsal) || 999);
        setPlayers({ local: local.sort(sortDorsal), visit: visit.sort(sortDorsal) });
    };

    const exportData = useMemo(() => {
        if (!fullMatch) return null;
        const mapLineup = (list) => list.map(p => ({
            id: p.id, name: p.first_name, lastName: p.last_name, number: p.dorsal,
            goalsCount: p.events.filter(e => e.event_type === 'goal').length,
            ownGoalsCount: p.events.filter(e => e.event_type === 'own_goal').length,
            hasYellow: p.events.some(e => e.event_type === 'yellow_card'),
            hasRed: p.events.some(e => e.event_type === 'red_card')
        }));
        
        const goals = []; const cards = [];
        const proc = (list, t) => list.forEach(p => p.events.forEach(e => {
            if (e.event_type === 'goal') goals.push({ minute: e.minute || 0, player: { name: p.first_name }, team: t });
            else if (e.event_type === 'own_goal') goals.push({ minute: e.minute || 0, player: { name: p.first_name }, team: t === 'home' ? 'away' : 'home', ownGoal: true, creditedTeam: t });
            else if (['yellow_card', 'red_card'].includes(e.event_type)) cards.push({ minute: e.minute || 0, type: e.event_type.split('_')[0], player: { name: p.first_name }, team: t });
        }));
        proc(players.local, 'home'); proc(players.visit, 'away');

        return {
            match: {
                id: fullMatch.id,
                competitionName: fullMatch.jornada?.tournament?.division?.league?.name || 'Torneo', 
                date: fullMatch.date, time: fullMatch.time,
                goals1: fullMatch.goals1,
                goals2: fullMatch.goals2,
                homeTeam: { name: fullMatch.local?.name, logo: fullMatch.local?.logo_url, color: fullMatch.local?.color },
                awayTeam: { name: fullMatch.visitante?.name, logo: fullMatch.visitante?.logo_url, color: fullMatch.visitante?.color },
                stadium: fullMatch.field_name || 'Campo Principal'
            },
            referees: { main: fullMatch.referee?.full_name || 'Por asignar' },
            homeLineup: mapLineup(players.local), 
            awayLineup: mapLineup(players.visit),
            matchEvents: { goals, cards }
        };
    }, [fullMatch, players]);

    const handleExportPNG = async () => {
        if (!exportComponentRef.current || isExporting) return;
        setIsExporting(true);
        try {
            const safeName = `Cedula_${fullMatch?.local?.name}_vs_${fullMatch?.visitante?.name}`;
            await exportElementAsPNG(exportComponentRef, safeName.replace(/[^a-z0-9_]/gi, ''), isDarkExport ? '#121212' : '#ffffff');
        } catch (e) { console.error(e); }
        finally { setIsExporting(false); }
    };

    if (!isOpen) return null;

    const modalWidth = `${Math.max(((isMobileLayout ? 480 : 1240) * previewScale) + 60, 760)}px`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Vista Previa Cédula"
            width={modalWidth}
            showCloseButton={false}
            compactHeader
            headerActions={
                <ExportDownloadButton
                    onExport={handleExportPNG}
                    isExporting={isExporting}
                    disabled={loading || !exportData}
                />
            }
        >
            {loading ? (
                <LoadingContainer><div className="spinner" /><span>Cargando datos...</span></LoadingContainer>
            ) : (
                <PreviewWrapper>
                    <ExportPreviewHeader 
                        isDark={isDarkExport} setIsDark={setIsDarkExport} 
                        isMobile={isMobileLayout} setIsMobile={setIsMobileLayout} 
                        onExport={handleExportPNG} isExporting={isExporting}
                        showExportAction={false}
                        title="Revisa los datos antes de exportar"
                        inactiveFormatLabel="Escritorio"
                        activeFormatLabel="Movil"
                        formatTitle="Cambiar formato de cedula"
                    />
                    <div className="preview-viewport">
                        <div className="scale-box" style={{ width: (isMobileLayout ? 480 : 1240) * previewScale }}>
                            <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: isMobileLayout ? '480px' : '1240px' }}>
                                {exportData && (
                                    <MatchSheetExportLayout 
                                        ref={exportComponentRef} 
                                        {...exportData} 
                                        themeMode={isDarkExport ? 'dark' : 'light'}
                                        layoutMode={isMobileLayout ? 'mobile' : 'desktop'}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </PreviewWrapper>
            )}
        </Modal>
    );
};

export default MatchSheetModal;

const LoadingContainer = styled.div` padding: 80px; text-align: center; .spinner { border: 4px solid #eee; width: 40px; height: 40px; border-radius: 50%; border-left-color: ${v.colorPrincipal}; animation: spin 1s linear infinite; margin: 0 auto 15px; } @keyframes spin { to { transform: rotate(360deg); } } span { font-weight: 600; color: ${({theme})=>theme.text}; opacity: 0.7; } `;
const PreviewWrapper = styled.div` margin: -25px; width: calc(100% + 50px); display: flex; flex-direction: column; background: ${({theme}) => theme.bgtotal || theme.bg}; .preview-viewport { flex: 1; display: flex; justify-content: center; padding: 28px 20px; overflow: auto; } .scale-box { box-shadow: 0 20px 50px rgba(0,0,0,0.3); border-radius: 8px; overflow: hidden; } @media (max-width: 520px) { .preview-viewport { padding: 18px 10px; } } `;
