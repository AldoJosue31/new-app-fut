import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../../../styles/variables";
import { RiSettings4Line, RiErrorWarningLine } from "react-icons/ri";
import { Card, CardHeader, InputText2, Btnsave, PhotoUploader } from "../../../../index";
import { Toast } from "../../../atomos/Toast"; 
import { Skeleton } from "../../../atomos/Skeleton";
import { uploadImageToSupabase } from "../../../../utils/uploadHandler";
import { supabase } from "../../../../supabase/supabase.config"; 

export function LigaConfigTab({ data, onUpdate, loading }) {
  const [tempName, setTempName] = useState(data?.name || "");
  const [isSaving, setIsSaving] = useState(false);

  const [logoFile, setLogoFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(data?.logo_url || null);
  const [originalUrl, setOriginalUrl] = useState(data?.original_logo_url || null);
  const [imageChanged, setImageChanged] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const hasUnsavedChanges = imageChanged || (data && tempName !== data.name);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "Tienes cambios sin guardar. ¿Seguro que quieres salir?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (data) {
      setTempName(data.name || "");
      if (!imageChanged) {
        setPreviewUrl(data.logo_url || null);
        setOriginalUrl(data.original_logo_url || null);
      }
    }
  }, [data, imageChanged]);

  const handleImageSelect = (croppedFile, origFile, newPreviewUrl) => {
    setLogoFile(croppedFile);
    setOriginalFile(origFile);
    setPreviewUrl(newPreviewUrl);
    setImageChanged(true);
  };

  const handleClearImage = () => {
    setLogoFile(null);
    setOriginalFile(null);
    setPreviewUrl(null);
    setOriginalUrl(null);
    setImageChanged(true);

    setToast({
      show: true,
      message: "Logo removido temporalmente. Guarda los cambios para borrarlo definitivamente.",
      type: "error"
    });
  };

  const deleteOldImagesFromBucket = async () => {
    try {
      const pathsToRemove = [];
      const oldLogo = data?.logo_url;
      const oldOriginal = data?.original_logo_url;

      if (oldLogo && oldLogo.includes('/logos/')) {
        pathsToRemove.push(oldLogo.split('/logos/')[1]);
      }
      if (oldOriginal && oldOriginal.includes('/logos/')) {
        pathsToRemove.push(oldOriginal.split('/logos/')[1]);
      }

      if (pathsToRemove.length > 0) {
        const { error } = await supabase.storage.from('logos').remove(pathsToRemove);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error al eliminar las imágenes del bucket:", err);
    }
  };

  const handleSave = async () => {
    if (!tempName.trim()) {
      setToast({ show: true, message: "El nombre de la liga es obligatorio", type: "error" });
      return;
    }

    setIsSaving(true);
    
    try {
      let finalLogoUrl = data?.logo_url || null;
      let finalOriginalUrl = data?.original_logo_url || null;

      if (imageChanged) {
        if (logoFile) {
          const result = await uploadImageToSupabase(logoFile, originalFile, 'logos', 'leagues');
          
          if (!result.url) throw new Error("Fallo la subida a Storage.");
          
          finalLogoUrl = result.url;
          finalOriginalUrl = result.originalUrl;
          await deleteOldImagesFromBucket();
        } else {
          await deleteOldImagesFromBucket();
          finalLogoUrl = null;
          finalOriginalUrl = null;
        }
      }

      const success = await onUpdate({
        name: tempName,
        logo_url: finalLogoUrl,
        original_logo_url: finalOriginalUrl
      });

      if (success) {
        setPreviewUrl(finalLogoUrl);
        setOriginalUrl(finalOriginalUrl);
        setImageChanged(false);
        setLogoFile(null);
        setOriginalFile(null);
        setToast({ show: true, message: "Configuración actualizada con éxito.", type: "success" });
      }
    } catch (error) {
      setToast({ show: true, message: "Ocurrió un error al guardar los cambios.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const closeToast = () => setToast((prev) => ({ ...prev, show: false }));

  // --- MODO SKELETON MIENTRAS CARGA ---
  if (loading) {
    return (
      <Card maxWidth="800px">
        <CardHeader Icono={RiSettings4Line} titulo="Configuración General de la Liga" />
        <FormContainer>
          <ContentWrapper>
            <ImageSection>
              <label className="section-title">Logo de la Liga</label>
              <Skeleton width="160px" height="160px" radius="50%" />
              <Skeleton width="140px" height="12px" style={{ marginTop: '10px' }} />
              <Skeleton width="100px" height="12px" style={{ marginTop: '5px' }} />
            </ImageSection>
            <FormSection>
              <FormGroup>
                  <label>Nombre Oficial</label>
                  <Skeleton width="100%" height="45px" radius="8px" />
              </FormGroup>
              <div className="actions-right">
                  <Skeleton width="180px" height="45px" radius="12px" />
              </div>
            </FormSection>
          </ContentWrapper>
        </FormContainer>
      </Card>
    );
  }

  return (
    <>
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={closeToast} duration={5000} />
      <Card maxWidth="800px">
        <CardHeader Icono={RiSettings4Line} titulo="Configuración General de la Liga" />
        
        <FormContainer>
          {hasUnsavedChanges && (
            <UnsavedWarning>
              <RiErrorWarningLine size={24} />
              <span>
                <strong>Tienes cambios sin guardar.</strong> Revisa el logo o el nombre y haz clic en "Guardar Cambios" para no perderlos.
              </span>
            </UnsavedWarning>
          )}

          <ContentWrapper>
            <ImageSection>
              <label className="section-title">Logo de la Liga</label>
              <PhotoUploader 
                previewUrl={previewUrl}
                originalUrl={originalUrl}
                onImageSelect={handleImageSelect}
                onClear={handleClearImage}
                isTeamLogo={false}
                shape="circle"
                width="160px"
                height="160px"
              />
              <span className="instructions">
                Sube un logo representativo para la liga. Será comprimido automáticamente.
              </span>
            </ImageSection>

            <FormSection>
              <FormGroup>
                  <label>Nombre Oficial</label>
                  <div className="row">
                      <InputText2>
                          <input 
                            className="form__field" 
                            value={tempName} 
                            onChange={(e) => setTempName(e.target.value)}
                            placeholder="Ej. Liga Municipal de Fútbol"
                            disabled={isSaving}
                          />
                      </InputText2>
                  </div>
              </FormGroup>

              <div className="actions-right">
                  <Btnsave 
                    titulo={isSaving ? "Guardando..." : "Guardar Cambios"} 
                    bgcolor={hasUnsavedChanges ? "#e67e22" : v.colorPrincipal} 
                    icono={<v.iconoguardar/>}
                    funcion={handleSave}
                    disabled={isSaving || !hasUnsavedChanges}
                  />
              </div>
            </FormSection>
          </ContentWrapper>
        </FormContainer>
      </Card>
    </>
  );
}

const FormContainer = styled.div`
  padding-top: 15px;
`;

const UnsavedWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: rgba(230, 126, 34, 0.15);
  border: 1px solid #e67e22;
  color: #e67e22;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  animation: pulseWarning 2s infinite;

  span {
    font-size: 14px;
    line-height: 1.4;
  }

  @keyframes pulseWarning {
    0% { box-shadow: 0 0 0 0 rgba(230, 126, 34, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(230, 126, 34, 0); }
    100% { box-shadow: 0 0 0 0 rgba(230, 126, 34, 0); }
  }
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-start;
  }
`;

const ImageSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  flex: 0 0 auto;
  width: 100%;

  @media (min-width: 768px) {
    width: 220px;
    border-right: 1px solid ${({ theme }) => theme.bg4};
    padding-right: 20px;
  }

  .section-title {
    font-weight: 600;
    font-size: 14px;
    opacity: 0.8;
  }

  .instructions {
    font-size: 12px;
    color: ${({ theme }) => theme.text};
    opacity: 0.6;
    text-align: center;
    line-height: 1.4;
  }
`;

const FormSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  
  .actions-right { 
    display: flex; 
    justify-content: flex-end; 
    margin-top: auto; 
    padding-top: 20px;
  }
`;

const FormGroup = styled.div`
  display: flex; 
  flex-direction: column; 
  gap: 10px;
  
  label { 
    font-weight: 600; 
    font-size: 14px; 
    opacity: 0.8; 
  }
`;