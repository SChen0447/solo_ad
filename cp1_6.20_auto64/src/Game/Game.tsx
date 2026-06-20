import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import type { GameState, TowerConfig, MinionData, ProjectileData, ChatMessage, TowerType, MinionType, PlayerSide, CellType } from '../types';
import { CELL_COLORS, TOWER_STATS, MINION_STATS } from '../types';
import { placeTower, upgradeTower, spawnMinion, sendChatMessage, joinRoomSocket, leaveRoomSocket } from '../api';

const GRID_SIZE = 20;
const CELL_SIZE = 32;

interface GameProps {
  spectate?: boolean;
}

const Game: React.FC<GameProps> = ({ spectate = false }) => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const animationRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerSide, setPlayerSide] = useState<PlayerSide>(spectate ? 'spectator' : 'defender');
  const [grid, setGrid] = useState<CellType[][]>([]);
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const [zoom, setZoom] = useState(spectate ? 0.8 : 1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [selectedTower, setSelectedTower] = useState<TowerConfig | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [goldAnim, setGoldAnim] = useState(false);
  const [crystalAnim, setCrystalAnim] = useState(false);
  const [frameTime, setFrameTime] = useState(0);
  const [towerFiring, setTowerFiring] = useState<Record<string, number>>({});
  const [chatListRef, setChatListRef] = useState<HTMLDivElement | null>(null);

  const playerId = localStorage.getItem('playerId') || '';

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      const side: PlayerSide = spectate ? 'spectator' : 'defender';
      setPlayerSide(side);
      if (roomId) {
        joinRoomSocket(socket, roomId, playerId, side);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('game_state', (state: GameState) => {
      setGameState(prev => {
        if (prev) {
          if (prev.defenderGold !== state.defenderGold) setGoldAnim(true);
          if (prev.attackerCrystals !== state.attackerCrystals) setCrystalAnim(true);
        }
        return state;
      });
    });

    socket.on('game_start', (state: GameState) => {
      setGameState(state);
      fetch(`http://localhost:5000/map/${state.roomId}`)
        .then(res => res.json())
        .then(mapData => {
          setGrid(mapData.grid);
          setPath(mapData.path);
        })
        .catch(() => {
          const defaultGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty'));
          setGrid(defaultGrid);
        });
    });

    socket.on('chat_broadcast', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('room_update', (room: any) => {
      if (!spectate) {
        if (room.defenderId === playerId) setPlayerSide('defender');
        else if (room.attackerId === playerId) setPlayerSide('attacker');
      }
    });

    return () => {
      if (roomId) {
        leaveRoomSocket(socket, roomId, playerId);
      }
      socket.disconnect();
    };
  }, [roomId, playerId, spectate]);

  useEffect(() => {
    if (goldAnim) {
      const timer = setTimeout(() => setGoldAnim(false), 150);
      return () => clearTimeout(timer);
    }
  }, [goldAnim]);

  useEffect(() => {
    if (crystalAnim) {
      const timer = setTimeout(() => setCrystalAnim(false), 150);
      return () => clearTimeout(timer);
    }
  }, [crystalAnim]);

  useEffect(() => {
    if (chatListRef) {
      chatListRef.scrollTop = chatListRef.scrollHeight;
    }
  }, [chatMessages, chatListRef]);

  const drawMinion = useCallback((ctx: CanvasRenderingContext2D, minion: MinionData, time: number) => {
    const x = minion.x * CELL_SIZE + CELL_SIZE / 2;
    const y = minion.y * CELL_SIZE + CELL_SIZE / 2;
    
    const walkFrame = Math.floor(time / 150) % 4;
    const slowFactor = 1 - minion.slowEffect;

    ctx.save();
    ctx.translate(x, y);

    const colors: Record<MinionType, string> = {
      normal: '#8B0000',
      fast: '#FF6600',
      heavy: '#4A0080'
    };

    const size = minion.type === 'heavy' ? 18 : minion.type === 'fast' ? 10 : 14;
    
    ctx.fillStyle = colors[minion.type];
    ctx.fillRect(-size/2, -size/2 + walkFrame % 2, size, size);
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(-size/4, -size/4, 3, 3);
    ctx.fillRect(size/4 - 3, -size/4, 3, 3);
    
    ctx.fillStyle = '#000';
    ctx.fillRect(-size/4 + 1, -size/4 + 1, 1, 1);
    ctx.fillRect(size/4 - 2, -size/4 + 1, 1, 1);

    const hpPercent = minion.hp / minion.maxHp;
    const hpWidth = size * 1.5;
    ctx.fillStyle = '#333';
    ctx.fillRect(-hpWidth/2, -size/2 - 8, hpWidth, 4);
    
    const gradient = ctx.createLinearGradient(-hpWidth/2, 0, hpWidth/2, 0);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.5, '#ff6600');
    gradient.addColorStop(1, '#00ff00');
    ctx.fillStyle = gradient;
    ctx.fillRect(-hpWidth/2, -size/2 - 8, hpWidth * hpPercent, 4);

    if (minion.slowEffect > 0) {
      ctx.strokeStyle = '#66ccff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(time / 100) * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, []);

  const drawTower = useCallback((ctx: CanvasRenderingContext2D, tower: TowerConfig, time: number, isFiring: boolean) => {
    const x = tower.x * CELL_SIZE + CELL_SIZE / 2;
    const y = tower.y * CELL_SIZE + CELL_SIZE / 2;

    ctx.save();
    ctx.translate(x, y);

    const colors: Record<TowerType, string> = {
      cannon: '#8B4513',
      laser: '#ff3333',
      ice: '#66ccff'
    };

    const flashAlpha = isFiring ? 0.5 + Math.sin(time / 30) * 0.3 : 0;

    ctx.fillStyle = '#c7956b';
    ctx.fillRect(-12, -4, 24, 12);
    
    ctx.fillStyle = colors[tower.type];
    if (tower.type === 'cannon') {
      ctx.beginPath();
      ctx.arc(0, -8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3, -18, 6, 12);
      
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 200, 100, ${flashAlpha})`;
        ctx.beginPath();
        ctx.arc(0, -20, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (tower.type === 'laser') {
      ctx.fillRect(-6, -16, 12, 16);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -18, 4, 4);
      
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 100, 100, ${flashAlpha})`;
        ctx.fillRect(-8, -20, 16, 6);
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(-10, -4);
      ctx.lineTo(10, -4);
      ctx.closePath();
      ctx.fill();
      
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(150, 220, 255, ${flashAlpha})`;
        ctx.beginPath();
        ctx.arc(0, -10, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (tower.level > 1) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv${tower.level}`, 0, 20);
    }

    if (selectedTower && selectedTower.id === tower.id) {
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const range = TOWER_STATS[tower.type].range * CELL_SIZE * (1 + (tower.level - 1) * 0.1);
      ctx.arc(0, 0, range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [selectedTower]);

  const drawProjectile = useCallback((ctx: CanvasRenderingContext2D, proj: ProjectileData) => {
    const progress = proj.progress;
    
    let x: number, y: number;
    
    if (proj.type === 'cannon') {
      const parabolaHeight = 50;
      x = proj.startX + (proj.endX - proj.startX) * progress;
      y = proj.startY + (proj.endY - proj.startY) * progress - Math.sin(progress * Math.PI) * parabolaHeight;
      
      ctx.fillStyle = '#4a4a4a';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(150, 100, 50, 0.5)';
      ctx.beginPath();
      ctx.arc(x - 3, y + 3, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'laser') {
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(proj.startX, proj.startY - 18);
      ctx.lineTo(proj.endX, proj.endY);
      ctx.stroke();
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(proj.startX, proj.startY - 18);
      ctx.lineTo(proj.endX, proj.endY);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      x = proj.startX + (proj.endX - proj.startX) * progress;
      y = proj.startY + (proj.endY - proj.startY) * progress;
      
      ctx.fillStyle = '#66ccff';
      for (let i = 0; i < 3; i++) {
        const angle = (progress * 10 + i * 2) * Math.PI;
        const dist = 4;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(angle) * dist,
          y + Math.sin(angle) * dist,
          3, 0, Math.PI * 2
        );
        ctx.fill();
      }
      
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, []);

  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    ctx.fillStyle = '#1e2a3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x + canvas.width / 2, offset.y + canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-GRID_SIZE * CELL_SIZE / 2, -GRID_SIZE * CELL_SIZE / 2);

    const lineWidth = Math.max(0.5, Math.min(2, zoom));

    if (grid.length > 0) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cellType = grid[y][x];
          ctx.fillStyle = CELL_COLORS[cellType];
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

          if (hoveredCell && hoveredCell.x === x && hoveredCell.y === y) {
            ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = lineWidth;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    if (path.length > 1) {
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(path[0].x * CELL_SIZE + CELL_SIZE / 2, path[0].y * CELL_SIZE + CELL_SIZE / 2);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * CELL_SIZE + CELL_SIZE / 2, path[i].y * CELL_SIZE + CELL_SIZE / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    gameState.towers.forEach(tower => {
      const isFiring = (towerFiring[tower.id] || 0) > time - 200;
      drawTower(ctx, tower, time, isFiring);
    });

    gameState.minions.forEach(minion => {
      drawMinion(ctx, minion, time);
    });

    gameState.projectiles.forEach(proj => {
      const startX = proj.startX * CELL_SIZE + CELL_SIZE / 2;
      const startY = proj.startY * CELL_SIZE + CELL_SIZE / 2;
      const endX = proj.endX * CELL_SIZE + CELL_SIZE / 2;
      const endY = proj.endY * CELL_SIZE + CELL_SIZE / 2;
      drawProjectile(ctx, { ...proj, startX, startY, endX, endY });
    });

    ctx.restore();
  }, [gameState, grid, path, zoom, offset, hoveredCell, selectedTower, towerFiring, drawMinion, drawTower, drawProjectile]);

  useEffect(() => {
    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime >= 33) {
        render(time);
        setFrameTime(time);
        lastTime = time;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [render]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState?.towers) {
        gameState.towers.forEach(tower => {
          const minionInRange = gameState.minions.some(m => {
            const dx = m.x - tower.x;
            const dy = m.y - tower.y;
            const range = TOWER_STATS[tower.type].range * (1 + (tower.level - 1) * 0.1);
            return Math.sqrt(dx * dx + dy * dy) <= range;
          });
          if (minionInRange) {
            setTowerFiring(prev => ({ ...prev, [tower.id]: Date.now() }));
          }
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameState?.towers, gameState?.minions]);

  const screenToGrid = (screenX: number, screenY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - offset.x - canvas.width / 2) / zoom + GRID_SIZE * CELL_SIZE / 2;
    const y = (screenY - rect.top - offset.y - canvas.height / 2) / zoom + GRID_SIZE * CELL_SIZE / 2;
    
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);
    
    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
      return { x: gridX, y: gridY };
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: offset.x + (e.clientX - dragStart.x),
        y: offset.y + (e.clientY - dragStart.y)
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      const cell = screenToGrid(e.clientX, e.clientY);
      setHoveredCell(cell);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || spectate) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (spectate) return;

    const cell = screenToGrid(e.clientX, e.clientY);
    if (!cell || !gameState) return;

    const existingTower = gameState.towers.find(t => t.x === cell.x && t.y === cell.y);
    
    if (existingTower && playerSide === 'defender') {
      setSelectedTower(existingTower);
      return;
    }

    if (selectedTowerType && playerSide === 'defender' && grid[cell.y]?.[cell.x] === 'tower_base') {
      const cost = TOWER_STATS[selectedTowerType].cost;
      if (gameState.defenderGold >= cost) {
        const newTower: TowerConfig = {
          id: `tower_${Date.now()}`,
          type: selectedTowerType,
          x: cell.x,
          y: cell.y,
          level: 1
        };
        if (socketRef.current && roomId) {
          placeTower(socketRef.current, roomId, newTower);
        }
      } else {
        alert('金币不足！');
      }
      setSelectedTowerType(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (spectate) return;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.5, Math.min(2, z * delta)));
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleUpgradeTower = () => {
    if (!selectedTower || !socketRef.current || !roomId || !gameState) return;
    const cost = TOWER_STATS[selectedTower.type].upgradeCost;
    if (gameState.defenderGold >= cost) {
      upgradeTower(socketRef.current, roomId, selectedTower.id);
      setSelectedTower({ ...selectedTower, level: selectedTower.level + 1 });
    } else {
      alert('金币不足！');
    }
  };

  const handleSpawnMinion = (type: MinionType) => {
    if (!socketRef.current || !roomId || !gameState) return;
    const cost = MINION_STATS[type].cost;
    if (gameState.attackerCrystals >= cost) {
      spawnMinion(socketRef.current, roomId, type);
    } else {
      alert('水晶不足！');
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !socketRef.current || !roomId) return;
    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: playerId.slice(0, 8),
      content: chatInput,
      timestamp: Date.now(),
      roomId
    };
    sendChatMessage(socketRef.current, message);
    setChatInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendChat();
    }
  };

  const panelStyle: React.CSSProperties = {
    background: 'rgba(30, 42, 58, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    color: '#fff'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    color: '#fff',
    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 102, 255, 0.2) 100%)',
    border: '1px solid transparent',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '13px'
  };

  const selectedButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    borderImage: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%) 1',
    boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
  };

  const towerTypes: { type: TowerType; label: string; color: string }[] = [
    { type: 'cannon', label: '加农炮', color: '#8B4513' },
    { type: 'laser', label: '激光塔', color: '#ff3333' },
    { type: 'ice', label: '冰冻塔', color: '#66ccff' }
  ];

  const minionTypes: { type: MinionType; label: string; color: string; hp: number; speed: string }[] = [
    { type: 'normal', label: '普通兵', color: '#8B0000', hp: 100, speed: '正常' },
    { type: 'fast', label: '快速兵', color: '#FF6600', hp: 60, speed: '2x' },
    { type: 'heavy', label: '重装兵', color: '#4A0080', hp: 300, speed: '0.5x' }
  ];

  const displayGold = gameState?.defenderGold || 0;
  const displayCrystals = gameState?.attackerCrystals || 0;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#1e2a3a' }}>
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderBottom: '1px solid rgba(0, 212, 255, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            style={buttonStyle}
            onClick={() => navigate('/lobby')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 10px #00d4ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            ← 返回大厅
          </button>
          <span style={{ color: '#00d4ff', fontSize: '16px', fontWeight: 'bold' }}>
            {spectate ? '👁️ 观战模式' : playerSide === 'defender' ? '🛡️ 防守方' : '⚔️ 进攻方'}
          </span>
          <span style={{ color: '#888', fontSize: '13px' }}>
            回合: {gameState?.round || 0}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffd700',
            transform: goldAnim ? 'scale(1.2)' : 'scale(1)',
            transition: 'transform 0.15s ease'
          }}>
            💰 {displayGold}
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#00d4ff',
            transform: crystalAnim ? 'scale(1.2)' : 'scale(1)',
            transition: 'transform 0.15s ease'
          }}>
            💎 {displayCrystals}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isConnected ? '#00ff00' : '#ff0000',
            boxShadow: isConnected ? '0 0 10px #00ff00' : 'none'
          }} />
          <span style={{ color: '#888', fontSize: '13px' }}>
            {isConnected ? '已连接' : '断开连接'}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: '240px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {!spectate && playerSide === 'defender' && (
            <div style={panelStyle}>
              <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>🗼 建造防御塔</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {towerTypes.map(tt => (
                  <button
                    key={tt.type}
                    style={selectedTowerType === tt.type ? selectedButtonStyle : buttonStyle}
                    onClick={() => setSelectedTowerType(selectedTowerType === tt.type ? null : tt.type)}
                    disabled={!gameState || gameState.defenderGold < TOWER_STATS[tt.type].cost}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', background: tt.color, marginRight: '6px', borderRadius: '50%' }} />
                    {tt.label}
                    <span style={{ color: '#ffd700', fontSize: '11px', marginLeft: '4px' }}>
                      {TOWER_STATS[tt.type].cost}💰
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!spectate && playerSide === 'attacker' && (
            <div style={panelStyle}>
              <h3 style={{ color: '#ff6b6b', marginBottom: '12px', fontSize: '14px' }}>⚔️ 召唤小兵</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {minionTypes.map(mt => (
                  <button
                    key={mt.type}
                    style={buttonStyle}
                    onClick={() => handleSpawnMinion(mt.type)}
                    disabled={!gameState || gameState.attackerCrystals < MINION_STATS[mt.type].cost}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 10px #00d4ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', background: mt.color, marginRight: '6px', borderRadius: '2px' }} />
                    {mt.label}
                    <span style={{ color: '#00d4ff', fontSize: '11px', marginLeft: '4px' }}>
                      {MINION_STATS[mt.type].cost}💎
                    </span>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                      HP:{mt.hp} 速度:{mt.speed}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!spectate && selectedTower && playerSide === 'defender' && (
            <div style={panelStyle}>
              <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>⚙️ 塔升级</h3>
              <p style={{ fontSize: '13px', marginBottom: '8px' }}>
                {towerTypes.find(t => t.type === selectedTower.type)?.label} Lv.{selectedTower.level}
              </p>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                伤害: {Math.floor(TOWER_STATS[selectedTower.type].damage * (1 + (selectedTower.level - 1) * 0.5))}
              </p>
              <button
                style={{ ...buttonStyle, width: '100%' }}
                onClick={handleUpgradeTower}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 10px #00d4ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                升级 ({TOWER_STATS[selectedTower.type].upgradeCost}💰)
              </button>
            </div>
          )}

          <div style={panelStyle}>
            <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>📊 战况</h3>
            <p style={{ fontSize: '13px', marginBottom: '4px' }}>
              防御塔: {gameState?.towers.length || 0}
            </p>
            <p style={{ fontSize: '13px', marginBottom: '4px' }}>
              小兵: {gameState?.minions.length || 0}
            </p>
            <p style={{ fontSize: '13px' }}>
              弹道: {gameState?.projectiles.length || 0}
            </p>
          </div>

          {gameState?.gameOver && (
            <div style={{ ...panelStyle, background: 'rgba(0, 200, 100, 0.3)' }}>
              <h3 style={{ color: '#fff', textAlign: 'center', fontSize: '18px', marginBottom: '12px' }}>
                🎉 游戏结束
              </h3>
              <p style={{ textAlign: 'center', color: '#00d4ff', fontSize: '16px' }}>
                {gameState.winner === 'defender' ? '防守方胜利！' : '进攻方胜利！'}
              </p>
            </div>
          )}
        </div>

        <div 
          ref={containerRef}
          style={{ flex: 1, position: 'relative' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
        >
          <canvas ref={canvasRef} style={{ display: 'block' }} />
          
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px'
          }}>
            缩放: {(zoom * 100).toFixed(0)}% | {spectate ? '拖拽平移' : '滚轮缩放，右键拖拽'}
          </div>

          {selectedTowerType && !spectate && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              padding: '8px 16px',
              background: 'rgba(0, 212, 255, 0.8)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 'bold'
            }}>
              点击塔基座放置 {towerTypes.find(t => t.type === selectedTowerType)?.label}
            </div>
          )}
        </div>

        <div style={{ width: '280px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            ...panelStyle,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)'
          }}>
            <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>💬 聊天</h3>
            <div 
              ref={setChatListRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {chatMessages.length === 0 ? (
                <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                  暂无消息
                </p>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} style={{
                    padding: '6px 10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>
                      {msg.sender}:
                    </span>
                    <span style={{ color: '#fff', marginLeft: '6px' }}>
                      {msg.content}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                style={{
                  flex: 1,
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 212, 255