import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
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
  leagueData // <-- AHORA RECIBE LA LIGA DESDE LA PÁGINA
}) {
  const navigate = useNavigate();
  const { tab } = useParams();
  
  const tabList = [
    { id: "definir", label: "Torneo", icon: <v.iconocorona /> },
    { id: "jornadas", label: "Jornadas", icon: <RiCalendarEventLine /> },
    { id: "standings", label: "Clasificacion", icon: <RiBarChartGroupedLine /> },
    { id: "goleadores", label: "Goleadores", icon: <RiFootballLine /> } 
  ];

  const validTabIds = tabList.map(t => t.id);
  const isValidTab = validTabIds.includes(tab);
  const defaultTab = activeTournament ? "jornadas" : "definir";
  const activeTab = isValidTab ? tab : defaultTab;
  const isResolvingInitialTab = !isValidTab && isLoadingData;
  const isWideView = ["jornadas", "standings", "goleadores"].includes(activeTab);

  const handleTabChange = (newTabId) => {
    navigate(`/torneos/${newTabId}`);
  };

  useLayoutEffect(() => {
    if (isLoadingData || isValidTab) return;

    navigate(`/torneos/${defaultTab}`, { replace: true });
  }, [defaultTab, isLoadingData, isValidTab, navigate]);

  const participatingTeamsObj = allTeams.filter(t => participatingIds.includes(t.id));

  const [goleadores, setGoleadores] = useState([]);
  const headerMeasureRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(118);

  const fetchGoleadores = async () => {
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
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchGoleadores, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeTournament?.id]);

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
      <StyledContentContainer $activeTab="definir" $headerHeight={headerHeight}>
        <ContentGrid $isWide={false}>
          <FullWidthTab>
            <TorneoDefinitionModeLoading />
          </FullWidthTab>
        </ContentGrid>
      </StyledContentContainer>
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
              {activeTournament ? (
                 <TorneoJornadasTab 
                    activeTournament={activeTournament} 
                    participatingTeams={participatingTeamsObj} 
                    refreshStandings={refreshStandings}
                 />
              ) : (
                 <EmptyState title="Torneo no iniciado" description="Debes definir e iniciar un torneo." actionComponent={<ActionButton onClick={() => handleTabChange("definir")}>Ir a Definir</ActionButton>} />
              )}
             </FullWidthTab>
          )}

          {activeTab === "standings" && (
            <FullWidthTab>
              {activeTournament ? (
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
              {activeTournament ? (
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
  
  transition: max-width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
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
