import React, { useState } from "react";
import styled from "styled-components";
import { RiArrowRightCircleLine, RiCheckLine } from "react-icons/ri";
import {
  getTournamentAutoRedirectPreference,
  setTournamentAutoRedirectPreference,
} from "../utils/tournamentPreferences";

export function TournamentAutoRedirectPreference() {
  const [enabled, setEnabled] = useState(getTournamentAutoRedirectPreference);

  const handleToggle = () => {
    const nextValue = !enabled;
    setEnabled(nextValue);
    setTournamentAutoRedirectPreference(nextValue);
  };

  return (
    <PreferenceCard>
      <div className="preference-copy">
        <span className="preference-icon">
          <RiArrowRightCircleLine />
        </span>
        <div>
          <strong>Abrir jornadas automaticamente</strong>
          <p>Cuando exista un torneo activo, entrar directo a Jornadas desde el menu de Torneos.</p>
        </div>
      </div>

      <CheckboxButton
        type="button"
        role="checkbox"
        aria-checked={enabled}
        aria-label="Abrir jornadas automaticamente"
        onClick={handleToggle}
      >
        <span className="box" aria-hidden="true">
          <RiCheckLine />
        </span>
      </CheckboxButton>
    </PreferenceCard>
  );
}

const PreferenceCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bgtotal};

  .preference-copy {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .preference-icon {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.bg6};
    font-size: 1.25rem;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.text};
    font-size: 0.94rem;
    font-weight: 800;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colorSubtitle};
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.35;
  }

  @media (max-width: 520px) {
    align-items: flex-start;
  }
`;

const CheckboxButton = styled.button`
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;

  .box {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 2px solid ${({ theme }) => theme.bg4};
    color: transparent;
    background: ${({ theme }) => theme.bgcards};
    transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  }

  &[aria-checked="true"] .box {
    border-color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.primary};
    color: #fff;
  }

  &:focus-visible .box {
    outline: 3px solid ${({ theme }) => theme.bg6};
    outline-offset: 2px;
  }

  &:hover .box {
    transform: translateY(-1px);
  }
`;
