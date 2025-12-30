import React from "react";
import styled, { keyframes, css } from "styled-components";
// Asumo que v viene de tus variables, si no, usa colores hardcodeados o theme
import { v } from "../../styles/variables"; 

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Base = styled.div`
  background: ${({theme}) => theme.bgtotal || "#2b2b2b"};
  background-image: linear-gradient(
    90deg, 
    ${({theme}) => theme.bgtotal || "#2b2b2b"} 0px, 
    ${({theme}) => theme.bg2 || "#3b3b3b"} 50%, 
    ${({theme}) => theme.bgtotal || "#2b2b2b"} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite linear;
  border-radius: ${({radius}) => radius || '4px'};
  width: ${({width}) => width || '100%'};
  height: ${({height}) => height || '20px'};
`;

export const Skeleton = ({ width, height, radius, style, className }) => {
  return <Base width={width} height={height} radius={radius} style={style} className={className} />;
};

// --- AQUI ESTA EL ARREGLO DEL ROW ---
// Creamos un contenedor igual al "TeamItem" de tu archivo principal para que mida lo mismo
const SkeletonRowWrapper = styled.div`
  display: flex; 
  align-items: center; 
  gap: 10px; 
  padding: 8px; 
  border-bottom: 1px solid ${({theme})=>theme.bg4 || "#333"}; 
  background: ${({theme})=>theme.bgcards || "rgba(255,255,255,0.05)"}; 
  margin-bottom: 4px; 
  border-radius: 6px;
`;

export const TableRowSkeleton = () => {
  return (
    <SkeletonRowWrapper>
       {/* Simula Número */}
       <Skeleton width="20px" height="15px" />
       
       {/* Simula Logo (Círculo) */}
       <Skeleton width="28px" height="28px" radius="50%" />
       
       {/* Simula Nombre (Barra larga) */}
       <div style={{ flex: 1 }}>
         <Skeleton width="60%" height="16px" />
       </div>

       {/* Simula Botón borrar (Cuadrado pequeño) */}
       <Skeleton width="20px" height="20px" />
    </SkeletonRowWrapper>
  );
};