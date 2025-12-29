import React, { useState } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { Device } from "../../styles/breakpoints";
import { 
  Title, 
  TabsNavigation, 
  Card, 
  CardHeader, 
  InputText2, 
  Btnsave, 
  BtnNormal, 
  ConfirmModal,
  Modal
} from "../../index";

import { GiWhistle } from "react-icons/gi";

// Iconos
import { 
  RiShieldUserLine, 
  RiBarChartGroupedLine, 
  RiSettings4Line,
  RiAddLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiPhoneLine,
  RiBuilding2Line
} from "react-icons/ri";

export function LigaTemplate({ 
  // Datos existentes
  standings, 
  division, 
  season, 
  loading, 
  
  // Nuevos datos esperados (Props)
  leagueData,
  referees = [],
  allDivisions = [],
  
  // Funciones (Handlers)
  onUpdateLeague,
  onAddDivision,
  onEditDivision,
  onDeleteDivision,
  onAddReferee,
  onEditReferee,
  onDeleteReferee
}) {
  
  // --- ESTADOS DE UI ---
  const [activeTab, setActiveTab] = useState("standings");
  
  // Estados para Modals
  const [modalDiv, setModalDiv] = useState({ open: false, type: 'add', data: null });
  const [modalRef, setModalRef] = useState({ open: false, type: 'add', data: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: null, id: null, name: '' });
  
  // Estados de formularios temporales
  const [tempLeagueName, setTempLeagueName] = useState(leagueData?.name || "");
  const [formDivision, setFormDivision] = useState("");
  const [formReferee, setFormReferee] = useState({ full_name: "", phone: "" });

  // Configuración de Tabs
  const tabList = [
    { id: "standings", label: "Tabla General", icon: <RiBarChartGroupedLine /> },
    { id: "general", label: "Configuración", icon: <RiSettings4Line /> },
    { id: "divisions", label: "Divisiones", icon: <RiBuilding2Line /> },
    { id: "referees", label: "Árbitros", icon: <GiWhistle /> },
  ];

  // --- HANDLERS AUXILIARES ---

  // Gestión de Divisiones
  const openDivisionModal = (type, data = null) => {
    setModalDiv({ open: true, type, data });
    setFormDivision(data ? data.name : "");
  };

  const submitDivision = () => {
    if (!formDivision.trim()) return alert("El nombre es requerido");
    if (modalDiv.type === 'add') onAddDivision(formDivision);
    else onEditDivision(modalDiv.data.id, formDivision);
    setModalDiv({ ...modalDiv, open: false });
  };

  // Gestión de Árbitros
  const openRefereeModal = (type, data = null) => {
    setModalRef({ open: true, type, data });
    setFormReferee(data ? { full_name: data.full_name, phone: data.phone } : { full_name: "", phone: "" });
  };

  const submitReferee = () => {
    if (!formReferee.full_name.trim()) return alert("El nombre es requerido");
    if (modalRef.type === 'add') onAddReferee(formReferee);
    else onEditReferee(modalRef.data.id, formReferee);
    setModalRef({ ...modalRef, open: false });
  };

  // Gestión de Eliminación
  const handleDeleteRequest = (type, item) => {
    setDeleteModal({ open: true, type, id: item.id, name: item.name || item.full_name });
  };

  const confirmDeletion = () => {
    if (deleteModal.type === 'division') onDeleteDivision(deleteModal.id);
    if (deleteModal.type === 'referee') onDeleteReferee(deleteModal.id);
    setDeleteModal({ ...deleteModal, open: false });
  };

  return (
    <Container>
      <HeaderSection>
        <Title>Mi Liga</Title>
      </HeaderSection>

      <div style={{width: '100%', maxWidth: '1000px'}}>
         <TabsNavigation 
            tabs={tabList} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
         />
      </div>

      <ContentGrid>
        
        {/* === TAB 1: TABLA GENERAL (Existente) === */}
        {activeTab === "standings" && (
          <Card>
            <CardHeader
              Icono={v.iconolineal}
              titulo="Tabla de Posiciones"
              subtitulo={division ? `${division.name} - ${season}` : "Selecciona una división"}
            />
            
            {loading ? (
               <LoadingState>Cargando datos...</LoadingState>
            ) : (
              <TableWrapper>
                <ResponsiveTable>
                  <thead>
                    <tr>
                      <th className="sticky-col first-col">Pos</th>
                      <th className="sticky-col second-col left-align">Equipo</th>
                      <th>PTS</th>
                      <th>PJ</th>
                      <th>PG</th>
                      <th>PE</th>
                      <th>PP</th>
                      <th>GF</th>
                      <th>GC</th>
                      <th>DG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, index) => (
                      <tr key={team.team_id}>
                        <td className="sticky-col first-col rank">{index + 1}</td>
                        <td className="sticky-col second-col left-align team-cell">
                          <TeamLogo 
                            src={team.logo_url || v.iconofotovacia} 
                            alt="logo" 
                          />
                          <span className="name">{team.team_name}</span>
                        </td>
                        <td className="points">{team.pts}</td>
                        <td>{team.pj}</td>
                        <td>{team.pg}</td>
                        <td>{team.pe}</td>
                        <td>{team.pp}</td>
                        <td>{team.gf}</td>
                        <td>{team.gc}</td>
                        <td className={team.dg > 0 ? "positive" : (team.dg < 0 ? "negative" : "")}>
                          {team.dg}
                        </td>
                      </tr>
                    ))}
                    {standings.length === 0 && (
                      <tr>
                        <td colSpan="10" className="empty-state">
                          No hay registros disponibles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </ResponsiveTable>
              </TableWrapper>
            )}
          </Card>
        )}

        {/* === TAB 2: CONFIGURACIÓN GENERAL === */}
        {activeTab === "general" && (
           <Card maxWidth="600px">
              <CardHeader Icono={RiSettings4Line} titulo="Datos de la Liga" />
              <FormGroup>
                  <label>Nombre de la Liga</label>
                  <div className="row">
                      <InputText2>
                          <input 
                            className="form__field" 
                            value={tempLeagueName} 
                            onChange={(e) => setTempLeagueName(e.target.value)}
                            placeholder="Ej. Liga Municipal de Fútbol"
                          />
                      </InputText2>
                  </div>
                  <div className="actions-right">
                      <Btnsave 
                        titulo="Actualizar Nombre" 
                        bgcolor={v.colorPrincipal} 
                        icono={<v.iconoguardar/>}
                        funcion={() => onUpdateLeague(tempLeagueName)}
                      />
                  </div>
              </FormGroup>
           </Card>
        )}

        {/* === TAB 3: GESTIÓN DE DIVISIONES === */}
        {activeTab === "divisions" && (
            <Card maxWidth="800px">
                <div className="header-row">
                    <CardHeader Icono={RiBuilding2Line} titulo="Mis Divisiones" subtitulo="Categorías activas en la liga" />
                    <BtnNormal 
                        titulo="Nueva División" 
                        icono={<RiAddLine/>} 
                        funcion={() => openDivisionModal('add')} 
                    />
                </div>
                
                <ListGrid>
                    {allDivisions.map((div) => (
                        <ListItem key={div.id}>
                            <div className="info">
                                <span className="name">{div.name}</span>
                                <span className="meta">ID: {div.id} • Tier {div.tier || 1}</span>
                            </div>
                            <div className="actions">
                                <button className="btn-edit" onClick={() => openDivisionModal('edit', div)}><RiPencilLine/></button>
                                <button className="btn-del" onClick={() => handleDeleteRequest('division', div)}><RiDeleteBinLine/></button>
                            </div>
                        </ListItem>
                    ))}
                    {allDivisions.length === 0 && <EmptyMsg>No hay divisiones creadas.</EmptyMsg>}
                </ListGrid>
            </Card>
        )}

        {/* === TAB 4: GESTIÓN DE ÁRBITROS === */}
        {activeTab === "referees" && (
            <Card maxWidth="800px">
                <div className="header-row">
                    <CardHeader Icono={GiWhistle} titulo="Cuerpo Arbitral" subtitulo="Registro de árbitros oficiales" />
                    <BtnNormal 
                        titulo="Nuevo Árbitro" 
                        icono={<RiAddLine/>} 
                        funcion={() => openRefereeModal('add')} 
                    />
                </div>

                <ListGrid>
                    {referees.map((ref) => (
                        <ListItem key={ref.id}>
                            <div className="icon-avatar"><RiShieldUserLine /></div>
                            <div className="info">
                                <span className="name">{ref.full_name}</span>
                                <span className="meta"><RiPhoneLine className="mini-icon"/> {ref.phone || "Sin teléfono"}</span>
                            </div>
                            <div className="actions">
                                <button className="btn-edit" onClick={() => openRefereeModal('edit', ref)}><RiPencilLine/></button>
                                <button className="btn-del" onClick={() => handleDeleteRequest('referee', ref)}><RiDeleteBinLine/></button>
                            </div>
                        </ListItem>
                    ))}
                    {referees.length === 0 && <EmptyMsg>No hay árbitros registrados.</EmptyMsg>}
                </ListGrid>
            </Card>
        )}

      </ContentGrid>

      {/* --- MODAL DIVISIONES --- */}
      <Modal isOpen={modalDiv.open} onClose={() => setModalDiv({...modalDiv, open:false})} title={modalDiv.type === 'add' ? "Crear División" : "Editar División"}>
         <ModalContent>
             <label>Nombre de la División</label>
             <InputText2>
                <input className="form__field" value={formDivision} onChange={(e)=>setFormDivision(e.target.value)} placeholder="Ej. 1ra Fuerza" autoFocus />
             </InputText2>
             <div className="footer-modal">
                 <Btnsave titulo="Guardar" bgcolor={v.colorPrincipal} funcion={submitDivision} />
             </div>
         </ModalContent>
      </Modal>

      {/* --- MODAL ÁRBITROS --- */}
      <Modal isOpen={modalRef.open} onClose={() => setModalRef({...modalRef, open:false})} title={modalRef.type === 'add' ? "Registrar Árbitro" : "Editar Árbitro"}>
         <ModalContent>
             <label>Nombre Completo</label>
             <InputText2>
                <input className="form__field" name="name" value={formReferee.full_name} onChange={(e)=>setFormReferee({...formReferee, full_name: e.target.value})} placeholder="Ej. Benito Archundia" />
             </InputText2>
             <label>Teléfono</label>
             <InputText2>
                <input className="form__field" name="phone" value={formReferee.phone} onChange={(e)=>setFormReferee({...formReferee, phone: e.target.value})} placeholder="Ej. 55 1234 5678" type="tel" />
             </InputText2>
             <div className="footer-modal">
                 <Btnsave titulo="Guardar" bgcolor={v.colorPrincipal} funcion={submitReferee} />
             </div>
         </ModalContent>
      </Modal>

      {/* --- MODAL CONFIRMACIÓN --- */}
      <ConfirmModal 
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({...deleteModal, open: false})}
        onConfirm={confirmDeletion}
        title="Eliminar Registro"
        message={`¿Estás seguro de eliminar a "${deleteModal.name}"?`}
        subMessage="Esta acción no se puede deshacer."
      />

    </Container>
  );
}

// --- STYLED COMPONENTS ---

const Container = styled.div`
  min-height: 100vh;
  padding: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  background-color: ${({ theme }) => theme.bgtotal};
  padding-top: 80px; 
  @media ${Device.tablet} { padding-top: 20px; }
`;

const HeaderSection = styled.div`
  margin-bottom: 10px; width: 100%; max-width: 1000px;
`;

const ContentGrid = styled.div`
  display: flex; justify-content: center; width: 100%; gap: 20px;
`;

// Estilos específicos para las listas de gestión
const ListGrid = styled.div`
    display: flex; flex-direction: column; gap: 10px;
`;

const ListItem = styled.div`
    display: flex; align-items: center; justify-content: space-between;
    padding: 15px; border-radius: 12px;
    background: ${({theme}) => theme.bgtotal};
    border: 1px solid ${({theme}) => theme.bg4};
    transition: all 0.2s;
    
    &:hover { border-color: ${({theme}) => theme.primary}; transform: translateX(5px); }

    .icon-avatar {
        width: 40px; height: 40px; background: ${({theme}) => theme.bgcards};
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        margin-right: 15px; font-size: 20px; color: ${({theme}) => theme.text};
    }

    .info { 
        flex: 1; display: flex; flex-direction: column; 
        .name { font-weight: 600; color: ${({theme}) => theme.text}; }
        .meta { font-size: 12px; opacity: 0.6; display: flex; align-items: center; gap: 5px; .mini-icon{font-size:10px;} }
    }

    .actions {
        display: flex; gap: 8px;
        button {
            border: none; width: 32px; height: 32px; border-radius: 8px;
            display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;
            &.btn-edit { background: ${({theme}) => theme.bgcards}; color: ${({theme}) => theme.primary}; &:hover { background: ${({theme}) => theme.primary}20; } }
            &.btn-del { background: ${({theme}) => theme.bgcards}; color: ${v.rojo}; &:hover { background: ${v.rojo}20; } }
        }
    }
`;

const FormGroup = styled.div`
    display: flex; flex-direction: column; gap: 10px;
    label { font-weight: 600; font-size: 14px; opacity: 0.8; }
    .actions-right { display: flex; justify-content: flex-end; margin-top: 10px; }
`;

const ModalContent = styled.div`
    display: flex; flex-direction: column; gap: 15px; padding-top: 10px;
    label { font-size: 13px; font-weight: 600; margin-bottom: 5px; display: block; }
    .footer-modal { display: flex; justify-content: flex-end; margin-top: 15px; }
`;

const EmptyMsg = styled.div`
    text-align: center; padding: 30px; opacity: 0.5; font-style: italic; background: ${({theme})=>theme.bgtotal}; border-radius: 12px;
`;

// --- ESTILOS DE TABLA (Legacy) ---
const LoadingState = styled.div`
  padding: 40px; text-align: center; font-weight: 500; color: ${({theme}) => theme.text}; opacity: 0.7;
`;

const TeamLogo = styled.img`
  width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 8px; vertical-align: middle; border: 1px solid ${({ theme }) => theme.bgtotal};
`;

const TableWrapper = styled.div`
  width: 100%; overflow-x: auto; padding-bottom: 10px;
  &::-webkit-scrollbar { height: 8px; }
  &::-webkit-scrollbar-track { background: ${({ theme }) => theme.bgtotal}; border-radius: 4px; }
  &::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
`;

const ResponsiveTable = styled.table`
  width: 100%; border-collapse: separate; border-spacing: 0; color: ${({ theme }) => theme.text}; min-width: 600px;
  thead th {
    position: sticky; top: 0; z-index: 10; text-align: center; padding: 15px; font-size: 0.85rem;
    text-transform: uppercase; letter-spacing: 1px; color: ${({ theme }) => theme.text}; opacity: 0.8;
    background-color: ${({ theme }) => theme.bgcards}; border-bottom: 2px solid ${({ theme }) => theme.bgtotal};
  }
  tbody td {
    padding: 16px 15px; text-align: center; border-bottom: 1px solid ${({ theme }) => theme.bgtotal};
    font-size: 0.95rem; background-color: ${({ theme }) => theme.bgcards};
  }
  .sticky-col { position: sticky; z-index: 5; background-color: ${({ theme }) => theme.bgcards}; }
  thead .sticky-col { z-index: 15; }
  .first-col { left: 0; width: 50px; min-width: 50px; border-right: 1px solid ${({ theme }) => theme.bgtotal}; }
  .second-col { left: 50px; min-width: 150px; box-shadow: 4px 0 8px -4px rgba(0,0,0,0.1); border-right: 1px solid ${({ theme }) => theme.bgtotal}; }
  .left-align { text-align: left; }
  .rank { font-weight: bold; opacity: 0.5; }
  .team-cell { font-weight: 700; color: ${({ theme }) => theme.text}; display: flex; align-items: center; }
  .points { font-weight: 800; color: ${({ theme }) => theme.primary || "#1cb0f6"}; font-size: 1.1rem; }
  .positive { color: #22c55e; font-weight: 600; } 
  .negative { color: #ef4444; font-weight: 600; }
  .empty-state { padding: 40px; font-style: italic; opacity: 0.5; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background-color: ${({ theme }) => theme.bgtotal}40; }
  
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
`;