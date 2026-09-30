import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useCedulaPreviewZoom } from '../../../../../../hooks/useCedulaPreviewZoom.js';
import { cedulaPreviewZoomStyles } from './CedulaFlowPrimitives';

export function CedulaReferencePanel({ photo, visible = true, onPreferredWidth }) {
  const { zoomClicks, handlers: zoomHandlers } = useCedulaPreviewZoom({ requirePointerReentry: true, visible });
  const [maxImageHeight, setMaxImageHeight] = useState(null);
  const panelRef = useRef(null);
  const headerRef = useRef(null);
  const imageRef = useRef(null);

  const reportPreferredWidth = useCallback(() => {
    const panel = panelRef.current;
    const dockPanel = panel?.parentElement;
    const image = imageRef.current;
    if (!dockPanel?.clientHeight || !image?.naturalWidth || !image.naturalHeight) return;
    const stacked = window.matchMedia('(max-width: 900px)').matches;
    const availableHeight = stacked ? dockPanel.clientHeight : dockPanel.nextElementSibling.clientHeight;
    const styles = getComputedStyle(panel);
    const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const imageHeight = Math.max(1, Math.floor(availableHeight - verticalPadding - headerRef.current.offsetHeight - parseFloat(styles.rowGap)));
    // El ancho ideal parte de la altura útil; si no cabe, la foto conserva su proporción.
    setMaxImageHeight(imageHeight);
    const imageWidth = imageHeight * image.naturalWidth / image.naturalHeight;
    onPreferredWidth?.(Math.max(248, Math.ceil(imageWidth + horizontalPadding + 1)));
  }, [onPreferredWidth]);

  useLayoutEffect(() => {
    if (!visible) return;
    reportPreferredWidth();
    const observer = new ResizeObserver(reportPreferredWidth);
    observer.observe(panelRef.current.parentElement.parentElement);
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [visible, photo.url, reportPreferredWidth]);

  return <ReferencePanel ref={panelRef}>
    <ReferenceHeader ref={headerRef}>
      <div>
        <h4>Cédula del partido</h4>
        <span>{photo.pending ? 'Foto sin guardar' : 'Foto guardada'}</span>
      </div>
    </ReferenceHeader>
    <PhotoCanvas
      $zoomClicks={zoomClicks}
      $maxImageHeight={maxImageHeight}
      role="button"
      tabIndex={0}
      aria-label="Vista ampliable de la cédula. Haz clic o usa la rueda para ajustar el zoom."
      title="Pasa el cursor para ampliar. Clic o rueda ajustan el zoom. En móvil mantiene la vista completa."
      {...zoomHandlers}
    >
      <img ref={imageRef} src={photo.url} onLoad={reportPreferredWidth} alt="Foto de la cédula del partido" />
    </PhotoCanvas>
  </ReferencePanel>;
}

const ReferencePanel = styled.div`
  display:flex;
  flex:1;
  flex-direction:column;
  min-height:0;
  min-width:0;
  padding:16px 12px 12px;
  gap:12px;
`;

const ReferenceHeader = styled.div`
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  flex:0 0 auto;
  h4{margin:0;font-size:.95rem;line-height:1.3;}
  span{font-size:.76rem;opacity:.7;}
`;

const PhotoCanvas = styled.div`
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:0;
  min-width:0;
  overflow:hidden;
  max-height:${({$maxImageHeight})=>$maxImageHeight ? `${$maxImageHeight}px` : '70dvh'};
  overscroll-behavior:contain;
  img{
    display:block;
    flex:0 0 auto;
    width:auto;
    height:auto;
    max-width:100%;
    max-height:${({$maxImageHeight})=>$maxImageHeight ? `${$maxImageHeight}px` : '70dvh'};
    object-fit:contain;
    object-position:center;
  }
  ${cedulaPreviewZoomStyles}
  @media(max-width:900px){flex:1;}
`;
