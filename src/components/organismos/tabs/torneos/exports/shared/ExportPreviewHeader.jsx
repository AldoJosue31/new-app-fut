import React from "react";
import styled, { useTheme } from "styled-components";
import { v } from "../../../../../../styles/variables";
import { Btnsave } from "../../../../../moleculas/Btnsave";
import { RiFileDownloadLine, RiImageLine, RiSunLine, RiMoonLine } from "react-icons/ri";

export const ExportPreviewHeader = ({
    isDark,
    setIsDark,
    isMobile,
    setIsMobile,
    onExport,
    isExporting,
    showExportAction = true,
    showInfo = true,
    title = "Configura la imagen",
    inactiveFormatLabel = "Post (4:5)",
    activeFormatLabel = "Historia (9:16)",
    formatTitle = "Cambiar formato",
    exportLabel = "Descargar",
    exportingLabel = "Exportando...",
    beforeFormatControls = null
}) => {
    return (
        <HeaderContainer $showInfo={showInfo}>
            {showInfo && (
                <div className="left-group">
                    <span className="header-icon">
                        <RiImageLine size={17} />
                    </span>
                    <span className="info-text">{title}</span>
                </div>
            )}

            <div className="right-group">
                {beforeFormatControls}

                <FormatSwitch
                    $disabled={isExporting}
                    aria-label={formatTitle}
                    title={formatTitle}
                >
                    <button
                        type="button"
                        className={!isMobile ? "active" : ""}
                        onClick={() => !isExporting && setIsMobile(false)}
                        disabled={isExporting}
                    >
                        {inactiveFormatLabel}
                    </button>
                    <button
                        type="button"
                        className={isMobile ? "active" : ""}
                        onClick={() => !isExporting && setIsMobile(true)}
                        disabled={isExporting}
                    >
                        {activeFormatLabel}
                    </button>
                </FormatSwitch>

                <ThemeToggleBtn
                    type="button"
                    onClick={() => !isExporting && setIsDark(!isDark)}
                    title="Cambiar tema de la imagen"
                    aria-label="Cambiar tema de la imagen"
                    disabled={isExporting}
                >
                    {isDark ? <RiSunLine /> : <RiMoonLine />}
                </ThemeToggleBtn>

                {showExportAction && (
                    <ExportDownloadButton
                        onExport={onExport}
                        isExporting={isExporting}
                        exportLabel={exportLabel}
                        exportingLabel={exportingLabel}
                    />
                )}
            </div>
        </HeaderContainer>
    );
};

export const ExportDownloadButton = ({
    onExport,
    isExporting,
    disabled = false,
    exportLabel = "Descargar",
    exportingLabel = "Exportando..."
}) => {
    const theme = useTheme();
    const palette = theme?.tournamentDashboard || {};
    const metricsPalette = palette.metrics || {};
    const exportButtonColor = isExporting || disabled
        ? (theme?.bg4 || "#7f8c8d")
        : (metricsPalette.accent || v.verde);

    return (
        <DownloadButtonFrame className="export-action">
            <Btnsave
                titulo={isExporting ? exportingLabel : exportLabel}
                bgcolor={exportButtonColor}
                icono={isExporting ? <div className="spinner-mini" /> : <RiFileDownloadLine />}
                funcion={onExport}
                disabled={isExporting || disabled}
                color="255,255,255"
            />
        </DownloadButtonFrame>
    );
};

const HeaderContainer = styled.div`
    --export-accent: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || v.colorPrincipal};
    --export-accent-soft: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6 || `${v.colorPrincipal}18`};
    --export-accent-strong: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || v.colorPrincipal};
    --export-surface: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
    --export-item-surface: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
    --export-border: ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    --export-muted: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle || theme.text};

    display: grid;
    grid-template-columns: ${({ $showInfo }) => ($showInfo ? "minmax(0, 1fr) auto" : "1fr")};
    align-items: center;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    padding: ${({ $showInfo }) => ($showInfo ? "12px 16px" : "8px 12px")};
    background: var(--export-surface);
    border-bottom: 1px solid var(--export-border);

    .left-group {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 9px;
        color: ${({ theme }) => theme.text};
        font-size: 0.9rem;
        font-weight: 700;
    }

    .header-icon {
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        border-radius: 10px;
        background: var(--export-accent-soft);
        border: 1px solid var(--export-border);
        color: var(--export-accent-strong);
    }

    .info-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .right-group {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        min-width: 0;
    }

    @media (max-width: 860px) {
        grid-template-columns: 1fr;
        align-items: stretch;

        .right-group {
            justify-content: stretch;
            flex-wrap: wrap;
        }
    }

    @media (max-width: 520px) {
        padding: 12px;

        .left-group {
            font-size: 0.86rem;
        }

        .right-group {
            display: grid;
            grid-template-columns: 1fr 38px;
            gap: 8px;
        }

        .export-action {
            grid-column: 1 / -1;

            > button {
                width: 100%;
            }
        }
    }
`;

const DownloadButtonFrame = styled.div`
    display: flex;

    > button {
        min-height: 34px;
        padding: 7px 14px;
        border-radius: 12px;
        border-bottom-width: 3px;
        font-size: 0.86rem;
        transform: translate(0, -1px);
        white-space: nowrap;
    }

    > button:active {
        transform: translate(0, 0);
    }

    > button[disabled] {
        transform: translate(0, 0);
        border-bottom-width: 2px;
    }

    .content {
        gap: 8px;
    }

    .spinner-mini {
        width: 15px;
        height: 15px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin-export 1s linear infinite;
    }

    @keyframes spin-export {
        to { transform: rotate(360deg); }
    }
`;

const ThemeToggleBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
    color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    font-size: 1.1rem;

    &:hover {
        background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6 || theme.bg3};
        border-color: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || v.colorPrincipal};
        color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || v.colorPrincipal};
    }

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || v.colorPrincipal};
        outline-offset: 2px;
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
    }
`;

const FormatSwitch = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    min-width: 230px;
    padding: 3px;
    border-radius: 13px;
    background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
    border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
    opacity: ${({ $disabled }) => $disabled ? 0.58 : 1};

    button {
        min-width: 0;
        min-height: 32px;
        padding: 7px 10px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
        cursor: pointer;
        font-size: 0.78rem;
        font-weight: 800;
        line-height: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 0.64;
        transition: background 0.2s ease, color 0.2s ease, opacity 0.2s ease;
    }

    button.active {
        background: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6 || `${v.colorPrincipal}18`};
        color: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.tournamentDashboard?.primary || v.colorPrincipal};
        opacity: 1;
    }

    button:not(.active):hover {
        background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bg};
        color: ${({ theme }) => theme.text};
        opacity: 0.86;
    }

    button:focus-visible {
        outline: 2px solid ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary || v.colorPrincipal};
        outline-offset: 1px;
    }

    button:disabled {
        cursor: not-allowed;
    }

    @media (max-width: 860px) {
        flex: 1 1 230px;
    }

    @media (max-width: 520px) {
        min-width: 0;
        width: 100%;
    }
`;
