import React from "react";
import { PartidosTemplate } from "../components/template/PartidosTemplate";

export function Partidos({ state, setState }) {
  return <PartidosTemplate state={state} setState={setState} />;
}