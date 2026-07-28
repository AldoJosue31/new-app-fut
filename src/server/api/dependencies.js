import "server-only";

import { readJsonBody, sendError } from "./httpContract.js";
import {
  requireAdmin,
  requireManager,
  requireUser,
  supabaseAdmin,
} from "./supabaseAdmin.js";

const sharedDependencies = {
  readJsonBody,
  sendError,
  supabaseAdmin,
};

export const adminRouteDependencies = Object.freeze({
  ...sharedDependencies,
  requireAdmin,
});

export const delegateRouteDependencies = Object.freeze({
  ...sharedDependencies,
  requireManager,
  requireUser,
});

export const userRouteDependencies = Object.freeze({
  ...sharedDependencies,
  requireUser,
});
