import {
    STANDINGS_BACKGROUND_DESIGNS,
    STANDINGS_DESIGN_PRESETS,
    STANDINGS_TABLE_DESIGNS
} from "./standingsExportStyles.js";

const SETTINGS_VERSION = 1;

export const getStandingsExportSettingsKey = (userId, torneoId) =>
    userId && torneoId ? `standings-export-settings:v${SETTINGS_VERSION}:${userId}:${torneoId}` : null;

export const getDefaultStandingsExportSettings = (isAppDark = false) => ({
    version: SETTINGS_VERSION,
    themeMode: isAppDark ? "dark" : "light",
    layoutMode: "desktop",
    showGeneratedDate: true,
    designMode: "preset",
    presetId: STANDINGS_DESIGN_PRESETS[0].id,
    tableDesignId: STANDINGS_TABLE_DESIGNS[0].id,
    backgroundDesignId: STANDINGS_BACKGROUND_DESIGNS[0].id,
    useLeagueColors: false
});

const isKnownId = (designs, id) => designs.some((design) => design.id === id);

const normalizeSettings = (value, isAppDark) => {
    const defaults = getDefaultStandingsExportSettings(isAppDark);
    if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== SETTINGS_VERSION) {
        return defaults;
    }

    return {
        version: SETTINGS_VERSION,
        themeMode: ["light", "dark"].includes(value.themeMode) ? value.themeMode : defaults.themeMode,
        layoutMode: ["desktop", "mobile"].includes(value.layoutMode) ? value.layoutMode : defaults.layoutMode,
        showGeneratedDate: typeof value.showGeneratedDate === "boolean" ? value.showGeneratedDate : defaults.showGeneratedDate,
        designMode: ["preset", "custom"].includes(value.designMode) ? value.designMode : defaults.designMode,
        presetId: isKnownId(STANDINGS_DESIGN_PRESETS, value.presetId) ? value.presetId : defaults.presetId,
        tableDesignId: isKnownId(STANDINGS_TABLE_DESIGNS, value.tableDesignId) ? value.tableDesignId : defaults.tableDesignId,
        backgroundDesignId: isKnownId(STANDINGS_BACKGROUND_DESIGNS, value.backgroundDesignId) ? value.backgroundDesignId : defaults.backgroundDesignId,
        useLeagueColors: typeof value.useLeagueColors === "boolean" ? value.useLeagueColors : defaults.useLeagueColors
    };
};

const resolveStorage = (storage) =>
    storage === undefined ? (typeof window === "undefined" ? null : window.localStorage) : storage;

export const readStandingsExportSettings = ({ userId, torneoId, isAppDark = false, storage } = {}) => {
    const key = getStandingsExportSettingsKey(userId, torneoId);
    if (!key) return getDefaultStandingsExportSettings(isAppDark);

    try {
        const stored = resolveStorage(storage)?.getItem(key);
        return stored ? normalizeSettings(JSON.parse(stored), isAppDark) : getDefaultStandingsExportSettings(isAppDark);
    } catch {
        return getDefaultStandingsExportSettings(isAppDark);
    }
};

export const saveStandingsExportSettings = ({ userId, torneoId, settings, storage } = {}) => {
    const key = getStandingsExportSettingsKey(userId, torneoId);
    if (!key) return false;

    try {
        const safeSettings = normalizeSettings({ ...settings, version: SETTINGS_VERSION }, false);
        const target = resolveStorage(storage);
        if (!target) return false;
        target.setItem(key, JSON.stringify(safeSettings));
        return true;
    } catch {
        return false;
    }
};
