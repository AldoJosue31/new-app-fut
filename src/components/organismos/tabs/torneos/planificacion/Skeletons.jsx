import React from "react";
import styled from "styled-components";
import { Skeleton } from "../../../../atomos/Skeleton";

// --- 1. SKELETON DEL HEADER ---
const HeaderWrapper = styled.div`
  background: ${({theme}) => theme.bg3};
  padding: 15px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  box-sizing: border-box; /* CLAVE: Evita desbordamientos */
  
  @media (min-width: 768px) { 
    flex-direction: row; 
    justify-content: space-between; 
    align-items: center; 
  }
`;

const HeaderTopMobile = styled.div`
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  width: 100%;
  gap: 10px;
  
  @media (min-width: 768px) { 
    justify-content: flex-start; 
    width: auto;
    flex: 1;
  }
`;

const DateInputsWrapper = styled.div`
    display: none; /* Oculto en móvil para no romper layout */
    gap: 10px;
    
    @media (min-width: 768px) { 
        display: flex; 
        margin-left: 20px;
    }
`;

const ActionsWrapper = styled.div`
    display: flex; 
    gap: 10px; 
    justify-content: flex-end;
    width: 100%;
    border-top: 1px solid ${({theme})=>theme.bg4};
    padding-top: 15px;
    
    @media (min-width: 768px) { 
        width: auto;
        border-top: none;
        padding-top: 0;
    }
`;

const PlanningHeaderSkeleton = () => {
  return (
    <HeaderWrapper>
      {/* Parte Superior: Navegación + Título */}
      <HeaderTopMobile>
        {/* Botón Prev */}
        <Skeleton width="36px" height="36px" radius="50%" />
        
        {/* Título Central */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1 }}>
             <Skeleton width="60%" height="20px" />
             <Skeleton width="40%" height="12px" />
        </div>

        {/* Botón Next */}
        <Skeleton width="36px" height="36px" radius="50%" />

        {/* Inputs de Fecha (Solo Desktop) */}
        <DateInputsWrapper>
            <Skeleton width="140px" height="35px" />
            <Skeleton width="140px" height="35px" />
        </DateInputsWrapper>
      </HeaderTopMobile>

      {/* Acciones (Config, Toggle View) */}
      <ActionsWrapper>
         <Skeleton width="40px" height="40px" radius="8px" />
         <Skeleton width="40px" height="40px" radius="8px" />
      </ActionsWrapper>
    </HeaderWrapper>
  );
};

// --- 2. SKELETON DEL MATCH ROW ---
const RowWrapper = styled.div`
  width: 100%;
  background: ${({theme}) => theme.bgtotal};
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({theme}) => theme.bg4};
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;

  @media (min-width: 768px) { 
      flex-direction: row; 
      align-items: center; 
      justify-content: space-between; 
  }
`;

const TeamsGroup = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between; /* Mejor distribución en móvil */
    gap: 15px;
    flex: 1;
    width: 100%;
`;

const ControlsGroup = styled.div`
    display: flex; 
    gap: 10px; 
    width: 100%;
    
    @media (min-width: 768px) { 
        width: auto; 
    }
`;

const MatchRowSkeleton = () => {
    return (
        <RowWrapper>
            <TeamsGroup>
                <Skeleton width="40%" height="16px" />
                <span style={{ opacity: 0.3, fontSize: '12px' }}>VS</span>
                <Skeleton width="40%" height="16px" />
            </TeamsGroup>
            
            <ControlsGroup>
                <Skeleton width="100%" height="32px" style={{ flex: 1 }} />
                <Skeleton width="80px" height="32px" />
                <Skeleton width="32px" height="32px" radius="4px" />
            </ControlsGroup>
        </RowWrapper>
    );
};

// --- 3. SKELETON DEL SIDEBAR ---
const SidebarWrapper = styled.div`
  width: 100%;
  /* Altura adaptativa en móvil, fija en desktop */
  height: auto; 
  min-height: 150px;

  background: ${({ theme }) => theme.bgcards}; 
  border: 1px solid ${({ theme }) => theme.bg4}; 
  border-radius: 10px; 
  display: flex; 
  flex-direction: column; 
  overflow: hidden;
  box-sizing: border-box;
  
  @media (min-width: 768px) { 
      width: 280px; 
      height: 100%; 
      min-height: 500px; 
  }
`;

const SidebarContent = styled.div`
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const PlanningSidebarSkeleton = () => {
    return (
        <SidebarWrapper>
            <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Skeleton width="120px" height="15px" />
            </div>
            <SidebarContent>
                {/* Menos items en móvil para no hacer scroll infinito innecesario */}
                {[1, 2, 3].map((i) => (
                    <div key={i} style={{ 
                        padding: '10px', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                             <Skeleton width="30%" height="10px" />
                             <Skeleton width="30%" height="10px" />
                        </div>
                        <Skeleton width="80%" height="10px" />
                    </div>
                ))}
            </SidebarContent>
        </SidebarWrapper>
    );
};

// --- 4. SKELETON PRINCIPAL ---
const MainContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    /* Aseguramos que no exceda el viewport */
    max-width: 100%; 
    box-sizing: border-box;
    animation: fadein 0.5s ease;
    @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
`;

const Workspace = styled.div`
    display: flex;
    gap: 20px;
    min-height: 75vh;
    flex-direction: column; /* Móvil primero */
    
    @media(min-width:768px){ 
        flex-direction: row; 
    }
`;

const MainZone = styled.div`
    flex: 1;
    background: ${({theme}) => theme.bgcards};
    border: 2px dashed ${({theme}) => theme.bg4};
    border-radius: 10px;
    padding: 15px; /* Padding reducido en móvil */
    display: flex;
    flex-direction: column;
    gap: 15px;
    box-sizing: border-box;

    @media(min-width:768px){ 
        padding: 20px;
    }
`;

export const JornadaPlanificacionSkeleton = () => {
    return (
        <MainContainer>
            <PlanningHeaderSkeleton />

            <Workspace>
                <PlanningSidebarSkeleton />

                <MainZone>
                    <div style={{ paddingBottom: '5px' }}><Skeleton width="150px" height="15px" /></div>
                    <MatchRowSkeleton />
                    <MatchRowSkeleton />
                    
                    <div style={{ padding: '10px 0' }}><Skeleton width="100%" height="2px" /></div>
                    
                    <div style={{ paddingBottom: '5px' }}><Skeleton width="150px" height="15px" /></div>
                    <MatchRowSkeleton />
                    <MatchRowSkeleton />
                </MainZone>
            </Workspace>
        </MainContainer>
    );
};