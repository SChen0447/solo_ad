import React, { useRef, useEffect, useCallback, useState } from 'react';
import { DialogueNode, NodeConnection, ConnectionPoint } from '../types/DialogueNode';

interface NodeGraphProps {
  nodes: DialogueNode[];
  connections: NodeConnection[];
  selectedNodeId: string | null;
  invalidNodeIds: Set<string>;
  invalidInfo?: Map<string, { type: string; message: string; targetNodeId?: string }[]>;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onCanvasDoubleClick: (x: number, y: number) => void;
  onConnectionBendAdd: (fromNodeId: string, toNodeId: string, optionIndex: number, point: ConnectionPoint) => void;
  onConnectionBendMove: (fromNodeId: string, toNodeId: string, optionIndex: number, bendIndex: number, point: ConnectionPoint) => void;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;
const GRID_SIZE = 20;

interface DragState {
  nodeId: string;
  startMouseX: number;
  startMouseY: number;
  startNodeX: number;
  startNodeY: number;
}

interface BendDragState {
  fromId: string;
  toId: string;
  optIndex: number;
  bendIndex: number;
  startMouseX: number;
  startMouseY: number;
  startPointX: number;
  startPointY: number;
}

export const NodeGraph: React.FC<NodeGraphProps> = ({
  nodes,
  connections,
  selectedNodeId,
  invalidNodeIds,
  invalidInfo,
  onNodeSelect,
  onNodeMove,
  onCanvasDoubleClick,
  onConnectionBendAdd,
  onConnectionBendMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [bendDragState, setBendDragState] = useState<BendDragState | null>(null);
  const [throttled, setThrottled] = useState(false);
  const [showTooltip, setShowTooltip] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  const getNodeTop = useCallback((node: DialogueNode) => ({
    x: node.x + NODE_WIDTH / 2,
    y: node.y,
  }), []);

  const getNodeBottom = useCallback((node: DialogueNode) => ({
    x: node.x + NODE_WIDTH / 2,
    y: node.y + NODE_HEIGHT,
  }), []);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDragState({
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: node.x,
      startNodeY: node.y,
    });
    onNodeSelect(nodeId);
  }, [nodes, onNodeSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || throttled) return;

    setThrottled(true);
    requestAnimationFrame(() => {
      setThrottled(false);
      const rect = containerRef.current!.getBoundingClientRect();

      if (dragState) {
        const dx = e.clientX - dragState.startMouseX;
        const dy = e.clientY - dragState.startMouseY;

        let newX = dragState.startNodeX + dx;
        let newY = dragState.startNodeY + dy;

        newX = Math.max(0, Math.min(newX, rect.width - NODE_WIDTH));
        newY = Math.max(0, Math.min(newY, rect.height - NODE_HEIGHT));

        const snappedX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        onNodeMove(dragState.nodeId, snappedX, snappedY);
      }

      if (bendDragState) {
        const dx = e.clientX - bendDragState.startMouseX;
        const dy = e.clientY - bendDragState.startMouseY;

        onConnectionBendMove(
          bendDragState.fromId,
          bendDragState.toId,
          bendDragState.optIndex,
          bendDragState.bendIndex,
          {
            x: bendDragState.startPointX + dx,
            y: bendDragState.startPointY + dy,
          }
        );
      }
    });
  }, [dragState, bendDragState, throttled, onNodeMove, onConnectionBendMove]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setBendDragState(null);
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const snappedX = Math.round((x - NODE_WIDTH / 2) / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round((y - NODE_HEIGHT / 2) / GRID_SIZE) * GRID_SIZE;

    onCanvasDoubleClick(
      Math.max(0, snappedX),
      Math.max(0, snappedY)
    );
  }, [onCanvasDoubleClick]);

  const handleConnectionClick = useCallback((e: React.MouseEvent, fromId: string, toId: string, optIndex: number) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onConnectionBendAdd(fromId, toId, optIndex, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [onConnectionBendAdd]);

  const handleBendMouseDown = useCallback((e: React.MouseEvent, fromId: string, toId: string, optIndex: number, bendIndex: number, point: ConnectionPoint) => {
    e.stopPropagation();
    setBendDragState({
      fromId,
      toId,
      optIndex,
      bendIndex,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPointX: point.x,
      startPointY: point.y,
    });
  }, []);

  const handleInvalidIconEnter = useCallback((e: React.MouseEvent, nodeId: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setShowTooltip({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.bottom - containerRect.top + 4,
        nodeId,
      });
    }
  }, []);

  const handleInvalidIconLeave = useCallback(() => {
    setShowTooltip(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const renderConnectionPath = (conn: NodeConnection, fromNode: DialogueNode, toNode: DialogueNode): string => {
    const start = getNodeBottom(fromNode);
    const end = getNodeTop(toNode);

    const points: ConnectionPoint[] = [start, ...conn.bendPoints, end];

    if (points.length === 2) {
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX2 = (curr.x + next.x) / 2;
      const midY2 = (curr.y + next.y) / 2;
      path += ` Q ${curr.x} ${curr.y} ${midX2} ${midY2}`;
    }
    path += ` L ${end.x} ${end.y}`;
    return path;
  };

  const renderArrowHead = (toNode: DialogueNode) => {
    const end = getNodeTop(toNode);
    const arrowSize = 10;
    const arrowY = end.y + arrowSize;

    return `M ${end.x} ${end.y} L ${end.x - arrowSize / 2} ${arrowY} L ${end.x + arrowSize / 2} ${arrowY} Z`;
  };

  const getInvalidMessages = (nodeId: string): string[] => {
    if (!invalidInfo) return [];
    const info = invalidInfo.get(nodeId);
    return info ? info.map(i => i.message) : [];
  };

  return (
    <div
      ref={containerRef}
      className="node-graph-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: dragState ? 'grabbing' : 'default',
      }}
      onMouseDown={handleCanvasMouseDown}
      onDoubleClick={handleCanvasDoubleClick}
    >
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {connections.map((conn) => {
          const fromNode = nodes.find(n => n.id === conn.fromNodeId);
          const toNode = nodes.find(n => n.id === conn.toNodeId);
          if (!fromNode || !toNode) return null;

          const pathD = renderConnectionPath(conn, fromNode, toNode);
          const arrowD = renderArrowHead(toNode);
          const connectionKey = `${conn.fromNodeId}-${conn.toNodeId}-${conn.optionIndex}`;

          return (
            <g key={connectionKey}>
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth="12"
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onClick={(e) => handleConnectionClick(e, conn.fromNodeId, conn.toNodeId, conn.optionIndex)}
              />
              <path
                d={pathD}
                fill="none"
                stroke="#888"
                strokeWidth="2"
                style={{ pointerEvents: 'none' }}
              />
              <path
                d={arrowD}
                fill="#888"
                style={{ pointerEvents: 'none' }}
              />
              {conn.bendPoints.map((point, index) => (
                <circle
                  key={`bend-${connectionKey}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill="#00e5ff"
                  stroke="#fff"
                  strokeWidth="1"
                  style={{ pointerEvents: 'all', cursor: 'move' }}
                  onMouseDown={(e) => handleBendMouseDown(e, conn.fromNodeId, conn.toNodeId, conn.optionIndex, index, point)}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {nodes.map((node) => {
        const isSelected = node.id === selectedNodeId;
        const isInvalid = invalidNodeIds.has(node.id);
        const displayText = node.text.length > 20 ? node.text.substring(0, 17) + '...' : node.text;
        const invalidMessages = getInvalidMessages(node.id);

        return (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y,
              width: NODE_WIDTH,
              height: NODE_HEIGHT,
              backgroundColor: '#3a3a3a',
              border: isSelected ? '2px solid #00e5ff' : '1px solid #5a5a5a',
              borderRadius: '4px',
              padding: '8px',
              boxSizing: 'border-box',
              cursor: dragState?.nodeId === node.id ? 'grabbing' : 'grab',
              boxShadow: isSelected ? '0 0 6px #00e5ff' : 'none',
              overflow: 'hidden',
              userSelect: 'none',
              zIndex: isSelected ? 2 : 1,
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
          >
            {isInvalid && (
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '6px',
                  color: '#ff4444',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  cursor: 'help',
                  zIndex: 3,
                  textShadow: '0 0 4px rgba(255, 0, 0, 0.5)',
                }}
                onMouseEnter={(e) => handleInvalidIconEnter(e, node.id)}
                onMouseLeave={handleInvalidIconLeave}
              >
                !
              </div>
            )}
            <div
              style={{
                color: '#00e5ff',
                fontSize: '11px',
                fontFamily: 'monospace',
                marginBottom: '4px',
                paddingRight: isInvalid ? '16px' : '0',
              }}
            >
              ID: {node.id}
            </div>
            <div
              style={{
                color: '#f0c040',
                fontSize: '12px',
                fontWeight: 'bold',
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {node.speaker || 'Unknown'}
            </div>
            <div
              style={{
                color: '#ccc',
                fontSize: '11px',
                lineHeight: '1.3',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayText}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: '4px',
                right: '6px',
                color: '#666',
                fontSize: '10px',
              }}
            >
              [{node.options.length}]
            </div>
          </div>
        );
      })}

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            left: showTooltip.x,
            top: showTooltip.y,
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#ff6666',
            padding: '8px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 100,
            pointerEvents: 'none',
            border: '1px solid #ff4444',
          }}
        >
          {getInvalidMessages(showTooltip.nodeId).map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
};
