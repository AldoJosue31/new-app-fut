import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled, { createGlobalStyle } from "styled-components";
import { v, Modal, Btnsave } from "../../../../../index";
import { supabase } from "../../../../../supabase/supabase.config";
import { RiPrinterLine } from "react-icons/ri";
import { MatchSheetA4 } from "./MatchSheetA4"; 

const PrintStyles = createGlobalStyle`
  #print-portal-root { display: none; }

  @media print {
    #root, .modal-root, .ReactModal__Overlay {
      display: none !important;
      height: 0 !important; width: 0 !important; overflow: hidden !important;
    }
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0 !important; padding: 0 !important; height: 100% !important;
      overflow: hidden !important; background: white !important;
    }
    #print-portal-root {
      display: block !important; position: absolute; top: 0; left: 0;
      width: 100%; height: 100%; z-index: 9999; background: white;
    }
    #print-portal-root * { visibility: visible !important; }
  }
`;

export function PreMatchSheetModal({ isOpen, onClose, matchId }) {
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState(null);
    const [players, setPlayers] = useState({ local: [], visit: [] });
    const [config, setConfig] = useState({ showPenalties: false });

    useEffect(() => {
        if (isOpen && matchId) {
            fetchData();
        } else {
            setMatchData(null);
        }
    }, [isOpen, matchId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: match, error: matchError } = await supabase
                .from('matches')
                .select(`
                    *,
                    local:team1_id (id, name, logo_url),
                    visitante:team2_id (id, name, logo_url),
                    jornada:jornada_id (
                        name,
                        tournament:tournament_id (
                            season,
                            division:division_id ( name, league:league_id ( name ) ),
                            config
                        )
                    )
                `)
                .eq('id', matchId)
                .single();

            if (matchError) throw matchError;
            setMatchData(match);

            // Extraer configuración del JSONB
            let tournamentConfig = match.jornada?.tournament?.config || {};
            if (typeof tournamentConfig === 'string') {
                try { tournamentConfig = JSON.parse(tournamentConfig); } catch (e) { console.error("Error parsing config", e); }
            }

            // CORRECCIÓN DE LÓGICA DE PENALES
            // Buscamos 'penalties' (como está en tu BD), 'penales' o 'shootout'
            const tieBreak = (tournamentConfig.tieBreakType || '').toLowerCase();
            const showPenalties = 
                tieBreak.includes('penalties') || 
                tieBreak.includes('penales') || 
                tieBreak.includes('shootout');
            
            setConfig({ showPenalties });

            // Relleno de filas dinámico según maxPlayers de la config
            const maxRows = parseInt(tournamentConfig.maxPlayers) || 18;

            const { data: allPlayers, error: playersError } = await supabase
                .from('players')
                .select('*')
                .in('team_id', [match.team1_id, match.team2_id])
                .eq('is_active', true)
                .order('dorsal', { ascending: true });

            if (playersError) throw playersError;

            const localP = allPlayers.filter(p => p.team_id === match.team1_id);
            const visitP = allPlayers.filter(p => p.team_id === match.team2_id);

            const fillRows = (current) => {
                const needed = maxRows - current.length;
                if(needed <= 0) return current.slice(0, maxRows);
                return [...current, ...Array(needed).fill({ first_name: "", last_name: "", dorsal: "" })];
            };

            setPlayers({ 
                local: fillRows(localP), 
                visit: fillRows(visitP) 
            });

        } catch (error) {
            console.error("Error fetching pre-sheet:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateStr) => {
        if(!dateStr) return "___________";
        return new Date(dateStr).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
    };

    const formatTime = (dateStr) => {
        if(!dateStr) return "____:____";
        return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
    };

    if (!isOpen) return null;

    const printContent = (
        <div id="print-portal-root">
             <MatchSheetA4 
                matchData={matchData} 
                players={players} 
                formatDate={formatDate}
                formatTime={formatTime}
                showPenalties={config.showPenalties} 
            />
        </div>
    );

    return (
        <>
            <PrintStyles />
            <Modal isOpen={isOpen} onClose={onClose} title="Pre-Cédula Oficial" width="950px">
                <ModalContentWrapper>
                    <div className="toolbar">
                        <span className="info-msg">Vista Previa de Impresión (A4)</span>
                        <div className="actions">
                            <Btnsave 
                                titulo="Imprimir Cédula" 
                                bgcolor={v.colorPrincipal} 
                                icono={<RiPrinterLine/>} 
                                funcion={handlePrint} 
                            />
                        </div>
                    </div>

                    <div className="preview-area">
                        {loading || !matchData ? (
                            <div className="loading">Generando formato...</div>
                        ) : (
                            <div className="preview-scale">
                                <MatchSheetA4 
                                    matchData={matchData} 
                                    players={players} 
                                    formatDate={formatDate}
                                    formatTime={formatTime}
                                    showPenalties={config.showPenalties}
                                />
                            </div>
                        )}
                    </div>
                </ModalContentWrapper>
            </Modal>
            {!loading && matchData && createPortal(printContent, document.body)}
        </>
    );
}

const ModalContentWrapper = styled.div`
    display: flex; flex-direction: column; height: 100%;
    .toolbar {
        background: ${({theme})=>theme.bg3}; 
        padding: 10px 20px;
        display: flex; 
        justify-content: space-between; 
        align-items: center;
        border-bottom: 1px solid ${({theme})=>theme.bg4};
    }
    .info-msg {
        font-size: 14px; font-weight: 500;
        color: ${({theme})=>theme.text2}; font-style: italic;
    }
    .preview-area {
        background: #505050; padding: 30px;
        display: flex; justify-content: center;
        overflow-y: auto; height: 70vh; 
    }
    .preview-scale {
        transform: scale(0.65); transform-origin: top center;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5); background: white;
    }
    .loading { color: white; padding: 40px; text-align: center; }
`;