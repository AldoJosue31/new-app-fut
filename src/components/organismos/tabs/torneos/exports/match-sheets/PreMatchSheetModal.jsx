import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled, { createGlobalStyle } from "styled-components";
import { v } from "../../../../../../styles/variables";
import { Modal } from "../../../../Modal";
import { Btnsave } from "../../../../../moleculas/Btnsave";
import { supabase } from "../../../../../../supabase/supabase.config";
import { RiPrinterLine } from "react-icons/ri";
import { MatchSheetA4 } from "./MatchSheetA4"; 

const PrintStyles = createGlobalStyle`
  #print-portal-root { display: none; }

  @media print {
    #root, .modal-root, .ReactModal__Overlay, header, footer, nav {
      display: none !important;
      height: 0 !important; width: 0 !important; overflow: hidden !important; visibility: hidden !important;
    }
    
    @page { 
        size: A4 portrait; 
        margin: 0; 
    }
    
    html, body {
      margin: 0 !important; padding: 0 !important; 
      width: 100% !important; height: 100% !important;
      background: white !important;
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important;
      overflow: visible !important;
    }

    #print-portal-root {
      display: flex !important;
      position: fixed; 
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 99999; 
      background: white;
      visibility: visible !important;
      justify-content: center;
      align-items: flex-start; 
    }

    #print-portal-root * { visibility: visible !important; }

    /* Wrapper de Escalado */
    .print-wrapper {
        width: 210mm;
        height: 297mm; /* Altura explícita para que el flex interno funcione */
        transform: scale(0.96); 
        transform-origin: top center;
        margin-top: 2mm;
    }
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
                            division:division_id ( name, league:league_id ( name, logo_url ) ),
                            config
                        )
                    )
                `)
                .eq('id', matchId)
                .single();

            if (matchError) throw matchError;
            setMatchData(match);

            let tournamentConfig = match.jornada?.tournament?.config || {};
            if (typeof tournamentConfig === 'string') {
                try { tournamentConfig = JSON.parse(tournamentConfig); } catch (e) { console.error("Error parsing config", e); }
            }

            const tieBreak = (tournamentConfig.tieBreakType || '').toLowerCase();
            const showPenalties = 
                tieBreak.includes('penalties') || 
                tieBreak.includes('penales') || 
                tieBreak.includes('shootout');
            
            setConfig({ showPenalties });

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
        const d = new Date(dateStr);
        const utcDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        return utcDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    };

    const formatTime = (dateStr) => {
        if(!dateStr) return "____:____";
        return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
    };

    if (!isOpen) return null;

    const printContent = (
        <div id="print-portal-root">
             <div className="print-wrapper">
                <MatchSheetA4 
                    matchData={matchData} 
                    players={players} 
                    formatDate={formatDate}
                    formatTime={formatTime}
                    showPenalties={config.showPenalties} 
                />
            </div>
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
        width: 210mm; height: 297mm;
    }
    .loading { color: white; padding: 40px; text-align: center; }
`;