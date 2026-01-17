import styled from "styled-components";
import { useHomeDashboard } from "../../hooks/pages/useHomeDashboard";
import { WelcomeDashboard } from "../organismos/dashboard/WelcomeDashboard";
import { SummaryDashboard } from "../organismos/dashboard/SummaryDashboard";
import { PantallaCarga } from "../organismos/PantallaCarga";
import { ContentContainer } from "../atomos/ContentContainer";

export function HomeTemplate() {
    const { stats, loading, user } = useHomeDashboard();

    // Si está cargando, retornamos inmediatamente la pantalla de carga.
    // Esto evita que el código de abajo se evalúe con datos vacíos.
    if (loading) {
        return <PantallaCarga />;
    }

    // Obtener nombre corto del usuario o email para la UI
    const userName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || "Manager";

    return (
        <ContentContainer>
            <MainContainer>
                {/* Lógica optimizada:
                    Como ya pasamos el bloqueo de 'loading', aquí sabemos que tenemos 
                    los datos definitivos. Si el array sigue vacío, es porque realmente
                    no hay divisiones.
                */}
                {stats.divisiones.length > 0 ? (
                    <SummaryDashboard stats={stats} userName={userName} />
                ) : (
                    <WelcomeDashboard userName={userName} />
                )}
            </MainContainer>
        </ContentContainer>
    );
}

const MainContainer = styled.div`
    width: 100%;
    min-height: 100%;
    /* Animación suave al aparecer el contenido final */
    animation: fadeIn 0.4s ease-in-out;

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;