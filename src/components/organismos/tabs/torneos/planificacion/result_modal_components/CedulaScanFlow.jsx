import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  RiArrowLeftLine,
  RiCameraLine,
  RiFileImageLine,
  RiRefreshLine,
  RiScan2Line,
} from "react-icons/ri";
import { v } from "../../../../../../styles/variables";
import { supabase } from "../../../../../../supabase/supabase.config";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2200;

const normalizeName = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\b(fc|futbol club|club deportivo|deportivo|equipo)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const levenshtein = (left = "", right = "") => {
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = left[i - 1] === right[j - 1]
        ? diagonal
        : Math.min(diagonal, row[j - 1], row[j]) + 1;
      diagonal = previous;
    }
  }
  return row[right.length];
};

const nameSimilarity = (left, right) => {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const editScore = 1 - (levenshtein(a, b) / Math.max(a.length, b.length));
  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  const intersection = [...aTokens].filter(token => bTokens.has(token)).length;
  const tokenScore = intersection / Math.max(aTokens.size, bTokens.size, 1);
  return Math.max(editScore, tokenScore * 0.94);
};

const bestMatch = (value, options, getLabel, threshold) => {
  const ranked = options
    .map(option => ({ option, score: nameSimilarity(value, getLabel(option)) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= threshold ? ranked[0] : null;
};

const playerName = (player) => (
  player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim()
);

const refereeName = (referee) => referee?.full_name || referee?.name || "";

const fileToScanPayload = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error("El archivo no contiene una imagen valida."));
    image.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const mimeType = file.type === "image/png" && file.size < 3 * 1024 * 1024
        ? "image/png"
        : "image/jpeg";
      const dataUrl = canvas.toDataURL(mimeType, 0.88);
      resolve({ mimeType, imageBase64: dataUrl.split(",")[1] });
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

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
  penalties: { local: 0, visitor: 0 },
  players: [],
};

export function CedulaScanFlow({
  match,
  referees,
  localPlayers,
  visitPlayers,
  onBack,
  onApply,
  showToast,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [rawScan, setRawScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [coarseDevice, setCoarseDevice] = useState(false);
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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

  const selectFile = useCallback((nextFile) => {
    if (!nextFile) return;
    if (!nextFile.type?.startsWith("image/")) {
      showToast("Selecciona un archivo de imagen.", "error");
      return;
    }
    if (nextFile.size > MAX_FILE_BYTES) {
      showToast("La imagen debe pesar menos de 12 MB.", "error");
      return;
    }
    setPreviewUrl(current => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(nextFile);
    });
    setFile(nextFile);
    setRawScan(null);
  }, [showToast]);

  useEffect(() => {
    const handlePaste = (event) => {
      const image = getClipboardImage(event.clipboardData);
      if (!image) return;
      event.preventDefault();
      selectFile(image);
      showToast("Imagen pegada desde el portapapeles.", "success");
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [selectFile, showToast]);

  const interpretation = useMemo(() => {
    if (!rawScan) return null;
    const actualTeams = [
      { side: "local", id: match?.local?.id, name: match?.local?.name || "Local" },
      { side: "visit", id: match?.visitante?.id, name: match?.visitante?.name || "Visitante" },
    ];
    const localTeamMatch = bestMatch(rawScan.localTeam?.name, actualTeams, team => team.name, 0.42);
    const visitorTeamMatch = bestMatch(rawScan.visitorTeam?.name, actualTeams, team => team.name, 0.42);
    const localSide = localTeamMatch?.option?.side || "local";
    const visitorSide = visitorTeamMatch?.option?.side && visitorTeamMatch.option.side !== localSide
      ? visitorTeamMatch.option.side
      : (localSide === "local" ? "visit" : "local");
    const refereeMatch = bestMatch(rawScan.referee, referees, refereeName, 0.5);
    const usedPlayerIds = new Set();
    const players = (rawScan.players || []).map(scannedPlayer => {
      let side = scannedPlayer.team === "visitor" ? visitorSide : scannedPlayer.team === "local" ? localSide : null;
      let pool = side === "local" ? localPlayers : side === "visit" ? visitPlayers : [...localPlayers, ...visitPlayers];
      pool = pool.filter(player => !usedPlayerIds.has(String(player.id)));
      const matched = bestMatch(scannedPlayer.name, pool, playerName, 0.5);
      if (matched) {
        usedPlayerIds.add(String(matched.option.id));
        if (!side) side = localPlayers.some(player => String(player.id) === String(matched.option.id)) ? "local" : "visit";
      }
      return { ...scannedPlayer, side, matched: matched?.option || null, confidence: matched?.score || 0 };
    });
    const scores = { local: 0, visit: 0 };
    scores[localSide] = Number(rawScan.localTeam?.score) || 0;
    scores[visitorSide] = Number(rawScan.visitorTeam?.score) || 0;
    const penalties = { local: 0, visit: 0 };
    penalties[localSide] = Number(rawScan.penalties?.local) || 0;
    penalties[visitorSide] = Number(rawScan.penalties?.visitor) || 0;
    return {
      teams: actualTeams,
      localSide,
      visitorSide,
      referee: refereeMatch?.option || null,
      players,
      scores,
      penalties,
      date: rawScan.date || "",
      time: rawScan.time || "",
      observations: rawScan.observations || "",
    };
  }, [localPlayers, match, rawScan, referees, visitPlayers]);

  const scanImage = async () => {
    if (!file || scanning) return;
    setScanning(true);
    try {
      const image = await fileToScanPayload(file);
      const { data, error } = await supabase.functions.invoke("procesar-cedula", {
        body: image,
      });
      if (error) throw error;
      if (!data?.scan) throw new Error(data?.error || "La funcion no devolvio datos del escaneo.");
      setRawScan({ ...emptyScan, ...data.scan });
    } catch (error) {
      let message = error?.message || "No se pudo escanear la cedula.";
      if (error?.context) {
        try {
          const body = await error.context.json();
          message = body?.error || message;
        } catch { /* La respuesta no era JSON. */ }
      }
      showToast(message, "error");
    } finally {
      setScanning(false);
    }
  };

  if (!file) {
    return (
      <ScanShell>
        <PanelHeading>
          <button type="button" onClick={onBack}><RiArrowLeftLine /></button>
          <div><h4>Escanear cedula</h4><p>Sube una foto clara y completa. La imagen solo se usa durante este escaneo.</p></div>
        </PanelHeading>
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
        <input ref={uploadInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" onChange={event => selectFile(event.target.files?.[0])} />
        <input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={event => selectFile(event.target.files?.[0])} />
      </ScanShell>
    );
  }

  if (!rawScan || !interpretation) {
    return (
      <ScanShell>
        <PanelHeading>
          <button type="button" onClick={onBack}><RiArrowLeftLine /></button>
          <div><h4>Vista previa</h4><p>Comprueba que nombres, marcador y anotaciones sean legibles.</p></div>
        </PanelHeading>
        <PreviewFrame><img src={previewUrl} alt="Cedula seleccionada" /></PreviewFrame>
        <ChoiceRow>
          <SecondaryAction type="button" disabled={scanning} onClick={() => { setFile(null); setRawScan(null); }}>
            <RiRefreshLine /> Cambiar foto
          </SecondaryAction>
          <PrimaryAction type="button" disabled={scanning} onClick={scanImage}>
            <RiScan2Line /> {scanning ? "Escaneando..." : "Escanear"}
          </PrimaryAction>
        </ChoiceRow>
      </ScanShell>
    );
  }

  const unmatchedPlayers = interpretation.players.filter(player => !player.matched).length;
  return (
    <ScanShell>
      <PanelHeading>
        <button type="button" onClick={onBack}><RiArrowLeftLine /></button>
        <div><h4>Revisar escaneo</h4><p>Compara lo detectado con los datos registrados antes de aplicarlo.</p></div>
      </PanelHeading>
      <ComparisonGrid>
        <DataColumn>
          <h5>Datos detectados</h5>
          <DataRow label="Local" value={`${rawScan.localTeam?.name || "Sin detectar"} · ${rawScan.localTeam?.score ?? 0}`} />
          <DataRow label="Visitante" value={`${rawScan.visitorTeam?.name || "Sin detectar"} · ${rawScan.visitorTeam?.score ?? 0}`} />
          <DataRow label="Arbitro" value={rawScan.referee || "Sin detectar"} />
          <DataRow label="Fecha" value={[rawScan.date, rawScan.time].filter(Boolean).join(" · ") || "Sin detectar"} />
          <PlayerList>
            {(rawScan.players || []).map((player, index) => (
              <li key={`${player.name}-${index}`}><span>{player.name || "Nombre ilegible"}</span><small>{player.goals || 0} G · {player.yellowCards || 0} TA · {player.redCards || 0} TR</small></li>
            ))}
          </PlayerList>
        </DataColumn>
        <DataColumn>
          <h5>Datos interpretados</h5>
          <DataRow label="Local" value={`${match?.local?.name || "Local"} · ${interpretation.scores.local}`} />
          <DataRow label="Visitante" value={`${match?.visitante?.name || "Visitante"} · ${interpretation.scores.visit}`} />
          <DataRow label="Arbitro" value={interpretation.referee ? refereeName(interpretation.referee) : "Sin coincidencia"} warning={!interpretation.referee && Boolean(rawScan.referee)} />
          <DataRow label="Fecha" value={[interpretation.date, interpretation.time].filter(Boolean).join(" · ") || "Sin detectar"} />
          <PlayerList>
            {interpretation.players.map((player, index) => (
              <li key={`${player.name}-${index}`} className={!player.matched ? "warning" : ""}><span>{player.matched ? playerName(player.matched) : `${player.name} (sin coincidencia)`}</span><small>{player.goals || 0} G · {player.yellowCards || 0} TA · {player.redCards || 0} TR</small></li>
            ))}
          </PlayerList>
        </DataColumn>
      </ComparisonGrid>
      {unmatchedPlayers > 0 && <ReviewNotice>{unmatchedPlayers} {unmatchedPlayers === 1 ? "jugador no se pudo vincular" : "jugadores no se pudieron vincular"}; no se aplicaran automaticamente.</ReviewNotice>}
      <ChoiceRow>
        <SecondaryAction type="button" onClick={onBack}>Cancelar</SecondaryAction>
        <PrimaryAction type="button" onClick={() => onApply(interpretation)}>Aplicar escaneo</PrimaryAction>
      </ChoiceRow>
    </ScanShell>
  );
}

function DataRow({ label, value, warning = false }) {
  return <ScanDataRow $warning={warning}><span>{label}</span><strong>{value}</strong></ScanDataRow>;
}

const ScanShell = styled.section`display:flex;flex-direction:column;gap:18px;min-height:420px;`;
const PanelHeading = styled.div`
  display:flex;align-items:flex-start;gap:12px;
  button{width:36px;height:36px;display:grid;place-items:center;border:1px solid ${({theme})=>theme.bg4};border-radius:10px;background:transparent;color:${({theme})=>theme.text};cursor:pointer;font-size:1.1rem;}
  button:hover{background:${({theme})=>theme.bg3};}
  button:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
  h4,p{margin:0;} h4{font-size:1.05rem;} p{margin-top:4px;opacity:.72;line-height:1.45;}
`;
const UploadZone = styled.button`
  width:100%;min-height:250px;border:2px dashed ${({theme})=>theme.bg4};border-radius:14px;background:${({theme})=>theme.bg3};color:${({theme})=>theme.text};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;
  svg{font-size:2rem;color:${v.colorPrincipal};} strong{font-size:1rem;} span{font-size:.82rem;opacity:.7;}
  &:hover{border-color:${v.colorPrincipal};} &:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
`;
const ChoiceRow = styled.div`display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;`;
const Action = styled.button`
  min-height:40px;padding:9px 16px;border-radius:10px;font:inherit;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;
  &:disabled{cursor:wait;opacity:.62;} &:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
  @media(max-width:600px){flex:1;}
`;
const PrimaryAction = styled(Action)`border:1px solid ${v.colorPrincipal};background:${v.colorPrincipal};color:#fff;`;
const SecondaryAction = styled(Action)`border:1px solid ${({theme})=>theme.bg4};background:transparent;color:${({theme})=>theme.text};&:hover:not(:disabled){background:${({theme})=>theme.bg3};}`;
const PreviewFrame = styled.div`height:min(52vh,480px);border-radius:14px;overflow:hidden;background:#101010;display:flex;align-items:center;justify-content:center;img{width:100%;height:100%;object-fit:contain;}`;
const ComparisonGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:1px;background:${({theme})=>theme.bg4};border-radius:14px;overflow:hidden;@media(max-width:760px){grid-template-columns:1fr;}`;
const DataColumn = styled.div`background:${({theme})=>theme.bgcards};padding:16px;min-width:0;h5{margin:0 0 12px;font-size:.94rem;} `;
const ScanDataRow = styled.div`
  display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;padding:8px 0;border-bottom:1px solid ${({theme})=>theme.bg4};font-size:.86rem;
  span{opacity:.68;} strong{font-weight:700;overflow-wrap:anywhere;color:${({$warning})=>$warning ? v.rojo : "inherit"};}
`;
const PlayerList = styled.ul`
  list-style:none;margin:12px 0 0;padding:0;max-height:190px;overflow:auto;display:flex;flex-direction:column;gap:4px;
  li{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 8px;border-radius:8px;background:${({theme})=>theme.bg3};font-size:.82rem;} li.warning{color:${v.rojo};} span{min-width:0;overflow-wrap:anywhere;} small{white-space:nowrap;opacity:.7;}
`;
const ReviewNotice = styled.p`margin:0;padding:10px 12px;border-radius:10px;background:${v.rojo}14;color:${({theme})=>theme.text};font-size:.84rem;line-height:1.4;`;
