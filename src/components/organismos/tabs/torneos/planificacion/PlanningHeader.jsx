import React, { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpSLine,
  RiSettings4Line,
  RiEdit2Line,
  RiMagicLine,
  RiCheckLine,
  RiPrinterLine,
  RiCalendarCheckLine,
} from "react-icons/ri";
import { ViewToggle } from "../../../../../index";
import { addDaysToDate } from "../../../../../utils/dateUtils";

export const PlanningHeader = memo(
  ({
    jornadaIndex,
    jornadaData,
    status,
    onPrev,
    onNext,
    totalJornadas,
    navigationIndex = jornadaIndex,
    totalNavigationItems = totalJornadas,
    jornadaOptions = [],
    selectedJornadaId,
    onSelectJornada,
    onSaveDates,
    onAutoFill,
    onConfig,
    viewMode,
    onToggleView,
    onEditFixture,
    isTournamentActive,
    needsDateNormalization = false,
    onOpenDateNormalizer,
    onPrintBatch,
    matchesWithoutResultCount = 0,
    confirmedResultsProgress = { completed: 0, total: 0 },
    isRepositionMode = false,
    onDateChange,
  }) => {
    const isConfirmed = status === "Confirmada";
    const hasDates = jornadaData?.start_date && jornadaData?.end_date;
    const [localStart, setLocalStart] = useState(jornadaData?.start_date || "");
    const [localEnd, setLocalEnd] = useState(jornadaData?.end_date || "");
    const [isMobileViewport, setIsMobileViewport] = useState(() => {
      if (typeof window === "undefined") return false;
      return window.innerWidth <= 768;
    });
    const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);
    const [isJornadaMenuOpen, setIsJornadaMenuOpen] = useState(false);
    const jornadaMenuRef = useRef(null);

    useLayoutEffect(() => {
      setLocalStart(jornadaData?.start_date || "");
      setLocalEnd(jornadaData?.end_date || "");
    }, [jornadaData]);

    useEffect(() => {
      if (typeof window === "undefined") return undefined;

      const handleResize = () => {
        const isMobile = window.innerWidth <= 768;
        setIsMobileViewport(isMobile);
        if (!isMobile) {
          setIsMobileControlsOpen(false);
        }
      };

      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
      if (!isJornadaMenuOpen || typeof window === "undefined") return undefined;

      const handlePointerDown = (event) => {
        if (
          jornadaMenuRef.current &&
          !jornadaMenuRef.current.contains(event.target)
        ) {
          setIsJornadaMenuOpen(false);
        }
      };

      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          setIsJornadaMenuOpen(false);
        }
      };

      window.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [isJornadaMenuOpen]);

    const hasChanges =
      !isRepositionMode &&
      ((localStart !== (jornadaData?.start_date || "")) ||
        (localEnd !== (jornadaData?.end_date || "")));

    useEffect(() => {
      if (isMobileViewport && (hasChanges || isRepositionMode)) {
        setIsMobileControlsOpen(true);
      }
    }, [hasChanges, isMobileViewport, isRepositionMode]);

    const handleConfirmChanges = () => {
      if (onSaveDates) {
        onSaveDates(localStart, localEnd);
      }
    };

    const handleStartChange = (value) => {
      const nextEnd = value ? addDaysToDate(value, 6) : "";
      setLocalStart(value);
      setLocalEnd(nextEnd);
      if (isRepositionMode && onDateChange) {
        onDateChange(value, nextEnd);
      }
    };

    const handleEndChange = (value) => {
      setLocalEnd(value);
      if (isRepositionMode && onDateChange) {
        onDateChange(localStart, value);
      }
    };

    const showPrintButton = isConfirmed && matchesWithoutResultCount > 0;
    const confirmedResultsLabel =
      isConfirmed && confirmedResultsProgress.total > 0
        ? `(${confirmedResultsProgress.completed}/${confirmedResultsProgress.total})`
        : null;
    const selectedValue = String(selectedJornadaId || jornadaData?.id || "");
    const selectedJornadaOption = jornadaOptions.find(
      (jornada) => String(jornada.id) === selectedValue
    );
    const canSelectJornada =
      typeof onSelectJornada === "function" && jornadaOptions.length > 1;
    const getJornadaLabel = (jornada) => {
      const baseLabel = jornada?.name || `Jornada ${jornadaIndex + 1}`;
      if (!jornada?.progress) return baseLabel;
      return `${baseLabel} (${jornada.progress.completed}/${jornada.progress.total})`;
    };
    const getSelectedJornadaLabel = (jornada) =>
      jornada?.name || `Jornada ${jornadaIndex + 1}`;

    const handleJornadaSelect = (nextJornadaId) => {
      if (!nextJornadaId || String(nextJornadaId) === selectedValue) {
        setIsJornadaMenuOpen(false);
        return;
      }

      setIsJornadaMenuOpen(false);
      onSelectJornada(nextJornadaId);
    };

    const dateControls = (
      <DateRow $hasChanges={hasChanges}>
        <span className="label-text">Semana del</span>

        <input
          type="date"
          className="native-input"
          value={localStart}
          onChange={(e) => handleStartChange(e.target.value)}
        />

        <span className="label-text">al</span>

        <input
          type="date"
          className="native-input"
          value={localEnd}
          onChange={(e) => handleEndChange(e.target.value)}
          disabled={isConfirmed}
        />

        {hasChanges && !isRepositionMode && (
          <ConfirmBtn
            onClick={handleConfirmChanges}
            title="Guardar y actualizar jornadas siguientes"
          >
            <RiCheckLine size={18} /> Confirmar
          </ConfirmBtn>
        )}

        {!isRepositionMode &&
          !hasDates &&
          !hasChanges &&
          !isConfirmed &&
          onAutoFill && (
            <AutoFillBtn
              onClick={onAutoFill}
              title="Auto-calcular fechas para todas las jornadas"
            >
              <RiMagicLine /> Auto
            </AutoFillBtn>
          )}
      </DateRow>
    );

    const actionControls = (
      <ActionsGroup>
        {showPrintButton && (
          <BtnAction
            onClick={onPrintBatch}
            title={`Imprimir ${matchesWithoutResultCount} cedulas pendientes`}
          >
            <RiPrinterLine size={20} />
            <NotificationBadge>{matchesWithoutResultCount}</NotificationBadge>
          </BtnAction>
        )}

        {isTournamentActive && needsDateNormalization && onOpenDateNormalizer && (
          <BtnAction
            onClick={onOpenDateNormalizer}
            title="Ajustar calendario a jornadas de 7 dias"
          >
            <RiCalendarCheckLine size={20} />
          </BtnAction>
        )}

        {isTournamentActive && (
          <BtnAction onClick={onEditFixture} title="Reorganizar partidos futuros">
            <RiEdit2Line size={20} />
          </BtnAction>
        )}

        <BtnAction onClick={onConfig} title="Configuracion de jornada">
          <RiSettings4Line size={20} />
        </BtnAction>

        <div className="separator"></div>
        <ViewToggle currentMode={viewMode} onToggle={onToggleView} />
      </ActionsGroup>
    );

    return (
      <Container>
        <InfoGroup>
            <NavRow>
            <NavBtn onClick={onPrev} disabled={navigationIndex === 0}>
              <RiArrowLeftSLine size={24} />
            </NavBtn>
            <Title $status={status}>
              {canSelectJornada ? (
                <JornadaDropdown ref={jornadaMenuRef}>
                  <JornadaButton
                    type="button"
                    onClick={() => setIsJornadaMenuOpen((prev) => !prev)}
                    aria-expanded={isJornadaMenuOpen}
                    aria-haspopup="listbox"
                    aria-label="Seleccionar jornada"
                    title="Seleccionar jornada"
                  >
                    <span>{getSelectedJornadaLabel(selectedJornadaOption || jornadaData)}</span>
                    <RiArrowDownSLine size={18} />
                  </JornadaButton>

                  {isJornadaMenuOpen && (
                    <JornadaMenu role="listbox">
                      {jornadaOptions.map((jornada) => {
                        const optionValue = String(jornada.id);
                        const isSelected = optionValue === selectedValue;

                        return (
                          <JornadaOption
                            key={jornada.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            $isSelected={isSelected}
                            onClick={() => handleJornadaSelect(optionValue)}
                          >
                            <span>{getJornadaLabel(jornada)}</span>
                          </JornadaOption>
                        );
                      })}
                    </JornadaMenu>
                  )}
                </JornadaDropdown>
              ) : (
                <span>{jornadaData?.name || `Jornada ${jornadaIndex + 1}`}</span>
              )}
              <small>{status}</small>
              {confirmedResultsLabel && (
                <StatusCounter>{confirmedResultsLabel}</StatusCounter>
              )}
            </Title>
            <NavBtn
              onClick={onNext}
              disabled={navigationIndex === totalNavigationItems - 1}
            >
              <RiArrowRightSLine size={24} />
            </NavBtn>
          </NavRow>

          {isMobileViewport ? (
            <CompactControlsWrap>
              <CompactToggleButton
                type="button"
                onClick={() => setIsMobileControlsOpen((prev) => !prev)}
                aria-expanded={isMobileControlsOpen}
                aria-label={isMobileControlsOpen ? "Ocultar controles" : "Mostrar controles"}
                title={isMobileControlsOpen ? "Ocultar controles" : "Mostrar controles"}
                $isOpen={isMobileControlsOpen}
                $hasChanges={hasChanges}
              >
                <RiSettings4Line size={17} />
                {isMobileControlsOpen ? (
                  <RiArrowUpSLine size={18} />
                ) : (
                  <RiArrowDownSLine size={18} />
                )}
              </CompactToggleButton>

              <MobileControlsCollapse $isOpen={isMobileControlsOpen}>
                <div className="controls-inner">
                  {dateControls}
                  {actionControls}
                </div>
              </MobileControlsCollapse>
            </CompactControlsWrap>
          ) : (
            dateControls
          )}
        </InfoGroup>

        {!isMobileViewport && actionControls}
      </Container>
    );
  }
);

const Container = styled.div`
  background: ${({ theme }) => theme.bg3};
  padding: 15px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
  }
`;

const InfoGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 25px;
  }
`;

const CompactControlsWrap = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MobileControlsCollapse = styled.div`
  display: grid;
  grid-template-rows: ${({ $isOpen }) => ($isOpen ? "1fr" : "0fr")};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  transition: grid-template-rows 0.26s ease, opacity 0.2s ease;

  .controls-inner {
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
`;

const CompactToggleButton = styled.button`
  width: 100%;
  height: 22px;
  border-radius: 999px;
  border: 1px solid
    ${({ $hasChanges, theme }) => ($hasChanges ? v.colorPrincipal : `${theme.bg4}`)};
  background: linear-gradient(
    90deg,
    ${({ theme }) => `${theme.bg4}30`} 0%,
    ${({ theme }) => `${theme.bgcards}`} 50%,
    ${({ theme }) => `${theme.bg4}30`} 100%
  );
  color: ${({ theme }) => theme.text};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: 0.2s ease;
  padding: 0 10px;

  svg:first-child {
    color: ${v.colorPrincipal};
  }

  svg:last-child {
    opacity: 0.8;
  }
`;

const ActionsGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;

  .separator {
    width: 1px;
    height: 25px;
    background: ${({ theme }) => theme.bg4};
    margin: 0 5px;
    display: none;

    @media (min-width: 768px) {
      display: block;
    }
  }

  @media (max-width: 768px) {
    justify-content: space-between;
    border-top: 1px solid ${({ theme }) => theme.bg4};
    padding-top: 10px;
    width: 100%;
  }
`;

const NavRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;

  @media (min-width: 768px) {
    justify-content: flex-start;
  }
`;

const Title = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 128px;
  max-width: 190px;

  span {
    font-weight: 800;
    font-size: 1.1rem;
    color: ${({ theme }) => theme.text};
  }

  small {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: ${({ $status, theme }) =>
      $status === "Confirmada" ? "#2ecc71" : theme.text};
    opacity: ${({ $status }) => ($status === "Confirmada" ? 1 : 0.6)};
    line-height: 1;
  }
`;

const JornadaDropdown = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
`;

const JornadaButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.text};
  font-family: inherit;
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.2;
  width: 100%;
  min-width: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 18px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-align: center;
  transition: color 0.2s ease;

  svg {
    grid-column: 3;
    flex-shrink: 0;
    opacity: 0.65;
  }

  span {
    grid-column: 2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }

  &:hover {
    color: ${v.colorPrincipal};
  }

  &:focus-visible {
    color: ${v.colorPrincipal};
  }
`;

const JornadaMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  width: max-content;
  min-width: 150px;
  max-width: min(260px, 82vw);
  max-height: 260px;
  overflow-y: auto;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bgcards};
  color: ${({ theme }) => theme.text};
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colorScroll};
    border-radius: 999px;
  }
`;

const JornadaOption = styled.button`
  width: 100%;
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: ${({ $isSelected, theme }) =>
    $isSelected ? theme.bg6 : "transparent"};
  color: ${({ $isSelected, theme }) =>
    $isSelected ? theme.color1 : theme.text};
  font-family: inherit;
  font-size: 0.64rem;
  font-weight: ${({ $isSelected }) => ($isSelected ? 800 : 700)};
  text-align: center;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover,
  &:focus-visible {
    outline: none;
    background: ${({ theme }) => theme.bgAlpha};
    border-color: ${({ theme }) => theme.bg5};
    color: ${({ theme }) => theme.color1};
  }
`;

const StatusCounter = styled.small`
  display: block;
  color: ${({ theme }) => theme.text};
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 1px;
  text-transform: none;
  opacity: 0.78;
  margin-top: 2px;
  font-family: inherit;
`;

const NavBtn = styled.button`
  background: ${({ theme }) => theme.bg4};
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.text};
  transition: all 0.2s;
  flex-shrink: 0;

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: ${v.colorPrincipal};
    color: white;
    transform: scale(1.1);
  }
`;

const DateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme, $hasChanges }) =>
    $hasChanges ? `${v.colorPrincipal}10` : theme.bgcards};
  padding: 8px 15px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme, $hasChanges }) => ($hasChanges ? v.colorPrincipal : theme.bg4)};
  font-family: "Nunito", sans-serif;
  flex-wrap: wrap;
  transition: all 0.3s ease;

  .label-text {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${({ theme }) => theme.text};
    opacity: 0.8;
  }

  .native-input {
    border: 1px solid ${({ theme }) => theme.bg4};
    background: ${({ theme }) => theme.bg3};
    color: ${({ theme }) => theme.text};
    padding: 4px 8px;
    border-radius: 5px;
    font-family: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    color-scheme: ${({ theme }) => (theme.mode === "dark" ? "dark" : "light")};

    &:focus {
      outline: 2px solid ${v.colorPrincipal};
      border-color: transparent;
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      background: transparent;
      border-color: transparent;
      font-weight: bold;
    }
  }

  @media (max-width: 768px) {
    justify-content: center;
    width: 100%;
    padding: 8px 10px;
  }
`;

const ConfirmBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  background: ${v.colorPrincipal};
  color: white;
  border: none;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 5px;
  cursor: pointer;
  margin-left: 5px;
  animation: fadeIn 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);

  &:hover {
    background: ${v.colorPrincipalDark || "#27ae60"};
    transform: translateY(-1px);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const AutoFillBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px dashed ${v.colorPrincipal};
  color: ${v.colorPrincipal};
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 5px;

  &:hover {
    background: ${v.colorPrincipal}15;
  }
`;

const BtnAction = styled.button`
  background: ${({ theme }) => theme.bg4};
  border: none;
  border-radius: 8px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.text};
  transition: all 0.2s;
  position: relative;
  flex-shrink: 0;

  &:hover {
    background: ${v.colorPrincipal}20;
    color: ${v.colorPrincipal};
    transform: translateY(-2px);
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background: #e74c3c;
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${({ theme }) => theme.bg3};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  pointer-events: none;
`;
