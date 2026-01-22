import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v, Btnsave, Modal, TabsNavigation, Toast } from "../../../../../index";
import { 
    RiFileList3Line, RiCoinLine, RiGitMergeLine 
} from "react-icons/ri";
import { IoMdStopwatch } from "react-icons/io";

import { 
    TabGeneral, TabScoring, TabFormat, TabGameRules, INITIAL_TOURNAMENT_CONFIG 
} from "./TorneoFormTabs";

export function TournamentConfigModal({ 
    isOpen, 
    onClose, 
    activeTournament, 
    onSave, 
    isVueltasLocked 
}) {
    const [configTab, setConfigTab] = useState("general");
    
    // Inicializamos con la configuración por defecto
    const [editedConfig, setEditedConfig] = useState(INITIAL_TOURNAMENT_CONFIG);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    useEffect(() => {
        if (isOpen && activeTournament) {
            // FUSION INTELIGENTE DE DATOS:
            // 1. Usamos INITIAL como base (minPlayers: 5, etc.)
            // 2. Sobrescribimos con lo que tenga la BD en 'config' (si existe)
            // 3. Mapeamos 'season' y 'startDate' que viven en la raíz del objeto, no en config.
            setEditedConfig({
                ...INITIAL_TOURNAMENT_CONFIG,
                ...(activeTournament.config || {}),
                
                // Mapeo explícito de columnas raíz para que no salgan vacías
                season: activeTournament.season || INITIAL_TOURNAMENT_CONFIG.season,
                startDate: activeTournament.start_date || INITIAL_TOURNAMENT_CONFIG.startDate
            });
        }
    }, [isOpen, activeTournament]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditedConfig((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateConfig = () => {
        const maxTeams = parseInt(editedConfig.maxTeams);
        const ascensos = parseInt(editedConfig.ascensos);
        const descensos = parseInt(editedConfig.descensos);
        
        if ((ascensos + descensos) > maxTeams) {
            setToast({ 
                show: true, 
                message: `Error: Ascensos + Descensos (${ascensos + descensos}) superan el total de equipos permitidos (${maxTeams}).`, 
                type: 'error' 
            });
            return false;
        }

        if (editedConfig.zonaLiguilla) {
            const clasificados = parseInt(editedConfig.clasificados);
            const repechaje = parseInt(editedConfig.repechajeTeams);
            
            if ((clasificados + repechaje) > maxTeams) {
                setToast({ 
                    show: true, 
                    message: `Error: Clasificados + Repechaje superan el total de equipos (${maxTeams}).`, 
                    type: 'error' 
                });
                return false;
            }

            if (clasificados < 2) {
                setToast({ 
                    show: true, 
                    message: "Debe haber al menos 2 clasificados para jugar playoffs.", 
                    type: 'error' 
                });
                return false;
            }
        }
        
        return true;
    };

    const handleSave = () => {
        if (!validateConfig()) return;
        onSave(editedConfig);
        onClose();
    };

    return (
        <>
            <Toast 
                show={toast.show} 
                message={toast.message} 
                type={toast.type} 
                onClose={() => setToast({ ...toast, show: false })} 
            />

            <Modal 
                isOpen={isOpen} 
                onClose={onClose} 
                title="Ajustes de Torneo (En Curso)" 
                width="600px"
            >
                <ModalContent>
                    <TabsNavigation 
                        tabs={[ 
                            { id: "general", label: "General", icon: <RiFileList3Line/> }, 
                            { id: "scoring", label: "Puntuación", icon: <RiCoinLine/> }, 
                            { id: "format", label: "Formato", icon: <RiGitMergeLine/> }, 
                            { id: "gameRules", label: "Reglas", icon: <IoMdStopwatch/> } 
                        ]} 
                        activeTab={configTab} 
                        setActiveTab={setConfigTab} 
                    />
                    
                    <div className="tab-content-wrapper">
                        {configTab === 'general' && (
                            <TabGeneral 
                                form={editedConfig} 
                                onChange={handleChange} 
                                isStarted={true} 
                                activeTournament={activeTournament} 
                            />
                        )}
                        
                        {configTab === 'scoring' && (
                            <TabScoring 
                                form={editedConfig} 
                                onChange={handleChange} 
                                isStarted={true} 
                            />
                        )}
                        
                        {configTab === 'format' && (
                            <TabFormat 
                                form={editedConfig} 
                                onChange={handleChange} 
                                vueltasDisabled={isVueltasLocked} 
                                isStarted={true} 
                            />
                        )}
                        
                        {configTab === 'gameRules' && (
                            <TabGameRules 
                                reglas={editedConfig} 
                                setReglas={setEditedConfig} 
                            />
                        )}
                    </div>

                    <div className="modal-actions">
                        <Btnsave 
                            titulo="Guardar Cambios" 
                            bgcolor={v.colorPrincipal} 
                            funcion={handleSave} 
                        />
                    </div>
                </ModalContent>
            </Modal>
        </>
    );
}

const ModalContent = styled.div`
  display: flex; 
  flex-direction: column; 
  gap: 15px;

  .tab-content-wrapper {
      margin-top: 15px;
      min-height: 320px; 
      overflow-y: auto; 
      max-height: 60vh;
      padding-right: 5px;
  }

  .modal-actions { 
      display: flex; 
      justify-content: flex-end; 
      padding-top: 15px; 
      border-top: 1px solid ${({theme})=>theme.bg4}; 
  }
`;