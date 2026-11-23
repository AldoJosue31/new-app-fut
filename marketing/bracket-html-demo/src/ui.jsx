import React from 'react';
import { RiCalendarEventLine, RiBarChartGroupedLine, RiFootballLine, RiVipCrownFill, RiTrophyFill,
  RiTeamFill, RiSettings3Line, RiArrowRightSLine, RiArrowLeftSLine, RiArrowDownSLine,
  RiListUnordered, RiGridLine, RiTimeLine, RiPrinterLine, RiEditLine, RiTrophyLine,
  RiCheckDoubleLine, RiCloseLine, RiImageAddLine, RiScan2Line, RiFileList3Line, RiMagicLine,
  RiDeleteBinLine, RiUserStarFill, RiUserAddLine, RiErrorWarningLine, RiImageLine,
  RiPaletteLine, RiEqualizerLine, RiFileDownloadLine, RiArrowGoBackLine, RiLogoutBoxRLine,
  RiMoonLine, RiLoader4Line } from 'react-icons/ri';
import { DynamicTeamLogo } from './TeamLogo';
import { TbSoccerField } from 'react-icons/tb';
import { teams, players, snapshot } from './data.mjs';

export const icons = { RiCalendarEventLine, RiBarChartGroupedLine, RiFootballLine, RiCheckDoubleLine, RiLoader4Line };
export function Logo({ team, size = 32 }) {
  return <span className="br-logo" style={{ width: size, height: size }}><DynamicTeamLogo name={team.name || team.nombre} color={team.color} size="100%" /></span>;
}
export function Button({ children, primary, className = '', aim, pressed, style }) {
  return <span data-aim={aim} className={`br-button ${primary ? 'br-primary' : ''} ${pressed ? 'br-pressed' : ''} ${className}`} style={style}>{children}</span>;
}
export function Toast({ t, from, to, message }) {
  if (t < from || t >= to) return null;
  return <div className="br-toast"><strong><RiCheckDoubleLine />Listo</strong><span>{message}</span></div>;
}
export function AppShell({ children, tab = 'jornadas' }) {
  return <div className="br-app">
    <aside className="br-sidebar">
      <img src="/logo_app.png" alt="" width="49" height="49" />
      <span className="br-expand"><RiArrowRightSLine /></span>
      <div className="br-navicons"><span><TbSoccerField /></span><span><RiTeamFill /></span><span className="br-navactive"><RiTrophyFill /></span><span><RiBarChartGroupedLine /></span></div>
      <div className="br-secondary"><RiSettings3Line /></div>
      <div className="br-user"><RiMoonLine /><RiLogoutBoxRLine /><span>D</span></div>
    </aside>
    <main className="br-main">
      <h2>Torneos</h2>
      <div className="br-tabs">
        {[[RiVipCrownFill, 'Torneo', 'torneo'], [RiCalendarEventLine, 'Jornadas', 'jornadas'], [RiBarChartGroupedLine, 'Clasificacion', 'standings'], [RiFootballLine, 'Goleadores', 'goleadores']].map(([Icon, label, id]) => <span key={id} data-aim={`tab-${id}`} className={tab === id ? 'br-selected' : ''}><Icon />{label}</span>)}
      </div>
      {children}
    </main>
  </div>;
}
export function Planning({ grid = false, saved = false, t = 0, press }) {
  return <AppShell>
    <div className="br-planninghead">
      <span className="br-circle br-muted"><RiArrowLeftSLine /></span>
      <div className="br-round"><strong>Jornada 2 <RiArrowDownSLine /></strong><span>CONFIRMADA<br />({saved ? 2 : 1}/2)</span></div>
      <span className="br-circle br-muted"><RiArrowRightSLine /></span>
      <div className="br-week">Semana del <b>02/11/2026 <RiCalendarEventLine /></b> al <b>08/11/2026</b></div>
      <div className="br-planningactions"><Button className="br-soft"><RiTimeLine />Pendientes 0</Button><Button className="br-soft br-square"><RiPrinterLine /></Button><Button className="br-soft br-square"><RiEditLine /></Button><Button className="br-soft br-square"><RiSettings3Line /></Button><div className="br-toggle"><span data-aim="list" className={!grid ? 'br-toggleon' : ''}><RiListUnordered /></span><span data-aim="grid" className={grid ? 'br-toggleon' : ''}><RiGridLine /></span></div></div>
    </div>
    {grid ? <WeeklyGrid saved={saved} /> : <div className="br-planbody">
      <div className="br-unassigned"><strong>Por Asignar (0)</strong><p>Todo asignado</p></div>
      <div className="br-scheduled">
        <DateDivider>Lunes 02/11/26</DateDivider>
        <MatchRow team1={teams[2]} team2={teams[3]} time="12:00 PM" score="1 - 1" />
        <DateDivider>Domingo 08/11/26</DateDivider>
        <MatchRow team1={teams[0]} team2={teams[1]} time="10:00 AM" score={saved ? '1 - 0' : null} target press={press} />
      </div>
    </div>}
    <div className="br-bottomaction"><Button className="br-orange"><RiArrowGoBackLine />Deshacer confirmacion</Button></div>
  </AppShell>;
}
function DateDivider({ children }) { return <div className="br-datedivider"><strong>{children}</strong><i /></div>; }
function MatchRow({ team1, team2, score, time, target, press }) {
  return <div className="br-matchrow"><div className="br-pair"><span>{team1.name}</span>{score && <b className="br-scorepill">{score.split(' - ')[0]}</b>}<b className="br-vs">VS</b>{score && <b className="br-scorepill">{score.split(' - ')[1]}</b>}<span>{team2.name}</span></div><strong className="br-kickoff">{time}</strong><div className="br-rowactions"><Button aim={target ? 'result' : undefined} primary pressed={press}>{score ? <RiEditLine /> : <RiTrophyLine />}{score ? 'Editar' : 'Resultado'}</Button><Button className="br-gray">{score ? <RiFileList3Line /> : <RiPrinterLine />}{score ? 'Ver Cédula' : 'Pre-Cédula'}</Button><Button className={score ? 'br-undo' : 'br-yellow'}>{score ? <RiArrowGoBackLine /> : <RiTimeLine />}{score ? 'Deshacer' : 'Aplazar'}</Button></div></div>;
}
function WeeklyGrid({ saved }) {
  return <><div className="br-gridtoolbar"><Button className="br-soft"><RiCalendarEventLine />Ocultar partidos de otras divisiones</Button><Button><RiImageLine />Exportar rol</Button><em>Mostrando ocupación de canchas de TODAS las divisiones.</em></div><div className="br-gridlegend"><i />Primera</div><div className="br-weekgrid">
    {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((day, i) => <div key={day} className="br-day"><div className="br-daytitle"><strong>{day} {String(i + 2).padStart(2, '0')}</strong></div>{(i === 0 || i === 6) ? <div className="br-gridmatch"><header><b>{i === 0 ? '12:00 PM' : '10:00 AM'}</b><span>PRIMERA</span></header><div><span>{i === 0 ? 'Tigres' : 'Halcones'}</span><b>{i === 0 ? 1 : saved ? 1 : '–'}</b><span>{i === 0 ? 'Lobos' : 'Leones'}</span><b>{i === 0 ? 1 : saved ? 0 : '–'}</b></div></div> : <span className="br-free">Libre</span>}</div>)}
  </div></>;
}
export function ResultModal({ tab = 'general', filledLocal = false, filledVisit = false, goal = '0', focusGoal = false, loading = '', confirm = false, saving = false, t = 0, pressed = '', reveal = 1 }) {
  const team = tab === 'visit' ? teams[1] : teams[0];
  const filled = tab === 'visit' ? filledVisit : filledLocal;
  return <div className="br-overlay" style={{ opacity: reveal }}><div className="br-resultmodal" style={{ transform: `translateY(${(1 - reveal) * 10}px)` }}>
    <div className="br-modalheader"><strong>Definir Resultado</strong><div><Button><RiImageAddLine />Cargar cédula</Button><Button><RiScan2Line />Escanear cédula</Button><RiCloseLine /></div></div>
    <div className="br-resultbody">
      <div className="br-scoreheader"><div><Logo team={teams[0]} size={45} /><span>Halcones</span></div><div className="br-scorecenter"><b>PRIMERA</b><strong>{goal || '0'} <i>-</i> 0</strong><small>2026-11-08 - 10:00 AM</small></div><div><span>Leones</span><Logo team={teams[1]} size={45} /></div></div>
      {loading || saving ? <div className="br-loading"><RiLoader4Line style={{ transform: `rotate(${t * 360}deg)` }} />{saving ? 'Guardando resultado...' : loading}</div> : <>
        <div className="br-resulttabs">{[[RiFileList3Line, 'General', 'general'], [RiFootballLine, 'Halcones', 'local'], [RiFootballLine, 'Leones', 'visit']].map(([Icon, name, id]) => <span data-aim={`result-${id}`} key={id} className={tab === id ? 'br-selected' : ''}><Icon />{name}</span>)}</div>
        {tab === 'general' ? <General /> : <div className="br-roster">
          <div className="br-rosterhead"><div><strong>{team.name}</strong><b><RiUserStarFill />Titulares (Minimo 7)</b><small>Completa espacios vacios usando a los jugadores con mas asistencias a partidos.</small></div><div><Button aim="autofill" className={`br-soft ${filled ? 'br-disabled' : ''}`} pressed={pressed === 'autofill'}><RiMagicLine />Auto-rellenar titulares</Button><Button className="br-gray"><RiDeleteBinLine />Limpiar todos</Button></div></div>
          <div className="br-rosterlabels"><span>Jugador</span><span>Goles / AG / Tarjetas</span></div>
          {players.filter(p => p.team_id === team.id).map((p, i) => <div className="br-player" key={p.id}>
            <div className={filled ? 'br-playername br-playerfilled' : 'br-playername'}><span>{filled ? `${p.first_name} ${p.last_name} (${p.dorsal})` : 'Seleccionar jugador...'}</span>{filled && <RiCloseLine />}</div>
            <div className="br-playerstats"><span className="br-statchip">G</span><span className={`br-number ${focusGoal && i === 0 ? 'br-numberfocus' : ''}`} data-aim={i === 0 && tab === 'local' ? 'goal' : undefined}><span>{i === 0 && tab === 'local' ? goal : 0}{focusGoal && i === 0 && <i className="br-caret" />}</span><b><RiArrowLeftSLine /><RiArrowRightSLine /></b></span><span className="br-ag">AG</span><span className="br-card br-cardyellow">TA</span><span className="br-card br-cardred">TR</span></div>
          </div>)}
          <div className="br-substitutes"><RiUserAddLine />Suplentes</div>
          <div className="br-player"><div className="br-playername">Seleccionar jugador...</div><div className="br-playerstats"><span className="br-statchip">G</span><span className="br-number">0</span><span className="br-ag">AG</span><span className="br-card br-cardyellow">TA</span><span className="br-card br-cardred">TR</span></div></div>
        </div>}
      </>}
    </div>
    <footer className="br-modalfooter"><Button className="br-gray">Cancelar</Button><Button aim="save" primary pressed={pressed === 'save'}>{loading || saving ? <><RiLoader4Line style={{ transform: `rotate(${t * 360}deg)` }} />Guardando...</> : <><RiCheckDoubleLine />Guardar Marcador</>}</Button></footer>
    {confirm && <div className="br-confirmoverlay"><div className="br-confirmcard"><RiCheckDoubleLine size={50} color="#1cb0f6" /><h2>¿Confirmar Marcador?</h2><div className="br-confirmteams">{teams.slice(0, 2).map((team, i) => <React.Fragment key={team.id}>{i === 1 && <b>VS</b>}<div><Logo team={team} size={50} /><span>{team.name}</span><strong>{i === 0 ? 1 : 0}</strong></div></React.Fragment>)}</div><div className="br-confirmdate">2026-11-08 10:00</div><div className="br-warning"><RiErrorWarningLine /><span><strong>No se asignó un árbitro.</strong>Puedes guardar así o volver a General para asignarlo.</span></div><div className="br-confirmbuttons"><Button className="br-gray">Revisar</Button><Button aim="confirm" primary pressed={pressed === 'confirm'}>{saving ? <><RiLoader4Line style={{ transform: `rotate(${t * 360}deg)` }} />Guardando...</> : 'Sí, guardar'}</Button></div></div></div>}
  </div></div>;
}
function General() {
  return <div className="br-general"><div className="br-wo"><RiErrorWarningLine />Victoria por Default (W.O.)</div><div className="br-inputgrid"><div><label><RiUserStarFill />Árbitro Principal (Opcional)</label><span>Sin árbitro asignado<RiArrowDownSLine /></span></div><div><label><RiCalendarEventLine />Fecha *</label><span>08/11/2026<RiCalendarEventLine /></span></div><div><label><RiTimeLine />Hora *</label><span>10:00 a. m.<RiTimeLine /></span></div></div><label className="br-noteslabel"><RiFileList3Line />Observaciones Adicionales (Opcional)</label><div className="br-notes">Ingrese incidentes, retrasos, estado de cancha u otros detalles...</div><small className="br-count">0/500</small></div>;
}
export function Standings({ skeleton = false }) {
  return <AppShell tab="standings"><div className="br-standingscontrols"><Button className="br-selector">Vista Actual (J. 2)<RiArrowDownSLine /></Button><div><Button aim="export" className="br-soft"><RiImageLine />Exportar</Button><Button className="br-private"><span><i /></span>Privado</Button></div></div>
    <div className="br-tablecard"><table className="br-table"><thead><tr>{['Equipo', 'PJ', 'DIF', 'Pnd', 'PTS', 'G', 'E', 'P', 'GF', 'GC'].map(x => <th key={x}>{x}</th>)}</tr></thead><tbody>{snapshot.tablaGeneral.map((row, i) => <tr key={row.id} data-team={row.id}>{skeleton ? <td colSpan={10}><span className="br-skeleton" /></td> : <><td><div className="br-teamcell"><b>{i + 1}</b><span className="br-trend">–</span><Logo team={row} size={28} /><strong>{row.nombre}</strong></div></td>{[row.pj, row.dg > 0 ? `+${row.dg}` : row.dg, row.partidosPendientes, row.pts, row.g, row.e, row.p, row.gf, row.gc].map((value, j) => <td key={j} className={j === 3 ? 'br-points' : j === 1 ? row.dg >= 0 ? 'br-positive' : 'br-negative' : ''}>{value}</td>)}</>}</tr>)}</tbody></table></div>
    <p className="br-tablehelp"><RiErrorWarningLine />Criterios de desempate: 1° Puntos ➔ 2° Diferencia de goles (DIF) ➔ 3° Goles a favor (GF) ➔ 4° Menos partidos jugados (PJ)</p>
  </AppShell>;
}
export function ExportModal({ loading, t, reveal = 1 }) {
  return <div className="br-overlay" style={{ opacity: reveal }}><div className="br-exportmodal"><header className="br-modalheader"><strong>Exportar Tabla General</strong><RiCloseLine /></header><div className="br-exportbody">{loading ? <div className="br-loading"><RiLoader4Line style={{ transform: `rotate(${t * 360}deg)` }} />Cargando datos...</div> : <><div className="br-exporttop"><span>Jornada a exportar</span><Button className="br-selector">Vista Actual (J. 2)<RiArrowDownSLine /></Button><Button className="br-soft br-exportsettings"><RiSettings3Line /></Button></div><div className="br-designcontrols"><Button className="br-designselected"><RiPaletteLine />Combinaciones</Button><Button><RiEqualizerLine />Personalizar</Button><Button className="br-disabled"><i />Colores de la liga <small>No</small></Button></div><div className="br-carousel"><div className="br-exportghost br-ghostleft"><ExportPoster /></div><div className="br-exportghost br-ghostright"><ExportPoster /></div><span className="br-carouselarrow"><RiArrowLeftSLine /></span><div className="br-exportposter"><ExportPoster /></div><span className="br-carouselarrow br-carouselnext"><RiArrowRightSLine /></span></div><div className="br-preset"><strong>Clásica <small>1 / 6</small></strong><span>Una combinación limpia que da prioridad a los resultados.</span><small>Clásica + Liso</small></div></>}</div><footer className="br-modalfooter"><Button>Cancelar</Button><Button className="br-download"><RiFileDownloadLine />Descargar</Button></footer></div></div>;
}
// Pure HTML reconstruction of the real classic/solid Post export (1080 × 1350).
// Sizing, column order and wording: StandingsExportLayout.jsx; values: real snapshot.
function ExportPoster() {
  return <div className="br-poster"><header><span>LIGA DEMO</span><h3>TABLA GENERAL</h3><strong>Primera</strong><p>Clasificación Oficial • Hasta la Jornada 2 (Completada)</p></header><table><thead><tr>{['EQUIPO', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DIF', 'Pnd', 'PTS'].map(x => <th key={x}>{x}</th>)}</tr></thead><tbody>{snapshot.tablaGeneral.map((row, i) => <tr key={row.id}><td><div><b>{i + 1}</b><span>–</span><Logo team={row} size={45} /><strong>{row.nombre}</strong></div></td>{[row.pj, row.g, row.e, row.p, row.gf, row.gc, row.dg > 0 ? `+${row.dg}` : row.dg, row.partidosPendientes, row.pts].map((n, j) => <td key={j}>{n}</td>)}</tr>)}</tbody></table><footer>Generado el 8/11/2026</footer></div>;
}
