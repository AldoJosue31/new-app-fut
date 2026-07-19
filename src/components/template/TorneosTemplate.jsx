import React, { useCallback, useState, useEffect, useLayoutEffect, useRef } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { useNavigate, useParams } from "react-router-dom";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { TabsNavigation, TabContent } from "../moleculas/TabsNavigation"; 
import { EmptyState } from "../organismos/EmptyState"; 
import { RiCalendarEventLine, RiBarChartGroupedLine, RiFootballLine } from "react-icons/ri"; 
import { TorneoDefinicionTab } from "../organismos/tabs/torneos/TorneoDefinicionTab";
import { TorneoDefinitionModeLoading } from "../TorneoDefinitionMode";
import { getTournamentAutoRedirectPreference } from "../../utils/tournamentPreferences";
import { TorneoJornadasTab } from "../organismos/tabs/torneos/TorneoJornadasTab";
import { TorneosStandingsTab } from "../organismos/tabs/torneos/TorneosStandingsTab";
import { GoleadoresTab } from "../organismos/tabs/torneos/GoleadoresTab"; 
import { Device } from "../../styles/breakpoints"; 
import { getTopScorersService } from "../../services/estadisticas";

export function TorneosTemplate({ 
  form, onChange, onSubmit, loading, divisionName, activeTournament,
  allTeams, participatingIds, onInclude, onExclude, minPlayers,
  isLoadingData, standings, reglas, setReglas, refreshStandings,
  onTournamentReset, state, setState, partidos,
  onResetSetupDraft,
  currentDivisionId,
  leagueData // <-- AHORA RECIBE LA LIGA DESDE LA PÁGINA
}) {
  const navigate = useNavigate();
  const {
    divisionId: routeDivisionId,
    torneoOrTab,
    tab: tabOrJornadaId,
    jornadaId: jornadaIdParam,
  } = useParams();
  
  const tabList = [
    { id: "definir", label: "Torneo", icon: <v.iconocorona /> },
    { id: "jornadas", label: "Jornadas", icon: <RiCalendarEventLine /> },
    { id: "standings", label: "Clasificacion", icon: <RiBarChartGroupedLine /> },
    { id: "goleadores", label: "Goleadores", icon: <RiFootballLine /> } 
  ];

  const validTabIds = tabList.map(t => t.id);
  const routeHasTournamentId = /^\d+$/.test(String(torneoOrTab || ""));
  const routeTournamentId = routeHasTournamentId ? torneoOrTab : null;
  const routeTab = routeHasTournamentId ? tabOrJornadaId : torneoOrTab;
  const routeJornadaId =
    routeTab === "jornadas"
      ? routeHasTournamentId
        ? jornadaIdParam
        : tabOrJornadaId
      : null;
  const isValidTab = validTabIds.includes(routeTab);
  const shouldAutoRedirectToJornadas = getTournamentAutoRedirectPreference();
  const defaultTab = activeTournament && shouldAutoRedirectToJornadas ? "jornadas" : "definir";
  const activeTab = isValidTab ? routeTab : defaultTab;
  const isResolvingInitialTab = !isValidTab && isLoadingData;
  const isWideView = ["jornadas", "standings", "goleadores"].includes(activeTab);
  const activeTournamentRef = useRef(activeTournament);
  const resetSetupDraftRef = useRef(onResetSetupDraft);
  const canResetOnUnmountRef = useRef(false);
  const visibleDivisionId = routeDivisionId || currentDivisionId;
  const visibleTournamentId = activeTournament?.id || routeTournamentId;
  const getTorneosPath = useCallback((nextTabId) => {
    const jornadaSuffix =
      nextTabId === "jornadas" && routeJornadaId ? `/${routeJornadaId}` : "";
    return visibleDivisionId
      ? `/division/${visibleDivisionId}/torneos${visibleTournamentId ? `/${visibleTournamentId}` : ""}/${nextTabId}${jornadaSuffix}`
      : `/torneos${visibleTournamentId ? `/${visibleTournamentId}` : ""}/${nextTabId}${jornadaSuffix}`;
  }, [routeJornadaId, visibleDivisionId, visibleTournamentId]);

  useEffect(() => {
    activeTournamentRef.current = activeTournament;
    resetSetupDraftRef.current = onResetSetupDraft;
  }, [activeTournament, onResetSetupDraft]);

  const handleTabChange = (newTabId) => {
    if (!activeTournament && activeTab === "definir" && newTabId !== "definir") {
      onResetSetupDraft?.();
    }
    navigate(getTorneosPath(newTabId));
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
    if (!routeDivisionId && currentDivisionId && activeTab) {
      navigate(getTorneosPath(activeTab), { replace: true });
      return;
    }

    if (
      routeDivisionId &&
      activeTournament?.id &&
      String(routeTournamentId || "") !== String(activeTournament.id)
    ) {
      navigate(getTorneosPath(activeTab), { replace: true });
      return;
    }

    if (isValidTab) return;
    if (isLoadingData && !activeTournament) return;

    navigate(getTorneosPath(defaultTab), { replace: true });
  }, [activeTab, activeTournament, currentDivisionId, defaultTab, getTorneosPath, isLoadingData, isValidTab, navigate, routeDivisionId, routeTournamentId]);

  const participatingTeamsObj = allTeams.filter(t => participatingIds.includes(t.id));
  const isPreparingActiveTab = isLoadingData && activeTournament && participatingIds.length > 0 && participatingTeamsObj.length === 0;

  const [goleadores, setGoleadores] = useState([]);
  const headerMeasureRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(118);

  const fetchGoleadores = useCallback(async () => {
    if (!activeTournament?.id) {
      setGoleadores([]);
      return;
    }
    try {
      const data = await getTopScorersService({ tournamentId: activeTournament.id, limit: 50 });
      setGoleadores(data || []);
    } catch (err) {
      console.error("Error fetchGoleadores:", err);
      setGoleadores([]);
    }
  }, [activeTournament]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchGoleadores, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchGoleadores]);

  useEffect(() => {
  }, [refreshStandings]);

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
            tabs={<TabsNavigation tabs={tabList} activeTab={activeTab} setActiveTab={handleTabChange} />}
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
          tabs={<TabsNavigation tabs={tabList} activeTab={activeTab} setActiveTab={handleTabChange} />}
        />
      </HeaderMeasure>

      <StyledContentContainer
        $activeTab={activeTab}
        $headerHeight={headerHeight}
      >
        <ContentGrid $isWide={isWideView}>
          {activeTab === "definir" && (
            <FullWidthTab>
              <TorneoDefinicionTab 
                  form={form} onChange={onChange} onSubmit={onSubmit} loading={loading}
                  divisionName={divisionName} activeTournament={activeTournament}
                  allTeams={allTeams} participatingIds={participatingIds}
                  onInclude={onInclude} onExclude={onExclude} minPlayers={minPlayers}
                  isLoading={isLoadingData} reglas={reglas} setReglas={setReglas}
                  onTournamentReset={onTournamentReset}
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
                    participatingTeams={participatingTeamsObj} 
                    refreshStandings={refreshStandings}
                    divisionName={divisionName}
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
