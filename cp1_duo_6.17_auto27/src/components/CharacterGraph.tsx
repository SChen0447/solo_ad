import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppContext } from '../App';
import type { Character, CharacterRelation, Faction, RelationType } from '../types';
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  Simulation,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3-force';

const FACTION_COLORS: Record<Faction, { bg: string; text: string; gradient: string }> = {
  protagonist: { bg: '#EF4444', text: '#fff', gradient: '#F97316' },
  antagonist: { bg: '#6366F1', text: '#fff', gradient: '#8B5CF6' },
  neutral: { bg: '#6B7280', text: '#fff', gradient: '#9CA3AF' },
};

const RELATION_COLORS: Record<RelationType, string> = {
  friendly: '#10B981',
  hostile: '#EF4444',
  romantic: '#EC4899',
  family: '#F59E0B',
};

const RELATION_LABELS: Record<RelationType, string> = {
  friendly: '友善',
  hostile: '敌对',
  romantic: '恋爱',
  family: '家族',
};

const FACTION_LABELS: Record<Faction, string> = {
  protagonist: '正面阵营',
  antagonist: '反派',
  neutral: '中立',
};

interface GraphNode extends SimulationNodeDatum {
  id: string;
  character: Character;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  relation: CharacterRelation;
  source: GraphNode | string;
  target: GraphNode | string;
}

function getInitials(name: string): string {
  if (name.length <= 2) return name;
  return name.slice(0, 2);
}

function CharacterGraph() {
  const { characters, relations } = useAppContext();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const [, forceUpdate] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  const { nodes: initialNodes, links: initialLinks } = useMemo(() => {
    const nodes: GraphNode[] = characters.map(char => ({
      id: char.id,
      character: char,
    }));

    const links: GraphLink[] = relations.map(rel => ({
      source: rel.characterAId,
      target: rel.characterBId,
      relation: rel,
    }));

    return { nodes, links };
  }, [characters, relations]);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    nodesRef.current = initialNodes.map(n => ({ ...n }));
    linksRef.current = initialLinks.map(l => ({ ...l }));

    const simulation = forceSimulation<GraphNode, GraphLink>(nodesRef.current)
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', forceCollide().radius(45))
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(linksRef.current)
          .id(d => d.id)
          .distance(d => 120 + (10 - (d as GraphLink).relation.frequency) * 10)
          .strength(d => 0.3 + ((d as GraphLink).relation.frequency / 10) * 0.4),
      )
      .alphaDecay(0.02)
      .on('tick', () => {
        forceUpdate(v => v + 1);
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [initialNodes.length, initialLinks.length, dimensions]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !draggingNode) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
        y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNode(nodeId);

    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node && simulationRef.current) {
      node.fx = node.x;
      node.fy = node.y;
      simulationRef.current.alpha(0.3).restart();
    }

    const handleMove = (moveEvent: MouseEvent) => {
      if (!node || !svgRef.current) return;
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const x = (moveEvent.clientX - rect.left - pan.x) / zoom;
      const y = (moveEvent.clientY - rect.top - pan.y) / zoom;
      node.fx = x;
      node.fy = y;
    };

    const handleUp = () => {
      if (node && !e.shiftKey) {
        node.fx = null;
        node.fy = null;
      }
      setDraggingNode(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleNodeDoubleClick = (character: Character) => {
    setSelectedCharacter(character);
  };

  const getLinkPath = (link: GraphLink): string => {
    const source = typeof link.source === 'object' ? link.source : null;
    const target = typeof link.target === 'object' ? link.target : null;
    if (!source || !target) return '';
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>角色关系图谱</h2>
          <span style={styles.subtitle}>{characters.length} 个角色 · {relations.length} 条关系</span>
        </div>
        <div style={styles.controls}>
          <button
            onClick={() => setZoom(z => Math.min(3, z * 1.2))}
            style={styles.zoomBtn}
          >
            +
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}
            style={styles.zoomBtn}
          >
            −
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
              if (simulationRef.current) {
                simulationRef.current.alpha(1).restart();
              }
            }}
            style={styles.resetBtn}
          >
            重置布局
          </button>
        </div>
      </div>

      <div style={styles.legend}>
        <div style={styles.legendSection}>
          <span style={styles.legendTitle}>阵营：</span>
          {Object.entries(FACTION_LABELS).map(([key, label]) => (
            <div key={key} style={styles.legendItem}>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${FACTION_COLORS[key as Faction].bg}, ${FACTION_COLORS[key as Faction].gradient})`,
                }}
              />
              <span style={styles.legendText}>{label}</span>
            </div>
          ))}
        </div>
        <div style={styles.legendSection}>
          <span style={styles.legendTitle}>关系：</span>
          {Object.entries(RELATION_LABELS).map(([key, label]) => (
            <div key={key} style={styles.legendItem}>
              <div
                style={{
                  width: '18px',
                  height: '3px',
                  backgroundColor: RELATION_COLORS[key as RelationType],
                  borderRadius: '2px',
                }}
              />
              <span style={styles.legendText}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        style={styles.graphWrapper}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            <g>
              {linksRef.current.map((link, i) => {
                const color = RELATION_COLORS[link.relation.type];
                const strokeWidth = 1 + link.relation.frequency * 0.4;
                return (
                  <path
                    key={`link-${i}`}
                    d={getLinkPath(link)}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    opacity={0.7}
                    style={{ transition: 'opacity 0.2s' }}
                  />
                );
              })}
            </g>

            <g>
              {nodesRef.current.map(node => {
                const faction = node.character.faction;
                const colors = FACTION_COLORS[faction];
                const isSelected = selectedCharacter?.id === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ cursor: 'pointer' }}
                    onMouseDown={e => handleNodeMouseDown(e, node.id)}
                    onDoubleClick={() => handleNodeDoubleClick(node.character)}
                  >
                    <defs>
                      <radialGradient id={`grad-${node.id}`} cx="30%" cy="30%">
                        <stop offset="0%" stopColor={colors.gradient} />
                        <stop offset="100%" stopColor={colors.bg} />
                      </radialGradient>
                    </defs>
                    <circle
                      r={isSelected ? 34 : 30}
                      fill={`url(#grad-${node.id})`}
                      stroke={isSelected ? '#FBBF24' : 'transparent'}
                      strokeWidth={isSelected ? 3 : 0}
                      style={{
                        filter: isSelected ? 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.6))' : 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))',
                        transition: 'all 0.2s ease',
                      }}
                    />
                    <text
                      y={5}
                      textAnchor="middle"
                      fill={colors.text}
                      fontSize="14"
                      fontWeight={600}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {getInitials(node.character.name)}
                    </text>
                    <text
                      y={52}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="11"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {node.character.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      </div>

      {selectedCharacter && (
        <div style={styles.characterPanel}>
          <div style={styles.panelHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${FACTION_COLORS[selectedCharacter.faction].gradient}, ${FACTION_COLORS[selectedCharacter.faction].bg})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 600,
                }}
              >
                {getInitials(selectedCharacter.name)}
              </div>
              <div>
                <h3 style={styles.panelTitle}>{selectedCharacter.name}</h3>
                <span style={styles.panelFaction}>{FACTION_LABELS[selectedCharacter.faction]}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedCharacter(null)}
              style={styles.closeBtn}
            >
              ✕
            </button>
          </div>
          <div style={styles.panelBody}>
            <p style={styles.panelDesc}>{selectedCharacter.description}</p>

            <h4 style={styles.panelSubtitle}>相关关系</h4>
            <div style={styles.relationList}>
              {relations
                .filter(r => r.characterAId === selectedCharacter.id || r.characterBId === selectedCharacter.id)
                .map(rel => {
                  const otherId = rel.characterAId === selectedCharacter.id ? rel.characterBId : rel.characterAId;
                  const other = characters.find(c => c.id === otherId);
                  if (!other) return null;
                  return (
                    <div key={rel.id} style={styles.relationItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: RELATION_COLORS[rel.type],
                          }}
                        />
                        <span style={styles.relationName}>{other.name}</span>
                      </div>
                      <span style={styles.relationType}>{RELATION_LABELS[rel.type]}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <div style={styles.hint}>
        💡 拖拽节点可调整位置，双击查看角色详情，滚轮缩放，按住 Shift 拖拽可固定节点
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #2D3A4F',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#F59E0B',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748B',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  zoomBtn: {
    width: '32px',
    height: '32px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '6px',
    color: '#CBD5E1',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  resetBtn: {
    padding: '0 14px',
    height: '32px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '6px',
    color: '#CBD5E1',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  legend: {
    display: 'flex',
    gap: '32px',
    padding: '12px 24px',
    backgroundColor: '#172033',
    borderBottom: '1px solid #2D3A4F',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  legendSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  legendTitle: {
    fontSize: '13px',
    color: '#64748B',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendText: {
    fontSize: '12px',
    color: '#94A3B8',
  },
  graphWrapper: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  characterPanel: {
    position: 'absolute',
    top: '120px',
    right: '24px',
    width: '300px',
    backgroundColor: '#172033',
    borderRadius: '12px',
    border: '1px solid #334155',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
    overflow: 'hidden',
    zIndex: 10,
    animation: 'slideIn 0.3s ease-out',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px',
    borderBottom: '1px solid #2D3A4F',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#F59E0B',
    margin: 0,
  },
  panelFaction: {
    fontSize: '12px',
    color: '#64748B',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px',
  },
  panelBody: {
    padding: '16px',
  },
  panelDesc: {
    fontSize: '13px',
    color: '#94A3B8',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  panelSubtitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#CBD5E1',
    margin: '0 0 10px 0',
  },
  relationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  relationItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    backgroundColor: '#1E293B',
    borderRadius: '6px',
  },
  relationName: {
    fontSize: '13px',
    color: '#CBD5E1',
  },
  relationType: {
    fontSize: '11px',
    color: '#64748B',
  },
  hint: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '12px',
    color: '#64748B',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: '8px 16px',
    borderRadius: '20px',
    pointerEvents: 'none',
  },
};

export default CharacterGraph;
