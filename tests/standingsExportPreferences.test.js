import test from "node:test";
import assert from "node:assert/strict";
import {
    getDefaultStandingsExportSettings,
    getStandingsExportSettingsKey,
    readStandingsExportSettings,
    saveStandingsExportSettings
} from "../src/components/organismos/tabs/torneos/exports/standings/standingsExportPreferences.js";

const createStorage = () => {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
    };
};

test("recupera el diseño guardado para el mismo usuario y torneo sin guardar la jornada", () => {
    const storage = createStorage();
    const userId = "user-a";
    const torneoId = "tournament-a";
    const settings = {
        themeMode: "dark",
        layoutMode: "mobile",
        showGeneratedDate: false,
        designMode: "custom",
        presetId: "emerald",
        tableDesignId: "glass",
        backgroundDesignId: "sunset",
        useLeagueColors: true,
        selectedJornadaView: "round-7"
    };

    assert.equal(saveStandingsExportSettings({ userId, torneoId, settings, storage }), true);
    const stored = JSON.parse(storage.getItem(getStandingsExportSettingsKey(userId, torneoId)));
    assert.equal(stored.version, 1);
    assert.equal(Object.hasOwn(stored, "selectedJornadaView"), false);
    assert.deepEqual(readStandingsExportSettings({ userId, torneoId, storage }), stored);
    assert.equal(stored.tableDesignId, "glass");
    assert.equal(stored.backgroundDesignId, "sunset");
});

test("aísla preferencias entre cuentas y torneos e ignora la clave antigua", () => {
    const storage = createStorage();
    storage.setItem("standings-export-settings:tournament-a", JSON.stringify({ isDarkExport: true }));
    saveStandingsExportSettings({
        userId: "user-a",
        torneoId: "tournament-a",
        settings: { themeMode: "dark" },
        storage
    });

    assert.equal(readStandingsExportSettings({ userId: "user-a", torneoId: "tournament-a", storage }).themeMode, "dark");
    assert.deepEqual(readStandingsExportSettings({ userId: "user-b", torneoId: "tournament-a", storage }), getDefaultStandingsExportSettings());
    assert.deepEqual(readStandingsExportSettings({ userId: "user-a", torneoId: "tournament-b", storage }), getDefaultStandingsExportSettings());
    assert.equal(saveStandingsExportSettings({ torneoId: "tournament-a", settings: { themeMode: "dark" }, storage }), false);
});

test("valida datos dañados y continúa si el almacenamiento falla", () => {
    const storage = createStorage();
    const userId = "user-a";
    const torneoId = "tournament-a";
    const key = getStandingsExportSettingsKey(userId, torneoId);
    storage.setItem(key, "{invalid");
    assert.deepEqual(readStandingsExportSettings({ userId, torneoId, isAppDark: true, storage }), getDefaultStandingsExportSettings(true));

    storage.setItem(key, JSON.stringify({ version: 999, themeMode: "dark" }));
    assert.deepEqual(readStandingsExportSettings({ userId, torneoId, storage }), getDefaultStandingsExportSettings());

    storage.setItem(key, JSON.stringify({ version: 1, themeMode: "dark", tableDesignId: "unknown", showGeneratedDate: "false" }));
    const repaired = readStandingsExportSettings({ userId, torneoId, storage });
    assert.equal(repaired.themeMode, "dark");
    assert.equal(repaired.tableDesignId, "classic");
    assert.equal(repaired.showGeneratedDate, true);

    const blockedStorage = {
        getItem: () => { throw new Error("blocked"); },
        setItem: () => { throw new Error("blocked"); }
    };
    assert.deepEqual(readStandingsExportSettings({ userId, torneoId, storage: blockedStorage }), getDefaultStandingsExportSettings());
    assert.equal(saveStandingsExportSettings({ userId, torneoId, settings: repaired, storage: blockedStorage }), false);
});
