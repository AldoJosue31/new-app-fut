import React from "react";
import styled from "styled-components";
import { v, Btnsave } from "../../../../../../index";
import { RiFileDownloadLine, RiImageLine, RiSunLine, RiMoonLine } from "react-icons/ri";

export const ExportPreviewHeader = ({
    isDark,
    setIsDark,
    isMobile,
    setIsMobile,
    onExport,
    isExporting,
    title = "Configura la imagen",
    inactiveFormatLabel = "Post (4:5)",
    activeFormatLabel = "Historia (9:16)",
    formatTitle = "Cambiar formato",
    exportLabel = "Descargar",
    exportingLabel = "Exportando..."
}) => {
    return (
        <HeaderContainer>
            <div className="left-group">
                <span className="header-icon">
                    <RiImageLine size={17} />
                </span>
                <span className="info-text">{title}</span>
            </div>

            <div className="right-group">
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

                <div className="export-action">
                    <Btnsave
                        titulo={isExporting ? exportingLabel : exportLabel}
                        bgcolor={isExporting ? "#7f8c8d" : v.verde}
                        icono={isExporting ? <div className="spinner-mini" /> : <RiFileDownloadLine />}
                        funcion={onExport}
                        disabled={isExporting}
                        color="255,255,255"
                    />
                </div>
            </div>
        </HeaderContainer>
    );
};

const HeaderContainer = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    padding: 12px 16px;
    background: ${({ theme }) => theme.bg};
    border-bottom: 1px solid ${({ theme }) => theme.bg3};

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
        background: ${({ theme }) => theme.bg2};
        border: 1px solid ${({ theme }) => theme.bg4};
        color: ${v.colorPrincipal};
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

    .export-action {
        display: flex;

        > button {
            min-height: 38px;
            padding: 9px 18px;
            border-radius: 14px;
            white-space: nowrap;
        }
    }

    .spinner-mini {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin-export 1s linear infinite;
    }

    @keyframes spin-export {
        to { transform: rotate(360deg); }
    }

    @media (max-width: 720px) {
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

const ThemeToggleBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.bg4};
    background: ${({ theme }) => theme.bg2};
    color: ${({ theme }) => theme.text};
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1.1rem;

    &:hover {
        background: ${({ theme }) => theme.bg3};
        color: ${v.colorPrincipal};
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
    background: ${({ theme }) => theme.bg2};
    border: 1px solid ${({ theme }) => theme.bg4};
    opacity: ${({ $disabled }) => $disabled ? 0.58 : 1};

    button {
        min-width: 0;
        min-height: 32px;
        padding: 7px 10px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: ${({ theme }) => theme.text};
        cursor: pointer;
        font-size: 0.78rem;
        font-weight: 800;
        line-height: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 0.64;
        transition: 0.2s ease;
    }

    button.active {
        background: ${({ theme }) => theme.bg};
        color: ${v.colorPrincipal};
        opacity: 1;
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.16);
    }

    button:disabled {
        cursor: not-allowed;
    }

    @media (max-width: 720px) {
        flex: 1 1 230px;
    }

    @media (max-width: 520px) {
        min-width: 0;
        width: 100%;
    }
`;
