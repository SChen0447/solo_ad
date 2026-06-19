import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';

interface OnlineUser {
  id: string;
  color: string;
}

interface CanvasBoardProps {
  brushColor: string;
  brushThickness: number;
  onlineUsers: OnlineUser[];
  userId: string;
  onUndoCountChange: (count: number) => void;
}

export interface CanvasBoardHandle {
  clear: () => void;
  undo: () => void;
  sync: () => void;
  savePng: () => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const STORAGE_KEY = 'pixel-collab-board-data';

const CanvasBoard = forwardRef<CanvasBoardHandle, CanvasBoardProps>(({
  brushColor,
  brushThickness,
  onlineUsers,
  userId,
  onUndoCountChange,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [flashWhite, setFlashWhite] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const pushUndoState = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const canvas = canvasRef.current!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStackRef.current.push(imageData);
    if (undoStackRef.current.length > 5) {
      undoStackRef.current.shift();
    }
    onUndoCountChange(undoStackRef.current.length);
  }, [getCtx, onUndoCountChange]);

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const drawLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushThickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, [brushColor, brushThickness, getCtx]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    pushUndoState();
    isDrawingRef.current = true;
    lastPointRef.current = point;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, brushThickness / 2, 0, Math.PI * 2);
    ctx.fillStyle = brushColor;
    ctx.fill();
  }, [brushColor, brushThickness, getCanvasPoint, getCtx, pushUndoState]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (point) {
      setCoords({ x: Math.round(point.x), y: Math.round(point.y) });
    }
    if (!isDrawingRef.current || !point) return;
    if (lastPointRef.current) {
      drawLine(lastPointRef.current, point);
    }
    lastPointRef.current = point;
  }, [drawLine, getCanvasPoint]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCoords(null);
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const ctx = getCtx();
      if (!ctx) return;
      setFlashWhite(true);
      setTimeout(() => setFlashWhite(false), 200);
      setIsClearing(true);
      setTimeout(() => {
        const canvas = canvasRef.current!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        undoStackRef.current = [];
        onUndoCountChange(0);
        setIsClearing(false);
      }, 500);
    },
    undo: () => {
      if (undoStackRef.current.length === 0) return;
      const ctx = getCtx();
      if (!ctx) return;
      const canvas = canvasRef.current!;
      const prevData = undoStackRef.current[undoStackRef.current.length - 1];
      const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const animDuration = 300;
      const startTime = performance.now();
      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / animDuration, 1);
        const revealWidth = Math.floor(canvas.width * progress);
        const blended = new ImageData(
          new Uint8ClampedArray(currentData.data),
          canvas.width,
          canvas.height
        );
        for (let px = 0; px < revealWidth; px++) {
          for (let py = 0; py < canvas.height; py++) {
            const idx = (py * canvas.width + px) * 4;
            blended.data[idx] = prevData.data[idx];
            blended.data[idx + 1] = prevData.data[idx + 1];
            blended.data[idx + 2] = prevData.data[idx + 2];
            blended.data[idx + 3] = prevData.data[idx + 3];
          }
        }
        ctx.putImageData(blended, 0, 0);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          ctx.putImageData(prevData, 0, 0);
          undoStackRef.current.pop();
          onUndoCountChange(undoStackRef.current.length);
        }
      };
      requestAnimationFrame(animate);
    },
    sync: () => {
      const ctx = getCtx();
      if (!ctx) return;
      const canvas = canvasRef.current!;
      const currentDataUrl = canvas.toDataURL('image/png');
      const storedRaw = localStorage.getItem(STORAGE_KEY);
      if (storedRaw) {
        try {
          const stored = JSON.parse(storedRaw);
          if (stored.imageData) {
            const img = new Image();
            img.onload = () => {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = CANVAS_WIDTH;
              tempCanvas.height = CANVAS_HEIGHT;
              const tempCtx = tempCanvas.getContext('2d')!;
              tempCtx.fillStyle = '#FFFFFF';
              tempCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
              tempCtx.drawImage(img, 0, 0);
              const storedPixels = tempCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
              const currentPixels = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
              for (let i = 0; i < currentPixels.data.length; i += 4) {
                const currR = currentPixels.data[i];
                const currG = currentPixels.data[i + 1];
                const currB = currentPixels.data[i + 2];
                const currA = currentPixels.data[i + 3];
                const isBackground = currA === 0 || (currR === 255 && currG === 255 && currB === 255);
                if (isBackground && storedPixels.data[i + 3] > 0) {
                  currentPixels.data[i] = storedPixels.data[i];
                  currentPixels.data[i + 1] = storedPixels.data[i + 1];
                  currentPixels.data[i + 2] = storedPixels.data[i + 2];
                  currentPixels.data[i + 3] = storedPixels.data[i + 3];
                }
              }
              ctx.putImageData(currentPixels, 0, 0);
            };
            img.src = stored.imageData;
          }
        } catch {
          // ignore parse errors
        }
      }
      const saveData = {
        imageData: currentDataUrl,
        timestamp: Date.now(),
        userId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    },
    savePng: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `pixel-board-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    },
  }), [getCtx, onUndoCountChange, userId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        position: 'absolute',
        top: 8,
        left: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        zIndex: 2,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: 13,
          color: '#666',
          animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          在线: {onlineUsers.length}
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {onlineUsers.map((user, idx) => (
            <div
              key={user.id}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: user.color,
                flexShrink: 0,
                marginLeft: idx > 0 ? 4 : 0,
                animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          ))}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          border: '1px solid #DDD',
          cursor: 'crosshair',
          maxWidth: '100%',
          maxHeight: '100%',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.4'%3E%3Cpath d='M3 0h3v3H3zM0 3h3v3H0z'/%3E%3C/g%3E%3C/svg%3E")`,
          opacity: isClearing ? 0 : flashWhite ? 0.7 : 1,
          transition: isClearing
            ? 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            : flashWhite
              ? 'opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'none',
        }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      {coords && !isClearing && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          fontSize: 12,
          color: '#666',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          zIndex: 2,
        }}>
          X:{coords.x} Y:{coords.y}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
});

CanvasBoard.displayName = 'CanvasBoard';

export default CanvasBoard;
