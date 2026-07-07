import React from "react";
import styled from "styled-components";
import { BiBadgeCheck } from "react-icons/bi";
import {
  RiShieldUserLine,
  RiSmartphoneLine,
  RiTrophyLine,
  RiUserFollowLine,
} from "react-icons/ri";
import { Skeleton } from "../../../atomos/Skeleton";
import { TeamLogo } from "../TeamLogo";
import {
  Banner,
  DivisionBadge,
  IconBox,
  InfoBody,
  InfoItem,
  LogoWrapper,
  OverviewView,
  StatusPill,
  TeamTitle,
} from "../styles";

export function TeamDetailOverviewView({
  division,
  hasActiveTournament,
  loadingStats,
  onShowDelegateRequests,
  onShowPlayers,
  onShowStats,
  team,
  onEdit,
}) {
  const isLinkedDelegate = Boolean(team?.delegateAssignment?.delegate_profile_id);
  const delegateLabel = team?.delegate_name || "No registrado";
  const requestSummary = team?.delegateRequestSummary || null;
  const pendingCount = Number(requestSummary?.pendingCount || 0);
  const totalCount = Number(requestSummary?.totalCount || 0);
  const delegateRequestHint =
    pendingCount > 0
      ? `${pendingCount} solicitud${pendingCount === 1 ? "" : "es"} pendiente${
          pendingCount === 1 ? "" : "s"
        }`
      : totalCount > 0
        ? "Ver historial del delegado"
        : "Abrir solicitudes del delegado";

  return (
    <OverviewView>
      <Banner $color={team.color || "#1f2937"}>
        <DivisionBadge>{division?.name || "Liga"}</DivisionBadge>
        {onEdit && (
          <BannerEditBtn onClick={onEdit} type="button">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Editar equipo
          </BannerEditBtn>
        )}
      </Banner>

      <LogoWrapper>
        <TeamLogo alt={team.name} club={team} size="130px" />
      </LogoWrapper>

      <TeamTitle>{team.name}</TeamTitle>

      <InfoBody>
        {isLinkedDelegate ? (
          <InfoItem
            as="button"
            className="clickable"
            onClick={onShowDelegateRequests}
            type="button"
          >
            <IconBox>
              <RiShieldUserLine />
            </IconBox>
            <div style={{ flex: 1 }}>
              <span className="label">Delegado</span>
              <VerifiedDelegatePill>
                <span>{delegateLabel}</span>
                <BiBadgeCheck />
              </VerifiedDelegatePill>
              <RequestHint>{delegateRequestHint}</RequestHint>
            </div>
            <span className="arrow-icon">→</span>
          </InfoItem>
        ) : (
          <InfoItem>
            <IconBox>
              <RiShieldUserLine />
            </IconBox>
            <div style={{ flex: 1 }}>
              <span className="label">Delegado</span>
              <ManualDelegateValue className="value">{delegateLabel}</ManualDelegateValue>
            </div>
            <UnlinkedBadge>No vinculado</UnlinkedBadge>
          </InfoItem>
        )}

        <InfoItem
          as="button"
          className="clickable"
          onClick={onShowPlayers}
          type="button"
        >
          <IconBox>
            <RiUserFollowLine />
          </IconBox>
          <div style={{ flex: 1 }}>
            <span className="label">Plantilla</span>
            <p className="value">Ver Jugadores</p>
          </div>
          <span className="arrow-icon">➔</span>
        </InfoItem>

        <InfoItem>
          <IconBox>
            <RiSmartphoneLine />
          </IconBox>
          <div>
            <span className="label">Contacto</span>
            <p className="value">{team.contact_phone || "No disponible"}</p>
          </div>
        </InfoItem>

        {loadingStats ? (
          <Skeleton width="100%" height="60px" />
        ) : hasActiveTournament ? (
          <InfoItem
            as="button"
            className="clickable tournament-active"
            onClick={onShowStats}
            type="button"
          >
            <IconBox className="gold">
              <RiTrophyLine />
            </IconBox>
            <div style={{ flex: 1 }}>
              <span className="label">Torneo Actual</span>
              <p className="value highlight">Estadísticas</p>
            </div>
            <span className="arrow-icon">➔</span>
          </InfoItem>
        ) : (
          <InfoItem>
            <IconBox>
              <RiShieldUserLine />
            </IconBox>
            <div>
              <span className="label">Estado</span>
              <StatusPill $active={team.status === "Activo"}>
                {team.status || "Sin estado"}
              </StatusPill>
            </div>
          </InfoItem>
        )}
      </InfoBody>
    </OverviewView>
  );
}

const ManualDelegateValue = styled.p`
  margin: 0;
  color: #8b95a7;
  font-size: 0.95rem;
  font-weight: 600;
`;

const VerifiedDelegatePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  color: ${({ theme }) => theme.text};
  font-size: 0.95rem;
  font-weight: 700;

  svg {
    color: #1cb0f6;
    font-size: 1.1rem;
    flex-shrink: 0;
  }
`;

const RequestHint = styled.p`
  margin: 6px 0 0;
  color: #8fb4d8;
  font-size: 0.78rem;
  font-weight: 600;
`;

const UnlinkedBadge = styled.span`
  align-self: center;
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(139, 149, 167, 0.12);
  border: 1px solid rgba(139, 149, 167, 0.25);
  color: #8b95a7;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
`;

const BannerEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
  position: absolute;
  top: 15px;
  right: 15px;
  z-index: 10;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;
