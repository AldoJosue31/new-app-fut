import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { Device } from "../../styles/breakpoints";

export function TabsNavigation({
  tabs,
  activeTab,
  setActiveTab,
  showLabelsOnMobile = false,
  equalWidth = false,
  compact = false,
  ariaLabel = "Secciones",
}) {
  const [indicatorStyle, setIndicatorStyle] = useState({
    height: 0,
    left: 0,
    top: 0,
    width: 0,
    opacity: 0,
  });
  const containerRef = useRef(null);
  const tabsRef = useRef(new Map());
  const rafRef = useRef(null);

  const updateIndicator = useCallback(() => {
    const currentTab = tabsRef.current.get(activeTab);

    if (!currentTab) return;

    const nextLeft = currentTab.offsetLeft;
    const nextTop = currentTab.offsetTop;
    const nextWidth = currentTab.offsetWidth;
    const nextHeight = currentTab.offsetHeight;

    setIndicatorStyle((current) => {
      if (
        current.left === nextLeft &&
        current.top === nextTop &&
        current.width === nextWidth &&
        current.height === nextHeight &&
        current.opacity === 1
      ) {
        return current;
      }

      return {
        height: nextHeight,
        left: nextLeft,
        top: nextTop,
        width: nextWidth,
        opacity: 1,
      };
    });
  }, [activeTab]);

  const scheduleIndicatorUpdate = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      updateIndicator();
    });
  }, [updateIndicator]);

  const handleTabKeyDown = useCallback((event, tabId) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    requestAnimationFrame(() => tabsRef.current.get(nextTab.id)?.focus());
  }, [setActiveTab, tabs]);

  useLayoutEffect(() => {
    scheduleIndicatorUpdate();

    const container = containerRef.current;
    const currentTab = tabsRef.current.get(activeTab);

    if (container && currentTab) {
      const tabStart = currentTab.offsetLeft;
      const tabEnd = tabStart + currentTab.offsetWidth;
      const visibleStart = container.scrollLeft;
      const visibleEnd = visibleStart + container.clientWidth;
      const edgePadding = 8;

      if (tabStart < visibleStart + edgePadding) {
        container.scrollTo({ left: Math.max(0, tabStart - edgePadding) });
      } else if (tabEnd > visibleEnd - edgePadding) {
        container.scrollTo({ left: tabEnd - container.clientWidth + edgePadding });
      }
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeTab, scheduleIndicatorUpdate]);

  useEffect(() => {
    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => scheduleIndicatorUpdate());

      if (containerRef.current) resizeObserver.observe(containerRef.current);
      tabsRef.current.forEach((tab) => resizeObserver.observe(tab));
    } else {
      window.addEventListener("resize", scheduleIndicatorUpdate);
    }

    return () => {
      window.removeEventListener("resize", scheduleIndicatorUpdate);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [scheduleIndicatorUpdate]);

  return (
    <Container ref={containerRef} role="tablist" aria-label={ariaLabel} $compact={compact}>
      <Glider
        style={{
          transform: `translate3d(${indicatorStyle.left}px, ${indicatorStyle.top}px, 0)`,
          height: `${indicatorStyle.height}px`,
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.opacity,
        }}
      />
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          ref={(el) => {
            if (el) {
              tabsRef.current.set(tab.id, el);
            } else {
              tabsRef.current.delete(tab.id);
            }
          }}
          $active={activeTab === tab.id}
          $showLabelsOnMobile={showLabelsOnMobile}
          $equalWidth={equalWidth}
          onClick={() => setActiveTab(tab.id)}
          onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          title={tab.label}
        >
          {tab.icon && <span className="icon">{tab.icon}</span>}
          <span className="label">{tab.label}</span>
        </TabButton>
      ))}
    </Container>
  );
}

export const TabContent = styled.div`
  width: 100%;
  animation: fadeTabContent ${v.tabTransitionDuration} ${v.tabTransitionTiming} forwards;
  overflow-x: clip;

  @keyframes fadeTabContent {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;


const Container = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  min-height: ${({ $compact }) => ($compact ? "48px" : "57px")};
  margin-bottom: 0;
  padding: ${({ $compact }) => ($compact ? "0 1px 3px" : "2px 2px 10px")};
  box-sizing: border-box;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  overflow-x: auto;
  overflow-y: hidden;
  gap: 5px;
  scroll-padding-inline: 8px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media ${Device.tablet} {
    gap: 15px;
  }
`;

const Glider = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  background: ${({ theme }) => theme.bg6};
  border: 1px solid ${({ theme }) => theme.bg5};
  border-radius: 14px;
  z-index: 0;
  transition: transform ${v.tabTransition}, width ${v.tabTransition}, height ${v.tabTransition}, opacity ${v.tabTransition};
  pointer-events: none;
`;

const TabButton = styled.button`
  position: relative;
  z-index: 1;
  flex: ${({ $equalWidth, $showLabelsOnMobile }) => (
    $equalWidth || !$showLabelsOnMobile ? "1 1 0" : "0 0 auto"
  )};
  display: flex;
  align-items: center;
  align-self: ${({ $equalWidth }) => ($equalWidth ? "stretch" : "auto")};
  justify-content: center;
  gap: 8px;
  min-width: ${({ $equalWidth, $showLabelsOnMobile }) => (
    $equalWidth || !$showLabelsOnMobile ? "0" : "96px"
  )};
  max-width: ${({ $equalWidth, $showLabelsOnMobile }) => (
    $equalWidth || !$showLabelsOnMobile ? "none" : "min(220px, 70vw)"
  )};
  min-height: 44px;
  padding: 10px 12px;
  background: transparent;
  color: ${({ $active, theme }) => ($active ? theme.primary : theme.text)};
  border: 1px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.2;
  scroll-snap-align: nearest;
  transition: color ${v.tabTransition}, border-color ${v.tabTransition}, background-color ${v.tabTransition};

  .label {
    display: ${({ $showLabelsOnMobile }) => ($showLabelsOnMobile ? "block" : "none")};
    position: relative;
    z-index: 2;
    font-size: ${({ $showLabelsOnMobile }) => ($showLabelsOnMobile ? "0.78rem" : "inherit")};
    line-height: 1.2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: ${({ $equalWidth }) => ($equalWidth ? "anywhere" : "normal")};
    white-space: ${({ $equalWidth }) => ($equalWidth ? "normal" : "nowrap")};
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
  }

  @media (max-width: 767px) {
    flex-direction: ${({ $equalWidth, $showLabelsOnMobile }) => (
      $equalWidth && $showLabelsOnMobile ? "column" : "row"
    )};
    gap: ${({ $equalWidth, $showLabelsOnMobile }) => (
      $equalWidth ? "2px" : $showLabelsOnMobile ? "6px" : "8px"
    )};
    min-height: ${({ $equalWidth, $showLabelsOnMobile }) => (
      $equalWidth && $showLabelsOnMobile ? "48px" : "44px"
    )};
    padding: ${({ $equalWidth, $showLabelsOnMobile }) => (
      $equalWidth ? "5px 4px" : $showLabelsOnMobile ? "8px 10px" : "8px"
    )};

    .label {
      font-size: ${({ $equalWidth, $showLabelsOnMobile }) => (
        $equalWidth && $showLabelsOnMobile ? "0.7rem" : "0.78rem"
      )};
      line-height: 1.05;
      max-width: 100%;
      overflow-wrap: normal;
      white-space: nowrap;
    }

    .icon {
      flex: 0 0 auto;
      font-size: ${({ $equalWidth, $showLabelsOnMobile }) => (
        $equalWidth && $showLabelsOnMobile ? "0.95rem" : $showLabelsOnMobile ? "1rem" : "1.4rem"
      )};
    }
  }

  @media ${Device.tablet} {
    padding: ${({ $equalWidth }) => ($equalWidth ? "10px 12px" : "10px 16px")};

    .label {
      display: block;
      font-size: inherit;
    }

    .icon {
      font-size: 1.1em;
    }
  }

  @media (min-width: 1024px) {
    flex: 1 1 0;
    min-width: 0;
    max-width: none;
  }

  &:hover {
    color: ${({ theme }) => theme.primary};
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.primary};
    outline-offset: -3px;
  }
`;
