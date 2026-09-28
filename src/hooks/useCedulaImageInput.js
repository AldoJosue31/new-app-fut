import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { isPotentialImageFile, MAX_SCAN_IMAGE_BYTES } from '../utils/scanImageUtils.js';

const clipboardImage = (clipboardData) => {
  const file = [...(clipboardData?.files || [])].find(item => item.type?.startsWith('image/'));
  if (file) return file;
  return [...(clipboardData?.items || [])]
    .find(item => item.kind === 'file' && item.type?.startsWith('image/'))?.getAsFile() || null;
};

export function useCedulaImageInput({ onSelect, showToast, disabled = false }) {
  const uploadRef = useRef(null);
  const cameraRef = useRef(null);
  const selectingRef = useRef(false);
  const [selecting, setSelecting] = useState(false);
  const [coarseDevice, setCoarseDevice] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse), (max-width: 1024px)');
    const update = () => setCoarseDevice(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  const select = useCallback(async (file, pasted = false) => {
    if (!file || disabled || selectingRef.current) return;
    if (!isPotentialImageFile(file)) return showToast('Selecciona un archivo de imagen.', 'error');
    if (!file.size || file.size > MAX_SCAN_IMAGE_BYTES) return showToast('La imagen debe pesar entre 1 byte y 12 MB.', 'error');
    selectingRef.current = true;
    setSelecting(true);
    try {
      await onSelect(file);
      if (pasted) showToast('Imagen pegada desde el portapapeles.', 'success');
    } catch (error) {
      showToast(error.message || 'No se pudo cargar la imagen. Intenta con otra foto.', 'error');
    } finally {
      selectingRef.current = false;
      setSelecting(false);
    }
  }, [disabled, onSelect, showToast]);

  const receivePaste = useEffectEvent((event) => {
    if (disabled || selectingRef.current) return;
    const image = clipboardImage(event.clipboardData);
    if (!image) return;
    event.preventDefault();
    void select(image, true);
  });

  useEffect(() => {
    const handlePaste = event => receivePaste(event);
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const pasteFromClipboard = async () => {
    if (disabled || selectingRef.current) return;
    if (!navigator.clipboard?.read) {
      showToast('Usa Ctrl/Cmd + V para pegar la imagen, o elige Cargar imagen.', 'warning');
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const item = items.find(entry => entry.types.some(type => type.startsWith('image/')));
      const mimeType = item?.types.find(type => type.startsWith('image/'));
      if (!mimeType) return showToast('Copia una imagen antes de pegarla.', 'warning');
      const blob = await item.getType(mimeType);
      await select(new File([blob], 'cedula-pegada', { type: mimeType }), true);
    } catch {
      showToast('No se pudo leer el portapapeles. Usa Ctrl/Cmd + V o elige Cargar imagen.', 'warning');
    }
  };

  const onFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    void select(file);
  };

  return { uploadRef, cameraRef, onFileChange, pasteFromClipboard, coarseDevice, disabled: disabled || selecting };
}
