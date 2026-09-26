import { normalizeHexColor, mixHexColors, readableAccent, contrastingTextColor } from "../../../../../../utils/leagueColors.js";

export const STANDINGS_TABLE_DESIGNS = [
    { id: "classic", name: "Clásica", description: "Filas alternadas y bordes suaves." },
    { id: "glass", name: "Cristal", description: "Superficie translúcida con reflejos de cristal." },
    { id: "editorial", name: "Editorial", description: "Líneas limpias y encabezado de alto contraste." },
    { id: "scoreboard", name: "Marcador", description: "Estilo deportivo con los puntos como protagonistas." }
];

export const STANDINGS_BACKGROUND_DESIGNS = [
    { id: "solid", name: "Liso", description: "Un fondo limpio para dar prioridad a la tabla." },
    { id: "emerald", name: "Degradado esmeralda", description: "Verdes suaves inspirados en el terreno de juego." },
    { id: "aurora", name: "Aurora", description: "Luces azules y violetas sobre un degradado suave." },
    { id: "sunset", name: "Atardecer", description: "Tonos cálidos de naranja y coral." },
    { id: "pitch", name: "Cancha", description: "Franjas de césped y líneas de un campo de fútbol." }
];

export const STANDINGS_DESIGN_PRESETS = [
    { id: "classic", name: "Clásica", tableDesign: "classic", backgroundDesign: "solid", description: "Una combinación limpia que da prioridad a los resultados." },
    { id: "crystal-aurora", name: "Cristal aurora", tableDesign: "glass", backgroundDesign: "aurora", description: "Reflejos de cristal sobre luces azules y violetas." },
    { id: "emerald", name: "Esmeralda", tableDesign: "scoreboard", backgroundDesign: "emerald", description: "Un marcador deportivo sobre un degradado verde." },
    { id: "editorial-sunset", name: "Atardecer editorial", tableDesign: "editorial", backgroundDesign: "sunset", description: "Encabezado de alto contraste y un fondo cálido." },
    { id: "matchday", name: "Día de partido", tableDesign: "scoreboard", backgroundDesign: "pitch", description: "Un marcador con las franjas y líneas del terreno de juego." },
    { id: "crystal-emerald", name: "Cristal esmeralda", tableDesign: "glass", backgroundDesign: "emerald", description: "Una tabla translúcida sobre verdes suaves." }
];

// CSS gradients and translucent fills also render in the exported PNG.
// Avoid backdrop-filter: its result can be lost when html-to-image clones the node.
export function getStandingsExportAppearance({
    themeMode = "light",
    tableDesign = "classic",
    backgroundDesign = "solid",
    leagueColors = null
} = {}) {
    const isDark = themeMode === "dark";
    const page = {
        bg: isDark ? "#121212" : "#ffffff",
        text: isDark ? "#f8fafc" : "#0f172a",
        subtext: isDark ? "#b5c3d5" : "#475569",
        border: isDark ? "#334155" : "#cbd5e1",
        primary: isDark ? "#6ee7b7" : "#047857",
        primarySoft: isDark ? "#6ee7b71a" : "#04785714",
        backgroundImage: "none"
    };

    switch (backgroundDesign) {
        case "emerald":
            page.bg = isDark ? "#102920" : "#eaf7f0";
            page.backgroundImage = isDark
                ? "linear-gradient(145deg, #163c2d 0%, #102920 48%, #132e3c 100%)"
                : "linear-gradient(145deg, #f2fcf6 0%, #d5eee0 48%, #dceef5 100%)";
            break;
        case "aurora":
            page.bg = isDark ? "#131e35" : "#edf0ff";
            page.backgroundImage = isDark
                ? "radial-gradient(ellipse at 10% 0%, #354b7a 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, #4b2e65 0%, transparent 60%), linear-gradient(145deg, #131e35, #23203d)"
                : "radial-gradient(ellipse at 10% 0%, #c5ddfc 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, #e0c9f4 0%, transparent 60%), linear-gradient(145deg, #f4f8ff, #edf0ff)";
            page.primary = isDark ? "#c4b5fd" : "#6d28d9";
            page.primarySoft = isDark ? "#c4b5fd1a" : "#6d28d914";
            break;
        case "sunset":
            page.bg = isDark ? "#321d25" : "#fff0e7";
            page.backgroundImage = isDark
                ? "radial-gradient(ellipse at 100% 0%, #623a27 0%, transparent 58%), linear-gradient(155deg, #321d25 15%, #402339 65%, #241b30 100%)"
                : "radial-gradient(ellipse at 100% 0%, #ffdbad 0%, transparent 58%), linear-gradient(155deg, #fff8ec 15%, #ffe7dd 65%, #f6dded 100%)";
            page.primary = isDark ? "#fdba74" : "#9a3412";
            page.primarySoft = isDark ? "#fdba741a" : "#9a341214";
            break;
        case "pitch":
            page.bg = isDark ? "#112c23" : "#e0efe3";
            page.backgroundImage = isDark
                ? "repeating-linear-gradient(0deg, #112c23 0px, #112c23 150px, #17372a 150px, #17372a 300px)"
                : "repeating-linear-gradient(0deg, #e0efe3 0px, #e0efe3 150px, #d2e6d7 150px, #d2e6d7 300px)";
            break;
        default:
            break;
    }

    const table = {
        card: isDark ? "#1e1e1e" : "#ffffff",
        text: page.text,
        subtext: page.subtext,
        border: page.border,
        headerBg: isDark ? "#0f172a" : "#f8fafc",
        headerText: page.subtext,
        primary: page.primary,
        pending: isDark ? "#fbbf24" : "#92400e",
        positive: isDark ? "#4ade80" : "#15803d",
        negative: isDark ? "#f87171" : "#b91c1c",
        zebra: isDark ? "#ffffff08" : "#0f172a08",
        backgroundImage: "none",
        radius: 16,
        borderWidth: 2,
        headerBorderWidth: 3,
        pointsBg: "transparent",
        pointsText: page.primary,
        pointsRadius: 0,
        shadow: "none"
    };

    switch (tableDesign) {
        case "glass":
            table.card = isDark ? "#162536dd" : "#ffffffd9";
            table.backgroundImage = isDark
                ? "linear-gradient(125deg, #ffffff10 0%, transparent 32%, #ffffff06 62%, transparent 62%)"
                : "linear-gradient(125deg, #ffffffc9 0%, #ffffff24 32%, #ffffff80 62%, #ffffff12 62%)";
            table.headerBg = isDark ? "#ffffff0f" : "#ffffff99";
            table.border = isDark ? "#91adc459" : "#ffffff";
            table.zebra = isDark ? "#ffffff06" : "#b7c8dc12";
            table.radius = 24;
            table.borderWidth = 1;
            table.headerBorderWidth = 1;
            table.shadow = isDark ? "0 18px 42px #00000030" : "0 18px 42px #15345314";
            break;
        case "editorial":
            table.card = isDark ? "#1b2533" : "#fffdfa";
            table.headerBg = isDark ? "#e2e8f0" : "#172334";
            table.headerText = isDark ? "#172334" : "#ffffff";
            table.radius = 0;
            table.borderWidth = 0;
            table.headerBorderWidth = 0;
            table.zebra = "transparent";
            break;
        case "scoreboard":
            table.card = isDark ? "#152a24" : "#f8fcf9";
            table.headerBg = isDark ? "#235443" : "#14543d";
            table.headerText = "#ffffff";
            table.radius = 8;
            table.borderWidth = 0;
            table.headerBorderWidth = 0;
            table.zebra = isDark ? "#ffffff09" : "#14543d0b";
            table.pointsBg = isDark ? "#a7f3d0" : "#14543d";
            table.pointsText = isDark ? "#123326" : "#ffffff";
            table.pointsRadius = 6;
            break;
        default:
            break;
    }

    const primary = normalizeHexColor(leagueColors?.primary);
    if (primary) {
        const secondary = normalizeHexColor(leagueColors?.secondary) || mixHexColors(primary, isDark ? "#FFFFFF" : "#111827", 0.28);
        const neutral = isDark ? "#111827" : "#FFFFFF";
        const base = mixHexColors(primary, neutral, isDark ? 0.88 : 0.94);
        const primaryTone = mixHexColors(primary, neutral, isDark ? 0.7 : 0.85);
        const secondaryTone = mixHexColors(secondary, neutral, isDark ? 0.7 : 0.85);
        page.bg = base;
        page.primary = readableAccent(primary, primaryTone);
        page.primary = readableAccent(page.primary, secondaryTone);
        page.primarySoft = `${page.primary}18`;
        page.border = mixHexColors(primary, neutral, isDark ? 0.72 : 0.8);

        switch (backgroundDesign) {
            case "aurora":
                page.backgroundImage = `radial-gradient(ellipse at 10% 0%, ${primaryTone} 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, ${secondaryTone} 0%, transparent 60%), linear-gradient(145deg, ${base}, ${secondaryTone})`;
                break;
            case "emerald":
            case "sunset":
                page.backgroundImage = `linear-gradient(${backgroundDesign === "sunset" ? 155 : 145}deg, ${base} 0%, ${primaryTone} 48%, ${secondaryTone} 100%)`;
                break;
            case "pitch":
                page.backgroundImage = `repeating-linear-gradient(0deg, ${base} 0px, ${base} 150px, ${primaryTone} 150px, ${primaryTone} 300px)`;
                break;
            default:
                page.backgroundImage = "none";
                break;
        }

        table.primary = readableAccent(primary, isDark ? "#1E293B" : "#FFFDFA");
        table.pointsText = table.primary;
        if (tableDesign === "editorial" || tableDesign === "scoreboard") {
            table.headerBg = primary;
            table.headerText = contrastingTextColor(primary);
        } else {
            table.headerBg = mixHexColors(primary, neutral, isDark ? 0.9 : 0.94);
        }
        if (tableDesign === "scoreboard") {
            table.card = mixHexColors(primary, neutral, isDark ? 0.94 : 0.98);
            table.zebra = `${primary}0B`;
            table.pointsBg = secondary;
            table.pointsText = contrastingTextColor(secondary);
        }
    }

    return { page, table };
}
