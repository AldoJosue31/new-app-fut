import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { v } from "../../../styles/variables";
import { InputText2, Btnsave, PhotoUploader, InputNumber, Skeleton, ContainerScroll } from "../../../index";
// 👇 Importamos el Modal desde la ruta correcta (subimos un nivel desde 'formularios')
import { Modal } from "../Modal"; 
import { useJugadoresStore } from "../../../store/JugadoresStore";
import { supabase } from "../../../supabase/supabase.config";
import { 
    RiEditLine, RiDeleteBinLine, RiUserAddLine, 
    RiArrowLeftLine, RiErrorWarningLine , RiCheckboxCircleLine
} from "react-icons/ri";
import { compressImage } from "../../../utils/imageProcessor";

export function PlayerManager({ teamId }) {
  const { jugadores, fetchJugadores, addJugador, updateJugador, deleteJugador, isLoading } = useJugadoresStore();
  const [view, setView] = useState("list"); 
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // --- ESTADOS PARA EL MODAL DE ELIMINAR ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);

  // Estados para la imagen
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [croppedFile, setCroppedFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  
  // Estado del formulario
  const initialForm = {
    first_name: "", last_name: "", dorsal: "", position: "Delantero",
    birth_date: "", curp_dni: "", photo_url: ""
  };
  const [form, setForm] = useState(initialForm);
  const [dorsalError, setDorsalError] = useState("");
  const [shakeError, setShakeError] = useState(false);

  useEffect(() => {
    if (!form.dorsal || !jugadores.length) {
      setDorsalError("");
      return;
    }
    const duplicado = jugadores.find(p => 
      p.dorsal == form.dorsal && 
      (editingPlayer ? p.id !== editingPlayer.id : true)
    );
    if (duplicado) {
      setDorsalError(`⚠️ Ocupado por ${duplicado.first_name} ${duplicado.last_name}`);
    } else {
      setDorsalError("");
    }
  }, [form.dorsal, jugadores, editingPlayer]);

  useEffect(() => {
    if (teamId) fetchJugadores(teamId);
  }, [teamId]);

  const handleInputChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleImageSelect = (cropFile, originalFile, previewUrl) => {
    setCroppedFile(cropFile);
    setOriginalFile(originalFile);
    setPreview(previewUrl);
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setForm(player);
    setPreview(player.photo_url);
    setView("form");
  };

  const handleNew = () => {
    setEditingPlayer(null);
    setForm(initialForm);
    setPreview(null);
    setPhotoFile(null);
    setView("form");
  };

  // --- LÓGICA DE ELIMINACIÓN SEGURA ---
  const openDeleteModal = (player) => {
      setPlayerToDelete(player);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if(playerToDelete) {
          await deleteJugador(playerToDelete.id);
          setIsDeleteModalOpen(false);
          setPlayerToDelete(null);
      }
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    if (dorsalError) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }
    try {
      let finalPhotoUrl = form.photo_url;
      
      if (croppedFile) {
        const fileId = editingPlayer ? editingPlayer.id : Date.now(); 
        const pathCrop = `players/${fileId}_crop.png`;
        const pathOriginal = `players/${fileId}_original.png`;

// 1. Subir Crop (ya viene pequeño del PhotoUploader, pero puedes comprimirlo más si quieres)
        const { error: errCrop } = await supabase.storage.from('logos').upload(pathCrop, croppedFile, { upsert: true });
        if (errCrop) throw errCrop;

        // 2. Subir Original COMPRIMIDA
        if (originalFile) {
            // Comprimimos la original a 1000px max y 0.8 calidad para ahorrar espacio
            const compressedOriginal = await compressImage(originalFile, 1000, 0.8);
            await supabase.storage.from('logos').upload(pathOriginal, compressedOriginal, { upsert: true });
        }

        const { data: publicData } = supabase.storage.from('logos').getPublicUrl(pathCrop);
        finalPhotoUrl = `${publicData.publicUrl}?t=${Date.now()}`;
      }

      // --- CORRECCIÓN AQUÍ ---
      // Si la fecha es string vacío "", enviamos null. Si tiene valor, lo dejamos igual.
      const birthDateToSend = form.birth_date === "" ? null : form.birth_date;

      const payload = { 
          ...form, 
          birth_date: birthDateToSend, // <--- Asignamos el valor corregido
          team_id: teamId, 
          photo_url: finalPhotoUrl
      };
      // -----------------------

      if (editingPlayer) {
        await updateJugador(editingPlayer.id, payload);
      } else {
        await addJugador(payload);
      }
setView("list");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const getOriginalUrlFromPreview = (url) => {
      if (!url) return null;
      if (url.includes("_crop")) return url.replace("_crop", "_original");
      return url; 
  };

  // --- VISTA LISTA ---
  if (view === "list") {
    return (
      <Container>
        {/* ENCABEZADO MEJORADO: Espacio y botón proporcional */}
        <div className="header-actions">
          <h3>Plantilla ({isLoading ? "..." : jugadores.length})</h3>
          
          {/* Botón más compacto que no choca con los tabs */}
          <BtnSmall onClick={handleNew}>
             <RiUserAddLine /> 
             <span>Agregar</span>
          </BtnSmall>
        </div>
        <ContainerScroll $maxHeight="400px">
        <ListContainer>
{isLoading ? (
  Array.from({ length: 5 }).map((_, i) => (
    <div key={i} style={{ padding: 10, display: 'flex', gap: 15, alignItems: 'center' }}>
       <Skeleton type="circle" width="40px" height="40px" /> {/* Avatar */}
       <div style={{flex: 1, display:'flex', flexDirection:'column', gap: 5}}>
          <Skeleton width="60%" height="14px" />  {/* Nombre */}
          <Skeleton width="40%" height="10px" />  {/* Posición */}
       </div>
    </div>
  ))
          ) : (
            jugadores.map((p) => (
              <PlayerRow key={p.id}>
                <div className="info">
                  <img src={p.photo_url || "https://i.ibb.co/5vgZ0fX/hombre.png"} alt="foto" />
                  <div>
                    <span className="name">{p.first_name} {p.last_name}</span>
                    <span className="details">#{p.dorsal} - {p.position}</span>
                  </div>
                </div>
                <div className="actions">
                  <button className="btn-icon edit" onClick={() => handleEdit(p)}><RiEditLine /></button>
                  {/* Ahora abre el modal en lugar de borrar directo */}
                  <button className="btn-icon delete" onClick={() => openDeleteModal(p)}><RiDeleteBinLine /></button>
                </div>
              </PlayerRow>
            ))
          )}
          
          {jugadores.length === 0 && !isLoading && <p className="empty">No hay jugadores registrados.</p>}
        </ListContainer></ContainerScroll>

        {/* --- MINI MODAL DE CONFIRMACIÓN --- */}
        <Modal 
            isOpen={isDeleteModalOpen} 
            onClose={() => setIsDeleteModalOpen(false)} 
            title="Eliminar Jugador"
            width="400px"
            closeOnOverlayClick={false} // 🔒 No cierra al hacer clic fuera
        >
            <DeleteContent>
                <div className="warning-icon"><RiErrorWarningLine /></div>
                <p>
                    ¿Seguro que deseas eliminar a <b>{playerToDelete?.first_name}</b>?
                    <br/><span className="sub">Esta acción es irreversible.</span>
                </p>
                <div className="modal-actions">
                    <button className="cancel" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
                    <button className="confirm" onClick={confirmDelete}>Eliminar</button>
                </div>
            </DeleteContent>
        </Modal>
        <Modal 
         isOpen={isSuccess} 
         onClose={() => {}} // Bloqueamos el cierre manual para forzar la espera
         width="300px"
         hideCloseBtn={true} // Si tu modal soporta ocultar la X, si no, no importa
      >
         <SuccessContent>
            <RiCheckboxCircleLine size={60} color="#46b450" /> {/* Color verde éxito */}
            <h3>¡Guardado!</h3>
            <p>Redirigiendo a la lista...</p>
         </SuccessContent>
      </Modal>

      </Container>
    );
  }

  // --- VISTA FORMULARIO ---
  return (
    <Container>
      <div className="header-actions">
        <button className="back-btn" onClick={() => setView("list")}>
            <RiArrowLeftLine /> Volver
        </button>
        <h3>{editingPlayer ? "Editar Jugador" : "Nuevo Jugador"}</h3>
      </div>

      <Form onSubmit={handleSubmit}>
        
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "25px" }}>
            <PhotoUploader 
                previewUrl={preview} 
                originalUrl={editingPlayer?.original_photo_url || getOriginalUrlFromPreview(preview)}
                onImageSelect={handleImageSelect}
                onClear={() => {
                    setCroppedFile(null); setOriginalFile(null); setPreview(null);
                    setForm(prev => ({ ...prev, photo_url: "" }));
                }}
                shape="circle"
                width="130px" height="130px"
            />
        </div>

        <div className="grid-2">
           <InputText2>
              <input className="form__field" name="first_name" placeholder="Nombres" required value={form.first_name} onChange={handleInputChange}/>
           </InputText2>
           <InputText2>
              <input className="form__field" name="last_name" placeholder="Apellidos" required value={form.last_name} onChange={handleInputChange}/>
           </InputText2>
        </div>

        <div className="grid-3">
           <div style={{ position: 'relative' }}> 
               {dorsalError && <ErrorBadge $shake={shakeError}>{dorsalError}</ErrorBadge>}
               <InputNumber name="dorsal" value={form.dorsal} onChange={handleInputChange} min={0} max={999}/>
           </div>
           <div className="select-wrap">
              <select name="position" value={form.position} onChange={handleInputChange} className="custom-select">
                  <option>Portero</option>
                  <option>Defensa</option>
                  <option>Medio</option>
                  <option>Delantero</option>
              </select>
           </div>
           <InputText2>
              <input className="form__field" type="date" name="birth_date" value={form.birth_date} onChange={handleInputChange}/>
           </InputText2>
        </div>

        <InputText2>
            <input className="form__field" name="curp_dni" placeholder="CURP / DNI / ID" value={form.curp_dni} onChange={handleInputChange}/>
        </InputText2>

        <Btnsave titulo="Guardar Jugador" bgcolor={v.colorPrincipal} icono={<v.iconoguardar />} width="100%"/>
      </Form>
    </Container>
  );
}

// --- STYLES & ANIMATIONS ---

const shimmer = keyframes`
  0% { background-position: -468px 0; }
  100% { background-position: 468px 0; }
`;

const Container = styled.div`
  display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.3s ease;
  margin-top: 10px; /* Separación extra para no chocar con los tabs */
  
  .header-actions { 
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; 
      h3 { font-size: 1.1rem; margin:0; color: ${({theme})=>theme.text}; } 
  }
  .back-btn { background: none; border: none; color: ${v.colorPrincipal}; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: 600; }
  .empty { text-align: center; opacity: 0.6; margin-top: 20px; }
`;

// Botón "Agregar" más proporcional y estilizado
const BtnSmall = styled.button`
    background: ${({theme}) => theme.bgcards};
    border: 1px solid ${({theme}) => theme.bg4};
    color: ${({theme}) => theme.text};
    padding: 6px 16px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    transition: all 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);

    &:hover {
        background: ${v.colorPrincipal};
        color: white;
        border-color: ${v.colorPrincipal};
        transform: translateY(-2px);
    }
    svg { font-size: 1.1rem; }
`;

const ListContainer = styled.div`
  display: flex; 
  flex-direction: column; 
  gap: 10px;
`;

const PlayerRow = styled.div`
  background: ${({theme}) => theme.bgtotal}; padding: 10px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;
  border: 1px solid transparent;
  &:hover { border-color: ${({theme})=>theme.bg4}; }
  
  .info { display: flex; gap: 12px; align-items: center; 
    img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #eee; }
    .name { font-weight: 600; display: block; font-size: 0.95rem; }
    .details { font-size: 0.8rem; opacity: 0.7; }
  }
  .actions { display: flex; gap: 5px; 
    .btn-icon { background: rgba(255,255,255,0.05); border: none; padding: 6px; border-radius: 6px; cursor: pointer; color: ${({theme})=>theme.text}; transition: 0.2s;
        &:hover { background: ${v.colorPrincipal}; color: white; } 
        &.delete:hover { background: ${v.rojo}; } 
    }
  }
`;

/* CONTENIDO DEL MODAL DE ELIMINAR */
const DeleteContent = styled.div`
    text-align: center; padding: 10px;
    .warning-icon { font-size: 3rem; color: #f1c40f; margin-bottom: 10px; }
    p { margin: 0 0 20px 0; font-size: 1rem; color: ${({theme})=>theme.text}; }
    .sub { font-size: 0.85rem; opacity: 0.7; display: block; margin-top: 5px; }
    
    .modal-actions {
        display: flex; justify-content: center; gap: 15px;
        button {
            padding: 8px 20px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s;
            &.cancel { background: ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; &:hover { background: ${({theme})=>theme.bg3}; } }
            &.confirm { background: ${v.rojo}; color: white; &:hover { opacity: 0.9; transform: translateY(-2px); } }
        }
    }
`;

const SkeletonRow = styled.div`
  background: ${({ theme }) => theme.bgtotal};
  padding: 10px; border-radius: 10px; display: flex; align-items: center; position: relative; overflow: hidden;
  &::after {
      content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(to right, transparent 0%, ${({theme})=> theme.bg2 || 'rgba(255,255,255,0.1)'} 50%, transparent 100%);
      background-size: 400% 100%; animation: ${shimmer} 1.2s infinite linear; opacity: 0.6;
  }
  .sk-info { display: flex; align-items: center; gap: 12px; width: 100%; }
  .sk-avatar { width: 40px; height: 40px; border-radius: 50%; background: ${({ theme }) => theme.bg4}; flex-shrink: 0; }
  .sk-text-group { display: flex; flex-direction: column; gap: 6px; width: 60%; }
  .sk-line { height: 10px; background: ${({ theme }) => theme.bg4}; border-radius: 4px; width: 100%; }
  .sk-line.short { width: 60%; }
`;

const Form = styled.form`
  display: flex; flex-direction: column; gap: 12px;
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: 0.6fr 1.2fr 1.2fr; gap: 10px; }
  .custom-select { width: 100%; padding: 12px; border-radius: 15px; background: ${({theme})=>theme.bgtotal}; color: ${({theme})=>theme.text}; border: 2px solid ${({theme})=>theme.color2}; outline: none; height: 100%; }
`;

const shakeAnimation = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
`;

const ErrorBadge = styled.span`
  position: absolute; top: -25px; left: 0; font-size: 0.75rem; font-weight: 700; color: #fff; background: #ff4b4b;
  padding: 4px 8px; border-radius: 4px; white-space: nowrap; z-index: 10; pointer-events: none;
  ${({ $shake }) => $shake ? css`animation: ${shakeAnimation} 0.4s ease-in-out;` : css`animation: fadeIn 0.3s ease-out;`}
  &::after { content: ''; position: absolute; bottom: -4px; left: 10px; border-width: 4px 4px 0; border-style: solid; border-color: #ff4b4b transparent transparent transparent; }
`;

const SuccessContent = styled.div`
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  padding: 20px;
  text-align: center;
  
  h3 {
    margin: 10px 0 5px 0;
    font-size: 1.2rem;
    color: ${({theme}) => theme.text};
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
    color: ${({theme}) => theme.text};
    opacity: 0.7;
  }
  
  /* Animación de entrada para el icono */
  svg {
    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  
  @keyframes popIn {
    0% { transform: scale(0); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
`;