import "server-only";

import { NextResponse } from "next/server.js";
import { ROUTES } from "../../lib/navigation/routes.js";
import { createRouteSupabaseClient } from "./routeClient.js";

const recoveryResponse = (errorCode) => {
  const destination = `${ROUTES.RESET_PASSWORD}${errorCode ? `?error=${errorCode}` : ""}`;
  // A relative Location preserves the browser's origin, including localhost
  // aliases and reverse proxies, so the newly written session cookies arrive.
  const response = new NextResponse(null, { status: 303, headers: { Location: destination } });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
};

export const createPasswordRecoveryHandler = ({
  createClient = createRouteSupabaseClient,
} = {}) => async function handlePasswordRecovery(request) {
  const requestUrl = new URL(request.url);
  const params = requestUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const type = params.get("type");

  if (params.has("error") || params.has("error_code") ||
      (type && type !== "recovery") || (!tokenHash && !code)) {
    return recoveryResponse("invalid_link");
  }
  if (tokenHash && type !== "recovery") {
    return recoveryResponse("invalid_link");
  }

  try {
    const response = recoveryResponse();
    const supabase = createClient(request, response);
    // Customized email links work across devices. The code path also supports
    // the default Supabase email template with the initiating browser's PKCE cookie.
    const { data, error } = tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
      : await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.session?.user?.id) {
      const unavailable = error?.status >= 500;
      return recoveryResponse(unavailable ? "verification_unavailable" : "invalid_link");
    }
    return response;
  } catch {
    return recoveryResponse("verification_unavailable");
  }
};
