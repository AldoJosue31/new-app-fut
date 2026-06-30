import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { Modal, v } from '../../../../../../index';
import {
  RiCloseLine,
  RiMoonLine,
  RiSettings3Line,
  RiSettings4Line,
  RiSunLine,
} from 'react-icons/ri';
import { exportElementAsPNG } from '../../../../../../utils/imageExporter';
import { supabase } from '../../../../../../supabase/supabase.config';
import GoleadoresExportLayout from './GoleadoresExportLayout';
import { ExportDownloadButton } from '../shared/ExportPreviewHeader';

const FIXED_LIMIT_OPTIONS = [3, 5, 10, 15, 20, 50];
const CUSTOM_LIMIT_VALUE = 'custom';
const VISUALIZATION_OPTIONS = [
  { value: 'table', label: 'Tabla' },
  { value: 'bars', label: 'Barras' },
  { value: 'pie', label: 'Pastel' },
];

const sanitizeFilePart = (value, fallback = 'Dato') => {
  const cleaned = String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');

  return cleaned || fallback;
};

const clampPlayerLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 3;
  if (parsed < 3) return 3;
  if (parsed > 50) return 50;
  return parsed;
};

const getStorageKey = (torneoId) => `goleadores-export-settings:${torneoId || 'default'}`;

const getEstimatedContentHeight = ({ mode, playerCount, isMobile }) => {
  if (mode === 'pie') {
    return isMobile ? 760 : 540;
  }

  if (mode === 'bars') {
    return (isMobile ? 220 : 220) + playerCount * (isMobile ? 72 : 56);
  }

  return (isMobile ? 200 : 210) + playerCount * (isMobile ? 74 : 58);
};

export default function GoleadoresExportModal({
  isOpen,
  onClose,
  goleadores = [],
  torneo,
  activeJornadaName,
  activeJornadaSummary,
}) {
  const theme = useTheme();

  const [isDarkExport, setIsDarkExport] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.8);
  const [isExporting, setIsExporting] = useState(false);
  const [playerLimitMode, setPlayerLimitMode] = useState('10');
  const [customPlayerLimit, setCustomPlayerLimit] = useState(10);
  const [visualizationMode, setVisualizationMode] = useState('table');
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(560);
  const [metaInfo, setMetaInfo] = useState({
    league: '',
    division: '',
    lastJornada: '',
    leagueLogo: null,
  });

  const exportComponentRef = useRef(null);

  const resolvedPlayerLimit = useMemo(() => {
    if (playerLimitMode === CUSTOM_LIMIT_VALUE) {
      return clampPlayerLimit(customPlayerLimit);
    }

    return clampPlayerLimit(playerLimitMode);
  }, [customPlayerLimit, playerLimitMode]);

  const goleadoresParaExportar = useMemo(() => {
    return (Array.isArray(goleadores) ? goleadores : []).slice(0, resolvedPlayerLimit);
  }, [goleadores, resolvedPlayerLimit]);

  useEffect(() => {
    const isAppDark =
      theme.bgtotal &&
      theme.bgtotal.toLowerCase() !== '#ffffff' &&
      theme.bgtotal.toLowerCase() !== '#f3f4f6';

    setIsDarkExport(isAppDark);
    setIsExporting(false);
  }, [theme]);

  useEffect(() => {
    if (!torneo?.id || typeof window === 'undefined') return;

    try {
      const rawSettings = window.localStorage.getItem(getStorageKey(torneo.id));
      if (!rawSettings) return;

      const parsedSettings = JSON.parse(rawSettings);
      const nextMode = String(parsedSettings?.playerLimitMode || '10');
      const nextCustomLimit = clampPlayerLimit(parsedSettings?.customPlayerLimit ?? 10);
      const nextVisualizationMode = String(parsedSettings?.visualizationMode || 'table');

      if (nextMode === CUSTOM_LIMIT_VALUE) {
        setPlayerLimitMode(CUSTOM_LIMIT_VALUE);
      } else if (FIXED_LIMIT_OPTIONS.includes(Number(nextMode))) {
        setPlayerLimitMode(String(Number(nextMode)));
      }

      if (VISUALIZATION_OPTIONS.some((option) => option.value === nextVisualizationMode)) {
        setVisualizationMode(nextVisualizationMode);
      }

      setCustomPlayerLimit(nextCustomLimit);
    } catch (error) {
      console.error('Error restoring goleadores export settings:', error);
    }
  }, [torneo?.id]);

  useEffect(() => {
    if (!torneo?.id || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(
        getStorageKey(torneo.id),
        JSON.stringify({
          playerLimitMode,
          customPlayerLimit: clampPlayerLimit(customPlayerLimit),
          visualizationMode,
        })
      );
    } catch (error) {
      console.error('Error saving goleadores export settings:', error);
    }
  }, [customPlayerLimit, playerLimitMode, torneo?.id, visualizationMode]);

  useEffect(() => {
    if (!isOpen || !torneo?.id) return;
    fetchMetaInfo();
  }, [isOpen, torneo?.id, activeJornadaName, activeJornadaSummary]);

  useEffect(() => {
    if (isOpen) {
      setIsConfigPanelOpen(false);
    }
  }, [isOpen]);

  const fetchMetaInfo = async () => {
    try {
      const { data } = await supabase
        .from('tournaments')
        .select(`
          id,
          division:division_id (
            name,
            league:league_id (
              name,
              logo_url,
              original_logo_url
            )
          )
        `)
        .eq('id', torneo.id)
        .single();

      setMetaInfo({
        league: data?.division?.league?.name || 'Liga Local',
        division: data?.division?.name || 'Division Unica',
        lastJornada: activeJornadaSummary || activeJornadaName || 'Sin iniciar',
        leagueLogo:
          data?.division?.league?.original_logo_url ||
          data?.division?.league?.logo_url ||
          null,
      });
    } catch (error) {
      console.error('Error fetching goleadores meta info:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const fallbackHeight = getEstimatedContentHeight({
      mode: visualizationMode,
      playerCount: goleadoresParaExportar.length,
      isMobile: isMobileLayout,
    });

    setContentHeight(fallbackHeight);

    const measure = () => {
      const node = exportComponentRef.current;
      if (!node) return;

      const nextHeight = Math.ceil(node.scrollHeight || node.offsetHeight || fallbackHeight);
      if (nextHeight > 0) {
        setContentHeight(nextHeight);
      }
    };

    const frame = requestAnimationFrame(measure);
    let observer;

    if (typeof ResizeObserver !== 'undefined' && exportComponentRef.current) {
      observer = new ResizeObserver(measure);
      observer.observe(exportComponentRef.current);
    }

    return () => {
      cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
    };
  }, [goleadoresParaExportar.length, isDarkExport, isMobileLayout, isOpen, visualizationMode]);

  useEffect(() => {
    const calculateScale = () => {
      const contentWidth = isMobileLayout ? 480 : 900;
      const estimatedHeight =
        contentHeight ||
        getEstimatedContentHeight({
          mode: visualizationMode,
          playerCount: goleadoresParaExportar.length,
          isMobile: isMobileLayout,
        });
      const availableWidth = window.innerWidth - 72;
      const availableHeight = window.innerHeight - 185;

      const widthScale = availableWidth / contentWidth;
      const heightScale = availableHeight / estimatedHeight;
      const nextScale = Math.min(widthScale, heightScale, 1);

      setPreviewScale(nextScale > 0.96 ? 0.96 : nextScale);
    };

    if (isOpen) {
      setTimeout(calculateScale, 50);
      window.addEventListener('resize', calculateScale);
    }

    return () => window.removeEventListener('resize', calculateScale);
  }, [contentHeight, goleadoresParaExportar.length, isMobileLayout, isOpen, visualizationMode]);

  const handleExportPNG = async () => {
    if (!exportComponentRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const fileName = [
        'Goleadores',
        sanitizeFilePart(metaInfo.league, 'Liga'),
        sanitizeFilePart(metaInfo.division, 'Division'),
        sanitizeFilePart(torneo?.name, 'Torneo'),
        sanitizeFilePart(activeJornadaSummary || activeJornadaName, 'Jornada'),
        sanitizeFilePart(visualizationMode, 'Vista'),
        `Top_${resolvedPlayerLimit}`,
        isMobileLayout ? 'Story' : 'Post',
      ].join('_');

      await exportElementAsPNG(
        exportComponentRef,
        fileName,
        isDarkExport ? '#121212' : '#ffffff'
      );
    } catch (error) {
      console.error('Error al exportar goleadores:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleLimitModeChange = (event) => {
    const nextValue = event.target.value;
    setPlayerLimitMode(nextValue);

    if (nextValue !== CUSTOM_LIMIT_VALUE) {
      setCustomPlayerLimit(clampPlayerLimit(nextValue));
    }
  };

  const handleCustomLimitChange = (event) => {
    const rawValue = event.target.value;

    if (rawValue === '') {
      setCustomPlayerLimit(3);
      return;
    }

    setCustomPlayerLimit(clampPlayerLimit(rawValue));
  };

  const renderConfigControls = (idSuffix = 'desktop') => {
    const limitId = `goleadores-limit-${idSuffix}`;
    const customLimitId = `goleadores-limit-custom-${idSuffix}`;

    return (
    <ConfigControls>
      <ModeSwitchGroup>
        {VISUALIZATION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === visualizationMode ? 'active' : ''}
            onClick={() => setVisualizationMode(option.value)}
            disabled={isExporting}
          >
            {option.label}
          </button>
        ))}
      </ModeSwitchGroup>

      <LimitControl>
        <label htmlFor={limitId}>Jugadores</label>
        <select
          id={limitId}
          value={playerLimitMode}
          onChange={handleLimitModeChange}
          disabled={isExporting}
        >
          {FIXED_LIMIT_OPTIONS.map((option) => (
            <option key={option} value={String(option)}>
              Top {option}
            </option>
          ))}
          <option value={CUSTOM_LIMIT_VALUE}>Personalizado</option>
        </select>
      </LimitControl>

      {playerLimitMode === CUSTOM_LIMIT_VALUE && (
        <CustomLimitControl>
          <label htmlFor={customLimitId}>
            <RiSettings4Line size={14} />
            <span>3 a 50</span>
          </label>
          <input
            id={customLimitId}
            type="number"
            min="3"
            max="50"
            value={customPlayerLimit}
            onChange={handleCustomLimitChange}
            disabled={isExporting}
          />
        </CustomLimitControl>
      )}

      <div className="separator" />

      <ToggleContainer
        onClick={() => !isExporting && setIsMobileLayout(!isMobileLayout)}
        $active={isMobileLayout}
        title="Cambiar formato"
        $disabled={isExporting}
      >
        <span className="label-side left">Post</span>
        <div className="track">
          <div className="thumb" />
        </div>
        <span className="label-side right">Historia</span>
      </ToggleContainer>

      <div className="separator" />

      <ThemeToggleBtn
        type="button"
        onClick={() => !isExporting && setIsDarkExport(!isDarkExport)}
        title="Cambiar tema"
        aria-label="Cambiar tema de la imagen"
        disabled={isExporting}
      >
        {isDarkExport ? <RiSunLine /> : <RiMoonLine />}
      </ThemeToggleBtn>
    </ConfigControls>
    );
  };

  if (!isOpen) return null;

  const baseWidth = isMobileLayout ? 480 : 900;
  const safeContentHeight = Math.max(contentHeight, 220);
  const modalWidth = `${baseWidth * previewScale + 72}px`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Goleadores"
      width={modalWidth}
      compactHeader
      overlayPadding="6px 18px"
      maxHeight="calc(100dvh - 24px)"
      bodyOverflowY="hidden"
      bodyPadding="0"
    >
      <PreviewWrapper>
        <div className="mobile-config-bar">
          {renderConfigControls('mobile')}
        </div>

        <FloatingConfigPanel $open={isConfigPanelOpen}>
          <button
            type="button"
            className="config-trigger"
            onClick={() => setIsConfigPanelOpen((prev) => !prev)}
            aria-label={isConfigPanelOpen ? "Cerrar configuracion" : "Abrir configuracion"}
            title="Configurar imagen"
          >
            {isConfigPanelOpen ? <RiCloseLine /> : <RiSettings3Line />}
          </button>
          <div className="config-content">
            {renderConfigControls('desktop')}
          </div>
        </FloatingConfigPanel>

        <div className="preview-viewport">
          <div
            className="scale-box"
            style={{
              width: baseWidth * previewScale,
              height: safeContentHeight * previewScale,
            }}
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                width: `${baseWidth}px`,
                height: `${safeContentHeight}px`,
                transition: 'transform 260ms ease, width 260ms ease, height 260ms ease',
              }}
            >
              <GoleadoresExportLayout
                ref={exportComponentRef}
                goleadores={goleadoresParaExportar}
                torneo={torneo}
                metaInfo={metaInfo}
                themeMode={isDarkExport ? 'dark' : 'light'}
                layoutMode={isMobileLayout ? 'mobile' : 'desktop'}
                visualizationMode={visualizationMode}
              />
            </div>
          </div>
        </div>

        <ModalFooter>
          <button type="button" className="cancel-btn" onClick={onClose}>
            Cancelar
          </button>
          <ExportDownloadButton
            onExport={handleExportPNG}
            isExporting={isExporting}
            disabled={isExporting}
          />
        </ModalFooter>
      </PreviewWrapper>
    </Modal>
  );
}

const ConfigControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 640px;
  height: 100%;
  padding: 3px;
  box-sizing: border-box;

  .separator {
    width: 1px;
    height: 22px;
    flex: 0 0 auto;
    background: ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
  }

  @media (max-width: 720px) {
    min-width: 0;
    height: auto;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
`;

const ThemeToggleBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
  background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
  color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
  font-size: 1.1rem;

  &:hover {
    background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6 || theme.bg3};
    border-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || v.colorPrincipal};
    color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || v.colorPrincipal};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || v.colorPrincipal};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};
  transition: opacity 0.2s ease;

  .track {
    width: 36px;
    height: 20px;
    background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
    border-radius: 20px;
    position: relative;
    transition: background-color 0.25s ease, border-color 0.25s ease;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
  }

  .thumb {
    width: 16px;
    height: 16px;
    background: ${({ $active, theme }) =>
      $active
        ? theme.tournamentDashboard?.metrics?.accent || v.verde
        : theme.tournamentDashboard?.muted || theme.text};
    border-radius: 50%;
    position: absolute;
    top: 1px;
    left: 1px;
    transform: ${({ $active }) =>
      $active ? 'translateX(16px)' : 'translateX(0)'};
    transition: transform 0.3s ease;
  }

  .label-side {
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.text};
    opacity: 0.6;
    transition: color 0.25s ease, opacity 0.25s ease;
  }

  .left {
    opacity: ${({ $active }) => ($active ? 0.6 : 1)};
    color: ${({ $active, theme }) =>
      $active ? 'inherit' : theme.tournamentDashboard?.primary || v.colorPrincipal};
  }

  .right {
    opacity: ${({ $active }) => ($active ? 1 : 0.6)};
    color: ${({ $active, theme }) =>
      $active ? theme.tournamentDashboard?.metrics?.accent || v.verde : 'inherit'};
  }

  @media (max-width: 600px) {
    .label-side {
      display: none;
    }
  }
`;

const ModeSwitchGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 13px;
  background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
  border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
  flex: 0 0 auto;

  button {
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1;
    min-height: 32px;
    padding: 7px 10px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, opacity 0.2s ease;
    opacity: 0.72;
  }

  button.active {
    background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6 || theme.bg};
    color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || v.colorPrincipal};
    opacity: 1;
  }

  button:not(.active):hover {
    background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bg};
    color: ${({ theme }) => theme.text};
    opacity: 0.9;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }
`;

const LimitControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;

  label {
    font-size: 0.78rem;
    font-weight: 700;
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
    opacity: 0.75;
  }

  select {
    min-height: 34px;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
    border-radius: 10px;
    background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
    color: ${({ theme }) => theme.text};
    padding: 7px 10px;
    font-size: 0.8rem;
    font-weight: 700;
    outline: none;
  }
`;

const CustomLimitControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;

  label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    font-weight: 700;
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
    opacity: 0.75;
    white-space: nowrap;
  }

  input {
    width: 64px;
    min-height: 34px;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
    border-radius: 10px;
    background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
    color: ${({ theme }) => theme.text};
    padding: 7px 8px;
    font-size: 0.8rem;
    font-weight: 700;
    outline: none;
    text-align: center;
  }
`;

const PreviewWrapper = styled.div`
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bgtotal || theme.bg};
  position: relative;
  transition: background 220ms ease;

  .mobile-config-bar {
    display: none;
  }

  .preview-viewport {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: 16px 22px;
    overflow-x: auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable both-edges;
  }

  .scale-box {
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
    border-radius: 8px;
    background: transparent;
    overflow: hidden;
    flex: 0 0 auto;
    margin: auto;
    justify-self: center;
    align-self: center;
    max-width: 100%;
    transition: width 260ms ease, height 260ms ease, box-shadow 220ms ease;
    will-change: width, height;
  }

  .scale-box,
  .scale-box * {
    transition-property: background-color, border-color, color, opacity, box-shadow, transform;
    transition-duration: 220ms;
    transition-timing-function: ease;
  }

  @media (max-width: 520px) {
    .mobile-config-bar {
      display: block;
      padding: 8px 12px;
      background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
      border-bottom: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    }

    .preview-viewport {
      padding: 12px;
    }
  }
`;

const FloatingConfigPanel = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  width: 42px;
  height: 42px;

  .config-trigger {
    width: 42px;
    height: 42px;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    border-radius: 14px;
    background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
    color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || theme.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1.15rem;
    box-shadow: ${({ $open }) => ($open ? '0 10px 24px rgba(0, 0, 0, 0.12)' : 'none')};
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }

  .config-trigger:hover {
    background: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
    color: #fff;
  }

  .config-content {
    position: absolute;
    top: 0;
    right: 48px;
    width: ${({ $open }) => ($open ? 'min(720px, calc(100vw - 140px))' : '0')};
    height: 46px;
    overflow: hidden;
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    border-radius: 14px;
    background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
    box-shadow: ${({ $open }) => ($open ? '0 14px 34px rgba(0, 0, 0, 0.14)' : 'none')};
    transition: width 0.22s ease, opacity 0.18s ease, box-shadow 0.22s ease;
  }

  @media (max-width: 720px) {
    .config-content {
      height: auto;
      max-height: 96px;
      overflow-x: hidden;
      overflow-y: auto;
    }
  }

  @media (max-width: 520px) {
    display: none;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
  border-top: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};

  .cancel-btn {
    min-height: 40px;
    padding: 9px 20px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    background: transparent;
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 800;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  .cancel-btn:hover {
    background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
    color: ${({ theme }) => theme.text};
  }

  .export-action > button {
    min-height: 42px;
    padding: 10px 22px;
    font-size: 0.92rem;
  }

  @media (max-width: 520px) {
    padding: 12px;

    .cancel-btn,
    .export-action,
    .export-action > button {
      flex: 1 1 0;
      width: 100%;
    }
  }
`;
