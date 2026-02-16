import React from "react";
import styled from "styled-components";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader"; 
import { Toast } from "../atomos/Toast";
import { Skeleton } from "../atomos/Skeleton";
import { Btnsave } from "../moleculas/Btnsave";

import { ConfirmModal } from "../organismos/ConfirmModal";
import { v } from "../../styles/variables";
import { Device } from "../../styles/breakpoints"; 

import { ManagerCard } from "../organismos/adminManagers/ManagerCard";
import { ManagerDetailModal } from "../organismos/adminManagers/ManagerDetailModal";
import { ManagerCreateModal } from "../organismos/adminManagers/ManagerCreateModal";

export function AdminManagersTemplate({
  managers,
  onlineUsers = {},
  loading,
  form,
  createModalOpen,
  setCreateModalOpen,
  detailModalOpen,
  setDetailModalOpen,
  selectedManager,
  openDetailModal,
  deleteModalState,
  setDeleteModalState,
  handleConfirmDelete,
  openDeleteModal,
  handleChange,
  handleCreate,
  toast,
  closeToast,
  state, 
  setState 
}) {

  const deleteMessage = deleteModalState.divisionsAffected.length > 0
    ? `⚠️ ADVERTENCIA CRÍTICA: Este manager gestiona una liga activa. Divisiones afectadas: ${deleteModalState.divisionsAffected.join(", ")}.`
    : "Esta acción borrará su perfil, sus ligas y torneos permanentemente.";

  return (
    <>
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={closeToast} />

      <PageHeader 
        title="Managers" 
        marginBottom="0"
        state={state}
        setState={setState}
      >
          {/* ELIMINADO: Ya no va aquí dentro */}
      </PageHeader>

      <StyledContentContainer>
        {/* Contenedor principal con posición relativa para anclar el botón */}
        <MainContainer>
            
            {/* BOTÓN FLOTANTE SATÉLITE */}
            <FloatingBtnWrapper>
                <Btnsave
                    titulo="Nuevo Manager"
                    bgcolor={v.colorPrincipal}
                    icono={<v.iconoagregar />}
                    funcion={() => setCreateModalOpen(true)}
                />
            </FloatingBtnWrapper>

            <GridContainer>
            {loading && Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i}>
                <Skeleton width="60px" height="60px" radius="50%" />
                <div className="texts">
                    <Skeleton width="120px" height="20px" radius="4px" />
                    <Skeleton width="180px" height="15px" radius="4px" />
                </div>
                </SkeletonCard>
            ))}

            {!loading && managers.length === 0 && (
                <EmptyState>
                <v.iconoemijivacio size={40}/>
                <p>No hay managers registrados.</p>
                </EmptyState>
            )}
            
            {!loading && managers.map((manager) => (
                <ManagerCard 
                key={manager.id} 
                manager={manager}
                online={!!onlineUsers[manager.id]}
                onlineUsers={onlineUsers}
                onClick={() => openDetailModal(manager)}
                onDelete={openDeleteModal}
                />
            ))}
            </GridContainer>
        </MainContainer>

        <ManagerDetailModal 
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          manager={selectedManager}
          onlineUsers={onlineUsers}
        />

        <ManagerCreateModal 
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          form={form}
          handleChange={handleChange}
          handleCreate={handleCreate}
          loading={loading}
        />

        <ConfirmModal 
          isOpen={deleteModalState.isOpen} 
          onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
          onConfirm={handleConfirmDelete}
          title="¿Eliminar Usuario?"
          message="Se eliminará el manager y sus datos."
          subMessage={deleteMessage}
          confirmText="Eliminar"
          confirmColor={v.rojo}
        />
      </StyledContentContainer>
    </>
  );
}

const StyledContentContainer = styled(ContentContainer)`
  && {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
`;

const MainContainer = styled.div`
  width: 100%;
  margin-top: 60px; /* Espacio superior igual que en Equipos para que no choque con el Header */
  position: relative; /* Necesario para que el botón absoluto se posicione respecto a esto */
`;

const FloatingBtnWrapper = styled.div`
  position: absolute;
  top: -50px; /* Lo subimos para que quede en el hueco entre el header y el contenido */
  right: 0;
  z-index: 10;
  
  /* Ajustes para el componente Btnsave interno si es necesario */
  & > button {
    margin: 0 !important; /* Reseteamos margenes que pueda traer el componente */
    white-space: nowrap;

    /* En móvil, ajustamos para que sea solo icono o más compacto */
    @media (max-width: 768px) {
        padding: 8px 16px !important;
        font-size: 13px !important;
        
        /* Si quieres ocultar texto en móvil como hicimos antes, descomenta esto: */
        /* span { display: inline-block !important; font-size: 13px; }
        svg { margin-right: 6px; } 
        */
    }
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${v.mdSpacing};
  width: 100%;
  padding-bottom: ${v.xlSpacing};
  /* Eliminamos margin-top extra aquí porque ya lo maneja MainContainer */
  
  @media ${Device.tablet} {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: ${v.lgSpacing};
  }
`;

const SkeletonCard = styled.div`
  background: ${({ theme }) => theme.bgcards};
  padding: ${v.mdSpacing};
  border-radius: ${v.borderRadius};
  display: flex; 
  flex-direction: column;
  align-items: center; 
  gap: 15px; 
  
  .texts { 
    display: flex; 
    flex-direction: column; 
    gap: 8px; 
    width: 100%; 
    align-items: center;
  }

  @media ${Device.tablet} {
    flex-direction: row;
    .texts {
      align-items: flex-start;
    }
  }
`;

const EmptyState = styled.div` 
  grid-column: 1 / -1; 
  padding: 60px; 
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${v.mdSpacing};
  color: ${({ theme }) => theme.text}; 
  opacity: 0.6; 
  background: ${({ theme }) => theme.bg2};
  border-radius: ${v.borderRadius};
  border: 1px dashed ${({ theme }) => theme.bg4};
  
  p {
    font-weight: 600;
  }
`;