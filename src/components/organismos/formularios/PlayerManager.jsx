import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes, css } from "styled-components";
import {
  RiArchiveLine,
  RiArrowLeftLine,
  RiDeleteBinLine,
  RiEditLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiEyeOffLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiUserAddLine,
} from "react-icons/ri";
import { v } from "../../../styles/variables";
import {
  InputText2,
  Btnsave,
  PhotoUploader,
  InputNumber,
  Skeleton,
  ContainerScroll,
  useSort,
  SortControl,
} from "../../../index";
import { Modal } from "../Modal";
import { useJugadoresStore } from "../../../store/JugadoresStore";
import { uploadImageToSupabase } from "../../../utils/uploadHandler";
import { submitDelegateChangeRequest } from "../../../services/delegates";
import { FIELD_LIMITS, validatePlayerForm } from "../../../utils/entityValidation";
import { maxLengthFeedback } from "../../../utils/maxLengthFeedback";

const POSITION_RANK = {
  Portero: 1,
  Defensa: 2,
  Medio: 3,
  Delantero: 4,
  "No especificada": 5,
};

const buildRequestKey = (prefix = "player") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const uploadPlayerPhoto = async ({ file, originalFile, leagueId, teamId, playerId }) => {
  if (!leagueId) throw new Error("No se pudo identificar la liga del jugador");

  return uploadImageToSupabase(
    file,
    originalFile,
    "logos",
    `players/${leagueId}/${teamId}/${playerId}`,
    {
      fileName: "crop.webp",
      originalFileName: "original.webp",
      upsert: true,
      cacheBuster: true,
      requireOriginal: true,
    }
  );
};

const uploadDelegatePlayerPhoto = async ({
  file,
  originalFile,
  leagueId,
  teamId,
  playerId,
  requestKey,
}) => {
  if (!leagueId) throw new Error("No se pudo identificar la liga del jugador");

  const pathKey = playerId || requestKey;

  return uploadImageToSupabase(
    file,
    originalFile,
    "logos",
    `players/${leagueId}/${teamId}/delegate-requests/${pathKey}`,
    {
      fileName: "crop.webp",
      originalFileName: "original.webp",
      upsert: true,
      cacheBuster: true,
      requireOriginal: true,
    }
  );
};

const buildPlayerPayload = ({
  form,
  photoUrl,
  originalPhotoUrl,
  isActive,
}) => ({
  first_name: form.first_name,
  last_name: form.last_name,
  dorsal: form.dorsal === "" ? null : Number(form.dorsal),
  position: form.position || "No especificada",
  birth_date: form.birth_date || null,
  curp_dni: form.curp_dni || null,
  photo_url: photoUrl,
  original_photo_url: originalPhotoUrl,
  is_active: isActive,
});

export function PlayerManager({
  teamId,
  leagueId,
  showToast,
  mode = "manager",
  onDelegateRequestSubmitted,
}) {
  const {
    jugadores,
    fetchJugadores,
    addJugador,
    updateJugador,
    deleteJugador,
    archivarJugador,
    restaurarJugador,
    isLoading,
  } = useJugadoresStore();

  const isDelegateMode = mode === "delegate";

  const [view, setView] = useState("list");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isManualArchiveOpen, setIsManualArchiveOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictPlayer, setConflictPlayer] = useState(null);
  const [preview, setPreview] = useState(null);
  const [croppedFile, setCroppedFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [dorsalError, setDorsalError] = useState("");
  const [shakeError, setShakeError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const isSavingRef = useRef(false);

  const initialForm = {
    first_name: "",
    last_name: "",
    dorsal: "",
    position: "No especificada",
    birth_date: "",
    curp_dni: "",
    photo_url: "",
    original_photo_url: "",
  };

  const [form, setForm] = useState(initialForm);

  const { items: sortedPlayers, requestSort, sortConfig } = useSort(jugadores, {
    key: "dorsal",
    direction: "ascending",
  });

  const sortOptions = [
    { label: "Dorsal", key: "dorsal" },
    { label: "Nombre", key: "first_name" },
    { label: "Posicion", key: "position", customOrder: POSITION_RANK },
  ];

  useEffect(() => {
    if (teamId) {
      fetchJugadores(teamId, !showArchived);
    }
  }, [fetchJugadores, showArchived, teamId]);

  useEffect(() => {
    if (!form.dorsal || !jugadores.length || showArchived) {
      setDorsalError("");
      return;
    }

    const duplicado = jugadores.find(
      (player) =>
        player.dorsal == form.dorsal &&
        (editingPlayer ? player.id !== editingPlayer.id : true)
    );

    if (duplicado) {
      setDorsalError(`Ocupado por ${duplicado.first_name}`);
    } else {
      setDorsalError("");
    }
  }, [editingPlayer, form.dorsal, jugadores, showArchived]);

  const handleToggleView = () => setShowArchived((current) => !current);
  const handleInputChange = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });

  const handleImageSelect = (cropFile, original, previewUrl) => {
    setCroppedFile(cropFile);
    setOriginalFile(original);
    setPreview(previewUrl);
  };

  const resetFormState = () => {
    setEditingPlayer(null);
    setForm(initialForm);
    setPreview(null);
    setCroppedFile(null);
    setOriginalFile(null);
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setForm({
      ...player,
      position: player.position || "No especificada",
      original_photo_url: player.original_photo_url || "",
    });
    setPreview(player.photo_url);
    setCroppedFile(null);
    setOriginalFile(null);
    setView("form");
  };

  const handleNew = () => {
    resetFormState();
    setView("form");
  };

  const openDeleteModal = (player) => {
    setSelectedPlayer(player);
    setIsDeleteModalOpen(true);
  };

  const openArchiveModal = (player) => {
    setSelectedPlayer(player);
    setIsManualArchiveOpen(true);
  };

  const runDelegatePlayerAction = async ({ actionType, playerId = null, payload = {} }) => {
    const result = await submitDelegateChangeRequest({
      teamId,
      entityType: "player",
      actionType,
      payload,
      playerId,
    });

    if (result.status === "applied") {
      await fetchJugadores(teamId, !showArchived);
    }

    onDelegateRequestSubmitted?.(result);

    return result;
  };

  const confirmManualArchive = async () => {
    if (!selectedPlayer) return;

    try {
      if (isDelegateMode) {
        const result = await runDelegatePlayerAction({
          actionType: "archive",
          playerId: selectedPlayer.id,
        });

        showToast?.(
          result.status === "pending"
            ? "Solicitud enviada para inhabilitar jugador"
            : "Jugador inhabilitado correctamente",
          "success"
        );
      } else {
        const result = await archivarJugador(selectedPlayer.id);
        if (!result.success) {
          throw new Error(result.message || "No se pudo inhabilitar.");
        }

        showToast?.("Jugador inhabilitado correctamente", "success");
      }

      setIsManualArchiveOpen(false);
      setSelectedPlayer(null);
    } catch (error) {
      showToast?.("Error: " + error.message, "error");
    }
  };

  const handleRestore = async (player) => {
    try {
      if (isDelegateMode) {
        const result = await runDelegatePlayerAction({
          actionType: "restore",
          playerId: player.id,
        });

        showToast?.(
          result.status === "pending"
            ? "Solicitud enviada para restaurar jugador"
            : "Jugador restaurado",
          "success"
        );
        return;
      }

      const result = await restaurarJugador(player.id);
      if (!result.success) throw new Error(result.message || "No se pudo restaurar.");
      showToast?.("Jugador restaurado", "success");
    } catch (error) {
      showToast?.("Error: " + error.message, "error");
    }
  };

  const confirmDelete = async () => {
    if (!selectedPlayer) return;

    try {
      const result = await deleteJugador(selectedPlayer.id);

      if (result.success) {
        setIsDeleteModalOpen(false);
        setSelectedPlayer(null);
        showToast?.("Jugador eliminado", "success");
      } else if (result.error === "CONFLICT") {
        setIsDeleteModalOpen(false);
        setConflictPlayer(selectedPlayer);
        setConflictModalOpen(true);
      } else {
        throw new Error(result.message || "No se pudo eliminar.");
      }
    } catch (error) {
      showToast?.("Error: " + error.message, "error");
    }
  };

  const handleConflictArchive = async () => {
    if (!conflictPlayer) return;

    try {
      const result = await archivarJugador(conflictPlayer.id);
      if (!result.success) {
        throw new Error(result.message || "No se pudo archivar.");
      }

      setConflictModalOpen(false);
      setConflictPlayer(null);
      setSelectedPlayer(null);
      showToast?.("Jugador archivado", "success");
    } catch (error) {
      showToast?.("Error: " + error.message, "error");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validation = validatePlayerForm(form);
    if (!validation.isValid) {
      showToast?.(Object.values(validation.errors)[0], "error");
      return;
    }
    const formToSave = validation.data;
    setForm(formToSave);

    if (dorsalError) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }

    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsUploading(true);

    try {
      let finalPhotoUrl = form.photo_url || null;
      let finalOriginalUrl = form.original_photo_url || null;

      if (!croppedFile && !preview && !form.photo_url) {
        finalPhotoUrl = null;
        finalOriginalUrl = null;
      }

      if (isDelegateMode) {
        if (croppedFile) {
          const uploadResult = await uploadDelegatePlayerPhoto({
            file: croppedFile,
            originalFile,
            leagueId,
            teamId,
            playerId: editingPlayer?.id || null,
            requestKey: buildRequestKey(editingPlayer ? "update" : "insert"),
          });

          finalPhotoUrl = uploadResult.url;
          finalOriginalUrl = uploadResult.originalUrl;
        }

        const payload = buildPlayerPayload({
          form: formToSave,
          photoUrl: finalPhotoUrl,
          originalPhotoUrl: finalOriginalUrl,
          isActive: true,
        });

        const result = await runDelegatePlayerAction({
          actionType: editingPlayer ? "update" : "insert",
          playerId: editingPlayer?.id || null,
          payload,
        });

        showToast?.(
          result.status === "pending"
            ? "Cambio enviado a aprobacion del manager"
            : editingPlayer
              ? "Jugador actualizado"
              : "Jugador creado",
          "success"
        );
      } else {
        const payload = {
          ...buildPlayerPayload({
            form: formToSave,
            photoUrl: finalPhotoUrl,
            originalPhotoUrl: finalOriginalUrl,
            isActive: true,
          }),
          team_id: teamId,
        };

        if (editingPlayer) {
          if (croppedFile) {
            const { url, originalUrl } = await uploadPlayerPhoto({
              file: croppedFile,
              originalFile,
              leagueId,
              teamId,
              playerId: editingPlayer.id,
            });

            payload.photo_url = url;
            payload.original_photo_url = originalUrl;
          }

          await updateJugador(editingPlayer.id, payload);
          showToast?.("Jugador actualizado", "success");
        } else {
          const savedPlayer = await addJugador(payload);

          if (croppedFile) {
            try {
              const { url, originalUrl } = await uploadPlayerPhoto({
                file: croppedFile,
                originalFile,
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

          showToast?.("Jugador creado", "success");
        }
      }

      resetFormState();
      setView("list");
    } catch (error) {
      showToast?.("Error al guardar: " + error.message, "error");
      console.error(error);
    } finally {
      isSavingRef.current = false;
      setIsUploading(false);
    }
  };

  const getOriginalUrlFromPreview = (url) => {
    if (editingPlayer?.original_photo_url) return editingPlayer.original_photo_url;
    if (!url) return null;
    if (url.includes("_crop")) return url.replace("_crop", "_original");
    return url;
  };

  if (view === "list") {
    return (
      <Container>
        <div className="header-actions list-header">
          <div className="header-copy">
            <h3>{showArchived ? "Inhabilitados" : `Plantilla (${jugadores.length})`}</h3>
            {isDelegateMode && (
              <DelegateHint>
                <RiShieldCheckLine />
                <span>Los cambios del delegado pasan por el flujo de aprobacion de la liga.</span>
              </DelegateHint>
            )}
          </div>

          <div className="header-buttons">
            <BtnToggle onClick={handleToggleView} $active={showArchived}>
              {showArchived ? <RiEyeLine /> : <RiEyeOffLine />}
              <span>{showArchived ? "Ver Activos" : "Ver Inhabilitados"}</span>
            </BtnToggle>
            {!showArchived && (
              <BtnSmall onClick={handleNew}>
                <RiUserAddLine /> <span>Agregar</span>
              </BtnSmall>
            )}
          </div>
        </div>

        {!isLoading && jugadores.length > 0 && (
          <SortControl
            options={sortOptions}
            currentSort={sortConfig}
            onSortChange={requestSort}
            showButtonTextOnMobile
          />
        )}

        <ContainerScroll $maxHeight="400px">
          <ListContainer>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  style={{ padding: 10, display: "flex", gap: 15, alignItems: "center" }}
                >
                  <Skeleton type="circle" width="40px" height="40px" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                    <Skeleton width="60%" height="14px" />
                    <Skeleton width="40%" height="10px" />
                  </div>
                </div>
              ))
            ) : (
              sortedPlayers.map((player) => (
                <PlayerRow key={player.id} $isArchived={showArchived}>
                  <div className="info">
                    <img
                      src={player.photo_url || "https://i.ibb.co/5vgZ0fX/hombre.png"}
                      alt="foto"
                    />
                    <div>
                      <span className="name">
                        {player.first_name} {player.last_name}
                      </span>
                      <span className="details">
                        #{player.dorsal} - {player.position || "No especificada"}
                      </span>
                    </div>
                  </div>

                  <div className="actions">
                    {showArchived ? (
                      <button
                        className="btn-icon restore"
                        onClick={() => handleRestore(player)}
                        title="Restaurar"
                        aria-label={`Restaurar a ${player.first_name} ${player.last_name}`}
                      >
                        <RiRefreshLine />
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn-icon edit"
                          onClick={() => handleEdit(player)}
                          title="Editar"
                          aria-label={`Editar a ${player.first_name} ${player.last_name}`}
                        >
                          <RiEditLine />
                        </button>
                        <button
                          className="btn-icon archive"
                          onClick={() => openArchiveModal(player)}
                          title="Inhabilitar"
                          aria-label={`Inhabilitar a ${player.first_name} ${player.last_name}`}
                        >
                          <RiArchiveLine />
                        </button>
                        {!isDelegateMode && (
                          <button
                            className="btn-icon delete"
                            onClick={() => openDeleteModal(player)}
                            title="Eliminar"
                            aria-label={`Eliminar a ${player.first_name} ${player.last_name}`}
                          >
                            <RiDeleteBinLine />
                          </button>
                        )}
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

        {!isDelegateMode && (
          <>
            <Modal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              title="Eliminar Jugador"
              width="min(400px, calc(100vw - 32px))"
            >
              <DeleteContent>
                <div className="warning-icon"><RiErrorWarningLine /></div>
                <p>
                  Eliminar a <b>{selectedPlayer?.first_name}</b>?
                  <br />
                  <span className="sub">Irreversible.</span>
                </p>
                <div className="modal-actions">
                  <button className="cancel" onClick={() => setIsDeleteModalOpen(false)}>
                    Cancelar
                  </button>
                  <button className="confirm" onClick={confirmDelete}>
                    Eliminar
                  </button>
                </div>
              </DeleteContent>
            </Modal>

            <Modal
              isOpen={conflictModalOpen}
              onClose={() => setConflictModalOpen(false)}
              title="No se puede eliminar"
              width="min(450px, calc(100vw - 32px))"
            >
              <DeleteContent>
                <div className="warning-icon" style={{ color: "#e67e22" }}>
                  <RiErrorWarningLine />
                </div>
                <p>El jugador <b>{conflictPlayer?.first_name}</b> tiene estadisticas.</p>
                <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "20px" }}>
                  Recomendamos <b>Archivar</b>.
                </p>
                <div className="modal-actions">
                  <button className="cancel" onClick={() => setConflictModalOpen(false)}>
                    Cancelar
                  </button>
                  <button className="archive" onClick={handleConflictArchive}>
                    <RiArchiveLine style={{ marginRight: 5 }} /> Archivar
                  </button>
                </div>
              </DeleteContent>
            </Modal>
          </>
        )}

        <Modal
          isOpen={isManualArchiveOpen}
          onClose={() => setIsManualArchiveOpen(false)}
          title="Inhabilitar Jugador"
          width="min(400px, calc(100vw - 32px))"
        >
          <DeleteContent>
            <div className="warning-icon" style={{ color: "#f39c12" }}>
              <RiArchiveLine />
            </div>
            <p>
              Inhabilitar a <b>{selectedPlayer?.first_name}</b>?
              <br />
              <span className="sub">Se ocultara, pero guarda estadisticas.</span>
            </p>
            <div className="modal-actions">
              <button className="cancel" onClick={() => setIsManualArchiveOpen(false)}>
                Cancelar
              </button>
              <button className="archive" onClick={confirmManualArchive}>
                Inhabilitar
              </button>
            </div>
          </DeleteContent>
        </Modal>
      </Container>
    );
  }

  return (
    <Container>
      <div className="header-actions form-header">
        <button className="back-btn" onClick={() => setView("list")}>
          <RiArrowLeftLine /> Volver
        </button>
        <h3>{editingPlayer ? "Editar Jugador" : "Nuevo Jugador"}</h3>
      </div>

      <Form onSubmit={handleSubmit}>
        <div className="photo-field">
          <span className="field-label">
            Foto del jugador <span className="field-optional">Opcional</span>
          </span>
          <PhotoUploader
            previewUrl={preview}
            originalUrl={getOriginalUrlFromPreview(preview)}
            originalFile={originalFile}
            onImageSelect={handleImageSelect}
            onClear={() => {
              setCroppedFile(null);
              setOriginalFile(null);
              setPreview(null);
              setForm((prev) => ({ ...prev, photo_url: "", original_photo_url: "" }));
            }}
            shape="circle"
            width="130px"
            height="130px"
            showToast={showToast}
          />
        </div>

        <div className="grid-2 player-name-fields">
          <div className="field-control">
            <label className="field-label" htmlFor="player-first-name">Nombres</label>
            <InputText2>
              <input
                id="player-first-name"
                className="form__field"
                name="first_name"
                placeholder="Ej. Diego"
                required
                value={form.first_name}
                onChange={handleInputChange}
                {...maxLengthFeedback(FIELD_LIMITS.playerFirstName)}
              />
            </InputText2>
          </div>
          <div className="field-control">
            <label className="field-label" htmlFor="player-last-name">Apellidos</label>
            <InputText2>
              <input
                id="player-last-name"
                className="form__field"
                name="last_name"
                placeholder="Ej. Hernández"
                required
                value={form.last_name}
                onChange={handleInputChange}
                {...maxLengthFeedback(FIELD_LIMITS.playerLastName)}
              />
            </InputText2>
          </div>
        </div>

        <div className="grid-3 player-detail-fields">
          <div className={`field-control dorsal-control ${dorsalError ? "has-error" : ""}`}>
            <label className="field-label" htmlFor="player-dorsal">Número de camiseta</label>
            {dorsalError && <ErrorBadge $shake={shakeError}>{dorsalError}</ErrorBadge>}
            <InputNumber
              id="player-dorsal"
              name="dorsal"
              placeholder="Ej. 10"
              value={form.dorsal}
              onChange={handleInputChange}
              {...maxLengthFeedback(FIELD_LIMITS.playerIdentity)}
              min={0}
              max={999}
            />
          </div>

          <div className="field-control select-wrap">
            <label className="field-label" htmlFor="player-position">Posición</label>
            <select
              id="player-position"
              name="position"
              value={form.position}
              onChange={handleInputChange}
              className="custom-select"
            >
              <option>No especificada</option>
              <option>Portero</option>
              <option>Defensa</option>
              <option>Medio</option>
              <option>Delantero</option>
            </select>
          </div>

          <div className="field-control">
            <label className="field-label" htmlFor="player-birth-date">Fecha de nacimiento</label>
            <InputText2>
              <input
                id="player-birth-date"
                className="form__field"
                type="date"
                name="birth_date"
                aria-describedby="player-birth-date-example"
                value={form.birth_date}
                onChange={handleInputChange}
              />
            </InputText2>
            <span id="player-birth-date-example" className="field-example">Ej. 15/08/2002</span>
          </div>
        </div>

        <div className="field-control identity-field">
          <label className="field-label" htmlFor="player-identity">CURP, DNI o identificador</label>
          <InputText2>
            <input
              id="player-identity"
              className="form__field"
              name="curp_dni"
              placeholder="Ej. HEMD900101HDFRZN01"
              value={form.curp_dni}
              onChange={handleInputChange}
            />
          </InputText2>
        </div>

        <Btnsave
          titulo={
            isUploading
              ? "Subiendo..."
              : isDelegateMode
                ? "Enviar cambios"
                : "Guardar Jugador"
          }
          disabled={isUploading}
          bgcolor={v.colorPrincipal}
          icono={<v.iconoguardar />}
          width="100%"
        />
      </Form>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  animation: fadeIn 0.3s ease;
  margin-top: 10px;
  min-width: 0;

  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    gap: 16px;

    h3 {
      font-size: 1.1rem;
      margin: 0;
      color: ${({ theme }) => theme.text};
    }
  }

  .header-copy {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .header-buttons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
  }

  .back-btn {
    background: none;
    border: none;
    color: ${v.colorPrincipal};
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    min-height: 44px;
    padding: 8px 4px;
    text-align: left;

    &:focus-visible {
      outline: 2px solid ${v.colorPrincipal};
      outline-offset: 3px;
      border-radius: 6px;
    }
  }

  .photo-field {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    justify-content: center;
    margin-bottom: 4px;
  }

  .empty {
    text-align: center;
    opacity: 0.6;
    margin-top: 20px;
  }

  @media (max-width: 559px) {
    gap: 12px;

    .header-actions {
      align-items: stretch;
      margin-bottom: 4px;
    }

    .list-header {
      flex-direction: column;
    }

    .form-header {
      flex-wrap: wrap;

      h3 {
        flex: 1 1 180px;
        align-self: center;
      }
    }

    .header-buttons {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      width: 100%;

      button {
        justify-content: center;
      }
    }

    .photo-field {
      margin-bottom: 0;
    }
  }
`;

const DelegateHint = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(28, 176, 246, 0.08);
  border: 1px solid rgba(28, 176, 246, 0.15);
  font-size: 0.8rem;
  line-height: 1.4;
  color: ${({ theme }) => theme.text};

  svg {
    color: ${v.colorPrincipal};
    flex-shrink: 0;
  }
`;

const BtnSmall = styled.button`
  background: ${({ theme }) => theme.bgcards};
  border: 1px solid ${({ theme }) => theme.bg4};
  color: ${({ theme }) => theme.text};
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);

  &:focus-visible {
    outline: 2px solid ${v.colorPrincipal};
    outline-offset: 2px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${v.colorPrincipal};
      color: white;
      border-color: ${v.colorPrincipal};
      transform: translateY(-2px);
    }
  }

  svg {
    font-size: 1.1rem;
  }

  span {
    display: inline;
    white-space: normal;
  }
`;

const BtnToggle = styled(BtnSmall)`
  background: ${(props) => (props.$active ? props.theme.bg3 : "transparent")};
  border-color: ${(props) => (props.$active ? props.theme.text : props.theme.bg4)};
  opacity: ${(props) => (props.$active ? 1 : 0.7)};
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PlayerRow = styled.div`
  background: ${({ theme }) => theme.bgtotal};
  padding: 10px;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid transparent;
  opacity: ${(props) => (props.$isArchived ? 0.75 : 1)};
  filter: ${(props) => (props.$isArchived ? "grayscale(0.1)" : "none")};

  &:hover {
    border-color: ${({ theme }) => theme.bg4};
    opacity: 1;
  }

  .info {
    display: flex;
    gap: 12px;
    align-items: center;
    min-width: 0;

    > div {
      min-width: 0;
    }

    img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      background: #eee;
    }

    .name {
      font-weight: 600;
      display: block;
      font-size: 0.95rem;
      text-decoration: ${(props) => (props.$isArchived ? "line-through" : "none")};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .details {
      font-size: 0.8rem;
      opacity: 0.7;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .actions {
    display: flex;
    gap: 5px;
    flex-shrink: 0;

    .btn-icon {
      background: rgba(255, 255, 255, 0.05);
      border: none;
      width: 40px;
      min-height: 40px;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      color: ${({ theme }) => theme.text};
      transition: 0.2s;
      display: grid;
      place-items: center;

      &:focus-visible {
        outline: 2px solid ${v.colorPrincipal};
        outline-offset: 2px;
      }

      @media (hover: hover) and (pointer: fine) {
        &:hover {
          color: white;
        }

        &.edit:hover {
          background: ${v.colorPrincipal};
        }

        &.archive:hover {
          background: #f39c12;
        }

        &.delete:hover {
          background: ${v.rojo};
        }

        &.restore:hover {
          background: #27ae60;
        }
      }
    }
  }

  @media (max-width: 559px) {
    padding: 10px;

    .actions {
      gap: 4px;

      .btn-icon {
        width: 44px;
        min-height: 44px;
      }
    }
  }
`;

const DeleteContent = styled.div`
  text-align: center;
  padding: 10px;

  .warning-icon {
    font-size: 3rem;
    color: #f1c40f;
    margin-bottom: 10px;
  }

  p {
    margin: 0 0 20px 0;
    font-size: 1rem;
    color: ${({ theme }) => theme.text};
  }

  .sub {
    font-size: 0.85rem;
    opacity: 0.7;
    display: block;
    margin-top: 5px;
  }

  .modal-actions {
    display: flex;
    justify-content: center;
    gap: 15px;

    button {
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: 0.2s;
      display: flex;
      align-items: center;

      &.cancel {
        background: ${({ theme }) => theme.bg4};
        color: ${({ theme }) => theme.text};

        &:hover {
          background: ${({ theme }) => theme.bg3};
        }
      }

      &.confirm {
        background: ${v.rojo};
        color: white;

        &:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }
      }

      &.archive {
        background: #f39c12;
        color: white;

        &:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }
      }
    }
  }

  @media (max-width: 380px) {
    padding: 4px;

    .modal-actions {
      flex-direction: column-reverse;
      gap: 8px;

      button {
        justify-content: center;
        min-height: 44px;
      }
    }
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;

  .field-control {
    min-width: 0;

    > div {
      margin-bottom: 0;
    }
  }

  .field-label {
    display: block;
    margin: 0 0 6px;
    color: ${({ theme }) => theme.text};
    font-size: 0.85rem;
    font-weight: 700;
    line-height: 1.25;
  }

  .field-optional,
  .field-example {
    color: ${({ theme }) => theme.text};
    font-size: 0.78rem;
    font-weight: 500;
    opacity: 0.7;
  }

  .field-optional {
    margin-left: 4px;
  }

  .field-example {
    display: block;
    margin-top: 5px;
  }

  .photo-field {
    .field-label {
      margin-bottom: 0;
    }
  }

  .grid-2 {
    display: grid;
    gap: 10px;
  }

  .grid-3 {
    display: grid;
    gap: 10px;
  }

  .dorsal-control {
    position: relative;
  }

  .dorsal-control.has-error {
    padding-bottom: 26px;
  }

  .custom-select {
    width: 100%;
    padding: 12px;
    border-radius: 15px;
    background: ${({ theme }) => theme.bgtotal};
    color: ${({ theme }) => theme.text};
    border: 2px solid ${({ theme }) => theme.color2};
    outline: none;
    min-height: 48px;
    font-size: 16px;
    box-sizing: border-box;

    &:focus-visible {
      border-color: ${v.colorPrincipal};
    }
  }

  @media (max-width: 559px) {
    .grid-3 > div:first-child > div {
      width: 100%;
    }
  }

  @media (min-width: 560px) {
    .grid-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .grid-3 {
      grid-template-columns: minmax(128px, 0.7fr) minmax(0, 1fr) minmax(0, 1fr);
    }

    .identity-field {
      max-width: 32rem;
    }
  }
`;

const shakeAnimation = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
`;

const ErrorBadge = styled.span`
  position: absolute;
  top: calc(100% - 22px);
  left: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  background: #ff4b4b;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;

  ${({ $shake }) =>
    $shake
      ? css`
          animation: ${shakeAnimation} 0.4s ease-in-out;
        `
      : css`
          animation: fadeIn 0.3s ease-out;
        `}

  &::after {
    content: "";
    position: absolute;
    top: -4px;
    left: 10px;
    border-width: 0 4px 4px;
    border-style: solid;
    border-color: transparent transparent #ff4b4b transparent;
  }
`;
