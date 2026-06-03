export const TOURNAMENT_AUTO_REDIRECT_STORAGE_KEY = "torneos_auto_redirect_jornadas";

export const getTournamentAutoRedirectPreference = () => {
  if (typeof window === "undefined") return true;

  const storedValue = window.localStorage.getItem(TOURNAMENT_AUTO_REDIRECT_STORAGE_KEY);
  return storedValue === null ? true : storedValue === "true";
};

export const setTournamentAutoRedirectPreference = (enabled) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TOURNAMENT_AUTO_REDIRECT_STORAGE_KEY, String(enabled));
};
