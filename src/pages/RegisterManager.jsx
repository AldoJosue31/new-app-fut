import React from "react";
import { useParams } from "react-router-dom";
import { RegisterManagerTemplate } from "../components/template/RegisterManagerTemplate";

export function RegisterManager() {
  const { token } = useParams(); // Captura el token de la URL: /invitation/:token
  return <RegisterManagerTemplate token={token} />;
}