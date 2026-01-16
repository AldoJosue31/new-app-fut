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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // PASO 1: Obtener Divisiones y contar equipos
                const { data: divisionsData, error: divError } = await supabase
                    .from('divisions')
                    .select('*, leagues!inner(owner_id), teams(count)')
                    .eq('leagues.owner_id', user.id);

                if (divError) throw divError;

                const divisionIds = divisionsData.map(d => d.id);
                let activeTournamentsData = [];
                let activeJornadasData = [];

                if (divisionIds.length > 0) {
                    // PASO 2: Obtener Torneos
                    // CORRECCIÓN: Pedimos 'season' en lugar de 'name' que no existe en tu tabla
                    const { data: tournaments, error: tourError } = await supabase
                        .from('tournaments')
                        .select('id, season, division_id, status') 
                        .in('division_id', divisionIds)
                        .in('status', ['En Curso', 'Activo', 'Ongoing']); 

                    if (!tourError && tournaments) {
                        activeTournamentsData = tournaments;

                        // PASO 3: Obtener Jornadas
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
                }

                // PASO 4: Unir los datos
                const processedDivisions = divisionsData.map(div => {
                    const activeTournament = activeTournamentsData.find(t => t.division_id === div.id);
                    
                    let activeJornadaInfo = null;

                    if (activeTournament) {
                        const torneoJornadas = activeJornadasData.filter(j => j.tournament_id === activeTournament.id);
                        const currentJornada = torneoJornadas.find(j => j.status === 'En Curso') || torneoJornadas[0];

                        activeJornadaInfo = {
                            // Usamos la temporada como nombre del torneo
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
                
                setStats({
                    divisiones: processedDivisions,
                    totalTeams,
                    activeTournaments: activeTournamentsData.length
                });

            } catch (error) {
                console.error("Error fetching dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    return { stats, loading, user };
};