import { createGlobalStyle } from "styled-components";
import { Device } from "./breakpoints.jsx";

export const GlobalStyles = createGlobalStyle`
    /* 1. RESET UNIVERSAL: Asegura que el padding no sume al ancho total */
    *, *::before, *::after {
        box-sizing: border-box;
    }

    /* 2. CONTROL TOTAL DEL SCROLL: Aplicado a html y body */
    html, body {
        margin: 0;
        padding: 0;
        background-color: ${({ theme }) => theme.bgtotal};
        font-family: 'Poppins', sans-serif;
        color: aliceblue;
        
        /* Oculta scroll horizontal forzosamente */
        overflow-x: hidden;
        width: 100%;
        max-width: 100vw;

        /* OPTIMIZACIÓN: Reserva el espacio del scrollbar para evitar saltos de diseño */
        scrollbar-gutter: stable;
    }

    @media not all and ${Device.tablet} {
        html:has(#app-sidebar[data-open="true"]),
        body:has(#app-sidebar[data-open="true"]) {
            overflow-y: hidden;
            overscroll-behavior-y: none;
        }
    }
`;
