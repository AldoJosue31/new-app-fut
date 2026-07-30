"use client";

import { useReportWebVitals } from "next/web-vitals";

const MAX_BUFFERED_METRICS = 20;

const reportWebVitals = (metric) => {
  const normalizedMetric = {
    delta: metric.delta,
    id: metric.id,
    name: metric.name,
    navigationType: metric.navigationType,
    rating: metric.rating,
    value: metric.value,
  };
  const currentMetrics = Array.isArray(window.__BRACKET_WEB_VITALS__)
    ? window.__BRACKET_WEB_VITALS__
    : [];

  window.__BRACKET_WEB_VITALS__ = [
    ...currentMetrics,
    normalizedMetric,
  ].slice(-MAX_BUFFERED_METRICS);
  window.dispatchEvent(
    new CustomEvent("bracket:web-vital", { detail: normalizedMetric }),
  );
};

export function WebVitals() {
  useReportWebVitals(reportWebVitals);
  return null;
}
