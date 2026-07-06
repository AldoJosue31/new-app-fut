import React from "react";
import styled from "styled-components";
import { useHomeDashboard } from "../../hooks/pages/useHomeDashboard";
import { WelcomeDashboard } from "../organismos/dashboard/WelcomeDashboard";
import { SummaryDashboard } from "../organismos/dashboard/SummaryDashboard";
import { PantallaCarga } from "../organismos/PantallaCarga";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { useAuthStore } from "../../store/AuthStore";

export function HomeTemplate({ state, setState }) {
    const { stats, loading, user } = useHomeDashboard();
    const { profile } = useAuthStore();
    const VIEW_MAX_WIDTH = "1400px";

    if (loading) { return <PantallaCarga />; }

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
                    {hasData ? (
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