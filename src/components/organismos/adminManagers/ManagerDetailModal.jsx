import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  Modal,
  Badge,
  BtnNormal,
  Btnsave,
  ContainerScroll,
} from "../../../index";
import { TabsNavigation, TabContent } from "../../moleculas/TabsNavigation";
import { v } from "../../../styles/variables";
import {
  BiUserCircle,
  BiWifi,
  BiWifiOff,
  BiTime,
  BiIdCard,
  BiLogoGoogle,
  BiEnvelope,
  BiTrophy,
  BiGridAlt,
  BiLock,
} from "react-icons/bi";

const HEARTBEAT_ONLINE_GRACE_MS = 75000;

export const ManagerDetailModal = ({
  isOpen,
  onClose,
  manager,
  onlineUsers = {},
  onUpdateLimits,
  onUpdateSuspension,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [limitForm, setLimitForm] = useState({
    max_divisions_total: "",
    max_teams_total: "",
    max_players_total: "",
  });
  const [savingLimits, setSavingLimits] = useState(false);
  const [savingSuspension, setSavingSuspension] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [isOpen, manager?.id]);

  useEffect(() => {
    const league = manager?.leagues?.[0];
    setLimitForm({
      max_divisions_total: formatLimitInput(league?.max_divisions_total),
      max_teams_total: formatLimitInput(league?.max_teams_total),
      max_players_total: formatLimitInput(league?.max_players_total),
    });
  }, [isOpen, manager?.id, manager?.leagues]);

  const managerTabs = [
    { id: 0, label: "Perfil & Cuenta", icon: <BiUserCircle size={20} /> },
    { id: 1, label: "Gestion Deportiva", icon: <BiTrophy size={20} /> },
    { id: 2, label: "Limites", icon: <BiGridAlt size={20} /> },
  ];

  const getGoogleInfo = (mgr) => {
    if (!mgr) return { linked: false };
    const isGoogleAvatar = mgr.avatar_url?.includes("googleusercontent");
    const isGmail = mgr.email?.includes("@gmail.com");
    if (isGoogleAvatar || isGmail) return { linked: true, email: mgr.email };
    return { linked: false, email: null };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "---";
    return new Date(dateString).toLocaleString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "";

    const diffSeconds = Math.round((new Date(dateString).getTime() - now) / 1000);
    const absSeconds = Math.abs(diffSeconds);
    const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

    if (absSeconds < 60) return "hace unos segundos";
    if (absSeconds < 3600) return formatter.format(Math.round(diffSeconds / 60), "minute");
    if (absSeconds < 86400) return formatter.format(Math.round(diffSeconds / 3600), "hour");
    return formatter.format(Math.round(diffSeconds / 86400), "day");
  };

  const formatLastSeen = (dateString) => {
    if (!dateString) return "---";
    return `${formatDate(dateString)} (${formatRelativeTime(dateString)})`;
  };

  const getLastSeenAt = (mgr) => (
    mgr?.metadata?.last_seen_at ||
    mgr?.metadata?.lastSeenAt ||
    mgr?.last_seen_at ||
    mgr?.last_sign_in_at ||
    null
  );

  const getPresenceInfo = (mgrId) => {
    const presence = onlineUsers[mgrId];
    if (!presence) return null;
    if (presence === true) return { online: true };
    return presence;
  };

  const getConnectionStatus = (mgr) => {
    const presence = getPresenceInfo(mgr.id);
    const isOnline = presence?.online === true;
    const lastSeenAt = presence?.last_seen_at || getLastSeenAt(mgr);
    const lastSeenTime = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
    const isRecentlySeen = Number.isFinite(lastSeenTime) && lastSeenTime > 0 && now - lastSeenTime < HEARTBEAT_ONLINE_GRACE_MS;

    if (isOnline || isRecentlySeen) {
      return {
        status: "En linea",
        color: v.verde,
        icon: <BiWifi />,
        isRealtime: isOnline,
        isOnline: true,
        lastSeenAt,
      };
    }

    if (!lastSeenAt) {
      return {
        status: "Sin actividad",
        color: v.gray,
        icon: <BiWifiOff />,
        isOnline: false,
        lastSeenAt: null,
      };
    }

    return {
      status: "Desconectado",
      color: v.gray,
      icon: <BiWifiOff />,
      isOnline: false,
      lastSeenAt,
    };
  };

  const formatLimitInput = (value) => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const parseLimitInput = (value) => {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue) return null;
    const parsedValue = Number(normalizedValue);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) return null;
    return Math.floor(parsedValue);
  };

  const getDivisionTeamCount = (division) => {
    const teams = division?.teams || [];
    if (!Array.isArray(teams) || teams.length === 0) return 0;
    if (teams.length === 1 && Number.isFinite(teams[0]?.count)) return teams[0].count;
    return teams.filter((team) => team?.id || team?.name).length;
  };

  const getTeamPlayersCount = (team) => {
    const players = team?.players || [];
    if (!Array.isArray(players) || players.length === 0) return 0;
    if (Number.isFinite(players[0]?.count)) return players[0].count;
    return players.length;
  };

  const getLeagueUsage = (league) => {
    const divisions = league?.divisions || [];
    const teams = divisions.flatMap((division) => division?.teams || []);
    return {
      divisions: divisions.length,
      teams: divisions.reduce((total, division) => total + getDivisionTeamCount(division), 0),
      players: teams.reduce((total, team) => total + getTeamPlayersCount(team), 0),
    };
  };

  const getLimitLabel = (value) => {
    const parsedValue = parseLimitInput(value);
    return parsedValue === null ? "Sin limite" : parsedValue;
  };

  const handleLimitChange = (event) => {
    const { name, value } = event.target;
    setLimitForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveLimits = async () => {
    if (!onUpdateLimits) return;
    const leagueId = manager?.leagues?.[0]?.id;
    setSavingLimits(true);

    const success = await onUpdateLimits(leagueId, {
      max_divisions_total: parseLimitInput(limitForm.max_divisions_total),
      max_teams_total: parseLimitInput(limitForm.max_teams_total),
      max_players_total: parseLimitInput(limitForm.max_players_total),
    });

    setSavingLimits(false);
    return success;
  };

  const handleSuspensionToggle = async (event) => {
    if (!onUpdateSuspension || !manager?.id) return;
    const shouldSuspend = !event.target.checked;
    setSavingSuspension(true);
    await onUpdateSuspension(manager.id, shouldSuspend);
    setSavingSuspension(false);
  };

  if (!manager) return null;

  const googleInfo = getGoogleInfo(manager);
  const currentStatus = getConnectionStatus(manager);
  const currentLeague = manager.leagues?.[0];
  const leagueUsage = getLeagueUsage(currentLeague);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Perfil de Usuario" width="600px">
      <DetailContainer>
        <DetailHeader>
          <div className="profile-image">
            {manager.avatar_url ? <img src={manager.avatar_url} alt="av" /> : <BiUserCircle size={60} />}
          </div>
          <div className="profile-summary">
            <h2>{manager.full_name}</h2>
            <div className="badges-row">
              <Badge color={v.colorPrincipal}>Manager</Badge>
              {manager.is_suspended && <Badge color={v.rojo}>Bloqueado</Badge>}
              <Badge color={currentStatus.color}>
                <FlexRow>
                  {currentStatus.icon}
                  {currentStatus.status}
                  {currentStatus.isRealtime && <span className="pulse-dot" aria-hidden="true" />}
                </FlexRow>
              </Badge>
            </div>
          </div>
        </DetailHeader>

        <TabsWrapper>
          <TabsNavigation
            tabs={managerTabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </TabsWrapper>

        {activeTab === 0 && (
          <TabContent>
            <InfoGrid>
              <InfoBox>
                <h4><BiTime /> Actividad</h4>
                <div className="row">
                  <label>{currentStatus.isOnline ? "Estado actual:" : "Ultima conexion:"}</label>
                  <span>{currentStatus.isOnline ? "En linea ahora" : formatLastSeen(currentStatus.lastSeenAt)}</span>
                </div>
                <div className="row">
                  <label>Miembro desde:</label>
                  <span>{formatDate(manager.created_at)}</span>
                </div>
              </InfoBox>

              <InfoBox>
                <h4><BiIdCard /> Credenciales</h4>
                <div className="row">
                  <label>Correo:</label> <span className="email-text">{manager.email}</span>
                </div>

                <div className="google-section">
                  <label>Vinculacion:</label>
                  {googleInfo.linked ? (
                    <div className="linked-card">
                      <BiLogoGoogle color="#4285F4" size={24} />
                      <div className="link-info">
                        <span className="link-title">Cuenta Google</span>
                        <span className="link-email">{googleInfo.email}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="not-linked"><BiEnvelope /> Correo y Contrasena</span>
                  )}
                </div>
              </InfoBox>
            </InfoGrid>

            <SystemId>
              <small>System ID:</small> <code>{manager.id}</code>
            </SystemId>
          </TabContent>
        )}

        {activeTab === 1 && (
          <TabContent>
            <InfoBox $fullWidth>
              <h4><BiTrophy /> Liga Actual</h4>
              {currentLeague ? (
                <LeagueCard>
                  <div className="header-league">
                    <h3>{currentLeague.name}</h3>
                  </div>
                  <div className="content-league">
                    <span className="sub-label"><BiGridAlt /> Divisiones:</span>
                    <StyledScroll>
                      {currentLeague.divisions?.length > 0 ? (
                        currentLeague.divisions.map((div, i) => (
                          <div key={i} className="div-row">
                            <span>{div.name}</span>
                            <Badge color={v.gris}>{getDivisionTeamCount(div)} equipos</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="muted">Sin divisiones activas.</p>
                      )}
                    </StyledScroll>
                  </div>
                </LeagueCard>
              ) : (
                <EmptyLeague>
                  <v.iconocorona size={40} />
                  <p>Sin asignacion deportiva.</p>
                </EmptyLeague>
              )}
            </InfoBox>
          </TabContent>
        )}

        {activeTab === 2 && (
          <TabContent>
            <InfoBox $fullWidth>
              {currentLeague ? (
                <LimitsStack>
                  <AccessPanel $suspended={manager.is_suspended}>
                    <AccessInfo>
                      <h4><BiLock /> Acceso de cuenta</h4>
                      <strong>{manager.is_suspended ? "Cuenta bloqueada" : "Cuenta activa"}</strong>
                      <span>
                        {manager.is_suspended
                          ? "El manager no podra acceder a la app hasta que reactives la cuenta."
                          : "El manager puede entrar y administrar su liga normalmente."}
                      </span>
                      {manager.suspended_at && (
                        <small>Bloqueada desde: {formatDate(manager.suspended_at)}</small>
                      )}
                    </AccessInfo>
                    <SwitchLabel>
                      <input
                        type="checkbox"
                        checked={!manager.is_suspended}
                        onChange={handleSuspensionToggle}
                        disabled={savingSuspension || !onUpdateSuspension}
                      />
                      <span className="switch" />
                    </SwitchLabel>
                  </AccessPanel>

                  <LimitsPanel>
                    <h4><BiGridAlt /> Limites de esta cuenta</h4>
                  <UsageGrid>
                    <UsageItem>
                      <strong>{leagueUsage.divisions}</strong>
                      <span>Divisiones usadas</span>
                      <small>Limite: {getLimitLabel(currentLeague.max_divisions_total)}</small>
                    </UsageItem>
                    <UsageItem>
                      <strong>{leagueUsage.teams}</strong>
                      <span>Equipos usados</span>
                      <small>Limite: {getLimitLabel(currentLeague.max_teams_total)}</small>
                    </UsageItem>
                    <UsageItem>
                      <strong>{leagueUsage.players}</strong>
                      <span>Jugadores usados</span>
                      <small>Limite: {getLimitLabel(currentLeague.max_players_total)}</small>
                    </UsageItem>
                  </UsageGrid>

                  <LimitForm>
                    <label>
                      Maximo de divisiones
                      <input
                        type="number"
                        min="0"
                        name="max_divisions_total"
                        value={limitForm.max_divisions_total}
                        onChange={handleLimitChange}
                        placeholder="Sin limite"
                      />
                    </label>
                    <label>
                      Maximo de equipos
                      <input
                        type="number"
                        min="0"
                        name="max_teams_total"
                        value={limitForm.max_teams_total}
                        onChange={handleLimitChange}
                        placeholder="Sin limite"
                      />
                    </label>
                    <label>
                      Maximo de jugadores
                      <input
                        type="number"
                        min="0"
                        name="max_players_total"
                        value={limitForm.max_players_total}
                        onChange={handleLimitChange}
                        placeholder="Sin limite"
                      />
                    </label>
                  </LimitForm>

                  <Btnsave
                    titulo={savingLimits ? "Guardando..." : "Guardar limites"}
                    bgcolor={v.colorPrincipal}
                    icono={<v.iconoguardar />}
                    funcion={handleSaveLimits}
                    disabled={savingLimits || !onUpdateLimits}
                    width="100%"
                  />
                  </LimitsPanel>
                </LimitsStack>
              ) : (
                <EmptyLeague>
                  <v.iconocorona size={40} />
                  <p>Sin asignacion deportiva.</p>
                </EmptyLeague>
              )}
            </InfoBox>
          </TabContent>
        )}

        <FooterActions>
          <BtnNormal
            titulo="Cerrar"
            bgcolor={v.gray}
            funcion={onClose}
          />
        </FooterActions>
      </DetailContainer>
    </Modal>
  );
};

const TabsWrapper = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const DetailContainer = styled.div`
  display: flex; flex-direction: column; gap: 20px; color: ${({ theme }) => theme.text};
`;

const DetailHeader = styled.div`
  display: flex; align-items: center; gap: 15px; padding-bottom: 10px;
  .profile-image {
    width: 70px; height: 70px; border-radius: 50%; overflow: hidden; background: ${({ theme }) => theme.bg3};
    display: flex; justify-content: center; align-items: center;
    img { width: 100%; height: 100%; object-fit: cover; }
  }
  .profile-summary {
    h2 { margin: 0 0 5px 0; font-size: 1.3rem; }
    .badges-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  }
`;

const FlexRow = styled.div`
  display: flex; align-items: center; gap: 6px;
  .pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 2s infinite;
    margin-left: 2px;
  }
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
  }
`;

const InfoGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  @media (max-width: 550px) { grid-template-columns: 1fr; }
`;

const InfoBox = styled.div`
  display: flex; flex-direction: column; gap: 10px; width: ${props => props.$fullWidth ? "100%" : "auto"};
  h4 {
    margin: 0; font-size: 0.85rem; text-transform: uppercase; color: ${({ theme }) => theme.primary};
    display: flex; align-items: center; gap: 6px; opacity: 0.9;
  }
  .row {
    display: flex; flex-direction: column; gap: 2px;
    label { font-size: 0.75rem; font-weight: 700; opacity: 0.6; }
    span { font-size: 0.9rem; }
    .email-text { font-family: monospace; font-size: 0.85rem; word-break: break-all; }
  }
  .google-section {
    margin-top: 5px;
    label { display: block; font-size: 0.75rem; font-weight: 700; opacity: 0.6; margin-bottom: 6px; }
    .linked-card {
      display: flex; align-items: center; gap: 10px; background: ${({ theme }) => theme.bg3};
      padding: 10px; border-radius: 8px;
      .link-info { display: flex; flex-direction: column; }
      .link-title { font-weight: 700; font-size: 0.85rem; }
      .link-email { font-size: 0.75rem; opacity: 0.8; word-break: break-all; }
    }
    .not-linked { font-size: 0.85rem; font-style: italic; opacity: 0.5; display: flex; align-items: center; gap: 5px; }
  }
`;

const SystemId = styled.div`
  margin-top: 15px; padding-top: 10px; border-top: 1px solid ${({ theme }) => theme.bg3};
  display: flex; align-items: center; gap: 8px;
  small { opacity: 0.5; font-size: 0.75rem; }
  code { background: ${({ theme }) => theme.bg3}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-family: monospace; }
`;

const LeagueCard = styled.div`
  .header-league { margin-bottom: 12px; border-bottom: 1px solid ${({ theme }) => theme.bg3}; padding-bottom: 8px; }
  .sub-label { display: block; font-size: 0.8rem; font-weight: 700; opacity: 0.7; margin-bottom: 8px; }
  .div-row {
    display: flex; justify-content: space-between; align-items: center; padding: 8px 10px;
    background: ${({ theme }) => theme.bg3}; border-radius: 6px; margin-bottom: 6px; font-size: 0.9rem;
  }
  .muted { font-size: 0.85rem; font-style: italic; opacity: 0.5; text-align: center; margin-top: 10px; }
`;

const LimitsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const AccessPanel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid ${({ $suspended }) => ($suspended ? "rgba(231, 76, 60, 0.35)" : "rgba(46, 204, 113, 0.35)")};
  border-radius: 8px;
  background: ${({ theme }) => theme.bgtotal || theme.bg2};

  @media (max-width: 550px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const AccessInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;

  strong {
    font-size: 0.95rem;
  }

  span,
  small {
    font-size: 0.78rem;
    opacity: 0.68;
    line-height: 1.35;
  }
`;

const SwitchLabel = styled.label`
  position: relative;
  display: inline-flex;
  width: 52px;
  height: 30px;
  flex: 0 0 auto;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .switch {
    width: 100%;
    height: 100%;
    border-radius: 999px;
    background: ${v.rojo};
    cursor: pointer;
    transition: 0.2s ease;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
  }

  .switch::after {
    content: "";
    position: absolute;
    top: 4px;
    left: 4px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    transition: 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }

  input:checked + .switch {
    background: ${v.verde};
  }

  input:checked + .switch::after {
    transform: translateX(22px);
  }

  input:disabled + .switch {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

const LimitsPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  margin-bottom: 14px;
  border: 1px solid ${({ theme }) => theme.bg3};
  border-radius: 8px;
  background: ${({ theme }) => theme.bgtotal || theme.bg2};
`;

const UsageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 550px) {
    grid-template-columns: 1fr;
  }
`;

const UsageItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  background: ${({ theme }) => theme.bg3};

  strong {
    font-size: 1.25rem;
    line-height: 1;
    color: ${({ theme }) => theme.primary};
  }

  span {
    font-size: 0.75rem;
    font-weight: 700;
  }

  small {
    font-size: 0.7rem;
    opacity: 0.65;
  }
`;

const LimitForm = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
    font-size: 0.72rem;
    font-weight: 700;
    opacity: 0.85;
  }

  input {
    width: 100%;
    min-width: 0;
    padding: 9px 10px;
    border: 1px solid ${({ theme }) => theme.bg4 || theme.bg3};
    border-radius: 8px;
    outline: none;
    color: ${({ theme }) => theme.text};
    background: ${({ theme }) => theme.bg3};
    font-size: 0.9rem;
  }

  input:focus {
    border-color: ${({ theme }) => theme.primary};
  }

  @media (max-width: 550px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyLeague = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 30px; color: ${({ theme }) => theme.text}; opacity: 0.5; gap: 10px; font-size: 0.9rem;
`;

const StyledScroll = styled(ContainerScroll)` max-height: 150px; `;
const FooterActions = styled.div` display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; `;
