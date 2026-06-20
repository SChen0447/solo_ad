import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Cell, CellType, GRID_SIZE } from '../modules/ecosystemLogic';

interface GridCanvasProps {
  grid: Cell[][];
  onCellClick: (x: number, y: number, type: CellType, hp: number) => void;
}

const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

const COLORS: Record<CellType, string> = {
  plant: '#6a994e',
  carnivore: '#a44d3b',
  decomposer: '#b5838d',
  empty: '#16213e',
  dead: '#3a3a4a',
};

const TYPE_LABELS: Record<CellType, string> = {
  plant: '光合植物',
  carnivore: '肉食动物',
  decomposer: '腐生菌',
  empty: '空地',
  dead: '死亡细胞',
};

export const GridCanvas: React.FC<GridCanvasProps> = ({ grid, onCellClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [popup, setPopup] = useState<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
  const [selectedType, setSelectedType] = useState<CellType>('plant');
  const [selectedHp, setSelectedHp] = useState<number>(5);
  const animFrameRef = useRef<number>(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = grid[y][x];
        ctx.fillStyle = COLORS[cell.type];
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    if (hoverCell) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoverCell.x * CELL_SIZE + 1,
        hoverCell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [grid, hoverCell]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const mx = Math.floor((e.clientX - rect.left) * scaleX / CELL_SIZE);
    const my = Math.floor((e.clientY - rect.top) * scaleY / CELL_SIZE);
    if (mx >= 0 && mx < GRID_SIZE && my >= 0 && my < GRID_SIZE) {
      setHoverCell({ x: mx, y: my });
    } else {
      setHoverCell(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverCell(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const mx = Math.floor((e.clientX - rect.left) * scaleX / CELL_SIZE);
    const my = Math.floor((e.clientY - rect.top) * scaleY / CELL_SIZE);
    if (mx >= 0 && mx < GRID_SIZE && my >= 0 && my < GRID_SIZE) {
      const currentCell = grid[my][mx];
      setSelectedType(currentCell.type === 'empty' || currentCell.type === 'dead' ? 'plant' : currentCell.type);
      setSelectedHp(currentCell.type === 'carnivore' ? Math.max(1, currentCell.hp || 5) : 5);
      setPopup({ x: mx, y: my, screenX: e.clientX, screenY: e.clientY });
    }
  };

  const handleConfirm = () => {
    if (popup) {
      onCellClick(popup.x, popup.y, selectedType, selectedType === 'carnivore' ? selectedHp : 0);
      setPopup(null);
    }
  };

  const handleClose = () => {
    setPopup(null);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{
          cursor: 'pointer',
          imageRendering: 'pixelated',
          maxWidth: '100%',
          maxHeight: '100%',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCanvasClick}
      />
      {popup && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(popup.screenX + 12, window.innerWidth - 240),
            top: Math.min(popup.screenY + 12, window.innerHeight - 260),
            width: '220px',
            padding: '14px',
            borderRadius: '8px',
            background: '#2b2b2b',
            border: '1px solid #555',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            zIndex: 1000,
            color: '#eee',
            fontSize: '13px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '12px', color: '#fff', fontSize: '14px' }}>
            格子 ({popup.x}, {popup.y})
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#aaa' }}>类型</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as CellType)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                background: '#3a3a3a',
                color: '#eee',
                border: '1px solid #555',
                outline: 'none',
              }}
            >
              <option value="empty">空地</option>
              <option value="plant">{TYPE_LABELS.plant}</option>
              <option value="carnivore">{TYPE_LABELS.carnivore}</option>
              <option value="decomposer">{TYPE_LABELS.decomposer}</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#aaa' }}>颜色预览</label>
            <div
              style={{
                width: '100%',
                height: '24px',
                borderRadius: '4px',
                background: COLORS[selectedType],
                border: '1px solid #555',
              }}
            />
          </div>

          {selectedType === 'carnivore' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#aaa' }}>
                初始生命值: {selectedHp}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={selectedHp}
                onChange={(e) => setSelectedHp(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#777', marginTop: '2px' }}>
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleConfirm}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: 'none',
                background: '#4a7c59',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              确认
            </button>
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #555',
                background: '#3a3a3a',
                color: '#eee',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
