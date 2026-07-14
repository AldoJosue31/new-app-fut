import styled, { keyframes } from "styled-components";
import { v } from "../../../styles/variables";

const slideInRight = keyframes`
  from {
    transform: translateX(30px);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideInLeft = keyframes`
  from {
    transform: translateX(-30px);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const popoverEnterDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const popoverEnterLeft = keyframes`
  from {
    opacity: 0;
    transform: translate(8px, -50%) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translate(0, -50%) scale(1);
  }
`;

const railItemsFadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const railItemsFadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }

  to {
    opacity: 0;
    transform: translateY(-8px);
  }
`;

export const DetailContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
  overflow-x: hidden;
  padding-bottom: 10px;
`;

export const InternalView = styled.div`
  width: 100%;
  padding: 0 10px;
  animation: ${slideInRight} 0.3s cubic-bezier(0.25, 1, 0.5, 1);

  @media (max-width: 768px) {
    padding: 0;
  }
`;

export const OverviewView = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${slideInLeft} 0.3s cubic-bezier(0.25, 1, 0.5, 1);
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 15px;
  gap: 15px;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    margin-bottom: 10px;
    padding: 0 8px;
    gap: 10px;
  }
`;

export const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  appearance: none;
  padding: 8px 14px;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 20px;
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: 0.2s;

  &:hover {
    background: ${({ theme }) => theme.bgcards};
    border-color: ${v.colorPrincipal};
  }
`;

export const PlayersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 0 8px;
  }
`;

export const PlayerChip = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 12px;
  background: ${({ theme }) => theme.bgtotal};
  text-align: center;

  img {
    width: 55px;
    height: 55px;
    border: 2px solid ${({ theme }) => theme.bgcards};
    border-radius: 50%;
    object-fit: cover;
    background: #eee;
  }

  .info-p {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .dorsal {
    color: ${v.colorPrincipal};
    font-size: 1rem;
    font-weight: 900;
  }

  .name {
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.1;
  }

  .pos {
    margin-top: 2px;
    padding: 2px 6px;
    border-radius: 8px;
    background: ${({ theme }) => theme.bgcards};
    font-size: 0.7rem;
    opacity: 0.7;
  }
`;

export const EmptyMessage = styled.p`
  margin: 0;
  text-align: center;
  opacity: 0.7;
`;

export const Banner = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  width: calc(100% + 50px);
  height: 140px;
  margin: -25px -25px 0;
  padding-top: 35px;
  background: ${({ $color }) => `linear-gradient(135deg, ${$color}, ${$color}aa)`};

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
      circle at 20% 50%,
      rgba(255, 255, 255, 0.2) 0%,
      transparent 50%
    );
  }
`;

export const DivisionBadge = styled.div`
  z-index: 2;
  height: fit-content;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
`;

export const LogoWrapper = styled.div`
  display: flex;
  justify-content: center;
  width: 130px;
  height: 130px;
  margin-top: -65px;
  z-index: 5;

  img,
  svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.4));
  }
`;

export const TeamTitle = styled.h2`
  margin: 10px 0 5px;
  color: ${({ theme }) => theme.text};
  font-size: 1.6rem;
  font-weight: 800;
  text-align: center;

  @media (max-width: 480px) {
    font-size: 1.4rem;
  }
`;

export const InfoBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding-top: 15px;
`;

export const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
  appearance: none;
  padding: 12px 15px;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 12px;
  background: ${({ theme }) => theme.bgtotal};
  color: inherit;
  font: inherit;
  text-align: left;

  &.clickable {
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: ${({ theme }) => theme.bgcards};
      border-color: ${v.colorPrincipal};

      .arrow-icon {
        color: ${v.colorPrincipal};
        transform: translateX(5px);
      }
    }
  }

  &.tournament-active {
    border-color: #f39c12;
    background: rgba(243, 156, 18, 0.05);

    &:hover {
      background: rgba(243, 156, 18, 0.1);
    }
  }

  .arrow-icon {
    margin-left: auto;
    font-size: 1.1rem;
    opacity: 0.5;
    transition: transform 0.2s;
  }

  .label {
    display: block;
    font-size: 0.75rem;
    color: ${({ theme }) => theme.text};
    opacity: 0.6;
  }

  .value {
    margin: 0;
    color: ${({ theme }) => theme.text};
    font-size: 0.95rem;
    font-weight: 600;

    &.highlight {
      color: #f39c12;
      font-weight: 800;
    }
  }
`;

export const IconBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: ${({ theme }) => theme.bgcards};
  color: ${({ theme }) => theme.text};
  font-size: 1.1rem;
  box-shadow: ${({ theme }) => theme.boxshadowGray};

  &.gold {
    border: none;
    background: linear-gradient(135deg, #f1c40f, #d35400);
    color: white;
  }
`;

export const StatusPill = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  background: ${({ $active }) =>
    $active ? "rgba(46, 213, 115, 0.15)" : "rgba(231, 76, 60, 0.15)"};
  color: ${({ $active }) => ($active ? "#2ecc71" : "#e74c3c")};
  font-size: 0.85rem;
  font-weight: 700;
`;

export const StatsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 15px;
`;

export const StatsTabsShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

export const StatsPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
`;

export const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
`;

export const SectionHeaderMain = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
  flex: 1;
`;

export const SectionLabel = styled.h4`
  margin: 0;
  color: ${({ theme }) => theme.text};
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  opacity: 0.8;
  text-transform: uppercase;

  @media (max-width: 480px) {
    margin-left: 5px;
  }
`;

export const RailNavigation = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    gap: 6px;
  }
`;

export const RailArrowButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 999px;
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  transition: 0.2s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: ${v.colorPrincipal};
    color: ${v.colorPrincipal};
    background: ${({ theme }) => theme.bgcards};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    width: 30px;
    height: 30px;
  }

  @media (max-width: 480px) {
    width: 28px;
    height: 28px;
  }
`;

export const CompactFilterWrapper = styled.div`
  position: relative;
  flex-shrink: 0;
`;

export const CompactFilterTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? v.colorPrincipal : theme.bg4)};
  border-radius: 999px;
  background: ${({ $active, theme }) =>
    $active ? theme.bgcards : theme.bgtotal};
  color: ${({ $active, theme }) => ($active ? v.colorPrincipal : theme.text)};
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  transition: 0.2s ease;
  white-space: nowrap;

  &:hover {
    border-color: ${v.colorPrincipal};
    color: ${v.colorPrincipal};
  }

  .filter-label {
    display: inline;
  }

  @media (max-width: 768px) {
    height: 30px;
    padding: 0 9px;
  }

  @media (max-width: 600px) {
    width: 30px;
    min-width: 30px;
    padding: 0;

    .filter-label {
      display: none;
    }
  }

  @media (max-width: 480px) {
    width: 28px;
    min-width: 28px;
    height: 28px;
  }
`;

export const CompactFilterPopover = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: max-content;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 999px;
  background: ${({ theme }) => theme.bgcards};
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  animation: ${popoverEnterDown} 0.18s cubic-bezier(0.25, 1, 0.5, 1);

  @media (max-width: 600px) {
    gap: 3px;
    padding: 3px;
  }

  @media (min-width: 901px) {
    top: 50%;
    right: calc(100% + 8px);
    transform: translateY(-50%);
    animation: ${popoverEnterLeft} 0.18s cubic-bezier(0.25, 1, 0.5, 1);
  }
`;

export const CompactFilterGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;

  @media (max-width: 480px) {
    gap: 3px;
  }
`;

export const CompactFilterButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  padding: 6px 9px;
  border: none;
  border-radius: 999px;
  background: ${({ $active, theme }) =>
    $active ? theme.bgtotal : "transparent"};
  color: ${({ $active, theme }) => ($active ? v.colorPrincipal : theme.text)};
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  transition: 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: ${v.colorPrincipal};
  }

  .short-label {
    display: none;
  }

  @media (max-width: 768px) {
    min-width: 30px;
    padding: 6px 8px;
    font-size: 0.7rem;
  }

  @media (max-width: 600px) {
    .full-label {
      display: none;
    }

    .short-label {
      display: inline;
    }
  }
`;

export const MatchesGrid = styled.div`
  display: flex;
  width: 100%;
  overflow-x: auto;
  padding: 2px 2px 8px;
  min-height: 166px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  cursor: ${({ $isScrollable, $isDragging }) =>
    !$isScrollable ? "default" : $isDragging ? "grabbing" : "grab"};
  user-select: ${({ $isDragging }) => ($isDragging ? "none" : "auto")};
  touch-action: pan-y;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

export const UpcomingGrid = styled(MatchesGrid)``;

export const RailItemsRow = styled.div`
  display: flex;
  gap: 12px;
  width: ${({ $stretch }) => ($stretch ? "100%" : "max-content")};
  min-width: ${({ $stretch }) => ($stretch ? "100%" : "max-content")};
  animation: ${({ $phase }) =>
      $phase === "entering"
        ? railItemsFadeIn
        : $phase === "leaving"
          ? railItemsFadeOut
          : "none"}
    ${({ $phase }) => ($phase === "idle" ? "0s" : "0.2s")}
    cubic-bezier(0.25, 1, 0.5, 1) forwards;

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

export const MatchCard = styled.div`
  position: relative;
  display: flex;
  flex: 0 0 142px;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 10px;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 12px;
  background: ${({ theme }) => theme.bgtotal};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

  .match-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 2px;
  }

  .jornada-tag {
    max-width: 80px;
    overflow: hidden;
    font-size: 0.6rem;
    font-weight: 800;
    opacity: 0.6;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .match-date-simple {
    margin-bottom: -2px;
    font-size: 0.65rem;
    font-weight: 600;
    opacity: 0.5;
  }

  .match-score {
    display: flex;
    align-items: center;
    gap: 5px;
    color: ${({ theme }) => theme.text};
    font-size: 1.3rem;
    font-weight: 800;
    line-height: 1;
  }

  .score-num.my-team {
    color: ${v.colorPrincipal};
  }

  .divider {
    font-size: 0.9rem;
    opacity: 0.3;
  }

  .penalties-score {
    margin-top: -3px;
    margin-bottom: 1px;
    color: #f39c12;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .rival-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;

    img,
    svg {
      width: 28px;
      height: 28px;
      object-fit: contain;
    }

    span {
      max-width: 100%;
      overflow: hidden;
      font-size: 0.7rem;
      line-height: 1;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  @media (max-width: 480px) {
    flex-basis: 132px;
    padding: 10px 8px;

    .match-score {
      font-size: 1.15rem;
    }

    .jornada-tag {
      max-width: 74px;
    }

    .rival-container span {
      font-size: 0.68rem;
    }
  }
`;

export const UpcomingCard = styled.div`
  display: flex;
  flex: 0 0 122px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 8px;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 12px;
  background: ${({ theme }) => theme.bgtotal};
  text-align: center;

  .upcoming-jornada {
    max-width: 100%;
    overflow: hidden;
    padding: 2px 7px;
    border-radius: 999px;
    background: ${({ theme }) => theme.bgcards};
    color: ${({ theme }) => theme.text};
    font-size: 0.58rem;
    font-weight: 800;
    opacity: 0.75;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .logo-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;

    img,
    svg {
      width: 34px;
      height: 34px;
      object-fit: contain;
    }
  }

  .upcoming-name {
    display: -webkit-box;
    width: 100%;
    overflow: hidden;
    color: ${({ theme }) => theme.text};
    font-size: 0.74rem;
    font-weight: 700;
    line-height: 1.1;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .upcoming-date,
  .upcoming-time {
    font-size: 0.64rem;
    font-weight: 600;
    opacity: 0.65;
  }

  .upcoming-time {
    color: ${v.colorPrincipal};
    opacity: 0.9;
  }

  @media (max-width: 480px) {
    flex-basis: 114px;

    .upcoming-name {
      font-size: 0.7rem;
    }
  }
`;

export const ResultBadge = styled.span`
  padding: 2px 5px;
  border: ${({ $penaltyStatus }) =>
      $penaltyStatus === "win"
        ? "1.5px solid #2ecc71"
        : $penaltyStatus === "loss"
          ? "1.5px solid #e74c3c"
          : "1.5px solid transparent"};
  border-radius: 4px;
  background: ${({ $result }) =>
    $result === "V"
      ? "#2ecc71"
      : $result === "P" || $result === "D"
        ? "#e74c3c"
        : "#95a5a6"};
  color: white;
  font-size: 0.55rem;
  font-weight: 700;
`;

export const EmptyBox = styled.div`
  flex: 0 0 100%;
  width: 100%;
  margin: 0;
  padding: 15px;
  border: 1px dashed ${({ theme }) => theme.bg4};
  border-radius: 8px;
  background: ${({ theme }) => theme.bgcards};
  font-size: 0.8rem;
  opacity: 0.7;
  text-align: center;
`;

export const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 10px;
  background: ${({ theme }) => theme.bgtotal};
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 480px) {
    border-right: none;
    border-left: none;
    border-radius: 0;
  }
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;

  th {
    padding: 10px 4px;
    border-bottom: 2px solid ${({ theme }) => theme.bg4};
    background: ${({ theme }) => theme.bgcards};
    color: ${({ theme }) => theme.text};
    font-size: 0.65rem;
    font-weight: 700;
    text-align: left;
    text-transform: uppercase;
    user-select: none;
    white-space: nowrap;

    &.clickable {
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: ${({ theme }) => theme.bg4};
      }
    }

    .th-content {
      display: flex;
      align-items: center;
      gap: 2px;

      &.centered {
        justify-content: center;
      }
    }

    .sort-button {
      width: 100%;
      border: 0;
      padding: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-transform: inherit;
      cursor: pointer;
    }
  }

  td {
    padding: 8px 4px;
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
    color: ${({ theme }) => theme.text};
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .col-player {
    width: auto;
    text-align: left;
  }

  .col-stat {
    display: table-cell;
    width: 32px;
    font-size: 0.85rem;
    text-align: center;
    vertical-align: middle;
  }

  .bold {
    color: ${v.colorPrincipal};
    font-size: 0.9rem;
    font-weight: 700;
  }

  .empty-cell {
    padding: 15px;
    font-size: 0.8rem;
    font-style: italic;
    opacity: 0.6;
    text-align: center;
  }
`;

export const SortIndicator = styled.span`
  margin-left: 1px;
  color: ${v.colorPrincipal};
  font-size: 0.8em;
`;

export const PlayerCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  .avatar-mini {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    overflow: hidden;
    border-radius: 50%;
    background: ${({ theme }) => theme.bg4};
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    span {
      font-size: 0.7rem;
      font-weight: 700;
      opacity: 0.5;
    }
  }

  .p-info {
    display: flex;
    flex-direction: column;
    max-width: 100%;
    overflow: hidden;
    line-height: 1;
  }

  .p-name {
    overflow: hidden;
    font-size: 0.8rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .p-dorsal {
    font-size: 0.6rem;
    opacity: 0.7;
  }
`;

export const CardIcon = styled.div`
  display: inline-block;
  width: 8px;
  height: 11px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  vertical-align: middle;
`;

export const PlayerSkeletonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 150px;
  padding: 10px;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 12px;
  background: ${({ theme }) => theme.bgtotal};

  .info-sk {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    width: 100%;
  }
`;
