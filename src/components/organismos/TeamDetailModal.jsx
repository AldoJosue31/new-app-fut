import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { 
    Modal, 
    ContainerScroll, 
    Skeleton, 
    SortControl, 
    useSort, 
    v 
} from "../../index";
import { supabase } from "../../supabase/supabase.config";
import { getTeamTournamentStats } from "../../services/estadisticas"; 
import { 
    RiShieldUserLine, RiUserFollowLine, RiSmartphoneLine, 
    RiArrowLeftLine, RiTrophyLine, RiFootballLine, RiUserSmileLine
} from "react-icons/ri";

export function TeamDetailModal({ isOpen, onClose, team, division }) {
    // --- ESTADOS ---
    const [showPlayerList, setShowPlayerList] = useState(false);
    const [players, setPlayers] = useState([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);

    const [showStats, setShowStats] = useState(false);
    const [statsData, setStatsData] = useState(null);
    const [hasActiveTournament, setHasActiveTournament] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);

    // --- ORDENAMIENTO (Vista Lista Jugadores - Dropdown) ---
    const POSITION_RANK = { 'Portero': 1, 'Defensa': 2, 'Medio': 3, 'Delantero': 4 };
    const { items: sortedPlayers, requestSort, sortConfig } = useSort(players, {
        key: 'dorsal', direction: 'ascending'
    });
    const sortOptions = [
        { label: "Dorsal", key: "dorsal" },
        { label: "Nombre", key: "first_name" },
        { label: "Posición", key: "position", customOrder: POSITION_RANK }
    ];

    // --- ORDENAMIENTO (Vista Estadísticas - Click en Headers) ---
    // Configurado por defecto para mostrar goleadores (Goles Descendente)
    const { items: sortedStats, requestSort: requestStatSort, sortConfig: statSortConfig } = useSort(statsData?.playerStats || [], {
        key: 'goals', direction: 'descending'
    });

    // --- EFECTOS ---
    useEffect(() => {
        if (!isOpen) {
            setShowPlayerList(false);
            setShowStats(false);
            setPlayers([]);
            setStatsData(null);
            setHasActiveTournament(false);
        } else if (team && division) {
            checkTournamentStatus();
        }
    }, [isOpen, team, division]);

    const checkTournamentStatus = async () => {
        setLoadingStats(true);
        try {
            const data = await getTeamTournamentStats(team.id, division.id);
            if (data && data.hasTournament) {
                setHasActiveTournament(true);
                setStatsData(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleShowPlayers = async () => {
        if (!team) return;
        setShowPlayerList(true);
        setLoadingPlayers(true);
        try {
            const { data } = await supabase.from('players').select('*').eq('team_id', team.id);
            setPlayers(data || []);
        } catch (error) { console.error(error); } 
        finally { setLoadingPlayers(false); }
    };

    const handleShowStats = () => {
        setShowStats(true);
    };

    // Helper para renderizar indicador de ordenamiento en tabla
    const SortIcon = ({ columnKey }) => {
        if (statSortConfig.key !== columnKey) return <span style={{opacity:0.2, fontSize:'0.7em', marginLeft:'4px'}}>⇅</span>;
        return <span style={{color: v.colorPrincipal, marginLeft:'4px'}}>{statSortConfig.direction === 'ascending' ? '▲' : '▼'}</span>;
    };

    if (!team) return null;

    let modalTitle = "Ficha del Equipo";
    if (showPlayerList) modalTitle = "Lista de Jugadores";
    if (showStats) modalTitle = "Estadísticas del Torneo";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            closeOnOverlayClick={true}
            width={(showPlayerList || showStats) ? "850px" : "550px"}
        >
            <DetailContainer $color={team.color}>
                
                {/* --- VISTA 1: LISTA DE JUGADORES --- */}
                {showPlayerList ? (
                    <div className="internal-view">
                        <div className="header-list-actions">
                            <button className="back-link-styled" onClick={() => setShowPlayerList(false)}>
                                <RiArrowLeftLine /> <span>Volver a Ficha</span>
                            </button>
                            {!loadingPlayers && players.length > 0 && (
                                <SortControl options={sortOptions} currentSort={sortConfig} onSortChange={requestSort} />
                            )}
                        </div>
                        <ContainerScroll $maxHeight="500px">
                            <div className="players-grid-simple">
                                {loadingPlayers ? (
                                    Array.from({ length: 8 }).map((_, i) => <PlayerSkeleton key={i} />)
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
                                {players.length === 0 && !loadingPlayers && <p className="empty-msg">No hay jugadores registrados.</p>}
                            </div>
                        </ContainerScroll>
                    </div>
                ) : showStats ? (
                    /* --- VISTA 2: ESTADÍSTICAS DEL TORNEO --- */
                    <div className="internal-view">
                        <div className="header-list-actions">
                            <button className="back-link-styled" onClick={() => setShowStats(false)}>
                                <RiArrowLeftLine /> <span>Volver a Ficha</span>
                            </button>
                        </div>

                        <ContainerScroll $maxHeight="500px">
                            <StatsContent>
                                {/* RESULTADOS RECIENTES */}
                                <SectionContainer>
                                    <SectionLabel>Últimos Resultados</SectionLabel>
                                    <MatchesRow>
                                        {statsData?.matchHistory?.length > 0 ? (
                                            statsData.matchHistory.map(m => (
                                                <MatchCard key={m.id} $result={m.result}>
                                                    <div className="match-header">
                                                        <span className="date">{m.jornada}</span>
                                                        <ResultBadge $result={m.result}>{m.result === 'V' ? 'G' : m.result === 'E' ? 'E' : 'P'}</ResultBadge>
                                                    </div>
                                                    <div className="match-score">
                                                        <span className="score-num my-team">{m.myGoals}</span>
                                                        <span className="divider">-</span>
                                                        <span className="score-num">{m.rivalGoals}</span>
                                                    </div>
                                                    <div className="rival-container">
                                                        <img src={m.rival.logo_url || "/logo_gen.png"} alt="R" />
                                                        <span>{m.rival.name}</span>
                                                    </div>
                                                </MatchCard>
                                            ))
                                        ) : (
                                            <EmptyBox>No hay partidos finalizados aún en este torneo.</EmptyBox>
                                        )}
                                    </MatchesRow>
                                </SectionContainer>

                                {/* TABLA DE ESTADÍSTICAS INDIVIDUALES (ORDENABLE) */}
                                <SectionContainer>
                                    <SectionLabel>Rendimiento Individual</SectionLabel>
                                    <TableWrapper>
                                        <StyledTable>
                                            <thead>
                                                <tr>
                                                    <th className="col-player clickable" onClick={() => requestStatSort('name')}>
                                                        Jugador <SortIcon columnKey="name"/>
                                                    </th>
                                                    <th className="col-stat clickable" onClick={() => requestStatSort('matches')} title="Partidos Jugados">
                                                        <RiUserSmileLine size={16}/> <SortIcon columnKey="matches"/>
                                                    </th>
                                                    <th className="col-stat clickable" onClick={() => requestStatSort('goals')} title="Goles">
                                                        <RiFootballLine size={16}/> <SortIcon columnKey="goals"/>
                                                    </th>
                                                    <th className="col-stat clickable" onClick={() => requestStatSort('yellow')} title="Amarillas">
                                                        <CardIcon color="#f1c40f"/> <SortIcon columnKey="yellow"/>
                                                    </th>
                                                    <th className="col-stat clickable" onClick={() => requestStatSort('red')} title="Rojas">
                                                        <CardIcon color="#e74c3c"/> <SortIcon columnKey="red"/>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* USAMOS sortedStats EN LUGAR DE statsData.playerStats DIRECTAMENTE */}
                                                {sortedStats.length > 0 ? (
                                                    sortedStats.map(p => (
                                                        <tr key={p.id}>
                                                            <td className="col-player">
                                                                <PlayerCell>
                                                                    <div className="avatar-mini">
                                                                        {p.photo ? <img src={p.photo} alt="p"/> : <span>{p.name.charAt(0)}</span>}
                                                                    </div>
                                                                    <div className="p-info">
                                                                        <span className="p-name">{p.name}</span>
                                                                        {p.dorsal !== '?' && <span className="p-dorsal">#{p.dorsal}</span>}
                                                                    </div>
                                                                </PlayerCell>
                                                            </td>
                                                            <td className="col-stat">{p.matches}</td>
                                                            <td className="col-stat bold">{p.goals}</td>
                                                            <td className="col-stat">{p.yellow}</td>
                                                            <td className="col-stat">{p.red}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan="5" className="empty-cell">Sin estadísticas registradas</td></tr>
                                                )}
                                            </tbody>
                                        </StyledTable>
                                    </TableWrapper>
                                </SectionContainer>
                            </StatsContent>
                        </ContainerScroll>
                    </div>
                ) : (
                    /* --- VISTA 3: FICHA GENERAL --- */
                    <div className="ficha-view">
                        <div className="banner">
                            <div className="division-badge">{division?.name || "Liga"}</div>
                        </div>
                        <div className="logo-wrapper">
                            <img src={team.logo_url || "/logo_gen.png"} alt={team.name} />
                        </div>
                        <h2 className="team-title">{team.name}</h2>
                        
                        <div className="info-body">
                            <InfoItem>
                                <IconBox><RiShieldUserLine /></IconBox>
                                <div>
                                    <span className="label">Delegado</span>
                                    <p className="value">{team.delegate_name || "No registrado"}</p>
                                </div>
                            </InfoItem>

                            <InfoItem className="clickable" onClick={handleShowPlayers}>
                                <IconBox><RiUserFollowLine /></IconBox>
                                <div style={{ flex: 1 }}>
                                    <span className="label">Plantilla</span>
                                    <p className="value">Ver Jugadores</p>
                                </div>
                                <span className="arrow-icon">➔</span>
                            </InfoItem>

                            <InfoItem>
                                <IconBox><RiSmartphoneLine /></IconBox>
                                <div>
                                    <span className="label">Contacto</span>
                                    <p className="value">{team.contact_phone || "No disponible"}</p>
                                </div>
                            </InfoItem>

                            {/* Botón Estatus / Torneo */}
                            {loadingStats ? (
                                <Skeleton width="100%" height="60px" />
                            ) : hasActiveTournament ? (
                                <InfoItem className="clickable tournament-active" onClick={handleShowStats}>
                                    <IconBox className="gold"><RiTrophyLine /></IconBox>
                                    <div style={{ flex: 1 }}>
                                        <span className="label">Torneo Actual</span>
                                        <p className="value highlight">Ver Estadísticas</p>
                                    </div>
                                    <span className="arrow-icon">➔</span>
                                </InfoItem>
                            ) : (
                                <InfoItem>
                                    <IconBox><v.iconoemijivacio /></IconBox>
                                    <div>
                                        <span className="label">Estado Actual</span>
                                        <StatusPill $active={team.status === 'Activo'}>{team.status}</StatusPill>
                                    </div>
                                </InfoItem>
                            )}
                        </div>
                    </div>
                )}
            </DetailContainer>
        </Modal>
    );
}

// --- SUB-COMPONENTES & ESTYLES ---

const PlayerSkeleton = () => (
    <PlayerSkeletonWrapper>
        <Skeleton type="circle" width="60px" height="60px" />
        <div className="info-sk"><Skeleton width="70%" height="14px" /><Skeleton width="40%" height="10px" /></div>
    </PlayerSkeletonWrapper>
);

const slideInRight = keyframes` from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; }`;
const slideInLeft = keyframes` from { transform: translateX(-50px); opacity: 0; } to { transform: translateX(0); opacity: 1; }`;

const DetailContainer = styled.div`
    display: flex; flex-direction: column; align-items: center; position: relative; padding-bottom: 10px; width: 100%; overflow-x: hidden; 

    .internal-view { width: 100%; animation: ${slideInRight} 0.4s cubic-bezier(0.25, 1, 0.5, 1); padding: 0 10px; }
    .ficha-view { width: 100%; display: flex; flex-direction: column; align-items: center; animation: ${slideInLeft} 0.4s cubic-bezier(0.25, 1, 0.5, 1); }
    
    .header-list-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .back-link-styled { 
        background: ${({theme}) => theme.bgtotal}; border: 1px solid ${({theme}) => theme.bg4}; color: ${({theme}) => theme.text}; 
        cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; padding: 8px 16px; border-radius: 20px; transition: 0.2s;
        &:hover { background: ${({theme}) => theme.bgcards}; border-color: ${v.colorPrincipal}; transform: translateX(-3px); }
    }
    
    .players-grid-simple { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; }
    .player-chip-simple {
        background: ${({theme})=>theme.bgtotal}; border: 1px solid ${({theme})=>theme.bg4}; padding: 15px; border-radius: 12px;
        display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;
        img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; background: #eee; border: 2px solid ${({theme})=>theme.bgcards}; }
        .info-p { display: flex; flex-direction: column; gap: 2px; }
        .dorsal { font-weight: 900; color: ${v.colorPrincipal}; font-size: 1.1rem; }
        .name { font-size: 0.95rem; font-weight: 600; }
        .pos { font-size: 0.75rem; opacity: 0.7; background: ${({theme})=>theme.bgcards}; padding: 2px 8px; border-radius: 10px; margin-top: 4px; }
    }
    .empty-msg { text-align: center; width: 100%; opacity: 0.6; padding: 20px; font-style: italic; grid-column: 1 / -1; }

    .banner {
        height: 150px; width: calc(100% + 50px); margin: -25px -25px 0 -25px;
        background: ${({$color}) => `linear-gradient(135deg, ${$color}, ${$color}aa)`};
        display: flex; justify-content: center; padding-top: 35px; position: relative;
        &::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%); }
        .division-badge { background: rgba(0,0,0,0.3); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; z-index: 2; height: fit-content; }
    }
    .logo-wrapper {
        width: 140px; height: 140px; margin-top: -70px; z-index: 5; display: flex; justify-content: center;
        img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 10px rgba(0,0,0,0.4)); }
    }
    .team-title { margin: 15px 0 5px 0; text-align: center; color: ${({theme}) => theme.text}; font-size: 1.8rem; font-weight: 800; }
    .info-body { width: 100%; padding-top: 15px; display: flex; flex-direction: column; gap: 15px; }
`;

const InfoItem = styled.div`
    background: ${({theme}) => theme.bgtotal}; padding: 15px; border-radius: 12px; display: flex; align-items: center; gap: 15px; border: 1px solid ${({theme}) => theme.bg4};
    &.clickable { cursor: pointer; transition: all 0.2s ease; &:hover { border-color: ${v.colorPrincipal}; background: ${({theme}) => theme.bgcards}; .arrow-icon { transform: translateX(5px); color: ${v.colorPrincipal}; } } }
    &.tournament-active { border-color: #f39c12; background: rgba(243, 156, 18, 0.05); &:hover { background: rgba(243, 156, 18, 0.1); } }
    .arrow-icon { margin-left: auto; font-size: 1.1rem; opacity: 0.5; transition: transform 0.2s; }
    .label { font-size: 0.8rem; color: ${({theme}) => theme.text}; opacity: 0.6; display: block; }
    .value { margin: 0; font-size: 1rem; font-weight: 600; color: ${({theme}) => theme.text}; &.highlight { color: #f39c12; font-weight: 800; } }
`;

const IconBox = styled.div`
    width: 40px; height: 40px; background: ${({theme}) => theme.bgcards}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: ${({theme}) => theme.text}; box-shadow: ${({theme}) => theme.boxshadowGray};
    &.gold { background: linear-gradient(135deg, #f1c40f, #d35400); color: white; border: none; }
`;

const StatusPill = styled.span`
    display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 700;
    background: ${({$active}) => $active ? 'rgba(46, 213, 115, 0.15)' : 'rgba(231, 76, 60, 0.15)'}; color: ${({$active}) => $active ? '#2ecc71' : '#e74c3c'};
`;

/* --- ESTILOS DE LA VISTA DE ESTADÍSTICAS --- */
const StatsContent = styled.div` display: flex; flex-direction: column; gap: 25px; padding-bottom: 20px; `;
const SectionContainer = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const SectionLabel = styled.h4` margin: 0; color: ${({theme}) => theme.text}; opacity: 0.8; font-size: 0.9rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; border-left: 3px solid ${v.colorPrincipal}; padding-left: 10px; `;

const MatchesRow = styled.div`
    display: flex; gap: 12px; overflow-x: auto; padding: 5px 2px 15px 2px;
    &::-webkit-scrollbar { height: 6px; }
    &::-webkit-scrollbar-thumb { background: ${({theme}) => theme.bg4}; border-radius: 3px; }
`;

const MatchCard = styled.div`
    flex: 0 0 130px; background: ${({theme}) => theme.bgtotal}; border: 1px solid ${({theme}) => theme.bg4}; border-radius: 12px; padding: 12px;
    display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; transition: transform 0.2s;
    &:hover { transform: translateY(-3px); border-color: ${({theme})=>theme.text}; }

    .match-header { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
    .date { font-size: 0.6rem; opacity: 0.6; text-transform: uppercase; }
    .match-score { font-weight: 800; font-size: 1.4rem; color: ${({theme})=>theme.text}; display:flex; align-items: center; gap: 6px; line-height: 1; }
    .score-num { &.my-team { color: ${v.colorPrincipal}; } }
    .divider { opacity: 0.3; font-size: 1rem; }
    .rival-container { display: flex; flex-direction: column; align-items: center; gap: 4px; img { width: 30px; height: 30px; object-fit: contain; } span { font-size: 0.75rem; text-align: center; line-height: 1.1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
`;

const ResultBadge = styled.span`
    font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; color: white; font-weight: 700;
    background: ${props => props.$result === 'V' ? '#2ecc71' : props.$result === 'D' ? '#e74c3c' : '#95a5a6'};
`;

const EmptyBox = styled.div` background: ${({theme})=>theme.bgcards}; padding: 15px; border-radius: 8px; width: 100%; text-align: center; font-size: 0.85rem; opacity: 0.7; border: 1px dashed ${({theme})=>theme.bg4}; `;

/* --- TABLA CORREGIDA Y MEJORADA --- */
const TableWrapper = styled.div`
    border: 1px solid ${({theme}) => theme.bg4}; border-radius: 12px; overflow: hidden; background: ${({theme}) => theme.bgtotal};
`;

const StyledTable = styled.table`
    width: 100%; border-collapse: collapse; table-layout: fixed;
    
    th { 
        background: ${({theme}) => theme.bgcards}; color: ${({theme}) => theme.text}; 
        padding: 12px 10px; text-align: left; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; 
        border-bottom: 2px solid ${({theme}) => theme.bg4}; user-select: none;
        
        &.clickable { cursor: pointer; transition: background 0.2s; &:hover { background: ${({theme}) => theme.bg4}; } }
    }
    td { padding: 10px; border-bottom: 1px solid ${({theme}) => theme.bg4}; color: ${({theme}) => theme.text}; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    
    .col-player { width: auto; text-align: left; }
    .col-stat { width: 60px; text-align: center; display: table-cell; vertical-align: middle; }
    .bold { font-weight: 700; color: ${v.colorPrincipal}; font-size: 1rem; }
    .empty-cell { text-align: center; padding: 20px; opacity: 0.6; font-style: italic; }
`;

const PlayerCell = styled.div`
    display: flex; align-items: center; gap: 10px;
    .avatar-mini { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: ${({theme})=>theme.bg4}; display: flex; align-items: center; justify-content: center; img { width: 100%; height: 100%; object-fit: cover; } span { font-weight: 700; opacity: 0.5; } }
    .p-info { display: flex; flex-direction: column; line-height: 1.1; }
    .p-name { font-size: 0.9rem; font-weight: 600; }
    .p-dorsal { font-size: 0.7rem; opacity: 0.7; }
`;

const CardIcon = styled.div` width: 10px; height: 14px; background: ${props => props.color}; border-radius: 2px; display: inline-block; vertical-align: middle; box-shadow: 0 1px 2px rgba(0,0,0,0.2); `;
const PlayerSkeletonWrapper = styled.div`
  background: ${({theme})=>theme.bgtotal}; border: 1px solid ${({theme})=>theme.bg4}; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; height: 160px;
  .info-sk { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; }
`;