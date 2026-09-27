"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import styled from "styled-components";

import { evaluateRouteAccess } from "../../lib/auth/routeAccess.js";
import { isAuthUnavailable } from "../../lib/auth/sessionErrors.js";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { UserAuth } from "../../context/AuthContent.jsx";
import { PantallaCarga } from "../organismos/PantallaCarga.jsx";

export default function PrivateAuthGate({ children, initialAuth }) {
  const pathname = usePathname() || "/";
  const { suspendedNotice } = UserAuth();
  const status = useAuthStore((state) => state.serverAuthStatus);
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const hydratedAuth = useAuthStore((state) => state.hydratedServerAuth);
  const ready = hydratedAuth === initialAuth;
  const access = evaluateRouteAccess({ auth: { profile, status, user }, pathname });

  useEffect(() => {
    if (!ready || suspendedNotice || status === "pending" || access.action !== "redirect") return;
    const currentAccess = evaluateRouteAccess({
      auth: { profile, status, user },
      pathname,
      returnPath: `${window.location.pathname}${window.location.search}`,
    });
    window.location.replace(currentAccess.destination);
  }, [ready, suspendedNotice, status, profile, user, pathname, access.action]);

  if (ready && access.action === "allow") return children;

  if (ready && isAuthUnavailable(status)) {
    return (
      <RecoveryStatus role="status" aria-live="polite">
        <strong>Estamos recuperando tu sesión</strong>
        <p>Reintentaremos automáticamente cuando haya conexión.</p>
        <button type="button" onClick={() => window.dispatchEvent(new Event("auth-retry"))}>
          Reintentar
        </button>
      </RecoveryStatus>
    );
  }

  return <PantallaCarga />;
}

const RecoveryStatus = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};

  strong { font-size: 20px; }
  p { max-width: 360px; line-height: 1.5; }
  button {
    min-height: 44px;
    padding: 10px 20px;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.bgcards};
    color: inherit;
    cursor: pointer;
  }
  button:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 3px; }
`;
