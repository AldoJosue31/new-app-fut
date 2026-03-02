import React from "react";
import styled from "styled-components";
import { v, Btnsave } from "../../../../../../index"; 
import { RiFileDownloadLine, RiImageLine, RiSunLine, RiMoonLine } from "react-icons/ri";

export const ExportPreviewHeader = ({ 
    isDark, 
    setIsDark, 
    isMobile, 
    setIsMobile, 
    onExport, 
    isExporting, 
    title = "Configura la imagen" 
}) => {
    return (
        <HeaderContainer>
            <div className="left-group">
                <RiImageLine size={18} />
                <span className="info-text">{title}</span>
            </div>
            
            <div className="right-group">
                <ToggleContainer onClick={() => !isExporting && setIsMobile(!isMobile)} $active={isMobile} title="Cambiar formato de tamaño">
                    <span className="label-side left">Desktop</span>
                    <div className="track"><div className="thumb" /></div>
                    <span className="label-side right">Móvil</span>
                </ToggleContainer>

                <div className="separator" />

                <ThemeToggleBtn onClick={() => !isExporting && setIsDark(!isDark)} title="Cambiar tema de la imagen">
                    {isDark ? <RiSunLine /> : <RiMoonLine />}
                </ThemeToggleBtn>
                
                <div className="separator" />
                
                <div style={{ opacity: isExporting ? 0.6 : 1, pointerEvents: isExporting ? 'none' : 'auto' }}>
                    <Btnsave 
                        titulo={isExporting ? "..." : "Descargar"} 
                        bgcolor={isExporting ? "#7f8c8d" : v.verde} 
                        icono={isExporting ? <div className="spinner-mini" /> : <RiFileDownloadLine/>} 
                        funcion={onExport} 
                    />
                </div>
            </div>
        </HeaderContainer>
    );
};

const HeaderContainer = styled.div`
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
            border-top-color: #fff; animation: spin-export 1s linear infinite;
        }
        @keyframes spin-export { to { transform: rotate(360deg); } }
    }
`;

const ThemeToggleBtn = styled.button`
    display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;
    border-radius: 50%; border: 1px solid ${({theme}) => theme.bg4}; background: ${({theme}) => theme.bg2};
    color: ${({theme}) => theme.text}; cursor: pointer; transition: all 0.2s; font-size: 1.1rem;
    &:hover { background: ${({theme}) => theme.bg3}; color: ${v.colorPrincipal}; }
`;

const ToggleContainer = styled.div`
    display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;
    .track {
        width: 36px; height: 20px; background-color: ${({ theme }) => theme.bg3};
        border-radius: 20px; position: relative; transition: background-color 0.3s; border: 1px solid ${({ theme }) => theme.color2};
    }
    .thumb {
        width: 16px; height: 16px; background-color: ${({ $active }) => $active ? v.verde : '#999'}; border-radius: 50%; position: absolute; top: 1px; left: 1px;
        transform: ${({ $active }) => $active ? 'translateX(16px)' : 'translateX(0)'}; transition: transform 0.3s ease;
    }
    .label-side { font-size: 0.75rem; font-weight: 700; color: ${({ theme }) => theme.text}; opacity: 0.6; }
    @media (max-width: 600px) { .label-side { display: none; } }
`;