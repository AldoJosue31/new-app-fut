// src/components/organismos/tabs/torneos/exports/standings/StandingsExportModal.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";
import { Modal } from "../../../../../../index";
import { exportElementAsPNG } from "../../../../../../utils/imageExporter";
import { supabase } from "../../../../../../supabase/supabase.config";
import { ExportPreviewHeader } from "../shared/ExportPreviewHeader";
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
    const [previewScale, setPreviewScale] = useState(0.8);
    const [isExporting, setIsExporting] = useState(false);
    const [metaInfo, setMetaInfo] = useState({
        league: "",
        division: "",
        lastJornada: "",
        leagueLogo: null
    });

    const exportComponentRef = useRef(null);

    const fetchMetaInfo = useCallback(async () => {
        if (!torneo?.id) return;

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
            fetchMetaInfo();
        }
    }, [fetchMetaInfo, isOpen, theme]);

    useEffect(() => {
        const calculateScale = () => {
            const contentWidth = 1080;
            const contentHeight = isMobileLayout ? 1920 : 1350;
            const compactViewport = window.innerWidth <= 520;
            const screenPaddingX = compactViewport ? 56 : 80;
            const screenPaddingY = compactViewport ? 290 : 220;
            const availableWidth = Math.max(window.innerWidth - screenPaddingX, 260);
            const availableHeight = Math.max(window.innerHeight - screenPaddingY, 260);

            const scaleWidth = availableWidth / contentWidth;
            const scaleHeight = availableHeight / contentHeight;

            let nextScale = Math.min(scaleWidth, scaleHeight, 1);
            if (!isMobileLayout && nextScale > 0.8) nextScale = 0.85;

            setPreviewScale(nextScale);
        };

        if (isOpen) {
            setTimeout(calculateScale, 100);
            window.addEventListener("resize", calculateScale);
        }

        return () => window.removeEventListener("resize", calculateScale);
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

    if (!isOpen) return null;

    const modalDynamicWidth = `${(1080 * previewScale) + 60}px`;
    const exportHeight = isMobileLayout ? 1920 : 1350;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Exportar Tabla General" width={modalDynamicWidth}>
            <PreviewWrapper>
                <ExportPreviewHeader
                    isDark={isDarkExport}
                    setIsDark={setIsDarkExport}
                    isMobile={isMobileLayout}
                    setIsMobile={setIsMobileLayout}
                    onExport={handleExportPNG}
                    isExporting={isExporting}
                    title="Configura la imagen"
                    inactiveFormatLabel="Post (4:5)"
                    activeFormatLabel="Historia (9:16)"
                    formatTitle="Cambiar formato de tamano"
                />

                <div className="preview-viewport">
                    <div
                        className="scale-box"
                        style={{
                            width: 1080 * previewScale,
                            height: exportHeight * previewScale,
                            overflow: "hidden"
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
                            />
                        </div>
                    </div>
                </div>
            </PreviewWrapper>
        </Modal>
    );
}

const PreviewWrapper = styled.div`
    margin: -25px;
    width: calc(100% + 50px);
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.bgtotal || theme.bg};

    .preview-viewport {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 28px 20px;
        overflow-x: auto;
        overflow-y: hidden;
    }

    .scale-box {
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
        border-radius: 8px;
        background: transparent;
    }

    @media (max-width: 520px) {
        .preview-viewport {
            padding: 18px 10px;
        }
    }
`;
