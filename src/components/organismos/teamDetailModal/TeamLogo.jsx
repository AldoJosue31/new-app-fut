import React from "react";
import { DynamicTeamLogo } from "../equipos/DynamicTeamLogo";

export function TeamLogo({ alt, club, size = "28px" }) {
  if (club?.logo_url) {
    return <img src={club.logo_url} alt={alt || club?.name || "Equipo"} />;
  }

  return (
    <DynamicTeamLogo
      name={club?.name || "Equipo"}
      color={club?.color || "#000000"}
      size={size}
    />
  );
}
