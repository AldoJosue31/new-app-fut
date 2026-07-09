import React, { useState } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { InputNumber, InputText2 } from "../../../../../index";
import { InputWithTooltip } from "../../../../atomos/InputWithTooltip";
import { RiCloseCircleLine } from "react-icons/ri";

// --- CONFIGURACIÓN INICIAL CORREGIDA ---
// --- STYLED COMPONENTS ---
const TabContainer = styled.div` display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.3s ease; `;
const Row2 = styled.div` display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; `;
const Row3 = styled.div` display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; `;
const SectionLabel = styled.div` font-size: 12px; font-weight: 700; color: ${v.colorPrincipal}; text-transform: uppercase; margin: 10px 0 5px; `;
const Divider = styled.div` height: 1px; background: ${({theme})=>theme.bg4}; width: 100%; margin: 5px 0; opacity: 0.5; `;
const SelectStyled = styled.select` width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 12px; padding: 10px; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size: 14px; &:focus { border-color: ${v.colorPrincipal}; } `;
const ControlBox = styled.div` border: 1px solid ${({theme, $isActive}) => $isActive ? theme.primary : theme.bg4}; border-radius: 12px; padding: 15px; background: ${({theme, $isActive}) => $isActive ? `${theme.primary}08` : 'transparent'}; transition: all 0.3s ease; .header-control { display: flex; justify-content: space-between; align-items: center; margin-bottom: ${({$isActive}) => $isActive ? '15px' : '0'}; } .checkbox-wrapper { display: flex; gap: 10px; align-items: center; cursor: pointer; width: 100%; input { accent-color: ${v.colorPrincipal}; transform: scale(1.1); } label { font-weight: 600; font-size: 14px; flex: 1; } }`;
const TextAreaStyled = styled.textarea` width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 15px; padding: 12px; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size: 14px; resize: none; &:focus { border-color: ${v.colorPrincipal}; } `;
const CheckboxPanel = styled.div` display: flex; flex-direction: column; justify-content: center; gap: 10px; padding: 10px 12px; border: 1px solid ${({theme})=>theme.bg4}; border-radius: 12px; label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; } input { accent-color: ${v.colorPrincipal}; } `;
const ClearableInput = styled.div`
  position: relative;

  input {
    padding-right: 38px;
  }

  .clear-input {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: ${({ theme }) => theme.text};
    background: ${({ theme }) => theme.bg4};
    opacity: 0.72;
    cursor: pointer;
    transition: opacity 0.18s ease, transform 0.18s ease, background 0.18s ease;
  }

  .clear-input:hover {
    opacity: 1;
    background: ${v.colorPrincipal}22;
    transform: translateY(-50%) scale(1.06);
  }

  .clear-input:disabled {
    display: none;
  }
`;

export const TabGeneral = ({ form, onChange, isStarted }) => {
  const currentMinPlayers = parseInt(form.minPlayers) || 5;
  const currentMinPlayersToRegister = parseInt(form.minPlayersToRegister ?? form.minPlayers) || 0;
  const currentMaxPlayers = parseInt(form.maxPlayers) || currentMinPlayers;
  const handleGeneralChange = (e) => {
    const target = e.target || e;
    onChange(e);
    if (target.name === "minPlayers") {
        const newMin = parseInt(target.value) || 0;
        const currentMax = parseInt(form.maxPlayers) || 0;
        if (newMin > currentMax) onChange({ target: { name: "maxPlayers", value: newMin } });
    }
    if (target.name === "minPlayersToRegister") {
        const newMinToRegister = parseInt(target.value) || 0;
        const currentMax = parseInt(form.maxPlayers) || 0;
        if (newMinToRegister > currentMax) onChange({ target: { name: "maxPlayers", value: newMinToRegister } });
    }
  };

  return (
    <TabContainer>
      <Row2>
        <InputWithTooltip label="Temporada">
          <InputText2>
            <ClearableInput>
              <input className="form__field" name="season" value={form.season || ""} onChange={onChange} placeholder="Ej: Apertura 2024" readOnly={isStarted} disabled={isStarted} />
              <button
                type="button"
                className="clear-input"
                disabled={isStarted || !form.season}
                aria-label="Borrar temporada"
                onClick={() => onChange({ target: { name: "season", value: "" } })}
              >
                <RiCloseCircleLine />
              </button>
            </ClearableInput>
          </InputText2>
        </InputWithTooltip>
        <InputWithTooltip label="Fecha Inicio"><InputText2><input className="form__field" type="date" name="startDate" value={form.startDate || ""} onChange={onChange} readOnly={isStarted} disabled={isStarted} /></InputText2></InputWithTooltip>
      </Row2>
      <Divider />
      <SectionLabel>Límites de Participación</SectionLabel>
      <Row3>
        <InputWithTooltip label="Min. Jugadores"><InputNumber name="minPlayers" value={form.minPlayers} onChange={handleGeneralChange} min={5} /></InputWithTooltip>
        <InputWithTooltip label="Min. para Inscribir"><InputNumber name="minPlayersToRegister" value={form.minPlayersToRegister ?? form.minPlayers} onChange={handleGeneralChange} min={0} max={currentMaxPlayers} /></InputWithTooltip>
        <InputWithTooltip label="Max. Jugadores"><InputNumber name="maxPlayers" value={form.maxPlayers} onChange={handleGeneralChange} min={Math.max(currentMinPlayers, currentMinPlayersToRegister)} /></InputWithTooltip>
        <InputWithTooltip label="Max. Equipos"><InputNumber name="maxTeams" value={form.maxTeams} onChange={handleGeneralChange} min={2} /></InputWithTooltip>
      </Row3>
    </TabContainer>
  );
};

export const TabScoring = ({ form, onChange }) => {
    const [useCustom, setUseCustom] = useState(() => {
        const isCustom = (parseInt(form.winPoints)||3) !== 3 || (parseInt(form.drawPoints)||1) !== 1 || (parseInt(form.lossPoints)||0) !== 0;
        return isCustom;
    }); 

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
        <Divider />
        {/* CORREGIDO A OPCIONES DE PARTIDO */}
        <InputWithTooltip label="Criterio de Desempate">
            <SelectStyled name="tieBreakType" value={form.tieBreakType || "normal"} onChange={onChange}>
                <option value="normal">Tradicional (Empate directo)</option>
                <option value="penalties">Penales/Shootouts (Punto Extra)</option>
            </SelectStyled>
        </InputWithTooltip>
      </TabContainer>
    );
};

export const TabFormat = ({ form, onChange, vueltasDisabled }) => {
  const maxTeams = parseInt(form.maxTeams) || 20; 
  const currentAsc = parseInt(form.ascensos) || 0;
  const currentDesc = parseInt(form.descensos) || 0;
  const [enablePromotions, setEnablePromotions] = useState(() => currentAsc > 0 || currentDesc > 0);

  const handlePromotionsToggle = (e) => {
      setEnablePromotions(e.target.checked);
      if(!e.target.checked) { onChange({ target: { name: 'ascensos', value: 0 } }); onChange({ target: { name: 'descensos', value: 0 } }); }
  };
  const currentClas = parseInt(form.clasificados) || 0;
  const currentRep = parseInt(form.repechajeTeams) || 0;

  const handlePlayoffsToggle = (e) => {
      onChange(e);
      if (!e.target.checked) {
          onChange({ target: { name: 'hasRepechaje', value: false } });
          onChange({ target: { name: 'repechajeTeams', value: 0 } });
      }
  };

  const handleRepechajeChange = (e) => {
      const nextValue = e?.target?.value;
      const nextNumber = parseInt(nextValue, 10) || 0;
      onChange(e);
      onChange({ target: { name: 'hasRepechaje', value: nextNumber > 0 } });
  };

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
        <div className="header-control"><div className="checkbox-wrapper"><input type="checkbox" id="zonaLiguilla" name="zonaLiguilla" checked={!!form.zonaLiguilla} onChange={handlePlayoffsToggle} /><label htmlFor="zonaLiguilla">Fase Final (Playoffs)</label></div></div>
        {form.zonaLiguilla && (
          <>
            <Row2>
              <InputWithTooltip label="Clasificados Directos"><InputNumber name="clasificados" value={currentClas} onChange={onChange} min={2} max={maxTeams} /></InputWithTooltip>
              <InputWithTooltip label="Equipos Repechaje"><InputNumber name="repechajeTeams" value={currentRep} onChange={handleRepechajeChange} max={maxTeams} /></InputWithTooltip>
            </Row2>
            <Divider />
            <SectionLabel>Ajustes de Fase Final</SectionLabel>
            <Row2>
              <InputWithTooltip label="Resiembra">
                <SelectStyled name="playoffReseed" value={form.playoffReseed === false ? "false" : "true"} onChange={(e) => onChange({ target: { name: "playoffReseed", value: e.target.value === "true" } })}>
                  <option value="true">Primeros vs ultimos cada ronda</option>
                  <option value="false">Mantener llave fija</option>
                </SelectStyled>
              </InputWithTooltip>
              <InputWithTooltip label="Empate global">
                <SelectStyled name="playoffTieBreaker" value={form.playoffTieBreaker || "bestSeed"} onChange={onChange}>
                  <option value="bestSeed">Avanza mejor posicion de tabla</option>
                  <option value="penalties">Penales / shootouts</option>
                </SelectStyled>
              </InputWithTooltip>
            </Row2>
            <Row2>
              <InputWithTooltip label="Repechaje">
                <SelectStyled name="repechajeLegs" value={form.repechajeLegs || "single"} onChange={onChange}>
                  <option value="single">Partido unico</option>
                  <option value="double">Ida y vuelta</option>
                </SelectStyled>
              </InputWithTooltip>
              <CheckboxPanel>
                {currentRep > 0 && <label><input type="checkbox" name="countGoalsRepechaje" checked={!!form.countGoalsRepechaje} onChange={onChange} /> Contar goles de repechaje</label>}
                <label><input type="checkbox" name="countGoalsPlayoffs" checked={!!form.countGoalsPlayoffs} onChange={onChange} /> Contar goles de liguilla</label>
              </CheckboxPanel>
            </Row2>
            <Row3>
              <InputWithTooltip label="Dieciseisavos"><SelectStyled name="playoffLegsRound32" value={form.playoffLegsRound32 || "single"} onChange={onChange}><option value="single">Unico</option><option value="double">Ida y vuelta</option></SelectStyled></InputWithTooltip>
              <InputWithTooltip label="Octavos"><SelectStyled name="playoffLegsRound16" value={form.playoffLegsRound16 || "single"} onChange={onChange}><option value="single">Unico</option><option value="double">Ida y vuelta</option></SelectStyled></InputWithTooltip>
              <InputWithTooltip label="Cuartos"><SelectStyled name="playoffLegsQuarterfinals" value={form.playoffLegsQuarterfinals || "single"} onChange={onChange}><option value="single">Unico</option><option value="double">Ida y vuelta</option></SelectStyled></InputWithTooltip>
              <InputWithTooltip label="Semifinal"><SelectStyled name="playoffLegsSemifinals" value={form.playoffLegsSemifinals || "single"} onChange={onChange}><option value="single">Unico</option><option value="double">Ida y vuelta</option></SelectStyled></InputWithTooltip>
              <InputWithTooltip label="Final"><SelectStyled name="playoffLegsFinal" value={form.playoffLegsFinal || "single"} onChange={onChange}><option value="single">Unico</option><option value="double">Ida y vuelta</option></SelectStyled></InputWithTooltip>
            </Row3>
          </>
        )}
      </ControlBox>
    </TabContainer>
  );
};

export const TabGameRules = ({ reglas, setReglas }) => {
  const handleChange = (e) => { 
      const target = e.target || e; 
      const name = target.name;
      const value = target.value;
      const numericFields = ["jornadaDurationDays", "minutosPorTiempo", "minutosDescanso"];
      
      let finalValue = value;
      if (numericFields.includes(name)) {
        if (value === "") finalValue = ""; 
        else {
            const parsed = parseInt(value, 10);
            finalValue = isNaN(parsed) ? "" : parsed;
        }
      }
      setReglas(prev => ({ ...prev, [name]: finalValue })); 
  };
  const safeValue = (val) => (val === null || val === undefined || Number.isNaN(val)) ? "" : val;

  return (
    <TabContainer>
      <SectionLabel>Tiempos y Horarios</SectionLabel>
      <Row2>
         <InputWithTooltip label="Hora Inicio"><InputText2><input className="form__field" type="time" name="horaInicio" value={reglas?.horaInicio || "08:00"} onChange={handleChange}/></InputText2></InputWithTooltip>
         <InputWithTooltip label="Hora Límite"><InputText2><input className="form__field" type="time" name="horaFin" value={reglas?.horaFin || "22:00"} onChange={handleChange}/></InputText2></InputWithTooltip>
         <InputWithTooltip label="Duración Jornada (días)"><InputNumber name="jornadaDurationDays" value={safeValue(reglas?.jornadaDurationDays ?? 7)} onChange={handleChange} min={1} placeholder="Ej: 7"/></InputWithTooltip>
      </Row2>
      <SectionLabel>Duración y Cambios</SectionLabel>
      <Row3>
        <InputWithTooltip label="Minutos por Tiempo"><InputNumber name="minutosPorTiempo" value={safeValue(reglas?.minutosPorTiempo)} onChange={handleChange} placeholder="Ej: 45"/></InputWithTooltip>
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
