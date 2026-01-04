import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { 
  ContentContainer, 
  Title, 
  Btnsave, 
  InputText2, 
  v, 
  Card, 
  CardHeader, 
  PhotoUploader, 
  TabsNavigation, 
  ConfirmModal,
  Skeleton,
  EmptyState,
  Toast,
  TeamDetailModal,
  PlayerManager 
} from "../../index";
import { Modal } from "../organismos/Modal"; 
import { 
  RiPencilLine, RiDeleteBinLine, RiMagicLine, RiEraserLine, 
  RiExchangeDollarLine, 
  RiFileList3Line, // <--- Icono para Datos
  RiGroupLine      // <--- Icono para Jugadores
} from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";
import { Device } from "../../styles/breakpoints";
import { useDivisionStore } from "../../store/DivisionStore";
import { supabase } from "../../supabase/supabase.config";
import { TabContent } from "../moleculas/TabsNavigation";

export function EquiposTemplate({ 
  equipos, 
  division, 
  loading, 
  isUploading,
  form,
  preview,
  file,
  isFormOpen,
  setIsFormOpen,
  teamToEdit,
  isDetailOpen,
  setIsDetailOpen,
  teamToView,
  onFormChange,
  onFileChange,
  onClearImage,
  onGenerateLogo,
  onRemoveBg,
  onSave,
  onDelete,
  onCreate,
  onEdit,
  onView,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  onConfirmDelete,
}) {
    // 1. CORRECCIÓN: Agregamos iconos para que se vean en móvil
    const modalTabs = [
      { id: "info", label: "Datos del Equipo", icon: <RiFileList3Line/> },
      { id: "players", label: "Jugadores (Plantilla)", icon: <RiGroupLine/> }
    ];
    
    const [activeTab, setActiveTab] = useState("info");
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [teamToTransfer, setTeamToTransfer] = useState(null);
    const [targetDivisionId, setTargetDivisionId] = useState("");
    const { divisiones } = useDivisionStore();

    // Estado local para Toast
    const [toastConfig, setToastConfig] = useState({ show: false, message: "", type: "success" });

    const showToast = (message, type = "success") => {
      setToastConfig({ show: true, message, type });
    };

    const handleSaveWrapper = async (e) => {
      try {
          await onSave(e); 
          showToast(teamToEdit ? "Equipo actualizado correctamente" : "Equipo creado correctamente", "success");
      } catch (error) {
          console.error(error);
          showToast("Error al guardar el equipo", "error");
      }
    };

    const handleDeleteWrapper = async () => {
      try {
          await onConfirmDelete();
          showToast("Equipo eliminado correctamente", "success");
      } catch (error) {
          showToast("Error al eliminar el equipo", "error");
      }
    };

    useEffect(() => {
      if (isFormOpen) setActiveTab("info");
    }, [isFormOpen]);

    const handleOpenTransfer = (e, team) => {
      e.stopPropagation();
      setTeamToTransfer(team);
      setTargetDivisionId("");
      setIsTransferModalOpen(true);
    };

    const handleTransferSubmit = async () => {
      if(!targetDivisionId) return alert("Selecciona una división destino");
      try {
          const { error } = await supabase.from('teams')
            .update({ division_id: targetDivisionId })
            .eq('id', teamToTransfer.id);
          
          if(error) throw error;
          showToast("Equipo transferido correctamente", "success");
          setIsTransferModalOpen(false);
          setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
          showToast("Error transfiriendo: " + error.message, "error");
      }
    };

  return (
    <ContentContainer>
      <HeaderSection>
        <Title>Equipos</Title>
      </HeaderSection>

      <Card width="100%" maxWidth="1400px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <CardHeader 
                Icono={IoMdFootball}
                titulo="Listado de Equipos"
                subtitulo={division ? `División: ${division.name}` : "Selecciona una división"}
            />
             <Btnsave 
                titulo="" 
                bgcolor={v.colorPrincipal} 
                icono={<v.iconoagregar />} 
                funcion={onCreate}
                disabled={!division}
            />
        </div>

        <Grid>
        {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
                <TeamCardSkeleton key={index}>
                    <div className="header-sk">
                        <Skeleton width="100%" height="100%" radius="0" />
                        <div className="logo-sk">
                            <Skeleton type="circle" width="85px" height="85px" />
                        </div>
                    </div>
                    <div className="body-sk">
                        <Skeleton width="70%" height="20px" />
                        <Skeleton width="50%" height="14px" />
                    </div>
                </TeamCardSkeleton>
            ))
            ) : (
                <>
                    {equipos.map((team) => (
                        <TeamCard key={team.id} onClick={() => onView(team)}>
                            <div className="card-top" style={{ background: `linear-gradient(135deg, ${team.color}cc, ${team.color})` }}>
                                <ActionButtons>
                                    <button className="btn-edit" onClick={(e) => { e.stopPropagation(); onEdit(team); }} title="Editar"><RiPencilLine /></button>
                                    <button className="btn-transfer" onClick={(e) => handleOpenTransfer(e, team)} title="Transferir"><RiExchangeDollarLine /></button>
                                    <button className="btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(team.id); }} title="Eliminar"><RiDeleteBinLine /></button>
                                </ActionButtons>
                                <StatusBadge $active={team.status === 'Activo'}>
                                    {team.status}
                                </StatusBadge>
                                <LogoImg src={team.logo_url || "https://i.ibb.co/MyJ50b7/logo-default.png"} alt={team.name} />
                            </div>
                            <div className="card-body">
                                <h3>{team.name}</h3>
                                <div className="info-row"><v.iconoUser className="icon"/><span>{team.delegate_name || "Sin delegado"}</span></div>
                                <div className="info-row"><span>📞 {team.contact_phone || "--"}</span></div>
                            </div>
                        </TeamCard>
                    ))}
                    {equipos.length === 0 && !loading && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <EmptyState
                          icon={<IoMdFootball size={48} />}
                          title="Sin Equipos"
                          description="No hay equipos registrados en esta división."
                          actionComponent={
                            <Btnsave 
                              titulo="Crear Primer Equipo" 
                              bgcolor={v.colorPrincipal} 
                              icono={<v.iconoagregar />} 
                              funcion={onCreate} 
                            />
                          }
                        />
                      </div>
                    )}
                </>
            )}
        </Grid>
      </Card>

      {/* --- MODAL FORMULARIO --- */}
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        title={teamToEdit ? `Gestionar: ${teamToEdit.name}` : "Registrar Equipo"}
        closeOnOverlayClick={false}
      >
        {teamToEdit && (
            // 2. CORRECCIÓN: Wrapper para asegurar el ancho correcto en el modal
            <TabsWrapper>
                <TabsNavigation 
                     tabs={modalTabs}
                     activeTab={activeTab}
                     setActiveTab={setActiveTab}
                />
            </TabsWrapper>
        )}

        {activeTab === "info" && (
            <TabContent>
              <Form onSubmit={handleSaveWrapper}>
                <div className="logo-section" style={{ background: form.color ? `${form.color}33` : undefined, borderColor: form.color }}>
                    <div className="preview-container">
                        <PhotoUploader 
                            previewUrl={preview}
                            onImageSelect={(file, url) => { onFileChange({ target: { files: [file] } }); }}
                            onClear={onClearImage}
                            shape="circle"
                            width="120px" height="120px"
                        />
                    </div>
                    <input id="file-upload" type="file" accept="image/*" onChange={onFileChange} style={{display:'none'}}/>
                    <div className="actions-column">
                        {!preview && <button type="button" className="btn-magic" onClick={onGenerateLogo}><RiMagicLine /> Generar Logo Auto</button>}
                        {file && <button type="button" className="btn-eraser" onClick={onRemoveBg}><RiEraserLine /> Quitar Fondo</button>}
                    </div>
                </div>

                <div className="grid-inputs">
                    <div className="full-width">
                        <span className="label">Nombre del Equipo *</span>
                        <InputText2><input className="form__field" name="name" value={form.name} onChange={onFormChange} required placeholder="Ej. Rayados" /></InputText2>
                    </div>
                    <div>
                        <span className="label">Delegado</span>
                        <InputText2><input className="form__field" name="delegate_name" value={form.delegate_name} onChange={onFormChange} placeholder="Nombre del DT" /></InputText2>
                    </div>
                    <div>
                        <span className="label">Teléfono</span>
                        <InputText2><input className="form__field" name="contact_phone" value={form.contact_phone} onChange={onFormChange} placeholder="Contacto" type="tel" /></InputText2>
                    </div>
                    <div>
                        <span className="label">Color Uniforme</span>
                        <ColorInputContainer>
                            <input type="color" name="color" value={form.color} onChange={onFormChange} />
                            <span>{form.color}</span>
                        </ColorInputContainer>
                    </div>
                    <div>
                        <span className="label">Estado</span>
                        <SelectStyled name="status" value={form.status} onChange={onFormChange}>
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                            <option value="Suspendido">Suspendido</option>
                        </SelectStyled>
                    </div>
                </div>
                
                <div className="actions">
                    <Btnsave titulo={isUploading ? "Guardando..." : "Guardar Equipo"} bgcolor={v.colorPrincipal} icono={<v.iconoguardar />} disabled={isUploading} width="100%"/>
                </div>
              </Form>
            </TabContent>
        )}

        {/* Gestor de Jugadores */}
        {activeTab === "players" && teamToEdit && (
            <TabContent>
                <PlayerManager teamId={teamToEdit.id} showToast={showToast} />
            </TabContent>
        )}
        {!teamToEdit && <div style={{marginTop: 10, opacity: 0.7, textAlign: 'center'}}>Guarda el equipo primero para poder agregar jugadores.</div>}
      </Modal>

      <TeamDetailModal 
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        team={teamToView}
        division={division}
      />

      {/* --- OTROS MODALES --- */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Transferir de División" width="400px">
         <div style={{display:'flex', flexDirection:'column', gap:'15px', padding:'10px'}}>
             <p>Selecciona la nueva división para <b>{teamToTransfer?.name}</b>:</p>
             <SelectStyled value={targetDivisionId} onChange={(e)=>setTargetDivisionId(e.target.value)}>
                 <option value="">-- Seleccionar --</option>
                 {divisiones.filter(d => d.id !== division?.id).map(d => (
                     <option key={d.id} value={d.id}>{d.name}</option>
                 ))}
             </SelectStyled>
             <Btnsave titulo="Confirmar Transferencia" bgcolor={v.colorPrincipal} funcion={handleTransferSubmit} width="100%" />
         </div>
      </Modal>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteWrapper}
        title="Eliminar Equipo"
        message="¿Realmente deseas eliminar este equipo?"
        subMessage="Esta acción borrará estadísticas y es irreversible."
      />

      <Toast
        show={toastConfig.show}
        message={toastConfig.message}
        type={toastConfig.type}
        onClose={() => setToastConfig((prev) => ({ ...prev, show: false }))}
      />

    </ContentContainer>
  );
}

// --- ESTILOS ---

// Wrapper de seguridad para tabs en modal
const TabsWrapper = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const HeaderSection = styled.div`
  margin-bottom: 10px; width: 100%; max-width: 1400px;
`;

const Grid = styled.div`
  display: flex; flex-wrap: wrap; justify-content: center; gap: 25px; padding: 10px; width: 100%; margin: 0 auto;
  @media ${Device.desktop} { max-width: 1400px; }
`;

const TeamCard = styled.div`
    width: 250px; flex-shrink: 0; background-color: ${({theme})=> theme.bgtotal}; border: 1px solid ${({theme})=> theme.bg4};
    border-radius: 16px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; cursor: pointer;
    animation: ${fadeIn} 0.5s ease-out forwards;
    &:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
    .card-top { height: 110px; position: relative; display: flex; justify-content: center; align-items: flex-end; }
    .card-body { padding: 35px 15px 20px; text-align: center; flex: 1; 
        h3 { margin: 0 0 10px 0; color: ${({theme})=> theme.text}; font-size: 1.1rem; font-weight: 700; }
        .info-row { display: flex; align-items: center; justify-content: center; gap: 6px; color: ${({theme})=> theme.text}; opacity: 0.7; font-size: 0.85rem; margin-bottom: 6px; } }
`;

const LogoImg = styled.img`
    width: 85px; height: 85px; object-fit: contain; background-color: transparent; border: none;
    position: absolute; bottom: -25px; filter: drop-shadow(0 6px 6px rgba(0,0,0,0.3));
    transition: transform 0.3s; ${TeamCard}:hover & { transform: scale(1.1); }
`;

const ActionButtons = styled.div`
    position: absolute; top: 10px; left: 10px; display: flex; gap: 8px;
    button { width: 28px; height: 28px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); color: white; }
    .btn-edit { background: rgba(255, 255, 255, 0.25); backdrop-filter: blur(4px); &:hover { background: ${({theme}) => theme.primary || v.colorPrincipal}; } }
    .btn-delete { background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(4px); &:hover { background: #ff4757; } }
    .btn-transfer { background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(4px); &:hover { background: #f39c12; } }
`;

const Form = styled.form`
    display: flex; flex-direction: column; gap: 20px;
    .label { font-weight: 600; font-size: 13px; margin-bottom: 5px; display: block; opacity: 0.8; }
    .logo-section { display: flex; gap: 20px; align-items: flex-start; padding: 10px; background: ${({theme}) => theme.bgtotal}; border-radius: 12px; border: 1px dashed ${({theme}) => theme.bg4}; transition: background 0.3s; 
        .preview-container { position: relative; width: fit-content; }
        .actions-column { display: flex; flex-direction: column; gap: 10px; justify-content: center; height: 100px; }
        .btn-magic, .btn-eraser { border: none; padding: 8px 12px; border-radius: 8px; color: white; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-magic { background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); }
        .btn-eraser { background: #ff4757; }
    }
    .grid-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; .full-width { grid-column: span 2; } }
    .actions { margin-top: 10px; }
`;

const ColorInputContainer = styled.div`
  display: flex; align-items: center; gap: 10px; background: ${({theme}) => theme.bgtotal}; padding: 8px; border-radius: 12px; border: 1px solid ${({theme}) => theme.bg4};
  input[type="color"] { border: none; width: 30px; height: 30px; cursor: pointer; background: none; }
`;
const SelectStyled = styled.select`
  width: 100%; padding: 12px; border-radius: 15px; border: 2px solid ${({ theme }) => theme.color2}; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; font-family: inherit; outline: none;
`;

const TeamCardSkeleton = styled.div`
    width: 250px; height: 260px; flex-shrink: 0; background-color: ${({theme})=> theme.bgtotal}; border: 1px solid ${({theme})=> theme.bg4}; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;
    .header-sk { height: 110px; position: relative; }
    .logo-sk { position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); border: 4px solid ${({theme})=> theme.bgtotal}; border-radius: 50%; }
    .body-sk { padding: 40px 15px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
`;

const StatusBadge = styled.div`
    position: absolute; top: 10px; right: 10px;
    background: ${({$active}) => $active ? '#068d3eff' : '#ad1605ff'};
    color: white; font-size: 10px; padding: 4px 8px; border-radius: 10px; font-weight: 700; text-transform: uppercase; z-index: 2;
`;