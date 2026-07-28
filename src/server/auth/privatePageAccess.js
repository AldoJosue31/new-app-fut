import "server-only";

import { redirect } from "next/navigation";

import { evaluateRouteAccess } from "../../lib/auth/routeAccess.js";
import { getServerAuthSnapshot } from "./serverAuth.js";

export const getPrivatePageAuth = async ({
  pathname,
  returnPath = pathname,
}) => {
  const auth = await getServerAuthSnapshot();
  const access = evaluateRouteAccess({
    auth,
    pathname,
    returnPath,
  });

  if (access.action === "redirect") {
    redirect(access.destination);
  }

  return auth;
};
