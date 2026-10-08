import { createPasswordRecoveryHandler } from "../../../src/server/auth/recoveryHandler.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = createPasswordRecoveryHandler();
