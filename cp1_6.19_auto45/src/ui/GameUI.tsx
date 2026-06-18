import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { SPECIES } from '../types';
import { MushroomGrowth } from '../cultivation/MushroomGrowth';
import { interpolateRgb } from 'd3-interpolate';
import { scaleLinear } from 'd3-scale';

const CELL_SIZE = 40;
const VIEW_RADIUS = 4;
const VIEW_SIZE = VIEW_RADIUS * 2 + 1;

const speciesColorScale = SPECIES.map(sp => {
  return scaleLinear<string>()
    .domain([0, 0.5, 1])
    .range([sp.color1, sp.color2, sp.color1])
    .interpolate(interpolateRgb);
});

function getCellColor(speciesId: number, progress: number, growthStage: number): string {
  if (speciesId === null) return 'transparent';
  const color = speciesColorScale[speciesId](Math.min(1, progress));
  return color;
}

function getCellOpacity(growthStage: number): number {
  if (growthStage === 1) return 0.5;
  if (growthStage === 3) return 0.3;
  return 1.0;
}

function getEnvironmentColor(status: 'optimal' | 'warning' | 'danger'): string {
  if (status === 'optimal') return '#27ae60';
  if (status === 'warning') return '#f39c12';
  return '#e74c3c';
}

const MapView: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerPosition = useGameStore(s => s.playerPosition);
  const gridSnapshot = useGameStore(s => s.gridSnapshot);
  const nearbyCollectibles = useGameStore(s => s.nearbyCollectibles);
  const collectAt = useGameStore(s => s.collectAt);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const collectiblesSet = useMemo(() => {
    return new Set(nearbyCollectibles.map(c => `${c.x},${c.y}`));
  }, [nearbyCollectibles]);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = timestamp - timeRef.current;
    timeRef.current = timestamp;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, w, h);

    const px = playerPosition.x;
    const py = playerPosition.y;
    const startX = px - VIEW_RADIUS;
    const startY = py - VIEW_RADIUS;
    const offsetX = (w - VIEW_SIZE * CELL_SIZE) / 2;
    const offsetY = (h - VIEW_SIZE * CELL_SIZE) / 2;

    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 1;
    for (let vy = 0; vy < VIEW_SIZE; vy++) {
      for (let vx = 0; vx < VIEW_SIZE; vx++) {
        const gx = startX + vx;
        const gy = startY + vy;
        const screenX = offsetX + vx * CELL_SIZE;
        const screenY = offsetY + vy * CELL_SIZE;

        ctx.strokeRect(screenX, screenY, CELL_SIZE, CELL_SIZE);

        if (gx >= 0 && gx < 100 && gy >= 0 && gy < 100) {
          const cell = gridSnapshot[gy]?.[gx];
          if (cell && cell.speciesId !== null) {
            const color = getCellColor(cell.speciesId, cell.growthProgress, cell.growthStage);
            const opacity = getCellOpacity(cell.growthStage);
            ctx.globalAlpha = opacity;
            ctx.fillStyle = color;
            ctx.fillRect(screenX + 1, screenY + 1, CELL_SIZE - 2, CELL_SIZE - 2);

            const isEdge = isColonyEdge(gridSnapshot, gx, gy);
            if (isEdge && cell.growthStage === 2) {
              ctx.globalAlpha = 0.3 + 0.1 * Math.sin(timestamp / 500);
              ctx.fillStyle = SPECIES[cell.speciesId].glowColor;
              ctx.fillRect(screenX - 2, screenY - 2, CELL_SIZE + 4, CELL_SIZE + 4);
            }

            if (cell.growthStage === 3) {
              ctx.globalAlpha = 0.4;
              ctx.fillStyle = '#8e44ad';
              ctx.strokeStyle = '#8e44ad';
              ctx.lineWidth = 1;
              ctx.strokeRect(screenX + 2, screenY + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            }

            ctx.globalAlpha = 1.0;
          }

          if (collectiblesSet.has(`${gx},${gy}`)) {
            const pulse = 0.6 + 0.4 * Math.sin(timestamp / 400);
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX + 1, screenY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            ctx.globalAlpha = 1.0;

            ctx.save();
            ctx.translate(screenX + CELL_SIZE / 2, screenY + CELL_SIZE / 2);
            ctx.rotate((timestamp / 3000) * Math.PI * 2);
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
            ctx.moveTo(0, -8); ctx.lineTo(0, 8);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    const playerScreenX = offsetX + VIEW_RADIUS * CELL_SIZE + CELL_SIZE / 2;
    const playerScreenY = offsetY + VIEW_RADIUS * CELL_SIZE + CELL_SIZE / 2;
    const playerPulse = 0.8 + 0.2 * Math.sin(timestamp / 300);

    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(241, 196, 15, ${playerPulse})`;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f1c40f';
    ctx.fill();

    ctx.beginPath();
    const waveTime = (timestamp % 1000) / 1000;
    const waveRadius = 20 + waveTime * 30;
    ctx.arc(playerScreenX, playerScreenY, waveRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(46, 204, 113, ${1 - waveTime})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    animFrameRef.current = requestAnimationFrame(draw);
  }, [playerPosition, gridSnapshot, collectiblesSet]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = canvas.width;
    const h = canvas.height;
    const offsetX = (w - VIEW_SIZE * CELL_SIZE) / 2;
    const offsetY = (h - VIEW_SIZE * CELL_SIZE) / 2;
    const vx = Math.floor((x - offsetX) / CELL_SIZE);
    const vy = Math.floor((y - offsetY) / CELL_SIZE);
    const gx = playerPosition.x - VIEW_RADIUS + vx;
    const gy = playerPosition.y - VIEW_RADIUS + vy;
    collectAt(gx, gy);
  }, [playerPosition, collectAt]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
    />
  );
});

function isColonyEdge(grid: any[][], x: number, y: number): boolean {
  const cell = grid[y]?.[x];
  if (!cell || cell.speciesId === null) return false;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    const neighbor = grid[ny]?.[nx];
    if (!neighbor || neighbor.speciesId !== cell.speciesId || neighbor.colonyId !== cell.colonyId) {
      return true;
    }
  }
  return false;
}

const CultivationPanel: React.FC = React.memo(() => {
  const cultivationSlots = useGameStore(s => s.cultivationSlots);
  const temperature = useGameStore(s => s.temperature);
  const humidity = useGameStore(s => s.humidity);
  const light = useGameStore(s => s.light);
  const setTemperature = useGameStore(s => s.setTemperature);
  const setHumidity = useGameStore(s => s.setHumidity);
  const setLight = useGameStore(s => s.setLight);
  const placeSporeInSlot = useGameStore(s => s.placeSporeInSlot);
  const harvestSlot = useGameStore(s => s.harvestSlot);
  const selectedInventoryIndex = useGameStore(s => s.selectedInventoryIndex);
  const inventorySlots = useGameStore(s => s.inventorySlots);

  const tempColor = temperature > 28 ? '#e74c3c' : temperature < 16 ? '#3498db' : '#2ecc71';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'radial-gradient(ellipse at center, #2c3e50 0%, #1a252f 100%)',
      padding: '12px',
      overflowY: 'auto',
      color: '#ecf0f1',
      fontSize: '14px',
      transition: 'background 3s ease',
    }}>
      <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#2ecc71', textAlign: 'center' }}>
        🍄 培育室
      </h3>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#ecf0f1' }}>
            <span>🌡️ 温度</span>
            <span style={{ color: tempColor }}>{temperature}°C</span>
          </label>
          <input
            type="range"
            min={10}
            max={40}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            style={{ width: '100%', accentColor: tempColor, cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#ecf0f1' }}>
            <span>💧 湿度</span>
            <span style={{ color: '#3498db' }}>{humidity}%</span>
          </label>
          <input
            type="range"
            min={20}
            max={90}
            value={humidity}
            onChange={(e) => setHumidity(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#3498db', cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#ecf0f1' }}>
            <span>☀️ 光照</span>
            <span style={{ color: '#f1c40f' }}>{light}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={light}
            onChange={(e) => setLight(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#f1c40f', cursor: 'pointer' }}
          />
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        marginBottom: '12px',
      }}>
        {cultivationSlots.map((slot, i) => {
          const hasSpore = slot.speciesId !== null;
          const species = hasSpore ? SPECIES[slot.speciesId!] : null;
          const growthState = hasSpore
            ? MushroomGrowth.calculateState(
                slot.speciesId!,
                slot.startTime,
                slot.growthProgress,
                slot.isComplete ? 1.0 : 0.5
              )
            : null;
          const envStatus = hasSpore ? getEnvStatus(slot.speciesId!, temperature, humidity, light) : null;
          const statusColor = envStatus ? getEnvironmentColor(envStatus) : '#7f8c8d';

          return (
            <div
              key={i}
              onClick={() => {
                if (hasSpore && slot.isComplete) {
                  harvestSlot(i);
                } else if (selectedInventoryIndex !== null && !hasSpore) {
                  placeSporeInSlot(i);
                }
              }}
              style={{
                width: '120px',
                height: '120px',
                background: '#2c3e50',
                borderRadius: '8px',
                border: `2px solid ${statusColor}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.3s, background 0.3s',
                position: 'relative',
                overflow: 'hidden',
                margin: '0 auto',
              }}
            >
              {hasSpore ? (
                <>
                  <div style={{
                    fontSize: '24px',
                    color: species!.color2,
                    opacity: growthState!.currentStage === 'seed' ? 0.5 : 1.0,
                    marginBottom: '4px',
                  }}>
                    {MushroomGrowth.getStageEmoji(growthState!.currentStage)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#ecf0f1', marginBottom: '4px' }}>
                    {species!.name}
                  </div>
                  <div style={{
                    width: '100px',
                    height: '8px',
                    background: '#ecf0f1',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${slot.growthProgress * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(to right, #2ecc71, #f1c40f)',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: '9px', color: '#bdc3c7', marginTop: '2px' }}>
                    {Math.round(slot.growthProgress * 100)}%
                  </div>
                  {slot.isComplete && (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      fontSize: '12px',
                      color: '#2ecc71',
                      animation: 'pulse 1s infinite',
                    }}>
                      ✓
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>空槽</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

function getEnvStatus(
  speciesId: number,
  temp: number,
  humidity: number,
  light: number
): 'optimal' | 'warning' | 'danger' {
  const species = SPECIES[speciesId];
  const tempIn = temp >= species.optimalTemp[0] && temp <= species.optimalTemp[1];
  const humidIn = humidity >= species.optimalHumidity[0] && humidity <= species.optimalHumidity[1];
  const lightIn = light >= species.optimalLight[0] && light <= species.optimalLight[1];

  const inRange = [tempIn, humidIn, lightIn].filter(Boolean).length;
  if (inRange === 3) return 'optimal';
  if (inRange >= 1) return 'warning';
  return 'danger';
}

const InventoryBar: React.FC = React.memo(() => {
  const inventorySlots = useGameStore(s => s.inventorySlots);
  const selectedInventoryIndex = useGameStore(s => s.selectedInventoryIndex);
  const selectInventoryItem = useGameStore(s => s.selectInventoryItem);

  return (
    <div style={{
      height: '80px',
      background: '#1a252f',
      borderTop: '1px solid #34495e',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      overflowX: 'auto',
      gap: '6px',
    }}>
      {inventorySlots.length === 0 && (
        <div style={{ color: '#7f8c8d', fontSize: '12px', margin: '0 auto' }}>
          背包为空 - 在地图上采集孢子吧！
        </div>
      )}
      {inventorySlots.map((slot, i) => {
        const species = SPECIES[slot.speciesId];
        const isSelected = selectedInventoryIndex === i;
        return (
          <div
            key={`${slot.speciesId}-${i}`}
            onClick={() => selectInventoryItem(isSelected ? null : i)}
            style={{
              minWidth: '40px',
              height: '40px',
              borderRadius: '4px',
              background: species.color1,
              border: isSelected ? '2px solid #e74c3c' : '2px solid transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: isSelected ? 1.0 : 0.9,
              position: 'relative',
              flexShrink: 0,
            }}
            title={`${species.name} ×${slot.count}`}
          >
            <span style={{ fontSize: '14px' }}>🍄</span>
            <span style={{ fontSize: '8px', color: '#ecf0f1', position: 'absolute', bottom: '1px' }}>
              {slot.count}
            </span>
          </div>
        );
      })}
    </div>
  );
});

const EventMessage: React.FC = React.memo(() => {
  const lastEventMessage = useGameStore(s => s.lastEventMessage);
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState('');

  useEffect(() => {
    if (lastEventMessage) {
      setMessage(lastEventMessage);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastEventMessage]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(46, 204, 113, 0.9)',
      color: '#fff',
      padding: '8px 20px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'bold',
      zIndex: 1000,
      animation: 'fadeInOut 2s ease',
      pointerEvents: 'none',
    }}>
      {message}
    </div>
  );
});

const GameUI: React.FC = () => {
  const init = useGameStore(s => s.init);
  const isPanelCollapsed = useGameStore(s => s.isPanelCollapsed);
  const togglePanel = useGameStore(s => s.togglePanel);
  const playerPosition = useGameStore(s => s.playerPosition);

  useEffect(() => {
    init();
  }, [init]);

  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1200;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: isNarrow ? 'column' : 'row',
      background: '#1a252f',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        input[type="range"] {
          -webkit-appearance: none;
          height: 6px;
          border-radius: 3px;
          background: #34495e;
          outline: none;
          transition: opacity 0.2s;
        }
        input[type="range"]:hover {
          opacity: 1.0;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ecf0f1;
          cursor: pointer;
          transition: transform 0.2s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ecf0f1;
          cursor: pointer;
          border: none;
        }
        ::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #1a252f;
        }
        ::-webkit-scrollbar-thumb {
          background: #34495e;
          border-radius: 3px;
        }
      `}</style>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}>
        <div style={{
          height: '36px',
          background: '#1a252f',
          borderBottom: '1px solid #34495e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          color: '#7f8c8d',
          fontSize: '12px',
        }}>
          <span>🗺️ 坐标: ({playerPosition.x}, {playerPosition.y})</span>
          <span>WASD移动 · E采集 · 点击地图采集</span>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapView />
        </div>

        <InventoryBar />
      </div>

      {isNarrow ? (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: isPanelCollapsed ? '40px' : '60vh',
          background: '#1a252f',
          borderTop: '2px solid #2ecc71',
          transition: 'height 0.3s ease',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          <div
            onClick={togglePanel}
            style={{
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#2ecc71',
              fontSize: '14px',
              borderBottom: '1px solid #34495e',
            }}
          >
            🍄 培育室 {isPanelCollapsed ? '▲' : '▼'}
          </div>
          {!isPanelCollapsed && <CultivationPanel />}
        </div>
      ) : (
        <div style={{
          width: '30%',
          minWidth: '280px',
          maxWidth: '400px',
          background: '#1a252f',
          borderLeft: '1px solid #34495e',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <CultivationPanel />
        </div>
      )}

      <EventMessage />
    </div>
  );
};

export default GameUI;
