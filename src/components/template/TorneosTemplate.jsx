import React, { useState } from "react";
import styled, { css } from "styled-components";
import { v } from "../../styles/variables";
import { InputNumber, BtnNormal, Btnsave, InputText2, TabsNavigation } from "../../index";
import { Title } from "../atomos/Title";
import { ContentContainer } from "../atomos/ContentContainer";
import { Card } from "../moleculas/Card";
import { CardHeader } from "../moleculas/CardHeader";
import { Modal } from "../organismos/Modal"; 
import { IoMdSettings, IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { 
    RiCalendarEventLine, 
    RiTrophyLine, 
    RiInformationLine, 
    RiAddCircleLine, 
    RiCloseCircleLine
} from "react-icons/ri";

export function TorneosTemplate({ 
  form, 
  onChange, 
  onSubmit, 
  loading, 
  divisionName, 
  activeTournament,
  allTeams,
  participatingIds,
  onInclude,
  onExclude,
  minPlayers // Ahora viene del form
}) {
  const tabList = [
    { id: "definir", label: "Definir Torneo", icon: <v.iconocorona /> },
    { id: "jornadas", label: "Jornadas", icon: <RiCalendarEventLine /> }
  ];
  const [activeTab, setActiveTab] = useState("definir");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  // Filtrado de listas
  const participatingTeams = allTeams?.filter(t => participatingIds.includes(t.id)) || [];
  const excludedTeams = allTeams?.filter(t => !participatingIds.includes(t.id)) || [];

  // Razón de exclusión dinámica
  const getExclusionReason = (team) => {
      if (team.status === 'Suspendido') return { text: "Suspensión", color: "#e74c3c", canAdd: false };
      if (team.playerCount < minPlayers) return { text: `Falta Jugadores (${team.playerCount}/${minPlayers})`, color: "#f39c12", canAdd: false };
      return { text: "Decisión de Gestor", color: "#3498db", canAdd: true };
  };

  const getFormatoTexto = () => form.vueltas === "2" ? "Ida y Vuelta" : "Solo Ida (Round Robin)";
  const getLiguillaTexto = () => form.zonaLiguilla ? `Sí (Top ${form.clasificados})` : "No (Puntos puros)";

  return (
    <ContentContainer>
      <HeaderSection>
        <Title>Gestión de Torneos</Title>
      </HeaderSection>

    <div style={{width: '100%', maxWidth: '1000px'}}>
         <TabsNavigation 
            tabs={tabList} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
         />
      </div>

      <ContentGrid>
        
        {/* === PESTAÑA 1: DEFINIR === */}
        {activeTab === "definir" && (
          <StyledCardWrapper $isBlur={!!activeTournament}>
            
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
              {/* HEADER LIMPIO: Sin el botón extra de engrane, solo CardHeader */}
              <div style={{ marginBottom: '20px' }}>
                  <CardHeader 
                    Icono={v.iconocorona}
                    titulo="Resumen de Temporada"
                    subtitulo={`División: ${divisionName || "..."}`}
                  />
              </div>

              <DashboardGrid>
                
                {/* 1. PANEL DE RESUMEN (IZQUIERDA) */}
                <div className="summary-col">
                  <SectionTitle>Configuración Actual</SectionTitle>
                  <SummaryBox>
                    <SummaryItem>
                        <div className="icon"><RiCalendarEventLine/></div>
                        <div className="info">
                            <span className="label">Temporada</span>
                            <span className="value">{form.season || "---"}</span>
                        </div>
                    </SummaryItem>
                    <SummaryItem>
                        <div className="icon"><RiTrophyLine/></div>
                        <div className="info">
                            <span className="label">Formato</span>
                            <span className="value">{getFormatoTexto()}</span>
                        </div>
                    </SummaryItem>
                    <SummaryItem>
                        <div className="icon"><IoMdSettings/></div>
                        <div className="info">
                            <span className="label">Reglas</span>
                            <span className="value">
                                ⬆️ {form.ascensos} Asc | ⬇️ {form.descensos} Desc
                            </span>
                        </div>
                    </SummaryItem>
                    <SummaryItem>
                        <div className="icon"><v.iconoUser/></div>
                        <div className="info">
                            <span className="label">Participación</span>
                            <span className="value">
                                Max {form.maxTeams} Equipos | Min {form.minPlayers} Jug.
                            </span>
                        </div>
                    </SummaryItem>
                  </SummaryBox>
                  
                  <div style={{marginTop: 20}}>
                    <BtnNormal 
                        titulo="Editar Reglas"
                        width="100%"
                        icono={<IoMdSettings />}
                        funcion={()=>setShowConfigModal(true)}
                    />
                  </div>
                </div>

                {/* 2. GESTIÓN DE EQUIPOS (DERECHA) */}
                <div className="teams-col">
                  {/* Título actualizado con contador Max Equipos */}
                  <SectionTitle>
                     Equipos Participantes ({participatingTeams.length}/{form.maxTeams})
                  </SectionTitle>
                  
                  <TeamsList>
                      {participatingTeams.length > 0 ? (
                          participatingTeams.map((team, index) => (
                              <TeamItem key={team.id}>
                                  <span className="number">{index + 1}</span>
                                  <img src={team.logo_url || "https://i.ibb.co/MyJ50b7/logo-default.png"} alt="logo" />
                                  <span className="name">{team.name}</span>
                                  <ActionButton className="remove" onClick={() => onExclude(team.id)} title="Dar de baja">
                                    <RiCloseCircleLine />
                                  </ActionButton>
                              </TeamItem>
                          ))
                      ) : (
                          <EmptyMsg>No hay equipos seleccionados.</EmptyMsg>
                      )}
                  </TeamsList>
                  
                  {participatingTeams.length % 2 !== 0 && (
                      <WarningMsg>⚠️ Impar: Habrá descanso por jornada.</WarningMsg>
                  )}

                  <ExcludedSection>
                      <ExcludedHeader onClick={() => setShowExcluded(!showExcluded)}>
                          <span>Equipos No Participantes ({excludedTeams.length})</span>
                          {showExcluded ? <IoIosArrowUp /> : <IoIosArrowDown />}
                      </ExcludedHeader>
                      
                      <ExcludedContent $isOpen={showExcluded}>
                          {excludedTeams.length > 0 ? (
                              excludedTeams.map(team => {
                                  const reason = getExclusionReason(team);
                                  return (
                                    <ExcludedItem key={team.id}>
                                        <div className="info-grp">
                                            <img src={team.logo_url || "https://i.ibb.co/MyJ50b7/logo-default.png"} alt="logo" />
                                            <span className="ex-name">{team.name}</span>
                                        </div>
                                        <div className="reason-grp">
                                            <ReasonBadge $color={reason.color}>{reason.text}</ReasonBadge>
                                            {reason.canAdd && (
                                                <ActionButton className="add" onClick={() => onInclude(team.id)} title="Agregar">
                                                    <RiAddCircleLine />
                                                </ActionButton>
                                            )}
                                        </div>
                                    </ExcludedItem>
                                  )
                              })
                          ) : (
                             <EmptyMsg style={{padding: '10px'}}>Todos los equipos están participando.</EmptyMsg>
                          )}
                      </ExcludedContent>
                  </ExcludedSection>
                </div>
              </DashboardGrid>

              <div style={{ marginTop: '20px', borderTop: `1px solid ${v.bg4}`, paddingTop:'20px', display:'flex', justifyContent:'end' }}>
                 <Btnsave 
                    titulo={loading ? "Creando..." : "Iniciar Torneo"} 
                    bgcolor={v.colorPrincipal}
                    icono={<v.iconoguardar />}
                    funcion={onSubmit} 
                    disabled={loading || !divisionName || participatingTeams.length < 2 || !form.season}
                  />
              </div>
            </Card>
          </StyledCardWrapper>
        )}

        {activeTab === "jornadas" && (
           <Card maxWidth="800px">
              <div style={{padding: '40px', textAlign:'center', opacity:0.6}}>
                  <h3>Gestor de Jornadas</h3>
                  <p>Selecciona una jornada para editar horarios y resultados.</p>
              </div>
           </Card>
        )}

      </ContentGrid>

      {/* --- MODAL DE CONFIGURACIÓN --- */}
      <Modal 
        isOpen={showConfigModal} 
        onClose={() => setShowConfigModal(false)}
        title="Configurar Reglas"
        width="650px"
      >
        <ModalContentStyled>
            <div className="info-message">
                <RiInformationLine className="icon"/>
                <span>Define las reglas antes de iniciar. Algunos valores como Liguilla pueden ajustarse luego.</span>
            </div>

            {/* Inputs Básicos */}
            <div className="row-2">
                <div className="form-group">
                    <Label>Temporada</Label>
                    <InputText2>
                        <input className="form__field" name="season" placeholder="Ej: Apertura 2024" value={form.season} onChange={onChange} />
                    </InputText2>
                </div>
                <div className="form-group">
                    <Label>Fecha Inicio</Label>
                    <InputText2>
                        <input className="form__field" type="date" name="startDate" value={form.startDate} onChange={onChange} />
                    </InputText2>
                </div>
            </div>

            <div className="divider"></div>

            {/* Nuevos Inputs: Restricciones de Jugadores y Equipos */}
            <div className="row-3">
                 <div className="form-group">
                    <Label>Min. Jugadores</Label>
<InputNumber 
            name="minPlayers" 
            value={form.minPlayers} 
            onChange={onChange} 
            min={5} max={50} // Puedes ajustar límites lógicos
        />
                 </div>
                 <div className="form-group">
                    <Label>Max. Jugadores</Label>
<InputNumber 
            name="maxPlayers" 
            value={form.maxPlayers} 
            onChange={onChange}
            min={7} max={99}
        />
                 </div>
                 <div className="form-group">
                    <Label>Max. Equipos</Label>

                        <InputNumber 
            name="maxTeams" 
            value={form.maxTeams} 
            onChange={onChange}
            min={2} max={100}
        />

                 </div>
            </div>

            <div className="divider"></div>

            {/* Formato y Ascensos */}
            <div className="form-group">
                <Label>Modalidad de Juego</Label>
                <SelectStyled name="vueltas" value={form.vueltas} onChange={onChange} className="form__field">
                    <option value="1">Solo Ida (1 vuelta)</option>
                    <option value="2">Ida y Vuelta (2 vueltas)</option>
                </SelectStyled>
            </div>

            <div className="row-2">
                <div className="form-group">
                    <Label>Ascensos (Verde)</Label>

                        <InputNumber 
            name="ascensos" 
            value={form.ascensos} 
            onChange={onChange} 
            min={0}
        />

                </div>
                <div className="form-group">
                    <Label>Descensos (Rojo)</Label>

                        <InputNumber 
            name="descensos" 
            value={form.descensos} 
            onChange={onChange}
            min={0}
        />

                </div>
            </div>

            {/* Liguilla */}
            <LiguillaSection $isActive={form.zonaLiguilla}>
                <div className="checkbox-group">
                    <input 
                        type="checkbox" 
                        id="liguillaCheck"
                        name="zonaLiguilla" 
                        checked={form.zonaLiguilla}
                        onChange={onChange} 
                    />
                    <label htmlFor="liguillaCheck">Habilitar Liguilla (Playoffs)</label>
                </div>

                <div className="liguilla-options">
                    <Label>Clasificados a Liguilla</Label>
                    <SelectStyled name="clasificados" value={form.clasificados} onChange={onChange} className="form__field">
                        <option value="4">Top 4 (Semifinales)</option>
                        <option value="8">Top 8 (Cuartos de final)</option>
                        <option value="12">Top 12 (Repechaje)</option>
                    </SelectStyled>
                </div>
            </LiguillaSection>

            <div className="modal-actions">
                <Btnsave 
                    titulo="Guardar Configuración" 
                    bgcolor={v.colorPrincipal}
                    funcion={() => setShowConfigModal(false)}
                />
            </div>
        </ModalContentStyled>
      </Modal>

    </ContentContainer>
  );
}

// --- STYLED COMPONENTS (Ajustados) ---

const HeaderSection = styled.div`
  margin-bottom: 10px; width: 100%; max-width: 1000px;
`;

const TabsContainer = styled.div`
  display: flex; gap: 15px; margin-bottom: 20px; width: 100%; max-width: 1000px;
  border-bottom: 1px solid ${({theme})=>theme.bg4}; padding-bottom: 10px;
`;

const TabButton = styled.button`
  background: ${({$active, theme}) => $active ? theme.bgcards : 'transparent'};
  color: ${({$active, theme}) => $active ? theme.primary : theme.text};
  border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer;
  font-weight: 700; display: flex; align-items: center; gap: 8px; transition: all 0.2s;
  &:hover { opacity: 1; background: ${({theme})=>theme.bgcards}; }
`;

const StyledCardWrapper = styled.div`
  position: relative; width: 100%; display: flex; justify-content: center;
  ${props => props.$isBlur && css`
    & > div:last-child { filter: blur(4px) grayscale(0.8); pointer-events: none; user-select: none; }
  `}
`;

const LockedOverlay = styled.div`
  position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  .lock-message {
    background: rgba(0,0,0,0.85); padding: 30px; border-radius: 16px; text-align: center;
    color: white; border: 1px solid #444; backdrop-filter: blur(5px);
    .big-icon { font-size: 40px; color: gold; margin-bottom: 10px; }
    h2 { margin: 0; } p { color: #ccc; margin-bottom: 5px; font-weight: 600; }
    span { font-size: 0.8rem; opacity: 0.7; }
  }
`;

const DashboardGrid = styled.div`
    display: grid; grid-template-columns: 350px 1fr; gap: 30px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const SectionTitle = styled.h4`
    margin: 0 0 15px 0; font-size: 0.95rem; color: ${({theme})=>theme.text}; 
    opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;
`;

const SummaryBox = styled.div`
    background: ${({theme})=>theme.bg3}; border-radius: 12px; padding: 15px;
    display: flex; flex-direction: column; gap: 12px; border: 1px solid ${({theme})=>theme.bg4};
`;

const SummaryItem = styled.div`
    display: flex; align-items: center; gap: 15px;
    .icon { 
        width: 40px; height: 40px; border-radius: 50%; background: ${({theme})=>theme.bg2};
        display: flex; justify-content: center; align-items: center; font-size: 20px; color: ${({theme})=>theme.primary};
    }
    .info { display: flex; flex-direction: column; }
    .label { font-size: 11px; opacity: 0.6; font-weight: 600; text-transform: uppercase;}
    .value { font-size: 14px; font-weight: 600; }
`;

/* --- ESTILOS DE LISTAS --- */
const TeamsList = styled.div`
    background: ${({theme})=>theme.bgtotal}; border-radius: 10px; padding: 10px;
    max-height: 250px; overflow-y: auto; border: 1px solid ${({theme})=>theme.bg4};
    margin-bottom: 15px;
`;

const TeamItem = styled.div`
    display: flex; align-items: center; gap: 10px; padding: 8px;
    border-bottom: 1px solid ${({theme})=>theme.bg4};
    background: ${({theme})=>theme.bgcards}; margin-bottom: 4px; border-radius: 6px;
    &:last-child { border-bottom: none; margin-bottom: 0; }
    img { width: 28px; height: 28px; object-fit: contain; }
    .number { font-size: 12px; opacity: 0.5; width: 20px; }
    .name { flex: 1; font-weight: 500; font-size: 14px; }
`;

const ActionButton = styled.button`
    border: none; background: transparent; cursor: pointer;
    font-size: 20px; display: flex; align-items: center;
    transition: 0.2s; padding: 4px; border-radius: 50%;
    &.remove { color: #e74c3c; opacity: 0.6; &:hover { opacity: 1; background: rgba(231, 76, 60, 0.1); } }
    &.add { color: #2ecc71; font-size: 22px; &:hover { transform: scale(1.2); } }
`;

const EmptyMsg = styled.div`
    padding: 20px; text-align: center; font-size: 13px; opacity: 0.6; font-style: italic;
`;

const WarningMsg = styled.div`
    margin-top: 10px; font-size: 12px; color: #f1c40f; font-weight: 600; text-align: center; margin-bottom: 10px;
`;

const ExcludedSection = styled.div`
    border: 1px solid ${({theme})=>theme.bg4}; border-radius: 10px; overflow: hidden;
`;

const ExcludedHeader = styled.div`
    background: ${({theme})=>theme.bg3}; padding: 12px 15px; cursor: pointer;
    display: flex; justify-content: space-between; align-items: center;
    font-weight: 600; font-size: 13px; color: ${({theme})=>theme.text}; opacity: 0.9;
    &:hover { background: ${({theme})=>theme.bg2}; }
`;

const ExcludedContent = styled.div`
    background: ${({theme})=>theme.bgtotal};
    max-height: ${({$isOpen}) => $isOpen ? "300px" : "0"};
    opacity: ${({$isOpen}) => $isOpen ? "1" : "0"};
    transition: all 0.3s ease-in-out;
    overflow-y: auto;
    padding: ${({$isOpen}) => $isOpen ? "10px" : "0 10px"};
`;

const ExcludedItem = styled.div`
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px; border-bottom: 1px solid ${({theme})=>theme.bg4};
    font-size: 13px;
    &:last-child { border-bottom: none; }
    .info-grp { display: flex; align-items: center; gap: 8px; 
        img { width: 24px; height: 24px; filter: grayscale(1); opacity: 0.7; }
        .ex-name { opacity: 0.7; }
    }
    .reason-grp { display: flex; align-items: center; gap: 10px; }
`;

const ReasonBadge = styled.span`
    font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
    background: ${({$color}) => `${$color}20`}; color: ${({$color}) => $color};
    border: 1px solid ${({$color}) => `${$color}40`};
`;

const ModalContentStyled = styled.div`
    display: flex; flex-direction: column; gap: 15px; padding-top: 10px;
    .info-message {
        background: rgba(28, 176, 246, 0.1); border-left: 4px solid ${({theme})=>theme.primary};
        padding: 10px; border-radius: 4px; display: flex; gap: 10px; align-items: center;
        font-size: 12px; color: ${({theme})=>theme.text};
        .icon { font-size: 18px; color: ${({theme})=>theme.primary}; flex-shrink: 0; }
    }
    .divider { height: 1px; background: ${({theme})=>theme.bg4}; margin: 5px 0; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
    
    .checkbox-group {
        display: flex; align-items: center; gap: 10px; cursor: pointer;
        input { transform: scale(1.2); cursor: pointer; }
        label { cursor: pointer; font-weight: 600; color: ${({theme})=>theme.text}; }
    }
    .modal-actions { display: flex; justify-content: flex-end; margin-top: 20px; }
`;

const LiguillaSection = styled.div`
    border: 1px solid ${({theme, $isActive}) => $isActive ? theme.primary : theme.bg4};
    border-radius: 12px; padding: 15px; transition: all 0.3s;
    background: ${({theme, $isActive}) => $isActive ? `${theme.primary}05` : 'transparent'};
    
    .checkbox-group { margin-bottom: ${({$isActive})=> $isActive ? '15px' : '0'}; }
    .liguilla-options {
        max-height: ${({$isActive}) => $isActive ? "100px" : "0"};
        opacity: ${({$isActive}) => $isActive ? "1" : "0"};
        overflow: hidden; transition: all 0.3s ease; padding-left: 25px;
    }
`;

const Label = styled.label`
  display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; opacity: 0.8;
`;

const SelectStyled = styled.select`
  width: 100%; border: 2px solid ${({ theme }) => theme.color2}; border-radius: 15px;
  font-family: inherit; outline: 0; font-size: 17px; color: ${({theme}) => theme.text};
  padding: 12px; background: ${({theme}) => theme.bgtotal}; 
`;

const ContentGrid = styled.div`
  display: flex; justify-content: center; width: 100%;
`;