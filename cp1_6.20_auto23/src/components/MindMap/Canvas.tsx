import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  MindMapData,
  MindMapNode,
  UserCursor,
  OperationNotification,
} from '@typeDefs/index';
import { getNodeSize } from '@utils/mindmap';
import './Canvas.css';

interface CanvasProps {
  data: MindMapData;
  selectedNodeId: string | null;
  cursors: UserCursor[];
  notifications: OperationNotification[];
  onSelectNode: (nodeId: string | null) => void;
  onAddNode: (parentId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, newParentId: string) => void;
  onCursorMove: (x: number, y: number) => void;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startTransformX: number;
  startTransformY: number;
}

interface NodeDragState {
  isDragging: boolean;
  nodeId: string;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
}

const Canvas = ({
  data,
  selectedNodeId,
  cursors,
  notifications,
  onSelectNode,
  onAddNode,
  onDeleteNode,
  onMoveNode,
  onCursorMove,
}: CanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<ViewTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startTransformX: 0,
    startTransformY: 0,
  });
  const [nodeDragState, setNodeDragState] = useState<NodeDragState | null>(
    null
  );
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const nodesArray = useMemo(() => Object.values(data.nodes), [data.nodes]);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      const x = (screenX - rect.left - transform.x) / transform.scale;
      const y = (screenY - rect.top - transform.y) / transform.scale;
      return { x, y };
    },
    [transform]
  );

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;

    setTransform((prev) => {
      const container = containerRef.current;
      if (!container) return prev;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scale = Math.min(Math.max(prev.scale * delta, 0.2), 3);
      const actualDelta = scale / prev.scale;

      const x = mouseX - (mouseX - prev.x) * actualDelta;
      const y = mouseY - (mouseY - prev.y) * actualDelta;

      return { x, y, scale };
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (e.target !== svgRef.current && !(e.target as HTMLElement).classList.contains('canvas-bg')) {
        return;
      }

      setDragState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startTransformX: transform.x,
        startTransformY: transform.y,
      });
      onSelectNode(null);
      setContextMenu(null);
    },
    [transform, onSelectNode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      onCursorMove(worldPos.x, worldPos.y);

      if (dragState.isDragging) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        setTransform((prev) => ({
          ...prev,
          x: dragState.startTransformX + dx,
          y: dragState.startTransformY + dy,
        }));
        return;
      }

      if (nodeDragState && nodeDragState.isDragging) {
        setNodeDragState((prev) =>
          prev
            ? {
                ...prev,
                currentX: worldPos.x,
                currentY: worldPos.y,
              }
            : null
        );

        let foundTarget: string | null = null;
        for (const node of nodesArray) {
          if (node.id === nodeDragState.nodeId) continue;
          const nodeSize = getNodeSize(node.level);
          const nodeLeft = node.x - nodeSize.width / 2;
          const nodeRight = node.x + nodeSize.width / 2;
          const nodeTop = node.y - nodeSize.height / 2;
          const nodeBottom = node.y + nodeSize.height / 2;

          if (
            worldPos.x >= nodeLeft &&
            worldPos.x <= nodeRight &&
            worldPos.y >= nodeTop &&
            worldPos.y <= nodeBottom
          ) {
            foundTarget = node.id;
            break;
          }
        }
        setDropTargetId(foundTarget);
      }
    },
    [dragState, nodeDragState, screenToWorld, onCursorMove, nodesArray]
  );

  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      setDragState((prev) => ({ ...prev, isDragging: false }));
    }

    if (nodeDragState && nodeDragState.isDragging && dropTargetId) {
      onMoveNode(nodeDragState.nodeId, dropTargetId);
    }

    setNodeDragState(null);
    setDropTargetId(null);
  }, [dragState, nodeDragState, dropTargetId, onMoveNode]);

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      onSelectNode(nodeId);
    },
    [onSelectNode]
  );

  const handleNodeDoubleClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      onSelectNode(nodeId);
    },
    [onSelectNode]
  );

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, node: MindMapNode) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const worldPos = screenToWorld(e.clientX, e.clientY);
      setNodeDragState({
        isDragging: true,
        nodeId: node.id,
        offsetX: worldPos.x - node.x,
        offsetY: worldPos.y - node.y,
        currentX: node.x,
        currentY: node.y,
      });
    },
    [screenToWorld]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setContextMenu({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        nodeId,
      });
    },
    []
  );

  const handleAddButtonClick = useCallback(
    (e: React.MouseEvent, parentId: string) => {
      e.stopPropagation();
      onAddNode(parentId);
    },
    [onAddNode]
  );

  const handleDeleteNode = useCallback(() => {
    if (contextMenu) {
      onDeleteNode(contextMenu.nodeId);
      setContextMenu(null);
    }
  }, [contextMenu, onDeleteNode]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { clientWidth, clientHeight } = container;
    setTransform({
      x: clientWidth / 2,
      y: clientHeight / 2,
      scale: 1,
    });
  }, []);

  const renderConnections = () => {
    const connections: JSX.Element[] = [];

    Object.values(data.nodes).forEach((node) => {
      if (!node.parentId) return;
      const parent = data.nodes[node.parentId];
      if (!parent) return;

      const parentSize = getNodeSize(parent.level);
      const childSize = getNodeSize(node.level);

      const startX = parent.x + parentSize.width / 2;
      const startY = parent.y;
      const endX = node.x - childSize.width / 2;
      const endY = node.y;

      const midX = (startX + endX) / 2;

      const pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

      connections.push(
        <path
          key={`connection-${node.id}`}
          d={pathD}
          stroke={node.color}
          strokeWidth="2"
          fill="none"
          opacity="0.6"
        />
      );
    });

    return connections;
  };

  const renderNodes = () => {
    return nodesArray.map((node) => {
      const nodeSize = getNodeSize(node.level);
      const isSelected = selectedNodeId === node.id;
      const isHovered = hoveredNodeId === node.id;
      const isDropTarget = dropTargetId === node.id;
      const isDragging = nodeDragState?.nodeId === node.id;

      const displayX = isDragging && nodeDragState ? nodeDragState.currentX : node.x;
      const displayY = isDragging && nodeDragState ? nodeDragState.currentY : node.y;

      const nodeNotification = notifications.find((n) => n.nodeId === node.id);

      return (
        <g key={node.id}>
          <foreignObject
            x={displayX - nodeSize.width / 2}
            y={displayY - nodeSize.height / 2}
            width={nodeSize.width}
            height={nodeSize.height}
          >
            <div
              className={`mindmap-node ${isSelected ? 'selected' : ''} ${
                isHovered ? 'hovered' : ''
              } ${isDropTarget ? 'drop-target' : ''} ${isDragging ? 'dragging' : ''}`}
              style={{
                width: '100%',
                height: '100%',
                borderColor: node.color,
                backgroundColor: isSelected ? `${node.color}15` : '#ffffff',
                fontSize: Math.max(12, 14 - node.level),
              }}
              onClick={(e) => handleNodeClick(e, node.id)}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onContextMenu={(e) => handleContextMenu(e, node.id)}
            >
              <span className="node-text">{node.text}</span>
            </div>
          </foreignObject>

          {isHovered && !isDragging && (
            <g
              className="add-button-group"
              onClick={(e) => handleAddButtonClick(e, node.id)}
            >
              <circle
                cx={displayX + nodeSize.width / 2 + 16}
                cy={displayY}
                r="12"
                fill={node.color}
                className="add-button-bg"
              />
              <text
                x={displayX + nodeSize.width / 2 + 16}
                y={displayY + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="16"
                fontWeight="bold"
                className="add-button-icon"
              >
                +
              </text>
            </g>
          )}

          {nodeNotification && (
            <foreignObject
              x={displayX - nodeSize.width / 2}
              y={displayY - nodeSize.height / 2 - 40}
              width={160}
              height={32}
              className="notification-tooltip"
            >
              <div className="notification-content">
                <span
                  className="notification-avatar"
                  style={{ backgroundColor: nodeNotification.avatar }}
                >
                  {nodeNotification.nickname.charAt(0)}
                </span>
                <span className="notification-text">
                  {nodeNotification.nickname}{' '}
                  {nodeNotification.type === 'add' && '添加了节点'}
                  {nodeNotification.type === 'delete' && '删除了节点'}
                  {nodeNotification.type === 'edit' && '编辑了节点'}
                  {nodeNotification.type === 'move' && '移动了节点'}
                </span>
              </div>
            </foreignObject>
          )}
        </g>
      );
    });
  };

  const renderCursors = () => {
    return cursors.map((cursor) => (
      <g key={cursor.userId} className="cursor-layer">
        <circle
          cx={cursor.position.x}
          cy={cursor.position.y}
          r="8"
          fill={cursor.color}
          opacity="0.7"
        />
        <circle
          cx={cursor.position.x}
          cy={cursor.position.y}
          r="4"
          fill={cursor.color}
        />
        <foreignObject
          x={cursor.position.x + 12}
          y={cursor.position.y - 8}
          width="100"
          height="20"
        >
          <div
            className="cursor-label"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.nickname}
          </div>
        </foreignObject>
      </g>
    ));
  };

  const renderDropPreview = () => {
    if (!nodeDragState || !dropTargetId) return null;

    const targetNode = data.nodes[dropTargetId];
    if (!targetNode) return null;

    const targetSize = getNodeSize(targetNode.level);
    const startX = targetNode.x + targetSize.width / 2;
    const startY = targetNode.y;
    const endX = nodeDragState.currentX;
    const endY = nodeDragState.currentY;
    const midX = (startX + endX) / 2;

    const pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

    return (
      <path
        d={pathD}
        stroke="#1a73e8"
        strokeWidth="3"
        strokeDasharray="8 4"
        fill="none"
        className="drop-preview-line"
      />
    );
  };

  return (
    <div ref={containerRef} className="canvas-container">
      <svg
        ref={svgRef}
        className="canvas-svg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <g
          className="canvas-transform"
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          <rect
            className="canvas-bg"
            x="-5000"
            y="-5000"
            width="10000"
            height="10000"
            fill="url(#grid)"
          />
          {renderConnections()}
          {renderNodes()}
          {renderDropPreview()}
          {renderCursors()}
        </g>
      </svg>

      {contextMenu && contextMenu.visible && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleDeleteNode}>
            删除节点
          </div>
        </div>
      )}

      <div className="zoom-controls">
        <button
          className="zoom-btn"
          onClick={() =>
            setTransform((prev) => ({
              ...prev,
              scale: Math.min(prev.scale * 1.2, 3),
            }))
          }
        >
          +
        </button>
        <button
          className="zoom-btn"
          onClick={() =>
            setTransform((prev) => ({
              ...prev,
              scale: Math.max(prev.scale * 0.8, 0.2),
            }))
          }
        >
          −
        </button>
        <button
          className="zoom-btn"
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            setTransform({
              x: container.clientWidth / 2,
              y: container.clientHeight / 2,
              scale: 1,
            });
          }}
        >
          ⟳
        </button>
      </div>
    </div>
  );
};

export default Canvas;
