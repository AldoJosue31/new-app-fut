"use client";

import {
  cloneElement,
  isValidElement,
} from "react";
import { usePathname } from "next/navigation";
import styled from "styled-components";

import ErrorBoundary from "../organismos/ErrorBoundary.jsx";
import {
  Sidebar,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_OPEN_WIDTH,
  sidebarTransition,
} from "../organismos/sidebar/Sidebar.jsx";
import { Device } from "../../styles/breakpoints.jsx";
import PrivateAuthGate from "./PrivateAuthGate.jsx";
import { NavigationProgressBar } from "./NavigationProgress.jsx";
import { useLayoutStore } from "../../store/LayoutStore.jsx";

export default function PrivatePageShell({
  children,
  initialAuth,
}) {
  const setSidebarOpen = useLayoutStore((state) => state.setSidebarOpen);
  const content = isValidElement(children)
    ? cloneElement(children, { setState: setSidebarOpen })
    : children;

  return (
    <ErrorBoundary>
      <PrivateAuthGate initialAuth={initialAuth}>
        <PrivatePageLayout setSidebarOpen={setSidebarOpen}>{content}</PrivatePageLayout>
        <NavigationProgressBar />
      </PrivateAuthGate>
    </ErrorBoundary>
  );
}

function PrivatePageLayout({ children, setSidebarOpen }) {
  const currentPath = usePathname() || "/";
  const sidebarOpen = useLayoutStore((state) => state.sidebarOpen);

  return (
    <Container data-sidebar-open={sidebarOpen}>
      <section className="contentSidebar">
        <Sidebar
          state={sidebarOpen}
          setState={setSidebarOpen}
          currentPath={currentPath}
        />
      </section>
      <section className="contentRouters">{children}</section>
    </Container>
  );
}

const Container = styled.main`
  display: grid;
  grid-template-columns: 1fr;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};

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
    transition: grid-template-columns ${sidebarTransition};

    &[data-sidebar-open="true"] {
      grid-template-columns: ${SIDEBAR_OPEN_WIDTH}px minmax(0, 1fr);
    }

    .contentRouters {
      grid-column: 2;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
