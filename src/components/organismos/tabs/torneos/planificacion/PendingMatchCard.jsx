import React from "react";
import styled from "styled-components";
import { v } from "../../../../../index";

export function PendingMatchCard({ match, isConfirmed, onDragStart, jornadaIndex }) {
  const isSuggested = String(match.id).includes('suggested');
  const isFromOtherJornada = isSuggested && !String(match.id).includes(`suggested-${jornadaIndex}`);
  const isPostponed = typeof match.id === 'number' && match.status === 'Pendiente';

  return (
    <Card 
        draggable={!isConfirmed}
        onDragStart={(e) => onDragStart(e, match)}
        $disabled={isConfirmed}
    >
       <div className="teams">
           <img src={match.local.logo_url || v.iconofotovacia} alt="local"/>
           <span>vs</span>
           <img src={match.visitante.logo_url || v.iconofotovacia} alt="visita"/>
       </div>
       <div className="names">
           {match.local.name} vs {match.visitante.name}
       </div>
       
       {isFromOtherJornada && (
           <Tag $color="#f39c12">Sugerido (Otra fecha)</Tag>
       )}

       {isPostponed && (
           <Tag $color="#e74c3c">
              {match.originJornada ? `Pendiente de ${match.originJornada}` : 'Pospuesto'}
           </Tag>
       )}
    </Card>
  );
}

const Card = styled.div`
    background: ${({theme, $disabled})=> $disabled ? theme.bg3 : theme.bgtotal}; 
    border: 1px solid ${({theme})=>theme.bg4}; padding: 10px; border-radius: 8px; 
    cursor: ${({$disabled})=> $disabled ? 'default' : 'grab'}; 
    opacity: ${({$disabled})=> $disabled ? 0.7 : 1};
    transition: all 0.2s ease;
    
    &:hover { 
        border-color: ${({$disabled, theme})=> $disabled ? theme.bg4 : v.colorPrincipal}; 
        transform: ${({$disabled})=> $disabled ? 'none' : 'translateY(-2px)'};
        box-shadow: ${({$disabled})=> $disabled ? 'none' : '0 4px 10px rgba(0,0,0,0.1)'};
    }

    .teams { display: flex; justify-content: center; gap: 10px; margin-bottom: 5px; img { width: 25px; height: 25px; object-fit: contain; } }
    .names { text-align: center; font-size: 0.8rem; font-weight: 600; }
`;

const Tag = styled.div`
    text-align: center; font-size: 0.7rem; margin-top: 6px; font-weight: 700;
    color: ${({$color}) => $color};
    background: ${({$color}) => $color + '15'};
    padding: 2px 5px; border-radius: 4px;
`;