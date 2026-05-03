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
// NUEVO: Importamos el modal de edición
import { ManagerEditAuthModal } from "../organismos/adminManagers/ManagerEditAuthModal";

export function AdminManagersTemplate({
  managers,
  onlineUsers = {},
  loading,
  createModalOpen,
  setCreateModalOpen,
  detailModalOpen,
  setDetailModalOpen,
  selectedManager,
  openDetailModal,
  
  // NUEVAS PROPS
  editAuthModalOpen,
  setEditAuthModalOpen,
  managerToEditAuth,
  openEditAuthModal,
  handleUpdateCredentials,
  handleUpdateManagerLimits,
  handleUpdateManagerSuspension,

  deleteModalState,
  setDeleteModalState,
  handleConfirmDelete,
  openDeleteModal,
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
      </PageHeader>

      <StyledContentContainer>
        <MainContainer>
            
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
                  onEditAuth={() => openEditAuthModal(manager)} // NUEVO EVENTO
                />
            ))}
            </GridContainer>
        </MainContainer>

        <ManagerDetailModal 
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          manager={selectedManager}
          onlineUsers={onlineUsers}
          onUpdateLimits={handleUpdateManagerLimits}
          onUpdateSuspension={handleUpdateManagerSuspension}
        />

        <ManagerCreateModal 
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          handleCreate={handleCreate}
        />

        {/* NUEVO MODAL DE EDICIÓN */}
        <ManagerEditAuthModal
          isOpen={editAuthModalOpen}
          onClose={() => setEditAuthModalOpen(false)}
          manager={managerToEditAuth}
          onUpdate={handleUpdateCredentials}
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
  margin-top: 60px; 
  position: relative; 
`;

const FloatingBtnWrapper = styled.div`
  position: absolute;
  top: -50px; 
  right: 0;
  z-index: 10;
  
  & > button {
    margin: 0 !important; 
    white-space: nowrap;

    @media (max-width: 768px) {
        padding: 8px 16px !important;
        font-size: 13px !important;
    }
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${v.mdSpacing};
  width: 100%;
  padding-bottom: ${v.xlSpacing};
  
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
