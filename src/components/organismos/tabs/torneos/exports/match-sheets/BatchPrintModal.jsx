import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom"; // IMPORTANTE: Para renderizar fuera del #root
import styled from "styled-components";
import { v, Modal, Btnsave } from "../../../../../../index";
import { supabase } from "../../../../../../supabase/supabase.config";
import { RiPrinterLine } from "react-icons/ri";
import { MatchSheetA4 } from "./MatchSheetA4";

export const BatchPrintModal = ({ isOpen, onClose, matchesToPrint }) => {
    const [loading, setLoading] = useState(true);
    const [processedMatches, setProcessedMatches] = useState([]);

    useEffect(() => {
        if (isOpen && matchesToPrint?.length > 0) {
            fetchAllMatchData();
        }
    }, [isOpen, matchesToPrint]);

    const fetchAllMatchData = async () => {
        setLoading(true);
        try {
            const matchIds = matchesToPrint.map(m => m.id);
            
            // 1. Fetch partidos (Optimizado)
            const { data: fullMatches, error: matchError } = await supabase
                .from('matches')
                .select(`
                    *,
                    local:team1_id (name, logo_url),
                    visitante:team2_id (name, logo_url),
                    referee:referee_id (full_name),
                    jornada:jornada_id (
                        name,
                        tournament:tournament_id (
                            season,
                            config, 
                            division:division_id (
                                name,
                                league:league_id (name, logo_url)
                            )
                        )
                    )
                `)
                .in('id', matchIds)
                .order('date', { ascending: true }); 

            if (matchError) throw matchError;

            // 2. Fetch jugadores
            const teamIds = new Set();
            fullMatches.forEach(m => {
                if (m.team1_id) teamIds.add(m.team1_id);
                if (m.team2_id) teamIds.add(m.team2_id);
            });

            let allPlayers = [];
            if (teamIds.size > 0) {
                const { data: playersData, error: playersError } = await supabase
                    .from('players')
                    .select('id, first_name, last_name, dorsal, team_id')
                    .in('team_id', Array.from(teamIds))
                    .eq('is_active', true);

                if (playersError) throw playersError;
                allPlayers = playersData;
            }

            // 3. Organizar
            const playersByTeam = {};
            allPlayers.forEach(p => {
                if (!playersByTeam[p.team_id]) playersByTeam[p.team_id] = [];
                playersByTeam[p.team_id].push(p);
            });

            // 4. Estructura final
            const preparedData = fullMatches.map(match => {
                const localPlayers = playersByTeam[match.team1_id] || [];
                const visitPlayers = playersByTeam[match.team2_id] || [];
                const sortDorsal = (a, b) => (parseInt(a.dorsal) || 999) - (parseInt(b.dorsal) || 999);
                
                // Extraer configuración del torneo para saber si mostrar penales
                let tournamentConfig = match.jornada?.tournament?.config || {};
                if (typeof tournamentConfig === 'string') {
                    try { tournamentConfig = JSON.parse(tournamentConfig); } catch (e) { console.error("Error parsing config", e); }
                }

                const tieBreak = (tournamentConfig.tieBreakType || '').toLowerCase();
                const showPenalties = 
                    tieBreak.includes('penalties') || 
                    tieBreak.includes('penales') || 
                    tieBreak.includes('shootout');

                return {
                    matchData: match,
                    showPenalties: showPenalties, // <-- SE AGREGA LA LECTURA CORRECTA
                    players: {
                        local: localPlayers.sort(sortDorsal),
                        visit: visitPlayers.sort(sortDorsal)
                    }
                };
            });

            setProcessedMatches(preparedData);

        } catch (error) {
            console.error("Error fetching batch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
        } catch (e) { return dateString; }
    };

    const formatTime = (timeString) => {
        if (!timeString) return '--:--';
        let timePart = timeString;
        if (timeString.includes('T')) {
            const dateObj = new Date(timeString);
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            timePart = `${hours}:${minutes}`;
        } else {
             timePart = timeString.substring(0,5);
        }
        return timePart;
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Impresión de Cédulas" width="900px">
            <Container>
                {loading ? (
                    <LoadingState>
                        <div className="spinner"></div>
                        <span>Generando cédulas para {matchesToPrint.length} partidos...</span>
                    </LoadingState>
                ) : (
                    <>
                        {/* --- CONTROLES Y VISTA PREVIA (Visible en pantalla) --- */}
                        <Controls>
                            <div className="info">
                                <b>{processedMatches.length}</b> cédulas listas.
                            </div>
                            <Btnsave 
                                titulo="Imprimir Todo" 
                                bgcolor={v.colorPrincipal} 
                                icono={<RiPrinterLine/>} 
                                funcion={handlePrint} 
                            />
                        </Controls>

                        <PreviewContainer>
                            <div className="preview-scroll">
                                {processedMatches.map((item) => (
                                    <div key={item.matchData.id} className="preview-item">
                                        <MatchSheetA4 
                                            matchData={item.matchData}
                                            players={item.players}
                                            formatDate={formatDate}
                                            formatTime={formatTime}
                                            showPenalties={item.showPenalties} // <-- APLICADO CORRECTAMENTE AQUÍ
                                        />
                                    </div>
                                ))}
                            </div>
                        </PreviewContainer>

                        {/* --- CONTENIDO OCULTO PARA IMPRESIÓN (Renderizado vía Portal al body) --- */}
                        {createPortal(
                            <div id="print-portal-root">
                                {processedMatches.map((item) => (
                                    <MatchSheetA4 
                                        key={item.matchData.id}
                                        matchData={item.matchData}
                                        players={item.players}
                                        formatDate={formatDate}
                                        formatTime={formatTime}
                                        showPenalties={item.showPenalties} // <-- APLICADO CORRECTAMENTE AQUÍ
                                    />
                                ))}
                            </div>,
                            document.body
                        )}
                    </>
                )}
            </Container>
            
            {/* CSS GLOBAL DE IMPRESIÓN */}
            <style>{`
                /* Ocultar portal en pantalla */
                #print-portal-root {
                    display: none;
                }

                @media print {
                    /* Reinicia completamente el papel */
                    @page { 
                        size: A4 portrait !important; 
                        margin: 0 !important; 
                    }

                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        height: 100% !important;
                        width: 100% !important;
                    }

                    /* Ocultar la app original */
                    body > *:not(#print-portal-root) {
                        display: none !important;
                    }

                    /* Mostrar el portal */
                    #print-portal-root {
                        display: block !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        /* Quitar margin/padding para no alterar la hoja */
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Cada hoja hija toma el control total de su página */
                    #print-portal-root > div {
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
    height: 70vh;
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

    /* Escalar un poco la vista previa para que quepa mejor en el modal */
    .preview-item {
        transform: scale(0.9);
        transform-origin: top center;
        margin-bottom: -100px; /* Compensar el espacio blanco del scale */
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