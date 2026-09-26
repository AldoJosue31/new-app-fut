import React, { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import { RiErrorWarningLine, RiSettings4Line, RiSave3Line } from "react-icons/ri";
import { Card } from "../../../moleculas/Card";
import { CardHeader } from "../../../moleculas/CardHeader";
import { InputText2 } from "../../formularios/InputText2";
import { PhotoUploader } from "../../../moleculas/PhotoUploader";
import { Skeleton } from "../../../atomos/Skeleton";
import { uploadImageToSupabase } from "../../../../utils/uploadHandler";
import { supabase } from "../../../../lib/supabase/browserClient.js";
import { notify } from "../../../../lib/notifications/notify.js";
import { DEFAULT_LEAGUE_COLOR, normalizeHexColor, extractLogoColor, contrastingTextColor } from "../../../../utils/leagueColors.js";
import { LeagueColorSettings } from "./LeagueColorSettings";

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
  const [primaryColor, setPrimaryColor] = useState(normalizeHexColor(data?.primary_color) || DEFAULT_LEAGUE_COLOR);
  const [secondaryColor, setSecondaryColor] = useState(normalizeHexColor(data?.secondary_color) || "#FFFFFF");
  const [hasSecondaryColor, setHasSecondaryColor] = useState(Boolean(normalizeHexColor(data?.secondary_color)));
  const [isDetectingColor, setIsDetectingColor] = useState(false);
  const [colorDetectionMessage, setColorDetectionMessage] = useState("");
  const [colorValidationError, setColorValidationError] = useState("");
  const primaryColorEditedRef = useRef(false);
  const colorEditVersionRef = useRef(0);
  const detectionControllerRef = useRef(null);

  const hasUnsavedChanges =
    imageChanged ||
    primaryColor !== (normalizeHexColor(data?.primary_color) || DEFAULT_LEAGUE_COLOR) ||
    (hasSecondaryColor ? secondaryColor : null) !== normalizeHexColor(data?.secondary_color) ||
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
    setPrimaryColor(normalizeHexColor(data.primary_color) || DEFAULT_LEAGUE_COLOR);
    setSecondaryColor(normalizeHexColor(data.secondary_color) || "#FFFFFF");
    setHasSecondaryColor(Boolean(normalizeHexColor(data.secondary_color)));
    primaryColorEditedRef.current = false;
    colorEditVersionRef.current += 1;
    setColorValidationError("");
  }, [data]);

  useEffect(() => {
    if (!imageChanged) {
      setPreviewUrl(data?.logo_url || null);
      setOriginalUrl(data?.original_logo_url || null);
    }
  }, [data, imageChanged]);

  const detectLogoColor = useCallback(async (source) => {
    if (!source) return;
    detectionControllerRef.current?.abort();
    const controller = new AbortController();
    detectionControllerRef.current = controller;
    const editVersion = colorEditVersionRef.current;
    setIsDetectingColor(true);
    setColorDetectionMessage("");
    try {
      const color = await extractLogoColor(source, { signal: controller.signal });
      if (controller.signal.aborted || editVersion !== colorEditVersionRef.current) return;
      if (!color) throw new Error("El logo no tiene píxeles visibles.");
      if (!primaryColorEditedRef.current) {
        setPrimaryColor(color);
        setColorValidationError("");
        setColorDetectionMessage("Color principal obtenido del logo. Puedes ajustarlo antes de guardar.");
      }
    } catch (error) {
      if (error.name !== "AbortError" && !controller.signal.aborted) {
        setColorDetectionMessage("No pudimos obtener el color del logo. Puedes elegirlo manualmente.");
      }
    } finally {
      if (detectionControllerRef.current === controller) setIsDetectingColor(false);
    }
  }, []);

  useEffect(() => {
    if (!previewUrl || normalizeHexColor(data?.primary_color) || primaryColorEditedRef.current) return;
    detectLogoColor(logoFile || previewUrl);
    const controller = detectionControllerRef.current;
    return () => controller?.abort();
  }, [data?.id, data?.primary_color, logoFile, previewUrl, detectLogoColor]);

  useEffect(() => () => detectionControllerRef.current?.abort(), []);

  const changePrimaryColor = (value) => {
    primaryColorEditedRef.current = true;
    colorEditVersionRef.current += 1;
    setPrimaryColor(value);
    setColorDetectionMessage("");
    setColorValidationError("");
  };

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

    notify.info(
      "Logo removido temporalmente. Guarda los cambios para borrarlo definitivamente.",
      { duration: 5000 },
    );
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
    if (isSaving || isDetectingColor) return;
    if (!tempName.trim()) {
      notify.error("El nombre de la liga es obligatorio", { duration: 5000 });
      return;
    }
    const normalizedPrimaryColor = normalizeHexColor(primaryColor);
    const normalizedSecondaryColor = hasSecondaryColor ? normalizeHexColor(secondaryColor) : null;
    if (!normalizedPrimaryColor || (hasSecondaryColor && !normalizedSecondaryColor)) {
      setColorValidationError("Escribe un color hexadecimal válido, por ejemplo #1CB0F6.");
      return;
    }

    setIsSaving(true);

    try {
      let finalLogoUrl = data?.logo_url || null;
      let finalOriginalUrl = data?.original_logo_url || null;

      if (imageChanged) {
        if (logoFile) {
          if (!data?.id) throw new Error("No se pudo identificar la liga.");

          const result = await uploadImageToSupabase(
            logoFile,
            originalFile,
            "logos",
            `leagues/${data.id}`
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
        primary_color: normalizedPrimaryColor,
        secondary_color: normalizedSecondaryColor,
      });

      if (success) {
        setPreviewUrl(finalLogoUrl);
        setOriginalUrl(finalOriginalUrl);
        setImageChanged(false);
        setLogoFile(null);
        setOriginalFile(null);
        setPrimaryColor(normalizedPrimaryColor);
        setSecondaryColor(normalizedSecondaryColor || "#FFFFFF");
        notify.success("Configuración actualizada con éxito.", { duration: 5000 });
      }
    } catch {
      notify.error("Ocurrió un error al guardar los cambios.", { duration: 5000 });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Card maxWidth="800px">
        <CardHeader Icono={RiSettings4Line} titulo="Configuración General de la Liga" />
        <FormContainer>
          <ContentWrapper>
            <ImageSection>
              <span className="section-title">Logo de la Liga</span>
              <Skeleton width="160px" height="160px" radius="50%" />
              <Skeleton width="140px" height="12px" style={{ marginTop: "10px" }} />
              <Skeleton width="100px" height="12px" style={{ marginTop: "5px" }} />
            </ImageSection>
            <FormSection>
              <FormGroup>
                <span className="field-label">Nombre Oficial</span>
                <Skeleton width="100%" height="45px" radius="8px" />
              </FormGroup>
              <FormGroup>
                <span className="field-label">Aprobación de cambios de delegados</span>
                <Skeleton width="100%" height="92px" radius="12px" />
              </FormGroup>
            </FormSection>
          </ContentWrapper>
          <Skeleton width="100%" height="110px" radius="10px" />
          <div className="actions-right"><Skeleton width="180px" height="45px" radius="12px" /></div>
        </FormContainer>
      </Card>
    );
  }

  return (
    <>
      <Card maxWidth="800px">
        <CardHeader Icono={RiSettings4Line} titulo="Configuración General de la Liga" />

        <FormContainer>
          {hasUnsavedChanges && (
            <UnsavedWarning>
              <RiErrorWarningLine size={24} />
              <span>
                <strong>Tienes cambios sin guardar.</strong> Revisa el logo, el nombre, los
                colores o la política de aprobación y guarda para no perderlos.
              </span>
            </UnsavedWarning>
          )}

          <ContentWrapper>
            <ImageSection>
              <span className="section-title">Logo de la Liga</span>
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
                <label htmlFor="league-official-name">Nombre Oficial</label>
                <InputText2>
                  <input
                    id="league-official-name"
                    className="form__field"
                    value={tempName}
                    onChange={(event) => setTempName(event.target.value)}
                    placeholder="Ej. Liga Municipal de Fútbol"
                    disabled={isSaving}
                  />
                </InputText2>
              </FormGroup>

              <FormGroup>
                <span className="field-label">Aprobación de cambios de delegados</span>
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
                    aria-label="Cambiar aprobación de cambios de delegados"
                    aria-pressed={requiresDelegateApproval}
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

            </FormSection>
          </ContentWrapper>
          <LeagueColorSettings
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            hasSecondaryColor={hasSecondaryColor}
            onPrimaryChange={changePrimaryColor}
            onSecondaryChange={(value) => { setSecondaryColor(value); setHasSecondaryColor(Boolean(value.trim())); setColorValidationError(""); }}
            isDetectingColor={isDetectingColor}
            detectionMessage={colorDetectionMessage}
            validationError={colorValidationError}
            disabled={isSaving}
          />
          <div className="actions-right">
            <SaveChangesButton
              type="button"
              onClick={handleSave}
              aria-busy={isSaving}
              disabled={isSaving || isDetectingColor || !hasUnsavedChanges}
            >
              <RiSave3Line aria-hidden="true" />
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </SaveChangesButton>
          </div>
        </FormContainer>
      </Card>
    </>
  );
}

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;

  .actions-right { display: flex; justify-content: flex-end; padding-top: 20px; border-top: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; }
`;

const SaveChangesButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 12px 20px;
  border: 0;
  border-radius: 10px;
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => contrastingTextColor(theme.primary)};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  svg { width: 18px; height: 18px; }
  &:hover:not(:disabled) { background: ${({ theme }) => theme.tournamentDashboard.hero.accentStrong}; color: ${({ theme }) => contrastingTextColor(theme.tournamentDashboard.hero.accentStrong)}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 3px; }
  &:disabled { background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; color: ${({ theme }) => theme.tournamentDashboard.muted}; cursor: not-allowed; }
`;

const UnsavedWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: ${({ theme }) => theme.tournamentDashboard.primarySoft};
  border: 1px solid ${({ theme }) => theme.tournamentDashboard.border};
  color: ${({ theme }) => theme.text};
  padding: 12px 16px;
  border-radius: 8px;

  > svg { flex-shrink: 0; color: ${({ theme }) => theme.tournamentDashboard.hero.accentStrong}; }

  span {
    font-size: 14px;
    line-height: 1.4;
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;

`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  label,
  .field-label {
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
  background: ${({ $active, theme }) => ($active ? theme.primary : theme.tournamentDashboard.border)};
  padding: 4px;
  transition: background 0.2s ease;

  span {
    display: block;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${({ theme }) => theme.tournamentDashboard.surface};
    transform: ${({ $active }) => ($active ? "translateX(28px)" : "translateX(0)")};
    transition: transform 0.2s ease;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;
