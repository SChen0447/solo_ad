import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, Room, BattleState, GameState, Direction, Item, ROOM_SIZE, GRID_SIZE } from './types';
import { generateDungeon } from './MapGenerator';
import { createBattleState, playerAttack, enemyAttack, updateBattleAnimation, generateEnemyDrop } from './BattleSystem';
import { pickUpItem, equipItem, dropItem } from './ItemSystem';
import { StatusBar, Inventory, MiniMap, BattleView, DungeonRoom } from './UIComponents';

const VIEWPORT_SIZE = 640;
const TILE_SIZE = VIEWPORT_SIZE / ROOM_SIZE;
const MOVE_SPEED = 2;

export const GameEngine: React.FC = () => {
  const [dungeon, setDungeon] = useState<Room[][]>([]);
  const [player, setPlayer] = useState<Player>({
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    inventory: [],
    equippedWeapon: null,
    equippedArmor: null,
    roomX: 0,
    roomY: 0,
    tileX: 1,
    tileY: 1,
    direction: 'right',
  });
  const [gameState, setGameState] = useState<GameState>('exploring');
  const [battleState, setBattleState] = useState<BattleState>({
    active: false,
    enemy: null,
    playerTurn: true,
    log: [],
    animation: null,
  });
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [, setRenderTick] = useState(0);
  const [showBattleTransition, setShowBattleTransition] = useState(false);
  const [messageLog, setMessageLog] = useState<string[]>(['欢迎来到地牢！使用WASD移动，I键打开背包。']);

  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const moveCooldownRef = useRef<number>(0);
  const playerRef = useRef(player);
  const dungeonRef = useRef(dungeon);
  const battleStateRef = useRef(battleState);
  const inventoryOpenRef = useRef(inventoryOpen);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    dungeonRef.current = dungeon;
  }, [dungeon]);

  useEffect(() => {
    battleStateRef.current = battleState;
  }, [battleState]);

  useEffect(() => {
    inventoryOpenRef.current = inventoryOpen;
  }, [inventoryOpen]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const addMessage = useCallback((msg: string) => {
    setMessageLog(prev => {
      const newLog = [...prev, msg];
      return newLog.slice(-5);
    });
  }, []);

  useEffect(() => {
    const newDungeon = generateDungeon();
    setDungeon(newDungeon);
    dungeonRef.current = newDungeon;
  }, []);

  const tryPickupItems = useCallback(() => {
    const currentDungeon = dungeonRef.current;
    const currentPlayer = playerRef.current;

    if (currentDungeon.length === 0) return;

    const room = currentDungeon[currentPlayer.roomY][currentPlayer.roomX];
    if (room.items.length === 0) return;

    const px = Math.round(currentPlayer.tileX);
    const py = Math.round(currentPlayer.tileY);

    const itemsToPickup: Item[] = [];
    const remainingItems: Item[] = [];

    for (let i = 0; i < room.items.length; i++) {
      const item = room.items[i];
      const itemX = 3 + i;
      const itemY = 6;
      const dist = Math.abs(px - itemX) + Math.abs(py - itemY);

      if (dist <= 1) {
        itemsToPickup.push(item);
      } else {
        remainingItems.push(item);
      }
    }

    if (itemsToPickup.length > 0) {
      let newInventory = [...currentPlayer.inventory];
      let pickedUp = 0;

      for (const item of itemsToPickup) {
        const result = pickUpItem(newInventory, item);
        if (result.success) {
          newInventory = result.inventory;
          pickedUp++;
          addMessage(`拾取了 ${item.name}！`);
        } else {
          addMessage(result.message);
          break;
        }
      }

      if (pickedUp > 0) {
        setPlayer(prev => ({ ...prev, inventory: newInventory }));
        setDungeon(prev => {
          const newDungeon = prev.map(row => row.map(r => ({ ...r })));
          newDungeon[currentPlayer.roomY][currentPlayer.roomX].items = remainingItems;
          return newDungeon;
        });
      }
    }
  }, [addMessage]);

  const checkEnemyEncounter = useCallback((tileX: number, tileY: number) => {
    const currentDungeon = dungeonRef.current;
    const currentPlayer = playerRef.current;

    if (currentDungeon.length === 0) return;

    const room = currentDungeon[currentPlayer.roomY][currentPlayer.roomX];

    for (let i = 0; i < room.enemies.length; i++) {
      const enemy = room.enemies[i];
      const enemyX = 2 + i * 2;
      const enemyY = 3;
      const dist = Math.abs(tileX - enemyX) + Math.abs(tileY - enemyY);

      if (dist <= 1) {
        startBattle(enemy, currentPlayer.roomX, currentPlayer.roomY);
        break;
      }
    }
  }, []);

  const startBattle = useCallback((enemy: { id: string; name: string; hp: number; maxHp: number; attack: number; defense: number }, roomX: number, roomY: number) => {
    setShowBattleTransition(true);
    setGameState('battle');

    setTimeout(() => {
      setBattleState(createBattleState(enemy));
      setShowBattleTransition(false);

      setDungeon(prev => {
        const newDungeon = prev.map(row => row.map(r => ({ ...r })));
        newDungeon[roomY][roomX].visited = true;
        return newDungeon;
      });
    }, 500);
  }, []);

  const handleRoomTransition = useCallback((dx: number, dy: number, direction: Direction) => {
    const currentPlayer = playerRef.current;
    const currentDungeon = dungeonRef.current;

    const newRoomX = currentPlayer.roomX + dx;
    const newRoomY = currentPlayer.roomY + dy;

    if (newRoomX < 0 || newRoomX >= GRID_SIZE || newRoomY < 0 || newRoomY >= GRID_SIZE) {
      return;
    }

    const targetRoom = currentDungeon[newRoomY][newRoomX];
    if (!targetRoom.visited && targetRoom.enemies.length > 0) {
      setPlayer(prev => ({ ...prev, direction }));
      startBattle(targetRoom.enemies[0], newRoomX, newRoomY);
      return;
    }

    let entryX = 1;
    let entryY = 1;
    if (dx > 0) entryX = 0;
    if (dx < 0) entryX = ROOM_SIZE - 2;
    if (dy > 0) entryY = 0;
    if (dy < 0) entryY = ROOM_SIZE - 2;

    setPlayer(prev => ({
      ...prev,
      roomX: newRoomX,
      roomY: newRoomY,
      tileX: entryX,
      tileY: entryY,
      direction,
    }));

    setDungeon(prev => {
      const newDungeon = prev.map(row => row.map(r => ({ ...r })));
      newDungeon[newRoomY][newRoomX].visited = true;
      return newDungeon;
    });
  }, [startBattle]);

  const handleMovement = useCallback((deltaTime: number) => {
    const currentDungeon = dungeonRef.current;
    const currentPlayer = playerRef.current;

    if (currentDungeon.length === 0) return;
    if (moveCooldownRef.current > 0) return;
    if (inventoryOpenRef.current) return;

    const room = currentDungeon[currentPlayer.roomY][currentPlayer.roomX];
    let dx = 0;
    let dy = 0;
    let newDirection: Direction = currentPlayer.direction;

    if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
      dy = -1;
      newDirection = 'up';
    } else if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
      dy = 1;
      newDirection = 'down';
    } else if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
      dx = -1;
      newDirection = 'left';
    } else if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
      dx = 1;
      newDirection = 'right';
    }

    if (dx === 0 && dy === 0) return;

    const currentTileX = Math.round(currentPlayer.tileX);
    const currentTileY = Math.round(currentPlayer.tileY);
    const newTileX = currentTileX + dx;
    const newTileY = currentTileY + dy;

    if (newTileX < 0 || newTileX >= ROOM_SIZE || newTileY < 0 || newTileY >= ROOM_SIZE) {
      handleRoomTransition(dx, dy, newDirection);
      return;
    }

    if (room.walls[newTileY][newTileX]) {
      setPlayer(prev => ({ ...prev, direction: newDirection }));
      return;
    }

    setPlayer(prev => ({
      ...prev,
      tileX: newTileX,
      tileY: newTileY,
      direction: newDirection,
    }));

    moveCooldownRef.current = 1000 / MOVE_SPEED;

    checkEnemyEncounter(newTileX, newTileY);
  }, [handleRoomTransition, checkEnemyEncounter]);

  useEffect(() => {
    const gameLoop = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      if (gameStateRef.current === 'exploring') {
        if (moveCooldownRef.current > 0) {
          moveCooldownRef.current -= deltaTime;
        }
        handleMovement(deltaTime);
        tryPickupItems();
      } else if (gameStateRef.current === 'battle' && battleStateRef.current.active) {
        setBattleState(prev => updateBattleAnimation(prev, deltaTime));
      }

      setRenderTick(prev => prev + 1);
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [handleMovement, tryPickupItems]);

  useEffect(() => {
    if (gameState !== 'battle') return;
    if (battleState.playerTurn) return;
    if (battleState.animation) return;
    if (!battleState.enemy || battleState.enemy.hp <= 0) return;

    const timer = setTimeout(() => {
      const result = enemyAttack(battleStateRef.current, playerRef.current);
      setBattleState(result.state);
      if (result.damage > 0) {
        setPlayer(prev => ({
          ...prev,
          hp: Math.max(0, prev.hp - result.damage),
        }));
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [gameState, battleState.playerTurn, battleState.animation, battleState.enemy]);

  useEffect(() => {
    if (player.hp <= 0 && gameState === 'battle') {
      setGameState('gameover');
      addMessage('你被击败了...');
    }
  }, [player.hp, gameState, addMessage]);

  const tryInteract = useCallback(() => {
    const currentDungeon = dungeonRef.current;
    const currentPlayer = playerRef.current;

    if (currentDungeon.length === 0) return;
    if (gameStateRef.current !== 'exploring') return;

    const room = currentDungeon[currentPlayer.roomY][currentPlayer.roomX];
    const px = Math.round(currentPlayer.tileX);
    const py = Math.round(currentPlayer.tileY);

    if (room.hasChest && !room.chestOpened) {
      const chestX = 4;
      const chestY = 4;
      const dist = Math.abs(px - chestX) + Math.abs(py - chestY);
      if (dist <= 2) {
        openChest();
      }
    }
  }, []);

  const openChest = useCallback(() => {
    const currentPlayer = playerRef.current;

    setDungeon(prev => {
      const newDungeon = prev.map(row => row.map(r => ({ ...r })));
      const room = newDungeon[currentPlayer.roomY][currentPlayer.roomX];
      room.chestOpened = true;

      const lootCount = 1 + Math.floor(Math.random() * 2);
      const items: Item[] = [];
      for (let i = 0; i < lootCount; i++) {
        items.push(generateEnemyDrop());
      }
      room.items = items;

      return newDungeon;
    });

    addMessage('打开了宝箱！走近物品自动拾取。');
  }, [addMessage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.add(key);

      if (key === 'i') {
        setInventoryOpen(prev => !prev);
      }
      if (key === 'e') {
        tryInteract();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tryInteract]);

  const handlePlayerAttack = useCallback(() => {
    if (!battleState.playerTurn || battleState.animation) return;
    if (!battleState.enemy || battleState.enemy.hp <= 0) return;

    const result = playerAttack(battleState, player);
    setBattleState(result.state);

    if (result.enemyDefeated) {
      setTimeout(() => {
        endBattle(true);
      }, 800);
    }
  }, [battleState, player]);

  const endBattle = useCallback((victory: boolean) => {
    const currentPlayer = playerRef.current;
    const currentBattle = battleStateRef.current;

    if (victory && currentBattle.enemy) {
      const drop = generateEnemyDrop();

      setDungeon(prev => {
        const newDungeon = prev.map(row => row.map(r => ({ ...r })));
        const room = newDungeon[currentPlayer.roomY][currentPlayer.roomX];
        room.enemies = room.enemies.filter(e => e.id !== currentBattle.enemy?.id);
        room.items = [...room.items, drop];
        return newDungeon;
      });

      addMessage(`击败了 ${currentBattle.enemy.name}！掉落了 ${drop.name}。`);
    }

    setBattleState({
      active: false,
      enemy: null,
      playerTurn: true,
      log: [],
      animation: null,
    });
    setGameState('exploring');
  }, [addMessage]);

  const handleFlee = useCallback(() => {
    if (Math.random() < 0.5) {
      addMessage('逃跑成功！');
      endBattle(false);
    } else {
      addMessage('逃跑失败！');
      setBattleState(prev => ({ ...prev, playerTurn: false }));
    }
  }, [addMessage, endBattle]);

  const handleEquipItem = useCallback((item: Item) => {
    const currentPlayer = playerRef.current;
    const result = equipItem(currentPlayer.inventory, item, currentPlayer.equippedWeapon, currentPlayer.equippedArmor);
    setPlayer(prev => ({
      ...prev,
      inventory: result.inventory,
      equippedWeapon: result.equippedWeapon,
      equippedArmor: result.equippedArmor,
    }));
    addMessage(result.message);
  }, [addMessage]);

  const handleDropItem = useCallback((item: Item) => {
    const currentPlayer = playerRef.current;
    const result = dropItem(currentPlayer.inventory, item);
    setPlayer(prev => ({ ...prev, inventory: result.inventory }));
    addMessage(result.message);
  }, [addMessage]);

  const resetGame = useCallback(() => {
    const newDungeon = generateDungeon();
    setDungeon(newDungeon);
    dungeonRef.current = newDungeon;

    const newPlayer: Player = {
      hp: 100,
      maxHp: 100,
      attack: 10,
      defense: 5,
      inventory: [],
      equippedWeapon: null,
      equippedArmor: null,
      roomX: 0,
      roomY: 0,
      tileX: 1,
      tileY: 1,
      direction: 'right',
    };
    setPlayer(newPlayer);
    playerRef.current = newPlayer;

    setGameState('exploring');
    gameStateRef.current = 'exploring';

    setBattleState({
      active: false,
      enemy: null,
      playerTurn: true,
      log: [],
      animation: null,
    });

    setMessageLog(['新的冒险开始了！']);
  }, []);

  if (dungeon.length === 0) {
    return <div style={{ color: 'white', fontFamily: 'monospace' }}>加载中...</div>;
  }

  const currentRoom = dungeon[player.roomY]?.[player.roomX];

  return (
    <div style={styles.gameContainer}>
      <div style={styles.leftPanel}>
        <StatusBar player={player} />
        <div style={styles.messageLog}>
          <h4 style={styles.logTitle}>消息</h4>
          {messageLog.map((msg, i) => (
            <div key={i} style={styles.messageEntry}>{msg}</div>
          ))}
        </div>
        <div style={styles.controlsInfo}>
          <h4 style={styles.logTitle}>操作</h4>
          <div style={styles.controlItem}>WASD - 移动</div>
          <div style={styles.controlItem}>E - 交互/开箱</div>
          <div style={styles.controlItem}>I - 背包</div>
        </div>
      </div>

      <div style={styles.gameViewport}>
        <div style={styles.viewportInner}>
          {currentRoom && (
            <DungeonRoom
              room={currentRoom}
              playerX={player.tileX}
              playerY={player.tileY}
              playerDirection={player.direction}
              tileSize={TILE_SIZE}
              renderTick={0}
            />
          )}

          {gameState === 'battle' && (
            <BattleView
              battleState={battleState}
              player={player}
              onPlayerAttack={handlePlayerAttack}
              onFlee={handleFlee}
              showTransition={showBattleTransition}
            />
          )}

          {gameState === 'gameover' && (
            <div style={styles.gameOverOverlay}>
              <div style={styles.gameOverPanel}>
                <h2 style={{ color: '#ff4444' }}>游戏结束</h2>
                <p>你在地牢中倒下了...</p>
                <button style={styles.restartButton} onClick={resetGame}>
                  重新开始
                </button>
              </div>
            </div>
          )}
        </div>

        {currentRoom && (
          <MiniMap
            dungeon={dungeon}
            playerRoomX={player.roomX}
            playerRoomY={player.roomY}
          />
        )}
      </div>

      <Inventory
        player={player}
        onEquip={handleEquipItem}
        onDrop={handleDropItem}
        onClose={() => setInventoryOpen(false)}
        isOpen={inventoryOpen}
      />

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes floatUp {
          from { transform: translateX(-50%) translateY(0); opacity: 1; }
          to { transform: translateX(-50%) translateY(-30px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  gameContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    fontFamily: 'monospace',
    color: '#e0e0e0',
    padding: '20px',
    boxSizing: 'border-box',
  },
  leftPanel: {
    width: '220px',
    marginRight: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  gameViewport: {
    position: 'relative',
    width: VIEWPORT_SIZE,
    height: VIEWPORT_SIZE,
    flexShrink: 0,
  },
  viewportInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '8px',
    border: '2px solid #4a3a2a',
  },
  messageLog: {
    backgroundColor: '#1e1e1e',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '11px',
  },
  logTitle: {
    margin: '0 0 8px 0',
    color: '#ffd700',
    fontSize: '12px',
  },
  messageEntry: {
    padding: '3px 0',
    borderBottom: '1px solid #333',
    color: '#aaa',
  },
  controlsInfo: {
    backgroundColor: '#1e1e1e',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '11px',
  },
  controlItem: {
    padding: '2px 0',
    color: '#aaa',
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  gameOverPanel: {
    backgroundColor: '#1e1e1e',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  restartButton: {
    padding: '12px 32px',
    fontSize: '14px',
    backgroundColor: '#4a9eff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    marginTop: '16px',
  },
};
