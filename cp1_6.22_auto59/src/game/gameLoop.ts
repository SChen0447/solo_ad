import type {
  GameState,
  Particle,
  TrapEffect,
  DropItem,
  FogReveal,
  Item
} from '../types';
import { MapGenerator } from './mapGenerator';
import { Player } from '../entities/player';
import { Enemy } from '../entities/enemy';
import { CombatSystem } from '../systems/combat';
import { Inventory } from '../systems/inventory';
import { Renderer, type InventoryUIState } from '../renderer/renderer';

export class GameLoop {
  private renderer: Renderer;
  private map: MapGenerator;
  private player: Player | null = null;
  private enemies: Enemy[] = [];
  private gameState: GameState = 'start';
  private gameOverTime: number = 0;
  private particles: Particle[] = [];
  private trapEffects: TrapEffect[] = [];
  private dropItems: DropItem[] = [];
  private fogReveals: FogReveal[] = [];
  private inventoryUI: InventoryUIState = { open: false, hoveredIndex: -1 };
  private mouseX: number = 0;
  private mouseY: number = 0;
  private lastTime: number = 0;
  private turnAccumulator: number = 0;
  private readonly TURN_INTERVAL: number = 150;
  private visitedRooms: Set<number> = new Set();
  private keysPressed: Set<string> = new Set();
  private running: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.map = new MapGenerator();
    this.setupInputHandlers(canvas);
  }

  private setupInputHandlers(canvas: HTMLCanvasElement): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keysPressed.add(e.key.toLowerCase());

    if (this.gameState === 'start') {
      this.startGame();
      return;
    }

    if (this.gameState === 'gameover') {
      return;
    }

    if (e.key.toLowerCase() === 'i') {
      this.inventoryUI.open = !this.inventoryUI.open;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysPressed.delete(e.key.toLowerCase());
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  private handleClick(e: MouseEvent): void {
    if (this.gameState !== 'playing' || !this.player || !this.inventoryUI.open) return;

    const itemIndex = this.renderer.getInventoryItemAt(
      this.player,
      this.mouseX,
      this.mouseY
    );

    if (itemIndex >= 0) {
      const items = this.player.inventory.getAllItems();
      const item = items[itemIndex];
      if (item) {
        this.useItem(item);
      }
    }
  }

  private useItem(item: Item): void {
    if (!this.player) return;

    const currentTime = performance.now();

    switch (item.type) {
      case 'healthPotion':
        this.player.useItem('healthPotion', currentTime);
        break;
      case 'fireScroll':
        if (this.player.inventory.hasItem('fireScroll')) {
          this.player.inventory.removeItem('fireScroll', 1);
          CombatSystem.fireScrollDamage(this.player, this.enemies, currentTime);
          this.spawnFireParticles(this.player.x, this.player.y);
        }
        break;
      case 'key':
        break;
    }
  }

  private startGame(): void {
    this.map = new MapGenerator();
    this.map.generate();

    const spawnPos = this.map.getSpawnPosition();
    this.player = new Player(spawnPos.x, spawnPos.y);
    this.enemies = Enemy.spawnEnemies(this.map);

    for (let i = 1; i < this.map.rooms.length; i++) {
      this.map.getChestPosition(i);
    }

    this.gameState = 'playing';
    this.particles = [];
    this.trapEffects = [];
    this.dropItems = [];
    this.fogReveals = [];
    this.visitedRooms.clear();
    this.inventoryUI = { open: false, hoveredIndex: -1 };

    this.revealRoom(0, spawnPos.x, spawnPos.y);
  }

  private revealRoom(roomIndex: number, cx: number, cy: number): void {
    if (this.visitedRooms.has(roomIndex)) return;
    this.visitedRooms.add(roomIndex);

    const room = this.map.rooms[roomIndex];
    if (!room) return;

    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (y >= 0 && y < this.map.height && x >= 0 && x < this.map.width) {
          this.map.tiles[y][x].visited = true;
        }
      }
    }

    this.fogReveals.push({
      x: cx,
      y: cy,
      radius: Math.max(room.width, room.height),
      startTime: performance.now(),
      duration: 400
    });
  }

  private spawnFireParticles(cx: number, cy: number): void {
    const currentTime = performance.now();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * 0.008,
        vy: Math.sin(angle) * 0.008,
        life: 400,
        maxLife: 400,
        color: '#ff4444',
        size: 8
      });
    }
  }

  private processMovement(currentTime: number): void {
    if (!this.player || this.inventoryUI.open) return;

    let dx = 0;
    let dy = 0;

    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) dy = -1;
    else if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) dy = 1;
    else if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) dx = -1;
    else if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) dx = 1;

    if (dx === 0 && dy === 0) return;

    const adjacentEnemy = this.enemies.find(
      e => !e.isDead() && !e.data.isDying &&
        e.data.x === this.player!.x + dx &&
        e.data.y === this.player!.y + dy
    );

    if (adjacentEnemy) {
      CombatSystem.executeCombat(this.player, adjacentEnemy, currentTime);
      if (adjacentEnemy.isDead() || adjacentEnemy.data.isDying) {
        this.tryDropItem(adjacentEnemy.data.x, adjacentEnemy.data.y, currentTime);
      }
      this.player!.lastMoveTime = currentTime;
      return;
    }

    const result = this.player.tryMove(dx, dy, this.map, currentTime);
    if (result.moved) {
      if (result.hitTrap) {
        this.player.takeDamage(5, currentTime);
        this.trapEffects.push({
          x: result.newPos.x,
          y: result.newPos.y,
          time: currentTime
        });
      }

      const currentRoom = this.map.getRoomAt(result.newPos.x, result.newPos.y);
      if (currentRoom) {
        const roomIndex = this.map.rooms.indexOf(currentRoom);
        if (roomIndex >= 0 && !this.visitedRooms.has(roomIndex)) {
          this.revealRoom(roomIndex, result.newPos.x, result.newPos.y);
        }
      }

      const tile = this.map.tiles[result.newPos.y][result.newPos.x];
      if (tile.hasChest && !tile.chestOpened) {
        tile.chestOpened = true;
        const itemCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < itemCount; i++) {
          const item = Inventory.getRandomItem();
          this.player.addItem(item);
          this.dropItems.push({
            x: result.newPos.x,
            y: result.newPos.y,
            item,
            time: currentTime
          });
        }
      }

      this.pickupDrops(result.newPos.x, result.newPos.y);

      if (this.player.isDead()) {
        this.gameState = 'gameover';
        this.gameOverTime = currentTime;
      }
    }
  }

  private tryDropItem(x: number, y: number, currentTime: number): void {
    if (Math.random() < 0.5) {
      const item = Inventory.getRandomItem();
      this.dropItems.push({ x, y, item, time: currentTime });
    }
  }

  private pickupDrops(px: number, py: number): void {
    if (!this.player) return;
    this.dropItems = this.dropItems.filter(drop => {
      if (drop.x === px && drop.y === py) {
        this.player!.addItem(drop.item);
        return false;
      }
      return true;
    });
  }

  private updateParticles(deltaTime: number): void {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      return p.life > 0;
    });
  }

  private updateEnemies(currentTime: number, turnTick: boolean): void {
    if (!this.player) return;

    for (const enemy of this.enemies) {
      enemy.update(this.player, this.map, this.enemies, currentTime, turnTick);

      if (!enemy.isDead() && !enemy.data.isDying && enemy.isAdjacentToPlayer(this.player)) {
        CombatSystem.attackPlayer(enemy, this.player, currentTime);
        if (this.player.isDead()) {
          this.gameState = 'gameover';
          this.gameOverTime = currentTime;
        }
      }
    }

    this.enemies = this.enemies.filter(e => !e.isDead());
  }

  public start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    if (!this.running) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(currentTime, deltaTime);
    this.render(currentTime);

    requestAnimationFrame(() => this.loop());
  }

  private update(currentTime: number, deltaTime: number): void {
    if (this.gameState !== 'playing') return;

    if (this.player) {
      this.player.update(currentTime);
    }

    this.processMovement(currentTime);

    this.turnAccumulator += deltaTime;
    let turnTick = false;
    if (this.turnAccumulator >= this.TURN_INTERVAL) {
      this.turnAccumulator = 0;
      turnTick = true;
    }

    this.updateEnemies(currentTime, turnTick);
    this.updateParticles(deltaTime);

    this.trapEffects = this.trapEffects.filter(e => currentTime - e.time < 300);
    this.dropItems = this.dropItems.filter(d => currentTime - d.time < 1500);
    this.fogReveals = this.fogReveals.filter(r => currentTime - r.startTime < r.duration + 100);
  }

  private render(currentTime: number): void {
    this.renderer.clear();

    if (this.gameState === 'start') {
      this.renderer.renderStartScreen(currentTime);
      return;
    }

    if (!this.player) return;

    this.renderer.renderMap(
      this.map,
      this.player.x,
      this.player.y,
      this.fogReveals,
      currentTime
    );

    this.renderer.renderDropItems(
      this.dropItems,
      this.player.x,
      this.player.y,
      currentTime
    );

    this.renderer.renderTrapEffects(
      this.trapEffects,
      this.player.x,
      this.player.y,
      currentTime
    );

    this.renderer.renderEnemies(
      this.enemies,
      this.player.x,
      this.player.y,
      this.map,
      currentTime
    );

    this.renderer.renderPlayer(this.player, currentTime);

    this.renderer.renderParticles(
      this.particles,
      this.player.x,
      this.player.y
    );

    this.renderer.renderUI(this.player, currentTime);

    if (this.inventoryUI.open) {
      this.renderer.renderInventoryPanel(
        this.player,
        this.inventoryUI,
        this.mouseX,
        this.mouseY,
        currentTime
      );
    }

    if (this.gameState === 'gameover') {
      this.renderer.renderGameOver(currentTime, this.gameOverTime);
    }
  }
}
