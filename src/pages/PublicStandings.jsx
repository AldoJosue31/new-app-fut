import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";
import { supabase } from "../supabase/supabase.config"; 
import { TorneosStandingsTab } from "../components/organismos/tabs/torneos/TorneosStandingsTab";
import { GoleadoresTab } from "../components/organismos/tabs/torneos/GoleadoresTab";
import { PantallaCarga } from "../components/organismos/PantallaCarga";
import { useThemeStore } from "../store/ThemeStore";
import { GlobalStyles } from "../styles/GlobalStyles";
import { v } from "../styles/variables";
import { BiLockAlt, BiErrorCircle, BiTrophy, BiFootball } from "react-icons/bi"; 

export const PublicStandings = () => {
  const { torneoId } = useParams();
  const { themeStyle } = useThemeStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tabla'); // 'tabla' | 'goleadores'
  
  // Data
  const [torneo, setTorneo] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [goleadores, setGoleadores] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!torneoId) throw new Error("ID de torneo inválido");

        // 1. Obtener Info del Torneo
        const { data: torneoData, error: torneoError } = await supabase
          .from('tournaments')
          .select('*, divisions(name)')
          .eq('id', torneoId)
          .single();

        if (torneoError) throw torneoError;

        // VERIFICACIÓN DE SEGURIDAD (ENLACE PRINCIPAL)
        if (!torneoData.is_public) {
            setError("LOCKED");
            setLoading(false);
            return;
        }

        const torneoProcesado = {
            ...torneoData,
            division_nombre: torneoData.divisions?.name
        };
        setTorneo(torneoProcesado);

        // 2. Obtener Partidos
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*, jornadas!inner(id, name, tournament_id, status)')
          .eq('jornadas.tournament_id', torneoId);
          
        if (matchesError) throw matchesError;
        setPartidos(matchesData || []);

        // 3. Obtener Equipos
        let equiposData = [];
        if (torneoData.division_id) {
            const { data: divEquipos } = await supabase
              .from('teams')
              .select('*')
              .eq('division_id', torneoData.division_id);
            equiposData = divEquipos || [];
        } else {
            const teamIds = new Set();
            (matchesData || []).forEach(m => {
                if (m.team1_id) teamIds.add(m.team1_id);
                if (m.team2_id) teamIds.add(m.team2_id);
            });
            if (teamIds.size > 0) {
                const { data: eqData } = await supabase
                  .from('teams')
                  .select('*')
                  .in('id', Array.from(teamIds));
                equiposData = eqData || [];
            }
        }
        setEquipos(equiposData);

        // 4. Obtener Goleadores (Solo si está activado en BD)
        if (torneoData.is_goleadores_public) {
            const { data: goalsData } = await supabase
                .from('view_goleadores')
                .select('*')
                .eq('tournament_id', torneoId)
                .limit(20); // Top 20
            setGoleadores(goalsData || []);
        }

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
                $active={activeTab === 'tabla'} 
                onClick={() => setActiveTab('tabla')}
            >
                <BiTrophy /> Tabla General
            </TabButton>
            
            {/* Solo mostramos el botón si la configuración lo permite */}
            {torneo?.is_goleadores_public && (
                <TabButton 
                    $active={activeTab === 'goleadores'} 
                    onClick={() => setActiveTab('goleadores')}
                >
                    <BiFootball /> Goleadores
                </TabButton>
            )}
        </TabNavigation>
        
        <Content>
            {activeTab === 'tabla' && (
                <TorneosStandingsTab 
                    torneo={torneo}
                    partidos={partidos} 
                    equipos={equipos}
                    reglas={torneo?.config}
                    isPublic={true} 
                />
            )}

            {activeTab === 'goleadores' && torneo?.is_goleadores_public && (
                <GoleadoresTab 
                    torneo={torneo}
                    goleadores={goleadores}
                    partidos={partidos}
                    equipos={equipos}
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
    gap: 15px;
    margin-bottom: 20px;
    background: ${({ theme }) => theme.bg};
    padding: 5px;
    border-radius: 30px;
    border: 1px solid ${({ theme }) => theme.color2};
`;

const TabButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 20px;
    border-radius: 20px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
    
    background-color: ${({ $active, theme }) => $active ? theme.primary : 'transparent'};
    color: ${({ $active }) => $active ? '#fff' : 'inherit'};
    opacity: ${({ $active }) => $active ? 1 : 0.6};

    &:hover {
        opacity: 1;
        background-color: ${({ $active, theme }) => $active ? theme.primary : theme.bgAlpha};
    }

    svg { font-size: 1.1rem; }
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
