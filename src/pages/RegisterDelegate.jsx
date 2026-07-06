import React from "react";
import { useParams } from "react-router-dom";
import { RegisterDelegateTemplate } from "../components/template/RegisterDelegateTemplate";

export function RegisterDelegate() {
  const { token } = useParams();
  return <RegisterDelegateTemplate token={token} />;
}
