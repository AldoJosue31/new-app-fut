"use client";

import { useEffect, useRef } from "react";
import { MotionConfig } from "framer-motion";
import { usePathname } from "next/navigation";
import { Toaster } from "sileo";
import { useThemeStore } from "../../store/ThemeStore.jsx";
import { notify } from "../../lib/notifications/notify.js";

const TOASTER_OFFSET = Object.freeze({
  top: "max(12px, env(safe-area-inset-top))",
  right: 12,
});

const TOASTER_OPTIONS = Object.freeze({
  roundness: 16,
  autopilot: Object.freeze({ expand: 150, collapse: 3000 }),
});

export function AppToaster() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      notify.clear();
      previousPathname.current = pathname;
    }
  }, [pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <Toaster
        position="top-right"
        offset={TOASTER_OFFSET}
        options={TOASTER_OPTIONS}
        theme={theme}
      />
    </MotionConfig>
  );
}
