export type ToolType = 'brush' | 'eraser' | 'select' | 'line' | 'text';

export interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface ToolState {
  color: string;
  brushSize: number;
  brightness: number;
}

export interface DrawAction {
  type: ToolType;
  points: Point[];
  color: string;
  brushSize: number;
  text?: string;
}

export interface Tool {
  type: ToolType;
  onPointerDown: (ctx: CanvasRenderingContext2D, overlayCtx: CanvasRenderingContext2D, point: Point, state: ToolState) => void;
  onPointerMove: (ctx: CanvasRenderingContext2D, overlayCtx: CanvasRenderingContext2D, point: Point, state: ToolState) => void;
  onPointerUp: (ctx: CanvasRenderingContext2D, overlayCtx: CanvasRenderingContext2D, point: Point, state: ToolState) => DrawAction | null;
  clearOverlay: (overlayCtx: CanvasRenderingContext2D) => void;
}

let isDrawing = false;
let currentPoints: Point[] = [];
let startPoint: Point | null = null;

function drawBrushStroke(ctx: CanvasRenderingContext2D, points: Point[], color: string, baseSize: number) {
  if (points.length < 2) {
    const p = points[0];
    const size = baseSize * (0.5 + p.pressure * 0.5);
    ctx.beginPath();
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    return;
  }

  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const size0 = baseSize * (0.5 + p0.pressure * 0.5);
    const size1 = baseSize * (0.5 + p1.pressure * 0.5);

    const dist = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
    const steps = Math.max(1, Math.floor(dist / 2));

    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const x = p0.x + (p1.x - p0.x) * t;
      const y = p0.y + (p1.y - p0.y) * t;
      const size = size0 + (size1 - size0) * t;

      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
}

function clearOverlayCanvas(overlayCtx: CanvasRenderingContext2D) {
  overlayCtx.clearRect(0, 0, overlayCtx.canvas.width, overlayCtx.canvas.height);
}

const brushTool: Tool = {
  type: 'brush',
  onPointerDown(_ctx, _overlayCtx, point, _state) {
    isDrawing = true;
    currentPoints = [point];
  },
  onPointerMove(ctx, _overlayCtx, point, state) {
    if (!isDrawing) return;
    currentPoints.push(point);
    const lastTwo = currentPoints.slice(-2);
    drawBrushStroke(ctx, lastTwo, state.color, state.brushSize);
  },
  onPointerUp(_ctx, _overlayCtx, point, state) {
    if (!isDrawing) return null;
    isDrawing = false;
    currentPoints.push(point);

    const action: DrawAction = {
      type: 'brush',
      points: [...currentPoints],
      color: state.color,
      brushSize: state.brushSize,
    };

    currentPoints = [];
    return action;
  },
  clearOverlay: clearOverlayCanvas,
};

const eraserTool: Tool = {
  type: 'eraser',
  onPointerDown(_ctx, _overlayCtx, point, _state) {
    isDrawing = true;
    currentPoints = [point];
  },
  onPointerMove(ctx, _overlayCtx, point, state) {
    if (!isDrawing) return;
    currentPoints.push(point);
    const p = point;
    const size = state.brushSize * 2 * (0.5 + p.pressure * 0.5);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();
    ctx.restore();
  },
  onPointerUp(_ctx, _overlayCtx, point, state) {
    if (!isDrawing) return null;
    isDrawing = false;
    currentPoints.push(point);

    const action: DrawAction = {
      type: 'eraser',
      points: [...currentPoints],
      color: '#FFFFFF',
      brushSize: state.brushSize * 2,
    };

    currentPoints = [];
    return action;
  },
  clearOverlay: clearOverlayCanvas,
};

const selectTool: Tool = {
  type: 'select',
  onPointerDown(_ctx, overlayCtx, point, _state) {
    isDrawing = true;
    startPoint = point;
    clearOverlayCanvas(overlayCtx);
  },
  onPointerMove(_ctx, overlayCtx, point, _state) {
    if (!isDrawing || !startPoint) return;
    clearOverlayCanvas(overlayCtx);

    overlayCtx.strokeStyle = 'rgba(0, 120, 255, 0.8)';
    overlayCtx.fillStyle = 'rgba(0, 120, 255, 0.15)';
    overlayCtx.lineWidth = 1.5;
    overlayCtx.setLineDash([5, 3]);

    const x = Math.min(startPoint.x, point.x);
    const y = Math.min(startPoint.y, point.y);
    const w = Math.abs(point.x - startPoint.x);
    const h = Math.abs(point.y - startPoint.y);

    overlayCtx.fillRect(x, y, w, h);
    overlayCtx.strokeRect(x, y, w, h);
  },
  onPointerUp(_ctx, overlayCtx, point, _state) {
    if (!isDrawing || !startPoint) return null;
    isDrawing = false;
    clearOverlayCanvas(overlayCtx);

    const action: DrawAction = {
      type: 'select',
      points: [startPoint, point],
      color: 'transparent',
      brushSize: 0,
    };

    startPoint = null;
    return action;
  },
  clearOverlay: clearOverlayCanvas,
};

const lineTool: Tool = {
  type: 'line',
  onPointerDown(_ctx, overlayCtx, point, state) {
    isDrawing = true;
    startPoint = point;
    clearOverlayCanvas(overlayCtx);

    overlayCtx.strokeStyle = hexToRgba(state.color, 0.5);
    overlayCtx.lineWidth = state.brushSize;
    overlayCtx.lineCap = 'round';
  },
  onPointerMove(_ctx, overlayCtx, point, state) {
    if (!isDrawing || !startPoint) return;
    clearOverlayCanvas(overlayCtx);

    overlayCtx.strokeStyle = hexToRgba(state.color, 0.5);
    overlayCtx.lineWidth = state.brushSize;
    overlayCtx.lineCap = 'round';

    overlayCtx.beginPath();
    overlayCtx.moveTo(startPoint.x, startPoint.y);
    overlayCtx.lineTo(point.x, point.y);
    overlayCtx.stroke();
  },
  onPointerUp(ctx, overlayCtx, point, state) {
    if (!isDrawing || !startPoint) return null;
    isDrawing = false;
    clearOverlayCanvas(overlayCtx);

    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.brushSize;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    const action: DrawAction = {
      type: 'line',
      points: [startPoint, point],
      color: state.color,
      brushSize: state.brushSize,
    };

    startPoint = null;
    return action;
  },
  clearOverlay: clearOverlayCanvas,
};

const textTool: Tool = {
  type: 'text',
  onPointerDown(_ctx, _overlayCtx, _point, _state) {},
  onPointerMove(_ctx, _overlayCtx, _point, _state) {},
  onPointerUp(ctx, _overlayCtx, point, state) {
    showTextInput(point, (text: string) => {
      ctx.font = '24px sans-serif';
      ctx.fillStyle = state.color;
      ctx.fillText(text, point.x, point.y);
    });

    return {
      type: 'text',
      points: [point],
      color: state.color,
      brushSize: 24,
      text: '',
    };
  },
  clearOverlay: clearOverlayCanvas,
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function showTextInput(point: Point, callback: (text: string) => void) {
  const existing = document.querySelector('.text-input-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'text-input-popup';
  popup.style.left = `${point.x + 10}px`;
  popup.style.top = `${point.y + 10}px`;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '输入文字...';
  input.autofocus = true;

  const btn = document.createElement('button');
  btn.textContent = '确定';

  popup.appendChild(input);
  popup.appendChild(btn);
  document.body.appendChild(popup);

  setTimeout(() => input.focus(), 10);

  const confirm = () => {
    if (input.value.trim()) {
      callback(input.value.trim());
    }
    popup.remove();
  };

  btn.addEventListener('click', confirm);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') {
      popup.remove();
    }
  });
}

export function createTool(type: ToolType): Tool {
  switch (type) {
    case 'brush':
      return brushTool;
    case 'eraser':
      return eraserTool;
    case 'select':
      return selectTool;
    case 'line':
      return lineTool;
    case 'text':
      return textTool;
    default:
      return brushTool;
  }
}

export function replayAction(ctx: CanvasRenderingContext2D, action: DrawAction) {
  switch (action.type) {
    case 'brush':
      drawBrushStroke(ctx, action.points, action.color, action.brushSize);
      break;
    case 'eraser':
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      drawBrushStroke(ctx, action.points, 'rgba(0,0,0,1)', action.brushSize);
      ctx.restore();
      break;
    case 'line':
      if (action.points.length >= 2) {
        ctx.strokeStyle = action.color;
        ctx.lineWidth = action.brushSize;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        ctx.lineTo(action.points[1].x, action.points[1].y);
        ctx.stroke();
      }
      break;
    case 'text':
      if (action.text && action.points.length > 0) {
        ctx.font = `${action.brushSize}px sans-serif`;
        ctx.fillStyle = action.color;
        ctx.fillText(action.text, action.points[0].x, action.points[0].y);
      }
      break;
    case 'select':
      break;
  }
}
