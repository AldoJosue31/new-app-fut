import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes, css } from "styled-components";
import { v } from "../../../styles/variables";
import { InputText2, Btnsave, PhotoUploader, InputNumber, Skeleton, ContainerScroll, useSort, SortControl } from "../../../index";
import { Modal } from "../Modal"; 
import { useJugadoresStore } from "../../../store/JugadoresStore";
import { 
    RiEditLine, RiDeleteBinLine, RiUserAddLine, 
    RiArrowLeftLine, RiErrorWarningLine, RiArchiveLine,
    RiEyeLine, RiEyeOffLine, RiRefreshLine
} from "react-icons/ri";
// IMPORTANTE: Importamos la utilidad de subida
import { uploadImageToSupabase } from "../../../utils/uploadHandler";
import { supabase } from "../../../supabase/supabase.config";

const POSITION_RANK = {
    'Portero': 1, 'Defensa': 2, 'Medio': 3, 'Delantero': 4, 'No especificada': 5
};

const getCurrentOwnerId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user?.id) throw new Error("No se pudo identificar al usuario actual");
  return user.id;
};

const uploadPlayerPhoto = async ({ file, originalFile, ownerId, leagueId, teamId, playerId }) => {
  if (!leagueId) throw new Error("No se pudo identificar la liga del jugador");

  return uploadImageToSupabase(
    file,
    originalFile,
    "logos",
    `players/${ownerId}/${leagueId}/${teamId}/${playerId}`,
    {
      fileName: "crop.webp",
      originalFileName: "original.webp",
      upsert: true,
      cacheBuster: true,
      requireOriginal: true,
    }
  );
};

export function PlayerManager({ teamId, leagueId, showToast }) {
  const { 
      jugadores, fetchJugadores, addJugador, updateJugador, 
      deleteJugador, archivarJugador, restaurarJugador, isLoading 
  } = useJugadoresStore();

  const [view, setView] = useState("list"); 
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  // Modales
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isManualArchiveOpen, setIsManualArchiveOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictPlayer, setConflictPlayer] = useState(null);

  // Form States
  const [preview, setPreview] = useState(null);
  const [croppedFile, setCroppedFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  
  const initialForm = {
    first_name: "", last_name: "", dorsal: "", position: "No especificada",
    birth_date: "", curp_dni: "", photo_url: "", original_photo_url: ""
  };
  const [form, setForm] = useState(initialForm);
  const [dorsalError, setDorsalError] = useState("");
  const [shakeError, setShakeError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const isSavingRef = useRef(false);

  const { items: sortedPlayers, requestSort, sortConfig } = useSort(jugadores, { 
      key: 'dorsal', direction: 'ascending' 
  });

  const sortOptions = [
      { label: "Dorsal", key: "dorsal" },
      { label: "Nombre", key: "first_name" },
      { label: "Posición", key: "position", customOrder: POSITION_RANK }
  ];

  useEffect(() => {
    if (teamId) {
        fetchJugadores(teamId, !showArchived);
    }
  }, [teamId, showArchived]);

  useEffect(() => {
    if (!form.dorsal || !jugadores.length || showArchived) {
      setDorsalError(""); return;
    }
    const duplicado = jugadores.find(p => 
      p.dorsal == form.dorsal && (editingPlayer ? p.id !== editingPlayer.id : true)
    );
    if (duplicado) {
      setDorsalError(`⚠️ Ocupado por ${duplicado.first_name}`);
    } else {
      setDorsalError("");
    }
  }, [form.dorsal, jugadores, editingPlayer]);

  // --- HANDLERS ---
  const handleToggleView = () => setShowArchived(!showArchived);
  const handleInputChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleImageSelect = (cropFile, original, previewUrl) => {
    setCroppedFile(cropFile); 
    setOriginalFile(original); 
    setPreview(previewUrl);
  };

  const handleEdit = (player) => {
    setEditingPlayer(player); 
    setForm({
        ...player,
        position: player.position || "No especificada",
        original_photo_url: player.original_photo_url || "" 
    }); 
    setPreview(player.photo_url); 
    setCroppedFile(null);
    setOriginalFile(null); // No tenemos el archivo binario, solo la URL
    setView("form");
  };

  const handleNew = () => {
    setEditingPlayer(null); 
    setForm(initialForm); 
    setPreview(null); 
    setCroppedFile(null); 
    setOriginalFile(null); 
    setView("form");
  };

  const openDeleteModal = (player) => { setSelectedPlayer(player); setIsDeleteModalOpen(true); };
  const openArchiveModal = (player) => { setSelectedPlayer(player); setIsManualArchiveOpen(true); };

  const confirmManualArchive = async () => {
      if(selectedPlayer) {
          const result = await archivarJugador(selectedPlayer.id);
          if(result.success) {
              setIsManualArchiveOpen(false); setSelectedPlayer(null);
              if(showToast) showToast("Jugador inhabilitado correctamente", "success");
          } else { if(showToast) showToast("Error: " + result.message, "error"); }
      }
  };

  const handleRestore = async (player) => {
      const result = await restaurarJugador(player.id);
      if(result.success) { if(showToast) showToast("Jugador restaurado", "success"); } 
      else { if(showToast) showToast("Error: " + result.message, "error"); }
  };

  const confirmDelete = async () => {
      if(selectedPlayer) {
          const result = await deleteJugador(selectedPlayer.id);
          if(result.success) {
              setIsDeleteModalOpen(false); setSelectedPlayer(null);
              if(showToast) showToast("Jugador eliminado", "success");
          } else if (result.error === 'CONFLICT') {
              setIsDeleteModalOpen(false); setConflictPlayer(selectedPlayer); setConflictModalOpen(true);
          } else { if(showToast) showToast("Error: " + result.message, "error"); }
      }
  };

  const handleConflictArchive = async () => {
      if (conflictPlayer) {
          const result = await archivarJugador(conflictPlayer.id);
          if (result.success) {
              setConflictModalOpen(false); setConflictPlayer(null); setSelectedPlayer(null);
              if(showToast) showToast("Jugador archivado", "success");
          } else { if(showToast) showToast("Error: " + result.message, "error"); }
      }
  };

  // --- SUBMIT FORM CORREGIDO ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dorsalError) { setShakeError(true); setTimeout(() => setShakeError(false), 500); return; }
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    
    setIsUploading(true);

    try {
      let finalPhotoUrl = form.photo_url;
      let finalOriginalUrl = form.original_photo_url;
      const ownerId = croppedFile ? await getCurrentOwnerId() : null;

      
      // Si el usuario limpió la imagen
      if (!croppedFile && !preview && !form.photo_url) {
          finalPhotoUrl = null;
          finalOriginalUrl = null;
      }

      const payload = { 
          ...form, 
          birth_date: form.birth_date || null, 
          team_id: teamId, 
          photo_url: finalPhotoUrl,
          original_photo_url: finalOriginalUrl // Guardamos la URL original
      };

      if (editingPlayer) {
        if (croppedFile) {
          const { url, originalUrl } = await uploadPlayerPhoto({
            file: croppedFile,
            originalFile,
            ownerId,
            leagueId,
            teamId,
            playerId: editingPlayer.id,
          });

          payload.photo_url = url;
          payload.original_photo_url = originalUrl;
        }

        await updateJugador(editingPlayer.id, payload);
        if(showToast) showToast("Jugador actualizado", "success");
      } else {
        const savedPlayer = await addJugador(payload);

        if (croppedFile) {
          try {
            const { url, originalUrl } = await uploadPlayerPhoto({
              file: croppedFile,
              originalFile,
              ownerId,
              leagueId,
              teamId,
              playerId: savedPlayer.id,
            });

            await updateJugador(savedPlayer.id, {
              photo_url: url,
              original_photo_url: originalUrl,
            });
          } catch (uploadError) {
            await deleteJugador(savedPlayer.id);
            throw uploadError;
          }
        }

        if(showToast) showToast("Jugador creado", "success");
      }
      setView("list");
    } catch (err) {
      if(showToast) showToast("Error al guardar: " + err.message, "error");
      console.error(err);
    } finally {
      isSavingRef.current = false;
      setIsUploading(false);
    }
  };

  const getOriginalUrlFromPreview = (url) => {
      // Priorizamos la URL guardada en BD, si no intentamos inferirla
      if (editingPlayer?.original_photo_url) return editingPlayer.original_photo_url;
      if (!url) return null;
      if (url.includes("_crop")) return url.replace("_crop", "_original");
      return url; 
  };

  // --- RENDER LIST ---
  if (view === "list") {
    return (
      <Container>
        <div className="header-actions">
          <h3>{showArchived ? "Inhabilitados" : `Plantilla (${jugadores.length})`}</h3>
          <div style={{display: 'flex', gap: '10px'}}>
              <BtnToggle onClick={handleToggleView} $active={showArchived}>
                  {showArchived ? <RiEyeLine /> : <RiEyeOffLine />}
                  <span>{showArchived ? "Ver Activos" : "Ver Inhabilitados"}</span>
              </BtnToggle>
              {!showArchived && (
                  <BtnSmall onClick={handleNew}><RiUserAddLine /> <span>Agregar</span></BtnSmall>
              )}
          </div>
        </div>

        {!isLoading && jugadores.length > 0 && (
            <SortControl options={sortOptions} currentSort={sortConfig} onSortChange={requestSort} />
        )}

        <ContainerScroll $maxHeight="400px">
        <ListContainer>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: 10, display: 'flex', gap: 15, alignItems: 'center' }}>
               <Skeleton type="circle" width="40px" height="40px" />
               <div style={{flex: 1, display:'flex', flexDirection:'column', gap: 5}}>
                  <Skeleton width="60%" height="14px" /> <Skeleton width="40%" height="10px" />
               </div>
            </div>
          ))
        ) : (
            sortedPlayers.map((p) => (
              <PlayerRow key={p.id} $isArchived={showArchived}>
                <div className="info">
                  <img src={p.photo_url || "https://i.ibb.co/5vgZ0fX/hombre.png"} alt="foto" />
                  <div>
                  <span className="name">{p.first_name} {p.last_name}</span>
                    <span className="details">#{p.dorsal} - {p.position || "No especificada"}</span>
                  </div>
                </div>
                <div className="actions">
                  {showArchived ? (
                      <button className="btn-icon restore" onClick={() => handleRestore(p)} title="Restaurar"><RiRefreshLine /></button>
                  ) : (
                      <>
                          <button className="btn-icon edit" onClick={() => handleEdit(p)}><RiEditLine /></button>
                          <button className="btn-icon archive" onClick={() => openArchiveModal(p)} title="Inhabilitar"><RiArchiveLine /></button>
                          <button className="btn-icon delete" onClick={() => openDeleteModal(p)} title="Eliminar"><RiDeleteBinLine /></button>
                      </>
                  )}
                </div>
              </PlayerRow>
            ))
        )}
          {jugadores.length === 0 && !isLoading && (
              <p className="empty">No hay jugadores {showArchived ? "inhabilitados" : "activos"}.</p>
          )}
        </ListContainer>
        </ContainerScroll>

        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Eliminar Jugador" width="400px">
            <DeleteContent>
                <div className="warning-icon"><RiErrorWarningLine /></div>
                <p>¿Eliminar a <b>{selectedPlayer?.first_name}</b>? <br/><span className="sub">Irreversible.</span></p>
                <div className="modal-actions">
                    <button className="cancel" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
                    <button className="confirm" onClick={confirmDelete}>Eliminar</button>
                </div>
            </DeleteContent>
        </Modal>

        <Modal isOpen={isManualArchiveOpen} onClose={() => setIsManualArchiveOpen(false)} title="Inhabilitar Jugador" width="400px">
            <DeleteContent>
                <div className="warning-icon" style={{color: '#f39c12'}}><RiArchiveLine /></div>
                <p>¿Inhabilitar a <b>{selectedPlayer?.first_name}</b>? <br/><span className="sub">Se ocultará, pero guarda estadísticas.</span></p>
                <div className="modal-actions">
                    <button className="cancel" onClick={() => setIsManualArchiveOpen(false)}>Cancelar</button>
                    <button className="archive" onClick={confirmManualArchive}>Inhabilitar</button>
                </div>
            </DeleteContent>
        </Modal>

        <Modal isOpen={conflictModalOpen} onClose={() => setConflictModalOpen(false)} title="¡No se puede eliminar!" width="450px">
            <DeleteContent>
                <div className="warning-icon" style={{color: '#e67e22'}}><RiErrorWarningLine /></div>
                <p>El jugador <b>{conflictPlayer?.first_name}</b> tiene estadísticas.</p>
                <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '20px'}}>Recomendamos <b>Archivar</b>.</p>
                <div className="modal-actions">
                    <button className="cancel" onClick={() => setConflictModalOpen(false)}>Cancelar</button>
                    <button className="archive" onClick={handleConflictArchive}><RiArchiveLine style={{marginRight: 5}}/> Archivar</button>
                </div>
            </DeleteContent>
        </Modal>
      </Container>
    );
  }

  // --- RENDER FORM ---
  return (
    <Container>
      <div className="header-actions">
        <button className="back-btn" onClick={() => setView("list")}><RiArrowLeftLine /> Volver</button>
        <h3>{editingPlayer ? "Editar Jugador" : "Nuevo Jugador"}</h3>
      </div>

      <Form onSubmit={handleSubmit}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "25px" }}>
            <PhotoUploader 
                previewUrl={preview} 
                originalUrl={getOriginalUrlFromPreview(preview)} // Usa la lógica prioritaria
                originalFile={originalFile} // Pasa el archivo en memoria si existe
                onImageSelect={handleImageSelect}
                onClear={() => { 
                    setCroppedFile(null); setOriginalFile(null); setPreview(null); 
                    setForm(prev => ({ ...prev, photo_url: "", original_photo_url: "" })); 
                }}
                shape="circle" width="130px" height="130px"
                showToast={showToast}
            />
        </div>

        <div className="grid-2">
           <InputText2><input className="form__field" name="first_name" placeholder="Nombres" required value={form.first_name} onChange={handleInputChange}/></InputText2>
           <InputText2><input className="form__field" name="last_name" placeholder="Apellidos" required value={form.last_name} onChange={handleInputChange}/></InputText2>
        </div>

        <div className="grid-3">
           <div style={{ position: 'relative' }}> 
               {dorsalError && <ErrorBadge $shake={shakeError}>{dorsalError}</ErrorBadge>}
               <InputNumber name="dorsal" value={form.dorsal} onChange={handleInputChange} min={0} max={999}/>
           </div>
           <div className="select-wrap">
              <select name="position" value={form.position} onChange={handleInputChange} className="custom-select">
                  <option>No especificada</option><option>Portero</option><option>Defensa</option><option>Medio</option><option>Delantero</option>
              </select>
           </div>
           <InputText2><input className="form__field" type="date" name="birth_date" value={form.birth_date} onChange={handleInputChange}/></InputText2>
        </div>

        <InputText2><input className="form__field" name="curp_dni" placeholder="CURP / DNI / ID" value={form.curp_dni} onChange={handleInputChange}/></InputText2>

        <Btnsave titulo={isUploading ? "Subiendo..." : "Guardar Jugador"} disabled={isUploading} bgcolor={v.colorPrincipal} icono={<v.iconoguardar />} width="100%"/>
      </Form>
    </Container>
  );
}

// --- STYLES (Sin cambios, solo para completar el archivo) ---
const Container = styled.div` display: flex; flex-direction: column; gap: 15px; animation: fadeIn 0.3s ease; margin-top: 10px; .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; h3 { font-size: 1.1rem; margin:0; color: ${({theme})=>theme.text}; } } .back-btn { background: none; border: none; color: ${v.colorPrincipal}; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: 600; } .empty { text-align: center; opacity: 0.6; margin-top: 20px; }`;
const BtnSmall = styled.button` background: ${({theme}) => theme.bgcards}; border: 1px solid ${({theme}) => theme.bg4}; color: ${({theme}) => theme.text}; padding: 6px 16px; border-radius: 12px; font-weight: 600; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); &:hover { background: ${v.colorPrincipal}; color: white; border-color: ${v.colorPrincipal}; transform: translateY(-2px); } svg { font-size: 1.1rem; }`;
const BtnToggle = styled(BtnSmall)` background: ${props => props.$active ? props.theme.bg3 : 'transparent'}; border-color: ${props => props.$active ? props.theme.text : props.theme.bg4}; opacity: ${props => props.$active ? 1 : 0.7};`;
const ListContainer = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const PlayerRow = styled.div` background: ${({theme}) => theme.bgtotal}; padding: 10px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid transparent; opacity: ${props => props.$isArchived ? 0.75 : 1}; filter: ${props => props.$isArchived ? 'grayscale(0.1)' : 'none'}; &:hover { border-color: ${({theme})=>theme.bg4}; opacity: 1; } .info { display: flex; gap: 12px; align-items: center; img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #eee; } .name { font-weight: 600; display: block; font-size: 0.95rem; text-decoration: ${props => props.$isArchived ? 'line-through' : 'none'}; } .details { font-size: 0.8rem; opacity: 0.7; } } .actions { display: flex; gap: 5px; .btn-icon { background: rgba(255,255,255,0.05); border: none; padding: 6px; border-radius: 6px; cursor: pointer; color: ${({theme})=>theme.text}; transition: 0.2s; &:hover { color: white; } &.edit:hover { background: ${v.colorPrincipal}; } &.archive:hover { background: #f39c12; } &.delete:hover { background: ${v.rojo}; } &.restore:hover { background: #27ae60; } } }`;
const DeleteContent = styled.div` text-align: center; padding: 10px; .warning-icon { font-size: 3rem; color: #f1c40f; margin-bottom: 10px; } p { margin: 0 0 20px 0; font-size: 1rem; color: ${({theme})=>theme.text}; } .sub { font-size: 0.85rem; opacity: 0.7; display: block; margin-top: 5px; } .modal-actions { display: flex; justify-content: center; gap: 15px; button { padding: 8px 20px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; &.cancel { background: ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; &:hover { background: ${({theme})=>theme.bg3}; } } &.confirm { background: ${v.rojo}; color: white; &:hover { opacity: 0.9; transform: translateY(-2px); } } &.archive { background: #f39c12; color: white; &:hover { opacity: 0.9; transform: translateY(-2px); } } } }`;
const Form = styled.form` display: flex; flex-direction: column; gap: 12px; .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } .grid-3 { display: grid; grid-template-columns: 0.6fr 1.2fr 1.2fr; gap: 10px; } .custom-select { width: 100%; padding: 12px; border-radius: 15px; background: ${({theme})=>theme.bgtotal}; color: ${({theme})=>theme.text}; border: 2px solid ${({theme})=>theme.color2}; outline: none; height: 100%; }`;
const shakeAnimation = keyframes` 0% { transform: translateX(0); } 25% { transform: translateX(-5px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-5px); } 100% { transform: translateX(0); } `;
const ErrorBadge = styled.span` position: absolute; top: -25px; left: 0; font-size: 0.75rem; font-weight: 700; color: #fff; background: #ff4b4b; padding: 4px 8px; border-radius: 4px; white-space: nowrap; z-index: 10; pointer-events: none; ${({ $shake }) => $shake ? css`animation: ${shakeAnimation} 0.4s ease-in-out;` : css`animation: fadeIn 0.3s ease-out;`} &::after { content: ''; position: absolute; bottom: -4px; left: 10px; border-width: 4px 4px 0; border-style: solid; border-color: #ff4b4b transparent transparent transparent; }`;
