// src/components/organismos/tabs/torneos/exports/standings/StandingsExportModal.jsx
import React, { useEffect, useState, useRef } from "react";
import styled, { useTheme } from "styled-components";
import { v, Modal, Btnsave } from "../../../../../../index"; 
import { RiFileDownloadLine, RiImageLine, RiSunLine, RiMoonLine } from "react-icons/ri";
import { exportElementAsPNG } from "../../../../../../utils/imageExporter";
import { supabase } from "../../../../../../supabase/supabase.config"; 
import StandingsExportLayout from "./StandingsExportLayout";

export default function StandingsExportModal({ isOpen, onClose, tablaGeneral, torneo, config, activeJornadaName }) {
    const theme = useTheme(); 
    
    // Controles de Exportación
    const [isDarkExport, setIsDarkExport] = useState(false);
    const [isMobileLayout, setIsMobileLayout] = useState(false);
    const [previewScale, setPreviewScale] = useState(0.8); 
    
    const [isExporting, setIsExporting] = useState(false);
    const [metaInfo, setMetaInfo] = useState({ league: '', division: '', lastJornada: '', leagueLogo: null });
    
    const exportComponentRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const isAppDark = theme.bgtotal && theme.bgtotal.toLowerCase() !== '#ffffff' && theme.bgtotal.toLowerCase() !== '#f3f4f6';
            setIsDarkExport(isAppDark);
            setIsExporting(false); 
            
            if (torneo?.id) {
                fetchMetaInfo();
            }
        }
    }, [isOpen, theme, torneo, activeJornadaName]); 

    const fetchMetaInfo = async () => {
        try {
            const { data: torData } = await supabase
                .from('tournaments')
                .select(`
                    id,
                    division:division_id (
                        name,
                        league:league_id (name, logo_url, original_logo_url)
                    )
                `)
                .eq('id', torneo.id)
                .single();
            
            const leagueName = torData?.division?.league?.name || 'Liga Local';
            const divisionName = torData?.division?.name || 'División Única';
            
            const logo = torData?.division?.league?.original_logo_url || torData?.division?.league?.logo_url || null;

            setMetaInfo({
                league: leagueName,
                division: divisionName,
                lastJornada: activeJornadaName || 'Sin iniciar',
                leagueLogo: logo
            });

        } catch (error) {
            console.error("Error fetching meta info:", error);
        }
    };

    // Calcular la escala de la vista previa dinámicamente según la resolución 1350 vs 1920
    useEffect(() => {
        const calculateScale = () => {
            const CONTENT_WIDTH = 1080; 
            const CONTENT_HEIGHT = isMobileLayout ? 1920 : 1350; // Post = 1350px, Story = 1920px
            const SCREEN_PADDING_X = 80; 
            const SCREEN_PADDING_Y = 220; 
            
            const availableWidth = window.innerWidth - SCREEN_PADDING_X;
            const availableHeight = window.innerHeight - SCREEN_PADDING_Y;

            let scaleWidth = availableWidth / CONTENT_WIDTH;
            let scaleHeight = availableHeight / CONTENT_HEIGHT; 

            let MathScale = Math.min(scaleWidth, scaleHeight);
            if (MathScale > 1) MathScale = 1; 
            if (!isMobileLayout && MathScale > 0.8) MathScale = 0.85; 
            
            setPreviewScale(MathScale);
        };

        if (isOpen) {
            setTimeout(calculateScale, 100);
            window.addEventListener('resize', calculateScale);
        }
        return () => window.removeEventListener('resize', calculateScale);
    }, [isOpen, isMobileLayout]);

    const handleExportPNG = async () => {
        if (exportComponentRef.current && !isExporting) {
            setIsExporting(true); 
            try {
                const cleanTorneoName = torneo?.name?.replace(/[^a-z0-9_]/gi, '') || 'Torneo';
                const cleanJornadaName = (activeJornadaName || 'Jornada').split(' (')[0].replace(/\s+/g, '_');
                
                const safeName = `Tabla_${metaInfo.league}_${metaInfo.division}_${cleanTorneoName}_${cleanJornadaName}_${isMobileLayout ? 'Story' : 'Post'}`;
                const bgColor = isDarkExport ? '#121212' : '#ffffff';
                
                await exportElementAsPNG(exportComponentRef, safeName.replace(/\s+/g, '_'), bgColor);
            } catch (error) {
                console.error("Error al exportar:", error);
            } finally {
                setIsExporting(false); 
            }
        }
    };

    if (!isOpen) return null;

    // El ancho siempre es la base 1080 escalada para caber en la pantalla
    const modalDynamicWidth = `${(1080 * previewScale) + 60}px`;
    const exportHeight = isMobileLayout ? 1920 : 1350;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Exportar Tabla General" width={modalDynamicWidth}>
            <PreviewWrapper>
                 <div className="preview-header">
                    <div className="left-group">
                        <RiImageLine size={18} />
                        <span className="info-text">Configura la imagen</span>
                    </div>
                    
                    <div className="right-group">
                        <ToggleContainer onClick={() => !isExporting && setIsMobileLayout(!isMobileLayout)} $active={isMobileLayout} title="Cambiar formato de tamaño" style={{ opacity: isExporting ? 0.5 : 1, pointerEvents: isExporting ? 'none' : 'auto' }}>
                            <span className="label-side left">Post (4:5)</span>
                            <div className="track"><div className="thumb" /></div>
                            <span className="label-side right">Historia (9:16)</span>
                        </ToggleContainer>

                        <div className="separator"></div>

                        <ThemeToggleBtn onClick={() => !isExporting && setIsDarkExport(!isDarkExport)} title="Cambiar tema de la imagen" style={{ opacity: isExporting ? 0.5 : 1, pointerEvents: isExporting ? 'none' : 'auto' }}>
                            {isDarkExport ? <RiSunLine /> : <RiMoonLine />}
                        </ThemeToggleBtn>
                        
                        <div className="separator"></div>
                        
                        <div style={{ opacity: isExporting ? 0.6 : 1, pointerEvents: isExporting ? 'none' : 'auto', transition: 'all 0.3s' }}>
                            <Btnsave 
                                titulo={isExporting ? "Exportando..." : "Descargar"} 
                                bgcolor={isExporting ? "#7f8c8d" : "#27ae60"} 
                                icono={isExporting ? <div className="spinner-mini" /> : <RiFileDownloadLine/>} 
                                funcion={handleExportPNG} 
                            />
                        </div>
                    </div>
                </div>
                
                <div className="preview-viewport" style={{ alignItems: 'center' }}>
                    <div 
                        className="scale-box"
                        style={{ 
                            width: 1080 * previewScale, 
                            height: exportHeight * previewScale, 
                            overflow: 'hidden'
                        }}
                    >
                        <div 
                            style={{ 
                                transform: `scale(${previewScale})`, 
                                transformOrigin: 'top left',
                                width: '1080px', 
                                height: `${exportHeight}px`
                            }}
                        >
                            <StandingsExportLayout 
                                ref={exportComponentRef} 
                                tablaGeneral={tablaGeneral}
                                torneo={torneo}
                                config={config}
                                metaInfo={metaInfo} 
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

// --- ESTILOS ---
const ThemeToggleBtn = styled.button`
    display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;
    border-radius: 50%; border: 1px solid ${({theme}) => theme.bg4}; background: ${({theme}) => theme.bg2};
    color: ${({theme}) => theme.text}; cursor: pointer; transition: all 0.2s; font-size: 1.1rem; flex-shrink:0;
    &:hover { background: ${({theme}) => theme.bg3}; color: ${v.colorPrincipal}; }
`;

const ToggleContainer = styled.div`
    display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;
    .track {
        width: 36px; height: 20px; background: ${({ theme }) => theme.bg3};
        border-radius: 20px; position: relative; transition: background-color 0.3s; border: 1px solid ${({ theme }) => theme.color2};
    }
    .thumb {
        width: 16px; height: 16px; background: ${({ $active, theme }) => $active ? v.verde : theme.text}; border-radius: 50%; position: absolute; top: 1px; left: 1px;
        transform: ${({ $active }) => $active ? 'translateX(16px)' : 'translateX(0)'}; transition: transform 0.3s ease;
    }
    .label-side { font-size: 0.75rem; font-weight: 700; color: ${({ theme }) => theme.text}; opacity: 0.6; transition: 0.3s;}
    .left { opacity: ${({ $active }) => $active ? 0.6 : 1}; color: ${({ $active }) => $active ? 'inherit' : v.colorPrincipal}; }
    .right { opacity: ${({ $active }) => $active ? 1 : 0.6}; color: ${({ $active }) => $active ? v.verde : 'inherit'}; }
    
    @media (max-width: 600px) { .label-side { display: none; } }
`;

const PreviewWrapper = styled.div`
    margin: -25px; width: calc(100% + 50px); display: flex; flex-direction: column; background: ${({theme}) => theme.bgtotal || theme.bg}; 
    
    .preview-header { 
        display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; 
        background: ${({theme}) => theme.bg}; border-bottom: 1px solid ${({theme}) => theme.bg3};
        flex-wrap: wrap; gap: 10px;

        .left-group {
            display: flex; align-items: center; gap: 8px; color: ${({theme}) => theme.text}; font-size: 0.9rem; font-weight: 500;
            @media (max-width: 500px) { .info-text { display: none; } }
        }

        .right-group {
            display: flex; align-items: center; gap: 12px;
            .separator { width: 1px; height: 20px; background: ${({theme}) => theme.bg3}; }
            
            .spinner-mini {
                width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%;
                border-top-color: #fff; animation: spin-export 1s ease-in-out infinite;
            }
            @keyframes spin-export { to { transform: rotate(360deg); } }
        }
    }
    
    .preview-viewport {
        flex: 1; display: flex; justify-content: center; padding: 30px 20px; overflow-x: auto; overflow-y: hidden;
    }

    .scale-box { box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4); border-radius: 8px; background: transparent; }
`;