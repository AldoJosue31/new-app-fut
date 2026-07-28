import { createRouteHandler } from "../../../_lib/routeAdapter.js";
import { adminRouteDependencies } from "../../../../../src/server/api/dependencies.js";
import { createHandler } from "../../../../../src/server/api/handlers/admin/managers/limits.js";

export const createRoute = (dependencies = adminRouteDependencies) =>
  createRouteHandler(createHandler, dependencies);
