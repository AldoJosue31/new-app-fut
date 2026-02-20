import React, { forwardRef } from 'react';
import { v } from "../../../../../index"; // Ajustado para v.logoGenerico

const StandingsExportLayout = forwardRef(({ tablaGeneral = [], torneo = {}, config = {}, metaInfo = {}, themeMode = 'light', layoutMode = 'desktop' }, ref) => {
    const isDark = themeMode === 'dark';
    const isMobile = layoutMode === 'mobile';
    
    // Paleta de colores robusta
    const colors = {
        bg: isDark ? '#121212' : '#ffffff',
        card: isDark ? '#1e1e1e' : '#ffffff',
        text: isDark ? '#f8fafc' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? '#334155' : '#e2e8f0',
        headerBg: isDark ? '#0f172a' : '#f8fafc',
        primary: '#10b981', // Verde
    };

    // Funciones Helper de Zona
    const getZoneColor = (index, total) => {
        const rank = index + 1;
        if (rank <= config.ascensos) return '#22c55e'; // Verde Ascenso
        if (config.zonaLiguilla) {
            if (rank > config.ascensos && rank <= config.clasificados) return '#3b82f6'; // Azul Liguilla
            const limitLiguilla = Math.max(config.clasificados, config.ascensos);
            if (rank > limitLiguilla && rank <= (limitLiguilla + config.repechaje)) return '#f59e0b'; // Naranja Repechaje
        }
        if (config.descensos > 0 && rank > (total - config.descensos)) return '#ef4444'; // Rojo Descenso
        return 'transparent';
    };

    return (
        <div ref={ref} style={{
            width: isMobile ? '480px' : '1000px',
            backgroundColor: colors.bg,
            fontFamily: 'Arial, sans-serif',
            color: colors.text,
            padding: isMobile ? '20px' : '40px',
            boxSizing: 'border-box'
        }}>
            {/* ENCABEZADO CON LIGA, DIVISIÓN Y JORNADA */}
            <div style={{
                textAlign: 'center',
                paddingBottom: '20px',
                borderBottom: `2px solid ${colors.border}`,
                marginBottom: '20px'
            }}>
                {/* Badges de Liga y División */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ 
                        fontSize: isMobile ? '10px' : '12px', fontWeight: '800', 
                        backgroundColor: colors.primary + '20', color: colors.primary, 
                        padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' 
                    }}>
                        {metaInfo?.league || 'Cargando Liga...'}
                    </span>
                    <span style={{ 
                        fontSize: isMobile ? '10px' : '12px', fontWeight: '800', 
                        backgroundColor: colors.border, color: colors.text, 
                        padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' 
                    }}>
                        {metaInfo?.division || 'Cargando División...'}
                    </span>
                </div>

                <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 5px 0', color: colors.text }}>
                    {torneo?.name || 'Tabla General'}
                </h1>
                
                <p style={{ fontSize: '14px', color: colors.subtext, margin: 0, fontWeight: '600' }}>
                    Clasificación Oficial 
                    {metaInfo?.lastJornada && metaInfo.lastJornada !== 'Sin iniciar' ? ` • Hasta la ${metaInfo.lastJornada}` : ''}
                </p>
            </div>

            {/* TABLA DE POSICIONES */}
            <div style={{
                backgroundColor: colors.card,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                    <thead>
                        <tr style={{ backgroundColor: colors.headerBg }}>
                            <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: isMobile ? '11px' : '13px', color: colors.subtext, textTransform: 'uppercase', borderBottom: `2px solid ${colors.border}` }}>Pos / Equipo</th>
                            <th style={{ padding: '12px 5px', fontSize: isMobile ? '11px' : '13px', color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>PJ</th>
                            {!isMobile && <th style={{ padding: '12px 5px', fontSize: '13px', color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>G</th>}
                            {!isMobile && <th style={{ padding: '12px 5px', fontSize: '13px', color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>E</th>}
                            {!isMobile && <th style={{ padding: '12px 5px', fontSize: '13px', color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>P</th>}
                            {!isMobile && <th style={{ padding: '12px 5px', fontSize: '13px', color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>GF</th>}
                            {!isMobile && <th style={{ padding: '12px 5px', fontSize: '13px', color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>GC</th>}
                            <th style={{ padding: '12px 5px', fontSize: isMobile ? '11px' : '13px', color: colors.subtext, borderBottom: `2px solid ${colors.border}` }}>DIF</th>
                            <th style={{ padding: '12px 10px', fontSize: isMobile ? '12px' : '14px', color: colors.primary, borderBottom: `2px solid ${colors.border}` }}>PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tablaGeneral.map((fila, index) => {
                            const zoneColor = getZoneColor(index, tablaGeneral.length);
                            const isLast = index === tablaGeneral.length - 1;
                            
                            return (
                                <tr key={fila.id} style={{ borderBottom: isLast ? 'none' : `1px solid ${colors.border}` }}>
                                    
                                    {/* EQUIPO */}
                                    <td style={{ padding: isMobile ? '10px' : '12px 15px', textAlign: 'left', borderLeft: `6px solid ${zoneColor}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontWeight: '800', fontSize: isMobile ? '12px' : '14px', width: '20px', color: colors.subtext }}>{index + 1}</span>
                                            <img 
                                                src={fila.logo || v.logoGenerico} 
                                                alt="" 
                                                style={{ width: isMobile ? '24px' : '30px', height: isMobile ? '24px' : '30px', objectFit: 'contain', borderRadius: '4px' }}
                                                onError={(e) => { e.target.onerror = null; e.target.src = v.logoGenerico; }}
                                            />
                                            <span style={{ fontWeight: '700', fontSize: isMobile ? '13px' : '15px', color: colors.text }}>
                                                {fila.nombre.length > (isMobile ? 18 : 30) ? fila.nombre.substring(0, isMobile ? 16 : 28) + '...' : fila.nombre}
                                            </span>
                                        </div>
                                    </td>

                                    {/* ESTADÍSTICAS */}
                                    <td style={{ padding: '10px 5px', fontSize: isMobile ? '13px' : '15px', fontWeight: '600' }}>{fila.pj}</td>
                                    {!isMobile && <td style={{ padding: '10px 5px', fontSize: '14px' }}>{fila.g}</td>}
                                    {!isMobile && <td style={{ padding: '10px 5px', fontSize: '14px' }}>{fila.e}</td>}
                                    {!isMobile && <td style={{ padding: '10px 5px', fontSize: '14px' }}>{fila.p}</td>}
                                    {!isMobile && <td style={{ padding: '10px 5px', fontSize: '14px' }}>{fila.gf}</td>}
                                    {!isMobile && <td style={{ padding: '10px 5px', fontSize: '14px' }}>{fila.gc}</td>}
                                    
                                    <td style={{ 
                                        padding: '10px 5px', 
                                        fontSize: isMobile ? '13px' : '15px', 
                                        fontWeight: '700',
                                        color: fila.dg > 0 ? '#22c55e' : fila.dg < 0 ? '#ef4444' : colors.text
                                    }}>
                                        {fila.dg > 0 ? `+${fila.dg}` : fila.dg}
                                    </td>
                                    
                                    <td style={{ padding: '10px 10px', fontSize: isMobile ? '15px' : '18px', fontWeight: '900', color: colors.primary }}>
                                        {fila.pts}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* LEYENDAS Y FOOTER */}
            <div style={{ 
                marginTop: '25px', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px'
            }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {config.ascensos > 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: '#22c55e' }}>🟩 Ascenso</span>}
                    {config.zonaLiguilla && <span style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6' }}>🟦 Liguilla</span>}
                    {config.repechaje > 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: '#f59e0b' }}>🟧 Repechaje</span>}
                    {config.descensos > 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444' }}>🟥 Descenso</span>}
                </div>
                
                <div style={{ fontSize: '11px', color: colors.subtext, fontWeight: '600' }}>
                    Generado el {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
});

export default StandingsExportLayout;