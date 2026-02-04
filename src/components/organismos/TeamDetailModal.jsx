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
    RiArrowLeftLine, RiTrophyLine, RiFootballLine, RiUserSmileLine,
    RiHashtag, RiFontSize, RiFocus2Line
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

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    // --- ORDENAMIENTO PLANTILLA (ICONIZADO) ---
    const POSITION_RANK = { 'Portero': 1, 'Defensa': 2, 'Medio': 3, 'Delantero': 4 };
    const { items: sortedPlayers, requestSort, sortConfig } = useSort(players, {
        key: 'dorsal', direction: 'ascending'
    });
    
    const sortOptions = [
        { label: "Dorsal", key: "dorsal", icon: <RiHashtag/> },
        { label: "Nombre", key: "first_name", icon: <RiFontSize/> },
        { label: "Posición", key: "position", icon: <RiFocus2Line/>, customOrder: POSITION_RANK }
    ];

    // --- ORDENAMIENTO ESTADÍSTICAS ---
    const { items: sortedStats, requestSort: requestStatSort, sortConfig: statSortConfig } = useSort(statsData?.playerStats || [], {
        key: 'goals', direction: 'descending'
    });

    // --- EFECTOS ---
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const handleShowStats = () => { setShowStats(true); };

    const SortIcon = ({ columnKey }) => {
        if (statSortConfig.key !== columnKey) return null; 
        return <SortIndicator>{statSortConfig.direction === 'ascending' ? '▲' : '▼'}</SortIndicator>;
    };

    if (!team) return null;

    let modalTitle = "Ficha del Equipo";
    if (showPlayerList) modalTitle = "Plantilla";
    if (showStats) modalTitle = "Estadísticas";

    const getModalWidth = () => {
        const isMobile = windowWidth < 768;
        return isMobile ? "100%" : (showPlayerList || showStats ? "850px" : "550px");
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            closeOnOverlayClick={true}
            width={getModalWidth()}
        >
            <DetailContainer $color={team.color}>
                
                {/* --- VISTA 1: PLANTILLA --- */}
                {showPlayerList ? (
                    <div className="internal-view">
                        <div className="header-list-actions">
                            <button className="back-link-styled" onClick={() => setShowPlayerList(false)}>
                                <RiArrowLeftLine /> <span>Volver</span>
                            </button>
                            {!loadingPlayers && players.length > 0 && (
                                <SortControl 
                                    options={sortOptions} 
                                    currentSort={sortConfig} 
                                    onSortChange={requestSort} 
                                />
                            )}
                        </div>
                        <ContainerScroll $maxHeight="70vh">
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
                                {players.length === 0 && !loadingPlayers && <p className="empty-msg">Sin jugadores.</p>}
                            </div>
                        </ContainerScroll>
                    </div>
                ) : showStats ? (
                    /* --- VISTA 2: ESTADÍSTICAS --- */
                    <div className="internal-view">
                        <div className="header-list-actions">
                            <button className="back-link-styled" onClick={() => setShowStats(false)}>
                                <RiArrowLeftLine /> <span>Volver</span>
                            </button>
                        </div>

                        <ContainerScroll $maxHeight="70vh">
                            <StatsContent>
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
                                            <EmptyBox>Sin resultados aún.</EmptyBox>
                                        )}
                                    </MatchesRow>
                                </SectionContainer>

                                <SectionContainer>
                                    <SectionLabel>Rendimiento Individual</SectionLabel>
                                    <TableWrapper>
                                        <StyledTable>
                                            <thead>
                                                <tr>
                                                    <th className="col-player clickable" onClick={() => requestStatSort('name')}>
                                                        <div className="th-content">Jugador <SortIcon columnKey="name"/></div>
                                                    </th>
                                                    <th className="col-stat clickable" onClick={() => requestStatSort('matches')}>
                                                         <div className="th-content centered"><RiUserSmileLine size={14}/></div>
                                                    </th>
                                                    <th className="col-stat clickable" onClick={() => requestStatSort('goals')}>
                                                        <div className="th-content centered"><RiFootballLine size={14}/></div>
                                                    </th>
                                                    <th className="col-stat clickable" onClick={() => requestStatSort('yellow')}>
                                                        <div className="th-content centered"><CardIcon color="#f1c40f"/></div>
                                                    </th>
                                                    <th className="col-stat clickable" onClick={() => requestStatSort('red')}>
                                                        <div className="th-content centered"><CardIcon color="#e74c3c"/></div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
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
                                                    <tr><td colSpan="5" className="empty-cell">Sin estadísticas</td></tr>
                                                )}
                                            </tbody>
                                        </StyledTable>
                                    </TableWrapper>
                                </SectionContainer>
                            </StatsContent>
                        </ContainerScroll>
                    </div>
                ) : (
                    /* --- VISTA 3: HOME --- */
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

                            {loadingStats ? (
                                <Skeleton width="100%" height="60px" />
                            ) : hasActiveTournament ? (
                                <InfoItem className="clickable tournament-active" onClick={handleShowStats}>
                                    <IconBox className="gold"><RiTrophyLine /></IconBox>
                                    <div style={{ flex: 1 }}>
                                        <span className="label">Torneo Actual</span>
                                        <p className="value highlight">Estadísticas</p>
                                    </div>
                                    <span className="arrow-icon">➔</span>
                                </InfoItem>
                            ) : (
                                <InfoItem>
                                    <IconBox><v.iconoemijivacio /></IconBox>
                                    <div>
                                        <span className="label">Estado</span>
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

// --- ESTILOS OPTIMIZADOS ---

const PlayerSkeleton = () => (
    <PlayerSkeletonWrapper>
        <Skeleton type="circle" width="60px" height="60px" />
        <div className="info-sk"><Skeleton width="70%" height="14px" /><Skeleton width="40%" height="10px" /></div>
    </PlayerSkeletonWrapper>
);

const slideInRight = keyframes` from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; }`;
const slideInLeft = keyframes` from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; }`;

const DetailContainer = styled.div`
    display: flex; flex-direction: column; align-items: center; position: relative; padding-bottom: 10px; width: 100%; overflow-x: hidden; 

    .internal-view { 
        width: 100%; 
        animation: ${slideInRight} 0.3s cubic-bezier(0.25, 1, 0.5, 1); 
        padding: 0 10px;
        @media (max-width: 768px) { padding: 0; }
    }
    .ficha-view { 
        width: 100%; display: flex; flex-direction: column; align-items: center; 
        animation: ${slideInLeft} 0.3s cubic-bezier(0.25, 1, 0.5, 1); 
    }

    /* CORRECCIÓN DE ESPACIADO EN CABECERA */
    .header-list-actions { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        margin-bottom: 15px; 
        gap: 15px; /* Espacio mínimo entre botón volver y controles */
        flex-wrap: wrap; /* Importante para que no se peguen en móviles */

        @media (max-width: 480px) { 
            margin-bottom: 10px; 
            padding: 0 8px;
            gap: 10px;
        }
    }

    .back-link-styled { 
        background: ${({theme}) => theme.bgtotal}; border: 1px solid ${({theme}) => theme.bg4}; color: ${({theme}) => theme.text}; 
        cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; padding: 8px 14px; border-radius: 20px; transition: 0.2s;
        font-size: 0.85rem;
        flex-shrink: 0; /* Evita que el botón se aplaste */
        &:hover { background: ${({theme}) => theme.bgcards}; border-color: ${v.colorPrincipal}; }
    }
    
    .players-grid-simple { 
        display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; 
        @media(max-width: 480px){ grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 0 8px; } 
    }
    .player-chip-simple {
        background: ${({theme})=>theme.bgtotal}; border: 1px solid ${({theme})=>theme.bg4}; padding: 10px; border-radius: 12px;
        display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
        img { width: 55px; height: 55px; border-radius: 50%; object-fit: cover; background: #eee; border: 2px solid ${({theme})=>theme.bgcards}; }
        .info-p { display: flex; flex-direction: column; gap: 1px; }
        .dorsal { font-weight: 900; color: ${v.colorPrincipal}; font-size: 1rem; }
        .name { font-size: 0.9rem; font-weight: 600; line-height: 1.1; }
        .pos { font-size: 0.7rem; opacity: 0.7; background: ${({theme})=>theme.bgcards}; padding: 2px 6px; border-radius: 8px; margin-top: 2px; }
    }
    .banner {
        height: 140px; width: calc(100% + 50px); margin: -25px -25px 0 -25px;
        background: ${({$color}) => `linear-gradient(135deg, ${$color}, ${$color}aa)`};
        display: flex; justify-content: center; padding-top: 35px; position: relative;
        &::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%); }
        .division-badge { background: rgba(0,0,0,0.3); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; z-index: 2; height: fit-content; }
    }
    .logo-wrapper {
        width: 130px; height: 130px; margin-top: -65px; z-index: 5; display: flex; justify-content: center;
        img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 10px rgba(0,0,0,0.4)); }
    }
    .team-title { margin: 10px 0 5px 0; text-align: center; color: ${({theme}) => theme.text}; font-size: 1.6rem; font-weight: 800; @media(max-width:480px){font-size: 1.4rem;} }
    .info-body { width: 100%; padding-top: 15px; display: flex; flex-direction: column; gap: 12px; }
`;

const InfoItem = styled.div`
    background: ${({theme}) => theme.bgtotal}; padding: 12px 15px; border-radius: 12px; display: flex; align-items: center; gap: 15px; border: 1px solid ${({theme}) => theme.bg4};
    &.clickable { cursor: pointer; transition: all 0.2s ease; &:hover { border-color: ${v.colorPrincipal}; background: ${({theme}) => theme.bgcards}; .arrow-icon { transform: translateX(5px); color: ${v.colorPrincipal}; } } }
    &.tournament-active { border-color: #f39c12; background: rgba(243, 156, 18, 0.05); &:hover { background: rgba(243, 156, 18, 0.1); } }
    .arrow-icon { margin-left: auto; font-size: 1.1rem; opacity: 0.5; transition: transform 0.2s; }
    .label { font-size: 0.75rem; color: ${({theme}) => theme.text}; opacity: 0.6; display: block; }
    .value { margin: 0; font-size: 0.95rem; font-weight: 600; color: ${({theme}) => theme.text}; &.highlight { color: #f39c12; font-weight: 800; } }
`;
const IconBox = styled.div`
    width: 38px; height: 38px; background: ${({theme}) => theme.bgcards}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: ${({theme}) => theme.text}; box-shadow: ${({theme}) => theme.boxshadowGray};
    &.gold { background: linear-gradient(135deg, #f1c40f, #d35400); color: white; border: none; }
`;
const StatusPill = styled.span`
    display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: 700;
    background: ${({$active}) => $active ? 'rgba(46, 213, 115, 0.15)' : 'rgba(231, 76, 60, 0.15)'}; color: ${({$active}) => $active ? '#2ecc71' : '#e74c3c'};
`;

const StatsContent = styled.div` display: flex; flex-direction: column; gap: 20px; padding-bottom: 15px; `;
const SectionContainer = styled.div` display: flex; flex-direction: column; gap: 8px; `;
const SectionLabel = styled.h4` margin: 0; color: ${({theme}) => theme.text}; opacity: 0.8; font-size: 0.85rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; border-left: 3px solid ${v.colorPrincipal}; padding-left: 8px; @media (max-width: 480px) { margin-left: 5px; } `;
const MatchesRow = styled.div`
    display: flex; gap: 10px; overflow-x: auto; padding: 2px 5px; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; }
`;
const MatchCard = styled.div`
    flex: 0 0 120px; background: ${({theme}) => theme.bgtotal}; border: 1px solid ${({theme}) => theme.bg4}; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; 
    .match-header { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
    .date { font-size: 0.6rem; opacity: 0.6; text-transform: uppercase; }
    .match-score { font-weight: 800; font-size: 1.3rem; color: ${({theme})=>theme.text}; display:flex; align-items: center; gap: 5px; line-height: 1; }
    .score-num { &.my-team { color: ${v.colorPrincipal}; } }
    .divider { opacity: 0.3; font-size: 0.9rem; }
    .rival-container { display: flex; flex-direction: column; align-items: center; gap: 2px; img { width: 28px; height: 28px; object-fit: contain; } span { font-size: 0.7rem; text-align: center; line-height: 1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
`;
const ResultBadge = styled.span`
    font-size: 0.55rem; padding: 2px 5px; border-radius: 4px; color: white; font-weight: 700;
    background: ${props => props.$result === 'V' ? '#2ecc71' : props.$result === 'D' ? '#e74c3c' : '#95a5a6'};
`;
const EmptyBox = styled.div` background: ${({theme})=>theme.bgcards}; padding: 15px; border-radius: 8px; width: 100%; text-align: center; font-size: 0.8rem; opacity: 0.7; border: 1px dashed ${({theme})=>theme.bg4}; margin: 0 5px; `;

const TableWrapper = styled.div`
    border: 1px solid ${({theme}) => theme.bg4}; border-radius: 10px; background: ${({theme}) => theme.bgtotal};
    width: 100%; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; }
    @media (max-width: 480px) { border-radius: 0; border-left: none; border-right: none; }
`;

const StyledTable = styled.table`
    width: 100%; border-collapse: collapse; table-layout: fixed;
    th { 
        background: ${({theme}) => theme.bgcards}; color: ${({theme}) => theme.text}; 
        padding: 10px 4px; text-align: left; font-size: 0.65rem; 
        font-weight: 700; text-transform: uppercase; border-bottom: 2px solid ${({theme}) => theme.bg4}; user-select: none; white-space: nowrap;
        &.clickable { cursor: pointer; transition: background 0.2s; &:hover { background: ${({theme}) => theme.bg4}; } }
        .th-content { display: flex; align-items: center; gap: 2px; &.centered { justify-content: center; } }
    }
    td { padding: 8px 4px; border-bottom: 1px solid ${({theme}) => theme.bg4}; color: ${({theme}) => theme.text}; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .col-player { width: auto; text-align: left; }
    .col-stat { width: 32px; text-align: center; display: table-cell; vertical-align: middle; font-size: 0.85rem; }
    .bold { font-weight: 700; color: ${v.colorPrincipal}; font-size: 0.9rem; }
    .empty-cell { text-align: center; padding: 15px; opacity: 0.6; font-style: italic; font-size: 0.8rem; }
`;

const SortIndicator = styled.span` color: ${v.colorPrincipal}; margin-left: 1px; font-size: 0.8em; `;

const PlayerCell = styled.div`
    display: flex; align-items: center; gap: 6px;
    .avatar-mini { 
        width: 24px; height: 24px; border-radius: 50%; overflow: hidden; background: ${({theme})=>theme.bg4}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        img { width: 100%; height: 100%; object-fit: cover; } span { font-weight: 700; opacity: 0.5; font-size: 0.7rem; } 
    }
    .p-info { display: flex; flex-direction: column; line-height: 1; overflow: hidden; max-width: 100%; }
    .p-name { font-size: 0.8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .p-dorsal { font-size: 0.6rem; opacity: 0.7; }
`;

const CardIcon = styled.div` width: 8px; height: 11px; background: ${props => props.color}; border-radius: 2px; display: inline-block; vertical-align: middle; box-shadow: 0 1px 2px rgba(0,0,0,0.2); `;
const PlayerSkeletonWrapper = styled.div`
  background: ${({theme})=>theme.bgtotal}; border: 1px solid ${({theme})=>theme.bg4}; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 150px;
  .info-sk { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 5px; }
`;