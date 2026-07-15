import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { motion, useReducedMotion } from "framer-motion";
import { RiTimeLine } from "react-icons/ri";
import { Modal } from "../Modal";
import { v } from "../../../styles/variables";

const formatExpiration = (value) => {
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

const getProgress = (invitation, now) => {
  const createdAt = new Date(invitation.created_at).getTime();
  const expiresAt = new Date(invitation.expires_at).getTime();
  const totalDuration = expiresAt - createdAt;

  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 0;
  return Math.min(1, Math.max(0, (expiresAt - now) / totalDuration));
};

const getProgressColor = (progress) => {
  if (progress <= 0.2) return v.rojo;
  if (progress <= 0.5) return "#f3a712";
  return v.verde;
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
  previous.invitation.created_at === next.invitation.created_at &&
  previous.invitation.expires_at === next.invitation.expires_at
);

export function ActiveDelegateInvitationsModal({
  isOpen,
  onClose,
  invitations = [],
  teams = [],
  loading = false,
  error = "",
}) {
  const [now, setNow] = useState(() => Date.now());
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

  const activeInvitations = useMemo(
    () =>
      invitations.filter(
        (invitation) => new Date(invitation.expires_at).getTime() > now
      ),
    [invitations, now]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invitaciones activas"
      width="1000px"
      bodyPadding="0"
    >
      <ModalContent>
        <Summary>
          <div>
            <strong>
              {loading
                ? "Consultando invitaciones"
                : activeInvitations.length === 1
                  ? "1 invitación vigente"
                  : `${activeInvitations.length} invitaciones vigentes`}
            </strong>
            <p>
              Los cambios llegan automáticamente en tiempo real. Al llegar a cero, la
              invitación deja de mostrarse.
            </p>
          </div>
        </Summary>

        {error ? (
          <Status role="alert">
            <strong>No pudimos cargar las invitaciones</strong>
            <span>{error}</span>
            <small>La conexión volverá a intentarlo automáticamente.</small>
          </Status>
        ) : loading ? (
          <TableScroll aria-label="Cargando invitaciones activas">
            <InvitationsTable>
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Delegado</th>
                  <th>Vencimiento</th>
                  <th>Tiempo restante</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={4}>
                      <SkeletonRow />
                    </td>
                  </tr>
                ))}
              </tbody>
            </InvitationsTable>
          </TableScroll>
        ) : activeInvitations.length === 0 ? (
          <EmptyState>
            <RiTimeLine aria-hidden="true" />
            <strong>No hay invitaciones activas</strong>
            <p>
              Las invitaciones vigentes que generes para los delegados aparecerán aquí.
            </p>
          </EmptyState>
        ) : (
          <TableScroll>
            <InvitationsTable>
              <thead>
                <tr>
                  <th scope="col">Equipo</th>
                  <th scope="col">Delegado</th>
                  <th scope="col">Vencimiento</th>
                  <th scope="col">Tiempo restante</th>
                </tr>
              </thead>
              <tbody>
                {activeInvitations.map((invitation) => {
                  const remaining =
                    new Date(invitation.expires_at).getTime() - now;
                  const progress = getProgress(invitation, now);
                  const remainingLabel = formatRemainingTime(remaining);

                  return (
                    <tr key={invitation.id}>
                      <td>
                        <TeamName>
                          {teamNames.get(String(invitation.team_id)) ||
                            "Equipo no disponible"}
                        </TeamName>
                      </td>
                      <td>
                        <DelegateInfo>
                          <span>{invitation.invited_name || "Sin nombre sugerido"}</span>
                          {invitation.invited_email && (
                            <small>{invitation.invited_email}</small>
                          )}
                        </DelegateInfo>
                      </td>
                      <td>
                        <ExpirationDate>
                          {formatExpiration(invitation.expires_at)}
                        </ExpirationDate>
                      </td>
                      <td>
                        <RemainingCell>
                          <div className="remaining-label">
                            <RiTimeLine aria-hidden="true" />
                            <strong>{remainingLabel}</strong>
                          </div>
                          <ProgressTrack
                            role="progressbar"
                            aria-label={`Tiempo restante para ${
                              teamNames.get(String(invitation.team_id)) || "el equipo"
                            }`}
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </InvitationsTable>
          </TableScroll>
        )}
      </ModalContent>
    </Modal>
  );
}

const ModalContent = styled.div`
  display: flex;
  min-height: 360px;
  flex-direction: column;
`;

const Summary = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bgtotal};

  > div {
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
`;

const TableScroll = styled.div`
  width: calc(100% - 32px);
  margin: 12px 16px 16px;
  overflow-x: auto;
  overscroll-behavior-x: contain;

  @media (max-width: 640px) {
    width: calc(100% - 24px);
    margin: 8px 12px 12px;
  }
`;

const InvitationsTable = styled.table`
  width: 100%;
  min-width: 740px;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;

  th,
  td {
    padding: 14px 16px;
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: ${({ theme }) => theme.bgcards};
    font-size: 0.75rem;
    font-weight: 800;
    color: ${({ theme }) => theme.text};
    opacity: 0.72;
  }

  th:first-child,
  td:first-child {
    padding-left: 20px;
  }

  th:last-child,
  td:last-child {
    width: 34%;
    padding-right: 20px;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  @media (max-width: 640px) {
    min-width: 0;
    table-layout: fixed;

    th:nth-child(2),
    td:nth-child(2),
    th:nth-child(3),
    td:nth-child(3) {
      display: none;
    }

    th:first-child,
    td:first-child {
      width: 42%;
      padding-left: 20px;
    }

    th:last-child,
    td:last-child {
      width: 58%;
    }
  }
`;

const TeamName = styled.strong`
  display: block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9375rem;

  @media (max-width: 640px) {
    display: -webkit-box;
    overflow: hidden;
    white-space: normal;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.25;
  }
`;

const DelegateInfo = styled.div`
  display: grid;
  gap: 3px;
  max-width: 230px;

  span,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    font-size: 0.875rem;
    font-weight: 650;
  }

  small {
    font-size: 0.75rem;
    opacity: 0.7;
  }
`;

const ExpirationDate = styled.span`
  display: block;
  font-size: 0.8125rem;
  line-height: 1.4;
  opacity: 0.8;
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
    font-size: 0.875rem;
    line-height: 1;
  }

  @media (max-width: 640px) {
    min-width: 0;
  }
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
