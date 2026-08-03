"use client";

import StyledComponentsRegistry from "./lib/styledComponentsRegistry.jsx";
import { NavigationProgressProvider } from "../src/components/app/NavigationProgress.jsx";
import { AppToaster } from "../src/components/app/AppToaster.jsx";

export default function Providers({ children }) {
  return (
    <StyledComponentsRegistry>
      <NavigationProgressProvider>
        <AppToaster />
        {children}
      </NavigationProgressProvider>
    </StyledComponentsRegistry>
  );
}
