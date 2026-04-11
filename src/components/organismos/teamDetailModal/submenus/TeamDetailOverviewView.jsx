import React from "react";
import {
  RiShieldUserLine,
  RiSmartphoneLine,
  RiTrophyLine,
  RiUserFollowLine,
} from "react-icons/ri";
import { Skeleton } from "../../../atomos/Skeleton";
import { v } from "../../../../styles/variables";
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
            <p className="value">{team.delegate_name || "No registrado"}</p>
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
              <v.iconoemijivacio />
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
