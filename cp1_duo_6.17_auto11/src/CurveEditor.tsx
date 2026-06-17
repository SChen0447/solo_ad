import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BezierCurve } from './types';

interface CurveEditorProps {
  curve: BezierCurve;
  onChange: (curve: BezierCurve) => void;
}

const CANVAS_SIZE = 280;
const PADDING = 30;
const GRAPH_SIZE = CANVAS_SIZE - PADDING * 2;
const HANDLE_RADIUS = 8;

const CurveEditor: React.FC<CurveEditorProps> = ({ curve, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);
  const [hoverHandle, setHoverHandle] = useState<'p1' | 'p2' | null>(null);
  const animationRef = useRef<number>();
  const targetCurveRef = useRef<BezierCurve>(curve);
  const currentCurveRef = useRef<BezierCurve>(curve);

  const curveToCanvas = useCallback((x: number, y: number) => {
    return {
      x: PADDING + x * GRAPH_SIZE,
      y: PADDING + (1 - y) * GRAPH_SIZE
    };
  }, []);

  const canvasToCurve = useCallback((x: number, y: number) => {
    return {
      x: Math.max(0, Math.min(1, (x - PADDING) / GRAPH_SIZE)),
      y: Math.max(-0.5, Math.min(1.5, 1 - (y - PADDING) / GRAPH_SIZE))
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const c = currentCurveRef.current;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const pos = PADDING + (GRAPH_SIZE / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pos, PADDING);
      ctx.lineTo(pos, PADDING + GRAPH_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PADDING, pos);
      ctx.lineTo(PADDING + GRAPH_SIZE, pos);
      ctx.stroke();
    }

    ctx.strokeStyle = '#4a4a6e';
    ctx.lineWidth = 2;
    ctx.strokeRect(PADDING, PADDING, GRAPH_SIZE, GRAPH_SIZE);

    const p0 = curveToCanvas(0, 0);
    const p1 = curveToCanvas(c.p1x, c.p1y);
    const p2 = curveToCanvas(c.p2x, c.p2y);
    const p3 = curveToCanvas(1, 1);

    ctx.strokeStyle = 'rgba(74, 144, 217, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const gradient = ctx.createLinearGradient(p0.x, p0.y, p3.x, p3.y);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    ctx.stroke();

    const p1Color = dragging === 'p1' || hoverHandle === 'p1' ? '#FF6B35' : '#4A90D9';
    const p2Color = dragging === 'p2' || hoverHandle === 'p2' ? '#FF6B35' : '#4A90D9';

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p3.x, p3.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p1Color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = p2Color;
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }, [curveToCanvas, dragging, hoverHandle]);

  const animate = useCallback(() => {
    const target = targetCurveRef.current;
    const current = currentCurveRef.current;
    const ease = 0.25;

    let changed = false;
    const keys: (keyof BezierCurve)[] = ['p1x', 'p1y', 'p2x', 'p2y'];
    keys.forEach(key => {
      const diff = target[key] - current[key];
      if (Math.abs(diff) > 0.0001) {
        current[key] = current[key] + diff * ease;
        changed = true;
      } else {
        current[key] = target[key];
      }
    });

    draw();

    if (changed || dragging) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [draw, dragging]);

  useEffect(() => {
    targetCurveRef.current = curve;
    if (!animationRef.current) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [curve, animate]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const getHandleAtPosition = useCallback((x: number, y: number): 'p1' | 'p2' | null => {
    const c = currentCurveRef.current;
    const p1 = curveToCanvas(c.p1x, c.p1y);
    const p2 = curveToCanvas(c.p2x, c.p2y);

    const d1 = Math.sqrt((x - p1.x) ** 2 + (y - p1.y) ** 2);
    const d2 = Math.sqrt((x - p2.x) ** 2 + (y - p2.y) ** 2);

    if (d1 <= HANDLE_RADIUS + 4) return 'p1';
    if (d2 <= HANDLE_RADIUS + 4) return 'p2';
    return null;
  }, [curveToCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const handle = getHandleAtPosition(x, y);
    if (handle) {
      setDragging(handle);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (dragging) {
      const pos = canvasToCurve(x, y);
      const newCurve = { ...currentCurveRef.current };
      if (dragging === 'p1') {
        newCurve.p1x = pos.x;
        newCurve.p1y = pos.y;
      } else {
        newCurve.p2x = pos.x;
        newCurve.p2y = pos.y;
      }
      targetCurveRef.current = newCurve;
      currentCurveRef.current = { ...newCurve };
      onChange(newCurve);
      draw();
    } else {
      const handle = getHandleAtPosition(x, y);
      setHoverHandle(handle);
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleMouseLeave = () => {
    setDragging(null);
    setHoverHandle(null);
  };

  const handleInputChange = (key: keyof BezierCurve, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const newCurve = { ...curve };
    if (key === 'p1x' || key === 'p2x') {
      newCurve[key] = Math.max(0, Math.min(1, num));
    } else {
      newCurve[key] = Math.max(-0.5, Math.min(1.5, num));
    }
    onChange(newCurve);
  };

  const handleStepChange = (key: keyof BezierCurve, delta: number) => {
    const newCurve = { ...curve };
    let newValue = newCurve[key] + delta;
    if (key === 'p1x' || key === 'p2x') {
      newValue = Math.max(0, Math.min(1, newValue));
    } else {
      newValue = Math.max(-0.5, Math.min(1.5, newValue));
    }
    newCurve[key] = Math.round(newValue * 1000) / 1000;
    onChange(newCurve);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>曲线编辑</h3>
      <div style={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      <div style={styles.paramsGrid}>
        {(['p1x', 'p1y', 'p2x', 'p2y'] as const).map((key) => (
          <div key={key} style={styles.paramItem}>
            <label style={styles.paramLabel}>
              {key === 'p1x' ? 'P1.x' : key === 'p1y' ? 'P1.y' : key === 'p2x' ? 'P2.x' : 'P2.y'}
            </label>
            <div style={styles.inputWrapper}>
              <input
                type="number"
                step="0.001"
                min={key === 'p1x' || key === 'p2x' ? 0 : -0.5}
                max={key === 'p1x' || key === 'p2x' ? 1 : 1.5}
                value={curve[key].toFixed(3)}
                onChange={(e) => handleInputChange(key, e.target.value)}
                style={styles.paramInput}
              />
              <div style={styles.stepButtons}>
                <button
                  type="button"
                  style={styles.stepButton}
                  onClick={() => handleStepChange(key, 0.01)}
                >
                  +
                </button>
                <button
                  type="button"
                  style={styles.stepButton}
                  onClick={() => handleStepChange(key, -0.01)}
                >
                  −
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    height: '100%',
    gap: '16px'
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: '8px'
  },
  canvasWrapper: {
    backgroundColor: '#0f0f23',
    borderRadius: '8px',
    padding: '10px',
    border: '1px solid #2a2a4e'
  },
  canvas: {
    display: 'block',
    cursor: 'default'
  },
  paramsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    width: '100%'
  },
  paramItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  paramLabel: {
    fontSize: '12px',
    color: '#a0a0c0'
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  paramInput: {
    backgroundColor: '#0f0f23',
    border: '1px solid #2a2a4e',
    borderRadius: '4px',
    padding: '8px 10px',
    color: '#e0e0e0',
    fontSize: '14px',
    fontFamily: 'monospace',
    outline: 'none',
    flex: 1,
    minWidth: 0,
    height: '34px'
  },
  stepButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    height: '34px'
  },
  stepButton: {
    width: '26px',
    height: '16px',
    backgroundColor: '#2a2a4e',
    border: '1px solid #3a3a5e',
    borderRadius: '3px',
    color: '#a0a0c0',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'monospace',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    lineHeight: 1,
    transition: 'all 0.15s ease'
  }
};

export default CurveEditor;
