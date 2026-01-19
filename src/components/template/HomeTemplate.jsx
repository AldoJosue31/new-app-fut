import React from "react";
import styled from "styled-components";
import { useHomeDashboard } from "../../hooks/pages/useHomeDashboard";
import { WelcomeDashboard } from "../organismos/dashboard/WelcomeDashboard";
import { SummaryDashboard } from "../organismos/dashboard/SummaryDashboard";
import { PantallaCarga } from "../organismos/PantallaCarga";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";

export function HomeTemplate() {
    const { stats, loading, user } = useHomeDashboard();

    // Constante de ancho máximo consistente con EquiposTemplate
    const VIEW_MAX_WIDTH = "1400px";

    if (loading) { return <PantallaCarga />; }

    const userName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || "Manager";
    const hasData = stats && stats.divisiones && stats.divisiones.length > 0;

    return (
        <ContentContainer>
            {/* PageHeader dentro de ContentContainer con maxWidth para alineación perfecta */}
            <PageHeader 
                title="Panel de Control" 
                maxWidth={VIEW_MAX_WIDTH} 
            />
            
            {/* MainContainer con el mismo maxWidth que Equipos */}
            <MainContainer $maxWidth={VIEW_MAX_WIDTH}>
                {hasData ? (
                    <SummaryDashboard stats={stats} userName={userName} />
                ) : (
                    <WelcomeDashboard userName={userName} />
                )}
            </MainContainer>
        </ContentContainer>
    );
}

// Estilos idénticos a src/components/template/EquiposTemplate.jsx
// Se asegura que el contenido tenga el mismo comportamiento de márgenes y ancho.
const MainContainer = styled.div`
  width: 100%;
  max-width: ${(props) => props.$maxWidth || '1400px'};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px; /* Espaciado entre elementos del dashboard */
`;