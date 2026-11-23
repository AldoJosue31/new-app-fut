// Servidor falso de Supabase para capturar la app con datos demo.
// Emula lo que usa la app: PostgREST (select con relaciones, filtros, orden,
// conteo, escrituras en memoria), RPC, Auth, Storage y Edge Functions.
// No se conecta a ningún servicio real.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildScenario } from "./seed.mjs";
import { rpcHandlers, functionHandlers, computeViews } from "./rpc.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MOCK_PORT || 54399);
const LOG = path.join(HERE, "out", "mock-requests.log");
fs.mkdirSync(path.dirname(LOG), { recursive: true });
fs.writeFileSync(LOG, "");

let db = buildScenario(process.env.SCENARIO || "temporada");

const log = (line) => fs.appendFileSync(LOG, line + "\n");

// ---------- utilidades ----------
const SINGULAR = {
  jornadas: "jornada", tournaments: "tournament", matches: "match", teams: "team",
  players: "player", divisions: "division", leagues: "league", categories: "category",
  profiles: "profile", referees: "referee", logos: "logo", match_events: "match_event",
};
const singular = (t) => SINGULAR[t] || t.replace(/s$/, "");
const tableForColumn = (col) => {
  const base = col.replace(/_id$/, "");
  const found = Object.entries(SINGULAR).find(([, s]) => s === base);
  if (found) return found[0];
  if (db[base + "s"]) return base + "s";
  return null;
};
// Relaciones explícitas (padre.tabla -> columna FK en el padre)
const EXPLICIT_FK = {
  "leagues.profiles": "owner_id",
  "team_delegates.profiles": "delegate_profile_id",
  "matches.referees": "referee_id",
};

const splitTop = (s, sep = ",") => {
  const out = []; let depth = 0; let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
};

const parseSelect = (sel = "*") => splitTop(sel.replace(/\s+/g, " ")).map((item) => {
  if (item === "*") return { kind: "star" };
  const m = item.match(/^(?:([\w]+):)?\s*([\w]+)(?:!([\w]+))?(?:!([\w]+))?\s*(?:\((.*)\))?$/s);
  if (!m) return { kind: "col", name: item.split("::")[0] };
  const [, alias, name, h1, h2, inner] = m;
  if (inner === undefined) {
    if (name === "*") return { kind: "star" };
    return { kind: "col", name: name.split("::")[0], alias };
  }
  const hints = [h1, h2].filter(Boolean);
  return { kind: "embed", alias, name, isInner: hints.includes("inner"), hint: hints.find((h) => h !== "inner" && h !== "left"), inner };
});

const coerce = (v) => {
  if (v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (v !== "" && !Number.isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
};
const eqLoose = (a, b) => a === b || String(a) === String(b);
const cmp = (a, b) => {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== "" && b !== "") return na - nb;
  return String(a).localeCompare(String(b));
};
const parseList = (v) => v.replace(/^\(|\)$/g, "").split(",").map((x) => coerce(x.replace(/^"|"$/g, "").trim()));

const testOp = (val, op, raw) => {
  switch (op) {
    case "eq": return eqLoose(val, coerce(raw));
    case "neq": return !eqLoose(val, coerce(raw));
    case "gt": return cmp(val, coerce(raw)) > 0;
    case "gte": return cmp(val, coerce(raw)) >= 0;
    case "lt": return cmp(val, coerce(raw)) < 0;
    case "lte": return cmp(val, coerce(raw)) <= 0;
    case "in": return parseList(raw).some((x) => eqLoose(val, x));
    case "is": return raw === "null" ? val === null || val === undefined : eqLoose(val, coerce(raw));
    case "like": case "ilike": {
      const re = new RegExp("^" + raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/%/g, ".*") + "$", op === "ilike" ? "i" : "");
      return re.test(String(val ?? ""));
    }
    case "cs": {
      try { const want = JSON.parse(raw); return Object.entries(want).every(([k, v]) => eqLoose(val?.[k], v)); } catch { return true; }
    }
    default: return true;
  }
};
const testExpr = (row, expr) => {
  // expr: "col.op.value" o "not.col.op.value" en un or=()
  const parts = expr.split(".");
  let neg = false;
  if (parts[0] === "not") { neg = true; parts.shift(); }
  const [col, op, ...rest] = parts;
  if (col === "and" || col === "or") return true;
  const r = testOp(row[col], op, rest.join("."));
  return neg ? !r : r;
};
const filterRow = (row, col, value) => {
  if (col === "or") return splitTop(value.replace(/^\(|\)$/g, "")).some((e) => testExpr(row, e));
  if (col === "and") return splitTop(value.replace(/^\(|\)$/g, "")).every((e) => testExpr(row, e));
  let neg = false; let v = value;
  if (v.startsWith("not.")) { neg = true; v = v.slice(4); }
  const i = v.indexOf(".");
  const op = v.slice(0, i); const raw = v.slice(i + 1);
  const r = testOp(row[col], op, raw);
  return neg ? !r : r;
};

// ---------- relaciones ----------
const resolveRel = (parent, name, hint) => {
  if (db[name]) {
    const target = name;
    let fk = hint && hint !== "inner" ? hint.replace(new RegExp(`^${parent}_`), "").replace(/_fkey$/, "") : null;
    if (fk && !fk.endsWith("_id") && db[fk]) fk = null;
    if (!fk && EXPLICIT_FK[`${parent}.${target}`]) fk = EXPLICIT_FK[`${parent}.${target}`];
    const sample = db[parent]?.[0] || {};
    if (fk && fk in sample) return { target, many: false, parentCol: fk };
    const guess = `${singular(target)}_id`;
    if (guess in sample || db[parent]?.some((r) => guess in r)) return { target, many: false, parentCol: guess };
    const childCol = `${singular(parent)}_id`;
    return { target, many: true, childCol };
  }
  // name es una columna: player:player_id(*)
  const t = tableForColumn(name);
  if (t) return { target: t, many: false, parentCol: name };
  return null;
};

const project = (table, rows, selItems, embedFilters) => rows.map((row) => {
  const out = {};
  for (const it of selItems) {
    if (it.kind === "star") Object.assign(out, row);
    else if (it.kind === "col") out[it.alias || it.name] = row[it.name] ?? null;
  }
  for (const it of selItems.filter((x) => x.kind === "embed")) {
    const rel = resolveRel(table, it.name, it.hint);
    const key = it.alias || it.name;
    if (!rel) { out[key] = null; continue; }
    const innerSel = parseSelect(it.inner || "*");
    let children = rel.many
      ? (db[rel.target] || []).filter((c) => eqLoose(c[rel.childCol], row.id))
      : (db[rel.target] || []).filter((c) => eqLoose(c.id, row[rel.parentCol]));
    const myFilters = embedFilters.filter((f) => f.path[0] === key);
    for (const f of myFilters.filter((f) => f.path.length === 2)) children = children.filter((c) => filterRow(c, f.path[1], f.value));
    const deeper = myFilters.filter((f) => f.path.length > 2).map((f) => ({ path: f.path.slice(1), value: f.value }));
    if (innerSel.length === 1 && innerSel[0].kind === "col" && innerSel[0].name === "count") {
      out[key] = [{ count: children.length }];
      continue;
    }
    let projected = project(rel.target, children, innerSel, deeper);
    // inner anidado
    projected = projected.filter((p) => innerSel.filter((x) => x.kind === "embed" && x.isInner).every((x) => {
      const v = p[x.alias || x.name];
      return Array.isArray(v) ? v.length > 0 : v != null;
    }));
    out[key] = rel.many ? projected : projected[0] ?? null;
  }
  return out;
});

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    try { resolve(raw ? JSON.parse(raw) : null); } catch { resolve(raw); }
  });
});

// ---------- auth ----------
const decodeJwt = (token) => {
  try { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")); } catch { return null; }
};
export const makeSession = (user) => {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 12;
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  return {
    access_token: `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: user.id, exp, role: "authenticated", aud: "authenticated", email: user.email })}.demo`,
    refresh_token: `demo-refresh-${user.id}`,
    expires_at: exp, expires_in: 3600 * 12, token_type: "bearer", user,
  };
};
const authUserFrom = (req) => {
  const h = req.headers.authorization || "";
  const tok = h.replace(/^Bearer\s+/i, "");
  const p = decodeJwt(tok);
  if (!p?.sub) return null;
  return db.__authUsers.find((u) => u.id === p.sub) || null;
};

// ---------- servidor ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Location, Preference-Applied");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  try {
    // Control del mock
    if (p === "/__scenario") {
      const fresh = await import(`./seed.mjs?t=${Date.now()}`);
      db = fresh.buildScenario(url.searchParams.get("name") || "temporada");
      log(`# scenario -> ${url.searchParams.get("name")}`);
      return send(res, 200, { ok: true });
    }
    if (p === "/__db") return send(res, 200, db[url.searchParams.get("table")] || Object.keys(db));

    // Auth
    if (p.startsWith("/auth/v1")) {
      const user = authUserFrom(req);
      if (p.endsWith("/user")) {
        log(`AUTH user ${user?.email || "anon"}`);
        return user ? send(res, 200, user) : send(res, 401, { code: 401, msg: "invalid JWT" });
      }
      if (p.endsWith("/token")) {
        const body = await readBody(req);
        let u = null;
        if (body?.refresh_token) u = db.__authUsers.find((x) => body.refresh_token === `demo-refresh-${x.id}`);
        if (body?.email) u = db.__authUsers.find((x) => x.email === body.email);
        return u ? send(res, 200, makeSession(u)) : send(res, 400, { error: "invalid_grant" });
      }
      if (p.endsWith("/logout")) return send(res, 204);
      if (p.includes("jwks")) return send(res, 200, { keys: [] });
      return send(res, 200, {});
    }

    // Storage
    if (p.startsWith("/storage/v1")) {
      const m = p.match(/\/storage\/v1\/(?:object|render\/image)\/(?:public|sign|authenticated)\/(.+)$/);
      if (m && req.method === "GET") {
        const file = path.join(HERE, "assets", "storage", decodeURIComponent(m[1]));
        if (fs.existsSync(file)) {
          const ext = path.extname(file).slice(1);
          res.writeHead(200, { "Content-Type": ext === "svg" ? "image/svg+xml" : `image/${ext}` });
          return res.end(fs.readFileSync(file));
        }
        log(`MISS storage ${p}`);
        return send(res, 404, { error: "not found" });
      }
      if (p.includes("/object/sign/")) return send(res, 200, { signedURL: p.replace("/sign/", "/public/") });
      await readBody(req);
      return send(res, 200, { Key: p, path: p });
    }

    // Functions
    if (p.startsWith("/functions/v1/")) {
      const name = p.split("/")[3];
      const body = await readBody(req);
      const h = functionHandlers[name];
      log(`FN ${name} ${h ? "" : "MISSING"}`);
      return send(res, 200, h ? h(db, body) : { success: false });
    }

    // RPC
    if (p.startsWith("/rest/v1/rpc/")) {
      const fn = p.split("/").pop();
      const args = req.method === "GET" ? Object.fromEntries(url.searchParams) : (await readBody(req)) || {};
      const h = rpcHandlers[fn];
      log(`RPC ${fn} ${JSON.stringify(args).slice(0, 160)} ${h ? "" : "MISSING"}`);
      if (!h) return send(res, 200, null);
      return send(res, 200, h(db, args, authUserFrom(req)));
    }

    // PostgREST
    if (p.startsWith("/rest/v1/")) {
      const table = p.split("/")[3];
      computeViews(db);
      if (!db[table]) { log(`MISSING table ${table} ${url.search}`); db[table] = []; }
      const params = [...url.searchParams.entries()];
      const reserved = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
      const filters = params.filter(([k]) => !reserved.has(k));
      const topFilters = filters.filter(([k]) => !k.includes("."));
      const embedFilters = filters.filter(([k]) => k.includes(".") && k !== "or" && !k.endsWith(".or")).map(([k, v]) => ({ path: k.split("."), value: v }));
      const prefer = req.headers.prefer || "";
      const wantsSingle = (req.headers.accept || "").includes("vnd.pgrst.object");
      const selItems = parseSelect(url.searchParams.get("select") || "*");

      const matching = () => db[table].filter((r) => topFilters.every(([c, v]) => filterRow(r, c, v)));

      let rows;
      if (req.method === "GET" || req.method === "HEAD") {
        rows = matching();
      } else if (req.method === "POST") {
        const body = await readBody(req);
        const list = Array.isArray(body) ? body : [body];
        const onConflict = url.searchParams.get("on_conflict");
        rows = list.map((item) => {
          if (prefer.includes("merge-duplicates") || onConflict) {
            const keys = (onConflict || "id").split(",");
            const existing = db[table].find((r) => keys.every((k) => item[k] !== undefined && eqLoose(r[k], item[k])));
            if (existing) return Object.assign(existing, item);
          }
          const id = item.id ?? (Math.max(0, ...db[table].map((r) => Number(r.id) || 0)) + 1);
          const row = { created_at: new Date().toISOString(), ...item, id };
          db[table].push(row);
          return row;
        });
        log(`WRITE insert ${table} ${list.length}`);
      } else if (req.method === "PATCH") {
        const body = await readBody(req);
        rows = matching();
        rows.forEach((r) => Object.assign(r, body));
        log(`WRITE update ${table} ${rows.length} ${JSON.stringify(body).slice(0, 120)}`);
      } else if (req.method === "DELETE") {
        rows = matching();
        db[table] = db[table].filter((r) => !rows.includes(r));
        log(`WRITE delete ${table} ${rows.length}`);
      }

      let out = project(table, rows, selItems, embedFilters);
      // filtros !inner en primer nivel
      out = out.filter((o) => selItems.filter((x) => x.kind === "embed" && x.isInner).every((x) => {
        const v = o[x.alias || x.name];
        return Array.isArray(v) ? v.length > 0 : v != null;
      }));

      const order = url.searchParams.get("order");
      if (order) {
        const keys = order.split(",").map((o) => { const [c, dir, nulls] = o.split("."); return { c, desc: dir === "desc", nulls }; });
        out.sort((a, b) => {
          for (const k of keys) {
            const r = cmp(a[k.c], b[k.c]);
            if (r) return k.desc ? -r : r;
          }
          return 0;
        });
      }
      const total = out.length;
      const offset = Number(url.searchParams.get("offset") || 0);
      const limit = url.searchParams.get("limit");
      const range = req.headers.range?.match(/(\d+)-(\d+)/);
      if (range) out = out.slice(Number(range[1]), Number(range[2]) + 1);
      else if (limit) out = out.slice(offset, offset + Number(limit));
      else if (offset) out = out.slice(offset);

      const headers = { "Content-Range": `0-${Math.max(0, out.length - 1)}/${prefer.includes("count") ? total : "*"}` };
      log(`${req.method} ${table} ${decodeURIComponent(url.search).slice(0, 220)} -> ${out.length}`);

      if (req.method === "HEAD") return send(res, 200, undefined, headers);
      if (req.method !== "GET" && !prefer.includes("return=representation")) return send(res, req.method === "POST" ? 201 : 204, undefined, headers);
      if (wantsSingle) {
        if (out.length !== 1) return send(res, 406, { code: "PGRST116", details: `The result contains ${out.length} rows`, message: "JSON object requested, multiple (or no) rows returned" }, headers);
        return send(res, 200, out[0], headers);
      }
      return send(res, req.method === "POST" ? 201 : 200, out, headers);
    }

    log(`UNKNOWN ${req.method} ${p}`);
    return send(res, 404, { error: "unknown" });
  } catch (err) {
    log(`ERROR ${req.method} ${p} ${err.stack}`);
    return send(res, 500, { message: String(err.message) });
  }
});

// Realtime: se rechaza la conexión (la app sigue sin tiempo real).
server.on("upgrade", (req, socket) => socket.destroy());
server.listen(PORT, "127.0.0.1", () => console.log(`mock-supabase en http://127.0.0.1:${PORT}`));
