import styled from "styled-components";
import { Modal } from "../../Modal";

export function TournamentModal(props) {
    return (
        <Modal
            {...props}
            width="1180px"
            compactHeader
            overlayPadding="6px clamp(8px, 2vw, 18px)"
            maxHeight="calc(100dvh - 24px)"
            minHeight="calc(100dvh - 24px)"
            bodyOverflowY="hidden"
            bodyPadding="0"
        />
    );
}

export const ModalFooter = styled.footer`
    display: flex;
    justify-content: flex-end;
    align-items: stretch;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px 20px;
    background: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || theme.bg};
    border-top: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};

    .cancel-btn {
        border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || theme.bg4};
        background: transparent;
        color: ${({ theme }) => theme.tournamentDashboard?.muted || theme.text};
        cursor: pointer;
        font-weight: 800;
        transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    .cancel-btn:hover:not(:disabled) {
        background: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
        color: ${({ theme }) => theme.text};
    }

    > button,
    .export-action > button {
        box-sizing: border-box;
        min-height: 44px;
        padding: 7px 22px;
        line-height: 1.15;
        border-radius: 12px;
        font-size: 0.92rem;
    }

    .export-action { display: flex; }
    .export-action > button { width: 100%; }
    .content { gap: 7px; line-height: 1.15; }
    > button svg { flex-shrink: 0; }

    > button:disabled { cursor: not-allowed; }
    > button:focus-visible, .export-action > button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }

    > button:has(.content), .export-action > button {
        transform: none;
        border-bottom-width: 3px;
    }

    @media (min-width: 521px) {
        .cancel-btn + * { inline-size: 12rem; }
        .cancel-btn + button, .cancel-btn + .export-action > button {
            padding-inline: 12px;
        }
    }

    @media (max-width: 520px) {
        padding: 12px;

        > button, .export-action {
            flex: 1 1 7rem;
            min-width: 0;
        }

        > button, .cancel-btn, .export-action > button {
            padding: 4px 8px;
            white-space: normal;
        }

    }
`;
