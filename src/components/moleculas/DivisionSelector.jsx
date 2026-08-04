import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled, { css } from "styled-components";
import { v } from "../../styles/variables";
import { useDivisionStore } from "../../store/DivisionStore";
import {
  createDivisionForCurrentUser,
  deleteDivisionById,
} from "../../services/divisions";
import { Modal } from "../organismos/Modal";
import { InputText2 } from "../organismos/formularios/InputText2";
import { Btnsave } from "../moleculas/Btnsave";

import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { RiDeleteBinLine } from "react-icons/ri";
import { buildTournamentDivisionSwitchPath } from "../../lib/navigation/tournamentRoutes.js";
import { useNavigationProgress } from "../app/NavigationProgress";
import { prefetchDivisionWorkspace } from "../../services/divisionWorkspace.js";

export function DivisionSelector({ isOpen, currentPath = "/" }) {
  const router = useRouter();
  const divisiones = useDivisionStore((store) => store.divisiones);
  const selectedDivision = useDivisionStore(
    (store) => store.selectedDivision,
  );
  const setDivision = useDivisionStore((store) => store.setDivision);
  const fetchDivisiones = useDivisionStore(
    (store) => store.fetchDivisiones,
  );
  const { completeNavigation, startNavigation, transition } =
    useNavigationProgress();

  const [modalOpen, setModalOpen] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const pendingDivisionId =
    transition.kind === "division" &&
    transition.isVisible &&
    !transition.isDone
      ? transition.targetDivisionId
      : "";
  const isSwitchingDivision = Boolean(pendingDivisionId);
  const selectedDivisionId = selectedDivision?.id || "";

  useEffect(() => {
    if (divisiones.length === 0) {
      fetchDivisiones();
    }
  }, [divisiones.length, fetchDivisiones]);

  useEffect(() => {
    if (
      !isSwitchingDivision ||
      transition.targetPath ||
      String(selectedDivision?.id || "") !== String(pendingDivisionId)
    ) {
      return undefined;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        completeNavigation();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [
    completeNavigation,
    isSwitchingDivision,
    pendingDivisionId,
    selectedDivision?.id,
    transition.targetPath,
  ]);

  const getDivisionDestination = (division) => {
    if (!division) return "";

    const activePath =
      typeof window === "undefined" ? currentPath : window.location.pathname;
    const tournamentDestination = buildTournamentDivisionSwitchPath({
      divisionId: division.id,
      pathname: activePath,
    });
    if (tournamentDestination) return tournamentDestination;

    if (/^\/(?:division\/\d+\/)?equipos(?:\/|$)/.test(activePath)) {
      return `/division/${division.id}/equipos`;
    }

    return "";
  };

  const prewarmDivision = (division) => {
    const destination = getDivisionDestination(division);
    if (!destination) return;

    router.prefetch(destination);
    if (!destination.includes("/torneos")) return;

    void prefetchDivisionWorkspace(division.id).catch(() => {
      // La navegación normal conserva su propio manejo de errores.
    });
  };

  const changeDivision = (division) => {
    if (!division || division.id === selectedDivision?.id || isSwitchingDivision) return;

    const destination = getDivisionDestination(division);
    if (destination) {
      prewarmDivision(division);
      startNavigation({
        doneLabel: `${division.name} activa`,
        kind: "division",
        label: `Cambiando a ${division.name}`,
        targetDivisionId: division.id,
        targetPath: destination,
      });
      setDivision(division);
      router.replace(destination, { scroll: false });
      return;
    }

    startNavigation({
      doneLabel: `${division.name} activa`,
      kind: "division",
      label: `Cambiando a ${division.name}`,
      targetDivisionId: division.id,
    });
    setDivision(division);
  };

  const handleChange = (e) => {
    if (isSwitchingDivision) return;
    const id = Number(e.target.value);
    const divisionEncontrada = divisiones.find((div) => div.id === id);
    changeDivision(divisionEncontrada);
  };

  const getAdjacentDivision = (step) => {
    if (divisiones.length < 2) return null;

    const currentIndex = divisiones.findIndex(
      (division) => division.id === selectedDivision?.id,
    );
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex =
      (safeCurrentIndex + step + divisiones.length) % divisiones.length;
    return divisiones[nextIndex];
  };

  const handleCycle = (e, step) => {
    e.stopPropagation();
    if (isSwitchingDivision || divisiones.length < 2) return;
    changeDivision(getAdjacentDivision(step));
  };

  const previousDivision = getAdjacentDivision(-1);
  const nextDivision = getAdjacentDivision(1);

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .trim()
      .split(" ")
      .map((chunk) => chunk[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDivisionName.trim()) return;

    setLoadingAction(true);
    try {
      await createDivisionForCurrentUser(newDivisionName);
      setNewDivisionName("");
      await fetchDivisiones();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Borrar división? Se borrarán sus equipos y torneos.")) return;

    try {
      await deleteDivisionById(id);
      await fetchDivisiones();
    } catch (error) {
      alert("Error al borrar: " + error.message);
    }
  };

  return (
    <>
      <MainContainer
        $hasCycle={divisiones.length > 1}
        $isOpen={isOpen}
      >
        <ViewStack>
          <FullView $isActive={isOpen}>
            <div className="header-row">
              <div className="label">División Actual</div>
              <button type="button" className="config-btn" onClick={() => setModalOpen(true)} title="Gestionar" aria-label="Gestionar divisiones">
                <v.iconoSettings />
              </button>
            </div>

            <SelectWrapper $isSwitching={isSwitchingDivision}>
              {divisiones.length > 0 ? (
                <select
                  aria-label="División actual"
                  value={selectedDivisionId}
                  onChange={handleChange}
                  disabled={isSwitchingDivision}
                  aria-busy={isSwitchingDivision}
                >
                  {divisiones.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </select>
              ) : (
                <button type="button" className="no-data" onClick={() => setModalOpen(true)}>
                  + Crear
                </button>
              )}

              {divisiones.length > 0 && (
                isSwitchingDivision ? (
                  <div className="loading-icon" aria-hidden="true" />
                ) : (
                  <div className="icon">
                    <IoIosArrowDown />
                  </div>
                )
              )}
            </SelectWrapper>
          </FullView>

          <CompactView $isActive={!isOpen}>
            <CompactControlGroup
              aria-label="Cambiar división"
              aria-busy={isSwitchingDivision}
              role="group"
            >
              {divisiones.length > 1 && (
                <CycleButton
                  type="button"
                  aria-label={`Cambiar a ${previousDivision?.name}`}
                  title={previousDivision?.name}
                  disabled={isSwitchingDivision}
                  onClick={(event) => handleCycle(event, -1)}
                  onFocus={() => prewarmDivision(previousDivision)}
                  onPointerEnter={() => prewarmDivision(previousDivision)}
                >
                  <IoIosArrowUp aria-hidden="true" />
                </CycleButton>
              )}

              <InitialsContainer
                type="button"
                aria-label={
                  divisiones.length === 0
                    ? "Crear división"
                    : selectedDivision?.name
                }
                onClick={() => {
                  if (divisiones.length === 0) setModalOpen(true);
                }}
                title={
                  isSwitchingDivision
                    ? "Cambiando división"
                    : selectedDivision?.name
                }
                disabled={divisiones.length > 0}
                $isEmpty={divisiones.length === 0}
                $isSwitching={isSwitchingDivision}
              >
                <span className="initials">
                  {divisiones.length > 0
                    ? getInitials(selectedDivision?.name)
                    : "+"}
                </span>

                {isSwitchingDivision && (
                  <div className="compact-spinner" aria-hidden="true" />
                )}
              </InitialsContainer>

              {divisiones.length > 1 && (
                <CycleButton
                  type="button"
                  aria-label={`Cambiar a ${nextDivision?.name}`}
                  title={nextDivision?.name}
                  disabled={isSwitchingDivision}
                  onClick={(event) => handleCycle(event, 1)}
                  onFocus={() => prewarmDivision(nextDivision)}
                  onPointerEnter={() => prewarmDivision(nextDivision)}
                >
                  <IoIosArrowDown aria-hidden="true" />
                </CycleButton>
              )}
            </CompactControlGroup>
          </CompactView>
        </ViewStack>
      </MainContainer>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Gestionar Divisiones">
        <CrudContainer>
          <form onSubmit={handleAdd} className="add-form">
            <InputText2>
              <input
                aria-label="Nombre de la nueva división"
                className="form__field"
                placeholder="Nueva División..."
                value={newDivisionName}
                onChange={(e) => setNewDivisionName(e.target.value)}
              />
            </InputText2>
            <Btnsave
              titulo={loadingAction ? "..." : "Agregar"}
              bgcolor={v.verde}
              icono={<v.iconoagregar />}
              disabled={loadingAction}
              width="auto"
            />
          </form>
          <Divider />
          <div className="list">
            {divisiones.map((div) => (
              <div className="item" key={div.id}>
                <span>{div.name}</span>
                <div className="actions">
                  <button type="button" className="btn-icon delete" onClick={() => handleDelete(div.id)} aria-label={`Eliminar división ${div.name}`}>
                    <RiDeleteBinLine />
                  </button>
                </div>
              </div>
            ))}
            {divisiones.length === 0 && <p className="empty">No hay divisiones registradas.</p>}
          </div>
        </CrudContainer>
      </Modal>
    </>
  );
}

const MainContainer = styled.div`
  margin: 9px 0;
  margin-left: 8px;
  margin-right: 10px;
  min-height: ${({ $hasCycle, $isOpen }) =>
    $isOpen || !$hasCycle ? "60px" : "112px"};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: min-height 280ms ease;
`;

const ViewStack = styled.div`
  display: grid;
  width: 100%;
  grid-template-areas: "stack";
  align-items: center;
  justify-items: center;

  > * {
    grid-area: stack;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
`;

const activeState = css`
  max-height: 140px;
  opacity: 1;
  transform: translateX(0) scale(1);
  pointer-events: all;
  visibility: visible;
`;

const inactiveState = (translateX) => css`
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transform: translateX(${translateX}) scale(0.9);
  pointer-events: none;
  visibility: hidden;
`;

const FullView = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  ${({ $isActive }) => ($isActive ? activeState : inactiveState("-10px"))}

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
    padding: 0 2px;

    .label {
      font-size: 0.7rem;
      color: ${({ theme }) => theme.text};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
      font-weight: 700;
    }

    .config-btn {
      border: 0;
      padding: 0;
      background: transparent;
      cursor: pointer;
      font-size: 1rem;
      color: ${({ theme }) => theme.text};
      opacity: 0.5;
      transition: 0.3s;

      &:hover {
        opacity: 1;
        color: ${({ theme }) => theme.primary};
      }
    }
  }
`;

const CompactView = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  ${({ $isActive }) => ($isActive ? activeState : inactiveState("10px"))}
`;

const InitialsContainer = styled.button`
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${({ theme, $isEmpty }) =>
    $isEmpty ? theme.bg4 : `linear-gradient(135deg, ${theme.primary} 0%, ${v.colorselector} 100%)`};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: ${({ $isEmpty, $isSwitching }) =>
    $isSwitching ? "wait" : $isEmpty ? "pointer" : "default"};
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: box-shadow 180ms ease, transform 180ms ease;
  user-select: none;
  border: 2px solid ${({ theme }) => theme.bgtotal};
  overflow: hidden;

  &:disabled {
    color: white;
    opacity: 1;
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.primary || v.colorPrincipal};
    outline-offset: 3px;
  }

  .initials {
    transition: all 0.3s ease;
    z-index: 1;
    opacity: ${({ $isSwitching }) => ($isSwitching ? 0.35 : 1)};
  }

  .compact-spinner {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    animation: divisionSpinner 0.7s linear infinite;
    z-index: 3;
  }

  ${({ $isEmpty, $isSwitching }) =>
    $isEmpty &&
    !$isSwitching &&
    css`
      &:hover {
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.2);
      }

      &:active {
        transform: scale(0.95);
      }
    `}
`;

const CompactControlGroup = styled.div`
  display: flex;
  width: 52px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
`;

const CycleButton = styled.button`
  width: 44px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.text};
  background: transparent;
  cursor: pointer;
  font-size: 1.15rem;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.primary || v.colorPrincipal};
    background: ${({ theme }) => theme.bgAlpha};
  }

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.primary || v.colorPrincipal};
    outline-offset: 1px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.35;
  }
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
  background: ${({ theme, $isSwitching }) => ($isSwitching ? theme.bgcards : theme.bgtotal)};
  border-radius: 10px;
  border: 1px solid ${({ theme, $isSwitching }) => ($isSwitching ? theme.primary || v.colorPrincipal : "transparent")};
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.03);

  &:hover {
    background: ${({ theme }) => theme.bgcards};
    border-color: ${({ theme }) => theme.primary};
  }

  select {
    width: 100%;
    padding: 10px 38px 10px 12px;
    appearance: none;
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.text};
    font-weight: 600;
    font-size: 0.85rem;
    cursor: ${({ $isSwitching }) => ($isSwitching ? "wait" : "pointer")};
    outline: none;

    &:disabled {
      opacity: 1;
    }

    option {
      background: ${({ theme }) => theme.bgcards};
      color: ${({ theme }) => theme.text};
    }
  }

  .no-data {
    width: 100%;
    border: 0;
    background: transparent;
    padding: 12px;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.primary};
    cursor: pointer;
    font-weight: 700;
    text-align: center;
  }

  .icon {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: ${({ theme }) => theme.primary || v.colorPrincipal};
    font-size: 1.1rem;
  }

  .loading-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    width: 16px;
    height: 16px;
    margin-top: -8px;
    border-radius: 50%;
    border: 2px solid ${({ theme }) => theme.bg4};
    border-top-color: ${({ theme }) => theme.primary || v.colorPrincipal};
    pointer-events: none;
    animation: divisionSpinner 0.7s linear infinite;
  }

  @keyframes divisionSpinner {
    to {
      transform: rotate(360deg);
    }
  }
`;

const CrudContainer = styled.div`
  .add-form {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .item {
    background: ${({ theme }) => theme.bgtotal};
    padding: 10px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: 0.2s;

    span {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .actions {
      display: flex;
      gap: 5px;

      button {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 1.1rem;
        padding: 6px;
        border-radius: 6px;
        color: ${({ theme }) => theme.text};
        opacity: 0.7;

        &:hover {
          background: rgba(0, 0, 0, 0.05);
          opacity: 1;
        }
      }
    }
  }

  .empty {
    text-align: center;
    opacity: 0.5;
    font-size: 0.9rem;
    margin-top: 10px;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.bg4};
  margin: 15px 0;
`;
