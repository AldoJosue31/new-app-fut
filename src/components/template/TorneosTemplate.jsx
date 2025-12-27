import React, { useState } from "react";
import styled, { css } from "styled-components";
import { v } from "../../styles/variables";
import { InputText2 } from "../organismos/formularios/InputText2";
import { Btnsave } from "../moleculas/Btnsave";
import { BtnNormal } from "../moleculas/BtnNormal"; // Asegúrate de tener este componente o usa uno genérico
import { Title } from "../atomos/Title";
import { ContentContainer } from "../atomos/ContentContainer";
import { Card } from "../moleculas/Card";
import { CardHeader } from "../moleculas/CardHeader";
import { Modal } from "../organismos/Modal"; // Importamos el Modal existente
import { IoMdFootball, IoMdSettings } from "react-icons/io";
import { RiCalendarEventLine, RiTrophyLine, RiArrowUpDoubleLine, RiArrowDownDoubleLine } from "react-icons/ri";

export function TorneosTemplate({ 
  form, 
  onChange, 
  onSubmit, 
  loading, 
  divisionName, 
  equipos, 
  activeTournament 
}) {
  
  const [activeTab, setActiveTab] = useState("definir");
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Helper para textos del resumen
  const getFormatoTexto = () => form.vueltas === "2" ? "Ida y Vuelta" : "Solo Ida (Round Robin)";
  const getLiguillaTexto = () => form.zonaLiguilla ? `Sí (Top ${form.clasificados})` : "No (Puntos puros)";

  return (
    <ContentContainer>
      <HeaderSection>
        <Title>Gestión de Torneos</Title>
      </HeaderSection>

      {/* --- TABS --- */}
      <TabsContainer>
        <TabButton $active={activeTab === "definir"} onClick={() => setActiveTab("definir")}>
          <v.iconocorona /> Definir Torneo
        </TabButton>
        <TabButton $active={activeTab === "jornadas"} onClick={() => setActiveTab("jornadas")}>
          <RiCalendarEventLine /> Jornadas
        </TabButton>
      </TabsContainer>

      <ContentGrid>
        
        {/* === PESTAÑA 1: DEFINIR === */}
        {activeTab === "definir" && (
          <StyledCardWrapper $isBlur={!!activeTournament}>
            
            {/* Overlay de Bloqueo si hay torneo activo */}
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

            <Card maxWidth="900px">
              <CardHeader 
                Icono={v.iconocorona}
                titulo="Resumen de Temporada"
                subtitulo={`División: ${divisionName || "..."}`}
              />

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
                                ⬆️ {form.ascensos || 0} Ascensos | ⬇️ {form.descensos || 0} Descensos
                            </span>
                        </div>
                    </SummaryItem>
                    <SummaryItem>
                        <div className="icon"><v.iconocorona/></div>
                        <div className="info">
                            <span className="label">Fase Final</span>
                            <span className="value">{getLiguillaTexto()}</span>
                        </div>
                    </SummaryItem>
                  </SummaryBox>

                  <div className="config-actions">
                      <BtnNormal 
                        titulo="Configurar Reglas"
                        bgcolor={v.bggray}
                        icono={<IoMdSettings/>}
                        funcion={(e) => {
                            e.preventDefault();
                            setShowConfigModal(true);
                        }}
                      />
                  </div>
                </div>

                {/* 2. LISTA DE EQUIPOS (DERECHA) */}
                <div className="teams-col">
                  <SectionTitle>Equipos Habilitados ({equipos?.length || 0})</SectionTitle>
                  <TeamsList>
                      {equipos && equipos.length > 0 ? (
                          equipos.map((team, index) => (
                              <TeamItem key={team.id}>
                                  <span className="number">{index + 1}</span>
                                  <img src={team.logo_url || "https://i.ibb.co/MyJ50b7/logo-default.png"} alt="logo" />
                                  <span className="name">{team.name}</span>
                              </TeamItem>
                          ))
                      ) : (
                          <EmptyMsg>No hay equipos activos.</EmptyMsg>
                      )}
                  </TeamsList>
                  {equipos.length % 2 !== 0 && (
                      <WarningMsg>⚠️ Impar: Habrá descanso por jornada.</WarningMsg>
                  )}
                </div>

              </DashboardGrid>

              {/* FOOTER DEL CARD PRINCIPAL */}
              <div style={{ marginTop: '20px', borderTop: `1px solid ${v.bg4}`, paddingTop:'20px', display:'flex', justifyContent:'end' }}>
                 <Btnsave 
                    titulo={loading ? "Creando..." : "Iniciar Torneo"} 
                    bgcolor={v.colorPrincipal}
                    icono={<v.iconoguardar />}
                    funcion={onSubmit} // El submit real ocurre aquí
                    disabled={loading || !divisionName || equipos.length < 2 || !form.season}
                  />
              </div>

            </Card>
          </StyledCardWrapper>
        )}

        {/* === PESTAÑA 2: JORNADAS === */}
        {activeTab === "jornadas" && (
           <Card maxWidth="800px">
              <div style={{padding: '40px', textAlign:'center', opacity:0.6}}>
                  <h3>Gestor de Jornadas</h3>
                  <p>Selecciona una jornada para editar horarios y resultados.</p>
              </div>
           </Card>
        )}

      </ContentGrid>

      {/* ============================================== */}
      {/* MODAL DE CONFIGURACIÓN                */}
      {/* ============================================== */}
      <Modal 
        isOpen={showConfigModal} 
        onClose={() => setShowConfigModal(false)}
        title="Configurar Reglas del Torneo"
      >
        <ModalContentStyled>
            <div className="form-group">
                <Label>Nombre de Temporada</Label>
                <InputText2>
                    <input className="form__field" name="season" placeholder="Ej: Apertura 2024" value={form.season} onChange={onChange} />
                </InputText2>
            </div>

            <div className="form-group">
                <Label>Fecha de Inicio</Label>
                <InputText2>
                    <input className="form__field" type="date" name="startDate" value={form.startDate} onChange={onChange} />
                </InputText2>
            </div>

            <div className="divider"></div>

            <div className="form-group">
                <Label>Modalidad de Juego</Label>
                <SelectStyled name="vueltas" value={form.vueltas} onChange={onChange}>
                    <option value="1">Solo Ida (1 vuelta)</option>
                    <option value="2">Ida y Vuelta (2 vueltas)</option>
                </SelectStyled>
            </div>

            <div className="row-2">
                <div className="form-group">
                    <Label>Ascensos (Verde)</Label>
                    <InputText2>
                        <input type="number" name="ascensos" value={form.ascensos} onChange={onChange} placeholder="0"/>
                    </InputText2>
                </div>
                <div className="form-group">
                    <Label>Descensos (Rojo)</Label>
                    <InputText2>
                        <input type="number" name="descensos" value={form.descensos} onChange={onChange} placeholder="0"/>
                    </InputText2>
                </div>
            </div>

            <div className="divider"></div>

            <div className="checkbox-group">
                <input 
                    type="checkbox" 
                    id="liguillaCheck"
                    name="zonaLiguilla" // Asegúrate de manejar esto en el padre
                    checked={form.zonaLiguilla}
                    onChange={onChange} // Tu handler debe soportar checkbox
                />
                <label htmlFor="liguillaCheck">Habilitar Liguilla (Playoffs)</label>
            </div>

            {form.zonaLiguilla && (
                <div className="form-group fade-in" style={{marginTop:'10px', marginLeft:'25px'}}>
                    <Label>Clasificados a Liguilla</Label>
                    <SelectStyled name="clasificados" value={form.clasificados} onChange={onChange}>
                        <option value="4">Top 4 (Semifinales)</option>
                        <option value="8">Top 8 (Cuartos de final)</option>
                        <option value="12">Top 12 (Repechaje)</option>
                    </SelectStyled>
                </div>
            )}

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

// --- STYLED COMPONENTS ---

const HeaderSection = styled.div`
  margin-bottom: 10px; width: 100%; max-width: 900px;
`;

const TabsContainer = styled.div`
  display: flex; gap: 15px; margin-bottom: 20px; width: 100%; max-width: 900px;
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
    display: grid; grid-template-columns: 1fr 1fr; gap: 30px;
    @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const SectionTitle = styled.h4`
    margin: 0 0 15px 0; font-size: 0.95rem; color: ${({theme})=>theme.text}; 
    opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;
`;

/* ESTILOS DEL PANEL RESUMEN */
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

/* ESTILOS DE LA LISTA DE EQUIPOS */
const TeamsList = styled.div`
    background: ${({theme})=>theme.bgtotal}; border-radius: 10px; padding: 10px;
    max-height: 250px; overflow-y: auto; border: 1px solid ${({theme})=>theme.bg4};
`;

const TeamItem = styled.div`
    display: flex; align-items: center; gap: 10px; padding: 8px;
    border-bottom: 1px solid ${({theme})=>theme.bg4};
    &:last-child { border-bottom: none; }
    img { width: 24px; height: 24px; object-fit: contain; }
    .number { font-size: 12px; opacity: 0.5; width: 20px; }
    .name { flex: 1; font-weight: 500; font-size: 14px; }
`;

const EmptyMsg = styled.div`
    padding: 20px; text-align: center; font-size: 13px; opacity: 0.6; font-style: italic;
`;

const WarningMsg = styled.div`
    margin-top: 10px; font-size: 12px; color: #f1c40f; font-weight: 600; text-align: center;
`;

/* ESTILOS DEL CONTENIDO DEL MODAL */
const ModalContentStyled = styled.div`
    display: flex; flex-direction: column; gap: 15px; padding-top: 10px;
    
    .divider { height: 1px; background: ${({theme})=>theme.bg4}; margin: 5px 0; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    
    .checkbox-group {
        display: flex; align-items: center; gap: 10px; cursor: pointer;
        input { transform: scale(1.2); cursor: pointer; }
        label { cursor: pointer; font-weight: 600; }
    }
    
    .modal-actions { display: flex; justify-content: flex-end; margin-top: 20px; }
    .fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
`;

const Label = styled.label`
  display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; opacity: 0.8;
`;

const SelectStyled = styled.select`
  width: 100%; padding: 10px; border-radius: 8px; 
  border: 2px solid ${({ theme }) => theme.color2}; 
  background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; outline: none;
`;

const ContentGrid = styled.div`
  display: flex; justify-content: center; width: 100%;
`;