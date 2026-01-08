import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { PhotoUploader, InputText2, Btnsave, v } from "../../../index";
import { RiMagicLine } from "react-icons/ri";

export function TeamForm({ 
  form, 
  onFormChange, 
  onSave, 
  isUploading, 
  preview, 
  file, 
  onFileChange, 
  onClearImage, 
  onGenerateLogo, 
  showToast, 
  teamToEdit 
}) {
  // REFS para manipular el DOM directamente sin disparar re-renders de React
  const containerRef = useRef(null);
  const colorTextRef = useRef(null);
  const colorInputRef = useRef(null);

  // Sincronizar cambios externos (como el botón "Generar Logo Auto")
  useEffect(() => {
    const color = form.color || "#000000";
    if (containerRef.current) containerRef.current.style.setProperty('--team-color', color);
    if (colorTextRef.current) colorTextRef.current.innerText = color;
    if (colorInputRef.current) colorInputRef.current.value = color;
  }, [form.color]);

  /**
   * OPTIMIZACIÓN CRÍTICA: handleColorInput
   * Se ejecuta mientras ARRASTRAS. No usamos estados de React aquí.
   * Actualizamos el CSS y el texto directamente. Velocidad: 60fps.
   */
  const handleColorInput = (e) => {
    const val = e.target.value;
    if (containerRef.current) {
        containerRef.current.style.setProperty('--team-color', val);
    }
    if (colorTextRef.current) {
        colorTextRef.current.innerText = val;
    }
  };

  /**
   * handleColorChange
   * Se ejecuta solo cuando SUELTAS el puntero.
   * Aquí es cuando React se entera del cambio para guardar en la base de datos.
   */
  const handleColorChange = (e) => {
    onFormChange(e);
  };

  return (
    <FormContainer 
      ref={containerRef} // Referencia para cambiar el fondo dinámicamente
      onSubmit={onSave} 
      style={{ "--team-color": form.color || "#000000" }}
    >
      <div className="logo-section">
        <div className="preview-container">
          <PhotoUploader 
            previewUrl={preview}
            originalUrl={teamToEdit?.logo_url}
            originalFile={file}
            onImageSelect={(croppedFile, original) => { 
                onFileChange({ target: { files: [croppedFile] }, original: original }); 
            }}
            onClear={onClearImage}
            showToast={showToast}
            isTeamLogo={true}
            themeColor={form.color} // Usamos el color estable de React
            shape="circle"
            width="120px" height="120px"
          />
        </div>
        <div className="actions-column">
          <p className="hint">El color del uniforme se usará si activas el borde en el editor de logo.</p>
          {!preview && <button type="button" className="btn-magic" onClick={onGenerateLogo}><RiMagicLine /> Generar Logo Auto</button>}
        </div>
      </div>

      <div className="grid-inputs">
        <div className="full-width">
          <span className="label">Nombre del Equipo *</span>
          <InputText2>
            <input 
              className="form__field" 
              name="name" 
              value={form.name || ""} 
              onChange={onFormChange} 
              required 
              placeholder="Ej. Rayados" 
            />
          </InputText2>
        </div>
        <div>
          <span className="label">Delegado</span>
          <InputText2>
            <input 
              className="form__field" 
              name="delegate_name" 
              value={form.delegate_name || ""} 
              onChange={onFormChange} 
              placeholder="Nombre del DT" 
            />
          </InputText2>
        </div>
        <div>
          <span className="label">Teléfono</span>
          <InputText2>
            <input 
              className="form__field" 
              name="contact_phone" 
              value={form.contact_phone || ""} 
              onChange={onFormChange} 
              placeholder="Contacto" 
              type="tel" 
            />
          </InputText2>
        </div>
        <div>
          <span className="label">Color Uniforme</span>
          <ColorInputContainer>
            <input 
              ref={colorInputRef}
              type="color" 
              name="color" 
              defaultValue={form.color || "#000000"} 
              onInput={handleColorInput} // Arrastre fluido
              onChange={handleColorChange} // Guardado final
            />
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
    display: flex; flex-direction: column; gap: 20px;
    .label { font-weight: 600; font-size: 13px; margin-bottom: 5px; display: block; opacity: 0.8; color: ${({theme})=>theme.text}; }
    .logo-section { 
        display: flex; gap: 20px; align-items: flex-start; padding: 15px; 
        /* Usamos var(--team-color) para que el navegador actualice el color sin React */
        background: color-mix(in srgb, var(--team-color), transparent 85%);
        border-radius: 12px; border: 1px dashed var(--team-color); transition: background 0.1s, border-color 0.1s; 
        .preview-container { position: relative; width: fit-content; }
        .actions-column { display: flex; flex-direction: column; gap: 10px; justify-content: center; align-items: center; flex: 1; .hint { font-size: 10px; opacity: 0.7; text-align: center; max-width: 150px; color: ${({theme})=>theme.text}; } }
        .btn-magic { border: none; padding: 8px 12px; border-radius: 8px; color: white; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center; background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); }
    }
    .grid-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; .full-width { grid-column: span 2; } }
    .actions { margin-top: 10px; }
`;

const ColorInputContainer = styled.div`
  display: flex; align-items: center; gap: 10px; background: ${({theme}) => theme.bgtotal}; padding: 8px; border-radius: 12px; border: 1px solid ${({theme}) => theme.bg4};
  span { color: ${({theme})=>theme.text}; font-size: 13px; font-weight: 600; }
  input[type="color"] { border: none; width: 30px; height: 30px; cursor: pointer; background: none; }
`;

const SelectStyled = styled.select`
  width: 100%; padding: 12px; border-radius: 15px; border: 2px solid ${({ theme }) => theme.color2}; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; font-family: inherit; outline: none;
`;