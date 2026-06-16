import {
  generateMaze,
  isWalkable,
  updateVisibility,
  getMonsterAt,
  getItemAt,
  getChestAt,
  isAdjacentToMonster,
  removeMonster,
  removeItem,
  type MazeData,
} from './maze';
import { Player } from './player';
import {
  createRendererState,
  renderMaze,
  updatePlayerPosition,
  updateVisibility as updateVisibilityRender,
  removeMonsterElement,
  removeItemElement,
  unlockChestElement,
  removeChestElement,
  updateStatusBar,
  showToast,
  showResultModal,
  setGameContainerOpacity,
  type RendererState,
} from './renderer';
import { initBattleSystem, startBattle, type BattleResult } from './battle';

type GameState = 'exploring' | 'battle' | 'picking' | 'gameover';

const MAZE_WIDTH = 15;
const MAZE_HEIGHT = 15;
const VISION_RADIUS = 2;
const MAX_FLOORS = 5;

let gameState: GameState = 'exploring';
let maze: MazeData;
let player: Player;
let renderer: RendererState;
let animationFrameId: number;

function initGame(): void {
  renderer = createRendererState();
  player = new Player(1, 1);
  initBattleSystem();
  setupKeyboardListeners();
  resetGame();
  startGameLoop();
}

function resetGame(): void {
  gameState = 'exploring';

  setGameContainerOpacity(0);

  setTimeout(() => {
    const startFloor = player.floor === 1 ? 1 : player.floor;
    if (startFloor === 1) {
      player.reset(1, 1);
    }

    const genStart = performance.now();
    maze = generateMaze(MAZE_WIDTH, MAZE_HEIGHT, player.floor);
    const genTime = performance.now() - genStart;
    console.log(`迷宫生成耗时: ${genTime.toFixed(2)}ms`);

    player.setPosition(maze.start);

    renderMaze(renderer, maze);
    updatePlayerPosition(renderer, player);

    updateVisibility(maze, player.x, player.y, VISION_RADIUS);
    updateVisibilityRender(renderer, maze, player.x, player.y);
    markExplored(player.x, player.y);

    updateStatusBar(player);

    setGameContainerOpacity(1);
  }, 150);
}

function setupKeyboardListeners(): void {
  document.addEventListener('keydown', (e) => {
    if (gameState !== 'exploring') return;

    const key = e.key.toLowerCase();

    switch (key) {
      case 'w':
      case 'arrowup':
        movePlayer(0, -1);
        e.preventDefault();
        break;
      case 's':
      case 'arrowdown':
        movePlayer(0, 1);
        e.preventDefault();
        break;
      case 'a':
      case 'arrowleft':
        movePlayer(-1, 0);
        e.preventDefault();
        break;
      case 'd':
      case 'arrowright':
        movePlayer(1, 0);
        e.preventDefault();
        break;
      case '1':
        useHealPotion();
        break;
      case '2':
        usePowerPotion();
        break;
      case '3':
        useKey();
        break;
    }
  });
}

function movePlayer(dx: number, dy: number): void {
  if (gameState !== 'exploring') return;

  const newX = player.x + dx;
  const newY = player.y + dy;

  if (!isWalkable(maze, newX, newY)) return;

  const monster = getMonsterAt(maze, newX, newY);
  if (monster) {
    enterBattle(monster);
    return;
  }

  player.x = newX;
  player.y = newY;

  updatePlayerPosition(renderer, player);

  updateVisibility(maze, player.x, player.y, VISION_RADIUS);
  updateVisibilityRender(renderer, maze, player.x, player.y);
  markExplored(player.x, player.y);

  handleCellInteraction();

  updateStatusBar(player);
}

function markExplored(x: number, y: number): void {
  const cell = maze.cells[y][x];
  if (!cell.explored) {
    cell.explored = true;
    player.incrementExplored();
  }
}

function handleCellInteraction(): void {
  const item = getItemAt(maze, player.x, player.y);
  if (item) {
    pickupItem(item.id, item.type);
  }

  const chest = getChestAt(maze, player.x, player.y);
  if (chest) {
    interactWithChest(chest.id);
  }

  if (maze.cells[player.y][player.x].type === 'end') {
    nextFloor();
    return;
  }

  const adjacentMonster = isAdjacentToMonster(maze, player.x, player.y);
  if (adjacentMonster) {
    enterBattle(adjacentMonster);
  }
}

function pickupItem(itemId: string, itemType: 'potion-heal' | 'potion-power' | 'key'): void {
  gameState = 'picking';

  player.addItem(itemType);
  removeItemElement(renderer, itemId);
  removeItem(maze, itemId);

  let message = '';
  switch (itemType) {
    case 'potion-heal':
      message = '🧪 获得了治疗药水！（按1使用）';
      break;
    case 'potion-power':
      message = '💜 获得了力量药剂！（按2使用）';
      break;
    case 'key':
      message = '🔑 获得了钥匙！（按3使用）';
      break;
  }
  showToast(message);

  setTimeout(() => {
    gameState = 'exploring';
    updateStatusBar(player);
  }, 300);
}

function interactWithChest(chestId: string): void {
  const chest = maze.chests.find((c) => c.id === chestId);
  if (!chest) return;

  if (chest.locked) {
    showToast('🔒 这个宝箱被锁住了，需要钥匙！（按3使用钥匙）');
    return;
  }

  gameState = 'picking';

  const reward = Math.random();
  if (reward < 0.4) {
    player.addItem('potion-heal');
    player.addItem('potion-heal');
    showToast('📦 打开宝箱：获得2个治疗药水！');
  } else if (reward < 0.7) {
    player.addItem('potion-power');
    player.addItem('potion-power');
    showToast('📦 打开宝箱：获得2个力量药剂！');
  } else {
    player.addItem('key');
    player.addItem('potion-heal');
    showToast('📦 打开宝箱：获得钥匙和治疗药水！');
  }

  removeChestElement(renderer, chestId);
  maze.chests = maze.chests.filter((c) => c.id !== chestId);

  setTimeout(() => {
    gameState = 'exploring';
    updateStatusBar(player);
  }, 300);
}

function useHealPotion(): void {
  if (player.hp >= player.maxHp) {
    showToast('❤️ 生命值已满！');
    return;
  }
  const healed = player.usePotionHeal();
  if (healed > 0) {
    showToast(`💚 使用治疗药水，恢复了${healed}点生命！`);
    updateStatusBar(player);
  } else {
    showToast('❌ 没有治疗药水了！');
  }
}

function usePowerPotion(): void {
  if (player.powerUpActive) {
    showToast('💪 力量增强效果已激活！');
    return;
  }
  if (player.inventory.potionPower <= 0) {
    showToast('❌ 没有力量药剂了！');
    return;
  }
  player.activatePowerUp();
  showToast('💪 使用力量药剂，下一场战斗攻击力翻倍！');
  updateStatusBar(player);
}

function useKey(): void {
  const lockedChest = maze.chests.find(
    (c) =>
      c.locked &&
      Math.abs(c.position.x - player.x) <= 1 &&
      Math.abs(c.position.y - player.y) <= 1
  );

  if (!lockedChest) {
    showToast('🔑 附近没有上锁的宝箱！');
    return;
  }

  if (player.useKey()) {
    lockedChest.locked = false;
    unlockChestElement(renderer, lockedChest.id);
    showToast('🔓 使用钥匙解锁了宝箱！移动到宝箱位置打开它！');
    updateStatusBar(player);
  } else {
    showToast('❌ 没有钥匙了！');
  }
}

function enterBattle(monster: { id: string } & { position: { x: number; y: number }; hp: number; maxHp: number; attack: number; defense: number; name: string }): void {
  gameState = 'battle';

  startBattle(player, monster, {
    onEnd: handleBattleEnd,
    onStatusUpdate: () => updateStatusBar(player),
  });
}

function handleBattleEnd(result: BattleResult): void {
  if (result.victory) {
    removeMonster(maze, result.monsterId);
    removeMonsterElement(renderer, result.monsterId);
    showToast('⚔️ 战斗胜利！');
    gameState = 'exploring';

    updateStatusBar(player);

    const adjacentMonster = isAdjacentToMonster(maze, player.x, player.y);
    if (adjacentMonster) {
      setTimeout(() => enterBattle(adjacentMonster), 500);
    }
  } else {
    gameState = 'gameover';
    setTimeout(() => {
      showResultModal(player, false, handleRestart);
    }, 300);
  }
}

function nextFloor(): void {
  if (player.floor >= MAX_FLOORS) {
    gameState = 'gameover';
    setTimeout(() => {
      showResultModal(player, true, handleRestart);
    }, 300);
    return;
  }

  player.nextFloor();
  showToast(`🏰 进入第 ${player.floor} 层！`);
  setTimeout(() => {
    resetGame();
  }, 500);
}

function handleRestart(): void {
  player.floor = 1;
  resetGame();
}

function startGameLoop(): void {
  let lastTime = performance.now();

  function gameLoop(currentTime: number): void {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (deltaTime > 0 && deltaTime < 100) {
      void deltaTime;
    }

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
