import React from "react";
import { createPortal } from "react-dom";
import styled, { keyframes, css } from "styled-components";
import { v } from "../../../../../styles/variables";
import { 
    RiRefreshLine, RiCheckDoubleLine, RiCloseLine, RiCalendarEventLine, 
    RiTeamLine, RiMagicLine, RiErrorWarningLine, RiLock2Line 
} from "react-icons/ri";
import { Btnsave } from "../../../../../index"; 
import { FixtureMatchCard } from "./FixtureMatchCard";
import { useFixturePreview } from "../../../../../hooks/useFixturePreview";

export function FixturePreviewModal({ 
    isOpen, onClose, onConfirm, teams = [], config, isLoading,
    existingData = null 
}) {
    const {
        matches, matchesByRound, conflicts, selectedTeamId, isAnimating, isEditMode,
        handleTeamClick, toggleLock, handleShuffle, handleAutoFix,
        handleDragStart, handleDropOnMatch, handleDropOnJornada
    } = useFixturePreview(teams, config, isOpen, existingData);

    if (!isOpen) return null;

    const handleConfirmar = () => {
        if (isEditMode) {
            onConfirm(matches);
        } else {
            const maxJornada = Math.max(...matches.map(m => m.jornadaIndex), 0);
            const finalFixture = [];
            for (let i = 0; i <= maxJornada; i++) {
                const matchesInRound = matches.filter(m => m.jornadaIndex === i).map(m => ({ local: m.local, visitante: m.visitante }));
                if (matchesInRound.length > 0) finalFixture.push({ name: `Jornada ${i + 1}`, matches: matchesInRound });
            }
            onConfirm(finalFixture);
        }
    };

    const roundIndexes = Object.keys(matchesByRound).sort((a,b) => Number(a) - Number(b));
    const conflictCount = Object.keys(conflicts).length;

    return createPortal(
        <Overlay>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <Header>
                    <div className="header-info">
                        <IconWrapper><RiCalendarEventLine /></IconWrapper>
                        <div className="texts">
                            <h3>{isEditMode ? "Reorganizar Calendario" : "Editor de Fixture"}</h3>
                            <span>{isEditMode ? "Mueve partidos futuros. Las jornadas jugadas están bloqueadas." : "Organiza las jornadas antes de guardar"}</span>
                        </div>
                    </div>
                    <CloseBtn onClick={onClose}><RiCloseLine /></CloseBtn>
                </Header>

                <Content>
                    <Toolbar>
                        <div className="info-teams">
                            <RiTeamLine /> {teams.length} Equipos 
                            {conflictCount > 0 ? (
                                <BadgeError><RiErrorWarningLine /> {conflictCount} Conflictos</BadgeError>
                            ) : (
                                <BadgeSuccess><RiCheckDoubleLine /> Fixture Válido</BadgeSuccess>
                            )}
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            {conflictCount > 0 && (
                                <ActionButton onClick={handleAutoFix} disabled={isAnimating} $color={v.colorWarning}>
                                    <RiMagicLine className={isAnimating ? "icon-spin" : ""} />
                                    <span>{isAnimating ? "Resolviendo..." : "Auto-Corregir"}</span>
                                </ActionButton>
                            )}
                            <ActionButton onClick={handleShuffle} disabled={isAnimating}>
                                <RiRefreshLine className={isAnimating ? "icon-spin" : ""} />
                                <span>{isEditMode ? "Restaurar" : "Reiniciar"}</span>
                            </ActionButton>
                        </div>
                    </Toolbar>

                    <ScrollArea>
                        <Grid $isAnimating={isAnimating}>
                            {roundIndexes.map((rIndex) => {
                                const isRoundLocked = matchesByRound[rIndex].some(m => m.roundLocked);
                                return (
                                    <JornadaColumn 
                                        key={rIndex}
                                        $locked={isRoundLocked}
                                        onDragOver={(e) => { if(!isRoundLocked) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}}
                                        onDrop={(e) => { if(!isRoundLocked) handleDropOnJornada(e, Number(rIndex)) }}
                                        $hasConflict={!!conflicts[rIndex]}
                                    >
                                        <JornadaTitle $hasConflict={!!conflicts[rIndex]} $locked={isRoundLocked}>
                                            <span>Jornada {Number(rIndex) + 1}</span>
                                            {isRoundLocked && <RiLock2Line />}
                                        </JornadaTitle>
                                        <MatchesList>
                                            {matchesByRound[rIndex].map((match) => {
                                                const isConflict = conflicts[rIndex] && (
                                                    conflicts[rIndex].includes(match.local.id) || 
                                                    conflicts[rIndex].includes(match.visitante.id)
                                                );
                                                return (
                                                    <FixtureMatchCard 
                                                        key={match.id}
                                                        match={match}
                                                        onDragStart={handleDragStart}
                                                        onDragOver={(e) => { if(!match.roundLocked) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}}
                                                        onDrop={handleDropOnMatch}
                                                        toggleLock={toggleLock}
                                                        isConflict={isConflict}
                                                        selectedTeamId={selectedTeamId}
                                                        onTeamClick={handleTeamClick}
                                                    />
                                                );
                                            })}
                                            {matchesByRound[rIndex].length === 0 && <EmptySlot>Vacío</EmptySlot>}
                                        </MatchesList>
                                    </JornadaColumn>
                                );
                            })}
                        </Grid>
                    </ScrollArea>
                </Content>
                <Footer>
                    <WarningText>
                       * Haz click en un equipo para ver su ruta.<br/>
                       {isEditMode ? "* Solo puedes modificar jornadas NO confirmadas." : "* Puedes mover partidos entre jornadas."}
                    </WarningText>
                    <ActionWrapper>
                        <Btnsave 
                            titulo={isLoading ? "Guardando..." : (isEditMode ? "Confirmar Cambios" : "Confirmar Fixture")}
                            bgcolor={conflictCount > 0 ? v.colorWarning : v.colorPrincipal}
                            icono={<RiCheckDoubleLine />}
                            funcion={handleConfirmar}
                            disabled={isLoading || conflictCount > 0} 
                        />
                    </ActionWrapper>
                </Footer>
            </ModalContainer>
        </Overlay>,
        document.body
    );
}

// --- STYLES (Se mantienen los del proyecto actual) ---
const spinAnimation = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const fadeIn = keyframes`from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); }`;
const Overlay = styled.div`position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); z-index: 2000; display: flex; justify-content: center; align-items: center; padding: 20px; @media (max-width: 768px) { padding: 0; align-items: flex-end; }`;
const ModalContainer = styled.div`width: 100%; max-width: 1300px; height: 90vh; background: ${({ theme }) => theme.bg}; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; animation: ${fadeIn} 0.25s ease-out; border: 1px solid ${({ theme }) => theme.bg4}; overflow: hidden; @media (max-width: 768px) { height: 100vh; border-radius: 0; border: none; }`;
const Header = styled.header`padding: 16px 24px; border-bottom: 1px solid ${({ theme }) => theme.bg4}; display: flex; justify-content: space-between; align-items: center; background: ${({ theme }) => theme.bg}; flex-shrink: 0; .header-info { display: flex; gap: 12px; align-items: center; .texts { display: flex; flex-direction: column; h3 { margin: 0; font-size: 1.1rem; color: ${({ theme }) => theme.text}; font-weight: 700; } span { font-size: 0.85rem; color: ${({ theme }) => theme.textFade}; } } }`;
const IconWrapper = styled.div`width: 42px; height: 42px; border-radius: 12px; background: ${v.colorPrincipal}20; color: ${v.colorPrincipal}; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;`;
const CloseBtn = styled.button`background: transparent; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; color: ${({ theme }) => theme.text}; &:hover { background: ${({ theme }) => theme.bg3}; color: ${v.colorError}; }`;
const Content = styled.div`flex: 1; display: flex; flex-direction: column; background: ${({ theme }) => theme.bg2}; overflow: hidden;`;
const Toolbar = styled.div`padding: 12px 24px; background: ${({ theme }) => theme.bgcards}; border-bottom: 1px solid ${({ theme }) => theme.bg4}; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; .info-teams { display: flex; align-items: center; gap: 15px; font-size: 0.9rem; font-weight: 600; color: ${({ theme }) => theme.text}; } @media (max-width: 600px) { flex-direction: column; gap: 10px; align-items: stretch; }`;
const ActionButton = styled.button`display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: ${({ theme }) => theme.bg3}; color: ${props => props.$color || props.theme.text}; border: 1px solid ${({ theme }) => theme.bg4}; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; &:hover { background: ${props => props.$color || v.colorPrincipal}; color: white; border-color: transparent; } &:disabled { opacity: 0.6; cursor: not-allowed; } .icon-spin { animation: ${spinAnimation} 0.6s linear infinite; }`;
const BadgeError = styled.span`display: flex; align-items: center; gap: 5px; color: ${v.colorError}; font-size: 0.8rem; background: ${v.colorError}15; padding: 4px 8px; border-radius: 4px;`;
const BadgeSuccess = styled.span`display: flex; align-items: center; gap: 5px; color: ${v.colorPrincipal}; font-size: 0.8rem; background: ${v.colorPrincipal}15; padding: 4px 8px; border-radius: 4px;`;
const ScrollArea = styled.div`flex: 1; overflow-y: auto; padding: 24px; &::-webkit-scrollbar { width: 8px; } &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.bg4}; border-radius: 4px; } @media (max-width: 768px) { padding: 12px; }`;
const Grid = styled.div`display: flex; flex-wrap: wrap; gap: 16px; opacity: ${props => props.$isAnimating ? 0.5 : 1}; transition: opacity 0.3s ease; align-items: flex-start;`;

const JornadaColumn = styled.div`
    background: ${({ theme, $hasConflict, $locked }) => 
        $locked ? theme.bg3 : ($hasConflict ? `${v.colorError}05` : theme.bgcards)}; 
    border: 1px solid ${({ theme, $hasConflict, $locked }) => 
        $locked ? theme.bg4 : ($hasConflict ? v.colorError : theme.bg4)}; 
    border-radius: 12px; overflow: hidden; width: 280px; flex-shrink: 0; display: flex; flex-direction: column; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.03); 
    opacity: ${({$locked}) => $locked ? 0.7 : 1};
    ${({$locked}) => $locked && css`pointer-events: none;`}
    @media (max-width: 600px) { width: 100%; }
`;

const JornadaTitle = styled.div`
    padding: 10px 15px; 
    background: ${({ theme, $locked }) => $locked ? theme.bg4 : theme.bg3}; 
    font-size: 0.85rem; 
    color: ${({ theme, $hasConflict, $locked }) => 
        $locked ? theme.textFade : ($hasConflict ? v.colorError : v.colorPrincipal)}; 
    font-weight: 700; border-bottom: 1px solid ${({ theme }) => theme.bg4}; 
    display: flex; justify-content: space-between; align-items: center;
`;

const MatchesList = styled.div`padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 50px;`;
const EmptySlot = styled.div`padding: 10px; border: 2px dashed ${({theme})=>theme.bg4}; border-radius: 8px; color: ${({theme})=>theme.textFade}; font-size: 0.8rem; text-align: center;`;
const Footer = styled.footer`padding: 16px 24px; border-top: 1px solid ${({ theme }) => theme.bg4}; display: flex; justify-content: space-between; align-items: center; background: ${({ theme }) => theme.bg}; flex-shrink: 0; gap: 15px; @media (max-width: 600px) { flex-direction: column-reverse; align-items: stretch; padding: 16px; }`;
const WarningText = styled.div`color: ${({ theme }) => theme.textFade}; font-size: 0.75rem; font-style: italic; line-height: 1.4; @media (max-width: 600px) { text-align: center; }`;
const ActionWrapper = styled.div`@media (max-width: 600px) { width: 100%; button { width: 100%; justify-content: center; } }`;