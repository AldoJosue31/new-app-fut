import styled, { keyframes } from "styled-components";
import { v } from "../../../styles/variables";
import { useNavigate } from "react-router-dom";
import { BtnNormal } from "../../moleculas/BtnNormal";

export const WelcomeDashboard = ({ userName }) => {
    const navigate = useNavigate();

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
                        <StepText>1. Crea una División/Categoria</StepText>
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
                  funcion={() => navigate('/liga/divisions')}
                  titulo="Comenzar Ahora"
                />
                        
                </ActionButtons>
            </Content>
        </Container>
    );
};

const float = keyframes`
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
`;

const Container = styled.div`
    height: 100%;
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
`;

const Content = styled.div`
    text-align: center;
    max-width: 600px;
    background: ${({ theme }) => theme.bgcards};
    padding: 40px;
    border-radius: 20px;
    box-shadow: ${v.boxshadowGray};
    animation: ${float} 6s ease-in-out infinite;
`;

const IconContainer = styled.div`
    font-size: 4rem;
    color: ${v.colorPrincipal};
    margin-bottom: 20px;
`;

const Title = styled.h1`
    font-size: 2rem;
    color: ${({ theme }) => theme.text};
    margin-bottom: 15px;
`;

const Description = styled.p`
    color: ${({ theme }) => theme.text};
    opacity: 0.8;
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
`;

const Step = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
`;

const StepIcon = styled.div`
    width: 40px;
    height: 40px;
    background: ${({ theme }) => theme.bg};
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
`;