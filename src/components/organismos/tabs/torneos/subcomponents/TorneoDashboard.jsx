import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { 
    RiCalendarEventLine, RiTrophyLine, RiCloseCircleLine, 
    RiAddCircleLine, RiArrowLeftSLine, RiArrowRightSLine 
} from "react-icons/ri";
import { IoMdSettings, IoIosArrowDown, IoIosArrowUp, IoMdStopwatch } from "react-icons/io";
import { BtnNormal } from "../../../../../index";
import { TableRowSkeleton } from "../../../../../components/atomos/Skeleton";

// --- STYLES CORREGIDOS ---

const DashboardGrid = styled.div` 
    display: grid; 
    /* Desktop: Sidebar fijo + Contenido flexible restringido */
    grid-template-columns: 350px minmax(0, 1fr); 
    gap: 30px; 
    width: 100%; /* Asegura que no exceda el padre */
    
    @media (max-width: 900px) { 
        /* MOVIL FIX: minmax(0, 1fr) es CRUCIAL aquí para evitar desbordamiento horizontal */
        grid-template-columns: minmax(0, 1fr); 
        gap: 20px;
    } 
`;

const SummaryBox = styled.div` 
    background: ${({theme})=>theme.bg3}; 
    border-radius: 12px; 
    padding: 15px; 
    display: flex; 
    flex-direction: column; 
    gap: 12px; 
    border: 1px solid ${({theme})=>theme.bg4}; 
`;

const SectionTitle = styled.h4` 
    margin: 0 0 15px 0; 
    font-size: 0.95rem; 
    color: ${({theme})=>theme.text}; 
    opacity: 0.7; 
    text-transform: uppercase; 
    letter-spacing: 1px; 
`;

// --- SLIDER CONTAINER ---
const SliderContainer = styled.div`
    background: ${({theme})=>theme.bgtotal};
    border-radius: 10px;
    border: 1px solid ${({theme})=>theme.bg4};
    margin-bottom: 15px;
    overflow: hidden; /* Esto corta cualquier contenido que se salga */
    display: flex;
    flex-direction: column;
    position: relative;
    width: 100%; /* Asegura que respete el grid padre */
    transition: height 0.3s ease;
`;

const SliderTrack = styled.div`
    display: flex;
    width: 100%;
    transform: translateX(${({ $currentPage }) => $currentPage * -100}%);
    transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
`;

const SlidePage = styled.div`
    min-width: 100%; /* Ocupa exactamente el 100% del SliderContainer */
    display: grid;
    /* Lógica visual de columnas */
    grid-template-columns: ${({ $cols }) => $cols === 2 ? '1fr 1fr' : '1fr'};
    grid-auto-rows: min-content; 
    gap: 10px 15px; 
    padding: 15px;
    box-sizing: border-box;

    @media (max-width: 900px) {
        padding: 10px; /* Menos padding en móvil */
        gap: 10px;
    }
`;

// Paginador Minimalista
const PaginationMinimal = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    padding: 8px 15px;
    border-top: 1px solid ${({theme})=>theme.bg4};
    background: ${({theme})=>theme.bg2}; 
    user-select: none;
    
    span {
        font-size: 12px;
        font-weight: 600;
        opacity: 0.7;
        font-variant-numeric: tabular-nums; 
    }
`;

const MiniNavBtn = styled.button`
    background: ${({theme})=>theme.bg3};
    border: 1px solid ${({theme})=>theme.bg4};
    color: ${({theme})=>theme.text};
    width: 26px; 
    height: 26px;
    border-radius: 6px; 
    display: flex; 
    align-items: center; 
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
    
    &:disabled { opacity: 0.3; cursor: not-allowed; border-color: transparent; background: transparent; }
    &:hover:not(:disabled) { 
        background: ${({theme})=>theme.primary}; 
        color: white; 
        border-color: ${({theme})=>theme.primary}; 
    }
`;

const TeamItem = styled.div` 
    display: flex; align-items: center; gap: 10px; 
    padding: 0 12px; 
    border: 1px solid ${({theme})=>theme.bg4}; 
    background: ${({theme})=>theme.bgcards}; 
    border-radius: 8px; 
    height: 48px; 
    width: 100%; /* Asegura que no se desborde */
    box-sizing: border-box; 
    
    img { width: 30px; height: 30px; object-fit: contain; flex-shrink: 0; } 
    .number { 
        font-size: 12px; opacity: 0.5; width: 20px; text-align: center; font-weight: 700; flex-shrink: 0;
    } 
    .name { 
        flex: 1; font-weight: 600; font-size: 13px; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
        min-width: 0; /* Permite al texto cortarse correctamente en flexbox */
    } 
`;

const ActionButton = styled.button` 
    border: none; background: transparent; cursor: pointer; 
    font-size: 18px; color: ${({theme})=>theme.text}; opacity: 0.4; flex-shrink: 0;
    transition: 0.2s; 
    display: flex; align-items: center;
    &:hover{ opacity: 1; color: #e74c3c; transform: scale(1.1); }
`;

const ExcludedHeader = styled.div` background: ${({theme})=>theme.bg3}; padding: 12px 15px; cursor: pointer; display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; border-radius: 8px; border: 1px solid ${({theme})=>theme.bg4}; &:hover{background: ${({theme})=>theme.bg2};} `;
const ReasonBadge = styled.span` font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: ${({$color}) => `${$color}15`}; color: ${({$color}) => $color}; border: 1px solid ${({$color}) => `${$color}30`}; margin-right: 10px;`;
const TeamsListLegacy = styled.div` background: ${({theme})=>theme.bgtotal}; border-radius: 10px; padding: 10px; overflow-y: auto; border: 1px solid ${({theme})=>theme.bg4}; margin-bottom: 15px; max-height: 250px; &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background: ${v.bg4}; border-radius: 3px; } `;
const SummaryItem = ({icon, label, value}) => (
    <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
        <div style={{width:'42px', height:'42px', borderRadius:'10px', background: v.bg2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', color: v.primary}}>{icon}</div>
        <div style={{display:'flex', flexDirection:'column'}}>
            <span style={{fontSize:'10px', opacity:0.6, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px'}}>{label}</span>
            <span style={{fontSize:'14px', fontWeight:600}}>{value}</span>
        </div>
    </div>
);

export const TorneoDashboard = ({ 
    form, reglas, onEditConfig, 
    participatingTeams, excludedTeams, 
    onInclude, onExclude, isLoading, minPlayers 
}) => {
    const [showExcluded, setShowExcluded] = useState(false);
    
    // --- BREAKPOINT UNIFICADO: 900px ---
    const BREAKPOINT = 900;
    const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINT);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < BREAKPOINT);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- CONFIGURACIÓN DE PÁGINAS ---
    const [page, setPage] = useState(0);

    // MÓVIL: 1 Columna, 6 items (más compacto)
    // DESKTOP: 2 Columnas, 12 items (6 por columna)
    const ITEMS_PER_PAGE = isMobile ? 6 : 12;
    const columns = isMobile ? 1 : 2;

    const totalPages = Math.ceil(participatingTeams.length / ITEMS_PER_PAGE) || 1;
    const slides = [];
    for (let i = 0; i < totalPages; i++) {
        slides.push(participatingTeams.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE));
    }

    useEffect(() => setPage(0), [isMobile, participatingTeams.length]);

    const handlePrev = () => setPage(p => Math.max(0, p - 1));
    const handleNext = () => setPage(p => Math.min(totalPages - 1, p + 1));

    const getExclusionReason = (team) => {
        if (team.status === 'Suspendido') return { text: "Suspensión", color: "#e74c3c", canAdd: false };
        if (team.playerCount < minPlayers) return { text: "Faltan Jug.", color: "#f39c12", canAdd: false };
        return { text: "Gestor", color: "#3498db", canAdd: true };
    };

    return (
        <DashboardGrid>
            {/* Panel Resumen (Arriba en móvil, Izquierda en PC) */}
            <div className="summary-col">
                <SectionTitle>Configuración</SectionTitle>
                <SummaryBox>
                    <SummaryItem icon={<RiCalendarEventLine/>} label="Temporada" value={form.season || "---"} />
                    <SummaryItem icon={<RiTrophyLine/>} label="Formato" value={form.vueltas === "2" ? "Ida y Vuelta" : "Solo Ida"} />
                    <SummaryItem icon={<IoMdStopwatch/>} label="Reglas" value={`${reglas?.minutosPorTiempo || 45}' / ${reglas?.cambios || 'Libres'}`} />
                    <SummaryItem icon={<v.iconocorona/>} label="Liguilla" value={form.zonaLiguilla ? `Top ${form.clasificados || 4}` : 'No'} />
                </SummaryBox>
                <div style={{marginTop: 20}}>
                    <BtnNormal titulo="Configurar Reglas" width="100%" icono={<IoMdSettings />} funcion={onEditConfig} />
                </div>
            </div>

            {/* Gestión Equipos */}
            <div className="teams-col">
                <SectionTitle>Equipos ({participatingTeams.length}/{form.maxTeams})</SectionTitle> 
                
                {isLoading ? <TableRowSkeleton /> : (
                    <SliderContainer>
                        {participatingTeams.length === 0 ? (
                            <div style={{padding:'40px', textAlign:'center', opacity:0.5, fontSize: '0.9rem'}}>
                                No hay equipos inscritos aún.
                            </div>
                        ) : (
                            <>
                                <SliderTrack $currentPage={page}>
                                    {slides.map((slideTeams, pageIndex) => (
                                        <SlidePage key={pageIndex} $cols={columns}>
                                            {slideTeams.map((team, idx) => {
                                                const globalIndex = (pageIndex * ITEMS_PER_PAGE) + idx + 1;
                                                return (
                                                    <TeamItem key={team.id}>
                                                        <span className="number">{globalIndex}</span>
                                                        <img src={team.logo_url || "/logo_gen.png"} alt="logo" />
                                                        <span className="name" title={team.name}>{team.name}</span>
                                                        <ActionButton className="remove" onClick={() => onExclude(team.id)}>
                                                            <RiCloseCircleLine />
                                                        </ActionButton>
                                                    </TeamItem>
                                                );
                                            })}
                                        </SlidePage>
                                    ))}
                                </SliderTrack>

                                {totalPages > 1 && (
                                    <PaginationMinimal>
                                        <MiniNavBtn onClick={handlePrev} disabled={page === 0}>
                                            <RiArrowLeftSLine />
                                        </MiniNavBtn>
                                        <span>{page + 1} / {totalPages}</span>
                                        <MiniNavBtn onClick={handleNext} disabled={page === totalPages - 1}>
                                            <RiArrowRightSLine />
                                        </MiniNavBtn>
                                    </PaginationMinimal>
                                )}
                            </>
                        )}
                    </SliderContainer>
                )}
                
                {/* Sección Excluidos */}
                <div style={{overflow:'hidden'}}>
                    <ExcludedHeader onClick={() => setShowExcluded(!showExcluded)}>
                        <span>No Participantes ({excludedTeams.length})</span>
                        {showExcluded ? <IoIosArrowUp /> : <IoIosArrowDown />}
                    </ExcludedHeader>
                    {showExcluded && (
                        <TeamsListLegacy style={{marginTop:'10px'}}>
                             {excludedTeams.map(team => {
                                const reason = getExclusionReason(team);
                                return (
                                    <TeamItem key={team.id} style={{height:'auto', minHeight:'40px'}}>
                                        <img src={team.logo_url || v.iconofotovacia} alt="logo" />
                                        <span className="name" style={{opacity:0.8}}>{team.name}</span>
                                        <ReasonBadge $color={reason.color}>{reason.text}</ReasonBadge>
                                        {reason.canAdd && <ActionButton className="add" style={{opacity:1, color:'#2ecc71'}} onClick={() => onInclude(team.id)}><RiAddCircleLine /></ActionButton>}
                                    </TeamItem>
                                );
                            })}
                        </TeamsListLegacy>
                    )}
                </div>
            </div>
        </DashboardGrid>
    );
};