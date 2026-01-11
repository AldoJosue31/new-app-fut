import React, { useState } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { Title, TabsNavigation, ContentContainer, EmptyState } from "../../index";
import { RiCalendarEventLine, RiBarChartGroupedLine, RiFootballLine } from "react-icons/ri"; 
import { TorneoDefinicionTab } from "../organismos/tabs/torneos/TorneoDefinicionTab";
import { TorneoJornadasTab } from "../organismos/tabs/torneos/TorneoJornadasTab";
import { TorneosStandingsTab } from "../organismos/tabs/torneos/TorneosStandingsTab";
import { GoleadoresTab } from "../organismos/tabs/torneos/GoleadoresTab"; // <-- nuevo
import { TabContent } from "../moleculas/TabsNavigation";
import { Device } from "../../styles/breakpoints"; 

export function TorneosTemplate({ 
  form, onChange, onSubmit, loading, divisionName, activeTournament,
  allTeams, participatingIds, onInclude, onExclude, minPlayers,
  isLoadingData,
  standings,
  reglas,
  setReglas,
  refreshStandings
}) {
  const tabList = [
    { id: "definir", label: "Definir Torneo", icon: <v.iconocorona /> },
    { id: "jornadas", label: "Jornadas", icon: <RiCalendarEventLine /> },
    { id: "standings", label: "Tabla General", icon: <RiBarChartGroupedLine /> },
    { id: "goleadores", label: "Goleadores", icon: <RiFootballLine /> } // nuevo tab
  ];

  const [activeTab, setActiveTab] = useState("definir");
  const participatingTeamsObj = allTeams.filter(t => participatingIds.includes(t.id));

  return (
    <ContentContainer>
      <HeaderSection>
        <Title>Gestión de Torneos</Title>
      </HeaderSection>

      <TabsWrapper>
         <TabsNavigation tabs={tabList} activeTab={activeTab} setActiveTab={setActiveTab} />
      </TabsWrapper>

      <ContentGrid>
        {activeTab === "definir" && (
          <FullWidthTab>
            <TorneoDefinicionTab 
                form={form} onChange={onChange} onSubmit={onSubmit} loading={loading}
                divisionName={divisionName} activeTournament={activeTournament}
                allTeams={allTeams} participatingIds={participatingIds}
                onInclude={onInclude} onExclude={onExclude} minPlayers={minPlayers}
                isLoading={isLoadingData}
                reglas={reglas}
                setReglas={setReglas}
            />
          </FullWidthTab>
        )}

        {activeTab === "jornadas" && (
          <FullWidthTab>
            {activeTournament ? (
               <TorneoJornadasTab 
                  activeTournament={activeTournament} 
                  participatingTeams={participatingTeamsObj} 
                  refreshStandings={refreshStandings}
               />
            ) : (
               <EmptyState
                 title="Torneo no iniciado"
                 description="Debes definir e iniciar un torneo en la pestaña 'Definir Torneo' antes de ver las jornadas."
                 actionComponent={
                   <ActionButton onClick={() => setActiveTab("definir")}>
                     Ir a Definir
                   </ActionButton>
                 }
               />
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
              />
            ) : (
               <EmptyState
                 icon={<v.iconocorona size={40}/>}
                 title="Sin Datos"
                 description="No hay un torneo activo para mostrar la tabla de posiciones."
               />
            )}
           </FullWidthTab>
        )}

        {activeTab === "goleadores" && (
          <FullWidthTab>
            {activeTournament ? (
              <GoleadoresTab
                divisionName={divisionName}
                tournamentId={activeTournament?.id}
                limit={20}
              />
            ) : (
              <EmptyState
                title="Sin Datos"
                description="Inicia un torneo para ver la tabla de goleadores."
                actionComponent={<ActionButton onClick={() => setActiveTab("definir")}>Ir a Definir</ActionButton>}
              />
            )}
          </FullWidthTab>
        )}
      </ContentGrid>
    </ContentContainer>
  );
}

// --- ESTILOS ACTUALIZADOS ---

const HeaderSection = styled.div`
  margin-bottom: 20px;
  width: 100%;
  max-width: 1600px; 
  display: flex;
  flex-direction: column;
  @media ${Device.mobile} { align-items: center; text-align: center; }
  @media ${Device.laptop} { align-items: flex-start; text-align: left; }
`;

const TabsWrapper = styled.div`
  width: 100%;
  /* Reducimos el ancho máximo para que sea consistente con los Cards (1000px-1200px) */
  max-width: 1000px; 
  margin: 0 auto 20px auto;
  display: flex;
  flex-direction: column;
  min-width: 0; 
`;

const ContentGrid = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1000px; 
  margin: 0 auto;
  gap: 10px; /* 3. Reduce el gap de 20px a 10px o 0 si lo quieres pegado a los tabs */
`;

const FullWidthTab = styled(TabContent)`
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: visible; 
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 8px;
  border: none;
  background: ${v.colorPrincipal};
  color: #fff;
  font-weight: 600;
  transition: all 0.2s;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
  }
`;
