import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { 
  ContentContainer, Title, Btnsave, v, Card, CardHeader, 
  TabsNavigation, ConfirmModal, Skeleton, EmptyState, Toast,
  TeamDetailModal, PlayerManager, TeamCard, TeamForm, TeamTransferModal 
} from "../../index";
import { Modal } from "../organismos/Modal"; 
import { RiFileList3Line, RiGroupLine } from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";
import { useDivisionStore } from "../../store/DivisionStore";
import { supabase } from "../../supabase/supabase.config";
import { TabContent } from "../moleculas/TabsNavigation";

export function EquiposTemplate({ 
  equipos, division, loading, isUploading, form, preview, file,
  isFormOpen, setIsFormOpen, teamToEdit, isDetailOpen, setIsDetailOpen,
  teamToView, onFormChange, onFileChange, onClearImage, onGenerateLogo,
  onRemoveBg, onSave, onDelete, onCreate, onEdit, onView,
  isDeleteModalOpen, setIsDeleteModalOpen, onConfirmDelete,
}) {
    const modalTabs = [
      { id: "info", label: "Datos del Equipo", icon: <RiFileList3Line/> },
      { id: "players", label: "Jugadores (Plantilla)", icon: <RiGroupLine/> }
    ];
    
    const [activeTab, setActiveTab] = useState("info");
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [teamToTransfer, setTeamToTransfer] = useState(null);
    const { divisiones } = useDivisionStore();
    
    // Estado del Toast según el estándar solicitado
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

    const showToast = (msg, type = "success") => setToast({ show: true, msg, type });

    const handleSaveWrapper = async (e) => {
      try {
          await onSave(e); 
          showToast(teamToEdit ? "Equipo actualizado" : "Equipo creado", "success");
      } catch (error) {
          showToast("Error al guardar", "error");
      }
    };

    const handleTransferSubmit = async (targetId, team) => {
      if(!targetId) return showToast("Selecciona una división", "error");
      try {
          const { error } = await supabase.from('teams').update({ division_id: targetId }).eq('id', team.id);
          if(error) throw error;
          showToast("Equipo transferido correctamente", "success");
          setIsTransferModalOpen(false);
          setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
          showToast("Error: " + error.message, "error");
      }
    };

    useEffect(() => { if (isFormOpen) setActiveTab("info"); }, [isFormOpen]);

  return (
    <ContentContainer>
      <HeaderSection><Title>Equipos</Title></HeaderSection>

      <Card width="100%" maxWidth="1400px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <CardHeader Icono={IoMdFootball} titulo="Listado de Equipos" subtitulo={division ? `División: ${division.name}` : "Selecciona una división"} />
            <Btnsave titulo="" bgcolor={v.colorPrincipal} icono={<v.iconoagregar />} funcion={onCreate} disabled={!division} />
        </div>

        <Grid>
        {loading ? (
            Array.from({ length: 8 }).map((_, i) => <TeamCardSkeleton key={i} />)
            ) : (
                <>
                    {equipos.map((team) => (
                        <TeamCard 
                          key={team.id} team={team} onEdit={onEdit} onView={onView}
                          onDelete={onDelete} onTransfer={(t) => { setTeamToTransfer(t); setIsTransferModalOpen(true); }} 
                        />
                    ))}
                    {equipos.length === 0 && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <EmptyState icon={<IoMdFootball size={48} />} title="Sin Equipos" description="No hay equipos registrados." actionComponent={<Btnsave titulo="Crear Primer Equipo" bgcolor={v.colorPrincipal} icono={<v.iconoagregar />} funcion={onCreate} />} />
                      </div>
                    )}
                </>
            )}
        </Grid>
      </Card>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={teamToEdit ? `Gestionar: ${teamToEdit.name}` : "Registrar Equipo"}>
        {teamToEdit && <TabsWrapper><TabsNavigation tabs={modalTabs} activeTab={activeTab} setActiveTab={setActiveTab} /></TabsWrapper>}

        {activeTab === "info" && (
            <TabContent>
              <TeamForm 
                form={form} onFormChange={onFormChange} onSave={handleSaveWrapper} isUploading={isUploading}
                preview={preview} file={file} onFileChange={onFileChange} onClearImage={onClearImage}
                onGenerateLogo={onGenerateLogo} onRemoveBg={onRemoveBg} showToast={showToast} teamToEdit={teamToEdit}
              />
            </TabContent>
        )}

        {activeTab === "players" && teamToEdit && (
            <TabContent><PlayerManager teamId={teamToEdit.id} showToast={showToast} /></TabContent>
        )}
      </Modal>

      <TeamDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} team={teamToView} division={division} />

      <TeamTransferModal 
        isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} 
        team={teamToTransfer} divisiones={divisiones} currentDivision={division} onConfirm={handleTransferSubmit}
      />

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={() => onConfirmDelete().then(() => showToast("Eliminado", "success"))} title="Eliminar Equipo" message="¿Realmente deseas eliminar este equipo?" />

      <Toast 
        show={toast.show} 
        message={toast.msg} 
        type={toast.type} 
        onClose={() => setToast({ ...toast, show: false })} 
      />
    </ContentContainer>
  );
}

const HeaderSection = styled.div`margin-bottom: 10px; width: 100%; max-width: 1400px;`;
const Grid = styled.div`display: flex; flex-wrap: wrap; justify-content: center; gap: 25px; padding: 10px; width: 100%;`;
const TabsWrapper = styled.div`width: 100%; display: flex; flex-direction: column;`;

const TeamCardSkeleton = () => (
    <SkeletonContainer>
        <div className="header-sk"><Skeleton width="100%" height="100%" radius="0" /><div className="logo-sk"><Skeleton type="circle" width="85px" height="85px" /></div></div>
        <div className="body-sk"><Skeleton width="70%" height="20px" /><Skeleton width="50%" height="14px" /></div>
    </SkeletonContainer>
);

const SkeletonContainer = styled.div`
    width: 250px; height: 260px; background-color: ${({theme})=> theme.bgtotal}; border: 1px solid ${({theme})=> theme.bg4}; border-radius: 16px; overflow: hidden;
    .header-sk { height: 110px; position: relative; }
    .logo-sk { position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); border: 4px solid ${({theme})=> theme.bgtotal}; border-radius: 50%; }
    .body-sk { padding: 40px 15px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
`;