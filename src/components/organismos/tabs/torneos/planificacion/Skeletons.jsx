import React from "react";
import styled from "styled-components";
import { Skeleton } from "../../../../atomos/Skeleton";
import { v } from "../../../../../styles/variables";

// --- 1. SKELETON DEL HEADER ---
const HeaderWrapper = styled.div`
  background: ${({theme}) => theme.bg3};
  padding: 15px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  @media (min-width: 768px) { flex-direction: row; justify-content: space-between; align-items: center; }
`;

const HeaderLeft = styled.div`
  display: flex; gap: 15px; align-items: center; flex: 1;
`;

export const PlanningHeaderSkeleton = () => {
  return (
    <HeaderWrapper>
      <HeaderLeft>
        {/* Botón Prev */}
        <Skeleton width="36px" height="36px" radius="50%" />
        
        {/* Título Central */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
             <Skeleton width="120px" height="20px" />
             <Skeleton width="80px" height="12px" />
        </div>

        {/* Botón Next */}
        <Skeleton width="36px" height="36px" radius="50%" />

        {/* Inputs de Fecha (Desktop) */}
        <div style={{ marginLeft: '20px', display: 'flex', gap: '10px' }}>
            <Skeleton width="150px" height="35px" />
            <Skeleton width="150px" height="35px" />
        </div>
      </HeaderLeft>

      {/* Acciones Derecha */}
      <div style={{ display: 'flex', gap: '10px' }}>
         <Skeleton width="40px" height="40px" radius="8px" />
         <Skeleton width="40px" height="40px" radius="8px" />
      </div>
    </HeaderWrapper>
  );
};

// --- 2. SKELETON DEL MATCH ROW (ScheduledMatchRow) ---
const RowWrapper = styled.div`
  width: 100%;
  background: ${({theme}) => theme.bgtotal};
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({theme}) => theme.bg4};
  display: flex;
  flex-direction: column;
  gap: 12px;
  @media (min-width: 768px) { 
      flex-direction: row; 
      align-items: center; 
      justify-content: space-between; 
  }
`;

const TeamsGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
    flex: 1;
`;

export const MatchRowSkeleton = () => {
    return (
        <RowWrapper>
            <TeamsGroup>
                <Skeleton width="30%" height="16px" />
                <span style={{ opacity: 0.3 }}>VS</span>
                <Skeleton width="30%" height="16px" />
            </TeamsGroup>
            
            {/* Controles (Inputs o Botones) */}
            <div style={{ display: 'flex', gap: '10px', width: 'auto' }}>
                <Skeleton width="100px" height="32px" />
                <Skeleton width="80px" height="32px" />
                <Skeleton width="32px" height="32px" radius="4px" />
            </div>
        </RowWrapper>
    );
};

// --- 3. SKELETON DEL SIDEBAR (PlanningSidebar) ---
const SidebarWrapper = styled.div`
  width: 100%;
  height: 400px; /* Altura simulada */
  background: ${({ theme }) => theme.bgcards}; 
  border: 1px solid ${({ theme }) => theme.bg4}; 
  border-radius: 10px; 
  display: flex; 
  flex-direction: column; 
  overflow: hidden;
  
  @media (min-width: 768px) { width: 280px; height: 100%; min-height: 500px; }
`;

const SidebarHeader = styled.div`
    padding: 10px;
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
`;

const SidebarContent = styled.div`
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const PlanningSidebarSkeleton = () => {
    return (
        <SidebarWrapper>
            <SidebarHeader>
                <Skeleton width="60%" height="15px" />
            </SidebarHeader>
            <SidebarContent>
                {/* Simulamos varias cards de partidos pendientes */}
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ 
                        padding: '10px', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                             <Skeleton width="40%" height="12px" />
                             <Skeleton width="40%" height="12px" />
                        </div>
                        <Skeleton width="100%" height="10px" />
                    </div>
                ))}
            </SidebarContent>
        </SidebarWrapper>
    );
};

// --- 4. SKELETON PRINCIPAL (CONTENEDOR) ---
const MainContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    animation: fadein 0.5s ease;
    @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
`;

const Workspace = styled.div`
    display: flex;
    gap: 20px;
    min-height: 75vh;
    @media(max-width:768px){ flex-direction:column; height:auto; }
`;

const MainZone = styled.div`
    flex: 1;
    background: ${({theme}) => theme.bgcards};
    border: 2px dashed ${({theme}) => theme.bg4};
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
`;

export const JornadaPlanificacionSkeleton = () => {
    return (
        <MainContainer>
            {/* Header */}
            <PlanningHeaderSkeleton />

            <Workspace>
                {/* Sidebar */}
                <PlanningSidebarSkeleton />

                {/* Zona Principal con lista de partidos */}
                <MainZone>
                    {/* Simulamos una lista de partidos agendados */}
                    <div style={{ paddingBottom: '10px' }}><Skeleton width="120px" height="15px" /></div>
                    <MatchRowSkeleton />
                    <MatchRowSkeleton />
                    <div style={{ padding: '10px 0' }}><Skeleton width="100%" height="2px" /></div>
                    
                    <div style={{ paddingBottom: '10px' }}><Skeleton width="120px" height="15px" /></div>
                    <MatchRowSkeleton />
                    <MatchRowSkeleton />
                    <MatchRowSkeleton />
                </MainZone>
            </Workspace>
        </MainContainer>
    );
};