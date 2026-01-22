import React from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { useNavigate, useParams } from "react-router-dom";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { TabsNavigation, EmptyState } from "../../index";
import { RiCalendarEventLine, RiBarChartGroupedLine, RiFootballLine } from "react-icons/ri"; 
import { TorneoDefinicionTab } from "../organismos/tabs/torneos/TorneoDefinicionTab";
import { TorneoJornadasTab } from "../organismos/tabs/torneos/TorneoJornadasTab";
import { TorneosStandingsTab } from "../organismos/tabs/torneos/TorneosStandingsTab";
import { GoleadoresTab } from "../organismos/tabs/torneos/GoleadoresTab"; 
import { TabContent } from "../moleculas/TabsNavigation";
import { Device } from "../../styles/breakpoints"; 

export function TorneosTemplate({ 
  form, onChange, onSubmit, loading, divisionName, activeTournament,
  allTeams, participatingIds, onInclude, onExclude, minPlayers,
  isLoadingData, standings, reglas, setReglas, refreshStandings,
  onTournamentReset // <--- Recibimos la función de recarga
}) {
  const navigate = useNavigate();
  const { tab } = useParams();
  
  const tabList = [
    { id: "definir", label: "Definir Torneo", icon: <v.iconocorona /> },
    { id: "jornadas", label: "Jornadas", icon: <RiCalendarEventLine /> },
    { id: "standings", label: "Tabla General", icon: <RiBarChartGroupedLine /> },
    { id: "goleadores", label: "Goleadores", icon: <RiFootballLine /> } 
  ];

  const validTabIds = tabList.map(t => t.id);
  const activeTab = validTabIds.includes(tab) ? tab : "definir";
  const isWideView = ["jornadas", "standings", "goleadores"].includes(activeTab);

  const handleTabChange = (newTabId) => {
    navigate(`/torneos/${newTabId}`);
  };

  const participatingTeamsObj = allTeams.filter(t => participatingIds.includes(t.id));

  return (
    <ContentContainer>
      <PageHeader title="Gestión de Torneos" maxWidth="1000px" 
        tabs={<TabsNavigation tabs={tabList} activeTab={activeTab} setActiveTab={handleTabChange} />}
      />

      <ContentGrid $isWide={isWideView}>
        {activeTab === "definir" && (
          <FullWidthTab>
            <TorneoDefinicionTab 
                form={form} onChange={onChange} onSubmit={onSubmit} loading={loading}
                divisionName={divisionName} activeTournament={activeTournament}
                allTeams={allTeams} participatingIds={participatingIds}
                onInclude={onInclude} onExclude={onExclude} minPlayers={minPlayers}
                isLoading={isLoadingData} reglas={reglas} setReglas={setReglas}
                // Pasamos la prop al componente hijo
                onTournamentReset={onTournamentReset}
            />
          </FullWidthTab>
        )}

        {activeTab === "jornadas" && (
          <FullWidthTab>
            {activeTournament ? (
               <TorneoJornadasTab activeTournament={activeTournament} participatingTeams={participatingTeamsObj} refreshStandings={refreshStandings}/>
            ) : (
               <EmptyState title="Torneo no iniciado" description="Debes definir e iniciar un torneo." actionComponent={<ActionButton onClick={() => handleTabChange("definir")}>Ir a Definir</ActionButton>} />
            )}
           </FullWidthTab>
        )}

        {activeTab === "standings" && (
          <FullWidthTab>
            {activeTournament ? (
              <TorneosStandingsTab division={{ name: divisionName }} torneo={activeTournament} equipos={participatingTeamsObj} estadisticas={standings} reglas={reglas} />
            ) : (
               <EmptyState icon={<v.iconocorona size={40}/>} title="Sin Datos" description="No hay un torneo activo." actionComponent={<ActionButton onClick={() => handleTabChange("definir")}>Ir a Definir</ActionButton>} />
            )}
           </FullWidthTab>
        )}

        {activeTab === "goleadores" && (
          <FullWidthTab>
            {activeTournament ? (
              <GoleadoresTab divisionName={divisionName} tournamentId={activeTournament?.id} limit={20} />
            ) : (
                <EmptyState title="Sin Datos" description="Inicia un torneo para ver goleadores." actionComponent={<ActionButton onClick={() => handleTabChange("definir")}>Ir a Definir</ActionButton>} />
            )}
          </FullWidthTab>
        )}
      </ContentGrid>
    </ContentContainer>
  );
}

const ContentGrid = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin: 0 auto;
  gap: 10px;
  transition: max-width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  max-width: ${({ $isWide }) => ($isWide ? "98%" : "1000px")};
  @media ${Device.desktop} { max-width: ${({ $isWide }) => ($isWide ? "99%" : "1000px")}; }
`;

const FullWidthTab = styled(TabContent)` width: 100%; display: flex; flex-direction: column; overflow: visible; `;
const ActionButton = styled.button` padding: 10px 20px; cursor: pointer; border-radius: 8px; border: none; background: ${v.colorPrincipal}; color: #fff; font-weight: 600; transition: all 0.2s; &:hover { opacity: 0.9; transform: translateY(-2px); } `;