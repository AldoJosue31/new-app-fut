import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { RiErrorWarningLine, RiSettings4Line } from "react-icons/ri";
import { v } from "../../../../styles/variables";
import {
  Card,
  CardHeader,
  InputText2,
  Btnsave,
  PhotoUploader,
} from "../../../../index";
import { Toast } from "../../../atomos/Toast";
import { Skeleton } from "../../../atomos/Skeleton";
import { uploadImageToSupabase } from "../../../../utils/uploadHandler";
import { supabase } from "../../../../supabase/supabase.config";

export function LigaConfigTab({ data, onUpdate, loading }) {
  const [tempName, setTempName] = useState(data?.name || "");
  const [requiresDelegateApproval, setRequiresDelegateApproval] = useState(
    data?.delegate_changes_require_approval ?? true
  );
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(data?.logo_url || null);
  const [originalUrl, setOriginalUrl] = useState(data?.original_logo_url || null);
  const [imageChanged, setImageChanged] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const hasUnsavedChanges =
    imageChanged ||
    (data && tempName !== data.name) ||
    (data &&
      requiresDelegateApproval !== (data.delegate_changes_require_approval ?? true));

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "Tienes cambios sin guardar. Seguro que quieres salir?";
        return event.returnValue;
      }
      return undefined;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!data) return;

    setTempName(data.name || "");
    setRequiresDelegateApproval(data.delegate_changes_require_approval ?? true);

    if (!imageChanged) {
      setPreviewUrl(data.logo_url || null);
      setOriginalUrl(data.original_logo_url || null);
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
      type: "error",
    });
  };

  const deleteOldImagesFromBucket = async () => {
    try {
      const pathsToRemove = [];
      const oldLogo = data?.logo_url;
      const oldOriginal = data?.original_logo_url;

      if (oldLogo && oldLogo.includes("/logos/")) {
        pathsToRemove.push(oldLogo.split("/logos/")[1]);
      }

      if (oldOriginal && oldOriginal.includes("/logos/")) {
        pathsToRemove.push(oldOriginal.split("/logos/")[1]);
      }

      if (pathsToRemove.length > 0) {
        const { error } = await supabase.storage.from("logos").remove(pathsToRemove);
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error al eliminar las imágenes del bucket:", error);
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
          const result = await uploadImageToSupabase(
            logoFile,
            originalFile,
            "logos",
            "leagues"
          );

          if (!result.url) throw new Error("Falló la subida a Storage.");

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
        delegate_changes_require_approval: requiresDelegateApproval,
        logo_url: finalLogoUrl,
        original_logo_url: finalOriginalUrl,
      });

      if (success) {
        setPreviewUrl(finalLogoUrl);
        setOriginalUrl(finalOriginalUrl);
        setImageChanged(false);
        setLogoFile(null);
        setOriginalFile(null);
        setToast({
          show: true,
          message: "Configuración actualizada con éxito.",
          type: "success",
        });
      }
    } catch {
      setToast({
        show: true,
        message: "Ocurrió un error al guardar los cambios.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const closeToast = () => setToast((current) => ({ ...current, show: false }));

  if (loading) {
    return (
      <Card maxWidth="800px">
        <CardHeader Icono={RiSettings4Line} titulo="Configuración General de la Liga" />
        <FormContainer>
          <ContentWrapper>
            <ImageSection>
              <label className="section-title">Logo de la Liga</label>
              <Skeleton width="160px" height="160px" radius="50%" />
              <Skeleton width="140px" height="12px" style={{ marginTop: "10px" }} />
              <Skeleton width="100px" height="12px" style={{ marginTop: "5px" }} />
            </ImageSection>
            <FormSection>
              <FormGroup>
                <label>Nombre Oficial</label>
                <Skeleton width="100%" height="45px" radius="8px" />
              </FormGroup>
              <FormGroup>
                <label>Aprobación de cambios de delegados</label>
                <Skeleton width="100%" height="92px" radius="12px" />
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
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
        duration={5000}
      />

      <Card maxWidth="800px">
        <CardHeader Icono={RiSettings4Line} titulo="Configuración General de la Liga" />

        <FormContainer>
          {hasUnsavedChanges && (
            <UnsavedWarning>
              <RiErrorWarningLine size={24} />
              <span>
                <strong>Tienes cambios sin guardar.</strong> Revisa el logo, el nombre o la
                política de aprobación y luego guarda para no perderlos.
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
                <InputText2>
                  <input
                    className="form__field"
                    value={tempName}
                    onChange={(event) => setTempName(event.target.value)}
                    placeholder="Ej. Liga Municipal de Fútbol"
                    disabled={isSaving}
                  />
                </InputText2>
              </FormGroup>

              <FormGroup>
                <label>Aprobación de cambios de delegados</label>
                <ApprovalCard>
                  <div className="copy">
                    <strong>
                      {requiresDelegateApproval
                        ? "Revisar antes de publicar"
                        : "Aplicar cambios al instante"}
                    </strong>
                    <span>
                      {requiresDelegateApproval
                        ? "Los cambios de equipos y jugadores enviados por delegados quedarán pendientes hasta que el manager los apruebe."
                        : "Los cambios de delegados se aplicarán automáticamente sin pasar por la bandeja de revisión."}
                    </span>
                  </div>

                  <ToggleButton
                    type="button"
                    $active={requiresDelegateApproval}
                    onClick={() =>
                      setRequiresDelegateApproval((current) => !current)
                    }
                    disabled={isSaving}
                  >
                    <span />
                  </ToggleButton>
                </ApprovalCard>
              </FormGroup>

              <div className="actions-right">
                <Btnsave
                  titulo={isSaving ? "Guardando..." : "Guardar Cambios"}
                  bgcolor={hasUnsavedChanges ? "#e67e22" : v.colorPrincipal}
                  icono={<v.iconoguardar />}
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

const ApprovalCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-radius: 14px;
  background: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};

  .copy {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  strong {
    font-size: 0.96rem;
  }

  span {
    font-size: 0.84rem;
    line-height: 1.45;
    opacity: 0.72;
  }
`;

const ToggleButton = styled.button`
  width: 62px;
  min-width: 62px;
  height: 34px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  background: ${({ $active }) => ($active ? v.colorPrincipal : "#9aa4b2")};
  padding: 4px;
  transition: background 0.2s ease;

  span {
    display: block;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #fff;
    transform: ${({ $active }) => ($active ? "translateX(28px)" : "translateX(0)")};
    transition: transform 0.2s ease;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;
