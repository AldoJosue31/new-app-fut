import React, { useState } from "react";
import styled, { css } from "styled-components";
import { v } from "../../../../styles/variables";
import { 
    RiFileList3Line, RiCoinLine, RiGitMergeLine, RiInformationLine, RiDeleteBinLine
} from "react-icons/ri";
import { IoMdStopwatch } from "react-icons/io";

// Componentes comunes
import { Card, CardHeader, Btnsave, Modal, TabsNavigation, Toast, BtnNormal } from "../../../../index";
import { ConfirmModal } from "../../ConfirmModal";

// Sub-componentes
import { TorneoDashboard } from "./subcomponents/TorneoDashboard";
import { TabGeneral, TabScoring, TabFormat, TabGameRules } from "./subcomponents/TorneoFormTabs";
import { FixturePreviewModal } from "./subcomponents/FixturePreviewModal";

// Servicio
import { eliminarTorneoService } from "../../../../services/torneos";

export function TorneoDefinicionTab({ 
    form, onChange, onSubmit, loading, divisionName, activeTournament, 
    allTeams, participatingIds, onInclude, onExclude, minPlayers,
    isLoading, reglas, setReglas, onTournamentReset 
}) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false); 
  const [showEndTournamentModal, setShowEndTournamentModal] = useState(false);
  
  // Estado para controlar la animación de salida
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

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

  const handlePreStartTournament = () => {
      if (participatingTeams.length < 2) {
          showToast(`Se requieren al menos 2 equipos para iniciar el torneo.`, "error");
          return;
      }
      if (participatingTeams.length % 2 !== 0) {
          showToast(`Torneo impar (${participatingTeams.length} equipos). Se asignará un 'Descanso' por jornada.`, "success");
      }
      
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
      
      setShowPreviewModal(true);
  };

  const handleConfirmFixture = (fixtureData) => {
      setShowPreviewModal(false);
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

  // --- LÓGICA DE ELIMINACIÓN CON TRANSICIÓN ---
  const handleEndTournament = async () => {
      if(!activeTournament?.id) return;
      
      setIsDeleting(true);
      try {
          await eliminarTorneoService(activeTournament.id);
          
          setShowEndTournamentModal(false);
          showToast("Torneo eliminado. Reiniciando vista...", "success");
          
          // 1. Iniciamos la animación de salida (Fade Out del overlay + Unblur del contenido)
          setIsExiting(true);
          
          // 2. Esperamos a que termine la animación visual (600ms) antes de recargar los datos
          setTimeout(() => {
              if(onTournamentReset) {
                  onTournamentReset(); 
              }
              // Reseteamos estados locales
              setIsExiting(false);
              setIsDeleting(false);
          }, 600);
          
      } catch (error) {
          showToast("Error al finalizar el torneo. Revisa la consola.", "error");
          setIsDeleting(false);
      }
  };

  return (
    // Pasamos !isExiting para que el Blur se quite mientras se desvanece el overlay
    <StyledCardWrapper $isBlur={!!activeTournament && !isExiting}>
        <Toast show={toastConfig.show} message={toastConfig.message} type={toastConfig.type} onClose={() => setToastConfig({ ...toastConfig, show: false })} />

        {activeTournament && (
            <LockedOverlay $isExiting={isExiting}>
                <div className="lock-message">
                    <v.iconocorona className="big-icon" />
                    <h2>Torneo en Curso</h2>
                    <p>{activeTournament.season}</p>
                    <span className="desc">Finaliza el torneo actual para crear uno nuevo.</span>
                    
                    <div className="actions-overlay">
                        <BtnNormal 
                            titulo="Finalizar Torneo"
                            funcion={() => setShowEndTournamentModal(true)}
                            icono={<RiDeleteBinLine/>}
                            bgcolor="rgba(255,255,255,0.15)"
                        />
                    </div>
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

        {/* --- MODALES --- */}
        <FixturePreviewModal 
            isOpen={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            onConfirm={handleConfirmFixture}
            teams={participatingTeams}
            config={form}
            isLoading={loading}
        />

        <ConfirmModal 
            isOpen={showEndTournamentModal}
            onClose={() => setShowEndTournamentModal(false)}
            onConfirm={handleEndTournament}
            title="¿Finalizar Torneo Actual?"
            message="Esta acción borrará permanentemente todos los partidos, jornadas y estadísticas del torneo actual."
            subMessage="No podrás deshacer esta acción."
            confirmText={isDeleting ? "Finalizando..." : "Sí, Finalizar"}
            confirmColor={v.rojo}
        />

        <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Configurar Reglas" width="650px" closeOnOverlayClick={false}>
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
const StyledCardWrapper = styled.div` 
    position: relative; width: 100%; display: flex; justify-content: center; 
    
    /* Animación del contenido base: Blur y Escala */
    & > div:last-child { 
        transition: filter 0.6s ease-in-out, transform 0.6s ease-in-out, opacity 0.6s;
        ${props => props.$isBlur ? css`
            filter: blur(4px) grayscale(0.8); 
            pointer-events: none; 
            user-select: none; 
            transform: scale(0.98); // Efecto de profundidad
            opacity: 0.8;
        ` : css`
            filter: blur(0px) grayscale(0); 
            pointer-events: all;
            transform: scale(1);
            opacity: 1;
        `}
    } 
`;

const LockedOverlay = styled.div` 
    position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; 
    display: flex; align-items: center; justify-content: center; 
    
    /* Transición de Salida/Entrada */
    transition: opacity 0.5s ease-in-out, visibility 0.5s;
    opacity: ${props => props.$isExiting ? 0 : 1};
    visibility: ${props => props.$isExiting ? 'hidden' : 'visible'};
    pointer-events: ${props => props.$isExiting ? 'none' : 'all'};

    .lock-message { 
        background: rgba(0,0,0,0.85); padding: 40px; border-radius: 16px; 
        text-align: center; color: white; backdrop-filter: blur(5px); 
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        max-width: 400px; width: 100%;
        
        /* Animación interna del modal */
        transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        transform: ${props => props.$isExiting ? 'scale(0.8) translateY(20px)' : 'scale(1) translateY(0)'};
    } 
    .big-icon{ font-size: 60px; color: ${v.colorPrincipal}; margin-bottom:15px;} 
    h2{margin:0; font-size:26px; font-weight: 700;} 
    p{margin:5px 0 10px; font-size:20px; font-weight:600; color:${v.colorPrincipal};} 
    .desc{opacity:0.7; font-size:14px; display:block; margin-bottom: 20px;}
    .actions-overlay {
        display: flex; justify-content: center; width: 100%;
        button {
             border: 1px solid rgba(255,255,255,0.2);
             transition: all 0.2s;
             &:hover { background: ${v.rojo} !important; border-color: ${v.rojo}; }
        }
    }
`;

const ModalContentStyled = styled.div` display: flex; flex-direction: column; gap: 15px; padding-top: 10px; .info-message { background: rgba(28, 176, 246, 0.1); border-left: 4px solid ${({theme})=>theme.primary}; padding: 10px; font-size: 12px; display: flex; gap:10px; align-items:center; .icon{font-size:18px; color:${({theme})=>theme.primary};} } .modal-actions { display: flex; justify-content: flex-end; margin-top: 20px; pt:20px; border-top: 1px solid ${({theme})=>theme.bg4}; } `;