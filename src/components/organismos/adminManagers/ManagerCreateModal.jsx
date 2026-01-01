import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Modal, InputText2, Btnsave, BtnNormal, Badge } from "../../../index";
import { TabsNavigation, TabContent } from "../../moleculas/TabsNavigation";
import { v } from "../../../styles/variables";
import { supabase } from "../../../supabase/supabase.config";
import { BiCopy, BiLink, BiUserPlus, BiListUl, BiTrash, BiTime } from "react-icons/bi";

export const ManagerCreateModal = ({ isOpen, onClose, form, handleChange, handleCreate, loading }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  // Estados para Generar Link
  const [generatedLink, setGeneratedLink] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);

  // Estados para Historial
  const [invitations, setInvitations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const modalTabs = [
    { id: 0, label: "Manual", icon: <BiUserPlus/> },
    { id: 1, label: "Generar Link", icon: <BiLink/> },
    { id: 2, label: "Historial", icon: <BiListUl/> }
  ];

  // --- LÓGICA GENERAR LINK ---
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
      fetchInvitations(); 
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoadingLink(false);
    }
  };

  // --- LÓGICA HISTORIAL ---
  const fetchInvitations = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("manager_invitations")
      .select("*")
      .order("created_at", { ascending: false });
    setInvitations(data || []);
    setLoadingHistory(false);
  };

  const revokeInvitation = async (id) => {
    if(!confirm("¿Seguro que quieres invalidar este enlace?")) return;
    const { error } = await supabase
      .from("manager_invitations")
      .update({ is_used: true }) 
      .eq("id", id);
    
    if(error) {
        alert("Error al borrar: " + error.message);
    } else {
        fetchInvitations();
    }
  };

  // Función para copiar cualquier token del historial
  const copyHistoryLink = (token) => {
      const url = `${window.location.origin}/invitation/${token}`;
      navigator.clipboard.writeText(url);
      alert("Enlace copiado al portapapeles");
  };

  useEffect(() => {
    if(activeTab === 2) fetchInvitations();
  }, [activeTab]);

  const resetAndClose = () => {
    setGeneratedLink("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Gestión de Managers">
      <TabsNavigation tabs={modalTabs} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* --- TAB 1: MANUAL --- */}
      {activeTab === 0 && (
        <TabContent>
          <Form onSubmit={handleCreate}>
            <InputGroup>
              <label>Nombre Completo</label>
              <InputText2><input name="nombre" value={form.nombre} onChange={handleChange} required /></InputText2>
            </InputGroup>
            <InputGroup>
              <label>Email</label>
              <InputText2><input type="email" name="email" value={form.email} onChange={handleChange} required /></InputText2>
            </InputGroup>
            <InputGroup>
              <label>Nombre Liga</label>
              <InputText2><input name="nombreLiga" value={form.nombreLiga} onChange={handleChange} required /></InputText2>
            </InputGroup>
            <FooterActions>
              <Btnsave titulo={loading ? "Guardando..." : "Crear Manager"} bgcolor={v.colorPrincipal} icono={<v.iconoguardar />} disabled={loading} />
            </FooterActions>
          </Form>
        </TabContent>
      )}

      {/* --- TAB 2: GENERAR LINK --- */}
      {activeTab === 1 && (
        <TabContent>
          <LinkSection>
            <p className="desc">Genera un enlace abierto. El usuario elegirá el nombre de su liga al registrarse.</p>
            {!generatedLink ? (
               <Btnsave 
                 funcion={generateLink} 
                 titulo={loadingLink ? "Generando..." : "Crear Enlace de Invitación"} 
                 bgcolor={v.verde} 
                 icono={<BiLink/>}
                 width="100%"
                 disabled={loadingLink}
               />
            ) : (
              <ResultBox>
                <label>¡Enlace Listo!</label>
                <div className="copy-row">
                  <input readOnly value={generatedLink} />
                  <button onClick={() => navigator.clipboard.writeText(generatedLink)}><BiCopy/></button>
                </div>
                <BtnNormal funcion={() => setGeneratedLink("")} titulo="Generar Otro" bgcolor={v.bg4} />
              </ResultBox>
            )}
          </LinkSection>
        </TabContent>
      )}

      {/* --- TAB 3: HISTORIAL (CORREGIDO) --- */}
      {activeTab === 2 && (
        <TabContent>
           <HistoryContainer>
              {loadingHistory && <p>Cargando...</p>}
              {!loadingHistory && invitations.length === 0 && <p>No hay invitaciones creadas.</p>}
              
              {invitations.map(inv => (
                <HistoryItem key={inv.id} $expired={inv.is_used}>
                   <div className="info">
                      <span className="date"><BiTime/> {new Date(inv.created_at).toLocaleDateString()}</span>
                      {/* Mostrar enlace acortado visualmente pero copiable */}
                      <small className="link-preview">...{inv.token.slice(-8)}</small>
                   </div>
                   <div className="status">
                      {/* BOTÓN COPIAR */}
                      {!inv.is_used && (
                          <button className="btn-action btn-copy" onClick={() => copyHistoryLink(inv.token)} title="Copiar Enlace">
                              <BiCopy/>
                          </button>
                      )}

                      {inv.is_used ? (
                        <Badge color={v.rojo}>Inactivo</Badge>
                      ) : (
                        <Badge color={v.verde}>Activo</Badge>
                      )}
                      
                      {/* BOTÓN BORRAR */}
                      {!inv.is_used && (
                        <button className="btn-action btn-revoke" onClick={() => revokeInvitation(inv.id)} title="Dar de baja">
                           <BiTrash/>
                        </button>
                      )}
                   </div>
                </HistoryItem>
              ))}
           </HistoryContainer>
        </TabContent>
      )}
    </Modal>
  );
};

// --- STYLES ACTUALIZADOS ---
const LinkSection = styled.div` display: flex; flex-direction: column; gap: 20px; padding: 10px 0; .desc { opacity: 0.7; font-size: 0.9rem; }`;
const ResultBox = styled.div` background: ${({theme})=>theme.bgtotal}; border: 1px solid ${v.verde}; padding: 15px; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; label {color:${v.verde}; font-weight:700;} .copy-row { display: flex; gap: 10px; input { flex:1; padding: 10px; border-radius: 6px; border:none; background:${({theme})=>theme.bg3}; color:${({theme})=>theme.text}; } button { cursor:pointer; padding: 0 15px; border-radius:6px; border:none; } }`;
const HistoryContainer = styled.div` display: flex; flex-direction: column; gap: 10px; max-height: 300px; overflow-y: auto; padding-right: 5px;`;
const HistoryItem = styled.div` 
  display: flex; justify-content: space-between; align-items: center; padding: 12px; 
  background: ${({theme})=>theme.bgtotal}; border-radius: 8px; border: 1px solid ${({theme})=>theme.bg4}; 
  opacity: ${props => props.$expired ? 0.6 : 1}; 
  .info { display: flex; flex-direction: column; gap: 4px; .date { font-size: 0.85rem; display:flex; align-items:center; gap:5px;} .link-preview { font-family: monospace; font-size: 0.8rem; opacity: 0.6; } } 
  .status { display: flex; align-items: center; gap: 8px; }
  .btn-action { border: none; padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; font-size: 1.1rem; }
  .btn-copy { background: ${v.bg4}; color: ${v.text}; &:hover { background: ${v.colorPrincipal}; color: white; } }
  .btn-revoke { background: ${v.rojo}20; color: ${v.rojo}; &:hover { background: ${v.rojo}; color: white; } }
`;
const Form = styled.form` display: flex; flex-direction: column; gap: 15px; `;
const InputGroup = styled.div` display: flex; flex-direction: column; gap: 6px; label { font-size: 13px; font-weight: 600; color: ${({ theme }) => theme.text}; opacity: 0.8; }`;
const FooterActions = styled.div` display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; `;