import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { 
  RiImageAddLine, RiZoomInLine, RiZoomOutLine, 
  RiCheckLine, RiCloseLine, RiCropLine, RiEraserLine
} from "react-icons/ri";
import { BtnNormal } from "./BtnNormal";
// Asegúrate de importar la utilidad si la usas aquí, o si viene por props como en tu lógica anterior
import { removeBackground } from "../../utils/imageProcessor"; 

export function PhotoUploader({ 
  previewUrl,    
  originalUrl,   
  onImageSelect, 
  onClear,
  shape = "circle",
  width = "120px", 
  height = "120px" 
}) {
  const [isCropping, setIsCropping] = useState(false);
  const [originalFile, setOriginalFile] = useState(null); 
  const [tempImgSrc, setTempImgSrc] = useState(null);     
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  const [isProcessingBg, setIsProcessingBg] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(new Image());

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
    setZoom(1); setCrop({ x: 0, y: 0 }); setIsCropping(true); 
  };

  const handleManualAdjust = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (originalFile) {
      const url = URL.createObjectURL(originalFile);
      startCropper(url);
      return;
    }
    if (originalUrl) {
      try {
        setIsLoadingOriginal(true);
        const response = await fetch(originalUrl, { cache: 'no-cache' });
        const blob = await response.blob();
        const file = new File([blob], "original_downloaded.png", { type: blob.type });
        setOriginalFile(file);
        const localUrl = URL.createObjectURL(blob);
        startCropper(localUrl);
      } catch (error) {
        alert("Error cargando original. Sube una nueva.");
      } finally {
        setIsLoadingOriginal(false);
      }
    } else {
        alert("Sube una imagen primero.");
    }
  };

  const handleRemoveBgInside = async () => {
    if(!originalFile) return;
    setIsProcessingBg(true);
    try {
        const { file, preview } = await removeBackground(originalFile);
        setOriginalFile(file);
        setTempImgSrc(preview); 
    } catch (error) {
        alert("No se pudo quitar el fondo.");
    } finally {
        setIsProcessingBg(false);
    }
  };

  // --- CORRECCIÓN IMPORTANTE AQUÍ ---
  const handleConfirmCrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    // 1. Limpiamos el canvas COMPLETO para borrar el patrón de ajedrez
    const size = canvas.width; // (Debería ser 400 según tu lógica abajo)
    ctx.clearRect(0, 0, size, size);

    // 2. Volvemos a dibujar SOLO LA IMAGEN con las coordenadas actuales
    const scaleBase = Math.max(size/img.width, size/img.height);
    const currentScale = scaleBase * zoom;
    const scaledW = img.width * currentScale;
    const scaledH = img.height * currentScale;
    const x = (size - scaledW)/2 + crop.x;
    const y = (size - scaledH)/2 + crop.y;
    
    ctx.drawImage(img, x, y, scaledW, scaledH);

    // 3. Exportamos el blob limpio
    canvas.toBlob((blob) => {
      const newCroppedFile = new File([blob], "crop.png", { type: "image/png" });
      const newPreviewUrl = URL.createObjectURL(blob);
      onImageSelect(newCroppedFile, originalFile, newPreviewUrl);
      setIsCropping(false);
      setTempImgSrc(null);
    }, 'image/png', 0.95);
  };

  // Renderizado del Canvas (Visualización para el usuario)
  useEffect(() => {
    if (isCropping && tempImgSrc && canvasRef.current) {
        const img = imageRef.current;
        img.crossOrigin = "anonymous"; 
        img.src = tempImgSrc;
        img.onload = () => {
             const canvas = canvasRef.current;
             const ctx = canvas.getContext("2d");
             const size = 400; canvas.width = size; canvas.height = size;
             ctx.clearRect(0,0,size,size);
             
             // --- ESTO ES LO QUE SE VEÍA EN EL RESULTADO ---
             // Dibujamos el patrón de fondo SOLO para la vista previa del usuario
             const gridSize = 20;
             for(let i=0; i<size; i+=gridSize) {
                for(let j=0; j<size; j+=gridSize) {
                    ctx.fillStyle = (i/gridSize + j/gridSize) % 2 === 0 ? '#ddd' : '#fff';
                    ctx.fillRect(i,j,gridSize,gridSize);
                }
             }
             // ---------------------------------------------

             const scaleBase = Math.max(size/img.width, size/img.height);
             const currentScale = scaleBase * zoom;
             const scaledW = img.width * currentScale;
             const scaledH = img.height * currentScale;
             const x = (size - scaledW)/2 + crop.x;
             const y = (size - scaledH)/2 + crop.y;
             ctx.drawImage(img, x, y, scaledW, scaledH);
        };
    }
  }, [isCropping, tempImgSrc, crop, zoom]);
  
  const handleMouseDown = (e) => { setIsDragging(true); setStartPan({ x: e.clientX - crop.x, y: e.clientY - crop.y }); };
  const handleMouseMove = (e) => { if (!isDragging) return; setCrop({ x: e.clientX - startPan.x, y: e.clientY - startPan.y }); };
  const handleMouseUp = () => setIsDragging(false);

  return (
    <>
      <Container $width={width} $height={height} $shape={shape}>
        <div className="preview-area" onClick={() => fileInputRef.current.click()}>
          {previewUrl ? (
             <img src={previewUrl} alt="Preview" className="img-final" />
          ) : (
             <div className="placeholder"><RiImageAddLine /><span>Subir</span></div>
          )}
          <div className="overlay"><RiCropLine /><span>{previewUrl ? "Cambiar" : "Seleccionar"}</span></div>
        </div>
        {previewUrl && (
          <div className="mini-tools">
             <button type="button" className="tool-btn edit" onClick={handleManualAdjust} disabled={isLoadingOriginal}>
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
                    <button className="magic-btn" onClick={handleRemoveBgInside} disabled={isProcessingBg}>
                        {isProcessingBg ? "..." : <><RiEraserLine /> Quitar Fondo</>}
                    </button>
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
                        <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))} />
                        <RiZoomInLine />
                    </div>
                    <div className="presets">
                        <button type="button" onClick={()=>setZoom(1)}>100%</button>
                        <button type="button" onClick={()=>setZoom(1.5)}>150%</button>
                        <button type="button" onClick={()=>setZoom(2)}>200%</button>
                    </div>
                 </div>

                <div className="actions">
                    <BtnNormal titulo="Cancelar" funcion={() => setIsCropping(false)} />
                    <button type="button" className="btn-confirm" onClick={handleConfirmCrop}>
                         <RiCheckLine /> Confirmar
                    </button>
                </div>
            </div>
        </CropModalOverlay>
      )}
    </>
  );
}

// Styles
const Container = styled.div`
  position: relative; width: ${props => props.$width}; height: ${props => props.$height}; flex-shrink: 0; margin: 0 auto;
  .preview-area {
    width: 100%; height: 100%; border-radius: ${props => props.$shape === 'circle' ? '50%' : '16px'};
    overflow: hidden; background: ${({theme}) => theme.bg3}; border: 2px dashed ${({theme}) => theme.bg4};
    cursor: pointer; position: relative; display: flex; align-items: center; justify-content: center;
    /* Fondo de ajedrez también en el preview para ver transparencia final */
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), 
                      linear-gradient(-45deg, #ccc 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #ccc 75%), 
                      linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    background-color: white;

    &:hover .overlay { opacity: 1; }
  }
  .img-final { width: 100%; height: 100%; object-fit: contain; }
  .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; pointer-events: none; }
  .mini-tools { position: absolute; bottom: -5px; right: -5px; display: flex; gap: 5px; z-index: 5; }
  .tool-btn { width: 28px; height: 28px; border-radius: 50%; border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; &.edit { background: ${v.colorPrincipal}; } &.delete { background: ${v.rojo}; } &:hover { transform: scale(1.1); } }
`;

const CropModalOverlay = styled.div`
  position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);
  .crop-card {
    background: ${({theme}) => theme.bgcards}; padding: 20px; border-radius: 20px; width: 90%; max-width: 400px;
    display: flex; flex-direction: column; align-items: center; gap: 15px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    .header { width: 100%; display: flex; justify-content: space-between; align-items: center; h3 { margin: 0; font-size: 1rem; color: ${({theme})=>theme.text}; } }
    .magic-btn { background: #6c5ce7; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 5px; &:hover { filter: brightness(1.1); } &:disabled { opacity: 0.5; } }
  }
  .canvas-wrapper {
    width: 280px; height: 280px; position: relative; background: #333; border-radius: 8px; overflow: hidden; cursor: grab;
    &:active { cursor: grabbing; }
    canvas { width: 100%; height: 100%; display: block; }
    .mask { position: absolute; inset: 0; pointer-events: none; border: 2px solid rgba(255,255,255,0.5); box-shadow: 0 0 0 100px rgba(0,0,0,0.7); &.circle { border-radius: 50%; } }
  }
  .controls-container { width: 100%; display: flex; flex-direction: column; gap: 8px; }
  .slider-group { display: flex; align-items: center; gap: 10px; color: ${({theme})=>theme.text}; input { flex: 1; accent-color: ${v.colorPrincipal}; } }
  .presets { display: flex; justify-content: center; gap: 8px; button { background: ${({theme})=>theme.bgtotal}; border: 1px solid ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; &:hover { background: ${({theme})=>theme.primary}; color: white; } } }
  .actions { width: 100%; display: flex; justify-content: flex-end; gap: 10px; .btn-confirm { background: ${v.colorPrincipal}; color: white; border: none; padding: 8px 20px; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; } }
`;