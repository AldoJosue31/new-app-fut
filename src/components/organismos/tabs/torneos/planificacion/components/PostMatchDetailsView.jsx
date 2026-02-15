import React from 'react';

// ==========================================
// HELPERS VISUALES
// ==========================================

const BadgeDorsal = ({ number }) => (
    <div style={{
        width: '32px',
        height: '32px',
        background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
        color: 'white',
        borderRadius: '8px',
        fontWeight: '800',
        fontSize: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
        <span>{number ?? '-'}</span>
    </div>
);

const BadgeGol = ({ count }) => (
    <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(16,185,129,0.1)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '12px',
        padding: '2px 8px',
    }}>
        <span style={{ fontSize: '14px', lineHeight: 1 }}>⚽</span>
        {count > 1 && <span style={{ fontSize: '13px', color: '#065f46', fontWeight: 'bold' }}>{count}</span>}
    </div>
);

const BadgeCard = ({ color }) => (
    <div style={{
        display: 'inline-block',
        width: '12px',
        height: '18px',
        borderRadius: '3px',
        background: color === 'yellow' ? '#facc15' : '#dc2626',
        border: `1px solid ${color === 'yellow' ? '#ca8a04' : '#991b1b'}`,
        marginLeft: '6px',
        verticalAlign: 'middle'
    }} />
);

// ==========================================
// TABLA DE ALINEACIÓN
// ==========================================

const LineupTable = ({ title, players = [], colors }) => {
    return (
        <div style={{ marginBottom: 0, width: '100%' }}>
            <h4 style={{
                fontWeight: '800',
                color: colors.text,
                fontSize: '15px',
                marginBottom: '15px',
                borderBottom: `2px solid ${colors.border}`,
                paddingBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                {title}
            </h4>

            {players.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {players.map((p, i) => {
                            const fullName = `${p.name ?? ''} ${p.lastName ?? ''}`.trim() || 'Sin nombre';
                            const isLast = i === players.length - 1;
                            const borderBottom = isLast ? 'none' : `1px solid ${colors.border}`;

                            return (
                                <tr key={p.id ?? i}>
                                    <td style={{ width: '45px', padding: '10px 0', borderBottom: borderBottom, verticalAlign: 'middle', textAlign: 'center' }}>
                                        <BadgeDorsal number={p.number} />
                                    </td>
                                    <td style={{ padding: '10px 12px', borderBottom: borderBottom, verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '15px', fontWeight: '700', color: colors.textStrong, lineHeight: 1.3 }}>
                                                {fullName}
                                            </span>
                                            {p.position && (
                                                <span style={{ fontSize: '12px', color: colors.subtext, marginTop: '2px' }}>
                                                    {p.position}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ width: 'auto', padding: '10px 0', borderBottom: borderBottom, verticalAlign: 'middle', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            {p.goalsCount > 0 && <BadgeGol count={p.goalsCount} />}
                                            {p.hasYellow && <BadgeCard color="yellow" />}
                                            {p.hasRed && <BadgeCard color="red" />}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <div style={{ 
                    fontSize: '14px', color: colors.subtext, fontStyle: 'italic', margin: '10px 0', 
                    padding: '15px', background: colors.cardBg, borderRadius: '8px', textAlign: 'center', 
                    border: `1px dashed ${colors.border}` 
                }}>
                    Sin alineación registrada
                </div>
            )}
        </div>
    );
};

// ==========================================
// VISTA PRINCIPAL
// ==========================================

const PostMatchDetailsView = ({ match = {}, referees = {}, homeLineup = [], awayLineup = [], themeMode = 'light' }) => {
    const isDark = themeMode === 'dark';
    
    // PALETA INTERNA DINÁMICA
    const colors = {
        text: isDark ? '#e2e8f0' : '#0f172a',
        textStrong: isDark ? '#f8fafc' : '#1e293b',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? '#333333' : '#e2e8f0',
        cardBg: isDark ? '#262626' : '#ffffff',
        accentBg: isDark ? '#2d2d2d' : '#f8fafc'
    };

    const containerStyle = {
        width: '100%',
        fontFamily: 'Arial, sans-serif',
        color: colors.text,
        display: 'flex',
        flexDirection: 'column',
        gap: '30px'
    };

    const headerStyle = {
        borderBottom: `1px solid ${colors.border}`,
        paddingBottom: '20px',
        textAlign: 'center'
    };

    return (
        <div style={containerStyle}>
            {/* Header Interno */}
            <div style={headerStyle}>
                <h3 style={{ fontSize: '22px', fontWeight: '900', textTransform: 'uppercase', margin: 0, color: colors.textStrong }}>
                    Reporte Oficial
                </h3>
                <p style={{ fontSize: '13px', color: colors.subtext, margin: '4px 0 0 0' }}>
                    Detalle Estadístico del Partido
                </p>
            </div>

            {/* Cuerpo Arbitral */}
            <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>
                    <span style={{ fontSize: '18px' }}>⚖️</span>
                    <span style={{ fontWeight: '800', fontSize: '14px', textTransform: 'uppercase', color: colors.subtext }}>Cuerpo Arbitral</span>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: colors.subtext, fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Árbitro Principal</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: colors.textStrong }}>{referees.main || 'No asignado'}</div>
                </div>
            </div>

            {/* Alineaciones (2 Columnas) */}
            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <LineupTable title={match.homeTeam?.name || 'Local'} players={homeLineup} colors={colors} />
                </div>
                
                <div style={{ width: '1px', backgroundColor: colors.border, alignSelf: 'stretch' }}></div>
                
                <div style={{ flex: 1 }}>
                    <LineupTable title={match.awayTeam?.name || 'Visita'} players={awayLineup} colors={colors} />
                </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', borderTop: `1px solid ${colors.border}`, paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.subtext }}>
                <span>ID: {match.id}</span>
                <span>Generado: {new Date().toLocaleDateString()}</span>
            </div>
        </div>
    );
};

export default PostMatchDetailsView;