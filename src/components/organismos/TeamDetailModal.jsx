import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { useSort } from "../../hooks/useSort";
import { supabase } from "../../supabase/supabase.config";
import { getTeamTournamentStats } from "../../services/estadisticas";
import {
  getTeamDelegateChangeRequests,
  reviewDelegateChangeRequest,
} from "../../services/delegates";
import {
  PLAYER_SORT_OPTIONS,
  STATS_TABS,
  TEAM_DETAIL_VIEWS,
} from "./teamDetailModal/constants";
import { TeamDetailDelegateRequestsView } from "./teamDetailModal/submenus/TeamDetailDelegateRequestsView";
import { TeamDetailOverviewView } from "./teamDetailModal/submenus/TeamDetailOverviewView";
import { TeamDetailPlayersView } from "./teamDetailModal/submenus/TeamDetailPlayersView";
import { TeamDetailStatsView } from "./teamDetailModal/submenus/TeamDetailStatsView";
import { DetailContainer } from "./teamDetailModal/styles";

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
  const [loadingStats, setLoadingStats] = useState(false);
  const [delegateRequests, setDelegateRequests] = useState([]);
  const [loadingDelegateRequests, setLoadingDelegateRequests] = useState(false);

  const initializedForTeamRef = useRef(null);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const resultsRailRef = useRef(null);
  const upcomingRailRef = useRef(null);

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

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const checkTournamentStatus = useCallback(async () => {
    if (!team || !division) return;

    setLoadingStats(true);

    try {
      const { data: torneoSel, error: tournamentError } = await supabase
        .from("tournaments")
        .select("id")
        .eq("division_id", division.id)
        .eq("status", "Activo")
        .single();

      if (tournamentError || !torneoSel) {
        console.warn(
          "TeamDetailModal.checkTournamentStatus: No hay torneo activo para la division",
          { error: tournamentError }
        );
        setHasActiveTournament(false);
        setStatsData(null);
        return;
      }

      const tournamentId = torneoSel.id;
      setHasActiveTournament(true);

      const data = await getTeamTournamentStats(team.id, division.id);
      const safeData =
        data && data.hasTournament
          ? data
          : {
              hasTournament: true,
              matchHistory: [],
              upcomingRivals: [],
              playerStats: [],
            };

      setStatsData({
        ...safeData,
        tournamentId,
      });
    } catch (error) {
      console.error("TeamDetailModal.checkTournamentStatus - unexpected error:", error);
      setHasActiveTournament(false);
      setStatsData(null);
    } finally {
      setLoadingStats(false);
    }
  }, [division, team]);

  const loadDelegateRequests = useCallback(async () => {
    if (!team?.id) return [];
    setLoadingDelegateRequests(true);
    try {
      const requests = await getTeamDelegateChangeRequests(team.id);
      setDelegateRequests(requests);
      return requests;
    } catch (error) {
      console.error("Error cargando solicitudes del delegado:", error);
      setDelegateRequests([]);
      return [];
    } finally {
      setLoadingDelegateRequests(false);
    }
  }, [team?.id]);

  useEffect(() => {
    if (!isOpen) {
      initializedForTeamRef.current = null;
      setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW);
      setActiveStatsTab("results");
      setPlayers([]);
      setStatsData(null);
      setHasActiveTournament(false);
      setLoadingPlayers(false);
      setDelegateRequests([]);
      setLoadingDelegateRequests(false);
      return;
    }

    if (!team) return;

    // Si ya se inicializó para este equipo, no resetear (evita que cambiar de pestaña/ventana regrese a OVERVIEW)
    if (initializedForTeamRef.current === team.id) return;
    initializedForTeamRef.current = team.id;

    setDelegateRequests([]);
    setLoadingDelegateRequests(false);
    
    if (initialView === "stats") {
      setActiveView(TEAM_DETAIL_VIEWS.STATS);
    } else if (initialView === "delegate-requests") {
      setActiveView(TEAM_DETAIL_VIEWS.DELEGATE_REQUESTS);
      loadDelegateRequests();
    } else {
      setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW);
    }
    
    setActiveStatsTab("results");

    if (division) {
      checkTournamentStatus();
      return;
    }

    setHasActiveTournament(false);
    setStatsData(null);
  }, [checkTournamentStatus, division, initialView, isOpen, loadDelegateRequests, team]);

  const handleShowPlayers = async () => {
    if (!team) return;

    setActiveView(TEAM_DETAIL_VIEWS.PLAYERS);
    setLoadingPlayers(true);

    try {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", team.id);

      setPlayers(data || []);
    } catch (error) {
      console.error(error);
      setPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleShowStats = () => {
    setActiveStatsTab("results");
    setActiveView(TEAM_DETAIL_VIEWS.STATS);
  };



  const handleShowDelegateRequests = async () => {
    setActiveView(TEAM_DETAIL_VIEWS.DELEGATE_REQUESTS);
    await loadDelegateRequests();
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

    await loadDelegateRequests();
    onDelegateRequestsUpdated?.(result);
    return result;
  };

  if (!team) return null;

  const sortOptions = PLAYER_SORT_OPTIONS.map((option) => {
    const OptionIcon = option.Icon;
    return {
      ...option,
      icon: <OptionIcon />,
    };
  });

  const statsTabs = STATS_TABS.map((tab) => {
    const TabIcon = tab.Icon;
    return {
      ...tab,
      icon: <TabIcon />,
    };
  });

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
    const isMobile = windowWidth < 768;
    if (isMobile) return "100%";

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
            sortOptions={sortOptions}
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
            onRefresh={loadDelegateRequests}
            onReview={handleReviewDelegateRequest}
            requests={delegateRequests}
            team={team}
          />
        )}

        {activeView === TEAM_DETAIL_VIEWS.OVERVIEW && (
          <TeamDetailOverviewView
            division={division}
            hasActiveTournament={hasActiveTournament}
            loadingStats={loadingStats}
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
