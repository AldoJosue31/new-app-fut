"use client";

import { APP_NAME, BRAND_MARK } from "../../lib/brand.js";
import { useThemeStore } from "../../store/ThemeStore.jsx";

const artwork = {
  horizontal: {
    original: "/bracket-unity-horizontal.webp",
    onLight: "/bracket-unity-horizontal-on-light.webp",
    width: 640,
    height: 208,
  },
  stacked: {
    original: "/bracket-unity-stacked.webp",
    onLight: "/bracket-unity-stacked-on-light.webp",
    width: 370,
    height: 480,
  },
  mark: {
    original: BRAND_MARK,
    onLight: BRAND_MARK,
    width: 128,
    height: 128,
  },
};

export function BrandLogo({ variant = "horizontal", alt = APP_NAME, className }) {
  const theme = useThemeStore((state) => state.theme);
  const { original, onLight, width, height } = artwork[variant];

  return (
    <img
      src={theme === "dark" ? original : onLight}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
