import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { PhotoUploader, InputText2, Btnsave, v } from "../../../index";

export function TeamForm({ 
  form, 
  onFormChange, 
  onSave, 
  isUploading, 
  preview, 
  file, 
  onFileChange, 
  onClearImage, 
  showToast, 
  teamToEdit 
}) {
  const containerRef = useRef(null);
  const colorTextRef = useRef(null);
  const colorInputRef = useRef(null);

  useEffect(() => {
    const color = form.color || "#000000";
    if (containerRef.current) containerRef.current.style.setProperty('--team-color', color);
    if (colorTextRef.current) colorTextRef.current.innerText = color;
    if (colorInputRef.current) colorInputRef.current.value = color;
  }, [form.color]);

  const handleColorInput = (e) => {
    const val = e.target.value;
    if (containerRef.current) containerRef.current.style.setProperty('--team-color', val);
    if (colorTextRef.current) colorTextRef.current.innerText = val;
  };

  const handleColorChange = (e) => {
    onFormChange(e);
  };

  return (
    <FormContainer 
      ref={containerRef} 
      onSubmit={onSave} 
      style={{ "--team-color": form.color || "#000000" }}
    >
      <div className="logo-section">
        <div className="preview-container">
          <PhotoUploader 
            previewUrl={preview}
            originalUrl={teamToEdit?.original_logo_url || teamToEdit?.logo_url} 
            originalFile={file} 
            
            onImageSelect={(croppedFile, originalFile, newPreviewUrl) => { 
                onFileChange({ 
                    target: { files: [croppedFile] }, 
                    original: originalFile 
                }); 
            }}
            onClear={onClearImage}
            showToast={showToast}
            isTeamLogo={true}
            themeColor={form.color}
            shape="circle"
            width="120px" height="120px"
          />
        </div>
        <div className="actions-column">
          <p className="hint">Si no subes un logo, el sistema mostrará dinámicamente un escudo vectorial con las iniciales y el color de tu equipo para optimizar el rendimiento y el almacenamiento.</p>
        </div>
      </div>

      <div className="grid-inputs">
        <div className="full-width">
          <span className="label">Nombre del Equipo *</span>
          <InputText2>
            <input className="form__field" name="name" value={form.name || ""} onChange={onFormChange} required placeholder="Ej. Rayados" />
          </InputText2>
        </div>
        <div>
          <span className="label">Delegado</span>
          <InputText2>
            <input className="form__field" name="delegate_name" value={form.delegate_name || ""} onChange={onFormChange} placeholder="Nombre del DT" />
          </InputText2>
        </div>
        <div>
          <span className="label">Teléfono</span>
          <InputText2>
            <input className="form__field" name="contact_phone" value={form.contact_phone || ""} onChange={onFormChange} placeholder="Contacto" type="tel" />
          </InputText2>
        </div>
        <div>
          <span className="label">Color Uniforme</span>
          <ColorInputContainer>
            <input ref={colorInputRef} type="color" name="color" defaultValue={form.color || "#000000"} onInput={handleColorInput} onChange={handleColorChange} />
            <span ref={colorTextRef}>{form.color || "#000000"}</span>
          </ColorInputContainer>
        </div>
        <div>
          <span className="label">Estado</span>
          <SelectStyled name="status" value={form.status} onChange={onFormChange}>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Suspendido">Suspendido</option>
          </SelectStyled>
        </div>
      </div>
      
      <div className="actions">
        <Btnsave titulo={isUploading ? "Guardando..." : "Guardar Equipo"} bgcolor={v.colorPrincipal} icono={<v.iconoguardar />} disabled={isUploading} width="100%"/>
      </div>
    </FormContainer>
  );
}

const FormContainer = styled.form`
  display: flex; 
  flex-direction: column; 
  gap: 20px; 
  .label { 
    font-weight: 600; 
    font-size: 13px; 
    margin-bottom: 5px; 
    display: block; 
    opacity: 0.8; 
    color: ${({theme})=>theme.text}; 
  } 
  .logo-section { 
    display: flex; 
    gap: 20px; 
    align-items: flex-start; 
    padding: 15px; 
    background: color-mix(in srgb, var(--team-color), transparent 85%); 
    border-radius: 12px; 
    border: 1px dashed var(--team-color); 
    transition: background 0.1s, border-color 0.1s; 
    .preview-container { 
      position: relative; 
      width: fit-content; 
    } 
    .actions-column { 
      display: flex; 
      flex-direction: column; 
      gap: 10px; 
      justify-content: center; 
      align-items: flex-start; 
      flex: 1; 
      .hint { 
        font-size: 12px; 
        opacity: 0.8; 
        text-align: left; 
        color: ${({theme})=>theme.text};
        line-height: 1.4;
      } 
    } 
  } 
  .grid-inputs { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 15px; 
    .full-width { 
      grid-column: span 2; 
    } 
  } 
  .actions { 
    margin-top: 10px; 
  }
`;

const ColorInputContainer = styled.div`
  display: flex; 
  align-items: center; 
  gap: 10px; 
  background: ${({theme}) => theme.bgtotal}; 
  padding: 8px; 
  border-radius: 12px; 
  border: 1px solid ${({theme}) => theme.bg4}; 
  span { 
    color: ${({theme})=>theme.text}; 
    font-size: 13px; 
    font-weight: 600; 
  } 
  input[type="color"] { 
    border: none; 
    width: 30px; 
    height: 30px; 
    cursor: pointer; 
    background: none; 
  }
`;

const SelectStyled = styled.select`
  width: 100%; 
  padding: 12px; 
  border-radius: 15px; 
  border: 2px solid ${({ theme }) => theme.color2}; 
  background: ${({theme}) => theme.bgtotal}; 
  color: ${({theme}) => theme.text}; 
  font-family: inherit; 
  outline: none;
`;