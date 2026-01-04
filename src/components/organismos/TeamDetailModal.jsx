import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { 
    Modal, 
    ContainerScroll, 
    Skeleton, 
    SortControl, 
    useSort, 
    v 
} from "../../index";
import { supabase } from "../../supabase/supabase.config";
import { 
    RiShieldUserLine, RiUserFollowLine, RiSmartphoneLine, 
    RiArrowLeftLine 
} from "react-icons/ri";

export function TeamDetailModal({ isOpen, onClose, team, division }) {
    const [showPlayerList, setShowPlayerList] = useState(false);
    const [players, setPlayers] = useState([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);

    // --- LÓGICA DE ORDENAMIENTO ---
    const POSITION_RANK = { 'Portero': 1, 'Defensa': 2, 'Medio': 3, 'Delantero': 4 };
    
    // Configuramos el hook useSort
    const { items: sortedPlayers, requestSort, sortConfig } = useSort(players, {
        key: 'dorsal',
        direction: 'ascending'
    });

    const sortOptions = [
        { label: "Dorsal", key: "dorsal" },
        { label: "Nombre", key: "first_name" },
        { label: "Posición", key: "position", customOrder: POSITION_RANK }
    ];

    // Reiniciar estados cuando se cierra o cambia el equipo
    useEffect(() => {
        if (!isOpen) {
            setShowPlayerList(false);
            setPlayers([]);
        }
    }, [isOpen]);

    const handleShowPlayers = async () => {
        if (!team) return;
        setShowPlayerList(true);
        setLoadingPlayers(true);
        try {
            const { data } = await supabase
                .from('players')
                .select('*')
                .eq('team_id', team.id);
            setPlayers(data || []);
        } catch (error) {
            console.error("Error fetching players:", error);
        } finally {
            setLoadingPlayers(false);
        }
    };

    if (!team) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={showPlayerList ? "Lista de Jugadores" : "Ficha del Equipo"}
            closeOnOverlayClick={true}
            width={showPlayerList ? "800px" : "550px"}
        >
            <DetailContainer $color={team.color}>
                {showPlayerList ? (
                    <div className="players-internal-view">
                        <div className="header-list-actions">
                            <button className="back-link-styled" onClick={() => setShowPlayerList(false)}>
                                <RiArrowLeftLine /> 
                                <span>Volver a Ficha</span>
                            </button>
                            
                            {!loadingPlayers && players.length > 0 && (
                                <SortControl 
                                    options={sortOptions} 
                                    currentSort={sortConfig} 
                                    onSortChange={requestSort} 
                                />
                            )}
                        </div>

                        <ContainerScroll $maxHeight="500px">
                            <div className="players-grid-simple">
                                {loadingPlayers ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <PlayerSkeletonWrapper key={i}>
                                            <Skeleton type="circle" width="60px" height="60px" />
                                            <div className="info-sk">
                                                <Skeleton width="70%" height="14px" />
                                                <Skeleton width="40%" height="10px" />
                                            </div>
                                        </PlayerSkeletonWrapper>
                                    ))
                                ) : (
                                    sortedPlayers.map(p => (
                                        <div className="player-chip-simple" key={p.id}>
                                            <img src={p.photo_url || "https://i.ibb.co/5vgZ0fX/hombre.png"} alt="foto" />
                                            <div className="info-p">
                                                <span className="dorsal">#{p.dorsal}</span>
                                                <span className="name">{p.first_name} {p.last_name}</span>
                                                <span className="pos">{p.position || "Jugador"}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {players.length === 0 && !loadingPlayers && (
                                    <p className="empty-msg">No hay jugadores registrados en este equipo.</p>
                                )}
                            </div>
                        </ContainerScroll>
                    </div>
                ) : (
                    <div className="ficha-view">
                        <div className="banner">
                            <div className="division-badge">{division?.name || "Liga"}</div>
                        </div>
                        <div className="logo-wrapper">
                            <img src={team.logo_url || "https://i.ibb.co/MyJ50b7/logo-default.png"} alt={team.name} />
                        </div>
                        <h2 className="team-title">{team.name}</h2>
                        <div className="info-body">
                            <div className="info-item">
                                <div className="icon-box"><RiShieldUserLine /></div>
                                <div>
                                    <span className="label">Delegado</span>
                                    <p className="value">{team.delegate_name || "No registrado"}</p>
                                </div>
                            </div>
                            <div className="info-item clickable" onClick={handleShowPlayers}>
                                <div className="icon-box"><RiUserFollowLine /></div>
                                <div style={{ flex: 1 }}>
                                    <span className="label">Plantilla</span>
                                    <p className="value">Ver Jugadores</p>
                                </div>
                                <span className="arrow-icon">➔</span>
                            </div>
                            <div className="info-item">
                                <div className="icon-box"><RiSmartphoneLine /></div>
                                <div>
                                    <span className="label">Contacto</span>
                                    <p className="value">{team.contact_phone || "No disponible"}</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="icon-box"><v.iconoemijivacio /></div>
                                <div>
                                    <span className="label">Estado Actual</span>
                                    <StatusPill $active={team.status === 'Activo'}>
                                        {team.status}
                                    </StatusPill>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DetailContainer>
        </Modal>
    );
}

// --- ESTILOS (Movidos desde EquiposTemplate) ---

const slideInRight = keyframes`
  from { transform: translateX(50px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;
const slideInLeft = keyframes`
  from { transform: translateX(-50px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const DetailContainer = styled.div`
    display: flex; flex-direction: column; align-items: center; position: relative; padding-bottom: 10px; width: 100%; overflow-x: hidden; 

    .players-internal-view { 
        width: 100%; 
        animation: ${slideInRight} 0.4s cubic-bezier(0.25, 1, 0.5, 1); 
        padding: 0 10px;
    }
    
    .header-list-actions {
        display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;
    }

    .back-link-styled { 
        background: ${({theme}) => theme.bgtotal}; 
        border: 1px solid ${({theme}) => theme.bg4};
        color: ${({theme}) => theme.text}; 
        cursor: pointer; 
        display: inline-flex; 
        align-items: center; 
        gap: 8px; 
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 20px;
        transition: all 0.2s ease;
        
        &:hover { 
            background: ${({theme}) => theme.bgcards}; 
            transform: translateX(-3px);
            border-color: ${v.colorPrincipal};
        }
        svg { font-size: 1.1rem; }
    }

    .players-grid-simple {
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); 
        gap: 15px; 
    }

    .player-chip-simple {
        background: ${({theme})=>theme.bgtotal}; 
        border: 1px solid ${({theme})=>theme.bg4}; 
        padding: 15px; 
        border-radius: 12px;
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        gap: 10px;
        text-align: center;
        transition: transform 0.2s, box-shadow 0.2s;

        &:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            border-color: ${v.colorPrincipal};
        }

        img { 
            width: 60px; height: 60px; 
            border-radius: 50%; 
            object-fit: cover; 
            background: #eee; 
            border: 2px solid ${({theme})=>theme.bgcards};
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .info-p { display: flex; flex-direction: column; gap: 2px; }
        .dorsal { font-weight: 900; color: ${v.colorPrincipal}; font-size: 1.1rem; }
        .name { font-size: 0.95rem; font-weight: 600; line-height: 1.2; }
        .pos { font-size: 0.75rem; opacity: 0.7; margin-top: 4px; background: ${({theme})=>theme.bgcards}; padding: 2px 8px; border-radius: 10px; }
    }

    .empty-msg { text-align: center; width: 100%; opacity: 0.6; padding: 20px; font-style: italic; grid-column: 1 / -1; }

    .ficha-view {
        width: 100%;
        display: flex; flex-direction: column; align-items: center;
        animation: ${slideInLeft} 0.4s cubic-bezier(0.25, 1, 0.5, 1);
    }

    .banner {
        height: 150px; width: calc(100% + 50px); margin: -25px -25px 0 -25px;
        background: ${({$color}) => `linear-gradient(135deg, ${$color}, ${$color}aa)`};
        display: flex; justify-content: center; align-items: flex-start; padding-top: 35px; position: relative; overflow: hidden;
        &::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%); }
        .division-badge { background: rgba(0,0,0,0.3); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; z-index: 2; }
    }
    
    .logo-wrapper {
        width: 140px; height: 140px; margin-top: -70px; z-index: 5; background: transparent; display: flex; align-items: center; justify-content: center;
        img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 10px rgba(0,0,0,0.4)); transition: transform 0.3s; &:hover { transform: scale(1.05); } }
    }
    
    .team-title { margin: 15px 0 5px 0; text-align: center; color: ${({theme}) => theme.text}; font-size: 1.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; }
    .info-body { width: 100%; padding-top: 15px; display: flex; flex-direction: column; gap: 15px; }
    
    .info-item {
        background: ${({theme}) => theme.bgtotal}; padding: 15px; border-radius: 12px; display: flex; align-items: center; gap: 15px; border: 1px solid ${({theme}) => theme.bg4};
        &.clickable {
            cursor: pointer; transition: all 0.2s ease;
            &:hover {
                border-color: ${v.colorPrincipal};
                background: ${({theme}) => theme.bgcards};
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                .arrow-icon { transform: translateX(5px); color: ${v.colorPrincipal}; } 
            }
        }
        .arrow-icon { margin-left: auto; font-size: 1.1rem; opacity: 0.5; transition: transform 0.2s; }
        .icon-box { width: 40px; height: 40px; background: ${({theme}) => theme.bgcards}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: ${({theme}) => theme.text}; box-shadow: ${({theme}) => theme.boxshadowGray}; }
        .label { font-size: 0.8rem; color: ${({theme}) => theme.text}; opacity: 0.6; display: block; }
        .value { margin: 0; font-size: 1rem; font-weight: 600; color: ${({theme}) => theme.text}; }
    }
`;

const PlayerSkeletonWrapper = styled.div`
  background: ${({theme})=>theme.bgtotal};
  border: 1px solid ${({theme})=>theme.bg4};
  border-radius: 12px; padding: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; height: 160px;
  .info-sk { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; }
`;

const StatusPill = styled.span`
  display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 700;
  background: ${({$active}) => $active ? 'rgba(46, 213, 115, 0.15)' : 'rgba(231, 76, 60, 0.15)'};
  color: ${({$active}) => $active ? '#2ecc71' : '#e74c3c'};
`;