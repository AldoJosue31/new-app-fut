import React, { useState } from "react";
import styled from "styled-components";
import { 
  ContentContainer, 
  Title, 
  Btnsave, 
  Card, 
  Modal, 
  InputText2,
  Toast,
  Badge,          
  ContainerScroll,
  BtnNormal,
  Skeleton
} from "../../index"; 
// Importamos TabContent también para las animaciones
import { TabsNavigation, TabContent } from "../moleculas/TabsNavigation";
import { ConfirmModal } from "../organismos/ConfirmModal";
import { v } from "../../styles/variables";
import { 
  BiTrash, 
  BiUserCircle, 
  BiLogoGoogle, 
  BiTime, 
  BiIdCard, 
  BiTrophy,
  BiGridAlt,
  BiWifi,
  BiWifiOff,
  BiEnvelope
} from "react-icons/bi"; 

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

  // Definimos los tabs como OBJETOS, igual que en EquiposTemplate
  const managerTabs = [
    { id: 0, label: "Perfil & Cuenta" },
    { id: 1, label: "Gestión Deportiva" }
  ];
  
  const [activeTab, setActiveTab] = useState(0);

  // --- LÓGICA DE DETECCIÓN GOOGLE Y ESTADO ---
  const getGoogleInfo = (manager) => {
    if (!manager) return { linked: false };
    const isGoogleAvatar = manager.avatar_url?.includes("googleusercontent");
    const isGmail = manager.email?.includes("@gmail.com");
    
    if (isGoogleAvatar || isGmail) {
      return { linked: true, email: manager.email };
    }
    return { linked: false, email: null };
  };

  const formatDate = (dateString) => {
    if(!dateString) return "---";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getConnectionStatus = (lastSignIn) => {
    if (!lastSignIn) return { status: "Desconectado", color: v.gray, icon: <BiWifiOff/> };
    
    const last = new Date(lastSignIn).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - last) / (1000 * 60);

    if (diffMinutes < 15) return { status: "En Línea", color: v.verde, icon: <BiWifi/> };
    return { status: "Desconectado", color: v.gray, icon: <BiWifiOff/> };
  };

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
        {/* --- LOADING --- */}
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
        
        {/* --- LISTA --- */}
        {!loading && managers.map((manager) => (
          <StyledCard key={manager.id} maxWidth="100%" onClick={() => openDetailModal(manager)}>
            <CardContent>
              <div className="left-section">
                <div className="avatar-container">
                  {manager.avatar_url ? <img src={manager.avatar_url} alt="avatar" /> : <v.iconoUser />}
                </div>
                <div className="text-info">
                  <h3>{manager.full_name || "Sin Nombre"}</h3>
                  <span className="email">{manager.email}</span>
                  {manager.leagues?.[0] ? (
                    <span className="league-tag">
                      <v.iconocorona /> {manager.leagues[0].name}
                    </span>
                  ) : (
                    <span className="no-league-tag">Sin Liga Asignada</span>
                  )}
                </div>
              </div>
              <div className="actions">
                <DeleteButton 
                  onClick={(e) => { e.stopPropagation(); openDeleteModal(manager.email); }}
                  title="Eliminar"
                >
                  <BiTrash />
                </DeleteButton>
              </div>
            </CardContent>
          </StyledCard>
        ))}
      </GridContainer>

      {/* --- MODAL DETALLES --- */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Perfil de Usuario"
        width="600px"
      >
        {selectedManager && (
          <DetailContainer>
            
            <DetailHeader>
               <div className="profile-image">
                  {selectedManager.avatar_url ? <img src={selectedManager.avatar_url} alt="av" /> : <BiUserCircle size={60}/>}
               </div>
               <div className="profile-summary">
                 <h2>{selectedManager.full_name}</h2>
                 <div className="badges-row">
                    {/* USO CORRECTO DEL BADGE: Pasando children */}
                    <Badge color={v.colorPrincipal}>
                        Manager
                    </Badge>
                    
                    <Badge color={getConnectionStatus(selectedManager.last_sign_in_at).color}>
                       <FlexRow>
                          {getConnectionStatus(selectedManager.last_sign_in_at).icon}
                          {getConnectionStatus(selectedManager.last_sign_in_at).status}
                       </FlexRow>
                    </Badge>
                 </div>
               </div>
            </DetailHeader>

            {/* NAVEGACIÓN TABS CORREGIDA: Pasando array de objetos */}
            <TabsNavigation 
               tabs={managerTabs}
               activeTab={activeTab}
               setActiveTab={setActiveTab}
            />

            {/* TAB 0: DATOS */}
            {activeTab === 0 && (
              <TabContent>
                 <InfoGrid>
                    <InfoBox>
                      <h4><BiTime/> Actividad</h4>
                      <div className="row">
                         <label>Última conexión:</label> 
                         <span>{formatDate(selectedManager.last_sign_in_at)}</span>
                      </div>
                      <div className="row">
                         <label>Miembro desde:</label> 
                         <span>{formatDate(selectedManager.created_at)}</span>
                      </div>
                    </InfoBox>

                    <InfoBox>
                      <h4><BiIdCard/> Credenciales</h4>
                      <div className="row">
                         <label>Correo:</label> <span className="email-text">{selectedManager.email}</span>
                      </div>
                      
                      <div className="google-section">
                         <label>Vinculación:</label>
                         {getGoogleInfo(selectedManager).linked ? (
                           <div className="linked-card">
                              <BiLogoGoogle color="#4285F4" size={24}/>
                              <div className="link-info">
                                <span className="link-title">Cuenta Google</span>
                                <span className="link-email">{getGoogleInfo(selectedManager).email}</span>
                              </div>
                           </div>
                         ) : (
                           <span className="not-linked"><BiEnvelope/> Correo y Contraseña</span>
                         )}
                      </div>
                    </InfoBox>
                 </InfoGrid>
                 
                 <SystemId>
                    <small>System ID:</small> <code>{selectedManager.id}</code>
                 </SystemId>
              </TabContent>
            )}

            {/* TAB 1: LIGAS */}
            {activeTab === 1 && (
              <TabContent>
                 <InfoBox $fullWidth>
                    <h4><BiTrophy/> Liga Actual</h4>
                    {selectedManager.leagues?.[0] ? (
                      <LeagueCard>
                        <div className="header-league">
                           <h3>{selectedManager.leagues[0].name}</h3>
                        </div>
                        <div className="content-league">
                          <span className="sub-label"><BiGridAlt/> Divisiones:</span>
                          <StyledScroll>
                            {selectedManager.leagues[0].divisions?.length > 0 ? (
                              selectedManager.leagues[0].divisions.map((div, i) => (
                                <div key={i} className="div-row">
                                  <span>{div.name}</span>
                                  <Badge color={v.gris}>
                                    {div.teams?.[0]?.count || 0} equipos
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <p className="muted">Sin divisiones activas.</p>
                            )}
                          </StyledScroll>
                        </div>
                      </LeagueCard>
                    ) : (
                      <EmptyLeague>
                         <v.iconocorona size={40}/>
                         <p>Sin asignación deportiva.</p>
                      </EmptyLeague>
                    )}
                 </InfoBox>
              </TabContent>
            )}
            
            <FooterActions>
               <BtnNormal 
                 titulo="Cerrar"
                 bgcolor={v.gray}
                 funcion={() => setDetailModalOpen(false)}
               />
            </FooterActions>
          </DetailContainer>
        )}
      </Modal>

      {/* --- MODAL CREACIÓN --- */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nuevo Manager"
      >
        <Form onSubmit={handleCreate}>
          <InputGroup>
            <label>Nombre Completo</label>
            <InputText2>
              <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez" required />
            </InputText2>
          </InputGroup>
          <InputGroup>
            <label>Correo Electrónico</label>
            <InputText2>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="usuario@liga.com" required />
            </InputText2>
          </InputGroup>
          <InputGroup>
            <label>Nombre de la Liga Inicial</label>
            <InputText2>
              <input name="nombreLiga" value={form.nombreLiga} onChange={handleChange} placeholder="Ej: Liga Municipal" required />
            </InputText2>
          </InputGroup>
          <InfoText>⚠️ Contraseña por defecto: <b>TemporalPassword123!</b></InfoText>
          <FooterActions>
            <Btnsave titulo={loading ? "Creando..." : "Guardar"} bgcolor={v.colorPrincipal} icono={<v.iconoguardar />} disabled={loading} />
          </FooterActions>
        </Form>
      </Modal>

      {/* --- CONFIRM MODAL --- */}
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

// --- STYLED COMPONENTS ---

const HeaderSection = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px; width: 100%; max-width: 1000px; gap: 10px; flex-wrap: wrap;
`;

const GridContainer = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px; width: 100%; max-width: 1000px;
`;

const StyledCard = styled(Card)`
  cursor: pointer; transition: transform 0.2s;
  &:hover { transform: translateY(-3px); background-color: ${({ theme }) => theme.bg2}; }
`;

const CardContent = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 5px;
  .left-section { display: flex; align-items: center; gap: 15px; }
  .avatar-container {
    width: 48px; height: 48px; border-radius: 50%; background: ${({ theme }) => theme.bg3};
    display: flex; justify-content: center; align-items: center; overflow: hidden;
    img { width: 100%; height: 100%; object-fit: cover; }
  }
  .text-info {
    display: flex; flex-direction: column; gap: 2px;
    h3 { font-size: 15px; font-weight: 700; margin: 0; color: ${({ theme }) => theme.text}; }
    .email { font-size: 12px; opacity: 0.7; }
    .league-tag { font-size: 11px; color: ${({ theme }) => theme.primary}; display: flex; align-items: center; gap: 4px; font-weight: 600; margin-top: 4px; }
    .no-league-tag { font-size: 11px; opacity: 0.5; font-style: italic; margin-top: 4px; }
  }
`;

const DeleteButton = styled.button`
  background: transparent; border: none; color: ${({ theme }) => theme.text}; opacity: 0.3;
  font-size: 18px; cursor: pointer; padding: 8px; border-radius: 50%;
  &:hover { background: ${v.rojo}20; color: ${v.rojo}; opacity: 1; }
`;

// --- DETAIL & TABS STYLES ---
const DetailContainer = styled.div`
  display: flex; flex-direction: column; gap: 20px; color: ${({ theme }) => theme.text};
`;

const DetailHeader = styled.div`
  display: flex; align-items: center; gap: 15px; padding-bottom: 10px;
  .profile-image {
    width: 70px; height: 70px; border-radius: 50%; overflow: hidden; background: ${({ theme }) => theme.bg3};
    display: flex; justify-content: center; align-items: center;
    img { width: 100%; height: 100%; object-fit: cover; }
  }
  .profile-summary {
    h2 { margin: 0 0 5px 0; font-size: 1.3rem; }
    .badges-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  }
`;

const FlexRow = styled.div`
  display: flex; align-items: center; gap: 6px;
`;

const InfoGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  @media (max-width: 550px) { grid-template-columns: 1fr; }
`;

const InfoBox = styled.div`
  display: flex; flex-direction: column; gap: 10px; width: ${props => props.$fullWidth ? "100%" : "auto"};
  h4 { 
    margin: 0; font-size: 0.85rem; text-transform: uppercase; color: ${({ theme }) => theme.primary}; 
    display: flex; align-items: center; gap: 6px; opacity: 0.9;
  }
  .row {
    display: flex; flex-direction: column; gap: 2px;
    label { font-size: 0.75rem; font-weight: 700; opacity: 0.6; }
    span { font-size: 0.9rem; }
    .email-text { font-family: monospace; font-size: 0.85rem; word-break: break-all; }
  }
  .google-section {
    margin-top: 5px;
    label { display: block; font-size: 0.75rem; font-weight: 700; opacity: 0.6; margin-bottom: 6px; }
    .linked-card {
      display: flex; align-items: center; gap: 10px; background: ${({ theme }) => theme.bg3};
      padding: 10px; border-radius: 8px;
      .link-info { display: flex; flex-direction: column; }
      .link-title { font-weight: 700; font-size: 0.85rem; }
      .link-email { font-size: 0.75rem; opacity: 0.8; word-break: break-all; }
    }
    .not-linked { font-size: 0.85rem; font-style: italic; opacity: 0.5; display: flex; align-items: center; gap: 5px; }
  }
`;

const SystemId = styled.div`
  margin-top: 15px; padding-top: 10px; border-top: 1px solid ${({ theme }) => theme.bg3};
  display: flex; align-items: center; gap: 8px;
  small { opacity: 0.5; font-size: 0.75rem; }
  code { background: ${({ theme }) => theme.bg3}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-family: monospace; }
`;

const LeagueCard = styled.div`
  .header-league { margin-bottom: 12px; border-bottom: 1px solid ${({ theme }) => theme.bg3}; padding-bottom: 8px; }
  .sub-label { display: block; font-size: 0.8rem; font-weight: 700; opacity: 0.7; margin-bottom: 8px; }
  .div-row {
    display: flex; justify-content: space-between; align-items: center; padding: 8px 10px;
    background: ${({ theme }) => theme.bg3}; border-radius: 6px; margin-bottom: 6px; font-size: 0.9rem;
  }
  .muted { font-size: 0.85rem; font-style: italic; opacity: 0.5; text-align: center; margin-top: 10px; }
`;

const EmptyLeague = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 30px; color: ${({ theme }) => theme.text}; opacity: 0.5; gap: 10px; font-size: 0.9rem;
`;

const StyledScroll = styled(ContainerScroll)` max-height: 150px; `;

const SkeletonWrapper = styled.div`
  display: flex; align-items: center; gap: 15px; padding: 5px;
  .texts { display: flex; flex-direction: column; gap: 8px; width: 100%; }
`;

// --- FORM STYLES ---
const Form = styled.form` display: flex; flex-direction: column; gap: 15px; `;
const InputGroup = styled.div` display: flex; flex-direction: column; gap: 6px; label { font-size: 13px; font-weight: 600; color: ${({ theme }) => theme.text}; opacity: 0.8; }`;
const InfoText = styled.p` font-size: 12px; background: ${({ theme }) => theme.bgtotal}; padding: 10px; border-radius: 6px; b { color: ${({ theme }) => theme.primary}; }`;
const FooterActions = styled.div` display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; `;
const EmptyState = styled.div` grid-column: 1 / -1; padding: 40px; text-align: center; color: ${({ theme }) => theme.text}; opacity: 0.6; `;