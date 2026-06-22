import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ShipConfig,
  Part,
  PartType,
  PARTS_LIBRARY,
  getRarityColor,
  createEmptyShipConfig,
  installPart,
  calculateShipStats,
  getStatColor,
  RARITY_LABELS,
  PART_TYPES
} from '@/modules/shipBuilder';

interface WorkshopProps {
  onStartRace: (config: ShipConfig) => void;
}

const WORKSHOP_WIDTH = 800;
const WORKSHOP_HEIGHT = 600;
const PART_ICON_SIZE = 64;

const SLOT_POSITIONS: Record<PartType, { x: number; y: number; width: number; height: number }> = {
  engine: { x: 80, y: 260, width: 80, height: 80 },
  armor: { x: 180, y: 250, width: 120, height: 100 },
  weapon: { x: 320, y: 260, width: 80, height: 80 },
  paint: { x: 180, y: 150, width: 120, height: 80 }
};

const Workshop: React.FC<WorkshopProps> = ({ onStartRace }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shipConfig, setShipConfig] = useState<ShipConfig>(createEmptyShipConfig());
  const [draggedPart, setDraggedPart] = useState<Part | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [hoveredPart, setHoveredPart] = useState<Part | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<PartType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const shipStats = calculateShipStats(shipConfig);

  const drawShip = useCallback((ctx: CanvasRenderingContext2D) => {
    const centerX = 250;
    const centerY = 300;

    ctx.save();

    const paintColor = shipConfig.paint ? shipConfig.paint.color : '#475569';

    ctx.fillStyle = paintColor;
    
    ctx.beginPath();
    ctx.moveTo(centerX + 120, centerY);
    ctx.lineTo(centerX + 60, centerY - 40);
    ctx.lineTo(centerX - 60, centerY - 35);
    ctx.lineTo(centerX - 80, centerY);
    ctx.lineTo(centerX - 60, centerY + 35);
    ctx.lineTo(centerX + 60, centerY + 40);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(centerX + 120, centerY);
    ctx.lineTo(centerX + 60, centerY - 40);
    ctx.lineTo(centerX - 20, centerY - 30);
    ctx.lineTo(centerX, centerY);
    ctx.closePath();
    ctx.fill();

    if (shipConfig.engine) {
      const engineColor = shipConfig.engine.color;
      ctx.fillStyle = engineColor;
      ctx.fillRect(centerX - 95, centerY - 15, 20, 30);
      
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(centerX - 95, centerY - 8);
      ctx.lineTo(centerX - 115, centerY);
      ctx.lineTo(centerX - 95, centerY + 8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(centerX - 95, centerY - 15, 20, 30);
      ctx.setLineDash([]);
    }

    if (shipConfig.armor) {
      const armorColor = shipConfig.armor.color;
      ctx.fillStyle = armorColor;
      ctx.fillRect(centerX - 30, centerY - 25, 80, 50);
      
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - 30, centerY - 25, 80, 50);
    }

    if (shipConfig.weapon) {
      const weaponColor = shipConfig.weapon.color;
      ctx.fillStyle = weaponColor;
      ctx.beginPath();
      ctx.moveTo(centerX + 100, centerY);
      ctx.lineTo(centerX + 140, centerY - 12);
      ctx.lineTo(centerX + 140, centerY + 12);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(centerX + 135, centerY - 4, 10, 8);
    } else {
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(centerX + 100, centerY);
      ctx.lineTo(centerX + 140, centerY - 12);
      ctx.lineTo(centerX + 140, centerY + 12);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
    ctx.beginPath();
    ctx.ellipse(centerX + 40, centerY, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [shipConfig]);

  const drawSlots = useCallback((ctx: CanvasRenderingContext2D) => {
    const slots: { type: PartType; label: string }[] = [
      { type: 'engine', label: '引擎槽' },
      { type: 'armor', label: '护甲槽' },
      { type: 'weapon', label: '武器槽' },
      { type: 'paint', label: '涂装槽' }
    ];

    for (const slot of slots) {
      const pos = SLOT_POSITIONS[slot.type];
      const isHovered = hoveredSlot === slot.type;

      ctx.save();

      if (isHovered) {
        ctx.shadowColor = '#60A5FA';
        ctx.shadowBlur = 15;
      }

      ctx.strokeStyle = isHovered ? '#60A5FA' : '#475569';
      ctx.lineWidth = 2;
      ctx.fillStyle = isHovered ? 'rgba(96, 165, 250, 0.1)' : 'rgba(71, 85, 105, 0.2)';

      if (slot.type === 'engine') {
        drawHexagon(ctx, pos.x + pos.width / 2, pos.y + pos.height / 2, pos.width / 2);
        ctx.fill();
        ctx.stroke();
      } else if (slot.type === 'armor') {
        ctx.beginPath();
        ctx.rect(pos.x, pos.y, pos.width, pos.height);
        ctx.fill();
        ctx.stroke();
      } else if (slot.type === 'weapon') {
        drawTriangle(ctx, pos.x, pos.y, pos.width, pos.height);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, pos.width, pos.height, 8);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(slot.label, pos.x + pos.width / 2, pos.y + pos.height + 20);
    }
  }, [hoveredSlot]);

  const drawHexagon = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  const drawTriangle = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1A1B2E';
    ctx.fillRect(0, 0, WORKSHOP_WIDTH, WORKSHOP_HEIGHT);

    ctx.strokeStyle = '#2D3748';
    ctx.lineWidth = 1;
    for (let x = 0; x < WORKSHOP_WIDTH; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORKSHOP_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < WORKSHOP_HEIGHT; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORKSHOP_WIDTH, y);
      ctx.stroke();
    }

    drawSlots(ctx);
    drawShip(ctx);

    if (draggedPart) {
      const size = PART_ICON_SIZE * 1.1;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      
      ctx.fillStyle = getRarityColor(draggedPart.rarity);
      ctx.fillRect(dragPosition.x - size / 2, dragPosition.y - size / 2, size, size);
      
      ctx.fillStyle = draggedPart.color;
      ctx.fillRect(dragPosition.x - size / 2 + 8, dragPosition.y - size / 2 + 8, size - 16, size - 16);
      
      ctx.restore();
    }
  }, [shipConfig, draggedPart, dragPosition, drawShip, drawSlots]);

  const getPartAtPosition = (x: number, y: number): PartType | null => {
    for (const [type, pos] of Object.entries(SLOT_POSITIONS)) {
      if (
        x >= pos.x - 20 &&
        x <= pos.x + pos.width + 20 &&
        y >= pos.y - 20 &&
        y <= pos.y + pos.height + 20
      ) {
        return type as PartType;
      }
    }
    return null;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggedPart) {
      setDragPosition({ x, y });
      const slotType = getPartAtPosition(x, y);
      setHoveredSlot(slotType === draggedPart.type ? slotType : null);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedPart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const slotType = getPartAtPosition(x, y);
    if (slotType === draggedPart.type) {
      setShipConfig(installPart(shipConfig, draggedPart));
    }

    setDraggedPart(null);
    setHoveredSlot(null);
  };

  const handlePartMouseDown = (part: Part, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggedPart(part);
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleRemovePart = (type: PartType) => {
    setShipConfig({ ...shipConfig, [type]: null });
  };

  const partsByType: Record<PartType, Part[]> = {
    engine: PARTS_LIBRARY.filter(p => p.type === 'engine'),
    armor: PARTS_LIBRARY.filter(p => p.type === 'armor'),
    weapon: PARTS_LIBRARY.filter(p => p.type === 'weapon'),
    paint: PARTS_LIBRARY.filter(p => p.type === 'paint')
  };

  return (
    <div className="workshop-container" ref={containerRef}>
      <div className="workshop-header">
        <h1 className="workshop-title">飞船改装车间</h1>
        <button className="start-race-btn" onClick={() => onStartRace(shipConfig)}>
          开始竞速
        </button>
      </div>

      <div className="workshop-content">
        <div className="workshop-canvas-wrapper">
          <div className="stats-panel">
            <div className="stat-item">
              <span className="stat-label">速度</span>
              <div className="stat-bar">
                <div
                  className="stat-fill"
                  style={{
                    width: `${shipStats.speed}%`,
                    backgroundColor: getStatColor(shipStats.speed)
                  }}
                />
              </div>
              <span className="stat-value">{Math.round(shipStats.speed)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">耐久</span>
              <div className="stat-bar">
                <div
                  className="stat-fill"
                  style={{
                    width: `${shipStats.durability}%`,
                    backgroundColor: getStatColor(shipStats.durability)
                  }}
                />
              </div>
              <span className="stat-value">{Math.round(shipStats.durability)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">火力</span>
              <div className="stat-bar">
                <div
                  className="stat-fill"
                  style={{
                    width: `${shipStats.firepower}%`,
                    backgroundColor: getStatColor(shipStats.firepower)
                  }}
                />
              </div>
              <span className="stat-value">{Math.round(shipStats.firepower)}</span>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={WORKSHOP_WIDTH}
            height={WORKSHOP_HEIGHT}
            className="workshop-canvas"
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>

        <div className="parts-library">
          <h2 className="parts-title">部件库</h2>

          {(Object.keys(partsByType) as PartType[]).map(type => (
            <div key={type} className="parts-category">
              <h3 className="parts-category-title">{PART_TYPES[type]}</h3>
              <div className="parts-grid">
                {partsByType[type].map(part => (
                  <div
                    key={part.id}
                    className={`part-item rarity-${part.rarity}`}
                    onMouseDown={(e) => handlePartMouseDown(part, e)}
                    onMouseEnter={() => setHoveredPart(part)}
                    onMouseLeave={() => setHoveredPart(null)}
                    style={{ backgroundColor: getRarityColor(part.rarity) }}
                  >
                    <div
                      className="part-icon"
                      style={{ backgroundColor: part.color }}
                    />
                    {hoveredPart?.id === part.id && (
                      <div className="part-tooltip">
                        <div className="part-tooltip-name">{part.name}</div>
                        <div className="part-tooltip-rarity">
                          {RARITY_LABELS[part.rarity]}
                        </div>
                        <div className="part-tooltip-desc">{part.description}</div>
                        <div className="part-tooltip-stats">
                          {part.stats.speed && <span>速度 +{part.stats.speed}</span>}
                          {part.stats.durability && <span>耐久 +{part.stats.durability}</span>}
                          {part.stats.firepower && <span>火力 +{part.stats.firepower}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="installed-parts">
            <h3 className="parts-category-title">已安装部件</h3>
            <div className="installed-list">
              {(Object.keys(shipConfig) as PartType[]).map(slot => {
                const part = shipConfig[slot];
                return (
                  <div key={slot} className="installed-item">
                    <span className="installed-slot">{PART_TYPES[slot]}:</span>
                    {part ? (
                      <span
                        className="installed-part-name"
                        onClick={() => handleRemovePart(slot)}
                      >
                        {part.name} ✕
                      </span>
                    ) : (
                      <span className="installed-empty">未安装</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workshop;
