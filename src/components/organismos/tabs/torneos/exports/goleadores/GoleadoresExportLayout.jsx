import React, { forwardRef, useState } from 'react';
import { FaUserCircle } from "react-icons/fa";
import { DynamicTeamLogo } from "../../../../equipos/DynamicTeamLogo";

function ExportPlayerAvatar({ jugador, size = 35, bg, border, iconColor }) {
    const [hasImageError, setHasImageError] = useState(false);
    const hasPhoto = !!jugador?.photo_url && !hasImageError;

    return (
        <div style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: bg,
            border: `1px solid ${border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }}>
            {hasPhoto ? (
                <img
                    src={jugador.photo_url}
                    alt={`${jugador.first_name || ''} ${jugador.last_name || ''}`.trim() || 'Jugador'}
                    crossOrigin="anonymous"
                    onError={() => setHasImageError(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            ) : (
                <FaUserCircle style={{ fontSize: `${size * 0.8}px`, color: iconColor, opacity: 0.7 }} />
            )}
        </div>
    );
}

function formatJornadaSubtitle(activeJornadaName) {
    const raw = String(activeJornadaName || '').trim();
    if (!raw || raw.toLowerCase() === 'sin iniciar') return 'Sin iniciar';

    const jornadaMatch = raw.match(/jornada\s+(\d+)/i);
    if (!jornadaMatch) return raw;

    const jornadaNumber = jornadaMatch[1];
    const pendingMatch = raw.match(/\((\d+)\s+pendientes?\)/i);

    if (pendingMatch) {
        return `Hasta la jornada ${jornadaNumber} con ${pendingMatch[1]} pendientes`;
    }

    return `Hasta la jornada ${jornadaNumber}`;
}

const GoleadoresExportLayout = forwardRef(({
    goleadores = [],
    torneo = {},
    metaInfo = {},
    activeJornadaName = 'Sin iniciar',
    maxPlayersToShow = 10,
    themeMode = 'light',
    layoutMode = 'desktop'
}, ref) => {
    const isDark = themeMode === 'dark';
    const isMobile = layoutMode === 'mobile';
    const visiblePlayers = goleadores.slice(0, Math.max(3, maxPlayersToShow));
    const jornadaSubtitle = formatJornadaSubtitle(activeJornadaName);

    const colors = {
        bg: isDark ? '#121212' : '#ffffff',
        card: isDark ? '#1e1e1e' : '#ffffff',
        text: isDark ? '#f8fafc' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? '#334155' : '#e2e8f0',
        headerBg: isDark ? '#0f172a' : '#f8fafc',
        primary: '#10b981',
        zebra: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
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
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: colors.primary + '20', color: colors.primary, padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase' }}>
                        {metaInfo?.league || 'Liga Oficial'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: colors.border, color: colors.text, padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase' }}>
                        {metaInfo?.division || torneo?.division_nombre || 'Division unica'}
                    </span>
                </div>
                <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', margin: '10px 0 5px 0' }}>TABLA DE GOLEADORES</h1>
                <p style={{ fontSize: '14px', color: colors.subtext, margin: 0, fontWeight: '600' }}>
                    {jornadaSubtitle}
                </p>
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
                        {visiblePlayers.map((jugador, index) => (
                            <tr key={jugador?.player_id ?? index} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: index % 2 !== 0 ? colors.zebra : 'transparent' }}>
                                <td style={{ textAlign: 'center', fontWeight: '800', fontSize: '16px' }}>{index + 1}</td>
                                <td style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <ExportPlayerAvatar
                                            jugador={jugador}
                                            size={35}
                                            bg={colors.headerBg}
                                            border={colors.border}
                                            iconColor={colors.subtext}
                                        />
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
                        {visiblePlayers.length === 0 && (
                            <tr>
                                <td colSpan={isMobile ? 3 : 4} style={{ padding: '24px', textAlign: 'center', color: colors.subtext, fontWeight: '700' }}>
                                    No hay goleadores registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default GoleadoresExportLayout;
