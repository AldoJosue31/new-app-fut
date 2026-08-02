import React, { useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../../store/AuthStore";
import { useDivisionStore } from "../../../store/DivisionStore";
import { v } from "../../../styles/variables";
import { Device } from "../../../styles/breakpoints";
import { ToggleTema } from "../ToggleTema";
import { DivisionSelector } from "../../moleculas/DivisionSelector";
import { ConfirmModal } from "../ConfirmModal";
import { ROLES } from "../../../utils/constants";
import { useNavigationProgress } from "../../app/NavigationProgress";

const SIDEBAR_LAYER = 200;

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
      <div className={state ? "LinkContainer active" : "LinkContainer"} key={label}>
        <Link
          href={destination}
          className={getClassName(label, { isActive })}
          aria-current={isActive ? "page" : undefined}
          onClick={(event) =>
            handleNavigationStart(event, { destination, label })
          }
        >
          <section className={state ? "content open" : "content"}>
            <Icon color={color} className="Linkicon" icon={icon} />
            <span className={state ? "label_ver" : "label_oculto"}>{label}</span>
          </section>
        </Link>
      </div>
      );
    });

  return (
    <Main $isOpen={state}>
      <Overlay $isOpen={state} onClick={() => setState(false)} />
      <button
        type="button"
        className="Sidebarbutton"
        onClick={() => setState(!state)}
        aria-controls="app-sidebar"
        aria-expanded={state}
        aria-label={state ? "Cerrar menú" : "Abrir menú"}
        title={state ? "Cerrar menú" : "Abrir menú"}
      >
        <v.iconoflechaderecha aria-hidden="true" />
      </button>

      <Container id="app-sidebar" $isOpen={state} className={state ? "active" : ""}>
        <div className="Logocontent">
          <Link
            href={sidebarHomePath}
            className="logo-link"
            onClick={(event) =>
              handleNavigationStart(event, {
                destination: sidebarHomePath,
                label: "Panel",
              })
            }
          >
            <div className="imgcontent"><img src={v.logo} alt="" /></div>
            <h2>Bracket <span>App</span></h2>
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

        <div className={state ? "LinkContainer active" : "LinkContainer"}>
          <button
            type="button"
            className="Links logoutButton"
            onClick={openLogoutModal}
            disabled={logoutPending}
            aria-label="Cerrar sesión"
          >
            <span className={state ? "content open" : "content"}>
              <Icon className="Linkicon" icon="material-symbols:logout-rounded" color={v.rojo} style={{ fontSize: "28px" }} />
              <span className={state ? "label_ver" : "label_oculto"} style={{ color: v.rojo, fontWeight: "600" }}>
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
    position: fixed;
    top: 72px;
    left: 20px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: ${({ theme }) => theme.bgcards};
    border: 1px solid ${({ theme }) => theme.bg5};
    box-shadow: 0 8px 22px rgba(4, 31, 48, 0.18);
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: left 280ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 120ms ease;
    z-index: ${SIDEBAR_LAYER + 1};
    color: ${({ theme }) => theme.primary};
    padding: 0;

    svg {
      font-size: 1.45rem;
      transform: rotate(${({ $isOpen }) => ($isOpen ? "180deg" : "0deg")});
      transition: transform 280ms ease;
    }

    &:hover {
      background: ${({ theme }) => theme.bg6};
      border-color: ${({ theme }) => theme.primary};
      box-shadow: 0 10px 24px rgba(4, 31, 48, 0.24);
    }

    &:active {
      transform: scale(0.94);
    }

    &:focus-visible {
      outline: 3px solid ${({ theme }) => theme.primary};
      outline-offset: 3px;
    }
  }

  @media ${Device.tablet} {
    .Sidebarbutton {
      display: flex;
      left: ${({ $isOpen }) => ($isOpen ? "238px" : "66px")};
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .Sidebarbutton,
    .Sidebarbutton svg {
      transition: none;
    }
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: ${SIDEBAR_LAYER - 1};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? "visible" : "hidden")};
  transition: opacity 0.3s ease;
  backdrop-filter: blur(2px);

  @media ${Device.tablet} {
    display: none;
  }
`;

const Container = styled.div`
  background: ${({ theme }) => theme.bgtotal};
  color: ${(props) => props.theme.text};
  position: fixed;
  top: 0;
  left: 0;
  z-index: ${SIDEBAR_LAYER};
  height: 100%;
  width: 260px;
  transform: ${({ $isOpen }) => ($isOpen ? "translateX(0)" : "translateX(-100%)")};
  transition: transform 280ms ease, width 280ms ease;
  box-shadow: ${({ $isOpen, theme }) => ($isOpen ? theme.boxshadowGray : "none")};
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 2px solid ${({ theme }) => theme.color2};

  &::-webkit-scrollbar {
    width: 6px;
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${(props) => props.theme.colorScroll};
    border-radius: 10px;
  }

  @media ${Device.tablet} {
    transform: none;
    position: fixed;
    box-shadow: none;
    width: 88px;

    &.active {
      width: 260px;
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
      display: flex;
      justify-content: ${({ $isOpen }) => ($isOpen ? "flex-start" : "center")};
      align-items: center;
      gap: 13px;
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

    .imgcontent {
      display: flex;
      justify-content: center;
      align-items: center;
      width: ${({ $isOpen }) => ($isOpen ? "54px" : "48px")};
      height: ${({ $isOpen }) => ($isOpen ? "54px" : "48px")};
      flex: 0 0 auto;
      cursor: pointer;
      transition: width 280ms ease, height 280ms ease, transform 180ms ease;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: drop-shadow(0 5px 8px rgba(4, 31, 48, 0.16));
      }
    }

    h2 {
      color: ${({ theme }) => theme.text};
      display: ${({ $isOpen }) => ($isOpen ? "flex" : "none")};
      align-items: baseline;
      gap: 5px;
      min-width: 0;
      margin: 0;
      font-size: 21px;
      line-height: 1;
      letter-spacing: -0.025em;
      white-space: nowrap;

      span {
        color: ${({ theme }) => theme.primary};
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    .Logocontent .imgcontent {
      transition: none;
    }
  }

  .LinkContainer {
    margin: 9px 0 9px 8px;
    margin-right: 10px;
    transition: all 0.3s ease-in-out;
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
      justify-content: center;
      width: 100%;
      align-items: center;

      .Linkicon {
        display: flex;
        font-size: 33px;
      }

      .label_ver {
        transition: 0.3s ease-in-out;
        opacity: 1;
        display: initial;
      }

      .label_oculto {
        opacity: 0;
        display: none;
      }

      &.open {
        justify-content: start;
        gap: 20px;
        padding: 20px;
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
    display: ${({ $isOpen }) => ($isOpen ? "block" : "none")};
  }
`;

const LogoutError = styled.p`
  margin: 0;
  color: ${v.rojo};
  font-size: 0.85rem;
  font-weight: 600;
`;
