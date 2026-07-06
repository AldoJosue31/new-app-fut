import {
  RiFocus2Line,
  RiFontSize,
  RiFootballLine,
  RiHashtag,
  RiUserSmileLine,
} from "react-icons/ri";

export const TEAM_DETAIL_VIEWS = Object.freeze({
  OVERVIEW: "overview",
  DELEGATE_REQUESTS: "delegate-requests",
  PLAYERS: "players",
  STATS: "stats",
});

export const PLAYER_POSITION_RANK = {
  Portero: 1,
  Defensa: 2,
  Medio: 3,
  Delantero: 4,
  "No especificada": 5,
};

export const PLAYER_SORT_OPTIONS = [
  { label: "Dorsal", key: "dorsal", Icon: RiHashtag },
  { label: "Nombre", key: "first_name", Icon: RiFontSize },
  {
    label: "Posición",
    key: "position",
    Icon: RiFocus2Line,
    customOrder: PLAYER_POSITION_RANK,
  },
];

export const STATS_TABS = [
  { id: "results", label: "Partidos", Icon: RiFootballLine },
  { id: "performance", label: "Jugadores", Icon: RiUserSmileLine },
];

export const MATCH_RESULT_FILTERS = [
  { id: "all", label: "Todos", shortLabel: "T" },
  { id: "V", label: "Victorias", shortLabel: "V" },
  { id: "E", label: "Empates", shortLabel: "E" },
  { id: "D", label: "Derrotas", shortLabel: "D" },
];
