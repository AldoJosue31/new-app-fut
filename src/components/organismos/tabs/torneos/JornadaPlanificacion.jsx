import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../../../styles/variables";
import { RiAddLine, RiDeleteBinLine, RiTimeLine, RiCalendarLine } from "react-icons/ri";
import { Btnsave, InputText2 } from "../../../../index";

// Días de la semana para las columnas
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function JornadaPlanificacion({ matches, teams, onConfirm }) {
  // --- ESTADOS ---
  const [timeSlots, setTimeSlots] = useState(["08:00", "09:00", "10:00"]); // Filas iniciales
  const [grid, setGrid] = useState({}); // Mapa: "dayIndex-timeIndex" -> MatchObject
  const [unscheduledMatches, setUnscheduledMatches] = useState([]);
  const [draggedMatch, setDraggedMatch] = useState(null);
  
  // Fecha base para calcular fechas reales (Opcional: input de fecha por día)
  // Por simplicidad, asumiremos que "Lunes" es el próximo lunes. 
  // En una versión PRO, cada columna tendría un input de fecha real.
  const [baseDate, setBaseDate] = useState(new Date().toISOString().split('T')[0]);

  // INICIALIZACIÓN
  useEffect(() => {
    // 1. Enriquecer partidos con logos y nombres
    const enriched = matches.map(m => ({
      ...m,
      t1: teams.find(t => t.id === m.team1_id),
      t2: teams.find(t => t.id === m.team2_id)
    }));

    // 2. Separar los que ya tienen fecha (si recargamos página) de los que no
    // Para simplificar la demo, mandamos todos a la barra lateral (unscheduled)
    // O podrías intentar parsear m.date para ubicarlos en la grilla.
    setUnscheduledMatches(enriched);
    setGrid({}); 
  }, [matches, teams]);

  // --- DRAG & DROP HANDLERS ---
  const handleDragStart = (e, match, source) => {
    setDraggedMatch({ ...match, source }); // source: 'dock' | 'grid'
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDropOnGrid = (e, dayIndex, timeIndex) => {
    e.preventDefault();
    if (!draggedMatch) return;

    const cellKey = `${dayIndex}-${timeIndex}`;
    const previousMatchInCell = grid[cellKey];
    
    // 1. Si viene de la barra (dock)
    if (draggedMatch.source === 'dock') {
        const newUnscheduled = unscheduledMatches.filter(m => m.id !== draggedMatch.id);
        if (previousMatchInCell) newUnscheduled.push(previousMatchInCell); // Swap
        
        setUnscheduledMatches(newUnscheduled);
        setGrid({ ...grid, [cellKey]: draggedMatch });
    } 
    // 2. Si viene de otra celda (grid)
    else if (draggedMatch.source.type === 'grid') {
        const oldKey = draggedMatch.source.key;
        const newGrid = { ...grid };
        
        delete newGrid[oldKey]; // Quitar de origen
        
        if (previousMatchInCell) {
            newGrid[oldKey] = previousMatchInCell; // Swap a la celda vieja
        }
        
        newGrid[cellKey] = draggedMatch;
        setGrid(newGrid);
    }
    
    setDraggedMatch(null);
  };

  const handleDropOnDock = (e) => {
    e.preventDefault();
    if (!draggedMatch) return;

    if (draggedMatch.source.type === 'grid') {
        // Quitar del grid
        const newGrid = { ...grid };
        delete newGrid[draggedMatch.source.key];
        setGrid(newGrid);
        
        // Agregar al dock
        setUnscheduledMatches([...unscheduledMatches, draggedMatch]);
    }
    setDraggedMatch(null);
  };

  // --- GESTIÓN DE FILAS DE HORARIO ---
  const addTimeSlot = () => {
     // Lógica simple para añadir hora
     const last = timeSlots[timeSlots.length-1];
     const [h,m] = last.split(':');
     const nextH = (parseInt(h) + 1).toString().padStart(2,'0');
     setTimeSlots([...timeSlots, `${nextH}:${m}`]);
  };
  
  const removeTimeSlot = (index) => {
      // Devolver partidos de esa fila al dock
      const newGrid = { ...grid };
      const returnedMatches = [];
      
      DAYS.forEach((_, dIndex) => {
          const key = `${dIndex}-${index}`;
          if (newGrid[key]) {
              returnedMatches.push(newGrid[key]);
              delete newGrid[key];
          }
      });
      
      setGrid(newGrid);
      setUnscheduledMatches([...unscheduledMatches, ...returnedMatches]);
      setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  // --- CONFIRMAR ---
  const handleConfirm = () => {
    const scheduled = [];
    
    Object.keys(grid).forEach(key => {
        const [dayIndex, timeIndex] = key.split('-');
        const match = grid[key];
        const time = timeSlots[timeIndex];
        
        // Calcular fecha real (Demo: BaseDate + DayIndex días)
        const dateObj = new Date(baseDate);
        dateObj.setDate(dateObj.getDate() + parseInt(dayIndex));
        const dateStr = dateObj.toISOString().split('T')[0];
        
        scheduled.push({
            ...match,
            tempDateStr: `${dateStr} ${time}:00` // Formato timestamp
        });
    });

    onConfirm(scheduled, unscheduledMatches);
  };

  return (
    <Container>
        <TopBar>
            <div className="date-control">
                <label>Semana de inicio (Lunes):</label>
                <InputText2>
                    <input type="date" value={baseDate} onChange={(e)=>setBaseDate(e.target.value)} className="form__field" />
                </InputText2>
            </div>
            <div className="legend">
               <span>🗓️ Arrastra los partidos a la celda correspondiente.</span>
            </div>
        </TopBar>

        <Workspace>
            {/* --- TABLA HORARIOS --- */}
            <TableContainer>
                <Table>
                    <thead>
                        <tr>
                            <th className="corner">Hora</th>
                            {DAYS.map((day, i) => <th key={i}>{day}</th>)}
                            <th className="action-col"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((time, tIndex) => (
                            <tr key={tIndex}>
                                <td className="time-cell">
                                    <input 
                                        type="time" 
                                        value={time} 
                                        onChange={(e)=>{
                                            const newSlots = [...timeSlots];
                                            newSlots[tIndex] = e.target.value;
                                            setTimeSlots(newSlots);
                                        }}
                                    />
                                </td>
                                {DAYS.map((_, dIndex) => {
                                    const cellKey = `${dIndex}-${tIndex}`;
                                    const match = grid[cellKey];
                                    return (
                                        <td 
                                            key={cellKey} 
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDropOnGrid(e, dIndex, tIndex)}
                                            className={match ? "occupied" : "empty"}
                                        >
                                            {match ? (
                                                <MiniMatchCard 
                                                    match={match} 
                                                    draggable 
                                                    onDragStart={(e) => handleDragStart(e, match, { type: 'grid', key: cellKey })}
                                                />
                                            ) : (
                                                <div className="placeholder">+</div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="action-cell">
                                    <button onClick={() => removeTimeSlot(tIndex)}><RiDeleteBinLine/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
                <AddRowBtn onClick={addTimeSlot}><RiAddLine/> Agregar Horario</AddRowBtn>
            </TableContainer>

            {/* --- DOCK DE PARTIDOS --- */}
            <Dock onDragOver={handleDragOver} onDrop={handleDropOnDock}>
                <div className="dock-header">
                    <h4><RiCalendarLine/> Partidos por Asignar ({unscheduledMatches.length})</h4>
                </div>
                <div className="dock-content">
                    {unscheduledMatches.map(m => (
                        <DockCard 
                            key={m.id} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, m, 'dock')}
                        >
                            <img src={m.t1?.logo_url || v.iconofotovacia} alt="t1" />
                            <div className="vs">VS</div>
                            <img src={m.t2?.logo_url || v.iconofotovacia} alt="t2" />
                            <div className="names">
                                <span>{m.t1?.name}</span>
                                <span>{m.t2?.name}</span>
                            </div>
                        </DockCard>
                    ))}
                    {unscheduledMatches.length === 0 && <p className="empty">¡Todo asignado!</p>}
                </div>
            </Dock>
        </Workspace>

        <FooterActions>
             <Btnsave 
                titulo="Confirmar Horarios" 
                bgcolor={v.colorPrincipal} 
                icono={<v.iconoguardar/>} 
                funcion={handleConfirm}
                width="100%"
            />
        </FooterActions>
    </Container>
  );
}

// --- COMPONENTES AUXILIARES ---
const MiniMatchCard = ({ match, draggable, onDragStart }) => (
    <MiniCard draggable={draggable} onDragStart={onDragStart}>
        <div className="logos">
            <img src={match.t1?.logo_url} alt="" />
            <span>vs</span>
            <img src={match.t2?.logo_url} alt="" />
        </div>
        <div className="info">
            <span className="name">{match.t1?.name}</span>
            <span className="name">{match.t2?.name}</span>
        </div>
    </MiniCard>
);

// --- STYLED COMPONENTS (MEJORADOS) ---

const Container = styled.div` display: flex; flex-direction: column; gap: 20px; animation: fadeIn 0.3s ease; `;

const TopBar = styled.div` 
    display: flex; justify-content: space-between; align-items: flex-end; 
    background: ${({theme})=>theme.bgcards}; padding: 15px; border-radius: 12px; border: 1px solid ${({theme})=>theme.bg4};
    .date-control { display:flex; flex-direction:column; gap:5px; label{font-size:0.8rem; font-weight:600;} }
    .legend { font-size: 0.9rem; opacity: 0.7; }
`;

const Workspace = styled.div`
    display: grid; grid-template-columns: 1fr 280px; gap: 20px; height: 600px;
    @media (max-width: 1000px) { grid-template-columns: 1fr; height: auto; }
`;

const TableContainer = styled.div`
    overflow: auto; background: ${({theme})=>theme.bgcards}; border-radius: 12px; border: 1px solid ${({theme})=>theme.bg4}; position: relative;
    display: flex; flex-direction: column;
`;

const Table = styled.table`
    width: 100%; border-collapse: separate; border-spacing: 0; min-width: 800px;
    th { position: sticky; top: 0; background: ${({theme})=>theme.bg3}; color: ${({theme})=>theme.text}; padding: 10px; font-size: 0.85rem; z-index: 10; border-bottom: 2px solid ${({theme})=>theme.bg4}; }
    td { border-bottom: 1px solid ${({theme})=>theme.bg4}; border-right: 1px solid ${({theme})=>theme.bg4}; vertical-align: top; padding: 5px; height: 80px; width: 120px; }
    .time-cell { width: 80px; text-align: center; input { width: 100%; text-align: center; border:none; background:transparent; color: ${({theme})=>theme.text}; font-weight:700; } }
    .action-cell { width: 40px; text-align: center; vertical-align: middle; button { background:transparent; border:none; color:${v.rojo}; cursor:pointer; font-size:1.2rem; } }
    
    /* Drag zones */
    td.empty .placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; opacity: 0.1; font-size: 1.5rem; border: 2px dashed transparent; border-radius: 8px; transition: 0.2s; }
    td.empty:hover .placeholder { border-color: ${({theme})=>theme.primary}; opacity: 0.5; color: ${({theme})=>theme.primary}; }
`;

const AddRowBtn = styled.button`
    width: 100%; padding: 10px; background: ${({theme})=>theme.bgtotal}; border: none; border-top: 1px solid ${({theme})=>theme.bg4};
    color: ${({theme})=>theme.primary}; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;
    &:hover { background: ${({theme})=>theme.bg4}; }
`;

const Dock = styled.div`
    background: ${({theme})=>theme.bg3}; border-left: 1px solid ${({theme})=>theme.bg4}; display: flex; flex-direction: column; overflow: hidden; border-radius: 12px;
    .dock-header { padding: 15px; border-bottom: 1px solid ${({theme})=>theme.bg4}; h4 { margin: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; } }
    .dock-content { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; .empty { text-align: center; opacity: 0.5; margin-top: 20px; } }
`;

const DockCard = styled.div`
    background: ${({theme})=>theme.bgcards}; border: 1px solid ${({theme})=>theme.bg4}; padding: 10px; border-radius: 10px;
    display: flex; align-items: center; gap: 10px; cursor: grab; transition: transform 0.2s, box-shadow 0.2s;
    &:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-color: ${v.colorPrincipal}; }
    &:active { cursor: grabbing; }
    
    img { width: 32px; height: 32px; border-radius: 50%; object-fit: contain; background: #fff; padding: 2px; }
    .vs { font-size: 0.7rem; font-weight: 800; opacity: 0.5; }
    .names { display: flex; flex-direction: column; font-size: 0.8rem; font-weight: 600; overflow: hidden; span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } }
`;

const MiniCard = styled.div`
    background: ${({theme})=>theme.primary}20; border: 1px solid ${({theme})=>theme.primary}; border-radius: 8px; padding: 5px; cursor: grab; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 4px;
    &:active { cursor: grabbing; }
    .logos { display: flex; justify-content: center; align-items: center; gap: 5px; img { width: 20px; height: 20px; border-radius: 50%; background: #fff; } span { font-size: 0.6rem; font-weight: 700; opacity: 0.7; } }
    .info { display: flex; flex-direction: column; text-align: center; .name { font-size: 0.65rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; } }
`;

const FooterActions = styled.div` margin-top: 10px; `;