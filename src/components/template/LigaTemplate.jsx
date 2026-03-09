import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { TabsNavigation, EmptyState } from "../../index";
import { RiSettings4Line, RiBuilding2Line, RiBookLine } from "react-icons/ri";
import { GiWhistle } from "react-icons/gi";

import { LigaConfigTab } from "../organismos/tabs/liga/LigaConfigTab";
import { LigaDivisionsTab } from "../organismos/tabs/liga/LigaDivisionsTab";
import { LigaRefereesTab } from "../organismos/tabs/liga/LigaRefereesTab";
import { LigaRulesTab } from "../organismos/tabs/liga/LigaRulesTab";

export function LigaTemplate({ 
   division, season, loading, 
   leagueData, referees = [], allDivisions = [],
   onUpdateLeague, onAddDivision, onEditDivision, onDeleteDivision,
   onAddReferee, onEditReferee, onDeleteReferee,
   state, setState
}) {
  const navigate = useNavigate();
  const { tab } = useParams();

  const tabList = [
    { id: "general", label: "Configuración", icon: <RiSettings4Line /> },
    { id: "rules", label: "Plantilla Reglas", icon: <RiBookLine /> },
    { id: "divisions", label: "Divisiones", icon: <RiBuilding2Line /> },
    { id: "referees", label: "Árbitros", icon: <GiWhistle /> },
  ];

  const validTabIds = tabList.map(t => t.id);
  const activeTab = validTabIds.includes(tab) ? tab : "general";

  const handleTabChange = (newTabId) => {
    navigate(`/liga/${newTabId}`);
  };

  if (!loading && !leagueData) {
      return (
        <ContentContainer>
           <EmptyState 
              title="Liga no encontrada"
              description="No pudimos cargar la información de tu liga. Intenta recargar la página."
           />
        </ContentContainer>
      )
  }

  return (
    <>
      <PageHeader 
        title="Mi Liga" 
        maxWidth="1000px" 
        marginBottom="0"
        state={state}
        setState={setState}
        tabs={
            <TabsNavigation 
                tabs={tabList} 
                activeTab={activeTab} 
                setActiveTab={handleTabChange} 
            />
        }
      />

      <StyledContentContainer>
        <ContentGrid>
            {activeTab === "general" && (
                <LigaConfigTab data={leagueData} onUpdate={onUpdateLeague} loading={loading} />
            )}
            {activeTab === "rules" && (
                <LigaRulesTab data={leagueData} onUpdate={onUpdateLeague} loading={loading} />
            )}
            {activeTab === "divisions" && (
                <LigaDivisionsTab divisions={allDivisions} onAdd={onAddDivision} onEdit={onEditDivision} onDelete={onDeleteDivision} loading={loading} />
            )}
            {activeTab === "referees" && (
                <LigaRefereesTab referees={referees} onAdd={onAddReferee} onEdit={onEditReferee} onDelete={onDeleteReferee} loading={loading} />
            )}
        </ContentGrid>
      </StyledContentContainer>
    </>
  );
}

const StyledContentContainer = styled(ContentContainer)`
  && { padding-top: 0 !important; margin-top: 0 !important; }
`;

const ContentGrid = styled.div` 
  display: flex; justify-content: center; width: 100%; gap: 20px; margin-top: 20px;
`;