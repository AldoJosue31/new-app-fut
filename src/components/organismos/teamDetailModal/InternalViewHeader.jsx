import React from "react";
import { RiArrowLeftLine } from "react-icons/ri";
import { BackButton, HeaderActions } from "./styles";

export function InternalViewHeader({ children, onBack }) {
  return (
    <HeaderActions>
      <BackButton onClick={onBack} type="button">
        <RiArrowLeftLine />
        <span>Volver</span>
      </BackButton>
      {children}
    </HeaderActions>
  );
}
