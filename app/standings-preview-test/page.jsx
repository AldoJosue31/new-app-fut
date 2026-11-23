"use client";

import { useState } from "react";
import { ThemeProvider } from "styled-components";
import { Light } from "../../src/styles/themes";
import { GlobalStyles } from "../../src/styles/GlobalStyles";
import MatchSheetModal from "../../src/components/organismos/tabs/torneos/exports/match-sheets/MatchSheetModal";
import { PreMatchSheetModal } from "../../src/components/organismos/tabs/torneos/exports/match-sheets/PreMatchSheetModal";
import { BatchPrintModal } from "../../src/components/organismos/tabs/torneos/exports/match-sheets/BatchPrintModal";
import StandingsExportModal from "../../src/components/organismos/tabs/torneos/exports/standings/StandingsExportModal";

const teams = [{id: 1, name: "Atlético"}, {id: 2, name: "Deportivo"}];
const jornadas = [{id: 1, name: "Jornada 1"}];
const close = (setter) => () => setter("");

export default function ModalFixture() {
    const [open, setOpen] = useState("");
    return (
        <ThemeProvider theme={Light}>
            <GlobalStyles />
            <button onClick={() => setOpen("standings")}>Abrir tabla</button>
            <button onClick={() => setOpen("match")}>Abrir cédula</button>
            <button onClick={() => setOpen("pre")}>Abrir pre-cédula</button>
            <button onClick={() => setOpen("batch")}>Abrir lote</button>
            {open === "standings" && <StandingsExportModal isOpen onClose={close(setOpen)} equipos={teams} jornadas={jornadas} />}
            {open === "match" && <MatchSheetModal isOpen onClose={close(setOpen)} match={1} />}
            {open === "pre" && <PreMatchSheetModal isOpen onClose={close(setOpen)} matchId={1} />}
            {open === "batch" && <BatchPrintModal isOpen onClose={close(setOpen)} matchesToPrint={[{id: 1}, {id: 2}]} />}
        </ThemeProvider>
    );
}
