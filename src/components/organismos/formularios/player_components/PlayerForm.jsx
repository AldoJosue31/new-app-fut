import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BtnGreen } from '../../../moleculas/BtnGreen';
import { BtnNormal } from '../../../moleculas/BtnNormal';
import { InputText2 } from '../../formularios/InputText2'; // Asegúrate que la ruta sea correcta
import { InputNumber } from '../../formularios/InputNumber'; // Asegúrate que la ruta sea correcta
import { PhotoUploader } from '../../../moleculas/PhotoUploader';

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

export const PlayerForm = ({ initialData, teamId, onSubmit, onCancel, isSaving }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dorsal: '',
    position: 'Delantero',
    curp_dni: '',
    photo_url: null,
    original_photo_url: null, // Para guardar la original si usas cropper
    team_id: teamId
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        dorsal: initialData.dorsal || '',
      });
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <PhotoUploader 
          initialImage={formData.photo_url}
          onImageUpload={(urls) => {
             // Asumiendo que PhotoUploader devuelve { optimized, original } o solo la url string
             if (typeof urls === 'object') {
                 setFormData(prev => ({ 
                    ...prev, 
                    photo_url: urls.optimized || urls.url,
                    original_photo_url: urls.original 
                 }));
             } else {
                 setFormData(prev => ({ ...prev, photo_url: urls }));
             }
          }}
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
        <BtnNormal type="button" onClick={onCancel} bgcolor="#95a5a6">Cancelar</BtnNormal>
        <BtnGreen type="submit" disabled={isSaving}>
          {isSaving ? 'Guardando...' : (initialData ? 'Actualizar Jugador' : 'Registrar Jugador')}
        </BtnGreen>
      </ButtonGroup>
    </form>
  );
};