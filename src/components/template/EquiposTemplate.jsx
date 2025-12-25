import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { ContentContainer, Title, Btnsave, InputText2, v, Card, CardHeader } from "../../index";
import { Modal } from "../organismos/Modal";
// Iconos
import { RiPencilLine, RiDeleteBinLine, RiMagicLine, RiEraserLine } from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";
// Utilidades
import { generateTeamLogo } from "../../utils/logoGenerator"; 
import { removeBackground } from "../../utils/imageProcessor"; 
import { Device } from "../../styles/breakpoints";

export function EquiposTemplate({ 
  equipos, 
  division, 
  loading, 
  isOpen, 
  setIsOpen, 
  onSave,
  isUploading,
  onDelete,
  onEdit,
  onCreate,
  teamToEdit
}) {
  
  const initialForm = {
    name: "",
    color: "#000000",
    delegate_name: "",
    contact_phone: "",
    status: "Activo",
    logo_url: null
  };

  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (teamToEdit) {
        setForm(teamToEdit);
        setPreview(teamToEdit.logo_url);
    } else {
        setForm(initialForm);
        setPreview(null);
    }
    setFile(null);
  }, [teamToEdit, isOpen]);

  const handleChange = (e) => {
    setForm({...form, [e.target.name]: e.target.value});
  };

  // Función para detectar color predominante
  const getDominantColor = (imageFile) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            resolve(hex);
        };
        img.onerror = () => resolve("#000000");
    });
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));

      try {
        const dominantColor = await getDominantColor(selectedFile);
        setForm(prev => ({ ...prev, color: dominantColor }));
      } catch (error) {
        console.error("No se pudo extraer el color", error);
      }
    }
  };

  // --- FUNCIÓN PARA QUITAR IMAGEN (Botón Tache) ---
  const handleClearImage = (e) => {
    e.preventDefault(); 
    e.stopPropagation(); // Evita que se active el input file de abajo
    setFile(null);
    setPreview(null);
    // Si estamos editando, esto indica que se borrará el logo actual si se guarda así
    setForm(prev => ({ ...prev, logo_url: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form, file);
  };

  const handleGenerateLogo = async () => {
    if (!form.name) return alert("Escribe el nombre del equipo primero");
    try {
        const { file: generatedFile, preview: generatedPreview } = await generateTeamLogo(form.name, form.color);
        setFile(generatedFile);
        setPreview(generatedPreview);
    } catch (error) {
        console.error("Error generando logo:", error);
    }
  };

  const handleRemoveBg = async () => {
    if (!file) return alert("Sube una imagen primero");
    try {
        const { file: cleanFile, preview: cleanPreview } = await removeBackground(file);
        setFile(cleanFile);
        setPreview(cleanPreview);
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudo procesar la imagen.");
    }
  };

  return (
    <ContentContainer>
      <HeaderSection>
        <Title>Equipos</Title>
      </HeaderSection>

<Card width="100%" maxWidth="1400px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <CardHeader 
                Icono={IoMdFootball}
                titulo="Listado de Equipos"
                subtitulo={division ? `División: ${division.name}` : "Selecciona una división"}
            />
             <Btnsave 
                titulo="" 
                bgcolor={v.colorPrincipal} 
                icono={<v.iconoagregar />} 
                funcion={onCreate}
                disabled={!division}
            />
        </div>

        {loading ? (
            <Message>Cargando datos...</Message>
        ) : (
            <Grid>
            {equipos.map((team) => (
                <TeamCard key={team.id}>
                    <div className="card-top" style={{ background: `linear-gradient(135deg, ${team.color}cc, ${team.color})` }}>
                        <ActionButtons>
                            <button className="btn-edit" onClick={() => onEdit(team)} title="Editar"><RiPencilLine /></button>
                            <button className="btn-delete" onClick={() => onDelete(team.id)} title="Eliminar"><RiDeleteBinLine /></button>
                        </ActionButtons>
                        <div className="status-badge" $active={team.status === 'Activo'}>{team.status}</div>
                        <LogoImg src={team.logo_url || "https://i.ibb.co/MyJ50b7/logo-default.png"} alt={team.name} />
                    </div>
                    <div className="card-body">
                        <h3>{team.name}</h3>
                        <div className="info-row"><v.iconoUser className="icon"/><span>{team.delegate_name || "Sin delegado"}</span></div>
                        <div className="info-row"><span>📞 {team.contact_phone || "--"}</span></div>
                    </div>
                </TeamCard>
            ))}
            {equipos.length === 0 && !loading && <EmptyState><p>No hay equipos registrados.</p></EmptyState>}
            </Grid>
        )}
      </Card>

      {/* --- MODAL --- */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={teamToEdit ? "Editar Equipo" : "Registrar Equipo"}>
        <Form onSubmit={handleSubmit}>
            
            <div className="logo-section">
                
                {/* Contenedor relativo para el botón de cerrar */}
                <div className="preview-container">
                    <label htmlFor="file-upload" className="preview-uploader" title="Click para subir logo">
                        <div className="preview-box">
                            {preview ? (
                                <img src={preview} alt="Vista previa" />
                            ) : (
                                <div className="upload-placeholder">
                                    <v.iconofotovacia className="icon"/>
                                    <span>Subir</span>
                                </div>
                            )}
                        </div>
                    </label>

                    {/* BOTÓN TACHE PARA QUITAR IMAGEN */}
                    {preview && (
                        <button type="button" className="btn-remove-img" onClick={handleClearImage}>
                            <v.iconocerrar />
                        </button>
                    )}
                </div>
                
                <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} style={{display:'none'}}/>

                <div className="actions-column">
                    
                    {!preview && (
                        <button 
                            type="button" 
                            className="btn-magic" 
                            onClick={handleGenerateLogo}
                            title="Generar logo automático"
                        >
                            <RiMagicLine /> Generar Logo Auto
                        </button>
                    )}

                    {file && (
                        <button 
                            type="button" 
                            className="btn-eraser" 
                            onClick={handleRemoveBg}
                            title="Eliminar fondo"
                        >
                            <RiEraserLine /> Quitar Fondo
                        </button>
                    )}
                </div>
            </div>

            <div className="grid-inputs">
                <div className="full-width">
                    <span className="label">Nombre del Equipo *</span>
                    <InputText2>
                        <input className="form__field" name="name" value={form.name} onChange={handleChange} required placeholder="Ej. Rayados" />
                    </InputText2>
                </div>
                <div>
                    <span className="label">Delegado</span>
                    <InputText2>
                        <input className="form__field" name="delegate_name" value={form.delegate_name} onChange={handleChange} placeholder="Nombre del DT" />
                    </InputText2>
                </div>
                <div>
                    <span className="label">Teléfono</span>
                    <InputText2>
                        <input className="form__field" name="contact_phone" value={form.contact_phone} onChange={handleChange} placeholder="Contacto" type="tel" />
                    </InputText2>
                </div>
                <div>
                    <span className="label">Color Uniforme</span>
                    <ColorInputContainer>
                        <input type="color" name="color" value={form.color} onChange={handleChange} />
                        <span>{form.color}</span>
                    </ColorInputContainer>
                </div>
                <div>
                    <span className="label">Estado</span>
                    <SelectStyled name="status" value={form.status} onChange={handleChange}>
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                        <option value="Suspendido">Suspendido</option>
                    </SelectStyled>
                </div>
            </div>
            
            <div className="actions">
                <Btnsave 
                    titulo={isUploading ? "Guardando..." : "Guardar Datos"} 
                    bgcolor={v.colorPrincipal}
                    icono={<v.iconoguardar />}
                    disabled={isUploading}
                    width="100%"
                />
            </div>
        </Form>
      </Modal>
    </ContentContainer>
  );
}

// --- ESTILOS CORREGIDOS (FLEXBOX PARA CARTAS FIJAS) ---

const HeaderSection = styled.div`
  margin-bottom: 20px;
  width: 100%;
`;

const Message = styled.div` color: ${({theme})=> theme.text}; font-size: 1.2rem; opacity: 0.7; padding: 20px; text-align: center; `;

// EL GRID AHORA ES FLEXBOX
const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center; /* Centra las tarjetas horizontalmente */
  gap: 25px;
  padding: 10px;
  width: 100%;
  margin: 0 auto;

  /* CÁLCULO PARA MÁXIMO 5 COLUMNAS EN ESCRITORIO */
  /* 250px (carta) * 5 + 25px (gap) * 4 = 1350px aprox */
  /* Esto evita que se pongan 6 si la pantalla es muy grande */
  @media ${Device.desktop} {
     max-width: 1400px; 
  }
`;

const TeamCard = styled.div`
    width: 250px; /* ANCHO FIJO: No se reduce ni se estira */
    flex-shrink: 0; /* Impide que se encoja */
    
    background-color: ${({theme})=> theme.bgtotal};
    border: 1px solid ${({theme})=> theme.bg4};
    border-radius: 16px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    flex-direction: column;

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    
    .card-top {
        height: 110px;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: flex-end;
    }
    .status-badge {
        position: absolute; top: 10px; right: 10px;
        background: ${({$active}) => $active ? '#2ecc71' : '#e74c3c'};
        color: white; font-size: 10px; padding: 4px 8px; border-radius: 10px; font-weight: 700; text-transform: uppercase;
    }
    .card-body {
        padding: 35px 15px 20px; text-align: center; flex: 1;
        h3 { margin: 0 0 10px 0; color: ${({theme})=> theme.text}; font-size: 1.1rem; font-weight: 700; }
        .info-row { display: flex; align-items: center; justify-content: center; gap: 6px; color: ${({theme})=> theme.text}; opacity: 0.7; font-size: 0.85rem; margin-bottom: 6px; }
    }
`;

const LogoImg = styled.img`
    width: 85px; height: 85px; object-fit: contain;
    background-color: transparent; border: none;
    position: absolute; bottom: -25px;
    filter: drop-shadow(0 6px 6px rgba(0,0,0,0.3));
    transition: transform 0.3s;
    ${TeamCard}:hover & { transform: scale(1.1); }
`;

const ActionButtons = styled.div`
    position: absolute; top: 10px; left: 10px; display: flex; gap: 8px;
    button {
        width: 28px; height: 28px; border-radius: 50%; border: none;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        font-size: 14px; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); color: white;
    }
    .btn-edit { background: rgba(255, 255, 255, 0.25); backdrop-filter: blur(4px); &:hover { background: ${({theme}) => theme.primary || v.colorPrincipal}; } }
    .btn-delete { background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(4px); &:hover { background: #ff4757; } }
`;

const Form = styled.form`
    display: flex; flex-direction: column; gap: 20px;
    .label { font-weight: 600; font-size: 13px; margin-bottom: 5px; display: block; opacity: 0.8; }
    
    .logo-section {
        display: flex; gap: 20px; align-items: flex-start;
        padding: 10px; background: ${({theme}) => theme.bgtotal}; border-radius: 12px; border: 1px dashed ${({theme}) => theme.bg4};
        
        .preview-container {
            position: relative; /* Necesario para posicionar el botón X */
            width: fit-content;
        }

        /* ESTILO DEL BOTÓN TACHE */
        .btn-remove-img {
            position: absolute;
            top: -5px;
            right: -5px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #ff4757;
            color: white;
            border: 2px solid ${({theme}) => theme.bgtotal};
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: transform 0.2s;
            z-index: 10;
            &:hover { transform: scale(1.1); }
        }

        .preview-uploader {
            cursor: pointer;
            transition: transform 0.2s;
            &:hover { transform: scale(1.05); }
            display: block;
        }

        .preview-box {
            width: 100px; height: 100px; border-radius: 50%;
            background: #e0e0e0;
            background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%);
            background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            display: flex; align-items: center; justify-content: center; overflow: hidden;
            border: 2px solid ${({theme}) => theme.bg4};
            
            img { width: 100%; height: 100%; object-fit: contain; }
            
            .upload-placeholder {
                display: flex; flex-direction: column; align-items: center; color: ${({theme}) => theme.text}; opacity: 0.6;
                .icon { font-size: 30px; margin-bottom: 5px; }
                span { font-size: 10px; font-weight: 700; text-transform: uppercase; }
            }
        }

        .actions-column { display: flex; flex-direction: column; gap: 10px; justify-content: center; height: 100px; }
        
        .btn-magic, .btn-eraser {
            border: none; padding: 8px 12px; border-radius: 8px; color: white;
            font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;
        }
        .btn-magic { background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); }
        .btn-eraser { background: #ff4757; }
    }
    
    .grid-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; .full-width { grid-column: span 2; } }
    .actions { margin-top: 10px; }
`;

const ColorInputContainer = styled.div` display: flex; align-items: center; gap: 10px; background: ${({theme}) => theme.bgtotal}; padding: 8px; border-radius: 12px; border: 1px solid ${({theme}) => theme.bg4}; input[type="color"] { border: none; width: 30px; height: 30px; cursor: pointer; background: none; } `;
const SelectStyled = styled.select` width: 100%; padding: 12px; border-radius: 15px; border: 2px solid ${({ theme }) => theme.color2}; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; font-family: inherit; outline: none; `;
const EmptyState = styled.div` grid-column: 1 / -1; text-align: center; padding: 50px; background: ${({theme})=> theme.bgtotal}; border-radius: 16px; border: 2px dashed ${({theme})=> theme.bg4}; p { margin-bottom: 20px; color: ${({theme})=> theme.text}; } `;