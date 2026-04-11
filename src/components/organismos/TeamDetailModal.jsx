import React, { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { useSort } from "../../hooks/useSort";
import { supabase } from "../../supabase/supabase.config";
import { getTeamTournamentStats } from "../../services/estadisticas";
import {
  PLAYER_SORT_OPTIONS,
  STATS_TABS,
  TEAM_DETAIL_VIEWS,
} from "./teamDetailModal/constants";
import { TeamDetailOverviewView } from "./teamDetailModal/submenus/TeamDetailOverviewView";
import { TeamDetailPlayersView } from "./teamDetailModal/submenus/TeamDetailPlayersView";
import { TeamDetailStatsView } from "./teamDetailModal/submenus/TeamDetailStatsView";
import { DetailContainer } from "./teamDetailModal/styles";

export function TeamDetailModal({ isOpen, onClose, team, division, initialView }) {
  const [activeView, setActiveView] = useState(TEAM_DETAIL_VIEWS.OVERVIEW);
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const [activeStatsTab, setActiveStatsTab] = useState("results");
  const [statsData, setStatsData] = useState(null);
  const [hasActiveTournament, setHasActiveTournament] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

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

  useEffect(() => {
    if (!isOpen) {
      setActiveView(TEAM_DETAIL_VIEWS.OVERVIEW);
      setActiveStatsTab("results");
      setPlayers([]);
      setStatsData(null);
      setHasActiveTournament(false);
      setLoadingPlayers(false);
      return;
    }

    if (!team) return;

    setActiveView(
      initialView === "stats" ? TEAM_DETAIL_VIEWS.STATS : TEAM_DETAIL_VIEWS.OVERVIEW
    );
    setActiveStatsTab("results");

    if (division) {
      checkTournamentStatus();
      return;
    }

    setHasActiveTournament(false);
    setStatsData(null);
  }, [division, initialView, isOpen, team]);

  const checkTournamentStatus = async () => {
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
  };

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

  if (!team) return null;

  const sortOptions = PLAYER_SORT_OPTIONS.map(({ Icon, ...option }) => ({
    ...option,
    icon: <Icon />,
  }));

  const statsTabs = STATS_TABS.map(({ Icon, ...tab }) => ({
    ...tab,
    icon: <Icon />,
  }));

  const getModalTitle = () => {
    if (activeView === TEAM_DETAIL_VIEWS.PLAYERS) return "Plantilla";
    if (activeView === TEAM_DETAIL_VIEWS.STATS) {
      return `Estadísticas:${team.name ? ` ${team.name}` : ""}`;
    }
    return "Ficha del Equipo";
  };

  const getModalWidth = () => {
    const isMobile = windowWidth < 768;
    if (isMobile) return "100%";

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

        {activeView === TEAM_DETAIL_VIEWS.OVERVIEW && (
          <TeamDetailOverviewView
            division={division}
            hasActiveTournament={hasActiveTournament}
            loadingStats={loadingStats}
            onShowPlayers={handleShowPlayers}
            onShowStats={handleShowStats}
            team={team}
          />
        )}
      </DetailContainer>
    </Modal>
  );
}
