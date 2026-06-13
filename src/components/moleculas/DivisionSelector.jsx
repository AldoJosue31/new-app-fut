import React, { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import { v } from "../../styles/variables";
import { useDivisionStore } from "../../store/DivisionStore";
import {
  createDivisionForCurrentUser,
  deleteDivisionById,
} from "../../services/divisions";
import { Modal } from "../organismos/Modal";
import { InputText2 } from "../organismos/formularios/InputText2";
import { Btnsave } from "../moleculas/Btnsave";

import { IoIosArrowDown } from "react-icons/io";
import { RiDeleteBinLine } from "react-icons/ri";
import { BiTransfer } from "react-icons/bi";

export function DivisionSelector({ isOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    divisiones,
    selectedDivision,
    setDivision,
    fetchDivisiones,
  } = useDivisionStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [switchProgress, setSwitchProgress] = useState({
    isVisible: false,
    isDone: false,
    divisionName: "",
  });
  const progressTimers = useRef([]);

  useEffect(() => {
    fetchDivisiones();
  }, [fetchDivisiones]);

  useEffect(() => {
    return () => {
      progressTimers.current.forEach(clearTimeout);
    };
  }, []);

  const clearProgressTimers = () => {
    progressTimers.current.forEach(clearTimeout);
    progressTimers.current = [];
  };

  const showDivisionProgress = (division) => {
    clearProgressTimers();
    setSwitchProgress({
      isVisible: true,
      isDone: false,
      divisionName: division?.name || "",
    });

    progressTimers.current = [
      setTimeout(() => {
        setSwitchProgress((current) => ({
          ...current,
          isDone: true,
        }));
      }, 420),
      setTimeout(() => {
        setSwitchProgress((current) => ({
          ...current,
          isVisible: false,
        }));
      }, 1250),
    ];
  };

  const changeDivision = (division) => {
    if (!division || division.id === selectedDivision?.id) return;

    showDivisionProgress(division);
    setDivision(division);

    const torneosMatch = location.pathname.match(/(?:\/division\/\d+)?\/torneos\/?([^/]*)?/);
    if (torneosMatch) {
      const currentTab = torneosMatch[1] || "definir";
      navigate(`/division/${division.id}/torneos/${currentTab}`, { replace: true });
      return;
    }

    const equiposMatch = location.pathname.match(/(?:\/division\/\d+)?\/equipos\/?([^/]*)?/);
    if (equiposMatch) {
      navigate(`/division/${division.id}/equipos`, { replace: true });
    }
  };

  const handleChange = (e) => {
    const id = Number(e.target.value);
    const divisionEncontrada = divisiones.find((div) => div.id === id);
    changeDivision(divisionEncontrada);
  };

  const handleCycle = (e) => {
    e.stopPropagation();
    if (divisiones.length < 2) return;
    const currentIndex = divisiones.findIndex((div) => div.id === selectedDivision?.id);
    const newIndex = currentIndex < divisiones.length - 1 ? currentIndex + 1 : 0;
    changeDivision(divisiones[newIndex]);
  };

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
      <MainContainer>
        <ViewStack>
          <FullView $isActive={isOpen}>
            <div className="header-row">
              <div className="label">División Actual</div>
              <div className="config-btn" onClick={() => setModalOpen(true)} title="Gestionar">
                <v.iconoSettings />
              </div>
            </div>

            <SelectWrapper>
              {divisiones.length > 0 ? (
                <select value={selectedDivision?.id || ""} onChange={handleChange}>
                  {divisiones.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="no-data" onClick={() => setModalOpen(true)}>
                  + Crear
                </div>
              )}

              {divisiones.length > 0 && (
                <div className="icon">
                  <IoIosArrowDown />
                </div>
              )}
            </SelectWrapper>
          </FullView>

          <CompactView $isActive={!isOpen}>
            <InitialsContainer
              onClick={divisiones.length > 0 ? handleCycle : () => setModalOpen(true)}
              title={divisiones.length > 1 ? "Click para cambiar de división" : selectedDivision?.name}
              $isEmpty={divisiones.length === 0}
              $clickable={divisiones.length > 1}
            >
              <span className="initials">
                {divisiones.length > 0 ? getInitials(selectedDivision?.name) : "+"}
              </span>

              {divisiones.length > 1 && (
                <div className="swap-icon">
                  <BiTransfer />
                </div>
              )}
            </InitialsContainer>
          </CompactView>
        </ViewStack>
      </MainContainer>

      <DivisionProgressBar
        $isVisible={switchProgress.isVisible}
        $isDone={switchProgress.isDone}
        role="status"
        aria-live="polite"
      >
        <div className="progress-copy">
          {switchProgress.isDone ? "Division cambiada" : "Cambiando division"}
          {switchProgress.divisionName ? `: ${switchProgress.divisionName}` : ""}
        </div>
        <div className="progress-track">
          <div className="progress-fill" />
        </div>
      </DivisionProgressBar>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Gestionar Divisiones">
        <CrudContainer>
          <form onSubmit={handleAdd} className="add-form">
            <InputText2>
              <input
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
                  <button className="btn-icon delete" onClick={() => handleDelete(div.id)}>
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
  min-height: 60px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
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
  opacity: 1;
  transform: translateX(0) scale(1);
  pointer-events: all;
  visibility: visible;
`;

const inactiveState = (translateX) => css`
  opacity: 0;
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

const InitialsContainer = styled.div`
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
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  user-select: none;
  border: 2px solid ${({ theme }) => theme.bgtotal};
  overflow: hidden;

  .initials {
    transition: all 0.3s ease;
    z-index: 1;
  }

  .swap-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
    font-size: 1.4rem;
    transition: all 0.3s ease;
    z-index: 2;
    color: ${({ theme }) => theme.text};
  }

  ${({ $clickable, theme }) =>
    $clickable &&
    css`
      &:hover {
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.2);
        background: ${theme.bg4};
        border-color: ${theme.primary};

        .initials {
          filter: blur(3px);
          opacity: 0.4;
          color: ${theme.text};
        }

        .swap-icon {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      &:active {
        transform: scale(0.95);
      }
    `}
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
  background: ${({ theme }) => theme.bgtotal};
  border-radius: 10px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.03);

  &:hover {
    background: ${({ theme }) => theme.bgcards};
    border-color: ${({ theme }) => theme.primary};
  }

  select {
    width: 100%;
    padding: 10px 30px 10px 12px;
    appearance: none;
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.text};
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    outline: none;

    option {
      background: ${({ theme }) => theme.bgcards};
      color: ${({ theme }) => theme.text};
    }
  }

  .no-data {
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
`;

const DivisionProgressBar = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120;
  pointer-events: none;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transform: translateY(${({ $isVisible }) => ($isVisible ? "0" : "10px")});
  transition: opacity 0.2s ease, transform 0.2s ease;

  .progress-copy {
    position: absolute;
    right: 16px;
    bottom: 10px;
    max-width: min(320px, calc(100vw - 32px));
    padding: 7px 10px;
    border-radius: 8px;
    background: ${({ theme }) => theme.bgcards};
    border: 1px solid ${({ theme, $isDone }) => ($isDone ? v.verde : theme.primary || v.colorPrincipal)};
    color: ${({ theme }) => theme.text};
    box-shadow: ${({ theme }) => theme.boxshadowGray || "0 8px 20px rgba(0, 0, 0, 0.16)"};
    font-size: 0.78rem;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progress-track {
    width: 100%;
    height: 4px;
    background: ${({ theme }) => theme.bg4};
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    width: ${({ $isDone }) => ($isDone ? "100%" : "72%")};
    background: ${({ theme, $isDone }) =>
      $isDone ? v.verde : `linear-gradient(90deg, ${theme.primary || v.colorPrincipal}, ${v.colorselector})`};
    box-shadow: 0 0 12px ${({ $isDone }) => ($isDone ? `${v.verde}80` : `${v.colorPrincipal}80`)};
    transition: width 0.42s ease, background 0.2s ease;
    animation: ${({ $isDone }) => ($isDone ? "none" : "divisionProgress 0.9s ease-in-out infinite")};
  }

  @keyframes divisionProgress {
    0% {
      transform: translateX(-24%);
    }
    50% {
      transform: translateX(18%);
    }
    100% {
      transform: translateX(0);
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
