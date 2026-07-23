import React, {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import styled from "styled-components";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiFileList3Line,
  RiGroupLine,
  RiMailSendLine,
} from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { BtnNormal } from "../moleculas/BtnNormal";
import { TabsNavigation, TabContent } from "../moleculas/TabsNavigation";
import { Skeleton } from "../atomos/Skeleton";
import { Toast } from "../atomos/Toast";
import { TeamCard } from "../organismos/equipos/TeamCard";
import { TeamForm } from "../organismos/formularios/TeamForm";
import { TeamTransferModal } from "../organismos/equipos/TeamTransferModal";
import { ActiveDelegateInvitationsModal } from "../organismos/equipos/ActiveDelegateInvitationsModal";
import { TeamDetailModal } from "../organismos/TeamDetailModal";
import { PlayerManager } from "../organismos/formularios/PlayerManager";
import { Card } from "../moleculas/Card";
import { BtnGreen } from "../moleculas/BtnGreen";
import { Modal } from "../organismos/Modal";
import { ConfirmModal } from "../organismos/ConfirmModal";
import { EmptyState } from "../organismos/EmptyState";
import { DelegateTeamDetailPanel } from "../organismos/equipos/DelegateTeamDetailPanel";
import { LigaDelegateRequestsTab } from "../organismos/tabs/liga/LigaDelegateRequestsTab";
import { supabase } from "../../supabase/supabase.config";
import {
  getDelegateInvitations,
  getTeamsDelegateChangeRequests,
  reviewDelegateChangeRequest,
} from "../../services/delegates";
import { useDivisionStore } from "../../store/DivisionStore";
import { ROLES } from "../../utils/constants";
import { v } from "../../styles/variables";

const teamNameCollator = new Intl.Collator("es", {
  sensitivity: "base",
  numeric: true,
});

const orderTeamsOnlyWhenNeeded = (teams) => {
  if (!Array.isArray(teams) || teams.length < 2) return teams || [];

  const needsReorder = teams.some(
    (team, index) =>
      index > 0 &&
      teamNameCollator.compare(teams[index - 1]?.name || "", team?.name || "") > 0
  );

  return needsReorder
    ? [...teams].sort((first, second) =>
        teamNameCollator.compare(first?.name || "", second?.name || "")
      )
    : teams;
};

export const EquiposTemplate = ({
  equipos,
  division,
  loading,
  isUploading,
  form,
  preview,
  file,
  originalFile,
  isFormOpen,
  setIsFormOpen,
  teamToEdit,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  onFormChange,
  onFileChange,
  onClearImage,
  onGenerateLogo,
  onRemoveBg,
  onSave,
  onDelete,
  onCreate,
  onEdit,
  onConfirmDelete,
  onDelegateLinkStateChanged,
  onDelegateRequestSubmitted,
  onTeamTransferred,
  tabs,
  participatingIds = [],
  state,
  setState,
  accessRole,
  canCreateTeams = true,
  canDeleteTeams = true,
  canTransferTeams = true,
  requestSummariesLoading = false,
  delegateRequestOverview = {
    pendingCount: 0,
    pendingTeamsCount: 0,
    pendingTeamNames: [],
    approvedTeamsCount: 0,
    rejectedTeamsCount: 0,
  },
}) => {
  const { divisionId: routeDivisionId, teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const [globalRequests, setGlobalRequests] = useState([]);
  const [loadingGlobalRequests, setLoadingGlobalRequests] = useState(false);
  const [isGlobalRequestsOpen, setIsGlobalRequestsOpen] = useState(false);
  const initialView = location.state?.initialView;
  const visibleDivisionId = routeDivisionId || division?.id;
  const isCreateRoute = teamId === "crear";
  const isDelegateView = accessRole === ROLES.DELEGATE;
  const teamFromUrl = isCreateRoute
    ? null
    : equipos?.find((team) => String(team.id) === String(teamId));
  const teamFromUrlDivision = teamFromUrl?.division || division;
  const hasPendingDelegateRequests = delegateRequestOverview.pendingCount > 0;
  const hasDelegateReviewedUpdates =
    delegateRequestOverview.approvedTeamsCount > 0 ||
    delegateRequestOverview.rejectedTeamsCount > 0;
  const delegateReviewedSummary = [
    delegateRequestOverview.approvedTeamsCount > 0
      ? `${delegateRequestOverview.approvedTeamsCount} aprobado${
          delegateRequestOverview.approvedTeamsCount === 1 ? "" : "s"
        }`
      : null,
    delegateRequestOverview.rejectedTeamsCount > 0
      ? `${delegateRequestOverview.rejectedTeamsCount} rechazado${
          delegateRequestOverview.rejectedTeamsCount === 1 ? "" : "s"
        }`
      : null,
  ]
    .filter(Boolean)
    .join(" y ");

  const formatPendingTeamsNames = (names) => {
    if (!names || names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} y ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  };

  const pendingTeamsText = formatPendingTeamsNames(delegateRequestOverview.pendingTeamNames);

  const modalTabs = [
    { id: "info", label: "Datos del Equipo", icon: <RiFileList3Line /> },
    { id: "players", label: "Jugadores", icon: <RiGroupLine /> },
  ];

  const [activeTab, setActiveTab] = useState("info");
  const [teamFilter, setTeamFilter] = useState("all");
  const [isInvitePanelActive, setIsInvitePanelActive] = useState(false);
  const [isInvitationsModalOpen, setIsInvitationsModalOpen] = useState(false);
  const [delegateInvitations, setDelegateInvitations] = useState([]);
  const [invitationStatusClock, setInvitationStatusClock] = useState(() => Date.now());
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [invitationsError, setInvitationsError] = useState("");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [teamToTransfer, setTeamToTransfer] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });
  const hasOpenedCreateRouteRef = useRef(false);
  const detailScrollPositionRef = useRef(0);
  const pendingDetailScrollPreserveOnOpenRef = useRef(false);
  const pendingDetailScrollRestoreRef = useRef(false);
  const teamsGridRef = useRef(null);
  const pendingTeamFilterRef = useRef("all");
  const pendingTeamFilterCommitRef = useRef(null);
  const teamGridPrewarmFrameRef = useRef(null);
  const teamGridReadyFrameRef = useRef(null);
  const teamGridCleanupTimeoutRef = useRef(null);
  const teamGridLayersReadyRef = useRef(false);
  const { divisiones } = useDivisionStore();

  useEffect(() => {
    pendingTeamFilterRef.current = "all";
    setTeamFilter("all");
  }, [visibleDivisionId]);

  const showToast = (msg, type = "success") =>
    setToast({ show: true, msg, type });

  const getEquiposPath = useCallback((nextTeamId = "") => {
    const suffix = nextTeamId ? `/${nextTeamId}` : "";
    return visibleDivisionId
      ? `/division/${visibleDivisionId}/equipos${suffix}`
      : `/equipos${suffix}`;
  }, [visibleDivisionId]);

  const participatingTeamIds = useMemo(
    () => new Set(participatingIds.map((id) => String(id))),
    [participatingIds]
  );
  const orderedTeams = useMemo(() => orderTeamsOnlyWhenNeeded(equipos), [equipos]);
  const participatingTeamCount = useMemo(
    () =>
      orderedTeams.reduce(
        (count, team) =>
          count + (participatingTeamIds.has(String(team.id)) ? 1 : 0),
        0
      ),
    [orderedTeams, participatingTeamIds]
  );
  const delegateLinkCounts = useMemo(
    () =>
      orderedTeams.reduce(
        (counts, team) => {
          const isLinked = Boolean(
            team?.delegateAssignment?.delegate_profile_id
          );
          counts[isLinked ? "linked" : "unlinked"] += 1;
          return counts;
        },
        { linked: 0, unlinked: 0 }
      ),
    [orderedTeams]
  );
  const filteredTeams = useMemo(() => {
    if (teamFilter === "participating") {
      return orderedTeams.filter((team) =>
        participatingTeamIds.has(String(team.id))
      );
    }

    if (teamFilter === "linked") {
      return orderedTeams.filter((team) =>
        Boolean(team?.delegateAssignment?.delegate_profile_id)
      );
    }

    if (teamFilter === "unlinked") {
      return orderedTeams.filter(
        (team) => !team?.delegateAssignment?.delegate_profile_id
      );
    }

    return orderedTeams;
  }, [orderedTeams, participatingTeamIds, teamFilter]);
  const teamLayoutDependency = useMemo(
    () => `${teamFilter}:${filteredTeams.map((team) => team.id).join(",")}`,
    [filteredTeams, teamFilter]
  );
  const visibleTeamIds = useMemo(
    () => (equipos || []).map((team) => team.id).filter(Boolean),
    [equipos]
  );
  const teamsWithPendingInvitation = useMemo(() => {
    const pendingTeamIds = new Set();

    delegateInvitations.forEach((invitation) => {
      const expiresAt = new Date(invitation.expires_at).getTime();
      const isPending =
        !invitation.is_used &&
        !invitation.revoked_at &&
        Number.isFinite(expiresAt) &&
        expiresAt > invitationStatusClock;

      if (isPending && invitation.team_id) {
        pendingTeamIds.add(String(invitation.team_id));
      }
    });

    return pendingTeamIds;
  }, [delegateInvitations, invitationStatusClock]);

  const loadDelegateInvitations = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingInvitations(true);
      setInvitationsError("");
    }

    try {
      const invitations = await getDelegateInvitations(visibleTeamIds);
      setDelegateInvitations(invitations);
      setInvitationStatusClock(Date.now());
      setInvitationsError("");
    } catch (error) {
      if (!silent) {
        setInvitationsError(
          error.message || "No se pudieron cargar las invitaciones."
        );
      }
    } finally {
      if (!silent) setLoadingInvitations(false);
    }
  }, [visibleTeamIds]);

  const handleOpenInvitations = () => {
    setIsInvitationsModalOpen(true);
    loadDelegateInvitations();
  };

  const handleCloseInvitations = () => {
    setIsInvitationsModalOpen(false);
  };

  useEffect(() => {
    loadDelegateInvitations({ silent: true });
  }, [loadDelegateInvitations]);

  useEffect(() => {
    const now = Date.now();
    const nearestExpiration = delegateInvitations.reduce((nearest, invitation) => {
      if (invitation.is_used || invitation.revoked_at) return nearest;

      const expiresAt = new Date(invitation.expires_at).getTime();
      if (!Number.isFinite(expiresAt) || expiresAt <= now) return nearest;

      return Math.min(nearest, expiresAt);
    }, Number.POSITIVE_INFINITY);

    if (!Number.isFinite(nearestExpiration)) return undefined;

    const maximumTimeout = 2147483647;
    const timeoutId = window.setTimeout(
      () => setInvitationStatusClock(Date.now()),
      Math.min(Math.max(nearestExpiration - now + 100, 0), maximumTimeout)
    );

    return () => window.clearTimeout(timeoutId);
  }, [delegateInvitations, invitationStatusClock]);

  useEffect(() => {

    const visibleTeamIdSet = new Set(visibleTeamIds.map((id) => String(id)));
    let refreshTimeoutId;
    let isActive = true;

    const refreshFromRealtime = (payload) => {
      if (!isActive) return;

      const changedTeamId = payload.new?.team_id || payload.old?.team_id;
      if (changedTeamId && !visibleTeamIdSet.has(String(changedTeamId))) return;

      window.clearTimeout(refreshTimeoutId);
      refreshTimeoutId = window.setTimeout(() => {
        loadDelegateInvitations({ silent: true });
      }, 120);
    };

    const channel = supabase
      .channel(`delegate-invitations-${visibleDivisionId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delegate_invitations",
        },
        refreshFromRealtime
      )
      .subscribe((status) => {
        if (!isActive) return;

        if (status === "SUBSCRIBED") {
          loadDelegateInvitations({ silent: true });
        }
      });

    return () => {
      isActive = false;
      window.clearTimeout(refreshTimeoutId);
      supabase.removeChannel(channel);
    };
  }, [
    loadDelegateInvitations,
    visibleDivisionId,
    visibleTeamIds,
  ]);

  useEffect(() => {
    if (!isInvitationsModalOpen || !invitationsError) return undefined;

    const retryIntervalId = window.setInterval(() => {
      loadDelegateInvitations({ silent: true });
    }, 5000);

    return () => window.clearInterval(retryIntervalId);
  }, [invitationsError, isInvitationsModalOpen, loadDelegateInvitations]);

  const teamMotion = useMemo(
    () =>
      shouldReduceMotion
        ? {
            initial: false,
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.01 },
          }
        : {
            initial: { opacity: 0, y: 4 },
            animate: { opacity: 1, y: 0 },
            exit: {
              opacity: 0,
              transition: { duration: 0.1, ease: [0.4, 0, 1, 1] },
            },
            transition: {
              layout: { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] },
              opacity: { duration: 0.12, ease: [0.22, 1, 0.36, 1] },
              y: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
            },
          },
    [shouldReduceMotion]
  );

  const clearTeamGridAnimation = useCallback(() => {
    if (teamGridPrewarmFrameRef.current !== null) {
      window.cancelAnimationFrame(teamGridPrewarmFrameRef.current);
      teamGridPrewarmFrameRef.current = null;
    }

    if (teamGridReadyFrameRef.current !== null) {
      window.cancelAnimationFrame(teamGridReadyFrameRef.current);
      teamGridReadyFrameRef.current = null;
    }

    if (teamGridCleanupTimeoutRef.current !== null) {
      window.clearTimeout(teamGridCleanupTimeoutRef.current);
      teamGridCleanupTimeoutRef.current = null;
    }

    pendingTeamFilterCommitRef.current = null;
    teamGridLayersReadyRef.current = false;
    teamsGridRef.current?.removeAttribute("data-team-grid-animating");
  }, []);

  const prepareTeamGridLayers = useCallback(() => {
    if (shouldReduceMotion) return;

    const grid = teamsGridRef.current;
    if (!grid) return;

    grid.setAttribute("data-team-grid-animating", "");

    if (
      teamGridLayersReadyRef.current ||
      teamGridPrewarmFrameRef.current !== null ||
      teamGridReadyFrameRef.current !== null
    ) {
      return;
    }

    if (teamGridCleanupTimeoutRef.current !== null) {
      window.clearTimeout(teamGridCleanupTimeoutRef.current);
    }

    teamGridCleanupTimeoutRef.current = window.setTimeout(() => {
      if (!pendingTeamFilterCommitRef.current) {
        clearTeamGridAnimation();
      }
    }, 500);

    teamGridPrewarmFrameRef.current = window.requestAnimationFrame(() => {
      teamGridPrewarmFrameRef.current = null;
      teamGridReadyFrameRef.current = window.requestAnimationFrame(() => {
        teamGridReadyFrameRef.current = null;
        teamGridLayersReadyRef.current = true;

        const pendingCommit = pendingTeamFilterCommitRef.current;
        pendingTeamFilterCommitRef.current = null;
        pendingCommit?.();
      });
    });
  }, [clearTeamGridAnimation, shouldReduceMotion]);

  const handleTeamFilterPrewarm = useCallback(
    (nextFilter) => {
      if (nextFilter === pendingTeamFilterRef.current) return;
      prepareTeamGridLayers();
    },
    [prepareTeamGridLayers]
  );

  const handleTeamFilterChange = useCallback(
    (nextFilter) => {
      if (nextFilter === pendingTeamFilterRef.current) return;

      pendingTeamFilterRef.current = nextFilter;

      const commitFilter = () => {
        setTeamFilter(nextFilter);

        if (teamGridCleanupTimeoutRef.current !== null) {
          window.clearTimeout(teamGridCleanupTimeoutRef.current);
        }

        teamGridCleanupTimeoutRef.current = window.setTimeout(
          clearTeamGridAnimation,
          300
        );
      };

      if (shouldReduceMotion || !teamsGridRef.current) {
        clearTeamGridAnimation();
        commitFilter();
        return;
      }

      if (teamGridLayersReadyRef.current) {
        commitFilter();
        return;
      }

      pendingTeamFilterCommitRef.current = commitFilter;
      prepareTeamGridLayers();
    },
    [clearTeamGridAnimation, prepareTeamGridLayers, shouldReduceMotion]
  );

  useEffect(
    () => () => {
      clearTeamGridAnimation();
    },
    [clearTeamGridAnimation]
  );

  useEffect(() => {
    if (!routeDivisionId && division?.id && !isDelegateView) {
      const suffix = teamId ? `/${teamId}` : "";
      navigate(`/division/${division.id}/equipos${suffix}`, {
        replace: true,
        preventScrollReset: true,
        state: location.state,
      });
    }
  }, [division?.id, isDelegateView, location.state, navigate, routeDivisionId, teamId]);

  useEffect(() => {
    if (!isCreateRoute) {
      hasOpenedCreateRouteRef.current = false;
      return;
    }

    if (isDelegateView) {
      navigate(visibleDivisionId ? `/division/${visibleDivisionId}/equipos` : "/equipos", {
        replace: true,
      });
      return;
    }

    if (isFormOpen) {
      hasOpenedCreateRouteRef.current = true;
      return;
    }

    if (!hasOpenedCreateRouteRef.current && !isFormOpen) {
      hasOpenedCreateRouteRef.current = true;
      onCreate();
    }
  }, [isCreateRoute, isDelegateView, isFormOpen, navigate, onCreate, visibleDivisionId]);

  useEffect(() => {
    if (isFormOpen) {
      setActiveTab("info");
      setIsInvitePanelActive(false);
    }
  }, [isFormOpen]);

  useLayoutEffect(() => {
    if (teamFromUrl && pendingDetailScrollPreserveOnOpenRef.current) {
      pendingDetailScrollPreserveOnOpenRef.current = false;
      window.scrollTo({
        top: detailScrollPositionRef.current,
        left: 0,
        behavior: "auto",
      });
      return;
    }

    if (teamFromUrl || !pendingDetailScrollRestoreRef.current) return;

    pendingDetailScrollRestoreRef.current = false;
    window.scrollTo({
      top: detailScrollPositionRef.current,
      left: 0,
      behavior: "auto",
    });
  }, [teamFromUrl]);

  const loadGlobalRequests = useCallback(async () => {
    setLoadingGlobalRequests(true);
    try {
      const teamIds = equipos.map((t) => t.id);
      const reqs = await getTeamsDelegateChangeRequests(teamIds);
      setGlobalRequests(reqs);
    } catch (e) {
      console.error(e);
      setGlobalRequests([]);
    } finally {
      setLoadingGlobalRequests(false);
    }
  }, [equipos]);

  useEffect(() => {
    if (isGlobalRequestsOpen && equipos?.length > 0) {
      loadGlobalRequests();
    }
  }, [equipos?.length, isGlobalRequestsOpen, loadGlobalRequests]);

  const handleGlobalRequestReview = async ({ requestId, decision, reviewNotes = null }) => {
    const result = await reviewDelegateChangeRequest({ requestId, decision, reviewNotes });
    await loadGlobalRequests();
    onDelegateRequestSubmitted?.(result);
    return result;
  };

  const handleViewTeam = useCallback((team) => {
    detailScrollPositionRef.current =
      window.scrollY || document.documentElement.scrollTop || 0;
    pendingDetailScrollPreserveOnOpenRef.current = true;
    navigate(getEquiposPath(team.id), { preventScrollReset: true });
  }, [getEquiposPath, navigate]);

  const handleTransferTeam = useCallback((currentTeam) => {
    setTeamToTransfer(currentTeam);
    setIsTransferModalOpen(true);
  }, []);

  const handleCloseDetail = () => {
    pendingDetailScrollRestoreRef.current = true;
    navigate(getEquiposPath(), { preventScrollReset: true });
  };

  const handleOpenCreate = () => {
    if (!canCreateTeams) return;
    hasOpenedCreateRouteRef.current = true;
    onCreate();
    navigate(getEquiposPath("crear"));
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    if (isCreateRoute) {
      navigate(getEquiposPath());
    }
  };

  const handleSaveWrapper = async (event) => {
    try {
      const result = await onSave(event);
      showToast(
        result?.successMessage ||
          (teamToEdit ? "Equipo actualizado" : "Equipo creado"),
        "success"
      );

      if (isCreateRoute) {
        navigate(getEquiposPath());
      }
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    }
  };

  const handleTransferSubmit = async (targetId, team) => {
    if (!targetId) {
      showToast("Selecciona una division", "error");
      return;
    }

    try {
      const { error } = await supabase
        .from("teams")
        .update({ division_id: targetId })
        .eq("id", team.id);

      if (error) throw error;

      showToast("Equipo transferido correctamente", "success");
      setIsTransferModalOpen(false);
      onTeamTransferred?.(team.id, targetId);
    } catch (error) {
      showToast("Error: " + error.message, "error");
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await onConfirmDelete();
      showToast("Equipo eliminado", "success");
    } catch (error) {
      showToast("Error al eliminar: " + error.message, "error");
    }
  };

  const emptyDescription = isDelegateView
    ? "Aun no tienes equipos asignados. Pide al manager que te vincule a un equipo."
    : division
      ? `No hay equipos en ${division.name}`
      : "Selecciona una division";
  const filteredEmptyDescription = {
    participating: "No hay equipos registrados en la competencia activa.",
    linked: "No hay equipos con un delegado vinculado.",
    unlinked: "Todos los equipos ya tienen un delegado vinculado.",
  }[teamFilter];

  const viewMaxWidth = "1400px";

  return (
    <>
      <PageHeader
        title={isDelegateView ? "Mi equipo" : "Equipos"}
        tabs={tabs}
        maxWidth={viewMaxWidth}
        marginBottom="0"
        state={state}
        setState={setState}
      />

      <StyledContentContainer>
        <MainContainer $maxWidth={viewMaxWidth}>
          {!isDelegateView && (
            <OverviewToolbar>
              <StatsStrip aria-label="Resumen de equipos">
                <CompactStat
                  type="button"
                  $active={teamFilter === "all"}
                  $tone={v.colorPrincipal}
                  onPointerDown={() => handleTeamFilterPrewarm("all")}
                  onClick={() => handleTeamFilterChange("all")}
                  aria-pressed={teamFilter === "all"}
                  aria-controls="teams-grid"
                  aria-label={`Mostrar todos los equipos: ${orderedTeams.length}`}
                >
                  <StatIcon $tone={v.colorPrincipal} aria-hidden="true">
                    <RiGroupLine />
                  </StatIcon>
                  <StatCopy>
                    <StatValue>{loading ? "—" : orderedTeams.length}</StatValue>
                    <StatLabel>Equipos</StatLabel>
                  </StatCopy>
                </CompactStat>

                <CompactStat
                  type="button"
                  $active={teamFilter === "participating"}
                  $tone={v.verde}
                  onPointerDown={() => handleTeamFilterPrewarm("participating")}
                  onClick={() => handleTeamFilterChange("participating")}
                  aria-pressed={teamFilter === "participating"}
                  aria-controls="teams-grid"
                  aria-label={`Mostrar equipos en competencia: ${participatingTeamCount}`}
                >
                  <StatIcon $tone={v.verde} aria-hidden="true">
                    <IoMdFootball />
                  </StatIcon>
                  <StatCopy>
                    <StatValue>{loading ? "—" : participatingTeamCount}</StatValue>
                    <StatLabel>En competencia</StatLabel>
                  </StatCopy>
                </CompactStat>

                <CompactStat
                  type="button"
                  $active={teamFilter === "linked"}
                  $tone={v.verde}
                  onPointerDown={() => handleTeamFilterPrewarm("linked")}
                  onClick={() => handleTeamFilterChange("linked")}
                  aria-pressed={teamFilter === "linked"}
                  aria-controls="teams-grid"
                  aria-label={`Mostrar equipos vinculados: ${delegateLinkCounts.linked}`}
                >
                  <StatIcon $tone={v.verde} aria-hidden="true">
                    <RiCheckboxCircleLine />
                  </StatIcon>
                  <StatCopy>
                    <StatValue>
                      {loading ? "—" : delegateLinkCounts.linked}
                    </StatValue>
                    <StatLabel>Vinculados</StatLabel>
                  </StatCopy>
                </CompactStat>

                <CompactStat
                  type="button"
                  $active={teamFilter === "unlinked"}
                  $tone="#f59e0b"
                  onPointerDown={() => handleTeamFilterPrewarm("unlinked")}
                  onClick={() => handleTeamFilterChange("unlinked")}
                  aria-pressed={teamFilter === "unlinked"}
                  aria-controls="teams-grid"
                  aria-label={`Mostrar equipos sin vincular: ${delegateLinkCounts.unlinked}`}
                >
                  <StatIcon $tone="#f59e0b" aria-hidden="true">
                    <RiCloseCircleLine />
                  </StatIcon>
                  <StatCopy>
                    <StatValue>{loading ? "—" : delegateLinkCounts.unlinked}</StatValue>
                    <StatLabel>Sin vincular</StatLabel>
                  </StatCopy>
                </CompactStat>
              </StatsStrip>

              {canCreateTeams && (
                <ActionsWrapper>
                  <InvitationsButton
                    type="button"
                    onClick={handleOpenInvitations}
                    disabled={!division}
                  >
                    <RiMailSendLine aria-hidden="true" />
                    <span>Invitaciones</span>
                  </InvitationsButton>
                  <BtnGreen
                    onClick={handleOpenCreate}
                    disabled={!division}
                    icono={<IoMdFootball size={18} />}
                  >
                    Crear equipo
                  </BtnGreen>
                </ActionsWrapper>
              )}
            </OverviewToolbar>
          )}

          {isDelegateView && (
            <AccessBanner>
              Puedes editar tu equipo y registrar jugadores. Si la liga exige aprobacion,
              tus cambios se enviaran al manager antes de publicarse.
              {!requestSummariesLoading &&
                (hasPendingDelegateRequests || hasDelegateReviewedUpdates) && (
                  <BannerMeta>
                    {hasPendingDelegateRequests &&
                      `${delegateRequestOverview.pendingCount} cambio${
                        delegateRequestOverview.pendingCount === 1 ? "" : "s"
                      } en revision.`}
                    {hasDelegateReviewedUpdates &&
                      ` ${delegateReviewedSummary} en tus ultimas respuestas.`}
                  </BannerMeta>
                )}
            </AccessBanner>
          )}

          {!isDelegateView && !requestSummariesLoading && hasPendingDelegateRequests && (
            <RequestBanner>
              <div style={{ flex: 1 }}>
                Hay {delegateRequestOverview.pendingCount} solicitud
                {delegateRequestOverview.pendingCount === 1 ? "" : "es"} pendiente
                {delegateRequestOverview.pendingCount === 1 ? "" : "s"} de delegados en{" "}
                {delegateRequestOverview.pendingTeamsCount === 1 ? "el equipo" : "los equipos"}{" "}
                <strong style={{ color: "#fff" }}>{pendingTeamsText}</strong>.
              </div>
              <BtnReviewSlim
                onClick={() => {
                  if (delegateRequestOverview.pendingTeamsCount >= 2) {
                    setIsGlobalRequestsOpen(true);
                  } else {
                    const firstPendingTeam = equipos?.find(
                      (t) => Number(t?.delegateRequestSummary?.pendingCount || 0) > 0
                    );
                    if (firstPendingTeam) {
                      detailScrollPositionRef.current =
                        window.scrollY || document.documentElement.scrollTop || 0;
                      pendingDetailScrollPreserveOnOpenRef.current = true;
                      navigate(getEquiposPath(firstPendingTeam.id), { 
                        preventScrollReset: true,
                        state: { initialView: "delegate-requests" }
                      });
                    }
                  }
                }}
              >
                Revisar
              </BtnReviewSlim>
            </RequestBanner>
          )}

          {isDelegateView && canCreateTeams && (
            <ActionsWrapper $standalone>
              <InvitationsButton
                type="button"
                onClick={handleOpenInvitations}
                disabled={!division}
              >
                <RiMailSendLine aria-hidden="true" />
                <span>Invitaciones</span>
              </InvitationsButton>
              <BtnGreen
                onClick={handleOpenCreate}
                disabled={!division}
                icono={<IoMdFootball size={18} />}
              >
                Crear equipo
              </BtnGreen>
            </ActionsWrapper>
          )}

          {/* === MODO DELEGADO: pantalla completa para el unico equipo del delegado === */}
          {isDelegateView ? (
            <Card width="100%" maxWidth="100%" style={{ padding: "25px" }}>
              <div style={{ width: "100%" }}>
                {loading ? (
                  <DelegatePageSkeleton>
                    <DelegateSkeletonHeader />
                    <DelegateSkeletonBody />
                  </DelegatePageSkeleton>
                ) : !equipos || equipos.length === 0 ? (
                  <EmptyState
                    icon={<IoMdFootball size={48} />}
                    title="Sin Equipos Asignados"
                    description={emptyDescription}
                  />
                ) : (
                  (() => {
                    const delegateTeam = equipos[0];
                    return (
                      <DelegateFullView>
                        <DelegateTeamDetailPanel
                          team={delegateTeam}
                          division={delegateTeam?.division || division}
                          canReviewDelegateRequests={false}
                          onDelegateRequestsUpdated={onDelegateRequestSubmitted}
                          onEdit={() => onEdit(delegateTeam)}
                        />
                      </DelegateFullView>
                    );
                  })()
                )}
              </div>
            </Card>
          ) : (
            /* === MODO MANAGER/NORMAL: grid de cards === */
            <Card width="100%" maxWidth="100%">
              <div style={{ width: "100%" }}>
                <Grid ref={teamsGridRef} id="teams-grid">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <TeamCardSkeleton key={index} />
                    ))
                  ) : (
                    <>
                      <AnimatePresence initial={false} mode="popLayout">
                        {filteredTeams.map((team) => {
                          const isParticipating = participatingTeamIds.has(String(team.id));

                          return (
                            <AnimatedTeamCard
                              key={team.id}
                              data-team-card=""
                              layout="position"
                              layoutDependency={teamLayoutDependency}
                              {...teamMotion}
                            >
                              <TeamCard
                                team={team}
                                animateEntrance={false}
                                hasPendingDelegateInvitation={teamsWithPendingInvitation.has(
                                  String(team.id)
                                )}
                                onEdit={onEdit}
                                onView={handleViewTeam}
                                onDelete={onDelete}
                                onTransfer={handleTransferTeam}
                                isParticipating={isParticipating}
                                showTransferAction={canTransferTeams}
                                showDeleteAction={canDeleteTeams}
                                requestStatusMode="manager"
                              />
                            </AnimatedTeamCard>
                          );
                        })}
                      </AnimatePresence>

                      {(!equipos || equipos.length === 0) && (
                        <div style={{ gridColumn: "1 / -1", width: "100%" }}>
                          <EmptyState
                            icon={<IoMdFootball size={48} />}
                            title="Sin Equipos"
                            description={emptyDescription}
                            actionComponent={
                              canCreateTeams ? (
                                <BtnNormal
                                  funcion={handleOpenCreate}
                                  titulo="Crear Primer Equipo"
                                  disabled={!division}
                                />
                              ) : null
                            }
                          />
                        </div>
                      )}

                      {orderedTeams.length > 0 && filteredTeams.length === 0 && (
                        <div style={{ gridColumn: "1 / -1", width: "100%" }}>
                          <EmptyState
                            icon={<RiGroupLine size={48} />}
                            title="Sin equipos en este filtro"
                            description={filteredEmptyDescription}
                            actionComponent={
                              <BtnNormal
                                funcion={() => handleTeamFilterChange("all")}
                                titulo="Ver todos los equipos"
                              />
                            }
                          />
                        </div>
                      )}
                    </>
                  )}
                </Grid>
              </div>
            </Card>
          )}
        </MainContainer>

        <Modal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={
            teamToEdit
              ? `Editar: ${teamToEdit.name}`
              : isDelegateView
                ? "Actualizar equipo"
                : "Nuevo Equipo"
          }
          closeOnOverlayClick={false}
          width={isInvitePanelActive ? "900px" : "500px"}
        >
          {teamToEdit && !isInvitePanelActive && (
            <TabsWrapper>
              <TabsNavigation
                tabs={modalTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </TabsWrapper>
          )}

          {activeTab === "info" && (
            <TabContent>
              <TeamForm
                form={form}
                onFormChange={onFormChange}
                onSave={handleSaveWrapper}
                isUploading={isUploading}
                preview={preview}
                file={file}
                originalFile={originalFile}
                onFileChange={onFileChange}
                onClearImage={onClearImage}
                onGenerateLogo={onGenerateLogo}
                onRemoveBg={onRemoveBg}
                showToast={showToast}
                teamToEdit={teamToEdit}
                allowStatusEdit={!isDelegateView}
                canManageDelegateLink={!isDelegateView}
                teamId={teamToEdit?.id || null}
                linkedDelegateAssignment={teamToEdit?.delegateAssignment || null}
                onDelegateLinkStateChanged={onDelegateLinkStateChanged}
                onInvitePanelChange={setIsInvitePanelActive}
                saveLabel={isDelegateView ? "Enviar cambios" : "Guardar Equipo"}
              />
            </TabContent>
          )}

          {activeTab === "players" && teamToEdit && (
            <TabContent>
              <PlayerManager
                teamId={teamToEdit.id}
                leagueId={teamToEdit?.league?.id || division?.league_id}
                showToast={showToast}
                mode={isDelegateView ? "delegate" : "manager"}
                onDelegateRequestSubmitted={onDelegateRequestSubmitted}
              />
            </TabContent>
          )}
        </Modal>

        <TeamDetailModal
          isOpen={!!teamFromUrl}
          onClose={handleCloseDetail}
          team={teamFromUrl}
          division={teamFromUrlDivision}
          initialView={initialView}
          canReviewDelegateRequests={!isDelegateView}
          onDelegateRequestsUpdated={onDelegateRequestSubmitted}
        />

        <Modal
          isOpen={isGlobalRequestsOpen}
          onClose={() => setIsGlobalRequestsOpen(false)}
          title="Todas las solicitudes de la division"
          width="960px"
          bodyPadding="0"
        >
          <div style={{ height: "70vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <LigaDelegateRequestsTab
              requests={globalRequests}
              loading={loadingGlobalRequests}
              onReview={handleGlobalRequestReview}
              onRefresh={loadGlobalRequests}
              canReview={!isDelegateView}
              title=""
              subtitle="Revisa todas las solicitudes de todos los equipos de la division al mismo tiempo."
            />
          </div>
        </Modal>

        <ActiveDelegateInvitationsModal
          isOpen={isInvitationsModalOpen}
          onClose={handleCloseInvitations}
          invitations={delegateInvitations}
          teams={equipos}
          loading={loadingInvitations}
          error={invitationsError}
          onInvitationUpdated={() => loadDelegateInvitations({ silent: true })}
        />

        <TeamTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          team={teamToTransfer}
          divisiones={divisiones}
          currentDivision={division}
          onConfirm={handleTransferSubmit}
        />

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Eliminar Equipo"
          message="Deseas eliminar este equipo?"
        />

        <Toast
          show={toast.show}
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast((current) => ({ ...current, show: false }))}
        />
      </StyledContentContainer>
    </>
  );
};

const StyledContentContainer = styled(ContentContainer)`
  && {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
`;

const MainContainer = styled.div`
  width: 100%;
  max-width: ${(props) => props.$maxWidth || "1400px"};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  margin-top: 10px;
  position: relative;

  @media (min-width: 768px) {
    margin-top: 12px;
  }
`;

const OverviewToolbar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  margin-bottom: 12px;

  @media (min-width: 640px) {
    gap: 10px;
    margin-bottom: 14px;
  }

  @media (min-width: 1024px) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
`;

const StatsStrip = styled.div`
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  @media (min-width: 1024px) {
    flex: 0 1 686px;
    grid-template-columns:
      minmax(132px, 142px)
      minmax(176px, 190px)
      minmax(156px, 172px)
      minmax(148px, 158px);
    width: 100%;
  }
`;

const CompactStat = styled.button`
  appearance: none;
  height: 46px;
  min-width: 0;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border: 1px solid
    ${({ $active, $tone, theme }) => ($active ? $tone : theme.bg4)};
  border-radius: 12px;
  background: ${({ $active, $tone, theme }) =>
    $active ? `${$tone}12` : theme.bgcards};
  color: ${({ theme }) => theme.text};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 120ms ease;

  @media (hover: hover) {
    &:hover {
      border-color: ${({ $tone }) => $tone};
      background: ${({ $tone }) => `${$tone}0d`};
    }
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid ${({ $tone }) => $tone};
    outline-offset: 2px;
  }

  @media (min-width: 768px) {
    height: 44px;
    padding: 0 12px;
    gap: 9px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const StatIcon = styled.span`
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: ${({ $tone }) => `${$tone}18`};
  color: ${({ $tone }) => $tone};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const StatCopy = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  white-space: nowrap;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: baseline;
    gap: 6px;
  }
`;

const StatValue = styled.strong`
  flex: 0 0 auto;
  font-size: 0.92rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;

  @media (min-width: 768px) {
    font-size: 0.98rem;
  }
`;

const StatLabel = styled.span`
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  color: ${({ theme }) => theme.text};
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  text-overflow: ellipsis;
  opacity: 0.78;

  @media (min-width: 768px) {
    font-size: 0.74rem;
    line-height: 1.15;
    opacity: 0.72;
  }
`;

const ActionsWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: ${({ $standalone }) => ($standalone ? "14px" : "0")};

  & > button {
    margin: 0 !important;
    width: 100% !important;
    min-width: 0;
    min-height: 44px;
    height: auto !important;
    padding: 8px 10px !important;
    white-space: nowrap;

    span {
      display: inline-block !important;
      font-size: 12px;
    }

    svg {
      margin-right: 0;
    }

    .content {
      gap: 7px;
    }
  }

  @media (min-width: 640px) {
    display: flex;
    justify-content: flex-end;

    & > button {
      width: auto !important;
      padding: 8px 16px !important;

      span {
        font-size: 13px;
      }
    }
  }

  @media (min-width: 1024px) {
    flex: 0 0 auto;
    width: auto;
    margin-left: auto;
  }
`;

const InvitationsButton = styled.button`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 16px;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 14px;
  background: ${({ theme }) => theme.bgcards};
  color: ${({ theme }) => theme.text};
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, transform 120ms ease;

  svg {
    color: ${v.colorPrincipal};
    font-size: 1.1rem;
  }

  &:hover:not(:disabled) {
    border-color: ${v.colorPrincipal};
    background: rgba(28, 176, 246, 0.08);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid ${v.colorPrincipal};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

`;

const AccessBanner = styled.div`
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(243, 156, 18, 0.12), rgba(243, 156, 18, 0.04));
  border: 1px solid rgba(243, 156, 18, 0.22);
  font-size: 0.92rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.text};
`;

const BannerMeta = styled.div`
  margin-top: 8px;
  font-size: 0.88rem;
  opacity: 0.9;
`;

const RequestBanner = styled.div`
  margin-bottom: 18px;
  padding: 10px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 184, 0, 0.16), rgba(255, 184, 0, 0.06));
  border: 1px solid rgba(255, 184, 0, 0.28);
  color: ${({ theme }) => theme.text};
  font-size: 0.92rem;
  line-height: 1.5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const BtnReviewSlim = styled.button`
  background-color: rgba(255, 184, 0, 0.15);
  color: #ffb800;
  border: 1px solid rgba(255, 184, 0, 0.3);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background-color: rgba(255, 184, 0, 0.25);
    border-color: rgba(255, 184, 0, 0.5);
  }

  &:active {
    transform: scale(0.97);
  }
`;

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 25px;
  width: 100%;
  position: relative;

  &[data-team-grid-animating] > [data-team-card] {
    will-change: transform, opacity;
  }

  &[data-team-grid-animating] .team-card-continuous-motion {
    animation-play-state: paused !important;
  }
`;

const AnimatedTeamCard = styled(motion.div)`
  width: 250px;
  flex-shrink: 0;
`;

const TabsWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
`;

/* ===== Delegate full-width layout ===== */

const DelegateFullView = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;


const DelegatePageSkeleton = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DelegateSkeletonHeader = styled.div`
  height: 52px;
  border-radius: 12px;
  width: 260px;
  background: ${({ theme }) => theme.bg4};
  opacity: 0.5;
`;

const DelegateSkeletonBody = styled.div`
  height: 420px;
  border-radius: 16px;
  background: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};
  opacity: 0.6;
`;

const TeamCardSkeleton = () => (
  <SkeletonContainer>
    <div className="header-sk">
      <Skeleton width="100%" height="100%" radius="0" />
      <div className="logo-sk">
        <Skeleton type="circle" width="85px" height="85px" />
      </div>
    </div>
    <div className="body-sk">
      <Skeleton width="70%" height="20px" />
      <Skeleton width="50%" height="14px" />
    </div>
  </SkeletonContainer>
);

const SkeletonContainer = styled.div`
  width: 250px;
  height: 260px;
  background-color: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 16px;
  overflow: hidden;

  .header-sk {
    height: 110px;
    position: relative;
  }

  .logo-sk {
    position: absolute;
    bottom: -25px;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid ${({ theme }) => theme.bgtotal};
    border-radius: 50%;
  }

  .body-sk {
    padding: 40px 15px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
`;


