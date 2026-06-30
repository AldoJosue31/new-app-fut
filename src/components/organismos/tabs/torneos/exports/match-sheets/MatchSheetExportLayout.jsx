import React, { forwardRef } from 'react';
import PostMatchDetailsView from './PostMatchDetailsView';
import { DynamicTeamLogo } from '../../../../equipos/DynamicTeamLogo'; 
import { useAuthStore } from '../../../../../../store/AuthStore';

const POST_EXPORT_SIZE = { width: 1080, height: 1350 };
const MOBILE_EXPORT_SIZE = { width: 480, height: 1180 };

// Helpers de formato idénticos a los originales
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString;
        const [year, month, day] = datePart.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch (e) { return dateString; }
};

const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    let timePart = timeString.includes('T') ? timeString.split('T')[1].substring(0, 5) : timeString.substring(0, 5);
    try {
        let [hours, minutes] = timePart.split(':');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
    } catch (e) { return timePart; }
};

const toScoreNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const MatchSheetExportLayout = forwardRef(({ match, referees, homeLineup, awayLineup, matchEvents, themeMode = 'light', layoutMode = 'desktop' }, ref) => {
  const isDark = themeMode === 'dark';
  const isMobile = layoutMode === 'mobile';
  const { user } = useAuthStore();
  
  const leagueLogo = user?.logo_liga || user?.perfil?.logo_liga || null;
  
  const colors = {
      bg: isDark ? '#0f172a' : '#ffffff',
      text: isDark ? '#f1f5f9' : '#0f172a',
      secondaryBg: isDark ? '#1e293b' : '#f8fafc',
      border: isDark ? '#334155' : '#e2e8f0',
  };

  const eventHomeScore = matchEvents?.goals?.filter(g => g.team === 'home').length || 0;
  const eventAwayScore = matchEvents?.goals?.filter(g => g.team === 'away').length || 0;
  const storedHomeScore = toScoreNumber(match?.goals1);
  const storedAwayScore = toScoreNumber(match?.goals2);
  const homeScore = storedHomeScore ?? eventHomeScore;
  const awayScore = storedAwayScore ?? eventAwayScore;
  
  const containerStyle = {
      width: `${isMobile ? MOBILE_EXPORT_SIZE.width : POST_EXPORT_SIZE.width}px`, 
      height: `${isMobile ? MOBILE_EXPORT_SIZE.height : POST_EXPORT_SIZE.height}px`, 
      backgroundColor: colors.bg, 
      padding: isMobile ? '20px' : '48px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '30px',
      fontFamily: '"Inter", sans-serif',
      color: colors.text, 
  };

  return (
    <div ref={ref} style={containerStyle}>
        {/* --- PANEL IZQUIERDO (MARCADOR ORIGINAL) --- */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: isMobile ? '0 0 auto' : '0 0 42%' }}>
            <div style={{
                background: 'linear-gradient(145deg, #1e40af, #3b82f6)',
                borderRadius: '30px',
                overflow: 'hidden', 
                color: 'white',
                flexGrow: 1, 
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                position: 'relative',
                padding: isMobile ? '30px 20px' : '42px 38px'
            }}>
                {/* Logo de la Liga */}
                {leagueLogo && (
                    <div style={{ position: 'absolute', top: '25px', left: '25px', width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '15px', backdropFilter: 'blur(5px)' }}>
                        <img src={leagueLogo} alt="Liga" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: isMobile ? '25px' : '34px' }}>
                    <h2 style={{ fontSize: isMobile ? '20px' : '34px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>{match.competitionName}</h2>
                    <p style={{ color: '#bfdbfe', fontSize: '14px', marginTop: '5px' }}>{formatDate(match.date)}</p>
                </div>

                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: isMobile ? '20px' : '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        {/* LOCAL */}
                        <div style={{ textAlign: 'center', width: '40%' }}>
                            <div style={{ width: isMobile ? '70px' : '112px', height: isMobile ? '70px' : '112px', background: 'white', borderRadius: '50%', margin: '0 auto 15px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {match.homeTeam?.logo ? <img src={match.homeTeam.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <DynamicTeamLogo name={match.homeTeam?.name} color={match.homeTeam?.color} size="100%" />}
                            </div>
                            <h3 style={{ fontSize: isMobile ? '0.9rem' : '1.3rem', fontWeight: 800, textTransform: 'uppercase' }}>{match.homeTeam?.name}</h3>
                        </div>

                        <div style={{ fontSize: isMobile ? '24px' : '34px', fontWeight: 900, opacity: 0.5 }}>VS</div>

                        {/* VISITANTE */}
                        <div style={{ textAlign: 'center', width: '40%' }}>
                            <div style={{ width: isMobile ? '70px' : '112px', height: isMobile ? '70px' : '112px', background: 'white', borderRadius: '50%', margin: '0 auto 15px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {match.awayTeam?.logo ? <img src={match.awayTeam.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <DynamicTeamLogo name={match.awayTeam?.name} color={match.awayTeam?.color} size="100%" />}
                            </div>
                            <h3 style={{ fontSize: isMobile ? '0.9rem' : '1.3rem', fontWeight: 800, textTransform: 'uppercase' }}>{match.awayTeam?.name}</h3>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '20px', padding: isMobile ? '15px 30px' : '24px 52px', textAlign: 'center' }}>
                        <div style={{ fontSize: isMobile ? '56px' : '86px', fontWeight: 900, lineHeight: 1 }}>{homeScore} - {awayScore}</div>
                        <div style={{ marginTop: '10px', fontSize: '16px', fontWeight: 700 }}>{formatTime(match.time || match.date)}</div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>📍 {match.stadium}</span>
                </div>
            </div>
        </div>

        {/* --- PANEL DERECHO (ESTADÍSTICAS) --- */}
        <div style={{
            width: '100%', 
            backgroundColor: colors.secondaryBg, 
            borderRadius: '30px', 
            padding: isMobile ? '20px' : '36px', 
            border: `1px solid ${colors.border}`, 
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
        }}>
            <PostMatchDetailsView
                match={match}
                referees={referees}
                homeLineup={homeLineup}
                awayLineup={awayLineup}
                themeMode={themeMode} 
            />
        </div>
    </div>
  );
});

export default MatchSheetExportLayout;
