import React from 'react';
import styled from 'styled-components';
import { RiCameraLine, RiClipboardLine, RiFileImageLine } from 'react-icons/ri';
import { v } from '../../../../../../styles/variables';
import { ChoiceRow, PrimaryAction, SecondaryAction } from './CedulaFlowPrimitives';

export function CedulaImagePicker({ input }) {
  const { uploadRef, cameraRef, onFileChange, pasteFromClipboard, coarseDevice, disabled } = input;
  return <>
    <UploadZone type="button" disabled={disabled} onClick={() => uploadRef.current?.click()}>
      <RiFileImageLine />
      <strong>Cargar imagen</strong>
      {!coarseDevice && <span>También puedes pegarla con Ctrl/Cmd + V</span>}
    </UploadZone>
    <ChoiceRow>
      <SecondaryAction type="button" disabled={disabled} onClick={() => uploadRef.current?.click()}><RiFileImageLine /> Cargar imagen</SecondaryAction>
      <SecondaryAction type="button" disabled={disabled} onClick={pasteFromClipboard}><RiClipboardLine /> Pegar imagen</SecondaryAction>
      {coarseDevice && <PrimaryAction type="button" disabled={disabled} onClick={() => cameraRef.current?.click()}><RiCameraLine /> Tomar foto</PrimaryAction>}
    </ChoiceRow>
    <input ref={uploadRef} hidden type="file" accept="image/*" disabled={disabled} onChange={onFileChange} aria-label="Subir foto de cédula" />
    <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" disabled={disabled} onChange={onFileChange} aria-label="Tomar foto de cédula" />
  </>;
}

const UploadZone = styled.button`
  width:100%;min-height:clamp(320px,52vh,560px);flex:1;border:2px dashed ${({ theme }) => theme.bg4};border-radius:14px;background:${({ theme }) => theme.bg3};color:${({ theme }) => theme.text};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;
  svg{font-size:2rem;color:${v.colorPrincipal};}strong{font-size:1rem;}span{font-size:.82rem;opacity:.7;}
  &:hover:not(:disabled){border-color:${v.colorPrincipal};}&:disabled{opacity:.62;cursor:wait;}
  &:focus-visible{outline:3px solid ${v.colorPrincipal}44;outline-offset:2px;}
`;
