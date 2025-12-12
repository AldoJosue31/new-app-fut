import styled from "styled-components";

/*
    Linea: línea horizontal con un 'badge' centrado. 
    Props opcionales en el componente:
        - badgeSize: tamaño fijo del badge (ej. '28px')
        - badgePadding: padding horizontal del badge (ej. '8px')
    Si no se pasan, se usan valores responsivos con clamp().
    Uso:
        <Linea><span>0</span></Linea>
        <Linea badgeSize="32px" badgePadding="10px"><span>0</span></Linea>
*/
export const Linea = styled.div`
    background-color: ${({ theme }) => theme.color2};
    height: 2px;
    border-radius: 15px;
    margin: 20px 0;
    position: relative;
    text-align: center;

    span{
        /* center vertically + horizontally */
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);

        /* responsive size: allow prop override */
        --badge-size: ${({ badgeSize }) => (badgeSize ? badgeSize : 'clamp(20px, 3.5vw, 36px)')};
        --badge-padding: ${({ badgePadding }) => (badgePadding ? badgePadding : '8px')};

        min-width: var(--badge-size);
        height: var(--badge-size);
        padding: 0 var(--badge-padding);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background-color: ${({ theme }) => theme.bgtotal};
        color: ${({ theme }) => theme.color2};
        font-weight: 700;
        line-height: 1;
        box-sizing: border-box;
        box-shadow: 0 1px 0 rgba(0,0,0,0.03);
        text-align: center;
        white-space: nowrap;
    }
`