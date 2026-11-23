import React, { useEffect, useEffectEvent, useState } from "react";
import { createPortal } from "react-dom";
import styled, { createGlobalStyle } from "styled-components";
import { TournamentModal, ModalFooter } from "../../TournamentModal";
import { ExportDownloadButton } from "../shared/ExportPreviewHeader";
import { supabase } from "../../../../../../lib/supabase/browserClient.js";
import { RiPrinterLine } from "react-icons/ri";
import { MatchSheetA4 } from "./MatchSheetA4";
import { MatchSheetPreview, A4_WIDTH, A4_HEIGHT } from "./MatchSheetPreview";

const PrintStyles = createGlobalStyle`
  #print-portal-root { display: none; }

  @media print {
    #root, #modal-root, .modal-root, .ReactModal__Overlay, header, footer, nav {
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

    const fetchDataEvent = useEffectEvent(fetchData);

    useEffect(() => {
        if (isOpen && matchId) {
            fetchDataEvent();
        } else {
            setMatchData(null);
        }
    }, [isOpen, matchId]);

    async function fetchData() {
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
    }

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
            <TournamentModal isOpen={isOpen} onClose={onClose} title="Pre-Cédula Oficial">
                <ModalContentWrapper>
                    <p className="info-msg">Vista Previa de Impresión (A4)</p>
                    <div className="preview-area">
                        {loading ? (
                            <div className="loading" role="status">
                                <div className="spinner" />
                                <span>Generando formato...</span>
                            </div>
                        ) : !matchData ? (
                            <p className="load-error" role="alert">No se pudo cargar la pre-cédula. Inténtalo de nuevo.</p>
                        ) : (
                            <MatchSheetPreview width={A4_WIDTH} height={A4_HEIGHT} maxScale={0.65}>
                                <MatchSheetA4 
                                    matchData={matchData} 
                                    players={players} 
                                    formatDate={formatDate}
                                    formatTime={formatTime}
                                    showPenalties={config.showPenalties}
                                />
                            </MatchSheetPreview>
                        )}
                    </div>
                </ModalContentWrapper>
                <ModalFooter>
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        Cancelar
                    </button>
                    <ExportDownloadButton
                        onExport={handlePrint}
                        isExporting={false}
                        disabled={loading || !matchData}
                        exportLabel="Imprimir"
                        icon={<RiPrinterLine aria-hidden="true" />}
                    />
                </ModalFooter>
            </TournamentModal>
            {!loading && matchData && createPortal(printContent, document.body)}
        </>
    );
}

const ModalContentWrapper = styled.div`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    background: ${({ theme }) => theme.bgtotal || theme.bg};

    .info-msg {
        margin: 0;
        padding: 12px 18px 0;
        flex-shrink: 0;
        color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
        font-size: 0.82rem;
        font-weight: 800;
        text-align: center;
    }

    .preview-area {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 0;
        padding: 12px 18px;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-gutter: stable both-edges;
    }

    .loading {
        margin: auto;
        padding: 80px 16px;
        text-align: center;
    }

    .loading .spinner {
        width: 40px;
        height: 40px;
        margin: 0 auto 15px;
        border: 4px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        border-left-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
        border-radius: 50%;
        animation: spin-prematch-sheet 1s linear infinite;
    }

    .loading span {
        color: ${({ theme }) => theme.text};
        font-weight: 600;
        opacity: 0.72;
    }

    .load-error {
        margin: auto;
        padding: 8px 18px;
        color: ${({ theme }) => theme.tournamentDashboard?.metrics?.danger || theme.text};
        text-align: center;
        font-size: 0.82rem;
    }

    @keyframes spin-prematch-sheet {
        to { transform: rotate(360deg); }
    }

    @media (max-width: 520px) {
        .info-msg {
            padding: 8px 12px 0;
            font-size: 0.76rem;
        }

        .preview-area {
            padding: 8px 6px;
        }
    }
`;
