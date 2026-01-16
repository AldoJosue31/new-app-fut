import styled from "styled-components";
import { useHomeDashboard } from "../../hooks/pages/useHomeDashboard";
import { WelcomeDashboard } from "../organismos/dashboard/WelcomeDashboard";
import { SummaryDashboard } from "../organismos/dashboard/SummaryDashboard";
import { PantallaCarga } from "../organismos/PantallaCarga";
import { ContentContainer } from "../atomos/ContentContainer";

export function HomeTemplate() {
    const { stats, loading, user } = useHomeDashboard();

    // Obtener nombre corto del usuario o email
    const userName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || "Manager";



    return (
        <ContentContainer>
            <MainContainer>
                {/* Condición: Si no hay divisiones, mostramos WelcomeDashboard.
                  Si hay divisiones, mostramos SummaryDashboard.
                */}
                {stats.divisiones.length === 0 ? (
                    <WelcomeDashboard userName={userName} />
                ) : (
                    <SummaryDashboard stats={stats} userName={userName} />
                )}
            </MainContainer>
        </ContentContainer>
    );
}

const MainContainer = styled.div`
    width: 100%;
    min-height: 100%;
    animation: fadeIn 0.5s ease-in;

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;