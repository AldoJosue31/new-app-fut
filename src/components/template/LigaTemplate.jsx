import React, { useState } from "react";
import styled from "styled-components";
import { Device } from "../../styles/breakpoints";
import { Title, TabsNavigation } from "../../index";
import { RiShieldUserLine, RiBarChartGroupedLine, RiSettings4Line, RiBuilding2Line } from "react-icons/ri";
import { GiWhistle } from "react-icons/gi";

// Importación de Tabs
import { LigaStandingsTab } from "../organismos/tabs/liga/LigaStandingsTab";
import { LigaConfigTab } from "../organismos/tabs/liga/LigaConfigTab";
import { LigaDivisionsTab } from "../organismos/tabs/liga/LigaDivisionsTab";
import { LigaRefereesTab } from "../organismos/tabs/liga/LigaRefereesTab";

export function LigaTemplate({ 
  standings, division, season, loading, 
  leagueData, referees = [], allDivisions = [],
  onUpdateLeague, onAddDivision, onEditDivision, onDeleteDivision,
  onAddReferee, onEditReferee, onDeleteReferee
}) {
  const [activeTab, setActiveTab] = useState("standings");

  const tabList = [
    { id: "standings", label: "Tabla General", icon: <RiBarChartGroupedLine /> },
    { id: "general", label: "Configuración", icon: <RiSettings4Line /> },
    { id: "divisions", label: "Divisiones", icon: <RiBuilding2Line /> },
    { id: "referees", label: "Árbitros", icon: <GiWhistle /> },
  ];

  return (
    <Container>
      <HeaderSection><Title>Mi Liga</Title></HeaderSection>
      
      <div style={{width: '100%', maxWidth: '1000px'}}>
         <TabsNavigation tabs={tabList} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <ContentGrid>
        {activeTab === "standings" && (
            <LigaStandingsTab standings={standings} division={division} season={season} loading={loading} />
        )}
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