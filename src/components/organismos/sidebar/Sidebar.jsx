import styled from "styled-components";
import { ToggleTema } from "../../../index";
import { v } from "../../../styles/variables";
import { NavLink } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../../store/AuthStore";
import { Device } from "../../../styles/breakpoints"; // Importamos los breakpoints
import { DivisionSelector } from "../../moleculas/DivisionSelector";
import React, { useState } from "react";
import { Modal } from "../../organismos/Modal";
import { Btnsave, BtnNormal } from "../../../index";

// ... (Tus arrays de links se mantienen igual) ...
const LinksArray = [
  {
    label: "Partidos",
    icon: "mdi:soccer-field",
    to: "/partidos",
  },
  {
    label: "Equipos",
    icon: "fluent:people-team-24-filled",
    to: "/equipos",
  },
  {
    label: "Torneos",
    icon: "ph:trophy-fill",
    to: "/torneos",
  },
  {
    label: "Mi Liga",
    icon: "material-symbols:leaderboard",
    to: "/liga",
  },
];

const SecondarylinksArray = [
  {
    label: "Configuración",
    icon: "material-symbols:settings-outline",
    to: "/configuracion",
  },
];

export function Sidebar({ state, setState }) {
  const { cerrarSesion } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
      cerrarSesion();
      setShowLogoutModal(false);
      setState(false); // Cerrar sidebar si es móvil
  };

  return (
    <Main $isOpen={state}>
      {/* Overlay para cerrar el menú en móvil al dar click fuera */}
      <Overlay 
        $isOpen={state} 
        onClick={() => setState(false)} 
      />

      {/* Botón flotante del toggle */}
      <span className="Sidebarbutton" onClick={() => setState(!state)}>
        {<v.iconoflechaderecha />}
      </span>

      <Container $isOpen={state} className={state ? "active" : ""}>
        <div className="Logocontent">
          <NavLink 
            to="/" 
            className="logo-link"
            onClick={() => setState(false)} // Cerrar al ir al home en móvil
          >
            <div className="imgcontent">
              <img src={v.logo} alt="Logo" />
            </div>
            <h2>Bracket <br /> App</h2>
          </NavLink>
        </div>

        {LinksArray.map(({ icon, label, to }) => (
          <div
            className={state ? "LinkContainer active" : "LinkContainer"}
            key={label}
          >
            <NavLink
              to={to}
              className={({ isActive }) => `Links${isActive ? ` active` : ``}`}
              onClick={() => setState(false)} // Cerrar menú al navegar en móvil
            >
              <section className={state ? "content open" : "content"}>
                <Icon className="Linkicon" icon={icon} />
                <span className={state ? "label_ver" : "label_oculto"}>
                  {label}
                </span>
              </section>
            </NavLink>
          </div>
        ))}
        
        <Divider />

        {SecondarylinksArray.map(({ icon, label, to, color }) => (
          <div
            className={state ? "LinkContainer active" : "LinkContainer"}
            key={label}
          >
            <NavLink
              to={to}
              className={({ isActive }) => `Links${isActive ? ` active` : ``}`}
              onClick={() => setState(false)}
            >
              <section className={state ? "content open" : "content"}>
                <Icon color={color} className="Linkicon" icon={icon} />
                <span className={state ? "label_ver" : "label_oculto"}>
                  {label}
                </span>
              </section>
            </NavLink>
          </div>
        ))}

        <ToggleTema />
        
        <Divider />

        <div className={state ? "LinkContainer active" : "LinkContainer"}>
        <div 
            className="Links" 
            onClick={() => setShowLogoutModal(true)} 
            style={{ cursor: "pointer" }}
          >
            <section className={state ? "content open" : "content"}>
              <Icon 
                className="Linkicon" 
                icon="material-symbols:logout-rounded" 
                color={v.rojo} 
                style={{ fontSize: '28px' }}
              />
              <span 
                className={state ? "label_ver" : "label_oculto"}
                style={{ color: v.rojo, fontWeight: '600' }}
              >
                Cerrar Sesión
              </span>
            </section>
          </div>
        </div>
        <DivisionSelector isOpen={state} />

      </Container>
      <Modal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        title="¿Cerrar Sesión?"
        closeOnOverlayClick={false}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <span style={{opacity: 0.8}}>
                ¿Estás seguro de que deseas salir de la aplicación?
            </span>
            <div style={{ display: "flex", justifyContent: "end", gap: "10px" }}>
                <BtnNormal 
                    titulo="Cancelar" 
                    funcion={() => setShowLogoutModal(false)} 
                />
                <Btnsave 
                    titulo="Sí, salir" 
                    bgcolor={v.rojo} 
                    funcion={handleLogout} 
                />
            </div>
        </div>
      </Modal>
    </Main>
  );
}

// --- STYLED COMPONENTS ---

/* Main envuelve todo. El botón flotante se posiciona relativo a esto 
   o fixed según el diseño original, aquí lo adaptamos.
*/
const Main = styled.div`
  .Sidebarbutton {
    display: none; /* Oculto en móvil */
    
    position: fixed;
    top: 70px;
    left: 20px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${(props) => props.theme.bgtgderecha};
    box-shadow: 0 0 4px ${(props) => props.theme.bg3},
      0 0 7px ${(props) => props.theme.bg};
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    
    /* --- CORRECCIÓN AQUÍ --- */
    /* Debe ser mayor que el z-index del Container (que es 50) */
    z-index: 51; 
    /* ----------------------- */
    
    color: ${(props) => props.theme.text};
  }

  @media ${Device.tablet} {
    .Sidebarbutton {
        display: flex;
        left: 68px;
        transform: ${({ $isOpen }) =>
            $isOpen ? `translateX(173px) rotate(180deg)` : `initial`};
    }
  }
`;

/* Fondo oscuro para móvil */
const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 49; /* Debajo del sidebar (50) pero encima del contenido */
    opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
    visibility: ${({ $isOpen }) => ($isOpen ? "visible" : "hidden")};
    transition: opacity 0.3s ease;
    backdrop-filter: blur(2px);

    @media ${Device.tablet} {
        display: none; /* No mostrar overlay en desktop */
    }
`;

const Container = styled.div`
  background: ${({ theme }) => theme.bgtotal};
  color: ${(props) => props.theme.text};
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50; /* Muy alto para tapar todo en móvil */
  height: 100%;
  
  /* --- LÓGICA MÓVIL (Por defecto) --- */
  width: 260px; /* En móvil siempre es ancho completo del sidebar */
  transform: ${({ $isOpen }) => ($isOpen ? "translateX(0)" : "translateX(-100%)")};
  transition: transform 0.3s ease-in-out, width 0.3s ease-in-out;
  box-shadow: ${({ $isOpen, theme }) => $isOpen ? theme.boxshadowGray : 'none'};

  /* Scroll interno */
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

  /* --- LÓGICA DESKTOP --- */
  @media ${Device.tablet} {
    /* Restauramos comportamiento original */
    transform: none; /* Siempre visible */
    position: fixed; /* O sticky según layout original */
    box-shadow: none;
    width: 88px; /* Cerrado */

    &.active {
      width: 260px; /* Abierto */
    }
    
    /* El botón se controla desde fuera o con el margen, 
       pero aquí definimos el ancho del contenedor */
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
      
      /* Animación logo */
      transform: ${({ $isOpen, theme }) =>
        $isOpen ? `scale(0.7)` : `scale(1.5) rotate(${theme.logorotate})`};
      
      /* En móvil el logo no rota al estar cerrado (porque no se ve), 
         pero al abrir ($isOpen=true) se ve normal. */
      
      img {
        width: 100%;
        animation: flotar 1.7s ease-in-out infinite alternate;
      }
    }

    h2 {
      color: #fff;
      display: ${({ $isOpen }) => ($isOpen ? `block` : `none`)};
      margin-left: 10px;
      font-size: 20px;
      transition: 0.3s;
    }
  }

  .LinkContainer {
    margin: 9px 0;
    margin-right: 10px;
    margin-left: 8px;
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

      /* En móvil, si está abierto, mostramos labels. 
         En desktop depende de la clase .active del padre */
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
`;

const Divider = styled.div`
  height: 1px;
  width: 100%;
  background: ${(props) => props.theme.bg4};
  margin: ${() => v.lgSpacing} 0;
`;