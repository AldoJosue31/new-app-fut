import React from "react";
import styled from "styled-components";
import { useHomeDashboard } from "../../hooks/pages/useHomeDashboard";
import { WelcomeDashboard } from "../organismos/dashboard/WelcomeDashboard";
import { SummaryDashboard } from "../organismos/dashboard/SummaryDashboard";
import { ContentContainer } from "../atomos/ContentContainer";
import { Skeleton } from "../atomos/Skeleton";
import { PageHeader } from "../moleculas/PageHeader";
import { useAuthStore } from "../../store/AuthStore";

export function HomeTemplate({ state, setState }) {
    const { stats, loading, user } = useHomeDashboard();
    const { profile } = useAuthStore();
    const VIEW_MAX_WIDTH = "1400px";

    const userName = profile?.full_name || user?.user_metadata?.nombre || user?.email?.split('@')[0] || "Manager";
    const hasData = stats && stats.divisiones && stats.divisiones.length > 0;

    return (
        <>
            {/* 1. PageHeader FUERA del ContentContainer para que sea sticky y ocupe todo el ancho */}
            <PageHeader 
                title="Panel" 
                maxWidth={VIEW_MAX_WIDTH}
                marginBottom="0"
                state={state}
                setState={setState}
            />
            
            {/* 2. Usamos StyledContentContainer para quitar el padding superior default */}
            <StyledContentContainer>
                <MainContainer $maxWidth={VIEW_MAX_WIDTH}>
                    {loading ? (
                        <DashboardLoading
                            aria-busy="true"
                            aria-label="Cargando resumen del panel"
                        >
                            <div className="loading-header">
                                <div>
                                    <Skeleton width="230px" height="32px" />
                                    <Skeleton width="310px" height="18px" />
                                </div>
                                <div className="loading-badges">
                                    <Skeleton width="138px" height="38px" radius="19px" />
                                    <Skeleton width="138px" height="38px" radius="19px" />
                                </div>
                            </div>
                            <Skeleton width="150px" height="22px" />
                            <div className="loading-grid">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <Skeleton
                                        key={index}
                                        width="100%"
                                        height="180px"
                                        radius="14px"
                                    />
                                ))}
                            </div>
                        </DashboardLoading>
                    ) : hasData ? (
                        <SummaryDashboard stats={stats} userName={userName} />
                    ) : (
                        <WelcomeDashboard userName={userName} />
                    )}
                </MainContainer>
            </StyledContentContainer>
        </>
    );
}

// Eliminamos el padding top por defecto para que el contenido empiece justo bajo el header
const StyledContentContainer = styled(ContentContainer)`
  && {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
`;

const MainContainer = styled.div`
  width: 100%;
  max-width: ${(props) => props.$maxWidth || '1400px'};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* Damos un pequeño margen superior para separar el contenido del header visualmente */
  margin-top: 20px; 
`;

const DashboardLoading = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 20px;
  padding: 10px;

  .loading-header {
    display: flex;
    min-height: 94px;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;

    > div {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  }

  .loading-badges {
    flex-direction: row !important;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .loading-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
  }

  @media (max-width: 640px) {
    .loading-header {
      flex-direction: column;
    }

    .loading-badges {
      justify-content: flex-start;
    }
  }
`;
