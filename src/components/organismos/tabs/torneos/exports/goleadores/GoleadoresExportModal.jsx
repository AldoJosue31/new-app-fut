import React, { useEffect, useMemo, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";
import { Modal } from "../../../../../../index";
import { exportElementAsPNG } from "../../../../../../utils/imageExporter";
import { supabase } from "../../../../../../supabase/supabase.config";
import { ExportPreviewHeader } from '../shared/ExportPreviewHeader';
import GoleadoresExportLayout from "./GoleadoresExportLayout";

export default function GoleadoresExportModal({ isOpen, onClose, goleadores, torneo, activeJornadaName = 'Sin iniciar' }) {
    const theme = useTheme();
    const [isDarkExport, setIsDarkExport] = useState(false);
    const [isMobileLayout, setIsMobileLayout] = useState(false);
    const [previewScale, setPreviewScale] = useState(0.8);
    const [isExporting, setIsExporting] = useState(false);
    const [metaInfo, setMetaInfo] = useState({ league: '', division: '' });
    const [playersToShow, setPlayersToShow] = useState(10);
    const exportComponentRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const isAppDark = theme.bgtotal && theme.bgtotal.toLowerCase() !== '#ffffff';
            setIsDarkExport(isAppDark);
            setIsExporting(false);
            if (torneo?.id) {
                fetchMetaInfo();
            }
        }
    }, [isOpen, theme, torneo]);

    useEffect(() => {
        const totalPlayers = Array.isArray(goleadores) ? goleadores.length : 0;
        if (totalPlayers >= 10) {
            setPlayersToShow(10);
            return;
        }

        if (totalPlayers >= 3) {
            setPlayersToShow(totalPlayers);
            return;
        }

        setPlayersToShow(3);
    }, [goleadores]);

    const fetchMetaInfo = async () => {
        try {
            const { data } = await supabase
                .from('tournaments')
                .select('division:division_id(name, league:league_id(name))')
                .eq('id', torneo.id)
                .single();

            setMetaInfo({
                league: data?.division?.league?.name || 'Liga Local',
                division: data?.division?.name || 'Division Unica'
            });
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const calculateScale = () => {
            const contentWidth = isMobileLayout ? 480 : 900;
            const availableWidth = window.innerWidth - 80;
            setPreviewScale(Math.min(availableWidth / contentWidth, 1) * 0.9);
        };

        if (isOpen) {
            calculateScale();
            window.addEventListener('resize', calculateScale);
        }

        return () => window.removeEventListener('resize', calculateScale);
    }, [isOpen, isMobileLayout]);

    const playerOptions = useMemo(() => {
        const totalPlayers = Array.isArray(goleadores) ? goleadores.length : 0;
        const options = [3, 5, 10, 15, 20, 25, totalPlayers]
            .filter((value) => Number.isFinite(value) && value >= 3)
            .filter((value, index, array) => array.indexOf(value) === index)
            .sort((a, b) => a - b);

        return options.length > 0 ? options : [3];
    }, [goleadores]);

    const handleExportPNG = async () => {
        if (!exportComponentRef.current || isExporting) return;

        setIsExporting(true);
        try {
            const cleanLeagueName = (metaInfo?.league || 'Liga').replace(/[^a-z0-9_-]/gi, '_');
            const cleanDivisionName = (metaInfo?.division || 'Division').replace(/[^a-z0-9_-]/gi, '_');
            const cleanTorneoName = (torneo?.name || 'Torneo').replace(/[^a-z0-9_-]/gi, '_');
            const cleanJornadaName = (activeJornadaName || 'Jornada').replace(/[^a-z0-9_-]/gi, '_');
            const fileName = `Goleadores_${cleanLeagueName}_${cleanDivisionName}_${cleanTorneoName}_${cleanJornadaName}_${isMobileLayout ? 'Story' : 'Post'}`;

            await exportElementAsPNG(
                exportComponentRef,
                fileName.replace(/_+/g, '_'),
                isDarkExport ? '#121212' : '#ffffff'
            );
        } catch (e) {
            console.error(e);
            alert("No se pudo descargar la imagen. Verifica las fotos o logos cargados e intenta nuevamente.");
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    const modalWidth = `${(isMobileLayout ? 480 : 900) * previewScale + 60}px`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Exportar Goleadores" width={modalWidth}>
            <PreviewWrapper>
                <ExportPreviewHeader
                    isDark={isDarkExport}
                    setIsDark={setIsDarkExport}
                    isMobile={isMobileLayout}
                    setIsMobile={setIsMobileLayout}
                    onExport={handleExportPNG}
                    isExporting={isExporting}
                    extraControls={(
                        <LimitControl>
                            <span>Mostrar</span>
                            <select value={playersToShow} onChange={(e) => setPlayersToShow(Number(e.target.value))}>
                                {playerOptions.map((value) => (
                                    <option key={value} value={value}>
                                        {value} jugadores
                                    </option>
                                ))}
                            </select>
                        </LimitControl>
                    )}
                />
                <div className="preview-viewport">
                    <div className="scale-box" style={{ width: (isMobileLayout ? 480 : 900) * previewScale }}>
                        <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: isMobileLayout ? '480px' : '900px' }}>
                            <GoleadoresExportLayout
                                ref={exportComponentRef}
                                goleadores={goleadores}
                                torneo={torneo}
                                metaInfo={metaInfo}
                                activeJornadaName={activeJornadaName}
                                maxPlayersToShow={playersToShow}
                                themeMode={isDarkExport ? 'dark' : 'light'}
                                layoutMode={isMobileLayout ? 'mobile' : 'desktop'}
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
    background: ${({theme}) => theme.bgtotal || theme.bg};

    .preview-viewport {
        flex: 1;
        display: flex;
        justify-content: center;
        padding: 30px 20px;
        overflow: hidden;
    }

    .scale-box {
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        border-radius: 8px;
    }
`;

const LimitControl = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${({ theme }) => theme.text};
    font-size: 0.8rem;
    font-weight: 700;

    select {
        min-width: 120px;
        padding: 6px 10px;
        border-radius: 8px;
        border: 1px solid ${({ theme }) => theme.color2};
        background: ${({ theme }) => theme.bg2};
        color: ${({ theme }) => theme.text};
        font-size: 0.8rem;
        font-weight: 600;
    }
`;
