// src/components/organismos/tabs/torneos/exports/standings/StandingsExportLayout.jsx
import React, { forwardRef } from 'react';
import { v } from "../../../../../../styles/variables";
import {
    RiArrowUpSFill,
    RiArrowDownSFill,
    RiSubtractLine,
    RiArrowUpCircleFill,
    RiTrophyLine,
    RiRepeat2Line,
    RiArrowDownCircleFill
} from "react-icons/ri";
import { DynamicTeamLogo } from "../../../../equipos/DynamicTeamLogo";
import { getStandingsExportAppearance } from "./standingsExportStyles";

const StandingsExportLayout = forwardRef(({ tablaGeneral = [], torneo = {}, config = {}, metaInfo = {}, themeMode = 'light', layoutMode = 'desktop', showGeneratedDate = true, tableDesign = 'classic', backgroundDesign = 'solid', leagueColors = null }, ref) => {
    const isDark = themeMode === 'dark';
    const isMobile = layoutMode === 'mobile'; // "mobile" = Historia (1080x1920), "desktop" = Post 4:5 (1080x1350)
    
    const { page: pageColors, table: colors } = getStandingsExportAppearance({ themeMode, tableDesign, backgroundDesign, leagueColors });
    const zoneColors = {
        promotion: colors.positive,
        playoffs: isDark ? '#60a5fa' : '#1d4ed8',
        repechage: colors.pending,
        relegation: colors.negative
    };

    const getZoneColor = (index, total) => {
        const rank = index + 1;
        if (rank <= config.ascensos) return zoneColors.promotion;
        if (config.zonaLiguilla) {
            if (rank > config.ascensos && rank <= config.clasificados) return zoneColors.playoffs;
            const limitLiguilla = Math.max(config.clasificados, config.ascensos);
            if (rank > limitLiguilla && rank <= (limitLiguilla + config.repechaje)) return zoneColors.repechage;
        }
        if (config.descensos > 0 && rank > (total - config.descensos)) return zoneColors.relegation;
        return 'transparent';
    };

    // --- LÓGICA DE DIMENSIONES FIJAS Y SEGURAS ---
    const containerWidth = '1080px'; 
    const containerHeight = isMobile ? '1920px' : '1350px'; 
    const totalEquipos = Math.max(tablaGeneral.length, 1);
    const hasLogo = !!metaInfo?.leagueLogo;

    // Reserve space for the header, legend and date before sizing the rows.
    // Status badges also take space: counting teams alone can clip the footer.
    const headerHeight = hasLogo ? (isMobile ? 300 : 235) : (isMobile ? 250 : 180);
    const tableHeight = (isMobile ? 1920 : 1350)
        - (isMobile ? 120 : 80) - headerHeight
        - (isMobile ? 80 : 50) - 60;
    const rowHeightBudget = tablaGeneral.reduce((height, row) =>
        height + 48 + (row.clinchedStatuses?.length ? 14 : 0), 0);
    const rowScale = Math.min(isMobile ? 1.25 : 1.05, (tableHeight - 3) / (50 + Math.max(rowHeightBudget, 48)));

    // --- CONFIGURACIÓN DE TAMAÑOS ---
    const logoSize = isMobile ? '260px' : '210px'; 
    const leagueLogoSize = isMobile ? '120%' : '125%';
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
    const fClinched = `${11 * rowScale}px`;
    const cellPadding = `${8 * rowScale}px 6px`; // Padding Y pequeño, se estira con height: 100%
    
    const teamLogoSize = `${32 * rowScale}px`;
    const iconSameSize = `${16 * rowScale}px`;
    const iconArrowSize = `${20 * rowScale}px`;
    const arrowMargin = `-${5 * rowScale}px`;
    const gapSize = `${10 * rowScale}px`;
    const rankWidth = `${42 * rowScale}px`;
    const fLegend = isMobile ? '18px' : '16px';
    const headerCellStyle = {
        padding: `${14 * rowScale}px 4px`,
        fontSize: fTh,
        color: colors.headerText,
        borderBottom: `${colors.headerBorderWidth}px solid ${colors.border}`
    };
    const hasContrastHeader = tableDesign === 'editorial' || tableDesign === 'scoreboard';

    const renderLegendItem = (label, color, Icon) => (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            color,
            fontSize: fLegend,
            fontWeight: '800',
            lineHeight: 1.2,
            whiteSpace: 'nowrap'
        }}>
            {React.createElement(Icon, { style: { fontSize: isMobile ? '23px' : '21px', flexShrink: 0 } })}
            {label}
        </span>
    );

    const renderStandingTable = (data, startRank, keyPrefix) => (
        <div key={keyPrefix} style={{ 
            backgroundColor: colors.card, 
            backgroundImage: colors.backgroundImage,
            borderRadius: `${colors.radius}px`,
            border: `${colors.borderWidth}px solid ${colors.border}`,
            boxShadow: colors.shadow,
            overflow: 'hidden',
            flex: 1,      
            minWidth: 0,
            display: 'flex',          
            flexDirection: 'column'   
        }}>
            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', textAlign: 'center', tableLayout: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                    <tr style={{ backgroundColor: colors.headerBg }}>
                        <th scope="col" style={{ ...headerCellStyle, padding: `${14 * rowScale}px 15px`, textAlign: 'left', textTransform: 'uppercase' }}>Equipo</th>
                        <th scope="col" style={headerCellStyle}>PJ</th>
                        <th scope="col" style={headerCellStyle}>G</th>
                        <th scope="col" style={headerCellStyle}>E</th>
                        <th scope="col" style={headerCellStyle}>P</th>
                        {!hideGFGC && <th scope="col" style={headerCellStyle}>GF</th>}
                        {!hideGFGC && <th scope="col" style={headerCellStyle}>GC</th>}
                        <th scope="col" style={headerCellStyle}>DIF</th>
                        <th scope="col" style={{ ...headerCellStyle, color: hasContrastHeader ? colors.headerText : colors.pending }}>Pnd</th>
                        <th scope="col" style={{ ...headerCellStyle, padding: `${14 * rowScale}px 15px`, color: hasContrastHeader ? colors.headerText : colors.primary }}>PTS</th>
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
                                                {fila.tendencia === 'up' && Array.from({ length: flechasToShow }).map((_, i) => <RiArrowUpSFill key={`up-${i}`} style={{ color: colors.positive, fontSize: iconArrowSize, marginTop: arrowMargin, marginBottom: arrowMargin }} />)}
                                                {fila.tendencia === 'down' && Array.from({ length: flechasToShow }).map((_, i) => <RiArrowDownSFill key={`down-${i}`} style={{ color: colors.negative, fontSize: iconArrowSize, marginTop: arrowMargin, marginBottom: arrowMargin }} />)}
                                            </div>
                                        </div>
                                        <div style={{ width: teamLogoSize, height: teamLogoSize, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {fila.logo ? (
                                                <img src={fila.logo} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} onError={(e) => { e.target.onerror = null; e.target.src = v.logoGenerico; }}/>
                                            ) : (
                                                <DynamicTeamLogo name={fila.nombre} color={fila.color || "#000000"} size="100%" />
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                                            <span style={{ fontWeight: '800', fontSize: fTeam, color: colors.text, whiteSpace: 'nowrap', lineHeight: '1.15' }}>
                                                {/* Truncamos para prevenir empujes horizontales */}
                                                {fila.nombre.length > (isMobile ? 24 : 32) ? fila.nombre.substring(0, isMobile ? 22 : 29) + '...' : fila.nombre}
                                            </span>
                                            {Array.isArray(fila.clinchedStatuses) && fila.clinchedStatuses.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: `${4 * rowScale}px`, marginTop: `${2 * rowScale}px`, maxWidth: isMobile ? '260px' : '360px' }}>
                                                    {fila.clinchedStatuses.map((status) => (
                                                        <span
                                                            key={status.key}
                                                            style={{
                                                                color: status.color,
                                                                fontSize: fClinched,
                                                                fontWeight: '900',
                                                                lineHeight: '1',
                                                                textTransform: 'uppercase',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: cellPadding, fontSize: fTd, fontWeight: '700' }}>{fila.pj}</td>
                                <td style={{ padding: cellPadding, fontSize: fTd, color: colors.subtext }}>{fila.g}</td>
                                <td style={{ padding: cellPadding, fontSize: fTd, color: colors.subtext }}>{fila.e}</td>
                                <td style={{ padding: cellPadding, fontSize: fTd, color: colors.subtext }}>{fila.p}</td>
                                {!hideGFGC && <td style={{ padding: cellPadding, fontSize: fTd, color: colors.subtext }}>{fila.gf}</td>}
                                {!hideGFGC && <td style={{ padding: cellPadding, fontSize: fTd, color: colors.subtext }}>{fila.gc}</td>}
                                <td style={{ padding: cellPadding, fontSize: fTd, fontWeight: '900', color: fila.dg > 0 ? colors.positive : fila.dg < 0 ? colors.negative : colors.text }}>
                                    {fila.dg > 0 ? `+${fila.dg}` : fila.dg}
                                </td>
                                <td style={{ padding: cellPadding, fontSize: fTd, fontWeight: '700', color: fila.partidosPendientes > 0 ? colors.pending : colors.subtext, opacity: fila.partidosPendientes > 0 ? 1 : 0.3 }}>
                                    {fila.partidosPendientes}
                                </td>
                                <td style={{ padding: cellPadding, fontSize: fPts, fontWeight: '900', color: colors.primary }}>
                                    <span style={{ display: 'inline-block', minWidth: `${38 * rowScale}px`, padding: tableDesign === 'scoreboard' ? `${5 * rowScale}px ${8 * rowScale}px` : 0, borderRadius: `${colors.pointsRadius}px`, backgroundColor: colors.pointsBg, color: colors.pointsText }}>
                                        {fila.pts}
                                    </span>
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
            backgroundColor: pageColors.bg,
            backgroundImage: pageColors.backgroundImage,
            fontFamily: 'Arial, sans-serif',
            color: pageColors.text,
            padding: isMobile ? '60px 40px' : '40px 50px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start', 
            position: 'relative',
            isolation: 'isolate',
            overflow: 'hidden',
        }}>
            {backgroundDesign === 'pitch' && (
                <svg aria-hidden="true" viewBox="0 0 1080 1350" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: leagueColors?.primary ? pageColors.primary : isDark ? '#b4dec3' : '#417c55', opacity: 0.18, zIndex: -1, pointerEvents: 'none' }}>
                    <g fill="none" stroke="currentColor" strokeWidth="3">
                        <rect x="32" y="32" width="1016" height="1286" />
                        <path d="M32 675H1048" />
                        <circle cx="540" cy="675" r="160" />
                        <rect x="290" y="32" width="500" height="180" />
                        <rect x="390" y="32" width="300" height="76" />
                        <rect x="290" y="1138" width="500" height="180" />
                        <rect x="390" y="1242" width="300" height="76" />
                    </g>
                </svg>
            )}
            <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: hasLogo ? 'space-between' : 'center',
                paddingBottom: isMobile ? '40px' : '25px', 
                borderBottom: `2px solid ${pageColors.border}`,
                marginBottom: isMobile ? '40px' : '25px', 
                minHeight: isMobile ? '250px' : '180px', 
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {hasLogo && (
                    <div style={{ width: logoSize, height: logoSize, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                        <img src={metaInfo.leagueLogo} alt="Logo Liga" crossOrigin="anonymous" style={{ width: leagueLogoSize, height: leagueLogoSize, objectFit: 'contain', objectPosition: 'center', filter: isDark ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }} />
                    </div>
                )}

                <div style={{ flex: 1, textAlign: 'center', padding: '0 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <span style={{ fontSize: fBadge, fontWeight: '800', backgroundColor: pageColors.primarySoft, color: pageColors.primary, padding: '6px 16px', borderRadius: '30px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {metaInfo?.league || 'Liga'}
                        </span>
                    </div>

                    <h1 style={{ fontSize: fTitle, fontWeight: '900', textTransform: 'uppercase', margin: '0 0 10px 0', color: pageColors.text, lineHeight: '1.1' }}>
                        {torneo?.name || 'Tabla General'}
                    </h1>

                    <p style={{ fontSize: fSub, color: pageColors.text, margin: '0 0 8px 0', fontWeight: '800' }}>
                        {metaInfo?.division || 'División'}
                    </p>
                    
                    <p style={{ fontSize: fSub, color: pageColors.subtext, margin: 0, fontWeight: '700' }}>
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
                minHeight: 0,
                marginBottom: isMobile ? '40px' : '25px' 
            }}>
                {tablaGeneral.length > 0 ? renderStandingTable(tablaGeneral, 1, 'table-main') : null}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', padding: '10px 0' }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {config.ascensos > 0 && renderLegendItem('Ascenso', zoneColors.promotion, RiArrowUpCircleFill)}
                    {config.zonaLiguilla && renderLegendItem('Liguilla', zoneColors.playoffs, RiTrophyLine)}
                    {config.repechaje > 0 && renderLegendItem('Repechaje', zoneColors.repechage, RiRepeat2Line)}
                    {config.descensos > 0 && renderLegendItem('Descenso', zoneColors.relegation, RiArrowDownCircleFill)}
                </div>
                
                {showGeneratedDate && (
                    <div style={{ fontSize: fBadge, color: pageColors.subtext, fontWeight: '700' }}>
                        Generado el {new Date().toLocaleDateString()}
                    </div>
                )}
            </div>
        </div>
    );
});

export default StandingsExportLayout;
