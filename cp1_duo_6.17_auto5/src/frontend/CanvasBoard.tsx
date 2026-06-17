import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ConceptNode, Connection, CANVAS_CONFIG, Collaborator } from './types';
import { useCanvasStore } from './store';
import { useSocket } from './hooks/useSocket';

interface CanvasBoardProps {
  socket: ReturnType<typeof useSocket>;
}

export const CanvasBoard: React.FC<CanvasBoardProps> = ({ socket }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const dragNodeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const lastCursorSendRef = useRef(0);

  const {
    nodes,
    connections,
    collaborators,
    currentUser,
    roomId,
    zoom,
    panX,
    panY,
    selectedNodeId,
    selectedConnectionId,
    highlightedNodeIds,
    isConnecting,
    connectingFromNodeId,
    currentStyle,
    setZoom,
    setPan,
    selectNode,
    selectConnection,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    startConnecting,
    cancelConnecting,
    finishConnecting,
    setHighlightedNodes,
  } = useCanvasStore();

  const nodesMap = useMemo(() => {
    const map = new Map<string, ConceptNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - panX) / zoom,
        y: (clientY - rect.top - panY) / zoom,
      };
    },
    [panX, panY, zoom]
  );

  const hitTestNode = useCallback(
    (canvasX: number, canvasY: number): ConceptNode | null => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (node.shape === 'rectangle') {
          if (
            canvasX >= node.x &&
            canvasX <= node.x + node.width &&
            canvasY >= node.y &&
            canvasY <= node.y + node.height
          ) {
            return node;
          }
        } else {
          const cx = node.x + node.width / 2;
          const cy = node.y + node.height / 2;
          const rx = node.width / 2;
          const ry = node.height / 2;
          const dx = (canvasX - cx) / rx;
          const dy = (canvasY - cy) / ry;
          if (dx * dx + dy * dy <= 1) {
            return node;
          }
        }
      }
      return null;
    },
    [nodes]
  );

  const hitTestConnection = useCallback(
    (canvasX: number, canvasY: number): Connection | null => {
      const threshold = 8 / zoom;
      for (let i = connections.length - 1; i >= 0; i--) {
        const conn = connections[i];
        const fromNode = nodesMap.get(conn.fromNodeId);
        const toNode = nodesMap.get(conn.toNodeId);
        if (!fromNode || !toNode) continue;

        const x1 = fromNode.x + fromNode.width / 2;
        const y1 = fromNode.y + fromNode.height / 2;
        const x2 = toNode.x + toNode.width / 2;
        const y2 = toNode.y + toNode.height / 2;

        const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        if (lineLength === 0) continue;

        const t = Math.max(
          0,
          Math.min(
            1,
            ((canvasX - x1) * (x2 - x1) + (canvasY - y1) * (y2 - y1)) /
              (lineLength * lineLength)
          )
        );

        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        const dist = Math.sqrt((canvasX - projX) ** 2 + (canvasY - projY) ** 2);

        if (dist <= threshold) {
          return conn;
        }
      }
      return null;
    },
    [connections, nodesMap, zoom]
  );

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.save();
      ctx.fillStyle = CANVAS_CONFIG.BACKGROUND_COLOR;
      ctx.fillRect(0, 0, width, height);

      const gridSize = CANVAS_CONFIG.GRID_SIZE * zoom;
      const offsetX = panX % gridSize;
      const offsetY = panY % gridSize;

      ctx.strokeStyle = CANVAS_CONFIG.GRID_COLOR;
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let x = offsetX; x < width; x += gridSize) {
        ctx.moveTo(Math.floor(x) + 0.5, 0);
        ctx.lineTo(Math.floor(x) + 0.5, height);
      }
      for (let y = offsetY; y < height; y += gridSize) {
        ctx.moveTo(0, Math.floor(y) + 0.5);
        ctx.lineTo(width, Math.floor(y) + 0.5);
      }
      ctx.stroke();
      ctx.restore();
    },
    [panX, panY, zoom]
  );

  const drawNode = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      node: ConceptNode,
      isSelected: boolean,
      isHighlighted: boolean
    ) => {
      ctx.save();

      const x = node.x * zoom + panX;
      const y = node.y * zoom + panY;
      const w = node.width * zoom;
      const h = node.height * zoom;

      if (isHighlighted) {
        const time = Date.now() / 150;
        const dashOffset = (time % 20) - 10;
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = dashOffset;

        if (node.shape === 'rectangle') {
          ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
        } else {
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, w / 2 + 4, h / 2 + 4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      ctx.fillStyle = node.fillColor;
      ctx.strokeStyle = isSelected ? '#2D8B9E' : node.borderColor;
      ctx.lineWidth = isSelected ? 3 : 2;

      if (node.shape === 'rectangle') {
        ctx.beginPath();
        const radius = 8 * zoom;
        ctx.roundRect(x, y, w, h, radius);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#333';
      ctx.font = `${Math.max(12, 14 * zoom)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const maxWidth = w - 16 * zoom;
      let text = node.label;
      if (ctx.measureText(text).width > maxWidth) {
        while (ctx.measureText(text + '...').width > maxWidth && text.length > 0) {
          text = text.slice(0, -1);
        }
        text += '...';
      }
      ctx.fillText(text, x + w / 2, y + h / 2);

      ctx.restore();
    },
    [panX, panY, zoom]
  );

  const drawArrow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      angle: number,
      size: number
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size / 2);
      ctx.lineTo(-size * 0.7, 0);
      ctx.lineTo(-size, size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
    []
  );

  const drawConnection = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      conn: Connection,
      isSelected: boolean
    ) => {
      const fromNode = nodesMap.get(conn.fromNodeId);
      const toNode = nodesMap.get(conn.toNodeId);
      if (!fromNode || !toNode) return;

      const x1 = (fromNode.x + fromNode.width / 2) * zoom + panX;
      const y1 = (fromNode.y + fromNode.height / 2) * zoom + panY;
      const x2 = (toNode.x + toNode.width / 2) * zoom + panX;
      const y2 = (toNode.y + toNode.height / 2) * zoom + panY;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;

      const fromRadius = Math.min(fromNode.width, fromNode.height) / 2;
      const toRadius = Math.min(toNode.width, toNode.height) / 2;
      const nx = dx / len;
      const ny = dy / len;

      const startX = x1 + nx * fromRadius * zoom;
      const startY = y1 + ny * fromRadius * zoom;
      const endX = x2 - nx * toRadius * zoom;
      const endY = y2 - ny * toRadius * zoom;

      ctx.save();
      ctx.strokeStyle = isSelected ? '#2D8B9E' : '#666';
      ctx.fillStyle = isSelected ? '#2D8B9E' : '#666';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const arrowSize = 10 * zoom;
      const angle = Math.atan2(dy, dx);

      if (conn.arrowType === 'one-way' || conn.arrowType === 'two-way') {
        drawArrow(ctx, endX, endY, angle, arrowSize);
      }
      if (conn.arrowType === 'two-way') {
        drawArrow(ctx, startX, startY, angle + Math.PI, arrowSize);
      }

      ctx.restore();
    },
    [nodesMap, panX, panY, zoom, drawArrow]
  );

  const drawConnectingLine = useCallback(
    (ctx: CanvasRenderingContext2D, mouseCanvasX: number, mouseCanvasY: number) => {
      if (!connectingFromNodeId) return;

      const fromNode = nodesMap.get(connectingFromNodeId);
      if (!fromNode) return;

      const x1 = (fromNode.x + fromNode.width / 2) * zoom + panX;
      const y1 = (fromNode.y + fromNode.height / 2)