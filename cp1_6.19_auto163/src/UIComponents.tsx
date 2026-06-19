import React from 'react';
import { Player, Item, BattleState, Room, GRID_SIZE, Direction } from './types';
import { getTotalAttack, getTotalDefense } from './ItemSystem';

interface StatusBarProps {
  player: Player;
}

export const StatusBar: React.FC<StatusBarProps> = ({ player }) => {
  const totalAtk = getTotalAttack(player.attack, player.equippedWeapon);
  const totalDef = getTotalDefense(player.defense, player.equippedArmor);
  const hpPercent = (player.hp / player.maxHp) * 100;

  return (
    <div className="status-bar" style={styles.statusBar}>
      <h3 style={styles.title}>角色状态</h3>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>生命</span>
        <div style={styles.hpBarContainer}>
          <div style={{ ...styles.hpBar, width: `${hpPercent}%` }} />
          <span style={styles.hpText}>{player.hp}/{player.maxHp}</span>
        </div>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>攻击</span>
        <span style={styles.statValue}>{totalAtk}</span>
        {player.equippedWeapon && (
          <span style={styles.equippedBadge}>武器: {player.equippedWeapon.name}</span>
        )}
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>防御</span>
        <span style={styles.statValue}>{totalDef}</span>
        {player.equippedArmor && (
          <span style={styles.equippedBadge}>防具: {player.equippedArmor.name}</span>
        )}
      </div>
    </div>
  );
};

interface InventoryProps {
  player: Player;
  onEquip: (item: Item) => void;
  onDrop: (item: Item) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const Inventory: React.FC<InventoryProps> = ({ player, onEquip, onDrop, onClose, isOpen }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.inventoryPanel}
        onClick={(e) => e.stopPropagation()}
        className="inventory-panel"
      >
        <h2 style={styles.panelTitle}>背包</h2>
        <div style={styles.inventoryGrid}>
          {player.inventory.map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.itemSlot,
                borderColor: item.type === 'weapon' ? '#ff6b6b' : '#4dabf7',
              }}
            >
              <div
                style={{
                  ...styles.itemIcon,
                  backgroundColor: item.type === 'weapon' ? '#8b0000' : '#4169e1',
                }}
              >
                {item.type === 'weapon' ? '⚔' : '🛡'}
              </div>
              <div style={styles.itemName}>{item.name}</div>
              <div style={styles.itemStats}>
                {item.type === 'weapon'
                  ? `攻击 +${item.attack}`
                  : `防御 +${item.defense}`}
              </div>
              <div style={styles.itemActions}>
                <button style={styles.actionButton} onClick={() => onEquip(item)}>
                  装备
                </button>
                <button style={{ ...styles.actionButton, ...styles.dropButton }} onClick={() => onDrop(item)}>
                  丢弃
                </button>
              </div>
            </div>
          ))}
          {Array.from({ length: 6 - player.inventory.length }).map((_, i) => (
            <div key={`empty-${i}`} style={{ ...styles.itemSlot, ...styles.emptySlot }}>
              <span style={styles.emptyText}>空</span>
            </div>
          ))}
        </div>
        <button style={styles.closeButton} onClick={onClose}>
          关闭 (I)
        </button>
      </div>
    </div>
  );
};

interface BattleLogProps {
  log: string[];
}

export const BattleLog: React.FC<BattleLogProps> = ({ log }) => {
  return (
    <div style={styles.battleLog}>
      <h4 style={styles.logTitle}>战斗日志</h4>
      <div style={styles.logContent}>
        {log.map((entry, index) => (
          <div key={index} style={styles.logEntry}>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
};

interface MiniMapProps {
  dungeon: Room[][];
  playerRoomX: number;
  playerRoomY: number;
}

export const MiniMap: React.FC<MiniMapProps> = ({ dungeon, playerRoomX, playerRoomY }) => {
  const cellSize = 12;

  return (
    <div style={styles.miniMap}>
      <div style={styles.miniMapTitle}>地图</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          gap: '1px',
        }}
      >
        {dungeon.map((row, y) =>
          row.map((room, x) => {
            const isPlayer = x === playerRoomX && y === playerRoomY;
            const isVisited = room.visited;
            let bgColor = '#1a1a1a';
            if (isVisited) {
              bgColor = '#3a3a3a';
            }
            if (isPlayer) {
              bgColor = '#4169e1';
            }
            return (
              <div
                key={`${x}-${y}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: bgColor,
                  opacity: isVisited || isPlayer ? 1 : 0.3,
                }}
              />
            );
          })
        )}
      </div>
      <div style={styles.roomCoord}>
        房间: ({playerRoomX}, {playerRoomY})
      </div>
    </div>
  );
};

interface BattleViewProps {
  battleState: BattleState;
  player: Player;
  onPlayerAttack: () => void;
  onFlee: () => void;
  showTransition: boolean;
}

export const BattleView: React.FC<BattleViewProps> = ({
  battleState,
  player,
  onPlayerAttack,
  onFlee,
  showTransition,
}) => {
  if (!battleState.enemy) return null;

  const enemy = battleState.enemy;
  const enemyHpPercent = (enemy.hp / enemy.maxHp) * 100;
  const playerHpPercent = (player.hp / player.maxHp) * 100;

  const isEnemyFlashing = battleState.animation?.target === 'enemy' && battleState.animation.elapsed < 150;
  const isPlayerFlashing = battleState.animation?.target === 'player' && battleState.animation.elapsed < 150;

  return (
    <div
      style={{
        ...styles.battleOverlay,
        opacity: showTransition ? 0 : 1,
        transition: 'opacity 0.5s ease-in-out',
      }}
      className="battle-overlay"
    >
      <div style={styles.battleArena}>
        <h2 style={styles.battleTitle}>⚔ 战斗 ⚔</h2>

        <div style={styles.battleCharacters}>
          <div style={styles.battleCharacter}>
            <div
              style={{
                ...styles.characterSprite,
                backgroundColor: '#4169e1',
                opacity: isPlayerFlashing ? 0.5 : 1,
                transform: isPlayerFlashing ? 'scale(1.1)' : 'scale(1)',
                transition: 'opacity 0.1s, transform 0.1s',
              }}
            >
              <span style={styles.characterEmoji}>🧙</span>
            </div>
            <div style={styles.characterName}>勇者</div>
            <div style={styles.hpBarSmall}>
              <div style={{ ...styles.hpFill, width: `${playerHpPercent}%` }} />
              <span style={styles.hpTextSmall}>{player.hp}/{player.maxHp}</span>
            </div>
            {battleState.animation?.target === 'player' && (
              <div style={styles.damageNumber}>-{battleState.animation.damage}</div>
            )}
          </div>

          <div style={styles.vsText}>VS</div>

          <div style={styles.battleCharacter}>
            <div
              style={{
                ...styles.characterSprite,
                backgroundColor: '#8b0000',
                opacity: isEnemyFlashing ? 0.5 : 1,
                transform: isEnemyFlashing ? 'scale(1.1)' : 'scale(1)',
                transition: 'opacity 0.1s, transform 0.1s',
              }}
            >
              <span style={styles.characterEmoji}>👹</span>
            </div>
            <div style={styles.characterName}>{enemy.name}</div>
            <div style={styles.hpBarSmall}>
              <div style={{ ...styles.hpFill, ...styles.enemyHp, width: `${enemyHpPercent}%` }} />
              <span style={styles.hpTextSmall}>{enemy.hp}/{enemy.maxHp}</span>
            </div>
            {battleState.animation?.target === 'enemy' && (
              <div style={styles.damageNumber}>-{battleState.animation.damage}</div>
            )}
          </div>
        </div>

        <div style={styles.battleLog}>
          {battleState.log.slice(-5).map((entry, i) => (
            <div key={i} style={styles.logEntry}>{entry}</div>
          ))}
        </div>

        <div style={styles.battleActions}>
          <button
            style={styles.battleButton}
            onClick={onPlayerAttack}
            disabled={!battleState.playerTurn || battleState.animation !== null}
          >
            攻击
          </button>
          <button style={{ ...styles.battleButton, ...styles.fleeButton }} onClick={onFlee}>
            逃跑
          </button>
        </div>

        <div style={styles.turnIndicator}>
          {battleState.playerTurn ? '你的回合' : '敌人回合'}
        </div>
      </div>
    </div>
  );
};

interface DungeonRoomProps {
  room: Room;
  playerX: number;
  playerY: number;
  playerDirection: Direction;
  tileSize: number;
  renderTick: number;
}

export const DungeonRoom: React.FC<DungeonRoomProps> = ({
  room,
  playerX,
  playerY,
  playerDirection,
  tileSize,
}) => {
  const getDirectionArrow = (dir: Direction): string => {
    switch (dir) {
      case 'up': return '↑';
      case 'down': return '↓';
      case 'left': return '←';
      case 'right': return '→';
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#2a2a2a',
      }}
    >
      {room.walls.map((row, y) =>
        row.map((isWall, x) => (
          <div
            key={`tile-${x}-${y}`}
            style={{
              position: 'absolute',
              left: x * tileSize,
              top: y * tileSize,
              width: tileSize,
              height: tileSize,
              backgroundColor: isWall ? '#4a3a2a' : '#2a2a2a',
              boxSizing: 'border-box',
              border: '1px solid #1a1a1a',
            }}
          />
        ))
      )}

      {room.hasChest && !room.chestOpened && (
        <div
          style={{
            position: 'absolute',
            left: 4 * tileSize,
            top: 4 * tileSize,
            width: tileSize,
            height: tileSize,
            backgroundColor: '#ffd700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: tileSize * 0.6,
          }}
        >
          📦
        </div>
      )}

      {room.enemies.map((enemy, index) => (
        <div
          key={enemy.id}
          style={{
            position: 'absolute',
            left: (2 + index * 2) * tileSize,
            top: 3 * tileSize,
            width: tileSize,
            height: tileSize,
            backgroundColor: '#8b0000',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: tileSize * 0.5,
          }}
        >
          👹
        </div>
      ))}

      {room.items.map((item, index) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: (3 + index) * tileSize,
            top: 6 * tileSize,
            width: tileSize,
            height: tileSize,
            backgroundColor: item.type === 'weapon' ? '#ff4444' : '#4444ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: tileSize * 0.5,
          }}
        >
          {item.type === 'weapon' ? '⚔' : '🛡'}
        </div>
      ))}

      <div
        style={{
          position: 'absolute',
          left: playerX * tileSize,
          top: playerY * tileSize,
          width: tileSize,
          height: tileSize,
          backgroundColor: '#4169e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: tileSize * 0.6,
          transition: 'left 0.1s ease-out, top 0.1s ease-out',
          borderRadius: '4px',
        }}
      >
        <span style={{ color: 'white', fontWeight: 'bold' }}>
          {getDirectionArrow(playerDirection)}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  statusBar: {
    backgroundColor: '#1e1e1e',
    padding: '12px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    color: '#e0e0e0',
    width: '200px',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#ffd700',
    borderBottom: '1px solid #444',
    paddingBottom: '6px',
  },
  statRow: {
    marginBottom: '8px',
    fontSize: '12px',
  },
  statLabel: {
    display: 'inline-block',
    width: '40px',
    color: '#aaa',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#fff',
  },
  hpBarContainer: {
    display: 'inline-block',
    width: '120px',
    height: '16px',
    backgroundColor: '#333',
    borderRadius: '3px',
    position: 'relative',
    verticalAlign: 'middle',
    marginLeft: '8px',
  },
  hpBar: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  hpText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '10px',
    color: '#fff',
    textShadow: '1px 1px 2px #000',
  },
  equippedBadge: {
    display: 'block',
    fontSize: '10px',
    color: '#ffd700',
    marginTop: '2px',
    marginLeft: '40px',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  inventoryPanel: {
    backgroundColor: '#1e1e1e',
    padding: '24px',
    borderRadius: '12px',
    fontFamily: 'monospace',
    color: '#e0e0e0',
    width: '500px',
    animation: 'scaleIn 0.3s ease-out',
  },
  panelTitle: {
    margin: '0 0 16px 0',
    color: '#ffd700',
    textAlign: 'center',
  },
  inventoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  itemSlot: {
    backgroundColor: '#2a2a2a',
    border: '2px solid #444',
    borderRadius: '8px',
    padding: '10px',
    textAlign: 'center',
  },
  emptySlot: {
    opacity: 0.3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100px',
  },
  emptyText: {
    color: '#666',
  },
  itemIcon: {
    width: '40px',
    height: '40px',
    margin: '0 auto 8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  itemName: {
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  itemStats: {
    fontSize: '10px',
    color: '#aaa',
    marginBottom: '8px',
  },
  itemActions: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  },
  actionButton: {
    padding: '4px 8px',
    fontSize: '10px',
    backgroundColor: '#4a9eff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  dropButton: {
    backgroundColor: '#ff6b6b',
  },
  closeButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  battleLog: {
    backgroundColor: '#1a1a1a',
    padding: '10px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    color: '#ccc',
    fontSize: '12px',
    marginTop: '12px',
  },
  logTitle: {
    margin: '0 0 8px 0',
    color: '#ffd700',
    fontSize: '12px',
  },
  logContent: {
    maxHeight: '120px',
    overflowY: 'auto',
  },
  logEntry: {
    padding: '2px 0',
    borderBottom: '1px solid #333',
  },
  miniMap: {
    backgroundColor: '#1e1e1e',
    padding: '10px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    color: '#e0e0e0',
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 10,
  },
  miniMapTitle: {
    fontSize: '12px',
    color: '#ffd700',
    marginBottom: '6px',
    textAlign: 'center',
  },
  roomCoord: {
    marginTop: '8px',
    fontSize: '11px',
    textAlign: 'center',
    color: '#aaa',
  },
  battleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  battleArena: {
    backgroundColor: '#1a1a2e',
    padding: '30px',
    borderRadius: '16px',
    fontFamily: 'monospace',
    color: '#e0e0e0',
    width: '500px',
    textAlign: 'center',
    border: '2px solid #4a3a2a',
  },
  battleTitle: {
    color: '#ffd700',
    margin: '0 0 20px 0',
    fontSize: '24px',
  },
  battleCharacters: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: '20px',
  },
  battleCharacter: {
    position: 'relative',
  },
  characterSprite: {
    width: '80px',
    height: '80px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 10px',
  },
  characterEmoji: {
    fontSize: '48px',
  },
  characterName: {
    fontWeight: 'bold',
    marginBottom: '6px',
  },
  hpBarSmall: {
    width: '80px',
    height: '12px',
    backgroundColor: '#333',
    borderRadius: '3px',
    position: 'relative',
    margin: '0 auto',
  },
  hpFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  enemyHp: {
    backgroundColor: '#f44336',
  },
  hpTextSmall: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '9px',
    color: '#fff',
    textShadow: '1px 1px 1px #000',
  },
  vsText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  damageNumber: {
    position: 'absolute',
    top: '-20px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: '18px',
    animation: 'floatUp 0.6s ease-out forwards',
  },
  battleActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  battleButton: {
    padding: '12px 32px',
    fontSize: '14px',
    backgroundColor: '#4a9eff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  fleeButton: {
    backgroundColor: '#666',
  },
  turnIndicator: {
    fontSize: '12px',
    color: '#ffd700',
    marginTop: '8px',
  },
};
