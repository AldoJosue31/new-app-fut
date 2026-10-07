"use client";

import { useState } from "react";
import { RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import styled from "styled-components";
import { PASSWORD_MIN_LENGTH } from "../../../lib/auth/passwordRecovery.js";
import { Field } from "./RecoveryCard.jsx";

export default function RecoveryPasswordField({ id, label, visibilityLabel = label.toLowerCase(), value, onChange, disabled, invalid, describedBy }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input id={id} name={id} className="field-input password-input"
          type={visible ? "text" : "password"} autoComplete="new-password" required
          minLength={PASSWORD_MIN_LENGTH} value={value} onChange={onChange}
          disabled={disabled} aria-invalid={invalid} aria-describedby={describedBy} />
        <VisibilityButton type="button" disabled={disabled} aria-pressed={visible}
          aria-label={`${visible ? "Ocultar" : "Mostrar"} ${visibilityLabel}`}
          onClick={() => setVisible((current) => !current)}>
          {visible ? <RiEyeOffLine aria-hidden="true" /> : <RiEyeLine aria-hidden="true" />}
        </VisibilityButton>
      </div>
    </Field>
  );
}

const VisibilityButton = styled.button`
  position: absolute; right: 3px; top: 3px; width: 44px; height: 44px;
  display: grid; place-items: center; padding: 0; border: 0; border-radius: 8px;
  background: transparent; color: var(--recovery-muted); cursor: pointer;
  svg { width: 20px; height: 20px; }
  &:hover { color: var(--recovery-link); }
  &:focus-visible { outline: 2px solid var(--recovery-link); outline-offset: 1px; }
  &:disabled { cursor: wait; }
`;
