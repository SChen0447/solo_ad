import { generateMaze, getCell, CellType, MazeData, MonsterData } from './maze';
import { Player } from './player';
import { Renderer } from './renderer';
import { BattleState, createBattleState, playerAttack, playerDefend, renderBattleUI, BattleResult } from './battle';

enum GameState {
  Exploring = 'exploring',
  Battle = 'battle',
  PickUp = 'pickup',
  GameOver = 'gameover'
}

class Game {
  private state: GameState = GameState.Exploring;
  private maze: MazeData | null = null;
  private player: Player | null = null;
  private renderer: Renderer;
  private battleState: BattleState | null = null;
  private floor: number = 1;
  private animFrameId: number = 0;
  private currentMonster: MonsterData | null = null;

  constructor() {
    this.renderer = new Renderer();
    this.init();
  }

  private init(): void {
    this.renderer.setupButtonHandlers(
      () => this.handleAttack(),
      () => this.restartGame(),
      () => this.handleDefend()
    );

    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    this.startNewGame();
    this.gameLoop();
  }

  private startNewGame(): void {
    this.maze = generateMaze(15, 15);
    this.player = new Player(this.maze.startX, this.maze.startY);
    this.floor = 1;
    this.state = GameState.Exploring;

    this.renderer.renderMaze(this.maze);
    this.renderer.updatePlayerPosition(this.player);
    this.renderer.updateFog(this.player, this.maze);
    this.renderer.updateStatusBar(this.player, this.floor);
  }

  private restartGame(): void {
    this.renderer.hideGameOver();
    this.renderer.fadeContainer(true);
    setTimeout(() => {
      this.startNewGame();
      this.renderer.fadeContainer(false);
    }, 300);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.state === GameState.GameOver) return;

    if (this.state === GameState.Battle) return;

    if (this.state !== GameState.Exploring) return;

    const keyMap: Record<string, [number, number]> = {
      'w': [0, -1],
      'a': [-1, 0],
      's': [0, 1],
      'd': [1, 0],
      'W': [0, -1],
      'A': [-1, 0],
      'S': [0, 1],
      'D': [1, 0]
    };

    const itemKeyMap: Record<string, number> = {
      '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
      '6': 6, '7': 7, '8': 8, '9': 9
    };

    if (itemKeyMap[e.key] !== undefined && this.player) {
      this.useItem(itemKeyMap[e.key]);
      return;
    }

    const dir = keyMap[e.key];
    if (!dir || !this.player || !this.maze) return;

    e.preventDefault();
    const [dx, dy] = dir;
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    const targetCell = getCell(this.maze, nx, ny);
    if (targetCell === CellType.Wall) return;

    this.player.moveTo(nx, ny);
    this.renderer.updatePlayerPosition(this.player);
    this.renderer.updateFog(this.player, this.maze);
    this.renderer.updateStatusBar(this.player, this.floor);

    this.checkCellInteractions();
  }

  private checkCellInteractions(): void {
    if (!this.player || !this.maze) return;

    const px = this.player.x;
    const py = this.player.y;

    if (this.maze.cells[py][px] === CellType.End) {
      this.advanceFloor();
      return;
    }

    const monster = this.maze.monsters.find(m => m.alive && m.x === px && m.y === py);
    if (monster) {
      this.startBattle(monster);
      return;
    }

    const adjacentDirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of adjacentDirs) {
      const ax = px + dx;
      const ay = py + dy;
      const adjMonster = this.maze.monsters.find(m => m.alive && m.x === ax && m.y === ay);
      if (adjMonster) {
        this.startBattle(adjMonster);
        return;
      }
    }

    const item = this.maze.items.find(i => !i.picked && i.x === px && i.y === py);
    if (item) {
      this.pickUpItem(item);
    }

    const chest = this.maze.chests.find(c => !c.opened && c.x === px && c.y === py);
    if (chest) {
      this.tryOpenChest(chest);
    }
  }

  private startBattle(monster: MonsterData): void {
    if (!this.player || !this.maze) return;

    this.currentMonster = monster;
    this.state = GameState.Battle;
    this.battleState = createBattleState(this.player, monster);

    this.renderer.showBattleOverlay();
    renderBattleUI(this.battleState);
  }

  private handleAttack(): void {
    if (!this.battleState || this.state !== GameState.Battle) return;
    if (this.battleState.result !== null) return;

    this.battleState = playerAttack(this.battleState);
    renderBattleUI(this.battleState);

    if (this.battleState.result !== null) {
      const result = this.battleState.result;
      setTimeout(() => {
        this.renderer.hideBattleOverlay();
        this.endBattle(result);
      }, 600);
    }
  }

  private handleDefend(): void {
    if (!this.battleState || this.state !== GameState.Battle) return;
    if (this.battleState.result !== null) return;

    this.battleState = playerDefend(this.battleState);
    renderBattleUI(this.battleState);

    if (this.battleState.result !== null) {
      const result = this.battleState.result;
      setTimeout(() => {
        this.renderer.hideBattleOverlay();
        this.endBattle(result);
      }, 600);
    }
  }

  private setState(newState: GameState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === GameState.Exploring && oldState === GameState.GameOver) {
      this.resetGameCounters();
    }

    this.renderer.fadeContainer(true);
    setTimeout(() => {
      this.renderer.fadeContainer(false);
    }, 300);
  }

  private resetGameCounters(): void {
    if (!this.player) return;
    this.player.exploredCells = new Set<string>();
    this.player.killedMonsters = 0;
    this.player.x = this.maze!.startX;
    this.player.y = this.maze!.startY;
    this.player.markExplored(this.maze!.startX, this.maze!.startY);
  }

  private endBattle(result: BattleResult): void {
    const player = this.player;
    if (!player) return;

    const handleContinue = () => {
      if (this.currentMonster) {
        this.renderer.removeMonster(this.currentMonster.x, this.currentMonster.y);
      }
      this.state = GameState.Exploring;
      this.renderer.updateStatusBar(player, this.floor);
      this.currentMonster = null;
      this.battleState = null;
    };

    const handleClose = () => {
      if (result === 'player_win') {
        handleContinue();
      } else {
        this.state = GameState.GameOver;
        this.renderer.showGameOver(player.getScore(), player.getExploredCount(), player.killedMonsters);
        this.currentMonster = null;
        this.battleState = null;
      }
    };

    this.renderer.showBattleResult(
      result,
      player.hp,
      player.maxHp,
      player.getScore(),
      handleClose,
      result === 'player_win' ? handleContinue : undefined
    );
  }

  private pickUpItem(item: { x: number; y: number; type: 'potion' | 'power' | 'key'; picked: boolean }): void {
    if (!this.player) return;

    item.picked = true;
    this.player.addItem(item.type);
    this.renderer.pickItem(item.x, item.y);
    this.renderer.updateStatusBar(this.player, this.floor);
  }

  private tryOpenChest(chest: { x: number; y: number; locked: boolean; opened: boolean }): void {
    if (!this.player) return;

    if (chest.locked) {
      const hasKey = this.player.inventory.some(i => i.type === 'key');
      if (hasKey) {
        const keySlot = this.player.inventory.find(i => i.type === 'key')!.slot;
        this.player.useItem(keySlot);
        chest.locked = false;
        chest.opened = true;
        this.player.heal(10);
        this.renderer.openChest(chest.x, chest.y);
        this.renderer.updateStatusBar(this.player, this.floor);
      }
    } else {
      chest.opened = true;
      this.player.heal(5);
      this.renderer.openChest(chest.x, chest.y);
      this.renderer.updateStatusBar(this.player, this.floor);
    }
  }

  private useItem(slotNumber: number): void {
    if (!this.player || this.state !== GameState.Exploring) return;

    if (!this.player.hasItem(slotNumber)) return;

    const type = this.player.useItem(slotNumber);
    if (!type) return;

    switch (type) {
      case 'potion':
        this.player.heal(5);
        break;
      case 'power':
        this.player.applyPowerBoost();
        break;
      case 'key':
        break;
    }

    this.renderer.updateStatusBar(this.player, this.floor);
  }

  private advanceFloor(): void {
    const player = this.player;
    if (!player) return;

    this.floor++;
    this.renderer.fadeContainer(true);

    setTimeout(() => {
      const newMaze = generateMaze(15, 15);
      this.maze = newMaze;
      player.x = newMaze.startX;
      player.y = newMaze.startY;
      player.markExplored(newMaze.startX, newMaze.startY);

      this.renderer.renderMaze(newMaze);
      this.renderer.updatePlayerPosition(player);
      this.renderer.updateFog(player, newMaze);
      this.renderer.updateStatusBar(player, this.floor);
      this.renderer.fadeContainer(false);
    }, 300);
  }

  private gameLoop(): void {
    this.animFrameId = requestAnimationFrame(() => this.gameLoop());
  }
}

new Game();
