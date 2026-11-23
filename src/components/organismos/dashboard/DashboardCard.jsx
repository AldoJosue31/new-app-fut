import styled from "styled-components";
import { v } from "../../../styles/variables";

export const DashboardCard = ({ title, subtitle, icon, onClick, stats, footerText, color }) => (
    <CardContainer $color={color}>
        <IconWrapper aria-hidden="true">{icon}</IconWrapper>
        <Title><button type="button" onClick={onClick} aria-label={`${title}, ${footerText || subtitle}`}>{title}</button></Title>
        <Subtitle>{subtitle}</Subtitle>
        {stats && <Stat><strong>{stats.value}</strong><small>{stats.label}</small></Stat>}
        {footerText && <Footer>{footerText}<span aria-hidden="true"><v.iconoflechaderecha /></span></Footer>}
    </CardContainer>
);

const CardContainer = styled.article`
    --accent: ${({ $color, theme }) => $color || theme.primary};
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 22px ${v.lgSpacing} 18px;
    overflow-wrap: anywhere;
    background: ${({ theme }) => theme.bgcards};
    color: ${({ theme }) => theme.text};
    border-radius: 14px;
    box-shadow: inset 3px 0 var(--accent), 0 3px 10px rgba(13, 39, 59, .07);

    &:has(button:focus-visible) {
        outline: 3px solid ${({ theme }) => theme.tournamentDashboard.hero.accentStrong};
        outline-offset: 3px;
    }
    @media (hover: hover) and (pointer: fine) {
        &:hover { box-shadow: inset 3px 0 var(--accent), 0 5px 16px rgba(13, 39, 59, .12); }
    }
    @media (prefers-reduced-motion: no-preference) {
        transition: transform 140ms cubic-bezier(.23, 1, .32, 1);
        &:has(button:active:not(:focus-visible)) { transform: scale(.99); }
    }
`;

const IconWrapper = styled.div`
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    margin-bottom: 14px;
    border-radius: 12px;
    color: color-mix(in srgb, var(--accent) 65%, ${({ theme }) => theme.text});
    background: color-mix(in srgb, var(--accent) 13%, ${({ theme }) => theme.bgcards});
    font-size: 24px;
`;

const Title = styled.h3`
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.3;
    letter-spacing: -.02em;
    font-weight: 700;

    button {
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
        overflow-wrap: anywhere;
    }
    button::after { content: ""; position: absolute; inset: 0; border-radius: 14px; }
    button:focus-visible { outline: none; }
`;

const Subtitle = styled.p`
    display: flex;
    align-items: baseline;
    gap: 7px;
    margin: 4px 0 0;
    color: ${({ theme }) => theme.tournamentDashboard.muted};
    font-size: .875rem;
    line-height: 1.5;
    &::before {
        content: "";
        align-self: center;
        flex: none;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
    }
`;

const Stat = styled.div`
    display: grid;
    gap: 2px;
    margin: 18px 0;
    strong {
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1.1;
        letter-spacing: -.035em;
        font-variant-numeric: tabular-nums;
    }
    small { font-size: .8rem; color: ${({ theme }) => theme.tournamentDashboard.muted}; }
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid ${({ theme }) => theme.tournamentDashboard.border};
    color: color-mix(in srgb, ${({ theme }) => theme.tournamentDashboard.hero.accentStrong} 78%, ${({ theme }) => theme.text});
    font-size: .85rem;
    line-height: 1.4;
    font-weight: 600;
    span {
        display: grid;
        place-items: center;
        flex: none;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: ${({ theme }) => theme.tournamentDashboard.itemSurface};
    }
    article:focus-within & span { background: ${({ theme }) => theme.tournamentDashboard.primarySoft}; }
    @media (hover: hover) and (pointer: fine) {
        article:hover & span { background: ${({ theme }) => theme.tournamentDashboard.primarySoft}; }
    }
`;
