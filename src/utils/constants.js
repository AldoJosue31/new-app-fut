// src/utils/constants.js

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  DELEGATE: 'delegate',
  PLAYER: 'player'
};

export const TOURNAMENT_STATUS = {
  ACTIVE: 'Activo',
  ONGOING: 'En Curso',
  FINISHED: 'Finalizado',
  PENDING: 'Pendiente'
};

export const ACTIVE_TOURNAMENT_STATUSES = Object.freeze([
  TOURNAMENT_STATUS.ACTIVE,
  TOURNAMENT_STATUS.ONGOING,
]);

export const TOURNAMENT_FORMAT = {
  LEAGUE: 'Liga',
  CUP: 'Copa',
  PLAYOFFS: 'Eliminatoria'
};

export const TEAM_STATUS = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SUSPENDED: 'Suspendido'
};
