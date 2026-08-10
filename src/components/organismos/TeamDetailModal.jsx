import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { Skeleton } from "../atomos/Skeleton";
import { useSort } from "../../hooks/useSort";
import { supabase } from "../../lib/supabase/browserClient.js";
import { getTeamTournamentStats } from "../../services/estadisticas";
import { ACTIVE_TOURNAMENT_STATUSES } from "../../utils/constants";
import { resolveTeamDivisionId } from "../../utils/teamDivision";
import {
  getTeamDelegateChangeRequests,
  reviewDelegateChangeRequest,
} from "../../services/delegates";
import {
  PLAYER_SORT_OPTIONS,
  STATS_TABS,
  TEAM_DETAIL_VIEWS,
} from "./teamDetailModal/constants";
import { TeamDetailOverviewView } from "./teamDetailModal/submenus/TeamDetailOverviewView";
import { DetailContainer } from "./teamDetailModal/styles";

function TeamDetailViewLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando vista del equipo"
      style={{ display: "grid", gap: "12px", width: "100%" }}
    >
      <Skeleton width="34%" height="36px" />
      <Skeleton width="100%" height="92px" />
      <Skeleton width="100%" height="92px" />
      <Skeleton width="100%" height="92px" />
    </div>
  );
}

const TeamDetailDelegateRequestsView = dynamic(
  () =>
    import(
      "./teamDetailModal/submenus/TeamDetailDelegateRequestsView"
    ).then((module) => module.TeamDetailDelegateRequestsView),
  { loading: TeamDetailViewLoading, ssr: false },
);
const TeamDetailPlayersView = dynamic(
  () =>
    import("./teamDetailModal/submenus/TeamDetailPlayersView").then(
      (module) => module.TeamDetailPlayersView,
    ),
  { loading: TeamDetailViewLoading, ssr: false },
);
const TeamDetailStatsView = dynamic(
  () =>
    import("./teamDetailModal/submenus/TeamDetailStatsView").then(
      (module) => module.TeamDetailStatsView,
    ),
  { loading: TeamDetailViewLoading, ssr: false },
);

const playerSortOptions = Object.freeze(
  PLAYER_SORT_OPTIONS.map((option) => {
    const OptionIcon = option.Icon;
    return {
      ...option,
      icon: <OptionIcon />,
    };
  }),
);

const statsTabs = Object.freeze(
  STATS_TABS.map((tab) => {
    const TabIcon = tab.Icon;
    return {
      ...tab,
      icon: <TabIcon />,
    };
  }),
);

export function TeamDetailModal({
  isOpen,
  onClose,
  team,
  division,
  initialView,
  canReviewDelegateRequests = false,
  onDelegateRequestsUpdated,
}) {
  const [activeView, setActiveView] = useState(TEAM_DETAIL_VIEWS.OVERVIEW);
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const [activeStatsTab, setActiveStatsTab] = useState("results");
  const [statsData, setStatsData] = useState(null);
  const [hasActiveTournament, setHasActiveTournament] = useState(false);
  const [loadingTournamentStatus, setLoadingTournamentStatus] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [delegateRequests, setDelegateRequests] = useState([]);
  const [loadingDelegateRequests, setLoadingDelegateRequests] = useState(false);

  const initializedForTeamRef = useRef(null);
  const wasOpenRef = useRef(false);
  const activeTournamentRef = useRef(null);
  const playersLoadedForTeamRef = useRef(null);
  const statsLoadedForTeamRef = useRef(null);
  const delegateRequestsLoadedForTeamRef = useRef(null);
  const playersRef = useRef([]);
  const statsDataRef = useRef(null);
  const delegateRequestsRef = useRef([]);
  const requestAbortControllerRef = useRef(null);
  const resultsRailRef = useRef(null);
  const upcomingRailRef = useRef(null);
  const divisionId = resolveTeamDivisionId(team, division);

  const { items: sortedPlayers, requestSort, sortConfig } = useSort(players, {
    key: "dorsal",
    direction: "ascending",
  });

  const {
    items: sortedStats,
    requestSort: requestStatSort,
    sortConfig: statSortConfig,
  } = useSort(statsData?.playerStats || [], {
    key: "goals",
    direction: "descending",
  });

  const loadTournamentStatus = useCallback(async () => {
    const teamId = team?.id;
    if (!teamId || !divisionId) return null;
    if (activeTournamentRef.current) return activeTournamentRef.current;

    const signal = requestAbortControllerRef.current?.signal;
    setLoadingTournamentStatus(true);
    try {
      let query = supabase
        .from("tournaments")
        .select("id, config")
        .eq("division_id", divisionId)
        .in("status", ACTIVE_TOURNAMENT_STATUSES)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (signal) query = query.abortSignal(signal);

      const { data: torneoSel, error: tournamentError } = await query;

      if (signal?.aborted || initializedForTeamRef.current !== teamId) {
        return null;
      }

      if (tournamentError) {
        console.error(
          "TeamDetailModal.loadTournamentStatus:",
          tournamentError,
        );
      }

      if (tournamentError || !torneoSel) {
        activeTournamentRef.current = null;
        setHasActiveTournament(false);
        setStatsData(null);
        return null;
      }

      activeTournamentRef.current = torneoSel;
      setHasActiveTournament(true);
      return torneoSel;
    } catch (error) {
      if (initializedForTeamRef.current === teamId) {
        console.error(
          "TeamDetailModal.loadTournamentStatus - unexpected error:",
          error,
        );
        activeTournamentRef.current = null;
        setHasActiveTournament(false);
        setStatsData(null);
      }
      return null;
    } finally {
      if (initializedForTeamRef.current === teamId) {
        setLoadingTournamentStatus(false);
      }
    }
  }, [divisionId, team?.id]);

  const loadPlayers = useCallback(async (force = false) => {
    const teamId = team?.id;
    if (!teamId) return [];
    if (!force && playersLoadedForTeamRef.current === teamId) {
      return playersRef.current;
    }

    const signal = requestAbortControllerRef.current?.signal;
    setLoadingPlayers(true);
    try {
      let query = supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId);
      if (signal) query = query.abortSignal(signal);

      const { data, error } = await query;

      if (error) throw error;
      if (signal?.aborted || initializedForTeamRef.current !== teamId) {
        return [];
      }

      const nextPlayers = data || [];
      playersLoadedForTeamRef.current = teamId;
      playersRef.current = nextPlayers;
      setPlayers(nextPlayers);
      return nextPlayers;
    } catch (error) {
      if (initializedForTeamRef.current === teamId) {
        console.error("Error cargando la plantilla:", error);
        setPlayers([]);
      }
      return [];
    } finally {
      if (initializedForTeamRef.current === teamId) {
        setLoadingPlayers(false);
      }
    }
  }, [team?.id]);

  const loadStats = useCallback(async (knownTournament = null, force = false) => {
    const teamId = team?.id;
    if (!teamId || !divisionId) return null;
    if (!force && statsLoadedForTeamRef.current === teamId) {
      return statsDataRef.current;
    }

    const signal = requestAbortControllerRef.current?.signal;
    setLoadingStats(true);
    try {
      const tournament =
        knownTournament ||
        activeTournamentRef.current ||
        (await loadTournamentStatus());
      if (!tournament) return null;

      const data = await getTeamTournamentStats(teamId, divisionId, {
        tournament,
        signal,
      });
      if (signal?.aborted || initializedForTeamRef.current !== teamId) {
        return null;
      }

      const safeData =
        data && data.hasTournament
          ? data
          : {
              hasTournament: true,
              matchHistory: [],
              upcomingRivals: [],
              playerStats: [],
            };
      const nextStatsData = {
        ...safeData,
        tournamentId: tournament.id,
      };

      statsLoadedForTeamRef.current = teamId;
      statsDataRef.current = nextStatsData;
      setStatsData(nextStatsData);
      return nextStatsData;
    } catch (error) {
      if (initializedForTeamRef.current === teamId) {
        console.error("Error cargando las estadísticas:", error);
        setStatsData(null);
      }
      return null;
    } finally {
      if (initializedForTeamRef.current === teamId) {
        setLoadingStats(false);
      }
    }
  }, [divisionId, loadTournamentStatus, team?.id]);

  const loadDelegateRequests = useCallback(async (force = false) => {
    const teamId = team?.id;
    if (!teamId) return [];
    if (
      !force &&
      delegateRequestsLoadedForTeamRef.current === teamId
    ) {
      return delegateRequestsRef.current;
    }

    const signal = requestAbortControllerRef.current?.signal;
    setLoadingDelegateRequests(true);
    try {
      const requests = await getTeamDelegateChangeRequests(teamId, { signal });
      if (signal?.aborted || initializedForTeamRef.current !== teamId) {
        return [];
      }

      delegateRequestsLoadedForTeamRef.current = teamId;
      delegateRequestsRef.current = requests;
      setDelegateRequests(requests);
      return requests;
    } catch (error) {
      if (initializedForTeamRef.current === teamId) {
        console.error("Error cargando solicitudes del delegado:", error);
        setDelegateRequests([]);
      }
      return [];
    } finally {
      if (initializedForTeamRef.current === teamId) {
        setLoadingDelegateRequests(false);
      }
    }
  }, [team?.id]);

  useEffect(() => {
    if (!isOpen) {
      if (!wasOpenRef.current) return;

      wasOpenRef.current = false;
      requestAbortControllerRef.current?.abort();
      requestAbortControllerRef.current = null;
      initializedForTeamRef.current = null;
      activeTournamentRef.current = null;
      playersLoadedForTeamRef.current = null;
      statsLoadedForTeamRef.current = null;
      delegateRequestsLoadedForTeamRef.current = null;
      playersRef.current = [];
      statsDataRef.current = null;
      delegateRequestsRef.current = [];
      setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW);
      setActiveStatsTab("results");
      setPlayers([]);
      setStatsData(null);
      setHasActiveTournament(false);
      setLoadingPlayers(false);
      setLoadingStats(false);
      setLoadingTournamentStatus(false);
      setDelegateRequests([]);
      setLoadingDelegateRequests(false);
      return;
    }

    if (!team) return;

    // Si ya se inicializó para este equipo, no resetear (evita que cambiar de pestaña/ventana regrese a OVERVIEW)
    if (initializedForTeamRef.current === team.id) return;
    wasOpenRef.current = true;
    requestAbortControllerRef.current?.abort();
    requestAbortControllerRef.current = new AbortController();
    initializedForTeamRef.current = team.id;

    activeTournamentRef.current = null;
    playersLoadedForTeamRef.current = null;
    statsLoadedForTeamRef.current = null;
    delegateRequestsLoadedForTeamRef.current = null;
    playersRef.current = [];
    statsDataRef.current = null;
    delegateRequestsRef.current = [];
    setPlayers([]);
    setStatsData(null);
    setHasActiveTournament(false);
    setLoadingPlayers(false);
    setLoadingStats(false);
    setDelegateRequests([]);
    setLoadingDelegateRequests(false);
    
    if (initialView === "stats") {
      setActiveView(TEAM_DETAIL_VIEWS.STATS);
    } else if (initialView === "delegate-requests") {
      setActiveView(TEAM_DETAIL_VIEWS.DELEGATE_REQUESTS);
      void loadDelegateRequests();
    } else {
      setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW);
    }
    
    setActiveStatsTab("results");

  }, [
    initialView,
    isOpen,
    loadDelegateRequests,
    loadStats,
    loadTournamentStatus,
    team,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      !team?.id ||
      !divisionId ||
      initializedForTeamRef.current !== team.id
    ) {
      return;
    }

    if (initialView === "stats") {
      void loadStats();
      return;
    }

    void loadTournamentStatus();
  }, [
    divisionId,
    initialView,
    isOpen,
    loadStats,
    loadTournamentStatus,
    team?.id,
  ]);

  useEffect(
    () => () => {
      requestAbortControllerRef.current?.abort();
      requestAbortControllerRef.current = null;
    },
    [],
  );

  const handleShowPlayers = () => {
    if (!team) return;

    setActiveView(TEAM_DETAIL_VIEWS.PLAYERS);
    void loadPlayers();
  };

  const handleShowStats = () => {
    setActiveStatsTab("results");
    setActiveView(TEAM_DETAIL_VIEWS.STATS);
    void loadStats();
  };

  const handleShowDelegateRequests = () => {
    setActiveView(TEAM_DETAIL_VIEWS.DELEGATE_REQUESTS);
    void loadDelegateRequests();
  };

  const handleReviewDelegateRequest = async ({
    requestId,
    decision,
    reviewNotes = null,
  }) => {
    const result = await reviewDelegateChangeRequest({
      requestId,
      decision,
      reviewNotes,
    });

    await loadDelegateRequests(true);
    onDelegateRequestsUpdated?.(result);
    return result;
  };

  if (!team) return null;

  const getModalTitle = () => {
    if (activeView === TEAM_DETAIL_VIEWS.DELEGATE_REQUESTS) {
      return `Solicitudes del delegado${team.name ? `: ${team.name}` : ""}`;
    }
    if (activeView === TEAM_DETAIL_VIEWS.PLAYERS) return "Plantilla";
    if (activeView === TEAM_DETAIL_VIEWS.STATS) {
      return `Estadísticas:${team.name ? ` ${team.name}` : ""}`;
    }
    return "Ficha del Equipo";
  };

  const getModalWidth = () => {
    if (activeView === TEAM_DETAIL_VIEWS.DELEGATE_REQUESTS) return "960px";
    return activeView === TEAM_DETAIL_VIEWS.OVERVIEW ? "550px" : "850px";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      closeOnOverlayClick={true}
      width={getModalWidth()}
    >
      <DetailContainer>
        {activeView === TEAM_DETAIL_VIEWS.PLAYERS && (
          <TeamDetailPlayersView
            loadingPlayers={loadingPlayers}
            onBack={() => setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW)}
            onSortChange={requestSort}
            players={players}
            sortConfig={sortConfig}
            sortOptions={playerSortOptions}
            sortedPlayers={sortedPlayers}
          />
        )}

        {activeView === TEAM_DETAIL_VIEWS.STATS && (
          <TeamDetailStatsView
            activeStatsTab={activeStatsTab}
            loadingStats={loadingStats}
            matchHistory={statsData?.matchHistory || []}
            onBack={() => setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW)}
            onStatsTabChange={setActiveStatsTab}
            requestStatSort={requestStatSort}
            resultsRailRef={resultsRailRef}
            sortedStats={sortedStats}
            statSortConfig={statSortConfig}
            statsTabs={statsTabs}
            upcomingRailRef={upcomingRailRef}
            upcomingRivals={statsData?.upcomingRivals || []}
          />
        )}

        {activeView === TEAM_DETAIL_VIEWS.DELEGATE_REQUESTS && (
          <TeamDetailDelegateRequestsView
            canReview={canReviewDelegateRequests}
            loading={loadingDelegateRequests}
            onBack={() => setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW)}
            onRefresh={() => loadDelegateRequests(true)}
            onReview={handleReviewDelegateRequest}
            requests={delegateRequests}
            team={team}
          />
        )}

        {activeView === TEAM_DETAIL_VIEWS.OVERVIEW && (
          <TeamDetailOverviewView
            division={division}
            hasActiveTournament={hasActiveTournament}
            loadingStats={loadingTournamentStatus}
            onShowDelegateRequests={handleShowDelegateRequests}
            onShowPlayers={handleShowPlayers}
            onShowStats={handleShowStats}
            team={team}
          />
        )}
      </DetailContainer>
    </Modal>
  );
}
