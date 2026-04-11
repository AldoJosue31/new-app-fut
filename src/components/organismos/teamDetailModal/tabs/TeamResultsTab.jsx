import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiFilter3Line,
} from "react-icons/ri";
import { formatShortDate } from "../../../../utils/dateUtils";
import { MATCH_RESULT_FILTERS } from "../constants";
import { MatchCardSkeleton, UpcomingRivalSkeleton } from "../skeletons";
import { TeamLogo } from "../TeamLogo";
import {
  CompactFilterButton,
  CompactFilterGroup,
  CompactFilterPopover,
  CompactFilterTrigger,
  CompactFilterWrapper,
  EmptyBox,
  MatchCard,
  MatchesGrid,
  RailArrowButton,
  RailItemsRow,
  RailNavigation,
  ResultBadge,
  SectionContainer,
  SectionHeader,
  SectionHeaderMain,
  SectionLabel,
  StatsPanel,
  UpcomingCard,
  UpcomingGrid,
} from "../styles";

function getMatchBadge(match) {
  const hasPenalties =
    match.myPenalties !== null && match.rivalPenalties !== null;
  const isTieRegular = match.myGoals === match.rivalGoals;

  let badgeColor = match.result === "D" ? "P" : match.result;
  let badgeLetter = badgeColor === "V" ? "G" : badgeColor === "E" ? "E" : "P";
  let penaltyStatus = null;

  if (isTieRegular) {
    badgeColor = "E";
    badgeLetter = "E";

    if (hasPenalties) {
      penaltyStatus = match.myPenalties > match.rivalPenalties ? "win" : "loss";
    }
  }

  return {
    badgeColor,
    badgeLetter,
    hasPenalties,
    penaltyStatus,
  };
}

function getMatchFilterResult(match) {
  if (match.myGoals === match.rivalGoals) return "E";
  return match.myGoals > match.rivalGoals ? "V" : "D";
}

function useHorizontalRail(railRef, itemCount) {
  const [railState, setRailState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    isDragging: false,
    isScrollable: false,
  });
  const dragRef = useRef({
    isDragging: false,
    pointerId: null,
    startScrollLeft: 0,
    startX: 0,
  });

  useEffect(() => {
    const rail = railRef?.current;
    if (!rail) return undefined;

    const updateRailState = () => {
      const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
      setRailState({
        canScrollLeft: rail.scrollLeft > 4,
        canScrollRight: rail.scrollLeft < maxScrollLeft - 4,
        isDragging: dragRef.current.isDragging,
        isScrollable: maxScrollLeft > 4,
      });
    };

    const stopDragging = (event) => {
      if (!dragRef.current.isDragging) return;

      if (
        event?.pointerId != null &&
        rail.hasPointerCapture?.(event.pointerId)
      ) {
        rail.releasePointerCapture(event.pointerId);
      }

      dragRef.current = {
        isDragging: false,
        pointerId: null,
        startScrollLeft: 0,
        startX: 0,
      };
      updateRailState();
    };

    const handleWheel = (event) => {
      if (rail.scrollWidth <= rail.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      event.preventDefault();
      rail.scrollLeft += event.deltaY;
      updateRailState();
    };

    const handlePointerDown = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (rail.scrollWidth <= rail.clientWidth) return;

      dragRef.current = {
        isDragging: true,
        pointerId: event.pointerId ?? null,
        startScrollLeft: rail.scrollLeft,
        startX: event.clientX,
      };

      rail.setPointerCapture?.(event.pointerId);
      updateRailState();
    };

    const handlePointerMove = (event) => {
      if (!dragRef.current.isDragging) return;

      const deltaX = event.clientX - dragRef.current.startX;
      if (Math.abs(deltaX) <= 1) return;

      event.preventDefault();
      rail.scrollLeft = dragRef.current.startScrollLeft - deltaX;
      updateRailState();
    };

    updateRailState();

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateRailState);
      resizeObserver.observe(rail);
    }

    rail.addEventListener("scroll", updateRailState);
    rail.addEventListener("wheel", handleWheel, { passive: false });
    rail.addEventListener("pointerdown", handlePointerDown);
    rail.addEventListener("pointermove", handlePointerMove);
    rail.addEventListener("pointerup", stopDragging);
    rail.addEventListener("pointercancel", stopDragging);
    rail.addEventListener("lostpointercapture", stopDragging);
    window.addEventListener("resize", updateRailState);

    const timeoutId = setTimeout(updateRailState, 50);

    return () => {
      rail.removeEventListener("scroll", updateRailState);
      rail.removeEventListener("wheel", handleWheel);
      rail.removeEventListener("pointerdown", handlePointerDown);
      rail.removeEventListener("pointermove", handlePointerMove);
      rail.removeEventListener("pointerup", stopDragging);
      rail.removeEventListener("pointercancel", stopDragging);
      rail.removeEventListener("lostpointercapture", stopDragging);
      window.removeEventListener("resize", updateRailState);
      resizeObserver?.disconnect();
      clearTimeout(timeoutId);
    };
  }, [itemCount, railRef]);

  const scrollRail = (direction) => {
    const rail = railRef?.current;
    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.72, 180),
      behavior: "smooth",
    });
  };

  return { railState, scrollRail };
}

function RailControls({ canScrollLeft, canScrollRight, onLeft, onRight }) {
  return (
    <>
      <RailArrowButton
        aria-label="Desplazar a la izquierda"
        disabled={!canScrollLeft}
        onClick={onLeft}
        type="button"
      >
        <RiArrowLeftSLine size={18} />
      </RailArrowButton>
      <RailArrowButton
        aria-label="Desplazar a la derecha"
        disabled={!canScrollRight}
        onClick={onRight}
        type="button"
      >
        <RiArrowRightSLine size={18} />
      </RailArrowButton>
    </>
  );
}

function ResultFilterMenu({
  activeFilter,
  isOpen,
  onSelect,
  setIsOpen,
  wrapperRef,
}) {
  const activeOption =
    MATCH_RESULT_FILTERS.find((filterOption) => filterOption.id === activeFilter) ||
    MATCH_RESULT_FILTERS[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDownOutside = (event) => {
      if (wrapperRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
    };
  }, [isOpen, setIsOpen, wrapperRef]);

  return (
    <CompactFilterWrapper ref={wrapperRef}>
      <CompactFilterTrigger
        $active={activeFilter !== "all" || isOpen}
        aria-expanded={isOpen}
        aria-label="Filtrar resultados"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <RiFilter3Line size={15} />
        <span className="filter-label">{activeOption.label}</span>
        <RiArrowDownSLine size={14} />
      </CompactFilterTrigger>

      {isOpen && (
        <CompactFilterPopover>
          <CompactFilterGroup aria-label="Filtrar resultados">
            {MATCH_RESULT_FILTERS.map((filterOption) => (
              <CompactFilterButton
                key={filterOption.id}
                $active={activeFilter === filterOption.id}
                onClick={() => {
                  onSelect(filterOption.id);
                  setIsOpen(false);
                }}
                title={filterOption.label}
                type="button"
              >
                <span className="full-label">{filterOption.label}</span>
                <span className="short-label">{filterOption.shortLabel}</span>
              </CompactFilterButton>
            ))}
          </CompactFilterGroup>
        </CompactFilterPopover>
      )}
    </CompactFilterWrapper>
  );
}

export function TeamResultsTab({
  loadingStats,
  matchHistory,
  resultsRailRef,
  upcomingRailRef,
  upcomingRivals,
}) {
  const [resultFilter, setResultFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [renderedMatchHistory, setRenderedMatchHistory] = useState(matchHistory);
  const [resultsPhase, setResultsPhase] = useState("idle");
  const filterWrapperRef = useRef(null);
  const isFirstResultsRenderRef = useRef(true);
  const filteredMatchHistory = useMemo(() => {
    if (resultFilter === "all") return matchHistory;
    return matchHistory.filter(
      (match) => getMatchFilterResult(match) === resultFilter
    );
  }, [matchHistory, resultFilter]);

  const { railState: resultsRailState, scrollRail: scrollResultsRail } =
    useHorizontalRail(resultsRailRef, renderedMatchHistory.length);
  const { railState: upcomingRailState, scrollRail: scrollUpcomingRail } =
    useHorizontalRail(upcomingRailRef, upcomingRivals.length);

  useEffect(() => {
    if (loadingStats) {
      setRenderedMatchHistory([]);
      setResultsPhase("idle");
      return undefined;
    }

    if (isFirstResultsRenderRef.current) {
      isFirstResultsRenderRef.current = false;
      setRenderedMatchHistory(filteredMatchHistory);
      setResultsPhase("entering");

      const initialEnterTimeout = setTimeout(() => {
        setResultsPhase("idle");
      }, 220);

      return () => clearTimeout(initialEnterTimeout);
    }

    setResultsPhase("leaving");

    const exitTimeout = setTimeout(() => {
      const rail = resultsRailRef?.current;
      rail?.scrollTo({ left: 0, behavior: "smooth" });
      setRenderedMatchHistory(filteredMatchHistory);
      setResultsPhase("entering");
    }, 120);

    const settleTimeout = setTimeout(() => {
      setResultsPhase("idle");
    }, 340);

    return () => {
      clearTimeout(exitTimeout);
      clearTimeout(settleTimeout);
    };
  }, [filteredMatchHistory, loadingStats, resultsRailRef]);

  return (
    <StatsPanel>
      <SectionContainer>
        <SectionHeader>
          <SectionHeaderMain>
            <SectionLabel>Ultimos Resultados</SectionLabel>
          </SectionHeaderMain>
          <RailNavigation>
            <ResultFilterMenu
              activeFilter={resultFilter}
              isOpen={isFilterOpen}
              onSelect={setResultFilter}
              setIsOpen={setIsFilterOpen}
              wrapperRef={filterWrapperRef}
            />
            <RailControls
              canScrollLeft={resultsRailState.canScrollLeft}
              canScrollRight={resultsRailState.canScrollRight}
              onLeft={() => scrollResultsRail(-1)}
              onRight={() => scrollResultsRail(1)}
            />
          </RailNavigation>
        </SectionHeader>

        <MatchesGrid
          ref={resultsRailRef}
          $isDragging={resultsRailState.isDragging}
          $isScrollable={resultsRailState.isScrollable}
        >
          <RailItemsRow
            $phase={resultsPhase}
            $stretch={loadingStats || renderedMatchHistory.length === 0}
          >
            {loadingStats ? (
              Array.from({ length: 4 }).map((_, index) => (
                <MatchCardSkeleton key={index} />
              ))
            ) : renderedMatchHistory.length > 0 ? (
              renderedMatchHistory.map((match) => {
                const { badgeColor, badgeLetter, hasPenalties, penaltyStatus } =
                  getMatchBadge(match);

                return (
                  <MatchCard key={`${resultFilter}-${match.id}`}>
                    <div className="match-header">
                      <span className="jornada-tag" title={match.jornada}>
                        {match.jornada}
                      </span>
                      <ResultBadge
                        $penaltyStatus={penaltyStatus}
                        $result={badgeColor}
                      >
                        {badgeLetter}
                      </ResultBadge>
                    </div>

                    <div className="match-date-simple">
                      {formatShortDate(match.date)}
                    </div>

                    <div className="match-score">
                      <span className="score-num my-team">{match.myGoals}</span>
                      <span className="divider">-</span>
                      <span className="score-num">{match.rivalGoals}</span>
                    </div>

                    {hasPenalties && (
                      <div className="penalties-score">
                        (P: {match.myPenalties} - {match.rivalPenalties})
                      </div>
                    )}

                    <div className="rival-container">
                      <TeamLogo club={match.rival} />
                      <span>{match.rival?.name}</span>
                    </div>
                  </MatchCard>
                );
              })
            ) : (
              <EmptyBox>No hay partidos para ese filtro.</EmptyBox>
            )}
          </RailItemsRow>
        </MatchesGrid>
      </SectionContainer>

      <SectionContainer>
        <SectionHeader>
          <SectionHeaderMain>
            <SectionLabel>Proximos Rivales</SectionLabel>
          </SectionHeaderMain>
          <RailNavigation>
            <RailControls
              canScrollLeft={upcomingRailState.canScrollLeft}
              canScrollRight={upcomingRailState.canScrollRight}
              onLeft={() => scrollUpcomingRail(-1)}
              onRight={() => scrollUpcomingRail(1)}
            />
          </RailNavigation>
        </SectionHeader>

        <UpcomingGrid
          ref={upcomingRailRef}
          $isDragging={upcomingRailState.isDragging}
          $isScrollable={upcomingRailState.isScrollable}
        >
          {loadingStats ? (
            Array.from({ length: 4 }).map((_, index) => (
              <UpcomingRivalSkeleton key={index} />
            ))
          ) : upcomingRivals.length > 0 ? (
            upcomingRivals.map((match) => (
              <UpcomingCard key={match.id}>
                <div className="upcoming-jornada" title={match.jornada}>
                  {match.jornada || "Pendiente"}
                </div>
                <div className="logo-slot">
                  <TeamLogo club={match.rival} size="34px" />
                </div>
                <div className="upcoming-name" title={match.rival?.name}>
                  {match.rival?.name || "Rival pendiente"}
                </div>
                <div className="upcoming-date">
                  {match.date ? formatShortDate(match.date) : "Sin fecha"}
                </div>
                {match.time && <div className="upcoming-time">{match.time}</div>}
              </UpcomingCard>
            ))
          ) : (
            <EmptyBox>No quedan partidos pendientes por disputar.</EmptyBox>
          )}
        </UpcomingGrid>
      </SectionContainer>
    </StatsPanel>
  );
}
