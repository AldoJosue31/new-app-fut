import React, { useState } from "react";
import styled from "styled-components";
import { Device } from "../../styles/breakpoints";
import { Title, TabsNavigation, EmptyState } from "../../index";
import { RiShieldUserLine, RiBarChartGroupedLine, RiSettings4Line, RiBuilding2Line } from "react-icons/ri";
import { GiWhistle } from "react-icons/gi";


import { LigaConfigTab } from "../organismos/tabs/liga/LigaConfigTab";
import { LigaDivisionsTab } from "../organismos/tabs/liga/LigaDivisionsTab";
import { LigaRefereesTab } from "../organismos/tabs/liga/LigaRefereesTab";

export function LigaTemplate({ 
   division, season, loading, 
  leagueData, referees = [], allDivisions = [],
  onUpdateLeague, onAddDivision, onEditDivision, onDeleteDivision,
  onAddReferee, onEditReferee, onDeleteReferee
}) {
  const [activeTab, setActiveTab] = useState("general");

  const tabList = [
    { id: "general", label: "Configuración", icon: <RiSettings4Line /> },
    { id: "divisions", label: "Divisiones", icon: <RiBuilding2Line /> },
    { id: "referees", label: "Árbitros", icon: <GiWhistle /> },
  ];
if (!loading && !leagueData) {
      return (
        <Container>
           <EmptyState 
              title="Liga no encontrada"
              description="No pudimos cargar la información de tu liga. Intenta recargar la página."
           />
        </Container>
      )
  }
  return (
    <Container>
      <HeaderSection><Title>Mi Liga</Title></HeaderSection>
      
      <div style={{width: '100%', maxWidth: '1000px'}}>
         <TabsNavigation tabs={tabList} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <ContentGrid>
        {activeTab === "general" && (
            <LigaConfigTab data={leagueData} onUpdate={onUpdateLeague} />
        )}
        {activeTab === "divisions" && (
            <LigaDivisionsTab divisions={allDivisions} onAdd={onAddDivision} onEdit={onEditDivision} onDelete={onDeleteDivision} />
        )}
        {activeTab === "referees" && (
            <LigaRefereesTab referees={referees} onAdd={onAddReferee} onEdit={onEditReferee} onDelete={onDeleteReferee} />
        )}
      </ContentGrid>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh; padding: 20px; width: 100%; display: flex; flex-direction: column; gap: 20px; align-items: center;
  background-color: ${({ theme }) => theme.bgtotal}; padding-top: 80px; 
  @media ${Device.tablet} { padding-top: 20px; }
`;
const HeaderSection = styled.div` margin-bottom: 10px; width: 100%; max-width: 1000px; `;
const ContentGrid = styled.div` display: flex; justify-content: center; width: 100%; gap: 20px; `;