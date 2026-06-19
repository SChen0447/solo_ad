import Phaser from 'phaser';
import { WorldManager } from '../map/WorldManager';
import { Tile, TileType, TILE_CONFIG } from '../map/Tile';
import { Player, PlayerEvent } from '../entities/Player';
import { EnemyManager, SlimeEnemy, EnemyEvent } from '../entities/EnemyManager';
import { InventoryManager, ITEM_DEFS, ToolType } from '../entities/InventoryManager';

interface FloatingText {
  id: number;
  text: Phaser.GameObjects.Text;
  tween: Phaser.Tweens.Tween;
}

interface Particle {
  id: number;
  container: Phaser.GameObjects.Container;
  tween: Phaser.Tweens.Tween;
}

const RECIPES = [
  {
    id: 'fence',
    name: '木栅栏',
    output: { itemId: 'fence', count: 1 },
    inputs: [{ itemId: 'wood', count: 3 }]
  },
  {
    id: 'iron_sword',
    name: '铁剑',
    output: { itemId: 'iron_sword', count: 1 },
    inputs: [
      { itemId: 'stone', count: 2 },
      { itemId: 'iron', count: 1 }
    ]
  }
];

export class GameScene extends Phaser.Scene {
  private world!: WorldManager;
  private player!: Player;
  private enemies!: EnemyManager;
  private inventory!: InventoryManager;

  private tileImages: Map<string, Phaser.GameObjects.Image> = new Map();
  private craftingStationGlow?: Phaser.GameObjects.Graphics;
  private craftingStationImage?: Phaser.GameObjects.Image;
  private craftingRotation: number = 0;
  private craftingRotationSpeed: number = 0;
  private craftingTargetRotationSpeed: number = 0;
  private craftingIdleParticles: Phaser.GameObjects.Graphics[] = [];
  private nextCraftingParticleTime: number = 0;
  private craftingAnimationTimer: number = 0;
  private isCrafting: boolean = false;

  private playerSprite?: Phaser.GameObjects.Container;
  private playerBody?: Phaser.GameObjects.Graphics;
  private playerTool?: Phaser.GameObjects.Graphics;
  private exclaimMark?: Phaser.GameObjects.Text;
  private exclaimTimer: number = 0;

  private enemySprites: Map<number, Phaser.GameObjects.Container> = new Map();
  private goldPickups: Map<number, { sprite: Phaser.GameObjects.Graphics; amount: number }> = new Map();
  private nextGoldId: number = 1;

  private keys: { [key: string]: Phaser.Input.Keyboard.Key } = {};

  private isInventoryOpen: boolean = false;
  private inventoryPanel?: Phaser.GameObjects.Container;
  private inventoryBg?: Phaser.GameObjects.Rectangle;
  private inventoryItems: Map<string, Phaser.GameObjects.Container> = new Map();
  private selectedItemId: string | null = null;

  private craftingPanel?: Phaser.GameObjects.Container;
  private craftingOpen: boolean = false;
  private craftingDimBg?: Phaser.GameObjects.Rectangle;

  private resourceBars: Map<string, { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Graphics }> = new Map();
  private hpBarBg?: Phaser.GameObjects.Rectangle;
  private hpBarFill?: Phaser.GameObjects.Rectangle;
  private expBarBg?: Phaser.GameObjects.Rectangle;
  private expBarFill?: Phaser.GameObjects.Rectangle;
  private levelText?: Phaser.GameObjects.Text;
  private statusBar?: Phaser.GameObjects.Rectangle;
  private toolSlotBgs: Phaser.GameObjects.Rectangle[] = [];
  private toolSlotIcons: (Phaser.GameObjects.Graphics | null)[] = [null, null, null, null];

  private levelUpFlash?: Phaser.GameObjects.Rectangle;
  private successToast?: Phaser.GameObjects.Container;

  private floatingTexts: FloatingText[] = [];
  private nextFloatingId: number = 1;
  private particles: Particle[] = [];
  private nextParticleId: number = 1;

  private attackSwingTimer: number = 0;
  private attackArc?: Phaser.GameObjects.Arc;
  private currentAttackDir: { x: number; y: number } = { x: 0, y: 0 };

  private performanceMode: boolean = false;
  private fpsSmoothed: number = 60;
  private lastFpsCheck: number = 0;
  private frameCount: number = 0;
  private fpsText?: Phaser.GameObjects.Text;

  private isMobile: boolean = false;
  private uiScale: number = 1;

  private virtualJoystick?: { base: Phaser.GameObjects.Graphics; knob: Phaser.GameObjects.Graphics; active: boolean; dx: number; dy: number; jx: number; jy: number };
  private actionButtons: { [key: string]: Phaser.GameObjects.Graphics } = {};

  constructor() {
    super({ key: 'GameScene' });
  }

  public init(): void {
    this.isMobile = window.innerWidth < 768;
    this.uiScale = this.isMobile ? 1.5 : 1;
  }

  public preload(): void { }

  public create(): void {
    this.world = new WorldManager();
    this.inventory = new InventoryManager();
    this.player = new Player(this.world, this.inventory);
    this.enemies = new EnemyManager(this.world);

    this.generateTextures();
    this.setupCamera();
    this.renderWorld();
    this.createPlayerSprite();
    this.setupInput();
    this.setupUI();
    this.setupEventListeners();

    this.enemies.start();
    this.scale.on('resize', () => this.onResize());
    window.addEventListener('resize', () => this.onResize());

    this.lastFpsCheck = this.time.now;
    this.inventory.addItem('iron', 5);
  }

  private onResize(): void {
    this.isMobile = window.innerWidth < 768;
    this.uiScale = this.isMobile ? 1.5 : 1;
    this.setupCamera();
    this.rebuildUI();
  }

  private setupCamera(): void {
    const worldW = this.world.getWorldWidth();
    const worldH = this.world.getWorldHeight();
    const viewW = this.scale.width;
    const viewH = this.scale.height;

    const zoomX = viewW / worldW;
    const zoomY = viewH / worldH;
    const baseZoom = Math.min(zoomX, zoomY) * 0.9;

    this.cameras.main.setZoom(baseZoom);
    this.cameras.main.centerOn(worldW / 2, worldH / 2);
  }

  private generateTextures(): void {
    const ts = WorldManager.TILE_SIZE;

    for (const [type, config] of Object.entries(TILE_CONFIG)) {
      const key = `tile_${type}`;
      if (this.textures.exists(key)) continue;
      const g = this.add.graphics();
      g.fillStyle(config.color, 1);
      g.fillRect(0, 0, ts, ts);
      g.fillStyle(config.secondaryColor, 1);
      for (let i = 0; i < 12; i++) {
        const px = Math.floor(Math.random() * (ts / 4)) * 4;
        const py = Math.floor(Math.random() * (ts / 4)) * 4;
        g.fillRect(px, py, 4, 4);
      }
      if (type === TileType.TREE) {
        g.fillStyle(0x6b4423, 1);
        g.fillRect(ts / 2 - 6, ts * 0.55, 12, ts * 0.4);
        g.fillStyle(0x2d5016, 1);
        g.fillCircle(ts / 2, ts * 0.35, ts * 0.32);
        g.fillStyle(0x3d6b1e, 1);
        g.fillCircle(ts / 2 - 8, ts * 0.28, ts * 0.18);
        g.fillCircle(ts / 2 + 10, ts * 0.32, ts * 0.16);
      } else if (type === TileType.STONE) {
        g.fillStyle(0x505050, 1);
        g.fillCircle(ts / 2, ts / 2, ts * 0.35);
        g.fillStyle(0xa0a0a0, 1);
        g.fillCircle(ts / 2 - 6, ts / 2 - 8, 8);
      } else if (type === TileType.WATER) {
        g.lineStyle(2, 0x7fbfff, 0.5);
        for (let i = 0; i < 3; i++) {
          const y = 10 + i * 14;
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(ts / 3, y - 4);
          g.lineTo((ts * 2) / 3, y + 4);
          g.lineTo(ts, y);
          g.strokePath();
        }
      } else if (type === TileType.CRAFTING) {
        g.fillStyle(0x5c3317, 1);
        g.fillRect(4, ts * 0.4, ts - 8, ts * 0.55);
        g.fillStyle(0x8b5a2b, 1);
        g.fillRect(4, ts * 0.35, ts - 8, 8);
        g.fillStyle(0xd2691e, 1);
        g.fillRect(ts / 2 - 8, ts * 0.5, 16, 4);
        g.fillRect(ts / 2 - 2, ts * 0.45, 4, 16);
      }
      g.generateTexture(key, ts, ts);
      g.destroy();
    }
  }

  private renderWorld(): void {
    const tiles = this.world.getAllTiles();
    const ts = WorldManager.TILE_SIZE;

    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tile = tiles[y][x];
        this.renderTile(tile);
      }
    }

    const craftPos = this.world.getCraftingStationPosition();
    const cx = (craftPos.x + 0.5) * ts;
    const cy = (craftPos.y + 0.5) * ts;

    this.craftingStationGlow = this.add.graphics();
    this.craftingStationGlow.setPosition(cx, cy);

    this.craftingStationImage = this.add.image(cx, cy, 'tile_crafting');
    this.craftingStationImage.setOrigin(0.5, 0.75);
    this.craftingStationImage.setDepth(5);

    this.children.bringToTop(this.craftingStationGlow);
    this.children.bringToTop(this.craftingStationImage);
  }

  private renderTile(tile: Tile): void {
    const key = `${tile.gridX}_${tile.gridY}`;
    let img = this.tileImages.get(key);
    const ts = WorldManager.TILE_SIZE;

    if (!img) {
      const texKey = `tile_${tile.type}`;
      img = this.add.image(tile.gridX * ts, tile.gridY * ts, texKey);
      img.setOrigin(0, 0);
      img.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, ts, ts),
        Phaser.Geom.Rectangle.Contains
      );
      img.on('pointerdown', () => this.onTileClick(tile));
      this.tileImages.set(key, img);
    } else {
      img.setTexture(`tile_${tile.type}`);
    }
  }

  public refreshTile(gridX: number, gridY: number): void {
    const tile = this.world.getTile(gridX, gridY);
    if (tile) {
      const key = `${tile.gridX}_${tile.gridY}`;
      const img = this.tileImages.get(key);
      if (img) {
        img.setTexture(`tile_${tile.type}`);
      }
    }
  }

  private createPlayerSprite(): void {
    this.playerSprite = this.add.container(this.player.x, this.player.y);
    this.playerSprite.setDepth(100);

    this.playerBody = this.add.graphics();
    this.playerSprite.add(this.playerBody);
    this.drawPlayerBody();

    this.playerTool = this.add.graphics();
    this.playerTool.setPosition(14, -6);
    this.playerSprite.add(this.playerTool);
    this.drawCurrentTool();

    this.exclaimMark = this.add.text(0, -50, '!', {
      fontFamily: 'Courier New',
      fontSize: '32px',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.exclaimMark.setOrigin(0.5);
    this.exclaimMark.setVisible(false);
    this.playerSprite.add(this.exclaimMark);
  }

  private drawPlayerBody(): void {
    if (!this.playerBody) return;
    this.playerBody.clear();
    const frame = this.performanceMode ? 0 : this.player.getAnimationFrame();
    const bounce = this.player.isMoving ? Math.sin((frame * Math.PI) / 2) * 2 : 0;

    this.playerBody.fillStyle(0x8b4513, 1);
    this.playerBody.fillRect(-12, -8 + bounce, 24, 28);
    this.playerBody.fillStyle(0xffdbac, 1);
    this.playerBody.fillCircle(0, -20 + bounce, 14);
    this.playerBody.fillStyle(0x2c1810, 1);
    this.playerBody.fillRect(-8, -24 + bounce, 16, 8);
    this.playerBody.fillStyle(0x000000, 1);
    this.playerBody.fillCircle(-5, -18 + bounce, 2);
    this.playerBody.fillCircle(5, -18 + bounce, 2);
    this.playerBody.fillStyle(0x5c3317, 1);
    this.playerBody.fillRect(-10, 18 + bounce, 8, 10);
    this.playerBody.fillRect(2, 18 + bounce, 8, 10);
  }

  private drawCurrentTool(): void {
    if (!this.playerTool) return;
    this.playerTool.clear();
    const tool = this.player.currentTool;
    const swing = this.attackSwingTimer > 0 ? Math.sin((1 - this.attackSwingTimer / 200) * Math.PI) * 0.6 : 0;
    this.playerTool.setRotation(-swing);

    if (tool === ToolType.HAMMER) {
      this.playerTool.fillStyle(0x8b4513, 1);
      this.playerTool.fillRect(-2, -4, 4, 18);
      this.playerTool.fillStyle(0x808080, 1);
      this.playerTool.fillRect(-10, -14, 20, 10);
    } else if (tool === ToolType.SWORD) {
      this.playerTool.fillStyle(0xc8a96e, 1);
      this.playerTool.fillRect(-1, -20, 3, 24);
      this.playerTool.fillStyle(0x8b4513, 1);
      this.playerTool.fillRect(-6, 2, 12, 2);
      this.playerTool.fillRect(-1, 2, 2, 8);
    } else if (tool === ToolType.IRON_SWORD) {
      this.playerTool.fillStyle(0xe0e0e0, 1);
      this.playerTool.fillRect(-1, -24, 3, 28);
      this.playerTool.fillStyle(0x8b4513, 1);
      this.playerTool.fillRect(-7, 2, 14, 3);
      this.playerTool.fillRect(-1, 2, 2, 9);
      this.playerTool.fillStyle(0xffd700, 1);
      this.playerTool.fillCircle(0, 4, 2);
    } else if (tool === ToolType.FENCE) {
      this.playerTool.fillStyle(0x8b5a2b, 1);
      this.playerTool.fillRect(-10, -16, 4, 20);
      this.playerTool.fillRect(6, -16, 4, 20);
      this.playerTool.fillRect(-12, -10, 24, 3);
      this.playerTool.fillRect(-12, 0, 24, 3);
    }
  }

  private setupInput(): void {
    this.keys['W'] = this.input.keyboard!.addKey('W');
    this.keys['A'] = this.input.keyboard!.addKey('A');
    this.keys['S'] = this.input.keyboard!.addKey('S');
    this.keys['D'] = this.input.keyboard!.addKey('D');
    this.keys['E'] = this.input.keyboard!.addKey('E');
    this.keys['ONE'] = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keys['TWO'] = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.keys['THREE'] = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.keys['FOUR'] = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);

    this.keys['E'].on('down', () => this.toggleInventory());
    this.keys['ONE'].on('down', () => this.player.selectToolSlot(0));
    this.keys['TWO'].on('down', () => this.player.selectToolSlot(1));
    this.keys['THREE'].on('down', () => this.player.selectToolSlot(2));
    this.keys['FOUR'].on('down', () => this.player.selectToolSlot(3));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));

    if (this.isMobile) {
      this.setupVirtualControls();
    }
  }

  private setupVirtualControls(): void {
    const vw = this.scale.width;
    const vh = this.scale.height;
    const jx = 120;
    const jy = vh - 160;

    const base = this.add.graphics();
    base.lineStyle(4, 0xffffff, 0.6);
    base.fillStyle(0x000000, 0.3);
    base.fillCircle(0, 0, 70);
    base.strokeCircle(0, 0, 70);
    base.setPosition(jx, jy);
    base.setScrollFactor(0);
    base.setDepth(2000);

    const knob = this.add.graphics();
    knob.fillStyle(0x66ccff, 0.8);
    knob.fillCircle(0, 0, 30);
    knob.setPosition(jx, jy);
    knob.setScrollFactor(0);
    knob.setDepth(2001);

    this.virtualJoystick = { base, knob, active: false, dx: 0, dy: 0, jx, jy };

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.virtualJoystick) return;
      const dist = Math.sqrt((p.x - jx) ** 2 + (p.y - jy) ** 2);
      if (dist <= 70) {
        this.virtualJoystick.active = true;
        this.updateJoystickKnob(p.x, p.y);
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.virtualJoystick || !this.virtualJoystick.active) return;
      this.updateJoystickKnob(p.x, p.y);
    });
    this.input.on('pointerup', () => {
      if (!this.virtualJoystick) return;
      this.virtualJoystick.active = false;
      this.virtualJoystick.dx = 0;
      this.virtualJoystick.dy = 0;
      this.virtualJoystick.knob.setPosition(jx, jy);
    });

    const btnSize = 80;
    this.createActionButton('attack', vw - 100, vh - 120, btnSize, 0xff4444);
    this.createActionButton('inv', vw - 100, vh - 230, btnSize, 0x44aaff);
  }

  private createActionButton(id: string, x: number, y: number, size: number, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillCircle(4, 4, size / 2);
    g.fillStyle(color, 0.8);
    g.fillCircle(0, 0, size / 2);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeCircle(0, 0, size / 2);
    g.setPosition(x, y);
    g.setScrollFactor(0);
    g.setDepth(2000);
    g.setInteractive(new Phaser.Geom.Circle(0, 0, size / 2), Phaser.Geom.Circle.Contains);
    this.actionButtons[id] = g;

    const label = id === 'attack' ? '⚔' : '🎒';
    const t = this.add.text(x, y, label, { fontSize: '28px' });
    t.setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    g.on('pointerdown', () => {
      g.setScale(0.9);
      if (id === 'attack') this.performAttack();
      if (id === 'inv') this.toggleInventory();
    });
    g.on('pointerup', () => g.setScale(1));
    g.on('pointerout', () => g.setScale(1));
  }

  private updateJoystickKnob(px: number, py: number): void {
    if (!this.virtualJoystick) return;
    const { jx, jy } = this.virtualJoystick;
    let dx = px - jx;
    let dy = py - jy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 50;
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    this.virtualJoystick.knob.setPosition(jx + dx, jy + dy);
    this.virtualJoystick.dx = dx / maxDist;
    this.virtualJoystick.dy = dy / maxDist;
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.isInventoryOpen || this.craftingOpen) return;
    const worldPoint = this.cameras.main.getWorldPoint(p.x, p.y);
    this.handleWorldClick(worldPoint.x, worldPoint.y);
  }

  private onTileClick(tile: Tile): void {
    this.handleWorldClick(
      (tile.gridX + 0.5) * WorldManager.TILE_SIZE,
      (tile.gridY + 0.5) * WorldManager.TILE_SIZE
    );
  }

  private handleWorldClick(wx: number, wy: number): void {
    const tool = this.player.currentTool;
    const gridX = Math.floor(wx / WorldManager.TILE_SIZE);
    const gridY = Math.floor(wy / WorldManager.TILE_SIZE);
    const tile = this.world.getTile(gridX, gridY);

    if (tile && tile.type === TileType.CRAFTING) {
      const px = this.player.x / WorldManager.TILE_SIZE;
      const py = this.player.y / WorldManager.TILE_SIZE;
      const craftPos = this.world.getCraftingStationPosition();
      const dist = Math.sqrt((px - craftPos.x - 0.5) ** 2 + (py - craftPos.y - 0.5) ** 2);
      if (dist < 2.5) {
        this.openCraftingPanel();
        return;
      }
    }

    if (tool === ToolType.HAMMER) {
      if (tile && tile.harvestable) {
        const result = this.player.harvestAt(wx, wy);
        if (result.item) {
          this.showExclamation();
          const particleColor = tile.type === TileType.TREE ? 0x5d8a2b : 0xa0a0a0;
          this.spawnHarvestParticles(wx, wy, particleColor);
          this.showFloatingText(`+1 ${this.getItemName(result.item)}`, wx, wy - 20, 0xffff00);
          this.refreshTile(gridX, gridY);
        }
      }
    } else if (tool === ToolType.SWORD || tool === ToolType.IRON_SWORD) {
      const nearEnemies = this.enemies.findEnemiesInRange(wx, wy, WorldManager.TILE_SIZE * 1.5);
      if (nearEnemies.length > 0) {
        this.performAttack();
      }
    } else if (tool === ToolType.FENCE) {
      if (this.player.placeFence(wx, wy)) {
        this.refreshTile(gridX, gridY);
        this.showFloatingText('放置栅栏', wx, wy - 20, 0x8b5a2b);
      }
    }
  }

  private getItemName(id: string): string {
    const def = ITEM_DEFS[id as keyof typeof ITEM_DEFS];
    return def ? def.name : id;
  }

  private performAttack(): void {
    this.attackSwingTimer = 200;
    const dir = this.player.direction;
    const dirs = [
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: 1, y: 0 }
    ];
    this.currentAttackDir = dirs[dir];
    this.player.attack();

    const range = WorldManager.TILE_SIZE * 1.8;
    const px = this.player.x + this.currentAttackDir.x * range * 0.3;
    const py = this.player.y + this.currentAttackDir.y * range * 0.3;
    const nearEnemies = this.enemies.findEnemiesInRange(px, py, range);
    for (const enemy of nearEnemies) {
      this.enemies.damageEnemy(enemy.id, this.player.getAttackDamage());
    }
    this.createAttackArc();
  }

  private createAttackArc(): void {
    if (this.attackArc) {
      this.attackArc.destroy();
    }
    const r = WorldManager.TILE_SIZE * 1.2;
    const startAngle = Math.atan2(this.currentAttackDir.y, this.currentAttackDir.x) - Math.PI / 3;
    const endAngle = startAngle + (Math.PI * 2) / 3;

    const g = this.add.graphics();
    g.setPosition(
      this.player.x + this.currentAttackDir.x * r * 0.4,
      this.player.y + this.currentAttackDir.y * r * 0.4
    );
    g.setDepth(200);
    g.lineStyle(4, 0xffff00, 0.9);
    g.fillStyle(0xffffff, 0.4);

    const steps = 16;
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startAngle + (endAngle - startAngle) * t;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();

    this.attackArc = g as unknown as Phaser.GameObjects.Arc;

    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        g.destroy();
        if (this.attackArc === (g as unknown as Phaser.GameObjects.Arc)) {
          this.attackArc = undefined;
        }
      }
    });
  }

  private setupUI(): void {
    const vw = this.scale.width;
    const vh = this.scale.height;

    this.statusBar = this.add.rectangle(vw / 2, vh - 30, vw, 60, 0x000000, 0.6);
    this.statusBar.setOrigin(0.5, 1);
    this.statusBar.setScrollFactor(0);
    this.statusBar.setDepth(900);

    this.createResourceBars();
    this.createHealthAndExpBars();
    this.createToolSlots();

    this.fpsText = this.add.text(10, 10, 'FPS: 60', {
      fontFamily: 'Courier New',
      fontSize: `${14 * this.uiScale}px`,
      color: '#00ff00'
    });
    this.fpsText.setScrollFactor(0);
    this.fpsText.setDepth(1000);

    this.levelUpFlash = this.add.rectangle(vw / 2, vh / 2, vw, vh, 0xffffff, 0);
    this.levelUpFlash.setScrollFactor(0);
    this.levelUpFlash.setDepth(1500);
  }

  private createResourceBars(): void {
    const vw = this.scale.width;
    const resources = ['wood', 'stone', 'iron', 'gold'];
    const colors = [0x8b5a2b, 0x808080, 0xd4af37, 0xffd700];
    const names = ['木材', '石头', '铁锭', '金币'];
    const startX = vw - 20;
    const y = 20;
    const w = 110 * this.uiScale;
    const h = 40 * this.uiScale;
    const gap = 10;

    for (let i = 0; i < resources.length; i++) {
      const x = startX - (i + 1) * (w + gap);
      const bg = this.add.rectangle(x, y, w, h, 0x3c2418, 0.9);
      bg.setOrigin(1, 0).setStrokeStyle(2, 0x8b5a2b, 0.8);
      bg.setScrollFactor(0).setDepth(950);

      const icon = this.makeIconGraphics(resources[i], colors[i]);
      icon.setPosition(x - w + 8 + 16 * this.uiScale, y + h / 2);
      icon.setScrollFactor(0).setDepth(950);

      const count = this.inventory.getItemCount(resources[i]);
      const text = this.add.text(x - 10, y + h / 2, `${names[i]}: ${count}`, {
        fontFamily: 'Courier New',
        fontSize: `${14 * this.uiScale}px`,
        color: '#ffffff',
        fontStyle: 'bold'
      });
      text.setOrigin(1, 0.5).setScrollFactor(0).setDepth(950);

      this.resourceBars.set(resources[i], { bg, text, icon });
    }
  }

  private makeIconGraphics(kind: string, color: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    const s = 24 * this.uiScale;
    g.fillStyle(0x000000, 0.4);
    g.fillRect(-s / 2 - 1, -s / 2 - 1, s + 2, s + 2);
    g.fillStyle(color, 1);
    g.fillRect(-s / 2, -s / 2, s, s);
    g.fillStyle(0xffffff, 0.3);
    g.fillRect(-s / 2, -s / 2, s / 3, s / 3);
    if (kind === 'gold') {
      g.fillStyle(0xffdd00, 1);
      g.fillCircle(0, 0, s / 3);
    }
    return g;
  }

  private createHealthAndExpBars(): void {
    const vh = this.scale.height;
    const x = 20;
    const y = vh - 100 * this.uiScale;
    const w = 220 * this.uiScale;
    const h = 20 * this.uiScale;

    this.hpBarBg = this.add.rectangle(x, y, w, h, 0x333333, 0.9);
    this.hpBarBg.setOrigin(0, 0.5).setStrokeStyle(2, 0x000000, 0.8);
    this.hpBarBg.setScrollFactor(0).setDepth(950);

    this.hpBarFill = this.add.rectangle(x + 2, y, w - 4, h - 4, 0xff3333, 1);
    this.hpBarFill.setOrigin(0, 0.5);
    this.hpBarFill.setScrollFactor(0).setDepth(951);

    this.add.text(x + w / 2, y, `HP ${this.player.hp}/${this.player.maxHp}`, {
      fontFamily: 'Courier New',
      fontSize: `${12 * this.uiScale}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(952);

    this.levelText = this.add.text(x, y - h - 6 * this.uiScale, `Lv.${this.player.level}`, {
      fontFamily: 'Courier New',
      fontSize: `${14 * this.uiScale}px`,
      color: '#ffffaa',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.levelText.setOrigin(0, 1).setScrollFactor(0).setDepth(952);

    const ey = y + h + 8 * this.uiScale;
    this.expBarBg = this.add.rectangle(x, ey, w, h * 0.7, 0x333333, 0.9);
    this.expBarBg.setOrigin(0, 0.5).setStrokeStyle(2, 0x000000, 0.8);
    this.expBarBg.setScrollFactor(0).setDepth(950);

    this.expBarFill = this.add.rectangle(
      x + 2,
      ey,
      (w - 4) * (this.player.exp / this.player.expToNextLevel),
      h * 0.7 - 4,
      0x3399ff,
      1
    );
    this.expBarFill.setOrigin(0, 0.5);
    this.expBarFill.setScrollFactor(0).setDepth(951);
  }

  private createToolSlots(): void {
    const vw = this.scale.width;
    const vh = this.scale.height;
    const size = 52 * this.uiScale;
    const gap = 8;
    const totalW = size * 4 + gap * 3;
    const startX = (vw - totalW) / 2;
    const y = vh - 30 * this.uiScale;

    const slots = this.player.getToolSlots();
    for (let i = 0; i < 4; i++) {
      const x = startX + i * (size + gap);
      const isActive = i === this.player.currentToolSlot;
      const bg = this.add.rectangle(x, y, size, size, isActive ? 0x664422 : 0x3c2418, 0.95);
      bg.setOrigin(0, 1).setStrokeStyle(isActive ? 3 : 2, isActive ? 0xffcc00 : 0x8b5a2b, 1);
      bg.setScrollFactor(0).setDepth(960);
      bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, size, size), Phaser.Geom.Rectangle.Contains);
      bg.on('pointerdown', () => this.player.selectToolSlot(i));
      this.toolSlotBgs.push(bg);

      this.add.text(x + 6, y - size + 4, `${i + 1}`, {
        fontFamily: 'Courier New',
        fontSize: `${12 * this.uiScale}px`,
        color: '#aaaaaa'
      })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(962);

      const tool = slots[i];
      if (tool) {
        const icon = this.createToolSlotIcon(tool, x + size / 2, y - size / 2);
        icon.setScrollFactor(0).setDepth(961);
        this.toolSlotIcons[i] = icon;
      }
    }
  }

  private createToolSlotIcon(tool: ToolType, x: number, y: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.setPosition(x, y);
    const s = 28 * this.uiScale;
    if (tool === ToolType.HAMMER) {
      g.fillStyle(0x8b4513, 1);
      g.fillRect(-2, -4, 4, s * 0.6);
      g.fillStyle(0x808080, 1);
      g.fillRect(-s * 0.35, -s * 0.45, s * 0.7, s * 0.3);
    } else if (tool === ToolType.SWORD) {
      g.fillStyle(0xc8a96e, 1);
      g.fillRect(-1, -s * 0.6, 3, s * 0.8);
      g.fillStyle(0x8b4513, 1);
      g.fillRect(-s * 0.25, s * 0.05, s * 0.5, s * 0.08);
      g.fillRect(-1, s * 0.05, 2, s * 0.25);
    } else if (tool === ToolType.IRON_SWORD) {
      g.fillStyle(0xe0e0e0, 1);
      g.fillRect(-1, -s * 0.75, 3, s * 0.9);
      g.fillStyle(0x8b4513, 1);
      g.fillRect(-s * 0.28, s * 0.05, s * 0.56, s * 0.1);
      g.fillStyle(0xffd700, 1);
      g.fillCircle(0, s * 0.15, 3);
    } else if (tool === ToolType.FENCE) {
      g.fillStyle(0x8b5a2b, 1);
      g.fillRect(-s * 0.3, -s * 0.5, s * 0.12, s);
      g.fillRect(s * 0.18, -s * 0.5, s * 0.12, s);
      g.fillRect(-s * 0.35, -s * 0.3, s * 0.7, s * 0.1);
      g.fillRect(-s * 0.35, s * 0.05, s * 0.7, s * 0.1);
    }
    return g;
  }

  private rebuildUI(): void {
    for (const [, v] of this.resourceBars) {
      v.bg.destroy();
      v.text.destroy();
      v.icon.destroy();
    }
    this.resourceBars.clear();
    this.hpBarBg?.destroy();
    this.hpBarFill?.destroy();
    this.expBarBg?.destroy();
    this.expBarFill?.destroy();
    this.levelText?.destroy();
    this.statusBar?.destroy();
    this.fpsText?.destroy();
    for (const b of this.toolSlotBgs) b.destroy();
    this.toolSlotBgs = [];
    for (const ic of this.toolSlotIcons) if (ic) ic.destroy();
    this.toolSlotIcons = [null, null, null, null];
    this.levelUpFlash?.destroy();
    this.setupUI();
  }

  private setupEventListeners(): void {
    this.inventory.on('inventoryChanged', (e: any) => this.onInventoryChanged(e));
    this.player.on(PlayerEvent.TOOL_CHANGED, () => {
      this.drawCurrentTool();
      this.refreshToolSlotsHighlight();
    });
    this.player.on(PlayerEvent.HP_CHANGED, (e: any) => this.onHpChanged(e));
    this.player.on(PlayerEvent.EXP_CHANGED, (e: any) => this.onExpChanged(e));
    this.player.on(PlayerEvent.LEVEL_UP, (e: any) => this.onLevelUp(e));
    this.enemies.on(EnemyEvent.DAMAGED, (e: any) => this.onEnemyDamaged(e.enemy, e.damage));
    this.enemies.on(EnemyEvent.KILLED, (e: any) => this.onEnemyKilled(e));
    this.enemies.on(EnemyEvent.DROPPED_GOLD, (e: any) => this.onGoldDropped(e));
    this.inventory.on('craftSuccess', () => this.onCraftSuccess());
  }

  private refreshToolSlotsHighlight(): void {
    for (let i = 0; i < this.toolSlotBgs.length; i++) {
      const bg = this.toolSlotBgs[i];
      const isActive = i === this.player.currentToolSlot;
      bg.setFillStyle(isActive ? 0x664422 : 0x3c2418, 0.95);
      bg.setStrokeStyle(isActive ? 3 : 2, isActive ? 0xffcc00 : 0x8b5a2b, 1);
    }
  }

  private onInventoryChanged(e: any): void {
    const bar = this.resourceBars.get(e.itemId);
    if (bar) {
      const names: Record<string, string> = { wood: '木材', stone: '石头', iron: '铁锭', gold: '金币' };
      const name = names[e.itemId] || e.itemId;
      bar.text.setText(`${name}: ${e.quantity}`);
      bar.text.setScale(1.2);
      this.tweens.add({
        targets: bar.text,
        scale: 1,
        duration: 100,
        ease: 'Linear'
      });
      bar.bg.setScale(1.05);
      this.tweens.add({
        targets: bar.bg,
        scale: 1,
        duration: 100,
        ease: 'Linear'
      });
    }
    if (this.isInventoryOpen) this.refreshInventoryItems();
  }

  private onHpChanged(e: any): void {
    if (!this.hpBarFill || !this.hpBarBg) return;
    const ratio = e.hp / e.maxHp;
    const targetW = (this.hpBarBg.width - 4) * Math.max(0, ratio);
    this.tweens.add({
      targets: this.hpBarFill,
      width: targetW,
      duration: 300,
      ease: 'Sine.easeOut'
    });
  }

  private onExpChanged(e: any): void {
    if (!this.expBarFill || !this.expBarBg) return;
    const ratio = e.exp / e.expToNext;
    const targetW = (this.expBarBg.width - 4) * Math.max(0, Math.min(1, ratio));
    this.tweens.add({
      targets: this.expBarFill,
      width: targetW,
      duration: 300,
      ease: 'Sine.easeOut'
    });
  }

  private onLevelUp(e: any): void {
    if (this.levelText) this.levelText.setText(`Lv.${e.level}`);

    if (this.levelUpFlash) {
      this.levelUpFlash.setAlpha(1);
      this.tweens.add({
        targets: this.levelUpFlash,
        alpha: 0,
        duration: 200,
        ease: 'Sine.easeOut'
      });
    }
    this.showFloatingText(`升级! Lv.${e.level}`, this.player.x, this.player.y - 80, 0xffff00, 1600);
  }

  private onEnemyDamaged(enemy: SlimeEnemy, _damage: number): void {
    const sprite = this.enemySprites.get(enemy.id);
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        scaleX: 1.2 * enemy.scale,
        scaleY: 0.8 * enemy.scale,
        duration: 80,
        yoyo: true,
        repeat: 1
      });
    }
  }

  private onEnemyKilled(enemy: SlimeEnemy): void {
    this.player.addExp(25);
    const sprite = this.enemySprites.get(enemy.id);
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        scale: 0,
        alpha: 0,
        duration: 300,
        ease: 'Back.easeIn',
        onComplete: () => {
          sprite.destroy();
          this.enemySprites.delete(enemy.id);
        }
      });
    }
  }

  private onGoldDropped(e: any): void {
    const id = this.nextGoldId++;
    const offsetX = (Math.random() - 0.5) * WorldManager.TILE_SIZE;
    const offsetY = (Math.random() - 0.5) * WorldManager.TILE_SIZE;
    const gx = e.x + offsetX;
    const gy = e.y + offsetY;

    const sprite = this.add.graphics();
    sprite.setPosition(gx, gy);
    sprite.setDepth(80);
    sprite.fillStyle(0xffd700, 1);
    sprite.fillCircle(0, 0, 8);
    sprite.fillStyle(0xffffff, 0.6);
    sprite.fillCircle(-2, -2, 3);
    sprite.setInteractive(new Phaser.Geom.Circle(0, 0, 14), Phaser.Geom.Circle.Contains);
    sprite.on('pointerdown', () => {
      this.inventory.addItem('gold', e.amount);
      this.showFloatingText(`+${e.amount} 金币`, gx, gy - 10, 0xffd700);
      sprite.destroy();
      this.goldPickups.delete(id);
    });

    this.tweens.add({
      targets: sprite,
      y: gy - 20,
      duration: 300,
      ease: 'Bounce.easeOut'
    });

    this.goldPickups.set(id, { sprite, amount: e.amount });

    this.time.addEvent({
      delay: 8000,
      callback: () => {
        if (this.goldPickups.has(id)) {
          sprite.destroy();
          this.goldPickups.delete(id);
        }
      }
    });
  }

  private onCraftSuccess(): void {
    this.showSuccessToast('合成成功!');
  }

  private showExclamation(): void {
    if (!this.exclaimMark) return;
    this.exclaimTimer = 500;
    this.exclaimMark.setVisible(true);
    this.exclaimMark.setAlpha(1);
    this.exclaimMark.setScale(0.5);
    this.tweens.add({
      targets: this.exclaimMark,
      scale: 1.2,
      duration: 100,
      ease: 'Back.easeOut',
      yoyo: true
    });
  }

  private spawnHarvestParticles(wx: number, wy: number, color: number): void {
    if (this.performanceMode) return;
    const count = 8;
    const container = this.add.container(wx, wy);
    container.setDepth(150);
    const parts: Phaser.GameObjects.Graphics[] = [];
    for (let i = 0; i < count; i++) {
      const p = this.add.graphics();
      p.fillStyle(color, 1);
      const size = 3 + Math.random() * 4;
      p.fillRect(-size / 2, -size / 2, size, size);
      p.setPosition(0, 0);
      container.add(p);
      parts.push(p);
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 40;
      this.tweens.add({
        targets: p,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 20,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.easeOut'
      });
    }
    const tw = this.tweens.add({
      targets: container,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        container.destroy();
        const idx = this.particles.findIndex((p) => p.container === container);
        if (idx >= 0) this.particles.splice(idx, 1);
      }
    });
    this.particles.push({ id: this.nextParticleId++, container, tween: tw });
  }

  private showFloatingText(
    text: string,
    wx: number,
    wy: number,
    color: number = 0xffffff,
    duration: number = 800
  ): void {
    const t = this.add.text(wx, wy, text, {
      fontFamily: 'Courier New',
      fontSize: '18px',
      fontStyle: 'bold',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      stroke: '#000000',
      strokeThickness: 3
    });
    t.setOrigin(0.5).setDepth(500);

    const tw = this.tweens.add({
      targets: t,
      y: wy - 50,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        t.destroy();
        const idx = this.floatingTexts.findIndex((f) => f.text === t);
        if (idx >= 0) this.floatingTexts.splice(idx, 1);
      }
    });

    this.floatingTexts.push({ id: this.nextFloatingId++, text: t, tween: tw });
  }

  private showSuccessToast(message: string): void {
    const vw = this.scale.width;
    const vh = this.scale.height;
    if (this.successToast) {
      this.successToast.destroy();
    }
    this.successToast = this.add.container(vw / 2, vh + 60);
    this.successToast.setDepth(1600);
    this.successToast.setScrollFactor(0);

    const g = this.add.graphics();
    const w = 200 * this.uiScale;
    const h = 50 * this.uiScale;
    g.fillStyle(0x3c2418, 0.95);
    g.lineStyle(3, 0x66cc66, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    this.successToast.add(g);

    const text = this.add.text(0, 0, message, {
      fontFamily: 'Courier New',
      fontSize: `${18 * this.uiScale}px`,
      color: '#66ff66',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    text.setOrigin(0.5);
    this.successToast.add(text);

    let flickerState = true;
    let flickerTimer: Phaser.Time.TimerEvent | null = null;

    const startFlicker = () => {
      flickerTimer = this.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => {
          flickerState = !flickerState;
          const targetAlpha = flickerState ? 1.0 : 0.8;
          this.tweens.add({
            targets: text,
            alpha: targetAlpha,
            duration: 80,
            ease: 'Linear'
          });
        }
      });
    };

    const stopFlicker = () => {
      if (flickerTimer) {
        flickerTimer.remove();
        flickerTimer = null;
      }
    };

    this.tweens.add({
      targets: this.successToast,
      y: vh - 120,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        startFlicker();
        this.tweens.add({
          targets: this.successToast,
          delay: 1600,
          alpha: 0,
          y: vh + 60,
          duration: 300,
          ease: 'Back.easeIn',
          onStart: () => {
            stopFlicker();
          },
          onComplete: () => {
            this.successToast?.destroy();
            this.successToast = undefined;
          }
        });
      }
    });
  }

  private toggleInventory(): void {
    if (this.craftingOpen) this.closeCraftingPanel();
    if (this.isInventoryOpen) {
      this.closeInventory();
    } else {
      this.openInventory();
    }
  }

  private openInventory(): void {
    this.isInventoryOpen = true;
    const vw = this.scale.width;
    const vh = this.scale.height;
    const pw = 320 * this.uiScale;
    const ph = Math.min(vh * 0.8, 480 * this.uiScale);

    this.inventoryBg = this.add.rectangle(vw / 2, vh / 2, vw, vh, 0x000000, 0.35);
    this.inventoryBg.setScrollFactor(0).setDepth(1100);

    this.inventoryPanel = this.add.container(-pw, vh / 2);
    this.inventoryPanel.setScrollFactor(0).setDepth(1101);
    this.inventoryPanel.setScale(0.8).setAlpha(0);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x2c1810, 0.95);
    panelBg.lineStyle(3, 0x8b5a2b, 1);
    const r = 8;
    panelBg.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, r);
    panelBg.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, r);
    this.inventoryPanel.add(panelBg);

    const title = this.add.text(0, -ph / 2 + 30 * this.uiScale, '🎒 背包', {
      fontFamily: 'Courier New',
      fontSize: `${24 * this.uiScale}px`,
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.inventoryPanel.add(title);

    const closeBtn = this.add.text(pw / 2 - 20 * this.uiScale, -ph / 2 + 20 * this.uiScale, '✕', {
      fontFamily: 'Courier New',
      fontSize: `${22 * this.uiScale}px`,
      color: '#ff6666'
    }).setOrigin(1, 0);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeInventory());
    this.inventoryPanel.add(closeBtn);

    this.inventoryBg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, vw, vh),
      Phaser.Geom.Rectangle.Contains
    );
    this.inventoryBg.on('pointerdown', (p: any) => {
      if (p.target === this.inventoryBg) this.closeInventory();
    });

    this.tweens.add({
      targets: this.inventoryPanel,
      x: vw / 2,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    this.refreshInventoryItems();
  }

  private refreshInventoryItems(): void {
    if (!this.inventoryPanel) return;
    for (const [, c] of this.inventoryItems) c.destroy();
    this.inventoryItems.clear();

    const items = this.inventory.getInventoryList();
    const ph = Math.min(this.scale.height * 0.8, 480 * this.uiScale);
    const cols = 3;
    const cellSize = 80 * this.uiScale;
    const gap = 12 * this.uiScale;
    const totalW = cols * cellSize + (cols - 1) * gap;
    const startX = -totalW / 2 + cellSize / 2;
    const startY = -ph / 2 + 90 * this.uiScale;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);

      const cell = this.add.container(x, y);
      cell.setDepth(1102);

      const isSelected = this.selectedItemId === item.id;
      const cellBg = this.add.graphics();
      cellBg.fillStyle(isSelected ? 0x664422 : 0x3c2418, 1);
      cellBg.lineStyle(isSelected ? 3 : 2, isSelected ? 0xffd700 : 0x8b5a2b, isSelected ? 1 : 0.8);
      const r = 8;
      cellBg.fillRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, r);
      cellBg.strokeRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, r);
      if (isSelected) {
        cellBg.lineStyle(6, 0xffd700, 0.4);
        cellBg.strokeRoundedRect(-cellSize / 2 - 3, -cellSize / 2 - 3, cellSize + 6, cellSize + 6, r);
      }
      cell.add(cellBg);

      const iconSize = 40 * this.uiScale;
      const colorMap: Record<string, number> = {
        wood: 0x8b5a2b,
        stone: 0x808080,
        iron: 0xd4af37,
        gold: 0xffd700,
        fence: 0x8b5a2b,
        iron_sword: 0xc0c0c0
      };
      const iconColor = colorMap[item.id] || 0xffffff;
      const iconG = this.add.graphics();
      iconG.fillStyle(0x000000, 0.3);
      iconG.fillRect(-iconSize / 2 - 1, -iconSize / 2 - 1, iconSize + 2, iconSize + 2);
      iconG.fillStyle(iconColor, 1);
      iconG.fillRect(-iconSize / 2, -iconSize / 2, iconSize, iconSize);
      iconG.fillStyle(0xffffff, 0.3);
      iconG.fillRect(-iconSize / 2, -iconSize / 2, iconSize / 3, iconSize / 3);
      if (item.id === 'iron_sword') {
        iconG.clear();
        iconG.fillStyle(0xe0e0e0, 1);
        iconG.fillRect(-3, -iconSize / 2 + 4, 6, iconSize * 0.7);
        iconG.fillStyle(0x8b4513, 1);
        iconG.fillRect(-iconSize * 0.25, 0, iconSize * 0.5, 4);
        iconG.fillStyle(0xffd700, 1);
        iconG.fillCircle(0, 8, 3);
      } else if (item.id === 'fence') {
        iconG.clear();
        iconG.fillStyle(0x8b5a2b, 1);
        iconG.fillRect(-iconSize * 0.3, -iconSize / 2, 6, iconSize);
        iconG.fillRect(iconSize * 0.2, -iconSize / 2, 6, iconSize);
        iconG.fillRect(-iconSize * 0.35, -iconSize * 0.3, iconSize * 0.7, 5);
        iconG.fillRect(-iconSize * 0.35, iconSize * 0.05, iconSize * 0.7, 5);
      }
      cell.add(iconG);

      const countText = this.add.text(cellSize / 2 - 8, cellSize / 2 - 8, `${item.quantity}`, {
        fontFamily: 'Courier New',
        fontSize: `${14 * this.uiScale}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(1, 1);
      cell.add(countText);

      const nameText = this.add.text(0, -cellSize / 2 - 2, item.name, {
        fontFamily: 'Courier New',
        fontSize: `${11 * this.uiScale}px`,
        color: '#cccccc'
      }).setOrigin(0.5, 1);
      cell.add(nameText);

      cellBg.setInteractive(
        new Phaser.Geom.Rectangle(-cellSize / 2, -cellSize / 2, cellSize, cellSize),
        Phaser.Geom.Rectangle.Contains
      );
      const capturedItemId = item.id;
      cellBg.on('pointerdown', () => {
        this.selectedItemId = capturedItemId;
        this.refreshInventoryItems();
        this.onSelectInventoryItem(capturedItemId);
      });

      this.inventoryPanel.add(cell);
      this.inventoryItems.set(item.id, cell);
    }

    if (items.length === 0) {
      const empty = this.add.text(0, 0, '背包空空如也', {
        fontFamily: 'Courier New',
        fontSize: `${16 * this.uiScale}px`,
        color: '#888888'
      }).setOrigin(0.5);
      this.inventoryPanel.add(empty);
      this.inventoryItems.set('__empty__', this.add.container(0, 0).add(empty));
    }
  }

  private onSelectInventoryItem(itemId: string): void {
    const toolMap: Record<string, ToolType> = {
      hammer: ToolType.HAMMER,
      sword: ToolType.SWORD,
      iron_sword: ToolType.IRON_SWORD,
      fence: ToolType.FENCE
    };
    if (toolMap[itemId]) {
      this.player.selectTool(toolMap[itemId]);
    }
  }

  private closeInventory(): void {
    if (!this.isInventoryOpen || !this.inventoryPanel || !this.inventoryBg) return;
    const pw = 320 * this.uiScale;
    this.tweens.add({
      targets: this.inventoryPanel,
      x: -pw,
      scale: 0.8,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.inventoryPanel?.destroy();
        this.inventoryPanel = undefined;
        for (const [, c] of this.inventoryItems) c.destroy();
        this.inventoryItems.clear();
      }
    });
    this.inventoryBg.destroy();
    this.inventoryBg = undefined;
    this.isInventoryOpen = false;
  }

  private openCraftingPanel(): void {
    if (this.isInventoryOpen) this.closeInventory();
    if (this.craftingOpen) return;
    this.craftingOpen = true;
    const vw = this.scale.width;
    const vh = this.scale.height;
    const pw = 360 * this.uiScale;
    const ph = 400 * this.uiScale;

    this.craftingDimBg = this.add.rectangle(vw / 2, vh / 2, vw, vh, 0x000000, 0.4);
    this.craftingDimBg.setScrollFactor(0).setDepth(1200);

    this.craftingPanel = this.add.container(vw / 2, vh / 2);
    this.craftingPanel.setScrollFactor(0).setDepth(1201);
    this.craftingPanel.setScale(0.8).setAlpha(0);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x2c1810, 0.95);
    panelBg.lineStyle(3, 0xd2691e, 1);
    const r = 8;
    panelBg.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, r);
    panelBg.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, r);
    this.craftingPanel.add(panelBg);

    const title = this.add.text(0, -ph / 2 + 30 * this.uiScale, '🛠 合成台', {
      fontFamily: 'Courier New',
      fontSize: `${24 * this.uiScale}px`,
      color: '#ffcc66',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.craftingPanel.add(title);

    const closeBtn = this.add.text(pw / 2 - 20 * this.uiScale, -ph / 2 + 20 * this.uiScale, '✕', {
      fontFamily: 'Courier New',
      fontSize: `${22 * this.uiScale}px`,
      color: '#ff6666'
    }).setOrigin(1, 0);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeCraftingPanel());
    this.craftingPanel.add(closeBtn);

    this.craftingDimBg!.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, vw, vh),
      Phaser.Geom.Rectangle.Contains
    );
    this.craftingDimBg!.on('pointerdown', (p: any) => {
      if (p.target === this.craftingDimBg) this.closeCraftingPanel();
    });

    const recipeY0 = -ph / 2 + 80 * this.uiScale;
    const recipeH = 100 * this.uiScale;
    const recipeGap = 12 * this.uiScale;

    for (let i = 0; i < RECIPES.length; i++) {
      const recipe = RECIPES[i];
      const y = recipeY0 + i * (recipeH + recipeGap);
      this.createRecipeCard(recipe, y, pw);
    }

    this.tweens.add({
      targets: this.craftingPanel,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  private createRecipeCard(recipe: any, y: number, pw: number): void {
    const card = this.add.container(0, y);
    this.craftingPanel!.add(card);

    const cardW = pw - 60 * this.uiScale;
    const cardH = 90 * this.uiScale;

    const bg = this.add.graphics();
    bg.fillStyle(0x3c2418, 1);
    bg.lineStyle(2, 0x8b5a2b, 0.8);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
    card.add(bg);

    const nameText = this.add.text(-cardW / 2 + 16 * this.uiScale, -cardH / 2 + 12 * this.uiScale, recipe.name, {
      fontFamily: 'Courier New',
      fontSize: `${16 * this.uiScale}px`,
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0, 0);
    card.add(nameText);

    const canCraft = this.inventory.canCraft(recipe);
    const textColor = canCraft ? '#66ff66' : '#ff6666';

    let inputText = '';
    for (let j = 0; j < recipe.inputs.length; j++) {
      const input = recipe.inputs[j];
      const names: Record<string, string> = { wood: '木材', stone: '石头', iron: '铁锭', gold: '金币' };
      const have = this.inventory.getItemCount(input.itemId);
      const need = input.count;
      inputText += `${names[input.itemId] || input.itemId} ${have}/${need}  `;
    }
    const inputLabel = this.add.text(-cardW / 2 + 16 * this.uiScale, 0, inputText, {
      fontFamily: 'Courier New',
      fontSize: `${12 * this.uiScale}px`,
      color: textColor
    }).setOrigin(0, 0.5);
    card.add(inputLabel);

    const btnW = 80 * this.uiScale;
    const btnH = 36 * this.uiScale;
    const btnX = cardW / 2 - 20 * this.uiScale - btnW / 2;
    const btnY = cardH / 2 - 20 * this.uiScale - btnH / 2;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(canCraft ? 0x66aa33 : 0x555555, 1);
    btnBg.lineStyle(2, canCraft ? 0x99dd66 : 0x777777, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
    btnBg.setPosition(btnX + btnW / 2, btnY + btnH / 2);
    card.add(btnBg);

    const btnText = this.add.text(btnX + btnW / 2, btnY + btnH / 2, '合成', {
      fontFamily: 'Courier New',
      fontSize: `${14 * this.uiScale}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    card.add(btnText);

    if (canCraft) {
      btnBg.setInteractive(
        new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
        Phaser.Geom.Rectangle.Contains
      );
      btnBg.on('pointerover', () => btnBg.setAlpha(0.85));
      btnBg.on('pointerout', () => btnBg.setAlpha(1));
      btnBg.on('pointerdown', () => {
        if (this.inventory.craft(recipe)) {
          this.triggerCraftingAnimation();
          this.closeCraftingPanel();
        }
      });
    }
  }

  private triggerCraftingAnimation(): void {
    this.isCrafting = true;
    this.craftingAnimationTimer = 1000;
  }

  private closeCraftingPanel(): void {
    if (!this.craftingOpen || !this.craftingPanel || !this.craftingDimBg) return;
    this.tweens.add({
      targets: this.craftingPanel,
      scale: 0.8,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.craftingPanel?.destroy();
        this.craftingPanel = undefined;
      }
    });
    this.craftingDimBg.destroy();
    this.craftingDimBg = undefined;
    this.craftingOpen = false;
  }

  private createEnemySprite(enemy: SlimeEnemy): void {
    if (this.enemySprites.has(enemy.id)) return;

    const container = this.add.container(enemy.x, enemy.y);
    container.setDepth(60);

    const body = this.add.graphics();
    const w = 32;
    const h = 24;
    body.fillStyle(0x66cc66, 1);
    body.fillEllipse(0, 0, w, h);
    body.fillStyle(0x99ff99, 0.5);
    body.fillEllipse(-4, -4, 10, 6);
    body.fillStyle(0x000000, 1);
    body.fillCircle(-6, -2, 3);
    body.fillCircle(6, -2, 3);
    body.fillStyle(0xffffff, 1);
    body.fillCircle(-5, -3, 1);
    body.fillCircle(7, -3, 1);
    container.add(body);

    const hitFlash = this.add.graphics();
    hitFlash.fillStyle(0xff3333, 0);
    hitFlash.fillEllipse(0, 0, w, h);
    hitFlash.setName('hitFlash');
    container.add(hitFlash);

    this.enemySprites.set(enemy.id, container);
  }

  public update(time: number, delta: number): void {
    super.update(time, delta);

    this.frameCount++;
    if (time - this.lastFpsCheck >= 1000) {
      const instantFps = this.frameCount / ((time - this.lastFpsCheck) / 1000);
      this.fpsSmoothed = this.fpsSmoothed * 0.7 + instantFps * 0.3;
      this.frameCount = 0;
      this.lastFpsCheck = time;

      if (this.fpsText) {
        const color = this.fpsSmoothed >= 30 ? '#00ff00' : this.fpsSmoothed >= 25 ? '#ffff00' : '#ff0000';
        this.fpsText.setText(`FPS: ${Math.round(this.fpsSmoothed)}`);
        this.fpsText.setColor(color);
      }

      if (this.fpsSmoothed < 25 && !this.performanceMode) {
        this.performanceMode = true;
      } else if (this.fpsSmoothed > 35 && this.performanceMode) {
        this.performanceMode = false;
      }
    }

    const input = {
      up: this.keys['W']?.isDown || false,
      down: this.keys['S']?.isDown || false,
      left: this.keys['A']?.isDown || false,
      right: this.keys['D']?.isDown || false
    };

    if (this.virtualJoystick && this.virtualJoystick.active) {
      if (this.virtualJoystick.dy < -0.2) input.up = true;
      if (this.virtualJoystick.dy > 0.2) input.down = true;
      if (this.virtualJoystick.dx < -0.2) input.left = true;
      if (this.virtualJoystick.dx > 0.2) input.right = true;
    }

    if (!this.isInventoryOpen && !this.craftingOpen) {
      this.player.update(delta, input, this.performanceMode);
    }

    if (this.playerSprite) {
      this.playerSprite.setPosition(this.player.x, this.player.y);
      this.drawPlayerBody();
    }

    if (this.attackSwingTimer > 0) {
      this.attackSwingTimer -= delta;
      this.drawCurrentTool();
      if (this.attackSwingTimer <= 0) {
        this.attackSwingTimer = 0;
      }
    }

    if (this.exclaimTimer > 0) {
      this.exclaimTimer -= delta;
      if (this.exclaimTimer <= 0 && this.exclaimMark) {
        this.exclaimMark.setVisible(false);
      }
    }

    this.enemies.update(delta, this.player.x, this.player.y);
    this.syncEnemySprites();
    this.checkEnemyPlayerCollision(delta);

    if (this.craftingStationGlow) {
      this.updateCraftingIdleEffect(time, delta);
      this.updateCraftingGlow(delta);
    }

    if (this.isCrafting) {
      this.craftingAnimationTimer -= delta;
      if (this.craftingAnimationTimer <= 0) {
        this.isCrafting = false;
      }
    }

    this.cameras.main.centerOn(this.player.x, this.player.y);
  }

  private syncEnemySprites(): void {
    const enemies = this.enemies.getEnemies();
    const activeIds = new Set<number>();

    for (const enemy of enemies) {
      activeIds.add(enemy.id);
      let sprite = this.enemySprites.get(enemy.id);
      if (!sprite) {
        this.createEnemySprite(enemy);
        sprite = this.enemySprites.get(enemy.id);
      }
      if (sprite) {
        sprite.setPosition(enemy.x, enemy.y);
        const jumpOffset = enemy.jumpPhase * 8;
        sprite.y = enemy.y - jumpOffset;

        if (!this.performanceMode) {
          const squash = 1 - enemy.jumpPhase * 0.2;
          const stretch = 1 + enemy.jumpPhase * 0.15;
          sprite.setScale(stretch, squash);
        } else {
          sprite.setScale(1);
        }

        const flash = sprite.getByName('hitFlash') as Phaser.GameObjects.Graphics;
        if (flash) {
          if (enemy.hitFlashTimer > 0) {
            flash.setAlpha(0.7);
          } else {
            flash.setAlpha(0);
          }
        }
      }
    }

    for (const [id, sprite] of this.enemySprites) {
      if (!activeIds.has(id)) {
        sprite.destroy();
        this.enemySprites.delete(id);
      }
    }
  }

  private checkEnemyPlayerCollision(_delta: number): void {
    const enemies = this.enemies.getEnemies();
    const playerRadius = 16;
    const enemyRadius = 14;

    for (const enemy of enemies) {
      if (enemy.isDying) continue;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < playerRadius + enemyRadius) {
        if (Math.random() < 0.02) {
          this.player.takeDamage(5);
          const pushDist = 20;
          const nx = dx / dist;
          const ny = dy / dist;
          enemy.x += nx * pushDist;
          enemy.y += ny * pushDist;
          enemy.gridX = enemy.x / WorldManager.TILE_SIZE;
          enemy.gridY = enemy.y / WorldManager.TILE_SIZE;
        }
      }
    }
  }

  private updateCraftingIdleEffect(time: number, delta: number): void {
    const craftPos = this.world.getCraftingStationPosition();
    const ts = WorldManager.TILE_SIZE;
    const cx = (craftPos.x + 0.5) * ts;
    const cy = (craftPos.y + 0.5) * ts;

    const px = this.player.x;
    const py = this.player.y;
    const distInTiles = Math.sqrt(
      ((px - cx) / ts) ** 2 + ((py - cy) / ts) ** 2
    );

    const degreesPerSecond = 15;
    this.craftingTargetRotationSpeed = distInTiles <= 3 ? (degreesPerSecond * Math.PI) / 180 : 0;

    const accelerationTime = 500;
    const maxAccel = (degreesPerSecond * Math.PI) / 180 / (accelerationTime / 1000);
    const speedDiff = this.craftingTargetRotationSpeed - this.craftingRotationSpeed;
    const accel = Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), maxAccel * (delta / 1000));
    this.craftingRotationSpeed += accel;

    if (Math.abs(this.craftingRotationSpeed) < 0.001) {
      this.craftingRotationSpeed = 0;
    }

    this.craftingRotation += this.craftingRotationSpeed * (delta / 1000);

    if (this.craftingStationImage) {
      this.craftingStationImage.setRotation(this.craftingRotation);
      this.craftingStationImage.setPosition(cx, cy);
    }

    const shouldSpawnParticles = distInTiles <= 3 || this.craftingRotationSpeed > 0.001;

    if (shouldSpawnParticles && time >= this.nextCraftingParticleTime && !this.performanceMode) {
      this.spawnCraftingIdleParticle(cx, cy);
      this.nextCraftingParticleTime = time + 150;
    }

    for (let i = this.craftingIdleParticles.length - 1; i >= 0; i--) {
      const particle = this.craftingIdleParticles[i];
      const data = particle.getData('particleData') as {
        vy: number;
        life: number;
        maxLife: number;
        baseAlpha: number;
      };

      if (!data) continue;

      data.life -= delta;
      const progress = 1 - data.life / data.maxLife;

      const currentY = particle.y + data.vy * (delta / 1000);
      particle.setY(currentY);

      if (distInTiles > 3) {
        data.baseAlpha = Math.max(0, data.baseAlpha - (delta / 300));
      }

      const alpha = data.baseAlpha * (1 - progress * 0.6);
      particle.setAlpha(alpha);

      const newScale = 1 - progress * 0.3;
      particle.setScale(newScale);

      if (data.life <= 0 || data.baseAlpha <= 0) {
        particle.destroy();
        this.craftingIdleParticles.splice(i, 1);
      }
    }
  }

  private spawnCraftingIdleParticle(cx: number, cy: number): void {
    const ts = WorldManager.TILE_SIZE;
    const g = this.add.graphics();
    const size = 2 + Math.random() * 3;
    const offsetX = (Math.random() - 0.5) * ts * 0.4;
    const startY = cy + ts * 0.3;

    g.fillStyle(0xffd700, 1);
    g.fillRect(-size / 2, -size / 2, size, size);
    g.fillStyle(0xffffaa, 1);
    g.fillRect(-size / 2, -size / 2, size / 2, size / 2);

    g.setPosition(cx + offsetX, startY);
    g.setDepth(6);
    g.setAlpha(0.6);

    const vy = -20 - Math.random() * 25;
    const life = 500 + Math.random() * 200;

    g.setData('particleData', {
      vy,
      life,
      maxLife: life,
      baseAlpha: 0.6
    });

    this.craftingIdleParticles.push(g);
  }

  private updateCraftingGlow(_delta: number): void {
    const craftPos = this.world.getCraftingStationPosition();
    const ts = WorldManager.TILE_SIZE;
    const cx = (craftPos.x + 0.5) * ts;
    const cy = (craftPos.y + 0.5) * ts;

    this.craftingStationGlow!.clear();

    if (this.isCrafting) {
      const progress = 1 - this.craftingAnimationTimer / 1000;
      const glowSize = ts * (0.6 + Math.sin(progress * Math.PI * 4) * 0.15);
      this.craftingStationGlow!.fillStyle(0xffd700, 0.4 + progress * 0.3);
      this.craftingStationGlow!.fillCircle(0, 0, glowSize);
      this.craftingStationGlow!.lineStyle(3, 0xffff00, 0.8);
      this.craftingStationGlow!.strokeCircle(0, 0, glowSize * 0.8);

      for (let i = 0; i < 3; i++) {
        const angle = progress * Math.PI * 2 + (i * Math.PI * 2) / 3;
        const r = glowSize * 0.7;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        this.craftingStationGlow!.fillStyle(0xffff00, 0.9);
        this.craftingStationGlow!.fillCircle(px, py, 4);
      }
    } else {
      const pulse = 0.5 + Math.sin(this.time.now / 500) * 0.2;
      this.craftingStationGlow!.fillStyle(0xffd700, 0.15 * pulse);
      this.craftingStationGlow!.fillCircle(0, 0, ts * 0.5);
    }

    this.craftingStationGlow!.setPosition(cx, cy);
  }
}
