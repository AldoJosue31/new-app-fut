import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { BtnNormal } from "../moleculas/BtnNormal";
import { TabsNavigation, TabContent } from "../moleculas/TabsNavigation";
import { Skeleton } from "../atomos/Skeleton";
import { Toast } from "../atomos/Toast";
import { 
  TeamCard, TeamForm, TeamTransferModal, TeamDetailModal, PlayerManager, Card , BtnGreen
} from "../../index";
import { Modal } from "../organismos/Modal"; 
import { ConfirmModal } from "../organismos/ConfirmModal";
import { EmptyState } from "../organismos/EmptyState";
import { supabase } from "../../supabase/supabase.config";
import { useDivisionStore } from "../../store/DivisionStore";
import { RiFileList3Line, RiGroupLine } from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";

export const EquiposTemplate = ({ 
  equipos, division, loading, isUploading, form, preview, file,
  isFormOpen, setIsFormOpen, teamToEdit, isDetailOpen, setIsDetailOpen,
  teamToView, isDeleteModalOpen, setIsDeleteModalOpen,
  onFormChange, onFileChange, onClearImage, onGenerateLogo,
  onRemoveBg, onSave, onDelete, onCreate, onEdit, onView, onConfirmDelete,
  tabs,
  participatingIds = [] // <--- RECIBIMOS LA NUEVA PROP
}) => {
    const modalTabs = [
      { id: "info", label: "Datos del Equipo", icon: <RiFileList3Line/> },
      { id: "players", label: "Jugadores", icon: <RiGroupLine/> }
    ];
    const [activeTab, setActiveTab] = useState("info");
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [teamToTransfer, setTeamToTransfer] = useState(null);
    const { divisiones } = useDivisionStore();
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
    const showToast = (msg, type = "success") => setToast({ show: true, msg, type });

    const handleSaveWrapper = async (e) => {
      try { await onSave(e); showToast(teamToEdit ? "Equipo actualizado" : "Equipo creado", "success"); } 
      catch (error) { showToast("Error al guardar", "error"); }
    };

    const handleTransferSubmit = async (targetId, team) => {
      if(!targetId) return showToast("Selecciona una división", "error");
      try {
          const { error } = await supabase.from('teams').update({ division_id: targetId }).eq('id', team.id);
          if(error) throw error;
          showToast("Equipo transferido correctamente", "success");
          setIsTransferModalOpen(false);
          setTimeout(() => window.location.reload(), 1000);
      } catch (error) { showToast("Error: " + error.message, "error"); }
    };

    useEffect(() => { if (isFormOpen) setActiveTab("info"); }, [isFormOpen]);

  const VIEW_MAX_WIDTH = "1400px";

  return (
    <ContentContainer>
      <PageHeader title="Gestión de Equipos" tabs={tabs} maxWidth={VIEW_MAX_WIDTH}>
         <BtnGreen 
            onClick={onCreate} 
            disabled={!division} 
            icono={<IoMdFootball/>}
         >
            Crear Equipo
         </BtnGreen>
      </PageHeader>
      
      <MainContainer $maxWidth={VIEW_MAX_WIDTH}>
        <Card width="100%" maxWidth="100%">
          <div style={{ width: '100%' }}>
              <Grid>
              {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <TeamCardSkeleton key={i} />)
                  ) : (
                      <>
                          {Array.isArray(equipos) && equipos.map((team) => {
                              // Verificación segura de participación (convierte a string para evitar errores de tipo)
                              const isParticipating = participatingIds.some(pid => String(pid) === String(team.id));

                              return (
                                <TeamCard 
                                  key={team.id} 
                                  team={team} 
                                  onEdit={onEdit} 
                                  onView={onView}
                                  onDelete={onDelete} 
                                  onTransfer={(t) => { setTeamToTransfer(t); setIsTransferModalOpen(true); }}
                                  isParticipating={isParticipating} // <--- PASAMOS EL ESTADO
                                />
                              );
                          })}
                          {(!equipos || equipos.length === 0) && (
                            <div style={{ gridColumn: "1 / -1", width: "100%" }}>
                              <EmptyState 
                                  icon={<IoMdFootball size={48} />} 
                                  title="Sin Equipos" 
                                  description={division ? `No hay equipos en ${division.name}` : "Selecciona una división"} 
                                  actionComponent={<BtnNormal onClick={onCreate} disabled={!division}>Crear Primer Equipo</BtnNormal>} 
                              />
                            </div>
                          )}
                      </>
                  )}
              </Grid>
          </div>
        </Card>
      </MainContainer>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={teamToEdit ? `Editar: ${teamToEdit.name}` : "Nuevo Equipo"} closeOnOverlayClick={false}>
        {teamToEdit && (<TabsWrapper><TabsNavigation tabs={modalTabs} activeTab={activeTab} setActiveTab={setActiveTab} /></TabsWrapper>)}
        {activeTab === "info" && (
            <TabContent>
              <TeamForm form={form} onFormChange={onFormChange} onSave={handleSaveWrapper} isUploading={isUploading}
                preview={preview} file={file} onFileChange={onFileChange} onClearImage={onClearImage}
                onGenerateLogo={onGenerateLogo} onRemoveBg={onRemoveBg} showToast={showToast} teamToEdit={teamToEdit}
              />
            </TabContent>
        )}
        {activeTab === "players" && teamToEdit && (<TabContent><PlayerManager teamId={teamToEdit.id} showToast={showToast} /></TabContent>)}
      </Modal>

      <TeamDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} team={teamToView} division={division} />
      <TeamTransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} team={teamToTransfer} divisiones={divisiones} currentDivision={division} onConfirm={handleTransferSubmit} />
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={() => onConfirmDelete().then(() => showToast("Eliminado", "success"))} title="Eliminar Equipo" message="¿Deseas eliminar este equipo?" />
      <Toast show={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
    </ContentContainer>
  );
};

// Limpio: Animación eliminada (ya viene del ContentContainer)
const MainContainer = styled.div`
  width: 100%;
  max-width: ${(props) => props.$maxWidth || '1400px'};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
`;

const Grid = styled.div`display: flex; flex-wrap: wrap; justify-content: center; gap: 25px; width: 100%;`;
const TabsWrapper = styled.div`width: 100%; display: flex; flex-direction: column; margin-bottom: 20px;`;
const TeamCardSkeleton = () => (
    <SkeletonContainer>
        <div className="header-sk"><Skeleton width="100%" height="100%" radius="0" /><div className="logo-sk"><Skeleton type="circle" width="85px" height="85px" /></div></div>
        <div className="body-sk"><Skeleton width="70%" height="20px" /><Skeleton width="50%" height="14px" /></div>
    </SkeletonContainer>
);
const SkeletonContainer = styled.div`width: 250px; height: 260px; background-color: ${({theme})=> theme.bgtotal}; border: 1px solid ${({theme})=> theme.bg4}; border-radius: 16px; overflow: hidden; .header-sk { height: 110px; position: relative; } .logo-sk { position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); border: 4px solid ${({theme})=> theme.bgtotal}; border-radius: 50%; } .body-sk { padding: 40px 15px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }`;