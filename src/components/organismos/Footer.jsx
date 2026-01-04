import styled from "styled-components";
import { v } from "../../styles/variables";
import { Device } from "../../styles/breakpoints";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <FooterContainer>
            <span className="copyright">
                © {currentYear} Bracket App
            </span>
            <div className="links">
                <a href="/terminos">Términos</a>
                <span className="dot">•</span>
                <a href="/privacidad">Privacidad</a>
                <span className="dot">•</span>
                <a href="/soporte">Soporte</a>
            </div>
        </FooterContainer>
    );
}

const FooterContainer = styled.footer`
    /* Posicionamiento y Espacio */
    width: 100%;
    padding: ${v.mdSpacing}; /* Reducido de lg a md */
    
    /* Diseño Flex simple */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${v.smSpacing};
    
    /* Tipografía y Color */
    background-color: transparent; /* Transparente para que se funda con el login */
    color: ${({ theme }) => theme.text};
    opacity: 0.6; /* Un poco transparente para no distraer */
    font-size: ${v.fontxs}; /* Letra pequeña (aprox 12px) */
    
    /* En pantallas grandes (Tablets/PC) se pone en una sola línea */
    @media ${Device.tablet} {
        flex-direction: row;
        gap: ${v.lgSpacing};
    }

    .copyright {
        font-weight: 600;
    }

    .links {
        display: flex;
        align-items: center;
        gap: ${v.smSpacing};

        a {
            text-decoration: none;
            color: inherit;
            transition: all 0.2s;

            &:hover {
                color: ${v.colorPrincipal};
                opacity: 1;
                text-decoration: underline;
            }
        }

        .dot {
            font-size: 0.5rem; /* Puntito separador muy sutil */
            opacity: 0.5;
        }
    }

    /* Efecto Hover en todo el footer para que destaque solo si pasas el mouse */
    transition: opacity 0.3s ease;
    &:hover {
        opacity: 1;
    }
`;