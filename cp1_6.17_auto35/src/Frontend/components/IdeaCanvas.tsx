import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3-force';
import { IdeaCard, Connection, DragState, GroupData } from '../types';

interface IdeaCanvasProps {
  cards: IdeaCard[];
  connections: Connection[];
  groups: GroupData[];
  onAddCard: (text: string, centerX: number, centerY: number) => void;
  onRemoveCard: (cardId: string) => void;
  onToggleStar: (cardId: string) => void;
  onUpdateCardPosition: (cardId: string, x: number, y: number) => void;
  onUpdateAllPositions: (positions: Record<string, { x: number; y: number }>) => void;
  onAddConnection: (sourceId: string, targetId: string) => void;
  onClusterByTags: () => void;
  onClusterBySimilarity: () => void;
  onResetLayout: () => void;
  isClustering: boolean;
  getGroupColor: (groupId: number | undefined) => string;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  groupId?: number;
}

const CARD_WIDTH = 200;
const CARD_HEIGHT = 120;

export const IdeaCanvas: React.FC<IdeaCanvasProps> = ({
  cards,
  connections,
  groups,
  onAddCard,
  onRemoveCard,
  onToggleStar,
  onUpdateCardPosition,
  onUpdateAllPositions,
  onAddConnection,
  onClusterByTags,
  onClusterBySimilarity,
  onResetLayout,
  isClustering,
  getGroupColor
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const [inputText, setInputText] = useState('');
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sourceId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const hasGroups = groups.length > 0;

  useEffect(() => {
    if (cards.length === 0) {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      return;
    }

    const nodes: SimNode[] = cards.map(card => ({
      id: card.id,
      x: card.x,
      y: card.y,
      groupId: card.groupId,
      vx: 0,
      vy: 0
    }));

    nodesRef.current = nodes;

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const linkData = connections.map(conn => ({
      source: nodeMap.get(conn.sourceId)!,
      target: nodeMap.get(conn.targetId)!
    }));

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .alphaDecay(0.02)
      .velocityDecay(0.4)
      .force('charge', d3.forceManyBody<SimNode>().strength(-800))
      .force('center', d3.forceCenter<SimNode>(centerX, centerY).strength(0.05))
      .force('collision', d3.forceCollide<SimNode>().radius(80).iterations(2));

    if (linkData.length > 0) {
      simulation.force('link', d3.forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(linkData)
        .id((d: any) => d.id)
        .distance(200)
        .strength(0.6));
    }

    if (hasGroups) {
      const groupCenters: Record<number, { x: number; y: number }> = {};
      const groupNodes: Record<number, SimNode[]> = {};

      nodes.forEach(node => {
        const gid = node.groupId ?? -1;
        if (!groupNodes[gid]) groupNodes[gid] = [];
        groupNodes[gid].push(node);
      });

      Object.keys(groupNodes).forEach((key, idx) => {
        const gid = parseInt(key, 10);
        const angle = (idx / Object.keys(groupNodes).length) * Math.PI * 2;
        const radius = 250;
        groupCenters[gid] = {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        };
      });

      const groupForce = {
        initialize: function() {},
        force: function(alpha: number) {
          for (const node of nodes) {
            const gid = node.groupId ?? -1;
            const center = groupCenters[gid];
            if (center) {
              node.vx! += (center.x - node.x!) * alpha * 0.15;
              node.vy! += (center.y - node.y!) * alpha * 0.15;
            }
          }
        }
      };
      simulation.force('group', groupForce as any);

      const groupRepelForce = {
        initialize: function() {},
        force: function(alpha: number) {
          const groupList = Object.keys(groupNodes).map(k => parseInt(k, 10));
          for (let i = 0; i < groupList.length; i++) {
            for (let j = i + 1; j < groupList.length; j++) {
              const g1 = groupList[i];
              const g2 = groupList[j];
              const c1 = groupCenters[g1];
              const c2 = groupCenters[g2];
              const dx = c2.x - c1.x;
              const dy = c2.y - c1.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const minDist = 400;
              if (dist < minDist) {
                const force = (minDist - dist) * alpha * 0.02;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                groupNodes[g1].forEach(n => {
                  n.vx! -= fx;
                  n.vy! -= fy;
                });
                groupNodes[g2].forEach(n => {
                  n.vx! += fx;
                  n.vy! += fy;
                });
              }
            }
          }
        }
      };
      simulation.force('groupRepel', groupRepelForce as any);
    }

    simulation.on('tick', () => {
      const positions: Record<string, { x: number; y: number }> = {};
      nodes.forEach(node => {
        positions[node.id] = {
          x: Math.max(CARD_WIDTH / 2, Math.min(dimensions.width - CARD_WIDTH / 2, node.x!)),
          y: Math.max(CARD_HEIGHT / 2 + 60, Math.min(dimensions.height - CARD_HEIGHT / 2, node.y!))
        };
      });
      onUpdateAllPositions(positions);
    });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [cards.length, connections.length, hasGroups, dimensions, groups.length]);

  useEffect(() => {
    if (!simulationRef.current || cards.length === 0) return;

    const positions = new Map(cards.map(c => [c.id, { x: c.x, y: c.y }]));

    simulationRef.current.nodes().forEach(node => {
      const pos = positions.get(node.id);
      if (pos) {
        node.x = pos.x;
        node.y = pos.y;
      }
      node.groupId = cards.find(c => c.id === node.id)?.groupId;
    });

    simulationRef.current.alpha(0.3).restart();
  }, [cards.map(c => `${c.id}-${c.groupId}`).join(',')]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && inputText.length <= 140) {
      onAddCard(inputText, dimensions.width / 2, dimensions.height / 2);
      setInputText('');
    }
  };

  const handleConnectionStart = (e: React.MouseEvent, cardId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setDragState({
      isDragging: true,
      sourceId: cardId,
      startX: card.x,
      startY: card.y,
      currentX: e.clientX - rect.left,
      currentY: e.clientY - rect.top
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragState(prev => ({
      ...prev,
      currentX: e.clientX - rect.left,
      currentY: e.clientY - rect.top
    }));
  }, [dragState.isDragging]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.sourceId) {
      setDragState({
        isDragging: false,
        sourceId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      });
      return;
    }

    const target = e.target as HTMLElement;
    const cardElement = target.closest('[data-card-id]');

    if (cardElement) {
      const targetId = cardElement.getAttribute('data-card-id');
      if (targetId && targetId !== dragState.sourceId) {
        onAddConnection(dragState.sourceId, targetId);
      }
    }

    setDragState({
      isDragging: false,
      sourceId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    });
  }, [dragState, onAddConnection]);

  const handleCardDragStart = (e: React.MouseEvent, cardId: string) => {
    if (e.button !== 0) return;
    if (dragState.isDragging) return;

    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = e.clientX - rect.left - card.x;
    const offsetY = e.clientY - rect.top - card.y;

    setDraggedCardId(cardId);

    const handleMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - rect.left - offsetX;
      const newY = moveEvent.clientY - rect.top - offsetY;

      const clampedX = Math.max(CARD_WIDTH / 2, Math.min(dimensions.width - CARD_WIDTH / 2, newX));
      const clampedY = Math.max(CARD_HEIGHT / 2 + 60, Math.min(dimensions.height - CARD_HEIGHT / 2, newY));

      onUpdateCardPosition(cardId, clampedX, clampedY);

      if (simulationRef.current) {
        const node = simulationRef.current.nodes().find(n => n.id === cardId);
        if (node) {
          node.x = clampedX;
          node.y = clampedY;
          node.vx = 0;
          node.vy = 0;
        }
        simulationRef.current.alpha(0.1).restart();
      }
    };

    const handleUp = () => {
      setDraggedCardId(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const renderConnections = () => {
    return connections.map(conn => {
      const source = cards.find(c => c.id === conn.sourceId);
      const target = cards.find(c => c.id === conn.targetId);
      if (!source || !target) return null;

      return (
        <g key={conn.id}>
          <line
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke="rgba(100,200,255,0.4)"
            strokeWidth="2"
            style={{
              filter: 'drop-shadow(0 0 4px rgba(100,200,255,0.8))',
              pointerEvents: 'none'
            }}
          />
          <circle cx={source.x} cy={source.y} r="5" fill="rgba(100,200,255,0.8)" />
          <circle cx={target.x} cy={target.y} r="5" fill="rgba(100,200,255,0.8)" />
        </g>
      );
    });
  };

  const renderGroupLabels = () => {
    if (!hasGroups) return null;

    const groupPositions: Record<number, { x: number; y: number; count: number }> = {};

    cards.forEach(card => {
      const gid = card.groupId;
      if (gid === undefined) return;
      if (!groupPositions[gid]) {
        groupPositions[gid] = { x: 0, y: 0, count: 0 };
      }
      groupPositions[gid].x += card.x;
      groupPositions[gid].y += card.y;
      groupPositions[gid].count += 1;
    });

    return groups.map(group => {
      const pos = groupPositions[group.groupId];
      if (!pos || pos.count === 0) return null;

      const centerX = pos.x / pos.count;
      const centerY = pos.y / pos.count - 80;

      return (
        <g key={group.groupId}>
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            fill={group.color}
            fontSize="16"
            fontWeight="bold"
            style={{
              textShadow: `0 0 10px ${group.color}`,
              pointerEvents: 'none'
            }}
          >
            {group.groupName}
          </text>
        </g>
      );
    });
  };

  const renderDragLine = () => {
    if (!dragState.isDragging || !dragState.sourceId) return null;

    const source = cards.find(c => c.id === dragState.sourceId);
    if (!source) return null;

    return (
      <line
        x1={source.x}
        y1={source.y}
        x2={dragState.currentX}
        y2={dragState.currentY}
        stroke="#64b5f6"
        strokeWidth="2"
        strokeDasharray="8,4"
        style={{
          filter: 'drop-shadow(0 0 4px rgba(100,200,255,0.8))',
          pointerEvents: 'none'
        }}
      />
    );
  };

  return (
    <div
      ref={canvasRef}
      className="idea-canvas"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="canvas-header">
        <form onSubmit={handleSubmit} className="input-form">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="输入你的想法（最多140字）..."
            maxLength={140}
            className="idea-input"
            rows={2}
          />
          <div className="input-actions">
            <span className="char-count">{inputText.length}/140</span>
            <button type="submit" className="add-btn" disabled={!inputText.trim()}>
              添加想法
            </button>
          </div>
        </form>

        <div className="cluster-buttons">
          <button
            onClick={onClusterByTags}
            className="cluster-btn"
            disabled={cards.length < 2 || isClustering}
          >
            按标签聚类
          </button>
          <button
            onClick={onClusterBySimilarity}
            className="cluster-btn"
            disabled={cards.length < 2 || isClustering}
          >
            按相似度聚类
          </button>
          <button
            onClick={onResetLayout}
            className="cluster-btn secondary"
            disabled={isClustering}
          >
            重置布局
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="connections-svg"
        width={dimensions.width}
        height={dimensions.height}
      >
        {renderConnections()}
        {renderGroupLabels()}
        {renderDragLine()}
      </svg>

      <div className="cards-container">
        {cards.map((card, index) => {
          const groupColor = getGroupColor(card.groupId);
          const isNew = Date.now() - card.createdAt < 500;
          const isHovered = hoveredCardId === card.id;
          const isDragged = draggedCardId === card.id;

          return (
            <div
              key={card.id}
              data-card-id={card.id}
              className={`idea-card ${isNew ? 'fade-in' : ''} ${isDragged ? 'dragging' : ''}`}
              style={{
                left: card.x - CARD_WIDTH / 2,
                top: card.y - CARD_HEIGHT / 2,
                backgroundColor: card.color,
                borderColor: card.groupId !== undefined ? groupColor : 'transparent',
                zIndex: card.starred ? 100 : (isHovered ? 50 : index)
              }}
              onMouseEnter={() => setHoveredCardId(card.id)}
              onMouseLeave={() => setHoveredCardId(null)}
              onMouseDown={(e) => handleCardDragStart(e, card.id)}
            >
              <button
                className={`star-btn ${card.starred ? 'starred' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(card.id);
                }}
                title={card.starred ? '取消置顶' : '置顶'}
              >
                ★
              </button>

              <div className="card-text">{card.text}</div>

              <div className="card-connector"
                onMouseDown={(e) => handleConnectionStart(e, card.id)}
                title="拖拽到其他卡片创建关联"
              >
                🔗
              </div>

              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveCard(card.id);
                }}
                title="删除"
              >
                ×
              </button>

              {card.starred && (
                <div className="star-indicator" />
              )}
            </div>
          );
        })}
      </div>

      {isClustering && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>正在进行聚类分析...</span>
        </div>
      )}

      {cards.length === 0 && (
        <div className="empty-state">
          <p>在上方输入框中添加你的第一个想法吧！</p>
          <p className="hint">💡 拖拽卡片右下角的 🔗 图标可以与其他卡片创建关联</p>
        </div>
      )}
    </div>
  );
};
