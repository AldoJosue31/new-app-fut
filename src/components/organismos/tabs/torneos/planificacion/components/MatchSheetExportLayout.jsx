import React, { forwardRef } from 'react';
import PostMatchDetailsView from './PostMatchDetailsView';
import { DynamicTeamLogo } from '../../../../equipos/DynamicTeamLogo'; 
import { useAuthStore } from '../../../../../../store/AuthStore';

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

const MatchSheetExportLayout = forwardRef(({ match, referees, homeLineup, awayLineup, matchEvents, themeMode = 'light' }, ref) => {
  const isDark = themeMode === 'dark';
  const { user } = useAuthStore();
  
  // LOGO DE LA LIGA (Cargado por el usuario)
  const leagueLogo = user?.logo_liga || user?.perfil?.logo_liga || null;
  
  const colors = {
      bg: isDark ? '#0f172a' : '#ffffff',
      text: isDark ? '#f1f5f9' : '#0f172a',
      secondaryBg: isDark ? '#1e293b' : '#f8fafc',
      border: isDark ? '#334155' : '#e2e8f0',
      badgeBg: 'rgba(255, 255, 255, 0.15)',
  };

  const homeScore = matchEvents?.goals?.filter(g => g.team === 'home').length || 0;
  const awayScore = matchEvents?.goals?.filter(g => g.team === 'away').length || 0;
  
  const containerStyle = {
      width: '1240px', 
      height: '800px', // Altura fija para evitar desbordes en exportación
      backgroundColor: colors.bg, 
      padding: '40px',
      boxSizing: 'border-box',
      display: 'flex',
      gap: '30px',
      fontFamily: '"Inter", sans-serif',
      color: colors.text, 
  };

  return (
    <div ref={ref} style={containerStyle}>
      <div style={{display: 'flex', gap: '30px', width: '100%', height: '100%'}}>

        {/* --- PANEL IZQUIERDO (MARCADOR) --- */}
        <div style={{width: '35%', display: 'flex', flexDirection: 'column'}}>
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
                padding: '40px 30px'
            }}>
                {/* Logo de la Liga */}
                {leagueLogo && (
                    <div style={{ position: 'absolute', top: '25px', left: '25px', width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '15px', backdropFilter: 'blur(5px)' }}>
                        <img src={leagueLogo} alt="Liga" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>{match.competitionName || 'Torneo'}</h2>
                    <p style={{ color: '#bfdbfe', fontSize: '14px', marginTop: '5px' }}>{formatDate(match.date)}</p>
                </div>

                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center', width: '40%' }}>
                            <div style={{ width: '90px', height: '90px', background: 'white', borderRadius: '50%', margin: '0 auto 15px', padding: '12px' }}>
                                {match.homeTeam?.logo ? <img src={match.homeTeam.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <DynamicTeamLogo name={match.homeTeam?.name} color={match.homeTeam?.color} size="100%" />}
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase' }}>{match.homeTeam?.name}</h3>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, opacity: 0.5 }}>VS</div>
                        <div style={{ textAlign: 'center', width: '40%' }}>
                            <div style={{ width: '90px', height: '90px', background: 'white', borderRadius: '50%', margin: '0 auto 15px', padding: '12px' }}>
                                {match.awayTeam?.logo ? <img src={match.awayTeam.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <DynamicTeamLogo name={match.awayTeam?.name} color={match.awayTeam?.color} size="100%" />}
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase' }}>{match.awayTeam?.name}</h3>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '20px', padding: '20px 40px', textAlign: 'center' }}>
                        <div style={{ fontSize: '72px', fontWeight: 900, lineHeight: 1 }}>{homeScore} - {awayScore}</div>
                        <div style={{ marginTop: '10px', fontSize: '16px', fontWeight: 700 }}>{formatTime(match.time || match.date)}</div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>📍 {match.stadium || 'Campo Principal'}</span>
                </div>
            </div>
        </div>

        {/* --- PANEL DERECHO (ESTADÍSTICAS) --- */}
        <div style={{
            width: '65%', 
            backgroundColor: colors.secondaryBg, 
            borderRadius: '30px', 
            padding: '35px', 
            border: `1px solid ${colors.border}`, 
            display: 'flex',
            flexDirection: 'column'
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
    </div>
  );
});

export default MatchSheetExportLayout;