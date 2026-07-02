import React, { useEffect, useMemo } from "react";
import "./landing/tokens.css";
import { useThemeStore } from "../store/ThemeStore";

import LandingHeader from "../components/landing/LandingHeader";
import HeroSection from "../components/landing/HeroSection";
import FeaturesStrip from "../components/landing/FeaturesStrip";
import HowItWorks from "../components/landing/HowItWorks";
import ProductShowcase from "../components/landing/ProductShowcase";
import BenefitsSection from "../components/landing/BenefitsSection";
import TestimonialSection from "../components/landing/TestimonialSection";
import PricingSection from "../components/landing/PricingSection";
import FAQSection from "../components/landing/FAQSection";
import FinalCTA from "../components/landing/FinalCTA";
import LandingFooter from "../components/landing/LandingFooter";

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));

const parseColor = (value) => {
  if (!value) return { r: 0, g: 0, b: 0 };

  const normalized = value.trim();

  if (normalized.startsWith("#")) {
    let hex = normalized.slice(1);

    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .slice(0, 3)
        .split("")
        .map((part) => part + part)
        .join("");
    }

    if (hex.length === 6 || hex.length === 8) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  const rgbMatch = normalized.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const [r = 0, g = 0, b = 0] = rgbMatch[1]
      .split(",")
      .map((part) => Number.parseFloat(part.trim()));

    return { r, g, b };
  }

  return { r: 0, g: 0, b: 0 };
};

const toRgbString = ({ r, g, b }) =>
  `rgb(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)})`;

const toRgbaString = (color, alpha) => {
  const { r, g, b } = parseColor(color);
  return `rgba(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)}, ${alpha})`;
};

const mixColors = (base, tint, baseWeight = 0.5) => {
  const baseColor = parseColor(base);
  const tintColor = parseColor(tint);
  const tintWeight = 1 - baseWeight;

  return toRgbString({
    r: baseColor.r * baseWeight + tintColor.r * tintWeight,
    g: baseColor.g * baseWeight + tintColor.g * tintWeight,
    b: baseColor.b * baseWeight + tintColor.b * tintWeight,
  });
};

export default function Landing() {
  const { theme, themeStyle } = useThemeStore();
  const landingVars = useMemo(
    () => {
      const isDark = theme === "dark";
      const pageSurface = themeStyle.bgtotal;
      const panelSurface = themeStyle.bgcards ?? themeStyle.bg3 ?? themeStyle.bg;
      const softSurface = themeStyle.bg3 ?? themeStyle.bg2 ?? themeStyle.bg;
      const sidebarSurface = themeStyle.bgtgderecha ?? softSurface;
      const accent = themeStyle.primary;
      const accentStrong = themeStyle.bg5 ?? accent;
      const ink = themeStyle.text;
      const paper = themeStyle.body;

      const forestDeep = isDark
        ? mixColors(panelSurface, accent, 0.78)
        : mixColors(ink, accent, 0.72);
      const forest = isDark
        ? mixColors(sidebarSurface, accentStrong, 0.7)
        : mixColors(ink, accentStrong, 0.58);
      const grass = mixColors(accent, accentStrong, 0.72);
      const grassBright = accentStrong;
      const sage = mixColors(softSurface, accentStrong, isDark ? 0.72 : 0.84);
      const gold = accent;
      const goldBright = accentStrong;
      const goldDeep = isDark
        ? mixColors(accent, pageSurface, 0.72)
        : mixColors(accent, ink, 0.66);
      const cream = isDark ? themeStyle.text : mixColors(paper, themeStyle.bg3 ?? paper, 0.3);
      const creamSoft = isDark
        ? mixColors(themeStyle.text, sidebarSurface, 0.78)
        : mixColors(themeStyle.bg3 ?? paper, softSurface, 0.86);
      const carbon = isDark ? themeStyle.body : themeStyle.text;
      const carbonSoft = isDark
        ? mixColors(sidebarSurface, pageSurface, 0.58)
        : themeStyle.colorSubtitle ?? ink;

      return {
        "--lp-page-bg": pageSurface,
        "--lp-forest": forest,
        "--lp-forest-deep": forestDeep,
        "--lp-grass": grass,
        "--lp-grass-bright": grassBright,
        "--lp-sage": sage,
        "--lp-gold": gold,
        "--lp-gold-bright": goldBright,
        "--lp-gold-deep": goldDeep,
        "--lp-cream": cream,
        "--lp-cream-soft": creamSoft,
        "--lp-carbon": carbon,
        "--lp-carbon-soft": carbonSoft,
        "--lp-shadow-gold": `0 20px 44px -24px ${toRgbaString(gold, 0.48)}`,
        "--lp-shadow-deep": `0 28px 60px -34px ${toRgbaString(forestDeep, isDark ? 0.72 : 0.3)}`,
        "--lp-app-surface": panelSurface,
        "--lp-app-surface-soft": softSurface,
        "--lp-app-surface-muted": themeStyle.bg2 ?? themeStyle.bgAlpha,
        "--lp-app-ink": ink,
        "--lp-app-ink-muted": toRgbaString(ink, isDark ? 0.72 : 0.68),
        "--lp-app-ink-soft": toRgbaString(ink, isDark ? 0.58 : 0.54),
        "--lp-app-border": toRgbaString(sidebarSurface, isDark ? 0.46 : 0.12),
        "--lp-app-border-strong": toRgbaString(sidebarSurface, isDark ? 0.62 : 0.18),
        "--lp-app-border-subtle": toRgbaString(sidebarSurface, isDark ? 0.28 : 0.08),
        "--lp-app-accent": accent,
        "--lp-app-accent-soft": themeStyle.bg6,
        "--lp-app-accent-strong": accentStrong,
        "--lp-app-shadow": isDark
          ? "0 24px 48px -32px rgba(0, 0, 0, 0.55)"
          : `0 24px 48px -32px ${toRgbaString(forestDeep, 0.24)}`,
        "--lp-app-shadow-strong": isDark
          ? "0 28px 60px -34px rgba(0, 0, 0, 0.62)"
          : `0 28px 60px -36px ${toRgbaString(forestDeep, 0.28)}`,
        "--lp-header-bg": toRgbaString(mixColors(sidebarSurface, forestDeep, 0.54), 0.88),
        "--lp-focus-ring": `0 0 0 3px ${toRgbaString(paper, isDark ? 0.16 : 0.22)}, 0 0 0 6px ${toRgbaString(accent, 0.34)}`,
      };
    },
    [theme, themeStyle]
  );

  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = landingVars["--lp-page-bg"];
    return () => {
      document.body.style.background = prev;
    };
  }, [landingVars]);

  return (
    <div className="landing-scope" data-theme={theme} style={landingVars}>
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesStrip />
        <HowItWorks />
        <ProductShowcase />
        <BenefitsSection />
        <TestimonialSection />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
