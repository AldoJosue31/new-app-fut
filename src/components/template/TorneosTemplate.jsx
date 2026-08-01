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
import { TabsNavigation, TabContent } from "../moleculas/TabsNavigation"; 
import { EmptyState } from "../organismos/EmptyState"; 
import { RiCalendarEventLine, RiBarChartGroupedLine, RiFootballLine } from "react-icons/ri"; 
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

const TOURNAMENT_TAB_LIST = Object.freeze([
  { id: "definir", label: "Torneo", icon: <v.iconocorona /> },
  { id: "jornadas", label: "Jornadas", icon: <RiCalendarEventLine /> },
  {
    id: "standings",
    label: "Clasificacion",
    icon: <RiBarChartGroupedLine />,
  },
  { id: "goleadores", label: "Goleadores", icon: <RiFootballLine /> },
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
}) {
  const tournamentRoute = useMemo(
    () =>
      parseTournamentRoute({
        jornadaId,
        tab,
        tournamentOrTab,
      }),
    [jornadaId, tab, tournamentOrTab],
  );
  const routeTournamentId = tournamentRoute.tournamentId;
  const routeTab = tournamentRoute.tab;
  const routeJornadaId = tournamentRoute.jornadaId;
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
    ) =>
      buildTournamentPath({
        divisionId: visibleDivisionId,
        tournamentId: visibleTournamentId,
        tab: nextTabId,
        jornadaId: nextJornadaId,
      }),
    [routeJornadaId, visibleDivisionId, visibleTournamentId],
  );
  const getJornadaPath = useCallback(
    (nextJornadaId) => getTorneosPath("jornadas", nextJornadaId),
    [getTorneosPath],
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
            tabs={<TabsNavigation tabs={TOURNAMENT_TAB_LIST} activeTab={activeTab} setActiveTab={handleTabChange} />}
          />
        </HeaderMeasure>

        <StyledContentContainer $activeTab={activeTab} $headerHeight={headerHeight}>
          <ContentGrid $isWide={isWideView}>
            <FullWidthTab $isConstrained={activeTab === "jornadas"}>
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
          tabs={<TabsNavigation tabs={TOURNAMENT_TAB_LIST} activeTab={activeTab} setActiveTab={handleTabChange} />}
        />
      </HeaderMeasure>

      <StyledContentContainer
        $activeTab={activeTab}
        $headerHeight={headerHeight}
      >
        <ContentGrid $isWide={isWideView}>
          <Suspense
            fallback={
              <FullWidthTab $isConstrained={activeTab === "jornadas"}>
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
            <FullWidthTab>
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
