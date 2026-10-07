"use client";

import Link from "next/link";
import localFont from "next/font/local";
import { RiArrowLeftLine } from "react-icons/ri";
import styled from "styled-components";
import { ROUTES } from "../../../lib/navigation/routes.js";

const recoveryFont = localFont({
  src: [
    { path: "../../../../public/fonts/poppins/poppins-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../../../../public/fonts/poppins/poppins-latin-600.woff2", weight: "600", style: "normal" },
    { path: "../../../../public/fonts/poppins/poppins-latin-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  fallback: ["sans-serif"],
});

export function RecoveryCard({ children, onBack, backDisabled = false, backHref = ROUTES.LOGIN }) {
  return (
    <RecoveryPage className={recoveryFont.className}>
      <Frame>
        {onBack ? (
          <BackButton type="button" onClick={onBack} disabled={backDisabled}>
            <RiArrowLeftLine aria-hidden="true" /> Volver a ingresar
          </BackButton>
        ) : (
          <BackLink href={backHref}>
            <RiArrowLeftLine aria-hidden="true" /> Volver a ingresar
          </BackLink>
        )}
        <Surface>
          <Brand href={ROUTES.LANDING} aria-label="Bracket App, volver al inicio">
            <img src="/logo_app.png" width="52" height="52" alt="" />
            <span>Bracket <span>App</span></span>
          </Brand>
          {children}
        </Surface>
        <Copyright>© {new Date().getFullYear()} Bracket App</Copyright>
      </Frame>
    </RecoveryPage>
  );
}

export const RecoveryHeading = styled.h1`
  margin: 32px 0 10px;
  font-size: clamp(28px, 4vw, 32px);
  line-height: 1.2;
  letter-spacing: -0.03em;
  font-weight: 700;
  text-wrap: balance;
`;

export const RecoveryDescription = styled.p`
  margin: 0;
  color: var(--recovery-muted);
  font-size: 15px;
  line-height: 1.65;
  overflow-wrap: anywhere;
  strong { color: inherit; font-weight: 600; }
`;

export const RecoveryForm = styled.form`
  display: grid;
  gap: 20px;
  margin-top: 28px;
`;

export const Field = styled.div`
  display: grid;
  gap: 8px;
  label { font-size: 14px; line-height: 1.5; font-weight: 600; }
  .input-wrap { position: relative; }
  .field-input {
    display: block;
    width: 100%;
    min-height: 50px;
    padding: 12px 14px;
    border: 1px solid var(--recovery-border);
    border-radius: 10px;
    background: var(--recovery-input);
    color: inherit;
    font: inherit;
    font-size: 16px;
    caret-color: var(--recovery-link);
    transition: border-color 160ms ease;
  }
  .field-input::placeholder { color: var(--recovery-muted); }
  .field-input:focus-visible { outline: 2px solid var(--recovery-link); outline-offset: 2px; }
  .field-input[aria-invalid="true"] { border-color: var(--recovery-error); }
  .field-input:disabled { opacity: 0.7; }
  .password-input { padding-right: 54px; }
  .field-help { margin: 0; color: var(--recovery-muted); font-size: 13px; line-height: 1.6; }
`;

export const PrimaryAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 50px;
  padding: 12px 18px;
  border: 0;
  border-radius: 10px;
  background: ${({ theme }) => theme.primary};
  color: #062d43;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 160ms ease;
  &:hover:not(:disabled) { background: #48bef8; }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:focus-visible { outline: 2px solid var(--recovery-link); outline-offset: 4px; }
  &:disabled { opacity: 0.7; cursor: wait; }
  svg { width: 18px; height: 18px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export function PrimaryRecoveryLink({ href, children }) {
  return <PrimaryAction as={Link} href={href}>{children}</PrimaryAction>;
}

export const TextAction = styled.button`
  min-height: 44px;
  padding: 8px 4px;
  border: 0;
  background: transparent;
  color: var(--recovery-link);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-underline-offset: 4px;
  &:hover:not(:disabled) { text-decoration: underline; }
  &:focus-visible { outline: 2px solid var(--recovery-link); outline-offset: 3px; border-radius: 4px; }
  &:disabled { color: var(--recovery-muted); cursor: not-allowed; }
`;

export const RecoveryLink = styled(Link)`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 44px;
  color: var(--recovery-link);
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 4px;
  &:focus-visible { outline: 2px solid var(--recovery-link); outline-offset: 4px; border-radius: 4px; }
`;

export const InlineMessage = styled.p`
  margin: 0;
  color: ${({ $error }) => $error ? "var(--recovery-error)" : "var(--recovery-muted)"};
  font-size: 14px;
  line-height: 1.65;
`;

export const RecoveryActions = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 28px;
`;

export const RecoveryNote = styled.p`
  margin: 22px 0 0;
  color: var(--recovery-muted);
  font-size: 13px;
  line-height: 1.65;
`;

const RecoveryPage = styled.main`
  --recovery-muted: ${({ theme }) => `rgba(${theme.textRgba}, 0.76)`};
  --recovery-link: ${({ theme }) => theme.body === "#202020" ? "#69ccfa" : "#0874a8"};
  --recovery-border: ${({ theme }) => theme.body === "#202020" ? "#607f8e" : "#768b9d"};
  --recovery-input: ${({ theme }) => theme.bgtotal};
  --recovery-error: ${({ theme }) => theme.body === "#202020" ? "#ffa399" : "#b3261e"};
  min-height: 100dvh;
  display: grid;
  align-items: center;
  padding: 40px 20px;
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  ::selection { background: ${({ theme }) => theme.primary}; color: #062d43; }
  @media (max-width: 480px) { padding-block: 24px; }
`;

const Frame = styled.div`width: 100%; max-width: 448px; margin: 0 auto;`;
const backStyles = `
  display: inline-flex; align-items: center; gap: 8px; min-height: 44px;
  margin: 0 0 14px; padding: 8px 0; color: var(--recovery-muted);
  font: inherit; font-size: 14px; text-decoration: none;
`;
const BackLink = styled(Link)`
  ${backStyles}
  &:hover { color: var(--recovery-link); }
  &:focus-visible { outline: 2px solid var(--recovery-link); outline-offset: 4px; border-radius: 4px; }
`;
const BackButton = styled.button`
  ${backStyles}
  border: 0; background: transparent; cursor: pointer;
  &:hover { color: var(--recovery-link); }
  &:focus-visible { outline: 2px solid var(--recovery-link); outline-offset: 4px; border-radius: 4px; }
  &:disabled { opacity: 0.7; cursor: wait; }
`;
const Surface = styled.section`
  padding: 36px;
  border-radius: 16px;
  background: ${({ theme }) => theme.bgcards};
  box-shadow: 0 14px 40px ${({ theme }) => `rgba(${theme.textRgba}, 0.07)`};
  @media (max-width: 480px) { padding: 28px 24px; }
`;
const Brand = styled(Link)`
  display: inline-flex; align-items: center; gap: 12px; min-height: 52px;
  color: inherit; text-decoration: none;
  > span { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  > span > span { font-weight: 400; }
  img { object-fit: contain; }
  &:focus-visible { outline: 2px solid var(--recovery-link); outline-offset: 4px; border-radius: 4px; }
`;
const Copyright = styled.p`
  margin: 24px 0 0; color: var(--recovery-muted); font-size: 12px; text-align: center;
`;
