import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvasStore } from './store';
import {
  getNodePortPosition,
  getConnectionPath,
  getConnectionMidpoint,
  screenToCanvas,
  isPointInNode,
  findNearestInputPort,
} from './CanvasLogic';
import { NodeType, GRID_SIZE } from './types';

interface CanvasProps {
  onExportClick: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({ onExportClick }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const {
    nodes,
    connections,
    selectedNodeId,
    selectedConnectionId,
    zoom,
    panX,
    panY,
    addNode,
    updateNode,
    selectNode,
    addConnection,
    selectConnection,
    setZoom,
    setPan,
    clearSelection,
    deleteSelected,
  } = useCanvasStore();

  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [connectingSourcePort, setConnectingSourcePort] = useState<'bottom' | 'right' | null>(null);
  const [tempEndPos, setTempEndPos] = useState<{ x: number; y: number } | null>(null);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const [dragOverCanvas, setDragOverCanvas] = useState(false);

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return screenToCanvas(clientX, clientY, panX, panY, zoom, rect);
    },
    [panX, panY, zoom]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        e.preventDefault();
        setSpacePressed(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          deleteSelected();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed, deleteSelected]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = spacePressed ? 'grab' : 'default';
    }
  }, [spacePressed]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(3, Math.max(0.5, zoom + delta));

      const scaleRatio = newZoom / zoom;
      const newPanX = mouseX - (mouseX - panX) * scaleRatio;
      const newPanY = mouseY - (mouseY - panY) * scaleRatio;

      setZoom(newZoom);
      setPan(newPanX, newPanY);
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    if (spacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
      return;
    }

    const point = getCanvasPoint(e.clientX, e.clientY);

    const clickedNode = nodes.find((n) => isPointInNode(point, n));
    if (clickedNode) {
      selectNode(clickedNode.id);
      setIsDraggingNode(true);
      setDragNodeId(clickedNode.id);
      setDragOffset({
        x: point.x - clickedNode.x,
        y: point.y - clickedNode.y,
      });
      return;
    }

    clearSelection();
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      setPan(newPanX, newPanY);
      return;
    }

    if (isDraggingNode && dragNodeId) {
      const point = getCanvasPoint(e.clientX, e.clientY);
      const newX = Math.round((point.x - dragOffset.x) / GRID_SIZE) * GRID_SIZE;
      const newY = Math.round((point.y - dragOffset.y) / GRID_SIZE) * GRID_SIZE;
      updateNode(dragNodeId, { x: newX, y: newY });
      return;
    }

    if (isConnecting && connectingSourceId && connectingSourcePort) {
      const point = getCanvasPoint(e.clientX, e.clientY);
      setTempEndPos(point);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = spacePressed ? 'grab' : 'default';
      }
      return;
    }

    if (isDraggingNode) {
      setIsDraggingNode(false);
      setDragNodeId(null);
      return;
    }

    if (isConnecting && connectingSourceId && connectingSourcePort && tempEndPos) {
      const nearestPort = findNearestInputPort(tempEndPos, nodes, connectingSourceId);
      if (nearestPort) {
        addConnection(
          connectingSourceId,
          nearestPort.nodeId,
          connectingSourcePort,
          nearestPort.port
        );
      }
      setIsConnecting(false);
      setConnectingSourceId(null);
      setConnectingSourcePort(null);
      setTempEndPos(null);
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e.clientX, e.clientY);
    const clickedNode = nodes.find((n) => isPointInNode(point, n));
    if (clickedNode) {
      setEditingNodeId(clickedNode.id);
      setEditText(clickedNode.label);
    }
  };

  const handlePortMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    port: 'bottom' | 'right'
  ) => {
    e.stopPropagation();
    setIsConnecting(true);
    setConnectingSourceId(nodeId);
    setConnectingSourcePort(port);
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const portPos = getNodePortPosition(node, port);
      setTempEndPos(portPos);
    }
  };

  const handleConnectionClick = (e: React.MouseEvent, connId: string) => {
    e.stopPropagation();
    selectConnection(connId);
  };

  const handleConnectionDoubleClick = (e: React.MouseEvent, connId: string) => {
    e.stopPropagation();
    const conn = connections.find((c) => c.id === connId);
    if (conn) {
      setEditingConnectionId(connId);
      setEditText(conn.label);
    }
  };

  const handleNodeLabelBlur = () => {
    if (editingNodeId) {
      updateNode(editingNodeId, { label: editText });
      setEditingNodeId(null);
    }
  };

  const handleConnectionLabelBlur = () => {
    if (editingConnectionId) {
      useCanvasStore.getState().updateConnection(editingConnectionId, { label: editText });
      setEditingConnectionId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCanvas(true);
  };

  const handleDragLeave = () => {
    setDragOverCanvas(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCanvas(false);

    const nodeType = e.dataTransfer.getData('nodeType') as NodeType;
    if (!nodeType) return;

    const point = getCanvasPoint(e.clientX, e.clientY);
    const snappedX = Math.round(point.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(point.y / GRID_SIZE) * GRID_SIZE;

    addNode(nodeType, snappedX - 80, snappedY - 40);
  };

  const getLineDashArray = (style: 'solid' | 'dashed' | 'dotted', width: number) => {
    switch (style) {
      case 'solid':
        return 'none';
      case 'dashed':
        return `${8 + width * 2}, ${4 + width}`;
      case 'dotted':
        return `${width}, ${width * 2}`;
    }
  };

  const renderConnections = () => {
    return connections.map((conn) => {
      const sourceNode = nodes.find((n) => n.id === conn.sourceId);
      const targetNode = nodes.find((n) => n.id === conn.targetId);
      if (!sourceNode || !targetNode) return null;

      const sourcePos = getNodePortPosition(sourceNode, conn.sourcePort);
      const targetPos = getNodePortPosition(targetNode, conn.targetPort);
      const pathD = getConnectionPath(sourcePos, targetPos, conn.sourcePort, conn.targetPort);
      const midpoint = getConnectionMidpoint(sourcePos, targetPos, conn.sourcePort, conn.targetPort);

      const isSelected = selectedConnectionId === conn.id;
      const strokeWidth = conn.lineWidth;

      return (
        <g key={conn.id} className="connection-group">
          <path
            d={pathD}
            stroke="transparent"
            strokeWidth={20}
            fill="none"
            style={{ cursor: 'pointer' }}
            onClick={(e) => handleConnectionClick(e, conn.id)}
            onDoubleClick={(e) => handleConnectionDoubleClick(e, conn.id)}
          />
          <path
            d={pathD}
            stroke={conn.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={getLineDashArray(conn.lineStyle, strokeWidth)}
            className={`connection-path ${isSelected ? 'selected' : ''}`}
            onClick={(e) => handleConnectionClick(e, conn.id)}
            onDoubleClick={(e) => handleConnectionDoubleClick(e, conn.id)}
          />
          {editingConnectionId === conn.id ? (
            <foreignObject
              x={midpoint.x - 40}
              y={midpoint.y - 12}
              width={80}
              height={24}
              style={{ overflow: 'visible' }}
            >
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleConnectionLabelBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConnectionLabelBlur();
                }}
                autoFocus
                className="connection-label-input"
              />
            </foreignObject>
          ) : (
            <g
              className="connection-label"
              onClick={(e) => handleConnectionClick(e, conn.id)}
              onDoubleClick={(e) => handleConnectionDoubleClick(e, conn.id)}
            >
              <rect
                x={midpoint.x - (conn.label.length * 12) / 2 - 6}
                y={midpoint.y - 10}
                width={conn.label.length * 12 + 12}
                height={20}
                rx={4}
                fill="white"
                stroke={isSelected ? '#667eea' : '#ddd'}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text
                x={midpoint.x}
                y={midpoint.y + 4}
                textAnchor="middle"
                fontSize={12}
                fill="#333"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {conn.label}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  const renderTempConnection = () => {
    if (!isConnecting || !connectingSourceId || !connectingSourcePort || !tempEndPos) {
      return null;
    }

    const sourceNode = nodes.find((n) => n.id === connectingSourceId);
    if (!sourceNode) return null;

    const sourcePos = getNodePortPosition(sourceNode, connectingSourcePort);
    const pathD = getConnectionPath(sourcePos, tempEndPos, connectingSourcePort, 'top');

    return (
      <path
        d={pathD}
        stroke="#667eea"
        strokeWidth={2}
        strokeDasharray="8,4"
        fill="none"
        className="temp-connection"
      />
    );
  };

  const renderNodes = () => {
    return nodes.map((node) => {
      const isSelected = selectedNodeId === node.id;

      return (
        <g
          key={node.id}
          className={`journey-node ${isSelected ? 'selected' : ''}`}
          transform={`translate(${node.x}, ${node.y})`}
          style={{ cursor: 'move' }}
        >
          <rect
            width={node.width}
            height={node.height}
            rx={node.borderRadius}
            ry={node.borderRadius}
            fill={node.color}
            className="node-shadow"
          />
          <rect
            width={node.width}
            height={node.height}
            rx={node.borderRadius}
            ry={node.borderRadius}
            fill="white"
            style={{
              clipPath: `inset(0 round ${node.borderRadius}px)`,
            }}
          />
          <rect
            x={0}
            y={0}
            width={6}
            height={node.height}
            rx={node.borderRadius}
            fill={node.color}
            style={{
              clipPath: `inset(0 ${node.width - 6}px 0 0 round ${node.borderRadius}px 0 0 ${node.borderRadius}px)`,
            }}
          />

          <g className="node-content">
            <text
              x={24}
              y={node.height / 2 + 6}
              fontSize={24}
              style={{
                background: node.color,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {node.type === 'start' && '▶'}
              {node.type === 'action' && '⚡'}
              {node.type === 'decision' && '◆'}
              {node.type === 'end' && '⬛'}
            </text>
            {editingNodeId === node.id ? (
              <foreignObject
                x={56}
                y={node.height / 2 - 12}
                width={node.width - 70}
                height={24}
              >
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={handleNodeLabelBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNodeLabelBlur();
                  }}
                  autoFocus
                  className="node-label-input"
                  style={{ fontSize: 14 }}
                />
              </foreignObject>
            ) : (
              <text
                x={56}
                y={node.height / 2 + 5}
                fontSize={14}
                fill="#333"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {node.label}
              </text>
            )}
          </g>

          <circle
            cx={node.width / 2}
            cy={0}
            r={6}
            fill="white"
            stroke="#999"
            strokeWidth={2}
            className="port port-top"
          />
          <circle
            cx={0}
            cy={node.height / 2}
            r={6}
            fill="white"
            stroke="#999"
            strokeWidth={2}
            className="port port-left"
          />

          <circle
            cx={node.width / 2}
            cy={node.height}
            r={6}
            fill="white"
            stroke="#667eea"
            strokeWidth={2}
            className="port port-bottom output-port"
            style={{ cursor: 'crosshair' }}
            onMouseDown={(e) => handlePortMouseDown(e, node.id, 'bottom')}
          />
          <circle
            cx={node.width}
            cy={node.height / 2}
            r={6}
            fill="white"
            stroke="#667eea"
            strokeWidth={2}
            className="port port-right output-port"
            style={{ cursor: 'crosshair' }}
            onMouseDown={(e) => handlePortMouseDown(e, node.id, 'right')}
          />

          {isSelected && (
            <g className="selection-handles">
              <rect
                x={-1}
                y={-1}
                width={node.width + 2}
                height={node.height + 2}
                rx={node.borderRadius + 1}
                ry={node.borderRadius + 1}
                fill="none"
                stroke="#667eea"
                strokeWidth={1}
                strokeDasharray="5,3"
              />
              <circle cx={-3} cy={-3} r={4} fill="white" stroke="#667eea" strokeWidth={1.5} />
              <circle
                cx={node.width + 3}
                cy={-3}
                r={4}
                fill="white"
                stroke="#667eea"
                strokeWidth={1.5}
              />
              <circle
                cx={-3}
                cy={node.height + 3}
                r={4}
                fill="white"
                stroke="#667eea"
                strokeWidth={1.5}
              />
              <circle
                cx={node.width + 3}
                cy={node.height + 3}
                r={4}
                fill="white"
                stroke="#667eea"
                strokeWidth={1.5}
              />
            </g>
          )}
        </g>
      );
    });
  };

  const gridPatternId = 'gridPattern';

  return (
    <div className="canvas-container">
      <div className="canvas-toolbar">
        <button className="toolbar-btn" onClick={onExportClick}>
          导出 SVG
        </button>
      </div>
      <div
        ref={canvasRef}
        className={`canvas ${dragOverCanvas ? 'drag-over' : ''} ${isPanning ? 'panning' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg
          ref={svgRef}
          className="canvas-svg"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs>
            <pattern
              id={gridPatternId}
              width={GRID_SIZE}
              height={GRID_SIZE}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={1} cy={1} r={0.5} fill="#ddd" />
            </pattern>
          </defs>
          <rect
            x={-5000}
            y={-5000}
            width={10000}
            height={10000}
            fill={`url(#${gridPatternId})`}
          />

          <g className="connections-layer">{renderConnections()}</g>
          {renderTempConnection()}
          <g className="nodes-layer">{renderNodes()}</g>
        </svg>

        <div className="zoom-indicator">{zoom.toFixed(2)}x</div>
      </div>
    </div>
  );
};
