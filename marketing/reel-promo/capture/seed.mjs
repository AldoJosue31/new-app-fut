// Datos demo para las capturas. Todo es ficticio: liga, equipos, jugadores, teléfonos.
// Determinista: mismo resultado en cada arranque.

const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const MANAGER = {
  id: "00000000-0000-4000-8000-0000000000a1",
  email: "organizador@valledorado.demo",
  full_name: "Organización Valle Dorado",
};
export const DELEGATE = {
  id: "00000000-0000-4000-8000-0000000000d1",
  email: "delegado.leones@valledorado.demo",
  full_name: "Ricardo Salinas",
};

const TEAMS = [
  // id, nombre, color, delegado, fuerza (solo para generar resultados verosímiles)
  [101, "Atlético San Isidro", "#C62828", "Javier Montoya", 0.78],
  [102, "Deportivo Colonia Norte", "#1565C0", "Martín Reséndiz", 0.62],
  [103, "Real Cuauhtémoc FC", "#6A1B9A", "Ernesto Valdivia", 0.7],
  [104, "Leones de Tlalpan", "#F9A825", "Ricardo Salinas", 0.74],
  [105, "Unión Santa Fe", "#2E7D32", "Hugo Cárdenas", 0.55],
  [106, "Racing Coyoacán", "#00838F", "Óscar Villaseñor", 0.66],
  [107, "Obreros Unidos", "#6D4C41", "Raúl Peña", 0.42],
  [108, "Sporting Las Palmas", "#EF6C00", "Iván Becerra", 0.58],
  [109, "Inter Xochimilco", "#283593", "Fernando Lugo", 0.5],
  [110, "Dinamo Tepeyac", "#AD1457", "Sergio Arriaga", 0.36],
];
const TEAMS_2 = [
  [201, "Halcones de Iztapalapa", "#37474F", "Pedro Cano"],
  [202, "Juventud Mixcoac", "#00695C", "Luis Ortega"],
  [203, "Club Ajusco", "#5D4037", "Alan Ríos"],
  [204, "Estrella Roja Tacuba", "#B71C1C", "Mario Pineda"],
  [205, "Deportivo Olivar", "#33691E", "Andrés Solís"],
  [206, "Santa Úrsula FC", "#4A148C", "Tomás Ibarra"],
];

const FIRST = ["Luis", "Carlos", "Jorge", "Miguel", "Diego", "Alejandro", "Fernando", "Ricardo", "Eduardo", "Andrés", "Kevin", "Brandon", "Emiliano", "Santiago", "Iván", "Rodrigo", "Daniel", "Héctor", "Raúl", "Omar", "Erick", "Gerardo", "Alan", "Uriel", "Jesús", "Ángel", "Bryan", "Mauricio", "Arturo", "Cristian"];
const LAST = ["Hernández", "García", "Martínez", "López", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Cruz", "Flores", "Gómez", "Morales", "Vázquez", "Jiménez", "Reyes", "Díaz", "Torres", "Gutiérrez", "Ruiz", "Mendoza", "Aguilar", "Ortiz", "Castillo", "Romero", "Álvarez", "Chávez", "Ramos", "Medina", "Vargas", "Rojas", "Herrera", "Navarro", "Domínguez", "Salazar", "Cortés", "Guerrero", "Estrada", "Fuentes", "Mejía"];
const POS = ["Portero", "Defensa", "Defensa", "Defensa", "Defensa", "Medio", "Medio", "Medio", "Medio", "Delantero", "Delantero", "Delantero", "Medio", "Defensa", "Portero", "Delantero"];
const DORSAL = [1, 2, 4, 5, 3, 6, 8, 10, 14, 9, 11, 7, 16, 13, 12, 19];

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

const roundRobin = (ids) => {
  const list = [...ids];
  if (list.length % 2) list.push(null);
  const n = list.length; const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i], b = list[n - 1 - i];
      if (a && b) pairs.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop());
  }
  return rounds;
};

export const buildScenario = (name = "temporada") => {
  const rand = rng(20261122);
  const now = new Date().toISOString();
  const profiles = [
    { id: MANAGER.id, email: MANAGER.email, full_name: MANAGER.full_name, role: "manager", is_suspended: false, is_deleted: false, avatar_url: null, metadata: {}, created_at: "2026-01-10T00:00:00Z", max_divisions_total: 10, max_teams_total: 200, max_players_total: 5000 },
    { id: DELEGATE.id, email: DELEGATE.email, full_name: DELEGATE.full_name, role: "delegate", is_suspended: false, is_deleted: false, avatar_url: null, metadata: {}, created_at: "2026-08-01T00:00:00Z" },
  ];
  const authUser = (p) => ({ id: p.id, aud: "authenticated", role: "authenticated", email: p.email, app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: p.full_name }, identities: [], created_at: p.created_at, email_confirmed_at: p.created_at });

  const leagueDefault = { minPlayers: 7, maxPlayers: 25, maxTeams: 20, winPoints: 3, drawPoints: 1, lossPoints: 0, tieBreakType: "penalties", horaInicio: "08:00", horaFin: "18:00", jornadaDurationDays: 7, minutosPorTiempo: 40, minutosDescanso: 10, cambios: "Ilimitados", observaciones: "Empate: tanda de 5 penales, el ganador suma 1 punto extra." };
  const leagues = [{ id: 7, name: "Liga Valle Dorado", owner_id: MANAGER.id, logo_url: null, original_logo_url: null, primary_color: "#F2B705", secondary_color: "#0E2A47", delegate_changes_require_approval: true, default_config: leagueDefault, created_at: "2026-01-10T00:00:00Z" }];
  const categories = [{ id: 1, name: "Libre Varonil", league_id: 7 }];
  const divisions = [
    { id: 94, name: "Primera Fuerza", league_id: 7, tier: 1, category_id: 1, created_at: "2026-01-10T00:00:00Z" },
    { id: 95, name: "Segunda Fuerza", league_id: 7, tier: 2, category_id: 1, created_at: "2026-01-10T00:00:00Z" },
  ];
  const teams = [
    ...TEAMS.map(([id, n, color, del], i) => ({ id, name: n, color, division_id: 94, delegate_name: del, contact_phone: `55 ${4100 + i * 37} ${2200 + i * 113}`, status: "Activo", logo_url: null, original_logo_url: null, created_at: "2026-07-20T00:00:00Z" })),
    ...TEAMS_2.map(([id, n, color, del], i) => ({ id, name: n, color, division_id: 95, delegate_name: del, contact_phone: `55 ${5200 + i * 41} ${3300 + i * 97}`, status: "Activo", logo_url: null, original_logo_url: null, created_at: "2026-07-20T00:00:00Z" })),
  ];
  const strength = Object.fromEntries(TEAMS.map((t) => [t[0], t[4]]));

  let pid = 1000;
  const players = [];
  teams.forEach((t, ti) => {
    const used = new Set();
    for (let k = 0; k < 16; k++) {
      let full;
      do {
        full = [FIRST[Math.floor(rand() * FIRST.length)], LAST[Math.floor(rand() * LAST.length)], LAST[Math.floor(rand() * LAST.length)]];
      } while (used.has(full.join()));
      used.add(full.join());
      players.push({ id: ++pid, team_id: t.id, first_name: full[0], last_name: `${full[1]} ${full[2]}`, dorsal: DORSAL[k], position: POS[k], is_active: true, photo_url: null, curp: null, birth_date: null, created_at: "2026-07-21T00:00:00Z" });
    }
  });

  const referees = [
    { id: 1, league_id: 7, name: "Arturo Bermúdez", phone: "55 3011 4420", is_active: true },
    { id: 2, league_id: 7, name: "Gabriel Montes", phone: "55 3011 7781", is_active: true },
    { id: 3, league_id: 7, name: "Sofía Tapia", phone: null, is_active: true },
  ];

  // ---------- Torneo Primera Fuerza ----------
  const participatingIds = TEAMS.map((t) => t[0]);
  const playedRounds = name === "temporada" ? 7 : 9;
  const tConfig = {
    participatingIds, vueltas: "1", jornadaDurationDays: 7,
    minPlayers: 7, maxPlayers: 25, maxTeams: 20,
    winPoints: 3, drawPoints: 1, lossPoints: 0, tieBreakType: "normal",
    ascensos: 0, descensos: 1,
    zonaLiguilla: true, clasificados: 8, hasRepechaje: false, repechajeTeams: 0,
    playoffReseed: true, playoffTieBreaker: "bestSeed",
    repechajeLegs: "single", playoffLegsRound32: "single", playoffLegsRound16: "single",
    playoffLegsQuarterfinals: "double", playoffLegsSemifinals: "double", playoffLegsFinal: "double",
    countGoalsPlayoffs: true, countGoalsRepechaje: false,
    horaInicio: "08:00", horaFin: "18:00", minutosPorTiempo: 40, minutosDescanso: 10, cambios: "Ilimitados", observaciones: "",
  };
  const tournaments = [
    { id: 123, division_id: 94, season: "Apertura 2026", category: "Libre Varonil", format: "liga", status: "Activo", start_date: name === "temporada" ? "2026-10-03" : "2026-09-19", end_date: null, is_public: true, is_goleadores_public: true, config: tConfig, created_at: "2026-08-20T00:00:00Z" },
    { id: 124, division_id: 95, season: "Apertura 2026", category: "Libre Varonil", format: "liga", status: "Activo", start_date: "2026-10-25", end_date: null, is_public: true, config: { ...tConfig, participatingIds: TEAMS_2.map((t) => t[0]), zonaLiguilla: false }, created_at: "2026-08-20T00:00:00Z" },
  ];

  const jornadas = []; const matches = []; const match_events = [];
  let jid = 4500, mid = 9000, eid = 70000;
  const playersOf = (teamId) => players.filter((p) => p.team_id === teamId);
  const pickScorer = (teamId) => {
    const pool = playersOf(teamId);
    const weights = pool.map((p) => (p.position === "Delantero" ? 6 : p.position === "Medio" ? 3 : p.position === "Defensa" ? 1 : 0.05));
    // dos goleadores destacados por equipo
    weights[9] *= 2.2; weights[7] *= 1.6;
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[9];
  };
  const goalsFor = (s, o) => {
    const lambda = 0.6 + 2.4 * s - 1.1 * o + 0.8;
    let g = 0; let L = Math.exp(-Math.max(0.3, lambda)); let p = 1;
    do { g++; p *= rand(); } while (p > L);
    return Math.min(g - 1, 6);
  };

  const buildTournament = (t, ids, rounds, played, startISO) => {
    const start = new Date(`${startISO}T00:00:00Z`);
    rounds.forEach((pairs, r) => {
      const jStart = addDays(start, r * 7);
      const status = r < played ? "Finalizada" : r === played ? "Confirmada" : "Pendiente";
      const j = { id: ++jid, tournament_id: t.id, name: `Jornada ${r + 1}`, status, start_date: isoDate(jStart), end_date: isoDate(addDays(jStart, 6)), created_at: now };
      jornadas.push(j);
      pairs.forEach(([a, b], k) => {
        const day = k < 3 ? 0 : 1; // sábado / domingo
        const hour = [9, 11, 13][k % 3];
        const date = `${isoDate(addDays(jStart, day))}T${pad(hour)}:00:00`;
        const m = { id: ++mid, jornada_id: j.id, team1_id: a, team2_id: b, date, status: "Programado", goals1: null, goals2: null, puntos1: null, puntos2: null, observations: null, referee_id: (k % 3) + 1, mvp_player_id: null, result_revision: 0, created_at: now };
        if (r < played) {
          const sa = strength[a] ?? 0.5, sb = strength[b] ?? 0.5;
          const g1 = goalsFor(sa, sb), g2 = goalsFor(sb, sa);
          Object.assign(m, { status: "Finalizado", goals1: g1, goals2: g2, puntos1: g1 > g2 ? 3 : g1 === g2 ? 1 : 0, puntos2: g2 > g1 ? 3 : g1 === g2 ? 1 : 0, result_revision: 1 });
          for (let x = 0; x < g1; x++) { const s = pickScorer(a); match_events.push({ id: ++eid, match_id: m.id, player_id: s.id, team_id: a, event_type: "goal", minute: 3 + Math.floor(rand() * 75), created_at: now }); }
          for (let x = 0; x < g2; x++) { const s = pickScorer(b); match_events.push({ id: ++eid, match_id: m.id, player_id: s.id, team_id: b, event_type: "goal", minute: 3 + Math.floor(rand() * 75), created_at: now }); }
          for (const tid of [a, b]) for (const pl of playersOf(tid).slice(0, 13)) match_events.push({ id: ++eid, match_id: m.id, player_id: pl.id, team_id: tid, event_type: "participation", created_at: now });
          if (rand() < 0.7) { const pl = playersOf(rand() < 0.5 ? a : b)[1 + Math.floor(rand() * 8)]; match_events.push({ id: ++eid, match_id: m.id, player_id: pl.id, team_id: pl.team_id, event_type: "yellow_card", minute: 10 + Math.floor(rand() * 70), created_at: now }); }
          if (rand() < 0.12) { const pl = playersOf(rand() < 0.5 ? a : b)[2 + Math.floor(rand() * 6)]; match_events.push({ id: ++eid, match_id: m.id, player_id: pl.id, team_id: pl.team_id, event_type: "red_card", minute: 50 + Math.floor(rand() * 30), created_at: now }); }
        }
        matches.push(m);
      });
    });
  };
  buildTournament(tournaments[0], participatingIds, roundRobin(participatingIds), playedRounds, name === "temporada" ? "2026-10-03" : "2026-09-19");
  buildTournament(tournaments[1], TEAMS_2.map((t) => t[0]), roundRobin(TEAMS_2.map((t) => t[0])), 3, "2026-10-25");

  const team_delegates = [{ team_id: 104, delegate_profile_id: DELEGATE.id, assigned_at: "2026-08-02T00:00:00Z", assigned_by: MANAGER.id }];
  const delegate_invitations = [];
  const delegate_change_requests = [
    { id: 1, team_id: 104, delegate_profile_id: DELEGATE.id, request_type: "player_create", status: "pending", payload: { first_name: "Emiliano", last_name: "Rosas Delgado", dorsal: 21, position: "Medio" }, created_at: "2026-11-18T19:20:00Z", reviewed_at: null, applied_at: null, review_notes: null },
  ];

  return {
    __authUsers: profiles.map(authUser),
    profiles, leagues, categories, divisions, teams, players, referees,
    tournaments, jornadas, matches, match_events,
    team_delegates, delegate_invitations, delegate_change_requests,
    league_admins: [], manager_invitations: [], logos: [],
    account_security_notifications: [], delegate_account_audit_logs: [],
    landing_public_metrics: [{ leagues_count: 1, teams_count: 16, players_count: 256, matches_count: 60 }],
    view_clasificacion: [], view_goleadores: [],
  };
};
