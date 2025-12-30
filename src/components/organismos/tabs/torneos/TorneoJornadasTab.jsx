import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { supabase } from "../../../../supabase/supabase.config";
import { v } from "../../../../styles/variables";
import { 
  RiArrowLeftSLine, RiArrowRightSLine, RiMagicLine
} from "react-icons/ri";
// Importamos Toast, Modal normal y BtnNormal
import { ConfirmModal, Btnsave, Modal, BtnNormal, Toast } from "../../../../index";
import { JornadaPlanificacion } from "./JornadaPlanificacion";
import { JornadaResultados } from "./JornadaResultados";

export function TorneoJornadasTab({ activeTournament, participatingTeams }) {
  const [jornadas, setJornadas] = useState([]);
  const [currentJornadaIndex, setCurrentJornadaIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modals estados
  const [warningModal, setWarningModal] = useState({ open: false, data: null });
  const [previewModal, setPreviewModal] = useState({ open: false, cruces: [] });

  // --- ESTADO DEL TOAST ---
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  // Helper para mostrar notificaciones
  const showToast = (message, type = 'error') => {
      setToastConfig({ show: true, message, type });
  };

  useEffect(() => {
    if (activeTournament) fetchJornadas();
  }, [activeTournament]);

  useEffect(() => {
    if (jornadas.length > 0) {
      fetchMatches(jornadas[currentJornadaIndex].id);
    }
  }, [currentJornadaIndex, jornadas]);

  const fetchJornadas = async () => {
    try {
      const { data, error } = await supabase
        .from('jornadas')
        .select('*')
        .eq('tournament_id', activeTournament.id)
        .order('id', { ascending: true });
      
      if (error) throw error;
      setJornadas(data);
      
      const activeIndex = data.findIndex(j => j.status !== 'Finalizada');
      if (activeIndex !== -1) setCurrentJornadaIndex(activeIndex);
    } catch (error) {
      console.error("Error fetching jornadas:", error);
      showToast("Error cargando jornadas", "error");
    }
  };

  const fetchMatches = async (jornadaId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('jornada_id', jornadaId);

      if (error) throw error;
      setMatches(data);
    } finally {
      setLoading(false);
    }
  };

  // --- GENERACIÓN DE CRUCES ---
  
  const handlePreviewGeneration = () => {
    // Validación con Toast
    if(!participatingTeams || participatingTeams.length < 2) {
        showToast("No hay suficientes equipos participantes para generar cruces.", "error");
        return;
    }
    
    setLoading(true);
    try {
       let equiposDisponibles = [...participatingTeams];
       const crucesVistaPrevia = [];
       
       // Fisher-Yates shuffle
       for (let i = equiposDisponibles.length - 1; i > 0; i--) {
           const j = Math.floor(Math.random() * (i + 1));
           [equiposDisponibles[i], equiposDisponibles[j]] = [equiposDisponibles[j], equiposDisponibles[i]];
       }

       // Emparejar
       while(equiposDisponibles.length >= 2) {
         const t1 = equiposDisponibles.pop();
         const t2 = equiposDisponibles.pop();
         crucesVistaPrevia.push({ t1: t1, t2: t2 });
       }

       if(equiposDisponibles.length > 0) {
          showToast("Atención: Número impar de equipos, uno quedará libre.", "warning");
       }

       setPreviewModal({ open: true, cruces: crucesVistaPrevia });

    } catch (error) {
       showToast("Error generando vista previa: " + error.message, "error");
    } finally {
       setLoading(false);
    }
  };

  const confirmGeneration = async () => {
    setPreviewModal({ ...previewModal, open: false });
    setLoading(true);
    try {
       const jornadaId = jornadas[currentJornadaIndex].id;
       
       const inserts = previewModal.cruces.map(cruce => ({
         jornada_id: jornadaId,
         team1_id: cruce.t1.id,
         team2_id: cruce.t2.id,
         status: 'Programado'
       }));

       const { error } = await supabase.from('matches').insert(inserts);
       if(error) throw error;

       await fetchMatches(jornadaId);
       
       // --- AQUÍ EL TOAST DE ÉXITO ---
       showToast("Cruces generados y guardados exitosamente.", "success");

    } catch (error) {
       showToast("Error guardando cruces en BD: " + error.message, "error");
    } finally {
       setLoading(false);
    }
  };


  // --- CONFIRMACIÓN DE JORNADA ---
  const handleConfirmJornada = async (scheduledMatches, pendingMatches) => {
    if (pendingMatches.length > 0) {
      setWarningModal({ 
        open: true, 
        data: { scheduled: scheduledMatches, pending: pendingMatches } 
      });
    } else {
      executeConfirm(scheduledMatches, []);
    }
  };

  const executeConfirm = async (scheduled, pending) => {
    setLoading(true);
    try {
      const jornadaId = jornadas[currentJornadaIndex].id;
      // 1. Actualizar Partidos con Horario
      for (const m of scheduled) {
        await supabase.from('matches').update({ 
            date: m.tempDateStr, 
            status: 'Programado' 
        }).eq('id', m.id);
      }
      // 2. Actualizar Pendientes
      for (const m of pending) {
        await supabase.from('matches').update({ 
            status: 'Pendiente', 
            date: null 
        }).eq('id', m.id);
      }
      // 3. Cerrar Jornada
      await supabase.from('jornadas').update({ status: 'Confirmada' }).eq('id', jornadaId);

      const newJornadas = [...jornadas];
      newJornadas[currentJornadaIndex].status = 'Confirmada';
      setJornadas(newJornadas);
      setWarningModal({ open: false, data: null });
      
      showToast("Jornada confirmada exitosamente.", "success");
      
    } catch (error) {
      showToast("Error: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!activeTournament) return <EmptyState>No hay torneo activo.</EmptyState>;
  if (jornadas.length === 0) return <EmptyState>Cargando jornadas...</EmptyState>;

  const currentJornada = jornadas[currentJornadaIndex];
  const isPhaseAssignment = currentJornada.status === 'Pendiente';

  return (
    <Container>
      {/* Componente Toast Renderizado */}
      <Toast 
          show={toastConfig.show} 
          message={toastConfig.message} 
          type={toastConfig.type} 
          onClose={() => setToastConfig({ ...toastConfig, show: false })}
      />

      <HeaderNav>
        <NavButton onClick={() => setCurrentJornadaIndex(i => i - 1)} disabled={currentJornadaIndex === 0}>
          <RiArrowLeftSLine />
        </NavButton>
        <div className="title-box">
          <h2>{currentJornada.name}</h2>
          <StatusBadge $status={currentJornada.status}>{currentJornada.status}</StatusBadge>
        </div>
        <NavButton onClick={() => setCurrentJornadaIndex(i => i + 1)} disabled={currentJornadaIndex === jornadas.length - 1}>
          <RiArrowRightSLine />
        </NavButton>
      </HeaderNav>

      {loading && !previewModal.open ? (
        <LoadingBox>Procesando...</LoadingBox>
      ) : (
        <>
          {matches.length === 0 && isPhaseAssignment ? (
             <EmptyMatchesState>
                <p>Esta jornada no tiene partidos asignados aún.</p>
                <Btnsave 
                  titulo="Generar Cruces Automáticamente" 
                  bgcolor={v.colorPrincipal}
                  icono={<RiMagicLine />}
                  funcion={handlePreviewGeneration}
                />
             </EmptyMatchesState>
          ) : (
             isPhaseAssignment ? (
                <JornadaPlanificacion 
                  matches={matches} 
                  teams={participatingTeams} 
                  onConfirm={handleConfirmJornada}
                />
             ) : (
                <JornadaResultados 
                  matches={matches} 
                  teams={participatingTeams}
                  jornadaId={currentJornada.id}
                  refreshMatches={() => fetchMatches(currentJornada.id)}
                />
             )
          )}
        </>
      )}

      {/* Modal Advertencia */}
      <ConfirmModal 
        isOpen={warningModal.open}
        onClose={() => setWarningModal({ ...warningModal, open: false })}
        title="Partidos Sin Horario"
        message={`Hay ${warningModal.data?.pending.length} partidos sin asignar en la tabla.`}
        subMessage="Quedarán como 'Pendientes' (P.P). ¿Deseas continuar?"
        confirmText="Confirmar Jornada"
        onConfirm={() => executeConfirm(warningModal.data?.scheduled, warningModal.data?.pending)}
      />

      {/* Modal Vista Previa */}
      <Modal
            isOpen={previewModal.open}
            onClose={() => setPreviewModal({ ...previewModal, open: false })}
            title="Vista Previa de Cruces"
        >
            <PreviewContainer>
                <p className="info-text">Se generarán aleatoriamente los siguientes partidos para esta jornada. Verifica antes de confirmar.</p>
                <PreviewList>
                    {previewModal.cruces.map((cruce, idx) => (
                        <PreviewItem key={idx}>
                            <div className="team t-left">
                                <span>{cruce.t1.name}</span>
                                <img src={cruce.t1.logo_url || v.iconofotovacia} alt={cruce.t1.name}/>
                            </div>
                            <div className="vs">VS</div>
                            <div className="team t-right">
                                <img src={cruce.t2.logo_url || v.iconofotovacia} alt={cruce.t2.name}/>
                                <span>{cruce.t2.name}</span>
                            </div>
                        </PreviewItem>
                    ))}
                </PreviewList>
                <div className="modal-actions">
                    <BtnNormal titulo="Cancelar" funcion={() => setPreviewModal({ ...previewModal, open: false })} />
                    <Btnsave titulo="Confirmar y Generar" bgcolor={v.colorPrincipal} funcion={confirmGeneration} />
                </div>
            </PreviewContainer>
        </Modal>

    </Container>
  );
}

// STYLES
const Container = styled.div` display: flex; flex-direction: column; gap: 20px; width: 100%; `;
const HeaderNav = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  background: ${({theme})=>theme.bgcards}; padding: 15px 20px; border-radius: 16px;
  box-shadow: ${({theme})=>theme.boxshadowGray}; border: 1px solid ${({theme})=>theme.bg4};
  .title-box { text-align: center; h2 { margin: 0; font-size: 1.2rem; color: ${({theme})=>theme.text}; } }
`;
const NavButton = styled.button`
  background: transparent; border: none; font-size: 2rem; cursor: pointer; color: ${({theme})=>theme.text};
  opacity: 0.7; transition: 0.2s;
  &:hover:not(:disabled) { transform: scale(1.2); opacity: 1; color: ${v.colorPrincipal}; }
  &:disabled { opacity: 0.1; cursor: default; }
`;
const StatusBadge = styled.span`
  font-size: 0.75rem; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 10px;
  background: ${({$status, theme}) => $status === 'Pendiente' ? theme.bg4 : '#2ecc7120'};
  color: ${({$status}) => $status === 'Pendiente' ? '#888' : '#2ecc71'};
  border: 1px solid ${({$status}) => $status === 'Pendiente' ? '#8888' : '#2ecc71'};
`;
const EmptyState = styled.div` padding: 40px; text-align: center; opacity: 0.6; `;
const LoadingBox = styled.div` padding: 50px; text-align: center; color: ${({theme})=>theme.text}; font-weight:600; `;
const EmptyMatchesState = styled.div`
  background: ${({theme})=>theme.bgcards}; padding: 40px; border-radius: 16px; border: 2px dashed ${({theme})=>theme.bg4};
  text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px;
  p { font-size: 1.1rem; opacity: 0.7; }
`;
const PreviewContainer = styled.div` 
  padding: 10px; 
  .info-text{margin-bottom:20px; opacity:0.8; font-size: 0.9rem;} 
  .modal-actions{display:flex; justify-content:flex-end; gap:10px; margin-top:20px; padding-top: 15px; border-top: 1px solid ${({theme})=>theme.bg4};} 
`;
const PreviewList = styled.div` display:flex; flex-direction:column; gap:8px; max-height:400px; overflow-y:auto; padding-right: 5px; `;
const PreviewItem = styled.div` 
  display:flex; align-items:center; justify-content:center; gap: 15px;
  background:${({theme})=>theme.bgtotal}; padding:10px 15px; border-radius:8px; border:1px solid ${({theme})=>theme.bg4}; 
  .team{display:flex; align-items:center; gap:10px; width:40%; font-weight:600; font-size:0.9rem; img{width:28px; height:28px; object-fit:contain;}} 
  .t-left{justify-content: flex-end; text-align: right;}
  .t-right{justify-content: flex-start; text-align: left;}
  .vs{opacity:0.5; font-weight:bold; font-size:0.8rem; color: ${v.colorPrincipal};} 
`;
