import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { Device } from "../../styles/breakpoints";

export function TabsNavigation({
  tabs,
  activeTab,
  setActiveTab,
  showLabelsOnMobile = false,
}) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const containerRef = useRef(null);
  const tabsRef = useRef(new Map());
  const rafRef = useRef(null);

  const updateIndicator = useCallback(() => {
    const currentTab = tabsRef.current.get(activeTab);

    if (!currentTab) return;

    const nextLeft = currentTab.offsetLeft;
    const nextWidth = currentTab.offsetWidth;

    setIndicatorStyle((current) => {
      if (
        current.left === nextLeft &&
        current.width === nextWidth &&
        current.opacity === 1
      ) {
        return current;
      }

      return {
        left: nextLeft,
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

  useLayoutEffect(() => {
    scheduleIndicatorUpdate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleIndicatorUpdate]);

  useEffect(() => {
    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => scheduleIndicatorUpdate());

      if (containerRef.current) resizeObserver.observe(containerRef.current);
    } else {
      window.addEventListener("resize", scheduleIndicatorUpdate);
    }

    return () => {
      window.removeEventListener("resize", scheduleIndicatorUpdate);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [scheduleIndicatorUpdate]);

  return (
    <Container ref={containerRef}>
      <Glider
        style={{
          transform: `translateX(${indicatorStyle.left}px)`,
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
          onClick={() => setActiveTab(tab.id)}
          type="button"
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
  width: 100%;
  min-width: 0;
  margin-bottom: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  overflow-x: auto;
  gap: 5px;
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
  height: calc(100% - 10px);
  background: ${({ theme }) => theme.bg4};
  border: 1px solid ${({ theme }) => theme.color2};
  border-radius: 20px;
  z-index: 0;
  transition: transform ${v.tabTransition}, width ${v.tabTransition}, opacity ${v.tabTransition};
  pointer-events: none;
`;

const TabButton = styled.button`
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
  background: transparent;
  color: ${({ $active, theme }) => ($active ? theme.primary : theme.text)};
  border: 1px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color ${v.tabTransition}, border-color ${v.tabTransition}, background-color ${v.tabTransition};

  .label {
    display: ${({ $showLabelsOnMobile }) => ($showLabelsOnMobile ? "block" : "none")};
    position: relative;
    z-index: 2;
    font-size: ${({ $showLabelsOnMobile }) => ($showLabelsOnMobile ? "0.78rem" : "inherit")};
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
  }

  @media (max-width: 767px) {
    gap: ${({ $showLabelsOnMobile }) => ($showLabelsOnMobile ? "6px" : "8px")};
    padding: ${({ $showLabelsOnMobile }) => ($showLabelsOnMobile ? "10px 8px" : "12px 0")};

    .icon {
      font-size: ${({ $showLabelsOnMobile }) => ($showLabelsOnMobile ? "1rem" : "1.4rem")};
    }
  }

  @media ${Device.tablet} {
    padding: 10px 16px;

    .label {
      display: block;
      font-size: inherit;
    }

    .icon {
      font-size: 1.1em;
    }
  }

  &:hover {
    color: ${({ theme }) => theme.primary};
  }
`;
