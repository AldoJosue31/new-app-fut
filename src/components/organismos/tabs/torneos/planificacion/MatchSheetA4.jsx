import React from "react";
import styled from "styled-components";

export const MatchSheetA4 = ({ matchData, players, formatDate, formatTime, showPenalties }) => {
    if (!matchData) return null;

    return (
        <SheetContainer>
            {/* 1. ENCABEZADO */}
            <header className="header-section">
                <div className="header-top">
                    <div className="logo-box">LIGA</div>
                    <div className="titles">
                        <h1 className="league-name">{matchData.jornada?.tournament?.division?.league?.name || "LIGA DE FÚTBOL"}</h1>
                        <h2 className="doc-title">INFORME DEL ARBITRO</h2>
                    </div>
                    <div className="season-info">
                        <div className="season-txt">{matchData.jornada?.tournament?.season}</div>
                        <div className="div-tag">{matchData.jornada?.tournament?.division?.name}</div>
                    </div>
                </div>

                <div className="match-grid">
                    <div className="cell">
                        <span className="label">JORNADA</span>
                        <span className="value">{matchData.jornada?.name}</span>
                    </div>
                    <div className="cell">
                        <span className="label">FECHA</span>
                        <span className="value">{formatDate(matchData.date)}</span>
                    </div>
                    <div className="cell">
                        <span className="label">HORA</span>
                        <span className="value">{formatTime(matchData.date)}</span>
                    </div>
                    <div className="cell">
                        <span className="label">CAMPO</span>
                        <span className="value">{matchData.field_name || "__________________"}</span>
                    </div>
                </div>
            </header>

            {/* 2. CUERPO (ROSTERS) */}
            <div className="rosters-section">
                
                {/* LOCAL */}
                <div className="team-wrapper">
                    <div className="team-header">
                        <span className="team-label">LOCAL</span>
                        <span className="team-name">{matchData.local?.name}</span>
                    </div>
                    <div className="table-container">
                        <table className="roster-table">
                            <thead>
                                <tr>
                                    <th className="th-num">#</th>
                                    <th className="th-name">JUGADOR</th>
                                    <th className="th-sm">TIT</th>
                                    <th className="th-sm">GOL</th>
                                    <th className="th-sm">TA</th>
                                    <th className="th-sm">TR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.local.map((p, i) => (
                                    <tr key={i}>
                                        <td className="center num">{p.dorsal}</td>
                                        <td className="name">{p.last_name} {p.first_name}</td>
                                        <td></td><td></td><td></td><td></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="captain-sign">Firma Capitán / DT</div>
                </div>

                {/* VS CENTRADO */}
                <div className="vs-bar">
                    <div className="vs-line"></div>
                    <div className="vs-text">VS</div>
                    <div className="vs-line"></div>
                </div>

                {/* VISITA */}
                <div className="team-wrapper">
                    <div className="team-header">
                        <span className="team-label">VISITA</span>
                        <span className="team-name">{matchData.visitante?.name}</span>
                    </div>
                    <div className="table-container">
                        <table className="roster-table">
                            <thead>
                                <tr>
                                    <th className="th-num">#</th>
                                    <th className="th-name">JUGADOR</th>
                                    <th className="th-sm">TIT</th>
                                    <th className="th-sm">GOL</th>
                                    <th className="th-sm">TA</th>
                                    <th className="th-sm">TR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.visit.map((p, i) => (
                                    <tr key={i}>
                                        <td className="center num">{p.dorsal}</td>
                                        <td className="name">{p.last_name} {p.first_name}</td>
                                        <td></td><td></td><td></td><td></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="captain-sign">Firma Capitán / DT</div>
                </div>
            </div>

            {/* 3. FOOTER */}
            <footer className="sheet-footer">
                
                {/* MARCADOR PRINCIPAL */}
                <div className="score-area">
                    <div className="score-title">RESULTADO</div>
                    <div className="score-content">
                        <div className="score-team team-local">{matchData.local?.name}</div>
                        <div className="center-block">
                            <div className="score-input box"></div>
                            <span className="hyphen">-</span>
                            <div className="score-input box"></div>
                        </div>
                        <div className="score-team team-visit">{matchData.visitante?.name}</div>
                    </div>
                    <div className="wo-check">
                        <span>W.O.</span> <div className="box-sm"></div>
                    </div>
                </div>

                {/* PENALES / SHOOTOUTS - RENDERIZADO CONDICIONAL */}
                {showPenalties && (
                    <div className="penalties-area">
                        <div className="penalties-label">PENALES / SHOOTOUTS:</div>
                        <div className="penalties-content">
                            <div className="p-team p-local">{matchData.local?.name}</div>
                            <div className="center-block-sm">
                                <div className="p-input"></div>
                                <span className="p-hyphen">-</span>
                                <div className="p-input"></div>
                            </div>
                            <div className="p-team p-visit">{matchData.visitante?.name}</div>
                        </div>
                    </div>
                )}

                {/* OBSERVACIONES */}
                <div className="obs-area">
                    <div className="obs-title">OBSERVACIONES DEL ÁRBITRO:</div>
                    <div className="obs-lines"></div>
                    <div className="obs-lines"></div>
                    <div className="obs-lines"></div>
                </div>

                {/* FIRMAS */}
                <div className="signatures-area">
                    <div className="sig-block">
                        <div className="line"></div>
                        <span>ÁRBITRO CENTRAL</span>
                    </div>
                    <div className="sig-block">
                        <div className="line"></div>
                        <span>CRONOMETRISTA / ASISTENTE</span>
                    </div>
                </div>
            </footer>
        </SheetContainer>
    );
};

const SheetContainer = styled.div`
    background: white;
    color: black;
    width: 210mm;
    height: 296mm; 
    padding: 10mm;
    font-family: 'Arial Narrow', 'Roboto Condensed', sans-serif;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin: 0 auto;
    border: 1px solid #e0e0e0;

    @media print {
        border: none; margin: 0; padding: 8mm; width: 100%; height: 100vh;
    }

    /* --- HEADER --- */
    .header-section { border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 5px; flex-shrink: 0; }
    .header-top { display: flex; align-items: center; border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 5px; }
    .logo-box { font-weight: 900; font-size: 18px; border: 2px solid black; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-right: 10px; }
    .titles { text-align: center; flex: 1; }
    .league-name { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; line-height: 1; }
    .doc-title { margin: 0; font-size: 12px; font-weight: bold; letter-spacing: 3px; margin-top: 4px; }
    .season-info { text-align: right; min-width: 80px; }
    .season-txt { font-size: 11px; font-weight: bold; }
    .div-tag { background: black; color: white; padding: 2px 8px; display: inline-block; margin-top: 2px; font-size: 10px; font-weight: bold; border-radius: 2px; }

    .match-grid {
        display: flex; justify-content: space-between; background: #f2f2f2; padding: 5px 10px; border: 1px solid black;
        .cell { display: flex; flex-direction: column; align-items: center; }
        .label { font-size: 8px; font-weight: bold; color: #444; }
        .value { font-size: 11px; font-weight: bold; text-transform: uppercase; }
    }

    /* --- ROSTERS --- */
    .rosters-section {
        display: flex; flex: 1; gap: 3mm; margin-bottom: 5px; align-items: stretch; min-height: 0;
    }
    .team-wrapper { flex: 1; display: flex; flex-direction: column; height: 100%; }
    .team-header {
        background: black; color: white; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center;
        border: 1px solid black; -webkit-print-color-adjust: exact; flex-shrink: 0;
    }
    .team-label { font-size: 9px; font-weight: bold; letter-spacing: 1px; }
    .team-name { font-weight: bold; font-size: 12px; text-transform: uppercase; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .table-container { flex: 1; display: flex; flex-direction: column; border: 1px solid black; border-top: none; }

    .roster-table {
        width: 100%; border-collapse: collapse; font-size: 10px; flex: 1; display: flex; flex-direction: column; height: 100%;
        thead { flex-shrink: 0; }
        tbody { flex: 1; display: flex; flex-direction: column; }
        tr { display: flex; width: 100%; }
        tbody tr { flex: 1; border-bottom: 1px solid #ccc; align-items: center; }
        tbody tr:last-child { border-bottom: none; }
        th { border-bottom: 1px solid black; border-right: 1px solid black; background: #ddd; padding: 2px; -webkit-print-color-adjust: exact; display: flex; align-items: center; justify-content: center; font-size: 8px; height: 18px; }
        th:last-child { border-right: none; }
        td { border-right: 1px solid black; padding: 0 4px; display: flex; align-items: center; height: 100%; }
        td:last-child { border-right: none; }
        .th-num, .num { width: 25px; justify-content: center; font-weight: bold; font-size: 11px; }
        .th-name, .name { flex: 1; white-space: nowrap; overflow: hidden; text-transform: uppercase; font-weight: 500; justify-content: flex-start; }
        .th-sm, td:not(.name):not(.num) { width: 28px; justify-content: center; }
    }

    .vs-bar { width: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 5px; }
    .vs-text { font-weight: 900; font-size: 12px; color: #aaa; writing-mode: vertical-rl; }
    .vs-line { flex: 1; width: 1px; background: #ddd; }

    .captain-sign { border: 1px solid black; padding: 4px; text-align: center; font-size: 8px; margin-top: 4px; flex-shrink: 0; background: #f9f9f9; }

    /* --- FOOTER --- */
    .sheet-footer { border-top: 2px solid black; padding-top: 5px; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }

    /* MARCADOR */
    .score-area { display: flex; border: 1px solid black; align-items: stretch; height: 38px; }
    .score-title { background: black; color: white; width: 24px; font-size: 10px; display: flex; align-items: center; justify-content: center; writing-mode: vertical-rl; -webkit-print-color-adjust: exact; font-weight: bold; }
    
    .score-content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 5px; }
    
    .score-team { 
        flex: 1; 
        width: 0; 
        font-weight: bold; font-size: 13px; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .team-local { text-align: right; margin-right: 15px; }
    .team-visit { text-align: left; margin-left: 15px; }

    .center-block { display: flex; align-items: center; gap: 10px; justify-content: center; min-width: 90px; }
    .score-input { width: 35px; height: 28px; border: 2px solid black; background: #fff; }
    .hyphen { font-weight: 900; font-size: 14px; }

    .wo-check { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: bold; margin-right: 10px; border-left: 1px solid black; padding-left: 10px; }
    .box-sm { width: 15px; height: 15px; border: 1px solid black; }

    /* PENALES - CENTRADO CORREGIDO CON ETIQUETA FLOTANTE */
    .penalties-area { 
        display: flex; align-items: center; border: 1px solid #999; height: 26px; background: #f9f9f9; padding: 0 5px;
        position: relative; /* Clave para el absolute */
    }
    
    /* Etiqueta absoluta para que no empuje el contenido */
    .penalties-label { 
        position: absolute; 
        left: 5px; 
        top: 0; 
        bottom: 0;
        display: flex;
        align-items: center;
        font-size: 8px; /* Un poco más pequeña para evitar solapamiento */
        font-weight: bold; 
        color: #555; 
        z-index: 1; /* Por encima si fuera necesario, pero el texto del equipo la evitará visualmente */
    }
    
    /* Contenido full width */
    .penalties-content { flex: 1; display: flex; justify-content: center; align-items: center; width: 100%; }
    
    .p-team { 
        flex: 1; 
        width: 0; 
        font-size: 10px; font-weight: bold; color: #333; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
    }
    .p-local { text-align: right; margin-right: 10px; }
    .p-visit { text-align: left; margin-left: 10px; }
    
    .center-block-sm { display: flex; align-items: center; gap: 8px; justify-content: center; min-width: 70px; }
    .p-input { width: 25px; height: 18px; border: 1px solid black; background: white; }
    .p-hyphen { font-weight: bold; font-size: 12px; }

    .obs-area { border: 1px solid black; padding: 5px; flex: 1; min-height: 50px; }
    .obs-title { font-size: 9px; font-weight: bold; margin-bottom: 5px; text-decoration: underline; }
    .obs-lines { border-bottom: 1px solid #999; height: 15px; width: 100%; margin-bottom: 2px; }

    .signatures-area { display: flex; justify-content: space-around; margin-top: 10px; padding-bottom: 2px; }
    .sig-block { text-align: center; width: 35%; }
    .line { border-bottom: 1px solid black; margin-bottom: 4px; height: 1px; }
    span { font-size: 9px; font-weight: bold; letter-spacing: 0.5px; }
`;