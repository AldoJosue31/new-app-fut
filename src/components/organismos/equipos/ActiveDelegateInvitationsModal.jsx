import React, { useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  RiArrowDownSLine,
  RiArrowUpDownLine,
  RiArrowUpSLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiEditLine,
  RiFileCopyLine,
  RiQrCodeLine,
  RiRefreshLine,
  RiTimeLine,
} from "react-icons/ri";
import { Toast } from "../../atomos/Toast";
import { ConfirmModal } from "../ConfirmModal";
import { Modal } from "../Modal";
import {
  deleteDelegateInvitation,
  reactivateExpiredDelegateInvitation,
  updateDelegateInvitation,
} from "../../../services/delegates";
import { v } from "../../../styles/variables";

const statusDefinitions = {
  active: { label: "Activa", rank: 0, color: v.verde },
  used: { label: "Usada", rank: 1, color: v.colorPrincipal },
  expired: { label: "Caducada", rank: 2, color: "#f39c12" },
  revoked: { label: "Revocada", rank: 3, color: v.rojo },
};

const invitationCollator = new Intl.Collator("es", {
  sensitivity: "base",
  numeric: true,
});

const getInvitationStatus = (invitation, now) => {
  if (invitation.is_used) return "used";
  if (invitation.revoked_at) return "revoked";
  if (new Date(invitation.expires_at).getTime() <= now) return "expired";
  return "active";
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatRemainingTime = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");

  return days > 0 ? `${days} d ${clock}` : clock;
};

const getDurationStart = (invitation) =>
  new Date(invitation.duration_started_at || invitation.created_at).getTime();

const getProgress = (invitation, now) => {
  const startedAt = getDurationStart(invitation);
  const expiresAt = new Date(invitation.expires_at).getTime();
  const totalDuration = expiresAt - startedAt;

  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 0;
  return Math.min(1, Math.max(0, (expiresAt - now) / totalDuration));
};

const getProgressColor = (progress) => {
  if (progress <= 0.2) return v.rojo;
  if (progress <= 0.5) return "#f3a712";
  return v.verde;
};

const toDateTimeLocal = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const getRestartedExpiration = (invitation) => {
  const startedAt = getDurationStart(invitation);
  const expiresAt = new Date(invitation.expires_at).getTime();
  const originalDuration = Math.min(
    365 * 24 * 60 * 60 * 1000,
    Math.max(5 * 60 * 1000, expiresAt - startedAt)
  );

  return new Date(Date.now() + originalDuration).toISOString();
};

const copyText = async (value) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const temporaryInput = document.createElement("textarea");
  temporaryInput.value = value;
  temporaryInput.setAttribute("readonly", "");
  temporaryInput.style.position = "fixed";
  temporaryInput.style.opacity = "0";
  document.body.appendChild(temporaryInput);
  temporaryInput.select();
  document.execCommand("copy");
  temporaryInput.remove();
};

const RealtimeProgressFill = React.memo(function RealtimeProgressFill({
  invitation,
  animationStart,
}) {
  const initialProgress = getProgress(invitation, animationStart);
  const remaining = Math.max(
    0,
    new Date(invitation.expires_at).getTime() - animationStart
  );

  return (
    <ProgressFill
      $color={getProgressColor(initialProgress)}
      initial={{ scaleX: initialProgress }}
      animate={{ scaleX: 0 }}
      transition={{ duration: remaining / 1000, ease: "linear" }}
    />
  );
}, (previous, next) =>
  previous.invitation.id === next.invitation.id &&
  previous.invitation.duration_started_at ===
    next.invitation.duration_started_at &&
  previous.invitation.created_at === next.invitation.created_at &&
  previous.invitation.expires_at === next.invitation.expires_at
);

function SortableHeader({ column, label, sort, onSort, className }) {
  const isActive = sort.key === column;
  const ariaSort = isActive
    ? sort.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th scope="col" aria-sort={ariaSort} className={className}>
      <SortButton type="button" onClick={() => onSort(column)}>
        <span>{label}</span>
        {isActive ? (
          sort.direction === "asc" ? (
            <RiArrowUpSLine aria-hidden="true" />
          ) : (
            <RiArrowDownSLine aria-hidden="true" />
          )
        ) : (
          <RiArrowUpDownLine aria-hidden="true" />
        )}
      </SortButton>
    </th>
  );
}

function InvitationEditModal({ invitation, teamName, onClose, onSaved }) {
  const [form, setForm] = useState({
    invitedName: "",
    invitedEmail: "",
    invitedPhone: "",
    expiresAt: "",
  });
  const [restartDuration, setRestartDuration] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!invitation) return;

    const inactive =
      invitation.revoked_at ||
      new Date(invitation.expires_at).getTime() <= Date.now();
    const expiresAt = inactive
      ? getRestartedExpiration(invitation)
      : invitation.expires_at;

    setForm({
      invitedName: invitation.invited_name || "",
      invitedEmail: invitation.invited_email || "",
      invitedPhone: invitation.invited_phone || "",
      expiresAt: toDateTimeLocal(expiresAt),
    });
    setRestartDuration(Boolean(inactive));
    setFormError("");
  }, [invitation]);

  if (!invitation) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));

    if (name === "expiresAt") setRestartDuration(false);
  };

  const handleRestart = () => {
    setRestartDuration(true);
    setForm((current) => ({
      ...current,
      expiresAt: toDateTimeLocal(getRestartedExpiration(invitation)),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!restartDuration && !form.expiresAt) {
      setFormError("Selecciona una fecha de vencimiento válida.");
      return;
    }

    setSaving(true);
    try {
      const selectedExpiration = new Date(form.expiresAt).getTime();
      const currentExpiration = new Date(invitation.expires_at).getTime();
      const expirationChanged =
        !restartDuration &&
        Math.abs(selectedExpiration - currentExpiration) >= 60_000;

      await updateDelegateInvitation({
        invitationId: invitation.id,
        invitedName: form.invitedName.trim(),
        invitedEmail: form.invitedEmail.trim(),
        invitedPhone: form.invitedPhone.trim(),
        expiresAt: restartDuration
          ? null
          : expirationChanged
            ? new Date(form.expiresAt).toISOString()
            : null,
        restartDuration,
      });
      await onSaved();
    } catch (error) {
      setFormError(error.message || "No se pudo actualizar la invitación.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={saving ? undefined : onClose}
      title={`Editar invitación · ${teamName}`}
      width="640px"
      bodyPadding="20px"
      closeOnOverlayClick={!saving}
    >
      <EditForm onSubmit={handleSubmit}>
        <EditIntro>
          Los datos son sugerencias para el registro. Si reactivas una invitación
          caducada o revocada, cualquier otra invitación activa del equipo dejará
          de funcionar.
        </EditIntro>

        <FieldsGrid>
          <Field>
            <label htmlFor="edit-invitation-name">Nombre sugerido</label>
            <input
              id="edit-invitation-name"
              name="invitedName"
              value={form.invitedName}
              onChange={handleChange}
              maxLength={120}
              placeholder="Nombre del delegado"
            />
          </Field>

          <Field>
            <label htmlFor="edit-invitation-email">Correo sugerido</label>
            <input
              id="edit-invitation-email"
              name="invitedEmail"
              type="email"
              value={form.invitedEmail}
              onChange={handleChange}
              maxLength={254}
              placeholder="delegado@correo.com"
            />
          </Field>

          <Field>
            <label htmlFor="edit-invitation-phone">Número sugerido</label>
            <input
              id="edit-invitation-phone"
              name="invitedPhone"
              type="tel"
              value={form.invitedPhone}
              onChange={handleChange}
              maxLength={30}
              placeholder="Número de contacto"
            />
          </Field>

          <Field>
            <label htmlFor="edit-invitation-expiration">Vencimiento</label>
            <input
              id="edit-invitation-expiration"
              name="expiresAt"
              type="datetime-local"
              value={form.expiresAt}
              onChange={handleChange}
              min={toDateTimeLocal(Date.now() + 2 * 60 * 1000)}
              required={!restartDuration}
            />
          </Field>
        </FieldsGrid>

        <RestartRow>
          <button type="button" onClick={handleRestart}>
            <RiRefreshLine aria-hidden="true" />
            Reiniciar duración original
          </button>
          <span>
            {restartDuration
              ? `Nuevo vencimiento estimado: ${formatDate(
                  new Date(form.expiresAt).toISOString()
                )}`
              : "También puedes elegir manualmente una nueva fecha y hora."}
          </span>
        </RestartRow>

        {formError && <FormError role="alert">{formError}</FormError>}

        <EditActions>
          <button type="button" className="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </EditActions>
      </EditForm>
    </Modal>
  );
}

export function ActiveDelegateInvitationsModal({
  isOpen,
  onClose,
  invitations = [],
  teams = [],
  loading = false,
  error = "",
  onInvitationUpdated,
  showBasicInvitationFooter = false,
  basicInvitationTeamsCount = 0,
  generatingBasicInvitations = false,
  onGenerateBasicInvitations,
  onDismissBasicInvitationFooter,
}) {
  const [now, setNow] = useState(() => Date.now());
  const [sort, setSort] = useState({ key: "status", direction: "asc" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingInvitation, setEditingInvitation] = useState(null);
  const [deletingInvitation, setDeletingInvitation] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reactivatingInvitationId, setReactivatingInvitationId] =
    useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const reactivatingInvitationRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return undefined;

    const refreshClock = () => setNow(Date.now());
    const initialTickId = window.setTimeout(refreshClock, 0);
    const intervalId = window.setInterval(refreshClock, 1000);

    return () => {
      window.clearTimeout(initialTickId);
      window.clearInterval(intervalId);
    };
  }, [isOpen]);

  const teamNames = useMemo(
    () => new Map(teams.map((team) => [String(team.id), team.name])),
    [teams]
  );

  const invitationRows = useMemo(
    () =>
      invitations.map((invitation) => {
        const status = getInvitationStatus(invitation, now);
        return {
          ...invitation,
          status,
          teamName:
            teamNames.get(String(invitation.team_id)) || "Equipo no disponible",
          remaining: Math.max(
            0,
            new Date(invitation.expires_at).getTime() - now
          ),
        };
      }),
    [invitations, now, teamNames]
  );

  const filteredInvitations = useMemo(
    () =>
      statusFilter === "all"
        ? invitationRows
        : invitationRows.filter(
            (invitation) => invitation.status === statusFilter
          ),
    [invitationRows, statusFilter]
  );

  const sortedInvitations = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;

    return [...filteredInvitations].sort((first, second) => {
      let comparison = 0;

      if (sort.key === "team") {
        comparison = invitationCollator.compare(first.teamName, second.teamName);
      } else if (sort.key === "delegate") {
        comparison = invitationCollator.compare(
          first.invited_name || first.invited_email || "",
          second.invited_name || second.invited_email || ""
        );
      } else if (sort.key === "status") {
        comparison =
          statusDefinitions[first.status].rank -
          statusDefinitions[second.status].rank;
      } else if (sort.key === "expiration") {
        comparison =
          new Date(first.expires_at).getTime() -
          new Date(second.expires_at).getTime();
      } else if (sort.key === "remaining") {
        comparison = first.remaining - second.remaining;
      }

      if (comparison === 0) {
        comparison =
          new Date(first.expires_at).getTime() -
          new Date(second.expires_at).getTime();
      }

      return comparison * direction;
    });
  }, [filteredInvitations, sort]);

  const counts = useMemo(
    () =>
      invitationRows.reduce(
        (result, invitation) => ({
          ...result,
          [invitation.status]: result[invitation.status] + 1,
        }),
        { active: 0, used: 0, expired: 0, revoked: 0 }
      ),
    [invitationRows]
  );

  const handleSort = (key) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleStatusFilter = (status) => {
    setStatusFilter((current) => (current === status ? "all" : status));
  };

  const handleCopy = async (invitation) => {
    const invitationUrl = `${window.location.origin}/delegate/invitation/${invitation.token}`;

    try {
      await copyText(invitationUrl);
      setToast({
        show: true,
        message:
          invitation.status === "active"
            ? "Enlace de invitación copiado."
            : "Enlace copiado. Esta invitación ya no está activa.",
        type: "success",
      });
    } catch {
      setToast({
        show: true,
        message: "No se pudo copiar el enlace.",
        type: "error",
      });
    }
  };

  const handleSaved = async () => {
    await onInvitationUpdated?.();
    setEditingInvitation(null);
    setToast({
      show: true,
      message: "Invitación actualizada correctamente.",
      type: "success",
    });
  };

  const handleDeleteInvitation = async () => {
    if (!deletingInvitation?.id) return;

    setDeleting(true);
    try {
      await deleteDelegateInvitation(deletingInvitation.id);
      await onInvitationUpdated?.();
      setDeletingInvitation(null);
      setToast({
        show: true,
        message: "Invitación eliminada permanentemente.",
        type: "success",
      });
    } catch (deleteError) {
      setToast({
        show: true,
        message:
          deleteError.message || "No se pudo eliminar la invitación.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleReactivateExpiredInvitation = async (invitation) => {
    if (!invitation?.id || reactivatingInvitationRef.current) return;

    reactivatingInvitationRef.current = invitation.id;
    setReactivatingInvitationId(invitation.id);

    try {
      await reactivateExpiredDelegateInvitation(invitation.id);
      await onInvitationUpdated?.();
      setToast({
        show: true,
        message: "Invitación reactivada por 3 días.",
        type: "success",
      });
    } catch (reactivationError) {
      setToast({
        show: true,
        message:
          reactivationError.message || "No se pudo reactivar la invitación.",
        type: "error",
      });
    } finally {
      reactivatingInvitationRef.current = null;
      setReactivatingInvitationId(null);
    }
  };

  const handleClose = () => {
    setEditingInvitation(null);
    setDeletingInvitation(null);
    onClose();
  };
  const hasSingleBasicInvitation = basicInvitationTeamsCount === 1;

  return (
    <>
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Invitaciones de delegados"
        width="1180px"
        maxHeight="calc(100dvh - 32px)"
        bodyPadding="0"
        bodyOverflowY="hidden"
      >
        <ModalContent>
          <Summary>
            <div className="summary-copy">
              <strong>
                {loading
                  ? "Consultando invitaciones"
                  : statusFilter === "all"
                    ? `${invitationRows.length} invitaciones en el historial`
                    : `Mostrando ${filteredInvitations.length} de ${invitationRows.length} invitaciones`}
              </strong>
              <p>
                Los cambios se muestran en tiempo real. Las invitaciones usadas,
                revocadas o caducadas se eliminan automáticamente después de 14
                días.
              </p>
            </div>

            {!loading && invitationRows.length > 0 && (
              <StatusSummary aria-label="Filtrar invitaciones por estado">
                {Object.entries(statusDefinitions).map(([status, definition]) => (
                  <button
                    key={status}
                    type="button"
                    style={{ "--status-color": definition.color }}
                    aria-pressed={statusFilter === status}
                    onClick={() => handleStatusFilter(status)}
                    title={
                      statusFilter === status
                        ? `Quitar filtro ${definition.label}`
                        : `Mostrar invitaciones ${definition.label.toLowerCase()}`
                    }
                  >
                    <i
                      style={{ backgroundColor: definition.color }}
                      aria-hidden="true"
                    />
                    {definition.label} {counts[status]}
                  </button>
                ))}
              </StatusSummary>
            )}
          </Summary>

          {error ? (
            <Status role="alert">
              <strong>No pudimos cargar las invitaciones</strong>
              <span>{error}</span>
              <small>La conexión volverá a intentarlo automáticamente.</small>
            </Status>
          ) : loading ? (
            <TableScroll aria-label="Cargando invitaciones">
              <InvitationsTable>
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Delegado</th>
                    <th>Estado</th>
                    <th>Vencimiento</th>
                    <th>Tiempo restante</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={6}>
                        <SkeletonRow />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </InvitationsTable>
            </TableScroll>
          ) : invitationRows.length === 0 ? (
            <EmptyState>
              <RiTimeLine aria-hidden="true" />
              <strong>No hay invitaciones</strong>
              <p>
                Cuando generes una invitación para un delegado aparecerá aquí,
                incluso después de utilizarse o caducar.
              </p>
            </EmptyState>
          ) : (
            <TableScroll>
              <InvitationsTable>
                <thead>
                  <tr>
                    <SortableHeader
                      column="team"
                      label="Equipo"
                      sort={sort}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      column="delegate"
                      label="Delegado"
                      sort={sort}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      column="status"
                      label="Estado"
                      sort={sort}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      column="expiration"
                      label="Vencimiento"
                      sort={sort}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      column="remaining"
                      label="Tiempo restante"
                      sort={sort}
                      onSort={handleSort}
                    />
                    <th scope="col" className="actions-heading">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvitations.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <FilteredEmpty>
                          <span>No hay invitaciones con el estado seleccionado.</span>
                          <button
                            type="button"
                            onClick={() => setStatusFilter("all")}
                          >
                            Ver todas
                          </button>
                        </FilteredEmpty>
                      </td>
                    </tr>
                  )}
                  {sortedInvitations.map((invitation) => {
                    const status = statusDefinitions[invitation.status];
                    const progress = getProgress(invitation, now);
                    const remainingLabel = formatRemainingTime(invitation.remaining);

                    return (
                      <tr key={invitation.id}>
                        <td>
                          <TeamName title={invitation.teamName}>
                            {invitation.teamName}
                          </TeamName>
                        </td>
                        <td>
                          <DelegateInfo>
                            <span>
                              {invitation.invited_name || "Sin nombre sugerido"}
                            </span>
                            {invitation.invited_email && (
                              <small>{invitation.invited_email}</small>
                            )}
                            {invitation.invited_phone && (
                              <small>{invitation.invited_phone}</small>
                            )}
                          </DelegateInfo>
                        </td>
                        <td>
                          <StatusPill $color={status.color}>{status.label}</StatusPill>
                        </td>
                        <td>
                          <ExpirationDate>
                            {formatDate(invitation.expires_at)}
                          </ExpirationDate>
                        </td>
                        <td>
                          {invitation.status === "active" ? (
                            <RemainingCell>
                              <div className="remaining-label">
                                <RiTimeLine aria-hidden="true" />
                                <strong>{remainingLabel}</strong>
                              </div>
                              <ProgressTrack
                                role="progressbar"
                                aria-label={`Tiempo restante para ${invitation.teamName}`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(progress * 100)}
                                aria-valuetext={remainingLabel}
                              >
                                {shouldReduceMotion ? (
                                  <ProgressFill
                                    $color={getProgressColor(progress)}
                                    initial={false}
                                    animate={{ scaleX: progress }}
                                    transition={{ duration: 0 }}
                                  />
                                ) : (
                                  <RealtimeProgressFill
                                    invitation={invitation}
                                    animationStart={now}
                                  />
                                )}
                              </ProgressTrack>
                            </RemainingCell>
                          ) : (
                            <InactiveTime>
                              {invitation.status === "used" && invitation.used_at
                                ? `Usada ${formatDate(invitation.used_at)}`
                                : "Sin tiempo restante"}
                            </InactiveTime>
                          )}
                        </td>
                        <td>
                          <RowActions>
                            <button
                              type="button"
                              onClick={() => handleCopy(invitation)}
                              aria-label={`Copiar enlace de ${invitation.teamName}`}
                              title="Copiar enlace"
                            >
                              <RiFileCopyLine aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingInvitation(invitation)}
                              disabled={invitation.status === "used"}
                              aria-label={`Editar invitación de ${invitation.teamName}`}
                              title={
                                invitation.status === "used"
                                  ? "Las invitaciones usadas no se pueden editar"
                                  : "Editar invitación"
                              }
                            >
                              <RiEditLine aria-hidden="true" />
                            </button>
                            {invitation.status === "expired" && (
                              <button
                                type="button"
                                className="reactivate"
                                onClick={() =>
                                  handleReactivateExpiredInvitation(invitation)
                                }
                                disabled={Boolean(reactivatingInvitationId)}
                                aria-busy={
                                  reactivatingInvitationId === invitation.id
                                }
                                aria-label={`Reactivar por 3 días la invitación de ${invitation.teamName}`}
                                title="Reactivar por 3 días"
                              >
                                <RiRefreshLine
                                  className={
                                    reactivatingInvitationId === invitation.id
                                      ? "is-spinning"
                                      : undefined
                                  }
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                            {invitation.status !== "active" && (
                              <button
                                type="button"
                                className="danger"
                                onClick={() => setDeletingInvitation(invitation)}
                                disabled={
                                  reactivatingInvitationId === invitation.id
                                }
                                aria-label={`Eliminar invitación ${status.label.toLowerCase()} de ${invitation.teamName}`}
                                title={`Eliminar invitación ${status.label.toLowerCase()}`}
                              >
                                <RiDeleteBin6Line aria-hidden="true" />
                              </button>
                            )}
                          </RowActions>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </InvitationsTable>
            </TableScroll>
          )}

          <AnimatePresence initial={false}>
            {showBasicInvitationFooter && (
              <BasicInvitationFooter
                key="basic-delegate-invitations"
                role="region"
                aria-label="Crear invitaciones para equipos pendientes"
                initial={
                  shouldReduceMotion ? false : { opacity: 0, y: 8 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <BasicInvitationIcon aria-hidden="true">
                  <RiQrCodeLine />
                </BasicInvitationIcon>

                <BasicInvitationCopy>
                  <strong>
                    {hasSingleBasicInvitation
                      ? "Hay 1 equipo sin cuenta de delegado vinculada ni invitación activa"
                      : `Hay ${basicInvitationTeamsCount} equipos sin cuenta de delegado vinculada ni invitación activa`}
                  </strong>
                  <p>
                    {hasSingleBasicInvitation
                      ? "El nombre registrado no cuenta como vínculo. ¿Quieres crearle su enlace? "
                      : "Los nombres registrados no cuentan como vínculo. ¿Quieres crearles su enlace? "}
                    {hasSingleBasicInvitation
                      ? "Se generará sin nombre, número ni correo sugeridos, con vencimiento predeterminado de 7 días."
                      : "Se generarán sin nombre, número ni correo sugeridos, con vencimiento predeterminado de 7 días."}
                  </p>
                </BasicInvitationCopy>

                <BasicInvitationActions>
                  <GenerateBasicInvitationsButton
                    type="button"
                    onClick={onGenerateBasicInvitations}
                    disabled={
                      generatingBasicInvitations ||
                      !onGenerateBasicInvitations
                    }
                    aria-busy={generatingBasicInvitations}
                  >
                    {generatingBasicInvitations && (
                      <LoadingCircle aria-hidden="true" />
                    )}
                    <span aria-live="polite">
                      {generatingBasicInvitations
                        ? "Generando invitaciones…"
                        : hasSingleBasicInvitation
                          ? "Crear invitación"
                          : `Crear ${basicInvitationTeamsCount} invitaciones`}
                    </span>
                  </GenerateBasicInvitationsButton>

                  <DismissBasicInvitationButton
                    type="button"
                    onClick={onDismissBasicInvitationFooter}
                    disabled={generatingBasicInvitations}
                    aria-label="Ocultar sugerencia"
                    title={
                      generatingBasicInvitations
                        ? "Espera a que termine la generación"
                        : "Ocultar sugerencia"
                    }
                  >
                    <RiCloseLine aria-hidden="true" />
                  </DismissBasicInvitationButton>
                </BasicInvitationActions>
              </BasicInvitationFooter>
            )}
          </AnimatePresence>
        </ModalContent>
      </Modal>

      <InvitationEditModal
        invitation={isOpen ? editingInvitation : null}
        teamName={
          editingInvitation
            ? teamNames.get(String(editingInvitation.team_id)) ||
              "Equipo no disponible"
            : ""
        }
        onClose={() => setEditingInvitation(null)}
        onSaved={handleSaved}
      />

      <ConfirmModal
        isOpen={isOpen && Boolean(deletingInvitation)}
        onClose={() => {
          if (!deleting) setDeletingInvitation(null);
        }}
        onConfirm={handleDeleteInvitation}
        title={`Eliminar invitación ${
          deletingInvitation?.status
            ? statusDefinitions[
                deletingInvitation.status
              ].label.toLowerCase()
            : ""
        }`}
        message={`¿Eliminar permanentemente la invitación de ${
          deletingInvitation?.teamName || "este equipo"
        }?`}
        subMessage="Se borrará definitivamente de la base de datos. Esta acción no desvincula al delegado del equipo."
        confirmText={deleting ? "Eliminando…" : "Eliminar invitación"}
        confirmIcon={<RiDeleteBin6Line />}
        confirmDisabled={deleting}
        thinButtons
      />
    </>
  );
}

const ModalContent = styled.div`
  display: flex;
  min-height: 420px;
  max-height: calc(100dvh - 106px);
  flex-direction: column;
`;

const Summary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bgtotal};

  .summary-copy {
    min-width: 0;
  }

  strong {
    display: block;
    line-height: 1.3;
  }

  p {
    max-width: 65ch;
    margin: 3px 0 0;
    font-size: 0.875rem;
    line-height: 1.45;
    opacity: 0.78;
  }

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
`;

const StatusSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px 14px;
  flex: 0 0 auto;

  button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 8px;
    background: transparent;
    color: ${({ theme }) => theme.text};
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    transition: border-color 160ms ease, background 160ms ease,
      color 160ms ease;
  }

  button:hover,
  button[aria-pressed="true"] {
    border-color: var(--status-color);
    background: color-mix(in srgb, var(--status-color) 10%, transparent);
  }

  button[aria-pressed="true"] {
    color: var(--status-color);
  }

  button:focus-visible {
    outline: 2px solid ${v.colorPrincipal};
    outline-offset: 2px;
  }

  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
`;

const rotateLoader = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const BasicInvitationFooter = styled(motion.aside)`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  padding: 13px 16px;
  border-top: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bgtotal};

  @media (max-width: 640px) {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    padding: 12px;
  }
`;

const BasicInvitationIcon = styled.span`
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(28, 176, 246, 0.12);
  color: ${v.colorPrincipal};
  font-size: 1.1rem;
`;

const BasicInvitationCopy = styled.div`
  min-width: 0;

  strong {
    display: block;
    font-size: 0.86rem;
    line-height: 1.35;
    text-wrap: pretty;
  }

  p {
    max-width: 76ch;
    margin: 3px 0 0;
    font-size: 0.75rem;
    line-height: 1.45;
    opacity: 0.76;
    text-wrap: pretty;
  }
`;

const BasicInvitationActions = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;

  @media (max-width: 640px) {
    grid-column: 1 / -1;
    width: 100%;
  }
`;

const GenerateBasicInvitationsButton = styled.button`
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 13px;
  border: 1px solid ${v.colorPrincipal};
  border-radius: 10px;
  background: ${v.colorPrincipal};
  color: #fff;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 750;
  white-space: nowrap;
  cursor: pointer;
  transition:
    filter 160ms ease,
    transform 120ms ease,
    opacity 160ms ease;

  &:hover:not(:disabled) {
    filter: brightness(0.94);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid ${v.colorPrincipal};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  @media (max-width: 640px) {
    flex: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const DismissBasicInvitationButton = styled.button`
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: ${({ theme }) => theme.text};
  font-size: 1.08rem;
  cursor: pointer;
  opacity: 0.62;
  transition:
    background 160ms ease,
    opacity 160ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.bg4};
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${v.colorPrincipal};
    outline-offset: 1px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.3;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const LoadingCircle = styled.span`
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  border: 2px solid rgba(255, 255, 255, 0.48);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${rotateLoader} 700ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const FilteredEmpty = styled.div`
  display: flex;
  min-height: 140px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 0.82rem;
  opacity: 0.78;

  button {
    padding: 6px 9px;
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 8px;
    background: ${({ theme }) => theme.bgcards};
    color: ${v.colorPrincipal};
    font: inherit;
    font-weight: 750;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 2px solid ${v.colorPrincipal};
    outline-offset: 2px;
  }

  @media (max-width: 540px) {
    flex-direction: column;
  }
`;

const TableScroll = styled.div`
  flex: 1;
  min-height: 0;
  width: calc(100% - 32px);
  margin: 12px 16px 16px;
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    width: 5px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
    margin: 5px 0;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background: ${({ theme }) => theme.colorScroll};
    transition: background 0.3s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.text};
  }

  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.colorScroll} transparent;

  @media (max-width: 640px) {
    width: calc(100% - 24px);
    margin: 8px 12px 12px;
  }
`;

const InvitationsTable = styled.table`
  width: 100%;
  min-width: 1050px;
  border-collapse: separate;
  border-spacing: 0;
  font-variant-numeric: tabular-nums;

  th,
  td {
    padding: 13px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
    text-align: left;
    vertical-align: middle;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: ${({ theme }) => theme.bgcards};
    font-size: 0.75rem;
    font-weight: 800;
    color: ${({ theme }) => theme.text};
  }

  th:first-child,
  td:first-child {
    padding-left: 16px;
  }

  th:nth-child(1) {
    width: 17%;
  }

  th:nth-child(2) {
    width: 20%;
  }

  th:nth-child(3) {
    width: 10%;
  }

  th:nth-child(4) {
    width: 15%;
  }

  th:nth-child(5) {
    width: 28%;
  }

  th:last-child,
  td:last-child {
    width: 10%;
    padding-right: 16px;
    text-align: right;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tbody tr:hover {
    background: rgba(28, 176, 246, 0.035);
  }

  .actions-heading {
    text-align: right;
  }
`;

const SortButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 3px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: inherit;
  cursor: pointer;

  svg {
    flex: 0 0 auto;
    font-size: 1rem;
    opacity: 0.72;
  }

  &:hover {
    color: ${v.colorPrincipal};
  }

  &:focus-visible {
    outline: 2px solid ${v.colorPrincipal};
    outline-offset: 1px;
  }
`;

const TeamName = styled.strong`
  display: block;
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
`;

const DelegateInfo = styled.div`
  display: grid;
  gap: 2px;
  max-width: 230px;

  span,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    font-size: 0.85rem;
    font-weight: 650;
  }

  small {
    font-size: 0.72rem;
    opacity: 0.7;
  }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
`;

const ExpirationDate = styled.span`
  display: block;
  font-size: 0.78rem;
  line-height: 1.4;
  opacity: 0.82;
`;

const RemainingCell = styled.div`
  display: grid;
  min-width: 220px;
  gap: 8px;

  .remaining-label {
    display: flex;
    align-items: center;
    gap: 7px;
    color: ${({ theme }) => theme.text};
  }

  .remaining-label svg {
    color: ${v.colorPrincipal};
  }

  .remaining-label strong {
    font-size: 0.82rem;
    line-height: 1;
  }
`;

const InactiveTime = styled.span`
  display: block;
  max-width: 220px;
  font-size: 0.75rem;
  line-height: 1.4;
  opacity: 0.62;
`;

const ProgressTrack = styled.div`
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: ${({ theme }) => theme.bg4};
`;

const ProgressFill = styled(motion.div)`
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: ${({ $color }) => $color};
  transform-origin: left center;
`;

const RowActions = styled.div`
  display: inline-flex;
  justify-content: flex-end;
  gap: 6px;

  button {
    display: inline-flex;
    width: 34px;
    height: 34px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 9px;
    background: ${({ theme }) => theme.bgcards};
    color: ${({ theme }) => theme.text};
    font-size: 1rem;
    cursor: pointer;
    transition: border-color 160ms ease, color 160ms ease,
      background 160ms ease, transform 120ms ease;
  }

  button:hover:not(:disabled) {
    border-color: ${v.colorPrincipal};
    background: rgba(28, 176, 246, 0.08);
    color: ${v.colorPrincipal};
  }

  button.danger {
    color: ${v.rojo};
  }

  button.reactivate {
    color: ${v.verde};
  }

  button.reactivate:hover:not(:disabled) {
    border-color: ${v.verde};
    background: color-mix(in srgb, ${v.verde} 10%, transparent);
    color: ${v.verde};
  }

  button.danger:hover:not(:disabled) {
    border-color: ${v.rojo};
    background: rgba(245, 78, 65, 0.1);
    color: ${v.rojo};
  }

  svg.is-spinning {
    animation: ${rotateLoader} 700ms linear infinite;
  }

  button:active:not(:disabled) {
    transform: translateY(1px);
  }

  button:focus-visible {
    outline: 2px solid ${v.colorPrincipal};
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }

    svg.is-spinning {
      animation: none;
    }
  }
`;

const EditForm = styled.form`
  display: grid;
  gap: 18px;
`;

const EditIntro = styled.p`
  max-width: 65ch;
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.5;
  opacity: 0.76;
`;

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  gap: 6px;

  label {
    font-size: 0.78rem;
    font-weight: 750;
  }

  input {
    width: 100%;
    min-height: 42px;
    padding: 9px 11px;
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 10px;
    outline: none;
    background: ${({ theme }) => theme.bgtotal};
    color: ${({ theme }) => theme.text};
    font: inherit;
    font-size: 0.875rem;
  }

  input:focus {
    border-color: ${v.colorPrincipal};
    box-shadow: 0 0 0 3px rgba(28, 176, 246, 0.12);
  }
`;

const RestartRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.bgtotal};

  button {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 7px;
    padding: 8px 11px;
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 9px;
    background: ${({ theme }) => theme.bgcards};
    color: ${({ theme }) => theme.text};
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
  }

  button:hover {
    border-color: ${v.colorPrincipal};
    color: ${v.colorPrincipal};
  }

  span {
    font-size: 0.75rem;
    line-height: 1.4;
    opacity: 0.72;
  }

  @media (max-width: 580px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const FormError = styled.p`
  margin: 0;
  padding: 10px 12px;
  border-radius: 9px;
  background: rgba(231, 76, 60, 0.1);
  color: ${v.rojo};
  font-size: 0.8rem;
  font-weight: 650;
`;

const EditActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  button {
    min-height: 40px;
    padding: 8px 15px;
    border-radius: 10px;
    font: inherit;
    font-size: 0.84rem;
    font-weight: 750;
    cursor: pointer;
  }

  .secondary {
    border: 1px solid ${({ theme }) => theme.bg4};
    background: transparent;
    color: ${({ theme }) => theme.text};
  }

  .primary {
    border: 1px solid ${v.colorPrincipal};
    background: ${v.colorPrincipal};
    color: white;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.55;
  }
`;

const SkeletonRow = styled.div`
  height: 42px;
  border-radius: 10px;
  background: ${({ theme }) => theme.bg4};
  opacity: 0.5;
  animation: pulse 1.2s ease-in-out infinite alternate;

  @keyframes pulse {
    from {
      opacity: 0.35;
    }
    to {
      opacity: 0.7;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Status = styled.div`
  display: grid;
  align-content: center;
  justify-items: center;
  flex: 1;
  gap: 8px;
  padding: 40px 20px;
  text-align: center;

  span {
    max-width: 55ch;
    font-size: 0.875rem;
    opacity: 0.78;
  }

  small {
    font-size: 0.75rem;
    opacity: 0.68;
  }
`;

const EmptyState = styled.div`
  display: grid;
  align-content: center;
  justify-items: center;
  flex: 1;
  gap: 8px;
  padding: 48px 20px;
  text-align: center;

  > svg {
    margin-bottom: 4px;
    color: ${v.colorPrincipal};
    font-size: 2rem;
  }

  p {
    max-width: 50ch;
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
    opacity: 0.75;
  }
`;
