"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Equipos } from "../../views/Equipos.jsx";
import {
  parseTeamsPathname,
  sanitizeTeamDetailView,
} from "../../lib/navigation/teamRoutes.js";

export default function TeamsPageClient({
  initialView,
  routeDivisionId,
  setState,
  state,
  teamId,
}) {
  const pathname = usePathname() || "/equipos";
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeFromPathname = useMemo(
    () => parseTeamsPathname(pathname),
    [pathname],
  );
  const [clientRouteOverride, setClientRouteOverride] = useState(null);
  const browserHref =
    typeof window === "undefined"
      ? ""
      : `${window.location.pathname}${window.location.search}`;
  const isClientRouteOverrideCurrent =
    clientRouteOverride?.href === browserHref;
  const clientRoute = isClientRouteOverrideCurrent
    ? clientRouteOverride.route
    : routeFromPathname;
  const clientInitialView = isClientRouteOverrideCurrent
    ? clientRouteOverride.initialView
    : sanitizeTeamDetailView(searchParams.get("view"));
  const navigate = useCallback(
    (
      href,
      {
        clientOnly = false,
        preventScrollReset = false,
        replace = false,
      } = {},
    ) => {
      if (clientOnly && typeof window !== "undefined") {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const nextHref = `${url.pathname}${url.search}${url.hash}`;
        const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (nextHref === currentHref) return;

        const route = parseTeamsPathname(url.pathname);
        setClientRouteOverride({
          href: `${url.pathname}${url.search}`,
          initialView: sanitizeTeamDetailView(url.searchParams.get("view")),
          route,
        });
        const historyMethod = replace ? "replaceState" : "pushState";
        const nativeHistoryMethod =
          window.History?.prototype?.[historyMethod];

        if (nativeHistoryMethod) {
          nativeHistoryMethod.call(window.history, null, "", nextHref);
        } else {
          window.history[historyMethod](null, "", nextHref);
        }
        if (!preventScrollReset) {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
        return;
      }

      const options = { scroll: !preventScrollReset };
      setClientRouteOverride(null);

      if (replace) {
        router.replace(href, options);
      } else {
        router.push(href, options);
      }
    },
    [router],
  );

  return (
    <Equipos
      routeDivisionId={
        clientRoute ? clientRoute.routeDivisionId : routeDivisionId
      }
      teamId={clientRoute?.teamId ?? teamId}
      initialView={clientRoute ? clientInitialView : initialView}
      navigate={navigate}
      setState={setState}
      state={state}
    />
  );
}
