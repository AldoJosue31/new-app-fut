import React from "react";
import styled from "styled-components";
import { 
  ContentContainer, 
  Title, 
  Btnsave, 
  Card, 
  Toast,
  Skeleton
} from "../../index"; 
import { ConfirmModal } from "../organismos/ConfirmModal";
import { v } from "../../styles/variables";

// Importamos los nuevos componentes modularizados
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
    ? `⚠️ ADVERTENCIA CRÍTICA: Este manager gestiona una liga activa. Al eliminarlo, se borrarán IRREVERSIBLEMENTE las divisiones: ${deleteModalState.divisionsAffected.join(", ")}.`
    : "Esta acción borrará su perfil, sus ligas y torneos permanentemente.";

  return (
    <ContentContainer>
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={closeToast} />

      <HeaderSection>
        <Title>Gestión de Managers</Title>
        <Btnsave
          titulo="Nuevo Manager"
          bgcolor={v.colorPrincipal}
          icono={<v.iconoagregar />}
          funcion={() => setCreateModalOpen(true)}
        />
      </HeaderSection>

      <GridContainer>
        {/* --- LOADING SKELETONS --- */}
        {loading && Array.from({ length: 6 }).map((_, i) => (
           <Card key={i} maxWidth="100%">
             <SkeletonWrapper>
               <Skeleton width="50px" height="50px" radius="50%" />
               <div className="texts">
                 <Skeleton width="60%" height="20px" radius="4px" />
                 <Skeleton width="40%" height="15px" radius="4px" />
               </div>
             </SkeletonWrapper>
           </Card>
        ))}

        {!loading && managers.length === 0 && (
          <EmptyState>No hay managers registrados.</EmptyState>
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

      {/* --- MODALES --- */}
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

// --- STYLED COMPONENTS DEL TEMPLATE PRINCIPAL ---
const HeaderSection = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px; width: 100%; max-width: 1000px; gap: 10px; flex-wrap: wrap;
`;

const GridContainer = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px; width: 100%; max-width: 1000px;
`;

const SkeletonWrapper = styled.div`
  display: flex; align-items: center; gap: 15px; padding: 5px;
  .texts { display: flex; flex-direction: column; gap: 8px; width: 100%; }
`;

const EmptyState = styled.div` 
  grid-column: 1 / -1; padding: 40px; text-align: center; color: ${({ theme }) => theme.text}; opacity: 0.6; 
`;