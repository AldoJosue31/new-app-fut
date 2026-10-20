import React, { useId, useRef, useState } from "react";
import styled from "styled-components";
import { RiArrowDownSLine, RiArrowLeftSLine, RiArrowRightSLine, RiArrowUpDownLine, RiBarChartGroupedLine, RiCalendarEventLine, RiInformationLine, RiRefreshLine, RiTrophyLine } from "react-icons/ri";
import { formatForecastPercent } from "../../../utils/forecastPresentation.js";
import { Skeleton } from "../../atomos/Skeleton";
import { TeamLogo } from "../teamDetailModal/TeamLogo";

const dateLabel = (date) => date && Number.isFinite(Date.parse(date)) ? new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(date)) : "Fecha por confirmar";
const phaseLabel = (match) => match.stageName || `Jornada ${match.round}`;
const classificationIds = new Set(["direct", "repechage", "qualified"]);

export function DelegateForecastView({ loading = false, forecast, error, teamName, team, onRefresh }) {
  return <Section aria-label="Análisis y probabilidades" aria-busy={loading}>
    <Header><TitleRow><RiBarChartGroupedLine aria-hidden="true" /><div><h3>Análisis y probabilidades</h3><p>Tu próximo rival y el camino de tu equipo en el torneo.</p></div></TitleRow><Refresh type="button" onClick={onRefresh} disabled={loading} aria-label="Actualizar probabilidades" title="Actualizar probabilidades"><RiRefreshLine aria-hidden="true" /><span>Actualizar</span></Refresh></Header>
    {loading ? <Loading role="status" aria-label="Calculando probabilidades"><Skeleton width="220px" height="40px" radius="12px" /><Skeleton width="100%" height="180px" radius="12px" /><Skeleton width="75%" height="20px" /></Loading> : error ? <StateMessage role="alert"><RiInformationLine aria-hidden="true" /><div><h4>No pudimos cargar el análisis</h4><p>{error} Usa «Actualizar» para reintentar.</p></div></StateMessage> : !forecast?.available ? <StateMessage><RiBarChartGroupedLine aria-hidden="true" /><div><h4>El análisis se prepara con tus resultados</h4><p>{forecast?.reason || "Aún no hay datos suficientes para el análisis."}</p></div></StateMessage> : <ForecastContent key={team?.id || teamName} forecast={forecast} teamName={teamName} team={team || { name: teamName }} />}
  </Section>;
}

function ForecastContent({ forecast, teamName, team }) {
  const [activeTab, setActiveTab] = useState("rival");
  const [selectedId, setSelectedId] = useState("");
  const [contextExpanded, setContextExpanded] = useState(false);
  const tabRefs = useRef([]);
  const id = useId();
  const selectedIndex = Math.max(0, forecast.upcoming.findIndex((match) => String(match.matchId) === selectedId));
  const selected = forecast.upcoming[selectedIndex];
  const tabs = [{ id: "rival", label: "Próximo rival", icon: RiCalendarEventLine }, { id: "season", label: "Temporada", icon: RiTrophyLine }];
  const selectTabByKey = (event, index) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault(); setActiveTab(tabs[next].id); tabRefs.current[next]?.focus();
  };
  return <>
    <Navigation role="tablist" aria-label="Vista del análisis">{tabs.map((tab, index) => { const Icon = tab.icon; return <Tab key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" id={`${id}-${tab.id}-tab`} aria-controls={`${id}-${tab.id}-panel`} aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} onKeyDown={(event) => selectTabByKey(event, index)} onClick={() => setActiveTab(tab.id)}><Icon aria-hidden="true" />{tab.label}</Tab>; })}</Navigation>
    <Panel role="tabpanel" id={`${id}-rival-panel`} aria-labelledby={`${id}-rival-tab`} hidden={activeTab !== "rival"} tabIndex={0}>
      {!selected ? <StateMessage><RiCalendarEventLine aria-hidden="true" /><div><h4>Sin próximos rivales programados</h4><p>Consulta «Temporada» para ver la proyección disponible de tu equipo.</p></div></StateMessage> : <>
        <FixtureNavigation><div><h4>{selectedIndex === 0 ? "Tu próximo enfrentamiento" : "Enfrentamiento seleccionado"}</h4><Small>{forecast.upcoming.length} partido{forecast.upcoming.length === 1 ? "" : "s"} pendiente{forecast.upcoming.length === 1 ? "" : "s"} de tu equipo</Small></div><MatchPicker><label className="sr-only" htmlFor={`${id}-match`}>Partido a analizar</label><select id={`${id}-match`} value={String(selected.matchId)} onChange={(event) => setSelectedId(event.target.value)}>{forecast.upcoming.map((match) => <option key={match.matchId} value={String(match.matchId)}>{phaseLabel(match)} · {match.rival.name}</option>)}</select>{forecast.upcoming.length > 1 && <MatchArrows><IconButton type="button" aria-label="Rival anterior" disabled={selectedIndex === 0} onClick={() => setSelectedId(String(forecast.upcoming[selectedIndex - 1].matchId))}><RiArrowLeftSLine aria-hidden="true" /></IconButton><IconButton type="button" aria-label="Siguiente rival" disabled={selectedIndex === forecast.upcoming.length - 1} onClick={() => setSelectedId(String(forecast.upcoming[selectedIndex + 1].matchId))}><RiArrowRightSLine aria-hidden="true" /></IconButton></MatchArrows>}</MatchPicker></FixtureNavigation>
        <MatchWorkspace>
          <MatchAnalysis aria-label={`Pronóstico: ${teamName} vs. ${selected.rival.name}`}>
            <FixtureDate><RiCalendarEventLine aria-hidden="true" />{phaseLabel(selected)}<span>{dateLabel(selected.date)}</span></FixtureDate>
            <MatchIdentity><TeamIdentity><Logo><TeamLogo club={team} size="64px" /></Logo><strong>{teamName}</strong><span>Tu equipo</span></TeamIdentity><Versus aria-hidden="true">vs.</Versus><TeamIdentity><Logo><TeamLogo club={selected.rival} size="64px" /></Logo><strong>{selected.rival.name}</strong><span>Rival</span></TeamIdentity></MatchIdentity>
            <MatchVerdict>{selected.probabilities.draw > Math.max(selected.probabilities.win, selected.probabilities.lose) ? "El empate es el resultado más probable" : selected.probabilities.win === selected.probabilities.lose ? "Se perfila un partido parejo" : selected.probabilities.win > selected.probabilities.lose ? "Tu equipo parte con ventaja" : "El rival parte con ventaja"}</MatchVerdict>
            <Probabilities aria-label="Probabilidades del partido en tiempo reglamentario">{[{ id: "win", label: "Ganar" }, { id: "draw", label: "Empatar" }, { id: "lose", label: "Perder" }].map((outcome) => <div key={outcome.id}><span><i className={outcome.id} />{outcome.label}</span><strong>{formatForecastPercent(selected.probabilities[outcome.id])}</strong></div>)}</Probabilities>
            <ProbabilityBar aria-hidden="true"><span className="win" style={{ flex: selected.probabilities.win }} /><span className="draw" style={{ flex: selected.probabilities.draw }} /><span className="lose" style={{ flex: selected.probabilities.lose }} /></ProbabilityBar>
            <GoalEstimate><div><span>Goles estimados</span><strong>{selected.estimatedGoals[0]} <span>–</span> {selected.estimatedGoals[1]}</strong></div><span>Tiempo reglamentario</span></GoalEstimate>
          </MatchAnalysis>
          <RivalContext aria-label="Rendimiento de los equipos"><ContextHeading><ContextTitle><h4>El rival, en contexto</h4><ContextToggle type="button" aria-label="Mostrar datos del rival" aria-expanded={contextExpanded} aria-controls={`${id}-rival-data`} onClick={() => setContextExpanded((value) => !value)}>{contextExpanded ? "Ocultar" : "Ver datos"}<RiArrowDownSLine aria-hidden="true" /></ContextToggle></ContextTitle><Difficulty><span>Dificultad <strong>{selected.difficulty.toLowerCase()}</strong></span><span className="difficulty-level" aria-hidden="true">{[0, 1, 2, 3].map((step) => <i key={step} data-active={step <= ["Baja", "Media", "Alta", "Muy alta"].indexOf(selected.difficulty)} />)}</span></Difficulty></ContextHeading><ContextData id={`${id}-rival-data`} data-expanded={contextExpanded}><QuickComparison><thead><tr><th scope="col">Rendimiento</th><th scope="col">Tu equipo</th><th scope="col">Rival</th></tr></thead><tbody><tr><th scope="row">Posición actual</th><td>{selected.own.position}°</td><td>{selected.opponent.position}°</td></tr><tr><th scope="row">Puntos / partido</th><td>{selected.own.pointsPerGame}</td><td>{selected.opponent.pointsPerGame}</td></tr><tr><th scope="row">Goles a favor / partido</th><td>{selected.own.goalsForPerGame}</td><td>{selected.opponent.goalsForPerGame}</td></tr><tr><th scope="row">Goles recibidos / partido</th><td>{selected.own.goalsAgainstPerGame}</td><td>{selected.opponent.goalsAgainstPerGame}</td></tr></tbody></QuickComparison><FormHeading>Forma reciente</FormHeading><FormRow><span>Tu equipo</span><FormResults results={selected.own.form} /></FormRow><FormRow><span>Rival</span><FormResults results={selected.opponent.form} /></FormRow><Small>Del más antiguo al más reciente. G: ganado, E: empatado, P: perdido.</Small></ContextData></RivalContext>
        </MatchWorkspace>
        <SampleNotice><RiInformationLine aria-hidden="true" /><p><strong>{selected.limitedData ? "Estimación inicial" : "Datos del pronóstico"}</strong>{selected.limitedData ? " · Hay pocos datos para este enfrentamiento." : " · Basada en los resultados registrados."}<span>Partidos analizados: tu equipo {selected.own.analyzed}, rival {selected.opponent.analyzed}.</span></p></SampleNotice>
        <MatchDetails key={selected.matchId} selected={selected} />
      </>}
    </Panel>
    <Panel role="tabpanel" id={`${id}-season-panel`} aria-labelledby={`${id}-season-tab`} hidden={activeTab !== "season"} tabIndex={0}><SeasonProjection season={forecast.season} /></Panel>
    <Method><summary><span><RiInformationLine aria-hidden="true" />Cómo se calcula</span><RiArrowDownSLine aria-hidden="true" /></summary><MethodBody><p>Estimamos los goles con un modelo Poisson de ataque y defensa ajustado por los rivales enfrentados. Los resultados recientes pesan más: su peso se reduce a la mitad cada seis jornadas, usando sus fechas cuando están disponibles. Con pocos encuentros, usamos una referencia de seis partidos al promedio del torneo para moderar cambios extremos. La dificultad compara las posibilidades de ganar y perder.</p><p>Los rivales comunes aportan un ajuste pequeño. La localía es neutral. Para la tabla conservamos los puntos oficiales y las reposiciones; en las simulaciones aplicamos puntos, diferencia de goles, goles a favor y menos partidos jugados. Si hay penales, cada equipo tiene un 50 % de probabilidad de obtener el punto extra; en repechaje se respetan las vueltas y el desempate configurados.</p><p>{forecast.excludedWalkovers > 0 ? `${forecast.excludedWalkovers} resultado(s) por default cuentan en la tabla, pero se excluyen del modelo deportivo. ` : ""}Los partidos sin fecha van al inicio por jornada oficial en los historiales. Las estimaciones todavía no tienen calibración externa. {forecast.validation.matches > 0 ? `Evaluación retrospectiva interna sobre ${forecast.validation.matches} partidos, usando solo resultados de fechas anteriores a cada encuentro.` : "Todavía no hay historial suficiente para una evaluación retrospectiva."} Un porcentaje cercano a 0 o 100 no demuestra eliminación o clasificación matemática.</p></MethodBody></Method>
    <DataNote><span>{forecast.analyzedMatches} partidos del torneo analizados</span><span>Actualizado {dateLabel(forecast.computedAt)}</span></DataNote>
  </>;
}

function FormResults({ results }) {
  const labels = { G: "Ganado", E: "Empatado", P: "Perdido" };
  return <FormSequence aria-label="Resultados del más antiguo al más reciente">{results.length ? results.map((result, index) => <span key={index} data-result={result} aria-label={labels[result]} title={labels[result]}>{result}</span>) : <Small>Sin partidos</Small>}</FormSequence>;
}

function MatchDetails({ selected }) {
  return <Details><summary><span><RiBarChartGroupedLine aria-hidden="true" />Comparar equipos<span className="detail-hint">Factores y antecedentes</span></span><RiArrowDownSLine aria-hidden="true" /></summary><DetailsBody>
    <h4>Factores del pronóstico</h4><Explanations>{selected.explanations.map((text) => <li key={text}>{text}</li>)}</Explanations>
    <Comparison role="region" aria-label="Comparación de equipos" tabIndex={0}><table><caption>Rendimiento en el torneo</caption><thead><tr><th scope="col">Dato</th><th scope="col">Tu equipo</th><th scope="col">Rival</th></tr></thead><tbody><tr><th scope="row">Partidos jugados</th><td>{selected.own.played}</td><td>{selected.opponent.played}</td></tr><tr><th scope="row">Posición</th><td>{selected.own.position}°</td><td>{selected.opponent.position}°</td></tr><tr><th scope="row">Puntos / partido</th><td>{selected.own.pointsPerGame}</td><td>{selected.opponent.pointsPerGame}</td></tr><tr><th scope="row">Goles a favor / partido</th><td>{selected.own.goalsForPerGame}</td><td>{selected.opponent.goalsForPerGame}</td></tr><tr><th scope="row">Goles recibidos / partido</th><td>{selected.own.goalsAgainstPerGame}</td><td>{selected.opponent.goalsAgainstPerGame}</td></tr></tbody></table></Comparison>
    <EvidenceGrid><div>{selected.commonOpponents.length ? <Comparison role="region" aria-label="Resultados contra rivales comunes" tabIndex={0}><table><caption>Rivales en común</caption><thead><tr><th scope="col">Rival común</th><th scope="col">Tu equipo</th><th scope="col">Rival</th></tr></thead><tbody>{selected.commonOpponents.map((opponent) => <tr key={opponent.id}><th scope="row">{opponent.name}</th><td>{opponent.own.results.join(", ")}</td><td>{opponent.rival.results.join(", ")}</td></tr>)}</tbody></table><Small>Desde la perspectiva de cada equipo; hasta tres encuentros recientes por rival común.</Small></Comparison> : <><h4>Rivales en común</h4><Small>Aún no hay rivales en común con partidos jugados.</Small></>}</div><div><h4>Enfrentamientos directos</h4>{selected.headToHead.length ? <DirectResults>{selected.headToHead.map((game, index) => <li key={index}><span>{game.stageName || `Jornada ${game.round}`}</span><strong>{game.gf} – {game.gc}</strong></li>)}</DirectResults> : <Small>Todavía no hay enfrentamientos directos jugados en este torneo.</Small>}</div></EvidenceGrid>
  </DetailsBody></Details>;
}

function SeasonProjection({ season }) {
  if (!season.available) return <StateMessage><RiCalendarEventLine aria-hidden="true" /><div><h4>Proyección no disponible</h4><p>{season.reason}</p></div></StateMessage>;
  const classification = season.objectives.filter((objective) => classificationIds.has(objective.id));
  const movement = season.objectives.filter((objective) => !classificationIds.has(objective.id));
  return <SeasonContent aria-label="Proyección de temporada"><SeasonHeading><h4>Tu camino en el torneo</h4><Small>{season.exact ? "Fase regular resuelta" : `${season.simulations.toLocaleString("es-MX")} simulaciones · ${season.remainingMatches} partidos pendientes en el torneo`}</Small></SeasonHeading>
    <ProjectionLead><div><span>Posición final probable</span><strong>{season.positionRange[0]}°{season.positionRange[0] !== season.positionRange[1] && <><span> a </span>{season.positionRange[1]}°</>}</strong></div><dl><div><dt>Puntos finales estimados</dt><dd>{season.expectedPoints}</dd></div><div><dt>Rango de puntos</dt><dd>{season.pointsRange[0]} – {season.pointsRange[1]}</dd></div></dl></ProjectionLead>
    <PathsGrid>{classification.length > 0 && <ObjectiveGroup><h4><RiTrophyLine aria-hidden="true" />Clasificación</h4><ObjectiveRows objectives={classification} /><Small>La probabilidad total de liguilla incluye la vía directa y, si aplica, el repechaje. Estos porcentajes no se suman entre sí.</Small></ObjectiveGroup>}{movement.length > 0 && <ObjectiveGroup><h4><RiArrowUpDownLine aria-hidden="true" />Ascenso y permanencia</h4><ObjectiveRows objectives={movement} /><Small>Ascenso, descenso y permanencia se calculan según las zonas configuradas del torneo.</Small></ObjectiveGroup>}</PathsGrid>
    {!season.objectives.length && <StateMessage><RiTrophyLine aria-hidden="true" /><div><h4>Sin zonas de clasificación configuradas</h4><p>Este torneo no tiene liguilla, repechaje, ascensos ni descensos configurados.</p></div></StateMessage>}
    <ProjectionNote><RiInformationLine aria-hidden="true" /><div><p>{season.exact ? "Fase regular resuelta según los resultados registrados." : "Los rangos muestran el 80 % central de las simulaciones; son estimaciones, no una garantía."}</p>{season.unresolvedTie && <p>Los empates completos en puntos, diferencia, goles y partidos jugados se reparten por igual entre posiciones; requieren resolución oficial.</p>}{season.objectives.some((item) => item.id === "promotion" && item.label === "Zona de ascenso") && <p>Se estima la zona de ascenso; no hay una división superior de destino disponible.</p>}{season.objectives.some((item) => item.id === "relegation" && item.label === "Zona de descenso") && <p>Se estima la zona de descenso; no hay una división inferior de destino disponible.</p>}</div></ProjectionNote>
  </SeasonContent>;
}

function ObjectiveRows({ objectives }) {
  return <Objectives>{objectives.map((objective) => <li key={objective.id} data-featured={objective.id === "qualified"}><span>{objective.label}</span><strong>{formatForecastPercent(objective.percent, objective.exact)}</strong><meter min="0" max="100" value={objective.percent} aria-label={objective.label} aria-valuetext={formatForecastPercent(objective.percent, objective.exact)} /></li>)}</Objectives>;
}

const Section = styled.section`
  margin-top: 28px; border: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; border-radius: 16px;
  background: ${({ theme }) => theme.tournamentDashboard.surface}; color: ${({ theme }) => theme.text}; min-width: 0; overflow: clip; container-type: inline-size; font-variant-numeric: tabular-nums;
  --forecast-win: ${({ theme }) => theme.tournamentDashboard.metrics.accent}; --forecast-draw: ${({ theme }) => theme.tournamentDashboard.metrics.warning}; --forecast-lose: ${({ theme }) => theme.tournamentDashboard.metrics.danger};
  --forecast-ink: ${({ theme }) => theme.text}; --forecast-muted: color-mix(in srgb, ${({ theme }) => theme.tournamentDashboard.muted} 90%, ${({ theme }) => theme.text}); --forecast-border: ${({ theme }) => theme.tournamentDashboard.border};
  --forecast-accent: color-mix(in srgb, ${({ theme }) => theme.tournamentDashboard.hero.accentStrong} 85%, ${({ theme }) => theme.text});
  h3, h4, h5, p { margin: 0; } h3 { font-size: clamp(1.08rem, 2.4vw, 1.35rem); line-height: 1.4; letter-spacing: -0.02em; } h4 { font-size: 0.94rem; line-height: 1.5; font-weight: 700; }
  button, select, summary, [tabindex="0"] { &:focus-visible { outline: 2px solid ${({ theme }) => theme.tournamentDashboard.hero.accentStrong}; outline-offset: -3px; } }
  ::selection { background: ${({ theme }) => theme.primary}; color: #071e2a; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
`;
const Header = styled.div`display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 24px; @container (max-width: 560px) { padding: 20px 16px; gap: 8px; }`;
const TitleRow = styled.div`
  display: flex; align-items: flex-start; gap: 12px; min-width: 0;
  > svg { flex: 0 0 24px; width: 24px; height: 24px; margin-top: 3px; color: var(--forecast-accent); } p { color: var(--forecast-muted); font-size: 0.82rem; line-height: 1.6; margin-top: 5px; max-width: 54ch; }
  @container (max-width: 560px) { gap: 9px; > svg { flex-basis: 20px; width: 20px; height: 20px; } }
`;
const Refresh = styled.button`
  display: inline-flex; align-items: center; justify-content: center; gap: 7px; flex-shrink: 0; min-height: 44px; min-width: 44px;
  background: ${({ theme }) => theme.bgcards}; border: 1px solid var(--forecast-border); border-radius: 12px; color: var(--forecast-ink); padding: 8px 12px; font: inherit; font-size: 0.8rem; white-space: nowrap; cursor: pointer;
  &:hover { background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; } &:disabled { opacity: 0.55; cursor: wait; } svg { width: 18px; height: 18px; flex-shrink: 0; }
  @container (max-width: 560px) { span { display: none; } padding: 8px; }
`;
const Navigation = styled.div`display: flex; gap: 8px; padding: 0 24px; border-bottom: 1px solid var(--forecast-border); @container (max-width: 560px) { padding: 0 16px; gap: 4px; }`;
const Tab = styled.button`
  display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 48px; padding: 12px 16px; margin-bottom: -1px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--forecast-muted); font: inherit; font-size: 0.87rem; font-weight: 600; cursor: pointer;
  svg { width: 18px; height: 18px; } &[aria-selected="true"] { color: var(--forecast-accent); border-bottom-color: var(--forecast-accent); } &:hover { color: var(--forecast-ink); background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; }
  @container (max-width: 560px) { flex: 1; padding: 12px 8px; font-size: 0.81rem; }
`;
const Panel = styled.div`padding: 24px; &[hidden] { display: none; } @container (max-width: 560px) { padding: 20px 16px; }`;
const StateMessage = styled.div`display: flex; align-items: flex-start; gap: 14px; padding: 28px 24px; > svg { width: 24px; height: 24px; flex-shrink: 0; color: var(--forecast-muted); } p { color: var(--forecast-muted); font-size: 0.85rem; line-height: 1.7; margin-top: 8px; max-width: 65ch; } @container (max-width: 560px) { padding: 24px 16px; }`;
const Loading = styled.div`display: grid; gap: 20px; padding: 24px;`;
const Small = styled.p`font-size: 0.75rem; color: var(--forecast-muted); line-height: 1.65;`;
const FixtureNavigation = styled.div`display: flex; justify-content: space-between; align-items: center; gap: 20px; padding-bottom: 20px; > div:first-child { min-width: 0; p { margin-top: 4px; } } @container (max-width: 760px) { flex-direction: column; align-items: stretch; gap: 14px; }`;
const MatchPicker = styled.div`
  display: flex; gap: 8px; align-items: center; min-width: 0; max-width: 55%; select { width: 100%; min-width: 0; min-height: 44px; border: 1px solid var(--forecast-border); border-radius: 10px; padding: 10px 32px 10px 12px; font: inherit; font-size: 0.82rem; background: ${({ theme }) => theme.bgcards}; color: var(--forecast-ink); text-overflow: ellipsis; cursor: pointer; }
  @container (max-width: 760px) { max-width: none; }
`;
const MatchArrows = styled.div`display: flex; gap: 4px;`;
const IconButton = styled.button`display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--forecast-border); border-radius: 10px; color: var(--forecast-ink); background: transparent; cursor: pointer; svg { width: 20px; height: 20px; } &:hover:enabled { background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; } &:disabled { opacity: 0.35; cursor: default; }`;
const MatchWorkspace = styled.div`display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); border-top: 1px solid var(--forecast-border); border-bottom: 1px solid var(--forecast-border); @container (max-width: 760px) { grid-template-columns: minmax(0, 1fr); }`;
const MatchAnalysis = styled.section`min-width: 0; padding: 22px 28px 20px 0; @container (max-width: 760px) { padding: 20px 0; }`;
const FixtureDate = styled.div`display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 0.75rem; color: var(--forecast-muted); line-height: 1.6; svg { flex-shrink: 0; width: 15px; height: 15px; } > span { margin-left: auto; }`;
const MatchIdentity = styled.div`display: grid; grid-template-columns: minmax(0, 1fr) 32px minmax(0, 1fr); align-items: center; gap: 12px; margin: 24px 0 16px;`;
const TeamIdentity = styled.div`display: grid; justify-items: center; text-align: center; gap: 8px; min-width: 0; strong { font-size: 0.98rem; line-height: 1.4; overflow-wrap: anywhere; text-wrap: balance; } > span { font-size: 0.72rem; color: var(--forecast-muted); }`;
const Logo = styled.div`width: 64px; height: 64px; display: grid; place-items: center; img, svg { width: 64px; height: 64px; object-fit: contain; }`;
const Versus = styled.span`font-size: 0.85rem; color: var(--forecast-muted); text-align: center;`;
const MatchVerdict = styled.p`text-align: center; font-size: 0.85rem; font-weight: 600; margin-bottom: 22px !important;`;
const Probabilities = styled.div`
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; > div { display: grid; gap: 5px; } > div:nth-child(2) { text-align: center; span { justify-content: center; } } > div:nth-child(3) { text-align: right; span { justify-content: flex-end; } }
  span { display: flex; align-items: center; gap: 6px; color: var(--forecast-muted); font-size: 0.75rem; } i { width: 6px; height: 6px; border-radius: 50%; } .win { background: var(--forecast-win); } .draw { background: var(--forecast-draw); } .lose { background: var(--forecast-lose); } strong { font-size: clamp(1.4rem, 3vw, 1.8rem); line-height: 1.3; letter-spacing: -0.025em; }
`;
const ProbabilityBar = styled.div`display: flex; gap: 3px; height: 8px; overflow: hidden; border-radius: 4px; margin-top: 12px; .win { background: var(--forecast-win); } .draw { background: var(--forecast-draw); } .lose { background: var(--forecast-lose); }`;
const GoalEstimate = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; color: var(--forecast-muted); font-size: 0.72rem; > div { display: flex; align-items: center; gap: 12px; font-size: 0.78rem; } strong { color: var(--forecast-ink); font-size: 1rem; white-space: nowrap; > span { font-weight: 400; color: var(--forecast-muted); } }`;
const RivalContext = styled.aside`min-width: 0; padding: 22px 20px; background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; @container (max-width: 760px) { padding: 20px 16px; margin-bottom: 20px; }`;
const ContextHeading = styled.div`display: grid; gap: 10px;`;
const ContextTitle = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 8px;`;
const ContextToggle = styled.button`display: none; align-items: center; justify-content: center; gap: 4px; min-height: 44px; padding: 4px 0 4px 8px; border: 0; background: transparent; color: var(--forecast-accent); font: inherit; font-size: 0.72rem; white-space: nowrap; cursor: pointer; svg { width: 16px; height: 16px; } &[aria-expanded="true"] svg { transform: rotate(180deg); } @container (max-width: 760px) { display: inline-flex; }`;
const ContextData = styled.div`@container (max-width: 760px) { &[data-expanded="false"] { display: none; } }`;
const Difficulty = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 0.77rem; color: var(--forecast-muted); strong { color: var(--forecast-ink); font-weight: 600; } .difficulty-level { display: flex; gap: 4px; i { width: 15px; height: 5px; background: var(--forecast-border); border-radius: 2px; } i[data-active="true"] { background: var(--forecast-accent); } }`;
const QuickComparison = styled.table`width: 100%; border-collapse: collapse; font-size: 0.77rem; line-height: 1.6; margin: 18px 0; th { font-weight: 400; color: var(--forecast-muted); text-align: left; } thead th { font-size: 0.7rem; padding-bottom: 8px; } td { font-weight: 650; } td, thead th:not(:first-child) { text-align: right; } tbody th, td { padding: 7px 0; } tbody tr + tr { border-top: 1px solid var(--forecast-border); }`;
const FormHeading = styled.h5`font-size: 0.77rem; font-weight: 600; margin-bottom: 10px !important;`;
const FormRow = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; > span { font-size: 0.75rem; color: var(--forecast-muted); }`;
const FormSequence = styled.div`display: flex; gap: 4px; > span { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 5px; font-size: 0.68rem; font-weight: 700; color: var(--forecast-ink); } [data-result="G"] { background: color-mix(in srgb, var(--forecast-win) 17%, transparent); } [data-result="E"] { background: color-mix(in srgb, var(--forecast-draw) 17%, transparent); } [data-result="P"] { background: color-mix(in srgb, var(--forecast-lose) 17%, transparent); }`;
const SampleNotice = styled.div`display: flex; align-items: flex-start; gap: 9px; padding: 16px 0; color: var(--forecast-muted); font-size: 0.76rem; line-height: 1.65; svg { width: 17px; height: 17px; margin-top: 2px; flex-shrink: 0; } strong { color: var(--forecast-ink); font-weight: 600; } p > span { display: block; }`;
const Details = styled.details`
  border-top: 1px solid var(--forecast-border); summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; cursor: pointer; font-size: 0.82rem; color: var(--forecast-accent); font-weight: 600; list-style: none; padding: 8px 0; }
  summary::-webkit-details-marker { display: none; } summary > span { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; } summary svg { width: 18px; height: 18px; flex-shrink: 0; } summary > svg { transition: transform 160ms ease; } .detail-hint { color: var(--forecast-muted); font-size: 0.74rem; font-weight: 400; margin-left: 6px; }
  &[open] summary > svg { transform: rotate(180deg); } @media (prefers-reduced-motion: reduce) { summary > svg { transition: none; } } @container (max-width: 560px) { .detail-hint { display: none; } }
`;
const DetailsBody = styled.div`padding: 16px 0 8px;`;
const Explanations = styled.ul`padding-left: 20px; margin: 10px 0 24px; color: var(--forecast-muted); font-size: 0.81rem; line-height: 1.75; li + li { margin-top: 5px; }`;
const Comparison = styled.div`min-width: 0; overflow-x: auto; scrollbar-color: var(--forecast-border) transparent; scrollbar-width: thin; table { width: 100%; border-collapse: collapse; font-size: 0.78rem; line-height: 1.65; } caption { text-align: left; font-size: 0.9rem; font-weight: 650; margin-bottom: 10px; color: var(--forecast-ink); } th, td { padding: 10px 8px; border-bottom: 1px solid var(--forecast-border); text-align: right; } th:first-child { text-align: left; padding-left: 0; } th { font-weight: 400; color: var(--forecast-muted); } thead th { white-space: nowrap; font-weight: 600; } > p { margin-top: 10px; }`;
const EvidenceGrid = styled.div`display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 32px; margin-top: 28px; > div { min-width: 0; } h4 + p { margin-top: 8px; } @container (max-width: 680px) { grid-template-columns: minmax(0, 1fr); gap: 24px; }`;
const DirectResults = styled.ul`list-style: none; padding: 0; margin: 12px 0 0; li { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; font-size: 0.8rem; border-bottom: 1px solid var(--forecast-border); } li > span { color: var(--forecast-muted); } strong { white-space: nowrap; }`;
const SeasonContent = styled.section`min-width: 0;`;
const SeasonHeading = styled.div`display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 6px 20px; margin-bottom: 20px;`;
const ProjectionLead = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px; background: ${({ theme }) => theme.tournamentDashboard.primarySoft}; > div { display: grid; gap: 7px; > span { font-size: 0.8rem; color: var(--forecast-muted); } > strong { font-size: clamp(1.7rem, 4vw, 2.1rem); letter-spacing: -0.03em; line-height: 1.2; > span { font-size: 0.95rem; font-weight: 400; color: var(--forecast-muted); } } }
  dl { display: flex; gap: 28px; margin: 0; dt { font-size: 0.75rem; color: var(--forecast-muted); } dd { margin: 8px 0 0; font-size: 1.2rem; font-weight: 700; } }
  @container (max-width: 560px) { align-items: stretch; flex-direction: column; gap: 20px; padding: 20px; dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; } }
`;
const PathsGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 32px; margin-top: 28px; @container (max-width: 680px) { grid-template-columns: minmax(0, 1fr); gap: 28px; }`;
const ObjectiveGroup = styled.section`min-width: 0; > h4 { display: flex; gap: 8px; align-items: center; svg { width: 19px; height: 19px; color: var(--forecast-muted); } } > p { margin-top: 16px; }`;
const Objectives = styled.ul`
  margin: 14px 0 0; padding: 0; list-style: none; > li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 16px; padding: 14px 0; } li > span { font-size: 0.83rem; line-height: 1.5; } li > strong { margin: 0; font-size: 1rem; font-weight: 750; }
  meter { grid-column: 1 / -1; width: 100%; height: 5px; border: 0; appearance: none; background: var(--forecast-border); border-radius: 3px; overflow: hidden; } meter::-webkit-meter-bar { height: 5px; background: var(--forecast-border); border: 0; border-radius: 3px; } meter::-webkit-meter-optimum-value { background: var(--forecast-accent); border-radius: 3px; } meter::-moz-meter-bar { background: var(--forecast-accent); border-radius: 3px; }
  [data-featured="true"] { margin-top: 8px; border-top: 1px solid var(--forecast-border); padding-top: 18px; > span { font-weight: 650; } }
`;
const ProjectionNote = styled.div`display: flex; gap: 10px; margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--forecast-border); color: var(--forecast-muted); font-size: 0.75rem; line-height: 1.7; > svg { width: 17px; height: 17px; flex-shrink: 0; margin-top: 2px; } p + p { margin-top: 8px; }`;
const Method = styled(Details)`margin: 0 24px; summary { color: var(--forecast-muted); font-size: 0.78rem; font-weight: 500; } @container (max-width: 560px) { margin: 0 16px; }`;
const MethodBody = styled.div`padding: 8px 0 20px; p { max-width: 75ch; color: var(--forecast-muted); font-size: 0.79rem; line-height: 1.8; } p + p { margin-top: 12px; }`;
const DataNote = styled.div`display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 16px; padding: 12px 24px; background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; color: var(--forecast-muted); font-size: 0.7rem; line-height: 1.6; @container (max-width: 560px) { padding: 12px 16px; }`;
