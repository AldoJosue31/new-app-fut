import React, { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { supabase } from "../../../supabase/supabase.config";
import { getTeamTournamentStats } from "../../../services/estadisticas";
import {
  getTeamDelegateChangeRequests,
  reviewDelegateChangeRequest,
} from "../../../services/delegates";
import {
  PLAYER_SORT_OPTIONS,
  STATS_TABS,
  TEAM_DETAIL_VIEWS,
} from "../teamDetailModal/constants";
import { useSort } from "../../../hooks/useSort";
import { TeamDetailOverviewView } from "../teamDetailModal/submenus/TeamDetailOverviewView";
import { TeamDetailPlayersView } from "../teamDetailModal/submenus/TeamDetailPlayersView";
import { TeamDetailStatsView } from "../teamDetailModal/submenus/TeamDetailStatsView";
import { TeamDetailDelegateRequestsView } from "../teamDetailModal/submenus/TeamDetailDelegateRequestsView";

/**
 * DelegateTeamDetailPanel
 *
 * Renders the full team detail inline (no modal) for the delegate role.
 * Same logic as TeamDetailModal, without the Modal shell.
 */
export function DelegateTeamDetailPanel({
  team,
  division,
  canReviewDelegateRequests = false,
  onDelegateRequestsUpdated,
  onEdit,
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
          : { hasTournament: true, matchHistory: [], upcomingRivals: [], playerStats: [] };

      setStatsData({ ...safeData, tournamentId });
    } catch {
      setHasActiveTournament(false);
      setStatsData(null);
    } finally {
      setLoadingStats(false);
    }
  }, [division, team]);

  // Reset when team changes
  useEffect(() => {
    if (!team) return;
    if (initializedForTeamRef.current === team.id) return;
    initializedForTeamRef.current = team.id;

    setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW);
    setActiveStatsTab("results");
    setPlayers([]);
    setStatsData(null);
    setHasActiveTournament(false);
    setDelegateRequests([]);
    setLoadingDelegateRequests(false);

    if (division) {
      checkTournamentStatus();
    }
  }, [checkTournamentStatus, division, team]);

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
    } catch {
      setPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleShowStats = () => {
    setActiveStatsTab("results");
    setActiveView(TEAM_DETAIL_VIEWS.STATS);
  };

  const loadDelegateRequests = async () => {
    if (!team?.id) return [];
    setLoadingDelegateRequests(true);
    try {
      const requests = await getTeamDelegateChangeRequests(team.id);
      setDelegateRequests(requests);
      return requests;
    } catch {
      setDelegateRequests([]);
      return [];
    } finally {
      setLoadingDelegateRequests(false);
    }
  };

  const handleShowDelegateRequests = async () => {
    setActiveView(TEAM_DETAIL_VIEWS.DELEGATE_REQUESTS);
    await loadDelegateRequests();
  };

  const handleReviewDelegateRequest = async ({ requestId, decision, reviewNotes = null }) => {
    const result = await reviewDelegateChangeRequest({ requestId, decision, reviewNotes });
    await loadDelegateRequests();
    onDelegateRequestsUpdated?.(result);
    return result;
  };

  if (!team) return null;

  const sortOptions = PLAYER_SORT_OPTIONS.map((option) => {
    const OptionIcon = option.Icon;
    return { ...option, icon: <OptionIcon /> };
  });

  const statsTabs = STATS_TABS.map((tab) => {
    const TabIcon = tab.Icon;
    return { ...tab, icon: <TabIcon /> };
  });

  return (
    <PanelRoot key={team.id}>
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
          onEdit={onEdit}
        />
      )}
    </PanelRoot>
  );
}

const fadeSlide = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const PanelRoot = styled.div`
  animation: ${fadeSlide} 0.22s ease-out both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
