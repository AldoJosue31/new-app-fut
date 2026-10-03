import { createRouteHandler } from "../../../../_lib/routeAdapter.js";
import { userRouteDependencies } from "../../../../../../src/server/api/dependencies.js";
import { createHandler } from "../../../../../../src/server/api/handlers/delegates/teamTournament.js";

const resolveQuery = async (context) => {
  const { teamId } = await context.params;
  return { teamId };
};

export const createRoute = (dependencies = userRouteDependencies) =>
  createRouteHandler(createHandler, dependencies, resolveQuery);
