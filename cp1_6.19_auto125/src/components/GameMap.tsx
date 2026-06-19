import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { GameState, HexCoord, Base, Miner, Tower, GoldMine, Projectile } from '../types';

interface GameMapProps {
  gameState: GameState | null;
  playerId: string | null;
  onBaseClick: (base: Base) => void;
  selectedBaseId: string | null;
}

const HEX_SIZE = 50;

function hexToPixel(hex: HexCoord, size: number): { x: number; y: number } {
  const x = size * (3 / 2 * hex.q);
  const y = size * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r);
  return { x, y };
}

function hexCorners(center: { x: number; y: number }, size: number): string {
  const corners: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push(`${center.x + size * Math.cos(angle)},${center.y + size * Math.sin(angle)}`);
  }
  return corners.join(' ');
}

function generateHexGrid(gridSize: number): HexCoord[] {
  const hexes: HexCoord[] = [];
  for (let q = -gridSize; q <= gridSize; q++) {
    for (let r = -gridSize; r <= gridSize; r++) {
      if (Math.abs(q + r) <= gridSize) {
        hexes.push({ q, r });
      }
    }
  }
  return hexes;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const GameMap: React.FC<GameMapProps> = ({ gameState, playerId, onBaseClick, selectedBaseId }) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [damageTexts, setDamageTexts] = useState<{ id: number; x: number; y: number; damage: number; life: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);

  const hexGrid = useMemo(() => {
    if (!gameState) return [];
    return generateHexGrid(gameState.gridSize);
  }, [gameState]);

  const addExplosion = useCallback((x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 1 + Math.random() * 3;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: 3 + Math.random() * 4,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.03,
          }))
          .filter(p => p.life > 0)
      );
      setDamageTexts(prev =>
        prev
          .map(d => ({ ...d, y: d.y - 1, life: d.life - 0.02 }))
          .filter(d => d.life > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!gameState) return;
    const towerIds = new Set(Object.keys(gameState.towers));
    const baseIds = new Set(Object.keys(gameState.bases));
    
    return () => {
      const currentTowers = new Set(Object.keys(gameState.towers));
      const currentBases = new Set(Object.keys(gameState.bases));
      
      for (const id of towerIds) {
        if (!currentTowers.has(id)) {
          const tower = gameState.towers[id];
          if (tower) {
            const pos = hexToPixel(tower.position, HEX_SIZE);
            addExplosion(pos.x, pos.y, '#ff4444');
          }
        }
      }
      for (const id of baseIds) {
        if (!currentBases.has(id)) {
          const base = gameState.bases[id];
          if (base) {
            const pos = hexToPixel(base.position, HEX_SIZE);
            addExplosion(pos.x, pos.y, '#ffd700');
          }
        }
      }
    };
  }, [gameState, addExplosion]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.3, Math.min(2, prev * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!gameState) {
    return (
      <div className="game-map" ref={containerRef}>
        <div className="loading-text">等待游戏开始...</div>
      </div>
    );
  }

  const getPlayerColor = (pid: string): string => {
    return gameState.players[pid]?.color || '#888';
  };

  const renderHex = (hex: HexCoord) => {
    const center = hexToPixel(hex, HEX_SIZE);
    return (
      <polygon
        key={`hex-${hex.q}-${hex.r}`}
        points={hexCorners(center, HEX_SIZE * 0.95)}
        fill="rgba(30, 30, 60, 0.4)"
        stroke="#3a3a5a"
        strokeWidth="2"
      />
    );
  };

  const renderMine = (mine: GoldMine) => {
    const center = hexToPixel(mine.position, HEX_SIZE);
    const ownerColor = mine.ownerId ? getPlayerColor(mine.ownerId) : '#555';
    const occupationProgress = mine.ownerId && mine.occupationStart
      ? Math.min(1, (Date.now() - mine.occupationStart) / 30000)
      : 0;

    return (
      <g key={`mine-${mine.id}`} className="mine">
        <circle cx={center.x} cy={center.y} r={HEX_SIZE * 0.6} fill="rgba(255, 215, 0, 0.15)" />
        <circle cx={center.x} cy={center.y} r={HEX_SIZE * 0.45} fill="none" stroke={ownerColor} strokeWidth="3" opacity={0.8} />
        <circle
          cx={center.x}
          cy={center.y}
          r={HEX_SIZE * 0.45}
          fill="none"
          stroke="#FFD700"
          strokeWidth="3"
          strokeDasharray={`${occupationProgress * 2 * Math.PI * HEX_SIZE * 0.45} ${2 * Math.PI * HEX_SIZE * 0.45}`}
          transform={`rotate(-90 ${center.x} ${center.y})`}
        />
        <polygon
          points={`${center.x},${center.y - 20} ${center.x + 17},${center.y + 10} ${center.x - 17},${center.y + 10}`}
          fill="#FFD700"
          stroke="#FFA500"
          strokeWidth="2"
        />
        <text x={center.x} y={center.y + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4a3000">$</text>
        {mine.ownerId && (
          <circle cx={center.x + 25} cy={center.y - 25} r="8" fill={ownerColor} stroke="#fff" strokeWidth="2" />
        )}
      </g>
    );
  };

  const renderBase = (base: Base) => {
    const center = hexToPixel(base.position, HEX_SIZE);
    const color = getPlayerColor(base.playerId);
    const isOwn = base.playerId === playerId;
    const isSelected = selectedBaseId === base.id;

    return (
      <g
        key={`base-${base.id}`}
        className={`base ${isOwn ? 'own' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isOwn) onBaseClick(base);
        }}
        style={{ cursor: isOwn ? 'pointer' : 'default' }}
      >
        {isSelected && (
          <polygon
            points={hexCorners(center, HEX_SIZE * 0.85)}
            fill="none"
            stroke="#00ffff"
            strokeWidth="3"
            strokeDasharray="5,3"
            opacity={0.8}
          >
            <animate attributeName="stroke-dashoffset" from="0" to="16" dur="0.5s" repeatCount="indefinite" />
          </polygon>
        )}
        <polygon
          points={hexCorners(center, HEX_SIZE * 0.7)}
          fill={color}
          stroke="#fff"
          strokeWidth="3"
          opacity={0.9}
        />
        <polygon
          points={hexCorners(center, HEX_SIZE * 0.5)}
          fill="rgba(255,255,255,0.2)"
          stroke="none"
        />
        <text x={center.x} y={center.y + 5} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">
          B{base.level}
        </text>
        <rect x={center.x - 30} y={center.y + HEX_SIZE * 0.55} width="60" height="6" rx="3" fill="#333" />
        <rect
          x={center.x - 30}
          y={center.y + HEX_SIZE * 0.55}
          width={60 * (base.hp / base.maxHp)}
          height="6"
          rx="3"
          fill={base.hp > base.maxHp * 0.3 ? '#4CAF50' : '#f44336'}
        />
      </g>
    );
  };

  const renderMiner = (miner: Miner) => {
    const center = hexToPixel(miner.position, HEX_SIZE);
    const color = getPlayerColor(miner.playerId);
    const rotation = miner.state === 'returning' ? 180 : miner.state === 'traveling_to_mine' ? 0 : Math.random() * 360;
    const isMining = miner.state === 'mining';

    return (
      <g key={`miner-${miner.id}`} className="miner" style={{ transition: 'transform 0.3s ease-out' }}>
        {isMining && (
          <>
            <circle cx={center.x + 15} cy={center.y - 10} r="4" fill="#FFD700">
              <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
              <animate attributeName="r" values="4;6;4" dur="0.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={center.x - 12} cy={center.y + 8} r="3" fill="#FFD700">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="0.7s" repeatCount="indefinite" />
            </circle>
          </>
        )}
        <polygon
          points={`${center.x},${center.y - 18} ${center.x + 15},${center.y + 12} ${center.x - 15},${center.y + 12}`}
          fill={color}
          stroke="#fff"
          strokeWidth="2"
          transform={`rotate(${rotation} ${center.x} ${center.y})`}
        />
        <circle cx={center.x} cy={center.y} r="5" fill="rgba(255,255,255,0.4)" />
        {miner.carryingGold > 0 && (
          <text x={center.x} y={center.y - 25} textAnchor="middle" fontSize="12" fill="#FFD700" fontWeight="bold">
            +{miner.carryingGold}
          </text>
        )}
        <rect x={center.x - 20} y={center.y + 18} width="40" height="4" rx="2" fill="#333" />
        <rect
          x={center.x - 20}
          y={center.y + 18}
          width={40 * (miner.hp / miner.maxHp)}
          height="4"
          rx="2"
          fill={miner.hp > miner.maxHp * 0.3 ? '#4CAF50' : '#f44336'}
        />
      </g>
    );
  };

  const renderTower = (tower: Tower) => {
    const center = hexToPixel(tower.position, HEX_SIZE);
    const color = getPlayerColor(tower.playerId);

    return (
      <g key={`tower-${tower.id}`} className="tower">
        <rect
          x={center.x - 18}
          y={center.y - 18}
          width="36"
          height="36"
          fill={color}
          stroke="#fff"
          strokeWidth="2"
          rx="4"
        />
        <rect
          x={center.x - 12}
          y={center.y - 12}
          width="24"
          height="24"
          fill="rgba(255,255,255,0.2)"
          rx="2"
        />
        <circle cx={center.x} cy={center.y} r="6" fill="#fff" opacity={0.8} />
        <rect x={center.x - 25} y={center.y + HEX_SIZE * 0.4} width="50" height="5" rx="2" fill="#333" />
        <rect
          x={center.x - 25}
          y={center.y + HEX_SIZE * 0.4}
          width={50 * (tower.hp / tower.maxHp)}
          height="5"
          rx="2"
          fill={tower.hp > tower.maxHp * 0.3 ? '#4CAF50' : '#f44336'}
        />
      </g>
    );
  };

  const renderProjectile = (proj: Projectile) => {
    const from = hexToPixel(proj.from, HEX_SIZE);
    const to = hexToPixel(proj.to, HEX_SIZE);
    const progress = Math.min(1, (Date.now() - proj.createdAt) / 300);
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;

    return (
      <g key={`proj-${proj.id}`}>
        <line x1={from.x} y1={from.y} x2={x} y2={y} stroke="#ff4444" strokeWidth="3" opacity={0.6} />
        <circle cx={x} cy={y} r="6" fill="#ff6666" stroke="#fff" strokeWidth="2">
          <animate attributeName="r" values="6;8;6" dur="0.2s" repeatCount="indefinite" />
        </circle>
      </g>
    );
  };

  const viewBoxSize = 600;
  const centerOffset = viewBoxSize / 2;

  return (
    <div
      className="game-map"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        viewBox={`${-centerOffset} ${-centerOffset} ${viewBoxSize} ${viewBoxSize}`}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <defs>
          <radialGradient id="bgGlow">
            <stop offset="0%" stopColor="rgba(80, 40, 160, 0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="0" cy="0" r="350" fill="url(#bgGlow)" />

        {hexGrid.map(renderHex)}

        {Object.values(gameState.mines).map(renderMine)}
        {Object.values(gameState.towers).map(renderTower)}
        {Object.values(gameState.bases).map(renderBase)}
        {Object.values(gameState.miners).map(renderMiner)}
        {Object.values(gameState.projectiles).map(renderProjectile)}

        {particles.map(p => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={p.size * p.life}
            fill={p.color}
            opacity={p.life}
          />
        ))}

        {damageTexts.map(d => (
          <text
            key={d.id}
            x={d.x}
            y={d.y}
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill="#ff4444"
            opacity={d.life}
            style={{ textShadow: '0 0 4px #000' }}
          >
            -{d.damage}
          </text>
        ))}
      </svg>
    </div>
  );
};
