// src/components/organismos/tabs/torneos/exports/standings/StandingsExportLayout.jsx
import React, { forwardRef } from 'react';
import { v } from "../../../../../../index"; 
import { RiArrowUpSFill, RiArrowDownSFill, RiSubtractLine } from "react-icons/ri";
import { DynamicTeamLogo } from "../../../../equipos/DynamicTeamLogo";

const StandingsExportLayout = forwardRef(({ tablaGeneral = [], torneo = {}, config = {}, metaInfo = {}, themeMode = 'light', layoutMode = 'desktop' }, ref) => {
    const isDark = themeMode === 'dark';
    const isMobile = layoutMode === 'mobile'; // "mobile" ahora significa formato Historia (1080x1920)
    
    // Paleta de colores
    const colors = {
        bg: isDark ? '#121212' : '#ffffff',
        card: isDark ? '#1e1e1e' : '#ffffff',
        text: isDark ? '#f8fafc' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? '#334155' : '#e2e8f0',
        headerBg: isDark ? '#0f172a' : '#f8fafc',
        primary: '#10b981', 
        pending: '#f59e0b', 
        zebra: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', 
    };

    const getZoneColor = (index, total) => {
        const rank = index + 1;
        if (rank <= config.ascensos) return '#22c55e'; 
        if (config.zonaLiguilla) {
            if (rank > config.ascensos && rank <= config.clasificados) return '#3b82f6'; 
            const limitLiguilla = Math.max(config.clasificados, config.ascensos);
            if (rank > limitLiguilla && rank <= (limitLiguilla + config.repechaje)) return '#f59e0b'; 
        }
        if (config.descensos > 0 && rank > (total - config.descensos)) return '#ef4444'; 
        return 'transparent';
    };

    // --- LÓGICA DE DIVISIÓN DE TABLA (STORY MODE vs DESKTOP) ---
    let numCols = 1;
    let containerWidth, containerHeight;

    if (isMobile) {
        // EN MÓVIL FORZAMOS EL LIENZO A 1080x1920
        containerWidth = '1080px';
        containerHeight = '1920px';
        // Si hay más de 25 equipos, la tabla no cabe en 1920px de alto, la partimos a la mitad
        if (tablaGeneral.length > 25) {
            numCols = 2;
        }
    } else {
        // EN DESKTOP CALCULAMOS ASPECT RATIO
        containerHeight = 'auto';
        const estRowHeight = 45;
        const estHeaderFooter = 300;
        const colWidth = 900; 
        
        let currentHeight = estHeaderFooter + (tablaGeneral.length * estRowHeight);
        let currentRatio = currentHeight / colWidth; 
        
        while ((currentRatio > (16 / 9) || Math.ceil(tablaGeneral.length / numCols) > 16) && numCols < 4) {
            numCols++;
            let newHeight = estHeaderFooter + (Math.ceil(tablaGeneral.length / numCols) * estRowHeight);
            currentRatio = newHeight / (colWidth * numCols);
        }
        containerWidth = numCols === 1 ? '1000px' : `${numCols * 850}px`;
    }

    const chunks = [];
    const chunkSize = tablaGeneral.length > 0 ? Math.ceil(tablaGeneral.length / numCols) : 1;

    if (tablaGeneral.length === 0) {
        chunks.push([]);
    } else {
        for (let i = 0; i < tablaGeneral.length; i += chunkSize) {
            chunks.push(tablaGeneral.slice(i, i + chunkSize));
        }
    }

    // --- CÁLCULO DE ESCALADO DINÁMICO PARA LLENAR ESPACIO ---
    // Si hay pocos equipos, el texto y logos crecerán para aprovechar el alto (máx 2.5x)
    const rowScale = isMobile ? Math.min(2.5, 24 / Math.max(chunkSize, 6)) : 1;

    // --- CONFIGURACIÓN DE TAMAÑOS Y FUENTES ---
    const logoSize = isMobile ? '220px' : '180px'; 
    const hasLogo = !!metaInfo?.leagueLogo;
    const hideGFGC = isMobile; 

    // Fuentes Fijas (Cabeceras y Pie)
    const fTitle = isMobile ? '38px' : '28px';
    const fSub = isMobile ? '20px' : '14px';
    const fBadge = isMobile ? '14px' : '12px';

    // Fuentes y Tamaños Escalados (Contenido de la Tabla)
    const fTh = isMobile ? `${16 * rowScale}px` : '13px';
    const fTd = isMobile ? `${18 * rowScale}px` : '14px';
    const fPts = isMobile ? `${22 * rowScale}px` : '18px';
    const fTeam = isMobile ? `${20 * rowScale}px` : '15px';
    const cellPadding = isMobile ? `${10 * rowScale}px 4px` : '12px 5px';
    
    const teamLogoSize = isMobile ? `${36 * rowScale}px` : '30px';
    const iconSameSize = isMobile ? `${18 * rowScale}px` : '16px';
    const iconArrowSize = isMobile ? `${22 * rowScale}px` : '18px';
    const arrowMargin = isMobile ? `-${5 * rowScale}px` : '-6px';
    const gapSize = isMobile ? `${10 * rowScale}px` : '10px';
    const rankWidth = isMobile ? `${50 * rowScale}px` : '45px';

    const renderStandingTable = (data, startRank, keyPrefix) => (
        <div key={keyPrefix} style={{ 
            backgroundColor: colors.card, 
            borderRadius: isMobile ? '20px' : '12px', 
            border: `1px solid ${colors.border}`, 
            overflow: 'hidden',
            flex: 1,      
            minWidth: 0,
            display: 'flex',          
            flexDirection: 'column'   
        }}>
            <table style={{ width: '100%', height: isMobile ? '100%' : 'auto', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                    <tr style={{ backgroundColor: colors.headerBg }}>
                        <th style={{ padding: `${16 * rowScale}px 10px`, textAlign: 'left', fontSize: fTh, color: colors.subtext, textTransform: 'uppercase', borderBottom: `2px solid ${colors.border}` }}>Equipo</th>
                        <th style={{ padding: `${16 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>PJ</th>
                        
                        <th style={{ padding: `${16 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>G</th>
                        <th style={{ padding: `${16 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>E</th>
                        <th style={{ padding: `${16 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>P</th>
                        
                        {!hideGFGC && <th style={{ padding: `${16 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>GF</th>}
                        {!hideGFGC && <th style={{ padding: `${16 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>GC</th>}
                        
                        <th style={{ padding: `${16 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>DIF</th>
                        <th style={{ padding: `${16 * rowScale}px 4px`, fontSize: fTh, color: colors.pending, borderBottom: `2px solid ${colors.border}` }}>Pnd</th>
                        <th style={{ padding: `${16 * rowScale}px 10px`, fontSize: fTh, color: colors.primary, borderBottom: `2px solid ${colors.border}` }}>PTS</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((fila, index) => {
                        const rank = startRank + index;
                        const zoneColor = getZoneColor(rank - 1, tablaGeneral.length);
                        const isLast = index === data.length - 1;
                        const flechasToShow = Math.min(fila.posDiff || 0, 3);
                        const rowBorderColor = (zoneColor !== 'transparent') ? `${zoneColor}60` : colors.border;
                        const rowBgColor = index % 2 !== 0 ? colors.zebra : 'transparent';
                        
                        return (
                            <tr key={fila.id} style={{ backgroundColor: rowBgColor, borderBottom: isLast ? 'none' : `1px solid ${rowBorderColor}` }}>
                                <td style={{ padding: cellPadding, textAlign: 'left', borderLeft: `8px solid ${zoneColor}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: gapSize }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: rankWidth, justifyContent: 'flex-end' }}>
                                            <span style={{ fontWeight: '800', fontSize: fTd, color: colors.subtext }}>{rank}</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                {fila.tendencia === 'same' && <RiSubtractLine style={{ color: colors.subtext, opacity: 0.5, fontSize: iconSameSize, marginLeft: '2px' }} />}
                                                {fila.tendencia === 'up' && Array.from({ length: flechasToShow }).map((_, i) => <RiArrowUpSFill key={`up-${i}`} style={{ color: '#22c55e', fontSize: iconArrowSize, marginTop: arrowMargin, marginBottom: arrowMargin }} />)}
                                                {fila.tendencia === 'down' && Array.from({ length: flechasToShow }).map((_, i) => <RiArrowDownSFill key={`down-${i}`} style={{ color: '#ef4444', fontSize: iconArrowSize, marginTop: arrowMargin, marginBottom: arrowMargin }} />)}
                                            </div>
                                        </div>
                                        <div style={{ width: teamLogoSize, height: teamLogoSize, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {fila.logo ? (
                                                <img src={fila.logo} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} onError={(e) => { e.target.onerror = null; e.target.src = v.logoGenerico; }}/>
                                            ) : (
                                                <DynamicTeamLogo name={fila.nombre} color={fila.color || "#000000"} size="100%" />
                                            )}
                                        </div>
                                        <span style={{ fontWeight: '800', fontSize: fTeam, color: colors.text }}>
                                            {fila.nombre.length > (isMobile ? (numCols === 2 ? 10 : 22) : 28) ? fila.nombre.substring(0, isMobile ? (numCols === 2 ? 8 : 20) : 26) + '...' : fila.nombre}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ padding: cellPadding, fontSize: fTd, fontWeight: '700' }}>{fila.pj}</td>
                                
                                <td style={{ padding: cellPadding, fontSize: fTd, color: colors.subtext }}>{fila.g}</td>
                                <td style={{ padding: cellPadding, fontSize: fTd, color: colors.subtext }}>{fila.e}</td>
                                <td style={{ padding: cellPadding, fontSize: fTd, color: colors.subtext }}>{fila.p}</td>
                                
                                {!hideGFGC && <td style={{ padding: cellPadding, fontSize: fTd, color: colors.subtext }}>{fila.gf}</td>}
                                {!hideGFGC && <td style={{ padding: cellPadding, fontSize: fTd, color: colors.subtext }}>{fila.gc}</td>}
                                
                                <td style={{ padding: cellPadding, fontSize: fTd, fontWeight: '900', color: fila.dg > 0 ? '#22c55e' : fila.dg < 0 ? '#ef4444' : colors.text }}>
                                    {fila.dg > 0 ? `+${fila.dg}` : fila.dg}
                                </td>
                                
                                <td style={{ padding: cellPadding, fontSize: fTd, fontWeight: '700', color: fila.partidosPendientes > 0 ? colors.pending : colors.subtext, opacity: fila.partidosPendientes > 0 ? 1 : 0.3 }}>
                                    {fila.partidosPendientes}
                                </td>
                                
                                <td style={{ padding: cellPadding, fontSize: fPts, fontWeight: '900', color: colors.primary }}>
                                    {fila.pts}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div ref={ref} style={{
            width: containerWidth,
            height: containerHeight, 
            backgroundColor: colors.bg,
            fontFamily: 'Arial, sans-serif',
            color: colors.text,
            padding: isMobile ? '60px 40px' : '40px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start', 
        }}>
            
            <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: hasLogo ? 'space-between' : 'center',
                paddingBottom: isMobile ? '40px' : '25px', 
                borderBottom: `2px solid ${colors.border}`, 
                marginBottom: isMobile ? '40px' : '20px', 
                minHeight: isMobile ? '250px' : '200px', 
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {hasLogo && (
                    <div style={{ width: logoSize, height: logoSize, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                        <img src={metaInfo.leagueLogo} alt="Logo Liga" crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: isDark ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }} />
                    </div>
                )}

                <div style={{ flex: 1, textAlign: 'center', padding: '0 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <span style={{ fontSize: fBadge, fontWeight: '800', backgroundColor: colors.primary + '20', color: colors.primary, padding: '6px 16px', borderRadius: '30px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {metaInfo?.league || 'Liga'}
                        </span>
                        <span style={{ fontSize: fBadge, fontWeight: '800', backgroundColor: colors.border, color: colors.text, padding: '6px 16px', borderRadius: '30px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {metaInfo?.division || 'División'}
                        </span>
                    </div>

                    <h1 style={{ fontSize: fTitle, fontWeight: '900', textTransform: 'uppercase', margin: '0 0 10px 0', color: colors.text, lineHeight: '1.1' }}>
                        {torneo?.name || 'Tabla General'}
                    </h1>
                    
                    <p style={{ fontSize: fSub, color: colors.subtext, margin: 0, fontWeight: '700' }}>
                        Clasificación Oficial 
                        {/* El texto de metaInfo.lastJornada ya viene del hook con el formato "Jornada 9 (X pendientes)" o "(Completada)" */}
                        {metaInfo?.lastJornada && metaInfo.lastJornada !== 'Sin iniciar' ? ` • Hasta la ${metaInfo.lastJornada}` : ''}
                    </p>
                </div>

                {hasLogo && <div style={{ width: logoSize, flexShrink: 0 }}></div>}
            </div>

            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                gap: isMobile ? '20px' : '20px', 
                width: '100%',
                flex: 1, 
                marginBottom: isMobile ? '40px' : '20px' 
            }}>
                {chunks.map((chunkData, index) => {
                    const startRank = (index * chunkSize) + 1;
                    return renderStandingTable(chunkData, startRank, `table-chunk-${index}`);
                })}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {config.ascensos > 0 && <span style={{ fontSize: fBadge, fontWeight: '800', color: '#22c55e' }}>🟩 Ascenso</span>}
                    {config.zonaLiguilla && <span style={{ fontSize: fBadge, fontWeight: '800', color: '#3b82f6' }}>🟦 Liguilla</span>}
                    {config.repechaje > 0 && <span style={{ fontSize: fBadge, fontWeight: '800', color: '#f59e0b' }}>🟧 Repechaje</span>}
                    {config.descensos > 0 && <span style={{ fontSize: fBadge, fontWeight: '800', color: '#ef4444' }}>🟥 Descenso</span>}
                </div>
                
                <div style={{ fontSize: fBadge, color: colors.subtext, fontWeight: '700' }}>
                    Generado el {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
});

export default StandingsExportLayout;