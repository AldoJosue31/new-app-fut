import styled from "styled-components";
import { v } from "../../../styles/variables";
import { BtnNormal } from "../../moleculas/BtnNormal";

export const WelcomeDashboard = ({ userName }) => {
    return (
        <Container>
            <Content>
                <IconContainer>
                    <v.iconocorona />
                </IconContainer>
                <Title>¡Bienvenido, {userName}!</Title>
                <Description>
                    Parece que aún no has configurado tu liga. Para comenzar a gestionar torneos profesionales, 
                    el primer paso es crear tu primera División y agregar algunos equipos.
                </Description>
                
                <StepsContainer>
                    <Step>
                        <StepIcon><v.iconocategorias /></StepIcon>
                        <StepText>1. Crea una División/Categoría</StepText>
                    </Step>
                    <Arrow><v.iconoflechaderecha /></Arrow>
                    <Step>
                        <StepIcon><v.iconoempresa /></StepIcon>
                        <StepText>2. Registra Equipos</StepText>
                    </Step>
                    <Arrow><v.iconoflechaderecha /></Arrow>
                    <Step>
                        <StepIcon><v.iconolineal /></StepIcon>
                        <StepText>3. Inicia un Torneo</StepText>
                    </Step>
                </StepsContainer>

                <ActionButtons>
                <BtnNormal 
                  funcion={() => window.location.assign('/liga/divisions')}
                  titulo="Comenzar Ahora"
                />
                        
                </ActionButtons>
            </Content>
        </Container>
    );
};

const Container = styled.div`
    height: 100%;
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(0px, 2vw, 20px);
`;

const Content = styled.div`
    text-align: center;
    max-width: 600px;
    background: ${({ theme }) => theme.bgcards};
    padding: clamp(20px, 4vw, 40px);
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(13, 39, 59, .08);
    overflow-wrap: anywhere;
`;

const IconContainer = styled.div`
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    margin: 0 auto 18px;
    border-radius: 20px;
    background: ${({ theme }) => theme.tournamentDashboard.primarySoft};
    color: ${v.colorPrincipal};
    font-size: 2.4rem;
`;

const Title = styled.h1`
    font-size: clamp(1.5rem, 3vw, 2rem);
    line-height: 1.2;
    letter-spacing: -.025em;
    color: ${({ theme }) => theme.text};
    margin-bottom: 15px;
`;

const Description = styled.p`
    color: ${({ theme }) => theme.tournamentDashboard.muted};
    line-height: 1.6;
    margin-bottom: 30px;
`;

const StepsContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 40px;
    flex-wrap: wrap;

    @media (max-width: 640px) {
        display: grid;
        justify-content: start;
        margin: 0 auto 28px;
        width: fit-content;
        gap: 12px;
        > span { display: none; }
    }
`;

const Step = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    @media (max-width: 640px) { flex-direction: row; text-align: left; }
`;

const StepIcon = styled.div`
    width: 40px;
    height: 40px;
    background: ${({ theme }) => theme.tournamentDashboard.itemSurface};
    flex: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: ${({ theme }) => theme.text};
`;

const StepText = styled.span`
    font-size: 0.8rem;
    font-weight: 600;
    color: ${({ theme }) => theme.text};
`;

const Arrow = styled.span`
    color: ${({ theme }) => theme.text};
    opacity: 0.3;
`;

const ActionButtons = styled.div`
    display: flex;
    justify-content: center;
    button:focus-visible { outline: 3px solid ${({ theme }) => theme.tournamentDashboard.hero.accentStrong}; outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) {
        button, button:hover, button:active { transform: none; transition: none; }
    }
`;
