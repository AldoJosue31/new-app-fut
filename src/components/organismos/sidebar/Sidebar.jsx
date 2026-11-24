import React, { useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../../store/AuthStore";
import { useDivisionStore } from "../../../store/DivisionStore";
import { v } from "../../../styles/variables";
import { Device } from "../../../styles/breakpoints";
import { BrandLogo } from "../../atomos/BrandLogo.jsx";
import { ToggleTema } from "../ToggleTema";
import { DivisionSelector } from "../../moleculas/DivisionSelector";
import { ConfirmModal } from "../ConfirmModal";
import { ROLES } from "../../../utils/constants";
import { useNavigationProgress } from "../../app/NavigationProgress";
import { APP_NAME } from "../../../lib/brand.js";

const SIDEBAR_LAYER = 200;
export const SIDEBAR_OPEN_WIDTH = 236;
export const SIDEBAR_COLLAPSED_WIDTH = 88;
const SIDEBAR_TOGGLE_SIZE = 44;
const SIDEBAR_DURATION = "200ms";
export const sidebarTransition = `${SIDEBAR_DURATION} cubic-bezier(0.23, 1, 0.32, 1)`;

const ManagerLinksArray = [
  { label: "Partidos", icon: "mdi:soccer-field", to: "/partidos" },
  { label: "Equipos", icon: "fluent:people-team-24-filled", to: "/equipos" },
  { label: "Torneos", icon: "ph:trophy-fill", to: "/torneos" },
  { label: "Mi Liga", icon: "material-symbols:leaderboard", to: "/liga" },
];

const ManagerSecondaryLinks = [
  { label: "Configuracion", icon: "material-symbols:settings-outline", to: "/configuracion" },
];

const DelegateLinksArray = [
  { label: "Mis Equipos", icon: "fluent:people-team-24-filled", to: "/equipos" },
];

const DelegateSecondaryLinks = [
  { label: "Configuracion", icon: "material-symbols:settings-outline", to: "/configuracion" },
];

const AdminLinksArray = [
  { label: "Gestion Managers", icon: "eos-icons:admin-outlined", to: "/admin/managers" },
];

export function Sidebar({ state, setState, currentPath = "/" }) {
  const cerrarSesion = useAuthStore((authState) => authState.cerrarSesion);
  const profile = useAuthStore((authState) => authState.profile);
  const authLoadingAction = useAuthStore(
    (authState) => authState.authLoadingAction
  );
  const selectedDivision = useDivisionStore(
    (divisionState) => divisionState.selectedDivision
  );
  const { startNavigation } = useNavigationProgress();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAdmin = profile?.role === ROLES.ADMIN;
  const isDelegate = profile?.role === ROLES.DELEGATE;
  const isManager = profile?.role === ROLES.MANAGER;
  const hasResolvedRole = isAdmin || isDelegate || isManager;
  const logoutPending = isLoggingOut || authLoadingAction;
  const sidebarHomePath = isDelegate
    ? "/equipos"
    : isAdmin || isManager
      ? "/dashboard"
      : currentPath;

  const handleLogout = async () => {
    if (logoutPending) return;

    setLogoutError("");
    setIsLoggingOut(true);
    setState(false);

    try {
      await cerrarSesion();
      window.location.replace("/login");
    } catch (error) {
      setIsLoggingOut(false);
      console.error('Error al cerrar sesión:', error);
      setLogoutError('No se pudo cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  const openLogoutModal = () => {
    if (logoutPending) return;
    setLogoutError("");
    setShowLogoutModal(true);
  };

  const getManagerLinkTo = (to) => {
    if (to === "/torneos" && selectedDivision?.id) {
      return `/division/${selectedDivision.id}/torneos`;
    }

    if (to === "/equipos" && selectedDivision?.id) {
      return `/division/${selectedDivision.id}/equipos`;
    }

    return to;
  };

  const isTorneosRoute = /^\/(?:division\/\d+\/)?torneos(?:\/|$)/.test(currentPath);
  const isEquiposRoute = /^\/(?:division\/\d+\/)?equipos(?:\/|$)/.test(currentPath);
  const getManagerLinkClass = (label, isActive) =>
    `Links${
      isActive ||
      (label === "Torneos" && isTorneosRoute) ||
      (label === "Equipos" && isEquiposRoute)
        ? " active"
        : ""
    }`;

  const handleNavigationStart = (event, { destination, label }) => {
    setState(false);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const destinationPath = String(destination).split(/[?#]/, 1)[0] || "/";
    const normalizedCurrentPath =
      currentPath.length > 1 ? currentPath.replace(/\/+$/, "") : currentPath;
    const normalizedDestinationPath =
      destinationPath.length > 1
        ? destinationPath.replace(/\/+$/, "")
        : destinationPath;

    if (normalizedCurrentPath === normalizedDestinationPath) return;

    startNavigation({
      doneLabel: `${label} abierta`,
      kind: "view",
      label: `Abriendo ${label}`,
      targetPath: destinationPath,
    });
  };

  const renderLinks = (
    links,
    getClassName = (_label, { isActive }) => `Links${isActive ? " active" : ""}`,
    getTo = (to) => to
  ) =>
    links.map(({ icon, label, to, color }) => {
      const destination = getTo(to);
      const isActive =
        currentPath === destination ||
        currentPath.startsWith(`${destination}/`);

      return (
        <div className="LinkContainer" key={label}>
          <Link
            href={destination}
            className={getClassName(label, { isActive })}
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
            onClick={(event) =>
              handleNavigationStart(event, { destination, label })
            }
          >
            <span className="content">
              <Icon color={color} className="Linkicon" icon={icon} />
              <span className="link-label">{label}</span>
            </span>
          </Link>
        </div>
      );
    });

  return (
    <Main $isOpen={state}>
      <Overlay $isOpen={state} aria-hidden="true" onClick={() => setState(false)} />
      <button
        type="button"
        className="Sidebarbutton"
        onClick={() => setState((isOpen) => !isOpen)}
        aria-controls="app-sidebar"
        aria-expanded={state}
        aria-label={state ? "Cerrar menú" : "Abrir menú"}
        title={state ? "Cerrar menú" : "Abrir menú"}
      >
        <v.iconoflechaderecha aria-hidden="true" />
      </button>

      <Container id="app-sidebar" data-open={state}>
        <div className="Logocontent">
          <Link
            href={sidebarHomePath}
            className="logo-link"
            aria-label={APP_NAME}
            onClick={(event) =>
              handleNavigationStart(event, {
                destination: sidebarHomePath,
                label: "Panel",
              })
            }
          >
            <BrandLogo alt="" variant="mark" className="logo-mark" />
            <BrandLogo alt="" variant="horizontal" className="logo-wordmark" />
          </Link>
        </div>

        {!isLoggingOut && isAdmin ? (
          <>
            <MenuLabel>Administracion</MenuLabel>
            {renderLinks(AdminLinksArray)}
          </>
        ) : !isLoggingOut && isDelegate ? (
          <>
            <MenuLabel>Delegado</MenuLabel>
            {renderLinks(DelegateLinksArray)}
            <Divider />
            {renderLinks(DelegateSecondaryLinks)}
          </>
        ) : !isLoggingOut && isManager ? (
          <>
            {renderLinks(
              ManagerLinksArray,
              (label, { isActive }) => getManagerLinkClass(label, isActive),
              getManagerLinkTo
            )}
            <Divider />
            {renderLinks(ManagerSecondaryLinks)}
          </>
        ) : null}

        {hasResolvedRole && !isLoggingOut && <Divider />}
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <ToggleTema />
        </div>

        <div className="LinkContainer">
          <button
            type="button"
            className="Links logoutButton"
            onClick={openLogoutModal}
            disabled={logoutPending}
            aria-label="Cerrar sesión"
          >
            <span className="content">
              <Icon className="Linkicon" icon="material-symbols:logout-rounded" color={v.rojo} style={{ fontSize: "28px" }} />
              <span className="link-label" style={{ color: v.rojo, fontWeight: "600" }}>
                {isLoggingOut ? "Cerrando..." : "Cerrar Sesion"}
              </span>
            </span>
          </button>
        </div>

        {isManager && !isLoggingOut && (
          <DivisionSelector isOpen={state} currentPath={currentPath} />
        )}
      </Container>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => !logoutPending && setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas salir?"
        subMessage="Tendrás que iniciar sesión nuevamente para acceder."
        confirmText="Salir"
        confirmColor={v.rojo}
        confirmDisabled={logoutPending}
        loading={isLoggingOut}
        loadingMessage="Cerrando sesión..."
      >
        {logoutError && <LogoutError role="alert">{logoutError}</LogoutError>}
      </ConfirmModal>
    </Main>
  );
}

const Main = styled.div`
  .Sidebarbutton {
    display: none;
    position: absolute;
    top: 72px;
    left: 100%;
    width: ${SIDEBAR_TOGGLE_SIZE}px;
    height: ${SIDEBAR_TOGGLE_SIZE}px;
    border-radius: 50%;
    background: ${({ theme }) => theme.bgcards};
    border: 1px solid ${({ theme }) => theme.bg5};
    box-shadow: 0 8px 22px rgba(4, 31, 48, 0.18);
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transform: translateX(-50%);
    transition: background-color 150ms ease, border-color 150ms ease, transform 120ms ease-out;
    z-index: ${SIDEBAR_LAYER + 1};
    color: ${({ theme }) => theme.primary};
    padding: 0;

    svg {
      font-size: 1.45rem;
      transform: rotate(${({ $isOpen }) => ($isOpen ? "180deg" : "0deg")});
      transition: transform ${sidebarTransition};
    }

    &:hover {
      background: ${({ theme }) => theme.bg6};
      border-color: ${({ theme }) => theme.primary};
      box-shadow: 0 10px 24px rgba(4, 31, 48, 0.24);
    }

    &:active {
      transform: translateX(-50%) scale(0.97);
    }

    &:focus-visible {
      outline: 3px solid ${({ theme }) => theme.primary};
      outline-offset: 3px;
    }
  }

  @media ${Device.tablet} {
    position: fixed;
    inset: 0 auto 0 0;
    width: ${({ $isOpen }) => ($isOpen ? SIDEBAR_OPEN_WIDTH : SIDEBAR_COLLAPSED_WIDTH)}px;
    z-index: ${SIDEBAR_LAYER};
    transition: width ${sidebarTransition};

    .Sidebarbutton {
      display: flex;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    .Sidebarbutton,
    .Sidebarbutton svg {
      transition: none;
    }
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  touch-action: none;
  background: rgba(0, 0, 0, 0.5);
  z-index: ${SIDEBAR_LAYER - 1};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? "visible" : "hidden")};
  pointer-events: ${({ $isOpen }) => ($isOpen ? "auto" : "none")};
  transition: opacity 160ms ease-out, visibility 0s linear ${({ $isOpen }) => ($isOpen ? "0s" : "160ms")};

  @media ${Device.tablet} {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Container = styled.div`
  background: ${({ theme }) => theme.bgNav || theme.bgtotal};
  color: ${(props) => props.theme.text};
  position: fixed;
  top: 0;
  left: 0;
  z-index: ${SIDEBAR_LAYER};
  height: 100%;
  width: ${SIDEBAR_OPEN_WIDTH}px;
  transform: translateX(-100%);
  visibility: hidden;
  pointer-events: none;
  transition: transform ${sidebarTransition}, visibility 0s linear ${SIDEBAR_DURATION};
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 2px solid ${({ theme }) => theme.color2};

  &[data-open="true"] {
    transform: translateX(0);
    visibility: visible;
    pointer-events: auto;
    transition-delay: 0s;
    box-shadow: ${({ theme }) => theme.boxshadowGray};
  }

  &::-webkit-scrollbar {
    width: 6px;
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${(props) => props.theme.colorScroll};
    border-radius: 10px;
  }

  @media not all and ${Device.tablet} {
    height: 100dvh;
    overscroll-behavior-y: contain;
  }

  @media ${Device.tablet} {
    position: absolute;
    width: 100%;

    &[data-open] {
      transform: none;
      visibility: visible;
      pointer-events: auto;
      transition: none;
      box-shadow: none;
    }
  }

  .Logocontent {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 108px;
    padding: 18px 16px 30px;
    box-sizing: border-box;

    .logo-link {
      display: grid;
      align-items: center;
      text-decoration: none;
      color: inherit;
      width: 100%;
      min-width: 0;
      border-radius: 12px;

      &:focus-visible {
        outline: 3px solid ${({ theme }) => theme.primary};
        outline-offset: 4px;
      }
    }

    img {
      grid-area: 1 / 1;
      object-fit: contain;
      filter: drop-shadow(0 5px 8px rgba(4, 31, 48, 0.16));
      transition: opacity 140ms ease-out;
    }

    .logo-mark {
      width: 48px;
      height: 48px;
      margin-inline-start: 3px;
    }

    .logo-wordmark {
      width: min(100%, 166px);
      height: 54px;
      object-position: left center;
      opacity: 0;
    }
  }

  &[data-open="true"] .logo-mark {
    opacity: 0;
  }

  &[data-open="true"] .logo-wordmark {
    opacity: 1;
  }

  .LinkContainer {
    margin: 9px 10px 9px 8px;
    position: relative;
    text-transform: uppercase;
    font-weight: 700;
  }

  .Links {
    border-radius: 12px;
    display: flex;
    align-items: center;
    text-decoration: none;
    width: 100%;
    color: ${(props) => props.theme.text};
    height: 60px;
    position: relative;
    cursor: pointer;

    .content {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 20px;
      padding-inline: 17px 12px;

      .Linkicon {
        display: flex;
        flex: none;
        font-size: 33px;
      }
    }

    &:hover {
      background: ${(props) => props.theme.bgAlpha};
    }

    &.active {
      background: ${(props) => props.theme.bg6};
      border: 2px solid ${(props) => props.theme.bg5};
      color: ${(props) => props.theme.color1};
      font-weight: 600;
    }
  }

  .link-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 140ms ease-out;
  }

  &[data-open="true"] .link-label {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    .Logocontent img,
    .link-label {
      transition: none;
    }
  }

  .logoutButton {
    border: 0;
    background: transparent;
    padding: 0;
    font: inherit;
    text-align: inherit;
    text-transform: inherit;

    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.primary || v.colorPrincipal};
      outline-offset: 2px;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.65;
    }
  }
`;

const Divider = styled.div`
  height: 1px;
  width: 100%;
  background: ${(props) => props.theme.bg4};
  margin: ${() => v.lgSpacing} 0;
`;

const MenuLabel = styled.span`
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.text};
  opacity: 0.5;
  margin: 10px 0 5px 20px;

  @media ${Device.tablet} {
    display: none;
  }
`;

const LogoutError = styled.p`
  margin: 0;
  color: ${v.rojo};
  font-size: 0.85rem;
  font-weight: 600;
`;
