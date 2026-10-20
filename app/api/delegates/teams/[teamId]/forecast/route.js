import { createRoute } from "./routeFactory.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const route = createRoute();
export { route as GET, route as POST, route as PUT, route as PATCH, route as DELETE, route as OPTIONS };
