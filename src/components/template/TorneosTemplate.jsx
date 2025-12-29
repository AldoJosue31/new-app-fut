import React, { useState } from "react";
import styled from "styled-components";
import { Device } from "../../styles/breakpoints";
import { v } from "../../styles/variables";
import { Title, TabsNavigation, ContentContainer } from "../../index";
import { RiCalendarEventLine } from "react-icons/ri";

// Importación de Tabs
import { TorneoDefinicionTab } from "../organismos/tabs/torneos/TorneoDefinicionTab";
import { TorneoJornadasTab } from "../organismos/tabs/torneos/TorneoJornadasTab";

export function TorneosTemplate({ 
  form, onChange, onSubmit, loading, divisionName, activeTournament,
  allTeams, participatingIds, onInclude, onExclude, minPlayers,
  // === CAMBIO 1: Recibir la prop de carga de datos ===
  // Le llamo 'isLoadingData' para no confundirla con 'loading' (que suele ser para guardar)
  isLoadingData 
}) {
  const tabList = [
    { id: "definir", label: "Definir Torneo", icon: <v.iconocorona /> },
    { id: "jornadas", label: "Jornadas", icon: <RiCalendarEventLine /> }
  ];
  const [activeTab, setActiveTab] = useState("definir");

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
                
                // === CAMBIO 2: Conectar el cable ===
                // Pasamos el valor recibido al componente hijo
                isLoading={isLoadingData}
            />
        )}

        {activeTab === "jornadas" && (
           <TorneoJornadasTab />
        )}
      </ContentGrid>
    </ContentContainer>
  );
}

const HeaderSection = styled.div` margin-bottom: 10px; width: 100%; max-width: 1000px; `;
const ContentGrid = styled.div` display: flex; justify-content: center; width: 100%; `;