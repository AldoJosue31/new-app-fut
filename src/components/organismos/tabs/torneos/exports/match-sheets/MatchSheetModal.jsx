import React, { useEffect, useEffectEvent, useState, useRef, useMemo } from "react";
import styled, { useTheme } from "styled-components";
import { RiCloseLine, RiSettings3Line } from "react-icons/ri";
import { TournamentModal, ModalFooter } from "../../TournamentModal";
import { supabase } from "../../../../../../lib/supabase/browserClient.js";
import { exportElementAsPNG } from "../../../../../../utils/imageExporter";
import { ExportDownloadButton, ExportPreviewHeader } from '../shared/ExportPreviewHeader';
import MatchSheetExportLayout from "./MatchSheetExportLayout";
import { MatchSheetPreview } from "./MatchSheetPreview";

const POST_EXPORT_SIZE = { width: 1080, height: 1350 };
const MOBILE_EXPORT_SIZE = { width: 480, height: 1180 };

const MatchSheetModal = ({ isOpen, onClose, match }) => {
    const theme = useTheme(); 
    const matchId = match?.id || match;

    const [loading, setLoading] = useState(true);
    const [fullMatch, setFullMatch] = useState(null);
    const [players, setPlayers] = useState({ local: [], visit: [] });
    
    const [isDarkExport, setIsDarkExport] = useState(false);
    const [isMobileLayout, setIsMobileLayout] = useState(false);
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const exportComponentRef = useRef(null);

    const fetchSheetDataEvent = useEffectEvent(fetchSheetData);

    // Sincronizar tema inicial
    useEffect(() => {
        if (isOpen) {
            const isAppDark = theme.bgtotal && theme.bgtotal.toLowerCase() !== '#ffffff' && theme.bgtotal.toLowerCase() !== '#f3f4f6';
            setIsDarkExport(isAppDark);
            if (matchId) fetchSheetDataEvent();
        }
    }, [isOpen, matchId, theme]);

    async function fetchSheetData() {
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
    }

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

    const exportSize = isMobileLayout ? MOBILE_EXPORT_SIZE : POST_EXPORT_SIZE;

    const renderConfigControls = () => (
        <ExportPreviewHeader
            isDark={isDarkExport}
            setIsDark={setIsDarkExport}
            isMobile={isMobileLayout}
            setIsMobile={setIsMobileLayout}
            onExport={handleExportPNG}
            isExporting={isExporting}
            showExportAction={false}
            showInfo={false}
            inactiveFormatLabel="Post (4:5)"
            activeFormatLabel="Movil"
            formatTitle="Cambiar formato de cedula"
        />
    );

    return (
        <TournamentModal
            isOpen={isOpen}
            onClose={onClose}
            title="Vista Previa Cédula"
        >
            <PreviewWrapper>
                {!loading && (
                    <>
                        <div className="mobile-config-bar">
                            {renderConfigControls()}
                        </div>

                        <FloatingConfigPanel $open={isConfigPanelOpen}>
                            <button
                                type="button"
                                className="config-trigger"
                                onClick={() => setIsConfigPanelOpen((current) => !current)}
                                aria-label={isConfigPanelOpen ? "Ocultar opciones de exportacion" : "Mostrar opciones de exportacion"}
                                title={isConfigPanelOpen ? "Ocultar opciones" : "Opciones de imagen"}
                            >
                                {isConfigPanelOpen ? <RiCloseLine /> : <RiSettings3Line />}
                            </button>
                            <div className="config-content" aria-hidden={!isConfigPanelOpen}>
                                {isConfigPanelOpen && renderConfigControls()}
                            </div>
                        </FloatingConfigPanel>
                    </>
                )}

                <div className="preview-viewport">
                    {loading ? (
                        <LoadingContainer><div className="spinner" /><span>Cargando datos...</span></LoadingContainer>
                    ) : exportData ? (
                        <MatchSheetPreview {...exportSize} fitHeight>
                            <MatchSheetExportLayout
                                ref={exportComponentRef}
                                {...exportData}
                                themeMode={isDarkExport ? 'dark' : 'light'}
                                layoutMode={isMobileLayout ? 'mobile' : 'desktop'}
                            />
                        </MatchSheetPreview>
                    ) : (
                        <LoadError role="alert">No se pudo cargar la cédula. Inténtalo de nuevo.</LoadError>
                    )}
                </div>
            </PreviewWrapper>
            <ModalFooter>
                <button type="button" className="cancel-btn" onClick={onClose}>
                    Cancelar
                </button>
                <ExportDownloadButton
                    onExport={handleExportPNG}
                    isExporting={isExporting}
                    disabled={loading || !exportData}
                />
            </ModalFooter>
        </TournamentModal>
    );
};

export default MatchSheetModal;

const LoadingContainer = styled.div`
    margin: auto;
    padding: 80px 16px;
    text-align: center;

    .spinner {
        width: 40px;
        height: 40px;
        margin: 0 auto 15px;
        border: 4px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        border-left-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
        border-radius: 50%;
        animation: spin-match-sheet 1s linear infinite;
    }

    span {
        color: ${({ theme }) => theme.text};
        font-weight: 600;
        opacity: 0.72;
    }

    @keyframes spin-match-sheet {
        to { transform: rotate(360deg); }
    }
`;

const LoadError = styled.p`
    margin: auto;
    padding: 8px 18px;
    color: ${({ theme }) => theme.tournamentDashboard?.metrics?.danger || theme.text};
    text-align: center;
    font-size: 0.82rem;
`;

const PreviewWrapper = styled.div`
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.bgtotal || theme.bg};
    position: relative;
    overflow-y: auto;
    overscroll-behavior: contain;
    transition: background 220ms ease;

    .mobile-config-bar {
        display: none;
    }

    /* Same footprint as the standings preview: side gutters keep the
       floating config button from covering the image. */
    .preview-viewport {
        flex: 1 0 min(180px, 40dvh);
        min-height: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 12px 64px;
        overflow: hidden;
    }

    @media (max-width: 520px) {
        .mobile-config-bar {
            display: block;
        }

        .preview-viewport {
            padding: 8px 6px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        &, * { transition: none !important; }
    }
`;

const FloatingConfigPanel = styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 3;
    width: 42px;
    height: 42px;

    .config-trigger {
        width: 42px;
        height: 42px;
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        border-radius: 14px;
        background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
        color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || theme.primary};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.15rem;
        box-shadow: ${({ $open }) => ($open ? "0 10px 24px rgba(0, 0, 0, 0.12)" : "none")};
        transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
    }

    .config-trigger:hover {
        background: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
        color: #fff;
    }

    .config-content {
        position: absolute;
        top: 0;
        right: 48px;
        width: 320px;
        overflow: hidden;
        opacity: ${({ $open }) => ($open ? 1 : 0)};
        visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
        pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        border-radius: 14px;
        background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
        box-shadow: ${({ $open }) => ($open ? "0 14px 34px rgba(0, 0, 0, 0.14)" : "none")};
        transition: opacity 0.18s ease, box-shadow 0.22s ease;

        > div {
            border-bottom: 0;
            background: transparent;
        }
    }

    @media (max-width: 520px) {
        display: none;
    }
`;
