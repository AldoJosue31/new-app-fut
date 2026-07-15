import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";
import { RiAddLine, RiLayoutGridLine, RiListCheck2, RiSubtractLine } from "react-icons/ri";
import { Modal } from "../../../../Modal";
import { v } from "../../../../../../styles/variables";
import { supabase } from "../../../../../../supabase/supabase.config";
import { addDaysToDate } from "../../../../../../utils/dateUtils";
import { exportElementAsPNG } from "../../../../../../utils/imageExporter";
import {
  DIVISION_COLORS,
  buildDivisionColorMap,
  normalizeDivisionName,
} from "../../../../../../utils/divisionColors";
import { ExportDownloadButton, ExportPreviewHeader } from "../shared/ExportPreviewHeader";
import ScheduleExportLayout from "./ScheduleExportLayout";

const LOGO_BASE_SCALE = 1.25;
const LOGO_SCALE_OPTIONS = [100, 125, 150, 175, 200].map((label) => ({
  label,
  value: Number(((label / 100) * LOGO_BASE_SCALE).toFixed(4)),
}));

const getLogoScaleOptionIndex = (scale) => {
  const currentIndex = LOGO_SCALE_OPTIONS.findIndex((option) => option.value === scale);
  if (currentIndex >= 0) return currentIndex;

  return LOGO_SCALE_OPTIONS.reduce((closestIndex, option, index) => {
    const closestDistance = Math.abs(LOGO_SCALE_OPTIONS[closestIndex].value - scale);
    const currentDistance = Math.abs(option.value - scale);
    return currentDistance < closestDistance ? index : closestIndex;
  }, 0);
};

const cleanFilePart = (value, fallback) =>
  String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_ -]/gi, "")
    .trim()
    .replace(/\s+/g, "_");

const getTournamentDivision = (torneo) => torneo?.division || torneo?.divisions || {};

const getTournamentLeague = (torneo) => {
  const division = getTournamentDivision(torneo);
  return division?.league || division?.leagues || torneo?.league || torneo?.leagues || {};
};

const getTournamentConfig = (torneo) => {
  if (!torneo?.config) return {};
  if (typeof torneo.config === "string") {
    try {
      return JSON.parse(torneo.config) || {};
    } catch {
      return {};
    }
  }
  return torneo.config || {};
};

const getJornadaLabel = (match, fallback = "Jornada") => (
  match?.jornadaName ||
  match?.jornada_name ||
  match?.originJornada ||
  match?.jornadas?.name ||
  fallback
);

const getJornadaNumber = (label) => {
  const match = String(label || "").match(/jornada\s*(\d+)/i);
  return match ? Number(match[1]) : null;
};

const buildJornadaSummary = (matches, fallbackJornada = "Jornada") => {
  const entries = matches.map((match) => {
    const label = getJornadaLabel(match, fallbackJornada);
    const number = getJornadaNumber(label);
    return {
      division: normalizeDivisionName(match.division),
      label,
      displayLabel: number ? `Jornada ${number}` : label,
      number,
    };
  });

  if (entries.length === 0) return fallbackJornada || "Jornada";

  const numericEntries = entries.filter((entry) => entry.number !== null);
  const uniqueNumbers = new Set(numericEntries.map((entry) => entry.number));

  if (numericEntries.length === entries.length && uniqueNumbers.size === 1) {
    return `Jornada ${numericEntries[0].number}`;
  }

  const uniqueByDivision = [];
  const seen = new Set();

  entries.forEach((entry) => {
    const key = `${entry.displayLabel}-${entry.division}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueByDivision.push(entry);
    }
  });

  return uniqueByDivision
    .map((entry) => `${entry.displayLabel} (${entry.division})`)
    .join(" • ");
};

const getPixelIndex = (x, y, width) => (y * width + x) * 4;

const getCornerColor = (data, width, height) => {
  const corners = [
    getPixelIndex(0, 0, width),
    getPixelIndex(width - 1, 0, width),
    getPixelIndex(0, height - 1, width),
    getPixelIndex(width - 1, height - 1, width),
  ];

  return corners.reduce(
    (acc, index) => ({
      r: acc.r + data[index] / corners.length,
      g: acc.g + data[index + 1] / corners.length,
      b: acc.b + data[index + 2] / corners.length,
    }),
    { r: 0, g: 0, b: 0 }
  );
};

const analyzeLogoFocus = (imageUrl) =>
  new Promise((resolve) => {
    if (!imageUrl || typeof document === "undefined") {
      resolve({ offsetX: 0, offsetY: 0 });
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        const maxSide = 420;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0, width, height);

        const { data } = context.getImageData(0, 0, width, height);
        const cornerColor = getCornerColor(data, width, height);
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const index = getPixelIndex(x, y, width);
            const alpha = data[index + 3];
            const colorDistance = Math.abs(data[index] - cornerColor.r) +
              Math.abs(data[index + 1] - cornerColor.g) +
              Math.abs(data[index + 2] - cornerColor.b);

            if (alpha > 18 && (alpha < 245 || colorDistance > 48)) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        if (maxX < minX || maxY < minY) {
          resolve({ offsetX: 0, offsetY: 0 });
          return;
        }

        const visualCenterX = (minX + maxX) / 2;
        const visualCenterY = (minY + maxY) / 2;
        const normalizer = Math.max(width, height);

        resolve({
          offsetX: (visualCenterX - width / 2) / normalizer,
          offsetY: (visualCenterY - height / 2) / normalizer,
        });
      } catch (error) {
        console.warn("No se pudo analizar el centro visual del logo:", error);
        resolve({ offsetX: 0, offsetY: 0 });
      }
    };

    image.onerror = () => resolve({ offsetX: 0, offsetY: 0 });
    image.src = imageUrl;
  });

export default function ScheduleExportModal({
  isOpen,
  onClose,
  weekStartDate,
  scheduledMatches = [],
  externalMatches = [],
  divisionActual,
  torneo,
  jornadaName,
  includeExternal = false,
  isConfirmed = false,
}) {
  const theme = useTheme();
  const exportComponentRef = useRef(null);

  const [isDarkExport, setIsDarkExport] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [layoutMode, setLayoutMode] = useState("grid");
  const [logoScale, setLogoScale] = useState(LOGO_BASE_SCALE);
  const [logoFocus, setLogoFocus] = useState({ offsetX: 0, offsetY: 0 });
  const [previewScale, setPreviewScale] = useState(0.78);
  const [isExporting, setIsExporting] = useState(false);
  const [metaInfo, setMetaInfo] = useState({
    league: "",
    division: "",
    jornada: "",
    leagueLogo: null,
  });

  const currentDivisionName = normalizeDivisionName(divisionActual || "Esta Division");
  const logoScaleOptionIndex = getLogoScaleOptionIndex(logoScale);
  const minLogoScaleIndex = 0;
  const maxLogoScaleIndex = LOGO_SCALE_OPTIONS.length - 1;
  const tournamentConfig = useMemo(() => getTournamentConfig(torneo), [torneo]);
  const jornadaDurationDays = Math.max(
    1,
    parseInt(tournamentConfig?.jornadaDurationDays, 10) || 7
  );

  const weekDays = useMemo(() => {
    if (!weekStartDate) return [];
    return Array.from({ length: jornadaDurationDays }, (_, index) =>
      addDaysToDate(weekStartDate, index)
    );
  }, [jornadaDurationDays, weekStartDate]);

  const externalDivisionNames = useMemo(
    () => externalMatches.map((match) => match.division_name || match.divisionName || "Otra"),
    [externalMatches]
  );

  const divisionColorMap = useMemo(
    () =>
      buildDivisionColorMap([
        currentDivisionName,
        ...(includeExternal ? externalDivisionNames : []),
      ]),
    [currentDivisionName, externalDivisionNames, includeExternal]
  );

  const exportMatches = useMemo(() => {
    const localMatches = scheduledMatches
      .filter((match) => Boolean(match.date))
      .map((match) => ({
        ...match,
        division: currentDivisionName,
        divisionColor: divisionColorMap.get(currentDivisionName) || DIVISION_COLORS[0],
        local: match.local || match.homeTeam,
        visitante: match.visitante || match.awayTeam,
        jornadaName: match.originJornada || jornadaName,
        isExternal: false,
        isPreview: !isConfirmed,
      }));

    const externalMatchesForExport = includeExternal
      ? externalMatches.map((match) => {
          const divisionName = normalizeDivisionName(
            match.division_name || match.divisionName || "Otra"
          );

          return {
            id: match.id,
            date: match.rawDate || match.date,
            rawDate: match.rawDate || match.date,
            time: match.time,
            division: divisionName,
            divisionColor: divisionColorMap.get(divisionName) || DIVISION_COLORS[0],
            local: { name: match.local_name || match.local?.name || match.local || "Local" },
            visitante: {
              name:
                match.visitante_name ||
                match.visitante?.name ||
                match.visitante ||
                "Visita",
            },
            jornadaName:
              match.jornada_name ||
              match.jornadaName ||
              match.originJornada ||
              jornadaName,
            isExternal: true,
          };
        })
      : [];

    return [...localMatches, ...externalMatchesForExport].sort((a, b) => {
      const dateCompare = (a.date || "").localeCompare(b.date || "");
      if (dateCompare !== 0) return dateCompare;
      return (a.time || "").localeCompare(b.time || "");
    });
  }, [
    currentDivisionName,
    divisionColorMap,
    externalMatches,
    includeExternal,
    isConfirmed,
    jornadaName,
    scheduledMatches,
  ]);

  const jornadaSummary = useMemo(
    () => buildJornadaSummary(exportMatches, jornadaName || "Jornada"),
    [exportMatches, jornadaName]
  );

  const divisions = useMemo(
    () =>
      Array.from(divisionColorMap.entries()).map(([name, color]) => ({
        name,
        color,
      })),
    [divisionColorMap]
  );

  const exportSize = useMemo(() => {
    if (layoutMode === "grid") {
      return isMobileLayout
        ? { width: 1920, height: 1080, suffix: "Story_Wide" }
        : { width: 1350, height: 1080, suffix: "Post_Wide" };
    }

    return isMobileLayout
      ? { width: 1080, height: 1920, suffix: "Story" }
      : { width: 1080, height: 1350, suffix: "Post" };
  }, [isMobileLayout, layoutMode]);

  const fetchMetaInfo = useCallback(async () => {
    const fallbackDivision = getTournamentDivision(torneo);
    const fallbackLeague = getTournamentLeague(torneo);
    const fallbackLeagueId =
      fallbackDivision?.league_id ||
      fallbackDivision?.league?.id ||
      fallbackDivision?.leagues?.id ||
      torneo?.league_id ||
      fallbackLeague?.id;
    const fallbackLeagueName =
      fallbackLeague?.name ||
      torneo?.league_name ||
      "";
    const fallbackLeagueLogo =
      fallbackLeague?.original_logo_url ||
      fallbackLeague?.logo_url ||
      torneo?.original_logo_url ||
      torneo?.logo_url ||
      null;

    if (!torneo?.id) {
      setMetaInfo({
        league: fallbackLeagueName || "Liga",
        division: fallbackDivision?.name || currentDivisionName,
        jornada: jornadaSummary,
        leagueLogo: fallbackLeagueLogo,
      });
      return;
    }

    try {
      const { data: torData } = await supabase
        .from("tournaments")
        .select(`
          id,
          name,
          division_id,
          divisions(name, id, league_id)
        `)
        .eq("id", torneo.id)
        .single();

      const resolvedDivision = torData?.divisions || fallbackDivision;
      let resolvedLeague = fallbackLeague;
      const resolvedLeagueId = resolvedDivision?.league_id || fallbackLeagueId;

      if (resolvedLeagueId) {
        const { data: leagueData } = await supabase
          .from("leagues")
          .select("name, logo_url, original_logo_url")
          .eq("id", resolvedLeagueId)
          .maybeSingle();

        if (leagueData) {
          resolvedLeague = leagueData;
        }
      }

      setMetaInfo({
        league: resolvedLeague?.name || fallbackLeagueName || "Liga",
        division: resolvedDivision?.name || currentDivisionName,
        jornada: jornadaSummary,
        leagueLogo:
          resolvedLeague?.original_logo_url ||
          resolvedLeague?.logo_url ||
          fallbackLeagueLogo,
      });
    } catch (error) {
      console.error("Error fetching schedule export meta info:", error);
      setMetaInfo({
        league: fallbackLeagueName || "Liga",
        division: fallbackDivision?.name || currentDivisionName,
        jornada: jornadaSummary,
        leagueLogo: fallbackLeagueLogo,
      });
    }
  }, [currentDivisionName, jornadaSummary, torneo]);

  useEffect(() => {
    if (!isOpen) return;

    const isAppDark =
      theme.bgtotal &&
      theme.bgtotal.toLowerCase() !== "#ffffff" &&
      theme.bgtotal.toLowerCase() !== "#f3f4f6";

    setIsDarkExport(isAppDark);
    setIsExporting(false);
    fetchMetaInfo();
  }, [fetchMetaInfo, isOpen, theme]);

  useEffect(() => {
    let isCurrent = true;

    analyzeLogoFocus(metaInfo.leagueLogo).then((focus) => {
      if (isCurrent) setLogoFocus(focus);
    });

    return () => {
      isCurrent = false;
    };
  }, [metaInfo.leagueLogo]);

  useEffect(() => {
    const calculateScale = () => {
      const contentWidth = exportSize.width;
      const contentHeight = exportSize.height;
      const compactViewport = window.innerWidth <= 520;
      const screenPaddingX = compactViewport ? 56 : 80;
      const screenPaddingY = compactViewport ? 330 : 240;
      const availableWidth = Math.max(window.innerWidth - screenPaddingX, 260);
      const availableHeight = Math.max(window.innerHeight - screenPaddingY, 260);

      const scaleWidth = availableWidth / contentWidth;
      const scaleHeight = availableHeight / contentHeight;

      setPreviewScale(Math.min(scaleWidth, scaleHeight, 0.86));
    };

    let scaleTimer;
    if (isOpen) {
      scaleTimer = window.setTimeout(calculateScale, 100);
      window.addEventListener("resize", calculateScale);
    }

    return () => {
      if (scaleTimer) window.clearTimeout(scaleTimer);
      window.removeEventListener("resize", calculateScale);
    };
  }, [exportSize.height, exportSize.width, isOpen]);

  const handleExportPNG = async () => {
    if (!exportComponentRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const fileName = [
        "Rol",
        cleanFilePart(metaInfo.league, "Liga"),
        cleanFilePart(metaInfo.division, "Division"),
        cleanFilePart(jornadaName, "Jornada"),
        layoutMode === "grid" ? "Grid" : "Row",
        exportSize.suffix,
      ].join("_");

      await exportElementAsPNG(
        exportComponentRef,
        fileName,
        isDarkExport ? "#121212" : "#ffffff"
      );
    } catch (error) {
      console.error("Error al exportar rol:", error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const modalDynamicWidth = `${Math.max(exportSize.width * previewScale + 60, 920)}px`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Rol"
      width={modalDynamicWidth}
      showCloseButton={false}
      compactHeader
      headerActions={
        <ExportDownloadButton
          onExport={handleExportPNG}
          isExporting={isExporting}
        />
      }
    >
      <PreviewWrapper>
        <ExportPreviewHeader
          isDark={isDarkExport}
          setIsDark={setIsDarkExport}
          isMobile={isMobileLayout}
          setIsMobile={setIsMobileLayout}
          onExport={handleExportPNG}
          isExporting={isExporting}
          showExportAction={false}
          title="Configura la imagen del rol"
          inactiveFormatLabel={layoutMode === "grid" ? "Post horizontal" : "Post (4:5)"}
          activeFormatLabel={layoutMode === "grid" ? "Historia horizontal" : "Historia (9:16)"}
          formatTitle="Cambiar formato de imagen"
          beforeFormatControls={
            <LogoSizeControl>
              <button
                type="button"
                onClick={() => {
                  const nextIndex = Math.max(minLogoScaleIndex, logoScaleOptionIndex - 1);
                  setLogoScale(LOGO_SCALE_OPTIONS[nextIndex].value);
                }}
                disabled={isExporting || logoScaleOptionIndex <= minLogoScaleIndex}
                title="Disminuir logo"
              >
                <RiSubtractLine />
              </button>
              <select
                value={String(logoScale)}
                onChange={(event) => setLogoScale(Number(event.target.value))}
                disabled={isExporting}
                title="Tamano del logo de liga"
                aria-label="Tamano del logo de liga"
              >
                {LOGO_SCALE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}%
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const nextIndex = Math.min(maxLogoScaleIndex, logoScaleOptionIndex + 1);
                  setLogoScale(LOGO_SCALE_OPTIONS[nextIndex].value);
                }}
                disabled={isExporting || logoScaleOptionIndex >= maxLogoScaleIndex}
                title="Aumentar logo"
              >
                <RiAddLine />
              </button>
            </LogoSizeControl>
          }
        />

        <ModeBar>
          <span>Vista del rol</span>
          <ModeSwitch $disabled={isExporting}>
            <button
              type="button"
              className={layoutMode === "grid" ? "active" : ""}
              onClick={() => !isExporting && setLayoutMode("grid")}
              disabled={isExporting}
            >
              <RiLayoutGridLine />
              Grid
            </button>
            <button
              type="button"
              className={layoutMode === "row" ? "active" : ""}
              onClick={() => !isExporting && setLayoutMode("row")}
              disabled={isExporting}
            >
              <RiListCheck2 />
              Row
            </button>
          </ModeSwitch>
        </ModeBar>

        <div className="preview-viewport">
          <div
            className="scale-box"
            style={{
              width: exportSize.width * previewScale,
              height: exportSize.height * previewScale,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
                width: `${exportSize.width}px`,
                height: `${exportSize.height}px`,
              }}
            >
              <ScheduleExportLayout
                ref={exportComponentRef}
                matches={exportMatches}
                weekDays={weekDays}
                divisions={divisions}
                metaInfo={metaInfo}
                themeMode={isDarkExport ? "dark" : "light"}
                layoutMode={layoutMode}
                canvasMode={isMobileLayout ? "story" : "post"}
                exportWidth={exportSize.width}
                exportHeight={exportSize.height}
                logoScale={logoScale}
                logoFocus={logoFocus}
                showDivisionName={divisions.length === 1}
              />
            </div>
          </div>
        </div>
      </PreviewWrapper>
    </Modal>
  );
}

const PreviewWrapper = styled.div`
  margin: -25px;
  width: calc(100% + 50px);
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bgtotal || theme.bg};

  .preview-viewport {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 28px 20px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .scale-box {
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
    border-radius: 8px;
    background: transparent;
  }

  @media (max-width: 520px) {
    .preview-viewport {
      padding: 18px 10px;
    }
  }
`;

const ModeBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bg};
  border-bottom: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg3};

  > span {
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
    font-size: 0.86rem;
    font-weight: 800;
  }

  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const LogoSizeControl = styled.div`
  display: inline-grid;
  grid-template-columns: 34px minmax(82px, auto) 34px;
  align-items: center;
  gap: 6px;

  button {
    width: 34px;
    height: 34px;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    border-radius: 10px;
    background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  button:not(:disabled):hover {
    background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
    border-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || v.colorPrincipal};
    color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || v.colorPrincipal};
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  select {
    min-width: 82px;
    height: 34px;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    border-radius: 10px;
    background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
    color: ${({ theme }) => theme.text};
    padding: 0 8px;
    font-size: 0.78rem;
    font-weight: 900;
    cursor: pointer;
  }

  select:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || v.colorPrincipal};
    outline-offset: 2px;
  }

  select:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const ModeSwitch = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-width: 220px;
  padding: 3px;
  border-radius: 13px;
  background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
  border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
  opacity: ${({ $disabled }) => ($disabled ? 0.58 : 1)};

  button {
    min-width: 0;
    min-height: 32px;
    padding: 7px 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    opacity: 0.64;
    transition: background 0.2s ease, color 0.2s ease, opacity 0.2s ease;
  }

  button.active {
    background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6 || `${v.colorPrincipal}18`};
    color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || v.colorPrincipal};
    opacity: 1;
  }

  button:not(.active):hover {
    background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bg};
    color: ${({ theme }) => theme.text};
    opacity: 0.86;
  }

  button:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || v.colorPrincipal};
    outline-offset: 1px;
  }

  button:disabled {
    cursor: not-allowed;
  }

  @media (max-width: 520px) {
    min-width: 0;
  }
`;
