import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
    RiArrowLeftLine,
    RiCalendarEventLine,
    RiCameraLine,
    RiFileImageLine,
    RiRefreshLine,
    RiScan2Line,
    RiTimeLine,
} from "react-icons/ri";
import { v } from "../../../../../styles/variables";
import { supabase } from "../../../../../supabase/supabase.config";
import { findBestScanMatch } from "../../../../../utils/cedulaScanMatching";
import {
    normalizeScannedDate,
    normalizeScannedTime,
} from "../../../../../utils/scannedScheduleUtils";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2200;
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
]);
const BYE_TEAM = { id: "BYE", name: "DESCANSA", img: null, isBye: true };

const normalizeImageMimeType = (file) => {
    const mimeType = String(file?.type || "").toLowerCase();
    if (mimeType === "image/jpg") return "image/jpeg";
    if (mimeType === "image/x-heic") return "image/heic";
    if (mimeType === "image/x-heif") return "image/heif";
    if (SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) return mimeType;

    const extension = String(file?.name || "").split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg"].includes(extension)) return "image/jpeg";
    if (["png", "webp", "heic", "heif"].includes(extension)) return `image/${extension}`;
    return mimeType;
};

const originalFilePayload = (file) => ({
    blob: file,
    mimeType: normalizeImageMimeType(file),
    fileName: file.name || "rol-de-juego",
});

const loadImageSource = async (file) => {
    if (typeof window.createImageBitmap === "function") {
        try {
            const bitmap = await window.createImageBitmap(file);
            return {
                source: bitmap,
                width: bitmap.width,
                height: bitmap.height,
                release: () => bitmap.close(),
            };
        } catch { /* HEIC/HEIF puede no decodificarse en el navegador. */ }
    }

    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        const release = () => URL.revokeObjectURL(objectUrl);
        image.onload = () => resolve({ source: image, width: image.width, height: image.height, release });
        image.onerror = () => {
            release();
            reject(new Error("El navegador no puede optimizar este formato."));
        };
        image.src = objectUrl;
    });
};

const canvasToBlob = (canvas, mimeType, quality) => new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
});

const fileToScanPayload = async (file) => {
    const sourceMimeType = normalizeImageMimeType(file);
    let decoded = null;
    try {
        decoded = await loadImageSource(file);
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(decoded.width, decoded.height));
        if (scale === 1 && file.size <= 2.5 * 1024 * 1024) return originalFilePayload(file);

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(decoded.width * scale));
        canvas.height = Math.max(1, Math.round(decoded.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas no disponible");
        context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

        const preferredMimeType = sourceMimeType === "image/png" && file.size < 3 * 1024 * 1024
            ? "image/png"
            : sourceMimeType === "image/webp" ? "image/webp" : "image/jpeg";
        let outputMimeType = preferredMimeType;
        let optimizedBlob = await canvasToBlob(canvas, preferredMimeType, 0.9);
        if (!optimizedBlob && preferredMimeType !== "image/jpeg") {
            outputMimeType = "image/jpeg";
            optimizedBlob = await canvasToBlob(canvas, outputMimeType, 0.9);
        }
        if (!optimizedBlob) throw new Error("No se pudo optimizar la imagen.");

        const extension = outputMimeType === "image/png" ? "png" : outputMimeType === "image/webp" ? "webp" : "jpg";
        return { blob: optimizedBlob, mimeType: outputMimeType, fileName: `rol-optimizado.${extension}` };
    } catch {
        return originalFilePayload(file);
    } finally {
        decoded?.release?.();
    }
};

const invokeScanFunctionOnce = async (image, scanContext) => {
    const formData = new FormData();
    formData.append("image", image.blob, image.fileName);
    formData.append("mimeType", image.mimeType);
    formData.append("scanContext", JSON.stringify(scanContext));

    const { data, error } = await supabase.functions.invoke("procesar-rol-juego", { body: formData });
    if (!error) return data;

    const status = Number(error?.context?.status);
    let responseBody = null;
    try {
        const response = typeof error.context?.clone === "function" ? error.context.clone() : error.context;
        responseBody = await response?.json();
    } catch { /* La respuesta no era JSON. */ }

    const invocationError = new Error(responseBody?.error || error.message || "No se pudo escanear el rol de juego.");
    invocationError.code = responseBody?.code || "FUNCTION_ERROR";
    invocationError.retryable = typeof responseBody?.retryable === "boolean"
        ? responseBody.retryable
        : [429, 502, 503, 504].includes(status);
    invocationError.requestId = responseBody?.requestId || error?.context?.headers?.get?.("x-request-id") || "";
    throw invocationError;
};

const invokeScanFunction = invokeScanFunctionOnce;

const matchTeam = (name, teams, usedIds = new Set(), preferredId = "") => {
    const preferred = preferredId
        ? teams.find((team) => String(team.id) === String(preferredId) && !usedIds.has(String(team.id)))
        : null;
    if (preferred) return preferred;

    const available = teams.filter((team) => !usedIds.has(String(team.id)));
    return findBestScanMatch(name, available, (team) => team.name, {
        threshold: 0.46,
        minMargin: 0.07,
        strongThreshold: 0.86,
        team: true,
    })?.option || null;
};

const emptyReviewRow = (index) => ({
    id: `scan-row-${index}-${Date.now()}`,
    rawLocal: "",
    rawVisitor: "",
    localId: "",
    visitorId: "",
    date: "",
    time: "",
    rawSchedule: null,
});

const buildRolJuegoReview = (scan, teams) => {
    const expectedMatches = Math.floor(teams.length / 2);
    const usedIds = new Set();
    const rows = (Array.isArray(scan?.matches) ? scan.matches : [])
        .slice(0, expectedMatches)
        .map((match, index) => {
            const local = matchTeam(match?.localTeam, teams, usedIds, match?.localTeamId);
            if (local) usedIds.add(String(local.id));
            const visitor = matchTeam(match?.visitorTeam, teams, usedIds, match?.visitorTeamId);
            if (visitor) usedIds.add(String(visitor.id));
            return {
                id: `scan-row-${index}-${Date.now()}`,
                rawLocal: String(match?.localTeam || ""),
                rawVisitor: String(match?.visitorTeam || ""),
                localId: local ? String(local.id) : "",
                visitorId: visitor ? String(visitor.id) : "",
                date: normalizeScannedDate(match?.date),
                time: normalizeScannedTime(match?.time),
                rawSchedule: match?.rawSchedule || null,
            };
        });

    while (rows.length < expectedMatches) rows.push(emptyReviewRow(rows.length));

    const bye = teams.length % 2 === 1
        ? matchTeam(scan?.byeTeam, teams, usedIds, scan?.byeTeamId)
        : null;

    return {
        rows,
        byeId: bye ? String(bye.id) : "",
        rawBye: String(scan?.byeTeam || ""),
    };
};

export function RolJuegoScanFlow({
    roundTitle,
    divisionName = "",
    tournamentName = "",
    roundStartDate = "",
    roundEndDate = "",
    teams,
    onCancel,
    onApply,
}) {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewAvailable, setPreviewAvailable] = useState(null);
    const [rawScan, setRawScan] = useState(null);
    const [reviewRows, setReviewRows] = useState([]);
    const [byeId, setByeId] = useState("");
    const [rawBye, setRawBye] = useState("");
    const [preserveDetectedSchedule, setPreserveDetectedSchedule] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");
    const [coarseDevice, setCoarseDevice] = useState(false);
    const uploadInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const progressTimerRef = useRef(null);
    const preparedImageRef = useRef(null);
    const scanInFlightRef = useRef(false);

    const expectedMatches = Math.floor(teams.length / 2);
    const needsBye = teams.length % 2 === 1;

    useEffect(() => {
        const query = window.matchMedia("(pointer: coarse), (max-width: 1024px)");
        const update = () => setCoarseDevice(query.matches);
        update();
        query.addEventListener?.("change", update);
        return () => query.removeEventListener?.("change", update);
    }, []);

    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    useEffect(() => () => {
        if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    }, []);

    const selectFile = useCallback((nextFile) => {
        if (!nextFile) return;
        if (!SUPPORTED_IMAGE_MIME_TYPES.has(normalizeImageMimeType(nextFile))) {
            setErrorMessage("Usa una imagen JPG, PNG, WEBP, HEIC o HEIF.");
            return;
        }
        if (nextFile.size > MAX_FILE_BYTES) {
            setErrorMessage("La imagen debe pesar menos de 12 MB.");
            return;
        }

        setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return URL.createObjectURL(nextFile);
        });
        setFile(nextFile);
        preparedImageRef.current = fileToScanPayload(nextFile);
        setPreviewAvailable(null);
        setRawScan(null);
        setReviewRows([]);
        setByeId("");
        setPreserveDetectedSchedule(false);
        setErrorMessage("");
        setScanProgress(0);
    }, []);

    useEffect(() => {
        const handlePaste = (event) => {
            const pastedFile = [...(event.clipboardData?.files || [])]
                .find((item) => item.type?.startsWith("image/"));
            if (!pastedFile) return;
            event.preventDefault();
            selectFile(pastedFile);
        };
        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [selectFile]);

    const scanContext = useMemo(() => ({
        divisionName,
        tournamentName,
        roundTitle,
        roundStartDate,
        roundEndDate,
        teams: teams.map((team) => ({ id: String(team.id), name: team.name })),
    }), [divisionName, roundEndDate, roundStartDate, roundTitle, teams, tournamentName]);

    const reviewValidation = useMemo(() => {
        const selectedIds = reviewRows.flatMap((row) => [row.localId, row.visitorId]).filter(Boolean);
        if (needsBye && byeId) selectedIds.push(byeId);
        const duplicates = selectedIds.filter((id, index) => selectedIds.indexOf(id) !== index);
        const missingSlots = reviewRows.reduce(
            (total, row) => total + (row.localId ? 0 : 1) + (row.visitorId ? 0 : 1),
            0,
        ) + (needsBye && !byeId ? 1 : 0);
        const allTeamsUsed = new Set(selectedIds).size === teams.length;
        const completeScheduleRows = reviewRows.filter(
            (row) => normalizeScannedDate(row.date) && normalizeScannedTime(row.time)
        ).length;
        return {
            duplicates: new Set(duplicates),
            missingSlots,
            completeScheduleRows,
            scheduleIsValid: !preserveDetectedSchedule || completeScheduleRows === expectedMatches,
            isValid: reviewRows.length === expectedMatches
                && missingSlots === 0
                && duplicates.length === 0
                && allTeamsUsed,
        };
    }, [byeId, expectedMatches, needsBye, preserveDetectedSchedule, reviewRows, teams.length]);

    const scanImage = async () => {
        if (!file || scanInFlightRef.current) return;
        scanInFlightRef.current = true;
        setScanning(true);
        setErrorMessage("");
        setScanProgress(6);
        progressTimerRef.current = window.setInterval(() => {
            setScanProgress((current) => current < 90 ? Math.min(90, current + (current < 50 ? 4 : 2)) : current);
        }, 420);

        try {
            const image = await (preparedImageRef.current || fileToScanPayload(file));
            setScanProgress((current) => Math.max(current, 18));
            const data = await invokeScanFunction(image, scanContext);
            if (!data?.scan) throw new Error(data?.error || "La función no devolvió datos del escaneo.");
            if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
            setScanProgress(100);
            const review = buildRolJuegoReview(data.scan, teams);
            setRawScan(data.scan);
            setReviewRows(review.rows);
            setByeId(review.byeId);
            setRawBye(review.rawBye);
            setPreserveDetectedSchedule(
                review.rows.length === expectedMatches &&
                review.rows.every((row) => row.date && row.time)
            );
        } catch (error) {
            setErrorMessage(error?.message || "No se pudo escanear el rol de juego.");
            setScanProgress(0);
        } finally {
            scanInFlightRef.current = false;
            if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
            setScanning(false);
        }
    };

    const updateRow = (rowId, field, value) => {
        setReviewRows((current) => current.map((row) => row.id === rowId ? { ...row, [field]: value } : row));
    };

    const applyReview = () => {
        if (!reviewValidation.isValid || !reviewValidation.scheduleIsValid) return;
        const teamMap = new Map(teams.map((team) => [String(team.id), team]));
        const pairs = reviewRows.map((row) => ({
            local: teamMap.get(row.localId),
            visitante: teamMap.get(row.visitorId),
            scannedDate: preserveDetectedSchedule ? normalizeScannedDate(row.date) : "",
            scannedTime: preserveDetectedSchedule ? normalizeScannedTime(row.time) : "",
        }));
        if (needsBye) {
            pairs.push({
                local: teamMap.get(byeId),
                visitante: BYE_TEAM,
                scannedDate: "",
                scannedTime: "",
            });
        }
        onApply(pairs, { preserveDetectedSchedule });
    };

    if (!file) {
        return (
            <ScanShell>
                <PanelHeading>
                    <button type="button" onClick={onCancel} aria-label="Volver al fixture"><RiArrowLeftLine /></button>
                    <div>
                        <h4>Escanear rol de juego · {roundTitle}</h4>
                        <p>Sube una imagen clara. Se interpretarán únicamente los cruces de esta jornada.</p>
                    </div>
                </PanelHeading>
                <UploadZone type="button" onClick={() => uploadInputRef.current?.click()}>
                    <RiFileImageLine />
                    <strong>Cargar imagen del rol</strong>
                    <span>{coarseDevice ? "Puedes elegir una foto o tomarla ahora" : "También puedes pegarla con Ctrl/Cmd + V"}</span>
                </UploadZone>
                {errorMessage && <ErrorNotice role="alert">{errorMessage}</ErrorNotice>}
                <ChoiceRow>
                    <SecondaryAction type="button" onClick={onCancel}>Cancelar</SecondaryAction>
                    {coarseDevice && (
                        <SecondaryAction type="button" onClick={() => cameraInputRef.current?.click()}>
                            <RiCameraLine /> Tomar foto
                        </SecondaryAction>
                    )}
                    <PrimaryAction type="button" onClick={() => uploadInputRef.current?.click()}>
                        <RiFileImageLine /> Elegir imagen
                    </PrimaryAction>
                </ChoiceRow>
                <input ref={uploadInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" onChange={(event) => selectFile(event.target.files?.[0])} />
                <input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => selectFile(event.target.files?.[0])} />
            </ScanShell>
        );
    }

    if (!rawScan) {
        return (
            <ScanShell>
                <PanelHeading>
                    <button type="button" onClick={onCancel} aria-label="Volver al fixture"><RiArrowLeftLine /></button>
                    <div><h4>Vista previa · {roundTitle}</h4><p>Comprueba que todos los nombres y cruces sean legibles.</p></div>
                </PanelHeading>
                <PreviewFrame aria-busy={scanning}>
                    {previewAvailable !== false ? (
                        <img src={previewUrl} alt="Rol de juego seleccionado" onLoad={() => setPreviewAvailable(true)} onError={() => setPreviewAvailable(false)} />
                    ) : (
                        <PreviewFallback><RiFileImageLine /><strong>Imagen lista para escanear</strong><span>{file.name}</span></PreviewFallback>
                    )}
                    {scanning && (
                        <ScanningOverlay aria-live="polite">
                            <div className="scan-line" />
                            <div className="scan-status"><RiScan2Line /><span>Interpretando cruces</span><strong>{scanProgress}%</strong></div>
                        </ScanningOverlay>
                    )}
                </PreviewFrame>
                {errorMessage && <ErrorNotice role="alert">{errorMessage}</ErrorNotice>}
                <ChoiceRow>
                    <SecondaryAction type="button" disabled={scanning} onClick={() => { preparedImageRef.current = null; setFile(null); }}>
                        <RiRefreshLine /> Cambiar imagen
                    </SecondaryAction>
                    <PrimaryAction type="button" disabled={scanning} onClick={scanImage}>
                        <RiScan2Line /> {scanning ? `Escaneando ${scanProgress}%` : "Escanear rol"}
                    </PrimaryAction>
                </ChoiceRow>
            </ScanShell>
        );
    }

    return (
        <ScanShell>
            <PanelHeading>
                <button type="button" onClick={() => setRawScan(null)} aria-label="Volver a la imagen"><RiArrowLeftLine /></button>
                <div><h4>Revisar cruces · {roundTitle}</h4><p>Confirma que cada equipo aparezca una sola vez antes de bloquear la jornada.</p></div>
            </PanelHeading>

            <ReviewSummary $valid={reviewValidation.isValid}>
                <strong>{reviewValidation.isValid ? "Jornada completa" : "Revisión necesaria"}</strong>
                <span>{reviewValidation.isValid ? `${teams.length} equipos interpretados` : "Completa los campos marcados y elimina equipos repetidos."}</span>
            </ReviewSummary>

            <ScheduleOption $active={preserveDetectedSchedule}>
                <label>
                    <input
                        type="checkbox"
                        checked={preserveDetectedSchedule}
                        onChange={(event) => setPreserveDetectedSchedule(event.target.checked)}
                    />
                    <span>
                        <strong>Guardar fechas y horas detectadas</strong>
                        <small>Es opcional. Puedes corregirlas antes de aplicar la jornada.</small>
                    </span>
                </label>
                <ScheduleCount $complete={reviewValidation.completeScheduleRows === expectedMatches}>
                    {reviewValidation.completeScheduleRows}/{expectedMatches} horarios completos
                </ScheduleCount>
            </ScheduleOption>

            <MatchReviewList>
                {reviewRows.map((row, index) => (
                    <MatchReviewRow key={row.id}>
                        <span className="match-number">{index + 1}</span>
                        <TeamSelect $invalid={!row.localId || reviewValidation.duplicates.has(row.localId)}>
                            <label htmlFor={`${row.id}-local`}>Local</label>
                            <select id={`${row.id}-local`} value={row.localId} onChange={(event) => updateRow(row.id, "localId", event.target.value)}>
                                <option value="">Selecciona equipo</option>
                                {teams.map((team) => <option key={team.id} value={String(team.id)}>{team.name}</option>)}
                            </select>
                            {row.rawLocal && <small>Leído como: {row.rawLocal}</small>}
                        </TeamSelect>
                        <Versus>VS</Versus>
                        <TeamSelect $invalid={!row.visitorId || reviewValidation.duplicates.has(row.visitorId)}>
                            <label htmlFor={`${row.id}-visitor`}>Visitante</label>
                            <select id={`${row.id}-visitor`} value={row.visitorId} onChange={(event) => updateRow(row.id, "visitorId", event.target.value)}>
                                <option value="">Selecciona equipo</option>
                                {teams.map((team) => <option key={team.id} value={String(team.id)}>{team.name}</option>)}
                            </select>
                            {row.rawVisitor && <small>Leído como: {row.rawVisitor}</small>}
                        </TeamSelect>
                        <ScheduleFields
                            $invalid={preserveDetectedSchedule && !(normalizeScannedDate(row.date) && normalizeScannedTime(row.time))}
                        >
                            <div>
                                <label htmlFor={`${row.id}-date`}><RiCalendarEventLine /> Fecha</label>
                                <input
                                    id={`${row.id}-date`}
                                    type="date"
                                    value={row.date}
                                    onChange={(event) => updateRow(row.id, "date", event.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor={`${row.id}-time`}><RiTimeLine /> Hora</label>
                                <input
                                    id={`${row.id}-time`}
                                    type="time"
                                    value={row.time}
                                    onChange={(event) => updateRow(row.id, "time", event.target.value)}
                                />
                            </div>
                            <small>
                                {row.rawSchedule?.weekdayLabel || row.rawSchedule?.dateLabel || row.rawSchedule?.timeLabel
                                    ? `Detectado: ${[
                                        row.rawSchedule?.weekdayLabel || row.rawSchedule?.dateLabel,
                                        row.rawSchedule?.timeLabel,
                                    ].filter(Boolean).join(" · ")}`
                                    : "Sin horario legible; puedes capturarlo manualmente."}
                            </small>
                        </ScheduleFields>
                    </MatchReviewRow>
                ))}

                {needsBye && (
                    <ByeReview $invalid={!byeId || reviewValidation.duplicates.has(byeId)}>
                        <div><strong>Equipo que descansa</strong><span>La división tiene un número impar de participantes.</span></div>
                        <div className="bye-control">
                            <select value={byeId} onChange={(event) => setByeId(event.target.value)} aria-label="Equipo que descansa">
                                <option value="">Selecciona equipo</option>
                                {teams.map((team) => <option key={team.id} value={String(team.id)}>{team.name}</option>)}
                            </select>
                            {rawBye && <small>Leído como: {rawBye}</small>}
                        </div>
                    </ByeReview>
                )}
            </MatchReviewList>

            {errorMessage && <ErrorNotice role="alert">{errorMessage}</ErrorNotice>}
            {preserveDetectedSchedule && !reviewValidation.scheduleIsValid && (
                <ErrorNotice role="alert">
                    Completa una fecha y una hora válidas para cada partido o desactiva el guardado de horarios.
                </ErrorNotice>
            )}
            <PrivacyNote>La imagen se usa solo para este análisis y no se guarda en el fixture.</PrivacyNote>
            <ChoiceRow>
                <SecondaryAction type="button" onClick={onCancel}>Cancelar</SecondaryAction>
                <PrimaryAction
                    type="button"
                    disabled={!reviewValidation.isValid || !reviewValidation.scheduleIsValid}
                    onClick={applyReview}
                >
                    Aplicar y bloquear jornada
                </PrimaryAction>
            </ChoiceRow>
        </ScanShell>
    );
}

const scanSweep = keyframes`from{transform:translateY(-70px);opacity:0}12%{opacity:1}88%{opacity:1}to{transform:translateY(calc(100% + 10px));opacity:0}`;

const ScanShell = styled.section`
    width: min(900px, 100%); margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 18px;
    @media(max-width:600px){padding:16px 12px;}
`;
const PanelHeading = styled.div`
    display:flex;align-items:flex-start;gap:12px;
    button{width:38px;height:38px;display:grid;place-items:center;border:1px solid ${({theme})=>theme.bg4};border-radius:10px;background:${({theme})=>theme.bgcards};color:${({theme})=>theme.text};cursor:pointer;font-size:1.1rem;flex-shrink:0;}
    button:hover{background:${({theme})=>theme.bg3};} button:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
    h4,p{margin:0;} h4{font-size:1.05rem;color:${({theme})=>theme.text};} p{margin-top:4px;color:${({theme})=>theme.textFade};line-height:1.45;}
`;
const UploadZone = styled.button`
    width:100%;min-height:250px;border:2px dashed ${({theme})=>theme.bg4};border-radius:14px;background:${({theme})=>theme.bgcards};color:${({theme})=>theme.text};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;
    svg{font-size:2rem;color:${v.colorPrincipal};} strong{font-size:1rem;} span{font-size:.82rem;color:${({theme})=>theme.textFade};}
    &:hover{border-color:${v.colorPrincipal};} &:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
`;
const PreviewFrame = styled.div`
    position:relative;min-height:330px;max-height:52vh;border-radius:14px;overflow:hidden;background:#111820;display:grid;place-items:center;
    img{width:100%;height:100%;max-height:52vh;object-fit:contain;display:block;}
`;
const PreviewFallback = styled.div`display:flex;flex-direction:column;align-items:center;gap:8px;color:#fff;padding:32px;text-align:center;svg{font-size:2rem;color:${v.colorPrincipal};}span{opacity:.7;font-size:.82rem;}`;
const ScanningOverlay = styled.div`
    position:absolute;inset:0;display:grid;place-items:center;background:rgba(7,14,20,.56);overflow:hidden;
    .scan-line{position:absolute;left:4%;right:4%;top:0;height:70px;background:linear-gradient(to bottom,${v.colorPrincipal} 0 2px,${v.colorPrincipal}30 2px,transparent 70px);animation:${scanSweep} 2s cubic-bezier(.45,0,.55,1) infinite;}
    .scan-status{position:relative;display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:10px;background:rgba(7,14,20,.92);color:#fff;font-size:.85rem;}.scan-status svg{color:${v.colorPrincipal};}.scan-status strong{font-variant-numeric:tabular-nums;}
    @media(prefers-reduced-motion:reduce){.scan-line{animation:none;top:45%;}}
`;
const ChoiceRow = styled.div`display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;@media(max-width:600px){button{flex:1;}}`;
const Action = styled.button`
    min-height:42px;padding:9px 16px;border-radius:10px;font:inherit;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;
    &:disabled{cursor:not-allowed;opacity:.55;} &:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
`;
const PrimaryAction = styled(Action)`border:1px solid ${v.colorPrincipal};background:${v.colorPrincipal};color:#fff;`;
const SecondaryAction = styled(Action)`border:1px solid ${({theme})=>theme.bg4};background:${({theme})=>theme.bgcards};color:${({theme})=>theme.text};&:hover:not(:disabled){background:${({theme})=>theme.bg3};}`;
const ErrorNotice = styled.div`padding:10px 12px;border-radius:10px;background:${v.colorError}14;color:${v.colorError};font-size:.86rem;font-weight:600;`;
const ReviewSummary = styled.div`
    display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;background:${({$valid})=>$valid ? `${v.colorPrincipal}14` : `${v.colorWarning}16`};color:${({$valid})=>$valid ? v.colorPrincipal : v.colorWarning};
    strong{font-size:.9rem;}span{font-size:.8rem;text-align:right;}@media(max-width:600px){align-items:flex-start;flex-direction:column;span{text-align:left;}}
`;
const ScheduleOption = styled.div`
    display:flex;justify-content:space-between;align-items:center;gap:14px;padding:13px 14px;border-radius:12px;border:1px solid ${({theme,$active})=>$active ? `${v.colorPrincipal}80` : theme.bg4};background:${({theme,$active})=>$active ? `${v.colorPrincipal}0D` : theme.bgcards};
    >label{display:flex;align-items:flex-start;gap:10px;cursor:pointer;}input{width:18px;height:18px;margin-top:2px;accent-color:${v.colorPrincipal};}label span{display:flex;flex-direction:column;gap:3px;}strong{color:${({theme})=>theme.text};font-size:.9rem;}small{color:${({theme})=>theme.textFade};font-size:.76rem;line-height:1.35;}
    @media(max-width:600px){align-items:flex-start;flex-direction:column;}
`;
const ScheduleCount = styled.span`
    flex-shrink:0;padding:5px 8px;border-radius:999px;background:${({$complete})=>$complete ? `${v.colorPrincipal}18` : `${v.colorWarning}18`};color:${({$complete})=>$complete ? v.colorPrincipal : v.colorWarning};font-size:.75rem;font-weight:800;
`;
const MatchReviewList = styled.div`display:flex;flex-direction:column;gap:10px;`;
const MatchReviewRow = styled.div`
    display:grid;grid-template-columns:30px minmax(0,1fr) 34px minmax(0,1fr);align-items:center;gap:10px;padding:12px;border-radius:12px;background:${({theme})=>theme.bgcards};border:1px solid ${({theme})=>theme.bg4};
    .match-number{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:${({theme})=>theme.bg3};color:${({theme})=>theme.textFade};font-size:.78rem;font-weight:800;}
    @media(max-width:650px){grid-template-columns:30px 1fr;align-items:start;.match-number{grid-row:1 / span 3;}.versus{display:none;}}
`;
const ScheduleFields = styled.div`
    grid-column:2 / -1;display:grid;grid-template-columns:minmax(145px,1fr) minmax(125px,.8fr) minmax(190px,1.4fr);align-items:end;gap:10px;padding-top:10px;border-top:1px solid ${({theme})=>theme.bg3};
    >div{display:flex;flex-direction:column;gap:4px;}label{display:flex;align-items:center;gap:5px;color:${({theme})=>theme.textFade};font-size:.72rem;font-weight:700;}label svg{color:${v.colorPrincipal};}input{width:100%;min-height:38px;border:1px solid ${({theme,$invalid})=>$invalid ? v.colorError : theme.bg4};border-radius:8px;background:${({theme})=>theme.bg2};color:${({theme})=>theme.text};padding:7px 9px;font:inherit;font-size:.84rem;}input:focus-visible{outline:3px solid ${v.colorPrincipal}35;outline-offset:1px;}small{align-self:center;color:${({theme})=>theme.textFade};font-size:.74rem;line-height:1.35;}
    @media(max-width:650px){grid-column:2;grid-template-columns:1fr 1fr;small{grid-column:1 / -1;align-self:start;}}
`;
const TeamSelect = styled.div`
    min-width:0;display:flex;flex-direction:column;gap:4px;
    label{font-size:.72rem;font-weight:700;color:${({theme})=>theme.textFade};}
    select{width:100%;min-height:40px;border:1px solid ${({theme,$invalid})=>$invalid ? v.colorError : theme.bg4};border-radius:8px;background:${({theme})=>theme.bg2};color:${({theme})=>theme.text};padding:7px 9px;font:inherit;font-size:.86rem;}
    select:focus-visible{outline:3px solid ${v.colorPrincipal}35;outline-offset:1px;}small{color:${({theme})=>theme.textFade};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
`;
const Versus = styled.span.attrs({ className: "versus" })`text-align:center;color:${({theme})=>theme.textFade};font-size:.7rem;font-weight:800;`;
const ByeReview = styled.div`
    display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px;border-radius:12px;background:${({theme})=>theme.bgcards};border:1px solid ${({theme,$invalid})=>$invalid ? v.colorError : theme.bg4};
    >div:first-child{display:flex;flex-direction:column;gap:3px;}span,small{font-size:.78rem;color:${({theme})=>theme.textFade};}.bye-control{width:min(300px,100%);display:flex;flex-direction:column;gap:4px;}select{min-height:40px;border:1px solid ${({theme})=>theme.bg4};border-radius:8px;background:${({theme})=>theme.bg2};color:${({theme})=>theme.text};padding:7px 9px;font:inherit;}
    @media(max-width:600px){align-items:stretch;flex-direction:column;.bye-control{width:100%;}}
`;
const PrivacyNote = styled.p`margin:0;color:${({theme})=>theme.textFade};font-size:.78rem;text-align:right;`;
