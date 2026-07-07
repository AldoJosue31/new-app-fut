import React, { useMemo } from "react";
import styled from "styled-components";
import { PlayoffBracketView } from "../../subcomponents/PlayoffBracketView";

// Helpers
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return dateString; }
};

export const TournamentSummaryA4 = ({ 
    activeTournament, 
    leagueData, 
    participatingTeams, 
    partidos, 
    allTournamentJornadas, 
    tournamentFinalResults, 
    stats,
    metaInfo,
    standings
}) => {
    
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

    const leagueName = metaInfo?.league || leagueData?.name || "LIGA DE FÚTBOL";
    const divisionName = metaInfo?.division || "División Única";
    const leagueLogoUrl = metaInfo?.leagueLogo || leagueData?.logo_url || null;
    const tournamentName = activeTournament?.season || "Torneo Actual";
    
    const startDate = activeTournament?.created_at || "N/A";
    const totalTeams = participatingTeams?.length || 0;
    const totalJornadas = allTournamentJornadas?.length || 0;
    const totalMatches = partidos?.length || 0;

    const tournamentConfig = useMemo(() => {
        if (!activeTournament?.config) return {};
        if (typeof activeTournament.config === "string") {
            try { return JSON.parse(activeTournament.config); } catch (e) { return {}; }
        }
        return activeTournament.config;
    }, [activeTournament?.config]);

    const hasPlayoff = Boolean(tournamentConfig.zonaLiguilla || (tournamentConfig.playoffState?.stages?.length > 0));

    // Ensure stats are computed if they are missing or if we need to guarantee accuracy
    const derivedStats = useMemo(() => {
        if (!partidos || !participatingTeams) return stats || null;
        
        const teamStats = {};
        participatingTeams.forEach(t => teamStats[t.id] = { id: t.id, name: t.name, gf: 0, gc: 0 });
        
        partidos.forEach(m => {
            if (m.goals1 !== null && m.goals2 !== null && String(m.goals1).trim() !== "") {
                if (teamStats[m.team1_id]) {
                    teamStats[m.team1_id].gf += Number(m.goals1);
                    teamStats[m.team1_id].gc += Number(m.goals2);
                }
                if (teamStats[m.team2_id]) {
                    teamStats[m.team2_id].gf += Number(m.goals2);
                    teamStats[m.team2_id].gc += Number(m.goals1);
                }
            }
        });
        
        const teamsArray = Object.values(teamStats).filter(t => t.gf > 0 || t.gc > 0);
        if (teamsArray.length === 0) return stats || null;
        
        const topScoring = teamsArray.reduce((max, t) => t.gf > max.gf ? t : max, teamsArray[0]);
        const leastScored = teamsArray.reduce((min, t) => t.gc < min.gc ? t : min, teamsArray[0]);
        
        return {
            topScoringTeam: topScoring?.name || "--",
            leastScoredTeam: leastScored?.name || "--"
        };
    }, [stats, partidos, participatingTeams]);

    // Patch activeTournament if the final match exists but the bracket stage isn't created
    const patchedTournament = useMemo(() => {
        if (!hasPlayoff) return activeTournament;
        try {
            const configObj = typeof activeTournament.config === "string" ? JSON.parse(activeTournament.config) : activeTournament.config;
            const stages = configObj?.playoffState?.stages || [];
            
            // Check if final exists in stages
            const hasFinalStage = stages.some(s => s.phaseKey === "final");
            
            // If it doesn't exist, let's see if we have a match for the final in partidos
            if (!hasFinalStage && partidos && allTournamentJornadas) {
                const finalJornada = allTournamentJornadas.find(j => j.name?.toLowerCase().includes("final") && !j.name?.toLowerCase().includes("semi") && !j.name?.toLowerCase().includes("cuartos"));
                if (finalJornada) {
                    const finalMatch = partidos.find(m => m.jornada_id === finalJornada.id);
                    if (finalMatch) {
                        const team1 = participatingTeams.find(t => t.id === finalMatch.team1_id);
                        const team2 = participatingTeams.find(t => t.id === finalMatch.team2_id);
                        
                        if (team1 && team2) {
                            const patchedStages = [...stages, {
                                phaseKey: "final",
                                phaseLabel: "Gran Final",
                                pairs: [{
                                    id: `manual-final-${finalMatch.id}`,
                                    home: { ...team1, seed: 1 },
                                    away: { ...team2, seed: 2 }
                                }]
                            }];
                            
                            return {
                                ...activeTournament,
                                config: {
                                    ...configObj,
                                    playoffState: {
                                        ...(configObj.playoffState || {}),
                                        stages: patchedStages
                                    }
                                }
                            };
                        }
                    }
                }
            }
        } catch(e) {
            console.error("Error patching tournament config", e);
        }
        return activeTournament;
    }, [activeTournament, hasPlayoff, partidos, allTournamentJornadas, participatingTeams]);

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
                        <h2>Resumen Oficial del Torneo - {divisionName}</h2>
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
                        
                        {derivedStats && (
                            <>
                                <div className="stat-card stat-wide">
                                    <span className="label">EQUIPO MÁS GOLEADOR (FASE REGULAR)</span>
                                    <span className="value">{derivedStats.topScoringTeam || "--"}</span>
                                </div>
                                <div className="stat-card stat-wide">
                                    <span className="label">EQUIPO MENOS GOLEADO (FASE REGULAR)</span>
                                    <span className="value">{derivedStats.leastScoredTeam || "--"}</span>
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
                        <span className="league-mini">{leagueName} - {tournamentName} - {divisionName}</span>
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
                                const hasResult = match.goals1 !== null && match.goals2 !== null && match.goals1 !== undefined && String(match.goals1).trim() !== "";
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

            {/* HOJA DE LLAVES (PLAYOFFS) */}
            {hasPlayoff && (
                <div className="print-page bracket-page">
                    <div className="page-header">
                        <span className="league-mini">{leagueName} - {tournamentName} - {divisionName}</span>
                        <h3>Cuadro Final</h3>
                    </div>
                    
                    <div className="bracket-print-wrapper">
                        <PlayoffBracketView 
                            torneo={patchedTournament} 
                            partidos={partidos} 
                            jornadas={allTournamentJornadas} 
                            projectedStandings={standings || []}
                            isLoading={false}
                        />
                    </div>
                </div>
            )}
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
            page-break-after: always;
            break-after: page;
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

    /* HOJAS RESULTADOS Y BRACKET */
    .results-page, .bracket-page {
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
    
    .bracket-print-wrapper {
        width: 153.8%;
        transform: scale(0.65);
        transform-origin: top left;
        
        /* Forced light theme CSS variables for PlayoffBracketView when printed/previewed */
        --bracket-primary: #3b82f6;
        --bracket-primary-soft: #eff6ff;
        --bracket-surface: #ffffff;
        --bracket-item: #f8fafc;
        --bracket-border: #e2e8f0;
        --bracket-muted: #64748b;
        
        section {
            border: none;
            background: transparent;
            box-shadow: none;
            padding: 0;
            margin: 0;
            overflow: visible !important;
        }
        
        div[class*="BracketScroller"] {
            overflow: visible !important;
        }
        
        @media print {
            transform: scale(0.65);
        }
    }
`;
