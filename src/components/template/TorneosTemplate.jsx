import React, { useState } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { Title, TabsNavigation, ContentContainer } from "../../index";
import { RiCalendarEventLine, RiBarChartGroupedLine } from "react-icons/ri"; 
import { TorneoDefinicionTab } from "../organismos/tabs/torneos/TorneoDefinicionTab";
import { TorneoJornadasTab } from "../organismos/tabs/torneos/TorneoJornadasTab";
import { TorneosStandingsTab } from "../organismos/tabs/torneos/TorneosStandingsTab";

export function TorneosTemplate({ 
  form, onChange, onSubmit, loading, divisionName, activeTournament,
  allTeams, participatingIds, onInclude, onExclude, minPlayers,
  isLoadingData,
  standings,
  // 1. RECIBIMOS LAS PROPS NUEVAS AQUÍ
  reglas,
  setReglas
}) {
  const tabList = [
    { id: "definir", label: "Definir Torneo", icon: <v.iconocorona /> },
    { id: "jornadas", label: "Jornadas", icon: <RiCalendarEventLine /> },
    { id: "standings", label: "Tabla General", icon: <RiBarChartGroupedLine /> }
  ];

  const [activeTab, setActiveTab] = useState("definir");
  const participatingTeamsObj = allTeams.filter(t => participatingIds.includes(t.id));

  return (
    <ContentContainer>
      <HeaderSection><Title>Gestión de Torneos</Title></HeaderSection>

      <div style={{width: '100%', maxWidth: '1000px'}}>
         <TabsNavigation tabs={tabList} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <ContentGrid>
        {activeTab === "definir" && (
            <TorneoDefinicionTab 
                form={form} onChange={onChange} onSubmit={onSubmit} loading={loading}
                divisionName={divisionName} activeTournament={activeTournament}
                allTeams={allTeams} participatingIds={participatingIds}
                onInclude={onInclude} onExclude={onExclude} minPlayers={minPlayers}
                isLoading={isLoadingData}
                
                // 2. PASAMOS LAS PROPS AL HIJO AQUÍ
                reglas={reglas}
                setReglas={setReglas}
            />
        )}

{activeTab === "jornadas" && (
           <TorneoJornadasTab 
              activeTournament={activeTournament} 
              // CAMBIO IMPORTANTE: Pasamos la lista filtrada, no 'allTeams'
              participatingTeams={participatingTeamsObj} 
           />
        )}

        {activeTab === "standings" && (
           <TorneosStandingsTab
              standings={standings} 
              division={{ name: divisionName }} 
              season={activeTournament?.season || "Torneo Actual"}
              loading={isLoadingData}
           />
        )}
      </ContentGrid>
    </ContentContainer>
  );
}

const HeaderSection = styled.div` margin-bottom: 10px; width: 100%; max-width: 1000px; `;
const ContentGrid = styled.div` display: flex; justify-content: center; width: 100%; `;