import React from "react";
import { ConfiguracionTemplate } from "../index"; // O la ruta directa si prefieres

export function Configuracion({ state, setState }) { // <--- Recibimos props
  return <ConfiguracionTemplate state={state} setState={setState} />;
}