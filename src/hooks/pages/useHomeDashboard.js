import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabase.config';
import { UserAuth } from '../../context/AuthContent';

export const useHomeDashboard = () => {
    const { user } = UserAuth();
    const [stats, setStats] = useState({
        divisiones: [],
        totalTeams: 0,
        activeTournaments: 0
    });
    // Iniciamos en true para asegurar que la UI espere la carga inicial
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true; // Bandera para evitar setState en componente desmontado

        // Si no hay usuario aún (ej. recarga de página), esperamos.
        // El AuthContext eventualmente proveerá el usuario o null.
        if (!user) {
            return;
        }

        const fetchDashboardData = async () => {
            try {
                // Solo activamos loading si vamos a hacer una nueva petición
                setLoading(true);

                // PASO 1: Obtener Divisiones y contar equipos
                const { data: divisionsData, error: divError } = await supabase
                    .from('divisions')
                    .select('*, leagues!inner(owner_id), teams(count)')
                    .eq('leagues.owner_id', user.id);

                if (divError) throw divError;

                // Si no hay divisiones, terminamos rápido
                if (!divisionsData || divisionsData.length === 0) {
                    if (isMounted) {
                        setStats({
                            divisiones: [],
                            totalTeams: 0,
                            activeTournaments: 0
                        });
                    }
                    return; // El finally se encargará del loading(false)
                }

                const divisionIds = divisionsData.map(d => d.id);
                let activeTournamentsData = [];
                let activeJornadasData = [];

                // PASO 2: Obtener Torneos Activos
                const { data: tournaments, error: tourError } = await supabase
                    .from('tournaments')
                    .select('id, season, division_id, status') 
                    .in('division_id', divisionIds)
                    .in('status', ['En Curso', 'Activo', 'Ongoing']); 

                if (!tourError && tournaments) {
                    activeTournamentsData = tournaments;

                    // PASO 3: Obtener Jornadas de esos torneos
                    const tournamentIds = tournaments.map(t => t.id);
                    if (tournamentIds.length > 0) {
                        const { data: jornadas, error: jError } = await supabase
                            .from('jornadas')
                            .select('name, status, tournament_id')
                            .in('tournament_id', tournamentIds)
                            .in('status', ['En Curso', 'Pendiente'])
                            .order('id', { ascending: true });
                        
                        if (!jError && jornadas) {
                            activeJornadasData = jornadas;
                        }
                    }
                }

                // PASO 4: Unir y procesar los datos
                const processedDivisions = divisionsData.map(div => {
                    const activeTournament = activeTournamentsData.find(t => t.division_id === div.id);
                    
                    let activeJornadaInfo = null;

                    if (activeTournament) {
                        const torneoJornadas = activeJornadasData.filter(j => j.tournament_id === activeTournament.id);
                        // Prioridad: En curso -> Pendiente -> Primera disponible
                        const currentJornada = torneoJornadas.find(j => j.status === 'En Curso') || torneoJornadas[0];

                        activeJornadaInfo = {
                            name: activeTournament.season || "Torneo Actual", 
                            jornada: currentJornada ? currentJornada.name : 'Iniciando...',
                            status: activeTournament.status
                        };
                    }

                    return {
                        ...div,
                        teamCount: div.teams ? div.teams[0]?.count : 0,
                        activeTournament: activeJornadaInfo
                    };
                });

                const totalTeams = processedDivisions.reduce((acc, curr) => acc + (curr.teamCount || 0), 0);
                
                if (isMounted) {
                    setStats({
                        divisiones: processedDivisions,
                        totalTeams,
                        activeTournaments: activeTournamentsData.length
                    });
                }

            } catch (error) {
                console.error("Error fetching dashboard:", error);
                // Opcional: Podrías manejar un estado de error aquí si quisieras mostrar una UI de error
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchDashboardData();

        return () => {
            isMounted = false;
        };
    }, [user]);

    return { stats, loading, user };
};