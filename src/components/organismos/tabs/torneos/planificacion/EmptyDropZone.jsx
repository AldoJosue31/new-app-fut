import React from "react";
import styled, { keyframes, css } from "styled-components";
import { RiCalendarCheckLine, RiDragDropLine, RiHandCoinLine } from "react-icons/ri";
import { v } from "../../../../../styles/variables";
import { WeekDaysDropLayout } from "./WeekDaysDropLayout";

export const EmptyDropZone = ({
  isConfirmed,
  isDragOver,
  draggedMatch = null,
  jornadaStartDate = "",
  jornadaEndDate = "",
  jornadaDurationDays = 7,
  onDropDate,
  allowTapDrop = false,
}) => {
  const showWeekLayout =
    !isConfirmed &&
    Boolean(draggedMatch) &&
    Boolean(jornadaStartDate);

  if (showWeekLayout) {
    return (
      <WeekDaysDropLayout
        startDate={jornadaStartDate}
        endDate={jornadaEndDate}
        jornadaDurationDays={jornadaDurationDays}
        draggedMatch={draggedMatch}
        onDropDate={onDropDate}
        isHighlighted={isDragOver}
        allowTapDrop={allowTapDrop}
      />
    );
  }

  return (
    <Container
      $isConfirmed={isConfirmed}
      $isDragOver={isDragOver}
      $allowTapDrop={allowTapDrop}
    >
      <div className="icon-wrapper">
        {isConfirmed ? (
          <RiCalendarCheckLine size={45} />
        ) : allowTapDrop ? (
          <RiHandCoinLine size={45} />
        ) : (
          <RiDragDropLine size={45} />
        )}
      </div>
      <h3>{isConfirmed ? "Jornada sin partidos" : "Planilla vacia"}</h3>
      <p>
        {isConfirmed
          ? "Esta jornada ha sido confirmada sin ningun partido programado."
          : allowTapDrop
            ? "Toca uno de los dias disponibles para acomodar el partido seleccionado."
            : "Arrastra los partidos desde la lista lateral hacia esta zona para comenzar a planificar."}
      </p>
    </Container>
  );
};

const float = keyframes`
  0% { transform: translateY(0px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
  50% { transform: translateY(-10px); box-shadow: 0 15px 25px rgba(0,0,0,0.1); }
  100% { transform: translateY(0px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 ${v.colorPrincipal}60; transform: scale(1); }
  50% { box-shadow: 0 0 0 15px rgba(0,0,0,0); transform: scale(1.1); }
  100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); transform: scale(1); }
`;

const Container = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 90%;
  max-width: 350px;
  opacity: ${({ $isConfirmed }) => ($isConfirmed ? 0.6 : 1)};
  pointer-events: none;
  transition: all 0.3s ease;

  .icon-wrapper {
    background: ${({ theme, $allowTapDrop }) =>
      $allowTapDrop ? `${v.colorPrincipal}15` : theme.bg3};
    color: ${v.colorPrincipal};
    width: 90px;
    height: 90px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    border: 2px dashed ${v.colorPrincipal}60;
    animation: ${float} 3s ease-in-out infinite;
    transition: all 0.3s ease;
  }

  h3 {
    color: ${({ theme }) => theme.text};
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 8px;
    transition: color 0.3s ease;
  }

  p {
    color: ${({ theme }) => theme.text};
    opacity: 0.6;
    font-size: 0.9rem;
    line-height: 1.5;
    transition: color 0.3s ease;
  }

  ${({ $isDragOver }) =>
    $isDragOver &&
    css`
      .icon-wrapper {
        background: ${v.colorPrincipal}15;
        border: 2px solid ${v.colorPrincipal};
        animation: ${pulseGlow} 1.5s infinite;
        color: ${v.colorPrincipal};
      }

      h3 {
        color: ${v.colorPrincipal};
        transform: scale(1.05);
      }

      p {
        opacity: 0.9;
      }
    `}
`;
