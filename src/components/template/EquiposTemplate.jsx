import React from "react";
import styled, { keyframes, css } from "styled-components";
import { ContentContainer, Title, Btnsave, InputText2, v, Card, CardHeader } from "../../index";
import { Modal } from "../organismos/Modal";
import { RiPencilLine, RiDeleteBinLine, RiMagicLine, RiEraserLine, RiShieldUserLine, RiSmartphoneLine } from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";
import { Device } from "../../styles/breakpoints";

export function EquiposTemplate({ 
  equipos, 
  division, 
  loading, 
  isUploading,
  
  // Estados y Data Form
  form,
  preview,
  file,
  isFormOpen,
  setIsFormOpen,
  teamToEdit,

  // Estados Detalles
  isDetailOpen,
  setIsDetailOpen,
  teamToView,

  // Funciones
  onFormChange,
  onFileChange,
  onClearImage,
  onGenerateLogo,
  onRemoveBg,
  onSave,
  onDelete,
  onCreate,
  onEdit,
  onView
}) {

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

        <Grid>
            {loading ? (
                /* --- SKELETONS DE CARGA (8 por defecto) --- */
                Array.from({ length: 8 }).map((_, index) => (
                    <SkeletonCard key={index}>
                        <div className="sk-header">
                            <div className="sk-logo"></div>
                        </div>
                        <div className="sk-body">
                            <div className="sk-title"></div>
                            <div className="sk-line"></div>
                            <div className="sk-line short"></div>
                        </div>
                    </SkeletonCard>
                ))
            ) : (
                /* --- CARDS REALES --- */
                <>
                    {equipos.map((team) => (
                        <TeamCard key={team.id} onClick={() => onView(team)}>
                            <div className="card-top" style={{ background: `linear-gradient(135deg, ${team.color}cc, ${team.color})` }}>
                                <ActionButtons>
                                    <button className="btn-edit" onClick={(e) => { e.stopPropagation(); onEdit(team); }} title="Editar"><RiPencilLine /></button>
                                    <button className="btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(team.id); }} title="Eliminar"><RiDeleteBinLine /></button>
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
                </>
            )}
        </Grid>
      </Card>

      {/* --- MODAL FORMULARIO --- */}
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        title={teamToEdit ? "Editar Equipo" : "Registrar Equipo"}
        closeOnOverlayClick={false}
      >
        <Form onSubmit={onSave}>
            <div className="logo-section">
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
                    {preview && (
                        <button type="button" className="btn-remove-img" onClick={onClearImage}>
                            <v.iconocerrar />
                        </button>
                    )}
                </div>
                <input id="file-upload" type="file" accept="image/*" onChange={onFileChange} style={{display:'none'}}/>

                <div className="actions-column">
                    {!preview && (
                        <button type="button" className="btn-magic" onClick={onGenerateLogo} title="Generar logo automático">
                            <RiMagicLine /> Generar Logo Auto
                        </button>
                    )}
                    {file && (
                        <button type="button" className="btn-eraser" onClick={onRemoveBg} title="Eliminar fondo">
                            <RiEraserLine /> Quitar Fondo
                        </button>
                    )}
                </div>
            </div>

            <div className="grid-inputs">
                <div className="full-width">
                    <span className="label">Nombre del Equipo *</span>
                    <InputText2>
                        <input className="form__field" name="name" value={form.name} onChange={onFormChange} required placeholder="Ej. Rayados" />
                    </InputText2>
                </div>
                <div>
                    <span className="label">Delegado</span>
                    <InputText2>
                        <input className="form__field" name="delegate_name" value={form.delegate_name} onChange={onFormChange} placeholder="Nombre del DT" />
                    </InputText2>
                </div>
                <div>
                    <span className="label">Teléfono</span>
                    <InputText2>
                        <input className="form__field" name="contact_phone" value={form.contact_phone} onChange={onFormChange} placeholder="Contacto" type="tel" />
                    </InputText2>
                </div>
                <div>
                    <span className="label">Color Uniforme</span>
                    <ColorInputContainer>
                        <input type="color" name="color" value={form.color} onChange={onFormChange} />
                        <span>{form.color}</span>
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

      {/* --- MODAL DETALLES --- */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Ficha del Equipo"
        closeOnOverlayClick={true}
      >
        {teamToView && (
            <DetailContainer $color={teamToView.color}>
                <div className="banner">
                   <div className="division-badge">{division?.name || "Liga"}</div>
                </div>

                <div className="logo-wrapper">
                    <img src={teamToView.logo_url || "https://i.ibb.co/MyJ50b7/logo-default.png"} alt={teamToView.name} />
                </div>

                <h2 className="team-title">{teamToView.name}</h2>

                <div className="info-body">
                    <div className="info-item">
                        <div className="icon-box"><RiShieldUserLine /></div>
                        <div>
                            <span className="label">Delegado / DT</span>
                            <p className="value">{teamToView.delegate_name || "No registrado"}</p>
                        </div>
                    </div>

                    <div className="info-item">
                        <div className="icon-box"><RiSmartphoneLine /></div>
                        <div>
                            <span className="label">Contacto</span>
                            <p className="value">{teamToView.contact_phone || "No disponible"}</p>
                        </div>
                    </div>

                    <div className="info-item">
                        <div className="icon-box"><v.iconoemijivacio /></div>
                        <div>
                            <span className="label">Estado Actual</span>
                            <StatusPill $active={teamToView.status === 'Activo'}>
                                {teamToView.status}
                            </StatusPill>
                        </div>
                    </div>
                    <div style={{marginBottom:'10px'}}></div>
                </div>
            </DetailContainer>
        )}
      </Modal>

    </ContentContainer>
  );
}

// --- ESTILOS & ANIMACIONES ---

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -468px 0; }
  100% { background-position: 468px 0; }
`;

const HeaderSection = styled.div`
  margin-bottom: 10px;
  width: 100%;
  max-width: 1400px;
`;

const Grid = styled.div`
  display: flex; flex-wrap: wrap; justify-content: center; gap: 25px; padding: 10px; width: 100%; margin: 0 auto;
  @media ${Device.desktop} { max-width: 1400px; }
`;

// --- SKELETON COMPONENTS ---
const SkeletonCard = styled.div`
    width: 250px; height: 260px; /* Altura aprox de la card real */
    flex-shrink: 0;
    background-color: ${({theme})=> theme.bgtotal};
    border: 1px solid ${({theme})=> theme.bg4};
    border-radius: 16px; overflow: hidden;
    display: flex; flex-direction: column;
    
    /* El efecto shimmer aplicado a elementos internos */
    .sk-header {
        height: 110px; width: 100%;
        background: ${({theme}) => theme.bg4}; 
        position: relative;
        display: flex; justify-content: center; align-items: flex-end;
        overflow: hidden;
        &::after {
            content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(to right, transparent 0%, ${({theme})=> theme.bg2} 50%, transparent 100%);
            background-size: 400% 100%;
            animation: ${shimmer} 1.2s infinite linear;
            opacity: 0.5;
        }
    }
    .sk-logo {
        width: 85px; height: 85px; border-radius: 50%;
        background: ${({theme}) => theme.bg3};
        position: absolute; bottom: -25px; z-index: 2;
        border: 4px solid ${({theme})=> theme.bgtotal};
    }
    .sk-body {
        padding: 40px 15px 20px; flex: 1;
        display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .sk-title {
        width: 70%; height: 20px; border-radius: 4px; background: ${({theme})=> theme.bg4};
    }
    .sk-line {
        width: 90%; height: 14px; border-radius: 4px; background: ${({theme})=> theme.bg4};
        opacity: 0.6;
        &.short { width: 50%; }
    }
`;

const TeamCard = styled.div`
    width: 250px; flex-shrink: 0;
    background-color: ${({theme})=> theme.bgtotal};
    border: 1px solid ${({theme})=> theme.bg4};
    border-radius: 16px; overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex; flex-direction: column;
    cursor: pointer;
    
    /* ANIMACIÓN DE ENTRADA */
    animation: ${fadeIn} 0.5s ease-out forwards;

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.15);
    }
    
    .card-top {
        height: 110px; position: relative; display: flex; justify-content: center; align-items: flex-end;
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
        display: flex; gap: 20px; align-items: flex-start; padding: 10px; background: ${({theme}) => theme.bgtotal}; border-radius: 12px; border: 1px dashed ${({theme}) => theme.bg4};
        .preview-container { position: relative; width: fit-content; }
        .btn-remove-img { position: absolute; top: -5px; right: -5px; width: 24px; height: 24px; border-radius: 50%; background: #ff4757; color: white; border: 2px solid ${({theme}) => theme.bgtotal}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; z-index: 10; &:hover { transform: scale(1.1); } }
        .preview-uploader { cursor: pointer; transition: transform 0.2s; &:hover { transform: scale(1.05); } display: block; }
        .preview-box { width: 100px; height: 100px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 2px solid ${({theme}) => theme.bg4}; img { width: 100%; height: 100%; object-fit: contain; } .upload-placeholder { display: flex; flex-direction: column; align-items: center; color: ${({theme}) => theme.text}; opacity: 0.6; .icon { font-size: 30px; margin-bottom: 5px; } span { font-size: 10px; font-weight: 700; text-transform: uppercase; } } }
        .actions-column { display: flex; flex-direction: column; gap: 10px; justify-content: center; height: 100px; }
        .btn-magic, .btn-eraser { border: none; padding: 8px 12px; border-radius: 8px; color: white; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-magic { background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); }
        .btn-eraser { background: #ff4757; }
    }
    .grid-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; .full-width { grid-column: span 2; } }
    .actions { margin-top: 10px; }
`;
const ColorInputContainer = styled.div` display: flex; align-items: center; gap: 10px; background: ${({theme}) => theme.bgtotal}; padding: 8px; border-radius: 12px; border: 1px solid ${({theme}) => theme.bg4}; input[type="color"] { border: none; width: 30px; height: 30px; cursor: pointer; background: none; } `;
const SelectStyled = styled.select` width: 100%; padding: 12px; border-radius: 15px; border: 2px solid ${({ theme }) => theme.color2}; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; font-family: inherit; outline: none; `;
const EmptyState = styled.div` grid-column: 1 / -1; text-align: center; padding: 50px; background: ${({theme})=> theme.bgtotal}; border-radius: 16px; border: 2px dashed ${({theme})=> theme.bg4}; p { margin-bottom: 20px; color: ${({theme})=> theme.text}; } `;

const DetailContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    padding-bottom: 10px;
    width: 100%;
    overflow-x: hidden; 

    .banner {
        height: 150px; 
        width: calc(100% + 50px);
        margin: -25px -25px 0 -25px;
        background: ${({$color}) => `linear-gradient(135deg, ${$color}, ${$color}aa)`};
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-top: 35px; 
        position: relative;
        overflow: hidden;

        &::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%);
        }
        
        .division-badge {
            background: rgba(0,0,0,0.3); color: white; padding: 4px 12px;
            border-radius: 20px; font-size: 0.8rem; font-weight: 700; letter-spacing: 1px;
            text-transform: uppercase;
            z-index: 2;
        }
    }

    .logo-wrapper {
        width: 140px; height: 140px;
        margin-top: -70px; 
        z-index: 5;
        background: transparent;
        display: flex; align-items: center; justify-content: center;

        img {
            width: 100%; height: 100%; object-fit: contain;
            filter: drop-shadow(0 8px 10px rgba(0,0,0,0.4));
            transition: transform 0.3s;
            &:hover { transform: scale(1.05); }
        }
    }

    .team-title {
        margin: 15px 0 5px 0;
        text-align: center;
        color: ${({theme}) => theme.text};
        font-size: 1.8rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: -0.5px;
    }

    .info-body {
        width: 100%;
        padding-top: 15px;
        display: flex; flex-direction: column; gap: 15px;
    }

    .info-item {
        background: ${({theme}) => theme.bgtotal};
        padding: 15px;
        border-radius: 12px;
        display: flex; align-items: center; gap: 15px;
        border: 1px solid ${({theme}) => theme.bg4};
        
        .icon-box {
            width: 40px; height: 40px;
            background: ${({theme}) => theme.bgcards};
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.2rem; color: ${({theme}) => theme.text};
            box-shadow: ${({theme}) => theme.boxshadowGray};
        }

        .label { font-size: 0.8rem; color: ${({theme}) => theme.text}; opacity: 0.6; display: block; }
        .value { margin: 0; font-size: 1rem; font-weight: 600; color: ${({theme}) => theme.text}; }
    }
`;

const StatusPill = styled.span`
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.9rem; font-weight: 700;
    background: ${({$active}) => $active ? 'rgba(46, 213, 115, 0.15)' : 'rgba(231, 76, 60, 0.15)'};
    color: ${({$active}) => $active ? '#2ecc71' : '#e74c3c'};
`;
