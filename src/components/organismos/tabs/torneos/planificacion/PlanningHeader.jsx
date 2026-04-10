import React, { memo, useState, useLayoutEffect } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { 
    RiArrowLeftSLine, RiArrowRightSLine, RiSettings4Line, 
    RiEdit2Line, RiMagicLine, RiCheckLine, RiPrinterLine 
} from "react-icons/ri";
import { ViewToggle } from "../../../../../index"; 

export const PlanningHeader = memo(({ 
    jornadaIndex, 
    jornadaData, 
    status, 
    onPrev, 
    onNext, 
    totalJornadas, 
    onSaveDates, 
    onAutoFill,
    onConfig, 
    viewMode, 
    onToggleView,
    onEditFixture, 
    isTournamentActive,
    onPrintBatch, // <--- Nueva prop
    matchesWithoutResultCount = 0, // <--- Cantidad de partidos pendientes
    isRepositionMode = false,
    onDateChange,
}) => {
    const isConfirmed = status === 'Confirmada';
    const hasDates = jornadaData?.start_date && jornadaData?.end_date;

    // --- ESTADO LOCAL PARA EDICIÓN SIN GUARDADO INMEDIATO ---
    const [localStart, setLocalStart] = useState(jornadaData?.start_date || '');
    const [localEnd, setLocalEnd] = useState(jornadaData?.end_date || '');

    useLayoutEffect(() => {
        setLocalStart(jornadaData?.start_date || '');
        setLocalEnd(jornadaData?.end_date || '');
    }, [jornadaData]);

    const hasChanges =
        !isRepositionMode &&
        ((localStart !== (jornadaData?.start_date || '')) ||
            (localEnd !== (jornadaData?.end_date || '')));

    const handleConfirmChanges = () => {
        if (onSaveDates) {
            onSaveDates(localStart, localEnd);
        }
    };

    const handleStartChange = (value) => {
        setLocalStart(value);
        if (isRepositionMode && onDateChange) {
            onDateChange(value, localEnd);
        }
    };

    const handleEndChange = (value) => {
        setLocalEnd(value);
        if (isRepositionMode && onDateChange) {
            onDateChange(localStart, value);
        }
    };

    // Lógica para mostrar botón de imprimir:
    // 1. Jornada confirmada.
    // 2. Al menos 1 partido sin resultado.
    const showPrintButton = isConfirmed && matchesWithoutResultCount > 0;

    return (
        <Container>
            <InfoGroup>
                <NavRow>
                    <NavBtn onClick={onPrev} disabled={jornadaIndex === 0}>
                        <RiArrowLeftSLine size={24}/>
                    </NavBtn>
                    <Title $status={status}>
                        <span>{jornadaData?.name || `Jornada ${jornadaIndex + 1}`}</span>
                        <small>{status}</small>
                    </Title>
                    <NavBtn onClick={onNext} disabled={jornadaIndex === totalJornadas - 1}>
                        <RiArrowRightSLine size={24}/>
                    </NavBtn>
                </NavRow>

                <DateRow $hasChanges={hasChanges}>
                    <span className="label-text">Semana del</span>
                    
                    <input 
                        type="date" 
                        className="native-input"
                        value={localStart}
                    onChange={(e) => handleStartChange(e.target.value)}
                    disabled={isConfirmed}
                    />

                    <span className="label-text">al</span>
                    
                    <input 
                        type="date" 
                        className="native-input"
                        value={localEnd}
                    onChange={(e) => handleEndChange(e.target.value)}
                    disabled={isConfirmed}
                    />

                    {hasChanges && !isConfirmed && !isRepositionMode && (
                        <ConfirmBtn onClick={handleConfirmChanges} title="Guardar y actualizar jornadas siguientes">
                            <RiCheckLine size={18} /> Confirmar
                        </ConfirmBtn>
                    )}
                    
                    {!isRepositionMode && !hasDates && !hasChanges && !isConfirmed && onAutoFill && (
                        <AutoFillBtn onClick={onAutoFill} title="Auto-calcular fechas para todas las jornadas">
                            <RiMagicLine /> Auto
                        </AutoFillBtn>
                    )}
                </DateRow>
            </InfoGroup>

            <ActionsGroup>
                {/* Botón Imprimir Lote con Notificación */}
                {showPrintButton && (
                     <BtnAction onClick={onPrintBatch} title={`Imprimir ${matchesWithoutResultCount} cédulas pendientes`}>
                        <RiPrinterLine size={20}/>
                        <NotificationBadge>{matchesWithoutResultCount}</NotificationBadge>
                     </BtnAction>
                )}

                {isTournamentActive && (
                    <BtnAction onClick={onEditFixture} title="Reorganizar partidos futuros">
                        <RiEdit2Line size={20}/>
                    </BtnAction>
                )}
                
                <BtnAction onClick={onConfig} title="Configuración de Jornada">
                    <RiSettings4Line size={20}/>
                </BtnAction>
                
                <div className="separator"></div>
                <ViewToggle currentMode={viewMode} onToggle={onToggleView} />
            </ActionsGroup>
        </Container>
    );
});

// --- Styled Components ---

const Container = styled.div`
  background: ${({theme})=>theme.bg3};
  padding: 15px;
  border-radius: 10px;
  display: flex; flex-direction: column; gap: 15px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  @media (min-width: 768px) { flex-direction: row; justify-content: space-between; align-items: center; }
`;

const InfoGroup = styled.div`
  display: flex; flex-direction: column; gap: 15px; flex: 1;
  @media (min-width: 768px) { flex-direction: row; align-items: center; gap: 25px; }
`;

const ActionsGroup = styled.div`
  display: flex; gap: 12px; align-items: center; justify-content: flex-end;
  .separator { width: 1px; height: 25px; background: ${({theme})=>theme.bg4}; margin: 0 5px; display: none; @media (min-width: 768px) { display: block; } }
  @media (max-width: 768px) { justify-content: space-between; border-top: 1px solid ${({theme})=>theme.bg4}; padding-top: 15px; width: 100%; }
`;

const NavRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 15px;
  @media (min-width: 768px) { justify-content: flex-start; }
`;

const Title = styled.div`
  display: flex; flex-direction: column; align-items: center;
  min-width: 120px;
  span { font-weight: 800; font-size: 1.1rem; color: ${({theme})=>theme.text}; }
  small { 
      font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
      color: ${({status, theme})=> status === 'Confirmada' ? '#2ecc71' : theme.text}; opacity: ${({status})=> status === 'Confirmada' ? 1 : 0.6}; 
  }
`;

const NavBtn = styled.button`
  background: ${({theme})=>theme.bg4}; border: none; width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${({theme})=>theme.text}; transition: all 0.2s;
  &:disabled { opacity: 0.3; cursor: not-allowed; }
  &:hover:not(:disabled) { background: ${v.colorPrincipal}; color: white; transform: scale(1.1); }
`;

const DateRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  background: ${({theme, $hasChanges})=> $hasChanges ? v.colorPrincipal + '10' : theme.bgcards};
  padding: 8px 15px;
  border-radius: 8px;
  border: 1px solid ${({theme, $hasChanges})=> $hasChanges ? v.colorPrincipal : theme.bg4};
  font-family: 'Nunito', sans-serif;
  flex-wrap: wrap;
  transition: all 0.3s ease;
  
  .label-text { font-size: 0.9rem; font-weight: 600; color: ${({theme})=>theme.text}; opacity: 0.8; }
  
  .native-input {
      border: 1px solid ${({theme}) => theme.bg4};
      background: ${({theme}) => theme.bg3};
      color: ${({theme}) => theme.text};
      padding: 4px 8px;
      border-radius: 5px;
      font-family: inherit;
      font-size: 0.9rem;
      cursor: pointer;
      color-scheme: ${({theme}) => theme.mode === 'dark' ? 'dark' : 'light'};

      &:focus { outline: 2px solid ${v.colorPrincipal}; border-color: transparent; }
      &:disabled { opacity: 0.7; cursor: not-allowed; background: transparent; border-color: transparent; font-weight: bold; }
  }
  @media (max-width: 768px) { justify-content: center; width: 100%; }
`;

const ConfirmBtn = styled.button`
    display: flex; align-items: center; gap: 5px;
    background: ${v.colorPrincipal}; 
    color: white;
    border: none;
    font-size: 0.85rem; font-weight: 700;
    padding: 6px 12px; border-radius: 5px;
    cursor: pointer;
    margin-left: 5px;
    animation: fadeIn 0.3s ease;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    &:hover { background: ${v.colorPrincipalDark || '#27ae60'}; transform: translateY(-1px); }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
`;

const AutoFillBtn = styled.button`
    display: flex; align-items: center; gap: 4px;
    background: transparent; border: 1px dashed ${v.colorPrincipal};
    color: ${v.colorPrincipal};
    font-size: 0.75rem; font-weight: 700;
    padding: 4px 8px; border-radius: 4px;
    cursor: pointer;
    margin-left: 5px;
    &:hover { background: ${v.colorPrincipal}15; }
`;

const BtnAction = styled.button`
  background: ${({theme})=>theme.bg4}; 
  border: none; 
  border-radius: 8px; 
  width: 42px; 
  height: 42px;
  display: flex; 
  align-items: center; 
  justify-content: center; 
  cursor: pointer; 
  color: ${({theme})=>theme.text}; 
  transition: all 0.2s;
  position: relative; /* Necesario para posicionar el badge */
  
  &:hover { 
      background: ${v.colorPrincipal}20; 
      color: ${v.colorPrincipal}; 
      transform: translateY(-2px); 
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background: #e74c3c; /* Rojo de notificación, o puedes usar v.colorPrincipal */
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${({theme})=>theme.bg3}; /* Borde para que resalte sobre el botón */
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  pointer-events: none; /* Para que no interfiera si le dan clic justo al número */
`;
