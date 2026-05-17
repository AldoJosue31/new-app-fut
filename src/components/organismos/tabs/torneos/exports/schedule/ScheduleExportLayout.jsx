import React, { forwardRef, useMemo } from "react";
import styled from "styled-components";
import { formatTimeTo12Hour } from "../../../../../../utils/dateUtils";

const formatExportDay = (dateStr, mode = "short") => {
  if (!dateStr) return "Sin fecha";
  const parts = String(dateStr).split("-");
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString("es-ES", {
    weekday: mode === "long" ? "long" : "short",
    day: "2-digit",
    month: mode === "long" ? "long" : "short",
  });
};

const getTeamName = (team, fallback) => {
  if (typeof team === "string") return team;
  return team?.name || fallback;
};

const buildRowColumns = (rowDates, groupedMatches, columnCount) => {
  const columns = Array.from({ length: columnCount }, () => []);
  const columnWeights = Array.from({ length: columnCount }, () => 0);
  const totalWeight = rowDates.reduce(
    (sum, date) => sum + (groupedMatches[date]?.length || 0) + 0.65,
    0
  );
  const maxColumnWeight = Math.max(1, Math.ceil(totalWeight / columnCount));

  let columnIndex = 0;

  rowDates.forEach((date) => {
    const dateMatches = groupedMatches[date] || [];
    let startIndex = 0;

    while (startIndex < dateMatches.length) {
      if (
        columnWeights[columnIndex] >= maxColumnWeight &&
        columnIndex < columnCount - 1
      ) {
        columnIndex += 1;
      }

      const remainingMatches = dateMatches.length - startIndex;
      const remainingCapacity = Math.max(
        1,
        Math.floor(maxColumnWeight - columnWeights[columnIndex])
      );
      const takeCount =
        columnIndex < columnCount - 1
          ? Math.min(remainingMatches, remainingCapacity)
          : remainingMatches;

      columns[columnIndex].push({
        date,
        continued: startIndex > 0,
        matches: dateMatches.slice(startIndex, startIndex + takeCount),
      });

      columnWeights[columnIndex] += takeCount + 0.65;
      startIndex += takeCount;

      if (startIndex < dateMatches.length && columnIndex < columnCount - 1) {
        columnIndex += 1;
      }
    }
  });

  return columns.filter((column) => column.length > 0);
};

const ScheduleExportLayout = forwardRef(
  (
    {
      matches = [],
      weekDays = [],
      divisions = [],
      metaInfo = {},
      themeMode = "light",
      layoutMode = "grid",
      canvasMode = "post",
      exportWidth = 1080,
      exportHeight = canvasMode === "story" ? 1920 : 1350,
      logoScale = 1,
      logoFocus = { offsetX: 0, offsetY: 0 },
      showDivisionName = true,
    },
    ref
  ) => {
    const isDark = themeMode === "dark";
    const colors = {
      bg: isDark ? "#121212" : "#ffffff",
      card: isDark ? "#1e1e1e" : "#ffffff",
      text: isDark ? "#f8fafc" : "#0f172a",
      subtext: isDark ? "#94a3b8" : "#64748b",
      border: isDark ? "#334155" : "#e2e8f0",
      headerBg: isDark ? "#0f172a" : "#f8fafc",
      primary: "#10b981",
      primarySoft: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.16)",
      timeBg: isDark ? "#0f172a" : "#eef2ff",
      timeText: isDark ? "#bfdbfe" : "#1e40af",
      panel: isDark ? "rgba(255, 255, 255, 0.035)" : "rgba(15, 23, 42, 0.035)",
      shadow: isDark ? "rgba(0, 0, 0, 0.34)" : "rgba(15, 23, 42, 0.08)",
    };

    const groupedMatches = useMemo(() => {
      const groups = {};
      weekDays.forEach((day) => {
        groups[day] = [];
      });

      matches.forEach((match) => {
        const dateKey = match.rawDate || match.date || "sin-fecha";
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(match);
      });

      Object.keys(groups).forEach((date) => {
        groups[date].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      });

      return groups;
    }, [matches, weekDays]);

    const rowDates = useMemo(() => {
      const dates = Object.keys(groupedMatches).filter(
        (date) => groupedMatches[date]?.length > 0
      );
      return dates.sort((a, b) => a.localeCompare(b));
    }, [groupedMatches]);

    const gridDays = useMemo(
      () => weekDays.filter((day) => groupedMatches[day]?.length > 0),
      [groupedMatches, weekDays]
    );

    const isGrid = layoutMode === "grid";
    const isStory = canvasMode === "story";
    const isLandscape = exportWidth > exportHeight;
    const hasLogo = Boolean(metaInfo?.leagueLogo);
    const logoBaseSize = isLandscape ? 128 : isStory ? 210 : 150;
    const logoVisualSize = Math.round(logoBaseSize * logoScale);
    const logoSideMargin = isLandscape ? 22 : 28;
    const logoSlotSize = Math.max(logoBaseSize + logoSideMargin, logoVisualSize);
    const logoBoxSize = `${logoSlotSize}px`;
    const logoImageSize = `${logoVisualSize}px`;
    const logoAnchorX = `${Math.round((logoBaseSize + logoSideMargin) / 2)}px`;
    const logoAnchorY = `${Math.round(logoBaseSize / 2)}px`;
    const logoShiftX = `${Math.round((logoFocus?.offsetX || 0) * logoVisualSize * -1)}px`;
    const logoShiftY = `${Math.round((logoFocus?.offsetY || 0) * logoVisualSize * -1)}px`;
    const rowUnitCount = matches.length + rowDates.length * 0.65;
    const rowColumnCount =
      layoutMode === "row"
        ? Math.min(isStory ? 2 : 3, Math.max(1, Math.ceil(rowUnitCount / (isStory ? 24 : 11))))
        : 1;
    const rowColumns = useMemo(
      () => buildRowColumns(rowDates, groupedMatches, rowColumnCount),
      [groupedMatches, rowColumnCount, rowDates]
    );
    const compactLevel =
      layoutMode === "row"
        ? Math.max(0, Math.min((matches.length / rowColumnCount) - (isStory ? 18 : 10), 12))
        : 0;
    const rowScale = Math.max(0.62, 1 - compactLevel * 0.03 - (rowColumnCount - 1) * 0.12);
    const rowTimeColumnWidth = rowColumnCount > 1 ? 86 : 110;
    const rowDivisionColumnWidth = rowColumnCount > 1 ? 118 : 210;

    return (
      <ExportCanvas
        ref={ref}
        $canvasMode={canvasMode}
        $layoutMode={layoutMode}
        $exportWidth={exportWidth}
        $exportHeight={exportHeight}
        $isLandscape={isLandscape}
        style={{
          "--schedule-bg": colors.bg,
          "--schedule-card": colors.card,
          "--schedule-text": colors.text,
          "--schedule-subtext": colors.subtext,
          "--schedule-border": colors.border,
          "--schedule-header-bg": colors.headerBg,
          "--schedule-primary": colors.primary,
          "--schedule-primary-soft": colors.primarySoft,
          "--schedule-time-bg": colors.timeBg,
          "--schedule-time-text": colors.timeText,
          "--schedule-panel": colors.panel,
          "--schedule-shadow": colors.shadow,
          "--schedule-row-scale": rowScale,
          "--schedule-row-card-y": `${Math.round(18 * rowScale)}px`,
          "--schedule-row-card-x": `${Math.round(20 * rowScale)}px`,
          "--schedule-row-team-font": `${Math.round(26 * rowScale)}px`,
          "--schedule-row-time-font": `${Math.round(22 * rowScale)}px`,
          "--schedule-row-division-font": `${Math.round(18 * rowScale)}px`,
          "--schedule-row-vs-font": `${Math.round(18 * rowScale)}px`,
          "--schedule-row-date-font": `${Math.round(22 * rowScale)}px`,
          "--schedule-row-gap": `${Math.max(6, Math.round(14 * rowScale))}px`,
          "--schedule-row-list-gap": `${Math.max(5, Math.round(10 * rowScale))}px`,
          "--schedule-row-section-gap": `${Math.max(6, Math.round(10 * rowScale))}px`,
          "--schedule-row-time-col": `${Math.round(rowTimeColumnWidth * rowScale)}px`,
          "--schedule-row-division-col": `${Math.round(rowDivisionColumnWidth * rowScale)}px`,
        }}
      >
        <Header $hasLogo={hasLogo} $canvasMode={canvasMode} $isLandscape={isLandscape}>
          {hasLogo && (
            <div
              className="logo-box"
              style={{
                width: logoBoxSize,
                height: `${logoBaseSize}px`,
              }}
            >
              <img
                src={metaInfo.leagueLogo}
                alt="Logo Liga"
                crossOrigin="anonymous"
                style={{
                  width: logoImageSize,
                  height: logoImageSize,
                  objectFit: "contain",
                  objectPosition: "center",
                  "--logo-anchor-x": logoAnchorX,
                  "--logo-anchor-y": logoAnchorY,
                  "--logo-shift-x": logoShiftX,
                  "--logo-shift-y": logoShiftY,
                  filter: isDark
                    ? "drop-shadow(0 4px 6px rgba(0,0,0,0.6))"
                    : "drop-shadow(0 4px 6px rgba(0,0,0,0.15))",
                }}
              />
            </div>
          )}

          <div className="headline">
            <div className="badge-row">
              <span className="league-badge">{metaInfo.league || "Liga"}</span>
            </div>
            <h1>Rol de partidos</h1>
            {showDivisionName && <p className="division">{metaInfo.division || "Division"}</p>}
            <p className="subtitle">
              Rol Oficial
              {metaInfo?.jornada ? ` • ${metaInfo.jornada}` : ""}
            </p>
          </div>

          {hasLogo && <div className="logo-spacer" style={{ width: logoBoxSize }} />}
        </Header>

        <Legend>
          {divisions.map((division) => (
            <div className="legend-item" key={division.name}>
              <span style={{ backgroundColor: division.color }} />
              {division.name}
            </div>
          ))}
        </Legend>

        {matches.length === 0 ? (
          <EmptyState>No hay partidos programados para exportar.</EmptyState>
        ) : isGrid ? (
          <Grid $isStory={isStory} $dayCount={gridDays.length}>
            {gridDays.map((day) => {
              const matchesForDay = groupedMatches[day] || [];

              return (
                <DayColumn key={day}>
                  <div className="day-title">{formatExportDay(day)}</div>
                  <div className="day-list">
                    {matchesForDay.map((match, index) => (
                        <MatchCard
                          key={match.id || `${day}-${index}`}
                          $divisionColor={match.divisionColor}
                          $layoutMode="grid"
                        >
                          <span className="time">{formatTimeTo12Hour(match.time)}</span>
                          <span className="division">{match.division}</span>
                          <strong>{getTeamName(match.local, "Local")}</strong>
                          <small>vs</small>
                          <strong>{getTeamName(match.visitante, "Visita")}</strong>
                        </MatchCard>
                    ))}
                  </div>
                </DayColumn>
              );
            })}
          </Grid>
        ) : (
          <Rows $isStory={isStory} $columnCount={rowColumns.length}>
            {rowColumns.map((column, columnIndex) => (
              <div className="row-column" key={`column-${columnIndex}`}>
                {column.map((group) => (
                  <section key={`${group.date}-${columnIndex}-${group.continued ? "continued" : "start"}`}>
                    <div className="row-date">
                      {formatExportDay(group.date, "long")}
                      {group.continued && <span className="continued-label">cont.</span>}
                    </div>
                    <div className="row-list">
                      {group.matches.map((match, index) => (
                        <MatchCard
                          key={match.id || `${group.date}-${columnIndex}-${index}`}
                          $divisionColor={match.divisionColor}
                          $layoutMode="row"
                        >
                          <span className="time">{formatTimeTo12Hour(match.time)}</span>
                          <div className="teams">
                            <strong className="local-team">{getTeamName(match.local, "Local")}</strong>
                            <small>VS</small>
                            <strong className="visit-team">{getTeamName(match.visitante, "Visita")}</strong>
                          </div>
                          <span className="division">{match.division}</span>
                        </MatchCard>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ))}
          </Rows>
        )}
      </ExportCanvas>
    );
  }
);

ScheduleExportLayout.displayName = "ScheduleExportLayout";

export default ScheduleExportLayout;

const ExportCanvas = styled.div`
  width: ${({ $exportWidth }) => `${$exportWidth}px`};
  height: ${({ $exportHeight }) => `${$exportHeight}px`};
  padding: ${({ $canvasMode, $isLandscape }) =>
    $isLandscape ? "34px 44px" : $canvasMode === "story" ? "60px 40px" : "40px 50px"};
  box-sizing: border-box;
  overflow: hidden;
  background: var(--schedule-bg);
  color: var(--schedule-text);
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: ${({ $layoutMode, $canvasMode, $isLandscape }) =>
    $isLandscape ? "16px" : $layoutMode === "grid" ? ($canvasMode === "story" ? "24px" : "20px") : "22px"};
  font-family: Arial, sans-serif;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: ${({ $hasLogo }) => ($hasLogo ? "space-between" : "center")};
  padding-bottom: ${({ $canvasMode, $isLandscape }) =>
    $isLandscape ? "20px" : $canvasMode === "story" ? "40px" : "25px"};
  border-bottom: 2px solid var(--schedule-border);
  min-height: ${({ $canvasMode, $isLandscape }) =>
    $isLandscape ? "150px" : $canvasMode === "story" ? "250px" : "180px"};
  width: 100%;
  box-sizing: border-box;

  .logo-box {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    position: relative;
  }

  .logo-box img {
    position: absolute;
    left: var(--logo-anchor-x, 50%);
    top: var(--logo-anchor-y, 50%);
    transform: translate(
      calc(-50% + var(--logo-shift-x, 0px)),
      calc(-50% + var(--logo-shift-y, 0px))
    );
  }

  .logo-spacer {
    flex-shrink: 0;
  }

  .headline {
    flex: 1;
    text-align: center;
    padding: 0 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .badge-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-bottom: ${({ $isLandscape }) => ($isLandscape ? "9px" : "15px")};
  }

  .league-badge {
    font-size: ${({ $canvasMode, $isLandscape }) =>
      $isLandscape ? "13px" : $canvasMode === "story" ? "16px" : "14px"};
    font-weight: 800;
    background: var(--schedule-primary-soft);
    color: var(--schedule-primary);
    padding: 6px 16px;
    border-radius: 30px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  h1 {
    font-size: ${({ $canvasMode, $isLandscape }) =>
      $isLandscape ? "34px" : $canvasMode === "story" ? "42px" : "36px"};
    font-weight: 900;
    text-transform: uppercase;
    margin: ${({ $isLandscape }) => ($isLandscape ? "0 0 6px 0" : "0 0 10px 0")};
    color: var(--schedule-text);
    line-height: 1.1;
    letter-spacing: 0;
  }

  .division {
    font-size: ${({ $canvasMode, $isLandscape }) =>
      $isLandscape ? "17px" : $canvasMode === "story" ? "22px" : "18px"};
    color: var(--schedule-text);
    margin: ${({ $isLandscape }) => ($isLandscape ? "0 0 5px 0" : "0 0 8px 0")};
    font-weight: 800;
  }

  .subtitle {
    font-size: ${({ $canvasMode, $isLandscape }) =>
      $isLandscape ? "16px" : $canvasMode === "story" ? "22px" : "18px"};
    color: var(--schedule-subtext);
    margin: 0;
    font-weight: 700;
  }
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  align-items: center;
  font-size: 18px;
  font-weight: 900;
  color: var(--schedule-text);

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  span {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    flex: 0 0 auto;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $dayCount }) => Math.max($dayCount || 1, 1)}, minmax(0, 1fr));
  gap: 8px;
  min-height: 0;
`;

const DayColumn = styled.section`
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border-radius: 8px;
  overflow: hidden;
  background: var(--schedule-panel);
  border: 1px solid var(--schedule-border);

  .day-title {
    padding: 14px 8px;
    text-align: center;
    font-size: 18px;
    font-weight: 1000;
    color: var(--schedule-primary);
    text-transform: capitalize;
    background: var(--schedule-primary-soft);
  }

  .day-list {
    min-height: 0;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

`;

const Rows = styled.div`
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(${({ $columnCount }) => Math.max($columnCount || 1, 1)}, minmax(0, 1fr));
  align-items: start;
  gap: ${({ $isStory }) => ($isStory ? "22px" : "16px")};
  overflow: hidden;

  .row-column {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: ${({ $isStory }) => ($isStory ? "18px" : "12px")};
    overflow: hidden;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: var(--schedule-row-section-gap);
    min-width: 0;
  }

  .row-date {
    display: flex;
    align-items: center;
    gap: var(--schedule-row-gap);
    font-size: var(--schedule-row-date-font);
    font-weight: 1000;
    text-transform: capitalize;
    color: var(--schedule-primary);
    min-width: 0;
  }

  .row-date::after {
    content: "";
    height: 1px;
    flex: 1;
    background: currentColor;
    opacity: 0.24;
  }

  .row-list {
    display: flex;
    flex-direction: column;
    gap: var(--schedule-row-list-gap);
    min-width: 0;
  }

  .continued-label {
    color: var(--schedule-subtext);
    font-size: 0.72em;
    font-weight: 900;
    text-transform: uppercase;
    opacity: 0.8;
  }
`;

const MatchCard = styled.div`
  min-width: 0;
  border-left: ${({ $layoutMode }) => ($layoutMode === "row" ? "8px" : "6px")} solid ${({ $divisionColor }) => $divisionColor || "#2563eb"};
  border-radius: 8px;
  background: var(--schedule-card);
  color: var(--schedule-text);
  box-shadow: 0 10px 24px var(--schedule-shadow);
  border-top: 1px solid var(--schedule-border);
  border-right: 1px solid var(--schedule-border);
  border-bottom: 1px solid var(--schedule-border);

  ${({ $layoutMode }) =>
    $layoutMode === "row"
      ? `
        display: grid;
        grid-template-columns: var(--schedule-row-time-col) minmax(0, 1fr) var(--schedule-row-division-col);
        align-items: center;
        gap: var(--schedule-row-gap);
        padding: var(--schedule-row-card-y) var(--schedule-row-card-x);
      `
      : `
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 10px 9px;
      `}

  .time {
    width: fit-content;
    max-width: 100%;
    padding: 5px 9px;
    border-radius: 6px;
    background: var(--schedule-time-bg);
    color: var(--schedule-time-text);
    font-size: ${({ $layoutMode }) => ($layoutMode === "row" ? "var(--schedule-row-time-font)" : "16px")};
    font-weight: 1000;
    white-space: nowrap;
  }

  .division {
    min-width: 0;
    font-size: ${({ $layoutMode }) => ($layoutMode === "row" ? "var(--schedule-row-division-font)" : "13px")};
    font-weight: 1000;
    color: var(--schedule-subtext);
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .teams {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: var(--schedule-row-gap);
  }

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${({ $layoutMode }) => ($layoutMode === "row" ? "var(--schedule-row-team-font)" : "15px")};
    line-height: 1.16;
  }

  .teams .local-team {
    text-align: right;
    justify-self: end;
  }

  .teams .visit-team {
    text-align: left;
    justify-self: start;
  }

  small {
    font-size: ${({ $layoutMode }) => ($layoutMode === "row" ? "var(--schedule-row-vs-font)" : "12px")};
    font-weight: 900;
    opacity: 0.48;
    justify-self: center;
  }
`;

const EmptyState = styled.div`
  align-self: center;
  justify-self: center;
  padding: 26px 32px;
  border-radius: 8px;
  background: var(--schedule-card);
  border: 1px solid var(--schedule-border);
  color: var(--schedule-subtext);
  font-size: 24px;
  font-weight: 900;
`;
