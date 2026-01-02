import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { 
  ContentContainer, 
  Title, 
  Btnsave, 
  InputText2, 
  v, 
  Card, 
  CardHeader, 
  BtnNormal, 
  PhotoUploader, 
  TabsNavigation, 
  ConfirmModal,
  Skeleton,
  ContainerScroll,
  EmptyState
} from "../../index";
import { Modal } from "../organismos/Modal";
import { Toast } from "../atomos/Toast"; // <--- 1. Importar Toast
import { 
  RiPencilLine, RiDeleteBinLine, RiMagicLine, RiEraserLine, 
  RiShieldUserLine, RiSmartphoneLine, RiExchangeDollarLine, 
  RiUserFollowLine, RiArrowLeftLine
} from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";
import { Device } from "../../styles/breakpoints";
import { PlayerManager } from "../organismos/formularios/PlayerManager";
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
    const modalTabs = [
    { id: "info", label: "Datos del Equipo", icon: null },
    { id: "players", label: "Jugadores (Plantilla)", icon: <RiUserFollowLine /> }
  ];
  const [activeTab, setActiveTab] = useState("info");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [teamToTransfer, setTeamToTransfer] = useState(null);
  const [targetDivisionId, setTargetDivisionId] = useState("");
  const { divisiones } = useDivisionStore();

  const [showPlayerList, setShowPlayerList] = useState(false);
  const [detailPlayers, setDetailPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // --- 2. Estado del Toast ---
  const [toastConfig, setToastConfig] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToastConfig({ show: true, message, type });
  };

  const handleCloseToast = () => {
    setToastConfig((prev) => ({ ...prev, show: false }));
  };

  // --- 3. Wrappers para interceptar acciones y mostrar Toast ---
  const handleSaveWrapper = async (e) => {
    // Asumimos que onSave maneja el e.preventDefault() o lo hacemos aquí si es necesario
    try {
        await onSave(e); 
        // Si no lanza error, mostramos éxito
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

  useEffect(() => {
    if (!isDetailOpen) setShowPlayerList(false);
  }, [isDetailOpen]);

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
        showToast("Equipo transferido correctamente", "success"); // Toast aquí también
        setIsTransferModalOpen(false);
        setTimeout(() => window.location.reload(), 1000); // Dar tiempo a ver el toast
    } catch (error) {
        showToast("Error transfiriendo: " + error.message, "error");
    }
  };

  const handleShowPlayers = async () => {
    if (!teamToView) return;
    setShowPlayerList(true);
    setLoadingPlayers(true);
    try {
        const { data } = await supabase.from('players').select('*').eq('team_id', teamToView.id);
        setDetailPlayers(data || []);
    } catch (error) {
        console.error(error);
    } finally {
        setLoadingPlayers(false);
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
        <TabsNavigation 
             tabs={modalTabs}
             activeTab={activeTab}
             setActiveTab={setActiveTab}
          />
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

        {/* 5. Pasar showToast a PlayerManager */}
        {activeTab === "players" && teamToEdit && <TabContent><PlayerManager teamId={teamToEdit.id} showToast={showToast} /></TabContent>}
        {!teamToEdit && <div style={{marginTop: 10, opacity: 0.7, textAlign: 'center'}}>Guarda el equipo primero para poder agregar jugadores.</div>}
      </Modal>

      {/* --- MODAL DETALLES (FICHA TÉCNICA) --- */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={showPlayerList ? "Lista de Jugadores" : "Ficha del Equipo"}
        closeOnOverlayClick={true}
        width={showPlayerList ? "800px" : "550px"}
      >
        {teamToView && (
            <DetailContainer $color={teamToView.color}>
                {showPlayerList ? (
                     <div className="players-internal-view">
                        <button className="back-link-styled" onClick={() => setShowPlayerList(false)}>
                            <RiArrowLeftLine /> 
                            <span>Volver a Ficha</span>
                        </button>
                        <ContainerScroll $maxHeight="500px">
                        <div className="players-grid-simple">
                        {loadingPlayers ? (
                            Array.from({length: 8}).map((_, i) => (
                                <PlayerSkeletonWrapper key={i}>
                                    <Skeleton type="circle" width="60px" height="60px" />
                                    <div className="info-sk">
                                        <Skeleton width="70%" height="14px" />
                                        <Skeleton width="40%" height="10px" />
                                    </div>
                                </PlayerSkeletonWrapper>
                            ))
                             ) : (
                                detailPlayers.map(p => (
                                 <div className="player-chip-simple" key={p.id}>
                                     <img src={p.photo_url || "https://i.ibb.co/5vgZ0fX/hombre.png"} alt="p" />
                                     <div className="info-p">
                                        <span className="dorsal">#{p.dorsal}</span>
                                        <span className="name">{p.first_name} {p.last_name}</span>
                                        <span className="pos">{p.position || "Jugador"}</span>
                                     </div>
                                 </div>
                                ))
                             )}
                             {detailPlayers.length === 0 && !loadingPlayers && <p className="empty-msg">No hay jugadores registrados en este equipo.</p>}
                        </div>
                        </ContainerScroll>
                     </div>
                ) : (
                    <div className="ficha-view">
                        <div className="banner">
                            <div className="division-badge">{division?.name || "Liga"}</div>
                        </div>
                        <div className="logo-wrapper">
                            <img src={teamToView.logo_url || "https://i.ibb.co/MyJ50b7/logo-default.png"} alt={teamToView.name} />
                        </div>
                        <h2 className="team-title">{teamToView.name}</h2>
                        <div className="info-body">
                            <div className="info-item">
                                <div className="icon-box"><RiShieldUserLine /></div>
                                <div>
                                    <span className="label">Delegado</span>
                                    <p className="value">{teamToView.delegate_name || "No registrado"}</p>
                                </div>
                            </div>
                            <div className="info-item clickable" onClick={handleShowPlayers}>
                                <div className="icon-box"><RiUserFollowLine /></div>
                                <div style={{flex:1}}>
                                    <span className="label">Plantilla</span>
                                    <p className="value">Ver Jugadores</p>
                                </div>
                                <span className="arrow-icon">➔</span>
                            </div>
                            <div className="info-item">
                                <div className="icon-box"><RiSmartphoneLine /></div>
                                <div>
                                    <span className="label">Contacto</span>
                                    <p className="value">{teamToView.contact_phone || "No disponible"}</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="icon-box"><v.iconoemijivacio /></div>
                                <div>
                                    <span className="label">Estado Actual</span>
                                    <StatusPill $active={teamToView.status === 'Activo'}>
                                        {teamToView.status}
                                    </StatusPill>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DetailContainer>
        )}
      </Modal>

      {/* --- MODAL TRANSFERENCIA --- */}
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

      {/* --- MODAL CONFIRMACION DELETE --- */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteWrapper} // 6. Usar el wrapper aquí
        title="Eliminar Equipo"
        message="¿Realmente deseas eliminar este equipo?"
        subMessage="Esta acción borrará estadísticas y es irreversible."
      />

      {/* 7. Renderizar el componente Toast */}
      <Toast
        show={toastConfig.show}
        message={toastConfig.message}
        type={toastConfig.type}
        onClose={handleCloseToast}
      />

    </ContentContainer>
  );
}

// --- ESTILOS & ANIMACIONES ---


const slideInRight = keyframes`
  from { transform: translateX(50px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;
const slideInLeft = keyframes`
  from { transform: translateX(-50px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
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


const DetailContainer = styled.div`
    display: flex; flex-direction: column; align-items: center; position: relative; padding-bottom: 10px; width: 100%; overflow-x: hidden; 

/* VISTA LISTA DE JUGADORES */
    .players-internal-view { 
        width: 100%; 
        /* 👇 CAMBIO: Animación de entrada deslizando */
        animation: ${slideInRight} 0.4s cubic-bezier(0.25, 1, 0.5, 1); 
        padding: 0 10px;
    }
    
    /* MEJORA: Botón Volver estilizado */
    .back-link-styled { 
        background: ${({theme}) => theme.bgtotal}; 
        border: 1px solid ${({theme}) => theme.bg4};
        color: ${({theme}) => theme.text}; 
        cursor: pointer; 
        display: inline-flex; 
        align-items: center; 
        gap: 8px; 
        margin-bottom: 20px; 
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 20px;
        transition: all 0.2s ease;
        
        &:hover { 
            background: ${({theme}) => theme.bgcards}; 
            transform: translateX(-3px);
            border-color: ${v.colorPrincipal};
        }
        svg { font-size: 1.1rem; }
    }

    /* MEJORA: Grid de Jugadores más grandes */
    .players-grid-simple {
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); /* MEJORA: Contenedores más anchos */
        gap: 15px; 
    }

    /* MEJORA: Diseño de Card de Jugador */
    .player-chip-simple {
        background: ${({theme})=>theme.bgtotal}; 
        border: 1px solid ${({theme})=>theme.bg4}; 
        padding: 15px; 
        border-radius: 12px;
        display: flex; 
        flex-direction: column; /* Cambiado a columna para foto más grande */
        align-items: center; 
        gap: 10px;
        text-align: center;
        transition: transform 0.2s, box-shadow 0.2s;

        &:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            border-color: ${v.colorPrincipal};
        }

        img { 
            width: 60px; height: 60px; /* MEJORA: Foto más grande */
            border-radius: 50%; 
            object-fit: cover; 
            background: #eee; 
            border: 2px solid ${({theme})=>theme.bgcards};
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .info-p {
            display: flex; flex-direction: column; gap: 2px;
        }

        .dorsal { 
            font-weight: 900; 
            color: ${v.colorPrincipal}; 
            font-size: 1.1rem; 
        }
        .name { 
            font-size: 0.95rem; 
            font-weight: 600;
            line-height: 1.2; 
        }
        .pos {
            font-size: 0.75rem;
            opacity: 0.7;
            margin-top: 4px;
            background: ${({theme})=>theme.bgcards};
            padding: 2px 8px;
            border-radius: 10px;
        }
    }

    .empty-msg {
        text-align: center; width: 100%; opacity: 0.6; padding: 20px; font-style: italic; grid-column: 1 / -1;
    }

/* VISTA FICHA NORMAL */
    .ficha-view {
        width: 100%;
        display: flex; flex-direction: column; align-items: center;
        /* 👇 CAMBIO: Animación al volver deslizando desde el otro lado */
        animation: ${slideInLeft} 0.4s cubic-bezier(0.25, 1, 0.5, 1);
    }

    .banner {
        height: 150px; width: calc(100% + 50px); margin: -25px -25px 0 -25px;
        background: ${({$color}) => `linear-gradient(135deg, ${$color}, ${$color}aa)`};
        display: flex; justify-content: center; align-items: flex-start; padding-top: 35px; position: relative; overflow: hidden;
        &::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%); }
        .division-badge { background: rgba(0,0,0,0.3); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; z-index: 2; }
    }
    .logo-wrapper {
        width: 140px; height: 140px; margin-top: -70px; z-index: 5; background: transparent; display: flex; align-items: center; justify-content: center;
        img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 10px rgba(0,0,0,0.4)); transition: transform 0.3s; &:hover { transform: scale(1.05); } }
    }
    .team-title { margin: 15px 0 5px 0; text-align: center; color: ${({theme}) => theme.text}; font-size: 1.8 rem; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; }
.info-body { width: 100%; padding-top: 15px; display: flex; flex-direction: column; gap: 15px; }
.info-item {
    background: ${({theme}) => theme.bgtotal}; padding: 15px; border-radius: 12px; display: flex; align-items: center; gap: 15px; border: 1px solid ${({theme}) => theme.bg4};
    
    /* CORRECCIÓN: Hover arreglado para que no desborde */
    &.clickable {
        cursor: pointer; transition: all 0.2s ease;
        &:hover {
            border-color: ${v.colorPrincipal};
            background: ${({theme}) => theme.bgcards};
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            /* Eliminado translateX para evitar desborde */
            .arrow-icon { transform: translateX(5px); color: ${v.colorPrincipal}; } /* Animamos solo el icono */
        }
    }
    
    .arrow-icon { margin-left: auto; font-size: 1.1rem; opacity: 0.5; transition: transform 0.2s; }

    .icon-box { width: 40px; height: 40px; background: ${({theme}) => theme.bgcards}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: ${({theme}) => theme.text}; box-shadow: ${({theme}) => theme.boxshadowGray}; }
    .label { font-size: 0.8rem; color: ${({theme}) => theme.text}; opacity: 0.6; display: block; }
    .value { margin: 0; font-size: 1rem; font-weight: 600; color: ${({theme}) => theme.text}; }
}`;

/* --- NUEVOS WRAPPERS PARA SKELETONS --- */

// Wrapper para la Card del Equipo (Mantiene la forma de TeamCard)
const TeamCardSkeleton = styled.div`
    width: 250px; 
    height: 260px; 
    flex-shrink: 0; 
    background-color: ${({theme})=> theme.bgtotal};
    border: 1px solid ${({theme})=> theme.bg4}; 
    border-radius: 16px; 
    overflow: hidden; 
    display: flex; 
    flex-direction: column;

    .header-sk {
        height: 110px; 
        position: relative;
    }
    .logo-sk {
        position: absolute; 
        bottom: -25px; 
        left: 50%; 
        transform: translateX(-50%); 
        /* Borde del color del fondo para simular recorte */
        border: 4px solid ${({theme})=> theme.bgtotal}; 
        border-radius: 50%;
    }
    .body-sk {
        padding: 40px 15px 20px; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        gap: 10px;
    }
`;

// Wrapper para el Chip del Jugador
const PlayerSkeletonWrapper = styled.div`
  background: ${({theme})=>theme.bgtotal};
  border: 1px solid ${({theme})=>theme.bg4};
  border-radius: 12px; 
  padding: 15px;
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 10px;
  height: 160px;
  
  .info-sk {
      width: 100%;
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      gap: 6px;
  }
`;
const StatusPill = styled.span`    {display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 700;     background: ${({$active}) => $active ? 'rgba(46, 213, 115, 0.15)' : 'rgba(231, 76, 60, 0.15)'};     color: ${({$active}) => $active ? '#2ecc71' : '#e74c3c'}}`;
const StatusBadge = styled.div`
    position: absolute; 
    top: 10px; 
    right: 10px;
    background: ${({$active}) => $active ? '#068d3eff' : '#ad1605ff'};
    color: white; 
    font-size: 10px; 
    padding: 4px 8px; 
    border-radius: 10px; 
    font-weight: 700; 
    text-transform: uppercase;
    z-index: 2;
`;
const TabsContainer = styled.div`  {display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid ${({theme}) => theme.bg4}; padding-bottom: 10px}`;
const TabButton = styled.button ` background: ${({$active, theme}) => $active ? theme.bg4 : 'transparent'}; color: ${({$active, theme}) => $active ? theme.text : theme.text + '80'};   border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s;   border: 1px solid ${({$active, theme}) => $active ? theme.color2 : 'transparent'};   &:hover { background: ${({theme}) => theme.bgtotal}; }`;
