import React from "react";
import { ContainerScroll } from "../../../atomos/ContainerScroll";
import { TabContent, TabsNavigation } from "../../../moleculas/TabsNavigation";
import { InternalViewHeader } from "../InternalViewHeader";
import { InternalView, StatsContent, StatsTabsShell } from "../styles";
import { TeamPerformanceTab } from "../tabs/TeamPerformanceTab";
import { TeamResultsTab } from "../tabs/TeamResultsTab";

export function TeamDetailStatsView({
  activeStatsTab,
  loadingStats,
  matchHistory,
  onBack,
  onStatsTabChange,
  requestStatSort,
  resultsRailRef,
  sortedStats,
  statSortConfig,
  statsTabs,
  upcomingRailRef,
  upcomingRivals,
}) {
  return (
    <InternalView>
      <InternalViewHeader onBack={onBack} />

      <ContainerScroll $maxHeight="70vh">
        <StatsContent>
          <StatsTabsShell>
            <TabsNavigation
              tabs={statsTabs}
              activeTab={activeStatsTab}
              setActiveTab={onStatsTabChange}
              showLabelsOnMobile={true}
            />

            <TabContent>
              {activeStatsTab === "results" ? (
                <TeamResultsTab
                  loadingStats={loadingStats}
                  matchHistory={matchHistory}
                  resultsRailRef={resultsRailRef}
                  upcomingRailRef={upcomingRailRef}
                  upcomingRivals={upcomingRivals}
                />
              ) : (
                <TeamPerformanceTab
                  loadingStats={loadingStats}
                  requestStatSort={requestStatSort}
                  sortedStats={sortedStats}
                  statSortConfig={statSortConfig}
                />
              )}
            </TabContent>
          </StatsTabsShell>
        </StatsContent>
      </ContainerScroll>
    </InternalView>
  );
}
