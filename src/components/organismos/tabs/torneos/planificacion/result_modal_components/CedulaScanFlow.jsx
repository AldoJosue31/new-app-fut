import React, { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  RiArrowLeftLine,
  RiCameraLine,
  RiErrorWarningLine,
  RiFileImageLine,
  RiRefreshLine,
  RiScan2Line,
} from "react-icons/ri";
import { v } from "../../../../../../styles/variables";
import { supabase } from "../../../../../../supabase/supabase.config";
import {
  findBestScanMatch,
  getScannedDateReview,
  normalizeScanName,
  resolveScannedPlayerMatches,
  resolveScannedTeamSides,
} from "../../../../../../utils/cedulaScanMatching";
import { normalizeScannedTime } from "../../../../../../utils/scannedScheduleUtils";
import {
  getCedulaScoreDiscrepancies,
  resolveCedulaScores,
} from "../../../../../../utils/cedulaScoreResolution";
import {
  createCedulaScanFingerprint,
  getOrCreateCedulaScanRequest,
} from "../../../../../../utils/cedulaScanRequestCache";
import {
  CEDULA_PLAYER_DETAIL_VERSION,
  getCedulaPlayerDetailRegions,
} from "../../../../../../utils/cedulaPlayerDetailRegions";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2200;
const MAX_PLAYER_DETAIL_SIDE = 2400;
const MAX_PLAYER_DETAIL_BYTES = 2.5 * 1024 * 1024;
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const SCAN_COOLDOWN_STORAGE_KEY = "cedula-scan-cooldown-until-v2";
const DAILY_QUOTA_CODE = "SCAN_DAILY_QUOTA_EXCEEDED";

const readScanCooldownUntil = () => {
  if (typeof window === "undefined") return 0;
  try {
    const value = Number(window.localStorage.getItem(SCAN_COOLDOWN_STORAGE_KEY));
    return Number.isFinite(value) && value > Date.now() ? value : 0;
  } catch {
    return 0;
  }
};

const storeScanCooldownUntil = (value) => {
  try {
    if (value > Date.now()) window.localStorage.setItem(SCAN_COOLDOWN_STORAGE_KEY, String(value));
    else window.localStorage.removeItem(SCAN_COOLDOWN_STORAGE_KEY);
  } catch { /* El bloqueo sigue activo en memoria si localStorage no esta disponible. */ }
};

const secondsUntil = (timestamp) => Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));

const formatCooldown = (seconds) => {
  if (seconds >= 3600) return `${Math.ceil(seconds / 3600)} h`;
  if (seconds >= 60) return `${Math.ceil(seconds / 60)} min`;
  return `${seconds}s`;
};

const normalizeImageMimeType = (file) => {
  const mimeType = String(file?.type || "").toLowerCase();
  if (mimeType === "image/jpg") return "image/jpeg";
  if (mimeType === "image/x-heic") return "image/heic";
  if (mimeType === "image/x-heif") return "image/heif";
  if (SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) return mimeType;

  const extension = String(file?.name || "").split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg"].includes(extension)) return "image/jpeg";
  if (["heic", "heif"].includes(extension)) return `image/${extension}`;
  if (["png", "webp"].includes(extension)) return `image/${extension}`;
  return mimeType;
};

const originalFilePayload = (file) => ({
  blob: file,
  mimeType: normalizeImageMimeType(file),
  fileName: file.name || "cedula",
  detailImages: [],
});

const loadImageSource = async (file) => {
  if (typeof window.createImageBitmap === "function") {
    try {
      const bitmap = await window.createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch { /* El navegador puede no decodificar HEIC/HEIF. */ }
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

const canvasToBlob = (canvas, mimeType, quality) => new Promise(resolve => {
  canvas.toBlob(resolve, mimeType, quality);
});

const playerName = (player) => (
  player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim()
);

const refereeName = (referee) => referee?.full_name || referee?.name || "";

const playerDorsal = (player) => {
  const value = player?.dorsal ?? player?.jersey_number ?? player?.number ?? "";
  return value == null ? "" : String(value).trim().slice(0, 8);
};

const createPlayerDetailImages = async (decoded) => {
  const regions = getCedulaPlayerDetailRegions(decoded.width, decoded.height);
  const details = [];

  for (const region of regions) {
    const scale = Math.min(
      2,
      MAX_PLAYER_DETAIL_SIDE / Math.max(region.width, region.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(region.width * scale));
    canvas.height = Math.max(1, Math.round(region.height * scale));
    const context = canvas.getContext("2d");
    if (!context) continue;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      decoded.source,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    let blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
    if (blob?.size > MAX_PLAYER_DETAIL_BYTES) {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.78);
    }
    if (!blob || blob.size > MAX_PLAYER_DETAIL_BYTES) continue;
    details.push({
      blob,
      mimeType: "image/jpeg",
      fileName: `${region.id}.jpg`,
      label: region.label,
    });
  }

  return details;
};

const fileToScanPayload = async (file) => {
  const sourceMimeType = normalizeImageMimeType(file);
  let decoded = null;
  let detailImages = [];
  try {
    decoded = await loadImageSource(file);
    try {
      detailImages = await createPlayerDetailImages(decoded);
    } catch { /* La imagen completa sigue siendo util si un recorte no se puede crear. */ }
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(decoded.width, decoded.height));
    if (scale === 1 && file.size <= 2.5 * 1024 * 1024) {
      return { ...originalFilePayload(file), detailImages };
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas no disponible");
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

    const preferredMimeType = sourceMimeType === "image/png" && file.size < 3 * 1024 * 1024
      ? "image/png"
      : sourceMimeType === "image/webp" ? "image/webp" : "image/jpeg";
    let optimizedBlob = await canvasToBlob(canvas, preferredMimeType, 0.9);
    let outputMimeType = preferredMimeType;
    if (!optimizedBlob && preferredMimeType !== "image/jpeg") {
      outputMimeType = "image/jpeg";
      optimizedBlob = await canvasToBlob(canvas, outputMimeType, 0.9);
    }
    if (!optimizedBlob) throw new Error("No se pudo optimizar la imagen.");

    const extension = outputMimeType === "image/png" ? "png" : outputMimeType === "image/webp" ? "webp" : "jpg";
    return {
      blob: optimizedBlob,
      mimeType: outputMimeType,
      fileName: `cedula-optimizada.${extension}`,
      detailImages,
    };
  } catch {
    // Gemini admite HEIC/HEIF; si el navegador no puede decodificarlo se envia intacto.
    return { ...originalFilePayload(file), detailImages };
  } finally {
    decoded?.release?.();
  }
};

const invokeScanFunction = async (image, matchContext) => {
  const formData = new FormData();
  formData.append("image", image.blob, image.fileName);
  formData.append("mimeType", image.mimeType);
  formData.append("matchContext", JSON.stringify(matchContext));
  for (const detail of image.detailImages || []) {
    formData.append("detailImages", detail.blob, detail.fileName);
  }
  const clientRequestId = globalThis.crypto?.randomUUID?.() || `cedula-${Date.now()}`;
  const { data, error } = await supabase.functions.invoke("procesar-cedula", {
    body: formData,
    headers: { "x-request-id": clientRequestId },
  });
  if (!error) return data;

  const status = Number(error?.context?.status);
  let responseBody = null;
  try {
    const response = typeof error.context?.clone === "function" ? error.context.clone() : error.context;
    responseBody = await response?.json();
  } catch { /* La respuesta no era JSON. */ }

  const responseHeaders = error?.context?.headers;
  const gatewayCode = responseHeaders?.get?.("sb-error-code") || "";
  const retryAfterHeader = Number(responseHeaders?.get?.("retry-after"));
  const retryAfterSeconds = Number(responseBody?.retryAfterSeconds) || retryAfterHeader || (status === 429 ? 60 : 0);
  const fallbackMessage = status === 429
    ? "El servicio alcanzo temporalmente su limite de lecturas. Espera antes de volver a intentar."
    : error.message;
  const invocationError = new Error(responseBody?.error || fallbackMessage || "No se pudo escanear la cedula.");
  invocationError.code = responseBody?.code || gatewayCode || "FUNCTION_ERROR";
  invocationError.retryable = typeof responseBody?.retryable === "boolean"
    ? responseBody.retryable
    : [429, 502, 503, 504].includes(status);
  invocationError.retryAfterSeconds = Math.max(0, Math.ceil(retryAfterSeconds));
  invocationError.requestId = responseBody?.requestId || responseHeaders?.get?.("x-request-id") || clientRequestId;
  throw invocationError;
};

const getClipboardImage = (clipboardData) => {
  const file = [...(clipboardData?.files || [])].find(item => item.type?.startsWith("image/"));
  if (file) return file;
  const item = [...(clipboardData?.items || [])]
    .find(entry => entry.kind === "file" && entry.type?.startsWith("image/"));
  return item?.getAsFile() || null;
};

const emptyScan = {
  localTeam: { name: "", score: 0 },
  visitorTeam: { name: "", score: 0 },
  referee: "",
  date: "",
  time: "",
  observations: "",
  walkover: { detected: false, absentTeam: "none", absentTeamName: "", evidence: "" },
  penalties: { local: 0, visitor: 0 },
  players: [],
};

export function CedulaScanFlow({
  match,
  referees,
  localPlayers,
  visitPlayers,
  currentDate,
  currentTime,
  onBack,
  onApply,
  showToast,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewAvailable, setPreviewAvailable] = useState(null);
  const [rawScan, setRawScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const initialCooldownUntil = useRef(readScanCooldownUntil());
  const [cooldownUntil, setCooldownUntil] = useState(initialCooldownUntil.current);
  const [cooldownSeconds, setCooldownSeconds] = useState(secondsUntil(initialCooldownUntil.current));
  const [applyScannedDate, setApplyScannedDate] = useState(false);
  const [applyScannedTime, setApplyScannedTime] = useState(false);
  const [scoreResolutions, setScoreResolutions] = useState({});
  const [coarseDevice, setCoarseDevice] = useState(false);
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const progressTimerRef = useRef(null);
  const preparedImageRef = useRef(null);
  const scanInFlightRef = useRef(false);
  const cooldownUntilRef = useRef(initialCooldownUntil.current);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse), (max-width: 1024px)");
    const update = () => setCoarseDevice(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  const scanContext = useMemo(() => ({
    teams: [
      {
        side: "local",
        name: match?.local?.name || "Local",
        players: localPlayers.map(playerName).filter(Boolean),
        playerCandidates: localPlayers
          .map(player => ({ name: playerName(player), dorsal: playerDorsal(player) }))
          .filter(player => player.name),
      },
      {
        side: "visitor",
        name: match?.visitante?.name || "Visitante",
        players: visitPlayers.map(playerName).filter(Boolean),
        playerCandidates: visitPlayers
          .map(player => ({ name: playerName(player), dorsal: playerDorsal(player) }))
          .filter(player => player.name),
      },
    ],
  }), [localPlayers, match, visitPlayers]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => () => {
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
  }, []);

  useEffect(() => {
    cooldownUntilRef.current = cooldownUntil;
    let timerId = null;
    const updateCooldown = () => {
      const remaining = secondsUntil(cooldownUntilRef.current);
      setCooldownSeconds(remaining);
      if (remaining === 0) {
        storeScanCooldownUntil(0);
        if (timerId) window.clearInterval(timerId);
      }
    };
    updateCooldown();
    if (cooldownUntil > Date.now()) timerId = window.setInterval(updateCooldown, 1000);
    return () => {
      if (timerId) window.clearInterval(timerId);
    };
  }, [cooldownUntil]);

  useEffect(() => {
    const syncCooldownAcrossTabs = (event) => {
      if (event.key !== SCAN_COOLDOWN_STORAGE_KEY) return;
      const nextCooldownUntil = Number(event.newValue) || 0;
      cooldownUntilRef.current = nextCooldownUntil;
      setCooldownUntil(nextCooldownUntil);
      setCooldownSeconds(secondsUntil(nextCooldownUntil));
    };
    window.addEventListener("storage", syncCooldownAcrossTabs);
    return () => window.removeEventListener("storage", syncCooldownAcrossTabs);
  }, []);

  const startScanCooldown = useCallback((seconds, code) => {
    const maxDuration = code === DAILY_QUOTA_CODE ? 26 * 60 * 60 : 5 * 60;
    const duration = Math.min(maxDuration, Math.max(1, Math.ceil(Number(seconds) || 0)));
    const nextCooldownUntil = Math.max(cooldownUntilRef.current, Date.now() + duration * 1000);
    cooldownUntilRef.current = nextCooldownUntil;
    storeScanCooldownUntil(nextCooldownUntil);
    setCooldownUntil(nextCooldownUntil);
    setCooldownSeconds(secondsUntil(nextCooldownUntil));
  }, []);

  const selectFile = useCallback((nextFile) => {
    if (!nextFile) return;
    if (!SUPPORTED_IMAGE_MIME_TYPES.has(normalizeImageMimeType(nextFile))) {
      showToast("Usa una imagen JPG, PNG, WEBP, HEIC o HEIF.", "error");
      return;
    }
    if (nextFile.size > MAX_FILE_BYTES) {
      showToast("La imagen debe pesar menos de 12 MB.", "error");
      return;
    }
    setPreviewUrl(URL.createObjectURL(nextFile));
    setFile(nextFile);
    preparedImageRef.current = fileToScanPayload(nextFile)
      .then(payload => ({ payload, error: null }))
      .catch(error => ({ payload: null, error }));
    setPreviewAvailable(null);
    setRawScan(null);
    setScanProgress(0);
    setApplyScannedDate(false);
    setApplyScannedTime(false);
    setScoreResolutions({});
  }, [showToast]);

  const selectPastedFile = useEffectEvent((image) => {
    selectFile(image);
    showToast("Imagen pegada desde el portapapeles.", "success");
  });

  useEffect(() => {
    const handlePaste = (event) => {
      const image = getClipboardImage(event.clipboardData);
      if (!image) return;
      event.preventDefault();
      selectPastedFile(image);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const interpretation = useMemo(() => {
    if (!rawScan) return null;
    const actualTeams = [
      { side: "local", id: match?.local?.id, name: match?.local?.name || "Local" },
      { side: "visit", id: match?.visitante?.id, name: match?.visitante?.name || "Visitante" },
    ];
    const teamAssignment = resolveScannedTeamSides(
      rawScan.localTeam?.name,
      rawScan.visitorTeam?.name,
      actualTeams,
    );
    const localSide = teamAssignment.firstSide;
    const visitorSide = teamAssignment.secondSide;
    const refereeMatch = findBestScanMatch(rawScan.referee, referees, refereeName, {
      threshold: 0.36,
      minMargin: 0.05,
      strongThreshold: 0.82,
    });
    const localPool = localPlayers.map(player => ({ player, scanSide: "local" }));
    const visitPool = visitPlayers.map(player => ({ player, scanSide: "visit" }));
    const scannedRows = (rawScan.players || []).map((scannedPlayer, index) => ({
      scannedPlayer,
      index,
      side: scannedPlayer.team === "visitor"
        ? visitorSide
        : scannedPlayer.team === "local" ? localSide : null,
    }));
    const resolvedPlayers = Array(scannedRows.length);
    const claimedPlayerIds = new Set();
    const resolveRows = (rows, pool) => {
      const matches = resolveScannedPlayerMatches(
        rows.map(row => row.scannedPlayer),
        pool,
        {
          getRowName: row => row.name,
          getRowDorsal: row => row.jerseyNumber,
          getCandidateName: candidate => playerName(candidate.player),
          getCandidateDorsal: candidate => playerDorsal(candidate.player),
          getCandidateKey: (candidate, candidateIndex) => (
            `${candidate.scanSide}:${candidate.player.id ?? candidate.player.player_id ?? candidateIndex}`
          ),
        },
      );
      rows.forEach((row, rowIndex) => {
        const matchResult = matches[rowIndex];
        const candidate = matchResult?.matched || null;
        const candidateId = candidate
          ? `${candidate.scanSide}:${candidate.player.id ?? candidate.player.player_id ?? `${playerName(candidate.player)}|${playerDorsal(candidate.player)}`}`
          : "";
        const conflictsWithResolvedGroup = candidateId && claimedPlayerIds.has(candidateId);
        if (candidateId && !conflictsWithResolvedGroup) claimedPlayerIds.add(candidateId);
        resolvedPlayers[row.index] = {
          ...row.scannedPlayer,
          side: candidate && (teamAssignment.ambiguous || !row.side)
            ? candidate.scanSide
            : row.side,
          matched: candidate && !conflictsWithResolvedGroup ? candidate.player : null,
          confidence: candidate && !conflictsWithResolvedGroup ? matchResult.score : 0,
          matchMethod: candidate && !conflictsWithResolvedGroup ? matchResult.method : null,
          matchReason: conflictsWithResolvedGroup ? "candidate-conflict" : matchResult?.reason || null,
        };
      });
    };

    if (teamAssignment.ambiguous) {
      resolveRows(scannedRows, [...localPool, ...visitPool]);
    } else {
      resolveRows(scannedRows.filter(row => row.side === "local"), localPool);
      resolveRows(scannedRows.filter(row => row.side === "visit"), visitPool);
      resolveRows(scannedRows.filter(row => !row.side), [...localPool, ...visitPool]);
    }
    const players = resolvedPlayers.filter(Boolean);
    const scores = { local: 0, visit: 0 };
    scores[localSide] = Number(rawScan.localTeam?.score) || 0;
    scores[visitorSide] = Number(rawScan.visitorTeam?.score) || 0;
    const penalties = { local: 0, visit: 0 };
    penalties[localSide] = Number(rawScan.penalties?.local) || 0;
    penalties[visitorSide] = Number(rawScan.penalties?.visitor) || 0;
    const scannedWalkover = rawScan.walkover || {};
    let absentSide = null;
    if (scannedWalkover.absentTeam === "local") absentSide = localSide;
    if (scannedWalkover.absentTeam === "visitor") absentSide = visitorSide;
    if (!absentSide && scannedWalkover.absentTeamName) {
      absentSide = findBestScanMatch(scannedWalkover.absentTeamName, actualTeams, team => team.name, {
        threshold: 0.28,
        minMargin: 0.04,
        strongThreshold: 0.76,
        team: true,
      })?.option?.side || null;
    }
    const walkover = {
      detected: Boolean(scannedWalkover.detected),
      absentSide: scannedWalkover.absentTeam === "both" ? "both" : absentSide,
      winnerSide: scannedWalkover.absentTeam === "both"
        ? "both"
        : absentSide === "local"
          ? "visit"
          : absentSide === "visit"
            ? "local"
            : null,
      absentTeamName: scannedWalkover.absentTeamName || "",
      evidence: scannedWalkover.evidence || "",
    };
    return {
      teams: actualTeams,
      teamAssignment,
      localSide,
      visitorSide,
      referee: refereeMatch?.option || null,
      players,
      scores,
      penalties,
      walkover,
      date: rawScan.date || "",
      time: rawScan.time || "",
      observations: rawScan.observations || "",
    };
  }, [localPlayers, match, rawScan, referees, visitPlayers]);

  const scanImage = async () => {
    if (!file || scanInFlightRef.current || Date.now() < cooldownUntilRef.current) return;
    scanInFlightRef.current = true;
    setApplyScannedDate(false);
    setApplyScannedTime(false);
    setScoreResolutions({});
    setScanning(true);
    setScanProgress(6);
    progressTimerRef.current = window.setInterval(() => {
      setScanProgress(current => {
        if (current < 28) return Math.min(28, current + 5);
        if (current < 58) return Math.min(58, current + 3);
        if (current < 80) return Math.min(80, current + 2);
        if (current < 92) return current + 1;
        return current;
      });
    }, 420);
    try {
      const prepared = await (preparedImageRef.current || fileToScanPayload(file)
        .then(payload => ({ payload, error: null }))
        .catch(error => ({ payload: null, error })));
      if (prepared.error || !prepared.payload) throw prepared.error || new Error("No se pudo preparar la imagen.");
      const image = prepared.payload;
      setScanProgress(current => Math.max(current, 18));
      const fingerprintContext = {
        detailVersion: CEDULA_PLAYER_DETAIL_VERSION,
        matchId: match?.id || match?.match_id || match?.partido_id || "",
        localTeamId: match?.local?.id || "",
        visitorTeamId: match?.visitante?.id || "",
        scanContext,
      };
      let fingerprint = "";
      try {
        fingerprint = await createCedulaScanFingerprint(image.blob, fingerprintContext);
      } catch { /* Navegadores antiguos pueden continuar sin cache local. */ }
      const data = fingerprint
        ? await getOrCreateCedulaScanRequest(
          fingerprint,
          () => invokeScanFunction(image, scanContext),
        )
        : await invokeScanFunction(image, scanContext);
      if (!data?.scan) throw new Error(data?.error || "La funcion no devolvio datos del escaneo.");
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
      setScanProgress(100);
      await new Promise(resolve => window.setTimeout(resolve, 320));
      setRawScan({ ...emptyScan, ...data.scan });
    } catch (error) {
      if (error?.retryAfterSeconds > 0) startScanCooldown(error.retryAfterSeconds, error.code);
      let message = error?.message || "No se pudo escanear la cedula.";
      if (error?.context) {
        try {
          const body = await error.context.json();
          message = body?.error || message;
        } catch { /* La respuesta no era JSON. */ }
      }
      showToast(message, "error");
      setScanProgress(0);
    } finally {
      scanInFlightRef.current = false;
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
      setScanning(false);
    }
  };

  const startScanFromKeyboard = useEffectEvent(() => {
    void scanImage();
  });

  useEffect(() => {
    if (!file || rawScan) return undefined;

    const handleEnterToScan = (event) => {
      if (
        event.key !== "Enter"
        || event.repeat
        || event.isComposing
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || event.shiftKey
        || event.defaultPrevented
        || scanInFlightRef.current
        || Date.now() < cooldownUntilRef.current
      ) return;

      const target = event.target;
      const interactiveTarget = target instanceof HTMLElement
        && (
          target.isContentEditable
          || ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"].includes(target.tagName)
        );
      if (interactiveTarget) return;

      event.preventDefault();
      startScanFromKeyboard();
    };

    window.addEventListener("keydown", handleEnterToScan);
    return () => window.removeEventListener("keydown", handleEnterToScan);
  }, [file, rawScan]);

  const scanLocalName = match?.local?.name || "Local";
  const scanVisitorName = match?.visitante?.name || "Visitante";
  const scanRoundName = match?.jornadas?.name || match?.jornada?.name || "";
  const scanSchedule = [
    currentDate,
    currentTime ? String(currentTime).slice(0, 5) : "",
  ].filter(Boolean).join(" · ");
  const scanMatchContext = (
    <ScanMatchContext
      aria-label={`Partido a escanear: ${scanLocalName} contra ${scanVisitorName}`}
    >
      <span className="context-label">Partido a escanear</span>
      <div className="context-teams">
        <strong title={scanLocalName}>{scanLocalName}</strong>
        <span className="context-versus" aria-hidden="true">vs</span>
        <strong title={scanVisitorName}>{scanVisitorName}</strong>
      </div>
      {(scanRoundName || scanSchedule) && (
        <span className="context-schedule">
          {[scanRoundName, scanSchedule].filter(Boolean).join(" · ")}
        </span>
      )}
    </ScanMatchContext>
  );

  if (!file) {
    return (
      <ScanShell>
        <PanelHeading>
          <button type="button" onClick={onBack} aria-label="Volver"><RiArrowLeftLine /></button>
          <div><h4>Escanear cedula</h4><p>Sube una foto clara y completa. La imagen solo se usa durante este escaneo.</p></div>
        </PanelHeading>
        {scanMatchContext}
        <UploadZone tabIndex={0} onClick={() => uploadInputRef.current?.click()}>
          <RiFileImageLine />
          <strong>Cargar imagen</strong>
          {!coarseDevice && <span>Tambien puedes pegarla con Ctrl/Cmd + V</span>}
        </UploadZone>
        <ChoiceRow>
          <SecondaryAction type="button" onClick={() => uploadInputRef.current?.click()}>
            <RiFileImageLine /> Cargar imagen
          </SecondaryAction>
          {coarseDevice && (
            <PrimaryAction type="button" onClick={() => cameraInputRef.current?.click()}>
              <RiCameraLine /> Tomar foto
            </PrimaryAction>
          )}
        </ChoiceRow>
        <input ref={uploadInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" onChange={event => selectFile(event.target.files?.[0])} aria-label="Subir foto de cédula" />
        <input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={event => selectFile(event.target.files?.[0])} aria-label="Tomar foto de cédula" />
      </ScanShell>
    );
  }

  if (!rawScan || !interpretation) {
    const cooldownLabel = formatCooldown(cooldownSeconds);
    return (
      <ScanShell>
        <PanelHeading>
          <button type="button" onClick={onBack} aria-label="Volver"><RiArrowLeftLine /></button>
          <div><h4>Vista previa</h4><p>Comprueba que nombres, marcador y anotaciones sean legibles.</p></div>
        </PanelHeading>
        {scanMatchContext}
        <PreviewFrame aria-busy={scanning}>
          {previewAvailable !== false ? (
            <img
              src={previewUrl}
              alt="Cedula seleccionada"
              onLoad={() => setPreviewAvailable(true)}
              onError={() => setPreviewAvailable(false)}
            />
          ) : (
            <PreviewFallback>
              <RiFileImageLine />
              <strong>Imagen lista para escanear</strong>
              <span>{file.name || "Foto tomada desde el dispositivo"}</span>
              <small>{(file.size / (1024 * 1024)).toFixed(1)} MB · La vista previa no es compatible con este formato</small>
            </PreviewFallback>
          )}
          {scanning && (
            <ScanningOverlay aria-live="polite">
              <div className="scan-line" />
              <div className="scan-status">
                <RiScan2Line />
                <span>Analizando documento</span>
                <strong>{scanProgress}%</strong>
              </div>
            </ScanningOverlay>
          )}
        </PreviewFrame>
        <ChoiceRow>
          {!coarseDevice && !scanning && cooldownSeconds === 0 && (
            <ScanShortcut aria-hidden="true">
              Presiona <kbd>Enter</kbd> para escanear
            </ScanShortcut>
          )}
          <SecondaryAction type="button" disabled={scanning} onClick={() => { preparedImageRef.current = null; setFile(null); setRawScan(null); }}>
            <RiRefreshLine /> Cambiar foto
          </SecondaryAction>
          <ScanProgressButton
            type="button"
            disabled={scanning || cooldownSeconds > 0}
            onClick={scanImage}
            aria-keyshortcuts="Enter"
            $scanning={scanning}
            $progress={scanning ? scanProgress : 100}
            aria-label={scanning
              ? `Escaneando cedula ${scanProgress}%`
              : cooldownSeconds > 0 ? `Reintentar escaneo en ${cooldownLabel}` : "Escanear cedula"}
          >
            <span className="button-content">
              <RiScan2Line /> {scanning
                ? `Escaneando ${scanProgress}%`
                : cooldownSeconds > 0 ? `Reintentar en ${cooldownLabel}` : "Escanear"}
            </span>
          </ScanProgressButton>
        </ChoiceRow>
      </ScanShell>
    );
  }

  const teamsWithoutMatchedPlayers = interpretation.teams.filter(team => (
    Number(interpretation.scores[team.side]) > 0
    && !interpretation.players.some(player => player.side === team.side && player.matched)
  ));
  const automaticallyUnassignedSides = new Set(
    teamsWithoutMatchedPlayers.map(team => team.side),
  );
  const unlinkedPlayers = interpretation.players.filter(
    player => !player.matched && !automaticallyUnassignedSides.has(player.side),
  ).length;
  const uncertainGoalRows = interpretation.players.filter(player => (
    player.goalsLegible === false || player.goalsConfidence === "low"
  ));
  const scoreDiscrepancies = getCedulaScoreDiscrepancies(
    interpretation.scores,
    interpretation.players,
  );
  const hasUnresolvedScores = scoreDiscrepancies.some(
    discrepancy => !scoreResolutions[discrepancy.side],
  );
  const resolvedScores = resolveCedulaScores(
    interpretation.scores,
    interpretation.players,
    scoreResolutions,
  );
  const interpretedPlayerGroups = [
    {
      side: "local",
      name: match?.local?.name || "Local",
      players: interpretation.players.filter(player => player.side === "local"),
    },
    {
      side: "visit",
      name: match?.visitante?.name || "Visitante",
      players: interpretation.players.filter(player => player.side === "visit"),
    },
  ];
  const playersWithoutTeam = interpretation.players.filter(
    player => player.side !== "local" && player.side !== "visit",
  );
  if (playersWithoutTeam.length) {
    interpretedPlayerGroups.push({
      side: "unassigned",
      name: "Equipo por revisar",
      players: playersWithoutTeam,
    });
  }
  const dateReview = getScannedDateReview(currentDate, interpretation.date, applyScannedDate);
  const normalizedCurrentTime = normalizeScannedTime(currentTime);
  const normalizedScannedTime = normalizeScannedTime(interpretation.time);
  const timesMatch = Boolean(normalizedCurrentTime)
    && Boolean(normalizedScannedTime)
    && normalizedCurrentTime === normalizedScannedTime;
  const canApplyScannedDate = dateReview.hasValidScannedDate && !dateReview.datesMatch;
  const canApplyScannedTime = Boolean(normalizedScannedTime) && !timesMatch;
  const hasDetectedScheduleChange = canApplyScannedDate || canApplyScannedTime;
  const dateResultLabel = dateReview.hasValidScannedDate
    ? dateReview.datesMatch
      ? `${dateReview.normalizedScannedDate} · coincide`
      : applyScannedDate
      ? `${dateReview.normalizedScannedDate} · se aplicará`
      : `${dateReview.normalizedCurrentDate || "Sin fecha actual"} · se conserva`
    : dateReview.normalizedCurrentDate || "Sin detectar";
  const timeResultLabel = normalizedScannedTime
    ? timesMatch
      ? `${normalizedScannedTime} · coincide`
      : applyScannedTime
      ? `${normalizedScannedTime} · se aplicará`
      : `${normalizedCurrentTime || "Sin hora actual"} · se conserva`
    : normalizedCurrentTime || "Sin detectar";
  return (
    <ScanShell>
      <PanelHeading>
        <button type="button" onClick={onBack} aria-label="Volver"><RiArrowLeftLine /></button>
        <div><h4>Revisar escaneo</h4><p>Compara lo detectado con los datos registrados antes de aplicarlo.</p></div>
      </PanelHeading>
      <ComparisonGrid>
        <DataColumn>
          <h5>Datos detectados</h5>
          <DataRow label="Equipo detectado 1" value={`${rawScan.localTeam?.name || "Sin detectar"} · ${rawScan.localTeam?.score ?? 0}`} />
          <DataRow label="Equipo detectado 2" value={`${rawScan.visitorTeam?.name || "Sin detectar"} · ${rawScan.visitorTeam?.score ?? 0}`} />
          <DataRow label="Arbitro" value={rawScan.referee || "Sin detectar"} />
          <DataRow label="Fecha" value={rawScan.date || "Sin detectar"} />
          <DataRow label="Hora" value={rawScan.time || "Sin detectar"} />
          <DataRow
            label="Resolucion"
            value={rawScan.walkover?.detected ? `W.O. · ${rawScan.walkover.evidence || "Inasistencia detectada"}` : "Resultado regular"}
          />
          <PlayerList>
            {(rawScan.players || []).map((player, index) => {
              const hasMatch = Boolean(interpretation.players[index]?.matched);
              const scannedName = player.name || "Nombre ilegible";
              const needsGoalReview = player.goalsLegible === false || player.goalsConfidence === "low";
              return (
                <li
                  key={`${player.name}-${index}`}
                  className={`${!hasMatch ? "no-match" : ""} ${needsGoalReview ? "goal-review" : ""}`.trim()}
                >
                  <div className="player-copy">
                    <span>{hasMatch ? scannedName : "Ninguna coincidencia"}{player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}</span>
                    {!hasMatch && <small>Leído como: {scannedName}</small>}
                    {needsGoalReview && <small>Goles dudosos: {player.goalEvidence || "celda poco legible"}</small>}
                  </div>
                  <small className="player-stats" title={player.goalEvidence || undefined}>
                    {player.goals || 0} G{player.ownGoals ? ` · ${player.ownGoals} AG` : ""} · {player.yellowCards || 0} TA · {player.redCards || 0} TR
                  </small>
                </li>
              );
            })}
          </PlayerList>
        </DataColumn>
        <DataColumn>
          <h5>Datos interpretados</h5>
          <DataRow label="Local" value={`${match?.local?.name || "Local"} · ${interpretation.scores.local}`} />
          <DataRow label="Visitante" value={`${match?.visitante?.name || "Visitante"} · ${interpretation.scores.visit}`} />
          <DataRow label="Arbitro" value={interpretation.referee ? refereeName(interpretation.referee) : "Sin coincidencia"} warning={!interpretation.referee && Boolean(rawScan.referee)} />
          <DataRow label="Fecha" value={dateResultLabel} />
          <DataRow label="Hora" value={timeResultLabel} />
          {hasDetectedScheduleChange && (
            <ScheduleOptions aria-label="Programación detectada en la cédula">
              <strong className="schedule-title">Aplicar programación detectada</strong>
              <span className="schedule-help">Opcional. Los datos actuales se conservarán si no seleccionas estas opciones.</span>
              {canApplyScannedDate && (
                <ScheduleApplyToggle>
                  <input
                    id="apply-scanned-date"
                    type="checkbox"
                    checked={applyScannedDate}
                    onChange={event => setApplyScannedDate(event.target.checked)}
                  />
                  <label htmlFor="apply-scanned-date">
                    <strong>Usar fecha detectada</strong>
                    <span>{dateReview.normalizedScannedDate}</span>
                  </label>
                </ScheduleApplyToggle>
              )}
              {canApplyScannedTime && (
                <ScheduleApplyToggle>
                  <input
                    id="apply-scanned-time"
                    type="checkbox"
                    checked={applyScannedTime}
                    onChange={event => setApplyScannedTime(event.target.checked)}
                  />
                  <label htmlFor="apply-scanned-time">
                    <strong>Usar hora detectada</strong>
                    <span>{normalizedScannedTime}</span>
                  </label>
                </ScheduleApplyToggle>
              )}
            </ScheduleOptions>
          )}
          <DataRow
            label="Resolucion"
            value={interpretation.walkover.detected
              ? interpretation.walkover.winnerSide === "both"
                ? "Doble W.O. · ambos pierden"
                : interpretation.walkover.winnerSide
                  ? `Victoria por default · ${interpretation.walkover.winnerSide === "local" ? match?.local?.name : match?.visitante?.name}`
                  : "W.O. detectado · falta elegir ganador"
              : "Resultado regular"}
            warning={interpretation.walkover.detected && !interpretation.walkover.winnerSide}
          />
          <PlayerGroups aria-label="Jugadores interpretados por equipo">
            {interpretedPlayerGroups.map(group => (
              <TeamPlayerGroup key={group.side}>
                <PlayerGroupHeading>
                  <strong>{group.name}</strong>
                  <span>{group.players.length} {group.players.length === 1 ? "jugador" : "jugadores"}</span>
                </PlayerGroupHeading>
                {group.players.length ? (
                  <GroupedPlayerList>
                    {group.players.map((player, index) => {
                      const registeredName = player.matched ? playerName(player.matched) : "";
                      const scannedName = player.name || "Nombre ilegible";
                      const showScannedName = registeredName
                        && normalizeScanName(registeredName) !== normalizeScanName(scannedName);
                      const needsGoalReview = player.goalsLegible === false || player.goalsConfidence === "low";
                      return (
                        <li
                          key={`${group.side}-${player.matched?.id || player.name}-${index}`}
                          className={`${!player.matched ? "unlinked" : ""} ${needsGoalReview ? "goal-review" : ""}`.trim()}
                        >
                          <div className="player-copy">
                            <span>{registeredName || "Ninguna coincidencia"}{player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}</span>
                            {showScannedName && <small>Leído como: {scannedName}</small>}
                            {!registeredName && <small className="match-status">Leído como: {scannedName}</small>}
                            {needsGoalReview && <small className="goal-status">Revisar GOL: {player.goalEvidence || "celda poco legible"}</small>}
                          </div>
                          <small
                            className="player-stats"
                            title={player.goalEvidence || (!registeredName ? "Estas estadisticas individuales no se asignaran a un jugador" : undefined)}
                          >
                            {player.goals || 0} G{player.ownGoals ? ` · ${player.ownGoals} AG` : ""} · {player.yellowCards || 0} TA · {player.redCards || 0} TR
                          </small>
                        </li>
                      );
                    })}
                  </GroupedPlayerList>
                ) : (
                  <PlayerGroupEmpty>Sin jugadores detectados para este equipo.</PlayerGroupEmpty>
                )}
              </TeamPlayerGroup>
            ))}
          </PlayerGroups>
        </DataColumn>
      </ComparisonGrid>
      {scoreDiscrepancies.length > 0 && (
        <ScoreDiscrepancyPanel aria-labelledby="score-discrepancy-title">
          <ScoreDiscrepancyHeading>
            <RiErrorWarningLine aria-hidden="true" />
            <div>
              <strong id="score-discrepancy-title">El marcador y los goles individuales no coinciden</strong>
              <span>Elige cómo guardar el resultado de cada equipo antes de aplicar el escaneo.</span>
            </div>
          </ScoreDiscrepancyHeading>
          <ScoreConflictList>
            {scoreDiscrepancies.map(discrepancy => {
              const teamName = discrepancy.side === "local"
                ? match?.local?.name || "Local"
                : match?.visitante?.name || "Visitante";
              const teamScoreIsHigher = discrepancy.teamScore > discrepancy.playerScore;
              return (
                <ScoreConflict key={discrepancy.side}>
                  <ScoreConflictSummary>
                    <strong>{teamName}</strong>
                    <span>Marcador: {discrepancy.teamScore} · Desglose de jugadores: {discrepancy.playerScore}</span>
                  </ScoreConflictSummary>
                  <ScoreResolutionOptions role="radiogroup" aria-label={`Resolver goles de ${teamName}`}>
                    <ScoreResolutionOption $selected={scoreResolutions[discrepancy.side] === "team"}>
                      <input
                        type="radio"
                        name={`score-resolution-${discrepancy.side}`}
                        value="team"
                        checked={scoreResolutions[discrepancy.side] === "team"}
                        onChange={() => setScoreResolutions(current => ({
                          ...current,
                          [discrepancy.side]: "team",
                        }))}
                      />
                      <span>
                        <strong>Usar marcador del equipo: {discrepancy.teamScore}</strong>
                        <small>{teamScoreIsHigher
                          ? `${discrepancy.difference} ${discrepancy.difference === 1 ? "gol quedará" : "goles quedarán"} sin asignar a un jugador.`
                          : `${discrepancy.difference} ${discrepancy.difference === 1 ? "gol individual excedente no se aplicará" : "goles individuales excedentes no se aplicarán"}; revisa el reparto en Planteles.`}</small>
                      </span>
                    </ScoreResolutionOption>
                    <ScoreResolutionOption $selected={scoreResolutions[discrepancy.side] === "players"}>
                      <input
                        type="radio"
                        name={`score-resolution-${discrepancy.side}`}
                        value="players"
                        checked={scoreResolutions[discrepancy.side] === "players"}
                        onChange={() => setScoreResolutions(current => ({
                          ...current,
                          [discrepancy.side]: "players",
                        }))}
                      />
                      <span>
                        <strong>Usar desglose de jugadores: {discrepancy.playerScore}</strong>
                        <small>El marcador del partido se ajustará a la suma de los goles individuales.</small>
                      </span>
                    </ScoreResolutionOption>
                  </ScoreResolutionOptions>
                </ScoreConflict>
              );
            })}
          </ScoreConflictList>
        </ScoreDiscrepancyPanel>
      )}
      {teamsWithoutMatchedPlayers.map(team => {
        const teamScore = Number(interpretation.scores[team.side]) || 0;
        return (
          <ReviewNotice $tone="warning" key={`unassigned-${team.side}`}>
            Ningún nombre escaneado de {team.name} coincide con su plantel. Se conservará el marcador de {teamScore} {teamScore === 1 ? "gol" : "goles"}; los goles sin una coincidencia quedarán como no asignados.
          </ReviewNotice>
        );
      })}
      {interpretation.teamAssignment.swapped && !interpretation.teamAssignment.ambiguous && (
        <ReviewNotice>El orden de la cedula esta invertido respecto al partido. Cada marcador se conservo junto al nombre de su equipo.</ReviewNotice>
      )}
      {interpretation.teamAssignment.ambiguous && (
        <ReviewNotice>Los nombres de los equipos no dieron una coincidencia suficientemente clara. Revisa ambos marcadores antes de aplicar.</ReviewNotice>
      )}
      {unlinkedPlayers > 0 && (
        <ReviewNotice $tone="warning">
          {unlinkedPlayers} {unlinkedPlayers === 1 ? "nombre detectado no tiene" : "nombres detectados no tienen"} un jugador equivalente en el plantel registrado. El marcador se conservara; sus estadisticas individuales quedaran sin asignar.
        </ReviewNotice>
      )}
      {uncertainGoalRows.length > 0 && (
        <ReviewNotice $tone="warning">
          {uncertainGoalRows.length} {uncertainGoalRows.length === 1 ? "fila tiene" : "filas tienen"} la celda GOL poco legible. No se inventaron goles para esas filas; revisa la imagen antes de aplicar.
        </ReviewNotice>
      )}
      <ChoiceRow>
        <SecondaryAction type="button" onClick={onBack}>Cancelar</SecondaryAction>
        <PrimaryAction
          type="button"
          disabled={hasUnresolvedScores}
          title={hasUnresolvedScores ? "Resuelve las diferencias de goles antes de continuar" : undefined}
          onClick={() => onApply({
            ...interpretation,
            scores: resolvedScores,
            scoreResolutions,
            date: dateReview.normalizedScannedDate,
            time: normalizedScannedTime,
            applyDate: canApplyScannedDate && applyScannedDate,
            applyTime: canApplyScannedTime && applyScannedTime,
          })}
        >
          {hasUnresolvedScores ? "Elige cómo guardar los goles" : "Aplicar escaneo"}
        </PrimaryAction>
      </ChoiceRow>
    </ScanShell>
  );
}

function DataRow({ label, value, warning = false }) {
  return <ScanDataRow $warning={warning}><span>{label}</span><strong>{value}</strong></ScanDataRow>;
}

const ScanShell = styled.section`
  display:flex;
  flex:1;
  flex-direction:column;
  gap:18px;
  min-height:min(660px, calc(100dvh - 150px));
  @media(max-width:700px){
    min-height:min(620px, calc(100dvh - 132px));
  }
`;
const PanelHeading = styled.div`
  display:flex;align-items:flex-start;gap:12px;
  button{width:36px;height:36px;display:grid;place-items:center;border:1px solid ${({theme})=>theme.bg4};border-radius:10px;background:transparent;color:${({theme})=>theme.text};cursor:pointer;font-size:1.1rem;}
  button:hover{background:${({theme})=>theme.bg3};}
  button:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
  h4,p{margin:0;} h4{font-size:1.05rem;} p{margin-top:4px;opacity:.72;line-height:1.45;}
`;
const ScanMatchContext = styled.section`
  display:grid;
  grid-template-columns:auto minmax(0,1fr) auto;
  align-items:center;
  gap:12px;
  min-height:48px;
  padding:9px 12px;
  border:1px solid ${({theme})=>theme.bg4};
  border-radius:12px;
  background:${({theme})=>theme.bg3};
  color:${({theme})=>theme.text};
  .context-label{font-size:.78rem;font-weight:700;opacity:.76;}
  .context-teams{display:flex;align-items:center;justify-content:center;gap:9px;min-width:0;}
  .context-teams strong{min-width:0;max-width:42%;overflow-wrap:anywhere;text-align:center;font-size:.92rem;line-height:1.25;}
  .context-versus{flex:0 0 auto;padding:2px 7px;border-radius:999px;background:${({theme})=>theme.bgcards};font-size:.7rem;font-weight:800;opacity:.78;}
  .context-schedule{font-size:.76rem;font-weight:650;text-align:right;white-space:nowrap;opacity:.72;}
  @media(max-width:700px){
    grid-template-columns:1fr auto;
    gap:7px 10px;
    .context-teams{grid-column:1/-1;grid-row:2;justify-content:flex-start;}
    .context-teams strong{max-width:calc(50% - 24px);}
    .context-schedule{grid-column:2;grid-row:1;max-width:52vw;white-space:normal;}
  }
  @media(max-width:440px){
    grid-template-columns:1fr;
    .context-label,.context-schedule{grid-column:1;text-align:left;}
    .context-label{grid-row:1;}
    .context-teams{grid-row:2;}
    .context-schedule{grid-row:3;max-width:none;}
  }
`;
const UploadZone = styled.button`
  width:100%;min-height:clamp(320px,52vh,560px);flex:1;border:2px dashed ${({theme})=>theme.bg4};border-radius:14px;background:${({theme})=>theme.bg3};color:${({theme})=>theme.text};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;
  svg{font-size:2rem;color:${v.colorPrincipal};} strong{font-size:1rem;} span{font-size:.82rem;opacity:.7;}
  &:hover{border-color:${v.colorPrincipal};} &:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
`;
const ChoiceRow = styled.div`display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;`;
const ScanShortcut = styled.span`
  align-self:center;
  margin-right:auto;
  color:${({theme})=>theme.text};
  font-size:.78rem;
  opacity:.68;
  kbd{
    display:inline-flex;
    min-width:26px;
    min-height:24px;
    align-items:center;
    justify-content:center;
    margin:0 3px;
    padding:2px 7px;
    border:1px solid ${({theme})=>theme.bg4};
    border-radius:6px;
    background:${({theme})=>theme.bg3};
    color:${({theme})=>theme.text};
    font:inherit;
    font-weight:750;
    opacity:1;
  }
`;
const Action = styled.button`
  min-height:40px;padding:9px 16px;border-radius:10px;font:inherit;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;
  &:disabled{cursor:wait;opacity:.62;} &:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
  @media(max-width:600px){flex:1;}
`;
const PrimaryAction = styled(Action)`border:1px solid ${v.colorPrincipal};background:${v.colorPrincipal};color:#fff;`;
const SecondaryAction = styled(Action)`border:1px solid ${({theme})=>theme.bg4};background:transparent;color:${({theme})=>theme.text};&:hover:not(:disabled){background:${({theme})=>theme.bg3};}`;
const ScanProgressButton = styled(Action)`
  position:relative;overflow:hidden;isolation:isolate;border:1px solid ${({$scanning})=>$scanning ? "#17212b" : v.colorPrincipal};background:${({$scanning})=>$scanning ? "#17212b" : v.colorPrincipal};color:#fff;min-width:156px;
  &::before{content:"";position:absolute;inset:0;z-index:0;background:${v.colorPrincipal};transform:scaleX(${({$progress=100})=>Math.max(0,Math.min(100,$progress))/100});transform-origin:left center;transition:transform 220ms cubic-bezier(.22,1,.36,1);}
  .button-content{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;}
  &:disabled{opacity:1;}
  @media(prefers-reduced-motion:reduce){&::before{transition:none;}}
`;
const scanSweep = keyframes`0%{transform:translateY(-56px);opacity:0;}10%{opacity:1;}90%{opacity:1;}100%{transform:translateY(calc(100% + 8px));opacity:0;}`;
const statusPulse = keyframes`0%,100%{opacity:.82;}50%{opacity:1;}`;
const PreviewFrame = styled.div`
  position:relative;height:clamp(420px,64vh,680px);min-width:0;min-height:0;flex:1;border-radius:14px;overflow:hidden;background:#101010;display:flex;align-items:center;justify-content:center;
  img{position:absolute;inset:10px;display:block;width:calc(100% - 20px);height:calc(100% - 20px);object-fit:contain;object-position:center;}
  @media(max-width:700px){height:min(58vh,560px);min-height:320px;}
`;
const PreviewFallback = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;text-align:center;color:#fff;
  svg{font-size:2.2rem;color:${v.colorPrincipal};}strong{font-size:.96rem;}span{max-width:34ch;font-size:.84rem;overflow-wrap:anywhere;}small{max-width:46ch;font-size:.76rem;line-height:1.4;opacity:.68;}
`;
const ScanningOverlay = styled.div`
  position:absolute;inset:0;overflow:hidden;background:rgba(7,14,20,.34);display:flex;align-items:flex-end;justify-content:center;padding:18px;
  .scan-line{position:absolute;left:5%;right:5%;top:0;height:100%;background:linear-gradient(to bottom,${v.colorPrincipal} 0 2px,${v.colorPrincipal}2b 2px,transparent 56px);animation:${scanSweep} 2.1s cubic-bezier(.45,0,.55,1) infinite;}
  .scan-status{position:relative;display:flex;align-items:center;gap:8px;min-height:38px;padding:8px 12px;border-radius:10px;background:rgba(7,14,20,.88);color:#fff;font-size:.82rem;animation:${statusPulse} 1.4s ease-in-out infinite;}
  .scan-status svg{color:${v.colorPrincipal};font-size:1rem;}.scan-status strong{font-variant-numeric:tabular-nums;min-width:34px;text-align:right;}
  @media(prefers-reduced-motion:reduce){.scan-line{top:50%;height:56px;animation:none;opacity:1;}.scan-status{animation:none;}}
`;
const ComparisonGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:1px;background:${({theme})=>theme.bg4};border-radius:14px;overflow:hidden;@media(max-width:760px){grid-template-columns:1fr;}`;
const DataColumn = styled.div`background:${({theme})=>theme.bgcards};padding:16px;min-width:0;h5{margin:0 0 12px;font-size:.94rem;} `;
const ScanDataRow = styled.div`
  display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;padding:8px 0;border-bottom:1px solid ${({theme})=>theme.bg4};font-size:.86rem;
  span{opacity:.68;} strong{font-weight:700;overflow-wrap:anywhere;color:${({$warning})=>$warning ? v.rojo : "inherit"};}
`;
const ScheduleOptions = styled.fieldset`
  display:flex;flex-direction:column;gap:8px;min-width:0;margin:12px 0 0;padding:11px;border:1px solid ${({theme})=>theme.bg4};border-radius:10px;background:${({theme})=>theme.bg3};color:inherit;
  .schedule-title{font-size:.82rem;line-height:1.35;}
  .schedule-help{font-size:.74rem;line-height:1.4;opacity:.72;}
`;
const ScheduleApplyToggle = styled.div`
  display:flex;align-items:flex-start;gap:10px;padding:8px;border-radius:8px;background:${({theme})=>theme.bgcards};
  input{width:18px;height:18px;margin:1px 0 0;accent-color:${v.colorPrincipal};cursor:pointer;flex:0 0 auto;}
  label{display:flex;flex-direction:column;gap:2px;cursor:pointer;font-size:.82rem;line-height:1.35;}
  label strong{font-weight:750;}label span{opacity:.7;}
  &:focus-within{outline:3px solid ${v.colorPrincipal}33;outline-offset:2px;}
`;
const PlayerList = styled.ul`
  list-style:none;margin:12px 0 0;padding:0;max-height:190px;overflow:auto;display:flex;flex-direction:column;gap:4px;
  li{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 8px;border-radius:8px;background:${({theme})=>theme.bg3};font-size:.82rem;}
  li.no-match{color:${v.rojo};}
  li.goal-review{background:${({theme})=>`${theme.tournamentDashboard?.metrics?.warning || "#f59e0b"}12`};}
  .player-copy{display:flex;flex-direction:column;min-width:0;line-height:1.3;}
  .player-copy span{font-weight:650;}
  .player-copy small{white-space:normal;font-size:.7rem;opacity:.82;}
  .player-copy .goal-status{color:${({theme})=>theme.tournamentDashboard?.metrics?.warning || "#f59e0b"};font-weight:650;opacity:1;}
  span{min-width:0;overflow-wrap:anywhere;} small{white-space:nowrap;opacity:.7;}
  .player-stats{flex:0 0 auto;}
`;
const PlayerGroups = styled.div`
  display:flex;flex-direction:column;max-height:270px;overflow:auto;margin-top:12px;border-top:1px solid ${({theme})=>theme.bg4};
`;
const TeamPlayerGroup = styled.section`
  padding:11px 0;border-bottom:1px solid ${({theme})=>theme.bg4};
`;
const PlayerGroupHeading = styled.div`
  display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px;font-size:.82rem;
  strong{font-weight:800;overflow-wrap:anywhere;}
  span{flex:0 0 auto;padding:3px 7px;border-radius:999px;background:${({theme})=>theme.bg3};font-size:.72rem;opacity:.76;}
`;
const GroupedPlayerList = styled(PlayerList)`
  margin:0;max-height:none;overflow:visible;
  .player-copy small{white-space:normal;font-size:.7rem;opacity:.66;}
  li.unlinked{color:${v.rojo};}
  li.unlinked .match-status{color:inherit;font-weight:600;opacity:.82;}
  li.unlinked .player-stats{color:inherit;opacity:.9;}
`;
const PlayerGroupEmpty = styled.p`
  margin:0;padding:6px 8px;color:${({theme})=>theme.text};font-size:.78rem;line-height:1.4;opacity:.64;
`;
const ReviewNotice = styled.p`
  margin:0;padding:10px 12px;border-radius:10px;
  background:${({theme,$tone})=>$tone === "warning"
    ? `${theme.tournamentDashboard?.metrics?.warning || "#f59e0b"}18`
    : `${v.rojo}14`};
  color:${({theme})=>theme.text};font-size:.84rem;line-height:1.4;
`;
const ScoreDiscrepancyPanel = styled.section`
  overflow:hidden;border:1px solid ${({theme})=>theme.tournamentDashboard?.metrics?.warning || "#f59e0b"};border-radius:12px;background:${({theme})=>theme.bgcards};
`;
const ScoreDiscrepancyHeading = styled.div`
  display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:${({theme})=>`${theme.tournamentDashboard?.metrics?.warning || "#f59e0b"}18`};
  >svg{flex:0 0 auto;margin-top:2px;font-size:1.1rem;color:${({theme})=>theme.tournamentDashboard?.metrics?.warning || "#f59e0b"};}
  >div{display:flex;flex-direction:column;gap:3px;min-width:0;}
  strong{font-size:.9rem;line-height:1.35;}span{font-size:.78rem;line-height:1.4;opacity:.78;}
`;
const ScoreConflictList = styled.div`display:flex;flex-direction:column;`;
const ScoreConflict = styled.div`
  display:grid;grid-template-columns:minmax(180px,.72fr) minmax(0,1.6fr);gap:14px;padding:14px;
  &+&{border-top:1px solid ${({theme})=>theme.bg4};}
  @media(max-width:700px){grid-template-columns:1fr;gap:10px;}
`;
const ScoreConflictSummary = styled.div`
  display:flex;flex-direction:column;gap:4px;align-self:start;
  strong{font-size:.88rem;}span{font-size:.78rem;line-height:1.4;opacity:.74;}
`;
const ScoreResolutionOptions = styled.div`display:flex;flex-direction:column;gap:7px;`;
const ScoreResolutionOption = styled.label`
  display:flex;align-items:flex-start;gap:9px;padding:9px 10px;border:1px solid ${({theme,$selected})=>$selected ? v.colorPrincipal : theme.bg4};border-radius:9px;background:${({theme,$selected})=>$selected ? `${v.colorPrincipal}12` : theme.bg3};cursor:pointer;transition:border-color 180ms ease-out,background-color 180ms ease-out;
  input{width:17px;height:17px;margin:1px 0 0;accent-color:${v.colorPrincipal};flex:0 0 auto;cursor:pointer;}
  >span{display:flex;flex-direction:column;gap:2px;min-width:0;}
  strong{font-size:.8rem;line-height:1.35;}small{font-size:.73rem;line-height:1.4;opacity:.74;}
  &:hover{border-color:${v.colorPrincipal};}
  &:focus-within{outline:3px solid ${v.colorPrincipal}33;outline-offset:2px;}
  @media(prefers-reduced-motion:reduce){transition:none;}
`;
