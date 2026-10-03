import { createRoute } from "./routeFactory.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const route = createRoute();

export {
  route as DELETE,
  route as GET,
  route as OPTIONS,
  route as PATCH,
  route as POST,
  route as PUT,
};
