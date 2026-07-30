import "server-only";

import { NextResponse } from "next/server.js";

import {
  ROUTES,
  sanitizeInternalPath,
} from "../../lib/navigation/routes.js";
import { createRouteSupabaseClient } from "./routeClient.js";

const redirectToLoginError = (requestUrl, code, description) => {
  const loginUrl = new URL(ROUTES.LOGIN, requestUrl);
  loginUrl.searchParams.set("error", code || "oauth_error");
  if (description) {
    loginUrl.searchParams.set("error_description", description);
  }

  const response = NextResponse.redirect(loginUrl, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};

export const createAuthCallbackHandler = ({
  createClient = createRouteSupabaseClient,
} = {}) => {
  return async function handleAuthCallback(request) {
    const requestUrl = new URL(request.url);
    const providerError =
      requestUrl.searchParams.get("error") ||
      requestUrl.searchParams.get("error_code");
    const errorDescription =
      requestUrl.searchParams.get("error_description");

    if (providerError) {
      return redirectToLoginError(
        requestUrl,
        providerError,
        errorDescription,
      );
    }

    const code = requestUrl.searchParams.get("code");
    if (!code) {
      return redirectToLoginError(
        requestUrl,
        "missing_code",
        "No se recibio el codigo de autenticacion.",
      );
    }

    const destination = sanitizeInternalPath(
      requestUrl.searchParams.get("next"),
      ROUTES.DASHBOARD,
    );
    const response = NextResponse.redirect(
      new URL(destination, requestUrl),
      303,
    );
    const supabase = createClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectToLoginError(
        requestUrl,
        "code_exchange_failed",
        "No fue posible completar el inicio de sesion.",
      );
    }

    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
};
