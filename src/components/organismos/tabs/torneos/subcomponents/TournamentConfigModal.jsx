import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v, Btnsave, Modal, TabsNavigation, Toast } from "../../../../../index";
import { 
    RiFileList3Line, RiCoinLine, RiGitMergeLine 
} from "react-icons/ri";
import { IoMdStopwatch } from "react-icons/io";

import { TabGeneral, TabScoring, TabFormat, TabGameRules } from "./TorneoFormTabs";
import { INITIAL_TOURNAMENT_CONFIG } from "./tournamentDefaults";

export function TournamentConfigModal({ 
    isOpen, 
    onClose, 
    activeTournament, 
    onSave, 
    isVueltasLocked,
    isStartDateLocked // Nueva Prop recibida de JornadaPlanificacion
}) {
    const [configTab, setConfigTab] = useState("general");
    const [editedConfig, setEditedConfig] = useState(INITIAL_TOURNAMENT_CONFIG);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    // --- EFECTO: CARGAR DATOS REALES (SIN DEFAULTS FORZADOS) ---
    useEffect(() => {
        if (isOpen && activeTournament) {
            let dbConfig = {};
            
            // 1. Extraer el JSON de config de la BD
            try {
                if (typeof activeTournament.config === 'string') {
                    dbConfig = JSON.parse(activeTournament.config);
                } else {
                    dbConfig = activeTournament.config || {};
                }
            } catch (e) {
                console.error("Error leyendo config:", e);
                dbConfig = {};
            }

            // 2. Función para leer valor existente o mantener el actual del form si es undefined
            const getNum = (val, fallback) => {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? fallback : parsed;
            };

            // 3. Construir el estado inicial mezclando TODO
            const nextConfig = {
                ...INITIAL_TOURNAMENT_CONFIG, 
                ...dbConfig, // Lo que venga de la BD tiene prioridad absoluta
                
                minPlayers: getNum(dbConfig.minPlayers, INITIAL_TOURNAMENT_CONFIG.minPlayers),
                maxPlayers: getNum(dbConfig.maxPlayers, INITIAL_TOURNAMENT_CONFIG.maxPlayers),
                maxTeams: getNum(dbConfig.maxTeams, INITIAL_TOURNAMENT_CONFIG.maxTeams),
                
                minutosPorTiempo: getNum(dbConfig.minutosPorTiempo, INITIAL_TOURNAMENT_CONFIG.minutosPorTiempo),
                minutosDescanso: getNum(dbConfig.minutosDescanso, INITIAL_TOURNAMENT_CONFIG.minutosDescanso),
                
                winPoints: getNum(dbConfig.winPoints, 3),
                drawPoints: getNum(dbConfig.drawPoints, 1),
                lossPoints: getNum(dbConfig.lossPoints, 0),

                season: activeTournament.season || dbConfig.season || "",
                startDate: activeTournament.start_date || dbConfig.startDate || "",
            };

            const loadTimer = window.setTimeout(() => setEditedConfig(nextConfig), 0);
            return () => window.clearTimeout(loadTimer);
        }
        return undefined;
    }, [isOpen, activeTournament]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // Bloqueo de seguridad explícito en el change
        if (name === 'startDate' && isStartDateLocked) return;

        setEditedConfig((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateConfig = () => {
        const maxTeams = parseInt(editedConfig.maxTeams) || 0;
        const ascensos = parseInt(editedConfig.ascensos) || 0;
        const descensos = parseInt(editedConfig.descensos) || 0;
        
        if ((ascensos + descensos) > maxTeams) {
            setToast({ show: true, message: `Error: Ascensos + Descensos superan el total de equipos (${maxTeams}).`, type: 'error' });
            return false;
        }
        return true;
    };

    // --- FUNCIÓN DE GUARDADO BLINDADA ---
    const sanitizeAndSave = () => {
        if (!validateConfig()) return;

        const finalConfig = {
            ...editedConfig, 

            minPlayers: parseInt(editedConfig.minPlayers) || 5,
            maxPlayers: parseInt(editedConfig.maxPlayers) || 25,
            maxTeams: parseInt(editedConfig.maxTeams) || 20,
            
            minutosPorTiempo: parseInt(editedConfig.minutosPorTiempo) || 45,
            minutosDescanso: parseInt(editedConfig.minutosDescanso) || 15,
            
            winPoints: parseInt(editedConfig.winPoints) || 3,
            drawPoints: parseInt(editedConfig.drawPoints) || 1,
            lossPoints: parseInt(editedConfig.lossPoints) || 0,
            
            ascensos: parseInt(editedConfig.ascensos) || 0,
            descensos: parseInt(editedConfig.descensos) || 0,
            clasificados: parseInt(editedConfig.clasificados) || 8,
            repechajeTeams: parseInt(editedConfig.repechajeTeams) || 0,
            hasRepechaje: editedConfig.hasRepechaje || (parseInt(editedConfig.repechajeTeams) || 0) > 0,

            vueltas: String(editedConfig.vueltas || "1"),
            zonaLiguilla: !!editedConfig.zonaLiguilla,
            playoffReseed: editedConfig.playoffReseed !== false,
            playoffTieBreaker: String(editedConfig.playoffTieBreaker || "bestSeed"),
            repechajeLegs: String(editedConfig.repechajeLegs || "single"),
            playoffLegsRound32: String(editedConfig.playoffLegsRound32 || "single"),
            playoffLegsRound16: String(editedConfig.playoffLegsRound16 || "single"),
            playoffLegsQuarterfinals: String(editedConfig.playoffLegsQuarterfinals || "single"),
            playoffLegsSemifinals: String(editedConfig.playoffLegsSemifinals || "single"),
            playoffLegsFinal: String(editedConfig.playoffLegsFinal || "single"),
            countGoalsPlayoffs: !!editedConfig.countGoalsPlayoffs,
            countGoalsRepechaje: !!editedConfig.countGoalsRepechaje,
            tieBreakType: String(editedConfig.tieBreakType || "normal"),
            cambios: String(editedConfig.cambios || "Ilimitados"),
            observaciones: String(editedConfig.observaciones || "")
        };

        console.log("Guardando Configuración Completa:", finalConfig);
        onSave(finalConfig);
        onClose();
    };

    return (
        <>
            <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
            <Modal isOpen={isOpen} onClose={onClose} title="Ajustes de Torneo (En Curso)" width="600px" closeOnOverlayClick={false}>
                <ModalContent>
                    <TabsNavigation 
                        tabs={[ 
                            { id: "general", label: "General", icon: <RiFileList3Line/> }, 
                            { id: "scoring", label: "Puntuación", icon: <RiCoinLine/> }, 
                            { id: "format", label: "Formato", icon: <RiGitMergeLine/> }, 
                            { id: "gameRules", label: "Reglas", icon: <IoMdStopwatch/> } 
                        ]} 
                        activeTab={configTab} setActiveTab={setConfigTab} 
                    />
                    
                    <div className="tab-content-wrapper">
                        {configTab === 'general' && (
                            <TabGeneral 
                                form={editedConfig} 
                                onChange={handleChange} 
                                // SOLUCIÓN CLAVE: Pasamos el estado de bloqueo real en lugar de 'true'.
                                // Esto asegura que el input se habilite/deshabilite según la Jornada 1.
                                isStarted={isStartDateLocked} 
                            />
                        )}
                        {configTab === 'scoring' && <TabScoring form={editedConfig} onChange={handleChange} />}
                        {configTab === 'format' && <TabFormat form={editedConfig} onChange={handleChange} vueltasDisabled={isVueltasLocked} />}
                        {configTab === 'gameRules' && <TabGameRules reglas={editedConfig} setReglas={setEditedConfig} />}
                    </div>

                    <div className="modal-actions">
                        <Btnsave titulo="Guardar Cambios" bgcolor={v.colorPrincipal} funcion={sanitizeAndSave} />
                    </div>
                </ModalContent>
            </Modal>
        </>
    );
}

const ModalContent = styled.div`
  display: flex; flex-direction: column; gap: 15px;
  .tab-content-wrapper { margin-top: 15px; min-height: 320px; overflow-y: auto; max-height: 60vh; padding-right: 5px; }
  .modal-actions { display: flex; justify-content: flex-end; padding-top: 15px; border-top: 1px solid ${({theme})=>theme.bg4}; }
`;
