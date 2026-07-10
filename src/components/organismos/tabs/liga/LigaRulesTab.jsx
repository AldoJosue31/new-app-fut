import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../../../styles/variables";
import { IoMdStopwatch } from "react-icons/io";
import { RiCoinLine, RiErrorWarningLine, RiGroupLine } from "react-icons/ri";
import { Card, CardHeader, Btnsave } from "../../../../index";
import { Toast } from "../../../atomos/Toast";
import { Skeleton } from "../../../atomos/Skeleton";

export function LigaRulesTab({ data, onUpdate, loading }) {
  const [config, setConfig] = useState({
    minPlayers: 7,
    maxPlayers: 25,
    maxTeams: 20,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    tieBreakType: "normal", // <-- REGRESADO A SU ESTADO ORIGINAL
    horaInicio: "08:00",
    horaFin: "22:00",
    jornadaDurationDays: 7,
    minutosPorTiempo: 45,
    minutosDescanso: 15,
    cambios: "Ilimitados",
    observaciones: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (data?.default_config) {
      const parsed = typeof data.default_config === 'string' ? JSON.parse(data.default_config) : data.default_config;
      if (Object.keys(parsed).length > 0) {
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    }
  }, [data]);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await onUpdate({ default_config: config });
      if (success) {
        setHasChanges(false);
        setToast({ show: true, message: "Plantilla de reglas guardada con éxito.", type: "success" });
      }
    } catch {
      setToast({ show: true, message: "Error al guardar reglas.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <Skeleton width="100%" height="400px" radius="12px" />;

  return (
    <>
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} duration={5000} />
      <Card maxWidth="800px">
        <CardHeader Icono={IoMdStopwatch} titulo="Plantilla de Reglas del Torneo" subtitulo="Estos valores se usarán por defecto al crear nuevos torneos en tu liga." />
        
        <FormContainer>
          {hasChanges && (
            <UnsavedWarning>
              <RiErrorWarningLine size={24} />
              <span><strong>Tienes cambios sin guardar.</strong> Haz clic en "Guardar Cambios" para aplicarlos en la plantilla.</span>
            </UnsavedWarning>
          )}

          <SectionTitle><RiGroupLine /> Capacidades y Participantes</SectionTitle>
          <Grid>
            <FormGroup>
              <label>Mínimo de Jugadores</label>
              <input type="number" className="form__field" value={config.minPlayers} onChange={(e) => handleChange('minPlayers', Number(e.target.value))} />
            </FormGroup>
            <FormGroup>
              <label>Máximo de Jugadores</label>
              <input type="number" className="form__field" value={config.maxPlayers} onChange={(e) => handleChange('maxPlayers', Number(e.target.value))} />
            </FormGroup>
            <FormGroup>
              <label>Límite Máximo de Equipos</label>
              <input type="number" className="form__field" value={config.maxTeams} onChange={(e) => handleChange('maxTeams', Number(e.target.value))} />
            </FormGroup>
          </Grid>

          <Divider />

          <SectionTitle><RiCoinLine /> Sistema de Puntuación y Desempate</SectionTitle>
          <Grid>
            <FormGroup>
              <label>Puntos por Victoria</label>
              <input type="number" className="form__field" value={config.winPoints} onChange={(e) => handleChange('winPoints', Number(e.target.value))} />
            </FormGroup>
            <FormGroup>
              <label>Puntos por Empate</label>
              <input type="number" className="form__field" value={config.drawPoints} onChange={(e) => handleChange('drawPoints', Number(e.target.value))} />
            </FormGroup>
            <FormGroup>
              <label>Puntos por Derrota</label>
              <input type="number" className="form__field" value={config.lossPoints} onChange={(e) => handleChange('lossPoints', Number(e.target.value))} />
            </FormGroup>
            
            {/* CORREGIDO A DESEMPATE DE PARTIDO */}
            <FormGroup style={{ gridColumn: '1 / -1' }}>
              <label>Desempate de Partido (En caso de empate)</label>
              <select className="form__field" value={config.tieBreakType} onChange={(e) => handleChange('tieBreakType', e.target.value)}>
                <option value="normal">Tradicional (Empate directo)</option>
                <option value="penalties">Penales/Shootouts (Punto Extra)</option>
              </select>
            </FormGroup>
          </Grid>

          <Divider />

          <SectionTitle><IoMdStopwatch /> Tiempos y Horarios</SectionTitle>
          <Grid>
            <FormGroup>
              <label>Hora de Inicio</label>
              <input type="time" className="form__field" value={config.horaInicio} onChange={(e) => handleChange('horaInicio', e.target.value)} />
            </FormGroup>
            <FormGroup>
              <label>Hora LÃ­mite</label>
              <input type="time" className="form__field" value={config.horaFin} onChange={(e) => handleChange('horaFin', e.target.value)} />
            </FormGroup>
            <FormGroup>
              <label>DuraciÃ³n de Jornada (dÃ­as)</label>
              <input type="number" min="1" className="form__field" value={config.jornadaDurationDays} onChange={(e) => handleChange('jornadaDurationDays', Number(e.target.value))} />
            </FormGroup>
          </Grid>

          <Divider />

          <SectionTitle><IoMdStopwatch /> Tiempos, Descansos y Cambios</SectionTitle>
          <Grid>
            <FormGroup>
              <label>Minutos por Tiempo</label>
              <input type="number" className="form__field" value={config.minutosPorTiempo} onChange={(e) => handleChange('minutosPorTiempo', Number(e.target.value))} />
            </FormGroup>
            <FormGroup>
              <label>Minutos de Descanso</label>
              <input type="number" className="form__field" value={config.minutosDescanso} onChange={(e) => handleChange('minutosDescanso', Number(e.target.value))} />
            </FormGroup>
            <FormGroup>
              <label>Opciones de Cambios</label>
              <select className="form__field" value={config.cambios} onChange={(e) => handleChange('cambios', e.target.value)}>
                <option value="Ilimitados">Ilimitados</option>
                <option value="Limitados">Limitados</option>
              </select>
            </FormGroup>
          </Grid>

          <FormGroup>
            <label>Observaciones</label>
            <TextArea className="form__field" value={config.observaciones} onChange={(e) => handleChange('observaciones', e.target.value)} rows="3" placeholder="Reglas adicionales..." />
          </FormGroup>

          <div className="actions-right" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
            <Btnsave titulo={isSaving ? "Guardando..." : "Guardar Cambios"} bgcolor={hasChanges ? "#e67e22" : v.colorPrincipal} icono={<v.iconoguardar/>} funcion={handleSave} disabled={isSaving || !hasChanges} />
          </div>
        </FormContainer>
      </Card>
    </>
  );
}

const FormContainer = styled.div` padding-top: 20px; `;
const Grid = styled.div` display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; `;
const FormGroup = styled.div` display: flex; flex-direction: column; gap: 8px; label { font-weight: 600; font-size: 14px; opacity: 0.8; } .form__field { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid ${({theme})=>theme.bg4}; background: ${({theme})=>theme.bg}; color: ${({theme})=>theme.text}; font-size: 14px; } `;
const SectionTitle = styled.h3` display: flex; align-items: center; gap: 8px; font-size: 16px; margin-bottom: 15px; color: ${({theme})=>theme.primary}; `;
const Divider = styled.div` height: 1px; background-color: ${({theme})=>theme.bg4}; margin: 30px 0; `;
const UnsavedWarning = styled.div` display: flex; align-items: center; gap: 12px; background-color: rgba(230, 126, 34, 0.15); border: 1px solid #e67e22; color: #e67e22; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; `;
const TextArea = styled.textarea` width: 100%; resize: vertical; min-height: 84px; `;
