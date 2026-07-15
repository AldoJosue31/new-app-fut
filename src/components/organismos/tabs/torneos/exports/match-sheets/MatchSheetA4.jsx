import React, { useState, useEffect } from "react";
import styled from "styled-components";

// CACHÉ GLOBAL: Evita recalcular la transparencia si se imprimen múltiples cédulas por lote.
const transparencyCache = new Map();

export const MatchSheetA4 = ({ matchData, players, formatDate, formatTime, showPenalties }) => {
    const [isLogoTransparent, setIsLogoTransparent] = useState(false);
    const [logoLoaded, setLogoLoaded] = useState(false);

    const leagueName = matchData?.jornada?.tournament?.division?.league?.name || "LIGA DE FÚTBOL";
    const leagueLogoUrl = matchData?.jornada?.tournament?.division?.league?.logo_url;

    // --- ALGORITMO DE DETECCIÓN DE TRANSPARENCIA ---
    useEffect(() => {
        if (!leagueLogoUrl) {
            setLogoLoaded(true);
            return;
        }

        if (transparencyCache.has(leagueLogoUrl)) {
            setIsLogoTransparent(transparencyCache.get(leagueLogoUrl));
            setLogoLoaded(true);
            return;
        }

        const checkTransparency = async () => {
            try {
                const img = new Image();
                img.crossOrigin = "Anonymous"; 
                
                img.src = leagueLogoUrl + (leagueLogoUrl.includes("?") ? "&" : "?") + "cors_check=" + Date.now();
                
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                const canvas = document.createElement("canvas");
                const size = 50; 
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, size, size);
                
                const imageData = ctx.getImageData(0, 0, size, size).data;
                let transparentCount = 0;
                
                for (let i = 3; i < imageData.length; i += 4) {
                    if (imageData[i] < 250) { 
                        transparentCount++;
                    }
                }
                
                const isTransparent = transparentCount > (size * size * 0.03);
                
                transparencyCache.set(leagueLogoUrl, isTransparent);
                setIsLogoTransparent(isTransparent);
                setLogoLoaded(true);
            } catch (error) {
                console.warn("No se pudo analizar la transparencia del logo:", error);
                transparencyCache.set(leagueLogoUrl, false);
                setIsLogoTransparent(false);
                setLogoLoaded(true);
            }
        };

        checkTransparency();
    }, [leagueLogoUrl]);

    if (!matchData) return null;

    return (
        <SheetContainer className="match-sheet-a4">
            {/* 1. ENCABEZADO */}
            <div className="header-section">
                <div className="header-top">
                    {/* CONTENEDOR INTELIGENTE PARA CENTRADO PERFECTO */}
                    <div className="logo-container">
                        {leagueLogoUrl ? (
                            <img 
                                src={leagueLogoUrl} 
                                alt="Logo Liga" 
                                className={`league-logo-img ${isLogoTransparent ? 'large' : 'normal'} ${logoLoaded ? 'loaded' : ''}`} 
                            />
                        ) : (
                            <div className="logo-box">LIGA</div>
                        )}
                    </div>

                    <div className="titles">
                        <h1 className="league-name">{leagueName}</h1>
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
                        <span className="value">{formatTime(matchData.time || matchData.date)}</span>
                    </div>
                    <div className="cell">
                        <span className="label">CAMPO</span>
                        <span className="value">{matchData.field_name || "__________________"}</span>
                    </div>
                </div>
            </div>

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
                                {players.local.map((p) => (
                                    <tr key={p.id || p.player_id || `${p.dorsal}-${p.last_name}-${p.first_name}`}>
                                        <td className="center num">{p.dorsal}</td>
                                        <td className="name">{p.last_name} {p.first_name}</td>
                                        <td></td><td></td><td></td><td></td>
                                    </tr>
                                ))}
                                {/* Relleno para estética */}
                                {Array.from({ length: Math.max(0, 12 - players.local.length) }).map((_, i) => (
                                     <tr key={`empty-${i}`}><td className="center num"></td><td className="name"></td><td></td><td></td><td></td><td></td></tr>
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
                                {players.visit.map((p) => (
                                    <tr key={p.id || p.player_id || `${p.dorsal}-${p.last_name}-${p.first_name}`}>
                                        <td className="center num">{p.dorsal}</td>
                                        <td className="name">{p.last_name} {p.first_name}</td>
                                        <td></td><td></td><td></td><td></td>
                                    </tr>
                                ))}
                                {Array.from({ length: Math.max(0, 12 - players.visit.length) }).map((_, i) => (
                                     <tr key={`empty-${i}`}><td className="center num"></td><td className="name"></td><td></td><td></td><td></td><td></td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="captain-sign">Firma Capitán / DT</div>
                </div>
            </div>

            {/* 3. FOOTER */}
            <div className="sheet-footer">
                
                {/* MARCADOR */}
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

                {/* PENALES */}
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
            </div>
        </SheetContainer>
    );
};

const SheetContainer = styled.div`
    background: white;
    color: black;
    
    /* VISTA EN PANTALLA (Modal) */
    width: 210mm;
    height: 297mm; /* Fijo, simulando exactamente una hoja */
    padding: 10mm; 
    
    box-sizing: border-box;
    font-family: 'Arial Narrow', 'Roboto Condensed', sans-serif;
    display: flex;
    flex-direction: column;
    margin: 0 auto;
    border: 1px solid #e0e0e0;
    
    /* Forzar impresión de fondos */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;

    /* REGLAS ESTRICTAS DE IMPRESIÓN */
    @media print {
        @page {
            size: A4 portrait;
            margin: 0 !important; 
        }

        border: none !important;
        margin: 0 !important;
        
        width: 210mm !important; 
        height: 297mm !important;
        max-height: 297mm !important; 
        padding: 8mm !important; 
        
        overflow: hidden !important; 
        
        page-break-after: always !important;
        break-after: page !important; 
        page-break-inside: avoid !important;
        break-inside: avoid !important;

        /* Forzar escala de grises y alta calidad de imagen en impresión para el logo */
        .league-logo-img {
            opacity: 1 !important; 
            filter: grayscale(100%) !important;
            -webkit-filter: grayscale(100%) !important;
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;
        }
    }

    /* ESTILOS INTERNOS */
    .header-section { border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 5px; flex-shrink: 0; }
    
    .header-top { 
        display: flex; 
        align-items: center; 
        justify-content: space-between;
        border-bottom: 1px solid black; 
        padding-bottom: 5px; 
        margin-bottom: 5px; 
        min-height: 95px; 
    }

    /* CONTENEDOR DEL LOGO (Equilibrado con la caja derecha) */
    .logo-container {
        width: 120px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        flex-shrink: 0;
    }
    
    .logo-box { 
        font-weight: 900; 
        font-size: 18px; 
        border: 2px solid black; 
        width: 60px; 
        height: 60px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        border-radius: 50%; 
    }

    /* CONFIGURACIÓN BASE DEL LOGO */
    .league-logo-img { 
        object-fit: contain; 
        filter: grayscale(100%); 
        -webkit-filter: grayscale(100%); 
        image-rendering: -webkit-optimize-contrast; 
        image-rendering: crisp-edges; 
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .league-logo-img.loaded {
        opacity: 1;
    }

    /* ESTILO: LOGO SIN FONDO (GRANDE) */
    .league-logo-img.large {
        width: 95px; 
        height: 95px;
    }

    /* ESTILO: LOGO CON FONDO SÓLIDO (MÁS PEQUEÑO Y DISCRETO) */
    .league-logo-img.normal {
        width: 55px; 
        height: 55px;
        border-radius: 6px;
        box-shadow: 0 0 0 1px #ccc; 
    }
    
    /* CONTENEDOR CENTRAL DE TÍTULOS */
    .titles { 
        text-align: center; 
        flex: 1; 
    }
    .league-name { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; line-height: 1; }
    .doc-title { margin: 0; font-size: 12px; font-weight: bold; letter-spacing: 3px; margin-top: 4px; }
    
    /* CONTENEDOR DERECHO (Equilibrado con el contenedor del logo) */
    .season-info { 
        width: 120px; 
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
        text-align: right; 
        flex-shrink: 0;
    }
    .season-txt { font-size: 11px; font-weight: bold; }
    .div-tag { background: black; color: white; padding: 2px 8px; display: inline-block; margin-top: 2px; font-size: 10px; font-weight: bold; border-radius: 2px; }

    .match-grid {
        display: flex; justify-content: space-between; background: #f2f2f2; padding: 5px 10px; border: 1px solid black;
        .cell { display: flex; flex-direction: column; align-items: center; }
        .label { font-size: 8px; font-weight: bold; color: #444; }
        .value { font-size: 11px; font-weight: bold; text-transform: uppercase; }
    }

    .rosters-section { display: flex; flex: 1; gap: 3mm; margin-bottom: 5px; align-items: stretch; min-height: 0; }
    .team-wrapper { flex: 1; display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .team-header { background: black; color: white; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid black; flex-shrink: 0; }
    .team-label { font-size: 9px; font-weight: bold; letter-spacing: 1px; }
    .team-name { font-weight: bold; font-size: 12px; text-transform: uppercase; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .table-container { flex: 1; display: flex; flex-direction: column; border: 1px solid black; border-top: none; min-height: 0; }
    .roster-table {
        width: 100%; border-collapse: collapse; font-size: 10px; flex: 1; display: flex; flex-direction: column; height: 100%;
        thead { flex-shrink: 0; }
        tbody { flex: 1; display: flex; flex-direction: column; min-height: 0; }
        tr { display: flex; width: 100%; }
        tbody tr { flex: 1; border-bottom: 1px solid #ccc; align-items: center; min-height: 0; }
        tbody tr:last-child { border-bottom: none; }
        th { border-bottom: 1px solid black; border-right: 1px solid black; background: #ddd; padding: 2px; display: flex; align-items: center; justify-content: center; font-size: 8px; height: 18px; }
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

    .sheet-footer { border-top: 2px solid black; padding-top: 5px; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; margin-top: auto; }
    .score-area { display: flex; border: 1px solid black; align-items: stretch; height: 38px; }
    .score-title { background: black; color: white; width: 24px; font-size: 10px; display: flex; align-items: center; justify-content: center; writing-mode: vertical-rl; font-weight: bold; }
    .score-content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 5px; }
    .score-team { flex: 1; width: 0; font-weight: bold; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .team-local { text-align: right; margin-right: 15px; }
    .team-visit { text-align: left; margin-left: 15px; }
    .center-block { display: flex; align-items: center; gap: 10px; justify-content: center; min-width: 90px; }
    .score-input { width: 35px; height: 28px; border: 2px solid black; background: #fff; }
    .hyphen { font-weight: 900; font-size: 14px; }
    .wo-check { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: bold; margin-right: 10px; border-left: 1px solid black; padding-left: 10px; }
    .box-sm { width: 15px; height: 15px; border: 1px solid black; }
    .penalties-area { display: flex; align-items: center; border: 1px solid #999; height: 26px; background: #f9f9f9; padding: 0 5px; position: relative; }
    .penalties-label { position: absolute; left: 5px; top: 0; bottom: 0; display: flex; align-items: center; font-size: 8px; font-weight: bold; color: #555; z-index: 1; }
    .penalties-content { flex: 1; display: flex; justify-content: center; align-items: center; width: 100%; }
    .p-team { flex: 1; width: 0; font-size: 10px; font-weight: bold; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
