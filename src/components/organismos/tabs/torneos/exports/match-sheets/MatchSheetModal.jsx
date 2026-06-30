import React, { useEffect, useState, useRef, useMemo } from "react";
import styled, { useTheme } from "styled-components";
import { RiCloseLine, RiSettings3Line } from "react-icons/ri";
import { v, Modal } from "../../../../../../index"; 
import { supabase } from "../../../../../../supabase/supabase.config";
import { exportElementAsPNG } from "../../../../../../utils/imageExporter";
import { ExportDownloadButton, ExportPreviewHeader } from '../shared/ExportPreviewHeader';
import MatchSheetExportLayout from "./MatchSheetExportLayout";

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
            const exportSize = isMobileLayout ? MOBILE_EXPORT_SIZE : POST_EXPORT_SIZE;
            const compactViewport = window.innerWidth <= 520;
            const screenPaddingX = compactViewport ? 56 : 80;
            const screenPaddingY = compactViewport ? 240 : 200;
            const availableWidth = Math.max(window.innerWidth - screenPaddingX, 260);
            const availableHeight = Math.max(window.innerHeight - screenPaddingY, 260);
            
            let newScale = Math.min(availableWidth / exportSize.width, availableHeight / exportSize.height);
            if (newScale > 1) newScale = 1;
            setPreviewScale(newScale * 0.94);
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

    const exportSize = isMobileLayout ? MOBILE_EXPORT_SIZE : POST_EXPORT_SIZE;
    const modalWidth = `${Math.max((exportSize.width * previewScale) + 60, 760)}px`;
    const previewWidth = exportSize.width * previewScale;
    const previewHeight = exportSize.height * previewScale;

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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Vista Previa Cédula"
            width={modalWidth}
            compactHeader
            overlayPadding="6px 18px"
            maxHeight="calc(100dvh - 24px)"
            bodyOverflowY="hidden"
            bodyPadding="0"
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
                    ) : (
                        <div
                            className="scale-box"
                            style={{
                                width: previewWidth,
                                height: previewHeight,
                                transition: 'width 260ms ease, height 260ms ease',
                            }}
                        >
                            <div
                                style={{
                                    transform: `scale(${previewScale})`,
                                    transformOrigin: 'top left',
                                    width: `${exportSize.width}px`,
                                    height: `${exportSize.height}px`,
                                    transition: 'transform 260ms ease',
                                }}
                            >
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
                    )}
                </div>

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
            </PreviewWrapper>
        </Modal>
    );
};

export default MatchSheetModal;

const LoadingContainer = styled.div` padding: 80px; text-align: center; .spinner { border: 4px solid #eee; width: 40px; height: 40px; border-radius: 50%; border-left-color: ${v.colorPrincipal}; animation: spin 1s linear infinite; margin: 0 auto 15px; } @keyframes spin { to { transform: rotate(360deg); } } span { font-weight: 600; color: ${({theme})=>theme.text}; opacity: 0.7; } `;
const PreviewWrapper = styled.div`
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: ${({theme}) => theme.bgtotal || theme.bg};
    position: relative;
    transition: background 220ms ease;

    .mobile-config-bar {
        display: none;
    }

    .preview-viewport {
        flex: 1 1 auto;
        min-height: 0;
        display: grid;
        place-items: center;
        padding: 16px;
        overflow-x: auto;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-gutter: stable both-edges;
    }

    .scale-box {
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
        border-radius: 8px;
        overflow: hidden;
        background: transparent;
        flex: 0 0 auto;
        margin: auto;
        justify-self: center;
        align-self: center;
        max-width: 100%;
        transition: width 260ms ease, height 260ms ease, box-shadow 220ms ease;
        will-change: width, height;
    }

    .scale-box,
    .scale-box * {
        transition-property: background-color, border-color, color, opacity, box-shadow, transform;
        transition-duration: 220ms;
        transition-timing-function: ease;
    }

    @media (max-width: 520px) {
        .mobile-config-bar {
            display: block;
        }

        .preview-viewport {
            padding: 12px;
        }
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
        width: ${({ $open }) => ($open ? "292px" : "0")};
        max-width: 292px;
        height: 42px;
        overflow: hidden;
        opacity: ${({ $open }) => ($open ? 1 : 0)};
        pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        border-radius: 14px;
        background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
        box-shadow: ${({ $open }) => ($open ? "0 14px 34px rgba(0, 0, 0, 0.14)" : "none")};
        transition: width 0.22s ease, opacity 0.18s ease, box-shadow 0.22s ease;

        > div {
            border-bottom: 0;
            background: transparent;
            min-width: 292px;
            height: 100%;
            padding-top: 3px;
            padding-bottom: 3px;
        }
    }

    @media (max-width: 520px) {
        display: none;
    }
`;

const ModalFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
    border-top: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};

    .cancel-btn {
        min-height: 40px;
        padding: 9px 20px;
        border-radius: 12px;
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        background: transparent;
        color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 800;
        transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    .cancel-btn:hover {
        background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
        color: ${({ theme }) => theme.text};
    }

    .export-action > button {
        min-height: 42px;
        padding: 10px 22px;
        font-size: 0.92rem;
    }

    @media (max-width: 520px) {
        padding: 12px;

        .cancel-btn,
        .export-action,
        .export-action > button {
            flex: 1 1 0;
            width: 100%;
        }
    }
`;
