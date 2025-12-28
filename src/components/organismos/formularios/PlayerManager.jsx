import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { v } from "../../../styles/variables";
import { InputText2, Btnsave, BtnNormal, PhotoUploader, InputNumber } from "../../../index";
import { useJugadoresStore } from "../../../store/JugadoresStore";
import { supabase } from "../../../supabase/supabase.config";
import { RiEditLine, RiDeleteBinLine, RiUserAddLine, RiArrowLeftLine } from "react-icons/ri";

export function PlayerManager({ teamId }) {
  const { jugadores, fetchJugadores, addJugador, updateJugador, deleteJugador, isLoading } = useJugadoresStore();
  const [view, setView] = useState("list"); 
  const [editingPlayer, setEditingPlayer] = useState(null);
  
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

        const { error: errCrop } = await supabase.storage.from('logos').upload(pathCrop, croppedFile, { upsert: true });
        if (errCrop) throw errCrop;

        if (originalFile) {
            await supabase.storage.from('logos').upload(pathOriginal, originalFile, { upsert: true });
        }

        const { data: publicData } = supabase.storage.from('logos').getPublicUrl(pathCrop);
        finalPhotoUrl = `${publicData.publicUrl}?t=${Date.now()}`;
      }

      const payload = { 
          ...form, 
          team_id: teamId, 
          photo_url: finalPhotoUrl
      };

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
        <div className="header-actions">
          <h3>Plantilla ({isLoading ? "..." : jugadores.length})</h3>
          <BtnNormal titulo="Agregar Jugador" icono={<RiUserAddLine />} funcion={handleNew} />
        </div>
        
        <ListContainer>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <SkeletonRow key={index}>
                <div className="sk-info">
                  <div className="sk-avatar"></div>
                  <div className="sk-text-group">
                    <div className="sk-line"></div>
                    <div className="sk-line short"></div>
                  </div>
                </div>
              </SkeletonRow>
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
                  <button className="btn-icon delete" onClick={() => deleteJugador(p.id)}><RiDeleteBinLine /></button>
                </div>
              </PlayerRow>
            ))
          )}
          
          {jugadores.length === 0 && !isLoading && <p className="empty">No hay jugadores registrados.</p>}
        </ListContainer>
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
           {/* FECHA NO OBLIGATORIA (Sin 'required') */}
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
  .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; h3 { font-size: 1.1rem; margin:0; } }
  .back-btn { background: none; border: none; color: ${v.colorPrincipal}; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: 600; }
  .empty { text-align: center; opacity: 0.6; margin-top: 20px; }
`;

const ListContainer = styled.div`
  max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;
  padding-right: 5px; /* Evitar solapamiento con scrollbar */
`;

const PlayerRow = styled.div`
  background: ${({theme}) => theme.bgtotal}; padding: 10px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;
  .info { display: flex; gap: 12px; align-items: center; 
    img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #eee; }
    .name { font-weight: 600; display: block; font-size: 0.95rem; }
    .details { font-size: 0.8rem; opacity: 0.7; }
  }
  .actions { display: flex; gap: 5px; 
    .btn-icon { background: rgba(255,255,255,0.1); border: none; padding: 6px; border-radius: 6px; cursor: pointer; color: ${({theme})=>theme.text}; &:hover { background: ${v.colorPrincipal}; color: white; } 
    &.delete:hover { background: ${v.rojo}; } }
  }
`;

/* --- COMPONENTES SKELETON --- */
const SkeletonRow = styled.div`
  background: ${({ theme }) => theme.bgtotal};
  padding: 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;

  /* Efecto de brillo general */
  &::after {
      content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(to right, transparent 0%, ${({theme})=> theme.bg2 || 'rgba(255,255,255,0.1)'} 50%, transparent 100%);
      background-size: 400% 100%;
      animation: ${shimmer} 1.2s infinite linear;
      opacity: 0.6;
  }

  .sk-info {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .sk-avatar {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: ${({ theme }) => theme.bg4};
    flex-shrink: 0;
  }

  .sk-text-group {
    display: flex; 
    flex-direction: column; 
    gap: 6px;
    width: 60%;
  }
  
  .sk-line {
    height: 10px;
    background: ${({ theme }) => theme.bg4};
    border-radius: 4px;
    width: 100%;
  }
  
  .sk-line.short { width: 60%; }
`;

const Form = styled.form`
  display: flex; flex-direction: column; gap: 12px;
  
  /* Se eliminó .photo-upload ya que ahora usamos el componente externo */

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: 0.6fr 1.2fr 1.2fr; gap: 10px; }
  
  .custom-select { width: 100%; padding: 12px; border-radius: 15px; background: ${({theme})=>theme.bgtotal}; color: ${({theme})=>theme.text}; border: 2px solid ${({theme})=>theme.color2}; outline: none; height: 100%; }
`;

// 1. Definimos la animación de vibración
const shakeAnimation = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
`;

// 2. Actualizamos el componente
const ErrorBadge = styled.span`
  position: absolute;
  top: -25px; /* Ajusta según necesites */
  left: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  background: #ff4b4b; /* Rojo alerta */
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  pointer-events: none;

  /* Lógica de animación: Si $shake es true, vibra. Si no, solo aparece suavemente. */
  ${({ $shake }) => $shake 
      ? css`animation: ${shakeAnimation} 0.4s ease-in-out;` 
      : css`animation: fadeIn 0.3s ease-out;`
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 10px;
    border-width: 4px 4px 0;
    border-style: solid;
    border-color: #ff4b4b transparent transparent transparent;
  }
`;