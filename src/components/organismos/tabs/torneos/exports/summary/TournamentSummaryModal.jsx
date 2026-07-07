import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import styled, { useTheme } from "styled-components";
import { RiCloseLine, RiSettings3Line } from "react-icons/ri";
import { Modal } from "../../../../../../index";
import { ExportPreviewHeader } from "../shared/ExportPreviewHeader";
import { TournamentSummaryA4 } from "./TournamentSummaryA4";
import { supabase } from "../../../../../../supabase/supabase.config";
import { v } from "../../../../../../styles/variables";

export const TournamentSummaryModal = ({ 
    isOpen, 
    onClose, 
    activeTournament, 
    leagueData, 
    participatingTeams, 
    partidos, 
    allTournamentJornadas, 
    tournamentFinalResults, 
    stats 
}) => {
    const theme = useTheme();

    const [isDarkExport, setIsDarkExport] = useState(false);
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [previewScale, setPreviewScale] = useState(0.8);
    const [loading, setLoading] = useState(true);
    const [metaInfo, setMetaInfo] = useState({
        league: "",
        division: "",
        leagueLogo: null
    });

    const fetchMetaInfo = useCallback(async () => {
        setLoading(true);

        if (!activeTournament?.id) {
            setMetaInfo({
                league: leagueData?.name || "Liga Local",
                division: "Division Unica",
                leagueLogo: leagueData?.logo_url || null
            });
            setLoading(false);
            return;
        }

        try {
            const { data: torData } = await supabase
                .from("tournaments")
                .select(`
                    id,
                    division:division_id (
                        name,
                        league:league_id (name, logo_url, original_logo_url)
                    )
                `)
                .eq("id", activeTournament.id)
                .single();

            const leagueName = torData?.division?.league?.name || leagueData?.name || "Liga Local";
            const divisionName = torData?.division?.name || "Division Unica";
            const logo =
                torData?.division?.league?.original_logo_url ||
                torData?.division?.league?.logo_url ||
                leagueData?.logo_url ||
                null;

            setMetaInfo({
                league: leagueName,
                division: divisionName,
                leagueLogo: logo
            });
        } catch (error) {
            console.error("Error fetching meta info:", error);
        } finally {
            setLoading(false);
        }
    }, [activeTournament?.id, leagueData]);

    useEffect(() => {
        if (isOpen) {
            const isAppDark =
                theme.bgtotal &&
                theme.bgtotal.toLowerCase() !== "#ffffff" &&
                theme.bgtotal.toLowerCase() !== "#f3f4f6";

            setIsDarkExport(isAppDark);
            setIsConfigPanelOpen(false);
            fetchMetaInfo();
        }
    }, [fetchMetaInfo, isOpen, theme]);

    useEffect(() => {
        const calculateScale = () => {
            // A4 pixel dimensions at 96 DPI: 794 x 1123
            const contentWidth = 794;
            const contentHeight = 1123;
            const compactViewport = window.innerWidth <= 520;
            const screenPaddingX = compactViewport ? 56 : 80;
            const screenPaddingY = compactViewport ? 240 : 200;
            
            const availableWidth = Math.max(window.innerWidth - screenPaddingX, 260);
            const availableHeight = Math.max(window.innerHeight - screenPaddingY, 260);

            const scaleWidth = availableWidth / contentWidth;
            const scaleHeight = availableHeight / contentHeight;

            let nextScale = Math.min(scaleWidth, scaleHeight, 1);
            if (nextScale > 0.8) nextScale = 0.85;

            setPreviewScale(nextScale);
        };

        if (isOpen) {
            setTimeout(calculateScale, 100);
            window.addEventListener("resize", calculateScale);
        }

        return () => window.removeEventListener("resize", calculateScale);
    }, [isOpen]);

    const handlePrint = () => {
        window.print();
    };

    const renderConfigControls = () => (
        <ExportPreviewHeader
            isDark={isDarkExport}
            setIsDark={setIsDarkExport}
            isMobile={false}
            setIsMobile={() => {}}
            onExport={handlePrint}
            isExporting={false}
            showExportAction={false}
            showInfo={false}
            inactiveFormatLabel="Impresion"
            activeFormatLabel="A4"
            formatTitle="Exportacion A4"
            disableFormatToggle={true}
        />
    );

    if (!isOpen) return null;

    const exportWidth = 794; // mm to px approx (210mm)
    const exportHeight = 1123; // mm to px approx (297mm)
    const modalDynamicWidth = `${Math.max((exportWidth * previewScale) + 60, 760)}px`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Exportar Resumen del Torneo"
            width={modalDynamicWidth}
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
                        <LoadingContainer>
                            <div className="spinner" />
                            <span>Generando resumen del torneo...</span>
                        </LoadingContainer>
                    ) : (
                        <div
                            className="scale-box"
                            style={{
                                width: exportWidth * previewScale,
                                height: exportHeight * previewScale,
                                overflow: "hidden",
                                transition: "width 260ms ease, height 260ms ease"
                            }}
                        >
                            <div
                                style={{
                                    transform: `scale(${previewScale})`,
                                    transformOrigin: "top left",
                                    width: `${exportWidth}px`,
                                    height: `${exportHeight}px`,
                                    transition: "transform 260ms ease",
                                    overflowY: "auto",
                                    background: isDarkExport ? "#1e293b" : "#e2e8f0"
                                }}
                            >
                                <TournamentSummaryA4 
                                    activeTournament={activeTournament}
                                    leagueData={leagueData}
                                    participatingTeams={participatingTeams}
                                    partidos={partidos}
                                    allTournamentJornadas={allTournamentJornadas}
                                    tournamentFinalResults={tournamentFinalResults}
                                    stats={stats}
                                    metaInfo={metaInfo}
                                    themeMode={isDarkExport ? "dark" : "light"}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        Cancelar
                    </button>
                    <PrintButton onClick={handlePrint} disabled={loading}>
                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><path d="M16 3H8v2h8V3zm3 4H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-1 11H6v-5h12v5zm2-6.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"></path></svg>
                        Imprimir / Guardar PDF
                    </PrintButton>
                </ModalFooter>

                {/* --- CONTENIDO OCULTO PARA IMPRESIÓN (Renderizado vía Portal al body) --- */}
                {!loading && createPortal(
                    <div id="print-portal-root">
                        <TournamentSummaryA4 
                            activeTournament={activeTournament}
                            leagueData={leagueData}
                            participatingTeams={participatingTeams}
                            partidos={partidos}
                            allTournamentJornadas={allTournamentJornadas}
                            tournamentFinalResults={tournamentFinalResults}
                            stats={stats}
                            metaInfo={metaInfo}
                            themeMode={isDarkExport ? "dark" : "light"}
                        />
                    </div>,
                    document.body
                )}
            </PreviewWrapper>
            
            {/* CSS GLOBAL DE IMPRESIÓN */}
            <style>{`
                #print-portal-root {
                    display: none;
                }

                @media print {
                    @page { 
                        size: A4 portrait !important; 
                        margin: 0 !important; 
                    }

                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        height: 100% !important;
                        width: 100% !important;
                    }

                    body > *:not(#print-portal-root) {
                        display: none !important;
                    }

                    #print-portal-root {
                        display: block !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        background: transparent !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    #print-portal-root .print-page {
                        page-break-after: always !important;
                        break-after: page !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </Modal>
    );
};

const PreviewWrapper = styled.div`
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.bgtotal || theme.bg};
    position: relative;
    transition: background 220ms ease;

    .mobile-config-bar {
        display: none;
    }

    .preview-viewport {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 12px 22px;
        overflow-x: auto;
        overflow-y: auto;
        overscroll-behavior: contain;
    }

    .scale-box {
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
        border-radius: 8px;
        background: transparent;
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
            padding: 10px;
        }
    }
`;

const LoadingContainer = styled.div`
    padding: 80px;
    text-align: center;

    .spinner {
        width: 40px;
        height: 40px;
        margin: 0 auto 15px;
        border: 4px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4 || "#333"};
        border-left-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || "#3498db"};
        border-radius: 50%;
        animation: spin-standings-export 1s linear infinite;
    }

    span {
        color: ${({ theme }) => theme.text};
        font-weight: 600;
        opacity: 0.72;
    }

    @keyframes spin-standings-export {
        to { transform: rotate(360deg); }
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
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4 || "#444"};
        border-radius: 14px;
        background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6 || "#222"};
        color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || theme.primary || "#3498db"};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.15rem;
        box-shadow: ${({ $open }) => ($open ? "0 10px 24px rgba(0, 0, 0, 0.12)" : "none")};
        transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
    }

    .config-trigger:hover {
        background: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || "#3498db"};
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
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4 || "#444"};
        border-radius: 14px;
        background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg || "#111"};
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
    background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg || "#111"};
    border-top: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4 || "#444"};

    .cancel-btn {
        min-height: 40px;
        padding: 9px 20px;
        border-radius: 12px;
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4 || "#444"};
        background: transparent;
        color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text || "#ccc"};
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 800;
        transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    .cancel-btn:hover {
        background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2 || "#222"};
        color: ${({ theme }) => theme.text || "#fff"};
    }

    @media (max-width: 520px) {
        padding: 12px;

        .cancel-btn {
            flex: 1 1 0;
            width: 100%;
        }
    }
`;

const PrintButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 9px 20px;
    border-radius: 12px;
    border: none;
    background: ${v.colorPrincipal};
    color: #fff;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 800;
    transition: filter 0.2s ease;
    flex: 1 1 0;
    
    @media (min-width: 521px) {
        flex: none;
    }
    
    &:hover {
        filter: brightness(1.1);
    }
    
    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;
