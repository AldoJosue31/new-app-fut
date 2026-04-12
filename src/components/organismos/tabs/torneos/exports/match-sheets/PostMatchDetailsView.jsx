import React from 'react';
import { DynamicTeamLogo } from '../../../../equipos/DynamicTeamLogo'; 

const BadgeDorsal = ({ number }) => (
    <div style={{
        width: '28px', height: '28px',
        background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
        color: 'white', borderRadius: '6px',
        fontWeight: '800', fontSize: '13px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
        <span>{number ?? '-'}</span>
    </div>
);

const BadgeGol = ({ count }) => (
    <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: '10px', padding: '2px 8px',
    }}>
        <span style={{ fontSize: '12px' }}>⚽</span>
        {count > 1 && <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>{count}</span>}
    </div>
);

const BadgeOwnGoal = ({ count }) => (
    <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: 'rgba(249,115,22,0.14)', border: '1px solid rgba(249,115,22,0.32)',
        borderRadius: '10px', padding: '2px 8px', marginLeft: '6px',
    }}>
        <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: 'bold' }}>AG</span>
        {count > 1 && <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: 'bold' }}>{count}</span>}
    </div>
);

const BadgeCard = ({ color }) => (
    <div style={{
        display: 'inline-block', width: '10px', height: '15px',
        borderRadius: '2px', marginLeft: '5px',
        background: color === 'yellow' ? '#facc15' : '#ef4444',
        border: `1px solid ${color === 'yellow' ? '#ca8a04' : '#991b1b'}`,
    }} />
);

const LineupColumn = ({ teamName, teamLogo, teamColor, players = [], colors }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `2px solid ${colors.border}`, paddingBottom: '10px' }}>
            <div style={{ width: '25px', height: '25px' }}>
                {teamLogo ? <img src={teamLogo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <DynamicTeamLogo name={teamName} color={teamColor} size="100%" />}
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>{teamName}</h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {players.length > 0 ? players.map((p, i) => (
                <div key={i} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '8px 12px', background: colors.cardBg, borderRadius: '10px', border: `1px solid ${colors.border}` 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BadgeDorsal number={p.number} />
                        <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                            {p.name} {p.lastName?.charAt(0)}.
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {p.goalsCount > 0 && <BadgeGol count={p.goalsCount} />}
                        {p.ownGoalsCount > 0 && <BadgeOwnGoal count={p.ownGoalsCount} />}
                        {p.hasYellow && <BadgeCard color="yellow" />}
                        {p.hasRed && <BadgeCard color="red" />}
                    </div>
                </div>
            )) : <span style={{ fontSize: '12px', color: colors.subtext, fontStyle: 'italic' }}>Sin alineación</span>}
        </div>
    </div>
);

const PostMatchDetailsView = ({ match = {}, referees = {}, homeLineup = [], awayLineup = [], themeMode = 'light' }) => {
    const isDark = themeMode === 'dark';
    const colors = {
        textStrong: isDark ? '#f8fafc' : '#1e293b',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? '#334155' : '#e2e8f0',
        cardBg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${colors.border}`, paddingBottom: '15px' }}>
                <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Reporte de Partido</h3>
                    <p style={{ fontSize: '12px', color: colors.subtext, margin: 0 }}>Detalle de incidencias y alineaciones</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: colors.subtext, textTransform: 'uppercase' }}>Árbitro Principal</span>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>⚖️ {referees.main || 'No asignado'}</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '30px', flexGrow: 1 }}>
                <LineupColumn teamName={match.homeTeam?.name} teamLogo={match.homeTeam?.logo} teamColor={match.homeTeam?.color} players={homeLineup} colors={colors} />
                <div style={{ width: '1px', background: colors.border }} />
                <LineupColumn teamName={match.awayTeam?.name} teamLogo={match.awayTeam?.logo} teamColor={match.awayTeam?.color} players={awayLineup} colors={colors} />
            </div>

            <div style={{ marginTop: 'auto', borderTop: `1px solid ${colors.border}`, paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.subtext }}>
                <span>ID: {match.id ? String(match.id).substring(0, 8) : '---'}</span>
                <span>Generado en Bracket App • {new Date().toLocaleDateString()}</span>
            </div>
        </div>
    );
};

export default PostMatchDetailsView;
