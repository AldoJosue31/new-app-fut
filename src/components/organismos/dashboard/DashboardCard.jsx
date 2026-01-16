import styled from "styled-components";
import { v } from "../../../styles/variables";

export const DashboardCard = ({ title, subtitle, icon, onClick, stats, footerText, color }) => {
    return (
        <CardContainer onClick={onClick} $color={color}>
            <IconWrapper $color={color}>
                {icon}
            </IconWrapper>
            <Content>
                <Title>{title}</Title>
                <Subtitle>{subtitle}</Subtitle>
                
                {stats && (
                    <StatsRow>
                        <Stat>
                            <span>{stats.value}</span>
                            <small>{stats.label}</small>
                        </Stat>
                    </StatsRow>
                )}
            </Content>
            {footerText && (
                <Footer>
                    {footerText} <v.iconoflechaderecha />
                </Footer>
            )}
        </CardContainer>
    );
};

const CardContainer = styled.div`
    background: ${({ theme }) => theme.bgcards};
    border-radius: ${v.borderRadius};
    padding: 20px;
    box-shadow: ${v.boxshadowGray};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.3s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    border: 1px solid transparent;

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        border-color: ${(props) => props.$color || props.theme.primary};
    }

    &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: ${(props) => props.$color || props.theme.primary};
    }
`;

const IconWrapper = styled.div`
    font-size: 2rem;
    color: ${(props) => props.$color || props.theme.primary};
    margin-bottom: 15px;
    background: ${(props) => props.theme.bg};
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
`;

const Content = styled.div`
    flex: 1;
`;

const Title = styled.h3`
    font-size: 1.1rem;
    font-weight: 700;
    color: ${({ theme }) => theme.text};
    margin-bottom: 5px;
`;

const Subtitle = styled.p`
    font-size: 0.9rem;
    color: ${({ theme }) => theme.text};
    opacity: 0.7;
    margin-bottom: 15px;
`;

const StatsRow = styled.div`
    display: flex;
    gap: 15px;
    margin-top: 10px;
`;

const Stat = styled.div`
    display: flex;
    flex-direction: column;
    
    span {
        font-size: 1.5rem;
        font-weight: 800;
        color: ${({ theme }) => theme.text};
    }
    small {
        font-size: 0.8rem;
        color: ${({ theme }) => theme.text};
        opacity: 0.6;
    }
`;

const Footer = styled.div`
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid ${({ theme }) => theme.bg3};
    font-size: 0.85rem;
    color: ${({ theme }) => theme.primary};
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
`;