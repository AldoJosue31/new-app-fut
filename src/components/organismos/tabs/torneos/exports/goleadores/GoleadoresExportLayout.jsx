import React, { forwardRef, useMemo, useState } from 'react';
import { RiUser3Line } from 'react-icons/ri';
import { DynamicTeamLogo } from '../../../../equipos/DynamicTeamLogo';

const CHART_COLORS = [
  '#10b981',
  '#38bdf8',
  '#f59e0b',
  '#f97316',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
  '#64748b',
];

const ExportPlayerAvatar = ({ src, alt, size = 40 }) => {
  const [hasError, setHasError] = useState(false);
  const hasImage = Boolean(src) && !hasError;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        background: hasImage ? '#e2e8f0' : 'rgba(16, 185, 129, 0.12)',
        color: '#10b981',
      }}
    >
      {hasImage ? (
        <img
          src={src}
          alt={alt}
          crossOrigin="anonymous"
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <RiUser3Line size={size * 0.52} />
      )}
    </div>
  );
};

const buildDisplayRows = (goleadores = []) =>
  goleadores.map((jugador, index) => ({
    ...jugador,
    rank: index + 1,
    color: CHART_COLORS[index % CHART_COLORS.length],
    name: [jugador?.first_name, jugador?.last_name].filter(Boolean).join(' ').trim() || 'Jugador',
  }));

const buildPieRows = (rows = []) => {
  const baseRows = rows.slice(0, 6);
  const extraRows = rows.slice(6);
  const extraGoals = extraRows.reduce((acc, row) => acc + Number(row?.goals ?? 0), 0);

  if (extraGoals > 0) {
    baseRows.push({
      rank: 999,
      player_id: 'otros',
      name: 'Otros',
      team_name: 'Resto de goleadores',
      goals: extraGoals,
      color: '#64748b',
    });
  }

  return baseRows;
};

const buildDonutSegments = (rows, radius) => {
  const total = rows.reduce((acc, row) => acc + Number(row?.goals ?? 0), 0);
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return rows.map((row) => {
    const value = Number(row?.goals ?? 0);
    const segmentLength = total > 0 ? (value / total) * circumference : 0;
    const segment = {
      ...row,
      total,
      percentage: total > 0 ? (value / total) * 100 : 0,
      strokeDasharray: `${segmentLength} ${circumference - segmentLength}`,
      strokeDashoffset: -accumulated,
      circumference,
    };

    accumulated += segmentLength;
    return segment;
  });
};

const SummaryStat = ({ label, value, accent, isDark }) => (
  <div
    style={{
      padding: '12px 14px',
      borderRadius: '14px',
      background: isDark ? '#171717' : '#f8fafc',
      border: `1px solid ${isDark ? '#2a2a2a' : '#e2e8f0'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: '140px',
      flex: 1,
    }}
  >
    <span
      style={{
        fontSize: '11px',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: isDark ? '#94a3b8' : '#64748b',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: '20px',
        fontWeight: '900',
        color: accent,
      }}
    >
      {value}
    </span>
  </div>
);

const renderTableView = ({ rows, colors, isMobile }) => (
  <div
    style={{
      backgroundColor: colors.card,
      borderRadius: '14px',
      border: `1px solid ${colors.border}`,
      overflow: 'hidden',
    }}
  >
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: colors.headerBg }}>
          <th style={{ padding: '12px', textAlign: 'center', width: '48px', color: colors.subtext }}>#</th>
          <th style={{ padding: '12px', textAlign: 'left', color: colors.subtext }}>Jugador</th>
          {!isMobile && <th style={{ padding: '12px', textAlign: 'left', color: colors.subtext }}>Equipo</th>}
          <th
            style={{
              padding: '12px',
              textAlign: 'center',
              color: colors.primary,
              width: isMobile ? '74px' : '88px',
            }}
          >
            Goles
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((jugador) => (
          <tr key={`${jugador?.player_id ?? 'jugador'}-${jugador.rank}`}>
            <td
              style={{
                textAlign: 'center',
                fontWeight: '800',
                fontSize: '16px',
                padding: '12px 8px',
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              {jugador.rank}
            </td>
            <td
              style={{
                padding: '11px 12px',
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ExportPlayerAvatar
                  src={jugador?.photo_url}
                  alt={jugador?.name}
                  size={isMobile ? 34 : 38}
                />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: '700', fontSize: isMobile ? '13px' : '14px', lineHeight: 1.2 }}>
                    {jugador?.name}
                  </span>
                  <span style={{ fontSize: '11px', color: colors.subtext, marginTop: '4px' }}>
                    {jugador?.dorsal ? `#${jugador.dorsal}` : 'Sin dorsal'}
                    {isMobile ? ` - ${jugador?.team_name || 'Sin equipo'}` : ''}
                  </span>
                </div>
              </div>
            </td>
            {!isMobile && (
              <td
                style={{
                  padding: '11px 12px',
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {jugador?.team_logo ? (
                    <img
                      src={jugador.team_logo}
                      alt={jugador?.team_name || 'Equipo'}
                      crossOrigin="anonymous"
                      style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }}
                    />
                  ) : (
                    <DynamicTeamLogo
                      name={jugador?.team_name}
                      color={jugador?.team_color}
                      size="22px"
                    />
                  )}
                  <span style={{ fontSize: '13px' }}>{jugador?.team_name || 'Sin equipo'}</span>
                </div>
              </td>
            )}
            <td
              style={{
                textAlign: 'center',
                fontWeight: '900',
                fontSize: isMobile ? '18px' : '20px',
                color: jugador?.color || colors.primary,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              {jugador?.goals ?? 0}
            </td>
          </tr>
        ))}

        {rows.length === 0 && (
          <tr>
            <td
              colSpan={isMobile ? 3 : 4}
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                color: colors.subtext,
                fontWeight: '600',
              }}
            >
              No hay goleadores para la jornada seleccionada.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const renderBarsView = ({ rows, colors, isMobile }) => {
  const maxGoals = Math.max(...rows.map((row) => Number(row?.goals ?? 0)), 1);

  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: '16px',
        border: `1px solid ${colors.border}`,
        padding: isMobile ? '14px' : '18px',
        display: 'grid',
        gap: '10px',
      }}
    >
      {rows.map((row) => {
        const widthPercent = (Number(row?.goals ?? 0) / maxGoals) * 100;

        return (
          <div
            key={`${row?.player_id ?? 'jugador'}-${row.rank}`}
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '220px 1fr 56px',
              gap: '10px',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: '14px',
              background: isMobile
                ? colors.headerBg
                : `linear-gradient(90deg, ${colors.headerBg} 0%, transparent 100%)`,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '10px',
                  background: `${row.color}20`,
                  color: row.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                {row.rank}
              </div>
              <ExportPlayerAvatar src={row?.photo_url} alt={row?.name} size={34} />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: '800',
                    fontSize: '14px',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {row.name}
                </span>
                <span style={{ fontSize: '11px', color: colors.subtext }}>
                  {row?.team_name || 'Sin equipo'}
                </span>
              </div>
            </div>

            <div
              style={{
                height: '18px',
                borderRadius: '999px',
                background: isMobile ? `${row.color}1c` : colors.headerBg,
                overflow: 'hidden',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  width: `${Math.max(widthPercent, 8)}%`,
                  height: '100%',
                  borderRadius: '999px',
                  background: `linear-gradient(90deg, ${row.color} 0%, ${row.color}cc 100%)`,
                  boxShadow: `0 8px 20px -10px ${row.color}`,
                }}
              />
            </div>

            <div
              style={{
                justifySelf: isMobile ? 'end' : 'stretch',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '52px',
                padding: '8px 10px',
                borderRadius: '999px',
                background: `${row.color}18`,
                color: row.color,
                fontWeight: '900',
                fontSize: '14px',
              }}
            >
              {row.goals}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const renderPieView = ({ rows, colors, isMobile }) => {
  const pieRows = buildPieRows(rows);
  const donutSegments = buildDonutSegments(pieRows, 92);
  const totalGoals = pieRows.reduce((acc, row) => acc + Number(row?.goals ?? 0), 0);

  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: '16px',
        border: `1px solid ${colors.border}`,
        padding: isMobile ? '16px' : '20px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '320px 1fr',
        gap: isMobile ? '18px' : '22px',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: isMobile ? '250px' : '280px',
            height: isMobile ? '250px' : '280px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 240 240" width="100%" height="100%">
            <circle cx="120" cy="120" r="92" fill="none" stroke={colors.headerBg} strokeWidth="34" />
            <g transform="rotate(-90 120 120)">
              {donutSegments.map((segment) => (
                <circle
                  key={`${segment?.player_id ?? 'segment'}-${segment.name}`}
                  cx="120"
                  cy="120"
                  r="92"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="34"
                  strokeLinecap="butt"
                  strokeDasharray={segment.strokeDasharray}
                  strokeDashoffset={segment.strokeDashoffset}
                />
              ))}
            </g>
          </svg>

          <div
            style={{
              position: 'absolute',
              width: '128px',
              height: '128px',
              borderRadius: '50%',
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '10px',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: colors.subtext,
              }}
            >
              Total
            </span>
            <span style={{ fontSize: '30px', fontWeight: '900', color: colors.primary }}>
              {totalGoals}
            </span>
            <span style={{ fontSize: '12px', color: colors.subtext }}>goles</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {donutSegments.map((segment) => (
          <div
            key={`${segment?.player_id ?? 'legend'}-${segment.name}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '16px 1fr auto auto',
              gap: '10px',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: '14px',
              background: colors.headerBg,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: segment.color,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: '800',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {segment.name}
              </div>
              <div style={{ fontSize: '11px', color: colors.subtext }}>
                {segment.team_name || 'Participacion acumulada'}
              </div>
            </div>
            <div
              style={{
                fontWeight: '900',
                fontSize: '14px',
                color: segment.color,
              }}
            >
              {segment.goals}
            </div>
            <div
              style={{
                fontWeight: '800',
                fontSize: '12px',
                color: colors.subtext,
              }}
            >
              {segment.percentage.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const GoleadoresExportLayout = forwardRef(
  (
    {
      goleadores = [],
      torneo = {},
      metaInfo = {},
      themeMode = 'light',
      layoutMode = 'desktop',
      visualizationMode = 'table',
    },
    ref
  ) => {
    const isDark = themeMode === 'dark';
    const isMobile = layoutMode === 'mobile';
    const rows = useMemo(() => buildDisplayRows(goleadores), [goleadores]);

    const colors = {
      bg: isDark ? '#121212' : '#ffffff',
      card: isDark ? '#1a1a1a' : '#ffffff',
      text: isDark ? '#f8fafc' : '#0f172a',
      subtext: isDark ? '#94a3b8' : '#64748b',
      border: isDark ? '#2e3440' : '#e2e8f0',
      headerBg: isDark ? '#10151c' : '#f8fafc',
      primary: '#10b981',
    };

    const subtitleParts = [
      torneo?.name || 'Torneo',
      metaInfo?.lastJornada || 'Sin iniciar',
    ].filter(Boolean);

    const totalGoals = rows.reduce((acc, row) => acc + Number(row?.goals ?? 0), 0);
    const topScorer = rows[0];
    const renderers = {
      table: renderTableView,
      bars: renderBarsView,
      pie: renderPieView,
    };
    const renderContent = renderers[visualizationMode] || renderTableView;

    return (
      <div
        ref={ref}
        style={{
          width: isMobile ? '480px' : '900px',
          backgroundColor: colors.bg,
          fontFamily: 'Arial, sans-serif',
          color: colors.text,
          padding: isMobile ? '16px' : '24px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            paddingBottom: '16px',
            borderBottom: `2px solid ${colors.border}`,
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: '800',
                backgroundColor: `${colors.primary}20`,
                color: colors.primary,
                padding: '4px 12px',
                borderRadius: '20px',
                textTransform: 'uppercase',
              }}
            >
              {metaInfo?.league || 'Liga Oficial'}
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '800',
                backgroundColor: isDark ? '#1f2937' : '#e2e8f0',
                color: colors.text,
                padding: '4px 12px',
                borderRadius: '20px',
                textTransform: 'uppercase',
              }}
            >
              {metaInfo?.division || 'Division Unica'}
            </span>

          </div>

          <h1
            style={{
              fontSize: isMobile ? '22px' : '28px',
              fontWeight: '900',
              margin: '0 0 8px 0',
            }}
          >
            TABLA DE GOLEADORES
          </h1>
          <p
            style={{
              fontSize: isMobile ? '13px' : '14px',
              color: colors.subtext,
              margin: 0,
              fontWeight: '600',
            }}
          >
            {subtitleParts.join(' - ')}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          <SummaryStat
            label="Jugadores"
            value={rows.length}
            accent={colors.primary}
            isDark={isDark}
          />
          <SummaryStat
            label="Goles Totales"
            value={totalGoals}
            accent={isDark ? '#38bdf8' : '#0284c7'}
            isDark={isDark}
          />
          <SummaryStat
            label="Lider"
            value={topScorer ? `${topScorer.name.split(' ')[0]} (${topScorer.goals})` : 'Sin datos'}
            accent={isDark ? '#f59e0b' : '#d97706'}
            isDark={isDark}
          />
        </div>

        {renderContent({ rows, colors, isMobile })}
      </div>
    );
  }
);

export default GoleadoresExportLayout;
