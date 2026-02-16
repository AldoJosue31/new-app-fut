import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BtnGreen } from '../../../moleculas/BtnGreen';
import { BtnNormal } from '../../../moleculas/BtnNormal';
import { InputText2 } from '../../formularios/InputText2'; 
import { InputNumber } from '../../formularios/InputNumber'; 
import { PhotoUploader } from '../../../moleculas/PhotoUploader';
// Importamos la utilidad
import { uploadImageToSupabase } from '../../../../utils/uploadHandler'; 

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
`;

export const PlayerForm = ({ initialData, teamId, onSubmit, onCancel, isSaving: parentIsSaving }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dorsal: '',
    position: 'Delantero',
    curp_dni: '',
    photo_url: null,
    original_photo_url: null,
    team_id: teamId
  });

  // Estados locales para subida
  const [newImageFile, setNewImageFile] = useState(null);
  const [newOriginalFile, setNewOriginalFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        dorsal: initialData.dorsal || '',
      });
      setPreview(initialData.photo_url || null);
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handler compatible con PhotoUploader
  const handleImageSelect = (file, original, previewUrl) => {
      setNewImageFile(file);
      setNewOriginalFile(original);
      setPreview(previewUrl);
  };

  const handleClearImage = () => {
      setNewImageFile(null); setNewOriginalFile(null); setPreview(null);
      setFormData(prev => ({...prev, photo_url: null, original_photo_url: null}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    
    try {
        let finalPhotoUrl = formData.photo_url;
        let finalOriginalUrl = formData.original_photo_url;

        if (newImageFile) {
            const { url, originalUrl } = await uploadImageToSupabase(
                newImageFile, 
                newOriginalFile, 
                'logos', 
                'players'
            );
            finalPhotoUrl = url;
            finalOriginalUrl = originalUrl;
        }

        const dataToSave = {
            ...formData,
            photo_url: finalPhotoUrl,
            original_photo_url: finalOriginalUrl
        };

        onSubmit(dataToSave);

    } catch (error) {
        console.error(error);
    } finally {
        setIsUploading(false);
    }
  };

  const isBusy = isUploading || parentIsSaving;

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <PhotoUploader 
          previewUrl={preview}
          originalUrl={initialData?.original_photo_url || formData.original_photo_url}
          onImageSelect={handleImageSelect}
          onClear={handleClearImage}
          shape="circle"
        />
      </div>

      <FormGrid>
        <InputText2 
          label="Nombre(s)"
          value={formData.first_name}
          onChange={(e) => handleChange('first_name', e.target.value)}
          required
        />
        <InputText2 
          label="Apellidos"
          value={formData.last_name}
          onChange={(e) => handleChange('last_name', e.target.value)}
          required
        />
        <InputNumber 
          label="Dorsal"
          value={formData.dorsal}
          onChange={(e) => handleChange('dorsal', e.target.value)}
        />
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Posición</label>
          <select 
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
            value={formData.position}
            onChange={(e) => handleChange('position', e.target.value)}
          >
            <option value="Portero">Portero</option>
            <option value="Defensa">Defensa</option>
            <option value="Medio">Medio</option>
            <option value="Delantero">Delantero</option>
          </select>
        </div>
        <InputText2 
          label="CURP / DNI"
          value={formData.curp_dni}
          onChange={(e) => handleChange('curp_dni', e.target.value)}
        />
      </FormGrid>

      <ButtonGroup>
        <BtnNormal type="button" onClick={onCancel} bgcolor="#95a5a6" disabled={isBusy}>Cancelar</BtnNormal>
        <BtnGreen type="submit" disabled={isBusy}>
          {isBusy ? 'Guardando...' : (initialData ? 'Actualizar Jugador' : 'Registrar Jugador')}
        </BtnGreen>
      </ButtonGroup>
    </form>
  );
};