import styled from "styled-components";
import { v } from "../../../styles/variables";
import { DashboardCard } from "./DashboardCard";
import { useDivisionStore } from "../../../store/DivisionStore";

export const SummaryDashboard = ({ stats, userName }) => {
    const { setDivision } = useDivisionStore();

    const handleDivisionClick = (division) => {
        setDivision(division);
        // Si hay torneo activo, vamos a torneos, si no, a equipos
        if (division.activeTournament) {
            window.location.assign('/torneos');
        } else {
            window.location.assign('/equipos');
        }
    };

    return (
        <Container>
            <Header>
                <Greeting>
                    <h1>Hola, {userName}</h1>
                    <p>Aquí está el resumen de tu liga hoy.</p>
                </Greeting>
                <QuickStats>
                    <StatBadge>
                        <v.iconocategorias aria-hidden="true" />
                        <span><strong>{stats.divisiones.length}</strong> {stats.divisiones.length === 1 ? "División" : "Divisiones"}</span>
                    </StatBadge>
                    <StatBadge $color={v.colorPrincipal}>
                        <v.iconoempresa aria-hidden="true" />
                        <span><strong>{stats.totalTeams}</strong> {stats.totalTeams === 1 ? "Equipo" : "Equipos"}</span>
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
                            label: div.teamCount === 1 ? "Equipo registrado" : "Equipos registrados"
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
                <AddCard type="button" onClick={() => window.location.assign('/liga/divisions')}>
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
    align-items: center;
    margin-bottom: clamp(24px, 3vw, 36px);
    flex-wrap: wrap;
    gap: 20px;
`;

const Greeting = styled.div`
    min-width: 0;
    overflow-wrap: anywhere;
    h1 {
        font-size: clamp(1.6rem, 3vw, 2.15rem);
        line-height: 1.2;
        letter-spacing: -.03em;
        font-weight: 700;
        color: ${({ theme }) => theme.text};
    }
    p {
        color: ${({ theme }) => theme.tournamentDashboard.muted};
        margin-top: 6px;
    }
`;

const QuickStats = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const StatBadge = styled.div`
    background: ${({ theme, $color }) => $color ? `${$color}20` : theme.bgcards};
    color: ${({ theme, $color }) => $color ? `color-mix(in srgb, ${theme.tournamentDashboard.hero.accentStrong} 65%, ${theme.text})` : theme.text};
    padding: 8px 14px;
    border-radius: 30px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    border: 1px solid ${({ theme, $color }) => $color ? `${$color}48` : theme.tournamentDashboard.border};
    font-variant-numeric: tabular-nums;
    span { font-weight: 500; }
    strong { font-weight: 700; }
`;

const SectionTitle = styled.h2`
    font-size: 1.2rem;
    color: ${({ theme }) => theme.text};
    margin-bottom: 14px;
    letter-spacing: -.02em;
    font-weight: 600;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: 20px;
`;

const AddCard = styled.button`
    background: transparent;
    border: 1px dashed ${({ theme }) => `color-mix(in srgb, ${theme.tournamentDashboard.muted} 55%, ${theme.bgtotal})`};
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    cursor: pointer;
    color: ${({ theme }) => theme.tournamentDashboard.muted};
    font-family: inherit;
    font-weight: 600;
    font-size: .98rem;
    gap: 10px;

    > svg {
        width: 38px;
        height: 38px;
        padding: 10px;
        background: ${({ theme }) => theme.bgcards};
        border-radius: 50%;
    }
    &:focus-visible { outline: 3px solid ${({ theme }) => theme.tournamentDashboard.hero.accentStrong}; outline-offset: 3px; }
    @media (hover: hover) and (pointer: fine) {
        &:hover { border-color: ${v.colorPrincipal}; color: ${({ theme }) => theme.text}; }
    }
    @media (max-width: 640px) {
        min-height: 96px;
        flex-direction: row;
    }
`;
