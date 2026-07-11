import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";
import { supabase } from "../supabase/supabase.config"; 
import { TorneosStandingsTab } from "../components/organismos/tabs/torneos/TorneosStandingsTab";
import { GoleadoresTab } from "../components/organismos/tabs/torneos/GoleadoresTab";
import { PantallaCarga } from "../components/organismos/PantallaCarga";
import { useTorneoStandingsLogic } from "../hooks/useTorneoStandingsLogic";
import { useThemeStore } from "../store/ThemeStore";
import { GlobalStyles } from "../styles/GlobalStyles";
import { v } from "../styles/variables";
import { BiLockAlt, BiErrorCircle, BiTrophy, BiFootball } from "react-icons/bi"; 
import { RiGitBranchLine } from "react-icons/ri";

const parseTournamentConfig = (torneo = {}) => {
  if (typeof torneo?.config === "string") {
    try {
      return JSON.parse(torneo.config) || {};
    } catch {
      return {};
    }
  }

  return torneo?.config || {};
};

const hasClinchedLiguilla = (row = {}) =>
  Array.isArray(row.clinchedStatuses) &&
  row.clinchedStatuses.some((status) => status?.key === "liguilla");

const hasSavedBracketTeams = (config = {}) => {
  const stages = Array.isArray(config.playoffState?.stages)
    ? config.playoffState.stages
    : [];

  return stages.some((stage) =>
    Array.isArray(stage?.pairs) &&
    stage.pairs.some((pair) => Boolean(pair?.home || pair?.away))
  );
};

const hasProjectedBracketTeams = (config = {}, standings = []) => {
  const directCount = Number.parseInt(config.clasificados, 10) || 0;
  const repechajeCount = Number.parseInt(config.repechajeTeams, 10) || 0;
  const participantCount = directCount + (repechajeCount > 0 ? Math.floor(repechajeCount / 2) : 0);
  const bracketLimit = participantCount || directCount;

  if (!config.zonaLiguilla || bracketLimit <= 0) return false;

  return standings.some((row, index) =>
    index < bracketLimit && hasClinchedLiguilla(row)
  );
};

export const PublicStandings = () => {
  const { torneoId } = useParams();
  const { themeStyle } = useThemeStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tabla'); // 'tabla' | 'cuadro' | 'goleadores'
  
  // Data
  const [torneo, setTorneo] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [goleadores, setGoleadores] = useState([]);
  const [goalEvents, setGoalEvents] = useState([]);

  const {
    tablaGeneral: publicTablaGeneral,
  } = useTorneoStandingsLogic({
    torneo,
    equipos,
    partidos,
    jornadasProp: jornadas,
    reglas: torneo?.config,
    selectedJornadaView: 'recent',
  });

  const showPublicBracketTab = useMemo(() => (
    hasSavedBracketTeams(parseTournamentConfig(torneo)) ||
    hasProjectedBracketTeams(parseTournamentConfig(torneo), publicTablaGeneral)
  ), [torneo, publicTablaGeneral]);
  const visibleActiveTab = activeTab === 'cuadro' && !showPublicBracketTab ? 'tabla' : activeTab;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const parsedTournamentId = Number(torneoId);
        if (!Number.isInteger(parsedTournamentId) || parsedTournamentId <= 0) {
          throw new Error("ID de torneo inválido");
        }

        const { data: publicBundle, error: bundleError } = await supabase.rpc(
          "get_public_tournament_bundle",
          { p_tournament_id: parsedTournamentId }
        );

        if (bundleError) throw bundleError;

        if (!publicBundle?.success) {
          if (publicBundle?.locked) {
            setError("LOCKED");
            return;
          }

          throw new Error(publicBundle?.message || "Torneo no encontrado");
        }

        setTorneo(publicBundle.tournament || null);
        setPartidos(Array.isArray(publicBundle.matches) ? publicBundle.matches : []);
        setJornadas(Array.isArray(publicBundle.jornadas) ? publicBundle.jornadas : []);
        setEquipos(Array.isArray(publicBundle.teams) ? publicBundle.teams : []);
        setGoleadores(Array.isArray(publicBundle.scorers) ? publicBundle.scorers : []);
        setGoalEvents(Array.isArray(publicBundle.goal_events) ? publicBundle.goal_events : []);

      } catch (err) {
        console.error("Error fetching public data:", err);
        setError("ERROR_GENERIC");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [torneoId]);

  // CALCULAR LA JORNADA ACTUAL PARA EL TÍTULO
  const textoJornadaActual = useMemo(() => {
    if (!partidos || partidos.length === 0) return "Torneo sin iniciar";
    
    let maxJornadaIniciada = 0;
    partidos.forEach(m => {
       if (!m.team1_id || !m.team2_id) return;
       const statusLower = (m.status || '').toLowerCase();
       const isFinished = ['finalizado', 'completado', 'jugado', 'terminado'].includes(statusLower);
       const hasResult = m.goals1 != null && m.goals2 != null;
       
       if (isFinished && hasResult) {
           const jNum = m.jornadas ? parseInt(m.jornadas.name.replace(/\D/g, ''), 10) : 0;
           if (jNum > maxJornadaIniciada) maxJornadaIniciada = jNum;
       }
    });

    return maxJornadaIniciada > 0 ? `Hasta la Jornada ${maxJornadaIniciada}` : "Torneo sin iniciar";
  }, [partidos]);

  if (loading) {
     return (
        <ThemeProvider theme={themeStyle}>
            <GlobalStyles />
            <PantallaCarga />
        </ThemeProvider>
     );
  }

  if (error) {
    return (
        <ThemeProvider theme={themeStyle}>
            <GlobalStyles />
            <ErrorContainer>
                {error === "LOCKED" ? (
                    <>
                        <BiLockAlt className="icon lock" />
                        <h2>Enlace Privado</h2>
                        <p>El administrador ha desactivado el acceso público.</p>
                    </>
                ) : (
                    <>
                        <BiErrorCircle className="icon error" />
                        <h2>Algo salió mal</h2>
                        <p>No pudimos encontrar el torneo.</p>
                    </>
                )}
            </ErrorContainer>
        </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={themeStyle}>
      <GlobalStyles />
      <PublicContainer>
        <Header>
            <TitleContainer>
                <v.iconocorona />
                <h1>{torneo?.season ? `Temporada ${torneo.season}` : "Torneo"}</h1>
            </TitleContainer>
            <Subtitle>
                {torneo?.division_nombre || "Tabla General"} | {textoJornadaActual}
            </Subtitle>
        </Header>

        {/* --- NAVEGACIÓN TABS --- */}
        <TabNavigation>
            <TabButton 
                $active={visibleActiveTab === 'tabla'}
                onClick={() => setActiveTab('tabla')}
            >
                <BiTrophy /> Tabla General
            </TabButton>
            
            {/* Solo mostramos el botón si la configuración lo permite */}
            {showPublicBracketTab && (
                <TabButton
                    $active={visibleActiveTab === 'cuadro'}
                    onClick={() => setActiveTab('cuadro')}
                >
                    <RiGitBranchLine /> Cuadro del torneo
                </TabButton>
            )}

            {torneo?.is_goleadores_public && (
                <TabButton 
                    $active={visibleActiveTab === 'goleadores'}
                    onClick={() => setActiveTab('goleadores')}
                >
                    <BiFootball /> Goleadores
                </TabButton>
            )}
        </TabNavigation>
        
        <Content>
            {visibleActiveTab === 'tabla' && (
                <TorneosStandingsTab 
                    torneo={torneo}
                    partidos={partidos} 
                    equipos={equipos}
                    jornadas={jornadas}
                    reglas={torneo?.config}
                    isPublic={true} 
                    forcedView="table"
                />
            )}

            {visibleActiveTab === 'cuadro' && showPublicBracketTab && (
                <TorneosStandingsTab
                    torneo={torneo}
                    partidos={partidos}
                    equipos={equipos}
                    jornadas={jornadas}
                    reglas={torneo?.config}
                    isPublic={true}
                    forcedView="bracket"
                />
            )}

            {visibleActiveTab === 'goleadores' && torneo?.is_goleadores_public && (
                <GoleadoresTab 
                    torneo={torneo}
                    goleadores={goleadores}
                    partidos={partidos}
                    equipos={equipos}
                    jornadas={jornadas}
                    goalEvents={goalEvents}
                    isPublic={true}
                />
            )}
        </Content>
        
        <Footer>
            <p>Powered by Bracket App</p>
        </Footer>
      </PublicContainer>
    </ThemeProvider>
  );
};

// --- STYLES FOR PUBLIC PAGE ---

const PublicContainer = styled.div`
    min-height: 100vh;
    background-color: ${({ theme }) => theme.bgtotal};
    color: ${({ theme }) => theme.text};
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
`;

const Header = styled.header`
    text-align: center;
    margin-bottom: 20px;
    margin-top: 20px;
`;

const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 1.5rem;
    color: ${({ theme }) => theme.primary};
    h1 { font-size: 24px; margin: 0; }
`;

const Subtitle = styled.p`
    color: ${({ theme }) => theme.text};
    opacity: 0.7;
    margin-top: 5px;
    font-size: 1.1rem;
    font-weight: 500;
`;

// --- ESTILOS DE TABS ---
const TabNavigation = styled.div`
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    width: min(100%, 920px);
    margin-bottom: 20px;
    background: ${({ theme }) => theme.bg};
    padding: 5px;
    border-radius: 18px;
    border: 1px solid ${({ theme }) => theme.color2};

    @media (max-width: 640px) {
        justify-content: stretch;
    }
`;

const TabButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 1 1 150px;
    min-width: 0;
    padding: 8px 20px;
    border-radius: 14px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
    text-align: center;
    
    background-color: ${({ $active, theme }) => $active ? theme.primary : 'transparent'};
    color: ${({ $active }) => $active ? '#fff' : 'inherit'};
    opacity: ${({ $active }) => $active ? 1 : 0.6};

    &:hover {
        opacity: 1;
        background-color: ${({ $active, theme }) => $active ? theme.primary : theme.bgAlpha};
    }

    svg { font-size: 1.1rem; }

    @media (max-width: 640px) {
        flex-basis: calc(50% - 4px);
        padding: 8px 10px;
        font-size: 0.82rem;
    }

    @media (max-width: 360px) {
        flex-basis: 100%;
    }
`;

const Content = styled.main`
    width: 100%;
    max-width: 1000px;
    flex: 1;
`;

const Footer = styled.footer`
    margin-top: 40px;
    padding: 20px;
    opacity: 0.4;
    font-size: 0.8rem;
`;

const ErrorContainer = styled.div`
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: ${({ theme }) => theme.bgtotal};
    color: ${({ theme }) => theme.text};
    text-align: center;
    padding: 20px;
    
    .icon { font-size: 4rem; margin-bottom: 20px; opacity: 0.8; }
    .lock { color: ${v.naranja}; }
    .error { color: ${v.rojo}; }
    h2 { font-size: 2rem; margin-bottom: 10px; }
    p { opacity: 0.6; font-size: 1.1rem; }
`;
