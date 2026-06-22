import React, { useEffect, useRef, useState } from 'react';
import {
  GameState,
  Position,
  Unit,
  UNIT_CONFIGS,
  getCellKind,
  getMovableTiles,
  getAttackableTiles,
  GATE_POSITIONS,
  CellKind,
  GRID_ROWS,
  GRID_COLS,
  isInDeployZone,
  ATTACKER_DEPLOY_COLS,
  DEFENDER_DEPLOY_START_COL,
  Side,
} from './GameEngine';

const CELL_SIZE = 56;

interface UnitRendererProps {
  state: GameState;
  onCellClick: (x: number, y: number) => void;
  onUnitClick: (unitId: string) => void;
  onCellHover?: (x: number, y: number | null) => void;
}

export const UnitRenderer: React.FC<UnitRendererProps> = ({ state, onCellClick, onUnitClick, onCellHover }) => {
  const movableTiles = state.selectedUnitId ? getMovableTiles(state, state.selectedUnitId) : [];
  const attackableTiles = state.selectedUnitId ? getAttackableTiles(state, state.selectedUnitId) : [];
  const [, setTick] = useState(0);
  const [hoverCell, setHoverCell] = useState<Position | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 16);
    return () => clearInterval(interval);
  }, []);

  const movableSet = new Set(movableTiles.map(p => `${p.x},${p.y}`));
  const attackableSet = new Set(attackableTiles.map(p => `${p.x},${p.y}`));

  const deployingSide: Side | null = state.phase === 'deploy'
    ? (state.deployStep === 'attackerDeploy' ? 'attacker' : 'defender')
    : null;

  const hasDeployType = state.phase === 'deploy' && state.selectedDeployType !== null;

  const handleHover = (x: number, y: number | null) => {
    if (y === null) {
      setHoverCell(null);
      onCellHover?.(x, null);
    } else {
      setHoverCell({ x, y });
      onCellHover?.(x, y);
    }
  };

  const renderCell = (x: number, y: number) => {
    const kind = getCellKind(x, y);
    const key = `${x},${y}`;
    const isMovable = movableSet.has(key);
    const isAttackable = attackableSet.has(key);
    const isGate = kind === 'gate';
    const isWall = kind === 'wall';
    const gateHpPercent = state.gateHp / state.gateMaxHp;
    const keyHover = hoverCell && hoverCell.x === x && hoverCell.y === y;

    let canDeployHere = false;
    let isDeployZone = false;
    if (state.phase === 'deploy' && deployingSide && !isWall) {
      isDeployZone = isInDeployZone(deployingSide, x, y);
      if (isDeployZone && hasDeployType) {
        const occupied = state.units.some(u => u.position.x === x && u.position.y === y);
        canDeployHere = !occupied;
      }
    }

    let cellStyle: React.CSSProperties = {
      position: 'absolute',
      left: x * CELL_SIZE,
      top: y * CELL_SIZE,
      width: CELL_SIZE,
      height: CELL_SIZE,
      boxSizing: 'border-box',
      cursor: (isMovable || isAttackable || canDeployHere) ? 'pointer' : 'default',
      transition: 'background-color 0.15s, box-shadow 0.15s',
    };

    if (keyHover && (canDeployHere || isMovable || isAttackable)) {
      cellStyle.boxShadow = 'inset 0 0 12px rgba(255,255,255,0.5)';
    }
    if (keyHover && canDeployHere) {
      cellStyle.transform = 'scale(1.02)';
      cellStyle.zIndex = 5;
    }

    cellStyle = {
      ...cellStyle,
      ...getCellStyle(kind, isMovable, isAttackable, isDeployZone, canDeployHere, keyHover, deployingSide, x, y),
    };

    return (
      <div
        key={key}
        style={cellStyle}
        onClick={() => onCellClick(x, y)}
        onMouseEnter={() => handleHover(x, y)}
        onMouseLeave={() => handleHover(x, null)}
      >
        {isGate && (
          <>
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '28px',
              opacity: 0.85,
            }}>
              🏰
            </div>
            <div style={{
              position: 'absolute',
              bottom: 2,
              left: 4,
              right: 4,
              height: 4,
              backgroundColor: '#3a2010',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${gateHpPercent * 100}%`,
                background: 'linear-gradient(90deg, #c0392b, #e74c3c)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </>
        )}
        {isWall && state.phase === 'deploy' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(60,60,60,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 'bold',
            letterSpacing: 1,
          }}>
            ⛔
          </div>
        )}
        {canDeployHere && keyHover && state.selectedDeployType && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.5,
            fontSize: 28,
            pointerEvents: 'none',
          }}>
            {UNIT_CONFIGS[state.selectedDeployType].icon}
          </div>
        )}
      </div>
    );
  };

  const cells: React.ReactNode[] = [];
  for (let y = 0; y < state.gridRows; y++) {
    for (let x = 0; x < state.gridCols; x++) {
      cells.push(renderCell(x, y));
    }
  }

  const now = Date.now();
  const hitPositions = new Set(
    state.hitAnimations
      .filter(h => now >= h.startTime && now - h.startTime < 300)
      .map(h => `${h.position.x},${h.position.y}`)
  );
  const deployingUnitIds = new Set(
    state.deployAnimations.map(d => d.unitId)
  );

  const renderZoneLabels = () => {
    if (state.phase !== 'deploy') return null;
    return (
      <>
        <div style={{
          position: 'absolute',
          left: 4,
          top: -26,
          color: '#922b21',
          fontWeight: 'bold',
          fontSize: 13,
          textShadow: '1px 1px 2px rgba(255,255,255,0.6)',
          pointerEvents: 'none',
        }}>
          ⬅️ 攻方部署区（左侧5列）
        </div>
        <div style={{
          position: 'absolute',
          right: 4,
          top: -26,
          color: '#1f618d',
          fontWeight: 'bold',
          fontSize: 13,
          textShadow: '1px 1px 2px rgba(255,255,255,0.6)',
          pointerEvents: 'none',
        }}>
          守方部署区（右侧5列）➡️
        </div>
        <div style={{
          position: 'absolute',
          left: ATTACKER_DEPLOY_COLS * CELL_SIZE,
          top: 0,
          width: 0,
          height: GRID_ROWS * CELL_SIZE,
          borderLeft: '2px dashed rgba(146,43,33,0.5)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          left: DEFENDER_DEPLOY_START_COL * CELL_SIZE,
          top: 0,
          width: 0,
          height: GRID_ROWS * CELL_SIZE,
          borderLeft: '2px dashed rgba(31,97,141,0.5)',
          pointerEvents: 'none',
        }} />
      </>
    );
  };

  return (
    <div style={{
      position: 'relative',
      paddingTop: 30,
    }}>
      {renderZoneLabels()}
      <div style={{
        position: 'relative',
        width: GRID_COLS * CELL_SIZE,
        height: GRID_ROWS * CELL_SIZE,
        border: '4px solid #5c3a21',
        borderRadius: 8,
        background: '#c9956a',
        boxShadow: 'inset 0 0 40px rgba(92,58,33,0.3), 0 4px 20px rgba(0,0,0,0.3)',
        userSelect: 'none',
      }}>
        {cells}

        {state.units.filter(u => u.hp > 0).map(unit => (
          <UnitSprite
            key={unit.id}
            unit={unit}
            isSelected={state.selectedUnitId === unit.id}
            isHit={hitPositions.has(`${unit.position.x},${unit.position.y}`)}
            hasDeployAnim={deployingUnitIds.has(unit.id)}
            onClick={() => onUnitClick(unit.id)}
          />
        ))}

        {state.projectiles.map(p => {
          const progress = Math.min(100, p.progress) / 100;
          const startX = p.from.x * CELL_SIZE + CELL_SIZE / 2;
          const startY = p.from.y * CELL_SIZE + CELL_SIZE / 2;
          const endX = p.to.x * CELL_SIZE + CELL_SIZE / 2;
          const endY = p.to.y * CELL_SIZE + CELL_SIZE / 2;
          const cx = startX + (endX - startX) * progress;
          const cy = startY + (endY - startY) * progress;
          const isArc = p.duration >= 500;
          const arcOffset = isArc ? -Math.sin(progress * Math.PI) * 80 : 0;
          const size = isArc ? 16 : 10;

          return (
            <div
              key={`proj_${p.id}`}
              style={{
                position: 'absolute',
                left: cx - size / 2,
                top: cy - size / 2 + arcOffset,
                width: size,
                height: size,
                borderRadius: isArc ? '50%' : 1,
                background: isArc
                  ? 'radial-gradient(circle at 30% 30%, #a08060, #5c3a21)'
                  : 'linear-gradient(135deg, #d4a574, #5c3a21)',
                boxShadow: isArc ? '0 2px 6px rgba(0,0,0,0.4)' : '0 0 4px #d4a574',
                zIndex: 100,
                pointerEvents: 'none',
                transform: `rotate(${progress * 720}deg)`,
              }}
            />
          );
        })}

        {state.hitAnimations
          .filter(h => now >= h.startTime && now - h.startTime < 300)
          .map((h, idx) => {
            const age = now - h.startTime;
            const alpha = 1 - age / 300;
            return (
              <div
                key={`hit_${idx}_${h.startTime}`}
                style={{
                  position: 'absolute',
                  left: h.position.x * CELL_SIZE,
                  top: h.position.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: `rgba(220, 50, 50, ${alpha * 0.6})`,
                  pointerEvents: 'none',
                  zIndex: 50,
                  animation: 'hitFlash 0.3s ease-out',
                }}
              />
            );
          })}

        <style>{`
          @keyframes hitFlash {
            0% { opacity: 0; }
            20% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 0; }
          }
          @keyframes unitEnterLeft {
            0% { transform: translateX(-300px) scale(0.5); opacity: 0; }
            100% { transform: translateX(0) scale(1); opacity: 1; }
          }
          @keyframes unitEnterRight {
            0% { transform: translateX(300px) scale(0.5); opacity: 0; }
            100% { transform: translateX(0) scale(1); opacity: 1; }
          }
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.8); }
            50% { box-shadow: 0 0 0 6px rgba(255,215,0,0); }
          }
          @keyframes hoverFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
        `}</style>
      </div>
    </div>
  );
};

interface GetCellStyleArgs {
  kind: CellKind;
  isMovable: boolean;
  isAttackable: boolean;
  isDeployZone: boolean;
  canDeployHere: boolean;
  isHover: boolean;
  deployingSide: Side | null;
  x: number;
  y: number;
}

function getCellStyle(
  kind: CellKind,
  isMovable: boolean,
  isAttackable: boolean,
  isDeployZone: boolean,
  canDeployHere: boolean,
  isHover: boolean,
  deployingSide: Side | null,
  x: number,
  y: number
): React.CSSProperties {
  const base = (x + y) % 2 === 0 ? '#d9a875' : '#cd9a68';
  let bg: any = base;
  let borderColor = 'rgba(92,58,33,0.2)';

  switch (kind) {
    case 'wall':
      bg = 'linear-gradient(135deg, #7a6a5a 0%, #5a4a3a 50%, #6a5a4a 100%)';
      borderColor = '#3a2a1a';
      break;
    case 'gate':
      bg = 'linear-gradient(180deg, #8b4513 0%, #654321 100%)';
      borderColor = '#3a2010';
      break;
    case 'attackerZone':
      bg = (x + y) % 2 === 0 ? '#d49574' : '#c48a68';
      borderColor = 'rgba(180,80,60,0.3)';
      break;
    case 'defenderZone':
      bg = (x + y) % 2 === 0 ? '#9ab4d4' : '#8aa4c4';
      borderColor = 'rgba(60,80,120,0.3)';
      break;
  }

  if (isDeployZone && deployingSide) {
    const tint = deployingSide === 'attacker'
      ? 'rgba(180,60,40,0.12)'
      : 'rgba(60,100,160,0.12)';
    if (typeof bg === 'string' && bg.startsWith('#')) {
      bg = mixWithTint(bg, tint, 0.4);
    }
    borderColor = deployingSide === 'attacker'
      ? 'rgba(146,43,33,0.35)'
      : 'rgba(31,97,141,0.35)';
  }

  if (canDeployHere && isHover) {
    bg = deployingSide === 'attacker'
      ? 'rgba(100, 180, 100, 0.45)'
      : 'rgba(100, 160, 220, 0.45)';
    borderColor = deployingSide === 'attacker' ? '#2d8a2d' : '#2d6a9a';
  } else if (canDeployHere) {
    bg = deployingSide === 'attacker'
      ? 'rgba(180, 220, 180, 0.35)'
      : 'rgba(180, 210, 240, 0.35)';
    borderColor = deployingSide === 'attacker' ? '#5aaa5a' : '#5a8aba';
  }

  if (isMovable) {
    bg = 'rgba(100, 200, 100, 0.45)';
    borderColor = '#2d8a2d';
  }
  if (isAttackable) {
    bg = 'rgba(220, 80, 80, 0.45)';
    borderColor = '#a02020';
  }

  return {
    background: bg,
    border: `1px solid ${borderColor}`,
  };
}

function mixWithTint(hex: string, rgbaTint: string, weight: number): string {
  const m = rgbaTint.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!m) return hex;
  const tr = parseInt(m[1]), tg = parseInt(m[2]), tb = parseInt(m[3]), ta = parseFloat(m[4]);
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  const nr = Math.round(r * (1 - ta * weight) + tr * ta * weight);
  const ng = Math.round(g * (1 - ta * weight) + tg * ta * weight);
  const nb = Math.round(b * (1 - ta * weight) + tb * ta * weight);
  return `rgb(${nr},${ng},${nb})`;
}

interface UnitSpriteProps {
  unit: Unit;
  isSelected: boolean;
  isHit: boolean;
  hasDeployAnim: boolean;
  onClick: () => void;
}

const UnitSprite: React.FC<UnitSpriteProps> = ({ unit, isSelected, isHit, hasDeployAnim, onClick }) => {
  const cfg = UNIT_CONFIGS[unit.type];
  const hpPercent = unit.hp / unit.maxHp;
  const animName = hasDeployAnim
    ? (unit.side === 'attacker' ? 'unitEnterLeft' : 'unitEnterRight')
    : undefined;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: 'absolute',
        left: unit.position.x * CELL_SIZE + 2,
        top: unit.position.y * CELL_SIZE + 2,
        width: CELL_SIZE - 4,
        height: CELL_SIZE - 4,
        cursor: 'pointer',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        background: unit.side === 'attacker'
          ? 'linear-gradient(135deg, rgba(180,60,40,0.25), rgba(130,30,20,0.35))'
          : 'linear-gradient(135deg, rgba(60,100,160,0.25), rgba(30,60,120,0.35))',
        border: isSelected
          ? '2px solid #ffd700'
          : `2px solid ${unit.side === 'attacker' ? '#9a3020' : '#305080'}`,
        boxShadow: isSelected
          ? '0 0 12px #ffd700, inset 0 0 8px rgba(255,215,0,0.4)'
          : `inset 0 0 4px ${unit.side === 'attacker' ? 'rgba(180,60,40,0.5)' : 'rgba(60,100,160,0.5)'}`,
        animation: animName ? `${animName} 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both` : undefined,
        filter: isHit ? 'brightness(2) saturate(2) hue-rotate(-20deg)' : 'none',
        transition: 'left 0.2s ease, top 0.2s ease, filter 0.1s, transform 0.15s',
      }}
    >
      <div style={{
        fontSize: 26,
        lineHeight: 1,
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
        marginTop: 2,
      }}>
        {cfg.icon}
      </div>
      <div style={{
        width: '80%',
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 4,
      }}>
        <div style={{
          height: '100%',
          width: `${hpPercent * 100}%`,
          background: hpPercent > 0.5
            ? 'linear-gradient(90deg, #27ae60, #2ecc71)'
            : hpPercent > 0.25
            ? 'linear-gradient(90deg, #f39c12, #f1c40f)'
            : 'linear-gradient(90deg, #c0392b, #e74c3c)',
          transition: 'width 0.2s',
        }} />
      </div>
    </div>
  );
};
