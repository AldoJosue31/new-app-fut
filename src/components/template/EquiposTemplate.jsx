import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { ContentContainer, Title, Btnsave, InputText2, v, Card, CardHeader } from "../../index";
import { Modal } from "../organismos/Modal";
// Importamos iconos para editar y eliminar
import { RiPencilLine, RiDeleteBinLine } from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";
import { generateTeamLogo } from "../../utils/logoGenerator"; 
import { RiMagicLine } from "react-icons/ri";

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

  // Efecto para rellenar el formulario si estamos editando
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form, file);
  };

  const handleGenerateLogo = async () => {
    if (!form.name) return alert("Escribe el nombre del equipo primero");
    
    try {
        // Generamos usando el nombre y el color seleccionados en el form
        const { file: generatedFile, preview: generatedPreview } = await generateTeamLogo(form.name, form.color);
        
        setFile(generatedFile); // Lo guardamos como si el usuario lo hubiera subido
        setPreview(generatedPreview); // Mostramos la vista previa

    } catch (error) {
        console.error("Error generando logo:", error);
    }
  };

  return (
    <ContentContainer>
      <HeaderSection>
        <Title>Equipos</Title>
      </HeaderSection>

      {/* --- ENVOLVEMOS TODO EN UNA CARD GRANDE (Estilo Liga) --- */}
      <Card>
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
                        
                        {/* --- BOTONES FLOTANTES DE ACCIÓN --- */}
                        <ActionButtons>
                            <button className="btn-edit" onClick={() => onEdit(team)} title="Editar">
                                <RiPencilLine />
                            </button>
                            <button className="btn-delete" onClick={() => onDelete(team.id)} title="Eliminar">
                                <RiDeleteBinLine />
                            </button>
                        </ActionButtons>

                        <div className="status-badge" $active={team.status === 'Activo'}>
                            {team.status}
                        </div>
                        
                        {/* LOGO MEJORADO: Sin bordes, con sombra */}
                        <LogoImg 
                            src={team.logo_url || "https://i.ibb.co/MyJ50b7/logo-default.png"} 
                            alt={team.name} 
                        />
                    </div>

                    <div className="card-body">
                        <h3>{team.name}</h3>
                        <div className="info-row">
                            <v.iconoUser className="icon"/>
                            <span>{team.delegate_name || "Sin delegado"}</span>
                        </div>
                        <div className="info-row">
                            <span>📞 {team.contact_phone || "--"}</span>
                        </div>
                    </div>
                </TeamCard>
            ))}
            {equipos.length === 0 && !loading && (
                <EmptyState>
                    <p>No hay equipos registrados en esta división.</p>
                </EmptyState>
            )}
            </Grid>
        )}
      </Card>

      {/* --- MODAL --- */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={teamToEdit ? "Editar Equipo" : "Registrar Equipo"}>
        <Form onSubmit={handleSubmit}>
            <div className="logo-section">
                <div className="preview-box">
                    {preview ? <img src={preview} alt="Vista previa" /> : <v.iconofotovacia className="placeholder-icon"/>}
                </div>
                <div className="file-input-wrapper">
                    <label htmlFor="file-upload" className="custom-file-upload">
                        <v.iconoimagenvacia /> {teamToEdit ? "Cambiar Logo" : "Subir Logo"}
                    </label>
                    <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} />
                    <button 
                        type="button" 
                        className="btn-magic" 
                        onClick={handleGenerateLogo}
                        title="Generar logo automático con el nombre y color"
                    >
                        <RiMagicLine /> Generar Logo Auto
                    </button>
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

// --- ESTILOS MEJORADOS ---

const HeaderSection = styled.div`
  margin-bottom: 20px;
  width: 100%;
`;

const Message = styled.div` color: ${({theme})=> theme.text}; font-size: 1.2rem; opacity: 0.7; padding: 20px; text-align: center; `;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 25px;
  padding: 10px;
`;

const TeamCard = styled.div`
    background-color: ${({theme})=> theme.bgtotal}; // Cambio ligero para contrastar con la Card principal
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
        height: 110px; // Un poco más alto
        position: relative;
        display: flex;
        justify-content: center;
        align-items: flex-end;
    }

    .status-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        background: ${({$active}) => $active ? '#2ecc71' : '#e74c3c'};
        color: white;
        font-size: 10px;
        padding: 4px 8px;
        border-radius: 10px;
        font-weight: 700;
        text-transform: uppercase;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .card-body {
        padding: 35px 15px 20px;
        text-align: center;
        flex: 1;

        h3 {
            margin: 0 0 10px 0;
            color: ${({theme})=> theme.text};
            font-size: 1.1rem;
            font-weight: 700;
        }

        .info-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            color: ${({theme})=> theme.text};
            opacity: 0.7;
            font-size: 0.85rem;
            margin-bottom: 6px;
        }
    }
`;

// --- LOGO FLOTANTE (ESTILO PNG) ---
const LogoImg = styled.img`
    width: 85px;
    height: 85px;
    object-fit: contain; /* Mantiene la proporción del PNG */
    
    /* Quitamos el fondo y bordes */
    background-color: transparent; 
    border: none;
    
    /* Posicionamiento para que flote entre el top y el body */
    position: absolute;
    bottom: -25px; 
    
    /* Sombra para que resalte sobre cualquier fondo */
    filter: drop-shadow(0 6px 6px rgba(0,0,0,0.3));
    
    transition: transform 0.3s;
    
    ${TeamCard}:hover & {
        transform: scale(1.1);
    }
`;

// --- BOTONES DE ACCIÓN (LÁPIZ Y BORRAR) ---
const ActionButtons = styled.div`
    position: absolute;
    top: 10px;
    left: 10px;
    display: flex;
    gap: 8px;

    button {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        transition: 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        color: white;
    }

    .btn-edit {
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(4px);
        &:hover { background: ${({theme}) => theme.primary || v.colorPrincipal}; }
    }

    .btn-delete {
        background: rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(4px);
        &:hover { background: #ff4757; }
    }
`;

// --- ESTILOS DEL FORMULARIO (Se mantienen igual) ---
const Form = styled.form`
    display: flex; flex-direction: column; gap: 20px;
    .label { font-weight: 600; font-size: 13px; margin-bottom: 5px; display: block; opacity: 0.8; }
    .logo-section { display: flex; align-items: center; gap: 20px; margin-bottom: 10px; 
        .preview-box { width: 80px; height: 80px; border-radius: 50%; border: 2px dashed ${({theme}) => theme.bg4}; display: flex; align-items: center; justify-content: center; overflow: hidden; background: ${({theme}) => theme.bgtotal}; img { width: 100%; height: 100%; object-fit: contain; } .placeholder-icon { font-size: 40px; opacity: 0.3; } }
        input[type="file"] { display: none; }
        .custom-file-upload { border: 1px solid ${({theme}) => theme.bg4}; display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; border-radius: 8px; font-size: 14px; font-weight: 600; &:hover { background: ${({theme}) => theme.bgtotal}; } }
    }
    .grid-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; .full-width { grid-column: span 2; } }
    .actions { margin-top: 10px; }
    .btn-magic {
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            color: white;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: transform 0.2s;

            &:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 10px rgba(37, 117, 252, 0.4);
            }
            
            &:active { transform: scale(0.98); }
        }
`;
const ColorInputContainer = styled.div` display: flex; align-items: center; gap: 10px; background: ${({theme}) => theme.bgtotal}; padding: 8px; border-radius: 12px; border: 1px solid ${({theme}) => theme.bg4}; input[type="color"] { border: none; width: 30px; height: 30px; cursor: pointer; background: none; } `;
const SelectStyled = styled.select` width: 100%; padding: 12px; border-radius: 15px; border: 2px solid ${({ theme }) => theme.color2}; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; font-family: inherit; outline: none; `;
const EmptyState = styled.div` grid-column: 1 / -1; text-align: center; padding: 50px; background: ${({theme})=> theme.bgtotal}; border-radius: 16px; border: 2px dashed ${({theme})=> theme.bg4}; p { margin-bottom: 20px; color: ${({theme})=> theme.text}; } `;