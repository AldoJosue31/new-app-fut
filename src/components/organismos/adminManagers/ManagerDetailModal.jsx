import React, { useState } from "react";
import styled from "styled-components";
import { 
  Modal, 
  Badge, 
  BtnNormal, 
  ContainerScroll 
} from "../../../index";
import { TabsNavigation, TabContent } from "../../moleculas/TabsNavigation";
import { v } from "../../../styles/variables";
import { 
  BiUserCircle, BiWifi, BiWifiOff, BiTime, BiIdCard, 
  BiLogoGoogle, BiEnvelope, BiTrophy, BiGridAlt 
} from "react-icons/bi";

export const ManagerDetailModal = ({ isOpen, onClose, manager }) => {
  const [activeTab, setActiveTab] = useState(0);

  const managerTabs = [
    { id: 0, label: "Perfil & Cuenta" },
    { id: 1, label: "Gestión Deportiva" }
  ];

  // Lógica interna auxiliar
  const getGoogleInfo = (mgr) => {
    if (!mgr) return { linked: false };
    const isGoogleAvatar = mgr.avatar_url?.includes("googleusercontent");
    const isGmail = mgr.email?.includes("@gmail.com");
    if (isGoogleAvatar || isGmail) return { linked: true, email: mgr.email };
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

  if (!manager) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Perfil de Usuario" width="600px">
      <DetailContainer>
        <DetailHeader>
           <div className="profile-image">
              {manager.avatar_url ? <img src={manager.avatar_url} alt="av" /> : <BiUserCircle size={60}/>}
           </div>
           <div className="profile-summary">
             <h2>{manager.full_name}</h2>
             <div className="badges-row">
                <Badge color={v.colorPrincipal}>Manager</Badge>
                <Badge color={getConnectionStatus(manager.last_sign_in_at).color}>
                   <FlexRow>
                      {getConnectionStatus(manager.last_sign_in_at).icon}
                      {getConnectionStatus(manager.last_sign_in_at).status}
                   </FlexRow>
                </Badge>
             </div>
           </div>
        </DetailHeader>

        <TabsNavigation 
           tabs={managerTabs}
           activeTab={activeTab}
           setActiveTab={setActiveTab}
        />

        {activeTab === 0 && (
          <TabContent>
             <InfoGrid>
                <InfoBox>
                  <h4><BiTime/> Actividad</h4>
                  <div className="row">
                     <label>Última conexión:</label> 
                     <span>{formatDate(manager.last_sign_in_at)}</span>
                  </div>
                  <div className="row">
                     <label>Miembro desde:</label> 
                     <span>{formatDate(manager.created_at)}</span>
                  </div>
                </InfoBox>

                <InfoBox>
                  <h4><BiIdCard/> Credenciales</h4>
                  <div className="row">
                     <label>Correo:</label> <span className="email-text">{manager.email}</span>
                  </div>
                  
                  <div className="google-section">
                     <label>Vinculación:</label>
                     {getGoogleInfo(manager).linked ? (
                       <div className="linked-card">
                          <BiLogoGoogle color="#4285F4" size={24}/>
                          <div className="link-info">
                            <span className="link-title">Cuenta Google</span>
                            <span className="link-email">{getGoogleInfo(manager).email}</span>
                          </div>
                       </div>
                     ) : (
                       <span className="not-linked"><BiEnvelope/> Correo y Contraseña</span>
                     )}
                  </div>
                </InfoBox>
             </InfoGrid>
             
             <SystemId>
                <small>System ID:</small> <code>{manager.id}</code>
             </SystemId>
          </TabContent>
        )}

        {activeTab === 1 && (
          <TabContent>
             <InfoBox $fullWidth>
                <h4><BiTrophy/> Liga Actual</h4>
                {manager.leagues?.[0] ? (
                  <LeagueCard>
                    <div className="header-league">
                       <h3>{manager.leagues[0].name}</h3>
                    </div>
                    <div className="content-league">
                      <span className="sub-label"><BiGridAlt/> Divisiones:</span>
                      <StyledScroll>
                        {manager.leagues[0].divisions?.length > 0 ? (
                          manager.leagues[0].divisions.map((div, i) => (
                            <div key={i} className="div-row">
                              <span>{div.name}</span>
                              <Badge color={v.gris}>{div.teams?.[0]?.count || 0} equipos</Badge>
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
             funcion={onClose}
           />
        </FooterActions>
      </DetailContainer>
    </Modal>
  );
};

// --- STYLED COMPONENTS DEL MODAL ---
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
const FlexRow = styled.div` display: flex; align-items: center; gap: 6px; `;
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
const FooterActions = styled.div` display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; `;