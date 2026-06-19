import Phaser from 'phaser';
import { WorldManager } from '../map/WorldManager';
import { Tile, TerrainType } from '../map/Tile';
import { Player } from '../entities/Player';
import { EnemyManager, EnemyData } from '../entities/EnemyManager';
import { InventoryManager, ItemType, RECIPES, Recipe } from '../entities/InventoryManager';

const TILE_SIZE = 40;
const MAP_COLS = 16;
const MAP_ROWS = 16;

const COLORS = {
  grass1: 0x4A7C2E,
  grass2: 0x5A8C3E,
  grass3: 0x3D6B24,
  tree_trunk: 0x6B3E1F,
  tree_leaves: 0x2E6B1E,
  tree_leaves2: 0x3A7D2A,
  stone1: 0x8C8C8C,
  stone2: 0x7A7A7A,
  stone_highlight: 0xA0A0A0,
  water1: 0x2E5E8B,
  water2: 0x3A6E9B,
  water_highlight: 0x5A8EBB,
  player_body: 0xE8D5B0,
  player_hair: 0x6B3E1F,
  player_shirt: 0x8B6914,
  player_pants: 0x4A3728,
  slime_body: 0x4CAF50,
  slime_dark: 0x388E3C,
  slime_eye: 0xFFFFFF,
  slime_pupil: 0x000000,
  hammer_head: 0x8C8C8C,
  hammer_handle: 0x6B3E1F,
  sword_blade: 0xC0C0C0,
  sword_handle: 0x6B3E1F,
  gold_coin: 0xFFD700,
  wood_item: 0x8B6914,
  stone_item: 0x8C8C8C,
  iron_item: 0xB0B0C0,
  fence_item: 0x8B6914,
  iron_sword_item: 0x8899AA,
  craft_station: 0xD4A76A,
  craft_anvil: 0x6B6B6B,
  hp_bar: 0xE74C3C,
  hp_bg: 0x4A1010,
  exp_bar: 0x3498DB,
  exp_bg: 0x102A4A,
  panel_bg: 0x2C1810,
  panel_border: 0x8B6914,
  text_light: 0xE8D5B0,
  text_gold: 0xFFD700,
  white: 0xFFFFFF,
  red: 0xFF0000,
  exclamation: 0xFFD700,
  rain_drop: 0x5A8EBB,
  rain_drop_light: 0x88BBEE,
  fog_overlay: 0xFFFFFF,
  sun_yellow: 0xFFD700,
  sun_orange: 0xFFA500,
};

const TOOL_SLOTS: ItemType[] = [ItemType.HAMMER, ItemType.SWORD, ItemType.WOODEN_FENCE, ItemType.IRON_SWORD];
const ITEM_NAMES: Record<string, string> = {
  [ItemType.WOOD]: '木材',
  [ItemType.STONE]: '石头',
  [ItemType.IRON]: '铁锭',
  [ItemType.GOLD]: '金币',
  [ItemType.HAMMER]: '锤子',
  [ItemType.SWORD]: '剑',
  [ItemType.WOODEN_FENCE]: '木栅栏',
  [ItemType.IRON_SWORD]: '铁剑',
};

interface FloatingText {
  text: Phaser.GameObjects.Text;
  timer: number;
  startY: number;
}

interface Particle {
  gfx: Phaser.GameObjects.Graphics;
  vx: number;
  vy: number;
  timer: number;
}

enum WeatherType {
  SUNNY = 'sunny',
  RAIN = 'rain',
  FOG = 'fog',
}

interface Raindrop {
  gfx: Phaser.GameObjects.Graphics;
  vy: number;
  vx: number;
}

export class GameScene extends Phaser.Scene {
  private worldManager!: WorldManager;
  private inventoryManager!: InventoryManager;
  private player!: Player;
  private enemyManager!: EnemyManager;

  private tileSprites: Phaser.GameObjects.Sprite[][] = [];
  private tileData: (Tile | null)[][] = [];
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerToolIcon!: Phaser.GameObjects.Image;
  private enemySprites: Map<number, Phaser.GameObjects.Sprite> = new Map();

  private craftStationMarker!: Phaser.GameObjects.Graphics;
  private craftGlow = 0;
  private craftGlowDir = 1;

  private inventoryOpen = false;
  private craftOpen = false;
  private inventoryPanel!: Phaser.GameObjects.Container;
  private craftPanel!: Phaser.GameObjects.Container;
  private inventoryItems: Phaser.GameObjects.Container[] = [];
  private craftButtons: Phaser.GameObjects.Container[] = [];
  private selectedInventoryIndex = -1;

  private resourceTexts: Map<ItemType, Phaser.GameObjects.Text> = new Map();
  private hpBar!: Phaser.GameObjects.Graphics;
  private expBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private statusBg!: Phaser.GameObjects.Graphics;

  private floatingTexts: FloatingText[] = [];
  private particles: Particle[] = [];
  private exclamationMark: Phaser.GameObjects.Text | null = null;
  private exclamationTimer = 0;

  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private key1!: Phaser.Input.Keyboard.Key;
  private key2!: Phaser.Input.Keyboard.Key;
  private key3!: Phaser.Input.Keyboard.Key;
  private key4!: Phaser.Input.Keyboard.Key;

  private moveCooldown = 0;
  private lowFpsMode = false;
  private fpsCheckTimer = 0;
  private levelUpFlash!: Phaser.GameObjects.Graphics;
  private levelUpFlashAlpha = 0;

  private uiScale = 1;

  private craftAnimTimer = 0;
  private craftAnimating = false;

  private successMsg: Phaser.GameObjects.Text | null = null;
  private successMsgTimer = 0;

  private swordArc: Phaser.GameObjects.Graphics | null = null;
  private swordArcTimer = 0;

  private currentWeather: WeatherType = WeatherType.SUNNY;
  private nextWeatherTimer = 0;
  private weatherDuration = 0;
  private weatherTransition = 0;
  private weatherTransitionDir = 0;

  private raindrops: Raindrop[] = [];
  private rainSpawnTimer = 0;

  private fogOverlay!: Phaser.GameObjects.Graphics;
  private weatherIcon!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.generateTextures();
  }

  create(): void {
    this.worldManager = new WorldManager();
    this.worldManager.generateMap();
    this.inventoryManager = new InventoryManager();
    this.player = new Player(this.worldManager, this.inventoryManager);
    this.enemyManager = new EnemyManager(this.worldManager, this.inventoryManager);

    for (let i = 0; i < 3; i++) {
      this.enemyManager.spawnEnemy();
    }

    this.buildTileMap();
    this.buildPlayer();
    this.buildCraftStation();
    this.buildUI();
    this.buildInventoryPanel();
    this.buildCraftPanel();

    this.keyW = this.input.keyboard!.addKey('W');
    this.keyA = this.input.keyboard!.addKey('A');
    this.keyS = this.input.keyboard!.addKey('S');
    this.keyD = this.input.keyboard!.addKey('D');
    this.keyE = this.input.keyboard!.addKey('E');
    this.key1 = this.input.keyboard!.addKey('ONE');
    this.key2 = this.input.keyboard!.addKey('TWO');
    this.key3 = this.input.keyboard!.addKey('THREE');
    this.key4 = this.input.keyboard!.addKey('FOUR');

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });

    this.cameras.main.setBackgroundColor('#2c1810');

    this.inventoryManager.onInventoryChange(() => {
      this.updateResourceUI();
      this.updateInventoryPanel();
      this.updateCraftPanel();
    });

    this.enemyManager.onEnemyDeath((_enemy, _drops) => {
      this.player.addExp(15);
    });

    this.events.on('update', this.updateEnemySprites, this);
  }

  update(_time: number, delta: number): void {
    this.handleInput(delta);
    this.player.update(delta);
    this.enemyManager.update(delta);
    this.updatePlayerSprite();
    this.updateEnemySprites();
    this.updateCraftStationGlow(delta);
    this.updateFloatingTexts(delta);
    this.updateParticles(delta);
    this.updateExclamation(delta);
    this.updateSwordArc(delta);
    this.updateLevelUpFlash(delta);
    this.updateSuccessMsg(delta);
    this.updateCraftAnimation(delta);
    this.checkFps(delta);
    this.updateHpExpBars();
    this.updateWeather(delta);

    const px = this.player.getPixelX(TILE_SIZE);
    const py = this.player.getPixelY(TILE_SIZE);
    this.cameras.main.centerOn(px, py);
  }

  private generateTextures(): void {
    this.makeTexture('grass', 32, 32, (g) => {
      g.fillStyle(COLORS.grass1);
      g.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 20; i++) {
        g.fillStyle(Math.random() > 0.5 ? COLORS.grass2 : COLORS.grass3);
        g.fillRect(Math.floor(Math.random() * 30), Math.floor(Math.random() * 30), 2, 2);
      }
    });
    this.makeTexture('grass2', 32, 32, (g) => {
      g.fillStyle(COLORS.grass2);
      g.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 15; i++) {
        g.fillStyle(COLORS.grass1);
        g.fillRect(Math.floor(Math.random() * 30), Math.floor(Math.random() * 30), 2, 2);
      }
    });
    this.makeTexture('grass3', 32, 32, (g) => {
      g.fillStyle(COLORS.grass3);
      g.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 15; i++) {
        g.fillStyle(COLORS.grass2);
        g.fillRect(Math.floor(Math.random() * 30), Math.floor(Math.random() * 30), 2, 2);
      }
    });

    this.makeTexture('tree', 32, 32, (g) => {
      g.fillStyle(COLORS.grass1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(COLORS.tree_trunk);
      g.fillRect(13, 18, 6, 14);
      g.fillStyle(COLORS.tree_leaves);
      g.fillRect(4, 2, 24, 18);
      g.fillStyle(COLORS.tree_leaves2);
      g.fillRect(8, 4, 16, 12);
      g.fillStyle(COLORS.tree_leaves);
      g.fillRect(6, 6, 4, 4);
    });
    this.makeTexture('tree2', 32, 32, (g) => {
      g.fillStyle(COLORS.grass2);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(COLORS.tree_trunk);
      g.fillRect(14, 20, 5, 12);
      g.fillStyle(COLORS.tree_leaves2);
      g.fillRect(6, 4, 20, 18);
      g.fillStyle(COLORS.tree_leaves);
      g.fillRect(10, 6, 12, 10);
    });

    this.makeTexture('stone', 32, 32, (g) => {
      g.fillStyle(COLORS.grass1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(COLORS.stone1);
      g.fillRect(4, 8, 24, 20);
      g.fillStyle(COLORS.stone2);
      g.fillRect(6, 10, 20, 16);
      g.fillStyle(COLORS.stone_highlight);
      g.fillRect(8, 10, 8, 4);
    });
    this.makeTexture('stone2', 32, 32, (g) => {
      g.fillStyle(COLORS.grass3);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(COLORS.stone2);
      g.fillRect(6, 10, 22, 18);
      g.fillStyle(COLORS.stone1);
      g.fillRect(8, 12, 18, 14);
      g.fillStyle(COLORS.stone_highlight);
      g.fillRect(10, 12, 6, 3);
    });

    this.makeTexture('water', 32, 32, (g) => {
      g.fillStyle(COLORS.water1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(COLORS.water2);
      g.fillRect(0, 12, 32, 8);
      g.fillStyle(COLORS.water_highlight);
      g.fillRect(4, 6, 8, 2);
      g.fillRect(18, 16, 6, 2);
    });
    this.makeTexture('water2', 32, 32, (g) => {
      g.fillStyle(COLORS.water2);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(COLORS.water1);
      g.fillRect(0, 8, 32, 6);
      g.fillStyle(COLORS.water_highlight);
      g.fillRect(8, 4, 6, 2);
      g.fillRect(20, 14, 8, 2);
    });

    this.makeTexture('player', 24, 32, (g) => {
      g.fillStyle(COLORS.player_hair);
      g.fillRect(4, 0, 16, 8);
      g.fillStyle(COLORS.player_body);
      g.fillRect(6, 8, 12, 8);
      g.fillStyle(COLORS.player_shirt);
      g.fillRect(4, 16, 16, 8);
      g.fillStyle(COLORS.player_pants);
      g.fillRect(6, 24, 6, 8);
      g.fillRect(14, 24, 6, 8);
    });
    this.makeTexture('player_walk1', 24, 32, (g) => {
      g.fillStyle(COLORS.player_hair);
      g.fillRect(4, 0, 16, 8);
      g.fillStyle(COLORS.player_body);
      g.fillRect(6, 8, 12, 8);
      g.fillStyle(COLORS.player_shirt);
      g.fillRect(4, 16, 16, 8);
      g.fillStyle(COLORS.player_pants);
      g.fillRect(4, 24, 6, 8);
      g.fillRect(16, 22, 6, 8);
    });
    this.makeTexture('player_walk2', 24, 32, (g) => {
      g.fillStyle(COLORS.player_hair);
      g.fillRect(4, 0, 16, 8);
      g.fillStyle(COLORS.player_body);
      g.fillRect(6, 8, 12, 8);
      g.fillStyle(COLORS.player_shirt);
      g.fillRect(4, 16, 16, 8);
      g.fillStyle(COLORS.player_pants);
      g.fillRect(8, 24, 6, 8);
      g.fillRect(12, 22, 6, 8);
    });
    this.makeTexture('player_walk3', 24, 32, (g) => {
      g.fillStyle(COLORS.player_hair);
      g.fillRect(4, 0, 16, 8);
      g.fillStyle(COLORS.player_body);
      g.fillRect(6, 8, 12, 8);
      g.fillStyle(COLORS.player_shirt);
      g.fillRect(4, 16, 16, 8);
      g.fillStyle(COLORS.player_pants);
      g.fillRect(16, 24, 6, 8);
      g.fillRect(4, 22, 6, 8);
    });

    this.makeTexture('slime', 24, 24, (g) => {
      g.fillStyle(COLORS.slime_body);
      g.fillRect(2, 8, 20, 16);
      g.fillRect(4, 4, 16, 4);
      g.fillStyle(COLORS.slime_dark);
      g.fillRect(4, 16, 16, 8);
      g.fillStyle(COLORS.slime_eye);
      g.fillRect(6, 8, 4, 4);
      g.fillRect(14, 8, 4, 4);
      g.fillStyle(COLORS.slime_pupil);
      g.fillRect(8, 10, 2, 2);
      g.fillRect(16, 10, 2, 2);
    });
    this.makeTexture('slime_squish', 24, 24, (g) => {
      g.fillStyle(COLORS.slime_body);
      g.fillRect(0, 12, 24, 12);
      g.fillRect(2, 8, 20, 4);
      g.fillStyle(COLORS.slime_dark);
      g.fillRect(2, 18, 20, 6);
      g.fillStyle(COLORS.slime_eye);
      g.fillRect(6, 10, 4, 4);
      g.fillRect(14, 10, 4, 4);
      g.fillStyle(COLORS.slime_pupil);
      g.fillRect(8, 12, 2, 2);
      g.fillRect(16, 12, 2, 2);
    });

    this.makeTexture('item_wood', 16, 16, (g) => {
      g.fillStyle(COLORS.wood_item);
      g.fillRect(2, 4, 12, 8);
      g.fillStyle(0xA07818);
      g.fillRect(4, 6, 8, 4);
    });
    this.makeTexture('item_stone', 16, 16, (g) => {
      g.fillStyle(COLORS.stone1);
      g.fillRect(2, 4, 12, 10);
      g.fillStyle(COLORS.stone_highlight);
      g.fillRect(4, 4, 6, 3);
    });
    this.makeTexture('item_iron', 16, 16, (g) => {
      g.fillStyle(COLORS.iron_item);
      g.fillRect(2, 4, 12, 8);
      g.fillStyle(0xD0D0E0);
      g.fillRect(4, 5, 4, 3);
    });
    this.makeTexture('item_gold', 16, 16, (g) => {
      g.fillStyle(COLORS.gold_coin);
      g.fillRect(3, 3, 10, 10);
      g.fillStyle(0xFFA500);
      g.fillRect(5, 5, 6, 6);
    });
    this.makeTexture('item_hammer', 16, 16, (g) => {
      g.fillStyle(COLORS.hammer_handle);
      g.fillRect(6, 8, 4, 8);
      g.fillStyle(COLORS.hammer_head);
      g.fillRect(2, 2, 12, 6);
    });
    this.makeTexture('item_sword', 16, 16, (g) => {
      g.fillStyle(COLORS.sword_handle);
      g.fillRect(6, 10, 4, 6);
      g.fillStyle(COLORS.sword_blade);
      g.fillRect(6, 0, 4, 10);
    });
    this.makeTexture('item_fence', 16, 16, (g) => {
      g.fillStyle(COLORS.fence_item);
      g.fillRect(2, 2, 2, 12);
      g.fillRect(12, 2, 2, 12);
      g.fillRect(2, 5, 12, 2);
      g.fillRect(2, 10, 12, 2);
    });
    this.makeTexture('item_iron_sword', 16, 16, (g) => {
      g.fillStyle(COLORS.sword_handle);
      g.fillRect(6, 10, 4, 6);
      g.fillStyle(COLORS.iron_sword_item);
      g.fillRect(5, 0, 6, 10);
      g.fillStyle(0xAABBCC);
      g.fillRect(6, 1, 2, 4);
    });

    this.makeTexture('craft_station', 32, 32, (g) => {
      g.fillStyle(COLORS.craft_station);
      g.fillRect(2, 12, 28, 18);
      g.fillStyle(COLORS.craft_anvil);
      g.fillRect(8, 6, 16, 8);
      g.fillStyle(0x999999);
      g.fillRect(10, 8, 12, 4);
    });

    this.makeTexture('gold_drop', 12, 12, (g) => {
      g.fillStyle(COLORS.gold_coin);
      g.fillRect(1, 1, 10, 10);
      g.fillStyle(0xFFA500);
      g.fillRect(3, 3, 6, 6);
    });

    this.makeTexture('weather_sun', 20, 20, (g) => {
      g.fillStyle(COLORS.sun_yellow);
      g.fillRect(7, 7, 6, 6);
      g.fillStyle(COLORS.sun_orange);
      g.fillRect(9, 0, 2, 5);
      g.fillRect(9, 15, 2, 5);
      g.fillRect(0, 9, 5, 2);
      g.fillRect(15, 9, 5, 2);
      g.fillRect(2, 2, 2, 2);
      g.fillRect(16, 2, 2, 2);
      g.fillRect(2, 16, 2, 2);
      g.fillRect(16, 16, 2, 2);
    });

    this.makeTexture('weather_rain', 20, 20, (g) => {
      g.fillStyle(COLORS.rain_drop_light);
      g.fillRect(5, 2, 2, 4);
      g.fillRect(11, 4, 2, 4);
      g.fillRect(8, 10, 2, 4);
      g.fillStyle(COLORS.rain_drop);
      g.fillRect(4, 3, 2, 2);
      g.fillRect(10, 5, 2, 2);
      g.fillRect(7, 11, 2, 2);
      g.fillStyle(COLORS.rain_drop_light);
      g.fillRect(3, 8, 2, 4);
      g.fillRect(14, 12, 2, 4);
      g.fillStyle(COLORS.rain_drop);
      g.fillRect(2, 9, 2, 2);
      g.fillRect(13, 13, 2, 2);
    });

    this.makeTexture('weather_fog', 20, 20, (g) => {
      g.fillStyle(0xCCCCCC, 0.85);
      g.fillRect(2, 4, 16, 3);
      g.fillStyle(0xDDDDDD, 0.85);
      g.fillRect(4, 9, 14, 3);
      g.fillStyle(0xBBBBBB, 0.85);
      g.fillRect(3, 14, 15, 3);
    });
  }

  private makeTexture(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private buildTileMap(): void {
    for (let y = 0; y < MAP_ROWS; y++) {
      this.tileSprites[y] = [];
      this.tileData[y] = [];
      for (let x = 0; x < MAP_COLS; x++) {
        const tile = this.worldManager.getTile(x, y);
        this.tileData[y][x] = tile;
        const texKey = this.getTileTexture(tile);
        const sprite = this.add.sprite(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, texKey);
        sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
        sprite.setDepth(0);
        this.tileSprites[y][x] = sprite;
      }
    }
  }

  private getTileTexture(tile: Tile | null): string {
    if (!tile) return 'grass';
    switch (tile.type) {
      case TerrainType.GRASS:
        return ['grass', 'grass2', 'grass3'][tile.textureIndex % 3];
      case TerrainType.TREE:
        return tile.textureIndex === 0 ? 'tree' : 'tree2';
      case TerrainType.STONE:
        return tile.textureIndex === 0 ? 'stone' : 'stone2';
      case TerrainType.WATER:
        return tile.textureIndex === 0 ? 'water' : 'water2';
      default:
        return 'grass';
    }
  }

  private buildPlayer(): void {
    const px = this.player.getPixelX(TILE_SIZE);
    const py = this.player.getPixelY(TILE_SIZE);
    this.playerSprite = this.add.sprite(px, py, 'player');
    this.playerSprite.setDisplaySize(TILE_SIZE * 0.75, TILE_SIZE);
    this.playerSprite.setDepth(10);
    this.playerSprite.setOrigin(0.5, 0.6);

    this.playerToolIcon = this.add.image(px + 14, py - 8, 'item_hammer');
    this.playerToolIcon.setDisplaySize(12, 12);
    this.playerToolIcon.setDepth(11);
  }

  private buildCraftStation(): void {
    const pos = this.worldManager.getCraftingStationTile();
    const cx = pos.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = pos.y * TILE_SIZE + TILE_SIZE / 2;
    const station = this.add.image(cx, cy, 'craft_station');
    station.setDisplaySize(TILE_SIZE, TILE_SIZE);
    station.setDepth(1);

    this.craftStationMarker = this.add.graphics();
    this.craftStationMarker.setDepth(2);
    this.drawCraftGlow(cx, cy);
  }

  private drawCraftGlow(cx: number, cy: number): void {
    this.craftStationMarker.clear();
    const alpha = 0.2 + this.craftGlow * 0.3;
    this.craftStationMarker.fillStyle(0xFFD700, alpha);
    this.craftStationMarker.fillCircle(cx, cy, TILE_SIZE * 0.7);
  }

  private buildUI(): void {
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;

    this.statusBg = this.add.graphics();
    this.statusBg.setDepth(50);
    this.statusBg.setScrollFactor(0);

    this.hpBar = this.add.graphics();
    this.hpBar.setDepth(51);
    this.hpBar.setScrollFactor(0);

    this.expBar = this.add.graphics();
    this.expBar.setDepth(51);
    this.expBar.setScrollFactor(0);

    this.levelText = this.add.text(0, 0, 'Lv.1', {
      fontSize: '11px',
      color: '#E8D5B0',
      fontFamily: 'monospace',
    });
    this.levelText.setDepth(52);
    this.levelText.setScrollFactor(0);

    const resourceTypes = [ItemType.WOOD, ItemType.STONE, ItemType.IRON, ItemType.GOLD];
    const texMap: Record<string, string> = {
      [ItemType.WOOD]: 'item_wood',
      [ItemType.STONE]: 'item_stone',
      [ItemType.IRON]: 'item_iron',
      [ItemType.GOLD]: 'item_gold',
    };
    for (let i = 0; i < resourceTypes.length; i++) {
      const t = resourceTypes[i];
      const icon = this.add.image(0, 0, texMap[t]);
      icon.setDisplaySize(16, 16);
      icon.setDepth(52);
      icon.setScrollFactor(0);
      const txt = this.add.text(0, 0, '0', {
        fontSize: '13px',
        color: '#E8D5B0',
        fontFamily: 'monospace',
      });
      txt.setDepth(52);
      txt.setScrollFactor(0);
      this.resourceTexts.set(t, txt);
    }

    this.levelUpFlash = this.add.graphics();
    this.levelUpFlash.setDepth(100);
    this.levelUpFlash.setScrollFactor(0);
    this.levelUpFlash.setVisible(false);

    this.fogOverlay = this.add.graphics();
    this.fogOverlay.setDepth(40);
    this.fogOverlay.setScrollFactor(0);
    this.fogOverlay.setAlpha(0);

    this.weatherIcon = this.add.image(0, 0, 'weather_sun');
    this.weatherIcon.setDisplaySize(20, 20);
    this.weatherIcon.setDepth(52);
    this.weatherIcon.setScrollFactor(0);

    this.nextWeatherTimer = 30000 + Math.random() * 30000;

    this.updateResourceUI();
  }

  private updateResourceUI(): void {
    const cam = this.cameras.main;
    const s = this.uiScale;

    this.statusBg.clear();
    this.statusBg.fillStyle(0x1A0E08, 0.6);
    this.statusBg.fillRect(0, cam.height - 50 * s, cam.width, 50 * s);

    const barW = 140 * s;
    const barH = 10 * s;
    const barX = 12 * s;
    const hpY = cam.height - 42 * s;
    const expY = cam.height - 26 * s;

    this.hpBar.clear();
    this.hpBar.fillStyle(COLORS.hp_bg);
    this.hpBar.fillRect(barX, hpY, barW, barH);
    const hpRatio = this.player.hp / this.player.maxHp;
    this.hpBar.fillStyle(COLORS.hp_bar);
    this.hpBar.fillRect(barX, hpY, barW * hpRatio, barH);

    this.expBar.clear();
    this.expBar.fillStyle(COLORS.exp_bg);
    this.expBar.fillRect(barX, expY, barW, barH);
    const expRatio = this.player.exp / this.player.expToLevel;
    this.expBar.fillStyle(COLORS.exp_bar);
    this.expBar.fillRect(barX, expY, barW * expRatio, barH);

    this.levelText.setPosition(barX + barW + 6 * s, expY - 2 * s);
    this.levelText.setText('Lv.' + this.player.level);
    this.levelText.setFontSize((11 * s) + 'px');

    const resourceTypes = [ItemType.WOOD, ItemType.STONE, ItemType.IRON, ItemType.GOLD];
    const texMap: Record<string, string> = {
      [ItemType.WOOD]: 'item_wood',
      [ItemType.STONE]: 'item_stone',
      [ItemType.IRON]: 'item_iron',
      [ItemType.GOLD]: 'item_gold',
    };
    for (let i = 0; i < resourceTypes.length; i++) {
      const t = resourceTypes[i];
      const rx = cam.width - (4 - i) * 70 * s - 10 * s;
      const ry = 14 * s;
      const txt = this.resourceTexts.get(t);
      if (txt) {
        txt.setPosition(rx + 20 * s, ry);
        txt.setText(String(this.inventoryManager.getCount(t)));
        txt.setFontSize((13 * s) + 'px');
      }
    }

    this.weatherIcon.setPosition(cam.width - 300 * s, 22 * s);
    this.weatherIcon.setDisplaySize(20 * s, 20 * s);
  }

  private updateHpExpBars(): void {
    this.updateResourceUI();
  }

  private buildInventoryPanel(): void {
    const cam = this.cameras.main;
    const panelW = 260;
    const panelH = 350;

    this.inventoryPanel = this.add.container(-panelW - 20, 60);
    this.inventoryPanel.setDepth(80);
    this.inventoryPanel.setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panel_bg, 0.92);
    bg.fillRoundedRect(0, 0, panelW, panelH, 8);
    bg.lineStyle(2, COLORS.panel_border);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 8);
    this.inventoryPanel.add(bg);

    const title = this.add.text(panelW / 2, 20, '背包', {
      fontSize: '16px',
      color: '#E8D5B0',
      fontFamily: 'monospace',
    });
    title.setOrigin(0.5);
    this.inventoryPanel.add(title);

    const allItems = [ItemType.WOOD, ItemType.STONE, ItemType.IRON, ItemType.GOLD, ItemType.HAMMER, ItemType.SWORD, ItemType.WOODEN_FENCE, ItemType.IRON_SWORD];
    const texMap: Record<string, string> = {
      [ItemType.WOOD]: 'item_wood',
      [ItemType.STONE]: 'item_stone',
      [ItemType.IRON]: 'item_iron',
      [ItemType.GOLD]: 'item_gold',
      [ItemType.HAMMER]: 'item_hammer',
      [ItemType.SWORD]: 'item_sword',
      [ItemType.WOODEN_FENCE]: 'item_fence',
      [ItemType.IRON_SWORD]: 'item_iron_sword',
    };

    for (let i = 0; i < allItems.length; i++) {
      const t = allItems[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ix = 20 + col * 125;
      const iy = 50 + row * 70;

      const itemContainer = this.add.container(ix, iy);

      const card = this.add.graphics();
      card.fillStyle(0x3A2418, 0.8);
      card.fillRoundedRect(0, 0, 110, 60, 6);
      card.lineStyle(1, COLORS.panel_border, 0.5);
      card.strokeRoundedRect(0, 0, 110, 60, 6);
      itemContainer.add(card);

      const icon = this.add.image(20, 20, texMap[t]);
      icon.setDisplaySize(24, 24);
      itemContainer.add(icon);

      const name = this.add.text(38, 10, ITEM_NAMES[t], {
        fontSize: '11px',
        color: '#E8D5B0',
        fontFamily: 'monospace',
      });
      itemContainer.add(name);

      const count = this.add.text(38, 28, 'x' + this.inventoryManager.getCount(t), {
        fontSize: '11px',
        color: '#FFD700',
        fontFamily: 'monospace',
      });
      itemContainer.add(count);

      const toolIdx = TOOL_SLOTS.indexOf(t);
      if (toolIdx >= 0) {
        const slotLabel = this.add.text(90, 44, '[' + (toolIdx + 1) + ']', {
          fontSize: '9px',
          color: '#8B6914',
          fontFamily: 'monospace',
        });
        itemContainer.add(slotLabel);
      }

      itemContainer.setSize(110, 60);
      itemContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, 110, 60), Phaser.Geom.Rectangle.Contains);
      itemContainer.on('pointerdown', () => {
        if (TOOL_SLOTS.includes(t)) {
          this.player.setTool(t);
          this.updatePlayerToolIcon();
          this.selectedInventoryIndex = i;
          this.updateInventoryPanel();
        }
      });

      this.inventoryItems.push(itemContainer);
      this.inventoryPanel.add(itemContainer);
    }

    this.inventoryPanel.setVisible(false);
  }

  private updateInventoryPanel(): void {
    const allItems = [ItemType.WOOD, ItemType.STONE, ItemType.IRON, ItemType.GOLD, ItemType.HAMMER, ItemType.SWORD, ItemType.WOODEN_FENCE, ItemType.IRON_SWORD];

    for (let i = 0; i < allItems.length; i++) {
      const container = this.inventoryItems[i];
      if (!container) continue;
      const t = allItems[i];
      const countObj = container.getAt(3) as Phaser.GameObjects.Text;
      if (countObj) {
        countObj.setText('x' + this.inventoryManager.getCount(t));
      }

      const card = container.getAt(0) as Phaser.GameObjects.Graphics;
      card.clear();
      const isSelected = (t === this.player.currentTool);
      if (isSelected) {
        card.fillStyle(0x5A3418, 0.95);
        card.fillRoundedRect(-2, -2, 114, 64, 6);
        card.lineStyle(2, COLORS.text_gold, 0.8);
        card.strokeRoundedRect(-2, -2, 114, 64, 6);
      } else {
        card.fillStyle(0x3A2418, 0.8);
        card.fillRoundedRect(0, 0, 110, 60, 6);
        card.lineStyle(1, COLORS.panel_border, 0.5);
        card.strokeRoundedRect(0, 0, 110, 60, 6);
      }

      const icon = container.getAt(1) as Phaser.GameObjects.Image;
      if (isSelected) {
        icon.setScale(1.15);
      } else {
        icon.setScale(1.0);
      }
    }
  }

  private buildCraftPanel(): void {
    const cam = this.cameras.main;
    const panelW = 300;
    const panelH = 220;

    this.craftPanel = this.add.container(cam.width / 2 - panelW / 2, cam.height / 2 - panelH / 2);
    this.craftPanel.setDepth(80);
    this.craftPanel.setScrollFactor(0);
    this.craftPanel.setScale(0.8);
    this.craftPanel.setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panel_bg, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 8);
    bg.lineStyle(2, COLORS.panel_border);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 8);
    this.craftPanel.add(bg);

    const title = this.add.text(panelW / 2, 20, '合成台', {
      fontSize: '16px',
      color: '#E8D5B0',
      fontFamily: 'monospace',
    });
    title.setOrigin(0.5);
    this.craftPanel.add(title);

    for (let i = 0; i < RECIPES.length; i++) {
      const recipe = RECIPES[i];
      const by = 50 + i * 80;
      const btn = this.add.container(20, by);

      const card = this.add.graphics();
      card.fillStyle(0x3A2418, 0.8);
      card.fillRoundedRect(0, 0, 260, 65, 6);
      card.lineStyle(1, COLORS.panel_border, 0.5);
      card.strokeRoundedRect(0, 0, 260, 65, 6);
      btn.add(card);

      const nameTxt = this.add.text(10, 8, recipe.name, {
        fontSize: '13px',
        color: '#E8D5B0',
        fontFamily: 'monospace',
      });
      btn.add(nameTxt);

      const inputStr = recipe.inputs.map(inp => ITEM_NAMES[inp.type] + 'x' + inp.amount).join(' + ');
      const inputTxt = this.add.text(10, 28, inputStr, {
        fontSize: '10px',
        color: '#AAA',
        fontFamily: 'monospace',
      });
      btn.add(inputTxt);

      const outputTxt = this.add.text(10, 44, '→ ' + ITEM_NAMES[recipe.output.type] + ' x' + recipe.output.amount, {
        fontSize: '10px',
        color: '#FFD700',
        fontFamily: 'monospace',
      });
      btn.add(outputTxt);

      const canCraft = this.inventoryManager.canCraft(recipe);
      const craftBtn = this.add.graphics();
      craftBtn.fillStyle(canCraft ? 0x4CAF50 : 0x555555, 0.8);
      craftBtn.fillRoundedRect(210, 15, 40, 35, 4);
      btn.add(craftBtn);

      const craftLabel = this.add.text(230, 28, '合成', {
        fontSize: '10px',
        color: canCraft ? '#FFF' : '#888',
        fontFamily: 'monospace',
      });
      craftLabel.setOrigin(0.5);
      btn.add(craftLabel);

      btn.setSize(260, 65);
      btn.setInteractive(new Phaser.Geom.Rectangle(210, 15, 40, 35), Phaser.Geom.Rectangle.Contains);
      btn.on('pointerdown', () => {
        this.tryCraft(recipe);
      });

      this.craftButtons.push(btn);
      this.craftPanel.add(btn);
    }

    this.craftPanel.setVisible(false);
  }

  private updateCraftPanel(): void {
    for (let i = 0; i < RECIPES.length; i++) {
      const recipe = RECIPES[i];
      const btn = this.craftButtons[i];
      if (!btn) continue;
      const canCraft = this.inventoryManager.canCraft(recipe);
      const craftBtn = btn.getAt(4) as Phaser.GameObjects.Graphics;
      craftBtn.clear();
      craftBtn.fillStyle(canCraft ? 0x4CAF50 : 0x555555, 0.8);
      craftBtn.fillRoundedRect(210, 15, 40, 35, 4);
      const craftLabel = btn.getAt(5) as Phaser.GameObjects.Text;
      craftLabel.setColor(canCraft ? '#FFF' : '#888');
    }
  }

  private tryCraft(recipe: Recipe): void {
    if (!this.inventoryManager.canCraft(recipe)) return;
    this.craftAnimating = true;
    this.craftAnimTimer = 1000;
    this.tweens.add({
      targets: this.craftPanel,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 500,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
    this.time.delayedCall(1000, () => {
      const success = this.inventoryManager.craft(recipe);
      if (success) {
        this.showSuccessMsg('合成成功！');
      }
      this.craftAnimating = false;
    });
  }

  private showSuccessMsg(msg: string): void {
    const cam = this.cameras.main;
    if (this.successMsg) {
      this.successMsg.destroy();
    }
    this.successMsg = this.add.text(cam.width / 2, cam.height - 120, msg, {
      fontSize: '18px',
      color: '#FFD700',
      fontFamily: 'monospace',
      backgroundColor: '#2C1810CC',
      padding: { x: 12, y: 6 },
    });
    this.successMsg.setOrigin(0.5);
    this.successMsg.setDepth(90);
    this.successMsg.setScrollFactor(0);
    this.successMsgTimer = 2000;

    this.tweens.add({
      targets: this.successMsg,
      y: cam.height - 140,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private updateCraftAnimation(delta: number): void {
    if (!this.craftAnimating) return;
    this.craftAnimTimer -= delta;
    if (this.craftAnimTimer <= 0) {
      this.craftAnimating = false;
    }
  }

  private updateSuccessMsg(delta: number): void {
    if (!this.successMsg) return;
    this.successMsgTimer -= delta;
    if (this.successMsgTimer <= 500) {
      this.successMsg.setAlpha(this.successMsgTimer / 500);
    }
    if (this.successMsgTimer <= 0) {
      this.successMsg.destroy();
      this.successMsg = null;
    }
  }

  private toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) {
      this.craftOpen = false;
      this.craftPanel.setVisible(false);
      this.inventoryPanel.setVisible(true);
      this.updateInventoryPanel();
      this.tweens.add({
        targets: this.inventoryPanel,
        x: 10,
        duration: 300,
        ease: 'Back.easeOut',
      });
    } else {
      this.tweens.add({
        targets: this.inventoryPanel,
        x: -280,
        duration: 200,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.inventoryPanel.setVisible(false);
        },
      });
    }
  }

  private toggleCraft(): void {
    if (this.inventoryOpen) {
      this.toggleInventory();
      return;
    }
    this.craftOpen = !this.craftOpen;
    if (this.craftOpen) {
      this.updateCraftPanel();
      this.craftPanel.setVisible(true);
      this.craftPanel.setScale(0.8);
      this.craftPanel.setAlpha(0);
      this.tweens.add({
        targets: this.craftPanel,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 300,
        ease: 'Back.easeOut',
      });
    } else {
      this.tweens.add({
        targets: this.craftPanel,
        scaleX: 0.8,
        scaleY: 0.8,
        alpha: 0,
        duration: 200,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.craftPanel.setVisible(false);
        },
      });
    }
  }

  private handleInput(delta: number): void {
    if (this.moveCooldown > 0) {
      this.moveCooldown -= delta;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (this.craftOpen) {
        this.toggleCraft();
      } else {
        this.toggleInventory();
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.key1) && TOOL_SLOTS[0]) {
      this.player.setTool(TOOL_SLOTS[0]);
      this.updatePlayerToolIcon();
      this.updateInventoryPanel();
    }
    if (Phaser.Input.Keyboard.JustDown(this.key2) && TOOL_SLOTS[1]) {
      this.player.setTool(TOOL_SLOTS[1]);
      this.updatePlayerToolIcon();
      this.updateInventoryPanel();
    }
    if (Phaser.Input.Keyboard.JustDown(this.key3) && TOOL_SLOTS[2]) {
      this.player.setTool(TOOL_SLOTS[2]);
      this.updatePlayerToolIcon();
      this.updateInventoryPanel();
    }
    if (Phaser.Input.Keyboard.JustDown(this.key4) && TOOL_SLOTS[3]) {
      this.player.setTool(TOOL_SLOTS[3]);
      this.updatePlayerToolIcon();
      this.updateInventoryPanel();
    }

    if (!this.inventoryOpen && !this.craftOpen && this.moveCooldown <= 0) {
      let dx = 0;
      let dy = 0;
      if (this.keyW.isDown) dy -= 1;
      if (this.keyS.isDown) dy += 1;
      if (this.keyA.isDown) dx -= 1;
      if (this.keyD.isDown) dx += 1;
      if (dx !== 0 || dy !== 0) {
        this.player.tryMove(dx, dy);
        this.moveCooldown = 180;
      }
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.inventoryOpen || this.craftOpen) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    const enemy = this.enemyManager.getEnemyAt(tileX, tileY);
    if (enemy) {
      const dist = Math.abs(enemy.tileX - this.player.tileX) + Math.abs(enemy.tileY - this.player.tileY);
      if (dist <= 2) {
        const didAttack = this.player.attack();
        if (didAttack) {
          this.showSwordArc();
          const damage = this.player.getAttackDamage();
          const killed = this.enemyManager.damageEnemy(enemy, damage);
          if (killed) {
            this.player.addExp(15);
          }
        }
      }
      return;
    }

    if (this.player.currentTool === ItemType.HAMMER) {
      const resource = this.player.harvest(tileX, tileY);
      if (resource !== null) {
        this.showExclamation(tileX, tileY);
        this.spawnHarvestParticles(tileX, tileY);
        this.showFloatingText(tileX, tileY, '+1 ' + ITEM_NAMES[resource]);
        this.refreshTile(tileX, tileY);
      }
    }
  }

  private refreshTile(x: number, y: number): void {
    const tile = this.worldManager.getTile(x, y);
    if (tile && this.tileSprites[y] && this.tileSprites[y][x]) {
      this.tileSprites[y][x].setTexture(this.getTileTexture(tile));
    }
  }

  private updatePlayerSprite(): void {
    const px = this.player.getPixelX(TILE_SIZE);
    const py = this.player.getPixelY(TILE_SIZE);
    this.playerSprite.setPosition(px, py);

    if (!this.lowFpsMode && this.player.isMoving) {
      const frames = ['player', 'player_walk1', 'player_walk2', 'player_walk3'];
      const texKey = frames[this.player.animFrame % 4];
      this.playerSprite.setTexture(texKey);
    } else {
      this.playerSprite.setTexture('player');
    }

    this.playerToolIcon.setPosition(px + 14, py - 8);
  }

  private updatePlayerToolIcon(): void {
    const texMap: Record<string, string> = {
      [ItemType.HAMMER]: 'item_hammer',
      [ItemType.SWORD]: 'item_sword',
      [ItemType.WOODEN_FENCE]: 'item_fence',
      [ItemType.IRON_SWORD]: 'item_iron_sword',
    };
    const tex = texMap[this.player.currentTool] || 'item_hammer';
    this.playerToolIcon.setTexture(tex);
  }

  private updateEnemySprites(): void {
    const enemies = this.enemyManager.getEnemies();
    const activeIds = new Set<number>();

    for (const enemy of enemies) {
      activeIds.add(enemy.id);
      let sprite = this.enemySprites.get(enemy.id);
      if (!sprite || !sprite.active) {
        sprite = this.add.sprite(
          enemy.tileX * TILE_SIZE + TILE_SIZE / 2,
          enemy.tileY * TILE_SIZE + TILE_SIZE / 2,
          'slime'
        );
        sprite.setDisplaySize(TILE_SIZE * 0.7, TILE_SIZE * 0.7);
        sprite.setDepth(8);
        this.enemySprites.set(enemy.id, sprite);
      }

      sprite.setPosition(
        enemy.tileX * TILE_SIZE + TILE_SIZE / 2,
        enemy.tileY * TILE_SIZE + TILE_SIZE / 2
      );

      if (!this.lowFpsMode) {
        const bouncePhase = Math.sin(enemy.bounceTimer * 0.00628);
        if (bouncePhase > 0.3) {
          sprite.setTexture('slime_squish');
          sprite.setScale(1.1, 0.85);
        } else {
          sprite.setTexture('slime');
          sprite.setScale(0.85, 1.1 + bouncePhase * 0.15);
        }
      }

      if (enemy.hitFlash) {
        sprite.setTint(COLORS.red);
      } else {
        sprite.clearTint();
      }

      if (enemy.isDying) {
        const progress = 1 - (enemy.dyingTimer / 300);
        sprite.setScale(1 - progress);
        sprite.setAlpha(1 - progress);
      } else {
        sprite.setAlpha(1);
      }
    }

    for (const [id, sprite] of this.enemySprites) {
      if (!activeIds.has(id)) {
        sprite.destroy();
        this.enemySprites.delete(id);
      }
    }
  }

  private updateCraftStationGlow(delta: number): void {
    this.craftGlow += this.craftGlowDir * delta * 0.001;
    if (this.craftGlow > 1) {
      this.craftGlow = 1;
      this.craftGlowDir = -1;
    } else if (this.craftGlow < 0) {
      this.craftGlow = 0;
      this.craftGlowDir = 1;
    }
    const pos = this.worldManager.getCraftingStationTile();
    const cx = pos.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = pos.y * TILE_SIZE + TILE_SIZE / 2;
    this.drawCraftGlow(cx, cy);
  }

  private showExclamation(tileX: number, tileY: number): void {
    if (this.exclamationMark) {
      this.exclamationMark.destroy();
    }
    this.exclamationMark = this.add.text(
      tileX * TILE_SIZE + TILE_SIZE / 2,
      tileY * TILE_SIZE - 4,
      '!',
      {
        fontSize: '18px',
        color: '#FFD700',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }
    );
    this.exclamationMark.setOrigin(0.5);
    this.exclamationMark.setDepth(20);
    this.exclamationTimer = 500;
  }

  private updateExclamation(delta: number): void {
    if (!this.exclamationMark) return;
    this.exclamationTimer -= delta;
    if (this.exclamationTimer <= 0) {
      this.exclamationMark.destroy();
      this.exclamationMark = null;
    }
  }

  private spawnHarvestParticles(tileX: number, tileY: number): void {
    if (this.lowFpsMode) return;
    const cx = tileX * TILE_SIZE + TILE_SIZE / 2;
    const cy = tileY * TILE_SIZE + TILE_SIZE / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 30 + Math.random() * 40;
      const gfx = this.add.graphics();
      const size = 2 + Math.random() * 3;
      const colors = [0x8B6914, 0x4A7C2E, 0x8C8C8C, 0xE8D5B0];
      gfx.fillStyle(colors[Math.floor(Math.random() * colors.length)]);
      gfx.fillRect(0, 0, size, size);
      gfx.setPosition(cx, cy);
      gfx.setDepth(15);
      this.particles.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        timer: 300 + Math.random() * 100,
      });
    }
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.timer -= delta;
      p.gfx.x += p.vx * (delta / 1000);
      p.gfx.y += p.vy * (delta / 1000);
      p.vy += 80 * (delta / 1000);
      const alpha = Math.max(0, p.timer / 300);
      p.gfx.setAlpha(alpha);
      if (p.timer <= 0) {
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  private showFloatingText(tileX: number, tileY: number, text: string): void {
    const t = this.add.text(
      tileX * TILE_SIZE + TILE_SIZE / 2,
      tileY * TILE_SIZE,
      text,
      {
        fontSize: '14px',
        color: '#FFD700',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }
    );
    t.setOrigin(0.5);
    t.setDepth(25);
    this.floatingTexts.push({ text: t, timer: 1000, startY: t.y });
  }

  private updateFloatingTexts(delta: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.timer -= delta;
      ft.text.y -= delta * 0.03;
      const alpha = Math.max(0, ft.timer / 1000);
      ft.text.setAlpha(alpha);
      if (ft.timer <= 0) {
        ft.text.destroy();
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private showSwordArc(): void {
    this.swordArc = this.add.graphics();
    this.swordArc.setDepth(15);
    const px = this.player.getPixelX(TILE_SIZE);
    const py = this.player.getPixelY(TILE_SIZE);
    this.swordArc.lineStyle(3, 0xC0C0C0, 0.8);
    this.swordArc.beginPath();
    this.swordArc.arc(px, py, 20, -Math.PI * 0.75, Math.PI * 0.25, false);
    this.swordArc.strokePath();
    this.swordArcTimer = 200;
  }

  private updateSwordArc(delta: number): void {
    if (!this.swordArc) return;
    this.swordArcTimer -= delta;
    const alpha = Math.max(0, this.swordArcTimer / 200);
    this.swordArc.setAlpha(alpha);
    if (this.swordArcTimer <= 0) {
      this.swordArc.destroy();
      this.swordArc = null;
    }
  }

  private updateLevelUpFlash(delta: number): void {
    if (this.levelUpFlashAlpha > 0) {
      this.levelUpFlashAlpha -= delta / 200;
      this.levelUpFlash.clear();
      this.levelUpFlash.fillStyle(0xFFFFFF, Math.max(0, this.levelUpFlashAlpha));
      this.levelUpFlash.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
      this.levelUpFlash.setVisible(true);
      if (this.levelUpFlashAlpha <= 0) {
        this.levelUpFlash.setVisible(false);
      }
    }
  }

  private checkFps(delta: number): void {
    this.fpsCheckTimer += delta;
    if (this.fpsCheckTimer > 2000) {
      this.fpsCheckTimer = 0;
      const fps = this.game.loop.actualFps;
      if (fps < 25 && !this.lowFpsMode) {
        this.lowFpsMode = true;
      } else if (fps >= 30 && this.lowFpsMode) {
        this.lowFpsMode = false;
      }
    }
  }

  private updateWeather(delta: number): void {
    if (this.weatherDuration > 0) {
      this.weatherDuration -= delta;
      if (this.weatherDuration <= 0) {
        this.weatherTransition = this.weatherTransition;
        this.weatherTransitionDir = -1;
      }
    } else if (this.weatherTransitionDir === 0) {
      this.nextWeatherTimer -= delta;
      if (this.nextWeatherTimer <= 0) {
        this.triggerRandomWeather();
      }
    }

    if (this.weatherTransitionDir !== 0) {
      this.weatherTransition += this.weatherTransitionDir * delta / 1000;
      if (this.weatherTransition >= 1) {
        this.weatherTransition = 1;
        this.weatherTransitionDir = 0;
      } else if (this.weatherTransition <= 0) {
        this.weatherTransition = 0;
        this.weatherTransitionDir = 0;
        if (this.currentWeather !== WeatherType.SUNNY) {
          this.clearWeatherEffects();
          this.currentWeather = WeatherType.SUNNY;
          this.updateWeatherIcon();
          this.nextWeatherTimer = 30000 + Math.random() * 30000;
        }
      }
    }

    if (this.currentWeather === WeatherType.RAIN) {
      this.updateRain(delta);
    }
    if (this.currentWeather === WeatherType.FOG) {
      this.updateFog();
    }
  }

  private triggerRandomWeather(): void {
    const choices = [WeatherType.RAIN, WeatherType.FOG, WeatherType.SUNNY];
    const weights = [0.4, 0.4, 0.2];
    let r = Math.random();
    let chosen = WeatherType.SUNNY;
    for (let i = 0; i < choices.length; i++) {
      if (r < weights[i]) {
        chosen = choices[i];
        break;
      }
      r -= weights[i];
    }
    if (chosen === WeatherType.SUNNY) {
      this.nextWeatherTimer = 20000 + Math.random() * 20000;
      return;
    }
    this.currentWeather = chosen;
    this.weatherDuration = 10000;
    this.weatherTransition = 0;
    this.weatherTransitionDir = 1;
    this.updateWeatherIcon();
  }

  private updateWeatherIcon(): void {
    switch (this.currentWeather) {
      case WeatherType.SUNNY:
        this.weatherIcon.setTexture('weather_sun');
        break;
      case WeatherType.RAIN:
        this.weatherIcon.setTexture('weather_rain');
        break;
      case WeatherType.FOG:
        this.weatherIcon.setTexture('weather_fog');
        break;
    }
  }

  private clearWeatherEffects(): void {
    for (const drop of this.raindrops) {
      drop.gfx.destroy();
    }
    this.raindrops = [];
    this.fogOverlay.clear();
    this.fogOverlay.setAlpha(0);
  }

  private updateRain(delta: number): void {
    const intensity = this.weatherTransition;
    const cam = this.cameras.main;
    const screenW = cam.width;
    const screenH = cam.height;

    if (!this.lowFpsMode) {
      this.rainSpawnTimer -= delta;
      const spawnRate = 12;
      while (this.rainSpawnTimer <= 0 && this.raindrops.length < 80 * intensity) {
        this.rainSpawnTimer += spawnRate;
        this.spawnRaindrop(screenW, screenH);
      }
    }

    for (let i = this.raindrops.length - 1; i >= 0; i--) {
      const drop = this.raindrops[i];
      drop.gfx.x += drop.vx * (delta / 1000);
      drop.gfx.y += drop.vy * (delta / 1000);
      if (drop.gfx.y > screenH + 20 || drop.gfx.x < -20 || drop.gfx.x > screenW + 20) {
        drop.gfx.destroy();
        this.raindrops.splice(i, 1);
      }
    }
  }

  private spawnRaindrop(screenW: number, screenH: number): void {
    const gfx = this.add.graphics();
    const len = 4 + Math.random() * 4;
    const useLight = Math.random() > 0.5;
    gfx.fillStyle(useLight ? COLORS.rain_drop_light : COLORS.rain_drop, 0.6 + Math.random() * 0.3);
    gfx.fillRect(0, 0, 1.5, len);
    gfx.setPosition(Math.random() * (screenW + 100) - 50, -10 - Math.random() * screenH * 0.5);
    gfx.setScrollFactor(0);
    gfx.setDepth(45);
    this.raindrops.push({
      gfx,
      vy: 250 + Math.random() * 150,
      vx: -40 + Math.random() * 20,
    });
  }

  private updateFog(): void {
    const intensity = this.weatherTransition;
    const cam = this.cameras.main;
    this.fogOverlay.clear();
    this.fogOverlay.fillGradientStyle(
      0xFFFFFF, 0xFFFFFF,
      0xDDEEFF, 0xDDEEFF,
      0.35 * intensity, 0.25 * intensity,
      0.45 * intensity, 0.55 * intensity
    );
    this.fogOverlay.fillRect(0, 0, cam.width, cam.height);
    this.fogOverlay.setAlpha(1);
  }

  resize(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.uiScale = w < 768 ? 1.5 : 1;
  }
}
