import React, { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { supabase } from "../../../lib/supabase/browserClient.js";
import { getTeamTournamentStats } from "../../../services/estadisticas";
import { getDelegateTournament } from "../../../services/delegateTournament";
import { buildTorneoStandingsSnapshot } from "../../../hooks/useTorneoStandingsLogic";
import { hydrateDelegateMatches } from "../../../utils/delegateMatches";
import { resolveTeamDivisionId } from "../../../utils/teamDivision";
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
import { DelegateTeamOverview } from "./DelegateTeamOverview";
import { DelegateStandingsView } from "./DelegateStandingsView";
import { TeamDetailPlayersView } from "../teamDetailModal/submenus/TeamDetailPlayersView";
import { TeamDetailStatsView } from "../teamDetailModal/submenus/TeamDetailStatsView";
import { TeamDetailDelegateRequestsView } from "../teamDetailModal/submenus/TeamDetailDelegateRequestsView";

const STANDINGS_VIEW = "standings";

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
  onManagePlayers,
  changesRequireApproval = true,
}) {
  const [activeView, setActiveView] = useState(TEAM_DETAIL_VIEWS.OVERVIEW);
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState("results");
  const [statsData, setStatsData] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [hasActiveTournament, setHasActiveTournament] = useState(false);
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [tournamentError, setTournamentError] = useState("");
  const [tournamentRefreshKey, setTournamentRefreshKey] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [delegateRequests, setDelegateRequests] = useState([]);
  const [loadingDelegateRequests, setLoadingDelegateRequests] = useState(false);

  const initializedForTeamRef = useRef(null);
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

  const checkTournamentStatus = useCallback(async (signal) => {
    if (!team?.id || !divisionId) return;
    setLoadingTournament(true);
    setTournamentError("");
    try {
      const bundle = await getDelegateTournament(team.id, { signal });
      if (signal.aborted) return;

      const activeTournament = bundle.tournament;
      setTournament(activeTournament);
      setHasActiveTournament(Boolean(activeTournament));
      if (!activeTournament) {
        setStandings([]);
        setStatsData(null);
        return;
      }

      const snapshot = buildTorneoStandingsSnapshot({
        torneo: activeTournament,
        equipos: bundle.teams,
        partidos: bundle.matches,
        jornadasProp: bundle.jornadas,
        selectedJornadaView: "recent",
      });
      setStandings(snapshot.tablaGeneral);
      setLoadingStats(true);
      setLoadingTournament(false);

      const data = await getTeamTournamentStats(team.id, divisionId, {
        tournament: activeTournament,
        signal,
        preloadedMatches: hydrateDelegateMatches({ matches: bundle.matches, teams: bundle.teams, team: { id: team.id } }),
        preloadedJornadas: bundle.jornadas,
      });
      if (signal.aborted) return;
      setStatsData(data?.hasTournament
        ? data
        : { hasTournament: true, matchHistory: [], upcomingRivals: [], playerStats: [] });
    } catch (error) {
      if (signal.aborted) return;
      setTournament(null);
      setStandings([]);
      setHasActiveTournament(false);
      setStatsData(null);
      setTournamentError(error?.message || "No se pudo cargar el torneo.");
    } finally {
      if (!signal.aborted) {
        setLoadingTournament(false);
        setLoadingStats(false);
      }
    }
  }, [divisionId, team?.id]);

  // Reset when team changes
  useEffect(() => {
    if (!team) return;
    if (initializedForTeamRef.current === team.id) return;
    initializedForTeamRef.current = team.id;

    setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW);
    setActiveStatsTab("results");
    setPlayers([]);
    setStatsData(null);
    setTournament(null);
    setStandings([]);
    setHasActiveTournament(false);
    setTournamentError("");
    setDelegateRequests([]);
    setLoadingDelegateRequests(false);

  }, [team]);

  useEffect(() => {
    if (
      !team?.id ||
      !divisionId ||
      initializedForTeamRef.current !== team.id
    ) {
      return;
    }

    const controller = new AbortController();
    void checkTournamentStatus(controller.signal);
    return () => controller.abort();
  }, [checkTournamentStatus, divisionId, team?.id, tournamentRefreshKey]);

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
          onManagePlayers={onManagePlayers}
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

      {activeView === STANDINGS_VIEW && (
        <DelegateStandingsView
          onBack={() => setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW)}
          standings={standings}
          teamId={team.id}
          tournament={tournament}
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
        <DelegateTeamOverview
          division={division}
          changesRequireApproval={changesRequireApproval}
          hasActiveTournament={hasActiveTournament}
          loadingTournament={loadingTournament}
          loadingStats={loadingStats}
          tournament={tournament}
          standings={standings}
          tournamentError={tournamentError}
          onRetryTournament={() => setTournamentRefreshKey((key) => key + 1)}
          onShowDelegateRequests={handleShowDelegateRequests}
          onShowPlayers={handleShowPlayers}
          onShowStandings={() => setActiveView(STANDINGS_VIEW)}
          onShowStats={handleShowStats}
          team={team}
          onEdit={onEdit}
          onManagePlayers={onManagePlayers}
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
