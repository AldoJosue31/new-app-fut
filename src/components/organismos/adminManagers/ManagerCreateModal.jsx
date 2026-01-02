import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { 
  Modal, 
  InputText2, 
  Btnsave, 
  BtnNormal, 
  Badge, 
  Toast,
  ConfirmModal 
} from "../../../index";
import { ManagerDetailModal } from "./ManagerDetailModal";
import { TabsNavigation, TabContent } from "../../moleculas/TabsNavigation";
import { v } from "../../../styles/variables";
import { supabase } from "../../../supabase/supabase.config";
import { 
  BiCopy, 
  BiLink, 
  BiUserPlus, 
  BiListUl, 
  BiTrash, 
  BiTime, 
  BiInfoCircle, 
  BiFootball,
  BiEnvelope,
  BiLock
} from "react-icons/bi";

export const ManagerCreateModal = ({ isOpen, onClose, handleCreate, loading }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  // --- ESTADOS DE FEEDBACK ---
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  // --- ESTADOS MANUAL ---
  const [manualForm, setManualForm] = useState({
    fullName: "",
    email: "",
    password: "",
    leagueName: ""
  });
  const [loadingManual, setLoadingManual] = useState(false);

  // --- ESTADOS LINK ---
  const [generatedLink, setGeneratedLink] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);

  // --- ESTADOS HISTORIAL ---
  const [invitations, setInvitations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // --- ESTADOS DETALLE ---
  const [showDetail, setShowDetail] = useState(false);
  const [selectedManagerData, setSelectedManagerData] = useState(null);

  const modalTabs = [
    { id: 0, label: "Manual", icon: <BiUserPlus/> },
    { id: 1, label: "Generar Link", icon: <BiLink/> },
    { id: 2, label: "Historial", icon: <BiListUl/> }
  ];

  // ==========================================
  //  TAB 1: LÓGICA MANUAL 
  // ==========================================
  const handleManualChange = (e) => {
    setManualForm({ ...manualForm, [e.target.name]: e.target.value });
  };

  const handleManualRegister = async (e) => {
    e.preventDefault();
    setLoadingManual(true);
    const { fullName, email, password, leagueName } = manualForm;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) throw authError;

      if (authData.user) {
        if (handleCreate) {
             await handleCreate({ nombre: fullName, email, password, nombreLiga: leagueName }, authData.user.id);
        }
        setToast({ show: true, message: "Manager creado correctamente", type: "success" });
        setManualForm({ fullName: "", email: "", password: "", leagueName: "" });
        onClose();
      } else {
        setToast({ show: true, message: "Registro iniciado. Verifica el correo.", type: "success" });
      }

    } catch (error) {
      setToast({ show: true, message: "Error: " + error.message, type: "error" });
    } finally {
      setLoadingManual(false);
    }
  };

  // ==========================================
  //  TAB 2: GENERAR LINK
  // ==========================================
  const generateLink = async () => {
    setLoadingLink(true);
    try {
      const { data, error } = await supabase
        .from("manager_invitations")
        .insert([{ league_name: null }])
        .select()
        .single();
      
      if (error) throw error;
      
      const url = `${window.location.origin}/invitation/${data.token}`;
      setGeneratedLink(url);
      setToast({ show: true, message: "Enlace generado", type: "success" });
      if(activeTab === 2) fetchInvitations(); 
    } catch (error) {
      setToast({ show: true, message: error.message, type: "error" });
    } finally {
      setLoadingLink(false);
    }
  };

  // ==========================================
  //  TAB 3: HISTORIAL & ACCIONES
  // ==========================================
  const fetchInvitations = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("manager_invitations")
      .select("*")
      .order("created_at", { ascending: false });
    
    if(error) console.error(error);
    setInvitations(data || []);
    setLoadingHistory(false);
  };

  // --- LÓGICA DE ESTADOS (NUEVO) ---
  const getInvitationStatus = (invitation) => {
    if (invitation.is_used) return "USED";
    
    const expires = new Date(invitation.expires_at);
    const now = new Date();
    
    if (expires < now) return "EXPIRED";
    return "ACTIVE";
  };

  const confirmDelete = (invitation) => {
    const status = getInvitationStatus(invitation);
    let message = "¿Estás seguro de eliminar este registro?";

    if (status === "ACTIVE") {
        message = "⚠️ Esta invitación está ACTIVA. Si la borras, el enlace dejará de funcionar inmediatamente. ¿Continuar?";
    } else if (status === "EXPIRED") {
        message = "Esta invitación ya expiró. ¿Deseas eliminarla del historial?";
    } else if (status === "USED") {
        message = "Esta invitación ya fue usada. Borrarla NO afectará al manager ni a la liga creada. ¿Limpiar registro?";
    }

    setConfirmModal({
        isOpen: true,
        title: "Eliminar Invitación",
        message: message,
        onConfirm: () => executeDelete(invitation.id) // Pasamos ID explícitamente
    });
  };

  const executeDelete = async (id) => {
    try {
        const { error } = await supabase
          .from("manager_invitations")
          .delete()
          .eq("id", id);
        
        if(error) throw error;

        setToast({ show: true, message: "Eliminado correctamente", type: "success" });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        // Recargamos la lista para ver cambios
        fetchInvitations();

    } catch (error) {
        console.error("Delete error:", error);
        setToast({ show: true, message: "Error al borrar: " + error.message, type: "error" });
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const viewUsedDetails = async (invitation) => {
    if(!invitation.league_name) {
        setToast({ show: true, message: "Sin datos de liga", type: "warning" });
        return;
    }
    try {
        const { data: league, error } = await supabase
            .from("leagues")
            .select(`name, owner:profiles(full_name, email, avatar_url)`)
            .eq("name", invitation.league_name)
            .maybeSingle();

        if(error) throw error;
        if(league) {
            setSelectedManagerData({
                managerName: league.owner?.full_name || "N/A",
                email: league.owner?.email || "N/A",
                leagueName: league.name,
                photo: league.owner?.avatar_url,
                registeredAt: invitation.created_at
            });
            setShowDetail(true);
        } else {
            setToast({ show: true, message: "Liga no encontrada", type: "error" });
        }
    } catch (err) {
        setToast({ show: true, message: "Error cargando detalles", type: "error" });
    }
  };

  const copyLink = (token) => {
      const url = `${window.location.origin}/invitation/${token}`;
      navigator.clipboard.writeText(url);
      setToast({ show: true, message: "Copiado", type: "success" });
  };

  useEffect(() => {
    if(activeTab === 2) fetchInvitations();
  }, [activeTab]);

  const resetAndClose = () => {
    setGeneratedLink("");
    onClose();
  };

  return (
    <>
      <Toast 
        show={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({...toast, show: false})} 
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({...confirmModal, isOpen: false})}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        mensaje={confirmModal.message}
      />

      <Modal isOpen={isOpen} onClose={resetAndClose} title="Gestión de Managers">
        <TabsNavigation tabs={modalTabs} activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* TAB 1: MANUAL */}
        {activeTab === 0 && (
          <TabContent>
            <Form onSubmit={handleManualRegister}>
              <p className="desc-text">Registro manual de nuevo manager.</p>
              <InputGroup>
                <label>Liga</label>
                <InputText2>
                    <input name="leagueName" value={manualForm.leagueName} onChange={handleManualChange} placeholder="Nombre de la liga" required />
                    <BiFootball className="icon-input"/>
                </InputText2>
              </InputGroup>
              <InputGroup>
                <label>Nombre</label>
                <InputText2>
                    <input name="fullName" value={manualForm.fullName} onChange={handleManualChange} required />
                    <BiUserPlus className="icon-input"/>
                </InputText2>
              </InputGroup>
              <InputGroup>
                <label>Email</label>
                <InputText2>
                    <input type="email" name="email" value={manualForm.email} onChange={handleManualChange} required />
                    <BiEnvelope className="icon-input"/>
                </InputText2>
              </InputGroup>
              <InputGroup>
                <label>Password</label>
                <InputText2>
                    <input type="password" name="password" value={manualForm.password} onChange={handleManualChange} minLength={6} required />
                    <BiLock className="icon-input"/>
                </InputText2>
              </InputGroup>
              <FooterActions>
                <Btnsave titulo={loadingManual ? "Guardando..." : "Registrar"} bgcolor={v.colorPrincipal} icono={<v.iconoguardar />} disabled={loadingManual} width="100%"/>
              </FooterActions>
            </Form>
          </TabContent>
        )}

        {/* TAB 2: LINK */}
        {activeTab === 1 && (
          <TabContent>
            <LinkSection>
              <p className="desc">Genera un enlace único para invitar a un manager.</p>
              {!generatedLink ? (
                 <Btnsave funcion={generateLink} titulo={loadingLink ? "Generando..." : "Crear Enlace"} bgcolor={v.verde} icono={<BiLink/>} width="100%" disabled={loadingLink}/>
              ) : (
                <ResultBox>
                  <label>Enlace Listo:</label>
                  <div className="copy-row">
                    <input readOnly value={generatedLink} />
                    <button type="button" onClick={() => copyLink(generatedLink.split('/').pop())}><BiCopy/></button>
                  </div>
                  <BtnNormal funcion={() => setGeneratedLink("")} titulo="Nuevo Link" bgcolor={v.bg4} />
                </ResultBox>
              )}
            </LinkSection>
          </TabContent>
        )}

        {/* TAB 3: HISTORIAL */}
        {activeTab === 2 && (
          <TabContent>
             <HistoryContainer>
                {loadingHistory && <p className="desc-text">Cargando...</p>}
                {!loadingHistory && invitations.length === 0 && <p className="desc-text">No hay invitaciones.</p>}
                
                {invitations.map(inv => {
                    const status = getInvitationStatus(inv);
                    return (
                      <HistoryItem key={inv.id} $status={status}>
                         <div className="info">
                            <span className="date"><BiTime/> {new Date(inv.created_at).toLocaleDateString()}</span>
                            <div className="status-row">
                                {status === "ACTIVE" && <Badge color={v.verde}>Activo</Badge>}
                                {status === "EXPIRED" && <Badge color={v.rojo}>Expirado</Badge>}
                                {status === "USED" && <Badge color={v.gray}>Usado</Badge>}
                            </div>
                            <small className="token">Token: ...{inv.token.slice(-8)}</small>
                         </div>
                         
                         <div className="actions">
                            {/* Botón INFO (Solo usados) */}
                            {status === "USED" && (
                                <button className="btn-icon info" onClick={() => viewUsedDetails(inv)} title="Ver Manager">
                                    <BiInfoCircle/>
                                </button>
                            )}
                            {/* Botón COPIAR (Solo activos) */}
                            {status === "ACTIVE" && (
                                <button className="btn-icon copy" onClick={() => copyLink(inv.token)} title="Copiar Enlace">
                                    <BiCopy/>
                                </button>
                            )}
                            {/* Botón BORRAR (Todos) */}
                            <button className="btn-icon delete" onClick={() => confirmDelete(inv)} title="Eliminar">
                                 <BiTrash/>
                            </button>
                         </div>
                      </HistoryItem>
                    );
                })}
             </HistoryContainer>
          </TabContent>
        )}
      </Modal>

      {showDetail && selectedManagerData && (
          <ManagerDetailModal 
            isOpen={showDetail}
            onClose={() => setShowDetail(false)}
            manager={selectedManagerData}
          />
      )}
    </>
  );
};

// --- STYLES ---
const Form = styled.form` display: flex; flex-direction: column; gap: 12px; padding-top: 5px; .desc-text { opacity: 0.7; font-size: 0.9rem; text-align: center; margin-bottom: 5px; }`;
const InputGroup = styled.div` display: flex; flex-direction: column; gap: 5px; label { font-size: 13px; font-weight: 600; color: ${({ theme }) => theme.text}; opacity: 0.8; margin-left: 5px; } .icon-input { position: absolute; right: 15px; opacity: 0.5; font-size: 1.2rem; top: 14px; }`;
const FooterActions = styled.div` margin-top: 15px; `;
const LinkSection = styled.div` display: flex; flex-direction: column; gap: 20px; padding: 10px 0; .desc { opacity: 0.7; font-size: 0.9rem; text-align: center; }`;
const ResultBox = styled.div` background: ${({theme})=>theme.bgtotal}; border: 1px solid ${v.verde}; padding: 15px; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; label {color:${v.verde}; font-weight:700;} .copy-row { display: flex; gap: 10px; input { flex:1; padding: 10px; border-radius: 6px; border:none; background:${({theme})=>theme.bg3}; color:${({theme})=>theme.text}; outline:none;} button { cursor:pointer; padding: 0 15px; border-radius:6px; border:none; background: ${v.bg4}; color:${v.text}; transition:0.2s; &:hover{background:${v.colorPrincipal}; color:white;} } }`;
const HistoryContainer = styled.div` display: flex; flex-direction: column; gap: 10px; max-height: 350px; overflow-y: auto; padding-right: 5px; &::-webkit-scrollbar { width: 5px; } &::-webkit-scrollbar-thumb { background: ${({theme})=>theme.bg4}; border-radius: 4px; }`;

const HistoryItem = styled.div` 
  display: flex; justify-content: space-between; align-items: center; padding: 12px; 
  background: ${({theme})=>theme.bgtotal}; border-radius: 12px; border: 1px solid ${({theme})=>theme.bg4}; 
  opacity: ${props => props.$status === "ACTIVE" ? 1 : 0.75};
  
  .info { display: flex; flex-direction: column; gap: 4px; 
    .date { font-size: 0.75rem; display:flex; align-items:center; gap:5px; opacity: 0.6;} 
    .status-row { display: flex; gap: 5px; align-items: center; margin: 2px 0; }
    .token { font-family: monospace; font-size: 0.75rem; opacity: 0.4; } 
  }
  .actions { display: flex; align-items: center; gap: 8px; }
  .btn-icon { border: none; width: 34px; height: 34px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; font-size: 1.1rem; 
      &.copy { background: ${v.bg4}; color: ${v.text}; &:hover { background: ${v.colorPrincipal}; color: white; transform: translateY(-2px);} }
      &.info { background: ${v.bg4}; color: #1cb0f6; &:hover { background: #1cb0f6; color: white; transform: translateY(-2px);} }
      &.delete { background: rgba(231, 76, 60, 0.1); color: ${v.rojo}; &:hover { background: ${v.rojo}; color: white; transform: translateY(-2px);} }
  }
`;