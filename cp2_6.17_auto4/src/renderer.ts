import type { MazeData, MonsterData, ItemData, ChestData } from './maze';
import type { Player } from './player';
import { getVisibilityLevel } from './maze';

const CELL_SIZE = 40;
const VISIBLE_RADIUS = 2;

export interface RendererState {
  mazeContainer: HTMLElement;
  cellElements: HTMLElement[][];
  monsterElements: Map<string, HTMLElement>;
  itemElements: Map<string, HTMLElement>;
  chestElements: Map<string, HTMLElement>;
  playerElement: HTMLElement;
}

export function createRendererState(): RendererState {
  const mazeContainer = document.getElementById('maze-container') as HTMLElement;
  return {
    mazeContainer,
    cellElements: [],
    monsterElements: new Map(),
    itemElements: new Map(),
    chestElements: new Map(),
    playerElement: document.createElement('div'),
  };
}

export function renderMaze(state: RendererState, maze: MazeData): void {
  const { mazeContainer } = state;

  while (mazeContainer.firstChild) {
    mazeContainer.removeChild(mazeContainer.firstChild);
  }

  state.cellElements = [];
  state.monsterElements.clear();
  state.itemElements.clear();
  state.chestElements.clear();

  mazeContainer.style.gridTemplateColumns = `repeat(${maze.width}, ${CELL_SIZE}px)`;
  mazeContainer.style.gridTemplateRows = `repeat(${maze.height}, ${CELL_SIZE}px)`;
  mazeContainer.style.width = `${maze.width * CELL_SIZE + 20}px`;
  mazeContainer.style.height = `${maze.height * CELL_SIZE + 20}px`;

  for (let y = 0; y < maze.height; y++) {
    state.cellElements[y] = [];
    for (let x = 0; x < maze.width; x++) {
      const cell = maze.cells[y][x];
      const cellEl = document.createElement('div');
      cellEl.className = `cell ${cell.type}`;
      cellEl.style.gridColumn = `${x + 1}`;
      cellEl.style.gridRow = `${y + 1}`;
      cellEl.dataset.x = String(x);
      cellEl.dataset.y = String(y);

      const delay = (x + y) * 8;
      setTimeout(() => {
        cellEl.classList.add('visible');
      }, Math.max(0, delay - 100));

      state.cellElements[y][x] = cellEl;
      mazeContainer.appendChild(cellEl);
    }
  }

  for (const chest of maze.chests) {
    const chestEl = createChestElement(chest);
    state.chestElements.set(chest.id, chestEl);
    state.cellElements[chest.position.y][chest.position.x].appendChild(chestEl);
  }

  for (const item of maze.items) {
    const itemEl = createItemElement(item);
    state.itemElements.set(item.id, itemEl);
    state.cellElements[item.position.y][item.position.x].appendChild(itemEl);
  }

  for (const monster of maze.monsters) {
    const monsterEl = createMonsterElement(monster);
    state.monsterElements.set(monster.id, monsterEl);
    state.cellElements[monster.position.y][monster.position.x].appendChild(monsterEl);
  }

  state.playerElement.id = 'player';
  state.playerElement.style.left = `${10 + 10 + 0}px`;
  state.playerElement.style.top = `${10 + 10 + 0}px`;
  mazeContainer.appendChild(state.playerElement);
}

function createMonsterElement(monster: MonsterData): HTMLElement {
  const el = document.createElement('div');
  el.className = 'monster';
  el.title = `${monster.name} HP:${monster.hp}/${monster.maxHp} ATK:${monster.attack} DEF:${monster.defense}`;
  el.dataset.monsterId = monster.id;
  return el;
}

function createItemElement(item: ItemData): HTMLElement {
  const el = document.createElement('div');
  el.className = `item ${item.type}`;
  el.dataset.itemId = item.id;

  let icon = '';
  switch (item.type) {
    case 'potion-heal':
      icon = '🧪';
      el.title = '治疗药水（按1使用）';
      break;
    case 'potion-power':
      icon = '💜';
      el.title = '力量药剂（按2使用）';
      break;
    case 'key':
      icon = '🔑';
      el.title = '钥匙（按3使用）';
      break;
  }
  el.textContent = icon;
  return el;
}

function createChestElement(chest: ChestData): HTMLElement {
  const el = document.createElement('div');
  el.className = `chest${chest.locked ? ' locked' : ''}`;
  el.dataset.chestId = chest.id;
  el.title = chest.locked ? '上锁的宝箱（需要钥匙🔑）' : '宝箱';
  return el;
}

export function updatePlayerPosition(state: RendererState, player: Player): void {
  const left = 10 + player.x * CELL_SIZE + (CELL_SIZE - 20) / 2;
  const top = 10 + player.y * CELL_SIZE + (CELL_SIZE - 20) / 2;
  state.playerElement.style.left = `${left}px`;
  state.playerElement.style.top = `${top}px`;
}

export function updateVisibility(
  state: RendererState,
  maze: MazeData,
  playerX: number,
  playerY: number
): void {
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      const cellEl = state.cellElements[y][x];
      const level = getVisibilityLevel(maze, x, y, playerX, playerY, VISIBLE_RADIUS);

      cellEl.classList.remove('fog', 'partial-fog');
      if (level === 'fog') {
        cellEl.classList.add('fog');
      } else if (level === 'partial') {
        cellEl.classList.add('partial-fog');
      }
    }
  }

  for (const [id, el] of state.monsterElements) {
    const monster = maze.monsters.find((m) => m.id === id);
    if (!monster) continue;
    const level = getVisibilityLevel(
      maze,
      monster.position.x,
      monster.position.y,
      playerX,
      playerY,
      VISIBLE_RADIUS
    );
    el.style.opacity = level === 'fog' ? '0' : '1';
    el.style.transition = 'opacity 0.3s ease';
  }

  for (const [id, el] of state.itemElements) {
    const item = maze.items.find((i) => i.id === id);
    if (!item) continue;
    const level = getVisibilityLevel(
      maze,
      item.position.x,
      item.position.y,
      playerX,
      playerY,
      VISIBLE_RADIUS
    );
    el.style.opacity = level === 'fog' ? '0' : '1';
    el.style.transition = 'opacity 0.3s ease';
  }

  for (const [id, el] of state.chestElements) {
    const chest = maze.chests.find((c) => c.id === id);
    if (!chest) continue;
    const level = getVisibilityLevel(
      maze,
      chest.position.x,
      chest.position.y,
      playerX,
      playerY,
      VISIBLE_RADIUS
    );
    el.style.opacity = level === 'fog' ? '0' : '1';
    el.style.transition = 'opacity 0.3s ease';
  }
}

export function removeMonsterElement(state: RendererState, monsterId: string): void {
  const el = state.monsterElements.get(monsterId);
  if (el) {
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    el.style.opacity = '0';
    el.style.transform = 'scale(0)';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      state.monsterElements.delete(monsterId);
    }, 300);
  }
}

export function removeItemElement(state: RendererState, itemId: string): void {
  const el = state.itemElements.get(itemId);
  if (el) {
    el.classList.add('picked-up');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      state.itemElements.delete(itemId);
    }, 300);
  }
}

export function unlockChestElement(state: RendererState, chestId: string): void {
  const el = state.chestElements.get(chestId);
  if (el) {
    el.classList.remove('locked');
    el.style.transition = 'transform 0.3s ease';
    el.style.transform = 'scale(1.1)';
    setTimeout(() => {
      el.style.transform = 'scale(1)';
    }, 300);
  }
}

export function removeChestElement(state: RendererState, chestId: string): void {
  const el = state.chestElements.get(chestId);
  if (el) {
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    el.style.opacity = '0';
    el.style.transform = 'scale(0) rotate(90deg)';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      state.chestElements.delete(chestId);
    }, 300);
  }
}

export function updateStatusBar(player: Player): void {
  const floorDisplay = document.getElementById('floor-display');
  const hpBar = document.getElementById('hp-bar');
  const hpText = document.getElementById('hp-text');
  const exploredCount = document.getElementById('explored-count');
  const killedCount = document.getElementById('killed-count');
  const statsDisplay = document.getElementById('stats-display');

  if (floorDisplay) floorDisplay.textContent = String(player.floor);

  const hpPercent = (player.hp / player.maxHp) * 100;
  if (hpBar) {
    hpBar.style.width = `${hpPercent}%`;
    if (hpPercent < 30) {
      hpBar.style.background = 'linear-gradient(to right, #f44336, #ff5722)';
    } else if (hpPercent < 60) {
      hpBar.style.background = 'linear-gradient(to right, #ff9800, #ffc107)';
    } else {
      hpBar.style.background = 'linear-gradient(to right, #4caf50, #8bc34a)';
    }
  }
  if (hpText) hpText.textContent = `${player.hp}/${player.maxHp}`;
  if (exploredCount) exploredCount.textContent = String(player.exploredCount);
  if (killedCount) killedCount.textContent = String(player.killedMonsters);
  if (statsDisplay) statsDisplay.textContent = `${player.attack}/${player.defense}`;

  updateInventoryDisplay(player);
}

function updateInventoryDisplay(player: Player): void {
  const countPotionHeal = document.getElementById('count-potion-heal');
  const countPotionPower = document.getElementById('count-potion-power');
  const countKey = document.getElementById('count-key');

  if (countPotionHeal) {
    if (player.inventory.potionHeal > 0) {
      countPotionHeal.style.display = 'block';
      countPotionHeal.textContent = String(player.inventory.potionHeal);
    } else {
      countPotionHeal.style.display = 'none';
    }
  }

  if (countPotionPower) {
    if (player.inventory.potionPower > 0) {
      countPotionPower.style.display = 'block';
      countPotionPower.textContent = String(player.inventory.potionPower);
    } else {
      countPotionPower.style.display = 'none';
    }
  }

  if (countKey) {
    if (player.inventory.key > 0) {
      countKey.style.display = 'block';
      countKey.textContent = String(player.inventory.key);
    } else {
      countKey.style.display = 'none';
    }
  }
}

export function showToast(message: string, duration: number = 2000): void {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

export function showResultModal(
  player: Player,
  victory: boolean,
  onRestart: () => void
): void {
  const modal = document.getElementById('result-modal');
  const resultTitle = document.getElementById('result-title');
  const finalFloor = document.getElementById('final-floor');
  const finalExplored = document.getElementById('final-explored');
  const finalKilled = document.getElementById('final-killed');
  const finalScore = document.getElementById('final-score');
  const restartBtn = document.getElementById('restart-btn');

  if (!modal || !resultTitle || !finalFloor || !finalExplored || !finalKilled || !finalScore || !restartBtn) return;

  resultTitle.textContent = victory ? '🎉 恭喜通关！' : '💀 游戏结束';
  resultTitle.className = `result-title ${victory ? 'victory' : 'defeat'}`;
  finalFloor.textContent = String(player.floor);
  finalExplored.textContent = String(player.exploredCount);
  finalKilled.textContent = String(player.killedMonsters);
  finalScore.textContent = String(player.calculateScore());

  restartBtn.onclick = () => {
    modal.classList.remove('active');
    setTimeout(() => {
      onRestart();
    }, 300);
  };

  modal.classList.add('active');
}

export function setGameContainerOpacity(opacity: number): void {
  const container = document.getElementById('game-container');
  if (container) {
    container.style.opacity = String(opacity);
  }
}
