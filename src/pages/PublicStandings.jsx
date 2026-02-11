import React, { useEffect, useState } from "react";
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
  const [estadisticas, setEstadisticas] = useState([]);
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

        // 2. Obtener Estadísticas (Tabla)
        const { data: statsData } = await supabase
          .from('estadisticas')
          .select('*')
          .eq('torneo_id', torneoId);
        setEstadisticas(statsData || []);

        // 3. Obtener Equipos
        const teamIds = statsData?.map(s => s.team_id) || [];
        if (teamIds.length > 0) {
            const { data: equiposData } = await supabase
            .from('teams')
            .select('*')
            .in('id', teamIds);
            setEquipos(equiposData || []);
        }

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
            <Subtitle>{torneo?.division_nombre || "Tabla General"}</Subtitle>
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
                    estadisticas={estadisticas}
                    equipos={equipos}
                    reglas={torneo?.config}
                    isPublic={true} 
                />
            )}

            {activeTab === 'goleadores' && torneo?.is_goleadores_public && (
                <GoleadoresTab 
                    torneo={torneo}
                    goleadores={goleadores}
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