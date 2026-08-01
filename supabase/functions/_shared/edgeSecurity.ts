const DEFAULT_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-request-id";
const DEFAULT_ALLOWED_METHODS = "POST, OPTIONS";

export type EnvironmentReader = (name: string) => string | undefined;

type CorsOptions = {
  exposeHeaders?: string;
  getEnv?: EnvironmentReader;
};

export type CorsDecision = {
  allowed: boolean;
  headers: Record<string, string>;
};

const readEnvironment = (name: string) => Deno.env.get(name);

const configuredOrigins = (getEnv: EnvironmentReader) =>
  new Set(
    String(getEnv("EDGE_ALLOWED_ORIGINS") || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

export const resolveCors = (
  req: Request,
  options: CorsOptions = {},
): CorsDecision => {
  const getEnv = options.getEnv || readEnvironment;
  const origin = req.headers.get("Origin");
  const allowedOrigins = configuredOrigins(getEnv);
  const wildcardEnabled = allowedOrigins.has("*");
  const allowed = !origin || wildcardEnabled || allowedOrigins.has(origin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": DEFAULT_ALLOWED_METHODS,
    "Vary": "Origin",
  };

  if (options.exposeHeaders) {
    headers["Access-Control-Expose-Headers"] = options.exposeHeaders;
  }
  if (origin && allowed) {
    headers["Access-Control-Allow-Origin"] = wildcardEnabled ? "*" : origin;
  }

  return { allowed, headers };
};

export const corsJsonResponse = (
  cors: CorsDecision,
  body: unknown,
  status = 200,
  headers: HeadersInit = {},
) =>
  Response.json(body, {
    status,
    headers: { ...cors.headers, ...Object.fromEntries(new Headers(headers)) },
  });

type RateLimitScope = "procesar-cedula" | "procesar-rol-juego";
type Fetcher = typeof fetch;

type RateLimitOptions = {
  scope: RateLimitScope;
  getEnv?: EnvironmentReader;
  fetcher?: Fetcher;
};

export type RateLimitDecision = {
  allowed: boolean;
  status?: number;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
};

const rejected = (
  status: number,
  error: string,
  code: string,
  headers: Record<string, string> = {},
): RateLimitDecision => ({
  allowed: false,
  status,
  body: { error, code },
  headers,
});

export const authorizeRateLimitedRequest = async (
  req: Request,
  options: RateLimitOptions,
): Promise<RateLimitDecision> => {
  const getEnv = options.getEnv || readEnvironment;
  const mode = String(getEnv("EDGE_RATE_LIMIT_MODE") || "enforce")
    .trim()
    .toLowerCase();
  if (mode === "off") return { allowed: true };

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return rejected(401, "No autorizado.", "EDGE_AUTH_REQUIRED");
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const publishableKey = getEnv("SUPABASE_ANON_KEY") ||
    getEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !publishableKey) {
    return rejected(
      500,
      "La funcion no esta configurada correctamente.",
      "EDGE_SECURITY_CONFIGURATION_ERROR",
    );
  }

  let response: Response;
  try {
    response = await (options.fetcher || fetch)(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/consume_edge_rate_limit`,
      {
        method: "POST",
        headers: {
          "apikey": publishableKey,
          "Authorization": authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_scope: options.scope }),
      },
    );
  } catch (error) {
    if (mode === "shadow") {
      console.warn("edge-rate-limit: shadow RPC failure", error);
      return { allowed: true };
    }
    return rejected(
      503,
      "No se pudo validar temporalmente el limite de solicitudes.",
      "EDGE_RATE_LIMIT_UNAVAILABLE",
      { "Retry-After": "5" },
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return rejected(
        response.status,
        response.status === 401 ? "No autorizado." : "Acceso denegado.",
        "EDGE_AUTH_REJECTED",
      );
    }
    if (mode === "shadow") {
      console.warn(
        "edge-rate-limit: shadow RPC rejection",
        JSON.stringify({ scope: options.scope, status: response.status }),
      );
      return { allowed: true };
    }
    return rejected(
      503,
      "No se pudo validar temporalmente el limite de solicitudes.",
      "EDGE_RATE_LIMIT_UNAVAILABLE",
      { "Retry-After": "5" },
    );
  }

  const payload = await response.json().catch(() => null) as
    | Array<Record<string, unknown>>
    | Record<string, unknown>
    | null;
  const result = Array.isArray(payload) ? payload[0] : payload;
  if (!result || typeof result.allowed !== "boolean") {
    if (mode === "shadow") return { allowed: true };
    return rejected(
      503,
      "El servicio de limites devolvio una respuesta invalida.",
      "EDGE_RATE_LIMIT_INVALID_RESPONSE",
      { "Retry-After": "5" },
    );
  }

  if (result.allowed || mode === "shadow") return { allowed: true };

  const retryAfter = Math.max(1, Number(result.retry_after_seconds) || 1);
  return rejected(
    429,
    "Alcanzaste el limite temporal de escaneos. Intenta de nuevo mas tarde.",
    "EDGE_RATE_LIMITED",
    { "Retry-After": String(retryAfter) },
  );
};
