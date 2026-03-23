// src/components/organismos/tabs/torneos/exports/standings/StandingsExportLayout.jsx
import React, { forwardRef } from 'react';
import { v } from "../../../../../../index"; 
import { RiArrowUpSFill, RiArrowDownSFill, RiSubtractLine } from "react-icons/ri";
import { DynamicTeamLogo } from "../../../../equipos/DynamicTeamLogo";

const StandingsExportLayout = forwardRef(({ tablaGeneral = [], torneo = {}, config = {}, metaInfo = {}, themeMode = 'light', layoutMode = 'desktop' }, ref) => {
    const isDark = themeMode === 'dark';
    const isMobile = layoutMode === 'mobile'; // "mobile" = Historia (1080x1920), "desktop" = Post 4:5 (1080x1350)
    
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

    // --- LÓGICA DE DIMENSIONES FIJAS Y SEGURAS ---
    const containerWidth = '1080px'; 
    const containerHeight = isMobile ? '1920px' : '1350px'; 
    const totalEquipos = Math.max(tablaGeneral.length, 1);

    // --- CÁLCULO DE ESCALADO DINÁMICO RESTRINGIDO ---
    // Topamos la escala máxima a 1.05 (Post) y 1.25 (Historia) para asegurar que NUNCA 
    // desborde horizontalmente. Si hay muchos equipos, se reduce para que quepan verticalmente.
    const maxScale = isMobile ? 1.25 : 1.05; 
    const teamsThreshold = isMobile ? 32 : 24; 
    const rowScale = Math.min(maxScale, teamsThreshold / totalEquipos);

    // --- CONFIGURACIÓN DE TAMAÑOS ---
    const logoSize = isMobile ? '220px' : '170px'; 
    const hasLogo = !!metaInfo?.leagueLogo;
    const hideGFGC = isMobile; // Oculta GF/GC solo en historias para dar más aire

    // Fuentes Fijas (Cabeceras y Pie)
    const fTitle = isMobile ? '42px' : '36px';
    const fSub = isMobile ? '22px' : '18px';
    const fBadge = isMobile ? '16px' : '14px';

    // Fuentes Escaladas Protegidas (Contenido de la Tabla)
    const fTh = `${14 * rowScale}px`;
    const fTd = `${16 * rowScale}px`;
    const fPts = `${20 * rowScale}px`;
    const fTeam = `${18 * rowScale}px`;
    const cellPadding = `${8 * rowScale}px 6px`; // Padding Y pequeño, se estira con height: 100%
    
    const teamLogoSize = `${32 * rowScale}px`;
    const iconSameSize = `${16 * rowScale}px`;
    const iconArrowSize = `${20 * rowScale}px`;
    const arrowMargin = `-${5 * rowScale}px`;
    const gapSize = `${10 * rowScale}px`;
    const rankWidth = `${42 * rowScale}px`;

    const renderStandingTable = (data, startRank, keyPrefix) => (
        <div key={keyPrefix} style={{ 
            backgroundColor: colors.card, 
            borderRadius: isMobile ? '20px' : '16px', 
            border: `2px solid ${colors.border}`, 
            overflow: 'hidden',
            flex: 1,      
            minWidth: 0,
            display: 'flex',          
            flexDirection: 'column'   
        }}>
            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', textAlign: 'center', tableLayout: 'auto' }}>
                <thead>
                    <tr style={{ backgroundColor: colors.headerBg }}>
                        <th style={{ padding: `${14 * rowScale}px 15px`, textAlign: 'left', fontSize: fTh, color: colors.subtext, textTransform: 'uppercase', borderBottom: `3px solid ${colors.border}` }}>Equipo</th>
                        <th style={{ padding: `${14 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `3px solid ${colors.border}` }}>PJ</th>
                        <th style={{ padding: `${14 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `3px solid ${colors.border}` }}>G</th>
                        <th style={{ padding: `${14 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `3px solid ${colors.border}` }}>E</th>
                        <th style={{ padding: `${14 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `3px solid ${colors.border}` }}>P</th>
                        {!hideGFGC && <th style={{ padding: `${14 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `3px solid ${colors.border}` }}>GF</th>}
                        {!hideGFGC && <th style={{ padding: `${14 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `3px solid ${colors.border}` }}>GC</th>}
                        <th style={{ padding: `${14 * rowScale}px 4px`, fontSize: fTh, color: colors.subtext, borderBottom: `3px solid ${colors.border}` }}>DIF</th>
                        <th style={{ padding: `${14 * rowScale}px 4px`, fontSize: fTh, color: colors.pending, borderBottom: `3px solid ${colors.border}` }}>Pnd</th>
                        <th style={{ padding: `${14 * rowScale}px 15px`, fontSize: fTh, color: colors.primary, borderBottom: `3px solid ${colors.border}` }}>PTS</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((fila, index) => {
                        const rank = startRank + index;
                        const zoneColor = getZoneColor(rank - 1, totalEquipos);
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
                                        <span style={{ fontWeight: '800', fontSize: fTeam, color: colors.text, whiteSpace: 'nowrap' }}>
                                            {/* Truncamos para prevenir empujes horizontales */}
                                            {fila.nombre.length > (isMobile ? 24 : 32) ? fila.nombre.substring(0, isMobile ? 22 : 29) + '...' : fila.nombre}
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
            padding: isMobile ? '60px 40px' : '40px 50px',
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
                marginBottom: isMobile ? '40px' : '25px', 
                minHeight: isMobile ? '250px' : '180px', 
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
                        {metaInfo?.lastJornada && metaInfo.lastJornada !== 'Sin iniciar' ? ` • Hasta la ${metaInfo.lastJornada}` : ''}
                    </p>
                </div>

                {hasLogo && <div style={{ width: logoSize, flexShrink: 0 }}></div>}
            </div>

            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                gap: '20px', 
                width: '100%',
                flex: 1, 
                marginBottom: isMobile ? '40px' : '25px' 
            }}>
                {tablaGeneral.length > 0 ? renderStandingTable(tablaGeneral, 1, 'table-main') : null}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', padding: '10px 0' }}>
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