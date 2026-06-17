import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../store/gameStore';
import { CLASS_COLORS } from '../../data/heroes';
import { BattleFrame, BattleUnit } from '../../types';
import './ReplayViewer.css';

const GRID_SIZE = 8;

interface ReplayViewerProps {
  frames?: BattleFrame[];
  onExport?: () => void;
  showControls?: boolean;
  cellSize?: number;
}

export default function ReplayViewer({ frames: propFrames, onExport, showControls = true, cellSize: propCellSize }: ReplayViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const { state } = useAppStore();
  const frames = propFrames || state.currentFrames;

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cellSize, setCellSize] = useState(60);
  const [previewPos, setPreviewPos] = useState<{ x: number; frame: number } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth - 40;
        const h = containerRef.current.clientHeight - 140;
        const size = Math.floor(Math.min(w, h) / GRID_SIZE);
        const clamped = Math.max(50, Math.min(70, size));
        setCellSize(clamped);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const gridWidth = cellSize * GRID_SIZE;
  const gridHeight = cellSize * GRID_SIZE;

  const drawFrame = useCallback((frameIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = frames[Math.min(frameIdx, frames.length - 1)];
    if (!frame) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.3;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, gridHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(gridWidth, i * cellSize);
      ctx.stroke();
    }

    const drawUnit = (unit: BattleUnit) => {
      const x = unit.position.x * cellSize;
      const y = unit.position.y * cellSize;
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      const radius = cellSize * 0.38;

      const color = unit.isEnemy ? '#ef4444' : CLASS_COLORS[unit.heroClass] || '#888';
      const isDead = unit.actionState === 'dead' || unit.hp <= 0;

      ctx.save();
      if (isDead) {
        ctx.globalAlpha = 0.3;
      }

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.6);
      gradient.addColorStop(0, color + (isDead ? '30' : '50'));
      gradient.addColorStop(1, color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2a2a3a';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = `${Math.floor(cellSize * 0.35)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(unit.avatar, cx, cy);

      const hpPct = Math.max(0, unit.hp) / unit.maxHp;
      const hpPctInt = Math.max(0, Math.round(hpPct * 100));
      const barW = radius * 1.8;
      const barH = 5;
      const barX = cx - barW / 2;
      const barY = cy + radius + 8;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);

      let hpColor = '#22c55e';
      if (hpPct <= 0.25) hpColor = '#ef4444';
      else if (hpPct <= 0.5) hpColor = '#eab308';

      const r = parseInt(hpColor.slice(1, 3), 16);
      const g = parseInt(hpColor.slice(3, 5), 16);
      const b = parseInt(hpColor.slice(5, 7), 16);

      const gR = Math.round(34 + (239 - 34) * (1 - hpPct));
      const gG = Math.round(197 + (68 - 197) * (1 - hpPct));
      const gB = Math.round(94 + (68 - 68) * (1 - hpPct));

      ctx.fillStyle = `rgb(${gR}, ${gG}, ${gB})`;
      ctx.fillRect(barX, barY, barW * hpPct, barH);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(`${hpPctInt}%`, cx, barY + barH + 10);

      if (unit.actionState === 'attacking' || unit.actionState === 'casting') {
        ctx.strokeStyle = unit.isEnemy ? '#ef4444' : '#fbbf24';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    };

    for (const unit of frame.units) {
      drawUnit(unit);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${frame.turn} 回合`, 10, 22);
  }, [frames, cellSize, gridWidth, gridHeight]);

  useEffect(() => {
    drawFrame(currentFrame);
  }, [currentFrame, drawFrame]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const frameInterval = 1000 / (60 * speed);

    const animate = (timestamp: number) => {
      if (timestamp - lastTimeRef.current >= frameInterval) {
        lastTimeRef.current = timestamp;
        setCurrentFrame((prev) => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed, frames.length]);

  const handlePlayPause = () => {
    if (currentFrame >= frames.length - 1) {
      setCurrentFrame(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || frames.length === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const frame = Math.floor(pct * (frames.length - 1));
    setCurrentFrame(Math.max(0, Math.min(frames.length - 1, frame)));
  };

  const handleProgressMouseMove = (e: React.MouseEvent) => {
    if (!progressRef.current || frames.length === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const frame = Math.floor(pct * (frames.length - 1));
    setPreviewPos({ x: e.clientX - rect.left, frame: Math.max(0, Math.min(frames.length - 1, frame)) });
  };

  const handleProgressMouseLeave = () => {
    setPreviewPos(null);
  };

  const exportReplay = () => {
    if (!frames.length) return;
    const data = JSON.stringify({ frames, id: 'replay-' + Date.now() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `battle-replay-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onExport) onExport();
  };

  const currentFrameData = frames[currentFrame];
  const progressPct = frames.length > 0 ? (currentFrame / (frames.length - 1)) * 100 : 0;

  return (
    <div className="replay-viewer" ref={containerRef}>
      <div className="replay-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={gridWidth}
          height={gridHeight}
          className="replay-canvas"
        />
        {currentFrameData && (
          <div className="replay-log">{currentFrameData.log}</div>
        )}
      </div>

      {showControls && (
        <div className="replay-controls">
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlayPause}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div
            className="progress-bar"
            ref={progressRef}
            onClick={handleProgressClick}
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={handleProgressMouseLeave}
          >
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div
              className="progress-thumb"
              style={{ left: `calc(${progressPct}% - 7px)` }}
            />
            {previewPos && (
              <div
                className="frame-preview"
                style={{ left: previewPos.x - 40 }}
              >
                <div className="preview-frame">帧 {previewPos.frame}</div>
                <div className="preview-time">
                  第 {frames[previewPos.frame]?.turn || 0} 回合
                </div>
              </div>
            )}
          </div>

          <div className="frame-info">
            {currentFrame + 1} / {frames.length}
          </div>

          <div className="speed-controls">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                className={`speed-btn ${speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          <button className="export-btn" onClick={exportReplay} title="导出回放">
            ⬇ 导出
          </button>
        </div>
      )}
    </div>
  );
}
