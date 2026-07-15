import React, { useState } from "react";
import styled from "styled-components";
import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../../store/AuthStore";
import { useDivisionStore } from "../../../store/DivisionStore";
import { v } from "../../../styles/variables";
import { Device } from "../../../styles/breakpoints";
import { ToggleTema } from "../ToggleTema";
import { DivisionSelector } from "../../moleculas/DivisionSelector";
import { ConfirmModal } from "../ConfirmModal";
import { ROLES } from "../../../utils/constants";

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

export function Sidebar({ state, setState }) {
  const location = useLocation();
  const { cerrarSesion, profile, authLoadingAction } = useAuthStore();
  const { selectedDivision } = useDivisionStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const isAdmin = profile?.role === ROLES.ADMIN;
  const isDelegate = profile?.role === ROLES.DELEGATE;

  const handleLogout = async () => {
    if (authLoadingAction) return;

    setLogoutError("");

    try {
      await cerrarSesion();
      setShowLogoutModal(false);
      setState(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setLogoutError('No se pudo cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  const openLogoutModal = () => {
    if (authLoadingAction) return;
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

  const isTorneosRoute = /^\/(?:division\/\d+\/)?torneos(?:\/|$)/.test(location.pathname);
  const isEquiposRoute = /^\/(?:division\/\d+\/)?equipos(?:\/|$)/.test(location.pathname);
  const getManagerLinkClass = (label, isActive) =>
    `Links${
      isActive ||
      (label === "Torneos" && isTorneosRoute) ||
      (label === "Equipos" && isEquiposRoute)
        ? " active"
        : ""
    }`;

  const renderLinks = (
    links,
    getClassName = (_label, { isActive }) => `Links${isActive ? " active" : ""}`,
    getTo = (to) => to
  ) =>
    links.map(({ icon, label, to, color }) => (
      <div className={state ? "LinkContainer active" : "LinkContainer"} key={label}>
        <NavLink
          to={getTo(to)}
          className={(navState) => getClassName(label, navState)}
          onClick={() => setState(false)}
        >
          <section className={state ? "content open" : "content"}>
            <Icon color={color} className="Linkicon" icon={icon} />
            <span className={state ? "label_ver" : "label_oculto"}>{label}</span>
          </section>
        </NavLink>
      </div>
    ));

  return (
    <Main $isOpen={state}>
      <Overlay $isOpen={state} onClick={() => setState(false)} />
      <button type="button" className="Sidebarbutton" onClick={() => setState(!state)} aria-label={state ? "Cerrar menú" : "Abrir menú"}>
        <v.iconoflechaderecha />
      </button>

      <Container $isOpen={state} className={state ? "active" : ""}>
        <div className="Logocontent">
          <NavLink to="/" className="logo-link" onClick={() => setState(false)}>
            <div className="imgcontent"><img src={v.logo} alt="Logo" /></div>
            <h2>Bracket <br /> App</h2>
          </NavLink>
        </div>

        {isAdmin ? (
          <>
            <MenuLabel>Administracion</MenuLabel>
            {renderLinks(AdminLinksArray)}
          </>
        ) : isDelegate ? (
          <>
            <MenuLabel>Delegado</MenuLabel>
            {renderLinks(DelegateLinksArray)}
            <Divider />
            {renderLinks(DelegateSecondaryLinks)}
          </>
        ) : (
          <>
            {renderLinks(
              ManagerLinksArray,
              (label, { isActive }) => getManagerLinkClass(label, isActive),
              getManagerLinkTo
            )}
            <Divider />
            {renderLinks(ManagerSecondaryLinks)}
          </>
        )}

        <Divider />
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <ToggleTema />
        </div>

        <div className={state ? "LinkContainer active" : "LinkContainer"}>
          <button
            type="button"
            className="Links logoutButton"
            onClick={openLogoutModal}
            disabled={authLoadingAction}
            aria-label="Cerrar sesión"
          >
            <span className={state ? "content open" : "content"}>
              <Icon className="Linkicon" icon="material-symbols:logout-rounded" color={v.rojo} style={{ fontSize: "28px" }} />
              <span className={state ? "label_ver" : "label_oculto"} style={{ color: v.rojo, fontWeight: "600" }}>
                Cerrar Sesion
              </span>
            </span>
          </button>
        </div>

        {!isAdmin && !isDelegate && <DivisionSelector isOpen={state} />}
      </Container>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => !authLoadingAction && setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Cerrar Sesion"
        message="Estas seguro de que deseas salir?"
        subMessage="Tendras que iniciar sesion nuevamente para acceder."
        confirmText={authLoadingAction ? "Cerrando..." : "Salir"}
        confirmColor={v.rojo}
        confirmDisabled={authLoadingAction}
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
    top: 70px;
    left: 20px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${(props) => props.theme.bgtgderecha};
    box-shadow: 0 0 4px ${(props) => props.theme.bg3}, 0 0 7px ${(props) => props.theme.bg};
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    z-index: 51;
    color: ${(props) => props.theme.text};
    border: 0;
    padding: 0;
  }

  @media ${Device.tablet} {
    .Sidebarbutton {
      display: flex;
      left: 68px;
      transform: ${({ $isOpen }) => ($isOpen ? "translateX(173px) rotate(180deg)" : "initial")};
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
  z-index: 49;
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
  z-index: 50;
  height: 100%;
  width: 260px;
  transform: ${({ $isOpen }) => ($isOpen ? "translateX(0)" : "translateX(-100%)")};
  transition: transform 0.3s ease-in-out;
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
    padding-bottom: 60px;
    padding-top: 20px;

    .logo-link {
      display: flex;
      justify-content: center;
      align-items: center;
      text-decoration: none;
      color: inherit;
      width: 100%;
    }

    .imgcontent {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 30px;
      cursor: pointer;
      transition: 0.3s ease;
      transform: ${({ $isOpen, theme }) => ($isOpen ? "scale(0.7)" : `scale(1.5) rotate(${theme.logorotate})`)};

      img {
        width: 100%;
        animation: flotar 1.7s ease-in-out infinite alternate;
      }
    }

    h2 {
      color: #fff;
      display: ${({ $isOpen }) => ($isOpen ? "block" : "none")};
      margin-left: 10px;
      font-size: 20px;
      transition: 0.3s;
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
