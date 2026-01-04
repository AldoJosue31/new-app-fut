import React from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { InputNumber, InputText2 } from "../../../../../index";

// --- STYLED COMPONENTS LOCALES ---
const TabContainer = styled.div`
  display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.3s ease;
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
`;
const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 5px;
  label { font-size: 13px; font-weight: 600; opacity: 0.8; }
`;
const Row2 = styled.div` display: grid; grid-template-columns: 1fr 1fr; gap: 15px; `;
const Row3 = styled.div` display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; `;
const SectionLabel = styled.div` font-size: 12px; font-weight: 700; color: ${v.colorPrincipal}; text-transform: uppercase; margin: 10px 0 5px; `;
const Divider = styled.div` height: 1px; background: ${({theme})=>theme.bg4}; width: 100%; margin: 5px 0; opacity: 0.5; `;
const SelectStyled = styled.select`
  width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 15px; padding: 12px;
  background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size:14px;
  &:focus{ border-color: ${v.colorPrincipal}; } &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const TextAreaStyled = styled.textarea`
  width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 15px; padding: 12px;
  background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size:14px; resize: none;
  &:focus{ border-color: ${v.colorPrincipal}; }
`;
const LiguillaBox = styled.div`
  border: 1px solid ${({theme, $isActive}) => $isActive ? theme.primary : theme.bg4};
  border-radius: 12px; padding: 15px;
  background: ${({theme, $isActive}) => $isActive ? `${theme.primary}08` : 'transparent'};
  transition: all 0.3s;
`;

// --- COMPONENTES ---

export const TabGeneral = ({ form, onChange }) => (
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
    <SectionLabel>Límites de Participación</SectionLabel>
    <Row3>
      <FormGroup><label>Min. Jugadores</label><InputNumber name="minPlayers" value={form.minPlayers || 7} onChange={onChange} min={5} /></FormGroup>
      <FormGroup><label>Max. Jugadores</label><InputNumber name="maxPlayers" value={form.maxPlayers || 25} onChange={onChange} min={7} /></FormGroup>
      <FormGroup><label>Max. Equipos</label><InputNumber name="maxTeams" value={form.maxTeams || 20} onChange={onChange} min={2} /></FormGroup>
    </Row3>
  </TabContainer>
);

export const TabScoring = ({ form, onChange }) => (
  <TabContainer>
    <SectionLabel>Puntos por Partido</SectionLabel>
    <Row3>
      <FormGroup><label>Victoria</label><InputNumber name="winPoints" value={form.winPoints ?? 3} onChange={onChange} min={1} /></FormGroup>
      <FormGroup><label>Empate</label><InputNumber name="drawPoints" value={form.drawPoints ?? 1} onChange={onChange} min={0} /></FormGroup>
      <FormGroup><label>Derrota</label><InputNumber name="lossPoints" value={form.lossPoints ?? 0} onChange={onChange} min={0} /></FormGroup>
    </Row3>
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

// --- TAB FORMATO REFACTORIZADO ---
export const TabFormat = ({ form, onChange }) => {
  
  // Detectamos si el repechaje está activo
  const hasRepechaje = form.hasRepechaje || false;

  const handleRepechajeCheck = (e) => {
      const isChecked = e.target.checked;
      // Actualizamos el flag
      onChange({ 
          target: { name: 'hasRepechaje', value: isChecked } 
      });
      // Si se desactiva, limpiamos los cupos de repechaje
      if (!isChecked) {
          onChange({ target: { name: 'repechajeTeams', value: 0 } });
      }
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
              <Row2 style={{marginBottom: '15px'}}>
                <FormGroup>
                   <label>Clasificados Directos</label>
                   <InputNumber 
                        name="clasificados" 
                        value={form.clasificados || ""} 
                        onChange={onChange} 
                        placeholder="Ej: 4 (Semifinales)"
                        min={2}
                    />
                   <span style={{fontSize:'11px', opacity:0.6}}>Equipos que aseguran su pase a la siguiente ronda.</span>
                </FormGroup>

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
              
              {/* --- SECCIÓN REPECHAJE --- */}
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
                      <Row2 style={{paddingLeft:'25px'}}>
                          <FormGroup>
                             <label>Cupos de Repechaje</label>
                             <InputNumber 
                                  name="repechajeTeams" 
                                  value={form.repechajeTeams || ""} 
                                  onChange={onChange} 
                                  placeholder="Ej: 4"
                                  min={2}
                              />
                             <span style={{fontSize:'11px', opacity:0.6}}>Equipos que jugarán ronda previa.</span>
                          </FormGroup>
                          
                          <div style={{display:'flex', alignItems:'center', fontSize:'12px', color: v.colorPrincipal, background: `${v.colorPrincipal}15`, padding:'10px', borderRadius:'8px'}}>
                              <strong>Resumen:</strong>&nbsp;{parseInt(form.clasificados || 0)} Directos + {parseInt(form.repechajeTeams || 0)} en Repechaje.
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
           <label>Minutos por Tiempo</label>
           <InputNumber name="minutosPorTiempo" value={reglas?.minutosPorTiempo || 45} onChange={handleChange} />
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