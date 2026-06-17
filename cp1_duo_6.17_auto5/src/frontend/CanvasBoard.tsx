import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ConceptNode, Connection, CANVAS_CONFIG, Collaborator } from './types';
import { useCanvasStore } from './store';
import { useSocket } from './hooks/useSocket';

interface CanvasBoardProps {
  socket: ReturnType<typeof useSocket>;
}

interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  targetNodeId: string;
  snapType: 'center' | 'edge-start' | 'edge-end';
}

interface ZoomIndicatorState {
  visible: boolean;
  opacity: number;
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
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const [showDeleteBtn, setShowDeleteBtn] = useState(false);
  const [deleteBtnPos, setDeleteBtnPos] = useState({ x: 0, y: 0 });
  
  const snapGuidesRef = useRef<SnapGuide[]>([]);
  const snapIndicatorRef = useRef<{ x: number; y: number } | null>(null);
  
  const zoomAnimationRef = useRef<{
    startZoom: number;
    targetZoom: number;
    startTime: number;
    duration: number;
    active: boolean;
  }>({ startZoom: 1, targetZoom: 1, startTime: 0, duration: 200, active: false });
  
  const [zoomIndicator, setZoomIndicator] = useState<ZoomIndicatorState>({
    visible: false,
    opacity: 0,
  });
  const zoomIndicatorTimerRef = useRef<number | null>(null);

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

  const easeOut = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  const showZoomIndicator = useCallback(() => {
    setZoomIndicator({ visible: true, opacity: 1 });
    if (zoomIndicatorTimerRef.current) {
      window.clearTimeout(zoomIndicatorTimerRef.current);
    }
    zoomIndicatorTimerRef.current = window.setTimeout(() => {
      setZoomIndicator({ visible: true, opacity: 0 });
    }, 1800);
  }, []);

  const animateZoom = useCallback(
    (targetZoom: number) => {
      const clampedTarget = Math.max(
        CANVAS_CONFIG.MIN_ZOOM,
        Math.min(CANVAS_CONFIG.MAX_ZOOM, targetZoom)
      );
      zoomAnimationRef.current = {
        startZoom: zoom,
        targetZoom: clampedTarget,
        startTime: performance.now(),
        duration: 200,
        active: true,
      };
      showZoomIndicator();
    },
    [zoom, showZoomIndicator]
  );

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
      const threshold = 10 / zoom;
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

  const hitTestConnectionDeleteBtn = useCallback(
    (canvasX: number, canvasY: number): Connection | null => {
      const btnRadius = 12 / zoom;
      for (let i = connections.length - 1; i >= 0; i--) {
        const conn = connections[i];
        if (conn.id !== hoveredConnectionId) continue;
        
        const fromNode = nodesMap.get(conn.fromNodeId);
        const toNode = nodesMap.get(conn.toNodeId);
        if (!fromNode || !toNode) continue;

        const midX = (fromNode.x + fromNode.width / 2 + toNode.x + toNode.width / 2) / 2;
        const midY = (fromNode.y + fromNode.height / 2 + toNode.y + toNode.height / 2) / 2;
        
        const dist = Math.sqrt((canvasX - midX) ** 2 + (canvasY - midY) ** 2);
        if (dist <= btnRadius) {
          return conn;
        }
      }
      return null;
    },
    [connections, nodesMap, hoveredConnectionId, zoom]
  );

  const calculateSnapGuides = useCallback(
    (draggingNode: ConceptNode, newX: number, newY: number): { guides: SnapGuide[]; snappedX: number; snappedY: number } => {
      const guides: SnapGuide[] = [];
      let snappedX = newX;
      let snappedY = newY;
      const snapDistance = 30;
      
      const draggingCenterX = newX + draggingNode.width / 2;
      const draggingCenterY = newY + draggingNode.height / 2;
      const draggingLeft = newX;
      const draggingRight = newX + draggingNode.width;
      const draggingTop = newY;
      const draggingBottom = newY + draggingNode.height;

      for (const otherNode of nodes) {
        if (otherNode.id === draggingNode.id) continue;

        const otherCenterX = otherNode.x + otherNode.width / 2;
        const otherCenterY = otherNode.y + otherNode.height / 2;
        const otherLeft = otherNode.x;
        const otherRight = otherNode.x + otherNode.width;
        const otherTop = otherNode.y;
        const otherBottom = otherNode.y + otherNode.height;

        const centerDistX = Math.abs(draggingCenterX - otherCenterX);
        if (centerDistX < snapDistance) {
          guides.push({
            type: 'vertical',
            position: otherCenterX,
            targetNodeId: otherNode.id,
            snapType: 'center',
          });
          snappedX = otherCenterX - draggingNode.width / 2;
        }

        const centerDistY = Math.abs(draggingCenterY - otherCenterY);
        if (centerDistY < snapDistance) {
          guides.push({
            type: 'horizontal',
            position: otherCenterY,
            targetNodeId: otherNode.id,
            snapType: 'center',
          });
          snappedY = otherCenterY - draggingNode.height / 2;
        }

        const leftLeftDist = Math.abs(draggingLeft - otherLeft);
        if (leftLeftDist < snapDistance) {
          guides.push({
            type: 'vertical',
            position: otherLeft,
            targetNodeId: otherNode.id,
            snapType: 'edge-start',
          });
          if (leftLeftDist < Math.abs(snappedX - newX)) {
            snappedX = otherLeft;
          }
        }

        const rightRightDist = Math.abs(draggingRight - otherRight);
        if (rightRightDist < snapDistance) {
          guides.push({
            type: 'vertical',
            position: otherRight,
            targetNodeId: otherNode.id,
            snapType: 'edge-end',
          });
          if (rightRightDist < Math.abs(snappedX - newX)) {
            snappedX = otherRight - draggingNode.width;
          }
        }

        const topTopDist = Math.abs(draggingTop - otherTop);
        if (topTopDist < snapDistance) {
          guides.push({
            type: 'horizontal',
            position: otherTop,
            targetNodeId: otherNode.id,
            snapType: 'edge-start',
          });
          if (topTopDist < Math.abs(snappedY - newY)) {
            snappedY = otherTop;
          }
        }

        const bottomBottomDist = Math.abs(draggingBottom - otherBottom);
        if (bottomBottomDist < snapDistance) {
          guides.push({
            type: 'horizontal',
            position: otherBottom,
            targetNodeId: otherNode.id,
            snapType: 'edge-end',
          });
          if (bottomBottomDist < Math.abs(snappedY - newY)) {
            snappedY = otherBottom - draggingNode.height;
          }
        }
      }

      return { guides, snappedX, snappedY };
    },
    [nodes]
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

      if (isSelected) {
        ctx.shadowColor = node.fillColor;
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 0.3;
        
        if (node.shape === 'rectangle') {
          ctx.beginPath();
          const radius = 8 * zoom;
          ctx.roundRect(x - 2, y - 2, w + 4, h + 4, radius + 2);
          ctx.fillStyle = node.fillColor;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, w / 2 + 2, h / 2 + 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = node.fillColor;
          ctx.fill();
        }
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
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

      if (isSelected) {
        const handleRadius = 5;
        const handlePositions = [
          { hx: x, hy: y },
          { hx: x + w, hy: y },
          { hx: x, hy: y + h },
          { hx: x + w, hy: y + h },
        ];
        
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#2D8B9E';
        ctx.lineWidth = 2;
        
        handlePositions.forEach(({ hx, hy }) => {
          ctx.beginPath();
          ctx.arc(hx, hy, handleRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
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
      size: number,
      isHovered: boolean
    ) => {
      const scale = isHovered ? 1.3 : 1;
      const actualSize = size * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-actualSize, -actualSize / 2);
      ctx.lineTo(-actualSize * 0.7, 0);
      ctx.lineTo(-actualSize, actualSize / 2);
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
      isSelected: boolean,
      isHovered: boolean
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
      ctx.strokeStyle = isSelected ? '#2D8B9E' : isHovered ? '#555' : '#666';
      ctx.fillStyle = isSelected ? '#2D8B9E' : isHovered ? '#555' : '#666';
      ctx.lineWidth = isSelected ? 3 : isHovered ? 3 : 2;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const arrowSize = 10 * zoom;
      const angle = Math.atan2(dy, dx);

      if (conn.arrowType === 'one-way' || conn.arrowType === 'two-way') {
        drawArrow(ctx, endX, endY, angle, arrowSize, isHovered);
      }
      if (conn.arrowType === 'two-way') {
        drawArrow(ctx, startX, startY, angle + Math.PI, arrowSize, isHovered);
      }

      if (isHovered) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const btnRadius = 12;
        
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(midX, midY, btnRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(midX - 5, midY - 5);
        ctx.lineTo(midX + 5, midY + 5);
        ctx.moveTo(midX + 5, midY - 5);
        ctx.lineTo(midX - 5, midY + 5);
        ctx.stroke();
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
      const y1 = (fromNode.y + fromNode.height / 2) * zoom + panY;
      const x2 = mouseCanvasX * zoom + panX;
      const y2 = mouseCanvasY * zoom + panY;

      ctx.save();
      ctx.strokeStyle = '#45B7D1';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.setLineDash([]);
      const arrowSize = 10 * zoom;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.fillStyle = '#45B7D1';
      drawArrow(ctx, x2, y2, angle, arrowSize, false);

      ctx.restore();
    },
    [connectingFromNodeId, nodesMap, panX, panY, zoom, drawArrow]
  );

  const drawSnapGuides = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const guides = snapGuidesRef.current;
      if (guides.length === 0) return;

      ctx.save();
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.lineCap = 'round';

      const canvas = canvasRef.current;
      if (!canvas) return;

      guides.forEach((guide) => {
        const pos = guide.position * zoom + (guide.type === 'vertical' ? panX : panY);
        
        ctx.beginPath();
        if (guide.type === 'vertical') {
          ctx.moveTo(pos, 0);
          ctx.lineTo(pos, canvas.height);
        } else {
          ctx.moveTo(0, pos);
          ctx.lineTo(canvas.width, pos);
        }
        ctx.stroke();
      });

      if (snapIndicatorRef.current) {
        const ix = snapIndicatorRef.current.x * zoom + panX;
        const iy = snapIndicatorRef.current.y * zoom + panY;
        
        ctx.setLineDash([]);
        ctx.fillStyle = '#45B7D1';
        ctx.beginPath();
        ctx.arc(ix, iy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
    [panX, panY, zoom]
  );

  const drawCollaborators = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      collaborators.forEach((c) => {
        if (c.id === currentUser?.id) return;

        const x = c.cursorX * zoom + panX;
        const y = c.cursorY * zoom + panY;

        ctx.save();
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = c.color;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const text = c.name;
        const textWidth = ctx.measureText(text).width;
        const padding = 6;
        const labelX = x + 12;
        const labelY = y - 4;
        
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.roundRect(labelX - padding / 2, labelY - 2, textWidth + padding, 18, 4);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.fillText(text, labelX, labelY);

        ctx.restore();
      });
    },
    [collaborators, currentUser?.id, panX, panY, zoom]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx, width, height);
    drawSnapGuides(ctx);

    connections.forEach((conn) => {
      const isSelected = conn.id === selectedConnectionId;
      const isHovered = conn.id === hoveredConnectionId;
      drawConnection(ctx, conn, isSelected, isHovered);
    });

    nodes.forEach((node) => {
      const isSelected = node.id === selectedNodeId;
      const isHighlighted = highlightedNodeIds.includes(node.id);
      drawNode(ctx, node, isSelected, isHighlighted);
    });

    if (isConnecting) {
      drawConnectingLine(ctx, mousePos.x, mousePos.y);
    }

    drawCollaborators(ctx);
  }, [
    drawGrid,
    drawSnapGuides,
    drawConnection,
    drawNode,
    drawConnectingLine,
    drawCollaborators,
    connections,
    nodes,
    selectedConnectionId,
    selectedNodeId,
    highlightedNodeIds,
    isConnecting,
    mousePos,
    hoveredConnectionId,
  ]);

  useEffect(() => {
    const animate = () => {
      if (zoomAnimationRef.current.active) {
        const elapsed = performance.now() - zoomAnimationRef.current.startTime;
        const progress = Math.min(elapsed / zoomAnimationRef.current.duration, 1);
        const easedProgress = easeOut(progress);
        
        const currentZoom =
          zoomAnimationRef.current.startZoom +
          (zoomAnimationRef.current.targetZoom - zoomAnimationRef.current.startZoom) * easedProgress;
        
        setZoom(currentZoom);
        
        if (progress >= 1) {
          zoomAnimationRef.current.active = false;
          setZoom(zoomAnimationRef.current.targetZoom);
        }
      }
      
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, setZoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvasCoords = getCanvasCoords(e.clientX, e.clientY);

      const deleteBtnConn = hitTestConnectionDeleteBtn(canvasCoords.x, canvasCoords.y);
      if (deleteBtnConn && roomId && currentUser) {
        deleteNode(deleteBtnConn.id);
        socket.sendConnectionDelete(roomId, deleteBtnConn.id);
        setHoveredConnectionId(null);
        return;
      }

      const hitNode = hitTestNode(canvasCoords.x, canvasCoords.y);
      const hitConn = hitTestConnection(canvasCoords.x, canvasCoords.y);

      if (isConnecting && hitNode && connectingFromNodeId && hitNode.id !== connectingFromNodeId) {
        const newConnection: Connection = {
          id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fromNodeId: connectingFromNodeId,
          toNodeId: hitNode.id,
          arrowType: currentStyle.arrowType,
          createdAt: Date.now(),
          createdBy: currentUser?.id || 'anonymous',
        };
        addConnection(newConnection);
        if (roomId) {
          socket.sendConnectionAdd(roomId, newConnection);
        }
        finishConnecting();
        return;
      }

      if (hitNode) {
        isDraggingRef.current = true;
        dragNodeIdRef.current = hitNode.id;
        dragOffsetRef.current = {
          x: canvasCoords.x - hitNode.x,
          y: canvasCoords.y - hitNode.y,
        };
        selectNode(hitNode.id);
      } else if (hitConn) {
        selectConnection(hitConn.id);
      } else {
        isPanningRef.current = true;
        selectNode(null);
        selectConnection(null);
      }

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    },
    [
      getCanvasCoords,
      hitTestNode,
      hitTestConnection,
      hitTestConnectionDeleteBtn,
      isConnecting,
      connectingFromNodeId,
      currentStyle.arrowType,
      currentUser,
      addConnection,
      finishConnecting,
      selectNode,
      selectConnection,
      roomId,
      socket,
      deleteNode,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvasCoords = getCanvasCoords(e.clientX, e.clientY);
      setMousePos(canvasCoords);

      const now = Date.now();
      if (roomId && currentUser && now - lastCursorSendRef.current > 50) {
        socket.sendCursorMove(roomId, currentUser.id, canvasCoords.x, canvasCoords.y);
        lastCursorSendRef.current = now;
      }

      if (isDraggingRef.current && dragNodeIdRef.current) {
        const node = nodesMap.get(dragNodeIdRef.current);
        if (node) {
          let newX = canvasCoords.x - dragOffsetRef.current.x;
          let newY = canvasCoords.y - dragOffsetRef.current.y;
          
          const { guides, snappedX, snappedY } = calculateSnapGuides(node, newX, newY);
          snapGuidesRef.current = guides;
          
          if (guides.length > 0) {
            newX = snappedX;
            newY = snappedY;
            
            const snapNode = guides[0].targetNodeId 
              ? nodesMap.get(guides[0].targetNodeId) 
              : null;
            if (snapNode) {
              if (guides[0].type === 'vertical') {
                snapIndicatorRef.current = {
                  x: guides[0].position,
                  y: newY + node.height / 2,
                };
              } else {
                snapIndicatorRef.current = {
                  x: newX + node.width / 2,
                  y: guides[0].position,
                };
              }
            }
          } else {
            snapIndicatorRef.current = null;
          }

          const updatedNode = { ...node, x: newX, y: newY };
          updateNode(updatedNode);
          if (roomId) {
            socket.sendNodeUpdate(roomId, updatedNode);
          }
        }
      } else if (isPanningRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        setPan(panX + dx, panY + dy);
      } else {
        const hoveredConn = hitTestConnection(canvasCoords.x, canvasCoords.y);
        setHoveredConnectionId(hoveredConn?.id || null);
        
        if (hoveredConn) {
          const fromNode = nodesMap.get(hoveredConn.fromNodeId);
          const toNode = nodesMap.get(hoveredConn.toNodeId);
          if (fromNode && toNode) {
            const midX = (fromNode.x + fromNode.width / 2 + toNode.x + toNode.width / 2) / 2;
            const midY = (fromNode.y + fromNode.height / 2 + toNode.y + toNode.height / 2) / 2;
            setDeleteBtnPos({ x: midX, y: midY });
            setShowDeleteBtn(true);
          }
        } else {
          setShowDeleteBtn(false);
        }
      }

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    },
    [
      getCanvasCoords,
      nodesMap,
      panX,
      panY,
      setPan,
      updateNode,
      roomId,
      socket,
      currentUser,
      hitTestConnection,
      calculateSnapGuides,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      dragNodeIdRef.current = null;
      snapGuidesRef.current = [];
      snapIndicatorRef.current = null;
    }
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = zoom + delta;
      animateZoom(newZoom);
    },
    [zoom, animateZoom]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isConnecting) return;

      const canvasCoords = getCanvasCoords(e.clientX, e.clientY);
      const hitNode = hitTestNode(canvasCoords.x, canvasCoords.y);

      if (!hitNode) {
        const newNode: ConceptNode = {
          id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          x: canvasCoords.x - CANVAS_CONFIG.NODE_WIDTH / 2,
          y: canvasCoords.y - CANVAS_CONFIG.NODE_HEIGHT / 2,
          width: CANVAS_CONFIG.NODE_WIDTH,
          height: CANVAS_CONFIG.NODE_HEIGHT,
          shape: currentStyle.shape,
          fillColor: currentStyle.fillColor,
          borderColor: currentStyle.borderColor,
          label: '新概念',
          createdAt: Date.now(),
          createdBy: currentUser?.id || 'anonymous',
        };
        addNode(newNode);
        if (roomId) {
          socket.sendNodeAdd(roomId, newNode);
        }
        selectNode(newNode.id);
      }
    },
    [
      getCanvasCoords,
      hitTestNode,
      isConnecting,
      currentStyle,
      addNode,
      selectNode,
      roomId,
      socket,
      currentUser,
    ]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      
      const canvasCoords = getCanvasCoords(e.clientX, e.clientY);
      const hitNode = hitTestNode(canvasCoords.x, canvasCoords.y);
      
      if (hitNode) {
        startConnecting(hitNode.id);
      } else if (isConnecting) {
        cancelConnecting();
      }
    },
    [getCanvasCoords, hitTestNode, startConnecting, isConnecting, cancelConnecting]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConnecting) {
        cancelConnecting();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && roomId) {
          deleteNode(selectedNodeId);
          socket.sendNodeDelete(roomId, selectedNodeId);
        } else if (selectedConnectionId && roomId) {
          deleteNode(selectedConnectionId);
          socket.sendConnectionDelete(roomId, selectedConnectionId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedConnectionId, isConnecting, cancelConnecting, deleteNode, roomId, socket]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{
          display: 'block',
          cursor: isConnecting ? 'crosshair' : isPanningRef.current ? 'grabbing' : 'default',
        }}
      />
      
      {zoomIndicator.visible && (
        <div
          style={{
            position: 'absolute',
            right: 20,
            bottom: 20,
            padding: '8px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            pointerEvents: 'none',
            opacity: zoomIndicator.opacity,
            transition: 'opacity 0.3s ease-out',
            zIndex: 100,
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
};
