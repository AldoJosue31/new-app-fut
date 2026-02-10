import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";
import { supabase } from "../supabase/supabase.config"; 
import { TorneosStandingsTab } from "../components/organismos/tabs/torneos/TorneosStandingsTab";
import { PantallaCarga } from "../components/organismos/PantallaCarga";
import { useThemeStore } from "../store/ThemeStore";
import { GlobalStyles } from "../styles/GlobalStyles";
import { v } from "../styles/variables";
import { BiLockAlt, BiErrorCircle } from "react-icons/bi"; // Iconos para el bloqueo

export const PublicStandings = () => {
  const { torneoId } = useParams();
  const { themeStyle } = useThemeStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [torneo, setTorneo] = useState(null);
  const [estadisticas, setEstadisticas] = useState([]);
  const [equipos, setEquipos] = useState([]);

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

        // --- VERIFICACIÓN DE SEGURIDAD ---
        // Si el torneo no es público, detenemos la carga y lanzamos error manual
        if (!torneoData.is_public) {
            setError("LOCKED"); // Marcador especial
            setLoading(false);
            return;
        }

        const torneoProcesado = {
            ...torneoData,
            division_nombre: torneoData.divisions?.name
        };
        setTorneo(torneoProcesado);

        // 2. Obtener Estadísticas
        const { data: statsData, error: statsError } = await supabase
          .from('estadisticas')
          .select('*')
          .eq('torneo_id', torneoId);

        if (statsError) throw statsError;
        setEstadisticas(statsData);

        // 3. Obtener Equipos
        const teamIds = statsData.map(s => s.team_id);
        
        if (teamIds.length > 0) {
            const { data: equiposData, error: equiposError } = await supabase
            .from('teams')
            .select('*')
            .in('id', teamIds);
            
            if (equiposError) throw equiposError;
            setEquipos(equiposData);
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

  // --- MANEJO DE ERRORES VISUAL ---
  if (error) {
    return (
        <ThemeProvider theme={themeStyle}>
            <GlobalStyles />
            <ErrorContainer>
                {error === "LOCKED" ? (
                    <>
                        <BiLockAlt className="icon lock" />
                        <h2>Enlace Privado</h2>
                        <p>El administrador ha desactivado el acceso público a esta tabla.</p>
                    </>
                ) : (
                    <>
                        <BiErrorCircle className="icon error" />
                        <h2>Algo salió mal</h2>
                        <p>No pudimos encontrar la tabla o el enlace es incorrecto.</p>
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
            <Subtitle>{torneo?.division_nombre || torneo?.category || "Tabla General"}</Subtitle>
        </Header>
        
        <Content>
            <TorneosStandingsTab 
                torneo={torneo}
                estadisticas={estadisticas}
                equipos={equipos}
                reglas={torneo?.config}
                isPublic={true} 
            />
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
    margin-bottom: 30px;
    margin-top: 20px;
`;

const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 1.5rem;
    color: ${({ theme }) => theme.primary};
    
    h1 {
        font-size: 24px;
        margin: 0;
    }
`;

const Subtitle = styled.p`
    color: ${({ theme }) => theme.text};
    opacity: 0.7;
    margin-top: 5px;
    font-size: 1.1rem;
    font-weight: 500;
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
    
    .icon {
        font-size: 4rem;
        margin-bottom: 20px;
        opacity: 0.8;
    }
    .lock { color: ${v.naranja}; }
    .error { color: ${v.rojo}; }

    h2 { font-size: 2rem; margin-bottom: 10px; }
    p { opacity: 0.6; font-size: 1.1rem; }
`;