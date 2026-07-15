import React, { useMemo, useState } from "react";
import styled from "styled-components";
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiInboxArchiveLine,
  RiRefreshLine,
  RiTimeLine,
  RiUser3Line,
} from "react-icons/ri";
import { v } from "../../../../styles/variables";
import { Badge } from "../../../atomos/Badge";
import { BtnNormal } from "../../../moleculas/BtnNormal";
import { Btnsave } from "../../../moleculas/Btnsave";
import { Card } from "../../../moleculas/Card";
import { EmptyState } from "../../EmptyState";
import { Modal } from "../../Modal";
import { Skeleton } from "../../../atomos/Skeleton";
import { TabsNavigation } from "../../../moleculas/TabsNavigation";
import { Toast } from "../../../atomos/Toast";

const FILTER_TABS = [
  { id: "pending", label: "Pendientes", icon: <RiTimeLine /> },
  { id: "history", label: "Historial", icon: <RiInboxArchiveLine /> },
];

const STATUS_META = {
  pending: { label: "Pendiente", color: "#f39c12" },
  applied: { label: "Aprobado", color: "#27ae60" },
  rejected: { label: "Rechazado", color: "#e74c3c" },
};

const FIELD_LABELS = {
  name: "Nombre del equipo",
  color: "Color",
  delegate_name: "Delegado",
  contact_phone: "Teléfono",
  first_name: "Nombres",
  last_name: "Apellidos",
  dorsal: "Dorsal",
  position: "Posición",
  birth_date: "Fecha de nacimiento",
  curp_dni: "CURP / DNI",
  photo_url: "Foto",
  original_photo_url: "Foto original",
  is_active: "Activo",
};

const formatActionLabel = (request) => {
  if (request.entity_type === "team") return "Actualización de equipo";
  if (request.action_type === "insert") return "Alta de jugador";
  if (request.action_type === "update") return "Actualización de jugador";
  if (request.action_type === "archive") return "Inhabilitar jugador";
  if (request.action_type === "restore") return "Restaurar jugador";
  return "Solicitud de delegado";
};

const formatValue = (field, value) => {
  if (field === "photo_url" || field === "original_photo_url") {
    return value ? "Imagen actualizada" : "Imagen eliminada";
  }

  if (field === "color") {
    return value || "Sin color";
  }

  if (field === "is_active") {
    return value ? "Sí" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "Vacío";
  }

  return String(value);
};

const getRequestChanges = (request) => {
  if (request.entity_type === "player" && ["archive", "restore"].includes(request.action_type)) {
    return [
      {
        label: "Acción",
        value: request.action_type === "archive" ? "Inhabilitar jugador" : "Restaurar jugador",
      },
    ];
  }

  const payloadEntries = Object.entries(request.payload || {}).filter(
    ([key]) => key !== "team_id"
  );

  return payloadEntries.map(([field, value]) => ({
    label: FIELD_LABELS[field] || field,
    value: formatValue(field, value),
  }));
};

const getRequestSummary = (request) => {
  const teamName = request.team?.name || "Equipo";
  const playerName = request.player
    ? `${request.player.first_name || ""} ${request.player.last_name || ""}`.trim()
    : null;
  const payloadName =
    request.payload?.first_name || request.payload?.last_name
      ? `${request.payload?.first_name || ""} ${request.payload?.last_name || ""}`.trim()
      : null;

  if (request.entity_type === "team") {
    return `Cambios solicitados para ${teamName}.`;
  }

  if (request.action_type === "insert") {
    return `Alta solicitada para ${payloadName || "nuevo jugador"} en ${teamName}.`;
  }

  if (request.action_type === "update") {
    return `Cambios solicitados para ${playerName || payloadName || "jugador"} de ${teamName}.`;
  }

  if (request.action_type === "archive") {
    return `Se solicita inhabilitar a ${playerName || "jugador"} en ${teamName}.`;
  }

  if (request.action_type === "restore") {
    return `Se solicita restaurar a ${playerName || "jugador"} en ${teamName}.`;
  }

  return `Solicitud enviada para ${teamName}.`;
};

export function LigaDelegateRequestsTab({
  requests = [],
  loading = false,
  onReview,
  onRefresh,
  canReview = true,
  title = "Solicitudes de Delegados",
  subtitle = "Revisa, aprueba o rechaza cambios enviados por los delegados.",
}) {
  const [activeFilter, setActiveFilter] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [savingDecision, setSavingDecision] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const metrics = useMemo(() => {
    const pending = requests.filter((request) => request.status === "pending").length;
    const applied = requests.filter((request) => request.status === "applied").length;
    const rejected = requests.filter((request) => request.status === "rejected").length;

    return { pending, applied, rejected };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (activeFilter === "pending") {
      return requests.filter((request) => request.status === "pending");
    }

    return requests.filter((request) => request.status !== "pending");
  }, [activeFilter, requests]);

  const openRequest = (request) => {
    setSelectedRequest(request);
    setReviewNotes(request.review_notes || "");
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setReviewNotes("");
    setSavingDecision(null);
  };

  const handleDecision = async (decision) => {
    if (!selectedRequest?.id) return;

    if (decision === "reject" && !reviewNotes.trim()) {
      setToast({
        show: true,
        message: "Agrega una nota para explicar el rechazo al delegado.",
        type: "error",
      });
      return;
    }

    setSavingDecision(decision);

    try {
      const result = await onReview({
        requestId: selectedRequest.id,
        decision,
        reviewNotes: reviewNotes.trim() || null,
      });

      setToast({
        show: true,
        message:
          result.status === "applied"
            ? "Solicitud aprobada y aplicada."
            : "Solicitud rechazada.",
        type: "success",
      });

      closeModal();
    } catch (error) {
      setToast({
        show: true,
        message: error.message || "No se pudo procesar la solicitud.",
        type: "error",
      });
      setSavingDecision(null);
    }
  };

  const selectedRequestChanges = selectedRequest ? getRequestChanges(selectedRequest) : [];

  return (
    <>
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <Card maxWidth="1000px" width="100%">
        <SummaryGrid>
          <SummaryCard>
            <span className="label">Pendientes</span>
            <strong>{metrics.pending}</strong>
          </SummaryCard>
          <SummaryCard>
            <span className="label">Aprobadas</span>
            <strong>{metrics.applied}</strong>
          </SummaryCard>
          <SummaryCard>
            <span className="label">Rechazadas</span>
            <strong>{metrics.rejected}</strong>
          </SummaryCard>
        </SummaryGrid>

        <Toolbar>
          <TabsWrapper>
            <TabsNavigation
              tabs={FILTER_TABS}
              activeTab={activeFilter}
              setActiveTab={setActiveFilter}
              showLabelsOnMobile={true}
            />
          </TabsWrapper>

          <BtnNormal
            funcion={onRefresh}
            titulo="Recargar"
            icono={<RiRefreshLine />}
          />
        </Toolbar>

        <ListContainer>
          {loading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <RequestSkeleton key={index}>
                <Skeleton width="45%" height="18px" />
                <Skeleton width="80%" height="14px" />
                <Skeleton width="35%" height="12px" />
              </RequestSkeleton>
            ))
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              title={
                activeFilter === "pending"
                  ? "Sin solicitudes pendientes"
                  : "Sin historial de solicitudes"
              }
              description={
                activeFilter === "pending"
                  ? "Cuando un delegado envíe cambios para aprobación, aparecerán aquí."
                  : "Todavía no hay solicitudes aprobadas o rechazadas en esta liga."
              }
            />
          ) : (
            filteredRequests.map((request) => {
              const statusMeta = STATUS_META[request.status] || STATUS_META.pending;

              return (
                <RequestCard key={request.id} onClick={() => openRequest(request)}>
                  <div className="top-row">
                    <div>
                      <h4>{formatActionLabel(request)}</h4>
                      <p>{getRequestSummary(request)}</p>
                    </div>
                    <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                  </div>

                  <div className="meta-row">
                    <span><RiUser3Line /> {request.submitter_label}</span>
                    <span><RiTimeLine /> {new Date(request.created_at).toLocaleString()}</span>
                  </div>
                </RequestCard>
              );
            })
          )}
        </ListContainer>
      </Card>

      <Modal
        isOpen={!!selectedRequest}
        onClose={closeModal}
        title={selectedRequest ? formatActionLabel(selectedRequest) : "Solicitud"}
        width="760px"
        closeOnOverlayClick={false}
      >
        {selectedRequest && (
          <ReviewContent>
            <DetailSection>
              <h4>Resumen</h4>
              <InfoGrid>
                <InfoItem>
                  <span className="meta-label">Equipo</span>
                  <strong>{selectedRequest.team?.name || "Sin equipo"}</strong>
                </InfoItem>
                <InfoItem>
                  <span className="meta-label">Delegado</span>
                  <strong>{selectedRequest.submitter_label}</strong>
                </InfoItem>
                <InfoItem>
                  <span className="meta-label">Estado</span>
                  <Badge color={(STATUS_META[selectedRequest.status] || STATUS_META.pending).color}>
                    {(STATUS_META[selectedRequest.status] || STATUS_META.pending).label}
                  </Badge>
                </InfoItem>
                <InfoItem>
                  <span className="meta-label">Enviado</span>
                  <strong>{new Date(selectedRequest.created_at).toLocaleString()}</strong>
                </InfoItem>
              </InfoGrid>
            </DetailSection>

            <DetailSection>
              <h4>Detalle del cambio</h4>
              {selectedRequest.player && (
                <PlayerInfoCard>
                  <strong>
                    {selectedRequest.player.first_name} {selectedRequest.player.last_name}
                  </strong>
                  <span>
                    #{selectedRequest.player.dorsal || "--"} · {selectedRequest.player.position || "Sin posición"}
                  </span>
                </PlayerInfoCard>
              )}

              <ChangeList>
                {selectedRequestChanges.length > 0 ? (
                  selectedRequestChanges.map((change) => (
                    <li key={`${selectedRequest.id}-${change.label}`}>
                      <span className="field">{change.label}</span>
                      <span className="value">{change.value}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span className="value">Sin campos adicionales en el payload.</span>
                  </li>
                )}
              </ChangeList>
            </DetailSection>

            {selectedRequest.status === "pending" ? (
              canReview ? (
                <DetailSection>
                  <h4>Revisión del manager</h4>
                  <ReviewTextarea
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    placeholder="Agrega una nota opcional para aprobar o una explicación si rechazas."
                  />

                  <ActionRow>
                    <BtnNormal funcion={closeModal} titulo="Cancelar" />
                    <Btnsave
                      funcion={() => handleDecision("reject")}
                      titulo={savingDecision === "reject" ? "Rechazando..." : "Rechazar"}
                      bgcolor={v.rojo}
                      icono={<RiCloseCircleLine />}
                      width="auto"
                      disabled={!!savingDecision}
                    />
                    <Btnsave
                      funcion={() => handleDecision("approve")}
                      titulo={savingDecision === "approve" ? "Aprobando..." : "Aprobar"}
                      bgcolor={v.verde}
                      icono={<RiCheckboxCircleLine />}
                      width="auto"
                      disabled={!!savingDecision}
                    />
                  </ActionRow>
                </DetailSection>
              ) : (
                <DetailSection>
                  <h4>Estado actual</h4>
                  <ReadonlyNote>
                    Esta solicitud sigue pendiente de revision del manager de la liga.
                  </ReadonlyNote>
                </DetailSection>
              )
            ) : (
              <DetailSection>
                <h4>Resultado</h4>
                <ReadonlyNote>
                  {selectedRequest.review_notes || "Sin nota de revisión."}
                </ReadonlyNote>
              </DetailSection>
            )}
          </ReviewContent>
        )}
      </Modal>
    </>
  );
}

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  padding: 10px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  .label {
    font-size: 0.8rem;
    opacity: 0.72;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  strong {
    font-size: 1.25rem;
    line-height: 1;
  }
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  flex-wrap: wrap;
`;

const TabsWrapper = styled.div`
  flex: 1;
  min-width: 280px;
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
`;

const RequestCard = styled.button`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 16px;
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  text-align: left;
  padding: 18px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.primary || v.colorPrincipal};
    box-shadow: 0 10px 18px rgba(0, 0, 0, 0.08);
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
  }

  h4 {
    margin: 0 0 6px 0;
    font-size: 1rem;
  }

  p {
    margin: 0;
    opacity: 0.78;
    line-height: 1.45;
  }

  .meta-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 14px;
    font-size: 0.85rem;
    opacity: 0.72;
  }

  .meta-row span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

const RequestSkeleton = styled.div`
  padding: 18px;
  border-radius: 16px;
  background: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};
  display: grid;
  gap: 10px;
`;

const ReviewContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const DetailSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  h4 {
    margin: 0;
    font-size: 1rem;
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 14px;
  background: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};

  .meta-label {
    font-size: 0.8rem;
    font-weight: 700;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  strong {
    font-size: 0.96rem;
  }
`;

const PlayerInfoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(28, 176, 246, 0.08);
  border: 1px solid rgba(28, 176, 246, 0.16);

  span {
    opacity: 0.76;
  }
`;

const ChangeList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    background: ${({ theme }) => theme.bgtotal};
    border: 1px solid ${({ theme }) => theme.bg4};
  }

  .field {
    font-weight: 700;
    opacity: 0.86;
  }

  .value {
    text-align: right;
    opacity: 0.8;
  }
`;

const ReviewTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  resize: vertical;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  padding: 14px;
  font-family: inherit;
  font-size: 0.95rem;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.primary || v.colorPrincipal};
  }
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`;

const ReadonlyNote = styled.div`
  padding: 14px;
  border-radius: 14px;
  background: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};
  line-height: 1.5;
  opacity: 0.82;
`;
