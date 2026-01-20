import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { InputNumber, InputText2 } from "../../../../../index";
import { InputWithTooltip } from "../../../../atomos/InputWithTooltip";

// --- CONFIGURACIÓN INICIAL (FUENTE DE VERDAD) ---
export const INITIAL_TOURNAMENT_CONFIG = {
    // General
    season: "",
    startDate: "",
    minPlayers: 5,  
    maxPlayers: 25,
    maxTeams: 20,
    
    // Scoring
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    tieBreakType: "normal",
    
    // Format
    vueltas: "1",
    ascensos: 0,
    descensos: 0,
    zonaLiguilla: false,
    clasificados: 8,
    repechajeTeams: 0,
    
    // Rules
    horaInicio: "08:00",
    horaFin: "22:00",
    minutosPorTiempo: 45,
    minutosDescanso: 15,
    cambios: "Ilimitados",
    observaciones: ""
};

// --- STYLED COMPONENTS ---
const TabContainer = styled.div` 
    display: flex; 
    flex-direction: column; 
    gap: 15px; 
    animation: fadeIn 0.3s ease; 
`;

const Row2 = styled.div` 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
    gap: 15px; 
    @media (max-width: 500px) { grid-template-columns: 1fr; }
`;

const Row3 = styled.div` 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
    gap: 10px; 
    @media (max-width: 450px) { grid-template-columns: 1fr; }
`;

const SectionLabel = styled.div` 
    font-size: 12px; 
    font-weight: 700; 
    color: ${v.colorPrincipal}; 
    text-transform: uppercase; 
    margin: 10px 0 5px; 
`;

const Divider = styled.div` 
    height: 1px; 
    background: ${({theme})=>theme.bg4}; 
    width: 100%; 
    margin: 5px 0; 
    opacity: 0.5; 
`;

const SelectStyled = styled.select` 
    width: 100%; 
    border: 2px solid ${({ theme }) => theme.color2}; 
    border-radius: 12px; 
    padding: 10px; 
    background: ${({theme}) => theme.bgtotal}; 
    color: ${({theme}) => theme.text}; 
    outline: none; 
    font-size: 14px; 
    
    &:focus { border-color: ${v.colorPrincipal}; } 
    &:disabled { opacity: 0.7; cursor: not-allowed; background: ${({theme}) => theme.bg3}; color: ${({theme}) => theme.text2}; } 
`;

const ControlBox = styled.div` 
    border: 1px solid ${({theme, $isActive}) => $isActive ? theme.primary : theme.bg4}; 
    border-radius: 12px; 
    padding: 15px; 
    background: ${({theme, $isActive}) => $isActive ? `${theme.primary}08` : 'transparent'}; 
    transition: all 0.3s ease;
    
    .header-control {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: ${({$isActive}) => $isActive ? '15px' : '0'};
    }
    
    .checkbox-wrapper {
        display: flex;
        gap: 10px;
        align-items: center;
        cursor: pointer;
        width: 100%;

        input { accent-color: ${v.colorPrincipal}; cursor: pointer; transform: scale(1.1); }
        label { font-weight: 600; font-size: 14px; cursor: pointer; flex: 1; }
    }
`;

const TextAreaStyled = styled.textarea` 
    width: 100%; 
    border: 2px solid ${({ theme }) => theme.color2}; 
    border-radius: 15px; 
    padding: 12px; 
    background: ${({theme}) => theme.bgtotal}; 
    color: ${({theme}) => theme.text}; 
    outline: none; 
    font-size: 14px; 
    resize: none; 
    &:focus { border-color: ${v.colorPrincipal}; } 
`;

// --- COMPONENTES EXPORTADOS ---

export const TabGeneral = ({ form, onChange, isStarted }) => {
  // Manejo de valores nulos o indefinidos para evitar inputs "uncontrolled"
  const seasonVal = form.season ?? "";
  const dateVal = form.startDate ?? "";

  return (
    <TabContainer>
      <Row2>
        <InputWithTooltip label="Temporada">
            <InputText2>
                <input 
                    className="form__field" 
                    name="season" 
                    value={seasonVal} 
                    onChange={onChange} 
                    placeholder="Ej: Apertura 2024" 
                    // Temporada y Fecha suelen ser fijas una vez inicia, 
                    // pero si necesitas editarlas, quita el readOnly/disabled aquí también.
                    readOnly={isStarted} 
                    disabled={isStarted} 
                />
            </InputText2>
        </InputWithTooltip>
        
        <InputWithTooltip label="Fecha Inicio">
            <InputText2>
                <input 
                    className="form__field" 
                    type="date" 
                    name="startDate" 
                    value={dateVal} 
                    onChange={onChange} 
                    readOnly={isStarted} 
                    disabled={isStarted} 
                />
            </InputText2>
        </InputWithTooltip>
      </Row2>
      <Divider />
      {/* Eliminado el texto de "Bloqueado" */}
      <SectionLabel>Límites de Participación</SectionLabel>
      
      {/* Eliminado el bloqueo de estilo (pointerEvents) */}
      <Row3>
        <InputWithTooltip label="Min. Jugadores">
            {/* Eliminado disabled={isStarted} para permitir correcciones */}
            <InputNumber 
                name="minPlayers" 
                value={form.minPlayers} 
                onChange={onChange} 
                min={5} 
            />
        </InputWithTooltip>
        <InputWithTooltip label="Max. Jugadores">
            <InputNumber 
                name="maxPlayers" 
                value={form.maxPlayers} 
                onChange={onChange} 
                min={7} 
            />
        </InputWithTooltip>
        <InputWithTooltip label="Max. Equipos">
            <InputNumber 
                name="maxTeams" 
                value={form.maxTeams} 
                onChange={onChange} 
                min={2} 
            />
        </InputWithTooltip>
      </Row3>
    </TabContainer>
  );
};

export const TabScoring = ({ form, onChange, isStarted }) => {
    const [useCustom, setUseCustom] = useState(false);

    useEffect(() => {
        const w = parseInt(form.winPoints ?? 3);
        const d = parseInt(form.drawPoints ?? 1);
        const l = parseInt(form.lossPoints ?? 0);
        
        const isCustom = w !== 3 || d !== 1 || l !== 0;
        setUseCustom(isCustom);
    }, [form.winPoints, form.drawPoints, form.lossPoints]); 

    const handleCheck = (e) => {
        const checked = e.target.checked;
        setUseCustom(checked);
        
        if (!checked) {
            onChange({ target: { name: 'winPoints', value: 3 } });
            onChange({ target: { name: 'drawPoints', value: 1 } });
            onChange({ target: { name: 'lossPoints', value: 0 } });
        }
    };

    return (
      <TabContainer>
        <ControlBox $isActive={useCustom}>
            <div className="header-control">
                <div className="checkbox-wrapper">
                    <input 
                        type="checkbox" 
                        id="customScoring" 
                        checked={useCustom} 
                        onChange={handleCheck} 
                    />
                    <label htmlFor="customScoring">Sistema de Puntuación Personalizado</label>
                </div>
            </div>

            <Row3 style={{ opacity: useCustom ? 1 : 0.6, pointerEvents: useCustom ? 'auto' : 'none' }}>
                <InputWithTooltip label="Victoria" tooltip="Puntos por ganar">
                    <InputNumber name="winPoints" value={form.winPoints} onChange={onChange} disabled={!useCustom} />
                </InputWithTooltip>
                <InputWithTooltip label="Empate" tooltip="Puntos por empatar">
                    <InputNumber name="drawPoints" value={form.drawPoints} onChange={onChange} disabled={!useCustom} />
                </InputWithTooltip>
                <InputWithTooltip label="Derrota" tooltip="Puntos por perder">
                    <InputNumber name="lossPoints" value={form.lossPoints} onChange={onChange} disabled={!useCustom} />
                </InputWithTooltip>
            </Row3>
        </ControlBox>
        
        <Divider />
        <InputWithTooltip label="Criterio de Desempate (Regular)">
            <SelectStyled name="tieBreakType" value={form.tieBreakType || "normal"} onChange={onChange} >
                <option value="normal">Tradicional (Dif. Goles)</option>
                <option value="penalties">Penales (Punto Extra)</option>
            </SelectStyled>
        </InputWithTooltip>
      </TabContainer>
    );
};

export const TabFormat = ({ form, onChange, vueltasDisabled, isStarted }) => {
  const maxTeams = parseInt(form.maxTeams) || 20; 
  
  const currentAsc = parseInt(form.ascensos) || 0;
  const currentDesc = parseInt(form.descensos) || 0;
  
  const [enablePromotions, setEnablePromotions] = useState(false);

  useEffect(() => {
    const hasPromotions = currentAsc > 0 || currentDesc > 0;
    setEnablePromotions(hasPromotions);
  }, [currentAsc, currentDesc]); 

  const handlePromotionsToggle = (e) => {
      const checked = e.target.checked;
      setEnablePromotions(checked);
      if(!checked) {
          onChange({ target: { name: 'ascensos', value: 0 } });
          onChange({ target: { name: 'descensos', value: 0 } });
      }
  };

  const maxAsc = Math.max(0, maxTeams - currentDesc);
  const maxDesc = Math.max(0, maxTeams - currentAsc);
  
  const currentClas = parseInt(form.clasificados) || 0;
  const currentRep = parseInt(form.repechajeTeams) || 0;
  const maxClas = Math.max(0, maxTeams - currentRep);
  const maxRep = Math.max(0, maxTeams - currentClas);

  return (
    <TabContainer>
      <InputWithTooltip label="Modalidad de Juego" warning={vueltasDisabled ? "Gestionado por el sistema" : null}>
          <SelectStyled 
            name="vueltas" 
            value={form.vueltas || "1"} 
            onChange={onChange} 
            disabled={vueltasDisabled} 
          >
            <option value="1">Solo Ida (1 vuelta)</option>
            <option value="2">Ida y Vuelta (2 vueltas)</option>
          </SelectStyled>
      </InputWithTooltip>

      <ControlBox $isActive={enablePromotions}>
        <div className="header-control">
            <div className="checkbox-wrapper">
                <input 
                    type="checkbox" 
                    id="enablePromotions" 
                    checked={enablePromotions} 
                    onChange={handlePromotionsToggle} 
                />
                <label htmlFor="enablePromotions">Habilitar Ascensos y Descensos</label>
            </div>
        </div>

        <Row2 style={{ opacity: enablePromotions ? 1 : 0.6, pointerEvents: enablePromotions ? 'auto' : 'none' }}>
            <InputWithTooltip 
                label="Ascensos" 
                warning={enablePromotions && currentAsc >= maxAsc ? `Tope (${maxAsc})` : null}
            >
                <InputNumber name="ascensos" value={enablePromotions ? currentAsc : 0} onChange={onChange} max={maxAsc} disabled={!enablePromotions} />
            </InputWithTooltip>

            <InputWithTooltip 
                label="Descensos" 
                warning={enablePromotions && currentDesc >= maxDesc ? `Tope (${maxDesc})` : null}
            >
                <InputNumber name="descensos" value={enablePromotions ? currentDesc : 0} onChange={onChange} max={maxDesc} disabled={!enablePromotions} />
            </InputWithTooltip>
        </Row2>
      </ControlBox>

      <ControlBox $isActive={form.zonaLiguilla}>
        <div className="header-control">
            <div className="checkbox-wrapper">
               <input 
                    type="checkbox" 
                    id="zonaLiguilla"
                    name="zonaLiguilla" 
                    checked={!!form.zonaLiguilla} 
                    onChange={onChange} 
               />
               <label htmlFor="zonaLiguilla">Fase Final (Playoffs)</label>
            </div>
        </div>

        {form.zonaLiguilla && (
          <Row2 style={{ animation: 'fadeIn 0.3s ease'}}>
            <InputWithTooltip 
                label="Clasificados Directos"
                warning={currentClas >= maxClas ? `Tope` : null}
            >
                <InputNumber name="clasificados" value={currentClas} onChange={onChange} min={2} max={maxClas} />
            </InputWithTooltip>

            <InputWithTooltip 
                label="Equipos Repechaje"
                warning={currentRep >= maxRep ? `Tope` : null}
            >
                <InputNumber name="repechajeTeams" value={currentRep} onChange={onChange} max={maxRep} />
            </InputWithTooltip>
          </Row2>
        )}
      </ControlBox>
    </TabContainer>
  );
};

export const TabGameRules = ({ reglas, setReglas }) => {
  const handleChange = (e) => { 
      const name = e.target.name;
      const value = e.target.value;
      setReglas(prev => ({ ...prev, [name]: value })); 
  };
  
  return (
    <TabContainer>
      <SectionLabel>Tiempos y Horarios</SectionLabel>
      <Row2>
         <InputWithTooltip label="Hora Inicio (1er Partido)">
             <InputText2><input className="form__field" type="time" name="horaInicio" value={reglas?.horaInicio} onChange={handleChange}/></InputText2>
         </InputWithTooltip>
         <InputWithTooltip label="Hora Límite (Ult. Partido)">
             <InputText2><input className="form__field" type="time" name="horaFin" value={reglas?.horaFin} onChange={handleChange}/></InputText2>
         </InputWithTooltip>
      </Row2>
      <SectionLabel>Duración y Cambios</SectionLabel>
      <Row3>
        <InputWithTooltip label="Minutos por Tiempo"><InputNumber name="minutosPorTiempo" value={reglas?.minutosPorTiempo} onChange={handleChange} placeholder="Ej: 45"/></InputWithTooltip>
        <InputWithTooltip label="Minutos Descanso"><InputNumber name="minutosDescanso" value={reglas?.minutosDescanso} onChange={handleChange} placeholder="Ej: 15"/></InputWithTooltip>
        <InputWithTooltip label="Cambios">
            <SelectStyled name="cambios" value={reglas?.cambios || "Ilimitados"} onChange={handleChange}>
                <option value="Ilimitados">Ilimitados</option>
                <option value="Limitados">Limitados</option>
            </SelectStyled>
        </InputWithTooltip>
      </Row3>
      <InputWithTooltip label="Observaciones">
        <TextAreaStyled name="observaciones" value={reglas?.observaciones || ""} onChange={handleChange} rows={3} placeholder="Reglas adicionales o notas..."/>
      </InputWithTooltip>
    </TabContainer>
  );
};