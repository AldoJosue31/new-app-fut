import type { EnvironmentReader, RateLimitDecision } from "../_shared/edgeSecurity.ts";

export class ScanRequestError extends Error {
  constructor(readonly decision: RateLimitDecision) {
    super(String(decision.body?.error || "La solicitud no pudo autorizarse."));
  }
}

/** Una lectura consume una cuota aunque necesite Vision y despues Gemini. */
export const createScanQuotaGate = (consume: () => Promise<RateLimitDecision>) => {
  let pending: Promise<void> | undefined;
  return () => pending ||= Promise.resolve().then(async () => {
    const decision = await consume();
    if (!decision.allowed) throw new ScanRequestError(decision);
  });
};

const reject = (status: number, error: string, code: string, retryAfterSeconds?: number): never => {
  throw new ScanRequestError({
    allowed: false, status,
    body: { error, code, retryable: Boolean(retryAfterSeconds), ...(retryAfterSeconds ? { retryAfterSeconds } : {}) },
    headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {},
  });
};

/** Valida firma, RLS y perfil activo antes de consultar resultados privados. */
export const authorizeScanRequest = async (req: Request, options: {
  getEnv?: EnvironmentReader;
  fetcher?: typeof fetch;
} = {}): Promise<string> => {
  const getEnv = options.getEnv || (name => Deno.env.get(name));
  const authorization = req.headers.get("Authorization") || "";
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && authorization === `Bearer ${serviceKey}`) return "service_role";
  if (!authorization.startsWith("Bearer ")) return reject(401, "Inicia sesion para escanear la cedula.", "EDGE_AUTH_REQUIRED");

  let actor = "";
  let serviceRoleToken = false;
  try {
    const encoded = authorization.slice(7).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
    actor = String(claims.sub || "");
    serviceRoleToken = claims.role === "service_role";
  } catch { /* El sub se usa como filtro; PostgREST valida la firma y RLS. */ }
  if (!serviceRoleToken && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor)) {
    return reject(401, "La sesion no es valida. Inicia sesion nuevamente.", "EDGE_AUTH_REJECTED");
  }
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_ANON_KEY") || getEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return reject(500, "La funcion no esta configurada correctamente.", "EDGE_SECURITY_CONFIGURATION_ERROR");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await (options.fetcher || fetch)(
      // Las claves JWT de servicio heredadas no siempre coinciden con el
      // secreto actual. PostgREST debe validar su firma antes de aceptarlas;
      // limit=0 evita leer perfiles o confiar solo en el claim del JWT.
      `${url.replace(/\/$/, "")}/rest/v1/profiles?${serviceRoleToken
        ? "select=id&limit=0"
        : `select=id,is_suspended,is_deleted&id=eq.${encodeURIComponent(actor)}&limit=1`}`,
      { headers: { apikey: key, Authorization: authorization }, signal: controller.signal },
    );
    if ([401, 403].includes(response.status)) return reject(response.status, "Tu sesion no tiene acceso al escaner.", "EDGE_AUTH_REJECTED");
    if (!response.ok) return reject(503, "No se pudo validar tu sesion. Intenta nuevamente en unos segundos.", "EDGE_AUTH_UNAVAILABLE", 5);
    const result = await response.json();
    if (!Array.isArray(result)) return reject(503, "No se pudo validar tu sesion. Intenta nuevamente en unos segundos.", "EDGE_AUTH_UNAVAILABLE", 5);
    if (serviceRoleToken) return "service_role";
    const profile = result[0];
    if (profile?.id !== actor || profile.is_suspended || profile.is_deleted) {
      return reject(403, "Tu cuenta no tiene acceso al escaner.", "EDGE_AUTH_REJECTED");
    }
    return actor;
  } catch (error) {
    if (error instanceof ScanRequestError) throw error;
    return reject(503, "No se pudo validar tu sesion. Intenta nuevamente en unos segundos.", "EDGE_AUTH_UNAVAILABLE", 5);
  } finally {
    clearTimeout(timer);
  }
};
