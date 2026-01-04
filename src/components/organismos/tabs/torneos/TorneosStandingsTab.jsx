import React, { useMemo } from 'react';
import styled from 'styled-components';
import { v } from '../../../../styles/variables';
import { Device } from '../../../../styles/breakpoints'; //
import { ContentContainer } from '../../../atomos/ContentContainer';

// --- STYLED COMPONENTS RESPONSIVE ---

const TableCard = styled.div`
  background-color: ${({ theme }) => theme.bg};
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  margin-bottom: 30px;
  border: 1px solid ${({ theme }) => theme.bg3 || '#eee'};
  
  /* CLAVE: Esto evita que la tabla rompa el layout de la página/tabs */
  width: 100%;
  max-width: 100%; 
  overflow: hidden; 
`;

const TableScrollWrapper = styled.div`
  width: 100%;
  overflow-x: auto; /* Habilita el scroll horizontal interno */
  -webkit-overflow-scrolling: touch;
  
  /* Ajuste para que el scrollbar no se solape */
  padding-bottom: 5px; 
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.bg3 || '#ccc'};
    border-radius: 4px;
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  
  /* Eliminamos el min-width forzado exagerado para que se adapte mejor */
  /* Solo forzamos ancho si realmente hay muchas columnas visibles */
`;

const Th = styled.th`
  background-color: ${({ theme }) => theme.bg2 || '#f8f9fa'};
  color: ${({ theme }) => theme.textSoft || '#555'};
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.85rem;
  padding: 15px 10px;
  text-align: center;
  border-bottom: 2px solid ${({ theme }) => theme.bg3 || '#eee'};
  white-space: nowrap;

  /* Sticky primera columna (Equipo) */
  &:first-child {
    text-align: left;
    padding-left: 16px;
    position: sticky;
    left: 0;
    z-index: 10;
    background-color: ${({ theme }) => theme.bg2 || '#f8f9fa'};
    border-right: 1px solid rgba(0,0,0,0.05);
  }

  /* Sticky última columna (PTS) */
  &:last-child {
      position: sticky;
      right: 0;
      z-index: 10;
      background-color: ${({ theme }) => theme.bg2 || '#f8f9fa'};
      border-left: 1px solid rgba(0,0,0,0.05);
  }
`;

const Td = styled.td`
  padding: 16px 10px;
  text-align: center;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
  border-bottom: 1px solid ${({ theme }) => theme.bg3 || '#f0f0f0'};
  white-space: nowrap;

  /* Sticky primera columna */
  &:first-child {
    text-align: left;
    padding-left: 16px;
    font-weight: 600;
    position: sticky;
    left: 0;
    background-color: ${({ theme }) => theme.bg};
    z-index: 5;
    border-right: 1px solid rgba(0,0,0,0.05);
    max-width: 160px; /* Limitamos ancho en móvil */
    overflow: hidden;
    text-overflow: ellipsis;
    
    @media ${Device.tablet} {
        max-width: 250px; /* Más espacio en tablet/desktop */
    }
  }
  
  /* Sticky última columna (PTS) */
  &:last-child {
      font-weight: 800;
      color: ${({ theme }) => theme.primary || '#007bff'};
      position: sticky;
      right: 0;
      background-color: ${({ theme }) => theme.bg};
      z-index: 5;
      border-left: 1px solid rgba(0,0,0,0.05);
  }
`;

// Celdas que se OCULTAN en móvil (< Tablet)
const HideMobile = styled.th`
  display: none;
  /* Se muestran solo a partir de Tablet (768px) */
  @media ${Device.tablet} {
    display: table-cell;
  }
  
  /* Heredamos estilos base de Th/Td para no repetir código */
  background-color: ${({ as, theme }) => as === 'td' ? 'transparent' : (theme.bg2 || '#f8f9fa')};
  border-bottom: ${({ as, theme }) => as === 'td' ? `1px solid ${theme.bg3}` : `2px solid ${theme.bg3}`};
  padding: 15px 10px;
  text-align: center;
  color: ${({ as, theme }) => as === 'td' ? theme.text : (theme.textSoft || '#555')};
  font-weight: ${({ as }) => as === 'td' ? '400' : '700'};
  font-size: ${({ as }) => as === 'td' ? '1rem' : '0.85rem'};
`;

// Helper para celdas TD que se ocultan (usamos 'as="td"' en el componente HideMobile)
const TdHidden = (props) => <HideMobile as="td" {...props} />;


const TeamNameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  
  .position-number {
    color: ${({ theme }) => theme.textSoft || '#888'};
    font-size: 0.9rem;
    min-width: 20px;
  }

  img {
    width: 30px;
    height: 30px;
    object-fit: contain;
  }

  .team-name-text {
    font-size: 0.95rem;
    white-space: normal;
    line-height: 1.2;
    
    @media ${Device.tablet} {
        font-size: 1.1rem;
    }
  }
`;

const EmptyStateContainer = styled.div`
    padding: 40px 20px;
    text-align: center;
    color: ${({ theme }) => theme.text};
    opacity: 0.7;
`;

// --- COMPONENTE PRINCIPAL ---
export const TorneosStandingsTab = ({ 
  torneo, 
  equipos = [], 
  estadisticas = [] 
}) => {

  const tablaGeneral = useMemo(() => {
    if (!equipos) return [];

    const dataProcesada = equipos.map((equipo) => {
      const stats = estadisticas.find(s => s.equipo_id === equipo.id) || {};
      return {
        id: equipo.id,
        nombre: equipo.name || equipo.nombre || "Equipo", // Soporte para ambos nombres de campo
        logo: equipo.logo_url || equipo.img, 
        pj: stats.pj || 0,
        g: stats.g || 0,
        e: stats.e || 0,
        p: stats.p || 0,
        gf: stats.gf || 0,
        gc: stats.gc || 0,
        dg: stats.dg || 0,
        pts: stats.pts || 0,
      };
    });

    return dataProcesada.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      return b.gf - a.gf;
    });

  }, [equipos, estadisticas]);

  return (
    <ContentContainer>
      <TableCard>
        <TableScrollWrapper>
          <StyledTable>
            <thead>
              <tr>
                <Th>Equipo</Th>
                <Th title="Partidos Jugados">PJ</Th>
                
                {/* Estadísticas Básicas (Visibles siempre) */}
                <Th title="Ganados">G</Th>
                <Th title="Empatados">E</Th>
                <Th title="Perdidos">P</Th>

                {/* Estadísticas Detalladas (Ocultas en Móvil) */}
                <HideMobile title="Goles a Favor">GF</HideMobile>
                <HideMobile title="Goles en Contra">GC</HideMobile>
                <HideMobile title="Diferencia de Goles">DG</HideMobile>

                <Th title="Puntos">PTS</Th>
              </tr>
            </thead>
            <tbody>
              {tablaGeneral.length > 0 ? (
                tablaGeneral.map((fila, index) => (
                  <tr key={fila.id}>
                    <Td>
                      <TeamNameCell>
                        <span className="position-number">{index + 1}</span>
                        {fila.logo ? (
                            <img src={fila.logo} alt={fila.nombre} onError={(e) => e.target.style.display='none'}/> 
                        ) : (
                             <div style={{width:30, height:30, background: '#eee', borderRadius: '50%'}}></div>
                        )}
                        <span className="team-name-text">{fila.nombre}</span>
                      </TeamNameCell>
                    </Td>
                    
                    <Td>{fila.pj}</Td>
                    <Td>{fila.g}</Td>
                    <Td>{fila.e}</Td>
                    <Td>{fila.p}</Td>

                    {/* Celdas ocultas en móvil */}
                    <TdHidden>{fila.gf}</TdHidden>
                    <TdHidden>{fila.gc}</TdHidden>
                    <TdHidden style={{ 
                        color: fila.dg > 0 ? v.verde : fila.dg < 0 ? v.rojo : 'inherit',
                        fontWeight: fila.dg !== 0 ? '600' : '400'
                    }}>
                        {fila.dg > 0 ? `+${fila.dg}` : fila.dg}
                    </TdHidden>

                    <Td>{fila.pts}</Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ padding: 0 }}>
                    <EmptyStateContainer>
                      Sin equipos registrados.
                    </EmptyStateContainer>
                  </td>
                </tr>
              )}
            </tbody>
          </StyledTable>
        </TableScrollWrapper>
      </TableCard>
    </ContentContainer>
  );
};