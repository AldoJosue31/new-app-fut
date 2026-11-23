import React, { useEffect, useEffectEvent, useState } from "react";
import { createPortal } from "react-dom"; // IMPORTANTE: Para renderizar fuera del #root
import styled from "styled-components";
import { TournamentModal, ModalFooter } from "../../TournamentModal";
import { ExportDownloadButton } from "../shared/ExportPreviewHeader";
import { supabase } from "../../../../../../lib/supabase/browserClient.js";
import { RiPrinterLine } from "react-icons/ri";
import { MatchSheetA4 } from "./MatchSheetA4";
import { MatchSheetPreview, A4_WIDTH, A4_HEIGHT } from "./MatchSheetPreview";

export const BatchPrintModal = ({ isOpen, onClose, matchesToPrint }) => {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [processedMatches, setProcessedMatches] = useState([]);
    const matchCount = matchesToPrint?.length || 0;

    const fetchAllMatchDataEvent = useEffectEvent(fetchAllMatchData);

    useEffect(() => {
        if (isOpen && matchesToPrint?.length > 0) {
            fetchAllMatchDataEvent();
        }
    }, [isOpen, matchesToPrint]);

    async function fetchAllMatchData() {
        setLoading(true);
        setLoadError(false);
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
                    showPenalties,
                    players: {
                        local: localPlayers.sort(sortDorsal),
                        visit: visitPlayers.sort(sortDorsal)
                    }
                };
            });

            setProcessedMatches(preparedData);

        } catch (error) {
            console.error("Error fetching batch data:", error);
            setProcessedMatches([]);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
        } catch { return dateString; }
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

    const isLoading = matchCount > 0 && loading;
    const isReady = !isLoading && processedMatches.length > 0;

    let previewContent;
    if (matchCount === 0) {
        previewContent = <p className="load-error" role="alert">No hay partidos seleccionados para imprimir.</p>;
    } else if (isLoading) {
        previewContent = (
            <div className="loading" role="status">
                <div className="spinner" />
                <span>Generando cédulas para {matchCount} {matchCount === 1 ? "partido" : "partidos"}...</span>
            </div>
        );
    } else if (loadError || !isReady) {
        previewContent = <p className="load-error" role="alert">No se pudieron cargar las cédulas. Inténtalo de nuevo.</p>;
    } else {
        previewContent = (
            <div className="preview-list">
                {processedMatches.map((item) => (
                    <MatchSheetPreview key={item.matchData.id} width={A4_WIDTH} height={A4_HEIGHT} maxScale={0.65}>
                        <MatchSheetA4
                            matchData={item.matchData}
                            players={item.players}
                            formatDate={formatDate}
                            formatTime={formatTime}
                            showPenalties={item.showPenalties}
                        />
                    </MatchSheetPreview>
                ))}
            </div>
        );
    }

    return (
        <>
            <TournamentModal isOpen={isOpen} onClose={onClose} title="Impresión de Cédulas">
                <ModalContentWrapper>
                    <p className="info-msg">
                        Vista Previa de Impresión (A4)
                        {isReady && <> · <b>{processedMatches.length}</b> {processedMatches.length === 1 ? "cédula lista" : "cédulas listas"}</>}
                    </p>
                    <div className="preview-area">{previewContent}</div>
                </ModalContentWrapper>
                <ModalFooter>
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        Cancelar
                    </button>
                    <ExportDownloadButton
                        onExport={handlePrint}
                        isExporting={false}
                        disabled={!isReady}
                        exportLabel="Imprimir todo"
                        icon={<RiPrinterLine aria-hidden="true" />}
                    />
                </ModalFooter>
            </TournamentModal>

            {/* --- CONTENIDO OCULTO PARA IMPRESIÓN (Renderizado vía Portal al body) --- */}
            {isReady && createPortal(
                <div id="print-portal-root">
                    {processedMatches.map((item) => (
                        <MatchSheetA4
                            key={item.matchData.id}
                            matchData={item.matchData}
                            players={item.players}
                            formatDate={formatDate}
                            formatTime={formatTime}
                            showPenalties={item.showPenalties}
                        />
                    ))}
                </div>,
                document.body
            )}

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
        </>
    );
};

// Same body layout as PreMatchSheetModal so both print modals match.
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

    .info-msg b {
        color: ${({ theme }) => theme.text};
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

    .preview-list {
        display: flex;
        flex-direction: column;
        gap: 24px;
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
        animation: spin-batch-print 1s linear infinite;
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

    @keyframes spin-batch-print {
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

        .preview-list {
            gap: 12px;
        }
    }
`;
