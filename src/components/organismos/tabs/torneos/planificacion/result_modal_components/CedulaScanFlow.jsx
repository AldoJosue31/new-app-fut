import React, { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCloseCircleLine,
  RiErrorWarningLine,
  RiFileImageLine,
  RiFootballLine,
  RiRefreshLine,
  RiScan2Line,
  RiRectangleFill,
} from "react-icons/ri";
import { v } from "../../../../../../styles/variables";
import { supabase } from "../../../../../../lib/supabase/browserClient.js";
import { DynamicTeamLogo } from "../../../../equipos/DynamicTeamLogo";
import {
  findBestScanMatch,
  getScannedTeamNameMismatches,
  getScannedDateReview,
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
  getCachedCedulaScanResult,
} from "../../../../../../utils/cedulaScanRequestCache";
import { invokeCedulaScan, waitForCedulaScan } from "../../../../../../utils/cedulaScanClient.js";
import {
  CEDULA_PLAYER_DETAIL_VERSION,
  getCedulaPlayerDetailRegions,
} from "../../../../../../utils/cedulaPlayerDetailRegions";
import {
  canvasToBlob,
  prepareImageForScan,
} from "../../../../../../utils/scanImageUtils";
import { useCedulaImageInput } from "../../../../../../hooks/useCedulaImageInput.js";
import { useCedulaPreviewZoom } from "../../../../../../hooks/useCedulaPreviewZoom.js";
import { CedulaImagePicker } from "./CedulaImagePicker";
import { ScanShell, PanelHeading, ChoiceRow, Action, PrimaryAction, SecondaryAction, PreviewFrame, cedulaPreviewZoomStyles } from "./CedulaFlowPrimitives";

const MAX_PLAYER_DETAIL_SIDE = 2400;
const MAX_PLAYER_DETAIL_BYTES = 2.5 * 1024 * 1024;
const SCAN_COOLDOWN_STORAGE_KEY = "cedula-scan-cooldown-until-v3";
const SCAN_COOLDOWN_EVENT = "cedula-scan-cooldown";
const cooldowns = new Map();

const readScanCooldownUntil = (scope) => {
  const inMemory = cooldowns.get(scope) || 0;
  if (typeof window === "undefined") return 0;
  try {
    const value = Math.max(inMemory, Number(window.localStorage.getItem(`${SCAN_COOLDOWN_STORAGE_KEY}:${scope}`)) || 0);
    return Number.isFinite(value) && value > Date.now() ? value : 0;
  } catch {
    return inMemory > Date.now() ? inMemory : 0;
  }
};

const storeScanCooldownUntil = (scope, value) => {
  const previous = cooldowns.get(scope) || 0;
  const current = readScanCooldownUntil(scope);
  const nextValue = value > Date.now() ? Math.max(current, value) : current;
  if (nextValue > Date.now()) cooldowns.set(scope, nextValue);
  else cooldowns.delete(scope);
  try {
    if (nextValue > Date.now()) window.localStorage.setItem(`${SCAN_COOLDOWN_STORAGE_KEY}:${scope}`, String(nextValue));
    else window.localStorage.removeItem(`${SCAN_COOLDOWN_STORAGE_KEY}:${scope}`);
  } catch { /* El bloqueo sigue activo en memoria si localStorage no esta disponible. */ }
  if (previous !== nextValue) window.dispatchEvent(new CustomEvent(SCAN_COOLDOWN_EVENT, { detail: { scope } }));
};

const secondsUntil = (timestamp) => Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));

const formatCooldown = (seconds) => {
  if (seconds >= 3600) return `${Math.ceil(seconds / 3600)} h`;
  if (seconds >= 60) return `${Math.ceil(seconds / 60)} min`;
  return `${seconds}s`;
};

const playerName = (player) => (
  player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim()
);

const refereeName = (referee) => referee?.full_name || referee?.name || "";

const playerDorsal = (player) => {
  const value = player?.dorsal ?? player?.jersey_number ?? player?.number ?? "";
  return value == null ? "" : String(value).trim().slice(0, 8);
};

const toStatNumber = (value) => parseInt(value, 10) || 0;

const createPlayerDetailImages = async (decoded) => {
  const regions = getCedulaPlayerDetailRegions(decoded.width, decoded.height);
  const details = await Promise.all(regions.map(async (region) => {
    const scale = Math.min(
      2,
      MAX_PLAYER_DETAIL_SIDE / Math.max(region.width, region.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(region.width * scale));
    canvas.height = Math.max(1, Math.round(region.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
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
    if (!blob || blob.size > MAX_PLAYER_DETAIL_BYTES) return null;
    return {
      blob,
      mimeType: "image/jpeg",
      fileName: `${region.id}.jpg`,
      label: region.label,
    };
  }));

  return details.filter(Boolean);
};

const fileToScanPayload = (file) => prepareImageForScan(file, {
  fallbackName: "cedula",
  optimizedName: "cedula-optimizada",
  createDetailImages: createPlayerDetailImages,
});

const prepareFileForScan = (file) => {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(Object.assign(
      new Error("No se pudo preparar la imagen a tiempo. Intenta de nuevo o elige otra foto."),
      { code: "SCAN_IMAGE_TIMEOUT", retryable: true },
    )), 20_000);
  });
  return Promise.race([fileToScanPayload(file), deadline])
    .then(payload => ({ payload, error: null }))
    .catch(error => ({ payload: null, error }))
    .finally(() => window.clearTimeout(timer));
};

const fingerprintImage = async (image, context) => {
  const detailHashes = await Promise.all((image.detailImages || []).map(detail => (
    createCedulaScanFingerprint(detail.blob, { mimeType: detail.mimeType })
  )));
  return createCedulaScanFingerprint(image.blob, { ...context, detailHashes }, "cedula-scan-v4-reliability");
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
  savedPhoto,
  referees,
  localPlayers,
  visitPlayers,
  currentDate,
  currentTime,
  onBack,
  onApply,
  showToast,
}) {
  const [file, setFile] = useState(() => savedPhoto?.blob
    ? new File([savedPhoto.blob], "cedula-guardada.jpg", { type: savedPhoto.blob.type || "image/jpeg" })
    : null);
  const [usingSavedPhoto, setUsingSavedPhoto] = useState(Boolean(savedPhoto?.blob));
  const [applying, setApplying] = useState(false);
  const [savePhoto, setSavePhoto] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(() => savedPhoto?.url || "");
  const [previewAvailable, setPreviewAvailable] = useState(null);
  const [rawScan, setRawScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanElapsedSeconds, setScanElapsedSeconds] = useState(0);
  const [scanError, setScanError] = useState(null);
  const [scanScope, setScanScope] = useState("");
  const [hasCachedScan, setHasCachedScan] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [cooldownHydrated, setCooldownHydrated] = useState(false);
  const [cooldownScope, setCooldownScope] = useState("");
  const [applyScannedDate, setApplyScannedDate] = useState(false);
  const [applyScannedTime, setApplyScannedTime] = useState(false);
  const [scoreResolutions, setScoreResolutions] = useState({});
  const [hasAcceptedTeamMismatch, setHasAcceptedTeamMismatch] = useState(false);
  const progressTimerRef = useRef(null);
  const preparedImageRef = useRef(null);
  const scanInFlightRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const scanWaitRef = useRef(null);
  const scanGenerationRef = useRef(0);

  useEffect(() => {
    let active = true;
    const updateScope = (session) => {
      if (active) setScanScope(`${supabase.supabaseUrl}:${session?.user?.id || "anonymous"}`);
    };
    supabase.auth.getSession().then(({ data }) => updateScope(data.session)).catch(() => updateScope(null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => updateScope(session));
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    scanGenerationRef.current += 1;
    scanWaitRef.current?.abort();
    scanInFlightRef.current = false;
    setScanning(false);
    setRawScan(null);
    setScanError(null);
    setHasCachedScan(false);
    if (!scanScope) return undefined;
    const storedCooldownUntil = readScanCooldownUntil(scanScope);
    cooldownUntilRef.current = storedCooldownUntil;
    setCooldownUntil(storedCooldownUntil);
    setCooldownSeconds(secondsUntil(storedCooldownUntil));
    setCooldownScope(scanScope);
    setCooldownHydrated(true);
    return () => {
      scanGenerationRef.current += 1;
      scanWaitRef.current?.abort();
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    };
  }, [scanScope]);

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

  const fingerprintContext = useMemo(() => ({
    scope: scanScope,
    detailVersion: CEDULA_PLAYER_DETAIL_VERSION,
    matchId: match?.id || match?.match_id || match?.partido_id || "",
    localTeamId: match?.local?.id || "",
    visitorTeamId: match?.visitante?.id || "",
    scanContext,
  }), [scanScope, scanContext, match?.id, match?.match_id, match?.partido_id, match?.local?.id, match?.visitante?.id]);

  useEffect(() => {
    let active = true;
    setHasCachedScan(false);
    if (!file || !scanScope) return undefined;
    const preparation = preparedImageRef.current || prepareFileForScan(file);
    preparedImageRef.current = preparation;
    preparation.then(async ({ payload }) => {
      if (!payload) return;
      const fingerprint = await fingerprintImage(payload, fingerprintContext);
      if (active) setHasCachedScan(Boolean(getCachedCedulaScanResult(fingerprint)));
    }).catch(() => { /* El escaneo puede continuar sin cache en navegadores antiguos. */ });
    return () => { active = false; };
  }, [file, fingerprintContext, scanScope]);

  useEffect(() => () => {
    if (previewUrl && previewUrl !== savedPhoto?.url) URL.revokeObjectURL(previewUrl);
  }, [previewUrl, savedPhoto?.url]);

  useEffect(() => {
    if (!cooldownHydrated || cooldownScope !== scanScope) return undefined;

    cooldownUntilRef.current = cooldownUntil;
    let timerId = null;
    const updateCooldown = () => {
      const remaining = secondsUntil(cooldownUntilRef.current);
      setCooldownSeconds(remaining);
      if (remaining === 0) {
        storeScanCooldownUntil(scanScope, 0);
        if (timerId) window.clearInterval(timerId);
      }
    };
    updateCooldown();
    if (cooldownUntil > Date.now()) timerId = window.setInterval(updateCooldown, 1000);
    return () => {
      if (timerId) window.clearInterval(timerId);
    };
  }, [cooldownHydrated, cooldownUntil, scanScope, cooldownScope]);

  useEffect(() => {
    const syncCooldownAcrossTabs = (event) => {
      if (event.key !== `${SCAN_COOLDOWN_STORAGE_KEY}:${scanScope}`) return;
      const nextCooldownUntil = Number(event.newValue) || 0;
      if (nextCooldownUntil > Date.now()) cooldowns.set(scanScope, nextCooldownUntil);
      else cooldowns.delete(scanScope);
      cooldownUntilRef.current = nextCooldownUntil;
      setCooldownUntil(nextCooldownUntil);
      setCooldownSeconds(secondsUntil(nextCooldownUntil));
    };
    const syncCooldownInThisTab = (event) => {
      if (event.detail?.scope !== scanScope) return;
      const nextCooldownUntil = readScanCooldownUntil(scanScope);
      cooldownUntilRef.current = nextCooldownUntil;
      setCooldownUntil(nextCooldownUntil);
      setCooldownSeconds(secondsUntil(nextCooldownUntil));
    };
    window.addEventListener("storage", syncCooldownAcrossTabs);
    window.addEventListener(SCAN_COOLDOWN_EVENT, syncCooldownInThisTab);
    return () => {
      window.removeEventListener("storage", syncCooldownAcrossTabs);
      window.removeEventListener(SCAN_COOLDOWN_EVENT, syncCooldownInThisTab);
    };
  }, [scanScope]);

  const startScanCooldown = useCallback((seconds) => {
    const duration = Math.max(1, Math.ceil(Number(seconds) || 0));
    const nextCooldownUntil = Math.max(cooldownUntilRef.current, Date.now() + duration * 1000);
    cooldownUntilRef.current = nextCooldownUntil;
    storeScanCooldownUntil(scanScope, nextCooldownUntil);
    setCooldownUntil(nextCooldownUntil);
    setCooldownSeconds(secondsUntil(nextCooldownUntil));
  }, [scanScope]);

  const selectFile = useCallback((nextFile) => {
    if (!nextFile) return;
    setUsingSavedPhoto(false);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setFile(nextFile);
    preparedImageRef.current = prepareFileForScan(nextFile);
    setPreviewAvailable(null);
    setRawScan(null);
    setScanError(null);
    setHasCachedScan(false);
    setScanProgress(0);
    setApplyScannedDate(false);
    setApplyScannedTime(false);
    setScoreResolutions({});
    setHasAcceptedTeamMismatch(false);
  }, []);

  const imageInput = useCedulaImageInput({ onSelect: selectFile, showToast, disabled: scanning || applying });
  const { coarseDevice } = imageInput;

  const { zoomClicks: reviewPreviewZoomClicks, handlers: reviewPreviewZoomHandlers } = useCedulaPreviewZoom({ coarseDevice });

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
    const resolveRows = (rows, pool, skippedReason = null) => {
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
          side: row.side,
          matched: candidate && !conflictsWithResolvedGroup ? candidate.player : null,
          confidence: candidate && !conflictsWithResolvedGroup ? matchResult.score : 0,
          matchMethod: candidate && !conflictsWithResolvedGroup ? matchResult.method : null,
          matchReason: skippedReason
            || (conflictsWithResolvedGroup ? "candidate-conflict" : matchResult?.reason || null),
        };
      });
    };

    // El bloque visual del equipo es una frontera estricta: nunca usamos el
    // plantel rival para completar un nombre dudoso o un dorsal coincidente.
    resolveRows(
      scannedRows.filter(row => row.side === "local"),
      localPool,
      localPool.length === 0 ? "no-registered-players" : null,
    );
    resolveRows(
      scannedRows.filter(row => row.side === "visit"),
      visitPool,
      visitPool.length === 0 ? "no-registered-players" : null,
    );
    resolveRows(scannedRows.filter(row => !row.side), [], "unassigned-team");
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
    if (!file || !cooldownHydrated || cooldownScope !== scanScope || !scanScope || scanInFlightRef.current) return;
    scanInFlightRef.current = true;
    const generation = ++scanGenerationRef.current;
    const controller = new AbortController();
    scanWaitRef.current = controller;
    const isCurrent = () => generation === scanGenerationRef.current && !controller.signal.aborted;
    const startedAt = Date.now();
    setApplyScannedDate(false);
    setApplyScannedTime(false);
    setScoreResolutions({});
    setHasAcceptedTeamMismatch(false);
    setScanning(true);
    setScanError(null);
    setScanElapsedSeconds(0);
    setScanProgress(6);
    progressTimerRef.current = window.setInterval(() => {
      if (isCurrent()) setScanElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    try {
      const prepared = await waitForCedulaScan(preparedImageRef.current || prepareFileForScan(file), controller.signal);
      if (prepared.error || !prepared.payload) {
        preparedImageRef.current = null;
        throw prepared.error || new Error("No se pudo preparar la imagen.");
      }
      const image = prepared.payload;
      if (!isCurrent()) return;
      setScanProgress(18);
      let fingerprint = "";
      try {
        fingerprint = await waitForCedulaScan(fingerprintImage(image, fingerprintContext), controller.signal);
      } catch { /* Navegadores antiguos pueden continuar sin cache local. */ }
      if (!isCurrent()) return;
      const requestFactory = async () => {
        const remaining = secondsUntil(readScanCooldownUntil(scanScope));
        if (remaining > 0) throw Object.assign(new Error("Espera a que termine la pausa antes de solicitar otra lectura."), {
          code: "SCAN_COOLDOWN", retryable: true, retryAfterSeconds: remaining,
        });
        try {
          return await invokeCedulaScan(supabase, image, scanContext);
        } catch (error) {
          // La solicitud compartida puede terminar después de salir de esta vista.
          if (error.retryAfterSeconds > 0) storeScanCooldownUntil(scanScope, Date.now() + error.retryAfterSeconds * 1000);
          throw error;
        }
      };
      const request = fingerprint
        ? getOrCreateCedulaScanRequest(fingerprint, requestFactory)
        : requestFactory();
      const data = await waitForCedulaScan(request, controller.signal);
      if (!isCurrent()) return;
      setScanProgress(100);
      setRawScan({ ...emptyScan, ...data.scan });
      setHasCachedScan(Boolean(fingerprint));
    } catch (error) {
      if (!isCurrent() || error.code === "SCAN_CANCELLED") return;
      if (error?.retryAfterSeconds > 0) startScanCooldown(error.retryAfterSeconds);
      const message = error?.message || "No se pudo escanear la cedula.";
      setScanError({ message, retryable: error.retryable, requestId: error.requestId });
      showToast(message, "error");
      setScanProgress(0);
    } finally {
      if (isCurrent()) {
        scanInFlightRef.current = false;
        scanWaitRef.current = null;
        if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
        setScanning(false);
      }
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
        || (!hasCachedScan && Date.now() < cooldownUntilRef.current)
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
  }, [file, rawScan, hasCachedScan]);

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
          <div><h4>Escanear cedula</h4><p>Sube una foto clara y completa. Podrás guardar una copia de la foto con el resultado.</p></div>
        </PanelHeading>
        {scanMatchContext}
        <CedulaImagePicker input={imageInput} />
      </ScanShell>
    );
  }

  if (!rawScan || !interpretation) {
    const cooldownLabel = formatCooldown(cooldownSeconds);
    const waitingForQuota = cooldownSeconds > 0 && !hasCachedScan;
    const scanStatus = scanProgress < 18 ? "Preparando imagen" : scanElapsedSeconds >= 45 ? "La lectura sigue en curso" : "Leyendo cédula";
    return (
      <ScanShell>
        <PanelHeading>
          <button type="button" onClick={onBack} aria-label="Volver"><RiArrowLeftLine /></button>
          <div><h4>Vista previa</h4><p>Comprueba que nombres, marcador y anotaciones sean legibles.</p></div>
        </PanelHeading>
        {scanMatchContext}
        {usingSavedPhoto && <SavedPhotoHint role="status">{savedPhoto?.pending ? 'Foto seleccionada cargada automáticamente.' : 'Foto guardada cargada automáticamente.'} Puedes escanearla o cambiarla.</SavedPhotoHint>}
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
                <span>{scanStatus}</span>
                <strong>{scanElapsedSeconds}s</strong>
              </div>
            </ScanningOverlay>
          )}
        </PreviewFrame>
        {scanError && (
          <ScanErrorNotice role="alert">
            <RiErrorWarningLine aria-hidden="true" />
            <div>
              <strong>{scanError.message}</strong>
              <p>{waitingForQuota
                ? `Puedes volver a intentar en ${cooldownLabel}. La imagen sigue lista.`
                : scanError.retryable === false
                  ? "La imagen sigue lista. Revisa el problema indicado antes de volver a intentar."
                  : "La imagen sigue lista para volver a intentar."}</p>
              {scanError.requestId && <small>Referencia: {scanError.requestId}</small>}
            </div>
          </ScanErrorNotice>
        )}
        <ChoiceRow>
          {!coarseDevice && !scanning && cooldownSeconds === 0 && (
            <ScanShortcut aria-hidden="true">
              Presiona <kbd>Enter</kbd> para escanear
            </ScanShortcut>
          )}
          <SecondaryAction type="button" disabled={scanning} onClick={() => { preparedImageRef.current = null; setFile(null); setPreviewUrl(""); setRawScan(null); setScanError(null); setHasCachedScan(false); setUsingSavedPhoto(false); }}>
            <RiRefreshLine /> Cambiar foto
          </SecondaryAction>
          <ScanProgressButton
            type="button"
            disabled={scanning || !cooldownHydrated || cooldownScope !== scanScope || waitingForQuota}
            onClick={scanImage}
            aria-keyshortcuts="Enter"
            $scanning={scanning}
            $progress={scanning ? scanProgress : 100}
            aria-label={scanning
              ? `${scanStatus}, ${scanElapsedSeconds} segundos`
              : waitingForQuota ? `Reintentar escaneo en ${cooldownLabel}` : "Escanear cedula"}
          >
            <span className="button-content">
              <RiScan2Line /> {scanning
                ? `Leyendo · ${scanElapsedSeconds}s`
                : waitingForQuota ? `Reintentar en ${cooldownLabel}` : hasCachedScan ? "Ver lectura" : scanError ? "Reintentar" : "Escanear"}
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
  const registeredPlayerCounts = {
    local: localPlayers.length,
    visit: visitPlayers.length,
  };
  const sidesWithoutRegisteredPlayers = new Set(
    Object.entries(registeredPlayerCounts)
      .filter(([, count]) => count === 0)
      .map(([side]) => side),
  );
  const unlinkedPlayers = interpretation.players.filter(
    player => !player.matched
      && !automaticallyUnassignedSides.has(player.side)
      && !sidesWithoutRegisteredPlayers.has(player.side),
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
  const teamNameMismatches = getScannedTeamNameMismatches(
    rawScan.localTeam?.name,
    rawScan.visitorTeam?.name,
    interpretation.teams,
    interpretation.teamAssignment,
  );
  const interpretedPlayerGroups = [
    {
      side: "local",
      name: match?.local?.name || "Local",
      players: interpretation.players.filter(player => player.side === "local"),
      registeredPlayerCount: registeredPlayerCounts.local,
    },
    {
      side: "visit",
      name: match?.visitante?.name || "Visitante",
      players: interpretation.players.filter(player => player.side === "visit"),
      registeredPlayerCount: registeredPlayerCounts.visit,
    },
  ];
  const playersWithoutTeam = interpretation.players.filter(
    player => player.side !== "local" && player.side !== "visit",
  );
  const reviewPlayerGroups = interpretedPlayerGroups.filter(group => group.side !== "unassigned");
  if (playersWithoutTeam.length) {
    interpretedPlayerGroups.push({
      side: "unassigned",
      name: "Equipo por revisar",
      players: playersWithoutTeam,
      registeredPlayerCount: null,
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
  const scannedTeamsBySide = {
    [interpretation.localSide]: rawScan.localTeam || {},
    [interpretation.visitorSide]: rawScan.visitorTeam || {},
  };
  const scannedLocalTeam = scannedTeamsBySide.local || {};
  const scannedVisitTeam = scannedTeamsBySide.visit || {};
  const formatTeamScore = (team, fallbackName) => {
    const score = Number(team?.score) || 0;
    return `${team?.name || fallbackName} · ${score} ${score === 1 ? "gol" : "goles"}`;
  };
  const interpretedResolution = interpretation.walkover.detected
    ? interpretation.walkover.winnerSide === "both"
      ? "Doble W.O. · ambos pierden"
      : interpretation.walkover.winnerSide
        ? `Victoria por default · ${interpretation.walkover.winnerSide === "local" ? match?.local?.name : match?.visitante?.name}`
        : "W.O. detectado · falta elegir ganador"
    : "Resultado regular";
  const scannedResolution = rawScan.walkover?.detected
    ? `W.O. · ${rawScan.walkover.evidence || "Inasistencia detectada"}`
    : "Resultado regular";
  const applyScan = async () => {
    if (applying) return;
    setApplying(true);
    try {
      await onApply({
        ...interpretation,
        scores: resolvedScores,
        scoreResolutions,
        date: dateReview.normalizedScannedDate,
        time: normalizedScannedTime,
        applyDate: canApplyScannedDate && applyScannedDate,
        applyTime: canApplyScannedTime && applyScannedTime,
        photoFile: savePhoto && !usingSavedPhoto ? file : null,
      });
    } catch (error) {
      showToast('No se pudo preparar la foto: ' + error.message, 'error');
    } finally {
      setApplying(false);
    }
  };
  const scanAnotherImage = () => {
    if (applying) return;
    preparedImageRef.current = null;
    setFile(null);
    setUsingSavedPhoto(false);
    setPreviewUrl("");
    setPreviewAvailable(null);
    setRawScan(null);
    setScanProgress(0);
    setApplyScannedDate(false);
    setApplyScannedTime(false);
    setScoreResolutions({});
    setHasAcceptedTeamMismatch(false);
  };

  if (teamNameMismatches.length > 0 && !hasAcceptedTeamMismatch) {
    const mismatchCount = teamNameMismatches.length;
    const mismatchedPositions = new Set(teamNameMismatches.map(item => item.position));
    const scannedTeams = [
      {
        position: "first",
        label: "Equipo detectado 1",
        name: rawScan.localTeam?.name || "Sin detectar",
        score: Number(rawScan.localTeam?.score) || 0,
      },
      {
        position: "second",
        label: "Equipo detectado 2",
        name: rawScan.visitorTeam?.name || "Sin detectar",
        score: Number(rawScan.visitorTeam?.score) || 0,
      },
    ];
    const scheduledTeams = [
      { label: "Local", team: match?.local },
      { label: "Visitante", team: match?.visitante },
    ];

    return (
      <ScanShell $warning>
        <PanelHeading>
          <button
            type="button"
            onClick={onBack}
            aria-label="Salir del escaneo"
          >
            <RiArrowLeftLine />
          </button>
          <div>
            <h4>Validación de cédula</h4>
            <p>Compara los equipos detectados antes de revisar el resultado.</p>
          </div>
        </PanelHeading>
        <TeamMismatchScreen role="alert" aria-labelledby="team-mismatch-title">
          <TeamMismatchHero>
            <MismatchIcon aria-hidden="true"><RiErrorWarningLine /></MismatchIcon>
            <div className="hero-copy">
              <h5 id="team-mismatch-title">Esta cédula parece corresponder a otro partido</h5>
              <p>
                {mismatchCount === 1
                  ? "Uno de los nombres detectados es claramente diferente al equipo programado."
                  : "Los dos nombres detectados son claramente diferentes a los equipos programados."}
                {" "}Detuvimos la asociación de jugadores para evitar registrar datos en el encuentro equivocado.
              </p>
            </div>
            <MismatchStatus>{mismatchCount} {mismatchCount === 1 ? "diferencia" : "diferencias"}</MismatchStatus>
          </TeamMismatchHero>

          <TeamMismatchComparison aria-label="Comparación entre la cédula y el partido programado">
            <MismatchTeamPanel $tone="detected">
              <MismatchPanelHeading>
                <div>
                  <strong>Cédula escaneada</strong>
                  <span>Nombres y marcador detectados</span>
                </div>
              </MismatchPanelHeading>
              <MismatchTeamRows>
                {scannedTeams.map(team => {
                  const doesNotMatch = mismatchedPositions.has(team.position);
                  return (
                    <DetectedTeamRow key={team.position} $mismatch={doesNotMatch}>
                      <div className="team-copy">
                        <span>{team.label}</span>
                        <strong>{team.name}</strong>
                      </div>
                      {doesNotMatch && <span className="mismatch-label">No coincide</span>}
                      <span className="detected-score" aria-label={`${team.score} goles`}>{team.score}</span>
                    </DetectedTeamRow>
                  );
                })}
              </MismatchTeamRows>
            </MismatchTeamPanel>

            <MismatchConnector aria-hidden="true">
              <RiCloseCircleLine />
              <span>No corresponde a</span>
            </MismatchConnector>

            <MismatchTeamPanel>
              <MismatchPanelHeading>
                <div>
                  <strong>Partido programado</strong>
                  <span>Equipos que deben jugar este encuentro</span>
                </div>
              </MismatchPanelHeading>
              <MismatchTeamRows>
                {scheduledTeams.map(({ label, team }) => (
                  <ScheduledTeamRow key={label}>
                    <div className="registered-logo">
                      {team?.logo_url
                        ? <img src={team.logo_url} alt="" />
                        : <DynamicTeamLogo name={team?.name || label} color={team?.color} size="44px" />}
                    </div>
                    <div className="team-copy">
                      <span>{label}</span>
                      <strong>{team?.name || label}</strong>
                    </div>
                  </ScheduledTeamRow>
                ))}
              </MismatchTeamRows>
            </MismatchTeamPanel>
          </TeamMismatchComparison>

          <MismatchSafetyNote>
            <RiErrorWarningLine aria-hidden="true" />
            <span>Ningún jugador, marcador o dato de esta cédula se aplicará sin tu confirmación.</span>
          </MismatchSafetyNote>
        </TeamMismatchScreen>
        <MismatchActionBar>
          <div className="action-copy">
            <strong>¿Qué deseas hacer?</strong>
            <span>Recomendamos escanear la cédula correcta.</span>
          </div>
          <div className="actions">
            <PrimaryAction type="button" onClick={scanAnotherImage}>
              <RiRefreshLine /> Escanear otra cédula
            </PrimaryAction>
            <ContinueAnywayAction type="button" onClick={() => setHasAcceptedTeamMismatch(true)}>
              Revisar de todas maneras <RiArrowRightLine />
            </ContinueAnywayAction>
          </div>
        </MismatchActionBar>
      </ScanShell>
    );
  }

  return (
    <ScanShell $review>
      <PanelHeading>
        <button type="button" onClick={onBack} disabled={applying} aria-label="Volver"><RiArrowLeftLine /></button>
        <div>
          <h4>Resultado escaneado</h4>
          <p>La cedula queda a la izquierda; a la derecha revisas el partido interpretado, los jugadores y las diferencias.</p>
        </div>
      </PanelHeading>
      <ReviewScrollArea
        tabIndex={0}
        aria-label="Imagen de la cedula y datos interpretados del escaneo"
      >
        <ReviewWorkspace>
          <ReviewMediaPanel aria-labelledby="review-image-title">
            <ReviewMediaHeader>
              <div>
                <span>Documento escaneado</span>
                <strong id="review-image-title">Cedula capturada</strong>
              </div>
              <small>Pasa el cursor para ampliar. Clic o rueda ajustan el zoom. En móvil mantiene la vista completa.</small>
            </ReviewMediaHeader>
            <ReviewPreviewFrame
              $zoomClicks={reviewPreviewZoomClicks}
              aria-busy={scanning}
              aria-label="Vista ampliable de la cédula. Haz clic o usa la rueda para ajustar el zoom."
              role="button"
              tabIndex={0}
              {...reviewPreviewZoomHandlers}
            >
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
                  <strong>Imagen lista para revisar</strong>
                  <span>{file.name || "Foto tomada desde el dispositivo"}</span>
                  <small>{(file.size / (1024 * 1024)).toFixed(1)} MB ? La vista previa no es compatible con este formato</small>
                </PreviewFallback>
              )}
            </ReviewPreviewFrame>
          </ReviewMediaPanel>

          <ReviewSidebar>
            <ReviewDataPanel aria-labelledby="review-data-title">
              <h5 id="review-data-title">Datos del partido</h5>
              <MatchDataColumns role="group" aria-label="Marcador interpretado del partido">
                <TeamScoreColumn
                  sideLabel="Local"
                  teamName={match?.local?.name || "Local"}
                  score={interpretation.scores.local}
                  scannedValue={formatTeamScore(scannedLocalTeam, "Sin detectar")}
                />
                <TeamScoreColumn
                  sideLabel="Visitante"
                  teamName={match?.visitante?.name || "Visitante"}
                  score={interpretation.scores.visit}
                  scannedValue={formatTeamScore(scannedVisitTeam, "Sin detectar")}
                />
              </MatchDataColumns>
              <ScheduleDataColumns role="group" aria-label="Programacion y arbitro interpretados del partido">
                <MatchDataColumn
                  label="Fecha"
                  value={dateResultLabel}
                  scannedValue={rawScan.date || "Sin detectar"}
                />
                <MatchDataColumn
                  label="Hora"
                  value={timeResultLabel}
                  scannedValue={rawScan.time || "Sin detectar"}
                />
                <MatchDataColumn
                  label="Arbitro"
                  value={interpretation.referee ? refereeName(interpretation.referee) : "Sin coincidencia"}
                  scannedValue={rawScan.referee || "Sin detectar"}
                  warning={!interpretation.referee && Boolean(rawScan.referee)}
                />
              </ScheduleDataColumns>
              {hasDetectedScheduleChange && (
                <ScheduleOptions aria-label="Programacion detectada en la cedula">
                  <strong className="schedule-title">Aplicar programacion detectada</strong>
                  <span className="schedule-help">Opcional. Los datos actuales se conservaran si no seleccionas estas opciones.</span>
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
                value={interpretedResolution}
                scannedValue={scannedResolution}
                warning={interpretation.walkover.detected && !interpretation.walkover.winnerSide}
              />
            </ReviewDataPanel>

            {scoreDiscrepancies.length > 0 && (
              <ScoreDiscrepancyPanel aria-labelledby="score-discrepancy-title">
                <ScoreDiscrepancyHeading>
                  <RiErrorWarningLine aria-hidden="true" />
                  <div>
                    <strong id="score-discrepancy-title">El marcador y los goles individuales no coinciden</strong>
                    <span>Elige como guardar el resultado de cada equipo antes de aplicar el escaneo.</span>
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
                          <span>Marcador: {discrepancy.teamScore} ? Desglose de jugadores: {discrepancy.playerScore}</span>
                        </ScoreConflictSummary>
                        <ScoreResolutionOptions role="radiogroup" aria-label={'Resolver goles de ' + teamName}>
                          <ScoreResolutionOption $selected={scoreResolutions[discrepancy.side] === "team"}>
                            <input
                              type="radio"
                              name={'score-resolution-' + discrepancy.side}
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
                                ? discrepancy.difference + " " + (discrepancy.difference === 1 ? "gol quedara" : "goles quedaran") + " sin asignar a un jugador."
                                : discrepancy.difference + " " + (discrepancy.difference === 1 ? "gol individual excedente no se aplicara" : "goles individuales excedentes no se aplicaran") + "; revisa el reparto en Planteles."}</small>
                            </span>
                          </ScoreResolutionOption>
                          <ScoreResolutionOption $selected={scoreResolutions[discrepancy.side] === "players"}>
                            <input
                              type="radio"
                              name={'score-resolution-' + discrepancy.side}
                              value="players"
                              checked={scoreResolutions[discrepancy.side] === "players"}
                              onChange={() => setScoreResolutions(current => ({
                                ...current,
                                [discrepancy.side]: "players",
                              }))}
                            />
                            <span>
                              <strong>Usar desglose de jugadores: {discrepancy.playerScore}</strong>
                              <small>El marcador del partido se ajustara a la suma de los goles individuales.</small>
                            </span>
                          </ScoreResolutionOption>
                        </ScoreResolutionOptions>
                      </ScoreConflict>
                    );
                  })}
                </ScoreConflictList>
              </ScoreDiscrepancyPanel>
            )}

            <ReviewPlayersPanel aria-labelledby="review-players-title">
              <ReviewSectionHeader>
                <div>
                  <strong id="review-players-title">Jugadores interpretados</strong>
                  <span>El nombre interpretado va arriba, la lectura escaneada debajo y las tarjetas quedan junto al nombre.</span>
                </div>
              </ReviewSectionHeader>
              <PlayerGroups aria-label="Jugadores interpretados con lectura escaneada por equipo">
                {reviewPlayerGroups.map(group => (
                  <TeamPlayerGroup key={group.side}>
                    <PlayerGroupHeading>
                      <div className="group-copy">
                        <span>{group.side === "local" ? "Equipo local" : "Equipo B"}</span>
                        <strong>{group.name}</strong>
                      </div>
                      <span>{group.registeredPlayerCount === 0
                        ? "Sin plantel"
                        : group.players.length + " " + (group.players.length === 1 ? "jugador" : "jugadores")}</span>
                    </PlayerGroupHeading>
                    {group.registeredPlayerCount === 0 && (
                      <PlayerGroupEmpty>
                        Este equipo no tiene jugadores registrados. Se omite la interpretacion de nombres
                        {Number(interpretation.scores[group.side]) > 0
                          ? " y sus " + interpretation.scores[group.side] + " " + (Number(interpretation.scores[group.side]) === 1 ? "gol quedara" : "goles quedaran") + " sin asignar."
                          : " y no se asignaran estadisticas individuales."}
                      </PlayerGroupEmpty>
                    )}
                    {group.players.length ? (
                      <GroupedPlayerList>
                        {group.players.map((player, index) => {
                          const registeredName = player.matched ? playerName(player.matched) : "";
                          const scannedName = player.name || "Nombre ilegible";
                          const goalCount = Math.max(0, toStatNumber(player.goals));
                          const yellowCards = Math.max(0, toStatNumber(player.yellowCards));
                          const redCards = Math.max(0, toStatNumber(player.redCards));
                          const needsGoalReview = player.goalsLegible === false || player.goalsConfidence === "low";
                          return (
                            <li
                              key={group.side + "-" + (player.matched?.id || player.name) + "-" + index}
                              className={[
                                !player.matched ? "unlinked" : "",
                                needsGoalReview ? "goal-review" : "",
                              ].filter(Boolean).join(" ")}
                            >
                              <div className="player-copy">
                                <div className="player-header">
                                  <span className="player-name">{registeredName || "Sin coincidencia"}</span>
                                  {(yellowCards > 0 || redCards > 0) && (
                                    <div className="player-badges" aria-label="Tarjetas detectadas">
                                      {yellowCards > 0 && (
                                        <span
                                          className="player-badge player-badge--yellow"
                                          title={`${yellowCards} ${yellowCards === 1 ? "tarjeta amarilla" : "tarjetas amarillas"}`}
                                        >
                                          <RiRectangleFill aria-hidden="true" />
                                          {yellowCards}
                                        </span>
                                      )}
                                      {redCards > 0 && (
                                        <span
                                          className="player-badge player-badge--red"
                                          title={`${redCards} ${redCards === 1 ? "tarjeta roja" : "tarjetas rojas"}`}
                                        >
                                          <RiRectangleFill aria-hidden="true" />
                                          {redCards}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <small className="scanned-value">Escaneado: {scannedName}{player.jerseyNumber ? " ? #" + player.jerseyNumber : ""}</small>
                                {needsGoalReview && <small className="goal-status">Revisar GOL: {player.goalEvidence || "celda poco legible"}</small>}
                              </div>
                              {goalCount > 0 && (
                                <span
                                  className="player-stats player-badge player-badge--goal"
                                  title={player.goalEvidence || (!registeredName ? "Estas estadisticas individuales no se asignaran a un jugador" : undefined)}
                                >
                                  <RiFootballLine aria-hidden="true" />
                                  {goalCount}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </GroupedPlayerList>
                    ) : (
                      group.registeredPlayerCount !== 0 && <PlayerGroupEmpty>Sin jugadores detectados para este equipo.</PlayerGroupEmpty>
                    )}
                  </TeamPlayerGroup>
                ))}
              </PlayerGroups>
            </ReviewPlayersPanel>
            {teamsWithoutMatchedPlayers.map(team => {
              const teamScore = Number(interpretation.scores[team.side]) || 0;
              const hasRegisteredRoster = registeredPlayerCounts[team.side] > 0;
              return (
                <ReviewNotice $tone="warning" key={'unassigned-' + team.side}>
                  {hasRegisteredRoster
                    ? "Ningun nombre escaneado de " + team.name + " coincide de forma segura con su plantel. Se conservara el marcador de " + teamScore + " " + (teamScore === 1 ? "gol" : "goles") + "; los goles quedaran sin asignar."
                    : team.name + " no tiene jugadores registrados. Se omite la interpretacion de nombres y el marcador de " + teamScore + " " + (teamScore === 1 ? "gol quedara" : "goles quedaran") + " sin asignar."}
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
          </ReviewSidebar>
        </ReviewWorkspace>
      </ReviewScrollArea>
      {usingSavedPhoto ? <SavedPhotoHint role="status">{savedPhoto?.pending ? 'La foto se guardará con el resultado.' : 'La foto ya está guardada con este partido.'}</SavedPhotoHint> : (
        <PhotoRetentionChoice>
          <input type="checkbox" checked={savePhoto} disabled={applying} onChange={event => setSavePhoto(event.target.checked)} />
          <span>Guardar foto de la cédula con el marcador <small>La copia se comprime y se elimina al finalizar el torneo.</small></span>
        </PhotoRetentionChoice>
      )}
      <ChoiceRow>
        <SecondaryAction type="button" onClick={onBack} disabled={applying}>Cancelar</SecondaryAction>
        <PrimaryAction
          type="button"
          disabled={hasUnresolvedScores || applying}
          title={hasUnresolvedScores ? "Resuelve las diferencias de goles antes de continuar" : undefined}
          onClick={applyScan}
        >
          {applying ? "Preparando foto…" : hasUnresolvedScores ? "Elige como guardar los goles" : "Aplicar escaneo"}
        </PrimaryAction>
      </ChoiceRow>
    </ScanShell>
  );

}

const PhotoRetentionChoice = styled.label`
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  color: ${({ theme }) => theme.text}; cursor: pointer; font-size: .85rem;
  input { width: 18px; height: 18px; flex-shrink: 0; }
  small { display: block; font-size: .75rem; margin-top: 4px; }
`;

function DataRow({ label, value, scannedValue, warning = false }) {
  return (
    <ScanDataRow $warning={warning}>
      <span className="field-label">{label}</span>
      <div className="field-values">
        <strong>{value}</strong>
        {scannedValue && <small>Escaneado: {scannedValue}</small>}
      </div>
    </ScanDataRow>
  );
}

function MatchDataColumn({ label, value, scannedValue, warning = false }) {
  return (
    <DataColumn $warning={warning}>
      <span className="field-label">{label}</span>
      <strong className="field-value">{value}</strong>
      {scannedValue && <small>Escaneado: {scannedValue}</small>}
    </DataColumn>
  );
}

function TeamScoreColumn({ sideLabel, teamName, score, scannedValue }) {
  const scoreValue = Math.max(0, toStatNumber(score));

  return (
    <DataColumn>
      <span className="field-label">{sideLabel}</span>
      <strong className="team-name">{teamName}</strong>
      <span className="score-value">
        <strong>{scoreValue}</strong>
        <span>{scoreValue === 1 ? "gol" : "goles"}</span>
      </span>
      {scannedValue && <small>Escaneado: {scannedValue}</small>}
    </DataColumn>
  );
}

const ScanMatchContext = styled.section`
  display:grid;
  flex-shrink:0;
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
const SavedPhotoHint = styled.p`
  margin:0;
  flex-shrink:0;
  color:${({theme})=>theme.text};
  font-size:.82rem;
  line-height:1.4;
`;
const ScanErrorNotice = styled.div`
  display:flex;gap:10px;padding:12px;flex-shrink:0;
  border:1px solid ${v.rojo}55;border-radius:10px;background:${v.rojo}0a;
  color:${({theme})=>theme.text};font-size:.82rem;line-height:1.4;
  >svg{flex-shrink:0;color:${v.rojo};font-size:1.2rem;}
  p{margin:5px 0;}
  small{display:block;opacity:.65;overflow-wrap:anywhere;}
`;
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
const ContinueAnywayAction = styled(Action)`
  border:1px solid ${v.rojo}66;
  background:transparent;
  color:${v.rojo};
  &:hover:not(:disabled){background:${v.rojo}12;border-color:${v.rojo};}
`;
const ScanProgressButton = styled(Action)`
  position:relative;overflow:hidden;isolation:isolate;border:1px solid ${({$scanning})=>$scanning ? "#17212b" : v.colorPrincipal};background:${({$scanning})=>$scanning ? "#17212b" : v.colorPrincipal};color:#fff;min-width:156px;
  &::before{content:"";position:absolute;inset:0;z-index:0;background:${v.colorPrincipal};transform:scaleX(${({$progress=100})=>Math.max(0,Math.min(100,$progress))/100});transform-origin:left center;transition:transform 220ms cubic-bezier(.22,1,.36,1);}
  .button-content{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;}
  &:disabled{opacity:1;}
  @media(prefers-reduced-motion:reduce){&::before{transition:none;}}
`;
const scanSweep = keyframes`0%{transform:translateY(-56px);opacity:0;}10%{opacity:1;}90%{opacity:1;}100%{transform:translateY(calc(100% + 8px));opacity:0;}`;
const statusPulse = keyframes`0%,100%{opacity:.82;}50%{opacity:1;}`;
const reviewReveal = keyframes`
  0%{opacity:0;transform:translateY(14px);filter:blur(8px);}
  100%{opacity:1;transform:translateY(0);filter:blur(0);}
`;
const reviewRevealLeft = keyframes`
  0%{opacity:0;transform:translateX(-18px);filter:blur(8px);}
  100%{opacity:1;transform:translateX(0);filter:blur(0);}
`;
const reviewRevealRight = keyframes`
  0%{opacity:0;transform:translateX(18px);filter:blur(8px);}
  100%{opacity:1;transform:translateX(0);filter:blur(0);}
`;
const ReviewWorkspace = styled.div`
  display:grid;
  grid-template-columns:minmax(460px,540px) minmax(0,1fr);
  gap:18px;
  align-items:stretch;
  height:min(66dvh,700px);
  animation:${reviewReveal} 320ms cubic-bezier(.16,1,.3,1) both;

  @media(max-width:960px){
    grid-template-columns:1fr;
    gap:14px;
    height:auto;
  }

  @media(prefers-reduced-motion:reduce){
    animation:none;
  }
`;
const ReviewMediaPanel = styled.aside`
  display:flex;
  flex-direction:column;
  gap:12px;
  min-width:0;
  padding:12px;
  border:1px solid ${({theme})=>theme.bg4};
  border-radius:16px;
  background:${({theme})=>theme.bgcards};
  height:100%;
  min-height:0;
  overflow:hidden;
  align-self:stretch;
  animation:${reviewRevealLeft} 380ms cubic-bezier(.16,1,.3,1) both;

  @media(max-width:960px){
    height:min(52dvh,520px);
    overflow:visible;
  }

  @media(prefers-reduced-motion:reduce){
    animation:none;
  }
`;
const ReviewMediaHeader = styled.header`
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
  min-width:0;

  >div{display:flex;flex-direction:column;gap:3px;min-width:0;}
  span{font-size:.72rem;line-height:1.35;letter-spacing:.08em;text-transform:uppercase;opacity:.62;}
  strong{font-size:.94rem;line-height:1.35;}
  small{max-width:28ch;font-size:.74rem;line-height:1.4;text-align:right;opacity:.7;}

  @media(max-width:700px){
    flex-direction:column;
    small{max-width:none;text-align:left;}
  }
`;
const ReviewPreviewFrame = styled(PreviewFrame)`
  flex:1 1 auto;
  height:100%;
  min-height:0;
  ${cedulaPreviewZoomStyles}

  @media(max-width:960px){
    height:min(58vh,580px);
    flex:none;
  }
`;
const ReviewSidebar = styled.div`
  display:flex;
  flex-direction:column;
  gap:16px;
  min-width:0;
  height:100%;
  min-height:0;
  overflow-y:auto;
  overflow-x:hidden;
  overscroll-behavior:contain;
  scroll-padding-block:2px 16px;
  padding-right:6px;
  scrollbar-gutter:stable;
  scrollbar-width:thin;
  scrollbar-color:${({theme})=>theme.colorScroll} transparent;
  animation:${reviewRevealRight} 380ms cubic-bezier(.16,1,.3,1) 70ms both;

  > *{
    flex:0 0 auto;
  }

  &::-webkit-scrollbar{width:7px;}
  &::-webkit-scrollbar-track{background:transparent;border-radius:999px;margin-block:4px;}
  &::-webkit-scrollbar-thumb{
    min-height:36px;
    border:1px solid transparent;
    border-radius:999px;
    background:${({theme})=>theme.colorScroll};
    background-clip:padding-box;
  }

  @media(prefers-reduced-motion:reduce){
    animation:none;
  }

  @media(max-width:960px){
    height:auto;
    max-height:min(58dvh,580px);
    padding-right:4px;
  }
`;
const ReviewPlayersPanel = styled.section`
  min-width:0;
  padding:16px;
  border:1px solid ${({theme})=>theme.bg4};
  border-radius:14px;
  background:${({theme})=>theme.bgcards};

  @media(max-width:560px){padding:12px;}
`;
const ReviewSectionHeader = styled.header`
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
  margin-bottom:12px;

  >div{display:flex;flex-direction:column;gap:3px;min-width:0;}
  strong{font-size:.94rem;line-height:1.35;}
  span{font-size:.76rem;line-height:1.4;opacity:.64;}
`;
const ReviewScrollArea = styled.div`
  display:flex;
  flex-direction:column;
  gap:18px;
  flex:1 1 0;
  min-height:0;
  overflow-x:hidden;
  overflow:hidden;
  padding:2px 6px 2px 2px;
  &:focus-visible{
    outline:3px solid ${v.colorPrincipal}44;
    outline-offset:-1px;
  }
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
const ReviewDataPanel = styled.section`
  min-width:0;
  padding:16px;
  border:1px solid ${({theme})=>theme.bg4};
  border-radius:16px;
  background:${({theme})=>theme.bgcards};

  h5{margin:0 0 10px;font-size:.94rem;line-height:1.35;}

  @media(max-width:560px){padding:12px;}
`;
const MatchDataColumns = styled.div`
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  min-width:0;
  padding:0 0 12px;
  border-bottom:1px solid ${({theme})=>theme.bg4};

  & + &{padding:12px 0;}

  > *:first-child{padding-right:12px;}
  > * + *{padding-left:12px;border-left:1px solid ${({theme})=>theme.bg4};}

  @media(max-width:380px){
    grid-template-columns:1fr;
    gap:10px;

    > *:first-child{padding-right:0;}
    > * + *{padding:10px 0 0;border-left:0;border-top:1px solid ${({theme})=>theme.bg4};}
  }
`;
const ScheduleDataColumns = styled(MatchDataColumns)`
  grid-template-columns:repeat(3,minmax(0,1fr));

  @media(max-width:560px){
    grid-template-columns:1fr;
    gap:10px;

    > *:first-child{padding-right:0;}
    > * + *{padding:10px 0 0;border-left:0;border-top:1px solid ${({theme})=>theme.bg4};}
  }
`;
const DataColumn = styled.div`
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:3px;
  min-width:0;
  font-size:.86rem;

  .field-label{color:${({theme})=>theme.text};font-size:.72rem;font-weight:700;line-height:1.35;opacity:.64;overflow-wrap:anywhere;}
  .field-value{font-weight:750;line-height:1.35;overflow-wrap:anywhere;color:${({theme,$warning})=>$warning ? v.rojo : theme.text};}
  .team-name{font-size:.86rem;font-weight:750;line-height:1.35;overflow-wrap:anywhere;color:${({theme})=>theme.text};}
  .score-value{display:flex;align-items:baseline;gap:5px;min-width:0;color:${v.colorPrincipal};}
  .score-value strong{font-size:clamp(1.55rem,3vw,2rem);font-variant-numeric:tabular-nums;font-weight:800;line-height:1;}
  .score-value span{font-size:.76rem;font-weight:700;line-height:1.2;opacity:.82;}
  small{color:${({theme})=>theme.text};font-size:.73rem;line-height:1.35;overflow-wrap:anywhere;opacity:.62;}
`;
const ScanDataRow = styled.div`
  display:grid;
  grid-template-columns:96px minmax(0,1fr);
  gap:10px;
  padding:10px 0;
  border-bottom:1px solid ${({theme})=>theme.bg4};
  font-size:.86rem;

  .field-label{padding-top:1px;color:${({theme})=>theme.text};font-weight:650;opacity:.68;}
  .field-values{display:flex;flex-direction:column;gap:3px;min-width:0;}
  strong{font-weight:750;line-height:1.35;overflow-wrap:anywhere;color:${({theme,$warning})=>$warning ? v.rojo : theme.text};}
  small{color:${({theme})=>theme.text};font-size:.75rem;line-height:1.35;overflow-wrap:anywhere;opacity:.62;}

  @media(max-width:560px){
    grid-template-columns:1fr;
    gap:3px;
    padding:9px 0;
    .field-label{padding-top:0;}
  }
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
  list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:4px;
  li{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:10px;background:${({theme})=>theme.bg3};font-size:.82rem;}
  li.no-match{color:${v.rojo};}
  li.goal-review{background:${({theme})=>`${theme.tournamentDashboard?.metrics?.warning || "#f59e0b"}12`};}
  .player-copy{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1 1 auto;line-height:1.3;}
  .player-header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0;}
  .player-name{font-weight:650;min-width:0;overflow-wrap:anywhere;}
  .player-badges{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:wrap;flex:0 0 auto;}
  .player-badge{display:inline-flex;align-items:center;gap:4px;min-height:22px;padding:2px 7px;border-radius:999px;border:1px solid transparent;font-size:.7rem;font-weight:800;line-height:1;white-space:nowrap;box-sizing:border-box;}
  .player-badge svg{font-size:.82rem;flex:0 0 auto;}
  .player-badge--goal{border-color:${({theme})=>theme.bg4};background:${({theme})=>theme.bgcards};color:${({theme})=>theme.text};}
  .player-badge--goal svg{color:${v.colorPrincipal};}
  .player-badge--yellow{border-color:${({theme})=>`${theme.tournamentDashboard?.metrics?.warning || "#f59e0b"}3d`};background:${({theme})=>`${theme.tournamentDashboard?.metrics?.warning || "#f59e0b"}18`};color:${({theme})=>theme.tournamentDashboard?.metrics?.warning || "#f59e0b"};}
  .player-badge--yellow svg{color:${({theme})=>theme.tournamentDashboard?.metrics?.warning || "#f59e0b"};}
  .player-badge--red{border-color:${v.rojo}38;background:${v.rojo}14;color:${v.rojo};}
  .player-badge--red svg{color:${v.rojo};}
  .player-copy small{white-space:normal;font-size:.7rem;opacity:.82;}
  .player-copy .goal-status{color:${({theme})=>theme.tournamentDashboard?.metrics?.warning || "#f59e0b"};font-weight:650;opacity:1;}
  span{min-width:0;overflow-wrap:anywhere;} small{white-space:nowrap;opacity:.7;}
  .player-stats{flex:0 0 auto;align-self:flex-start;margin-top:1px;}
`;
const PlayerGroups = styled.div`
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
  margin-top:12px;

  @media(max-width:700px){
    grid-template-columns:1fr;
  }
`;
const TeamPlayerGroup = styled.section`
  min-width:0;
  padding:12px;
  border:1px solid ${({theme})=>theme.bg4};
  border-radius:12px;
  background:${({theme})=>theme.bg3};
`;
const PlayerGroupHeading = styled.div`
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
  margin-bottom:8px;
  font-size:.82rem;

  .group-copy{display:flex;flex-direction:column;gap:3px;min-width:0;}
  .group-copy span{font-size:.72rem;line-height:1.35;opacity:.62;}
  .group-copy strong{font-weight:800;line-height:1.3;overflow-wrap:anywhere;}
  >span{flex:0 0 auto;padding:3px 7px;border-radius:999px;background:${({theme})=>theme.bgcards};font-size:.72rem;opacity:.76;}
`;
const GroupedPlayerList = styled(PlayerList)`
  margin:0;max-height:none;overflow:visible;
  .player-copy small{white-space:normal;font-size:.7rem;opacity:.66;}
  .player-copy .scanned-value{color:${({theme})=>theme.text};opacity:.62;}
  li.unlinked{color:${v.rojo};}
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
const TeamMismatchScreen = styled.section`
  display:grid;
  grid-template-rows:auto minmax(220px,1fr) auto;
  gap:16px;
  flex:1 1 0;
  min-height:0;
  overflow-y:auto;
  padding:2px 4px 2px 2px;
  color:${({theme})=>theme.text};
  scrollbar-width:thin;
  scrollbar-color:${({theme})=>theme.colorScroll} transparent;

  @media(max-width:760px){grid-template-rows:auto auto auto;gap:12px;}
`;
const TeamMismatchHero = styled.div`
  display:grid;
  grid-template-columns:auto minmax(0,1fr) auto;
  align-items:center;
  gap:14px;
  padding:16px 18px;
  border:1px solid ${v.rojo}55;
  border-radius:14px;
  background:${v.rojo}10;

  .hero-copy{display:flex;flex-direction:column;gap:5px;min-width:0;}
  h5,p{margin:0;}
  h5{font-size:clamp(1rem,1.5vw,1.2rem);line-height:1.3;letter-spacing:-.015em;}
  p{max-width:72ch;font-size:.84rem;line-height:1.5;opacity:.78;}

  @media(max-width:620px){
    grid-template-columns:auto minmax(0,1fr);
    align-items:start;
    padding:14px;
  }
`;
const MismatchIcon = styled.span`
  display:grid;
  width:44px;
  height:44px;
  place-items:center;
  border-radius:12px;
  background:${v.rojo};
  color:#fff;
  font-size:1.35rem;
`;
const MismatchStatus = styled.span`
  justify-self:end;
  padding:5px 9px;
  border-radius:999px;
  background:${v.rojo}18;
  color:${v.rojo};
  font-size:.72rem;
  font-weight:800;
  white-space:nowrap;

  @media(max-width:620px){grid-column:2;justify-self:start;}
`;
const TeamMismatchComparison = styled.div`
  display:grid;
  grid-template-columns:minmax(0,1fr) 92px minmax(0,1fr);
  align-items:stretch;
  min-height:0;

  @media(max-width:760px){grid-template-columns:1fr;}
`;
const MismatchTeamPanel = styled.section`
  display:flex;
  flex-direction:column;
  min-width:0;
  overflow:hidden;
  border:1px solid ${({theme,$tone})=>$tone === "detected" ? `${v.rojo}55` : theme.bg4};
  border-radius:14px;
  background:${({theme})=>theme.bgcards};
`;
const MismatchPanelHeading = styled.header`
  display:flex;
  min-height:64px;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:12px 16px;
  border-bottom:1px solid ${({theme})=>theme.bg4};

  >div{display:flex;flex-direction:column;gap:3px;min-width:0;}
  strong{font-size:.9rem;line-height:1.3;}
  span{font-size:.74rem;line-height:1.35;opacity:.64;}
`;
const MismatchTeamRows = styled.div`
  display:flex;
  flex:1 1 auto;
  flex-direction:column;
  min-height:0;
`;
const DetectedTeamRow = styled.div`
  display:grid;
  grid-template-columns:minmax(0,1fr) auto auto;
  align-items:center;
  gap:12px;
  flex:1 1 0;
  min-height:82px;
  padding:14px 16px;
  background:${({$mismatch})=>$mismatch ? `${v.rojo}09` : "transparent"};

  &+&{border-top:1px solid ${({theme})=>theme.bg4};}
  .team-copy{display:flex;flex-direction:column;gap:4px;min-width:0;}
  .team-copy span{font-size:.72rem;opacity:.62;}
  .team-copy strong{font-size:clamp(.92rem,1.4vw,1.08rem);line-height:1.3;overflow-wrap:anywhere;}
  .mismatch-label{padding:4px 7px;border-radius:999px;background:${v.rojo}18;color:${v.rojo};font-size:.68rem;font-weight:800;white-space:nowrap;}
  .detected-score{display:grid;width:38px;height:38px;place-items:center;border-radius:10px;background:${({theme})=>theme.bg3};font-size:1.15rem;font-weight:900;font-variant-numeric:tabular-nums;}

  @media(max-width:460px){
    grid-template-columns:minmax(0,1fr) auto;
    .mismatch-label{grid-column:1;justify-self:start;}
    .detected-score{grid-column:2;grid-row:1 / span 2;}
  }
`;
const ScheduledTeamRow = styled.div`
  display:flex;
  align-items:center;
  gap:12px;
  flex:1 1 0;
  min-height:82px;
  padding:14px 16px;

  &+&{border-top:1px solid ${({theme})=>theme.bg4};}
  .registered-logo{display:grid;width:46px;height:46px;flex:0 0 auto;place-items:center;overflow:hidden;border-radius:12px;background:${({theme})=>theme.bg3};}
  .registered-logo img{width:38px;height:38px;object-fit:contain;}
  .team-copy{display:flex;flex-direction:column;gap:4px;min-width:0;}
  .team-copy span{font-size:.72rem;opacity:.62;}
  .team-copy strong{font-size:clamp(.92rem,1.4vw,1.08rem);line-height:1.3;overflow-wrap:anywhere;}
`;
const MismatchConnector = styled.div`
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:7px;
  color:${v.rojo};

  svg{font-size:1.35rem;}
  span{max-width:68px;text-align:center;font-size:.68rem;font-weight:800;line-height:1.3;}

  @media(max-width:760px){
    min-height:58px;
    flex-direction:row;
    span{max-width:none;}
  }
`;
const MismatchSafetyNote = styled.div`
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  min-height:38px;
  padding:8px 12px;
  color:${({theme})=>theme.text};
  font-size:.78rem;
  line-height:1.4;
  text-align:center;
  opacity:.72;

  svg{flex:0 0 auto;color:${v.rojo};font-size:1rem;}
`;
const MismatchActionBar = styled.div`
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  padding-top:14px;
  border-top:1px solid ${({theme})=>theme.bg4};

  .action-copy{display:flex;flex-direction:column;gap:3px;min-width:0;}
  .action-copy strong{font-size:.84rem;}
  .action-copy span{font-size:.74rem;line-height:1.35;opacity:.64;}
  .actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;}

  @media(max-width:700px){
    align-items:stretch;
    flex-direction:column;
    gap:10px;
    .actions{display:grid;grid-template-columns:1fr;}
    .actions button{width:100%;min-height:44px;}
  }
`;
const ScoreDiscrepancyPanel = styled.section`
  overflow:hidden;
  border:1px solid ${({theme})=>theme.tournamentDashboard?.metrics?.warning || "#f59e0b"};
  border-radius:12px;
  background:${({theme})=>theme.bgcards};
  box-shadow:0 10px 24px rgba(0,0,0,.18);
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
