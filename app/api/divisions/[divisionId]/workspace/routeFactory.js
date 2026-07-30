import { createRouteHandler } from "../../../_lib/routeAdapter.js";
import { userRouteDependencies } from "../../../../../src/server/api/dependencies.js";
import { createHandler } from "../../../../../src/server/api/handlers/divisions/workspace.js";

const resolveQuery = async (context) => {
  const { divisionId } = await context.params;
  return { divisionId };
};

export const createRoute = (dependencies = userRouteDependencies) =>
  createRouteHandler(createHandler, dependencies, resolveQuery);
