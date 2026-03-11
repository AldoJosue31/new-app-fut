import React, { useEffect, useState, useRef } from "react";
import styled, { useTheme } from "styled-components";
import { Modal } from "../../../../../../index"; 
import { exportElementAsPNG } from "../../../../../../utils/imageExporter";
import { supabase } from "../../../../../../supabase/supabase.config"; 
import { ExportPreviewHeader } from '../shared/ExportPreviewHeader';
import GoleadoresExportLayout from "./GoleadoresExportLayout";

export default function GoleadoresExportModal({ isOpen, onClose, goleadores, torneo }) {
    const theme = useTheme(); 
    const [isDarkExport, setIsDarkExport] = useState(false);
    const [isMobileLayout, setIsMobileLayout] = useState(false);
    const [previewScale, setPreviewScale] = useState(0.8); 
    const [isExporting, setIsExporting] = useState(false);
    const [metaInfo, setMetaInfo] = useState({ league: '' });
    const exportComponentRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const isAppDark = theme.bgtotal && theme.bgtotal.toLowerCase() !== '#ffffff';
            setIsDarkExport(isAppDark);
            fetchMetaInfo();
        }
    }, [isOpen, theme, torneo]);

    const fetchMetaInfo = async () => {
        try {
            const { data } = await supabase
                .from('tournaments')
                .select('division:division_id(league:league_id(name))')
                .eq('id', torneo.id)
                .single();
            setMetaInfo({ league: data?.division?.league?.name || 'Liga Local' });
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        const calculateScale = () => {
            const CONTENT_WIDTH = isMobileLayout ? 480 : 900;
            const availableWidth = window.innerWidth - 80;
            setPreviewScale(Math.min(availableWidth / CONTENT_WIDTH, 1) * 0.9);
        };
        if (isOpen) calculateScale();
    }, [isOpen, isMobileLayout]);

    const handleExportPNG = async () => {
        if (!exportComponentRef.current || isExporting) return;
        setIsExporting(true);
        try {
            const fileName = `Goleadores_${torneo?.name || 'Torneo'}_${isMobileLayout ? 'Movil' : 'Desktop'}`;
            await exportElementAsPNG(exportComponentRef, fileName.replace(/\s+/g, '_'), isDarkExport ? '#121212' : '#ffffff');
        } catch (e) { console.error(e); }
        finally { setIsExporting(false); }
    };

    if (!isOpen) return null;

    const modalWidth = `${(isMobileLayout ? 480 : 900) * previewScale + 60}px`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Exportar Goleadores" width={modalWidth}>
            <PreviewWrapper>
                <ExportPreviewHeader 
                    isDark={isDarkExport} setIsDark={setIsDarkExport} 
                    isMobile={isMobileLayout} setIsMobile={setIsMobileLayout} 
                    onExport={handleExportPNG} isExporting={isExporting}
                />
                <div className="preview-viewport">
                    <div className="scale-box" style={{ width: (isMobileLayout ? 480 : 900) * previewScale }}>
                        <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: isMobileLayout ? '480px' : '900px' }}>
                            <GoleadoresExportLayout 
                                ref={exportComponentRef} 
                                goleadores={goleadores} 
                                torneo={torneo} 
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

const PreviewWrapper = styled.div`
    margin: -25px; width: calc(100% + 50px); display: flex; flex-direction: column; background: ${({theme}) => theme.bgtotal || theme.bg}; 
    .preview-viewport { flex: 1; display: flex; justify-content: center; padding: 30px 20px; overflow: hidden; }
    .scale-box { box-shadow: 0 10px 30px rgba(0,0,0,0.3); border-radius: 8px; }
`;