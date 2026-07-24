import React, { useState, useRef, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import { v } from "../../styles/variables";
import { 
  RiImageAddLine, RiZoomInLine, RiZoomOutLine, 
  RiCheckLine, RiCloseLine, RiCropLine, RiEraserLine, RiPaintFill
} from "react-icons/ri";
import { removeBackground } from "../../utils/imageProcessor"; 

const CROP_OUTPUT_SIZE = 640;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hexToRgb = (hex) => {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const intValue = parseInt(value, 16);

  if (Number.isNaN(intValue)) return { r: 255, g: 255, b: 255 };

  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

const fillClosedTransparentAreas = (ctx, size, fillColor) => {
  const imageData = ctx.getImageData(0, 0, size, size);
  const { data } = imageData;
  const totalPixels = size * size;
  const visited = new Uint8Array(totalPixels);
  const queue = new Uint32Array(totalPixels);
  const alphaThreshold = 12;
  let head = 0;
  let tail = 0;

  const isTransparent = (index) => data[index * 4 + 3] <= alphaThreshold;
  const enqueue = (index) => {
    if (visited[index] || !isTransparent(index)) return;
    visited[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < size; x += 1) {
    enqueue(x);
    enqueue((size - 1) * size + x);
  }

  for (let y = 0; y < size; y += 1) {
    enqueue(y * size);
    enqueue(y * size + size - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;

    const x = index % size;
    const y = Math.floor(index / size);

    if (x > 0) enqueue(index - 1);
    if (x < size - 1) enqueue(index + 1);
    if (y > 0) enqueue(index - size);
    if (y < size - 1) enqueue(index + size);
  }

  const { r, g, b } = hexToRgb(fillColor);

  for (let index = 0; index < totalPixels; index += 1) {
    if (!isTransparent(index) || visited[index]) continue;

    const pixelIndex = index * 4;
    data[pixelIndex] = r;
    data[pixelIndex + 1] = g;
    data[pixelIndex + 2] = b;
    data[pixelIndex + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
};

function PhotoUploaderPreview({
  uploaderRef,
  width,
  height,
  shape,
  enableClipboardPaste,
  handlePaste,
  openFilePicker,
  previewUrl,
  isLoadingOriginal,
  handleManualAdjust,
  onClear,
  fileInputRef,
  handleFileChange,
}) {
  return (
      <Container
        ref={uploaderRef}
        $width={width}
        $height={height}
        $shape={shape}
        $canPaste={enableClipboardPaste}
        tabIndex={enableClipboardPaste ? 0 : -1}
        onPaste={handlePaste}
        aria-label={enableClipboardPaste ? "Subir imagen o pegar desde el portapapeles" : undefined}
      >
        <button type="button" className="preview-area" onClick={openFilePicker} aria-label={previewUrl ? "Cambiar imagen" : "Seleccionar imagen"}>
          {previewUrl ? <img src={previewUrl} alt="Vista previa de la imagen" className="img-final" /> : <div className="placeholder"><RiImageAddLine /><span>Subir imagen</span></div>}
          <div className="overlay"><RiCropLine /><span>{previewUrl ? "Cambiar" : "Seleccionar"}</span></div>
        </button>
        {enableClipboardPaste && (
          <div className="paste-hint">Ctrl/Cmd + V</div>
        )}
        {previewUrl && (
          <div className="mini-tools">
             <button aria-label="Recortar" type="button" className="tool-btn edit" onClick={handleManualAdjust} title="Recortar" disabled={isLoadingOriginal}>
                {isLoadingOriginal ? <LoadingSpinner /> : <RiCropLine />}
             </button>
             <button type="button" className="tool-btn delete" onClick={(e)=>{e.preventDefault(); onClear();}} aria-label="Eliminar imagen"><RiCloseLine /></button>
          </div>
        )}
        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} aria-label="Archivo de imagen" />
      </Container>
  );
}

function PhotoCropEditor({ state, actions, canvasRef }) {
  const closeButtonRef = useRef(null);
  const {
    isCropping,
    bgRemovalEnabled,
    shape,
    zoom,
    isProcessingBg,
    isTeamLogo,
    fillEmptySpacesEnabled,
    emptySpacesColor,
    applyBorder,
    themeColor,
  } = state;
  const {
    setIsCropping,
    handleToggleBgRemoval,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleZoomChange,
    handleZoomWheel,
    setFillEmptySpacesEnabled,
    setEmptySpacesColor,
    setApplyBorder,
    handleConfirmCrop,
  } = actions;

  useEffect(() => {
    if (!isCropping) return undefined;

    const previouslyFocused = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isCropping]);

  useEffect(() => {
    if (!isCropping) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isProcessingBg) {
        setIsCropping(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCropping, isProcessingBg, setIsCropping]);

  if (!isCropping || typeof document === "undefined") return null;

  const zoomProgress = ((zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100;
  const closeEditor = () => {
    if (!isProcessingBg) setIsCropping(false);
  };

  return createPortal(
    <CropModalOverlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-crop-title"
      onPointerDown={(event) => event.target === event.currentTarget && closeEditor()}
    >
      <div className="crop-card">
        <div className="header">
          <div className="header-copy">
            <h3 id="photo-crop-title">Ajustar imagen</h3>
            <p>Encuadra la imagen y revisa el resultado antes de guardar.</p>
          </div>
          <button
            type="button"
            className="close-button"
            ref={closeButtonRef}
            onClick={closeEditor}
            disabled={isProcessingBg}
            aria-label="Cerrar editor de imagen"
          >
            <RiCloseLine />
          </button>
        </div>

        <div className="editor-layout">
          <div className="preview-column">
            <div
              className={`canvas-wrapper ${isProcessingBg ? "is-processing" : ""}`}
              role="group"
              aria-label="Área de recorte de imagen. Arrastra para cambiar el encuadre."
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleZoomWheel}
            >
              <canvas ref={canvasRef} />
              <div className={`mask ${shape}`} aria-hidden="true" />
              {isProcessingBg && (
                <div className="processing-overlay" aria-live="polite">
                  <span className="processing-scan" aria-hidden="true" />
                  <span className="processing-icon" aria-hidden="true">
                    <RiEraserLine />
                  </span>
                  <strong>Quitando el fondo</strong>
                  <span>Analizando los bordes de la imagen…</span>
                </div>
              )}
            </div>
            <p className="drag-hint">
              <RiCropLine aria-hidden="true" />
              Arrastra para mover · usa la rueda o los controles para acercar
            </p>
          </div>

          <div className="controls-container">
            <section className="control-panel zoom-panel" aria-labelledby="zoom-control-label">
              <div className="control-heading">
                <div>
                  <strong id="zoom-control-label">Zoom</strong>
                  <span>Ajusta el encuadre con precisión</span>
                </div>
                <output aria-live="polite">{Math.round(zoom * 100)}%</output>
              </div>
              <div
                className="slider-group"
                style={{ "--zoom-progress": `${zoomProgress}%` }}
              >
                <button
                  type="button"
                  className="zoom-button"
                  onClick={() => handleZoomChange(zoom - ZOOM_STEP)}
                  disabled={zoom <= ZOOM_MIN || isProcessingBg}
                  aria-label="Disminuir zoom"
                >
                  <RiZoomOutLine />
                </button>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step="0.01"
                  value={zoom}
                  onChange={(event) => handleZoomChange(Number(event.target.value))}
                  disabled={isProcessingBg}
                  aria-label="Nivel de zoom"
                  aria-valuetext={`${Math.round(zoom * 100)} por ciento`}
                />
                <button
                  type="button"
                  className="zoom-button"
                  onClick={() => handleZoomChange(zoom + ZOOM_STEP)}
                  disabled={zoom >= ZOOM_MAX || isProcessingBg}
                  aria-label="Aumentar zoom"
                >
                  <RiZoomInLine />
                </button>
              </div>
            </section>

            <label
              className={`background-tool ${bgRemovalEnabled ? "is-active" : ""} ${
                isProcessingBg ? "is-loading" : ""
              }`}
            >
              <span className="tool-icon" aria-hidden="true">
                {isProcessingBg ? <LoadingSpinner /> : <RiEraserLine />}
              </span>
              <span className="tool-copy">
                <strong>
                  {isProcessingBg
                    ? "Quitando fondo…"
                    : bgRemovalEnabled
                      ? "Fondo eliminado"
                      : "Quitar fondo"}
                </strong>
                <span>
                  {isProcessingBg
                    ? "Puede tardar unos segundos; mantén abierto el editor."
                    : bgRemovalEnabled
                    ? "Desactiva para recuperar la imagen original."
                    : "Separa automáticamente el sujeto del fondo."}
                </span>
              </span>
              <input
                type="checkbox"
                checked={bgRemovalEnabled}
                onChange={handleToggleBgRemoval}
                disabled={isProcessingBg}
                aria-label="Quitar fondo automáticamente"
              />
              <span className="switch" aria-hidden="true">
                <span />
              </span>
            </label>

            {isTeamLogo && (
              <section className="control-panel team-options" aria-label="Acabado del escudo">
                <div className="option-row">
                  <label className="option-label">
                    <span className="option-icon" aria-hidden="true">
                      <RiPaintFill />
                    </span>
                    <span className="option-copy">
                      <strong>Rellenar espacios interiores</strong>
                      <span>Completa huecos transparentes del escudo.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={fillEmptySpacesEnabled}
                      onChange={(event) => setFillEmptySpacesEnabled(event.target.checked)}
                      disabled={isProcessingBg}
                      aria-label="Rellenar espacios interiores"
                    />
                    <span className="switch" aria-hidden="true">
                      <span />
                    </span>
                  </label>
                  <input
                    className="fill-color-input"
                    type="color"
                    value={emptySpacesColor}
                    onChange={(event) => setEmptySpacesColor(event.target.value)}
                    disabled={!fillEmptySpacesEnabled || isProcessingBg}
                    title="Color de relleno"
                    aria-label="Color de relleno"
                  />
                </div>

                <label className="option-label">
                  <span
                    className="team-color-swatch"
                    style={{ "--team-color": themeColor }}
                    aria-hidden="true"
                  />
                  <span className="option-copy">
                    <strong>Borde con color del uniforme</strong>
                    <span>Aplica un contorno limpio al resultado.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={applyBorder}
                    onChange={(event) => setApplyBorder(event.target.checked)}
                    disabled={isProcessingBg}
                    aria-label="Aplicar borde con el color del uniforme"
                  />
                  <span className="switch" aria-hidden="true">
                    <span />
                  </span>
                </label>
              </section>
            )}
          </div>
        </div>

        <div className="actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={closeEditor}
            disabled={isProcessingBg}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-confirm"
            onClick={handleConfirmCrop}
            disabled={isProcessingBg}
          >
            <RiCheckLine />
            Usar imagen
          </button>
        </div>
      </div>
    </CropModalOverlay>,
    document.getElementById("root") || document.body
  );
}

export const PhotoUploader = memo(function PhotoUploader({ 
  previewUrl,    
  originalUrl,   
  originalFile: propOriginalFile,
  onImageSelect, 
  onClear,
  showToast,
  isTeamLogo = false,
  themeColor = v.colorPrincipal,
  shape = "circle",
  width = "120px", 
  height = "120px",
  enableClipboardPaste = false,
}) {
  const [isCropping, setIsCropping] = useState(false);
  const [originalFile, setOriginalFile] = useState(null); 
  const [tempImgSrc, setTempImgSrc] = useState(null);     
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  
  const [bgRemovalEnabled, setBgRemovalEnabled] = useState(false);
  const [applyBorder, setApplyBorder] = useState(false);
  const [fillEmptySpacesEnabled, setFillEmptySpacesEnabled] = useState(false);
  const [emptySpacesColor, setEmptySpacesColor] = useState("#ffffff");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageReady, setImageReady] = useState(false);
  
  const fileInputRef = useRef(null);
  const uploaderRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    originClientX: 0,
    originClientY: 0,
    originCropX: 0,
    originCropY: 0,
  });

  const [backupImage, setBackupImage] = useState(null);

  useEffect(() => {
    if (propOriginalFile) {
      setOriginalFile(propOriginalFile);
    }
  }, [propOriginalFile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBgRemovalEnabled(false);
      setBackupImage(null);
      setOriginalFile(file);
      const url = URL.createObjectURL(file);
      startCropper(url);
      e.target.value = '';
    }
  };

  const openFilePicker = () => {
    uploaderRef.current?.focus();
    fileInputRef.current?.click();
  };

  const getImageFileFromClipboard = (clipboardData) => {
    if (!clipboardData) return null;

    const clipboardFiles = Array.from(clipboardData.files || []);
    const fileFromFiles = clipboardFiles.find((file) =>
      file?.type?.startsWith("image/")
    );
    if (fileFromFiles) return fileFromFiles;

    const imageItem = Array.from(clipboardData.items || []).find((item) =>
      item.kind === "file" && item.type?.startsWith("image/")
    );
    const blob = imageItem?.getAsFile();
    if (!blob) return null;

    return new File([blob], `logo-pegado-${Date.now()}.png`, {
      type: blob.type || "image/png",
    });
  };

  const handlePaste = (event) => {
    if (!enableClipboardPaste) return;

    const imageFile = getImageFileFromClipboard(event.clipboardData);
    if (!imageFile) {
      showToast?.("No se encontro una imagen en el portapapeles.", "error");
      return;
    }

    event.preventDefault();
    setBgRemovalEnabled(false);
    setBackupImage(null);
    setOriginalFile(imageFile);
    startCropper(URL.createObjectURL(imageFile));
    showToast?.("Imagen pegada desde el portapapeles.", "success");
  };

  const startCropper = (url) => {
    setTempImgSrc(url);
    setZoom(1); 
    setCrop({ x: 0, y: 0 }); 
    setIsCropping(true); 
  };

  const handleManualAdjust = async (e) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (originalFile) {
      startCropper(URL.createObjectURL(originalFile));
      return;
    }

    if (originalUrl) {
      try {
        setIsLoadingOriginal(true);
        const response = await fetch(originalUrl, { cache: 'no-cache' });
        
        if (!response.ok) throw new Error("No se encontró la imagen original");

        const blob = await response.blob();
        const file = new File([blob], "original_db.png", { type: blob.type });
        setOriginalFile(file);
        startCropper(URL.createObjectURL(blob));
      } catch (error) {
        console.warn("Fallo carga de original, intentando preview...", error);
        
        if (previewUrl) {
            try {
                const resPreview = await fetch(previewUrl);
                if (resPreview.ok) {
                    const blobPrev = await resPreview.blob();
                    const filePrev = new File([blobPrev], "fallback_preview.png", { type: blobPrev.type });
                    setOriginalFile(filePrev);
                    startCropper(URL.createObjectURL(blobPrev));
                    if(showToast) showToast("Editando imagen comprimida (original no disponible)", "info");
                } else {
                    throw new Error("Tampoco se pudo cargar la preview");
                }
            } catch {
                if(showToast) showToast("Error cargando la imagen", "error");
            }
        } else {
            if(showToast) showToast("Error cargando la imagen original", "error");
        }
      } finally {
        setIsLoadingOriginal(false);
      }
      return;
    }
    
    if (previewUrl) {
         try {
            setIsLoadingOriginal(true);
            const res = await fetch(previewUrl);
            const blob = await res.blob();
            const file = new File([blob], "image.png", { type: blob.type });
            setOriginalFile(file);
            startCropper(URL.createObjectURL(blob));
         } catch {
            if(showToast) showToast("No se puede editar esta imagen", "error");
         } finally {
            setIsLoadingOriginal(false);
         }
         return;
    }

    if(showToast) showToast("Primero selecciona o sube una imagen", "error");
  };

  const handleConfirmCrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast?.("No se pudo generar la imagen recortada.", "error");
        return;
      }

      // Exportamos siempre como PNG para asegurar canal Alpha (Transparencia)
      const newCroppedFile = new File([blob], "crop.png", { type: "image/png" });
      const newPreviewUrl = URL.createObjectURL(blob);
      
      if (onImageSelect) {
        onImageSelect(newCroppedFile, originalFile, newPreviewUrl);
      }
      
      setIsCropping(false);
      setTempImgSrc(null);
    }, 'image/png', 1.0); // Calidad 1.0 ya que de la compresión se encarga uploadHandler
  };

  const handleRemoveBgInside = async () => {
    if (!originalFile) return false;
    setIsProcessingBg(true);
    showToast?.("La IA está analizando la imagen...", "info");

    try {
      if (!backupImage) {
        setBackupImage({ file: originalFile, preview: tempImgSrc });
      }
        
      const bgType = isTeamLogo ? "logo" : "person";
      const { file, preview } = await removeBackground(originalFile, bgType);
        
      setOriginalFile(file);
      setTempImgSrc(preview);
      showToast?.("Fondo eliminado con éxito", "success");
      return true;
    } catch (error) {
      showToast?.(`Error: ${error.message}`, "error");
      return false;
    } finally {
      setIsProcessingBg(false);
    }
  };

  const handleToggleBgRemoval = async (event) => {
    const isEnabled = event.target.checked;
    setBgRemovalEnabled(isEnabled);

    if (isEnabled) {
      const succeeded = await handleRemoveBgInside();
      if (!succeeded) setBgRemovalEnabled(false);
      return;
    }

    if (backupImage) {
      setOriginalFile(backupImage.file);
      setTempImgSrc(backupImage.preview);
      setBackupImage(null);
      showToast?.("Se restauró la imagen original", "info");
    }
  };

  const getCropBounds = (targetZoom) => {
    const image = imageRef.current;
    if (!image?.naturalWidth || !image?.naturalHeight) {
      return { maxX: 0, maxY: 0 };
    }

    const scaleBase = Math.max(
      CROP_OUTPUT_SIZE / image.naturalWidth,
      CROP_OUTPUT_SIZE / image.naturalHeight
    );
    const scaledWidth = image.naturalWidth * scaleBase * targetZoom;
    const scaledHeight = image.naturalHeight * scaleBase * targetZoom;

    return {
      maxX: Math.max(0, (scaledWidth - CROP_OUTPUT_SIZE) / 2),
      maxY: Math.max(0, (scaledHeight - CROP_OUTPUT_SIZE) / 2),
    };
  };

  const clampCrop = (nextCrop, targetZoom = zoom) => {
    const { maxX, maxY } = getCropBounds(targetZoom);
    return {
      x: clamp(nextCrop.x, -maxX, maxX),
      y: clamp(nextCrop.y, -maxY, maxY),
    };
  };

  const handleZoomChange = (nextZoom) => {
    const normalizedZoom = Number(clamp(nextZoom, ZOOM_MIN, ZOOM_MAX).toFixed(2));
    setZoom(normalizedZoom);
    setCrop((currentCrop) => clampCrop(currentCrop, normalizedZoom));
  };

  const handleZoomWheel = (event) => {
    if (isProcessingBg) return;
    event.preventDefault();
    handleZoomChange(zoom + (event.deltaY < 0 ? 0.05 : -0.05));
  };

  const handlePointerDown = (event) => {
    if (isProcessingBg || event.button > 0) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originCropX: crop.x,
      originCropY: crop.y,
    };
  };

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState.active || dragState.pointerId !== event.pointerId) return;
    const previewWidth = event.currentTarget.getBoundingClientRect().width || 1;
    const canvasScale = CROP_OUTPUT_SIZE / previewWidth;

    setCrop(
      clampCrop({
        x:
          dragState.originCropX +
          (event.clientX - dragState.originClientX) * canvasScale,
        y:
          dragState.originCropY +
          (event.clientY - dragState.originClientY) * canvasScale,
      })
    );
  };

  const handlePointerUp = (event) => {
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = null;
  };

  useEffect(() => {
    if (!isCropping || !tempImgSrc) {
      setImageReady(false);
      imageRef.current = null;
      return undefined;
    }

    let active = true;
    const image = new Image();
    setImageReady(false);
    image.crossOrigin = "anonymous";
    image.src = tempImgSrc;
    image.onload = () => {
      if (!active) return;
      imageRef.current = image;
      setImageReady(true);
    };

    return () => {
      active = false;
      image.onload = null;
      if (imageRef.current === image) imageRef.current = null;
    };
  }, [isCropping, tempImgSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!isCropping || !imageReady || !canvas || !image) return;

    const context = canvas.getContext("2d");
    const size = CROP_OUTPUT_SIZE;
    canvas.width = size;
    canvas.height = size;
    context.clearRect(0, 0, size, size);

    const scaleBase = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const currentScale = scaleBase * zoom;
    const scaledWidth = image.naturalWidth * currentScale;
    const scaledHeight = image.naturalHeight * currentScale;
    const x = (size - scaledWidth) / 2 + crop.x;
    const y = (size - scaledHeight) / 2 + crop.y;

    context.drawImage(image, x, y, scaledWidth, scaledHeight);

    if (isTeamLogo && fillEmptySpacesEnabled) {
      fillClosedTransparentAreas(context, size, emptySpacesColor);
    }

    if (isTeamLogo && applyBorder) {
      context.strokeStyle = themeColor;
      context.lineWidth = 18;

      if (shape === "circle") {
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2 - context.lineWidth / 2, 0, Math.PI * 2);
        context.stroke();
      } else {
        context.strokeRect(
          context.lineWidth / 2,
          context.lineWidth / 2,
          size - context.lineWidth,
          size - context.lineWidth
        );
      }
    }
  }, [
    applyBorder,
    crop,
    emptySpacesColor,
    fillEmptySpacesEnabled,
    imageReady,
    isCropping,
    isTeamLogo,
    shape,
    themeColor,
    zoom,
  ]);

  return (
    <>
      <PhotoUploaderPreview
        uploaderRef={uploaderRef}
        width={width}
        height={height}
        shape={shape}
        enableClipboardPaste={enableClipboardPaste}
        handlePaste={handlePaste}
        openFilePicker={openFilePicker}
        previewUrl={previewUrl}
        isLoadingOriginal={isLoadingOriginal}
        handleManualAdjust={handleManualAdjust}
        onClear={onClear}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
      />
      <PhotoCropEditor
        state={{ isCropping, bgRemovalEnabled, shape, zoom, isProcessingBg, isTeamLogo, fillEmptySpacesEnabled, emptySpacesColor, applyBorder, themeColor }}
        actions={{ setIsCropping, handleToggleBgRemoval, handlePointerDown, handlePointerMove, handlePointerUp, handleZoomChange, handleZoomWheel, setFillEmptySpacesEnabled, setEmptySpacesColor, setApplyBorder, handleConfirmCrop }}
        canvasRef={canvasRef}
      />
    </>
  );
});

const Container = styled.div`
  position: relative;
  width: ${(props) => props.$width};
  height: ${(props) => props.$height};
  flex-shrink: 0;
  margin: 0 auto;
  outline: none;

  &:focus-visible .preview-area {
    border-color: ${v.colorPrincipal};
    box-shadow: 0 0 0 4px ${v.colorPrincipal}2b;
  }

  .paste-hint {
    position: absolute;
    left: 50%;
    bottom: -24px;
    transform: translateX(-50%);
    width: max-content;
    max-width: 150px;
    padding: 4px 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.bg3};
    color: ${({ theme }) => theme.text};
    font-size: 11px;
    font-weight: 700;
    line-height: 1.2;
    opacity: 0.68;
    pointer-events: none;
    transition:
      opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
      background 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  &:focus-within .paste-hint,
  &:hover .paste-hint {
    opacity: 1;
    background: ${v.colorPrincipal}1f;
  }

  .preview-area {
    width: 100%;
    height: 100%;
    padding: 8px;
    color: inherit;
    font: inherit;
    border-radius: ${(props) => (props.$shape === "circle" ? "50%" : "16px")};
    overflow: hidden;
    background: ${({ theme }) => theme.bg3};
    border: 2px solid ${({ theme }) => theme.bg4};
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
      background 180ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 180ms cubic-bezier(0.22, 1, 0.36, 1);

    &:hover {
      border-color: ${v.colorPrincipal};
      background: ${({ theme }) => theme.bgtotal};
    }

    &:active {
      transform: scale(0.985);
    }

    &:hover .overlay,
    &:focus-visible .overlay {
      opacity: 1;
    }

    &:focus-visible {
      outline: 3px solid ${v.colorPrincipal}55;
      outline-offset: 3px;
    }

    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: ${({ theme }) => theme.text};
      gap: 7px;
      font-size: 13px;
      font-weight: 700;
      opacity: 0.72;

      svg {
        font-size: 1.8rem;
        color: ${v.colorPrincipal};
      }
    }
  }

  .img-final {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    border-radius: ${(props) => (props.$shape === "circle" ? "50%" : "10px")};
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(8, 18, 24, 0.62);
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    opacity: 0;
    font-size: 12px;
    font-weight: 700;
    transition: opacity 180ms cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;

    svg {
      font-size: 1.35rem;
    }
  }

  .mini-tools {
    position: absolute;
    bottom: -8px;
    right: -8px;
    display: flex;
    gap: 7px;
    z-index: 5;
  }

  .tool-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid ${({ theme }) => theme.bgcards};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    transition:
      transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 180ms cubic-bezier(0.22, 1, 0.36, 1);

    &.edit {
      background: ${v.colorPrincipal};
    }

    &.delete {
      background: ${v.rojo};
    }

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      filter: brightness(0.96);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:focus-visible {
      outline: 3px solid ${v.colorPrincipal}55;
      outline-offset: 2px;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.72;
    }
  }

  @media (hover: none) {
    .overlay {
      align-items: flex-start;
      justify-content: flex-end;
      padding: 10px;
      background: linear-gradient(transparent 52%, rgba(8, 18, 24, 0.72));
      opacity: 1;

      svg {
        display: none;
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .preview-area,
    .overlay,
    .tool-btn,
    .paste-hint {
      transition-duration: 0.01ms;
    }
  }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const processingPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.82; }
  50% { transform: scale(1.06); opacity: 1; }
`;

const processingSweep = keyframes`
  0% { transform: translateY(-120%); }
  100% { transform: translateY(520%); }
`;

const LoadingSpinner = styled.span`
  width: 18px;
  height: 18px;
  display: inline-block;
  flex: 0 0 auto;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ${spin} 720ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 1.6s;
  }
`;

const CropModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: rgba(5, 12, 16, 0.78);
  backdrop-filter: blur(6px);
  color: ${({ theme }) => theme.text};

  .crop-card {
    width: min(100%, 820px);
    max-height: calc(100dvh - 40px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 16px;
    background: ${({ theme }) => theme.bgcards};
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.38);
  }

  .header {
    min-height: 74px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 20px;
    border-bottom: 1px solid ${({ theme }) => theme.color2};
  }

  .header-copy {
    min-width: 0;

    h3 {
      margin: 0;
      color: ${({ theme }) => theme.text};
      font-size: 1.12rem;
      font-weight: 800;
      line-height: 1.25;
      text-wrap: balance;
    }

    p {
      max-width: 58ch;
      margin: 4px 0 0;
      color: ${({ theme }) => theme.colorSubtitle};
      font-size: 0.86rem;
      line-height: 1.4;
      text-wrap: pretty;
    }
  }

  .close-button,
  .zoom-button,
  .btn-cancel,
  .btn-confirm {
    min-width: 44px;
    min-height: 44px;
    border: 0;
    font: inherit;
    cursor: pointer;
    transition:
      background 180ms cubic-bezier(0.22, 1, 0.36, 1),
      color 180ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 180ms cubic-bezier(0.22, 1, 0.36, 1);

    &:focus-visible {
      outline: 3px solid ${v.colorPrincipal}66;
      outline-offset: 2px;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.48;
    }
  }

  .close-button {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 12px;
    background: ${({ theme }) => theme.bg3};
    color: ${({ theme }) => theme.text};
    font-size: 1.3rem;

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.bg4};
    }
  }

  .editor-layout {
    display: grid;
    grid-template-columns: minmax(320px, 1.08fr) minmax(280px, 0.92fr);
    gap: 20px;
    min-height: 0;
    padding: 20px;
    overflow-y: auto;
  }

  .preview-column {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .canvas-wrapper {
    position: relative;
    width: min(100%, 420px);
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 14px;
    cursor: grab;
    touch-action: none;
    user-select: none;
    background-color: #fff;
    background-image:
      linear-gradient(45deg, #e7e9eb 25%, transparent 25%),
      linear-gradient(-45deg, #e7e9eb 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #e7e9eb 75%),
      linear-gradient(-45deg, transparent 75%, #e7e9eb 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0;

    &:active {
      cursor: grabbing;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
      transition: filter 220ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    &.is-processing canvas {
      filter: brightness(0.44) saturate(0.75) blur(0.5px);
    }

    .mask {
      position: absolute;
      inset: 0;
      pointer-events: none;
      border: 2px solid rgba(255, 255, 255, 0.84);
      box-shadow: inset 0 0 0 1px rgba(8, 18, 24, 0.2);

      &.circle {
        border-radius: 50%;
        box-shadow:
          0 0 0 999px rgba(5, 12, 16, 0.24),
          inset 0 0 0 1px rgba(8, 18, 24, 0.2);
      }
    }
  }

  .processing-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    overflow: hidden;
    padding: 24px;
    color: #fff;
    text-align: center;
    pointer-events: none;

    strong {
      font-size: 0.98rem;
      font-weight: 800;
    }

    > span:last-child {
      max-width: 28ch;
      color: rgba(255, 255, 255, 0.82);
      font-size: 0.8rem;
      line-height: 1.4;
    }
  }

  .processing-icon {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    margin-bottom: 4px;
    border-radius: 50%;
    background: ${v.colorPrincipal};
    color: #fff;
    font-size: 1.35rem;
    animation: ${processingPulse} 1.5s ease-in-out infinite;
  }

  .processing-scan {
    position: absolute;
    top: 0;
    left: 8%;
    width: 84%;
    height: 2px;
    background: rgba(132, 216, 255, 0.92);
    box-shadow: 0 0 12px rgba(132, 216, 255, 0.82);
    animation: ${processingSweep} 1.8s cubic-bezier(0.45, 0, 0.55, 1) infinite;
  }

  .drag-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin: 10px 0 0;
    color: ${({ theme }) => theme.colorSubtitle};
    font-size: 0.78rem;
    line-height: 1.4;
    text-align: center;
    text-wrap: pretty;

    svg {
      flex: 0 0 auto;
      color: ${v.colorPrincipal};
      font-size: 1rem;
    }
  }

  .controls-container {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .control-panel,
  .background-tool {
    border-radius: 14px;
    background: ${({ theme }) => theme.bgtotal};
  }

  .control-panel {
    padding: 14px;
  }

  .control-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 13px;

    > div,
    .option-copy,
    .tool-copy {
      min-width: 0;
    }

    strong {
      display: block;
      color: ${({ theme }) => theme.text};
      font-size: 0.9rem;
      line-height: 1.3;
    }

    span {
      display: block;
      margin-top: 2px;
      color: ${({ theme }) => theme.colorSubtitle};
      font-size: 0.76rem;
      line-height: 1.35;
    }

    output {
      flex: 0 0 auto;
      min-width: 52px;
      padding: 5px 8px;
      border-radius: 8px;
      background: ${({ theme }) => theme.bgcards};
      color: ${({ theme }) => theme.text};
      font-size: 0.8rem;
      font-weight: 800;
      text-align: center;
    }
  }

  .slider-group {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    align-items: center;
    gap: 10px;
  }

  .zoom-button {
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: ${({ theme }) => theme.bgcards};
    color: ${({ theme }) => theme.text};
    font-size: 1.2rem;

    &:hover:not(:disabled) {
      background: ${v.colorPrincipal}1f;
      color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || v.colorPrincipal};
    }

    &:active:not(:disabled) {
      transform: scale(0.95);
    }
  }

  .slider-group input[type="range"] {
    width: 100%;
    height: 32px;
    margin: 0;
    appearance: none;
    background: transparent;
    cursor: pointer;

    &:focus-visible {
      outline: 3px solid ${v.colorPrincipal}55;
      outline-offset: 2px;
      border-radius: 8px;
    }

    &::-webkit-slider-runnable-track {
      height: 6px;
      border-radius: 999px;
      background: linear-gradient(
        to right,
        ${v.colorPrincipal} 0 var(--zoom-progress),
        ${({ theme }) => theme.bg4} var(--zoom-progress) 100%
      );
    }

    &::-webkit-slider-thumb {
      width: 22px;
      height: 22px;
      margin-top: -8px;
      appearance: none;
      border: 3px solid ${v.colorPrincipal};
      border-radius: 50%;
      background: ${({ theme }) => theme.bgcards};
    }

    &::-moz-range-track {
      height: 6px;
      border-radius: 999px;
      background: ${({ theme }) => theme.bg4};
    }

    &::-moz-range-progress {
      height: 6px;
      border-radius: 999px;
      background: ${v.colorPrincipal};
    }

    &::-moz-range-thumb {
      width: 17px;
      height: 17px;
      border: 3px solid ${v.colorPrincipal};
      border-radius: 50%;
      background: ${({ theme }) => theme.bgcards};
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  .background-tool,
  .option-label {
    position: relative;
    min-height: 64px;
    display: flex;
    align-items: center;
    gap: 11px;
    cursor: pointer;
  }

  .background-tool {
    padding: 12px 14px;
    border: 1px solid transparent;
    transition:
      border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
      background 180ms cubic-bezier(0.22, 1, 0.36, 1);

    &:hover {
      background: ${({ theme }) => theme.bg3};
    }

    &:focus-within {
      outline: 3px solid ${v.colorPrincipal}55;
      outline-offset: 2px;
    }

    &.is-active,
    &.is-loading {
      border-color: ${v.colorPrincipal}88;
      background: ${v.colorPrincipal}12;
    }
  }

  .tool-icon,
  .option-icon,
  .team-color-swatch {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 11px;
    background: ${({ theme }) => theme.bgcards};
    color: ${v.colorPrincipal};
    font-size: 1.12rem;
  }

  .team-color-swatch {
    background: var(--team-color);
    box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.56);
  }

  .tool-copy,
  .option-copy {
    min-width: 0;
    flex: 1;

    strong {
      display: block;
      color: ${({ theme }) => theme.text};
      font-size: 0.86rem;
      line-height: 1.3;
    }

    > span {
      display: block;
      margin-top: 3px;
      color: ${({ theme }) => theme.colorSubtitle};
      font-size: 0.74rem;
      line-height: 1.35;
      text-wrap: pretty;
    }
  }

  .background-tool > input[type="checkbox"],
  .option-label > input[type="checkbox"] {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .switch {
    width: 44px;
    height: 26px;
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    padding: 3px;
    border-radius: 999px;
    background: ${({ theme }) => theme.bg4};
    transition: background 180ms cubic-bezier(0.22, 1, 0.36, 1);

    > span {
      width: 20px;
      height: 20px;
      display: block;
      border-radius: 50%;
      background: ${({ theme }) => theme.bgcards};
      transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }
  }

  input[type="checkbox"]:checked + .switch {
    background: ${v.colorPrincipal};

    > span {
      transform: translateX(18px);
    }
  }

  input[type="checkbox"]:disabled + .switch {
    opacity: 0.58;
  }

  .team-options {
    display: flex;
    flex-direction: column;
    padding: 4px 12px;
  }

  .option-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 44px;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid ${({ theme }) => theme.color2};
  }

  .option-label {
    padding: 9px 0;

    &:focus-within {
      outline: 3px solid ${v.colorPrincipal}55;
      outline-offset: 2px;
      border-radius: 10px;
    }
  }

  .team-options > .option-label {
    padding: 9px 0;
  }

  .fill-color-input {
    width: 44px;
    height: 44px;
    padding: 4px;
    border: 0;
    border-radius: 11px;
    background: ${({ theme }) => theme.bgcards};
    cursor: pointer;

    &::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    &::-webkit-color-swatch {
      border: 0;
      border-radius: 7px;
    }

    &:focus-visible {
      outline: 3px solid ${v.colorPrincipal}66;
      outline-offset: 2px;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.42;
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px 18px;
    border-top: 1px solid ${({ theme }) => theme.color2};
  }

  .btn-cancel,
  .btn-confirm {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 18px;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 800;
  }

  .btn-cancel {
    background: ${({ theme }) => theme.bg3};
    color: ${({ theme }) => theme.text};

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.bg4};
    }
  }

  .btn-confirm {
    background: ${v.colorPrincipal};
    color: #08202b;

    &:hover:not(:disabled) {
      filter: brightness(0.96);
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }

  @media (max-width: 720px) {
    align-items: flex-start;
    padding: 10px;

    .crop-card {
      width: 100%;
      max-height: calc(100dvh - 20px);
    }

    .header {
      min-height: 68px;
      padding: 13px 14px;
    }

    .header-copy p {
      font-size: 0.8rem;
    }

    .editor-layout {
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
      padding: 14px;
    }

    .canvas-wrapper {
      width: min(100%, 430px);
    }

    .drag-hint {
      max-width: 42ch;
    }

    .actions {
      padding: 12px 14px 14px;
    }
  }

  @media (max-width: 440px) {
    padding: 6px;

    .crop-card {
      max-height: calc(100dvh - 12px);
      border-radius: 14px;
    }

    .header {
      min-height: 62px;
      padding: 10px 12px;
    }

    .header-copy p {
      display: none;
    }

    .editor-layout {
      gap: 12px;
      padding: 10px 12px 12px;
    }

    .canvas-wrapper {
      border-radius: 12px;
    }

    .drag-hint {
      margin-top: 7px;
      font-size: 0.74rem;
    }

    .control-panel {
      padding: 12px;
    }

    .background-tool {
      padding: 10px 12px;
    }

    .tool-copy > span,
    .option-copy > span {
      font-size: 0.72rem;
    }

    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 10px 12px 12px;
    }

    .btn-cancel,
    .btn-confirm {
      width: 100%;
      padding: 0 12px;
    }
  }

  @media (max-height: 700px) and (min-width: 721px) {
    align-items: flex-start;

    .crop-card {
      max-height: calc(100dvh - 24px);
    }

    .editor-layout {
      padding-block: 14px;
    }

    .canvas-wrapper {
      width: min(52vh, 380px);
    }

    .drag-hint {
      margin-top: 6px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .processing-icon,
    .processing-scan,
    ${LoadingSpinner} {
      animation: none;
    }

    .canvas-wrapper canvas,
    .close-button,
    .zoom-button,
    .background-tool,
    .switch,
    .switch > span,
    .btn-cancel,
    .btn-confirm {
      transition-duration: 0.01ms;
    }
  }
`;
