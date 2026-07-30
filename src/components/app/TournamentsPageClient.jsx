"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Torneos } from "../../views/Torneos.jsx";
import { parseTournamentPathname } from "../../lib/navigation/tournamentRoutes.js";

export default function TournamentsPageClient({
  jornadaId,
  routeDivisionId,
  setState,
  state,
  tab,
  tournamentOrTab,
}) {
  const pathname = usePathname() || "/torneos";
  const router = useRouter();
  const routeFromPathname = useMemo(
    () => parseTournamentPathname(pathname),
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
  const visiblePathname = isClientRouteOverrideCurrent
    ? clientRouteOverride.pathname
    : pathname;
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

        setClientRouteOverride({
          href: `${url.pathname}${url.search}`,
          pathname: url.pathname,
          route: parseTournamentPathname(url.pathname),
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
    <Torneos
      jornadaId={clientRoute?.jornadaId ?? jornadaId}
      navigate={navigate}
      pathname={visiblePathname}
      routeDivisionId={clientRoute?.routeDivisionId || routeDivisionId}
      setState={setState}
      state={state}
      tab={clientRoute?.tab ?? tab}
      tournamentOrTab={clientRoute?.tournamentOrTab ?? tournamentOrTab}
    />
  );
}
