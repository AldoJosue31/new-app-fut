import React, { forwardRef } from 'react';
import PostMatchDetailsView from './PostMatchDetailsView';
import { DynamicTeamLogo } from '../../../../equipos/DynamicTeamLogo'; 

const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString;
        const [year, month, day] = datePart.split('-').map(Number);
        if (!year || !month || !day) return dateString;
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return dateString; }
};

const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    let timePart = '';
    if (timeString.includes('T')) {
        timePart = timeString.split('T')[1].substring(0, 5);
    } else if (timeString.includes(':')) {
        timePart = timeString.substring(0, 5);
    } else {
        return timeString;
    }
    try {
        const [hoursStr, minutesStr] = timePart.split(':');
        let hours = parseInt(hoursStr, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        return `${hours}:${minutesStr} ${ampm}`;
    } catch (e) {
        return timePart; 
    }
};

const MatchSheetExportLayout = forwardRef(({ match, referees, homeLineup, awayLineup, matchEvents, themeMode = 'light' }, ref) => {
  const isDark = themeMode === 'dark';
  
  const colors = {
      bg: isDark ? '#121212' : '#ffffff',
      text: isDark ? '#f1f5f9' : '#0f172a',
      secondaryBg: isDark ? '#1e1e1e' : '#f8fafc',
      border: isDark ? '#333333' : '#e2e8f0',
      badgeBg: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
  };

  const homeScore = matchEvents.goals.filter(g => g.team === 'home').length;
  const awayScore = matchEvents.goals.filter(g => g.team === 'away').length;
  const matchStatusLabel = match.status === 'completed' ? 'Finalizado' : (match.status === 'in_progress' ? 'En Juego' : 'Programado');
  
  const containerStyle = {
      width: '1240px', 
      minHeight: '800px', 
      backgroundColor: colors.bg, 
      padding: '40px',
      boxSizing: 'border-box',
      display: 'flex',
      gap: '30px',
      fontFamily: 'Arial, sans-serif',
      color: colors.text, 
      position: 'relative' 
  };

  const teamNameStyle = {
      fontWeight: 700, 
      fontSize: '1.3rem', 
      textAlign: 'center', 
      lineHeight: 1.3, 
      margin: 0, 
      wordBreak: 'break-word', 
      width: '100%',
      display: 'block',     
      minHeight: '1.6em'
  };

  return (
    <div ref={ref} style={containerStyle}>
      <div style={{display: 'flex', gap: '30px', alignItems: 'stretch', justifyContent: 'center', width: '100%'}}>

        {/* --- COLUMNA IZQUIERDA (35%) --- */}
        <div style={{width: '35%', display: 'flex', flexDirection: 'column'}}>
            <div style={{
                background: 'linear-gradient(145deg, #1e40af, #3b82f6)',
                borderRadius: '24px',
                overflow: 'hidden', 
                color: 'white',
                position: 'relative',
                flexGrow: 1, 
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                minHeight: '600px'
            }}>
                <div style={{position: 'absolute', top:0, left:0, right:0, bottom:0, background:'radial-gradient(circle at top right, rgba(255,255,255,0.1) 0%, transparent 60%)', pointerEvents:'none'}}></div>
                
                <div style={{position: 'relative', zIndex: 10, padding: '40px 30px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between'}}>
                    
                    {/* Header */}
                    <div style={{textAlign: 'center'}}>
                        <h2 style={{fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', margin: 0, lineHeight: 1.2}}>
                            {match.competitionName || 'Torneo'}
                        </h2>
                        <p style={{color: '#bfdbfe', fontSize: '15px', marginTop: '8px', textTransform: 'capitalize', fontWeight: 500}}>
                            {formatDate(match.date)}
                        </p>
                        
                        <div style={{marginTop: '20px', display: 'flex', justifyContent: 'center'}}>
                             <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px 24px',
                                backgroundColor: colors.badgeBg, 
                                borderRadius: '50px',
                                border: '1px solid rgba(255,255,255,0.3)',
                                backdropFilter: 'blur(4px)'
                             }}>
                                <span style={{fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: '#ffffff', lineHeight: 1}}>
                                    {matchStatusLabel}
                                </span>
                             </div>
                        </div>
                    </div>

                    {/* Score Board */}
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', flexGrow: 1, justifyContent: 'center', padding: '20px 0'}}>
                        <div style={{display:'flex', justifyContent:'space-between', width:'100%', alignItems:'flex-start'}}>
                             
                             {/* Local */}
                             <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'45%'}}>
                                <div style={{width:'100px', height:'100px', background:'white', borderRadius:'50%', padding:'15px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'15px', boxShadow:'0 10px 15px rgba(0,0,0,0.1)'}}>
                                    {match.homeTeam?.logo ? (
                                        <img src={match.homeTeam.logo} alt="" style={{width:'100%', height:'100%', objectFit:'contain'}} />
                                    ) : (
                                        <DynamicTeamLogo name={match.homeTeam?.name || 'Local'} color={match.homeTeam?.color || '#000000'} size="100%" />
                                    )}
                                </div>
                                <h3 style={teamNameStyle}>{match.homeTeam?.name || 'Local'}</h3>
                             </div>
                             
                             <div style={{marginTop:'35px', fontWeight:900, fontSize:'24px', color:'rgba(255,255,255,0.5)'}}>VS</div>
                             
                             {/* Visita */}
                             <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'45%'}}>
                                <div style={{width:'100px', height:'100px', background:'white', borderRadius:'50%', padding:'15px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'15px', boxShadow:'0 10px 15px rgba(0,0,0,0.1)'}}>
                                    {match.awayTeam?.logo ? (
                                        <img src={match.awayTeam.logo} alt="" style={{width:'100%', height:'100%', objectFit:'contain'}} />
                                    ) : (
                                        <DynamicTeamLogo name={match.awayTeam?.name || 'Visita'} color={match.awayTeam?.color || '#000000'} size="100%" />
                                    )}
                                </div>
                                <h3 style={teamNameStyle}>{match.awayTeam?.name || 'Visita'}</h3>
                             </div>
                        </div>

                        <div style={{background:'rgba(0,0,0,0.2)', borderRadius:'16px', padding:'15px 30px', display:'flex', flexDirection:'column', alignItems:'center', marginTop:'15px'}}>
                            <div style={{fontSize:'64px', fontWeight:900, lineHeight:1, display:'flex', gap:'15px'}}>
                                <span>{homeScore}</span>
                                <span style={{opacity:0.5}}>-</span>
                                <span>{awayScore}</span>
                            </div>
                            <div style={{marginTop:'8px', fontSize:'16px', fontWeight:600, opacity:0.9}}>
                                {formatTime(match.time || match.date)}
                            </div>
                        </div>
                    </div>

                    <div style={{textAlign: 'center', paddingTop: '20px', borderTop:'1px solid rgba(255,255,255,0.1)'}}>
                        <div style={{fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: 0.9}}>
                            <span>📍</span>
                            <span style={{fontWeight: 600}}>{match.stadium || 'Campo Principal'}</span>
                        </div>
                     </div>
                </div>
            </div>
        </div>

        {/* --- COLUMNA DERECHA (65%) --- */}
        <div style={{
            width: '65%', 
            backgroundColor: colors.secondaryBg, 
            borderRadius: '24px', 
            padding: '35px', 
            border: `1px solid ${colors.border}`, 
            display: 'flex',
            flexDirection: 'column',
            height: 'auto' 
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