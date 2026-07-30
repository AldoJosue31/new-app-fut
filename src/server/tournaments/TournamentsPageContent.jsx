import "server-only";

import { redirect } from "next/navigation";

import TournamentsPageClient from "../../components/app/TournamentsPageClient.jsx";
import PrivatePageShell from "../../components/app/PrivatePageShell.jsx";
import {
  buildTournamentPath,
  isPositiveTournamentPathId,
  parseTournamentRoute,
} from "../../lib/navigation/tournamentRoutes.js";
import { getPrivatePageAuth } from "../auth/privatePageAccess.js";

const buildRequestedPath = ({
  divisionId,
  jornadaId,
  tab,
  tournamentOrTab,
}) => {
  const segments = [];

  if (divisionId !== undefined) {
    segments.push("division", divisionId);
  }

  segments.push("torneos", tournamentOrTab, tab, jornadaId);

  return `/${segments
    .filter(
      (segment) =>
        segment !== undefined && segment !== null && segment !== "",
    )
    .map((segment) => encodeURIComponent(String(segment)))
    .join("/")}`;
};

export default async function TournamentsPageContent({
  divisionId,
  jornadaId,
  tab,
  tournamentOrTab,
}) {
  if (
    divisionId !== undefined &&
    !isPositiveTournamentPathId(divisionId)
  ) {
    redirect("/torneos");
  }

  const tournamentRoute = parseTournamentRoute({
    jornadaId,
    tab,
    tournamentOrTab,
  });
  const requestedPath = buildRequestedPath({
    divisionId,
    jornadaId,
    tab,
    tournamentOrTab,
  });
  const canonicalPath = buildTournamentPath({
    divisionId,
    jornadaId: tournamentRoute.jornadaId,
    tab: tournamentRoute.tab,
    tournamentId: tournamentRoute.tournamentId,
  });
  const initialAuth = await getPrivatePageAuth({
    pathname: requestedPath,
    returnPath: requestedPath,
  });

  if (
    tournamentRoute.needsRouteCleanup &&
    canonicalPath !== requestedPath
  ) {
    redirect(canonicalPath);
  }

  return (
    <PrivatePageShell initialAuth={initialAuth}>
      <TournamentsPageClient
        jornadaId={jornadaId}
        routeDivisionId={divisionId}
        tab={tab}
        tournamentOrTab={tournamentOrTab}
      />
    </PrivatePageShell>
  );
}
