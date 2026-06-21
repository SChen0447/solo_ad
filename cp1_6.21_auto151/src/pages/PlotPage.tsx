import { useEffect, useRef, useState, useCallback } from 'react';
import { api, type Plot, type Crop, type User } from '../utils/api';

interface PlotPageProps {
  currentUser: User | null;
}

const PLOT_SIZE = 5;
const CELL_SIZE = 80;
const GAP = 6;
const CANVAS_SIZE = PLOT_SIZE * CELL_SIZE + (PLOT_SIZE - 1) * GAP + 40;

const COLORS = {
  empty: '#81C784',
  claimed: '#64B5F6',
  mature: '#FFD54F',
  wilted: '#A1887F',
  emptyHover: '#A5D6A7',
  claimedHover: '#90CAF9',
  matureHover: '#FFE082',
  wiltedHover: '#BCAAA4',
};

function PlotPage({ currentUser }: PlotPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [hoveredPlot, setHoveredPlot] = useState<number | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const loadPlots = useCallback(async () => {
    try {
      const data = await api.getPlots();
      setPlots(data);
    } catch (error) {
      console.error('加载地块失败:', error);
    }
  }, []);

  const loadCrops = useCallback(async () => {
    try {
      const data = await api.getCrops();
      setCrops(data);
    } catch (error) {
      console.error('加载作物失败:', error);
    }
  }, []);

  useEffect(() => {
    loadPlots();
    loadCrops();
  }, [loadPlots, loadCrops]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || plots.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFF8E7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < PLOT_SIZE * PLOT_SIZE; i++) {
      const plot = plots[i];
      if (!plot) continue;

      const row = Math.floor(i / PLOT_SIZE);
      const col = i % PLOT_SIZE;
      const x = 20 + col * (CELL_SIZE + GAP);
      const y = 20 + row * (CELL_SIZE + GAP);

      const isHovered = hoveredPlot === i;
      let color = COLORS[plot.status as keyof typeof COLORS] || COLORS.empty;
      
      if (isHovered) {
        const hoverKey = `${plot.status}Hover` as keyof typeof COLORS;
        color = COLORS[hoverKey] || color;
      }

      const radius = 12;
      ctx.beginPath();
      ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, radius);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, radius);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (plot.cropEmoji) {
        ctx.font = '32px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(plot.cropEmoji, x + CELL_SIZE / 2, y + CELL_SIZE / 2 - 8);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillText(plot.cropName || '', x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 18);
      } else if (plot.status === 'empty') {
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('+', x + CELL_SIZE / 2, y + CELL_SIZE / 2);
      }
    }

    if (hoveredPlot !== null && plots[hoveredPlot]) {
      const plot = plots[hoveredPlot];
      if (plot.status === 'empty' && currentUser) {
        const row = Math.floor(hoveredPlot / PLOT_SIZE);
        const col = hoveredPlot % PLOT_SIZE;
        const x = 20 + col * (CELL_SIZE + GAP);
        const y = 20 + row * (CELL_SIZE + GAP);

        ctx.strokeStyle = '#FFB300';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, CELL_SIZE + 4, CELL_SIZE + 4, 14);
        ctx.stroke();
      }
    }
  }, [plots, hoveredPlot, currentUser]);

  const getPlotAtPosition = (clientX: number, clientY: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return -1;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX - 20;
    const y = (clientY - rect.top) * scaleY - 20;

    if (x < 0 || y < 0) return -1;

    const col = Math.floor(x / (CELL_SIZE + GAP));
    const row = Math.floor(y / (CELL_SIZE + GAP));

    if (col >= 0 && col < PLOT_SIZE && row >= 0 && row < PLOT_SIZE) {
      const cellX = col * (CELL_SIZE + GAP);
      const cellY = row * (CELL_SIZE + GAP);
      if (x < cellX + CELL_SIZE && y < cellY + CELL_SIZE) {
        return row * PLOT_SIZE + col;
      }
    }

    return -1;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const index = getPlotAtPosition(e.clientX, e.clientY);
    setHoveredPlot(index >= 0 ? index : null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const index = getPlotAtPosition(e.clientX, e.clientY);
    if (index < 0 || !currentUser) return;

    const plot = plots[index];
    if (plot && plot.status === 'empty') {
      setSelectedPlot(plot);
      setSelectedCrop(null);
      setShowClaimModal(true);
    }
  };

  const handleClaim = async () => {
    if (!selectedPlot || !selectedCrop || !currentUser) return;
    
    setIsClaiming(true);
    try {
      await api.claimPlot(selectedPlot.id, currentUser.id, selectedCrop.id);
      await loadPlots();
      setShowClaimModal(false);
      setSelectedPlot(null);
      setSelectedCrop(null);
    } catch (error: any) {
      alert(error.message || '认领失败');
    } finally {
      setIsClaiming(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      empty: '空闲',
      claimed: '已认领',
      mature: '已成熟',
      wilted: '已萎蔫',
    };
    return labels[status] || status;
  };

  return (
    <div>
      <h2 className="page-title">🌾 菜地认领</h2>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        {Object.entries(COLORS).filter(([key]) => !key.includes('Hover')).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div 
              style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '4px', 
                backgroundColor: color 
              }} 
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-medium)' }}>
              {getStatusLabel(status)}
            </span>
          </div>
        ))}
      </div>

      <div className="plot-grid-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="plot-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPlot(null)}
          onClick={handleClick}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-medium)', fontSize: '0.9rem' }}>
        点击空闲地块即可认领，选择你想种植的蔬菜吧！
      </p>

      {showClaimModal && selectedPlot && (
        <div className="modal-overlay" onClick={() => setShowClaimModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">🌱 选择要种植的蔬菜</h3>
            <p style={{ color: 'var(--text-medium)', marginBottom: '16px', fontSize: '0.9rem' }}>
              第 {selectedPlot.row + 1} 行，第 {selectedPlot.col + 1} 列
            </p>
            
            <div className="crop-selector list-scroll">
              {crops.map(crop => (
                <div
                  key={crop.id}
                  className={`crop-option ${selectedCrop?.id === crop.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCrop(crop)}
                >
                  <span className="crop-option-emoji">{crop.emoji}</span>
                  <span className="crop-option-name">{crop.name}</span>
                </div>
              ))}
            </div>

            {selectedCrop && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#F5F5F5', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '8px' }}>
                  {selectedCrop.emoji} {selectedCrop.name}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-medium)' }}>
                  生长周期：{selectedCrop.stages.seed + selectedCrop.stages.sprout + selectedCrop.stages.bloom + selectedCrop.stages.harvest}天
                  （播种{selectedCrop.stages.seed}天 → 发芽{selectedCrop.stages.sprout}天 → 开花{selectedCrop.stages.bloom}天 → 收获{selectedCrop.stages.harvest}天）
                </p>
              </div>
            )}

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowClaimModal(false)}
              >
                取消
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleClaim}
                disabled={!selectedCrop || isClaiming}
              >
                {isClaiming ? '认领中...' : '确认认领'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlotPage;
