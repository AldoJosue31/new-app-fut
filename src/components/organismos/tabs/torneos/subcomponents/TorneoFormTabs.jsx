import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { InputNumber, InputText2 } from "../../../../../index";

// --- STYLED COMPONENTS LOCALES ---
const TabContainer = styled.div` display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.3s ease; `;
const FormGroup = styled.div` display: flex; flex-direction: column; gap: 5px; label { font-size: 13px; font-weight: 600; opacity: 0.8; } `;
const Row2 = styled.div` 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
    gap: 15px; 

    @media (max-width: 500px) {
        grid-template-columns: 1fr; // Colapsar totalmente en móviles pequeños
    }
`;
const Row3 = styled.div` 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
    gap: 10px; 

    @media (max-width: 450px) {
        grid-template-columns: 1fr; // Apilar inputs en móviles
    }
`;
const SectionLabel = styled.div` font-size: 12px; font-weight: 700; color: ${v.colorPrincipal}; text-transform: uppercase; margin: 10px 0 5px; `;
const Divider = styled.div` height: 1px; background: ${({theme})=>theme.bg4}; width: 100%; margin: 5px 0; opacity: 0.5; `;
const SelectStyled = styled.select` width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 12px; padding: 10px; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size:14px; &:focus{ border-color: ${v.colorPrincipal}; } &:disabled { opacity: 0.6; cursor: not-allowed; background: ${({theme}) => theme.bg3}; } `;
const LiguillaBox = styled.div` border: 1px solid ${({theme, $isActive}) => $isActive ? theme.primary : theme.bg4}; border-radius: 12px; padding: 15px; background: ${({theme, $isActive}) => $isActive ? `${theme.primary}08` : 'transparent'}; transition: all 0.3s ease; `;
const TextAreaStyled = styled.textarea` width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 15px; padding: 12px; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size:14px; resize: none; &:focus{ border-color: ${v.colorPrincipal}; } `;

// --- COMPONENTES ---

export const TabGeneral = ({ form, onChange, isStarted, activeTournament }) => {
  // Sincronización de valores para evitar errores de consola "controlled to uncontrolled"
  const seasonVal = isStarted ? (activeTournament?.season || form.season || "") : (form.season || "");
  const dateVal = isStarted ? (activeTournament?.start_date || form.startDate || "") : (form.startDate || "");

  return (
    <TabContainer>
      <Row2>
        <FormGroup>
          <label>Temporada</label>
          <InputText2>
            <input 
              className="form__field" 
              name="season" 
              value={seasonVal} 
              onChange={onChange || (() => {})} 
              placeholder="Ej: Apertura 2024" 
              readOnly={isStarted}
              disabled={isStarted}
            />
          </InputText2>
        </FormGroup>
        <FormGroup>
          <label>Fecha Inicio</label>
          <InputText2>
            <input 
              className="form__field" 
              type="date" 
              name="startDate" 
              value={dateVal} 
              onChange={onChange || (() => {})} 
              readOnly={isStarted}
              disabled={isStarted}
            />
          </InputText2>
        </FormGroup>
      </Row2>
      <Divider />
      <SectionLabel>Límites de Participación {isStarted && "(Bloqueado)"}</SectionLabel>
      <Row3 style={isStarted ? {pointerEvents:'none', opacity:0.5} : {}}>
        <FormGroup>
            <label>Min. Jugadores</label>
            <InputNumber name="minPlayers" value={form.minPlayers || 7} onChange={onChange} min={5} />
        </FormGroup>
        <FormGroup>
            <label>Max. Jugadores</label>
            <InputNumber name="maxPlayers" value={form.maxPlayers || 25} onChange={onChange} min={7} />
        </FormGroup>
        <FormGroup>
            <label>Max. Equipos</label>
            <InputNumber name="maxTeams" value={form.maxTeams || 20} onChange={onChange} min={2} />
        </FormGroup>
      </Row3>
    </TabContainer>
  );
};

export const TabScoring = ({ form, onChange, isStarted }) => {
    const isCustom = form.winPoints !== 3 || form.drawPoints !== 1 || form.lossPoints !== 0;
    const [useCustom, setUseCustom] = useState(isCustom);

    // Actualizar el estado local si el form cambia externamente
    useEffect(() => {
        setUseCustom(isCustom);
    }, [form.winPoints, form.drawPoints, form.lossPoints]);

    const handleCheck = (e) => {
        if(isStarted) return;
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
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <SectionLabel>Sistema de Puntuación</SectionLabel>
            {!isStarted && (
              <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                  <input type="checkbox" checked={useCustom} onChange={handleCheck} style={{accentColor: v.colorPrincipal}} />
                  <label style={{fontSize:'12px', fontWeight:600}}>Personalizados</label>
              </div>
            )}
        </div>

        <Row3 style={isStarted ? {pointerEvents:'none', opacity:0.5} : {}}>
            <FormGroup><label>Victoria</label><InputNumber name="winPoints" value={form.winPoints ?? 3} onChange={onChange} /></FormGroup>
            <FormGroup><label>Empate</label><InputNumber name="drawPoints" value={form.drawPoints ?? 1} onChange={onChange} /></FormGroup>
            <FormGroup><label>Derrota</label><InputNumber name="lossPoints" value={form.lossPoints ?? 0} onChange={onChange} /></FormGroup>
        </Row3>
        
        <Divider />
        <FormGroup>
          <label>Criterio de Desempate (Regular)</label>
          <SelectStyled name="tieBreakType" value={form.tieBreakType || "normal"} onChange={onChange} disabled={isStarted}>
            <option value="normal">Tradicional</option>
            <option value="penalties">Penales (Punto Extra)</option>
          </SelectStyled>
        </FormGroup>
      </TabContainer>
    );
};

export const TabFormat = ({ form, onChange, vueltasDisabled, isStarted }) => {
  return (
    <TabContainer>
      <FormGroup>
        <label>Modalidad de Juego</label>
        <SelectStyled name="vueltas" value={form.vueltas || "1"} onChange={onChange} disabled={vueltasDisabled}>
          <option value="1">Solo Ida (1 vuelta)</option>
          <option value="2">Ida y Vuelta (2 vueltas)</option>
        </SelectStyled>
      </FormGroup>

      <Row2>
        <FormGroup><label>Ascensos</label><InputNumber name="ascensos" value={form.ascensos ?? 0} onChange={onChange} /></FormGroup>
        <FormGroup><label>Descensos</label><InputNumber name="descensos" value={form.descensos ?? 0} onChange={onChange} /></FormGroup>
      </Row2>

      <LiguillaBox $isActive={form.zonaLiguilla}>
        <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom: form.zonaLiguilla ? '10px' : '0' }}>
           <input 
            type="checkbox" 
            name="zonaLiguilla" 
            checked={!!form.zonaLiguilla} 
            onChange={onChange} 
           />
           <label style={{fontWeight:600}}>Fase Final (Playoffs)</label>
        </div>

        {form.zonaLiguilla && (
          <Row2 style={{marginTop: '10px', animation: 'fadeIn 0.3s ease'}}>
            <FormGroup>
              <label>Clasificados</label>
              <InputNumber name="clasificados" value={form.clasificados || 0} onChange={onChange} min={2} />
            </FormGroup>
            <FormGroup>
              <label>Equipos Repechaje</label>
              <InputNumber name="repechajeTeams" value={form.repechajeTeams || 0} onChange={onChange} />
            </FormGroup>
          </Row2>
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
      <SectionLabel>Tiempos y Horarios</SectionLabel>
      <Row2>
         <FormGroup>
            <label>Hora Inicio (1er Partido)</label>
            <InputText2>
                <input 
                    className="form__field"
                    type="time" 
                    name="horaInicio" 
                    value={reglas?.horaInicio || "08:00"} 
                    onChange={handleChange}
                />
            </InputText2>
         </FormGroup>
         <FormGroup>
            <label>Hora Límite (Ult. Partido)</label>
            <InputText2>
                <input 
                    className="form__field"
                    type="time" 
                    name="horaFin" 
                    value={reglas?.horaFin || "22:00"} 
                    onChange={handleChange}
                />
            </InputText2>
         </FormGroup>
      </Row2>

      <SectionLabel>Duración y Cambios</SectionLabel>
      <Row3>
        <FormGroup>
           <label>Minutos por Tiempo</label>
           <InputNumber 
             name="minutosPorTiempo" 
             value={reglas?.minutosPorTiempo || ""} 
             onChange={handleChange}
           />
        </FormGroup>
        <FormGroup>
           <label>Minutos Descanso</label>
           <InputNumber 
             name="minutosDescanso" 
             value={reglas?.minutosDescanso || ""} 
             onChange={handleChange}
           />
        </FormGroup>
        <FormGroup>
           <label>Cambios</label>
           <SelectStyled name="cambios" value={reglas?.cambios || "Ilimitados"} onChange={handleChange}>
              <option value="Ilimitados">Ilimitados</option>
              <option value="Limitados">Limitados</option>
           </SelectStyled>
        </FormGroup>
      </Row3>
      <FormGroup>
         <label>Observaciones</label>
         <TextAreaStyled 
          name="observaciones" 
          value={reglas?.observaciones || ""} 
          onChange={handleChange} 
          rows={3} 
          placeholder="Reglas adicionales o notas del torneo..."
         />
      </FormGroup>
    </TabContainer>
  );
};