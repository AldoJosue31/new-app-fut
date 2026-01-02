import React from "react";
import styled from "styled-components";
import { 
  ContentContainer, 
  Title, 
  Btnsave, 
  Toast,
  Skeleton
} from "../../index"; 
import { ConfirmModal } from "../organismos/ConfirmModal";
import { v } from "../../styles/variables";
import { Device } from "../../styles/breakpoints"; // Importante

import { ManagerCard } from "../organismos/adminManagers/ManagerCard";
import { ManagerDetailModal } from "../organismos/adminManagers/ManagerDetailModal";
import { ManagerCreateModal } from "../organismos/adminManagers/ManagerCreateModal";

export function AdminManagersTemplate({
  managers,
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
  closeToast
}) {

  const deleteMessage = deleteModalState.divisionsAffected.length > 0
    ? `⚠️ ADVERTENCIA CRÍTICA: Este manager gestiona una liga activa. Divisiones afectadas: ${deleteModalState.divisionsAffected.join(", ")}.`
    : "Esta acción borrará su perfil, sus ligas y torneos permanentemente.";

  return (
    <ContentContainer>
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={closeToast} />

      <HeaderSection>
        <div className="title-area">
          <Title>Gestión de Managers</Title>
          <span className="subtitle">Administra los accesos y roles</span>
        </div>
        <div className="actions-area">
          <Btnsave
            titulo="Nuevo Manager"
            bgcolor={v.colorPrincipal}
            icono={<v.iconoagregar />}
            funcion={() => setCreateModalOpen(true)}
          />
        </div>
      </HeaderSection>

      <GridContainer>
        {/* --- LOADING SKELETONS --- */}
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
        
        {/* --- LISTA DE CARDS --- */}
        {!loading && managers.map((manager) => (
          <ManagerCard 
            key={manager.id} 
            manager={manager}
            onClick={() => openDetailModal(manager)}
            onDelete={openDeleteModal}
          />
        ))}
      </GridContainer>

      {/* --- MODALES (Sin cambios en lógica) --- */}
      <ManagerDetailModal 
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        manager={selectedManager}
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
    </ContentContainer>
  );
}

// --- STYLED COMPONENTS DEL TEMPLATE ---

const HeaderSection = styled.div`
  display: flex; 
  flex-direction: column;
  gap: ${v.mdSpacing};
  margin-bottom: ${v.lgSpacing};
  width: 100%;

  .title-area {
    display: flex;
    flex-direction: column;
    .subtitle {
      color: ${({ theme }) => theme.text};
      opacity: 0.7;
      font-size: 14px;
    }
  }

  .actions-area {
    width: 100%;
    button {
      width: 100%; // Botón full width en móvil
    }
  }

  // Estilos Tablet y Desktop
  @media ${Device.tablet} {
    flex-direction: row; 
    justify-content: space-between; 
    align-items: center;

    .actions-area {
      width: auto;
      button {
        width: auto;
      }
    }
  }
`;

const GridContainer = styled.div`
  display: grid;
  // Mobile: 1 columna
  grid-template-columns: 1fr;
  gap: ${v.mdSpacing};
  width: 100%;
  padding-bottom: ${v.xlSpacing};

  // Tablet: 2 columnas, o Grid automático con mínimo de 300px
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