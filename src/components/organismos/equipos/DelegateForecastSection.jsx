import React, { useEffect, useState } from "react";
import { getDelegateForecast } from "../../../services/delegateTournament";
import { DelegateForecastView } from "./DelegateForecastView";

export function DelegateForecastSection({ teamId, teamName, team, tournamentId, refreshToken = 0 }) {
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState(null);
  const resourceKey = `${teamId}:${tournamentId}:${refreshToken}:${attempt}`;
  useEffect(() => {
    let active = true;
    let controller;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const data = await getDelegateForecast(teamId, { signal });
        if (active && !signal.aborted) setResource({ key: resourceKey, data });
      } catch (error) {
        if (active && !signal.aborted) setResource({ key: resourceKey, error: error.message || "No se pudo cargar el análisis." });
      }
    };
    void load();
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    const interval = window.setInterval(load, 60000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [resourceKey, teamId]);
  const loading = resource?.key !== resourceKey;
  return <DelegateForecastView loading={loading} forecast={resource?.data} error={resource?.error} teamName={teamName} team={team} onRefresh={() => setAttempt((value) => value + 1)} />;
}
