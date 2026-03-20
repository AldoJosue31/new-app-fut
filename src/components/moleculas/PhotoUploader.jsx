import React, { useState, useRef, useEffect, memo } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { 
  RiImageAddLine, RiZoomInLine, RiZoomOutLine, 
  RiCheckLine, RiCloseLine, RiCropLine, RiEraserLine
} from "react-icons/ri";
import { BtnNormal } from "./BtnNormal";
import { removeBackground } from "../../utils/imageProcessor"; 

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
  height = "120px" 
}) {
  const [isCropping, setIsCropping] = useState(false);
  const [originalFile, setOriginalFile] = useState(null); 
  const [tempImgSrc, setTempImgSrc] = useState(null);     
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  
  const [bgRemovalEnabled, setBgRemovalEnabled] = useState(false);
  const [applyBorder, setApplyBorder] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  
  if (!imageRef.current) {
    imageRef.current = new Image();
  }

  const [backupImage, setBackupImage] = useState(null);

  useEffect(() => {
    if (propOriginalFile) {
      setOriginalFile(propOriginalFile);
    }
  }, [propOriginalFile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOriginalFile(file);
      const url = URL.createObjectURL(file);
      startCropper(url);
      e.target.value = '';
    }
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
            } catch (err2) {
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
         } catch(e) {
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
    if(!originalFile) return;
    setIsProcessingBg(true);
    if(showToast) showToast("La IA está analizando la imagen...", "info");

    try {
        if (!backupImage) {
          setBackupImage({ file: originalFile, preview: tempImgSrc });
        }
        
        // El motor evalúa automáticamente si es un equipo o un jugador
        const bgType = isTeamLogo ? 'logo' : 'person';
        const { file, preview } = await removeBackground(originalFile, bgType);
        
        setOriginalFile(file);
        setTempImgSrc(preview); 
        if(showToast) showToast("Fondo eliminado con éxito", "success");
    } catch (error) {
        if(showToast) showToast("Error: " + error.message, "error");
    } finally {
        setIsProcessingBg(false);
    }
  };

  const handleToggleBgRemoval = (e) => {
    const isEnabled = e.target.checked;
    setBgRemovalEnabled(isEnabled);
    if (!isEnabled && backupImage) {
      setOriginalFile(backupImage.file);
      setTempImgSrc(backupImage.preview);
      setBackupImage(null);
      if(showToast) showToast("Se restauró la imagen original", "info");
    }
  };

  const handleMouseDown = (e) => { setIsDragging(true); setStartPan({ x: e.clientX - crop.x, y: e.clientY - crop.y }); };
  const handleMouseMove = (e) => { if (!isDragging) return; setCrop({ x: e.clientX - startPan.x, y: e.clientY - startPan.y }); };
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
      if (isCropping && tempImgSrc && canvasRef.current) {
          const img = imageRef.current;
          img.crossOrigin = "anonymous"; 
          img.src = tempImgSrc;
          img.onload = () => {
               const canvas = canvasRef.current;
               const ctx = canvas.getContext("2d");
               const size = 400; canvas.width = size; canvas.height = size;
               
               // Limpiamos el canvas dejándolo 100% transparente
               ctx.clearRect(0, 0, size, size);
  
               const scaleBase = Math.max(size/img.width, size/img.height);
               const currentScale = scaleBase * zoom;
               const scaledW = img.width * currentScale;
               const scaledH = img.height * currentScale;
               const x = (size - scaledW)/2 + crop.x;
               const y = (size - scaledH)/2 + crop.y;

               ctx.drawImage(img, x, y, scaledW, scaledH);

               if (isTeamLogo && applyBorder) {
                  ctx.strokeStyle = themeColor;
                  ctx.lineWidth = 15;
                  if (shape === "circle") {
                      ctx.beginPath();
                      ctx.arc(size/2, size/2, (size/2) - (ctx.lineWidth/2), 0, Math.PI * 2);
                      ctx.stroke();
                  } else {
                      ctx.strokeRect(0, 0, size, size);
                  }
               }
          };
      }
  }, [isCropping, tempImgSrc, crop, zoom, isTeamLogo, applyBorder, themeColor, shape]);

  return (
    <>
      <Container $width={width} $height={height} $shape={shape}>
        <div className="preview-area" onClick={() => fileInputRef.current.click()}>
          {previewUrl ? <img src={previewUrl} alt="Preview" className="img-final" /> : <div className="placeholder"><RiImageAddLine /><span>Subir</span></div>}
          <div className="overlay"><RiCropLine /><span>{previewUrl ? "Cambiar" : "Seleccionar"}</span></div>
        </div>
        {previewUrl && (
          <div className="mini-tools">
             <button type="button" className="tool-btn edit" onClick={handleManualAdjust} title="Recortar">
                {isLoadingOriginal ? "..." : <RiCropLine />}
             </button>
             <button type="button" className="tool-btn delete" onClick={(e)=>{e.preventDefault(); onClear();}}><RiCloseLine /></button>
          </div>
        )}
        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
      </Container>
      
      {isCropping && (
        <CropModalOverlay onClick={() => setIsCropping(false)}>
            <div className="crop-card" onClick={e=>e.stopPropagation()}>
                <div className="header">
                    <h3>Ajustar Imagen</h3>
                    <ToggleLabel>
                         <input type="checkbox" checked={bgRemovalEnabled} onChange={handleToggleBgRemoval} />
                         <span>Quitar Fondo</span>
                    </ToggleLabel>
                </div>

                <div className="canvas-wrapper" 
                     onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} 
                     onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                   <canvas ref={canvasRef} />
                   <div className={`mask ${shape}`}></div>
                </div>

                 <div className="controls-container">
                    <div className="slider-group">
                        <RiZoomOutLine />
                        <input type="range" min="0.1" max="5" step="0.01" value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))} />
                        <RiZoomInLine />
                    </div>
                    {bgRemovalEnabled && (
                        <button type="button" className="magic-btn" onClick={handleRemoveBgInside} disabled={isProcessingBg}>
                             {isProcessingBg ? "Quitando fondo..." : <><RiEraserLine /> Ejecutar IA</>}
                        </button>
                    )}
                    {isTeamLogo && (
                        <ToggleLabel style={{justifyContent:'center', marginTop:'10px'}}>
                            <input type="checkbox" checked={applyBorder} onChange={e => setApplyBorder(e.target.checked)} />
                            <span style={{color: themeColor, fontWeight:'700'}}>Aplicar borde del uniforme</span>
                        </ToggleLabel>
                    )}
                 </div>

                <div className="actions">
                    <BtnNormal titulo="Cancelar" funcion={() => setIsCropping(false)} />
                    <button type="button" className="btn-confirm" onClick={handleConfirmCrop}><RiCheckLine /> Confirmar</button>
                </div>
            </div>
        </CropModalOverlay>
      )}
    </>
  );
});

const Container = styled.div`
  position: relative;
  width: ${(props) => props.$width};
  height: ${(props) => props.$height};
  flex-shrink: 0;
  margin: 0 auto;
  .preview-area {
    width: 100%;
    height: 100%;
    border-radius: ${(props) => (props.$shape === "circle" ? "50%" : "16px")};
    overflow: hidden;
    background: ${({ theme }) => theme.bg3};
    border: 2px dashed ${({ theme }) => theme.bg4};
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover .overlay {
      opacity: 1;
    }
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: ${({ theme }) => theme.text};
      opacity: 0.5;
      gap: 5px;
      font-size: 12px;
    }
  }
  .img-final {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: 0.2s;
    pointer-events: none;
  }
  .mini-tools {
    position: absolute;
    bottom: -5px;
    right: -5px;
    display: flex;
    gap: 5px;
    z-index: 5;
  }
  .tool-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    &.edit {
      background: ${v.colorPrincipal};
    }
    &.delete {
      background: ${v.rojo};
    }
    &:hover {
      transform: scale(1.1);
    }
  }
`;

const CropModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
  .crop-card {
    background: ${({ theme }) => theme.bgcards};
    padding: 20px;
    border-radius: 20px;
    width: 90%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    .header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 {
        margin: 0;
        font-size: 1rem;
        color: ${({ theme }) => theme.text};
      }
    }
  }
  .canvas-wrapper {
    width: 300px;
    height: 300px;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    cursor: grab;
    
    background-color: #fff;
    background-image:
      linear-gradient(45deg, #eee 25%, transparent 25%),
      linear-gradient(-45deg, #eee 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #eee 75%),
      linear-gradient(-45deg, transparent 75%, #eee 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;

    &:active { cursor: grabbing; }
    canvas { width: 100%; height: 100%; }
    .mask { position: absolute; inset: 0; pointer-events: none; border: 2px solid rgba(255,255,255,0.5); &.circle { border-radius: 50%; } }
  }
  .controls-container { width: 100%; display: flex; flex-direction: column; gap: 10px; }
  .slider-group { display: flex; align-items: center; gap: 10px; color: ${({ theme }) => theme.text}; input { flex: 1; accent-color: ${v.colorPrincipal}; } }
  .magic-btn { background: #6c5ce7; color: white; border: none; padding: 8px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .actions { width: 100%; display: flex; justify-content: flex-end; gap: 10px;
    .btn-confirm { background: ${v.colorPrincipal}; color: white; border: none; padding: 8px 20px; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; }
  }
`;

const ToggleLabel = styled.label`
  display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: ${({ theme }) => theme.text};
  input { cursor: pointer; width: 18px; height: 18px; accent-color: #6c5ce7; }
`;