import styled from "styled-components";
import { v } from "../../../styles/variables";
import { DashboardCard } from "./DashboardCard";
import { useNavigate } from "react-router-dom";
import { useDivisionStore } from "../../../store/DivisionStore";

export const SummaryDashboard = ({ stats, userName }) => {
    const navigate = useNavigate();
    const { setDivision } = useDivisionStore();

    const handleDivisionClick = (division) => {
        setDivision(division);
        // Si hay torneo activo, vamos a torneos, si no, a equipos
        if (division.activeTournament) {
            navigate('/torneos');
        } else {
            navigate('/equipos');
        }
    };

    return (
        <Container>
            <Header>
                <Greeting>
                    <h1>Hola, {userName} <v.emoji /></h1>
                    <p>Aquí está el resumen de tu liga hoy.</p>
                </Greeting>
                <QuickStats>
                    <StatBadge>
                        <v.iconocategorias />
                        <span>{stats.divisiones.length} Divisiones</span>
                    </StatBadge>
                    <StatBadge $color={v.colorPrincipal}>
                        <v.iconoempresa />
                        <span>{stats.totalTeams} Equipos</span>
                    </StatBadge>
                </QuickStats>
            </Header>

            <SectionTitle>Mis Divisiones</SectionTitle>
            <Grid>
                {stats.divisiones.map((div) => (
                    <DashboardCard
                        key={div.id}
                        title={div.name}
                        subtitle={div.activeTournament ? "Torneo en curso" : "Sin actividad reciente"}
                        icon={<v.iconocategorias />}
                        stats={{ 
                            value: div.teamCount, 
                            label: "Equipos Registrados" 
                        }}
                        color={div.activeTournament ? v.colorPrincipal : v.colorSecundario}
                        footerText={div.activeTournament 
                            ? `${div.activeTournament.name} • ${div.activeTournament.jornada}`
                            : "Gestionar Equipos"
                        }
                        onClick={() => handleDivisionClick(div)}
                    />
                ))}
                
                {/* Tarjeta para agregar nueva división */}
                <AddCard onClick={() => navigate('/liga/divisions')}>
                    <v.agregar />
                    <span>Nueva División</span>
                </AddCard>
            </Grid>
        </Container>
    );
};

const Container = styled.div`
    padding: 10px;
    width: 100%;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 40px;
    flex-wrap: wrap;
    gap: 20px;
`;

const Greeting = styled.div`
    h1 {
        font-size: 2rem;
        font-weight: 700;
        color: ${({ theme }) => theme.text};
        display: flex;
        align-items: center;
        gap: 10px;
    }
    p {
        color: ${({ theme }) => theme.text};
        opacity: 0.7;
        margin-top: 5px;
    }
`;

const QuickStats = styled.div`
    display: flex;
    gap: 15px;
`;

const StatBadge = styled.div`
    background: ${({ theme, $color }) => $color ? `${$color}20` : theme.bgcards};
    color: ${({ theme, $color }) => $color || theme.text};
    padding: 10px 20px;
    border-radius: 30px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    border: 1px solid ${({ theme, $color }) => $color || theme.bg3};
`;

const SectionTitle = styled.h2`
    font-size: 1.2rem;
    color: ${({ theme }) => theme.text};
    margin-bottom: 20px;
    font-weight: 600;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 25px;
`;

const AddCard = styled.div`
    background: transparent;
    border: 2px dashed ${({ theme }) => theme.bg3};
    border-radius: ${v.borderRadius};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    cursor: pointer;
    color: ${({ theme }) => theme.text};
    opacity: 0.6;
    transition: all 0.2s;
    font-size: 1.2rem;
    gap: 10px;

    &:hover {
        border-color: ${v.colorPrincipal};
        color: ${v.colorPrincipal};
        opacity: 1;
        background: ${({ theme }) => `${theme.bgcards}50`};
    }
`;