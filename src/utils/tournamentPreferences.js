export const TOURNAMENT_AUTO_REDIRECT_STORAGE_KEY = "torneos_auto_redirect_jornadas";

export const getTournamentAutoRedirectPreference = () => {
  if (typeof window === "undefined") return true;

  try {
    const storedValue = window.localStorage.getItem(
      TOURNAMENT_AUTO_REDIRECT_STORAGE_KEY,
    );
    return storedValue === null ? true : storedValue === "true";
  } catch {
    return true;
  }
};

export const setTournamentAutoRedirectPreference = (enabled) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      TOURNAMENT_AUTO_REDIRECT_STORAGE_KEY,
      String(enabled),
    );
  } catch {
    // The current UI state remains valid when storage is unavailable.
  }
};
