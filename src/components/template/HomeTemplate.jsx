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

    if (loading) { return <PantallaCarga />; }

    const userName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || "Manager";

    return (
        <ContentContainer>
            <PageHeader title="Panel de Control" />
            
            <MainContainer>
                {stats.divisiones.length > 0 ? (
                    <SummaryDashboard stats={stats} userName={userName} />
                ) : (
                    <WelcomeDashboard userName={userName} />
                )}
            </MainContainer>
        </ContentContainer>
    );
}

// Limpio: Sin animaciones manuales
const MainContainer = styled.div`
    width: 100%;
    min-height: 100%;
`;