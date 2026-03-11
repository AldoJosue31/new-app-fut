import React, { forwardRef } from 'react';
import { DynamicTeamLogo } from "../../../../equipos/DynamicTeamLogo";

const GoleadoresExportLayout = forwardRef(({ goleadores = [], torneo = {}, metaInfo = {}, themeMode = 'light', layoutMode = 'desktop' }, ref) => {
    const isDark = themeMode === 'dark';
    const isMobile = layoutMode === 'mobile';
    
    const colors = {
        bg: isDark ? '#121212' : '#ffffff',
        card: isDark ? '#1e1e1e' : '#ffffff',
        text: isDark ? '#f8fafc' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? '#334155' : '#e2e8f0',
        headerBg: isDark ? '#0f172a' : '#f8fafc',
        primary: '#10b981', 
    };

    return (
        <div ref={ref} style={{
            width: isMobile ? '480px' : '900px',
            backgroundColor: colors.bg,
            fontFamily: 'Arial, sans-serif',
            color: colors.text,
            padding: isMobile ? '20px' : '40px',
            boxSizing: 'border-box'
        }}>
            <div style={{ textAlign: 'center', paddingBottom: '20px', borderBottom: `2px solid ${colors.border}`, marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: colors.primary + '20', color: colors.primary, padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase' }}>
                    {metaInfo?.league || 'Liga Oficial'}
                </span>
                <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', margin: '10px 0 5px 0' }}>TABLA DE GOLEADORES</h1>
                <p style={{ fontSize: '14px', color: colors.subtext, margin: 0, fontWeight: '600' }}>{torneo?.name} • Temporada Activa</p>
            </div>

            <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: colors.headerBg }}>
                            <th style={{ padding: '12px', textAlign: 'center', width: '40px', color: colors.subtext }}>#</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: colors.subtext }}>Jugador</th>
                            {!isMobile && <th style={{ padding: '12px', textAlign: 'left', color: colors.subtext }}>Equipo</th>}
                            <th style={{ padding: '12px', textAlign: 'center', color: colors.primary }}>Goles</th>
                        </tr>
                    </thead>
                    <tbody>
                        {goleadores.slice(0, 15).map((jugador, index) => (
                            <tr key={index} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                <td style={{ textAlign: 'center', fontWeight: '800', fontSize: '16px' }}>{index + 1}</td>
                                <td style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <img src={jugador.photo_url || "https://via.placeholder.com/40"} style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: '700' }}>{jugador.first_name} {jugador.last_name}</span>
                                            {isMobile && <span style={{ fontSize: '11px', color: colors.subtext }}>{jugador.team_name}</span>}
                                        </div>
                                    </div>
                                </td>
                                {!isMobile && (
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <DynamicTeamLogo name={jugador.team_name} color={jugador.team_color} size="22px" />
                                            <span style={{ fontSize: '13px' }}>{jugador.team_name}</span>
                                        </div>
                                    </td>
                                )}
                                <td style={{ textAlign: 'center', fontWeight: '900', fontSize: '20px', color: colors.primary }}>{jugador.goals}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default GoleadoresExportLayout;