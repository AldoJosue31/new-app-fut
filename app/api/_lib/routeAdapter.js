import "server-only";

import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PRIVATE_CACHE_CONTROL =
  "private, no-cache, no-store, must-revalidate, max-age=0";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

const hasBearerAuthorization = (request) =>
  /^Bearer\s+\S+$/i.test(request.headers.get("authorization") || "");

const hasCookieCredentials = (request) =>
  Boolean(request.headers.get("cookie"));

const getRequestOrigin = (request) => {
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
};

const getHeaderOrigin = (request) => {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
};

const isAllowedMutation = (request) => {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;
  if (hasBearerAuthorization(request)) return true;
  if (!hasCookieCredentials(request)) return true;

  const requestOrigin = getRequestOrigin(request);
  const headerOrigin = getHeaderOrigin(request);
  return Boolean(requestOrigin && headerOrigin === requestOrigin);
};

const appendVary = (headers, names) => {
  const current = (headers.get("Vary") || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const merged = [...new Set([...current, ...names])];
  headers.set("Vary", merged.join(", "));
};

const applyPrivateResponseHeaders = (headers) => {
  headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  appendVary(headers, ["Authorization", "Cookie", "Origin"]);
  return headers;
};

const applyServerTiming = (headers, startedAt) => {
  const duration = Math.max(0, performance.now() - startedAt);
  headers.set("Server-Timing", `app;dur=${duration.toFixed(1)}`);
  return headers;
};

const getRequestId = (request) => {
  const candidate = request.headers.get("x-request-id")?.trim();
  return candidate && REQUEST_ID_PATTERN.test(candidate)
    ? candidate
    : randomUUID();
};

const createResponseRecorder = (requestId) => {
  const state = {
    body: null,
    sent: false,
    statusCode: 200,
  };

  return {
    response: {
      requestId,
      status(statusCode) {
        state.statusCode = statusCode;
        return this;
      },
      json(body) {
        state.body = body;
        state.sent = true;
        return this;
      },
    },
    state,
  };
};

const toLegacyRequest = async (
  request,
  query,
  requestId,
  responseHeaders,
) => {
  const body = await request.text();

  return {
    body,
    headers: Object.fromEntries(request.headers.entries()),
    method: request.method,
    query,
    requestId,
    responseHeaders,
    url: request.url,
  };
};

export const createRouteHandler = (
  createLegacyHandler,
  dependencies,
  resolveQuery = async () => ({}),
) => {
  const legacyHandler = createLegacyHandler(dependencies);

  return async function routeHandler(request, context = {}) {
    const startedAt = performance.now();
    const responseHeaders = applyPrivateResponseHeaders(new Headers());
    const requestId = getRequestId(request);
    responseHeaders.set("X-Request-ID", requestId);

    if (!isAllowedMutation(request)) {
      applyServerTiming(responseHeaders, startedAt);
      return Response.json(
        { error: "Forbidden" },
        { headers: responseHeaders, status: 403 },
      );
    }

    const query = await resolveQuery(context);
    const legacyRequest = await toLegacyRequest(
      request,
      query,
      requestId,
      responseHeaders,
    );
    const { response, state } = createResponseRecorder(requestId);

    await legacyHandler(legacyRequest, response);
    applyServerTiming(responseHeaders, startedAt);

    if (!state.sent) {
      return Response.json(null, {
        headers: responseHeaders,
        status: state.statusCode,
      });
    }

    return Response.json(state.body, {
      headers: responseHeaders,
      status: state.statusCode,
    });
  };
};
