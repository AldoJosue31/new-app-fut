import React, { useState, useRef } from "react";
import styled, { css } from "styled-components";
import { RiAddCircleLine, RiHandCoinLine } from "react-icons/ri";
import { v } from "../../../../../styles/variables";
import { formatDateWithWeekday, addDaysToDate } from "../../../../../utils/dateUtils";

export const DaySeparatorDropZone = ({
  baseDate,
  onDropAction,
  isConfirmed,
  isTapDropEnabled = false,
}) => {
  const [isOver, setIsOver] = useState(false);
  const dragCounter = useRef(0);

  const nextDate = addDaysToDate(baseDate, 1);
  const label = formatDateWithWeekday(nextDate);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isConfirmed) {
      dragCounter.current += 1;
      if (dragCounter.current === 1) setIsOver(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isConfirmed) {
      dragCounter.current -= 1;
      if (dragCounter.current === 0) setIsOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsOver(false);
    if (!isConfirmed) {
      onDropAction(nextDate);
    }
  };

  if (isConfirmed) return <Spacer />;

  return (
    <SeparatorContainer
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (isTapDropEnabled && !isConfirmed) {
          onDropAction(nextDate);
        }
      }}
      $isOver={isOver}
      $isTapDropEnabled={isTapDropEnabled}
    >
      <div className="content">
        <div className="line"></div>
        <div className="pill">
          {isOver ? (
            <>
              <RiAddCircleLine size={18} />
              <span>Crear nuevo grupo: {label}</span>
            </>
          ) : isTapDropEnabled ? (
            <>
              <RiHandCoinLine size={16} />
              <span>Toca para mover a {label}</span>
            </>
          ) : (
            <span className="hint">Arrastra aqui para {label}</span>
          )}
        </div>
        <div className="line"></div>
      </div>
    </SeparatorContainer>
  );
};

const Spacer = styled.div`
  height: 10px;
`;

const SeparatorContainer = styled.div`
  width: 100%;
  margin-top: 5px;
  margin-bottom: 5px;
  min-height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: ${({ $isTapDropEnabled }) => ($isTapDropEnabled ? "pointer" : "default")};

  .content {
    pointer-events: none;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: ${({ $isTapDropEnabled }) => ($isTapDropEnabled ? 1 : 0)};
    transform: scaleY(${({ $isTapDropEnabled }) => ($isTapDropEnabled ? 1 : 0.8)});
    transition: all 0.2s ease;
  }

  .line {
    height: 1px;
    flex: 1;
    background: ${v.colorPrincipal};
    opacity: ${({ $isTapDropEnabled }) => ($isTapDropEnabled ? 0.45 : 0.3)};
  }

  .pill {
    background: ${({ theme, $isTapDropEnabled }) =>
      $isTapDropEnabled ? `${v.colorPrincipal}10` : theme.bg3};
    border: 1px dashed ${v.colorPrincipal};
    border-radius: 20px;
    padding: 4px 15px;
    font-size: 0.8rem;
    color: ${v.colorPrincipal};
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;

    .hint {
      display: ${({ $isTapDropEnabled }) => ($isTapDropEnabled ? "block" : "none")};
    }
  }

  ${({ $isOver }) =>
    $isOver &&
    css`
      min-height: 50px;

      .content {
        opacity: 1;
        transform: scaleY(1);
      }

      .pill {
        background: ${v.colorPrincipal}20;
        border-style: solid;
        transform: scale(1.05);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }
    `}

  ${({ $isTapDropEnabled }) =>
    !$isTapDropEnabled &&
    css`
      &:hover {
        .content {
          opacity: 0.5;
        }

        .pill {
          border-color: transparent;
          background: transparent;
        }

        .hint {
          display: block;
          font-size: 0.75rem;
        }
      }
    `}
`;
