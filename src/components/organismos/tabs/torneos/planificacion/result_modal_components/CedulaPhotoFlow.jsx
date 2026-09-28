import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { RiArrowLeftLine, RiDeleteBinLine, RiRefreshLine, RiSaveLine } from 'react-icons/ri';
import { notify } from '../../../../../../lib/notifications/notify.js';
import { useCedulaImageInput } from '../../../../../../hooks/useCedulaImageInput.js';
import { CedulaImagePicker } from './CedulaImagePicker';
import { ScanShell, PanelHeading, PreviewFrame, ChoiceRow, PrimaryAction, SecondaryAction } from './CedulaFlowPrimitives';

const showToast = (message, type = 'error') => notify.show(message, { type });

export function CedulaPhotoFlow({ attachment, onBack, match }) {
  const { photo, busy, error, selectFile, save, remove } = attachment;
  const [choosing, setChoosing] = useState(false);
  const chooseFile = useCallback(async (file) => {
    await selectFile(file);
    setChoosing(false);
  }, [selectFile]);
  const input = useCedulaImageInput({ onSelect: chooseFile, showToast, disabled: busy });
  const blocked = busy || input.disabled;
  const savePhoto = async () => {
    try {
      await save();
      notify.success('Cédula guardada correctamente.');
      onBack();
    } catch (saveError) { showToast(saveError.message); }
  };
  const removePhoto = async () => {
    try {
      await remove();
      setChoosing(false);
      notify.success('Foto de la cédula eliminada.');
    } catch (removeError) { showToast(removeError.message); }
  };

  return <ScanShell aria-busy={blocked}>
    <PanelHeading>
      <button type="button" disabled={blocked} onClick={onBack} aria-label="Volver"><RiArrowLeftLine /></button>
      <div><h4>Cargar cédula</h4><p>Guarda una foto clara y completa de la cédula de {match?.local?.name || 'Local'} contra {match?.visitante?.name || 'Visitante'}.</p></div>
    </PanelHeading>
    {photo && !choosing ? <>
      <PreviewFrame><a href={photo.url} target="_blank" rel="noreferrer" aria-label="Ver foto completa de la cédula"><img src={photo.url} alt="Cédula física del partido" /></a></PreviewFrame>
      <PhotoStatus role="status">{busy ? 'Procesando cédula…' : photo.pending ? 'Lista para guardar. También se guardará con el marcador.' : 'Cédula guardada.'}</PhotoStatus>
      <ChoiceRow>
        <SecondaryAction type="button" disabled={blocked} onClick={() => setChoosing(true)}><RiRefreshLine /> Cambiar foto</SecondaryAction>
        <SecondaryAction type="button" disabled={blocked} onClick={removePhoto}><RiDeleteBinLine /> Eliminar cédula</SecondaryAction>
        {photo.pending ? <PrimaryAction type="button" disabled={blocked} onClick={savePhoto}><RiSaveLine />{busy ? 'Guardando…' : 'Guardar cédula'}</PrimaryAction>
          : <PrimaryAction type="button" disabled={blocked} onClick={onBack}>Volver al resultado</PrimaryAction>}
      </ChoiceRow>
    </> : <>
      <CedulaImagePicker input={input} />
      {photo && <SecondaryAction type="button" disabled={blocked} onClick={() => setChoosing(false)}>Conservar foto actual</SecondaryAction>}
    </>}
    <PhotoStatus>La foto se eliminará al finalizar el torneo.</PhotoStatus>
    {error && <PhotoError role="alert">{error}</PhotoError>}
  </ScanShell>;
}

const PhotoStatus = styled.p`margin:0;color:${({ theme }) => theme.text};font-size:.82rem;line-height:1.45;`;
const PhotoError = styled(PhotoStatus)`font-weight:700;`;
