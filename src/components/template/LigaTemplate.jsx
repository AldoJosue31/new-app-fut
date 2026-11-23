import React from "react";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import {
  RiBookLine,
  RiBuilding2Line,
  RiSettings4Line,
} from "react-icons/ri";
import { GiWhistle } from "react-icons/gi";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { SegmentedViewSelector } from "../moleculas/TabsNavigation";
import { EmptyState } from "../organismos/EmptyState";
import { LigaConfigTab } from "../organismos/tabs/liga/LigaConfigTab";
import { LigaDivisionsTab } from "../organismos/tabs/liga/LigaDivisionsTab";
import { LigaRefereesTab } from "../organismos/tabs/liga/LigaRefereesTab";
import { LigaRulesTab } from "../organismos/tabs/liga/LigaRulesTab";

const leagueTabs = [
  { id: "general", label: "Configuración", icon: <RiSettings4Line /> },
  { id: "rules", label: "Plantilla Reglas", icon: <RiBookLine /> },
  { id: "divisions", label: "Divisiones", icon: <RiBuilding2Line /> },
  { id: "referees", label: "Árbitros", icon: <GiWhistle /> },
];

function getLeagueTab(pathname, routeTab) {
  try {
    const tab = pathname ? decodeURIComponent(pathname.split("/")[2] ?? "") : routeTab;
    return leagueTabs.some(({ id }) => id === tab) ? tab : "general";
  } catch {
    return "general";
  }
}

export function LigaTemplate({
  routeTab,
  loading,
  leagueData,
  referees = [],
  onUpdateLeague,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddDivision,
  onEditDivision,
  onDeleteDivision,
  onAddReferee,
  onEditReferee,
  onDeleteReferee,
  state,
  setState,
}) {
  const pathname = usePathname();
  const activeTab = getLeagueTab(pathname, routeTab);

  const handleTabChange = (newTabId) => {
    if (newTabId === getLeagueTab(window.location.pathname, routeTab)) return;
    window.history.pushState(null, "", `/liga/${newTabId}`);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  if (!loading && !leagueData) {
    return (
      <ContentContainer>
        <EmptyState
          title="Liga no encontrada"
          description="No pudimos cargar la información de tu liga. Intenta recargar la página."
        />
      </ContentContainer>
    );
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
          <SegmentedViewSelector
            tabs={leagueTabs}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            ariaLabel="Vistas de la liga"
          />
        }
      />

      <StyledContentContainer>
        <ContentGrid>
          <LigaConfigTab
            active={activeTab === "general"}
            data={leagueData}
            onUpdate={onUpdateLeague}
            loading={loading}
          />

          {activeTab === "rules" && (
            <LigaRulesTab data={leagueData} onUpdate={onUpdateLeague} loading={loading} />
          )}

          {activeTab === "divisions" && (
            <LigaDivisionsTab
              onAddCategory={onAddCategory}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
              onAddDivision={onAddDivision}
              onEditDivision={onEditDivision}
              onDeleteDivision={onDeleteDivision}
              loading={loading}
            />
          )}

          {activeTab === "referees" && (
            <LigaRefereesTab
              referees={referees}
              onAdd={onAddReferee}
              onEdit={onEditReferee}
              onDelete={onDeleteReferee}
              loading={loading}
            />
          )}
        </ContentGrid>
      </StyledContentContainer>
    </>
  );
}

const StyledContentContainer = styled(ContentContainer)`
  && {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
`;

const ContentGrid = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  gap: 20px;
  margin-top: 20px;
`;
