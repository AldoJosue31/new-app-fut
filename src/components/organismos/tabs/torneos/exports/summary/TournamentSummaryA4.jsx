import React, { useMemo } from "react";
import styled from "styled-components";

// Helpers
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return dateString; }
};

export const TournamentSummaryA4 = ({ activeTournament, leagueData, participatingTeams, partidos, allTournamentJornadas, tournamentFinalResults, stats }) => {
    
    // Group matches by jornada
    const jornadasWithMatches = useMemo(() => {
        if (!allTournamentJornadas || !partidos) return [];
        return allTournamentJornadas.map(j => {
            const matchesForJornada = partidos.filter(m => m.jornada_id === j.id);
            return {
                ...j,
                matches: matchesForJornada
            };
        }).filter(j => j.matches.length > 0);
    }, [allTournamentJornadas, partidos]);

    const leagueName = leagueData?.name || "LIGA DE FÚTBOL";
    const leagueLogoUrl = leagueData?.logo_url || null;
    const tournamentName = activeTournament?.season || "Torneo Actual";
    
    const startDate = activeTournament?.created_at || "N/A";
    const totalTeams = participatingTeams?.length || 0;
    const totalJornadas = allTournamentJornadas?.length || 0;
    const totalMatches = partidos?.length || 0;

    return (
        <SummaryContainer>
            {/* HOJA 1: PORTADA */}
            <div className="print-page cover-page">
                <div className="header">
                    <div className="logo-container">
                        {leagueLogoUrl ? (
                            <img src={leagueLogoUrl} alt="Logo Liga" />
                        ) : (
                            <div className="logo-text">LIGA</div>
                        )}
                    </div>
                    <div className="title-block">
                        <h1>{leagueName}</h1>
                        <h2>Resumen Oficial del Torneo</h2>
                    </div>
                </div>

                <div className="cover-content">
                    <div className="tournament-banner">
                        <div className="label">TORNEO</div>
                        <div className="value">{tournamentName}</div>
                    </div>

                    {tournamentFinalResults && (
                        <div className="champion-highlight">
                            <div className="champ-block">
                                <span className="label">CAMPEÓN</span>
                                <div className="champ-name" style={{ color: '#F59E0B' }}>
                                    {tournamentFinalResults.champion?.name || "--"}
                                </div>
                            </div>
                            <div className="champ-block">
                                <span className="label">SUBCAMPEÓN</span>
                                <div className="champ-name" style={{ color: '#71717A' }}>
                                    {tournamentFinalResults.runnerUp?.name || "--"}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="label">INICIO</span>
                            <span className="value">{formatDate(startDate)}</span>
                        </div>
                        <div className="stat-card">
                            <span className="label">EQUIPOS PARTICIPANTES</span>
                            <span className="value">{totalTeams}</span>
                        </div>
                        <div className="stat-card">
                            <span className="label">JORNADAS</span>
                            <span className="value">{totalJornadas}</span>
                        </div>
                        <div className="stat-card">
                            <span className="label">PARTIDOS JUGADOS</span>
                            <span className="value">{totalMatches}</span>
                        </div>
                        
                        {stats && (
                            <>
                                <div className="stat-card stat-wide">
                                    <span className="label">EQUIPO MÁS GOLEADOR</span>
                                    <span className="value">{stats.topScoringTeam || "--"}</span>
                                </div>
                                <div className="stat-card stat-wide">
                                    <span className="label">EQUIPO MENOS GOLEADO</span>
                                    <span className="value">{stats.leastScoredTeam || "--"}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* HOJAS DE JORNADAS (Varias páginas según la cantidad de jornadas) */}
            {jornadasWithMatches.map((jornada, index) => (
                <div key={jornada.id || index} className="print-page results-page">
                    <div className="page-header">
                        <span className="league-mini">{leagueName} - {tournamentName}</span>
                        <h3>Resultados: {jornada.name}</h3>
                    </div>

                    <table className="results-table">
                        <thead>
                            <tr>
                                <th className="text-right">Local</th>
                                <th className="text-center">Res.</th>
                                <th className="text-left">Visitante</th>
                                <th className="text-left">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jornada.matches.map(match => {
                                const local = participatingTeams?.find(t => t.id === match.team1_id)?.name || "Equipo Local";
                                const visit = participatingTeams?.find(t => t.id === match.team2_id)?.name || "Equipo Visitante";
                                const hasResult = match.goals1 !== null && match.goals2 !== null && match.goals1 !== undefined;
                                const result = hasResult ? `${match.goals1} - ${match.goals2}` : "VS";
                                const status = hasResult ? "Finalizado" : "No disputado";

                                return (
                                    <tr key={match.id}>
                                        <td className="team local">{local}</td>
                                        <td className="score">{result}</td>
                                        <td className="team visit">{visit}</td>
                                        <td className="status">{status}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ))}
        </SummaryContainer>
    );
};

const SummaryContainer = styled.div`
    width: 210mm;
    background: transparent;
    color: #0f172a;
    font-family: 'Inter', sans-serif;
    margin: 0 auto;

    * { box-sizing: border-box; }

    .print-page {
        width: 210mm;
        height: 297mm;
        padding: 20mm;
        background: #ffffff;
        position: relative;
        margin-bottom: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    /* Ocultar sombras en la impresión real */
    @media print {
        .print-page {
            box-shadow: none;
            margin-bottom: 0;
        }
    }

    /* HOJA 1: PORTADA */
    .cover-page {
        display: flex;
        flex-direction: column;
        
        .header {
            display: flex;
            align-items: center;
            border-bottom: 3px solid #1e293b;
            padding-bottom: 20px;
            margin-bottom: 40px;
            
            .logo-container {
                width: 100px;
                height: 100px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f1f5f9;
                border-radius: 12px;
                margin-right: 30px;
                overflow: hidden;
                
                img { width: 100%; height: 100%; object-fit: contain; }
                .logo-text { font-weight: 800; font-size: 24px; color: #94a3b8; }
            }
            
            .title-block {
                h1 { margin: 0 0 5px 0; font-size: 32px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
                h2 { margin: 0; font-size: 20px; font-weight: 500; color: #64748b; }
            }
        }
        
        .cover-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 40px;
            
            .tournament-banner {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                
                .label { font-size: 14px; font-weight: 700; color: #64748b; letter-spacing: 2px; margin-bottom: 10px; }
                .value { font-size: 36px; font-weight: 900; color: #1e293b; text-transform: uppercase; }
            }

            .champion-highlight {
                display: flex;
                gap: 20px;
                
                .champ-block {
                    flex: 1;
                    background: #ffffff;
                    border: 2px solid #f1f5f9;
                    border-radius: 16px;
                    padding: 25px;
                    text-align: center;
                    
                    .label { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; display: block; margin-bottom: 15px; color: #94a3b8; }
                    .champ-name { font-size: 24px; font-weight: 800; text-transform: uppercase; }
                }
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                
                .stat-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 20px;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    
                    .label { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 8px; letter-spacing: 1px; }
                    .value { font-size: 20px; font-weight: 700; color: #0f172a; }
                }
                
                .stat-wide {
                    grid-column: span 2;
                }
            }
        }
    }

    /* HOJAS RESULTADOS */
    .results-page {
        .page-header {
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            
            .league-mini { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 5px; }
            h3 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
        }
        
        .results-table {
            width: 100%;
            border-collapse: collapse;
            
            th {
                padding: 12px 15px;
                background: #f1f5f9;
                color: #475569;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                border-bottom: 2px solid #cbd5e1;
            }
            
            td {
                padding: 15px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 14px;
                color: #1e293b;
            }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            
            .team { font-weight: 600; width: 35%; }
            .local { text-align: right; }
            .visit { text-align: left; }
            .score { text-align: center; font-weight: 800; font-size: 16px; background: #f8fafc; width: 15%; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
            .status { font-size: 12px; color: #64748b; width: 15%; text-align: left;}
        }
    }
`;
