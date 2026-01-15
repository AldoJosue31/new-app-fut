import React, { useState } from "react";
import styled, { css } from "styled-components";
import { v } from "../../../../styles/variables";
import { 
    RiFileList3Line, RiCoinLine, RiGitMergeLine, RiInformationLine 
} from "react-icons/ri";
import { IoMdStopwatch } from "react-icons/io";

// Componentes comunes
import { Card, CardHeader, Btnsave, Modal, TabsNavigation, Toast } from "../../../../index";

// Sub-componentes
import { TorneoDashboard } from "./subcomponents/TorneoDashboard";
import { TabGeneral, TabScoring, TabFormat, TabGameRules } from "./subcomponents/TorneoFormTabs";
// IMPORTAMOS EL MODAL NUEVO
import { FixturePreviewModal } from "./subcomponents/FixturePreviewModal";

export function TorneoDefinicionTab({ 
    form, onChange, onSubmit, loading, divisionName, activeTournament, 
    allTeams, participatingIds, onInclude, onExclude, minPlayers,
    isLoading, reglas, setReglas
}) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false); // Estado para el preview
  const [configTab, setConfigTab] = useState("general"); 
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  const configTabList = [
      { id: "general", label: "General", icon: <RiFileList3Line/> },
      { id: "scoring", label: "Puntuación", icon: <RiCoinLine/> },
      { id: "format", label: "Formato", icon: <RiGitMergeLine/> },
      { id: "gameRules", label: "Reglas Juego", icon: <IoMdStopwatch/> }
  ];

  const participatingTeams = allTeams?.filter(t => participatingIds.includes(t.id)) || [];
  const excludedTeams = allTeams?.filter(t => !participatingIds.includes(t.id)) || [];

  const showToast = (message, type = 'error') => setToastConfig({ show: true, message, type });

  // Función interceptora del inicio
  const handlePreStartTournament = () => {
      // 1. Validaciones
      if (participatingTeams.length < 2) {
          showToast(`Se requieren al menos 2 equipos para iniciar el torneo.`, "error");
          return;
      }
      if (participatingTeams.length % 2 !== 0) {
          showToast(`Torneo impar (${participatingTeams.length} equipos). Se asignará un 'Descanso' por jornada.`, "success");
      }
      
      // Validaciones Liguilla
      if (form.zonaLiguilla) {
          const directos = parseInt(form.clasificados || 0);
          const repechaje = form.hasRepechaje ? parseInt(form.repechajeTeams || 0) : 0;
          const totalRequeridos = directos + repechaje;

          if (totalRequeridos < 2) {
             showToast("Configuración inválida: Debes clasificar al menos 2 equipos.", "error");
             return;
          }
          if (participatingTeams.length < totalRequeridos) {
              showToast(`Error Liguilla: Configuración requiere ${totalRequeridos} equipos, pero solo hay ${participatingTeams.length}.`, "error");
              return;
          }
      }
      
      // En lugar de guardar directo, ABRIMOS EL PREVIEW
      setShowPreviewModal(true);
  };

  // Callback cuando confirman en el modal
  const handleConfirmFixture = (fixtureData) => {
      setShowPreviewModal(false);
      // Llamamos a onSubmit (que viene de useTorneosLogic) pasándole los datos generados
      onSubmit(fixtureData);
  };

  const handleSaveConfig = () => {
    const maxTeamsNum = parseInt(form.maxTeams || 0);
    if (maxTeamsNum < 2) {
        showToast("El número máximo de equipos debe ser al menos 2.", "error");
        return;
    }
    const draftData = { ...form, reglasDraft: reglas };
    localStorage.setItem("torneo_reglas_draft", JSON.stringify(draftData));
    setShowConfigModal(false);
    showToast("Configuración guardada (Borrador local).", "success");
  };

  return (
    <StyledCardWrapper $isBlur={!!activeTournament}>
        <Toast show={toastConfig.show} message={toastConfig.message} type={toastConfig.type} onClose={() => setToastConfig({ ...toastConfig, show: false })} />

        {activeTournament && (
            <LockedOverlay>
                <div className="lock-message">
                    <v.iconocorona className="big-icon" />
                    <h2>Torneo en Curso</h2>
                    <p>{activeTournament.season}</p>
                    <span>Finaliza el torneo actual para crear uno nuevo.</span>
                </div>
            </LockedOverlay>
        )}

        <Card maxWidth="1000px">
            <div style={{ marginBottom: '20px' }}>
                <CardHeader Icono={v.iconocorona} titulo="Resumen de Temporada" subtitulo={`División: ${divisionName || "..."}`} />
            </div>

            <TorneoDashboard 
                form={form}
                reglas={reglas}
                onEditConfig={() => setShowConfigModal(true)}
                participatingTeams={participatingTeams}
                excludedTeams={excludedTeams}
                onInclude={onInclude}
                onExclude={onExclude}
                isLoading={isLoading}
                minPlayers={minPlayers}
            />

            <div style={{ marginTop: '20px', borderTop: `1px solid ${v.bg4}`, paddingTop:'20px', display:'flex', justifyContent:'end' }}>
                <Btnsave 
                    titulo={loading ? "Creando..." : "Siguiente: Sorteo"} 
                    bgcolor={v.colorPrincipal} 
                    icono={<v.iconoguardar />} 
                    funcion={handlePreStartTournament} 
                    disabled={loading || !divisionName || participatingTeams.length < 2 || !form.season} 
                />
            </div>
        </Card>

        {/* --- MODAL DE PREVIEW Y SORTEO (NUEVO) --- */}
        <FixturePreviewModal 
            isOpen={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            onConfirm={handleConfirmFixture}
            teams={participatingTeams}
            config={form}
            isLoading={loading}
        />

        {/* --- MODAL DE CONFIGURACIÓN --- */}
        <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Configurar Reglas" width="650px">
            <ModalContentStyled>
                <div className="info-message"><RiInformationLine className="icon"/><span>Define las reglas de competencia.</span></div>
                
                <TabsNavigation tabs={configTabList} activeTab={configTab} setActiveTab={setConfigTab} />

                {configTab === 'general' && <TabGeneral form={form} onChange={onChange} />}
                {configTab === 'scoring' && <TabScoring form={form} onChange={onChange} />}
                {configTab === 'format' && <TabFormat form={form} onChange={onChange} />}
                {configTab === 'gameRules' && <TabGameRules reglas={reglas} setReglas={setReglas} />}
                
                <div className="modal-actions">
                    <Btnsave titulo="Guardar Configuración" bgcolor={v.colorPrincipal} funcion={handleSaveConfig} />
                </div>
            </ModalContentStyled>
        </Modal>
    </StyledCardWrapper>
  );
}

// --- STYLES ---
const StyledCardWrapper = styled.div` position: relative; width: 100%; display: flex; justify-content: center; ${props => props.$isBlur && css` & > div:last-child { filter: blur(4px) grayscale(0.8); pointer-events: none; user-select: none; } `} `;
const LockedOverlay = styled.div` position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; display: flex; align-items: center; justify-content: center; .lock-message { background: rgba(0,0,0,0.85); padding: 30px; border-radius: 16px; text-align: center; color: white; backdrop-filter: blur(5px); } .big-icon{ font-size: 50px; color: ${v.colorPrincipal}; margin-bottom:10px;} h2{margin:0; font-size:24px;} p{margin:5px 0 15px; font-size:18px; font-weight:600; color:${v.colorPrincipal};} span{opacity:0.7; font-size:14px;}`;
const ModalContentStyled = styled.div` display: flex; flex-direction: column; gap: 15px; padding-top: 10px; .info-message { background: rgba(28, 176, 246, 0.1); border-left: 4px solid ${({theme})=>theme.primary}; padding: 10px; font-size: 12px; display: flex; gap:10px; align-items:center; .icon{font-size:18px; color:${({theme})=>theme.primary};} } .modal-actions { display: flex; justify-content: flex-end; margin-top: 20px; pt:20px; border-top: 1px solid ${({theme})=>theme.bg4}; } `;