"use client";

import "client-only";

import { sileo } from "sileo";
import {
  createNotificationOptions,
  normalizeNotificationType,
} from "./policy.js";

const send = (type, message, options = {}) => {
  const notification = createNotificationOptions(type, message, options);
  const { type: normalizedType, ...sileoOptions } = notification;

  return sileo[normalizedType](sileoOptions);
};

export const notify = Object.freeze({
  success: (message, options) => send("success", message, options),
  error: (message, options) => send("error", message, options),
  warning: (message, options) => send("warning", message, options),
  info: (message, options) => send("info", message, options),
  show: (message, options = {}) =>
    send(normalizeNotificationType(options.type), message, options),
  dismiss: (id) => sileo.dismiss(id),
  clear: (position) => sileo.clear(position),
});
