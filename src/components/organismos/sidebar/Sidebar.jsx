import styled from "styled-components";
import { ToggleTema } from "../../../index";
import { v } from "../../../styles/variables";
import { NavLink } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../../store/AuthStore";
import { Device } from "../../../styles/breakpoints";
import { DivisionSelector } from "../../moleculas/DivisionSelector";
import React, { useState } from "react";
// Importamos solo el ConfirmModal
import { ConfirmModal } from "../ConfirmModal";

const LinksArray = [
  { label: "Partidos", icon: "mdi:soccer-field", to: "/partidos" },
  { label: "Equipos", icon: "fluent:people-team-24-filled", to: "/equipos" },
  { label: "Torneos", icon: "ph:trophy-fill", to: "/torneos" },
  { label: "Mi Liga", icon: "material-symbols:leaderboard", to: "/liga" },
];

const SecondarylinksArray = [
  { label: "Configuración", icon: "material-symbols:settings-outline", to: "/configuracion" },
];

export function Sidebar({ state, setState }) {
  const { cerrarSesion } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
      cerrarSesion();
      setShowLogoutModal(false);
      setState(false);
  };

  return (
    <Main $isOpen={state}>
      <Overlay $isOpen={state} onClick={() => setState(false)} />
      <span className="Sidebarbutton" onClick={() => setState(!state)}>
        {<v.iconoflechaderecha />}
      </span>

      <Container $isOpen={state} className={state ? "active" : ""}>
        <div className="Logocontent">
          <NavLink to="/" className="logo-link" onClick={() => setState(false)}>
            <div className="imgcontent"><img src={v.logo} alt="Logo" /></div>
            <h2>Bracket <br /> App</h2>
          </NavLink>
        </div>

        {LinksArray.map(({ icon, label, to }) => (
          <div className={state ? "LinkContainer active" : "LinkContainer"} key={label}>
            <NavLink to={to} className={({ isActive }) => `Links${isActive ? ` active` : ``}`} onClick={() => setState(false)}>
              <section className={state ? "content open" : "content"}>
                <Icon className="Linkicon" icon={icon} />
                <span className={state ? "label_ver" : "label_oculto"}>{label}</span>
              </section>
            </NavLink>
          </div>
        ))}
        
        <Divider />

        {SecondarylinksArray.map(({ icon, label, to, color }) => (
          <div className={state ? "LinkContainer active" : "LinkContainer"} key={label}>
            <NavLink to={to} className={({ isActive }) => `Links${isActive ? ` active` : ``}`} onClick={() => setState(false)}>
              <section className={state ? "content open" : "content"}>
                <Icon color={color} className="Linkicon" icon={icon} />
                <span className={state ? "label_ver" : "label_oculto"}>{label}</span>
              </section>
            </NavLink>
          </div>
        ))}

        <ToggleTema />
        <Divider />

        <div className={state ? "LinkContainer active" : "LinkContainer"}>
          <div className="Links" onClick={() => setShowLogoutModal(true)} style={{ cursor: "pointer" }}>
            <section className={state ? "content open" : "content"}>
              <Icon className="Linkicon" icon="material-symbols:logout-rounded" color={v.rojo} style={{ fontSize: '28px' }} />
              <span className={state ? "label_ver" : "label_oculto"} style={{ color: v.rojo, fontWeight: '600' }}>
                Cerrar Sesión
              </span>
            </section>
          </div>
        </div>
        <DivisionSelector isOpen={state} />
      </Container>

      {/* ✅ Modal modularizado */}
      <ConfirmModal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={handleLogout}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas salir?"
        subMessage="Tendrás que iniciar sesión nuevamente para acceder."
        confirmText="Salir"
        confirmColor={v.rojo}
      />
    </Main>
  );
}

// ... Tus styled-components existentes (Main, Overlay, Container, Divider) se mantienen igual ...
const Main = styled.div`
  .Sidebarbutton {
    display: none;
    position: fixed; top: 70px; left: 20px; width: 32px; height: 32px;
    border-radius: 50%; background: ${(props) => props.theme.bgtgderecha};
    box-shadow: 0 0 4px ${(props) => props.theme.bg3}, 0 0 7px ${(props) => props.theme.bg};
    align-items: center; justify-content: center; cursor: pointer;
    transition: all 0.3s ease-in-out; z-index: 51; color: ${(props) => props.theme.text};
  }
  @media ${Device.tablet} {
    .Sidebarbutton { display: flex; left: 68px; transform: ${({ $isOpen }) => $isOpen ? `translateX(173px) rotate(180deg)` : `initial`}; }
  }
`;
const Overlay = styled.div`
    position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: rgba(0, 0, 0, 0.5);
    z-index: 49; opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)}; visibility: ${({ $isOpen }) => ($isOpen ? "visible" : "hidden")};
    transition: opacity 0.3s ease; backdrop-filter: blur(2px);
    @media ${Device.tablet} { display: none; }
`;
const Container = styled.div`
  background: ${({ theme }) => theme.bgtotal}; color: ${(props) => props.theme.text};
  position: fixed; top: 0; left: 0; z-index: 50; height: 100%; width: 260px;
  transform: ${({ $isOpen }) => ($isOpen ? "translateX(0)" : "translateX(-100%)")};
  transition: transform 0.3s ease-in-out, width 0.3s ease-in-out;
  box-shadow: ${({ $isOpen, theme }) => $isOpen ? theme.boxshadowGray : 'none'};
  overflow-y: auto; overflow-x: hidden; border-right: 2px solid ${({ theme }) => theme.color2};
  &::-webkit-scrollbar { width: 6px; border-radius: 10px; }
  &::-webkit-scrollbar-thumb { background-color: ${(props) => props.theme.colorScroll}; border-radius: 10px; }

  @media ${Device.tablet} {
    transform: none; position: fixed; box-shadow: none; width: 88px;
    &.active { width: 260px; }
  }
  .Logocontent {
    display: flex; justify-content: center; align-items: center; padding-bottom: 60px; padding-top: 20px;
    .logo-link { display: flex; justify-content: center; align-items: center; text-decoration: none; color: inherit; width: 100%; }
    .imgcontent {
      display: flex; justify-content: center; align-items: center; width: 30px; cursor: pointer; transition: 0.3s ease;
      transform: ${({ $isOpen, theme }) => $isOpen ? `scale(0.7)` : `scale(1.5) rotate(${theme.logorotate})`};
      img { width: 100%; animation: flotar 1.7s ease-in-out infinite alternate; }
    }
    h2 { color: #fff; display: ${({ $isOpen }) => ($isOpen ? `block` : `none`)}; margin-left: 10px; font-size: 20px; transition: 0.3s; }
  }
  .LinkContainer { margin: 9px 0; margin-right: 10px; margin-left: 8px; transition: all 0.3s ease-in-out; position: relative; text-transform: uppercase; font-weight: 700; }
  .Links {
    border-radius: 12px; display: flex; align-items: center; text-decoration: none; width: 100%; color: ${(props) => props.theme.text}; height: 60px; position: relative; cursor: pointer;
    .content {
      display: flex; justify-content: center; width: 100%; align-items: center;
      .Linkicon { display: flex; font-size: 33px; }
      .label_ver { transition: 0.3s ease-in-out; opacity: 1; display: initial; }
      .label_oculto { opacity: 0; display: none; }
      &.open { justify-content: start; gap: 20px; padding: 20px; }
    }
    &:hover { background: ${(props) => props.theme.bgAlpha}; }
    &.active { background: ${(props) => props.theme.bg6}; border: 2px solid ${(props) => props.theme.bg5}; color: ${(props) => props.theme.color1}; font-weight: 600; }
  }
`;
const Divider = styled.div`
  height: 1px; width: 100%; background: ${(props) => props.theme.bg4}; margin: ${() => v.lgSpacing} 0;
`;