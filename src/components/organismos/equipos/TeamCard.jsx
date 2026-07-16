import React, { memo } from "react";
import styled, { keyframes, css } from "styled-components";
import { BiBadgeCheck } from "react-icons/bi";
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
  RiExchangeDollarLine,
  RiPencilLine,
  RiQrCodeLine,
  RiTrophyLine,
} from "react-icons/ri";
import { v } from "../../../styles/variables";
import { DynamicTeamLogo } from "./DynamicTeamLogo";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const statusBadgeCycle = keyframes`
  0%, 44% { opacity: 0; transform: translateY(-5px) scale(0.95); visibility: hidden; }
  50%, 94% { opacity: 1; transform: translateY(0) scale(1); visibility: visible; }
  100% { opacity: 0; transform: translateY(-5px) scale(0.95); visibility: hidden; }
`;

const tournamentBadgeCycle = keyframes`
  0%, 44% { opacity: 1; transform: translateY(0) scale(1); visibility: visible; }
  50%, 94% { opacity: 0; transform: translateY(-5px) scale(0.95); visibility: hidden; }
  100% { opacity: 1; transform: translateY(0) scale(1); visibility: visible; }
`;

const clockHandCycle = keyframes`
  0%, 10% { transform: translateX(-50%) rotate(30deg); }
  20%, 30% { transform: translateX(-50%) rotate(90deg); }
  40%, 50% { transform: translateX(-50%) rotate(180deg); }
  60%, 70% { transform: translateX(-50%) rotate(270deg); }
  80%, 90% { transform: translateX(-50%) rotate(360deg); }
  100% { transform: translateX(-50%) rotate(390deg); }
`;

function TeamCardComponent({
  team,
  onEdit,
  onDelete,
  onTransfer,
  onView,
  onInviteDelegate,
  isParticipating,
  hasPendingDelegateInvitation = false,
  showTransferAction = true,
  showDeleteAction = true,
  showInviteAction = false,
  requestStatusMode = "manager",
}) {
  const isActive = team.status === "Activo";
  const hasActions = true;
  const requestSummary = team?.delegateRequestSummary || null;
  const isLinkedDelegate = Boolean(team?.delegateAssignment?.delegate_profile_id);
  const delegateLabel = team?.delegate_name || "Sin delegado";
  const requestBadges = [];

  if (requestSummary?.pendingCount > 0) {
    requestBadges.push({
      key: "pending",
      tone: "warning",
      label:
        requestStatusMode === "delegate"
          ? `${requestSummary.pendingCount} en revision`
          : `${requestSummary.pendingCount} pendiente${
              requestSummary.pendingCount === 1 ? "" : "s"
            }`,
    });
  }

  if (requestStatusMode === "delegate" && requestSummary?.latestReviewedStatus === "applied") {
    requestBadges.push({
      key: "approved",
      tone: "success",
      label: "Ultimo cambio aprobado",
      title: requestSummary.latestReviewNotes || undefined,
    });
  }

  if (requestStatusMode === "delegate" && requestSummary?.latestReviewedStatus === "rejected") {
    requestBadges.push({
      key: "rejected",
      tone: "danger",
      label: "Ultimo cambio rechazado",
      title: requestSummary.latestReviewNotes || undefined,
    });
  }

  return (
    <CardContainer onClick={() => onView(team)}>
      <div
        className="card-top"
        style={{ background: `linear-gradient(135deg, ${team.color}cc, ${team.color})` }}
      >
        {hasActions && (
          <ActionButtons>
            <button type="button"
              aria-label={`Editar ${team.name}`}
              className="btn-edit"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(team);
              }}
              title="Editar"
            >
              <RiPencilLine />
            </button>

            {showInviteAction && (
              <button type="button"
                aria-label={`Invitar delegado a ${team.name}`}
                className="btn-invite"
                onClick={(event) => {
                  event.stopPropagation();
                  onInviteDelegate?.(team);
                }}
                title="Invitar delegado"
              >
                <RiQrCodeLine />
              </button>
            )}

            {showTransferAction && (
              <button type="button"
                aria-label={`Transferir ${team.name}`}
                className="btn-transfer"
                onClick={(event) => {
                  event.stopPropagation();
                  onTransfer(team);
                }}
                title="Transferir"
              >
                <RiExchangeDollarLine />
              </button>
            )}

            {showDeleteAction && (
              <button type="button"
                aria-label={`Eliminar ${team.name}`}
                className="btn-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(team.id);
                }}
                title="Eliminar"
              >
                <RiDeleteBinLine />
              </button>
            )}
          </ActionButtons>
        )}

        <BadgePosition>
          <BadgeStack>
            <StatusBadge $visible={!isParticipating} $alternates={isParticipating} $isActive={isActive}>
              {isActive ? <RiCheckboxCircleLine size={11} /> : <RiCloseCircleLine size={11} />}
              <span>{team.status}</span>
            </StatusBadge>

            {isParticipating && (
              <TournamentBadge $visible $alternates>
                <RiTrophyLine size={11} />
                <span>En Torneo</span>
              </TournamentBadge>
            )}
          </BadgeStack>
        </BadgePosition>

        <LogoWrapper>
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} />
          ) : (
            <DynamicTeamLogo name={team.name} color={team.color || "#000000"} size="85px" />
          )}
        </LogoWrapper>
      </div>

      <div className="card-body">
        <h3>{team.name}</h3>
        <DelegateRow
          $linked={isLinkedDelegate}
          $pending={hasPendingDelegateInvitation}
        >
          <v.iconoUser className="icon" />
          {isLinkedDelegate ? (
            <VerifiedDelegatePill>
              <span>{delegateLabel}</span>
              <BiBadgeCheck />
            </VerifiedDelegatePill>
          ) : hasPendingDelegateInvitation ? (
            <PendingDelegatePill title="Invitacion de registro pendiente">
              <span>{delegateLabel}</span>
              <PendingInviteClock
                role="img"
                aria-label="Invitacion de registro pendiente"
              >
                <span className="clock-hand" />
              </PendingInviteClock>
            </PendingDelegatePill>
          ) : (
            <ManualDelegateText>{delegateLabel}</ManualDelegateText>
          )}
        </DelegateRow>
        <div className="info-row"><span>Telefono: {team.contact_phone || "--"}</span></div>
        {requestBadges.length > 0 && (
          <RequestBadgeRow>
            {requestBadges.map((badge) => (
              <RequestBadge key={badge.key} $tone={badge.tone} title={badge.title}>
                <span>{badge.label}</span>
              </RequestBadge>
            ))}
          </RequestBadgeRow>
        )}
      </div>
    </CardContainer>
  );
}

export const TeamCard = memo(TeamCardComponent);

const CardContainer = styled.div`
  width: 250px;
  flex-shrink: 0;
  background-color: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  animation: ${fadeIn} 0.5s ease-out forwards;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  }

  .card-top {
    height: 110px;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }

  .card-body {
    padding: 35px 15px 20px;
    text-align: center;
    flex: 1;

    h3 {
      margin: 0 0 10px 0;
      color: ${({ theme }) => theme.text};
      font-size: 1.1rem;
      font-weight: 700;
    }

    .info-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: ${({ theme }) => theme.text};
      opacity: 0.7;
      font-size: 0.85rem;
      margin-bottom: 6px;
    }
  }
`;

const DelegateRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;

  .icon {
    color: ${({ $linked, $pending, theme }) =>
      $linked ? "#8bd6ff" : $pending ? "#f5a623" : theme.text};
    opacity: ${({ $linked, $pending }) => ($linked || $pending ? 1 : 0.55)};
  }
`;

const ManualDelegateText = styled.span`
  color: #8b95a7;
  font-size: 0.85rem;
  font-weight: 600;
`;

const VerifiedDelegatePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  color: ${({ theme }) => theme.text};
  font-size: 0.85rem;
  font-weight: 700;

  svg {
    flex-shrink: 0;
    color: #1cb0f6;
    font-size: 1rem;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const RequestBadgeRow = styled.div`
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
`;

const RequestBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid transparent;
  background: ${({ $tone }) => {
    if ($tone === "success") return "rgba(39, 174, 96, 0.14)";
    if ($tone === "danger") return "rgba(192, 57, 43, 0.14)";
    return "rgba(243, 156, 18, 0.14)";
  }};
  color: ${({ $tone }) => {
    if ($tone === "success") return "#27ae60";
    if ($tone === "danger") return "#c0392b";
    return "#d68910";
  }};
  border-color: ${({ $tone }) => {
    if ($tone === "success") return "rgba(39, 174, 96, 0.28)";
    if ($tone === "danger") return "rgba(192, 57, 43, 0.28)";
    return "rgba(243, 156, 18, 0.28)";
  }};
`;

const LogoWrapper = styled.div`
  width: 85px;
  height: 85px;
  position: absolute;
  bottom: -25px;
  filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.3));
  transition: transform 0.3s;

  ${CardContainer}:hover & {
    transform: scale(1.1);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background-color: transparent;
    border: none;
  }
`;

const ActionButtons = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 8px;
  z-index: 10;

  button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    transition: 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    color: white;
  }

  .btn-edit,
  .btn-invite {
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(4px);
  }

  .btn-edit:hover {
    background: ${({ theme }) => theme.primary || v.colorPrincipal};
  }

  .btn-invite:hover {
    background: #1cb0f6;
  }

  .btn-delete,
  .btn-transfer {
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(4px);
  }

  .btn-delete:hover {
    background: #ff4757;
  }

  .btn-transfer:hover {
    background: #f39c12;
  }
`;

const BadgePosition = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
`;

const BadgeStack = styled.div`
  display: grid;
  grid-template-areas: "stack";
  align-items: center;
  justify-items: end;

  > * {
    grid-area: stack;
  }
`;

const sharedBadgeStyles = css`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition:
    opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.6s cubic-bezier(0.4, 0, 0.2, 1),
    visibility 0.6s;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: ${({ $visible }) =>
    $visible ? "translateY(0) scale(1)" : "translateY(-5px) scale(0.95)"};
  visibility: ${({ $visible }) => ($visible ? "visible" : "hidden")};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};

  svg {
    flex-shrink: 0;
  }
`;

const StatusBadge = styled.div`
  ${sharedBadgeStyles}
  background: ${({ $isActive }) => ($isActive ? "#27ae60" : "#c0392b")};
  ${({ $alternates }) =>
    $alternates &&
    css`
      animation: ${statusBadgeCycle} 5s linear infinite;
    `}
`;

const PendingDelegatePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  color: #8b95a7;
  font-size: 0.85rem;
  font-weight: 600;

  > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const PendingInviteClock = styled.span`
  position: relative;
  width: 1em;
  height: 1em;
  flex: 0 0 1em;
  box-sizing: border-box;
  color: #f5a623;
  border: 1.4px solid currentColor;
  border-radius: 50%;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2.5px;
    height: 2.5px;
    background: currentColor;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .clock-hand {
    position: absolute;
    bottom: 50%;
    left: 50%;
    width: 1.4px;
    height: 0.32em;
    background: currentColor;
    border-radius: 999px;
    transform: translateX(-50%) rotate(30deg);
    transform-origin: 50% 100%;
    animation: ${clockHandCycle} 4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .clock-hand {
      animation: none;
      opacity: 1;
      transform: translateX(-50%) rotate(30deg);
    }
  }
`;

const TournamentBadge = styled.div`
  ${sharedBadgeStyles}
  background: linear-gradient(135deg, #f1c40f, #d35400);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  ${({ $alternates }) =>
    $alternates &&
    css`
      animation: ${tournamentBadgeCycle} 5s linear infinite;
    `}
`;
