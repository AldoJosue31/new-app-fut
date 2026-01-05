import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { InputNumber, InputText2, Tooltip } from "../../../../../index";

// --- STYLED COMPONENTS LOCALES ---
const TabContainer = styled.div` display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.3s ease; @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } `;
const FormGroup = styled.div` display: flex; flex-direction: column; gap: 5px; label { font-size: 13px; font-weight: 600; opacity: 0.8; } `;
const Row2 = styled.div` display: grid; grid-template-columns: 1fr 1fr; gap: 10px; @media (max-width: 600px) { gap: 8px; } `;
const Row3 = styled.div` display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; @media (max-width: 600px) { grid-template-columns: 1fr 1fr; } `;
const SectionLabel = styled.div` font-size: 12px; font-weight: 700; color: ${v.colorPrincipal}; text-transform: uppercase; margin: 10px 0 5px; `;
const Divider = styled.div` height: 1px; background: ${({theme})=>theme.bg4}; width: 100%; margin: 5px 0; opacity: 0.5; `;
const SelectStyled = styled.select` width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 12px; padding: 10px; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size:14px; &:focus{ border-color: ${v.colorPrincipal}; } &:disabled { opacity: 0.5; cursor: not-allowed; background: ${({theme}) => theme.bg3}; } `;
const LiguillaBox = styled.div` border: 1px solid ${({theme, $isActive}) => $isActive ? theme.primary : theme.bg4}; border-radius: 12px; padding: 15px; background: ${({theme, $isActive}) => $isActive ? `${theme.primary}08` : 'transparent'}; transition: all 0.3s; `;
const TextAreaStyled = styled.textarea` width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 15px; padding: 12px; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size:14px; resize: none; &:focus{ border-color: ${v.colorPrincipal}; } `;

// --- COMPONENTES ---

export const TabGeneral = ({ form, onChange, isStarted }) => ( // <--- Prop isStarted
  <TabContainer>
    <Row2>
      <FormGroup>
        <label>Temporada</label>
        <InputText2><input className="form__field" name="season" value={form.season || ""} onChange={onChange} placeholder="Ej: Apertura 2024" /></InputText2>
      </FormGroup>
      <FormGroup>
        <label>Fecha Inicio</label>
        <InputText2><input className="form__field" type="date" name="startDate" value={form.startDate || ""} onChange={onChange} /></InputText2>
      </FormGroup>
    </Row2>
    <Divider />
    <SectionLabel>Límites de Participación {isStarted && "(Bloqueado por Torneo Iniciado)"}</SectionLabel>
    <Row3>
      {/* Si está iniciado, pasamos disabled o readOnly (InputNumber debe soportarlo, si no, usar style pointerEvents: none) */}
      <FormGroup>
          <label>Min. Jugadores</label>
          <div style={isStarted ? {pointerEvents:'none', opacity:0.5} : {}}>
            <InputNumber name="minPlayers" value={form.minPlayers || 7} onChange={onChange} min={5} />
          </div>
      </FormGroup>
      <FormGroup>
          <label>Max. Jugadores</label>
          <div style={isStarted ? {pointerEvents:'none', opacity:0.5} : {}}>
            <InputNumber name="maxPlayers" value={form.maxPlayers || 25} onChange={onChange} min={7} />
          </div>
      </FormGroup>
      <FormGroup>
          <label>Max. Equipos</label>
          <div style={isStarted ? {pointerEvents:'none', opacity:0.5} : {}}>
             <InputNumber name="maxTeams" value={form.maxTeams || 20} onChange={onChange} min={2} />
          </div>
      </FormGroup>
    </Row3>
  </TabContainer>
);

export const TabScoring = ({ form, onChange }) => {
    // Detectamos si está usando puntos personalizados
    const isCustom = form.winPoints !== 3 || form.drawPoints !== 1 || form.lossPoints !== 0;
    const [useCustom, setUseCustom] = useState(isCustom);

    const handleCheck = (e) => {
        const checked = e.target.checked;
        setUseCustom(checked);
        if (!checked) {
            // Resetear a valores estándar
            onChange({ target: { name: 'winPoints', value: 3 } });
            onChange({ target: { name: 'drawPoints', value: 1 } });
            onChange({ target: { name: 'lossPoints', value: 0 } });
        }
    };

    return (
      <TabContainer>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <SectionLabel>Sistema de Puntuación</SectionLabel>
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                <input 
                    type="checkbox" 
                    checked={useCustom} 
                    onChange={handleCheck} 
                    style={{accentColor: v.colorPrincipal, transform:'scale(1.1)'}} 
                />
                <label style={{fontSize:'12px', fontWeight:600, cursor:'pointer'}} onClick={() => handleCheck({target:{checked:!useCustom}})}>
                    Puntos Personalizados
                </label>
            </div>
        </div>

        {useCustom && (
            <Row3 style={{animation:'fadeIn 0.3s ease'}}>
                <FormGroup><label>Victoria</label><InputNumber name="winPoints" value={form.winPoints ?? 3} onChange={onChange} min={1} /></FormGroup>
                <FormGroup><label>Empate</label><InputNumber name="drawPoints" value={form.drawPoints ?? 1} onChange={onChange} min={0} /></FormGroup>
                <FormGroup><label>Derrota</label><InputNumber name="lossPoints" value={form.lossPoints ?? 0} onChange={onChange} min={0} /></FormGroup>
            </Row3>
        )}
        
        {!useCustom && (
            <div style={{fontSize:'13px', opacity:0.7, fontStyle:'italic', padding:'10px', background:`${v.bg4}40`, borderRadius:'8px'}}>
                Estándar FIFA: <strong>3</strong> pts por Victoria, <strong>1</strong> pt por Empate.
            </div>
        )}

        <Divider />
        <FormGroup>
          <label>Criterio de Desempate (Jornada Regular)</label>
          <SelectStyled name="tieBreakType" value={form.tieBreakType || "normal"} onChange={onChange}>
            <option value="normal">Tradicional (Repartir puntos)</option>
            <option value="penalties">Penales / Shootouts (Punto Extra)</option>
          </SelectStyled>
        </FormGroup>
      </TabContainer>
    );
};

// --- TAB FORMATO REFACTORIZADO ---
export const TabFormat = ({ form, onChange }) => {
  
  const hasRepechaje = form.hasRepechaje || false;
  const clasificados = parseInt(form.clasificados || 0);

  const getPhaseValue = () => {
      if (clasificados === 2) return "2";
      if (clasificados === 4) return "4";
      if (clasificados === 8) return "8";
      if (clasificados === 16) return "16";
      return "custom";
  };

  const handlePhaseChange = (e) => {
      const val = e.target.value;
      if (val !== "custom") {
          onChange({ target: { name: 'clasificados', value: parseInt(val) } });
      }
  };

  // FIX: Simplificado. Solo cambiamos el check. 
  // La limpieza de 'repechajeTeams' ahora la hace automáticamente el hook useTorneosLogic.
  const handleRepechajeCheck = (e) => {
      onChange({ target: { name: 'hasRepechaje', value: e.target.checked } });
  };

  return (
    <TabContainer>
      <FormGroup>
        <label>Modalidad de Juego</label>
        <SelectStyled name="vueltas" value={form.vueltas || "1"} onChange={onChange}>
          <option value="1">Solo Ida (1 vuelta)</option>
          <option value="2">Ida y Vuelta (2 vueltas)</option>
        </SelectStyled>
      </FormGroup>

      <Row2>
        <FormGroup><label>Ascensos</label><InputNumber name="ascensos" value={form.ascensos || 0} onChange={onChange} min={0} /></FormGroup>
        <FormGroup><label>Descensos</label><InputNumber name="descensos" value={form.descensos || 0} onChange={onChange} min={0} /></FormGroup>
      </Row2>

      <LiguillaBox $isActive={form.zonaLiguilla}>
        <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom: form.zonaLiguilla ? '15px':0 }}>
           <input 
              type="checkbox" 
              id="liguillaCheck" 
              name="zonaLiguilla" 
              checked={!!form.zonaLiguilla} 
              onChange={onChange} 
              style={{transform:'scale(1.2)', accentColor: v.colorPrincipal}}
           />
           <label htmlFor="liguillaCheck" style={{cursor:'pointer', fontWeight:600}}>Habilitar Fase Final (Playoffs)</label>
        </div>

        {form.zonaLiguilla && (
          <div style={{animation: 'fadeIn 0.3s ease'}}>
              
              <Row2 style={{marginBottom: '10px'}}>
                  <FormGroup>
                      <label>Estructura Fase Final</label>
                      <SelectStyled value={getPhaseValue()} onChange={handlePhaseChange}>
                          <option value="2">Final Directa (Top 2)</option>
                          <option value="4">Semifinales (Top 4)</option>
                          <option value="8">Cuartos de Final (Top 8)</option>
                          <option value="16">Octavos de Final (Top 16)</option>
                          <option value="custom">Personalizado</option>
                      </SelectStyled>
                  </FormGroup>

                  <FormGroup>
                   <label>Clasif. Directos</label>
                   <InputNumber 
                        name="clasificados" 
                        value={form.clasificados || ""} 
                        onChange={onChange} 
                        min={2}
                    />
                  </FormGroup>
              </Row2>

              <Row2 style={{marginBottom: '15px'}}>
                <FormGroup>
                   <label>Criterio de Desempate</label>
                   <SelectStyled name="playoffTieBreak" value={form.playoffTieBreak || "position"} onChange={onChange}>
                      <option value="position">Mejor Posición en Tabla</option>
                      <option value="penalties">Penales Directos</option>
                      <option value="extraTime">Tiempo Extra</option>
                   </SelectStyled>
                </FormGroup>
              </Row2>

              <Divider />
              
              <div style={{marginTop:'15px'}}>
                  <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom: '10px' }}>
                       <input 
                          type="checkbox" 
                          id="repechajeCheck" 
                          name="hasRepechaje"
                          checked={hasRepechaje} 
                          onChange={handleRepechajeCheck} 
                          style={{transform:'scale(1.1)', accentColor: v.colorPrincipal}}
                       />
                       <label htmlFor="repechajeCheck" style={{cursor:'pointer', fontSize:'13px', fontWeight:600}}>Habilitar Repechaje (Play-in)</label>
                  </div>

                  {hasRepechaje && (
                      <Row2 style={{paddingLeft:'15px'}}>
                          <FormGroup>
                             <label>Cupos Repechaje</label>
                             <InputNumber 
                                  name="repechajeTeams" 
                                  value={form.repechajeTeams || ""} 
                                  onChange={onChange} 
                                  placeholder="Ej: 4"
                                  min={2}
                              />
                          </FormGroup>
                          
                          <div style={{display:'flex', alignItems:'center', fontSize:'11px', color: v.colorPrincipal, background: `${v.colorPrincipal}15`, padding:'8px', borderRadius:'8px', lineHeight:'1.2'}}>
                              Resumen: {parseInt(form.clasificados || 0)} Directos + {parseInt(form.repechajeTeams || 0)} a Repechaje.
                          </div>
                      </Row2>
                  )}
              </div>
          </div>
        )}
      </LiguillaBox>
    </TabContainer>
  );
};

export const TabGameRules = ({ reglas, setReglas }) => {
  const handleChange = (e) => {
    setReglas({ ...reglas, [e.target.name]: e.target.value });
  };

  return (
    <TabContainer>
      <SectionLabel>Tiempos y Duración</SectionLabel>
      <Row2>
        <FormGroup>
           <label>Minutos por Tiempo {reglas?.minutosPorTiempo === "" && <span style={{color:'red'}}>*</span>}</label>
           {/* Input normal para aceptar empty string */}
           <input 
              type="number"
              name="minutosPorTiempo" 
              value={reglas?.minutosPorTiempo} 
              onChange={handleChange}
              placeholder="Ej: 45"
              style={{
                  width: '100%', 
                  border: `2px solid ${!reglas.minutosPorTiempo ? '#e74c3c' : '#333'}`, // Borde rojo si está vacío
                  borderRadius: '15px', 
                  padding: '12px',
                  background: v.bgtotal, 
                  color: v.text, 
                  outline: 'none'
              }}
           />
        </FormGroup>
        <FormGroup>
           <label>Cambios Permitidos</label>
           <SelectStyled name="cambios" value={reglas?.cambios || "Ilimitados"} onChange={handleChange}>
              <option value="Ilimitados">Ilimitados (Reingreso)</option>
              <option value="Limitados">Limitados</option>
              <option value="Sin Reingreso">Sin Reingreso</option>
           </SelectStyled>
        </FormGroup>
      </Row2>
      <Divider />
      <FormGroup>
         <label>Observaciones o Reglas Extra</label>
         <TextAreaStyled 
            name="observaciones" 
            value={reglas?.observaciones || ""} 
            onChange={handleChange}
            placeholder="Reglas específicas del torneo..."
            rows={4}
         />
      </FormGroup>
    </TabContainer>
  );
};