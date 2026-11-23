// RPC, vistas y Edge Functions del servidor falso.
import crypto from "node:crypto";

const byId = (rows, id) => rows.find((r) => String(r.id) === String(id));

export const computeViews = (db) => {
  const jornadaById = new Map(db.jornadas.map((j) => [j.id, j]));
  const tournamentById = new Map(db.tournaments.map((t) => [t.id, t]));
  // view_goleadores
  const goals = new Map();
  for (const ev of db.match_events) {
    if (!/goal|gol/i.test(ev.event_type) || /own/.test(ev.event_type)) continue;
    const m = byId(db.matches, ev.match_id); if (!m) continue;
    const j = jornadaById.get(m.jornada_id); if (!j) continue;
    const key = `${j.tournament_id}:${ev.player_id}`;
    goals.set(key, (goals.get(key) || 0) + 1);
  }
  db.view_goleadores = [...goals.entries()].map(([key, n]) => {
    const [tid, pid] = key.split(":").map(Number);
    const p = byId(db.players, pid) || {};
    const team = byId(db.teams, p.team_id) || {};
    const t = tournamentById.get(tid) || {};
    const d = byId(db.divisions, t.division_id) || {};
    return { tournament_id: tid, player_id: pid, first_name: p.first_name, last_name: p.last_name, dorsal: p.dorsal, photo_url: p.photo_url, team_id: p.team_id, team_name: team.name, team_logo: team.logo_url, team_color: team.color, division_id: d.id, division_name: d.name, goals: n };
  });
  // view_clasificacion
  const rows = new Map();
  for (const m of db.matches) {
    if (m.status !== "Finalizado" || m.goals1 == null) continue;
    const j = jornadaById.get(m.jornada_id); if (!j) continue;
    for (const [team, gf, gc, pts] of [[m.team1_id, m.goals1, m.goals2, m.puntos1], [m.team2_id, m.goals2, m.goals1, m.puntos2]]) {
      const key = `${j.tournament_id}:${team}`;
      const r = rows.get(key) || { tournament_id: j.tournament_id, team_id: team, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
      r.pj++; r.gf += gf; r.gc += gc; r.dg = r.gf - r.gc; r.pts += pts ?? 0;
      if (gf > gc) r.pg++; else if (gf === gc) r.pe++; else r.pp++;
      rows.set(key, r);
    }
  }
  db.view_clasificacion = [...rows.values()].map((r) => {
    const team = byId(db.teams, r.team_id) || {};
    return { ...r, team_name: team.name, equipo: team.name, logo_url: team.logo_url, color: team.color, division_id: team.division_id };
  });
};

const invitationRow = (di) => ({
  id: di.id, team_id: di.team_id, token: di.token, invited_name: di.invited_name, invited_email: di.invited_email,
  invited_phone: di.metadata?.invited_phone ?? null, is_used: di.is_used, revoked_at: di.revoked_at, expires_at: di.expires_at,
  created_at: di.created_at, duration_started_at: di.duration_started_at, used_at: di.used_at, status: di.is_used ? "USED" : "ACTIVE",
});

export const rpcHandlers = {
  get_public_tournament_bundle: (db, { p_tournament_id }) => {
    computeViews(db);
    const t = byId(db.tournaments, p_tournament_id);
    if (!t) return { success: false, locked: false, message: "Torneo no encontrado." };
    if (!t.is_public) return { success: false, locked: true, message: "El acceso publico esta desactivado." };
    const d = byId(db.divisions, t.division_id) || {};
    const jornadas = db.jornadas.filter((j) => j.tournament_id === t.id).sort((a, b) => a.id - b.id);
    const jIds = new Set(jornadas.map((j) => j.id));
    const matches = db.matches.filter((m) => jIds.has(m.jornada_id)).sort((a, b) => a.id - b.id).map((m) => {
      const j = byId(db.jornadas, m.jornada_id);
      return { id: m.id, jornada_id: m.jornada_id, team1_id: m.team1_id, team2_id: m.team2_id, goals1: m.goals1, goals2: m.goals2, date: m.date, status: m.status, observations: m.observations, puntos1: m.puntos1, puntos2: m.puntos2, jornadas: { id: j.id, name: j.name, tournament_id: j.tournament_id, status: j.status } };
    });
    const teams = db.teams.filter((x) => x.division_id === t.division_id).map(({ id, name, color, logo_url, status, division_id }) => ({ id, name, color, logo_url, status, division_id }));
    const scorers = t.is_goleadores_public ? db.view_goleadores.filter((g) => g.tournament_id === t.id).sort((a, b) => b.goals - a.goals).slice(0, 20) : [];
    const mIds = new Set(matches.map((m) => m.id));
    const goal_events = t.is_goleadores_public ? db.match_events.filter((e) => mIds.has(e.match_id) && /goal|gol/i.test(e.event_type)).map((e) => {
      const p = byId(db.players, e.player_id) || {}; const m = byId(db.matches, e.match_id); const j = byId(db.jornadas, m.jornada_id);
      return { id: e.id, match_id: e.match_id, player_id: e.player_id, event_type: e.event_type, players: { id: p.id, first_name: p.first_name, last_name: p.last_name, dorsal: p.dorsal, photo_url: p.photo_url, team_id: p.team_id }, matches: { id: m.id, status: m.status, team1_id: m.team1_id, team2_id: m.team2_id, jornadas: { id: j.id, name: j.name, tournament_id: j.tournament_id } } };
    }) : [];
    return { success: true, locked: false, tournament: { id: t.id, season: t.season, category: t.category, format: t.format, points_per_win: 3, start_date: t.start_date, status: t.status, division_id: t.division_id, division_nombre: d.name, config: t.config, is_public: t.is_public, is_goleadores_public: t.is_goleadores_public }, matches, jornadas, teams, scorers, goal_events };
  },

  save_match_result_atomic: (db, { p_match_id, p_updates = {}, p_events }) => {
    const m = byId(db.matches, p_match_id);
    if (!m) throw new Error("match not found");
    Object.assign(m, p_updates, { result_revision: (m.result_revision || 0) + 1 });
    if (Array.isArray(p_events)) {
      db.match_events = db.match_events.filter((e) => String(e.match_id) !== String(p_match_id));
      let id = Math.max(0, ...db.match_events.map((e) => e.id));
      for (const ev of p_events) {
        const p = byId(db.players, ev.player_id);
        db.match_events.push({ id: ++id, match_id: m.id, player_id: Number(ev.player_id), team_id: p?.team_id ?? null, event_type: ev.event_type, created_at: new Date().toISOString() });
      }
    }
    return { match: m };
  },

  clear_tournament_results_atomic: () => ({ success: true }),

  list_delegate_invitations: (db, { p_team_id }) => ({ success: true, invitations: db.delegate_invitations.filter((d) => !p_team_id || String(d.team_id) === String(p_team_id)).map(invitationRow) }),
  create_delegate_invitation: (db, args) => {
    const now = new Date();
    const n = db.delegate_invitations.length + 1;
    const di = { id: n, team_id: Number(args.p_team_id), token: `5f0c2d1e-7a3b-4c8d-9e21-${String(600000000000 + n * 7919).padStart(12, "0")}`, invited_name: args.p_invited_name || null, invited_email: args.p_invited_email || null, metadata: { invited_phone: args.p_invited_phone || null }, is_used: false, revoked_at: null, expires_at: new Date(now.getTime() + 7 * 86400000).toISOString(), created_at: now.toISOString(), duration_started_at: now.toISOString(), used_at: null };
    db.delegate_invitations.push(di);
    return { success: true, invitation: invitationRow(di), token: di.token, ...invitationRow(di) };
  },
  update_delegate_invitation: (db) => ({ success: true }),
  revoke_delegate_invitation: (db) => ({ success: true }),
  delete_delegate_invitation: (db) => ({ success: true }),
  get_delegate_invitation: (db) => ({ success: true, invitation: { team_name: "Leones de Tlalpan", league_name: "Liga Valle Dorado", division_name: "Primera Fuerza" } }),
  submit_delegate_change_request: () => ({ success: true }),
  review_delegate_change_request: (db, { p_request_id, p_decision }) => {
    const r = byId(db.delegate_change_requests, p_request_id);
    if (r) Object.assign(r, { status: p_decision === "approve" ? "applied" : "rejected", reviewed_at: new Date().toISOString() });
    return { success: true };
  },
  unlink_team_delegate: () => ({ success: true }),
};

export const functionHandlers = {};

export const randomToken = () => crypto.randomUUID();
