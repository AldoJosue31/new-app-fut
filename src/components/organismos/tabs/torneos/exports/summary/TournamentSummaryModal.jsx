import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { v, Modal, Btnsave } from "../../../../../../index";
import { RiPrinterLine } from "react-icons/ri";
import { TournamentSummaryA4 } from "./TournamentSummaryA4";

export const TournamentSummaryModal = ({ isOpen, onClose, activeTournament, leagueData, participatingTeams, partidos, allTournamentJornadas, tournamentFinalResults, stats }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(false);
        }
    }, [isOpen]);

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Resumen del Torneo" 
            width="900px"
            maxHeight="calc(100dvh - 24px)"
        >
            <Container>
                {loading ? (
                    <LoadingState>
                        <div className="spinner"></div>
                        <span>Generando resumen del torneo...</span>
                    </LoadingState>
                ) : (
                    <>
                        <Controls>
                            <div className="info">
                                <b>Listo para imprimir</b>. Asegúrate de configurar la página en A4 (Vertical) sin márgenes.
                            </div>
                            <Btnsave 
                                titulo="Imprimir PDF" 
                                bgcolor={v.colorPrincipal} 
                                icono={<RiPrinterLine/>} 
                                funcion={handlePrint} 
                            />
                        </Controls>

                        <PreviewContainer>
                            <div className="preview-scroll">
                                <div className="preview-item">
                                    <TournamentSummaryA4 
                                        activeTournament={activeTournament}
                                        leagueData={leagueData}
                                        participatingTeams={participatingTeams}
                                        partidos={partidos}
                                        allTournamentJornadas={allTournamentJornadas}
                                        tournamentFinalResults={tournamentFinalResults}
                                        stats={stats}
                                    />
                                </div>
                            </div>
                        </PreviewContainer>

                        {/* --- CONTENIDO OCULTO PARA IMPRESIÓN (Renderizado vía Portal al body) --- */}
                        {createPortal(
                            <div id="print-portal-root">
                                <TournamentSummaryA4 
                                    activeTournament={activeTournament}
                                    leagueData={leagueData}
                                    participatingTeams={participatingTeams}
                                    partidos={partidos}
                                    allTournamentJornadas={allTournamentJornadas}
                                    tournamentFinalResults={tournamentFinalResults}
                                    stats={stats}
                                />
                            </div>,
                            document.body
                        )}
                    </>
                )}
            </Container>
            
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
                        background: #e2e8f0 !important;
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
                        background: #e2e8f0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    #print-portal-root .print-page {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                }
            `}</style>
        </Modal>
    );
};

const Container = styled.div`
    display: flex; flex-direction: column; gap: 20px;
    height: 85vh;
`;

const Controls = styled.div`
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 15px; border-bottom: 1px solid ${({theme})=>theme.bg4};
    .info { color: ${({theme})=>theme.text}; font-size: 0.9rem; }
`;

const PreviewContainer = styled.div`
    background: #525659; 
    padding: 30px;
    overflow-y: auto;
    flex: 1;
    border-radius: 8px;
    
    .preview-scroll {
        display: flex; flex-direction: column; gap: 30px; 
        align-items: center;
    }

    .preview-item {
        transform: scale(0.9);
        transform-origin: top center;
        margin-bottom: -100px;
    }
    .preview-item:last-child { margin-bottom: 0; }
`;

const LoadingState = styled.div`
    display: flex; flex-direction: column; gap: 10px;
    align-items: center; justify-content: center; height: 100%;
    color: ${({theme})=>theme.text}; font-weight: 600;
    .spinner {
        border: 4px solid ${({theme})=>theme.bg3}; 
        border-top: 4px solid ${v.colorPrincipal}; 
        border-radius: 50%; width: 40px; height: 40px; 
        animation: spin 1s linear infinite;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;
