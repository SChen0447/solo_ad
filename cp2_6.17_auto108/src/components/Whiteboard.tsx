import { useRef, useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

interface DrawingPath {
  type: 'path';
  points: { x: number; y: number }[];
  color: string;
  width: number;
  id: string;
}

interface DrawingText {
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  id: string;
}

type DrawingItem = DrawingPath | DrawingText;

interface WhiteboardProps {
  socket: Socket;
  roomCode: string;
  nickname: string;
}

const COLORS = [
  '#000000', '#e53935', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#4caf50', '#ff9800', '#795548',
];

const WIDTHS = [2, 4, 6];

const GRID_SIZE = 30;
const FONT_SIZE = 18;
const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, sans-serif';

export default function Whiteboard({ socket, roomCode }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(2);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);

  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tempDraggingPos, setTempDraggingPos] = useState<{ x: number; y: number } | null>(null);

  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const drawingsRef = useRef<DrawingItem[]>([]);

  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : (e as MouseEvent).clientX;
    const clientY = 'clientY' in e ? e.clientY : (e as MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width) / window.devicePixelRatio,
      y: (clientY - rect.top) * (canvas.height / rect.height) / window.devicePixelRatio,
    };
  }, []);

  const measureTextWidth = useCallback((text: string): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    return ctx.measureText(text).width;
  }, []);

  const hitTestText = useCallback((x: number, y: number): DrawingText | null => {
    const allDrawings = drawingsRef.current;
    for (let i = allDrawings.length - 1; i >= 0; i--) {
      const item = allDrawings[i];
      if (item.type === 'text') {
        const textWidth = measureTextWidth(item.text);
        const halfW = textWidth / 2 + 10;
        const halfH = FONT_SIZE / 2 + 8;
        if (
          x >= item.x - halfW &&
          x <= item.x + halfW &&
          y >= item.y - halfH &&
          y <= item.y + halfH
        ) {
          return item;
        }
      }
    }
    return null;
  }, [measureTextWidth]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    ctx.fillStyle = '#fef9ef';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    for (let x = 0; x <= cssWidth; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= cssHeight; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssWidth, y);
      ctx.stroke();
    }

    let displayDrawings = drawings;
    if (currentPathRef.current.length > 0) {
      displayDrawings = [
        ...displayDrawings,
        {
          type: 'path' as const,
          points: currentPathRef.current,
          color,
          width: lineWidth,
          id: 'temp',
        },
      ];
    }

    for (const item of displayDrawings) {
      if (item.type === 'path') {
        if (item.points.length < 2) continue;
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x, item.points[i].y);
        }
        ctx.stroke();
      } else if (item.type === 'text') {
        let drawX = item.x;
        let drawY = item.y;
        if (draggingTextId === item.id && tempDraggingPos) {
          drawX = tempDraggingPos.x;
          drawY = tempDraggingPos.y;
        }
        ctx.fillStyle = item.color;
        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.text, drawX, drawY);

        if (draggingTextId === item.id) {
          const textWidth = measureTextWidth(item.text);
          const halfW = textWidth / 2 + 8;
          const halfH = FONT_SIZE / 2 + 6;
          ctx.strokeStyle = '#5b6cff';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(drawX - halfW, drawY - halfH, halfW * 2, halfH * 2);
          ctx.setLineDash([]);
        }
      }
    }

    ctx.restore();
  }, [drawings, color, lineWidth, draggingTextId, tempDraggingPos, measureTextWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      redraw();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redraw]);

  useEffect(() => {
    redraw();
    currentPathRef.current = currentPath;
  }, [drawings, currentPath, redraw]);

  useEffect(() => {
    const onDrawingData = (drawing: DrawingItem) => {
      setDrawings((prev) => [...prev, drawing]);
    };
    const onDrawingClear = () => {
      setDrawings([]);
    };
    const onRoomJoined = (data: { drawings: DrawingItem[] }) => {
      if (data.drawings && Array.isArray(data.drawings)) {
        setDrawings(data.drawings);
      }
    };
    const onTextMoved = ({ textId, x, y }: { textId: string; x: number; y: number }) => {
      if (draggingTextId === textId) return;
      setDrawings((prev) =>
        prev.map((item) =>
          item.type === 'text' && item.id === textId
            ? { ...item, x, y }
            : item
        )
      );
    };

    socket.on('drawing:data', onDrawingData);
    socket.on('drawing:clear', onDrawingClear);
    socket.on('room:joined', onRoomJoined);
    socket.on('drawing:text-moved', onTextMoved);

    return () => {
      socket.off('drawing:data', onDrawingData);
      socket.off('drawing:clear', onDrawingClear);
      socket.off('room:joined', onRoomJoined);
      socket.off('drawing:text-moved', onTextMoved);
    };
  }, [socket, draggingTextId]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    if (showTextModal) return;

    const coords = getCanvasCoords(e);

    const hitText = hitTestText(coords.x, coords.y);
    if (hitText) {
      setDraggingTextId(hitText.id);
      setDragOffset({
        x: coords.x - hitText.x,
        y: coords.y - hitText.y,
      });
      setTempDraggingPos({ x: hitText.x, y: hitText.y });
      e.preventDefault();
      return;
    }

    setIsDrawing(true);
    const newPath = [coords];
    setCurrentPath(newPath);
    currentPathRef.current = newPath;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (draggingTextId) {
      const newX = coords.x - dragOffset.x;
      const newY = coords.y - dragOffset.y;
      setTempDraggingPos({ x: newX, y: newY });
      return;
    }

    if (!isDrawing) return;
    setCurrentPath((prev) => {
      const next = [...prev, coords];
      currentPathRef.current = next;
      return next;
    });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingTextId && tempDraggingPos) {
      setDrawings((prev) =>
        prev.map((item) =>
          item.type === 'text' && item.id === draggingTextId
            ? { ...item, x: tempDraggingPos.x, y: tempDraggingPos.y }
            : item
        )
      );
      socket.emit('drawing:move-text', {
        roomCode,
        textId: draggingTextId,
        x: tempDraggingPos.x,
        y: tempDraggingPos.y,
      });
      setDraggingTextId(null);
      setTempDraggingPos(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      const pathDrawing: DrawingPath = {
        type: 'path',
        points: currentPath,
        color,
        width: lineWidth,
        id: uuidv4(),
      };
      setDrawings((prev) => [...prev, pathDrawing]);
      socket.emit('drawing:data', { roomCode, drawing: pathDrawing });
    }
    setCurrentPath([]);
    currentPathRef.current = [];
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing || draggingTextId) return;

    const coords = getCanvasCoords(e);
    const hitText = hitTestText(coords.x, coords.y);

    if (!hitText) {
      setTextPos(coords);
      setTextInput('');
      setShowTextModal(true);
    }
  };

  const handleTextSubmit = () => {
    if (!textPos || !textInput.trim()) {
      setShowTextModal(false);
      setTextInput('');
      setTextPos(null);
      return;
    }

    const textDrawing: DrawingText = {
      type: 'text',
      x: textPos.x,
      y: textPos.y,
      text: textInput.trim(),
      color: color,
      id: uuidv4(),
    };
    setDrawings((prev) => [...prev, textDrawing]);
    socket.emit('drawing:data', { roomCode, drawing: textDrawing });

    setShowTextModal(false);
    setTextInput('');
    setTextPos(null);
  };

  const handleTextCancel = () => {
    setShowTextModal(false);
    setTextInput('');
    setTextPos(null);
  };

  const handleClear = () => {
    setDrawings([]);
    socket.emit('drawing:clear', { roomCode });
  };

  const getModalPosition = () => {
    if (!textPos || !canvasWrapperRef.current) return { left: 0, top: 0 };
    const canvas = canvasRef.current;
    if (!canvas) return { left: 0, top: 0 };

    const wrapperRect = canvasWrapperRef.current.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const scaleX = canvasRect.width / (canvas.width / window.devicePixelRatio);
    const scaleY = canvasRect.height / (canvas.height / window.devicePixelRatio);

    const canvasX = textPos.x * scaleX;
    const canvasY = textPos.y * scaleY;

    const relativeX = canvasX + (canvasRect.left - wrapperRect.left);
    const relativeY = canvasY + (canvasRect.top - wrapperRect.top);

    const modalWidth = 240;
    const modalHeight = 100;
    const offsetX = 10;
    const offsetY = -modalHeight - 10;

    let left = relativeX + offsetX;
    let top = relativeY + offsetY;

    if (left + modalWidth > wrapperRect.width) {
      left = relativeX - modalWidth - offsetX;
    }
    if (top < 5) {
      top = relativeY + 20;
    }
    if (top + modalHeight > wrapperRect.height - 5) {
      top = wrapperRect.height - modalHeight - 10;
    }
    if (left < 5) left = 5;

    return { left, top };
  };

  const modalPos = getModalPosition();

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          <span style={styles.toolLabel}>颜色:</span>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                ...styles.colorBtn,
                backgroundColor: c,
                border: color === c ? '2px solid #fff' : '2px solid transparent',
                boxShadow: color === c ? '0 0 0 2px #5b6cff' : 'none',
              }}
            />
          ))}
        </div>
        <div style={styles.toolGroup}>
          <span style={styles.toolLabel}>粗细:</span>
          {WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              style={{
                ...styles.widthBtn,
                backgroundColor: lineWidth === w ? '#5b6cff' : '#3a3b5e',
              }}
            >
              {w}px
            </button>
          ))}
        </div>
        <button onClick={handleClear} style={styles.clearBtn}>
          🗑️ 清空
        </button>
      </div>
      <div ref={canvasWrapperRef} style={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          style={{
            ...styles.canvas,
            cursor: draggingTextId ? 'grabbing' : 'crosshair',
          }}
        />
        {showTextModal && textPos && (
          <div
            style={{
              ...styles.textModal,
              left: modalPos.left,
              top: modalPos.top,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') handleTextCancel();
                e.stopPropagation();
              }}
              placeholder="输入文字..."
              style={{ ...styles.textInput, color: color }}
              onClick={(e) => e.stopPropagation()}
            />
            <div style={styles.textModalBtns}>
              <button onClick={handleTextSubmit} style={{ ...styles.modalBtn, backgroundColor: '#5b6cff' }}>
                确定
              </button>
              <button onClick={handleTextCancel} style={{ ...styles.modalBtn, backgroundColor: '#444' }}>
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#252640',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: '0 0 40%',
    minHeight: 0,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    padding: '8px',
    backgroundColor: '#1e1f35',
    borderRadius: '8px',
  },
  toolGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolLabel: {
    color: '#aaaacc',
    fontSize: '13px',
    marginRight: '4px',
  },
  colorBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'transform 0.2s',
  },
  widthBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'filter 0.2s, transform 0.2s',
  },
  clearBtn: {
    marginLeft: 'auto',
    padding: '8px 14px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#e53935',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'filter 0.2s, transform 0.2s',
  },
  canvasWrapper: {
    flex: 1,
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    minHeight: '200px',
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  textModal: {
    position: 'absolute',
    backgroundColor: 'rgba(20, 20, 45, 0.92)',
    backdropFilter: 'blur(10px)',
    padding: '12px',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 10,
    border: '1px solid rgba(255,255,255,0.15)',
  },
  textInput: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    fontSize: '14px',
    outline: 'none',
    width: '220px',
    fontWeight: 500,
  },
  textModalBtns: {
    display: 'flex',
    gap: '8px',
  },
  modalBtn: {
    flex: 1,
    padding: '8px 14px',
    borderRadius: '6px',
    border: 'none',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'filter 0.2s',
    fontWeight: 500,
  },
};
