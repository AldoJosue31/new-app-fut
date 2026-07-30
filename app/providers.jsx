"use client";

import StyledComponentsRegistry from "./lib/styledComponentsRegistry.jsx";
import { NavigationProgressProvider } from "../src/components/app/NavigationProgress.jsx";

export default function Providers({ children }) {
  return (
    <StyledComponentsRegistry>
      <NavigationProgressProvider>
        {children}
      </NavigationProgressProvider>
    </StyledComponentsRegistry>
  );
}
