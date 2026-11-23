import React, {
  lazy,
  Suspense,
  useCallback,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { SegmentedViewSelector, TabContent } from "../moleculas/TabsNavigation";
import { EmptyState } from "../organismos/EmptyState"; 

import { TorneoDefinitionModeLoading } from "../TorneoDefinitionMode";
import { getTournamentAutoRedirectPreference } from "../../utils/tournamentPreferences";
import { getErrorDetails } from "../../utils/errorUtils";
import { Device } from "../../styles/breakpoints"; 
import { getTopScorersService } from "../../services/estadisticas";
import {
  buildTournamentPath,
  parseTournamentRoute,
} from "../../lib/navigation/tournamentRoutes.js";

const TorneoDefinicionTab = lazy(() =>
  import("../organismos/tabs/torneos/TorneoDefinicionTab").then((module) => ({
    default: module.TorneoDefinicionTab,
  })),
);
const TorneoJornadasTab = lazy(() =>
  import("../organismos/tabs/torneos/TorneoJornadasTab").then((module) => ({
    default: module.TorneoJornadasTab,
  })),
);
const TorneosStandingsTab = lazy(() =>
  import("../organismos/tabs/torneos/TorneosStandingsTab").then((module) => ({
    default: module.TorneosStandingsTab,
  })),
);
const GoleadoresTab = lazy(() =>
  import("../organismos/tabs/torneos/GoleadoresTab").then((module) => ({
    default: module.GoleadoresTab,
  })),
);

function TournamentTabIcon({ children }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const TOURNAMENT_TAB_LIST = Object.freeze([
  {
    // Panel del torneo: configuración, progreso por fases y campeón.
    id: "definir", label: "Torneo",
    icon: <TournamentTabIcon>
      <path d="M7.5 4h9v5.5a4.5 4.5 0 0 1-9 0z" fill="currentColor" fillOpacity=".14" />
      <path d="M7.5 6.5H4.5v1a3.5 3.5 0 0 0 3.6 3.5M16.5 6.5h3v1a3.5 3.5 0 0 1-3.6 3.5M12 14v3" />
      <path d="M9 20.5V18a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5M7.5 20.5h9" />
      <path d="M12 6.4l.62 1.26 1.38.2-1 .98.24 1.38L12 9.57l-1.24.65.24-1.38-1-.98 1.38-.2z" fill="currentColor" strokeWidth=".6" />
    </TournamentTabIcon>,
  },
  {
    // Calendario de partidos: programar fechas/canchas y capturar resultados.
    id: "jornadas", label: "Jornadas",
    icon: <TournamentTabIcon>
      <path d="M21 10.25V7.5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h4.25" />
      <path d="M8 2.75v3.5M16 2.75v3.5M3 9.5h18" />
      <path d="M7 13.25h.01M10.5 13.25h.01M7 16.75h.01" strokeWidth="2.2" />
      <circle cx="17" cy="17" r="4.75" fill="currentColor" fillOpacity=".14" />
      <path d="M17 14.65 19.23 16.27 18.38 18.9H15.62L14.77 16.27Z" fill="currentColor" strokeWidth="1" />
      <path d="M17 14.65V12.25M19.23 16.27 21.52 15.53M18.38 18.9 19.79 20.84M15.62 18.9 14.21 20.84M14.77 16.27 12.48 15.53" strokeWidth="1" />
    </TournamentTabIcon>,
  },
  {
    // Tabla de posiciones: el líder resaltado y equipos que suben/bajan.
    id: "standings", label: "Clasificación",
    icon: <TournamentTabIcon>
      <rect x="2" y="2.75" width="20" height="6.5" rx="2.25" fill="currentColor" fillOpacity=".14" stroke="none" />
      <path d="M5.5 4.4 8 7.6H3z" fill="currentColor" strokeWidth="1" />
      <path d="M3.25 12h4.5" />
      <path d="M5.5 19.6 3 16.4h5z" fill="currentColor" strokeWidth="1" />
      <path d="M11 6h10M11 12h10M11 18h10" />
    </TournamentTabIcon>,
  },
  {
    // Tabla de goleo: balón + barras para los goles por jugador.
    id: "goleadores", label: "Estadísticas",
    icon: <TournamentTabIcon>
      <circle cx="8.75" cy="14" r="6.5" fill="currentColor" fillOpacity=".14" />
      <path d="M8.75 10.75 11.84 13 10.66 16.63H6.84L5.66 13Z" fill="currentColor" strokeWidth="1" />
      <path d="M8.75 10.75V7.5M11.84 13 14.93 11.99M10.66 16.63 12.57 19.26M6.84 16.63 4.93 19.26M5.66 13 2.57 11.99" strokeWidth="1" />
      <path d="M18.5 20.5v-6M21.75 20.5V5.5" />
    </TournamentTabIcon>,
  },
]);

const navigateWithBrowser = (href, { replace = false } = {}) => {
  if (typeof window === "undefined") return;
  if (replace) {
    window.location.replace(href);
  } else {
    window.location.assign(href);
  }
};

export function TorneosTemplate({ 
  form, onChange, onSubmit, loading, divisionName, activeTournament,
  allTeams, participatingIds, onInclude, onExclude, minPlayers,
  isLoadingData, standings, reglas, setReglas, refreshStandings,
  onTournamentReset, state, setState, partidos,
  onResetSetupDraft,
  currentDivisionId,
  leagueData, // <-- AHORA RECIBE LA LIGA DESDE LA PÁGINA
  jornadaId,
  navigate = navigateWithBrowser,
  pathname = "/torneos",
  routeDivisionId,
  tab,
  tournamentOrTab,
  view,
}) {
  const tournamentRoute = useMemo(
    () =>
      parseTournamentRoute({
        jornadaId,
        tab,
        tournamentOrTab,
        view,
      }),
    [jornadaId, tab, tournamentOrTab, view],
  );
  const routeTournamentId = tournamentRoute.tournamentId;
  const routeTab = tournamentRoute.tab;
  const routeJornadaId = tournamentRoute.jornadaId;
  const routeViewMode = tournamentRoute.viewMode;
  const isValidTab = tournamentRoute.isTabValid;
  const [shouldAutoRedirectToJornadas, setShouldAutoRedirectToJornadas] =
    useState(null);
  const defaultTab =
    activeTournament && shouldAutoRedirectToJornadas === true
      ? "jornadas"
      : "definir";
  const activeTab = isValidTab ? routeTab : defaultTab;
  const isResolvingInitialTab =
    !isValidTab &&
    (isLoadingData || shouldAutoRedirectToJornadas === null);
  const isWideView = ["jornadas", "standings", "goleadores"].includes(activeTab);
  const activeTournamentRef = useRef(activeTournament);
  const resetSetupDraftRef = useRef(onResetSetupDraft);
  const canResetOnUnmountRef = useRef(false);
  const visibleDivisionId = routeDivisionId || currentDivisionId;
  const visibleTournamentId = activeTournament?.id || routeTournamentId;
  const getTorneosPath = useCallback(
    (
      nextTabId,
      nextJornadaId = nextTabId === "jornadas" ? routeJornadaId : "",
      nextViewMode = routeViewMode,
    ) =>
      buildTournamentPath({
        divisionId: visibleDivisionId,
        tournamentId: visibleTournamentId,
        tab: nextTabId,
        jornadaId: nextJornadaId,
        viewMode: nextViewMode,
      }),
    [routeJornadaId, routeViewMode, visibleDivisionId, visibleTournamentId],
  );
  const getJornadaPath = useCallback(
    (nextJornadaId, nextViewMode = routeViewMode) =>
      getTorneosPath("jornadas", nextJornadaId, nextViewMode),
    [getTorneosPath, routeViewMode],
  );
  const navigateWithinTournament = useCallback(
    (href, options = {}) =>
      navigate(href, {
        ...options,
        clientOnly: true,
        preventScrollReset: true,
      }),
    [navigate],
  );
  const handlePlanningViewChange = useCallback(
    (nextViewMode) => {
      if (!routeJornadaId || nextViewMode === routeViewMode) return;
      navigateWithinTournament(getJornadaPath(routeJornadaId, nextViewMode));
    },
    [getJornadaPath, navigateWithinTournament, routeJornadaId, routeViewMode],
  );

  useEffect(() => {
    const preferenceTimer = window.setTimeout(() => {
      setShouldAutoRedirectToJornadas(getTournamentAutoRedirectPreference());
    }, 0);
    return () => window.clearTimeout(preferenceTimer);
  }, []);

  useEffect(() => {
    activeTournamentRef.current = activeTournament;
    resetSetupDraftRef.current = onResetSetupDraft;
  }, [activeTournament, onResetSetupDraft]);

  const handleTabChange = (newTabId) => {
    if (!activeTournament && activeTab === "definir" && newTabId !== "definir") {
      onResetSetupDraft?.();
    }
    navigateWithinTournament(getTorneosPath(newTabId));
  };

  useEffect(() => {
    const resetReadyTimer = window.setTimeout(() => {
      canResetOnUnmountRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(resetReadyTimer);
      if (canResetOnUnmountRef.current && !activeTournamentRef.current) {
        resetSetupDraftRef.current?.();
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!isValidTab && shouldAutoRedirectToJornadas === null) return;

    if (!routeDivisionId && currentDivisionId && activeTab) {
      navigateWithinTournament(getTorneosPath(activeTab), { replace: true });
      return;
    }

    if (
      routeDivisionId &&
      activeTournament?.id &&
      String(routeTournamentId || "") !== String(activeTournament.id)
    ) {
      navigateWithinTournament(getTorneosPath(activeTab), { replace: true });
      return;
    }

    if (tournamentRoute.needsRouteCleanup) {
      navigateWithinTournament(getTorneosPath(activeTab), { replace: true });
      return;
    }

    if (isValidTab) return;
    if (isLoadingData && !activeTournament) return;

    navigateWithinTournament(getTorneosPath(defaultTab), { replace: true });
  }, [activeTab, activeTournament, currentDivisionId, defaultTab, getTorneosPath, isLoadingData, isValidTab, navigateWithinTournament, routeDivisionId, routeTournamentId, shouldAutoRedirectToJornadas, tournamentRoute.needsRouteCleanup]);

  const participatingTeamsObj = allTeams.filter(t => participatingIds.includes(t.id));
  const isPreparingActiveTab = isLoadingData && activeTournament && participatingIds.length > 0 && participatingTeamsObj.length === 0;

  const [goleadores, setGoleadores] = useState([]);
  const headerMeasureRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(118);

  const fetchGoleadores = useCallback(async ({ signal = null } = {}) => {
    if (!activeTournament?.id) {
      setGoleadores([]);
      return;
    }
    try {
      const data = await getTopScorersService({
        tournamentId: activeTournament.id,
        limit: 50,
        signal,
      });
      if (signal?.aborted) return;
      setGoleadores(data || []);
    } catch (err) {
      if (signal?.aborted) return;
      console.error("Error obteniendo goleadores:", getErrorDetails(err));
      setGoleadores([]);
    }
  }, [activeTournament?.id]);

  useEffect(() => {
    if (!["definir", "goleadores"].includes(activeTab)) return;

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(
      () => fetchGoleadores({ signal: abortController.signal }),
      0
    );
    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [activeTab, fetchGoleadores]);

  useLayoutEffect(() => {
    const node = headerMeasureRef.current;
    if (!node) return;

    const measure = () => {
      const nextHeight = Math.ceil(node.getBoundingClientRect().height || 0);
      if (nextHeight > 0) {
        setHeaderHeight(nextHeight);
      }
    };

    measure();
    const frameId = requestAnimationFrame(measure);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(node);
    }

    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", measure);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [activeTab]);

  const viewSelector = (
    <SegmentedViewSelector
      tabs={TOURNAMENT_TAB_LIST}
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      ariaLabel="Vistas del torneo"
    />
  );

  if (isResolvingInitialTab) {
    return (
      <>
        <HeaderMeasure ref={headerMeasureRef}>
          <PageHeader 
            title="Torneos" 
            maxWidth="1000px" 
            marginBottom="0"
            state={state}
            setState={setState}
            tabs={viewSelector}
          />
        </HeaderMeasure>

        <StyledContentContainer $activeTab={activeTab} $headerHeight={headerHeight}>
          <ContentGrid $isWide={isWideView}>
            <FullWidthTab $isConstrained={activeTab === "jornadas" || activeTab === "goleadores"}>
              <TorneoDefinitionModeLoading />
            </FullWidthTab>
          </ContentGrid>
        </StyledContentContainer>
      </>
    );
  }

  return (
    <>
      <HeaderMeasure ref={headerMeasureRef}>
        <PageHeader 
          title="Torneos" 
          maxWidth="1000px" 
          marginBottom="0"
          state={state}
          setState={setState}
          tabs={viewSelector}
        />
      </HeaderMeasure>

      <StyledContentContainer
        $activeTab={activeTab}
        $headerHeight={headerHeight}
        $isGoleadores={activeTab === "goleadores"}
      >
        <ContentGrid $isWide={isWideView}>
          <Suspense
            fallback={
              <FullWidthTab $isConstrained={activeTab === "jornadas" || activeTab === "goleadores"}>
                <TorneoDefinitionModeLoading />
              </FullWidthTab>
            }
          >
          {activeTab === "definir" && (
            <FullWidthTab>
              <TorneoDefinicionTab 
                  form={form} onChange={onChange} onSubmit={onSubmit} loading={loading}
                  divisionName={divisionName} activeTournament={activeTournament}
                  allTeams={allTeams} participatingIds={participatingIds}
                  onInclude={onInclude} onExclude={onExclude} minPlayers={minPlayers}
                  isLoading={isLoadingData} reglas={reglas} setReglas={setReglas}
                  onTournamentReset={onTournamentReset}
                  onGoToJornadas={() =>
                    navigateWithinTournament(getTorneosPath("jornadas", ""))
                  }
                  standings={standings}
                  partidos={partidos}
                  goleadores={goleadores}
                  leagueData={leagueData} // <-- PASAMOS LA LIGA AL TAB DEFINITIVO
              />
            </FullWidthTab>
          )}

          {activeTab === "jornadas" && (
            <FullWidthTab $isConstrained>
              {isLoadingData && !activeTournament ? (
                 <TorneoDefinitionModeLoading />
              ) : isPreparingActiveTab ? (
                 <TorneoDefinitionModeLoading />
              ) : activeTournament ? (
                 <TorneoJornadasTab 
                    activeTournament={activeTournament} 
                    buildJornadaPath={getJornadaPath}
                    navigate={navigateWithinTournament}
                    pathname={pathname}
                    participatingTeams={participatingTeamsObj} 
                    refreshStandings={refreshStandings}
                    divisionName={divisionName}
                    routeJornadaId={routeJornadaId}
                    viewMode={routeViewMode}
                    onViewModeChange={handlePlanningViewChange}
                 />
              ) : (
                 <EmptyState title="Torneo no iniciado" description="Debes definir e iniciar un torneo." actionComponent={<ActionButton onClick={() => handleTabChange("definir")}>Ir a Definir</ActionButton>} />
              )}
             </FullWidthTab>
          )}

          {activeTab === "standings" && (
            <FullWidthTab>
              {isLoadingData && !activeTournament ? (
                <TorneoDefinitionModeLoading />
              ) : activeTournament ? (
                <TorneosStandingsTab 
                    division={{ name: divisionName }} 
                    torneo={activeTournament} 
                    equipos={participatingTeamsObj} 
                    estadisticas={standings} 
                    reglas={reglas}
                    partidos={partidos}
                    isLoading={isLoadingData}
                    onRefresh={() => {
                      if (refreshStandings) refreshStandings();
                      fetchGoleadores();
                    }}
                />
              ) : (
                 <EmptyState icon={<v.iconocorona size={40}/>} title="Sin Datos" description="No hay un torneo activo." actionComponent={<ActionButton onClick={() => handleTabChange("definir")}>Ir a Definir</ActionButton>} />
              )}
             </FullWidthTab>
          )}

          {activeTab === "goleadores" && (
            <FullWidthTab $isConstrained>
              {isLoadingData && !activeTournament ? (
                <TorneoDefinitionModeLoading />
              ) : activeTournament ? (
                <GoleadoresTab
                   torneo={activeTournament}
                   goleadores={goleadores}
                   partidos={partidos}
                   equipos={participatingTeamsObj}
                   reglas={reglas}
                   isPublic={false}
                   onRefresh={() => {
                     if (refreshStandings) refreshStandings();
                     fetchGoleadores();
                   }}
                />
              ) : (
                 <EmptyState title="Sin Datos" description="Inicia un torneo para ver goleadores." actionComponent={<ActionButton onClick={() => handleTabChange("definir")}>Ir a Definir</ActionButton>} />
              )}
             </FullWidthTab>
          )}
          </Suspense>
        </ContentGrid>
      </StyledContentContainer>
    </>
  );
}

const HeaderMeasure = styled.div`
  width: 100%;
  flex-shrink: 0;
`;

const StyledContentContainer = styled(ContentContainer)`
  && {
    padding-top: 0 !important;
    padding-bottom: ${({ $activeTab }) => ($activeTab === "jornadas" ? "14px" : "20px")} !important; 
    margin-top: 0 !important;
    width: 100%;
    flex: 1 1 auto;
    align-items: stretch;
    box-sizing: border-box;
    min-height: ${({ $headerHeight }) => `calc(100dvh - ${$headerHeight || 118}px)`} !important;

    ${({ $isGoleadores, $headerHeight }) =>
      $isGoleadores &&
      `
        height: calc(100dvh - ${$headerHeight || 118}px);
        min-height: calc(100dvh - ${$headerHeight || 118}px) !important;
        overflow: hidden;
      `}

    ${({ $activeTab, $headerHeight }) =>
      $activeTab === "jornadas" &&
      `
        @media (min-width: 769px) {
          height: calc(100dvh - ${$headerHeight || 118}px);
          min-height: calc(100dvh - ${$headerHeight || 118}px) !important;
          overflow: hidden;
        }
      `}
    
    @media (max-width: 768px) {
      padding-top: 0 !important;
      padding-bottom: 15px !important;
    }
  }
`;

const ContentGrid = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0 auto;
  gap: 0px; 
  margin-top: 0; 
  margin-bottom: 0;
  
  max-width: ${({ $isWide }) => ($isWide ? "98%" : "1000px")};
  @media ${Device.desktop} { max-width: ${({ $isWide }) => ($isWide ? "99%" : "1000px")}; }
`;

const FullWidthTab = styled(TabContent)` 
  width: 100%; 
  display: flex; 
  flex-direction: column; 
  flex: 1 1 auto;
  min-height: 0;
  overflow: ${({ $isConstrained }) => ($isConstrained ? "hidden" : "visible")}; 
  margin-bottom: 0; 
`;

const ActionButton = styled.button` 
  padding: 10px 20px; cursor: pointer; border-radius: 8px; border: none; background: ${v.colorPrincipal}; color: #fff; font-weight: 600; transition: all 0.2s; &:hover { opacity: 0.9; transform: translateY(-2px); } 
`;
