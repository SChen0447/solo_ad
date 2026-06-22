import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ShipConfig } from '@/modules/shipBuilder';
import { calculateShipStats } from '@/modules/shipBuilder';
import {
  initGame,
  updateGame,
  movePlayer,
  getRankings,
  getTrackY,
  getTrackHeight,
  getTrackLength,
  type GameState,
  type Ship,
  type Particle
} from '@/modules/gameLoop';
import { v4 as uuidv4 } from 'uuid';

interface RaceProps {
  shipConfig: ShipConfig;
  onRaceEnd: (rank: number, time: number) => void;
  onBackToWorkshop: () => void;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const TRACK_Y = 300;
const TRACK_HEIGHT = 200;
const LANE_COUNT = 3;

const Race: React.FC<RaceProps> = ({ shipConfig, onRaceEnd, onBackToWorkshop }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const aiShipsRef = useRef<Ship[]>([]);
  const [raceStarted, setRaceStarted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(true);
  const raceEndedRef = useRef(false);

  const drawTrack = useCallback((ctx: CanvasRenderingContext2D, cameraX: number, segments: any[]) => {
    const trackY = TRACK_Y;
    const trackHeight = TRACK_HEIGHT;

    ctx.fillStyle = '#2D3748';
    ctx.fillRect(0, trackY - 10, CANVAS_WIDTH, trackHeight + 20);

    ctx.fillStyle = '#4A5568';
    ctx.fillRect(0, trackY, CANVAS_WIDTH, trackHeight);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);

    const laneHeight = trackHeight / LANE_COUNT;
    for (let i = 1; i < LANE_COUNT; i++) {
      const y = trackY + i * laneHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    for (const seg of segments) {
      const screenX = seg.x - cameraX;
      if (screenX < -seg.width || screenX > CANVAS_WIDTH) continue;

      if (seg.curveAngle > 0 && seg.curveDirection !== 'straight') {
        ctx.fillStyle = '#1A202C';
        const curveHeight = (seg.curveAngle / 45) * 40;
        
        if (seg.curveDirection === 'left') {
          ctx.beginPath();
          ctx.moveTo(screenX, trackY);
          ctx.lineTo(screenX + seg.width, trackY - curveHeight);
          ctx.lineTo(screenX + seg.width, trackY - curveHeight - 10);
          ctx.lineTo(screenX, trackY - 10);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(screenX, trackY + trackHeight);
          ctx.lineTo(screenX + seg.width, trackY + trackHeight + curveHeight);
          ctx.lineTo(screenX + seg.width, trackY + trackHeight + curveHeight + 10);
          ctx.lineTo(screenX, trackY + trackHeight + 10);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    ctx.fillStyle = '#1A202C';
    ctx.fillRect(0, 0, CANVAS_WIDTH, trackY - 10);
    ctx.fillRect(0, trackY + trackHeight + 10, CANVAS_WIDTH, CANVAS_HEIGHT - trackY - trackHeight - 10);

    ctx.fillStyle = '#0F172A';
    for (let x = -cameraX % 100; x < CANVAS_WIDTH; x += 100) {
      for (let y = 20; y < trackY - 20; y += 40) {
        ctx.fillRect(x + (y % 80) / 2, y, 4, 4);
      }
    }
  }, []);

  const drawObstacles = useCallback((ctx: CanvasRenderingContext2D, cameraX: number, obstacles: any[]) => {
    for (const obs of obstacles) {
      const screenX = obs.x - cameraX;
      if (screenX < -obs.width || screenX > CANVAS_WIDTH) continue;

      ctx.save();
      
      if (obs.type === 'rock') {
        ctx.fillStyle = '#718096';
        ctx.fillRect(screenX, obs.y, obs.width, obs.height);
        
        ctx.fillStyle = '#A0AEC0';
        ctx.fillRect(screenX + 8, obs.y + 8, 20, 20);
        ctx.fillRect(screenX + 36, obs.y + 24, 16, 16);
        
        ctx.fillStyle = '#4A5568';
        ctx.fillRect(screenX + 16, obs.y + 40, 24, 16);
      } else {
        ctx.fillStyle = '#718096';
        ctx.beginPath();
        ctx.moveTo(screenX + obs.width / 2, obs.y);
        ctx.lineTo(screenX + obs.width, obs.y + obs.height / 2);
        ctx.lineTo(screenX + obs.width / 2, obs.y + obs.height);
        ctx.lineTo(screenX, obs.y + obs.height / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#A0AEC0';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }
  }, []);

  const drawPowerUps = useCallback((ctx: CanvasRenderingContext2D, cameraX: number, powerUps: any[], time: number) => {
    for (const pu of powerUps) {
      if (pu.collected) continue;

      const screenX = pu.x - cameraX;
      if (screenX < -pu.width || screenX > CANVAS_WIDTH) continue;

      const bobY = Math.sin(time * 3 + pu.x) * 5;

      ctx.save();

      if (pu.type === 'speed') {
        ctx.fillStyle = '#48BB78';
        ctx.fillRect(screenX, pu.y + bobY, pu.width, pu.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(screenX + pu.width * 0.3, pu.y + bobY + pu.height * 0.3);
        ctx.lineTo(screenX + pu.width * 0.7, pu.y + bobY + pu.height * 0.5);
        ctx.lineTo(screenX + pu.width * 0.3, pu.y + bobY + pu.height * 0.7);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowColor = '#48BB78';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#F56565';
        ctx.fillRect(screenX, pu.y + bobY, pu.width, pu.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▼', screenX + pu.width / 2, pu.y + bobY + pu.height * 0.7);
        
        ctx.shadowColor = '#F56565';
        ctx.shadowBlur = 10;
      }

      ctx.restore();
    }
  }, []);

  const drawShip = useCallback((ctx: CanvasRenderingContext2D, ship: Ship, cameraX: number, showTrail: boolean = false) => {
    const screenX = ship.x - cameraX;
    
    if (screenX < -100 || screenX > CANVAS_WIDTH + 100) return;

    ctx.save();

    if (showTrail) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = ship.color;
      for (let i = 1; i <= 5; i++) {
        const trailX = screenX - i * 15;
        const trailSize = 1 - i * 0.15;
        ctx.globalAlpha = 0.3 * (1 - i * 0.15);
        ctx.fillRect(trailX, ship.y - ship.height / 2 * trailSize, ship.width * trailSize, ship.height * trailSize);
      }
      ctx.globalAlpha = 1;
    }

    if (ship.flashTimer > 0 && Math.floor(ship.flashTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const y = ship.y;
    const w = ship.width;
    const h = ship.height;

    ctx.fillStyle = ship.color;
    
    ctx.beginPath();
    ctx.moveTo(screenX + w, y);
    ctx.lineTo(screenX + w * 0.6, y - h / 2);
    ctx.lineTo(screenX - w * 0.2, y - h * 0.35);
    ctx.lineTo(screenX - w * 0.5, y);
    ctx.lineTo(screenX - w * 0.2, y + h * 0.35);
    ctx.lineTo(screenX + w * 0.6, y + h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(screenX + w, y);
    ctx.lineTo(screenX + w * 0.6, y - h / 2);
    ctx.lineTo(screenX, y - h * 0.2);
    ctx.lineTo(screenX + w * 0.2, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(147, 197, 253, 0.7)';
    ctx.beginPath();
    ctx.ellipse(screenX + w * 0.5, y, w * 0.15, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (ship.boostTimer > 0) {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(screenX - w * 0.5, y - h * 0.15);
      ctx.lineTo(screenX - w * 0.9 - Math.random() * 20, y);
      ctx.lineTo(screenX - w * 0.5, y + h * 0.15);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.moveTo(screenX - w * 0.5, y - h * 0.08);
      ctx.lineTo(screenX - w * 0.7 - Math.random() * 10, y);
      ctx.lineTo(screenX - w * 0.5, y + h * 0.08);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[], cameraX: number) => {
    for (const p of particles) {
      const screenX = p.x - cameraX;
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(screenX - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }, []);

  const drawHUD = useCallback((ctx: CanvasRenderingContext2D, state: GameState, aiShips: Ship[]) => {
    const allShips = [...state.ships, ...aiShips];
    const rankings = getRankings(allShips);

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(CANVAS_WIDTH - 180, 10, 170, 120, 8);
    ctx.fill();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('排行榜', CANVAS_WIDTH - 170, 35);

    rankings.slice(0, 4).forEach((rank, i) => {
      const y = 60 + i * 22;
      ctx.fillStyle = rank.ship.color;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(`${rank.rank}. ${rank.ship.name}`, CANVAS_WIDTH - 170, y);
    });

    const player = state.ships.find(s => s.isPlayer);
    if (player) {
      const progress = (player.x / state.trackLength) * 100;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.roundRect(10, 10, 200, 60, 8);
      ctx.fill();

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(`速度: ${Math.round(player.currentSpeed * 10)}`, 20, 35);
      ctx.fillText(`进度: ${progress.toFixed(1)}%`, 20, 55);
    }

    const minutes = Math.floor(state.raceTime / 60);
    const seconds = Math.floor(state.raceTime % 60);
    const ms = Math.floor((state.raceTime % 1) * 100);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`, CANVAS_WIDTH / 2, 35);

    ctx.restore();
  }, []);

  useEffect(() => {
    const aiShipsData = [
      { id: 'ai-1', name: '红龙', color: '#E53E3E', baseSpeed: 5, isAI: true, lane: 0, targetLane: 0 },
      { id: 'ai-2', name: '蓝鲨', color: '#38B2AC', baseSpeed: 5.5, isAI: true, lane: 2, targetLane: 2 },
      { id: 'ai-3', name: '金雕', color: '#D69E2E', baseSpeed: 4.8, isAI: true, lane: 1, targetLane: 1 }
    ];

    const initialAIShips: Ship[] = aiShipsData.map(ai => ({
      id: ai.id,
      x: 100 - Math.random() * 80,
      y: TRACK_Y + (TRACK_HEIGHT / LANE_COUNT) * ai.lane + (TRACK_HEIGHT / LANE_COUNT) / 2,
      width: 48,
      height: 32,
      speed: ai.baseSpeed,
      baseSpeed: ai.baseSpeed,
      currentSpeed: ai.baseSpeed,
      color: ai.color,
      name: ai.name,
      isPlayer: false,
      flashTimer: 0,
      slowTimer: 0,
      boostTimer: 0,
      isAI: true,
      lane: ai.lane,
      targetLane: ai.targetLane,
      progress: 0
    }));

    aiShipsRef.current = initialAIShips;

    const gameState = initGame(shipConfig, []);
    gameStateRef.current = gameState;

    let countdownVal = 3;
    const countdownInterval = setInterval(() => {
      countdownVal--;
      setCountdown(countdownVal);
      if (countdownVal <= 0) {
        clearInterval(countdownInterval);
        setShowCountdown(false);
        setRaceStarted(true);
        if (gameStateRef.current) {
          gameStateRef.current.started = true;
        }
        lastTimeRef.current = performance.now();
        startGameLoop();
      }
    }, 1000);

    const startGameLoop = () => {
      const loop = (timestamp: number) => {
        const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
        lastTimeRef.current = timestamp;

        if (gameStateRef.current && !gameStateRef.current.gameOver) {
          gameStateRef.current = updateGame(gameStateRef.current, deltaTime, [0.7, 0.8, 0.9]);

          const player = gameStateRef.current.ships.find(s => s.isPlayer);
          if (player && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'playerUpdate',
              data: {
                x: player.x,
                y: player.y,
                lane: player.lane,
                targetLane: player.targetLane,
                speed: player.baseSpeed,
                currentSpeed: player.currentSpeed,
                progress: player.progress,
                boostTimer: player.boostTimer,
                slowTimer: player.slowTimer,
                flashTimer: player.flashTimer
              }
            }));
          }

          if (gameStateRef.current.gameOver && !raceEndedRef.current) {
            raceEndedRef.current = true;
            const allShips = [...gameStateRef.current.ships, ...aiShipsRef.current];
            const rankings = getRankings(allShips);
            const playerRank = rankings.find(r => r.ship.isPlayer)?.rank || 4;
            onRaceEnd(playerRank, gameStateRef.current.raceTime);
          }
        }

        render();
        animationFrameRef.current = requestAnimationFrame(loop);
      };

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    const render = () => {
      const canvas = canvasRef.current;
      const state = gameStateRef.current;
      if (!canvas || !state) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawTrack(ctx, state.cameraX, state.trackSegments);
      drawObstacles(ctx, state.cameraX, state.obstacles);
      drawPowerUps(ctx, state.cameraX, state.powerUps, state.raceTime);

      const allShips = [...state.ships, ...aiShipsRef.current].sort((a, b) => a.y - b.y);
      for (const ship of allShips) {
        if (ship.isAI) {
          drawShip(ctx, ship, state.cameraX, true);
        } else {
          drawShip(ctx, ship, state.cameraX, false);
        }
      }

      drawParticles(ctx, state.particles, state.cameraX);
      drawHUD(ctx, state, aiShipsRef.current);
    };

    render();

    try {
      const ws = new WebSocket('ws://localhost:3005/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'gameState') {
            const serverShips = message.data.ships || [];
            for (const serverShip of serverShips) {
              if (serverShip.isAI) {
                const localShip = aiShipsRef.current.find(s => s.id === serverShip.id);
                if (localShip) {
                  localShip.x += (serverShip.x - localShip.x) * 0.1;
                  localShip.y += (serverShip.y - localShip.y) * 0.1;
                  localShip.currentSpeed = serverShip.currentSpeed;
                  localShip.progress = serverShip.progress;
                  localShip.boostTimer = serverShip.boostTimer;
                  localShip.slowTimer = serverShip.slowTimer;
                  localShip.flashTimer = serverShip.flashTimer;
                }
              }
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = () => {
        console.log('WebSocket connection failed, running offline mode');
      };
    } catch (e) {
      console.log('WebSocket not available, running offline mode');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStateRef.current || !raceStarted) return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        gameStateRef.current = movePlayer(gameStateRef.current, 'up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        gameStateRef.current = movePlayer(gameStateRef.current, 'down');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(countdownInterval);
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [shipConfig, raceStarted, drawTrack, drawObstacles, drawPowerUps, drawShip, drawParticles, drawHUD, onRaceEnd]);

  return (
    <div className="race-container">
      <button className="back-btn" onClick={onBackToWorkshop}>
        ← 返回
      </button>

      <div className="race-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="race-canvas"
        />

        {showCountdown && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown > 0 ? countdown : 'GO!'}</div>
            <div className="countdown-hint">使用 ↑↓ 或 W/S 控制飞船</div>
          </div>
        )}
      </div>

      <div className="race-controls-hint">
        <span>↑ / W - 向上换道</span>
        <span>↓ / S - 向下换道</span>
        <span>🟢 加速道具</span>
        <span>🔴 减速陷阱</span>
      </div>
    </div>
  );
};

export default Race;
