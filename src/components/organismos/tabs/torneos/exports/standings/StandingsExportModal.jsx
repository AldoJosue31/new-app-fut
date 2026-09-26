// src/components/organismos/tabs/torneos/exports/standings/StandingsExportModal.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine, RiSettings3Line, RiTableLine, RiImageLine, RiPaletteLine, RiEqualizerLine } from "react-icons/ri";
import { Modal } from "../../../../Modal";
import { exportElementAsPNG } from "../../../../../../utils/imageExporter";
import { supabase } from "../../../../../../lib/supabase/browserClient.js";
import { ExportDownloadButton, ExportPreviewHeader } from "../shared/ExportPreviewHeader";
import StandingsExportLayout from "./StandingsExportLayout";
import { STANDINGS_TABLE_DESIGNS, STANDINGS_BACKGROUND_DESIGNS, STANDINGS_DESIGN_PRESETS, getStandingsExportAppearance } from "./standingsExportStyles";
import { DEFAULT_LEAGUE_COLOR, normalizeHexColor, extractLogoColor } from "../../../../../../utils/leagueColors.js";

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
    const [showGeneratedDate, setShowGeneratedDate] = useState(true);
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [previewScale, setPreviewScale] = useState(0.3);
    const [tableDesignIndex, setTableDesignIndex] = useState(0);
    const [backgroundDesignIndex, setBackgroundDesignIndex] = useState(0);
    const [activeStyleControl, setActiveStyleControl] = useState("table");
    const [presetIndex, setPresetIndex] = useState(0);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [useLeagueColors, setUseLeagueColors] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState("");
    const [metaInfo, setMetaInfo] = useState({
        league: "",
        division: "",
        lastJornada: "",
        leagueLogo: null,
        leagueColors: null
    });

    const exportComponentRef = useRef(null);
    const previewStageRef = useRef(null);
    const selectedLeagueColors = useLeagueColors ? metaInfo.leagueColors : null;
    const preset = STANDINGS_DESIGN_PRESETS[presetIndex];
    const tableDesign = isCustomizing
        ? STANDINGS_TABLE_DESIGNS[tableDesignIndex]
        : STANDINGS_TABLE_DESIGNS.find((design) => design.id === preset.tableDesign);
    const backgroundDesign = isCustomizing
        ? STANDINGS_BACKGROUND_DESIGNS[backgroundDesignIndex]
        : STANDINGS_BACKGROUND_DESIGNS.find((design) => design.id === preset.backgroundDesign);
    const isChoosingTable = activeStyleControl === "table";
    const selectedStyle = isCustomizing ? (isChoosingTable ? tableDesign : backgroundDesign) : preset;
    const selectedStyleIndex = isCustomizing ? (isChoosingTable ? tableDesignIndex : backgroundDesignIndex) : presetIndex;
    const styleCount = isCustomizing
        ? (isChoosingTable ? STANDINGS_TABLE_DESIGNS.length : STANDINGS_BACKGROUND_DESIGNS.length)
        : STANDINGS_DESIGN_PRESETS.length;
    const previousStyleLabel = isCustomizing ? `Diseño de ${isChoosingTable ? "tabla" : "fondo"} anterior` : "Combinación anterior";
    const nextStyleLabel = isCustomizing ? `Diseño de ${isChoosingTable ? "tabla" : "fondo"} siguiente` : "Combinación siguiente";

    const changeStyleMode = (customize) => {
        if (isExporting || customize === isCustomizing) return;
        if (customize) {
            // Start personalizing the combination currently visible in the preview.
            setTableDesignIndex(STANDINGS_TABLE_DESIGNS.findIndex((design) => design.id === preset.tableDesign));
            setBackgroundDesignIndex(STANDINGS_BACKGROUND_DESIGNS.findIndex((design) => design.id === preset.backgroundDesign));
        } else {
            const matchingPresetIndex = STANDINGS_DESIGN_PRESETS.findIndex((design) =>
                design.tableDesign === tableDesign.id && design.backgroundDesign === backgroundDesign.id);
            // An unmatched custom design returns to the last prepared combination.
            if (matchingPresetIndex !== -1) setPresetIndex(matchingPresetIndex);
        }
        setIsCustomizing(customize);
    };

    const cycleStyle = (direction) => {
        if (isExporting) return;
        const setIndex = isCustomizing
            ? (isChoosingTable ? setTableDesignIndex : setBackgroundDesignIndex)
            : setPresetIndex;
        setIndex((current) => (current + direction + styleCount) % styleCount);
    };

    const fetchMetaInfo = useCallback(async (signal) => {
        setLoading(true);

        if (!torneo?.id) {
            setMetaInfo({
                league: "Liga Local",
                division: "Division Unica",
                lastJornada: activeJornadaName || "Sin iniciar",
                leagueLogo: null,
                leagueColors: null
            });
            setLoading(false);
            return;
        }

        try {
            const { data: torData, error } = await supabase
                .from("tournaments")
                .select(`
                    id,
                    division:division_id (
                        name,
                        league:league_id (name, logo_url, original_logo_url, primary_color, secondary_color)
                    )
                `)
                .eq("id", torneo.id)
                .single()
                .abortSignal(signal);
            if (error) throw error;

            const leagueName = torData?.division?.league?.name || "Liga Local";
            const divisionName = torData?.division?.name || "Division Unica";
            const logo =
                torData?.division?.league?.original_logo_url ||
                torData?.division?.league?.logo_url ||
                null;
            let primaryColor = normalizeHexColor(torData?.division?.league?.primary_color);
            if (!primaryColor && logo) {
                try {
                    primaryColor = await extractLogoColor(logo, { signal });
                } catch (colorError) {
                    if (signal.aborted) return;
                    console.debug("No se pudo detectar el color del logo:", colorError.message);
                }
            }
            if (signal.aborted) return;

            setMetaInfo({
                league: leagueName,
                division: divisionName,
                lastJornada: activeJornadaName || "Sin iniciar",
                leagueLogo: logo,
                leagueColors: torData?.division?.league ? {
                    primary: primaryColor || DEFAULT_LEAGUE_COLOR,
                    secondary: normalizeHexColor(torData.division.league.secondary_color)
                } : null
            });
        } catch (error) {
            if (signal.aborted) return;
            console.error("Error fetching meta info:", error);
            setMetaInfo({ league: "Liga Local", division: "Division Unica", lastJornada: activeJornadaName || "Sin iniciar", leagueLogo: null, leagueColors: null });
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, [activeJornadaName, torneo?.id]);

    useEffect(() => {
        if (isOpen) {
            const controller = new AbortController();
            const isAppDark = theme.bodyRgba === "32,32,32";

            setIsDarkExport(isAppDark);
            setIsExporting(false);
            setExportError("");
            setIsConfigPanelOpen(false);
            fetchMetaInfo(controller.signal);
            return () => controller.abort();
        }
    }, [fetchMetaInfo, isOpen, theme]);

    useEffect(() => {
        const stage = previewStageRef.current;
        if (!isOpen || loading || !stage) return;

        const calculateScale = () => {
            if (!stage.clientWidth || !stage.clientHeight) return;
            setPreviewScale(Math.min(
                stage.clientWidth / 1080,
                stage.clientHeight / (isMobileLayout ? 1920 : 1350),
                isMobileLayout ? 1 : 0.85
            ));
        };

        calculateScale();
        const observer = new ResizeObserver(calculateScale);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [isOpen, isMobileLayout, loading]);

    const handleExportPNG = async () => {
        if (exportComponentRef.current && !isExporting) {
            setIsExporting(true);
            setExportError("");
            try {
                const cleanTorneoName = torneo?.name?.replace(/[^a-z0-9_]/gi, "") || "Torneo";
                const cleanJornadaName = (activeJornadaName || "Jornada")
                    .split(" (")[0]
                    .replace(/\s+/g, "_");
                const safeName = `Tabla_${metaInfo.league}_${metaInfo.division}_${cleanTorneoName}_${cleanJornadaName}_${isMobileLayout ? "Story" : "Post"}`;
                const { page } = getStandingsExportAppearance({
                    themeMode: isDarkExport ? "dark" : "light",
                    tableDesign: tableDesign.id,
                    backgroundDesign: backgroundDesign.id,
                    leagueColors: selectedLeagueColors
                });

                await exportElementAsPNG(exportComponentRef, safeName.replace(/\s+/g, "_"), page.bg);
            } catch (error) {
                console.error("Error al exportar:", error);
                setExportError("No se pudo descargar la imagen. Inténtalo de nuevo.");
            } finally {
                setIsExporting(false);
            }
        }
    };

    const renderConfigControls = () => (
        <div className="export-config-controls">
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
            <GeneratedDateToggle
                type="button"
                role="switch"
                aria-checked={showGeneratedDate}
                aria-label={`${showGeneratedDate ? "Ocultar" : "Mostrar"} fecha de generacion`}
                title={`${showGeneratedDate ? "Ocultar" : "Mostrar"} fecha de generacion`}
                onClick={() => setShowGeneratedDate((current) => !current)}
                disabled={isExporting}
                $active={showGeneratedDate}
            >
                <span>Fecha de generacion</span>
                <span className="switch" aria-hidden="true">
                    <span />
                </span>
            </GeneratedDateToggle>
        </div>
    );

    if (!isOpen) return null;

    const exportHeight = isMobileLayout ? 1920 : 1350;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Exportar Tabla General"
            width="960px"
            compactHeader
            overlayPadding="6px 18px"
            maxHeight="calc(100dvh - 24px)"
            minHeight="calc(100dvh - 24px)"
            bodyOverflowY="hidden"
            bodyPadding="0"
        >
            <PreviewWrapper>
                {!loading && (
                    <>
                        <div className="mobile-config-bar">
                            {renderConfigControls()}
                        </div>

                        <StyleControls role="group" aria-label="Diseño de imagen">
                            <button
                                type="button"
                                aria-pressed={!isCustomizing}
                                onClick={() => changeStyleMode(false)}
                                disabled={isExporting}
                            >
                                <RiPaletteLine aria-hidden="true" />
                                <strong>Combinaciones</strong>
                            </button>
                            <button
                                type="button"
                                aria-pressed={isCustomizing}
                                onClick={() => changeStyleMode(true)}
                                disabled={isExporting}
                            >
                                <RiEqualizerLine aria-hidden="true" />
                                <strong>Personalizar</strong>
                            </button>
                            <button
                                type="button"
                                className="league-colors-control"
                                role="switch"
                                aria-checked={useLeagueColors}
                                aria-label="Usar colores de la liga"
                                onClick={() => setUseLeagueColors((current) => !current)}
                                disabled={isExporting || !metaInfo.leagueColors}
                            >
                                <span className="league-color-swatches" aria-hidden="true">
                                    <span style={{ backgroundColor: metaInfo.leagueColors?.primary || DEFAULT_LEAGUE_COLOR }} />
                                    {metaInfo.leagueColors?.secondary && <span style={{ backgroundColor: metaInfo.leagueColors.secondary }} />}
                                </span>
                                <strong>Colores de la liga</strong>
                                <span aria-hidden="true">{useLeagueColors ? "Sí" : "No"}</span>
                            </button>
                        </StyleControls>

                        {isCustomizing && (
                            <StyleControls $compact role="group" aria-label="Cambiar tabla y fondo por separado">
                                <button
                                    type="button"
                                    aria-pressed={isChoosingTable}
                                    onClick={() => setActiveStyleControl("table")}
                                    disabled={isExporting}
                                >
                                    <RiTableLine aria-hidden="true" />
                                    <span>Tabla <strong>{tableDesign.name}</strong></span>
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={!isChoosingTable}
                                    onClick={() => setActiveStyleControl("background")}
                                    disabled={isExporting}
                                >
                                    <RiImageLine aria-hidden="true" />
                                    <span>Fondo <strong>{backgroundDesign.name}</strong></span>
                                </button>
                            </StyleControls>
                        )}

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

                <div
                    className="preview-viewport"
                    role="region"
                    aria-roledescription="carrusel"
                    aria-label={isCustomizing ? `Vista previa: diseños de ${isChoosingTable ? "tabla" : "fondo"}` : "Vista previa: combinaciones de tabla y fondo"}
                    aria-describedby={loading ? undefined : "standings-style-description"}
                    tabIndex={loading ? -1 : 0}
                    onKeyDown={(event) => {
                        if (!loading && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
                            event.preventDefault();
                            cycleStyle(event.key === "ArrowLeft" ? -1 : 1);
                        }
                    }}
                >
                    {loading ? (
                        <LoadingContainer>
                            <div className="spinner" />
                            <span>Cargando datos...</span>
                        </LoadingContainer>
                    ) : (
                        <>
                            <CarouselArrow
                                type="button"
                                onClick={() => cycleStyle(-1)}
                                aria-label={previousStyleLabel}
                                title={previousStyleLabel}
                                disabled={isExporting}
                            >
                                <RiArrowLeftSLine aria-hidden="true" />
                            </CarouselArrow>
                            <div className="preview-stage" ref={previewStageRef}>
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
                                            height: `${exportHeight}px`
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
                                            showGeneratedDate={showGeneratedDate}
                                            tableDesign={tableDesign.id}
                                            backgroundDesign={backgroundDesign.id}
                                            leagueColors={selectedLeagueColors}
                                        />
                                    </div>
                                </div>
                            </div>
                            <CarouselArrow
                                type="button"
                                onClick={() => cycleStyle(1)}
                                aria-label={nextStyleLabel}
                                title={nextStyleLabel}
                                disabled={isExporting}
                            >
                                <RiArrowRightSLine aria-hidden="true" />
                            </CarouselArrow>
                        </>
                    )}
                </div>

                {!loading && (
                    <StyleCaption id="standings-style-description" aria-live="polite" aria-atomic="true">
                        <div><strong>{selectedStyle.name}</strong><span>{selectedStyleIndex + 1} / {styleCount}</span></div>
                        <p>{selectedLeagueColors ? "Diseño adaptado a los colores de la liga." : selectedStyle.description}</p>
                        {!isCustomizing && <p className="combination-details">{tableDesign.name} + {backgroundDesign.name}{selectedLeagueColors ? " · Colores de la liga" : ""}</p>}
                    </StyleCaption>
                )}
                {exportError && <ExportError role="alert">{exportError}</ExportError>}

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
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) 44px;
        grid-template-rows: minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        padding: 12px 18px;
        overflow: hidden;
        overscroll-behavior: contain;
    }

    .preview-viewport:focus-visible {
        outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
        outline-offset: -2px;
    }

    .preview-stage {
        height: 100%;
        min-height: 0;
        min-width: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
    }

    .scale-box {
        flex-shrink: 0;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
        border-radius: 8px;
        background: transparent;
        transition: box-shadow 220ms ease;
    }

    @media (max-width: 520px) {
        .mobile-config-bar {
            display: block;
        }

        .preview-viewport {
            gap: 4px;
            padding: 8px 6px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        &, * { transition: none !important; }
    }
`;

const StyleControls = styled.div`
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: ${({ $compact }) => $compact ? "4px 64px 4px" : "12px 64px 4px"};
    flex-shrink: 0;

    button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        min-width: 0;
        padding: 8px 14px;
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        border-radius: 12px;
        background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
        color: ${({ theme }) => theme.text};
        font-size: 0.78rem;
        text-align: left;
        cursor: pointer;
        transition: background-color 160ms ease, border-color 160ms ease;
    }

    button > svg { flex-shrink: 0; font-size: 18px; }
    button span { min-width: 0; }
    strong { display: block; font-size: 0.84rem; line-height: 1.3; }

    button[aria-pressed="true"], button[aria-checked="true"] {
        background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
        border-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
        color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.primary};
    }

    button:hover:not(:disabled) {
        border-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
    }

    button:focus-visible {
        outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
        outline-offset: 2px;
    }

    button:disabled { cursor: not-allowed; opacity: 0.55; }

    .league-color-swatches { display: inline-flex; gap: 3px; flex-shrink: 0; }
    .league-color-swatches > span { width: 14px; height: 14px; border: 1px solid ${({ theme }) => theme.text}; border-radius: 50%; }

    @media (max-width: 520px) {
        padding: ${({ $compact }) => $compact ? "4px 12px 2px" : "10px 12px 2px"};
        flex-wrap: wrap;
        button { flex: 1; padding: 6px 10px; }
        .league-colors-control { flex-basis: 100%; justify-content: center; }
    }
`;

const CarouselArrow = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    border-radius: 50%;
    background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
    color: ${({ theme }) => theme.text};
    font-size: 28px;
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease;

    &:hover:not(:disabled) {
        background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
        border-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
        color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.primary};
    }

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
        outline-offset: 3px;
    }

    &:disabled { cursor: not-allowed; opacity: 0.55; }
`;

const StyleCaption = styled.div`
    padding: 2px 18px 12px;
    text-align: center;
    color: ${({ theme }) => theme.text};
    flex-shrink: 0;

    > div { display: flex; align-items: center; justify-content: center; gap: 10px; }
    strong { font-size: 0.88rem; }
    span { font-size: 0.76rem; font-variant-numeric: tabular-nums; }
    p { margin: 4px 0 0; font-size: 0.78rem; line-height: 1.4; }
    .combination-details { font-size: 0.72rem; }
`;

const ExportError = styled.p`
    margin: 0;
    padding: 8px 18px;
    color: ${({ theme }) => theme.tournamentDashboard?.metrics?.danger || theme.text};
    text-align: center;
    font-size: 0.82rem;
`;

const LoadingContainer = styled.div`
    grid-column: 1 / -1;
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
        width: ${({ $open }) => ($open ? "320px" : "0")};
        max-width: 320px;
        height: ${({ $open }) => ($open ? "102px" : "0")};
        overflow: hidden;
        opacity: ${({ $open }) => ($open ? 1 : 0)};
        pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        border-radius: 14px;
        background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
        box-shadow: ${({ $open }) => ($open ? "0 14px 34px rgba(0, 0, 0, 0.14)" : "none")};
        transition: opacity 0.18s ease, box-shadow 0.22s ease;

        .export-config-controls {
            min-width: 320px;
        }
    }

    @media (max-width: 520px) {
        display: none;
    }
`;

const GeneratedDateToggle = styled.button`
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    border: 0;
    background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 800;
    text-align: left;

    .switch {
        width: 36px;
        height: 22px;
        padding: 3px;
        flex: 0 0 auto;
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        border-radius: 999px;
        background: ${({ $active, theme }) => $active
            ? (theme.tournamentDashboard?.primary || theme.primary)
            : (theme.tournamentDashboard?.itemSurface || theme.bg2)};
        box-sizing: border-box;
        transition: background 0.2s ease, border-color 0.2s ease;
    }

    .switch > span {
        display: block;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22);
        transform: translateX(${({ $active }) => ($active ? "14px" : "0")});
        transition: transform 0.2s ease;
    }

    &:hover:not(:disabled) {
        color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || theme.primary};
        background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
    }

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
        outline-offset: -2px;
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
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
