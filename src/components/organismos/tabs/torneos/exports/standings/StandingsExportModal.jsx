// src/components/organismos/tabs/torneos/exports/standings/StandingsExportModal.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";
import { RiCloseLine, RiSettings3Line } from "react-icons/ri";
import { Modal } from "../../../../Modal";
import { exportElementAsPNG } from "../../../../../../utils/imageExporter";
import { supabase } from "../../../../../../supabase/supabase.config";
import { ExportDownloadButton, ExportPreviewHeader } from "../shared/ExportPreviewHeader";
import StandingsExportLayout from "./StandingsExportLayout";

export default function StandingsExportModal({
    isOpen,
    onClose,
    tablaGeneral,
    torneo,
    config,
    activeJornadaName
}) {
    const theme = useTheme();

    const [isDarkExport, setIsDarkExport] = useState(false);
    const [isMobileLayout, setIsMobileLayout] = useState(false);
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [previewScale, setPreviewScale] = useState(0.8);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [metaInfo, setMetaInfo] = useState({
        league: "",
        division: "",
        lastJornada: "",
        leagueLogo: null
    });

    const exportComponentRef = useRef(null);

    const fetchMetaInfo = useCallback(async () => {
        setLoading(true);

        if (!torneo?.id) {
            setMetaInfo({
                league: "Liga Local",
                division: "Division Unica",
                lastJornada: activeJornadaName || "Sin iniciar",
                leagueLogo: null
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
                .eq("id", torneo.id)
                .single();

            const leagueName = torData?.division?.league?.name || "Liga Local";
            const divisionName = torData?.division?.name || "Division Unica";
            const logo =
                torData?.division?.league?.original_logo_url ||
                torData?.division?.league?.logo_url ||
                null;

            setMetaInfo({
                league: leagueName,
                division: divisionName,
                lastJornada: activeJornadaName || "Sin iniciar",
                leagueLogo: logo
            });
        } catch (error) {
            console.error("Error fetching meta info:", error);
        } finally {
            setLoading(false);
        }
    }, [activeJornadaName, torneo?.id]);

    useEffect(() => {
        if (isOpen) {
            const isAppDark =
                theme.bgtotal &&
                theme.bgtotal.toLowerCase() !== "#ffffff" &&
                theme.bgtotal.toLowerCase() !== "#f3f4f6";

            setIsDarkExport(isAppDark);
            setIsExporting(false);
            setIsConfigPanelOpen(false);
            fetchMetaInfo();
        }
    }, [fetchMetaInfo, isOpen, theme]);

    useEffect(() => {
        const calculateScale = () => {
            const contentWidth = 1080;
            const contentHeight = isMobileLayout ? 1920 : 1350;
            const compactViewport = window.innerWidth <= 520;
            const screenPaddingX = compactViewport ? 56 : 80;
            const screenPaddingY = compactViewport ? 240 : 200; // Modificado para dejar más espacio vertical
            
            const availableWidth = Math.max(window.innerWidth - screenPaddingX, 260);
            const availableHeight = Math.max(window.innerHeight - screenPaddingY, 260);

            const scaleWidth = availableWidth / contentWidth;
            const scaleHeight = availableHeight / contentHeight;

            let nextScale = Math.min(scaleWidth, scaleHeight, 1);
            if (!isMobileLayout && nextScale > 0.8) nextScale = 0.85;

            setPreviewScale(nextScale);
        };

        let scaleTimer;
        if (isOpen) {
            scaleTimer = window.setTimeout(calculateScale, 100);
            window.addEventListener("resize", calculateScale);
        }

        return () => {
            if (scaleTimer) window.clearTimeout(scaleTimer);
            window.removeEventListener("resize", calculateScale);
        };
    }, [isOpen, isMobileLayout]);

    const handleExportPNG = async () => {
        if (exportComponentRef.current && !isExporting) {
            setIsExporting(true);
            try {
                const cleanTorneoName = torneo?.name?.replace(/[^a-z0-9_]/gi, "") || "Torneo";
                const cleanJornadaName = (activeJornadaName || "Jornada")
                    .split(" (")[0]
                    .replace(/\s+/g, "_");
                const safeName = `Tabla_${metaInfo.league}_${metaInfo.division}_${cleanTorneoName}_${cleanJornadaName}_${isMobileLayout ? "Story" : "Post"}`;
                const bgColor = isDarkExport ? "#121212" : "#ffffff";

                await exportElementAsPNG(exportComponentRef, safeName.replace(/\s+/g, "_"), bgColor);
            } catch (error) {
                console.error("Error al exportar:", error);
            } finally {
                setIsExporting(false);
            }
        }
    };

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
            activeFormatLabel="Historia (9:16)"
            formatTitle="Cambiar formato de tamano"
        />
    );

    if (!isOpen) return null;

    const modalDynamicWidth = `${Math.max((1080 * previewScale) + 60, 760)}px`;
    const exportHeight = isMobileLayout ? 1920 : 1350;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Exportar Tabla General"
            width={modalDynamicWidth}
            compactHeader
            overlayPadding="6px 18px"
            maxHeight="calc(100dvh - 24px)" /* Ligeramente modificado */
            bodyOverflowY="hidden"
            bodyPadding="0" /* Sin padding para el Body del modal */
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
                            <span>Cargando datos...</span>
                        </LoadingContainer>
                    ) : (
                        <div
                            className="scale-box"
                            style={{
                                width: 1080 * previewScale,
                                height: exportHeight * previewScale,
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    transform: `scale(${previewScale})`,
                                    transformOrigin: "top left",
                                    width: "1080px",
                                    height: `${exportHeight}px`,
                                    transition: "transform 260ms ease"
                                }}
                            >
                                <StandingsExportLayout
                                    ref={exportComponentRef}
                                    tablaGeneral={tablaGeneral}
                                    torneo={torneo}
                                    config={config}
                                    metaInfo={metaInfo}
                                    themeMode={isDarkExport ? "dark" : "light"}
                                    layoutMode={isMobileLayout ? "mobile" : "desktop"}
                                />
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
                        disabled={loading}
                    />
                </ModalFooter>
            </PreviewWrapper>
        </Modal>
    );
}

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
        transition: box-shadow 220ms ease;
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
        border: 4px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        border-left-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
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
        transition: opacity 0.18s ease, box-shadow 0.22s ease;

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
