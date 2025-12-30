import React, { useState } from "react";
import styled, { css } from "styled-components";
import { v } from "../../../../styles/variables";
import { IoMdSettings, IoIosArrowDown, IoIosArrowUp, IoMdStopwatch, IoMdClipboard } from "react-icons/io";
import { 
    RiCalendarEventLine, 
    RiTrophyLine, 
    RiInformationLine, 
    RiAddCircleLine, 
    RiCloseCircleLine,
    RiFileList3Line,
    RiCoinLine,
    RiGitMergeLine,
} from "react-icons/ri";

// Importamos componentes
import { Card, CardHeader, BtnNormal, Btnsave, InputNumber, InputText2, Modal, TabsNavigation, Toast } from "../../../../index";
import { TableRowSkeleton } from "../../../../components/atomos/Skeleton";

export function TorneoDefinicionTab({ 
    form, onChange, onSubmit, loading, divisionName, activeTournament, 
    allTeams, participatingIds, onInclude, onExclude, minPlayers,
    isLoading,
    // NUEVAS PROPS RECIBIDAS DE TORNEOS.JSX
    reglas, 
    setReglas
}) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  // Función helper para mostrar toast
  const showToast = (message, type = 'error') => {
      setToastConfig({ show: true, message, type });
  };
  
  // Estado para las tabs internas del modal
  const [configTab, setConfigTab] = useState("general"); 

  // Definición de tabs para el modal (AGREGAMOS TAB DE REGLAS DE JUEGO)
  const configTabList = [
      { id: "general", label: "General", icon: <RiFileList3Line/> },
      { id: "scoring", label: "Puntuación", icon: <RiCoinLine/> },
      { id: "format", label: "Formato", icon: <RiGitMergeLine/> },
      { id: "gameRules", label: "Reglas Juego", icon: <IoMdStopwatch/> } // Nueva Tab
  ];

  const participatingTeams = allTeams?.filter(t => participatingIds.includes(t.id)) || [];
  const excludedTeams = allTeams?.filter(t => !participatingIds.includes(t.id)) || [];

  // --- HANDLERS ---
  const getExclusionReason = (team) => {
      if (team.status === 'Suspendido') return { text: "Suspensión", color: "#e74c3c", canAdd: false };
      if (team.playerCount < minPlayers) return { text: `Falta Jugadores (${team.playerCount}/${minPlayers})`, color: "#f39c12", canAdd: false };
      return { text: "Decisión de Gestor", color: "#3498db", canAdd: true };
  };

  const getTieBreakText = () => {
      if (form.tieBreakType === 'penalties') return "Empate + Penales (Punto Extra)";
      return "Empate Tradicional (1-1)";
  };

  // Handler específico para el objeto de reglas
  const handleReglasChange = (e) => {
    if(setReglas) {
        setReglas({ ...reglas, [e.target.name]: e.target.value });
    }
  };
  const handleStartTournament = () => {
      // VALIDACIÓN: Equipos Participantes deben ser pares
      if (participatingTeams.length % 2 !== 0) {
          showToast(`Tienes ${participatingTeams.length} equipos. Se requiere un número par para iniciar.`, "error");
          return;
      }
      
      // Si pasa la validación, ejecutamos el onSubmit original
      onSubmit();
  };

const handleSaveConfig = () => {
    // VALIDACIÓN: Max Equipos debe ser par
    const maxTeamsNum = parseInt(form.maxTeams || 0);
    if (maxTeamsNum % 2 !== 0) {
        showToast("El número máximo de equipos debe ser par (ej: 18, 20).", "error");
        return; // Detenemos la ejecución
    }

    const draftData = { ...form, reglasDraft: reglas };
    localStorage.setItem("torneo_reglas_draft", JSON.stringify(draftData));
    
    setShowConfigModal(false);
    showToast("Configuración guardada correctamente.", "success");
  };

  return (
    <StyledCardWrapper $isBlur={!!activeTournament}>
        <Toast 
            show={toastConfig.show} 
            message={toastConfig.message} 
            type={toastConfig.type} 
            onClose={() => setToastConfig({ ...toastConfig, show: false })}
        />
        {activeTournament && (
            <LockedOverlay>
                <div className="lock-message">
                    <v.iconocorona className="big-icon" />
                    <h2>Torneo en Curso</h2>
                    <p>{activeTournament.season}</p>
                    <span>Finaliza el torneo actual para crear uno nuevo.</span>
                </div>
            </LockedOverlay>
        )}

        <Card maxWidth="1000px">
            <div style={{ marginBottom: '20px' }}>
                <CardHeader Icono={v.iconocorona} titulo="Resumen de Temporada" subtitulo={`División: ${divisionName || "..."}`} />
            </div>

            <DashboardGrid>
                {/* Panel Resumen (Izquierda) */}
                <div className="summary-col">
                    <SectionTitle>Configuración Actual</SectionTitle>
                    <SummaryBox>
                        <SummaryItem icon={<RiCalendarEventLine/>} label="Temporada" value={form.season || "---"} />
                        <SummaryItem icon={<RiTrophyLine/>} label="Formato" value={form.vueltas === "2" ? "Ida y Vuelta" : "Solo Ida"} />
                        
                        {/* NUEVO ITEM: Reglas de Juego */}
                        <SummaryItem 
                            icon={<IoMdStopwatch/>} 
                            label="Juego" 
                            value={`${reglas?.minutosPorTiempo || 45} min/tiempo | ${reglas?.cambios || 'Libres'}`} 
                        />

                        <SummaryItem 
                           icon={<IoMdSettings/>} label="Puntuación" 
                           value={`V:${form.winPoints || 3} E:${form.drawPoints || 1} D:${form.lossPoints || 0}`} 
                        />
                        <SummaryItem 
                           icon={<v.balance/>} label="Desempate Regular" 
                           value={getTieBreakText()} 
                        />
                        {form.zonaLiguilla && (
                            <SummaryItem 
                               icon={<v.iconocorona/>} label="Liguilla" 
                               value={`Top ${form.clasificados} | Desempate: ${form.playoffTieBreak === 'penalties' ? 'Penales' : 'Tabla'}`} 
                            />
                        )}
                        <SummaryItem icon={<v.iconoUser/>} label="Participación" value={`Max ${form.maxTeams} Eq | Min ${form.minPlayers} Jug`} />
                    </SummaryBox>
                    <div style={{marginTop: 20}}>
                        <BtnNormal titulo="Editar Reglas" width="100%" icono={<IoMdSettings />} funcion={()=>setShowConfigModal(true)} />
                    </div>
                </div>

                {/* Gestión Equipos (Derecha) */}
                <div className="teams-col">
                    <SectionTitle>Equipos Participantes ({participatingTeams.length}/{form.maxTeams})</SectionTitle>
                    <TeamsList>
                        {isLoading ? (
                            <>
                                <TableRowSkeleton />
                                <TableRowSkeleton />
                                <TableRowSkeleton />
                                <TableRowSkeleton />
                            </>
                        ) : (
                            participatingTeams.length > 0 ? (
                                participatingTeams.map((team, idx) => (
                                    <TeamItem key={team.id}>
                                        <span className="number">{idx + 1}</span>
                                        <img src={team.logo_url || v.iconofotovacia} alt="logo" />
                                        <span className="name">{team.name}</span>
                                        <ActionButton className="remove" onClick={() => onExclude(team.id)}>
                                            <RiCloseCircleLine />
                                        </ActionButton>
                                    </TeamItem>
                                ))
                            ) : (
                                <EmptyMsg>No hay equipos seleccionados.</EmptyMsg>
                            )
                        )}
                    </TeamsList>
                    
                    <ExcludedSection>
                        <ExcludedHeader onClick={() => setShowExcluded(!showExcluded)}>
                            <span>Equipos No Participantes ({excludedTeams.length})</span>
                            {showExcluded ? <IoIosArrowUp /> : <IoIosArrowDown />}
                        </ExcludedHeader>
                        <ExcludedContent $isOpen={showExcluded}>
                            {excludedTeams.map(team => {
                                const reason = getExclusionReason(team);
                                return (
                                    <ExcludedItem key={team.id}>
                                        <div className="info-grp"><img src={team.logo_url || v.iconofotovacia} alt="logo" /><span className="ex-name">{team.name}</span></div>
                                        <div className="reason-grp">
                                            <ReasonBadge $color={reason.color}>{reason.text}</ReasonBadge>
                                            {reason.canAdd && <ActionButton className="add" onClick={() => onInclude(team.id)}><RiAddCircleLine /></ActionButton>}
                                        </div>
                                    </ExcludedItem>
                                );
                            })}
                        </ExcludedContent>
                    </ExcludedSection>
                </div>
            </DashboardGrid>

            <div style={{ marginTop: '20px', borderTop: `1px solid ${v.bg4}`, paddingTop:'20px', display:'flex', justifyContent:'end' }}>
                <Btnsave 
                    titulo={loading ? "Creando..." : "Iniciar Torneo"} 
                    bgcolor={v.colorPrincipal} 
                    icono={<v.iconoguardar />} 
                    funcion={handleStartTournament} 
                    disabled={loading || !divisionName || participatingTeams.length < 2 || !form.season} 
                />
            </div>
        </Card>

        {/* --- MODAL DE CONFIGURACIÓN --- */}
        <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Configurar Reglas" width="650px">
            <ModalContentStyled>
                <div className="info-message"><RiInformationLine className="icon"/><span>Define las reglas de competencia.</span></div>
                
                <TabsNavigation 
                    tabs={configTabList} 
                    activeTab={configTab} 
                    setActiveTab={setConfigTab} 
                />

                {/* --- TAB 1: GENERAL --- */}
                {configTab === 'general' && (
                    <TabContent>
                        <div className="row-2">
                            <FormGroup label="Temporada"><InputText2><input className="form__field" name="season" value={form.season} onChange={onChange} placeholder="Ej: Apertura 2024" /></InputText2></FormGroup>
                            <FormGroup label="Fecha Inicio"><InputText2><input className="form__field" type="date" name="startDate" value={form.startDate} onChange={onChange} /></InputText2></FormGroup>
                        </div>
                        <Divider />
                        <SectionLabel>Límites de Participación</SectionLabel>
                        <div className="row-3">
                            <FormGroup label="Min. Jugadores"><InputNumber name="minPlayers" value={form.minPlayers || 7} onChange={onChange} min={5} /></FormGroup>
                            <FormGroup label="Max. Jugadores"><InputNumber name="maxPlayers" value={form.maxPlayers || 25} onChange={onChange} min={7} /></FormGroup>
                            <FormGroup label="Max. Equipos"><InputNumber name="maxTeams" value={form.maxTeams || 20} onChange={onChange} min={2} /></FormGroup>
                        </div>
                    </TabContent>
                )}

                {/* --- TAB 2: PUNTUACIÓN --- */}
                {configTab === 'scoring' && (
                    <TabContent>
                         <SectionLabel>Puntos por Partido</SectionLabel>
                         <div className="row-3">
                             <FormGroup label="Victoria"><InputNumber name="winPoints" value={form.winPoints || 3} onChange={onChange} min={1} /></FormGroup>
                             <FormGroup label="Empate"><InputNumber name="drawPoints" value={form.drawPoints || 1} onChange={onChange} min={0} /></FormGroup>
                             <FormGroup label="Derrota"><InputNumber name="lossPoints" value={form.lossPoints || 0} onChange={onChange} min={0} /></FormGroup>
                         </div>
                         <Divider />
                         <div className="form-group">
                            <Label>Criterio de Desempate (Jornada Regular)</Label>
                            <SelectStyled name="tieBreakType" value={form.tieBreakType || "normal"} onChange={onChange}>
                                <option value="normal">Tradicional (Repartir puntos)</option>
                                <option value="penalties">Penales / Shootouts (Punto Extra)</option>
                            </SelectStyled>
                            <span style={{fontSize:'11px', opacity:0.6, marginTop:'4px'}}>Define qué sucede si el partido termina empatado en tiempo regular.</span>
                        </div>
                    </TabContent>
                )}

                {/* --- TAB 3: FORMATO --- */}
                {configTab === 'format' && (
                    <TabContent>
                        <div className="form-group">
                            <Label>Modalidad de Juego</Label>
                            <SelectStyled name="vueltas" value={form.vueltas} onChange={onChange}>
                                <option value="1">Solo Ida (1 vuelta)</option>
                                <option value="2">Ida y Vuelta (2 vueltas)</option>
                            </SelectStyled>
                        </div>

                        <div className="row-2">
                             <FormGroup label="Ascensos"><InputNumber name="ascensos" value={form.ascensos || 0} onChange={onChange} min={0} /></FormGroup>
                             <FormGroup label="Descensos"><InputNumber name="descensos" value={form.descensos || 0} onChange={onChange} min={0} /></FormGroup>
                        </div>

                        <LiguillaContainer $isActive={form.zonaLiguilla}>
                            <div className="checkbox-row">
                                 <input type="checkbox" id="liguillaCheck" name="zonaLiguilla" checked={form.zonaLiguilla} onChange={onChange} />
                                <label htmlFor="liguillaCheck">Habilitar Liguilla (Playoffs)</label>
                            </div>

                            <div className="options-content">
                                <div className="row-2">
                                    <FormGroup label="Clasificados">
                                        <SelectStyled name="clasificados" value={form.clasificados} onChange={onChange} disabled={!form.zonaLiguilla}>
                                            <option value="4">Top 4 (Semifinales)</option>
                                            <option value="8">Top 8 (Cuartos)</option>
                                            <option value="12">Top 12 (Repechaje)</option>
                                        </SelectStyled>
                                    </FormGroup>
                                    <FormGroup label="Desempate Liguilla">
                                        <SelectStyled name="playoffTieBreak" value={form.playoffTieBreak || "position"} onChange={onChange} disabled={!form.zonaLiguilla}>
                                            <option value="position">Mejor Posición</option>
                                            <option value="penalties">Penales Directos</option>
                                        </SelectStyled>
                                    </FormGroup>
                                </div>
                            </div>
                        </LiguillaContainer>
                    </TabContent>
                )}

                {/* --- TAB 4: REGLAS JUEGO (NUEVO) --- */}
                {configTab === 'gameRules' && (
                    <TabContent>
                        <SectionLabel>Tiempos y Duración</SectionLabel>
                        <div className="row-2">
                            <FormGroup label="Minutos por Tiempo">
                                <InputNumber 
                                    name="minutosPorTiempo" 
                                    value={reglas?.minutosPorTiempo || 45} 
                                    onChange={handleReglasChange} 
                                />
                            </FormGroup>
                            <FormGroup label="Cambios Permitidos">
                                <SelectStyled name="cambios" value={reglas?.cambios || "Ilimitados"} onChange={handleReglasChange}>
                                    <option value="Ilimitados">Ilimitados (Reingreso)</option>
                                    <option value="Limitados">Limitados</option>
                                    <option value="Sin Reingreso">Sin Reingreso</option>
                                </SelectStyled>
                            </FormGroup>
                        </div>
                        <Divider />
                        <FormGroup label="Observaciones o Reglas Extra">
                             <TextAreaStyled 
                                name="observaciones" 
                                value={reglas?.observaciones || ""} 
                                onChange={handleReglasChange}
                                placeholder="Escribe aquí reglas específicas del torneo (Ej: Prohibido jugar con tacos de metal, tolerancia de 15 min, etc.)"
                                rows={4}
                             />
                        </FormGroup>
                    </TabContent>
                )}
                
                <div className="modal-actions">
<Btnsave 
                    titulo="Guardar Configuración" 
                    bgcolor={v.colorPrincipal} 
                    funcion={handleSaveConfig} 
                />
                </div>
            </ModalContentStyled>
        </Modal>
    </StyledCardWrapper>
  );
}

// --- Componentes Auxiliares ---
const SummaryItem = ({icon, label, value}) => (
    <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
        <div style={{width:'40px', height:'40px', borderRadius:'50%', background: v.bg2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', color: v.primary}}>{icon}</div>
        <div style={{display:'flex', flexDirection:'column'}}>
            <span style={{fontSize:'11px', opacity:0.6, fontWeight:600, textTransform:'uppercase'}}>{label}</span>
            <span style={{fontSize:'13px', fontWeight:600}}>{value}</span>
        </div>
    </div>
);

const FormGroup = ({label, children}) => (
    <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
        <Label>{label}</Label>
        {children}
    </div>
);

// --- Styled Components ---

const StyledCardWrapper = styled.div` position: relative; width: 100%; display: flex; justify-content: center; ${props => props.$isBlur && css` & > div:last-child { filter: blur(4px) grayscale(0.8); pointer-events: none; user-select: none; } `} `;
const LockedOverlay = styled.div` position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; display: flex; align-items: center; justify-content: center; .lock-message { background: rgba(0,0,0,0.85); padding: 30px; border-radius: 16px; text-align: center; color: white; backdrop-filter: blur(5px); } .big-icon{ font-size: 50px; color: ${v.colorPrincipal}; margin-bottom:10px;} h2{margin:0; font-size:24px;} p{margin:5px 0 15px; font-size:18px; font-weight:600; color:${v.colorPrincipal};} span{opacity:0.7; font-size:14px;}`;
const DashboardGrid = styled.div` display: grid; grid-template-columns: 350px 1fr; gap: 30px; @media (max-width: 900px) { grid-template-columns: 1fr; } `;
const SectionTitle = styled.h4` margin: 0 0 15px 0; font-size: 0.95rem; color: ${({theme})=>theme.text}; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; `;
const SummaryBox = styled.div` background: ${({theme})=>theme.bg3}; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 12px; border: 1px solid ${({theme})=>theme.bg4}; `;
const TeamsList = styled.div` background: ${({theme})=>theme.bgtotal}; border-radius: 10px; padding: 10px; overflow-y: auto; border: 1px solid ${({theme})=>theme.bg4}; margin-bottom: 15px; &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background: ${v.bg4}; border-radius: 3px; } `;
const TeamItem = styled.div` display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid ${({theme})=>theme.bg4}; background: ${({theme})=>theme.bgcards}; margin-bottom: 4px; border-radius: 6px; img { width: 28px; height: 28px; object-fit: contain; } .number { font-size: 12px; opacity: 0.5; width: 20px; } .name { flex: 1; font-weight: 500; font-size: 14px; } `;
const ActionButton = styled.button` border: none; background: transparent; cursor: pointer; font-size: 20px; transition: 0.2s; &.remove { color: #e74c3c; } &.add { color: #2ecc71; } &:hover{ transform: scale(1.1); }`;
const EmptyMsg = styled.div` padding: 20px; text-align: center; font-size: 13px; opacity: 0.6; font-style: italic; `;
const ExcludedSection = styled.div` border: 1px solid ${({theme})=>theme.bg4}; border-radius: 10px; overflow: hidden; `;
const ExcludedHeader = styled.div` background: ${({theme})=>theme.bg3}; padding: 12px 15px; cursor: pointer; display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; transition:0.2s; &:hover{background: ${({theme})=>theme.bg2};} `;
const ExcludedContent = styled.div` background: ${({theme})=>theme.bgtotal}; max-height: ${({$isOpen}) => $isOpen ? "300px" : "0"}; opacity: ${({$isOpen}) => $isOpen ? "1" : "0"}; transition: all 0.3s ease-in-out; overflow-y: auto; padding: ${({$isOpen}) => $isOpen ? "10px" : "0 10px"}; &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background: ${v.bg4}; border-radius: 3px; }`;
const ExcludedItem = styled.div` display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid ${({theme})=>theme.bg4}; .info-grp { display: flex; align-items: center; gap: 8px; img{width:24px; filter:grayscale(1); opacity:0.7;} .ex-name{font-size:13px; opacity:0.8;} } .reason-grp { display: flex; align-items: center; gap: 10px; } `;
const ReasonBadge = styled.span` font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: ${({$color}) => `${$color}20`}; color: ${({$color}) => $color}; border: 1px solid ${({$color}) => `${$color}40`};`;
const ModalContentStyled = styled.div` display: flex; flex-direction: column; gap: 15px; padding-top: 10px; .info-message { background: rgba(28, 176, 246, 0.1); border-left: 4px solid ${({theme})=>theme.primary}; padding: 10px; font-size: 12px; display: flex; gap:10px; align-items:center; .icon{font-size:18px; color:${({theme})=>theme.primary};} } .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; } .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; } .modal-actions { display: flex; justify-content: flex-end; margin-top: 20px; pt:20px; border-top: 1px solid ${({theme})=>theme.bg4}; } `;
const Label = styled.label` display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; opacity: 0.8; `;
const SectionLabel = styled.div` font-size: 12px; font-weight: 700; color: ${({theme})=>theme.primary}; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 10px; margin-bottom: 5px; `;
const Divider = styled.div` height: 1px; background: ${({theme})=>theme.bg4}; width: 100%; margin: 5px 0; opacity: 0.5; `;
const SelectStyled = styled.select` width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 15px; padding: 12px; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size:14px; transition:0.3s; &:focus{ border-color: ${v.colorPrincipal}; } &:disabled { opacity: 0.5; cursor: not-allowed; }`;
const TextAreaStyled = styled.textarea` width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 15px; padding: 12px; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none; font-size:14px; resize: none; transition:0.3s; &:focus{ border-color: ${v.colorPrincipal}; }`;
const LiguillaContainer = styled.div` border: 1px solid ${({theme, $isActive}) => $isActive ? theme.primary : theme.bg4}; border-radius: 12px; padding: 15px; background: ${({theme, $isActive}) => $isActive ? `${theme.primary}08` : 'transparent'}; transition: all 0.3s; .checkbox-row { display: flex; align-items: center; gap: 10px; margin-bottom: ${({$isActive})=>$isActive?'15px':'0'}; cursor: pointer; label{cursor:pointer; font-weight:600;} input{transform:scale(1.2); accent-color: ${({theme})=>theme.primary};} } .options-content { max-height: ${({$isActive}) => $isActive ? "200px" : "0"}; opacity: ${({$isActive}) => $isActive ? "1" : "0"}; overflow: hidden; transition: all 0.3s ease; } `;
const TabContent = styled.div` display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.3s ease; @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`;