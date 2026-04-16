import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { Modal, Btnsave, v } from '../../../../../../index';
import {
  RiFileDownloadLine,
  RiImageLine,
  RiMoonLine,
  RiSettings4Line,
  RiSunLine,
} from 'react-icons/ri';
import { exportElementAsPNG } from '../../../../../../utils/imageExporter';
import { supabase } from '../../../../../../supabase/supabase.config';
import GoleadoresExportLayout from './GoleadoresExportLayout';

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

  if (!isOpen) return null;

  const baseWidth = isMobileLayout ? 480 : 900;
  const safeContentHeight = Math.max(contentHeight, 220);
  const modalWidth = `${baseWidth * previewScale + 42}px`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exportar Goleadores" width={modalWidth}>
      <PreviewWrapper>
        <div className="preview-header">
          <div className="left-group">
            <RiImageLine size={18} />
            <span className="info-text">Vista previa para exportar</span>
          </div>

          <div className="right-group">
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
              <label htmlFor="goleadores-limit">Jugadores</label>
              <select
                id="goleadores-limit"
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
                <label htmlFor="goleadores-limit-custom">
                  <RiSettings4Line size={14} />
                  <span>3 a 50</span>
                </label>
                <input
                  id="goleadores-limit-custom"
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
              style={{
                opacity: isExporting ? 0.5 : 1,
                pointerEvents: isExporting ? 'none' : 'auto',
              }}
            >
              <span className="label-side left">Post</span>
              <div className="track">
                <div className="thumb" />
              </div>
              <span className="label-side right">Historia</span>
            </ToggleContainer>

            <div className="separator" />

            <ThemeToggleBtn
              onClick={() => !isExporting && setIsDarkExport(!isDarkExport)}
              title="Cambiar tema"
              style={{
                opacity: isExporting ? 0.5 : 1,
                pointerEvents: isExporting ? 'none' : 'auto',
              }}
            >
              {isDarkExport ? <RiSunLine /> : <RiMoonLine />}
            </ThemeToggleBtn>

            <div className="separator" />

            <div
              style={{
                opacity: isExporting ? 0.6 : 1,
                pointerEvents: isExporting ? 'none' : 'auto',
              }}
            >
              <Btnsave
                titulo={isExporting ? 'Exportando...' : 'Descargar'}
                bgcolor={isExporting ? '#7f8c8d' : '#27ae60'}
                icono={isExporting ? <div className="spinner-mini" /> : <RiFileDownloadLine />}
                funcion={handleExportPNG}
              />
            </div>
          </div>
        </div>

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
      </PreviewWrapper>
    </Modal>
  );
}

const ThemeToggleBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.1rem;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.bg3};
    color: ${v.colorPrincipal};
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  .track {
    width: 36px;
    height: 20px;
    background: ${({ theme }) => theme.bg3};
    border-radius: 20px;
    position: relative;
    transition: background-color 0.3s;
    border: 1px solid ${({ theme }) => theme.color2};
  }

  .thumb {
    width: 16px;
    height: 16px;
    background: ${({ $active, theme }) => ($active ? v.verde : theme.text)};
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
    transition: 0.3s;
  }

  .left {
    opacity: ${({ $active }) => ($active ? 0.6 : 1)};
    color: ${({ $active }) => ($active ? 'inherit' : v.colorPrincipal)};
  }

  .right {
    opacity: ${({ $active }) => ($active ? 1 : 0.6)};
    color: ${({ $active }) => ($active ? v.verde : 'inherit')};
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
  border-radius: 12px;
  background: ${({ theme }) => theme.bg2};
  border: 1px solid ${({ theme }) => theme.color2};

  button {
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.text};
    font-size: 0.8rem;
    font-weight: 700;
    padding: 7px 10px;
    border-radius: 9px;
    cursor: pointer;
    transition: 0.2s ease;
    opacity: 0.72;
  }

  button.active {
    background: ${({ theme }) => theme.bg};
    opacity: 1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
  }
`;

const LimitControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 0.8rem;
    font-weight: 700;
    color: ${({ theme }) => theme.text};
    opacity: 0.75;
  }

  select {
    border: 1px solid ${({ theme }) => theme.color2};
    border-radius: 8px;
    background: ${({ theme }) => theme.bg2};
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

  label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    font-weight: 700;
    color: ${({ theme }) => theme.text};
    opacity: 0.75;
    white-space: nowrap;
  }

  input {
    width: 64px;
    border: 1px solid ${({ theme }) => theme.color2};
    border-radius: 8px;
    background: ${({ theme }) => theme.bg2};
    color: ${({ theme }) => theme.text};
    padding: 7px 8px;
    font-size: 0.8rem;
    font-weight: 700;
    outline: none;
    text-align: center;
  }
`;

const PreviewWrapper = styled.div`
  margin: -16px;
  width: calc(100% + 32px);
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bgtotal || theme.bg};

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: ${({ theme }) => theme.bg};
    border-bottom: 1px solid ${({ theme }) => theme.bg3};
    flex-wrap: wrap;
    gap: 10px;

    .left-group {
      display: flex;
      align-items: center;
      gap: 8px;
      color: ${({ theme }) => theme.text};
      font-size: 0.9rem;
      font-weight: 500;
    }

    .right-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .separator {
      width: 1px;
      height: 20px;
      background: ${({ theme }) => theme.bg3};
    }

    .spinner-mini {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin-export 1s ease-in-out infinite;
    }

    @keyframes spin-export {
      to {
        transform: rotate(360deg);
      }
    }
  }

  .preview-viewport {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 12px;
    overflow: auto;
  }

  .scale-box {
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
    border-radius: 8px;
    background: transparent;
    overflow: hidden;
  }
`;
