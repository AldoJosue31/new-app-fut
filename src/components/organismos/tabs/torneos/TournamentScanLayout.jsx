import styled from "styled-components";
import { v } from "../../../../styles/variables";

export const ScanShell = styled.section`
  --scan-inset: clamp(12px, 2vw, 20px);
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

export const ScanBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  min-width: 0;
  padding: 12px var(--scan-inset) 16px;
  overflow: auto;
  overscroll-behavior: contain;
`;

export const PanelHeading = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 0 0 auto;
  padding: 12px var(--scan-inset) 0;
  max-height: 32%;
  overflow-y: auto;

  button {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 36px;
    min-height: 36px;
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 10px;
    background: transparent;
    color: ${({ theme }) => theme.text};
    font-size: 1.1rem;
    cursor: pointer;
  }

  button:hover:not(:disabled) { background: ${({ theme }) => theme.bg3}; }
  button:disabled { opacity: 0.62; cursor: wait; }
  button:focus-visible { outline: 3px solid ${v.colorPrincipal}44; outline-offset: 2px; }
  h4, p { margin: 0; }
  h4 { font-size: 1.05rem; }
  p { margin-top: 4px; opacity: 0.72; line-height: 1.45; }

  @media (max-width: 560px) {
    button { width: 44px; min-height: 44px; }
  }
`;
