import { createRouteHandler } from "../../_lib/routeAdapter.js";
import { delegateRouteDependencies } from "../../../../src/server/api/dependencies.js";
import { createHandler } from "../../../../src/server/api/handlers/delegates/unlink.js";

export const createRoute = (dependencies = delegateRouteDependencies) =>
  createRouteHandler(createHandler, dependencies);
