import "server-only";

import { redirect } from "next/navigation";

import PrivatePageShell from "../../components/app/PrivatePageShell.jsx";
import TeamsPageClient from "../../components/app/TeamsPageClient.jsx";
import { AUTH_ROLES } from "../../lib/auth/routeAccess.js";
import {
  buildTeamsPath,
  isPositiveIntegerPathSegment,
  isTeamPathSegment,
  sanitizeTeamDetailView,
} from "../../lib/navigation/teamRoutes.js";
import { getPrivatePageAuth } from "../auth/privatePageAccess.js";

const readSingleSearchParam = (searchParams, name) => {
  const value = searchParams?.[name];
  return Array.isArray(value) ? value[0] : value;
};

export default async function TeamsPageContent({
  divisionId,
  searchParams,
  teamId,
}) {
  if (
    divisionId !== undefined &&
    !isPositiveIntegerPathSegment(divisionId)
  ) {
    redirect("/equipos");
  }

  const basePath = buildTeamsPath({ divisionId });

  if (teamId !== undefined && !isTeamPathSegment(teamId)) {
    redirect(basePath);
  }

  const resolvedSearchParams = await searchParams;
  const requestedView = readSingleSearchParam(
    resolvedSearchParams,
    "view",
  );
  const initialView = sanitizeTeamDetailView(requestedView);
  const pathname = buildTeamsPath({ divisionId, teamId });

  if (
    requestedView &&
    (!initialView || teamId === undefined || teamId === "crear")
  ) {
    redirect(pathname);
  }

  const returnPath = buildTeamsPath({
    divisionId,
    teamId,
    view: initialView,
  });
  const initialAuth = await getPrivatePageAuth({
    pathname,
    returnPath,
  });

  if (
    initialAuth.profile?.role === AUTH_ROLES.DELEGATE &&
    teamId === "crear"
  ) {
    redirect("/equipos");
  }

  return (
    <PrivatePageShell initialAuth={initialAuth}>
      <TeamsPageClient
        initialView={initialView}
        routeDivisionId={divisionId}
        teamId={teamId}
      />
    </PrivatePageShell>
  );
}
