import React from "react";
import styled from "styled-components";
import {
  RiArrowRightLine,
  RiFileList3Line,
  RiGroupLine,
  RiPencilLine,
  RiShieldUserLine,
  RiTrophyLine,
} from "react-icons/ri";
import { TeamLogo } from "../teamDetailModal/TeamLogo";

export function DelegateTeamOverview({
  team,
  division,
  changesRequireApproval,
  hasActiveTournament,
  loadingTournament,
  loadingStats,
  tournament,
  standings = [],
  tournamentError,
  onRetryTournament,
  onEdit,
  onManagePlayers,
  onShowPlayers,
  onShowDelegateRequests,
  onShowStandings,
  onShowStats,
}) {
  const requestSummary = team?.delegateRequestSummary;
  const pendingCount = Number(requestSummary?.pendingCount || 0);
  const totalCount = Number(requestSummary?.totalCount || 0);
  const requestStatus = pendingCount > 0
    ? `${pendingCount} cambio${pendingCount === 1 ? "" : "s"} en revisión`
    : totalCount > 0
      ? "Consultar historial de cambios"
      : "Aún no hay cambios solicitados";
  const teamPosition = standings.findIndex((entry) => String(entry.id) === String(team.id));
  const teamStanding = teamPosition >= 0 ? standings[teamPosition] : null;

  return (
    <Overview aria-labelledby="delegate-team-name">
      <Identity>
        <Crest><TeamLogo alt={`Escudo de ${team.name}`} club={team} size="100px" /></Crest>
        <IdentityCopy>
          <DivisionName>{division?.name || "Mi equipo"}</DivisionName>
          <h2 id="delegate-team-name">{team.name}</h2>
          <Status $active={team.status === "Activo"}>
            <span aria-hidden="true" />
            {team.status || "Sin estado"}
          </Status>
        </IdentityCopy>
        <HeroActions>
          <PrimaryButton type="button" onClick={onManagePlayers}>
            <RiGroupLine aria-hidden="true" />
            Gestionar jugadores
          </PrimaryButton>
          <SecondaryButton type="button" onClick={onEdit}>
            <RiPencilLine aria-hidden="true" />
            Editar equipo
          </SecondaryButton>
        </HeroActions>
      </Identity>

      {changesRequireApproval && (
        <ReviewNotice>
          <RiFileList3Line aria-hidden="true" />
          <span>Los cambios que envíes se publicarán cuando el manager los apruebe.</span>
        </ReviewNotice>
      )}

      <ContentGrid>
        <Section>
          <h3>Plantilla</h3>
          <p>Consulta los jugadores registrados en tu equipo.</p>
          <TextAction type="button" onClick={onShowPlayers}>
            Ver jugadores <RiArrowRightLine aria-hidden="true" />
          </TextAction>
        </Section>
        <Section>
          <h3>Datos de contacto</h3>
          <Details>
            <div>
              <dt>Delegado</dt>
              <dd>{team.delegate_name || "No registrado"}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{team.contact_phone || "No registrado"}</dd>
            </div>
          </Details>
        </Section>
      </ContentGrid>

      <TournamentSection aria-labelledby="delegate-tournament-title">
        <TournamentHeading>
          <TournamentIcon><RiTrophyLine aria-hidden="true" /></TournamentIcon>
          <div>
            <h3 id="delegate-tournament-title">Torneo actual</h3>
            {tournament?.season && <TournamentName>{tournament.season}</TournamentName>}
          </div>
          {tournament?.status && <TournamentStatus>{tournament.status}</TournamentStatus>}
        </TournamentHeading>

        {loadingTournament ? (
          <TournamentMessage role="status">Cargando torneo y tabla de posiciones…</TournamentMessage>
        ) : tournamentError ? (
          <TournamentMessage role="alert">
            {tournamentError} <InlineButton type="button" onClick={onRetryTournament}>Reintentar</InlineButton>
          </TournamentMessage>
        ) : !hasActiveTournament ? (
          <TournamentMessage>Tu equipo aún no tiene un torneo activo.</TournamentMessage>
        ) : (
          <>
            <TournamentMeta>
              {tournament?.format && <span>{tournament.format}</span>}
              {tournament?.category && <span>{tournament.category}</span>}
              <span>{division?.name || "División"}</span>
            </TournamentMeta>
            {teamStanding ? (
              <StandingsSummary aria-label="Resumen de tu equipo en la tabla">
                <SummaryMetric $featured><strong>{teamPosition + 1}<small>°</small></strong><span>Posición de {standings.length}</span></SummaryMetric>
                <SummaryMetric><strong>{teamStanding.pts}</strong><span>Puntos</span></SummaryMetric>
                <SummaryMetric><strong>{teamStanding.pj}</strong><span>Partidos</span></SummaryMetric>
                <SummaryMetric><strong>{teamStanding.dg > 0 ? "+" : ""}{teamStanding.dg}</strong><span>Diferencia</span></SummaryMetric>
              </StandingsSummary>
            ) : (
              <TournamentMessage>Tu equipo todavía no figura entre los participantes de este torneo.</TournamentMessage>
            )}
            <TournamentActions>
              {standings.length > 0 && (
                <StandingsButton type="button" onClick={onShowStandings}>
                  Ver tabla de posiciones <RiArrowRightLine aria-hidden="true" />
                </StandingsButton>
              )}
              <TextAction type="button" onClick={onShowStats} disabled={loadingStats}>
                {loadingStats ? "Cargando partidos…" : "Ver partidos y estadísticas"}
                {!loadingStats && <RiArrowRightLine aria-hidden="true" />}
              </TextAction>
            </TournamentActions>
          </>
        )}
      </TournamentSection>

      <Activity aria-label="Actividad del equipo">
        <ActivityButton type="button" onClick={onShowDelegateRequests}>
          <ActivityIcon><RiShieldUserLine aria-hidden="true" /></ActivityIcon>
          <ActivityCopy>
            <strong>Solicitudes de cambios</strong>
            <span>{requestStatus}</span>
          </ActivityCopy>
          <RiArrowRightLine aria-hidden="true" />
        </ActivityButton>
      </Activity>
    </Overview>
  );
}

const Overview = styled.section`
  width: 100%;
  min-width: 0;
`;

const Identity = styled.div`
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  padding: 8px 0 28px;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};

  @media (max-width: 900px) {
    grid-template-columns: 84px minmax(0, 1fr);
    gap: 18px;
  }

  @media (max-width: 560px) {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 14px;
    padding-bottom: 22px;
  }
`;

const Crest = styled.div`
  width: 100px;
  height: 100px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: ${({ theme }) => theme.bgtotal};

  img, svg { width: 80px; height: 80px; object-fit: contain; }

  @media (max-width: 900px) {
    width: 84px;
    height: 84px;
    img, svg { width: 68px; height: 68px; }
  }

  @media (max-width: 560px) {
    width: 72px;
    height: 72px;
    img, svg { width: 58px; height: 58px; }
  }
`;

const IdentityCopy = styled.div`
  min-width: 0;

  h2 {
    margin: 5px 0 10px;
    overflow-wrap: anywhere;
    font-size: 1.7rem;
    font-weight: 800;
    line-height: 1.16;
    letter-spacing: -0.025em;
  }

  @media (max-width: 560px) {
    h2 { font-size: 1.35rem; }
  }
`;

const DivisionName = styled.span`
  color: ${({ theme }) => theme.colorSubtitle};
  font-size: 0.84rem;
  font-weight: 600;
`;

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: ${({ theme }) => theme.colorSubtitle};
  font-size: 0.82rem;
  font-weight: 600;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $active, theme }) => $active ? theme.tournamentDashboard.metrics.accent : theme.colorSubtitle};
  }
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 9px;

  @media (max-width: 900px) {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  @media (max-width: 560px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 370px) {
    grid-template-columns: 1fr;
  }
`;

const ActionButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 15px;
  border-radius: 12px;
  font: inherit;
  font-size: 0.87rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 180ms ease, border-color 180ms ease, transform 180ms ease;

  svg { font-size: 1.1rem; flex: 0 0 auto; }
  &:active { transform: translateY(1px); }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }

  @media (max-width: 560px) {
    padding: 9px;
    font-size: 0.79rem;
  }
`;

const PrimaryButton = styled(ActionButton)`
  border: 1px solid ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.primary};
  color: #071e2a;

  &:hover { background: ${({ theme }) => theme.bg5}; border-color: ${({ theme }) => theme.bg5}; }
`;

const SecondaryButton = styled(ActionButton)`
  border: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bgcards};
  color: ${({ theme }) => theme.text};

  &:hover { border-color: ${({ theme }) => theme.primary}; background: ${({ theme }) => theme.bgtotal}; }
`;

const ReviewNotice = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 22px 0 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  font-size: 0.87rem;
  line-height: 1.5;

  svg { flex: 0 0 auto; margin-top: 2px; color: ${({ theme }) => theme.primary}; font-size: 1.1rem; }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
  padding: 30px 0;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 26px 0;
  }
`;

const Section = styled.section`
  min-width: 0;

  h3 { margin: 0 0 8px; font-size: 1.04rem; font-weight: 750; }
  p { margin: 0 0 14px; color: ${({ theme }) => theme.colorSubtitle}; font-size: 0.88rem; line-height: 1.5; }
`;

const TextAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.tournamentDashboard.hero.accentStrong};
  font: inherit;
  font-size: 0.89rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: wait; }

  svg { transition: transform 180ms ease; }
  &:hover svg { transform: translateX(3px); }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { svg { transition: none; } }
`;

const TournamentSection = styled.section`
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.tournamentDashboard.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.tournamentDashboard.surface};

  @media (max-width: 560px) { padding: 18px; }
`;

const TournamentHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;

  > div:nth-child(2) { flex: 1; min-width: 0; }
  h3 { margin: 0; font-size: clamp(1.15rem, 2.5vw, 1.4rem); line-height: 1.2; }
`;

const TournamentIcon = styled.span`
  display: grid;
  place-items: center;
  width: 43px;
  height: 43px;
  flex: 0 0 43px;
  border-radius: 12px;
  background: ${({ theme }) => theme.tournamentDashboard.primarySoft};
  color: ${({ theme }) => theme.tournamentDashboard.hero.accentStrong};
  font-size: 1.3rem;
`;

const TournamentName = styled.p`
  margin: 4px 0 0;
  color: ${({ theme }) => theme.tournamentDashboard.muted};
  font-size: 0.86rem;
  overflow-wrap: anywhere;
`;

const TournamentStatus = styled.span`
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  background: ${({ theme }) => theme.tournamentDashboard.metrics.accentSoft};
  color: ${({ theme }) => theme.tournamentDashboard.metrics.accentStrong};
  font-size: 0.75rem;
  font-weight: 750;
`;

const TournamentMeta = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 15px 0 19px 56px;
  color: ${({ theme }) => theme.tournamentDashboard.muted};
  font-size: 0.85rem;

  @media (max-width: 560px) { margin-left: 0; }
`;

const StandingsSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.tournamentDashboard.border};
  border-bottom: 1px solid ${({ theme }) => theme.tournamentDashboard.border};

  @media (max-width: 560px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;

const SummaryMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 15px 18px;
  strong { color: ${({ $featured, theme }) => $featured ? theme.tournamentDashboard.hero.accentStrong : theme.text}; font-size: 1.45rem; line-height: 1; font-variant-numeric: tabular-nums; }
  small { font-size: 0.9rem; }
  span { color: ${({ theme }) => theme.tournamentDashboard.muted}; font-size: 0.77rem; }

  & + & { border-left: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; }

  @media (max-width: 560px) {
    padding: 13px;
    &:nth-child(3) { border-left: 0; border-top: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; }
    &:nth-child(4) { border-top: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; }
  }
`;

const TournamentActions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 22px;
  margin-top: 18px;

  @media (max-width: 560px) { align-items: stretch; flex-direction: column; }
`;

const StandingsButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 15px;
  border: 1px solid ${({ theme }) => theme.primary};
  border-radius: 11px;
  background: ${({ theme }) => theme.primary};
  color: #071e2a;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 750;
  cursor: pointer;

  &:hover { background: ${({ theme }) => theme.bg5}; border-color: ${({ theme }) => theme.bg5}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 3px; }
`;

const TournamentMessage = styled.p`
  margin: 17px 0 0;
  color: ${({ theme }) => theme.tournamentDashboard.muted};
  font-size: 0.88rem;
  line-height: 1.5;
`;

const InlineButton = styled.button`
  margin-left: 7px;
  padding: 0;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.tournamentDashboard.hero.accentStrong};
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 3px; }
`;

const Details = styled.dl`
  margin: 0;

  div { display: grid; grid-template-columns: 100px minmax(0, 1fr); gap: 10px; padding: 7px 0; }
  dt { color: ${({ theme }) => theme.colorSubtitle}; font-size: 0.86rem; }
  dd { margin: 0; overflow-wrap: anywhere; font-size: 0.89rem; font-weight: 650; }

  @media (max-width: 400px) { div { grid-template-columns: 1fr; gap: 2px; } }
`;

const Activity = styled.section`
  margin-top: 20px;
`;

const ActivityButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 76px;
  padding: 14px 0;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.text};
  font: inherit;
  text-align: left;
  cursor: pointer;

  & > svg:last-child { margin-left: auto; color: ${({ theme }) => theme.colorSubtitle}; transition: transform 180ms ease; }
  &:hover > svg:last-child { transform: translateX(3px); color: ${({ theme }) => theme.primary}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { & > svg:last-child { transition: none; } }
`;

const ActivityIcon = styled.span`
  display: grid;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.tournamentDashboard.hero.accentStrong};
  font-size: 1.1rem;
`;

const ActivityCopy = styled.span`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;

  strong { font-size: 0.89rem; font-weight: 700; }
  span { color: ${({ theme }) => theme.colorSubtitle}; font-size: 0.8rem; line-height: 1.35; }
`;
