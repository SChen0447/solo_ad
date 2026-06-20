import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CellType, TowerType, TowerConfig, MapData } from '../types';
import { CELL_COLORS, TOWER_STATS } from '../types';
import { saveMap, loadMap } from '../api';

const GRID_SIZE = 20;
const CELL_SIZE = 32;

const createEmptyGrid = (): CellType[][] => {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty'));
};

const Editor: React.FC = () => {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [grid, setGrid] = useState<CellType[][]>(createEmptyGrid());
  const [towers, setTowers] = useState<TowerConfig[]>([]);
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const [selectedCellType, setSelectedCellType] = useState<CellType>('path');
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTower, setSelectedTower] = useState<TowerConfig | null>(null);
  const [mapName, setMapName] = useState('新地图');
  const [isSaving, setIsSaving] = useState(false);
  const [placingTowers, setPlacingTowers] = useState<{ id: string; progress: number }[]>([]);

  useEffect(() => {
    if (mapId) {
      loadMap(mapId).then(mapData => {
        setGrid(mapData.grid);
        setTowers(mapData.towers);
        setPath(mapData.path);
        setMapName(mapData.name);
      }).catch(console.error);
    }
  }, [mapId]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
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
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(path[0].x * CELL_SIZE + CELL_SIZE / 2, path[0].y * CELL_SIZE + CELL_SIZE / 2);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * CELL_SIZE + CELL_SIZE / 2, path[i].y * CELL_SIZE + CELL_SIZE / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    towers.forEach(tower => {
      const centerX = tower.x * CELL_SIZE + CELL_SIZE / 2;
      const centerY = tower.y * CELL_SIZE + CELL_SIZE / 2;
      
      const placingAnim = placingTowers.find(t => t.id === tower.id);
      const yOffset = placingAnim ? (1 - placingAnim.progress) * 30 : 0;
      const scale = placingAnim ? 0.5 + placingAnim.progress * 0.5 : 1;

      ctx.save();
      ctx.translate(centerX, centerY - yOffset);
      ctx.scale(scale, scale);

      const colors: Record<TowerType, string> = {
        cannon: '#8B4513',
        laser: '#ff3333',
        ice: '#66ccff'
      };

      ctx.fillStyle = '#c7956b';
      ctx.fillRect(-12, -4, 24, 12);
      
      ctx.fillStyle = colors[tower.type];
      if (tower.type === 'cannon') {
        ctx.beginPath();
        ctx.arc(0, -8, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-3, -18, 6, 12);
      } else if (tower.type === 'laser') {
        ctx.fillRect(-6, -16, 12, 16);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-2, -18, 4, 4);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(-10, -4);
        ctx.lineTo(10, -4);
        ctx.closePath();
        ctx.fill();
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
    });

    ctx.restore();
  }, [grid, towers, path, zoom, offset, hoveredCell, selectedTower, placingTowers]);

  useEffect(() => {
    let animationId: number;
    const animate = () => {
      render();
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [render]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlacingTowers(prev => 
        prev.map(t => ({ ...t, progress: Math.min(1, t.progress + 0.05) }))
          .filter(t => t.progress < 1)
      );
    }, 16);
    return () => clearInterval(interval);
  }, []);

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
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const cell = screenToGrid(e.clientX, e.clientY);
    if (!cell) return;

    const existingTower = towers.find(t => t.x === cell.x && t.y === cell.y);
    
    if (existingTower) {
      setSelectedTower(existingTower);
      setSelectedTowerType(null);
      return;
    }

    if (selectedTowerType && grid[cell.y][cell.x] === 'tower_base') {
      const newTower: TowerConfig = {
        id: `tower_${Date.now()}`,
        type: selectedTowerType,
        x: cell.x,
        y: cell.y,
        level: 1
      };
      setTowers([...towers, newTower]);
      setPlacingTowers(prev => [...prev, { id: newTower.id, progress: 0 }]);
      return;
    }

    const newGrid = grid.map(row => [...row]);
    if (newGrid[cell.y][cell.x] === selectedCellType) {
      newGrid[cell.y][cell.x] = 'empty';
    } else {
      newGrid[cell.y][cell.x] = selectedCellType;
    }
    setGrid(newGrid);
    setSelectedTower(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.5, Math.min(2, z * delta)));
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleUpgradeTower = () => {
    if (!selectedTower) return;
    setTowers(towers.map(t => 
      t.id === selectedTower.id ? { ...t, level: t.level + 1 } : t
    ));
    setSelectedTower({ ...selectedTower, level: selectedTower.level + 1 });
  };

  const handleDeleteTower = () => {
    if (!selectedTower) return;
    setTowers(towers.filter(t => t.id !== selectedTower.id));
    setSelectedTower(null);
  };

  const handleGeneratePath = () => {
    const newPath: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === 'path') {
          newPath.push({ x, y });
        }
      }
    }
    setPath(newPath);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveMap({ name: mapName, grid, towers, path });
      alert(`地图保存成功！ID: ${result.id}`);
    } catch (error) {
      alert('保存失败，请检查后端服务是否启动');
    } finally {
      setIsSaving(false);
    }
  };

  const cellTypes: { type: CellType; label: string; color: string }[] = [
    { type: 'path', label: '路径', color: CELL_COLORS.path },
    { type: 'empty', label: '空地', color: CELL_COLORS.empty },
    { type: 'obstacle', label: '障碍物', color: CELL_COLORS.obstacle },
    { type: 'tower_base', label: '塔基座', color: CELL_COLORS.tower_base }
  ];

  const towerTypes: { type: TowerType; label: string; color: string }[] = [
    { type: 'cannon', label: '加农炮', color: '#8B4513' },
    { type: 'laser', label: '激光塔', color: '#ff3333' },
    { type: 'ice', label: '冰冻塔', color: '#66ccff' }
  ];

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

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#1e2a3a' }}>
      <div style={{ width: '240px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={panelStyle}>
          <button
            style={{ ...buttonStyle, width: '100%', marginBottom: '12px' }}
            onClick={() => navigate('/')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 10px #00d4ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            ← 返回首页
          </button>
          
          <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>📐 单元格类型</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {cellTypes.map(ct => (
              <button
                key={ct.type}
                style={selectedCellType === ct.type ? selectedButtonStyle : buttonStyle}
                onClick={() => { setSelectedCellType(ct.type); setSelectedTowerType(null); setSelectedTower(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: ct.color, marginRight: '6px', borderRadius: '2px' }} />
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>🗼 防御塔</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {towerTypes.map(tt => (
              <button
                key={tt.type}
                style={selectedTowerType === tt.type ? selectedButtonStyle : buttonStyle}
                onClick={() => { setSelectedTowerType(tt.type); setSelectedTower(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: tt.color, marginRight: '6px', borderRadius: '50%' }} />
                {tt.label}
                <span style={{ color: '#888', fontSize: '11px', marginLeft: '4px' }}>
                  {TOWER_STATS[tt.type].cost}金
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedTower && (
          <div style={panelStyle}>
            <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>⚙️ 塔升级</h3>
            <p style={{ fontSize: '13px', marginBottom: '8px' }}>
              {towerTypes.find(t => t.type === selectedTower.type)?.label} Lv.{selectedTower.level}
            </p>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
              伤害: {Math.floor(TOWER_STATS[selectedTower.type].damage * (1 + (selectedTower.level - 1) * 0.5))}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{ ...buttonStyle, flex: 1 }}
                onClick={handleUpgradeTower}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 10px #00d4ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                升级 ({TOWER_STATS[selectedTower.type].upgradeCost}金)
              </button>
              <button
                style={{ ...buttonStyle, flex: 1, background: 'rgba(255, 50, 50, 0.2)' }}
                onClick={handleDeleteTower}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                删除
              </button>
            </div>
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
          缩放: {(zoom * 100).toFixed(0)}% | 滚轮缩放 | 中键/右键拖拽
        </div>
      </div>

      <div style={{ width: '240px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={panelStyle}>
          <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>💾 地图信息</h3>
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '13px'
            }}
            placeholder="地图名称"
          />
          <button
            style={{ ...buttonStyle, width: '100%', marginBottom: '8px' }}
            onClick={handleSave}
            disabled={isSaving}
            onMouseEnter={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 10px #00d4ff'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {isSaving ? '保存中...' : '保存地图'}
          </button>
          <button
            style={{ ...buttonStyle, width: '100%' }}
            onClick={handleGeneratePath}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            生成路径点
          </button>
        </div>

        <div style={panelStyle}>
          <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>📊 统计</h3>
          <p style={{ fontSize: '13px', marginBottom: '4px' }}>网格大小: {GRID_SIZE}x{GRID_SIZE}</p>
          <p style={{ fontSize: '13px', marginBottom: '4px' }}>防御塔: {towers.length}</p>
          <p style={{ fontSize: '13px', marginBottom: '4px' }}>路径点: {path.length}</p>
          <p style={{ fontSize: '13px' }}>当前工具: {selectedTowerType ? towerTypes.find(t => t.type === selectedTowerType)?.label : cellTypes.find(c => c.type === selectedCellType)?.label}</p>
        </div>

        <div style={panelStyle}>
          <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>📝 操作说明</h3>
          <p style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.6' }}>
            1. 选择单元格类型，点击网格绘制<br/>
            2. 选择防御塔类型，点击塔基座放置<br/>
            3. 点击已有塔可升级或删除<br/>
            4. 滚轮缩放，中键/右键拖拽平移
          </p>
        </div>
      </div>
    </div>
  );
};

export default Editor;
