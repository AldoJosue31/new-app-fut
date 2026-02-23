import React, { useMemo } from 'react';

// 1. Algoritmo Determinista: Convierte un texto en un número único y constante
const getHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

// 2. Utilidad para oscurecer un color y generar contraste dinámico
const shadeColor = (colorHex, amount) => {
  let color = colorHex.replace('#', '');
  if (color.length === 3) color = color.split('').map(c => c + c).join('');
  if (color.length !== 6) return colorHex; // Fallback si no es hex válido
  
  let num = parseInt(color, 16);
  let r = Math.min(255, Math.max(0, (num >> 16) + amount));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  let b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  
  return '#' + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
};

export function DynamicTeamLogo({ name = "Equipo", color = "#000000", size = "100%" }) {
  // Generar iniciales
  const words = name.trim().split(' ');
  let initials = "";
  if (words.length === 1) {
      initials = words[0].substring(0, 2).toUpperCase();
  } else if (words.length === 2) {
      initials = (words[0][0] + words[1][0]).toUpperCase();
  } else {
      initials = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }

  // Generar atributos dinámicos basados en el nombre exacto del equipo
  const hash = getHash(name);
  
  // 4 Formas distintas de escudo
  const shieldPaths = [
    "M 50 70 L 450 70 C 450 300 350 430 250 490 C 150 430 50 300 50 70 Z", // 0: Clásico
    "M 250 30 L 450 100 L 420 350 L 250 490 L 80 350 L 50 100 Z", // 1: Hexagonal moderno
    "M 50 50 L 450 50 L 450 300 C 450 400 350 480 250 490 C 150 480 50 400 50 300 Z", // 2: Cuadrado redondeado inferior
    "M 250 20 C 350 20 450 80 450 200 C 450 350 300 450 250 490 C 200 450 50 350 50 200 C 50 80 150 20 250 20 Z" // 3: Forma de gota / Redondo
  ];
  
  const selectedPath = shieldPaths[hash % shieldPaths.length];
  const patternType = hash % 4; // 0: Sólido, 1: Rayas, 2: Diagonal, 3: Mitad vertical
  
  // Procesamiento de color
  const primaryColor = color;
  const secondaryColor = shadeColor(color, -50); // Oscurecemos el principal para el patrón
  
  const patternId = `pattern-${hash}`;
  const clipId = `clip-${hash}`;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 500 500" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0px 6px 8px rgba(0,0,0,0.25))" }}
    >
      <defs>
        {/* Efecto cristal 3D unificado */}
        <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="35%" stopColor="rgba(255,255,255,0.0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
        </linearGradient>

        <clipPath id={clipId}>
          <path d={selectedPath} />
        </clipPath>

        {/* Generador de Patrones únicos */}
        {patternType === 1 && (
          <pattern id={patternId} width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
            <rect width="40" height="80" fill={secondaryColor} />
            <rect x="40" width="40" height="80" fill={primaryColor} />
          </pattern>
        )}
        {patternType === 2 && (
          <pattern id={patternId} width="500" height="500" patternUnits="userSpaceOnUse">
            <rect width="500" height="500" fill={primaryColor} />
            <polygon points="0,0 500,500 0,500" fill={secondaryColor} />
          </pattern>
        )}
        {patternType === 3 && (
          <pattern id={patternId} width="500" height="500" patternUnits="userSpaceOnUse">
            <rect width="250" height="500" fill={primaryColor} />
            <rect x="250" width="250" height="500" fill={secondaryColor} />
          </pattern>
        )}
      </defs>

      {/* Capa Base con Patrón Dinámico */}
      <path 
        d={selectedPath} 
        fill={patternType === 0 ? primaryColor : `url(#${patternId})`} 
      />

      {/* Doble Borde Estilizado */}
      <path 
        d={selectedPath} 
        fill="none"
        stroke="#ffffff" 
        strokeWidth="18" 
      />
      <path 
        d={selectedPath} 
        fill="none"
        stroke={secondaryColor} 
        strokeWidth="6" 
        style={{ transform: 'scale(0.93)', transformOrigin: 'center' }}
      />
      
      {/* Capa de Brillo Superpuesta */}
      <path 
        d={selectedPath} 
        fill="url(#shieldGradient)" 
      />

      {/* Tipografía Profesional */}
      <text 
        x="250" 
        y="235" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontWeight="900" 
        fontSize={initials.length > 2 ? "140" : "170"} 
        fill="#ffffff" 
        textAnchor="middle" 
        dominantBaseline="middle"
        letterSpacing={initials.length > 2 ? "-5" : "0"}
        style={{ 
            textShadow: "0px 4px 15px rgba(0,0,0,0.6), 0px 2px 4px rgba(0,0,0,0.4)",
            paintOrder: "stroke fill",
            stroke: secondaryColor,
            strokeWidth: "6px"
        }}
      >
        {initials}
      </text>

      {/* Estrella Vectorial (Totalmente a prueba de navegadores, reemplaza el emoji) */}
      <g transform="translate(205, 350) scale(0.18)" fill="#ffffff" style={{ filter: "drop-shadow(0px 3px 5px rgba(0,0,0,0.4))" }}>
        <path d="M266.6,26.5l65.8,133.3c3,6.1,8.9,10.4,15.7,11.4l147.1,21.4c17.4,2.5,24.3,23.9,11.7,36.2L400.5,332.6 c-4.9,4.8-7.1,11.7-6,18.4l25.1,146.5c3,17.3-15.2,30.6-30.8,22.4L257.3,450.8c-6.1-3.2-13.3-3.2-19.4,0l-131.5,69.1 c-15.6,8.2-33.8-5.1-30.8-22.4l25.1-146.5c1.2-6.8-1.1-13.6-6-18.4L-12.2,228.8c-12.6-12.3-5.6-33.7,11.7-36.2l147.1-21.4 c6.8-1,12.7-5.3,15.7-11.4l65.8-133.3C235.9,10.7,258.8,10.7,266.6,26.5z"/>
      </g>
    </svg>
  );
}