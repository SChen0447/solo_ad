import { useMemo } from 'react';
import { getStarById } from '@/modules/starData';
import type { StarLayerData } from '@/modules/starPhysics';
import { useStore } from '@/store';

function formatNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'G';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  if (n < 0.01 && n > 0) return n.toExponential(1);
  return n.toFixed(1);
}

export default function ComparePanel() {
  const selectedStars = useStore((s) => s.selectedStars);
  const sortBy = useStore((s) => s.sortBy);
  const sortOrder = useStore((s) => s.sortOrder);
  const setSortBy = useStore((s) => s.setSortBy);
  const highlightedLayer = useStore((s) => s.highlightedLayer);
  const highlightedStarId = useStore((s) => s.highlightedStarId);
  const comparePanelOpen = useStore((s) => s.comparePanelOpen);

  const starsData = useMemo(
    () => selectedStars.map((id) => getStarById(id)).filter(Boolean) as NonNullable<ReturnType<typeof getStarById>>[],
    [selectedStars]
  );

  const layerNames = ['核心', '辐射层', '对流层', '光球层'];

  const sortedLayers = useMemo(() => {
    const rows: { starId: string; starName: string; layer: StarLayerData }[] = [];
    for (const star of starsData) {
      for (const layer of star.layers) {
        rows.push({ starId: star.id, starName: star.name, layer });
      }
    }
    if (sortBy) {
      rows.sort((a, b) => {
        const va = sortBy === 'temperature' ? a.layer.temperature : a.layer.density;
        const vb = sortBy === 'temperature' ? b.layer.temperature : b.layer.density;
        return sortOrder === 'asc' ? va - vb : vb - va;
      });
    }
    return rows;
  }, [starsData, sortBy, sortOrder]);

  if (!comparePanelOpen || starsData.length === 0) return null;

  const sortIndicator = (field: 'temperature' | 'density') => {
    if (sortBy !== field) return ' ↕';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div style={{
      background: 'rgba(20, 20, 40, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '8px',
      border: '1px solid rgba(0, 212, 255, 0.15)',
      padding: '14px',
      height: '100%',
      overflowY: 'auto',
    }}>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '10px',
        fontWeight: 600,
        color: '#00d4ff',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        marginBottom: '12px',
      }}>
        参数对比
      </div>

      <table style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: '0 2px',
        fontSize: '11px',
        fontFamily: "'Source Sans 3', sans-serif",
      }}>
        <thead>
          <tr>
            <th style={{
              textAlign: 'left',
              padding: '6px 8px',
              color: '#8899bb',
              fontWeight: 600,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}>
              恒星 / 层
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '6px 8px',
                color: sortBy === 'temperature' ? '#ffaa44' : '#8899bb',
                fontWeight: 600,
                fontSize: '10px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                transition: 'color 0.3s ease',
              }}
              onClick={() => setSortBy('temperature')}
            >
              温度(K){sortIndicator('temperature')}
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '6px 8px',
                color: sortBy === 'density' ? '#88ddff' : '#8899bb',
                fontWeight: 600,
                fontSize: '10px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                transition: 'color 0.3s ease',
              }}
              onClick={() => setSortBy('density')}
            >
              密度(g/cm³){sortIndicator('density')}
            </th>
            <th style={{
              textAlign: 'right',
              padding: '6px 8px',
              color: '#8899bb',
              fontWeight: 600,
              fontSize: '10px',
              borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}>
              主要成分
            </th>
          </tr>
        </thead>
        <tbody>
          {sortBy ? sortedLayers.map((row) => {
            const isHighlighted = row.starId === highlightedStarId && row.layer.name === highlightedLayer;
            return (
              <tr
                key={`${row.starId}-${row.layer.name}`}
                style={{
                  background: isHighlighted ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                  transition: 'background 0.2s ease',
                }}
              >
                <td style={{
                  padding: '5px 8px',
                  color: isHighlighted ? '#e0d0ff' : '#aabbcc',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}>
                  <span style={{
                    color: row.layer.color,
                    fontSize: '9px',
                    marginRight: '4px',
                  }}>●</span>
                  {row.starName} · {row.layer.name}
                </td>
                <td style={{
                  padding: '5px 8px',
                  textAlign: 'right',
                  color: '#ffaa44',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}>
                  {formatNum(row.layer.temperature)}
                </td>
                <td style={{
                  padding: '5px 8px',
                  textAlign: 'right',
                  color: '#88ddff',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}>
                  {formatNum(row.layer.density)}
                </td>
                <td style={{
                  padding: '5px 8px',
                  textAlign: 'right',
                  color: '#ccccff',
                  fontSize: '10px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}>
                  {row.layer.composition.slice(0, 2).map((c) => `${c.element} ${c.percentage}%`).join(' ')}
                </td>
              </tr>
            );
          }) : starsData.map((star) => (
            layerNames.map((layerName, li) => {
              const layer = star.layers[li];
              const isHighlighted = star.id === highlightedStarId && layer.name === highlightedLayer;
              return (
                <tr
                  key={`${star.id}-${layer.name}`}
                  style={{
                    background: isHighlighted ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <td style={{
                    padding: '5px 8px',
                    color: isHighlighted ? '#e0d0ff' : '#aabbcc',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    <span style={{
                      color: layer.color,
                      fontSize: '9px',
                      marginRight: '4px',
                    }}>●</span>
                    {li === 0 && (
                      <span style={{
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: '10px',
                        color: '#00d4ff',
                        marginRight: '6px',
                      }}>
                        {star.name}
                      </span>
                    )}
                    {layer.name}
                  </td>
                  <td style={{
                    padding: '5px 8px',
                    textAlign: 'right',
                    color: '#ffaa44',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    {formatNum(layer.temperature)}
                  </td>
                  <td style={{
                    padding: '5px 8px',
                    textAlign: 'right',
                    color: '#88ddff',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    {formatNum(layer.density)}
                  </td>
                  <td style={{
                    padding: '5px 8px',
                    textAlign: 'right',
                    color: '#ccccff',
                    fontSize: '10px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    {layer.composition.slice(0, 2).map((c) => `${c.element} ${c.percentage}%`).join(' ')}
                  </td>
                </tr>
              );
            })
          ))}
        </tbody>
      </table>
    </div>
  );
}
