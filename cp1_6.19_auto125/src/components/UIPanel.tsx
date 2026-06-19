import React, { useState, useEffect, useRef } from 'react';
import { GameState, Base, COSTS, Player } from '../types';

interface UIPanelProps {
  gameState: GameState | null;
  playerId: string | null;
  selectedBase: Base | null;
  onBuildMiner: () => void;
  onBuildTower: () => void;
  onUpgradeBase: () => void;
  onCloseMenu: () => void;
}

interface AnimatedNumberProps {
  value: number;
  className?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, className }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    
    const startValue = prevValue.current;
    const diff = value - startValue;
    const duration = 500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + diff * easeProgress));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevValue.current = value;
  }, [value]);

  return <span className={className}>{displayValue}</span>;
};

interface BuildButtonProps {
  label: string;
  cost: number;
  icon: string;
  canAfford: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const BuildButton: React.FC<BuildButtonProps> = ({ label, cost, icon, canAfford, onClick, disabled }) => {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!canAfford || disabled) return;
    
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      setRipples(prev => [...prev, { id, x, y }]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 600);
    }
    onClick();
  };

  return (
    <button
      ref={buttonRef}
      className={`build-button ${canAfford && !disabled ? '' : 'disabled'}`}
      onClick={handleClick}
      disabled={!canAfford || disabled}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
      <span className="build-icon">{icon}</span>
      <span className="build-label">{label}</span>
      <span className="build-cost">
        <span className="gold-icon">💰</span> {cost}
      </span>
    </button>
  );
};

export const UIPanel: React.FC<UIPanelProps> = ({
  gameState,
  playerId,
  selectedBase,
  onBuildMiner,
  onBuildTower,
  onUpgradeBase,
  onCloseMenu,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [displayedLogs, setDisplayedLogs] = useState<Set<string>>(new Set());

  const player: Player | null = gameState && playerId ? gameState.players[playerId] : null;
  const playerGold = player?.gold ?? 0;

  const ownedMines = gameState
    ? Object.values(gameState.mines).filter(m => m.ownerId === playerId).length
    : 0;
  const totalMines = gameState ? Object.keys(gameState.mines).length : 0;

  useEffect(() => {
    if (!gameState) return;
    gameState.logs.forEach(log => {
      if (!displayedLogs.has(log.id)) {
        setDisplayedLogs(prev => new Set([...prev, log.id]));
      }
    });
  }, [gameState, displayedLogs]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  const getLogTypeClass = (type: string): string => {
    switch (type) {
      case 'combat': return 'log-combat';
      case 'build': return 'log-build';
      case 'victory': return 'log-victory';
      default: return 'log-info';
    }
  };

  return (
    <div className="ui-panel">
      <div className="top-bar">
        <div className="resource-display">
          <div className="resource-item">
            <span className="resource-icon">💰</span>
            <AnimatedNumber value={playerGold} className="resource-value gold-value" />
          </div>
          <div className="resource-item">
            <span className="resource-icon">⛏️</span>
            <span className="resource-value">
              <AnimatedNumber value={ownedMines} /> / {totalMines}
            </span>
          </div>
        </div>
        <div className="player-info">
          {player && (
            <>
              <div className="player-color-dot" style={{ backgroundColor: player.color }} />
              <span className="player-name">{player.name}</span>
            </>
          )}
        </div>
      </div>

      {selectedBase && (
        <div className="build-menu-overlay" onClick={onCloseMenu}>
          <div className="build-menu" onClick={e => e.stopPropagation()}>
            <div className="build-menu-header">
              <h3>建造菜单</h3>
              <button className="close-button" onClick={onCloseMenu}>✕</button>
            </div>
            <div className="build-menu-content">
              <BuildButton
                label="升级基地"
                cost={COSTS.BASE_UPGRADE}
                icon="⬢"
                canAfford={playerGold >= COSTS.BASE_UPGRADE}
                onClick={onUpgradeBase}
              />
              <BuildButton
                label="建造采矿船"
                cost={COSTS.MINER}
                icon="▲"
                canAfford={playerGold >= COSTS.MINER}
                onClick={onBuildMiner}
              />
              <BuildButton
                label="建造防御塔"
                cost={COSTS.TOWER}
                icon="■"
                canAfford={playerGold >= COSTS.TOWER}
                onClick={onBuildTower}
              />
            </div>
          </div>
        </div>
      )}

      <div className="game-log" ref={logContainerRef}>
        <div className="log-header">
          <span>📜 战斗日志</span>
        </div>
        <div className="log-container">
          {gameState?.logs.slice(0, 50).map(log => (
            <div key={log.id} className={`log-entry ${getLogTypeClass(log.type)}`}>
              <span className="log-time">[{formatTime(log.timestamp)}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
          {(!gameState || gameState.logs.length === 0) && (
            <div className="log-empty">暂无日志...</div>
          )}
        </div>
      </div>
    </div>
  );
};
