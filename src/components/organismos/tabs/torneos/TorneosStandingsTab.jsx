// src/components/organismos/tabs/torneos/TorneosStandingsTab.jsx
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { v } from '../../../../styles/variables';
import { BiShareAlt, BiCheck } from "react-icons/bi"; 
import { RiImageLine } from "react-icons/ri"; 

import StandingsExportModal from './exports/standings/StandingsExportModal';
import StandingsTable from './subcomponents/StandingsTable';
import { StandingsJornadaSelector } from './StandingsJornadaSelector';
import { Skeleton } from '../../../atomos/Skeleton';

import { useTorneoStandingsLogic } from '../../../../hooks/useTorneoStandingsLogic';
import { updateTournamentFieldsService } from '../../../../services/torneos';

export const TorneosStandingsTab = ({
  torneo = {},
  equipos = [],
  partidos = [],
  jornadas: jornadasProp = [],
  reglas = {},
  onRefresh,
  isPublic = false,
  isLoading = false 
}) => {

  const [copied, setCopied] = useState(false);
  const [isPublicEnabled, setIsPublicEnabled] = useState(torneo?.is_public || false);
  const [updating, setUpdating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedJornadaView, setSelectedJornadaView] = useState('recent');

  useEffect(() => {
    if (onRefresh && !isPublic) {
      onRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    setIsPublicEnabled(torneo?.is_public || false);
  }, [torneo?.is_public]);

  useEffect(() => {
    setSelectedJornadaView('recent');
  }, [torneo?.id]);

  const {
    config,
    effectiveJornada,
    jornadasConfirmadasForDropdown,
    tablaGeneral,
    activeJornadaName,
    isCalculating
  } = useTorneoStandingsLogic({
    torneo,
    equipos,
    partidos,
    jornadasProp,
    reglas,
    selectedJornadaView
  });

  const isDataLoading = isLoading || isCalculating;
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    if (isDataLoading) {
      setShowSkeleton(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [isDataLoading, selectedJornadaView]);

  const handleTogglePublic = async () => {
    if (updating) return;
    setUpdating(true);
    const newState = !isPublicEnabled;

    try {
        await updateTournamentFieldsService(torneo.id, { is_public: newState });
        setIsPublicEnabled(newState);
        if (onRefresh) onRefresh(); 
        
    } catch (error) {
        console.error("Error updating public status:", error);
        alert("No se pudo actualizar el estado del enlace.");
    } finally {
        setUpdating(false);
    }
  };

  const handleShare = () => {
    const link = `${window.location.origin}/share/standings/${torneo.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isPublic && (
        <ControlPanel>
            <ToggleContainer onClick={handleTogglePublic} $active={isPublicEnabled}>
                <div className="track"><div className="thumb" /></div>
                <span className="label">Publico</span>
            </ToggleContainer>

            <SelectorShell>
              {showSkeleton ? (
                <Skeleton width="100%" height="36px" radius="8px" />
              ) : (
                <SelectorWrapper>
                  <StandingsJornadaSelector 
                    selected={selectedJornadaView}
                    onChange={setSelectedJornadaView}
                    effectiveJornada={effectiveJornada}
                    jornadasOptions={jornadasConfirmadasForDropdown}
                  />
                </SelectorWrapper>
              )}
            </SelectorShell>

            <ActionsGroup>
                <ShareButton onClick={() => setShowExportModal(true)} title="Exportar Tabla">
                    <RiImageLine size={20}/>
                    <span>Exportar</span>
                </ShareButton>

                {isPublicEnabled && (
                    <ShareButton onClick={handleShare} $copied={copied} title="Copiar Enlace">
                        {copied ? <BiCheck size={20}/> : <BiShareAlt size={20}/>}
                        <span>{copied ? "Copiado" : "Link"}</span>
                    </ShareButton>
                )}
            </ActionsGroup>
        </ControlPanel>
      )}

      <StandingsTable 
        tablaGeneral={tablaGeneral} 
        config={config} 
        isPublic={isPublic} 
        isLoading={showSkeleton} 
      />

      <StandingsExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        tablaGeneral={tablaGeneral}
        torneo={torneo}
        config={config}
        activeJornadaName={activeJornadaName} 
      />
    </div>
  );
};

/* ---------- Estilos ---------- */
const ControlPanel = styled.div`
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) auto;
  align-items: center;
  width: 98%;
  max-width: 900px;
  margin: 0 auto 10px auto;
  background: ${({ theme }) => theme.bg};
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.color2};
  box-shadow: ${v.boxshadowGray};
  gap: 8px;
  min-width: 0;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    grid-template-columns: auto minmax(0, 1fr) auto;
    padding: 7px 10px;
    border-radius: 10px;
  }
`;

const SelectorShell = styled.div`
  width: 100%;
  min-width: 0;
`;

const SelectorWrapper = styled.div`
  max-width: 360px;
  width: 100%;

  @media (max-width: 768px) {
    max-width: none;
  }
`;

const ActionsGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
`;

const ToggleContainer = styled.div`
    display: flex; flex-direction: column; align-items: center; gap: 1px; cursor: pointer; user-select: none; min-width: 0;
    .track {
        width: 44px; height: 24px; background-color: ${({ $active, theme }) => $active ? v.verde : theme.bg3};
        border-radius: 20px; position: relative; transition: background-color 0.3s ease; border: 1px solid ${({ theme }) => theme.color2};
    }
    .thumb {
        width: 20px; height: 20px; background-color: #fff; border-radius: 50%; position: absolute; top: 1px; left: 1px;
        transform: ${({ $active }) => $active ? 'translateX(20px)' : 'translateX(0)'};
        transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .label {
        font-size: 0.68rem;
        font-weight: 600;
        color: ${({ $active, theme }) => $active ? theme.text : theme.text + '80'};
        line-height: 1;
        max-width: 48px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    @media (max-width: 380px) { .label { font-size: 0.62rem; max-width: 46px; } }
`;

const ShareButton = styled.button`
  display: flex; align-items: center; gap: 8px;
  background-color: ${({ $copied, theme }) => $copied ? v.verde : theme.bg2};
  color: ${({ $copied, theme }) => $copied ? '#fff' : theme.text};
  border: 1px solid ${({ theme }) => theme.color2};
  padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
  transition: all 0.3s ease; white-space: nowrap;
  
  &:hover {
    transform: translateY(-2px);
    background-color: ${({ $copied, theme }) => $copied ? v.verde : theme.bg3};
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  @media (max-width: 768px) {
    padding: 0; width: 34px; height: 34px; justify-content: center; border-radius: 8px;
    span { display: none; }
  }
`;
