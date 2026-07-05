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
  onShowPlayers,
  onShowStats,
  team,
}) {
  const isLinkedDelegate = Boolean(team?.delegateAssignment?.delegate_profile_id);
  const delegateLabel = team?.delegate_name || "No registrado";

  return (
    <OverviewView>
      <Banner $color={team.color || "#1f2937"}>
        <DivisionBadge>{division?.name || "Liga"}</DivisionBadge>
      </Banner>

      <LogoWrapper>
        <TeamLogo alt={team.name} club={team} size="130px" />
      </LogoWrapper>

      <TeamTitle>{team.name}</TeamTitle>

      <InfoBody>
        <InfoItem>
          <IconBox>
            <RiShieldUserLine />
          </IconBox>
          <div>
            <span className="label">Delegado</span>
            {isLinkedDelegate ? (
              <VerifiedDelegatePill>
                <BiBadgeCheck />
                <span>{delegateLabel}</span>
              </VerifiedDelegatePill>
            ) : (
              <ManualDelegateValue className="value">{delegateLabel}</ManualDelegateValue>
            )}
          </div>
        </InfoItem>

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
  padding: 7px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.94));
  color: #f8fafc;
  font-size: 0.9rem;
  font-weight: 700;

  svg {
    color: #1cb0f6;
    font-size: 1rem;
    flex-shrink: 0;
  }
`;
