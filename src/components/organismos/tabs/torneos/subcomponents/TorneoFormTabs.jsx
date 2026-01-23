import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { InputNumber, InputText2 } from "../../../../../index";
import { InputWithTooltip } from "../../../../atomos/InputWithTooltip";

// --- CONFIGURACIÓN INICIAL (Referencia) ---
export const INITIAL_TOURNAMENT_CONFIG = {
    // General
    season: "", startDate: "", 
    minPlayers: 5, maxPlayers: 25, maxTeams: 20,
    // Scoring
    winPoints: 3, drawPoints: 1, lossPoints: 0, tieBreakType: "normal",
    // Format
    vueltas: "1", ascensos: 0, descensos: 0, zonaLiguilla: false, clasificados: 8, repechajeTeams: 0,
    // Rules
    horaInicio: "08:00", horaFin: "22:00", minutosPorTiempo: 45, minutosDescanso: 15, cambios: "Ilimitados", observaciones: ""
};

// --- STYLED COMPONENTS ---
const TabContainer = styled.div` display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.3s ease; `;
const Row2 = styled.div` display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; `;
const Row3 = styled.div` display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; `;
const SectionLabel = styled.div` font-size: 12px; font-weight: 700; color: ${v.colorPrincipal}; text-transform: uppercase; margin: 10px 0 5px; `;
const Divider = styled.div` height: 1px; background: ${({theme})=>theme.bg4}; width: 100%; margin: 5px 0; opacity: 0.5; `;
const SelectStyled = styled.select` width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 12px; padding: 10px; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size: 14px; &:focus { border-color: ${v.colorPrincipal}; } `;
const ControlBox = styled.div` border: 1px solid ${({theme, $isActive}) => $isActive ? theme.primary : theme.bg4}; border-radius: 12px; padding: 15px; background: ${({theme, $isActive}) => $isActive ? `${theme.primary}08` : 'transparent'}; transition: all 0.3s ease; .header-control { display: flex; justify-content: space-between; align-items: center; margin-bottom: ${({$isActive}) => $isActive ? '15px' : '0'}; } .checkbox-wrapper { display: flex; gap: 10px; align-items: center; cursor: pointer; width: 100%; input { accent-color: ${v.colorPrincipal}; transform: scale(1.1); } label { font-weight: 600; font-size: 14px; flex: 1; } }`;
const TextAreaStyled = styled.textarea` width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 15px; padding: 12px; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size: 14px; resize: none; &:focus { border-color: ${v.colorPrincipal}; } `;

// --- COMPONENTES ---

export const TabGeneral = ({ form, onChange, isStarted }) => {
  const currentMinPlayers = parseInt(form.minPlayers) || 5;

  const handleGeneralChange = (e) => {
    // Normalizamos el evento (soporte para inputs nativos o custom components)
    const target = e.target || e;
    const name = target.name;
    const value = target.value;
    
    // Notificamos el cambio al padre
    onChange(e);

    // Lógica de Negocio: Min <= Max
    if (name === "minPlayers") {
        const newMin = parseInt(value) || 0;
        const currentMax = parseInt(form.maxPlayers) || 0;
        
        if (newMin > currentMax) {
            // Forzamos la actualización de maxPlayers
            onChange({ target: { name: "maxPlayers", value: newMin } });
        }
    }
  };

  return (
    <TabContainer>
      <Row2>
        <InputWithTooltip label="Temporada"><InputText2><input className="form__field" name="season" value={form.season || ""} onChange={onChange} placeholder="Ej: Apertura 2024" readOnly={isStarted} disabled={isStarted} /></InputText2></InputWithTooltip>
        <InputWithTooltip label="Fecha Inicio"><InputText2><input className="form__field" type="date" name="startDate" value={form.startDate || ""} onChange={onChange} readOnly={isStarted} disabled={isStarted} /></InputText2></InputWithTooltip>
      </Row2>
      <Divider />
      <SectionLabel>Límites de Participación</SectionLabel>
      <Row3>
        <InputWithTooltip label="Min. Jugadores"><InputNumber name="minPlayers" value={form.minPlayers} onChange={handleGeneralChange} min={5} /></InputWithTooltip>
        <InputWithTooltip label="Max. Jugadores"><InputNumber name="maxPlayers" value={form.maxPlayers} onChange={handleGeneralChange} min={currentMinPlayers} /></InputWithTooltip>
        <InputWithTooltip label="Max. Equipos"><InputNumber name="maxTeams" value={form.maxTeams} onChange={handleGeneralChange} min={2} /></InputWithTooltip>
      </Row3>
    </TabContainer>
  );
};

export const TabScoring = ({ form, onChange }) => {
    const [useCustom, setUseCustom] = useState(false);
    useEffect(() => {
        const isCustom = (parseInt(form.winPoints)||3) !== 3 || (parseInt(form.drawPoints)||1) !== 1 || (parseInt(form.lossPoints)||0) !== 0;
        setUseCustom(isCustom);
    }, [form.winPoints, form.drawPoints, form.lossPoints]); 

    const handleCheck = (e) => {
        setUseCustom(e.target.checked);
        if (!e.target.checked) {
            onChange({ target: { name: 'winPoints', value: 3 } });
            onChange({ target: { name: 'drawPoints', value: 1 } });
            onChange({ target: { name: 'lossPoints', value: 0 } });
        }
    };

    return (
      <TabContainer>
        <ControlBox $isActive={useCustom}>
            <div className="header-control">
                <div className="checkbox-wrapper"><input type="checkbox" id="customScoring" checked={useCustom} onChange={handleCheck} /><label htmlFor="customScoring">Sistema de Puntuación Personalizado</label></div>
            </div>
            <Row3 style={{ opacity: useCustom ? 1 : 0.6, pointerEvents: useCustom ? 'auto' : 'none' }}>
                <InputWithTooltip label="Victoria"><InputNumber name="winPoints" value={form.winPoints} onChange={onChange} disabled={!useCustom} /></InputWithTooltip>
                <InputWithTooltip label="Empate"><InputNumber name="drawPoints" value={form.drawPoints} onChange={onChange} disabled={!useCustom} /></InputWithTooltip>
                <InputWithTooltip label="Derrota"><InputNumber name="lossPoints" value={form.lossPoints} onChange={onChange} disabled={!useCustom} /></InputWithTooltip>
            </Row3>
        </ControlBox>
        <Divider /><InputWithTooltip label="Criterio de Desempate"><SelectStyled name="tieBreakType" value={form.tieBreakType || "normal"} onChange={onChange}><option value="normal">Tradicional (Empate directo)</option><option value="penalties">Penales/Shootouts (Punto Extra)</option></SelectStyled></InputWithTooltip>
      </TabContainer>
    );
};

export const TabFormat = ({ form, onChange, vueltasDisabled }) => {
  const maxTeams = parseInt(form.maxTeams) || 20; 
  const currentAsc = parseInt(form.ascensos) || 0;
  const currentDesc = parseInt(form.descensos) || 0;
  const [enablePromotions, setEnablePromotions] = useState(false);

  useEffect(() => { setEnablePromotions(currentAsc > 0 || currentDesc > 0); }, [currentAsc, currentDesc]); 
  const handlePromotionsToggle = (e) => {
      setEnablePromotions(e.target.checked);
      if(!e.target.checked) { onChange({ target: { name: 'ascensos', value: 0 } }); onChange({ target: { name: 'descensos', value: 0 } }); }
  };
  
  const currentClas = parseInt(form.clasificados) || 0;
  const currentRep = parseInt(form.repechajeTeams) || 0;

  return (
    <TabContainer>
      <InputWithTooltip label="Modalidad de Juego" warning={vueltasDisabled ? "Gestionado por el sistema" : null}>
          <SelectStyled name="vueltas" value={form.vueltas || "1"} onChange={onChange} disabled={vueltasDisabled}>
            <option value="1">Solo Ida (1 vuelta)</option><option value="2">Ida y Vuelta (2 vueltas)</option>
          </SelectStyled>
      </InputWithTooltip>
      <ControlBox $isActive={enablePromotions}>
        <div className="header-control"><div className="checkbox-wrapper"><input type="checkbox" id="enablePromotions" checked={enablePromotions} onChange={handlePromotionsToggle} /><label htmlFor="enablePromotions">Habilitar Ascensos y Descensos</label></div></div>
        <Row2 style={{ opacity: enablePromotions ? 1 : 0.6, pointerEvents: enablePromotions ? 'auto' : 'none' }}>
            <InputWithTooltip label="Ascensos"><InputNumber name="ascensos" value={enablePromotions ? currentAsc : 0} onChange={onChange} max={maxTeams} disabled={!enablePromotions} /></InputWithTooltip>
            <InputWithTooltip label="Descensos"><InputNumber name="descensos" value={enablePromotions ? currentDesc : 0} onChange={onChange} max={maxTeams} disabled={!enablePromotions} /></InputWithTooltip>
        </Row2>
      </ControlBox>
      <ControlBox $isActive={form.zonaLiguilla}>
        <div className="header-control"><div className="checkbox-wrapper"><input type="checkbox" id="zonaLiguilla" name="zonaLiguilla" checked={!!form.zonaLiguilla} onChange={onChange} /><label htmlFor="zonaLiguilla">Fase Final (Playoffs)</label></div></div>
        {form.zonaLiguilla && (
          <Row2>
            <InputWithTooltip label="Clasificados Directos"><InputNumber name="clasificados" value={currentClas} onChange={onChange} min={2} max={maxTeams} /></InputWithTooltip>
            <InputWithTooltip label="Equipos Repechaje"><InputNumber name="repechajeTeams" value={currentRep} onChange={onChange} max={maxTeams} /></InputWithTooltip>
          </Row2>
        )}
      </ControlBox>
    </TabContainer>
  );
};

export const TabGameRules = ({ reglas, setReglas }) => {
  // MANEJADOR ROBUSTO PARA NÚMEROS (Previene strings vacíos o NaN en el estado final)
  const handleChange = (e) => { 
      const target = e.target || e; 
      const name = target.name;
      const value = target.value;
      const numericFields = ["minutosPorTiempo", "minutosDescanso"];
      
      let finalValue = value;

      if (numericFields.includes(name)) {
        if (value === "") finalValue = ""; // Permitir borrar todo
        else {
            const parsed = parseInt(value, 10);
            finalValue = isNaN(parsed) ? "" : parsed;
        }
      }
      setReglas(prev => ({ ...prev, [name]: finalValue })); 
  };
  
  // Helper para mostrar valor seguro en el input
  const safeValue = (val) => (val === null || val === undefined || Number.isNaN(val)) ? "" : val;

  return (
    <TabContainer>
      <SectionLabel>Tiempos y Horarios</SectionLabel>
      <Row2>
         <InputWithTooltip label="Hora Inicio"><InputText2><input className="form__field" type="time" name="horaInicio" value={reglas?.horaInicio || "08:00"} onChange={handleChange}/></InputText2></InputWithTooltip>
         <InputWithTooltip label="Hora Límite"><InputText2><input className="form__field" type="time" name="horaFin" value={reglas?.horaFin || "22:00"} onChange={handleChange}/></InputText2></InputWithTooltip>
      </Row2>
      <SectionLabel>Duración y Cambios</SectionLabel>
      <Row3>
        <InputWithTooltip label="Minutos por Tiempo"><InputNumber name="minutosPorTiempo" value={safeValue(reglas?.minutosPorTiempo)} onChange={handleChange} placeholder="Ej: 45"/></InputWithTooltip>
        
        {/* Aquí estaba el error del Minutos Descanso - Ahora usa safeValue y handleChange corregido */}
        <InputWithTooltip label="Minutos Descanso"><InputNumber name="minutosDescanso" value={safeValue(reglas?.minutosDescanso)} onChange={handleChange} placeholder="Ej: 15"/></InputWithTooltip>
        
        <InputWithTooltip label="Cambios">
            <SelectStyled name="cambios" value={reglas?.cambios || "Ilimitados"} onChange={handleChange}>
                <option value="Ilimitados">Ilimitados</option><option value="Limitados">Limitados</option>
            </SelectStyled>
        </InputWithTooltip>
      </Row3>
      <InputWithTooltip label="Observaciones"><TextAreaStyled name="observaciones" value={reglas?.observaciones || ""} onChange={handleChange} rows={3} placeholder="Reglas adicionales..."/></InputWithTooltip>
    </TabContainer>
  );
};