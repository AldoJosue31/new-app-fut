import styled, { css } from 'styled-components';
import { v } from '../../../../../../styles/variables';

export const ScanShell = styled.section`
  display:flex;flex:1;flex-direction:column;gap:18px;min-height:0;overflow-x:hidden;
  overflow-y:${({ $review, $warning }) => $review || $warning ? 'hidden' : 'auto'};
  overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-gutter:stable;
  &:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
`;
export const PanelHeading = styled.div`
  display:flex;align-items:flex-start;gap:12px;
  button{width:36px;min-height:36px;flex-shrink:0;display:grid;place-items:center;border:1px solid ${({ theme }) => theme.bg4};border-radius:10px;background:transparent;color:${({ theme }) => theme.text};cursor:pointer;font-size:1.1rem;}
  button:hover:not(:disabled){background:${({ theme }) => theme.bg3};}
  button:disabled{opacity:.62;cursor:wait;}
  button:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
  h4,p{margin:0;}h4{font-size:1.05rem;}p{margin-top:4px;opacity:.72;line-height:1.45;}
  @media(max-width:560px){button{width:44px;min-height:44px;}}
`;
export const ChoiceRow = styled.div`
  display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;
  @media(min-width:561px){> button{margin-block:2px;}}
`;
export const Action = styled.button`
  box-sizing:border-box;min-height:var(--result-modal-action-height,40px);padding:var(--result-modal-action-padding,9px 16px);border-radius:10px;font:inherit;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;
  &:disabled{cursor:wait;opacity:.62;} &:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
  @media(max-width:600px){flex:1;min-height:44px;}
`;
export const PrimaryAction = styled(Action)`border:1px solid ${v.colorPrincipal};background:${v.colorPrincipal};color:#fff;`;
export const SecondaryAction = styled(Action)`border:1px solid ${({ theme }) => theme.bg4};background:transparent;color:${({ theme }) => theme.text};&:hover:not(:disabled){background:${({ theme }) => theme.bg3};}`;
export const PreviewFrame = styled.div`
  position:relative;height:clamp(420px,64vh,680px);min-width:0;min-height:0;flex:1;border-radius:14px;overflow:hidden;background:#101010;display:flex;align-items:center;justify-content:center;
  > a{position:absolute;inset:0;display:block;}
  a:focus-visible{outline:3px solid ${v.colorPrincipal};outline-offset:-3px;}
  img{position:absolute;inset:10px;display:block;width:calc(100% - 20px);height:calc(100% - 20px);object-fit:contain;object-position:center;}
  @media(max-width:700px){height:min(58vh,560px);min-height:320px;}
`;

export const cedulaPreviewZoomStyles = css`
  cursor:zoom-in;
  &:focus-visible{outline:3px solid ${v.colorPrincipal};outline-offset:-3px;}
  img{
    transition:transform 240ms cubic-bezier(.22,1,.36,1), filter 240ms ease;
    transform-origin:var(--preview-zoom-x,50%) var(--preview-zoom-y,50%);
    will-change:transform;
  }
  &[data-zoom-ready='false'] img{transform:none;filter:none;transition:none;}
  @media (hover:hover) and (pointer:fine){
    &:hover:not([data-zoom-ready='false']) img{
      transform:scale(${({$zoomClicks = 0})=>1.8 + ($zoomClicks * .6)});
      filter:saturate(1.03) contrast(1.02);
    }
  }
  @media(max-width:960px){
    cursor:default;
    &:hover img{transform:none;filter:none;}
  }
  @media(prefers-reduced-motion:reduce){
    img{transition:none;}
    &:hover img{transform:none;filter:none;}
  }
`;
