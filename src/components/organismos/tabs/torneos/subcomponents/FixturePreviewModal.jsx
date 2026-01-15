import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom"; //
import styled, { keyframes, css } from "styled-components";
import { v } from "../../../../../styles/variables";
import { 
    RiRefreshLine, 
    RiCheckDoubleLine, 
    RiCloseLine, 
    RiCalendarEventLine, 
    RiTeamLine 
} from "react-icons/ri";
import { generarFixture } from "../../../../../services/torneos";
import { Btnsave } from "../../../../../index"; 

export function FixturePreviewModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    teams = [], 
    config, 
    isLoading 
}) {
    const [shuffledTeams, setShuffledTeams] = useState([]);
    const [fixtureData, setFixtureData] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);

    // Inicializar equipos al abrir
    useEffect(() => {
        if (isOpen && teams.length > 0) {
            setShuffledTeams([...teams]);
        }
    }, [isOpen, teams]);

    // Lógica de generación del fixture
    useEffect(() => {
        if (shuffledTeams.length < 2) return;

        const rounds = generarFixture(shuffledTeams); //
        let finalFixture = [];

        // Mapeo de IDs a Objetos de equipo
        rounds.forEach((round, rIndex) => {
            const matches = round.map(m => {
                const t1 = shuffledTeams.find(t => t.id === m.home);
                const t2 = shuffledTeams.find(t => t.id === m.away);
                if (!t1 || !t2) return null;
                return { local: t1, visitante: t2 };
            }).filter(Boolean);

            finalFixture.push({
                name: `Jornada ${rIndex + 1}`,
                matches
            });
        });

        // Manejo de vueltas (Ida y Vuelta)
        if (config?.vueltas === "2") {
            const roundsVuelta = finalFixture.map((jornada, idx) => ({
                name: `Jornada ${finalFixture.length + idx + 1}`,
                matches: jornada.matches.map(m => ({ local: m.visitante, visitante: m.local }))
            }));
            finalFixture = [...finalFixture, ...roundsVuelta];
        }

        setFixtureData(finalFixture);

    }, [shuffledTeams, config]);

    // Función de barajar (animación y lógica)
    const handleShuffle = () => {
        setIsAnimating(true);
        setTimeout(() => {
            const mixed = [...shuffledTeams];
            // Algoritmo Fisher-Yates
            for (let i = mixed.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
            }
            setShuffledTeams(mixed);
            setIsAnimating(false);
        }, 600);
    };

    if (!isOpen) return null;

    // USAMOS PORTAL PARA SACARLO DEL FLUJO NORMAL
    return createPortal(
        <Overlay>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                
                <Header>
                    <div className="header-info">
                        <IconWrapper>
                            <RiCalendarEventLine />
                        </IconWrapper>
                        <div className="texts">
                            <h3>Vista Previa</h3>
                            <span>{fixtureData.length} Jornadas generadas</span>
                        </div>
                    </div>
                    <CloseBtn onClick={onClose} aria-label="Cerrar">
                        <RiCloseLine />
                    </CloseBtn>
                </Header>

                <Content>
                    <Toolbar>
                        <div className="info-teams">
                            <RiTeamLine /> {teams.length} Equipos
                        </div>
                        
                        <ShuffleButton 
                            onClick={handleShuffle} 
                            disabled={isAnimating || isLoading}
                            $isAnimating={isAnimating}
                        >
                            <RiRefreshLine className="icon-spin" />
                            <span>Barajar</span>
                        </ShuffleButton>
                    </Toolbar>

                    <ScrollArea>
                        <Grid $isAnimating={isAnimating}>
                            {fixtureData.map((jornada, i) => (
                                <JornadaCard key={i}>
                                    <JornadaTitle>{jornada.name}</JornadaTitle>
                                    <MatchesList>
                                        {jornada.matches.map((match, mIdx) => (
                                            <MatchRow key={mIdx}>
                                                <TeamName $align="left" title={match.local.name}>
                                                    {match.local.name}
                                                </TeamName>
                                                <VersusBadge>VS</VersusBadge>
                                                <TeamName $align="right" title={match.visitante.name}>
                                                    {match.visitante.name}
                                                </TeamName>
                                            </MatchRow>
                                        ))}
                                    </MatchesList>
                                </JornadaCard>
                            ))}
                        </Grid>
                    </ScrollArea>
                </Content>

                <Footer>
                    <WarningText>
                        * Al confirmar, se guardarán como "Pendientes".
                    </WarningText>
                    <ActionWrapper>
                        <Btnsave 
                            titulo={isLoading ? "Creando..." : "Confirmar"}
                            bgcolor={v.colorPrincipal}
                            icono={<RiCheckDoubleLine />}
                            funcion={() => onConfirm(fixtureData)}
                            disabled={isLoading}
                        />
                    </ActionWrapper>
                </Footer>

            </ModalContainer>
        </Overlay>,
        document.body // ESTO RENDERIZA EL MODAL AL FINAL DEL BODY
    );
}

// --- STYLES & ANIMATIONS ---

const spinAnimation = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
`;

const Overlay = styled.div`
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.75); 
    backdrop-filter: blur(4px);
    z-index: 2000; /* Z-Index alto para estar sobre todo, incluso sidebar si es necesario */
    display: flex; justify-content: center; align-items: center;
    padding: 20px;

    /* En móvil: full screen */
    @media (max-width: 768px) {
        padding: 0;
        align-items: flex-end; 
    }
`;

const ModalContainer = styled.div`
    width: 100%; max-width: 1100px; height: 85vh;
    background: ${({ theme }) => theme.bg};
    border-radius: 16px; 
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    display: flex; flex-direction: column;
    animation: ${fadeIn} 0.25s ease-out;
    border: 1px solid ${({ theme }) => theme.bg4};
    overflow: hidden;
    position: relative; /* Asegura contexto propio */

    @media (max-width: 768px) {
        height: 100vh;
        max-width: none;
        border-radius: 0;
        border: none;
    }
`;

// --- HEADER ---
const Header = styled.header`
    padding: 16px 24px; 
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
    display: flex; justify-content: space-between; align-items: center;
    background: ${({ theme }) => theme.bg};
    flex-shrink: 0;

    .header-info {
        display: flex; gap: 12px; align-items: center;
        .texts {
            display: flex; flex-direction: column;
            h3 { margin: 0; font-size: 1.1rem; color: ${({ theme }) => theme.text}; font-weight: 700; }
            span { font-size: 0.85rem; color: ${({ theme }) => theme.textFade}; }
        }
    }
`;

const IconWrapper = styled.div`
    width: 42px; height: 42px;
    border-radius: 12px;
    background: ${v.colorPrincipal}20; 
    color: ${v.colorPrincipal};
    display: flex; align-items: center; justify-content: center;
    font-size: 1.3rem;
`;

const CloseBtn = styled.button`
    background: transparent; border: none; 
    width: 40px; height: 40px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; cursor: pointer; 
    color: ${({ theme }) => theme.text};
    transition: all 0.2s;
    &:hover { background: ${({ theme }) => theme.bg3}; color: ${v.colorError}; }
`;

// --- CONTENT AREA ---
const Content = styled.div`
    flex: 1; display: flex; flex-direction: column; 
    background: ${({ theme }) => theme.bg2};
    overflow: hidden; 
`;

const Toolbar = styled.div`
    padding: 12px 24px;
    background: ${({ theme }) => theme.bgcards};
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
    display: flex; justify-content: space-between; align-items: center;
    flex-shrink: 0;

    .info-teams {
        display: flex; align-items: center; gap: 8px;
        font-size: 0.9rem; font-weight: 600;
        color: ${({ theme }) => theme.text};
    }

    @media (max-width: 480px) { padding: 12px 16px; }
`;

const ShuffleButton = styled.button`
    display: flex; align-items: center; gap: 8px; 
    padding: 8px 16px;
    background: ${({ theme }) => theme.bg3}; 
    color: ${({ theme }) => theme.text};
    border: 1px solid ${({ theme }) => theme.bg4}; 
    border-radius: 8px; 
    cursor: pointer; font-weight: 600; font-size: 0.85rem;
    transition: all 0.2s;

    &:hover { background: ${v.colorPrincipal}; color: white; border-color: ${v.colorPrincipal}; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
    .icon-spin { animation: ${props => props.$isAnimating ? css`${spinAnimation} 0.6s linear infinite` : 'none'}; }
`;

const ScrollArea = styled.div`
    flex: 1; overflow-y: auto; padding: 24px;
    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.bg4}; border-radius: 3px; }

    @media (max-width: 768px) { padding: 16px; }
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    transition: opacity 0.3s ease;
    opacity: ${props => props.$isAnimating ? 0.5 : 1};
`;

// --- CARDS ---
const JornadaCard = styled.div`
    background: ${({ theme }) => theme.bgcards}; 
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 12px; overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.03);
`;

const JornadaTitle = styled.div`
    padding: 10px 15px;
    background: ${({ theme }) => theme.bg3};
    font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;
    color: ${v.colorPrincipal}; font-weight: 700;
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
`;

const MatchesList = styled.div`
    padding: 10px; display: flex; flex-direction: column; gap: 6px;
`;

const MatchRow = styled.div`
    display: flex; justify-content: space-between; align-items: center;
    font-size: 0.9rem; padding: 6px 4px; border-radius: 6px;
    &:hover { background: ${({ theme }) => theme.bg2}; }
`;

const TeamName = styled.span`
    flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-weight: 500; color: ${({ theme }) => theme.text};
    text-align: ${props => props.$align}; font-size: 0.85rem;
`;

const VersusBadge = styled.span`
    font-size: 0.65rem; font-weight: 800;
    color: ${({ theme }) => theme.textFade}; background: ${({ theme }) => theme.bg4};
    padding: 2px 6px; border-radius: 4px; margin: 0 8px;
`;

// --- FOOTER ---
const Footer = styled.footer`
    padding: 16px 24px; border-top: 1px solid ${({ theme }) => theme.bg4};
    display: flex; justify-content: space-between; align-items: center;
    background: ${({ theme }) => theme.bg}; flex-shrink: 0; gap: 15px;

    @media (max-width: 600px) {
        flex-direction: column-reverse; align-items: stretch; padding: 16px;
    }
`;

const WarningText = styled.div`
    color: ${({ theme }) => theme.textFade}; font-size: 0.8rem; font-style: italic;
    @media (max-width: 600px) { text-align: center; }
`;

const ActionWrapper = styled.div`
    @media (max-width: 600px) {
        width: 100%; button { width: 100%; justify-content: center; }
    }
`;