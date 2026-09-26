import React from "react";
import styled from "styled-components";
import { DEFAULT_LEAGUE_COLOR, normalizeHexColor, readableAccent } from "../../../../utils/leagueColors.js";

export function LeagueColorSettings({
  primaryColor,
  secondaryColor,
  hasSecondaryColor,
  onPrimaryChange,
  onSecondaryChange,
  isDetectingColor,
  detectionMessage,
  validationError,
  disabled,
}) {
  const fields = [
    { id: "primary", label: "Color principal", value: primaryColor, fallback: DEFAULT_LEAGUE_COLOR, change: onPrimaryChange },
    { id: "secondary", label: "Color secundario", value: hasSecondaryColor ? secondaryColor : "", fallback: "#FFFFFF", change: onSecondaryChange, optional: true },
  ];

  return (
    <ColorSettings disabled={disabled}>
      <legend>Colores de la liga</legend>
      <div className="color-fields">
        {fields.map(({ id, label, value, fallback, change, optional }) => (
          <div className="color-field" key={id}>
            <label htmlFor={`league-${id}-hex`}>{label}{optional && <span> Opcional</span>}</label>
            <div className="color-input" data-invalid={Boolean(validationError && (!optional || value) && !normalizeHexColor(value))}>
              <input
                type="color"
                aria-label={`Elegir ${label.toLowerCase()}`}
                value={normalizeHexColor(value) || fallback}
                onChange={(event) => change(event.target.value)}
              />
              <input
                id={`league-${id}-hex`}
                type="text"
                value={value}
                onChange={(event) => change(event.target.value)}
                maxLength={7}
                placeholder={optional ? "Sin color secundario" : DEFAULT_LEAGUE_COLOR}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(validationError && (!optional || value) && !normalizeHexColor(value))}
                aria-describedby={validationError ? "league-color-error" : undefined}
              />
            </div>
          </div>
        ))}
      </div>
      {isDetectingColor && <p className="color-status" role="status">Detectando color del logo…</p>}
      {!isDetectingColor && detectionMessage?.startsWith("No pudimos") && <p className="color-status" role="status">{detectionMessage}</p>}
      {validationError && <p id="league-color-error" className="color-error" role="alert">{validationError}</p>}
    </ColorSettings>
  );
}

const ColorSettings = styled.fieldset`
  margin: 0;
  padding: 0;
  min-width: 0;
  border: 0;
  color: ${({ theme }) => theme.text};
  container-type: inline-size;

  legend { padding: 0; margin-bottom: 16px; font-size: 16px; font-weight: 600; }
  .color-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  .color-field { min-width: 0; }
  .color-field > label { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; font-size: 14px; font-weight: 500; }
  .color-field > label span { color: ${({ theme }) => theme.tournamentDashboard.muted}; font-size: 12px; font-weight: 400; }
  .color-input { display: flex; align-items: center; gap: 4px; min-height: 48px; padding: 2px; border: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; border-radius: 10px; background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; }
  .color-input:hover { border-color: ${({ theme }) => theme.primary}; }
  .color-input:focus-within { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 2px; }
  .color-input[data-invalid="true"] { border-color: ${({ theme }) => theme.tournamentDashboard.metrics.danger}; }
  input[type="color"] { width: 44px; height: 44px; flex-shrink: 0; padding: 6px; border: 0; border-radius: 8px; background: transparent; cursor: pointer; }
  input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
  input[type="color"]::-webkit-color-swatch { border: 0; border-radius: 6px; }
  input[type="color"]::-moz-color-swatch { border: 0; border-radius: 6px; }
  input[type="text"] { width: 100%; min-width: 0; height: 44px; padding: 8px; border: 0; outline: 0; border-radius: 6px; background: transparent; color: ${({ theme }) => theme.text}; font: inherit; font-size: 16px; }
  input[type="text"]::placeholder { color: ${({ theme }) => theme.tournamentDashboard.muted}; font-size: 14px; }
  input:disabled { opacity: 0.5; cursor: not-allowed; }
  &:disabled .color-input:hover { border-color: ${({ theme }) => theme.tournamentDashboard.border}; }
  .color-status, .color-error { margin: 12px 0 0; font-size: 13px; line-height: 1.5; }
  .color-status { color: ${({ theme }) => theme.tournamentDashboard.muted}; }
  .color-error { color: ${({ theme }) => readableAccent(theme.tournamentDashboard.metrics.danger, theme.tournamentDashboard.surface)}; }

  @container (max-width: 440px) {
    .color-fields { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  }
`;
