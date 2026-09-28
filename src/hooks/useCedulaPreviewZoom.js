import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const MAX_ZOOM_CLICKS = 2;

export function useCedulaPreviewZoom({ coarseDevice = null, requirePointerReentry = false, visible = true } = {}) {
  const [zoomClicks, setZoomClicks] = useState(0);
  const previewRef = useRef(null);
  const zoomReadyRef = useRef(!requirePointerReentry);

  useLayoutEffect(() => {
    if (!requirePointerReentry) return;
    // Bloquear también :hover antes de pintar evita ampliar debajo de un cursor quieto.
    zoomReadyRef.current = false;
    previewRef.current?.setAttribute('data-zoom-ready', 'false');
  }, [requirePointerReentry, visible]);

  const updateOrigin = useCallback((event) => {
    if (!visible || !zoomReadyRef.current) return;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    element.style.setProperty('--preview-zoom-x', `${Math.max(0, Math.min(100, x))}%`);
    element.style.setProperty('--preview-zoom-y', `${Math.max(0, Math.min(100, y))}%`);
  }, [visible]);

  const adjustZoom = useCallback((event, amount) => {
    if (!visible || !zoomReadyRef.current) return;
    updateOrigin(event);
    setZoomClicks(current => Math.max(0, Math.min(current + amount, MAX_ZOOM_CLICKS)));
  }, [updateOrigin, visible]);

  const increaseZoom = useCallback((event) => adjustZoom(event, 1), [adjustZoom]);

  const handleWheel = useCallback((event) => {
    if (!visible || !zoomReadyRef.current) return;
    const coarse = coarseDevice ?? window.matchMedia('(pointer: coarse), (max-width: 1024px)').matches;
    if (coarse || !event.deltaY) return;
    event.preventDefault();
    adjustZoom(event, event.deltaY < 0 ? 1 : -1);
  }, [adjustZoom, coarseDevice, visible]);

  const resetZoom = useCallback((event) => {
    setZoomClicks(0);
    event.currentTarget.style.setProperty('--preview-zoom-x', '50%');
    event.currentTarget.style.setProperty('--preview-zoom-y', '50%');
  }, []);

  const handlePointerLeave = useCallback((event) => {
    resetZoom(event);
    if (!requirePointerReentry || !visible) return;
    zoomReadyRef.current = true;
    event.currentTarget.setAttribute('data-zoom-ready', 'true');
  }, [requirePointerReentry, resetZoom, visible]);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    increaseZoom(event);
  }, [increaseZoom]);

  return {
    zoomClicks,
    handlers: {
      ref: previewRef,
      'data-zoom-ready': requirePointerReentry ? 'false' : undefined,
      onPointerMove: updateOrigin,
      onPointerEnter: updateOrigin,
      onPointerLeave: handlePointerLeave,
      onBlur: resetZoom,
      onClick: increaseZoom,
      onKeyDown: handleKeyDown,
      onWheel: handleWheel,
    },
  };
}
