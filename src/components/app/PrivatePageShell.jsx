"use client";

import {
  cloneElement,
  isValidElement,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import styled from "styled-components";

import ErrorBoundary from "../organismos/ErrorBoundary.jsx";
import {
  Sidebar,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_OPEN_WIDTH,
} from "../organismos/sidebar/Sidebar.jsx";
import { Device } from "../../styles/breakpoints.jsx";
import PrivatePageProviders from "./PrivatePageProviders.jsx";
import { NavigationProgressBar } from "./NavigationProgress.jsx";

export default function PrivatePageShell({
  children,
  initialAuth,
}) {
  const currentPath = usePathname() || "/";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const content = isValidElement(children)
    ? cloneElement(children, {
        setState: setSidebarOpen,
        state: sidebarOpen,
      })
    : children;

  return (
    <ErrorBoundary>
      <PrivatePageProviders initialAuth={initialAuth}>
        <Container className={sidebarOpen ? "active" : ""}>
          <section className="contentSidebar">
            <Sidebar
              state={sidebarOpen}
              setState={setSidebarOpen}
              currentPath={currentPath}
            />
          </section>
          <section className="contentRouters">{content}</section>
        </Container>
        <NavigationProgressBar />
      </PrivatePageProviders>
    </ErrorBoundary>
  );
}

const Container = styled.main`
  display: grid;
  grid-template-columns: 1fr;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  transition: grid-template-columns 280ms ease;

  .contentSidebar {
    position: absolute;
    z-index: 2000;
    display: block;
    height: 100%;
    background-color: ${({ theme }) => theme.bgtgderecha};

    @media ${Device.tablet} {
      position: relative;
      z-index: auto;
      display: initial;
    }
  }

  .contentRouters {
    grid-column: 1;
    width: 100%;
  }

  @media ${Device.tablet} {
    grid-template-columns: ${SIDEBAR_COLLAPSED_WIDTH}px minmax(0, 1fr);

    &.active {
      grid-template-columns: ${SIDEBAR_OPEN_WIDTH}px minmax(0, 1fr);
    }

    .contentRouters {
      grid-column: 2;
    }
  }
`;
