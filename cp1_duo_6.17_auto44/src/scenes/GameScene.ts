import Phaser from 'phaser';
import axios from 'axios';

const API_BASE = '/api';

export enum OreType {
  Iron = 'iron',
  Copper = 'copper',
  Silver = 'silver',
  Gold = 'gold',
  Crystal = 'crystal',
}

interface OreConfig {
  type: OreType;
  color: number;
  glowColor: string;
  probability: number;
  smeltTime: number;
  value: number;
  label: string;
}

const ORE_CONFIGS: OreConfig[] = [
  { type: OreType.Iron, color: 0x888899, glowColor: '#888899', probability: 0.35, smeltTime: 3, value: 10, label: '铁矿' },
  { type: OreType.Copper, color: 0xcc7744, glowColor: '#cc7744', probability: 0.28, smeltTime: 4, value: 20, label: '铜矿' },
  { type: OreType.Silver, color: 0xccccdd, glowColor: '#ccccdd', probability: 0.20, smeltTime: 6, value: 40, label: '银矿' },
  { type: OreType.Gold, color: 0xffcc00, glowColor: '#ffcc00', probability: 0.12, smeltTime: 10, value: 80, label: '金矿' },
  { type: OreType.Crystal, color: 0x66ddff, glowColor: '#66ddff', probability: 0.05, smeltTime: 8, value: 120, label: '水晶' },
];

interface HexCell {
  q: number;
  r: number;
  ore: OreType;
  mined: boolean;
  x: number;
  y: number;
  graphics?: Phaser.GameObjects.Graphics;
  oreSprite?: Phaser.GameObjects.Graphics;
  glowSprite?: Phaser.GameObjects.Graphics;
  progressGraphics?: Phaser.GameObjects.Graphics;
}

interface Asteroid {
  id: string;
  x: number;
  y: number;
  radius: number;
  cells: HexCell[];
  container: Phaser.GameObjects.Container;
  polygon?: Phaser.GameObjects.Graphics;
  ringGraphics?: Phaser.GameObjects.Graphics;
}

interface ConveyorPath {
  cells: HexCell[];
  progress: number;
  active: boolean;
}

interface SmelterSlot {
  ore: OreType | null;
  progress: number;
  smelting: boolean;
  progressBar?: Phaser.GameObjects.Graphics;
  fireEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
}

interface MarketPrice {
  ore: OreType;
  price: number;
  change: number;
  history: number[];
}

interface UpgradeNode {
  id: string;
  name: string;
  cost: number;
  effect: string;
  unlocked: boolean;
  requires: string[];
  row: number;
  col: number;
}

export class GameScene extends Phaser.Scene {
  ship!: Phaser.GameObjects.Container;
  shipBody!: Phaser.GameObjects.Graphics;
  shipGlow!: Phaser.GameObjects.Graphics;
  shipTrail!: Phaser.GameObjects.Particles.ParticleEmitter;

  asteroids: Asteroid[] = [];
  conveyorPaths: ConveyorPath[] = [];
  smelterSlots: SmelterSlot[] = [];
  marketPrices: MarketPrice[] = [];
  upgradeNodes: UpgradeNode[] = [];

  cargo: OreType[] = [];
  cargoCapacity = 10;
  engineSpeed = 200;
  smelterEfficiency = 1.0;
  credits = 1000;
  level = 1;
  totalOreMined = 0;

  keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  isDocked = false;
  dockedAsteroid: Asteroid | null = null;
  isNearStation = false;

  starField!: Phaser.GameObjects.Graphics;
  nebulaLayer!: Phaser.GameObjects.Particles.ParticleEmitter;

  autoSaveTimer = 0;
  marketTimer = 0;

  hexSize = 28;
  gridRadius = 3;

  sellOrders: { ore: OreType; amount: number; price: number; time: number }[] = [];

  worldWidth = 8000;
  worldHeight = 8000;

  stationX = 4000;
  stationY = 4000;

  minimapGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.createStarField();
    this.createNebulaLayer();
    this.createShip();
    this.createAsteroids();
    this.createSmelterSlots();
    this.createSpaceStation();
    this.initMarketPrices();
    this.initUpgradeTree();
    this.setupInput();
    this.setupCamera();
    this.loadPlayerData();

    this.game.events.emit('game-ready', true);
  }

  createStarField() {
    this.starField = this.add.graphics();
    const count = 600;
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, this.worldWidth);
      const y = Phaser.Math.Between(0, this.worldHeight);
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.6 + 0.3;
      this.starField.fillStyle(0xffffff, alpha);
      this.starField.fillCircle(x, y, size);
    }
    this.starField.setDepth(0);

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const twinkleCount = 5;
        for (let i = 0; i < twinkleCount; i++) {
          const x = Phaser.Math.Between(0, this.worldWidth);
          const y = Phaser.Math.Between(0, this.worldHeight);
          const size = Math.random() * 2 + 0.5;
          const alpha = Math.random() * 0.6 + 0.3;
          this.starField.fillStyle(0xffffff, alpha);
          this.starField.fillCircle(x, y, size);
        }
      },
    });
  }

  createNebulaLayer() {
    const nebulaTextures = ['nebula1', 'nebula2', 'nebula3'];
    nebulaTextures.forEach((key, idx) => {
      const g = this.make.graphics({ x: 0, y: 0 });
      const colors = [0x1a0033, 0x001133, 0x0a1a33];
      g.fillStyle(colors[idx], 0.15);
      g.fillCircle(128, 128, 128);
      g.generateTexture(key, 256, 256);
      g.destroy();
    });

    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(500, this.worldWidth - 500);
      const y = Phaser.Math.Between(500, this.worldHeight - 500);
      const key = nebulaTextures[i % nebulaTextures.length];
      const sprite = this.add.image(x, y, key);
      sprite.setAlpha(0.15 + Math.random() * 0.1);
      sprite.setScale(2 + Math.random() * 3);
      sprite.setDepth(0);
      this.tweens.add({
        targets: sprite,
        angle: 360,
        duration: 300000 + Math.random() * 200000,
        repeat: -1,
      });
    }
  }

  createShip() {
    this.ship = this.add.container(this.stationX, this.stationY);
    this.ship.setDepth(10);

    this.shipBody = this.add.graphics();
    this.shipBody.fillStyle(0x00d4ff, 1);
    this.shipBody.beginPath();
    this.shipBody.moveTo(0, -20);
    this.shipBody.lineTo(-14, 14);
    this.shipBody.lineTo(0, 8);
    this.shipBody.lineTo(14, 14);
    this.shipBody.closePath();
    this.shipBody.fillPath();
    this.shipBody.lineStyle(1, 0x00ffff, 0.8);
    this.shipBody.strokePath();

    this.shipGlow = this.add.graphics();
    this.shipGlow.fillStyle(0x00d4ff, 0.15);
    this.shipGlow.fillCircle(0, 10, 16);
    this.shipGlow.setVisible(false);

    this.ship.add([this.shipBody, this.shipGlow]);

    this.physics.add.existing(this.ship as any);
    const body = (this.ship as any).body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setDrag(400);
    body.setMaxVelocity(this.engineSpeed);

    this.tweens.add({
      targets: this.shipGlow,
      alpha: { from: 0.1, to: 0.4 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    const trailTexture = this.make.graphics({ x: 0, y: 0 });
    trailTexture.fillStyle(0x00d4ff, 1);
    trailTexture.fillCircle(4, 4, 4);
    trailTexture.generateTexture('trailParticle', 8, 8);
    trailTexture.destroy();

    const trailEmitter = this.add.particles(this.ship.x, this.ship.y, 'trailParticle', {
      speed: { min: 10, max: 30 },
      lifespan: 400,
      alpha: { start: 0.5, end: 0 },
      scale: { start: 0.6, end: 0.1 },
      blendMode: 'ADD',
      emitting: false,
      quantity: 2,
      follow: this.ship,
      followOffset: { x: 0, y: 14 },
    });
    trailEmitter.setDepth(9);
    this.shipTrail = trailEmitter;
  }

  createAsteroids() {
    const asteroidCount = 18;
    for (let i = 0; i < asteroidCount; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = Phaser.Math.Between(400, this.worldWidth - 400);
        y = Phaser.Math.Between(400, this.worldHeight - 400);
        attempts++;
      } while (
        Phaser.Math.Distance.Between(x, y, this.stationX, this.stationY) < 300 &&
        attempts < 50
      );

      const radius = Phaser.Math.Between(80, 140);
      this.createAsteroid(`ast_${i}`, x, y, radius);
    }
  }

  createAsteroid(id: string, cx: number, cy: number, radius: number) {
    const container = this.add.container(cx, cy);
    container.setDepth(5);

    const ringGraphics = this.add.graphics();
    container.add(ringGraphics);

    const bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x1a1a2e, 0.6);
    const points: { x: number; y: number }[] = [];
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const r = radius + Math.sin(a * 3) * 10;
      points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    bgGraphics.beginPath();
    bgGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      bgGraphics.lineTo(points[i].x, points[i].y);
    }
    bgGraphics.closePath();
    bgGraphics.fillPath();
    bgGraphics.lineStyle(2, 0x334455, 0.5);
    bgGraphics.strokePath();
    container.add(bgGraphics);

    const cells: HexCell[] = [];
    const size = this.hexSize;
    const gridR = this.gridRadius;

    for (let q = -gridR; q <= gridR; q++) {
      for (let r = -gridR; r <= gridR; r++) {
        if (Math.abs(q + r) > gridR) continue;
        const px = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const py = size * (3 / 2 * r);

        if (Math.sqrt(px * px + py * py) > radius - size) continue;

        const ore = this.rollOreType();
        const cell: HexCell = { q, r, ore, mined: false, x: px, y: py };

        const hexGfx = this.add.graphics();
        this.drawHexagon(hexGfx, px, py, size - 2, 0x222233, 0.8, 0x334466, 0.6);
        hexGfx.setInteractive(
          new Phaser.Geom.Circle(px, py, size),
          Phaser.Geom.Circle.Contains
        );
        hexGfx.on('pointerdown', () => this.onCellClick(cell));
        container.add(hexGfx);

        const oreGfx = this.add.graphics();
        this.drawOre(oreGfx, px, py, ore);
        container.add(oreGfx);

        const glowGfx = this.add.graphics();
        this.drawOreGlow(glowGfx, px, py, ore);
        container.add(glowGfx);

        const progressGfx = this.add.graphics();
        container.add(progressGfx);

        cell.graphics = hexGfx;
        cell.oreSprite = oreGfx;
        cell.glowSprite = glowGfx;
        cell.progressGraphics = progressGfx;

        this.tweens.add({
          targets: glowGfx,
          alpha: { from: 0.4, to: 0.9 },
          duration: 1200 + Math.random() * 800,
          yoyo: true,
          repeat: -1,
        });

        cells.push(cell);
      }
    }

    const asteroid: Asteroid = { id, x: cx, y: cy, radius, cells, container, ringGraphics };
    this.asteroids.push(asteroid);
  }

  rollOreType(): OreType {
    const roll = Math.random();
    let cumulative = 0;
    for (const cfg of ORE_CONFIGS) {
      cumulative += cfg.probability;
      if (roll <= cumulative) return cfg.type;
    }
    return OreType.Iron;
  }

  drawHexagon(
    gfx: Phaser.GameObjects.Graphics,
    cx: number, cy: number, size: number,
    fillColor: number, fillAlpha: number,
    strokeColor: number, strokeAlpha: number
  ) {
    gfx.fillStyle(fillColor, fillAlpha);
    gfx.lineStyle(1, strokeColor, strokeAlpha);
    gfx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + size * Math.cos(angle);
      const py = cy + size * Math.sin(angle);
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
  }

  drawOre(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, ore: OreType) {
    const cfg = ORE_CONFIGS.find(c => c.type === ore)!;
    gfx.fillStyle(cfg.color, 0.9);
    gfx.fillCircle(cx, cy, 8);
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillCircle(cx - 2, cy - 2, 3);
  }

  drawOreGlow(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, ore: OreType) {
    const cfg = ORE_CONFIGS.find(c => c.type === ore)!;
    const colorInt = parseInt(cfg.glowColor.replace('#', ''), 16);
    gfx.fillStyle(colorInt, 0.3);
    gfx.fillCircle(cx, cy, 14);
  }

  onCellClick(cell: HexCell) {
    if (!this.dockedAsteroid || cell.mined) return;
    if (this.cargo.length >= this.cargoCapacity) {
      this.game.events.emit('show-notification', '货仓已满！');
      return;
    }

    const isAdjacent = this.isAdjacentToMiningPath(cell);
    if (!isAdjacent && this.conveyorPaths.length > 0) {
      this.game.events.emit('show-notification', '只能连接相邻格子！');
      return;
    }

    cell.mined = true;
    if (cell.graphics) {
      this.drawHexagon(cell.graphics, cell.x, cell.y, this.hexSize - 2, 0x334455, 0.9, 0x5577aa, 0.8);
    }

    const path: ConveyorPath = {
      cells: [cell],
      progress: 0,
      active: true,
    };
    this.conveyorPaths.push(path);

    this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.mineOreFromCell(cell, path);
      },
    });
  }

  isAdjacentToMiningPath(cell: HexCell): boolean {
    if (this.conveyorPaths.length === 0) return true;
    for (const path of this.conveyorPaths) {
      for (const existing of path.cells) {
        const dist = this.hexDistance(cell.q, cell.r, existing.q, existing.r);
        if (dist === 1) return true;
      }
    }
    return false;
  }

  hexDistance(q1: number, r1: number, q2: number, r2: number): number {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
  }

  mineOreFromCell(cell: HexCell, path: ConveyorPath) {
    if (!path.active) return;

    path.progress += 0.2;

    if (cell.progressGraphics) {
      cell.progressGraphics.clear();
      cell.progressGraphics.fillStyle(0x00d4ff, 0.5);
      const angle = path.progress * Math.PI * 2;
      cell.progressGraphics.slice(cell.x, cell.y, this.hexSize - 4, -Math.PI / 2, -Math.PI / 2 + angle, false);
      cell.progressGraphics.fillPath();
    }

    if (path.progress >= 1) {
      this.cargo.push(cell.ore);
      this.totalOreMined++;
      path.active = false;

      if (cell.oreSprite) cell.oreSprite.setVisible(false);
      if (cell.glowSprite) cell.glowSprite.setVisible(false);
      if (cell.progressGraphics) cell.progressGraphics.clear();

      if (cell.graphics) {
        this.drawHexagon(cell.graphics, cell.x, cell.y, this.hexSize - 2, 0x444466, 0.6, 0x556688, 0.4);
      }

      this.flyOreToShip(cell);

      this.game.events.emit('cargo-updated', this.cargo, this.cargoCapacity);
      this.game.events.emit('stats-updated', this.level, this.credits, this.totalOreMined);

      const idx = this.conveyorPaths.indexOf(path);
      if (idx >= 0) this.conveyorPaths.splice(idx, 1);
      return;
    }

    this.tweens.add({
      targets: { val: 0 },
      val: 1,
      duration: 200,
      onComplete: () => this.mineOreFromCell(cell, path),
    });
  }

  flyOreToShip(cell: HexCell) {
    const cfg = ORE_CONFIGS.find(c => c.type === cell.ore)!;
    const worldX = this.dockedAsteroid!.x + cell.x;
    const worldY = this.dockedAsteroid!.y + cell.y;
    const shipX = this.ship.x;
    const shipY = this.ship.y;

    const oreDot = this.add.graphics();
    oreDot.fillStyle(cfg.color, 1);
    oreDot.fillCircle(0, 0, 6);
    oreDot.setPosition(worldX, worldY);
    oreDot.setDepth(15);

    const midX = (worldX + shipX) / 2;
    const midY = Math.min(worldY, shipY) - 60;

    this.tweens.add({
      targets: oreDot,
      x: shipX,
      y: shipY,
      duration: 600,
      ease: 'Power2',
      onUpdate: (tween) => {
        const t = tween.getValue() / (tween.data?.[0]?.end || 1);
        const safeT = Math.min(Math.max(t, 0), 1);
        oreDot.x = (1 - safeT) * (1 - safeT) * worldX + 2 * (1 - safeT) * safeT * midX + safeT * safeT * shipX;
        oreDot.y = (1 - safeT) * (1 - safeT) * worldY + 2 * (1 - safeT) * safeT * midY + safeT * safeT * shipY;
      },
      onComplete: () => oreDot.destroy(),
    });
  }

  createSmelterSlots() {
    for (let i = 0; i < 6; i++) {
      this.smelterSlots.push({
        ore: null,
        progress: 0,
        smelting: false,
      });
    }
  }

  startSmelting(slotIndex: number) {
    const slot = this.smelterSlots[slotIndex];
    if (!slot.ore || slot.smelting) return;

    slot.smelting = true;
    slot.progress = 0;

    const cfg = ORE_CONFIGS.find(c => c.type === slot.ore)!;
    const smeltTime = cfg.smeltTime * this.smelterEfficiency;
    const totalTime = smeltTime * 1000;

    this.game.events.emit('smelter-started', slotIndex);

    const timer = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        slot.progress += 50 / totalTime;
        this.game.events.emit('smelter-progress', slotIndex, slot.progress);

        if (slot.progress >= 1) {
          slot.progress = 1;
          slot.smelting = false;
          const ingotValue = cfg.value * 1.5;
          this.credits += Math.floor(ingotValue);
          slot.ore = null;
          slot.progress = 0;
          timer.remove();
          this.game.events.emit('smelter-complete', slotIndex, Math.floor(ingotValue));
          this.game.events.emit('stats-updated', this.level, this.credits, this.totalOreMined);
        }
      },
    });
  }

  createSpaceStation() {
    const stationGfx = this.add.graphics();
    stationGfx.fillStyle(0x334466, 0.8);
    stationGfx.fillCircle(this.stationX, this.stationY, 60);
    stationGfx.lineStyle(3, 0x00d4ff, 0.6);
    stationGfx.strokeCircle(this.stationX, this.stationY, 60);
    stationGfx.fillStyle(0x00d4ff, 0.4);
    stationGfx.fillCircle(this.stationX, this.stationY, 20);
    stationGfx.setDepth(5);

    const label = this.add.text(this.stationX, this.stationY + 75, '空间站', {
      fontSize: '14px',
      color: '#00d4ff',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setDepth(5);

    this.tweens.add({
      targets: stationGfx,
      alpha: { from: 0.7, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }

  initMarketPrices() {
    this.marketPrices = ORE_CONFIGS.map(cfg => ({
      ore: cfg.type,
      price: cfg.value,
      change: 0,
      history: Array.from({ length: 24 }, () => cfg.value + (Math.random() - 0.5) * cfg.value * 0.2),
    }));
  }

  initUpgradeTree() {
    this.upgradeNodes = [
      { id: 'cargo1', name: '货仓扩容 I', cost: 500, effect: 'cargo', unlocked: false, requires: [], row: 0, col: 0 },
      { id: 'cargo2', name: '货仓扩容 II', cost: 1500, effect: 'cargo', unlocked: false, requires: ['cargo1'], row: 1, col: 0 },
      { id: 'cargo3', name: '货仓扩容 III', cost: 4000, effect: 'cargo', unlocked: false, requires: ['cargo2'], row: 2, col: 0 },
      { id: 'engine1', name: '引擎升级 I', cost: 600, effect: 'engine', unlocked: false, requires: [], row: 0, col: 1 },
      { id: 'engine2', name: '引擎升级 II', cost: 2000, effect: 'engine', unlocked: false, requires: ['engine1'], row: 1, col: 1 },
      { id: 'engine3', name: '引擎升级 III', cost: 5000, effect: 'engine', unlocked: false, requires: ['engine2'], row: 2, col: 1 },
      { id: 'smelter1', name: '熔炉优化 I', cost: 800, effect: 'smelter', unlocked: false, requires: [], row: 0, col: 2 },
      { id: 'smelter2', name: '熔炉优化 II', cost: 2500, effect: 'smelter', unlocked: false, requires: ['smelter1'], row: 1, col: 2 },
      { id: 'smelter3', name: '熔炉优化 III', cost: 6000, effect: 'smelter', unlocked: false, requires: ['smelter2'], row: 2, col: 2 },
      { id: 'alloy1', name: '铜铁合金', cost: 1000, effect: 'alloy_bronze', unlocked: false, requires: ['smelter1'], row: 1, col: 3 },
      { id: 'alloy2', name: '金银合金', cost: 3000, effect: 'alloy_electrum', unlocked: false, requires: ['smelter2', 'alloy1'], row: 2, col: 3 },
    ];
  }

  purchaseUpgrade(nodeId: string) {
    const node = this.upgradeNodes.find(n => n.id === nodeId);
    if (!node || node.unlocked) return;
    if (this.credits < node.cost) {
      this.game.events.emit('show-notification', '游戏币不足！');
      return;
    }
    const allRequired = node.requires.every(req => {
      const reqNode = this.upgradeNodes.find(n => n.id === req);
      return reqNode && reqNode.unlocked;
    });
    if (!allRequired) {
      this.game.events.emit('show-notification', '前置科技未解锁！');
      return;
    }

    this.credits -= node.cost;
    node.unlocked = true;

    switch (node.effect) {
      case 'cargo':
        this.cargoCapacity += 5;
        break;
      case 'engine':
        this.engineSpeed = Math.floor(this.engineSpeed * 1.15);
        const body = (this.ship as any).body as Phaser.Physics.Arcade.Body;
        body.setMaxVelocity(this.engineSpeed);
        break;
      case 'smelter':
        this.smelterEfficiency *= 0.9;
        break;
    }

    this.game.events.emit('upgrade-unlocked', nodeId);
    this.game.events.emit('stats-updated', this.level, this.credits, this.totalOreMined);
    this.savePlayerData();
  }

  setupInput() {
    if (!this.input.keyboard) return;
    this.keys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  setupCamera() {
    this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _dx: number, dy: number) => {
      const zoom = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - dy * 0.001, 0.4, 2.5);
      this.cameras.main.setZoom(newZoom);
    });

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        isDragging = true;
        dragStartX = pointer.x;
        dragStartY = pointer.y;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        const dx = pointer.x - dragStartX;
        const dy = pointer.y - dragStartY;
        this.cameras.main.scrollX -= dx / this.cameras.main.zoom;
        this.cameras.main.scrollY -= dy / this.cameras.main.zoom;
        dragStartX = pointer.x;
        dragStartY = pointer.y;
      }
    });

    this.input.on('pointerup', () => {
      isDragging = false;
    });
  }

  update(_time: number, delta: number) {
    this.handleShipMovement(delta);
    this.checkProximity();
    this.updateAutoSave(delta);
    this.updateMarket(delta);
    this.updateDockingRing();
  }

  handleShipMovement(_delta: number) {
    if (!this.keys || this.isDocked) return;

    const body = (this.ship as any).body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    if (this.keys.W.isDown) vy = -1;
    if (this.keys.S.isDown) vy = 1;
    if (this.keys.A.isDown) vx = -1;
    if (this.keys.D.isDown) vx = 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * this.engineSpeed;
      vy = (vy / len) * this.engineSpeed;
      body.setVelocity(vx, vy);
      this.shipTrail.emitParticle(2);

      this.shipGlow.setVisible(false);
      const angle = Math.atan2(vy, vx) + Math.PI / 2;
      this.shipBody.setRotation(angle);
    } else {
      body.setVelocity(0, 0);
      this.shipGlow.setVisible(this.isDocked);
    }
  }

  checkProximity() {
    this.isNearStation = Phaser.Math.Distance.Between(
      this.ship.x, this.ship.y,
      this.stationX, this.stationY
    ) < 120;

    for (const ast of this.asteroids) {
      const dist = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, ast.x, ast.y);
      if (dist < ast.radius + 40 && !this.isDocked) {
        this.dockToAsteroid(ast);
        return;
      }
    }

    if (this.isDocked && this.dockedAsteroid) {
      const dist = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, this.dockedAsteroid.x, this.dockedAsteroid.y);
      if (dist > this.dockedAsteroid.radius + 80) {
        this.undockFromAsteroid();
      }
    }

    this.game.events.emit('proximity-station', this.isNearStation);
  }

  dockToAsteroid(asteroid: Asteroid) {
    this.isDocked = true;
    this.dockedAsteroid = asteroid;
    this.shipGlow.setVisible(true);

    const body = (this.ship as any).body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    this.game.events.emit('docked-asteroid', asteroid);
  }

  undockFromAsteroid() {
    this.isDocked = false;
    this.dockedAsteroid = null;
    this.shipGlow.setVisible(false);
    this.conveyorPaths = [];

    this.game.events.emit('undocked-asteroid');
  }

  updateDockingRing() {
    for (const ast of this.asteroids) {
      if (ast.ringGraphics) {
        ast.ringGraphics.clear();
        if (this.isDocked && this.dockedAsteroid === ast) {
          ast.ringGraphics.lineStyle(2, 0x00d4ff, 0.5 + Math.sin(this.time.now / 300) * 0.3);
          ast.ringGraphics.strokeCircle(0, 0, ast.radius + 10);
        }
      }
    }
  }

  updateAutoSave(delta: number) {
    this.autoSaveTimer += delta;
    if (this.autoSaveTimer > 30000) {
      this.autoSaveTimer = 0;
      this.savePlayerData();
    }
  }

  updateMarket(delta: number) {
    this.marketTimer += delta;
    if (this.marketTimer > 3600000) {
      this.marketTimer = 0;
      this.fetchMarketData();
    }
    this.game.events.emit('market-updated', this.marketPrices);
  }

  async savePlayerData() {
    try {
      const data = {
        credits: this.credits,
        level: this.level,
        cargo: this.cargo,
        cargoCapacity: this.cargoCapacity,
        engineSpeed: this.engineSpeed,
        smelterEfficiency: this.smelterEfficiency,
        totalOreMined: this.totalOreMined,
        upgrades: this.upgradeNodes.filter(n => n.unlocked).map(n => n.id),
      };
      await axios.post(`${API_BASE}/player/save`, data);
    } catch {
      // offline fallback
    }
  }

  async loadPlayerData() {
    try {
      const res = await axios.get(`${API_BASE}/player/load`);
      if (res.data) {
        const d = res.data;
        this.credits = d.credits ?? this.credits;
        this.level = d.level ?? this.level;
        this.cargo = d.cargo ?? this.cargo;
        this.cargoCapacity = d.cargoCapacity ?? this.cargoCapacity;
        this.engineSpeed = d.engineSpeed ?? this.engineSpeed;
        this.smelterEfficiency = d.smelterEfficiency ?? this.smelterEfficiency;
        this.totalOreMined = d.totalOreMined ?? this.totalOreMined;
        if (d.upgrades) {
          for (const uid of d.upgrades) {
            const node = this.upgradeNodes.find(n => n.id === uid);
            if (node) node.unlocked = true;
          }
        }
        this.game.events.emit('stats-updated', this.level, this.credits, this.totalOreMined);
      }
    } catch {
      // offline fallback
    }
  }

  async fetchMarketData() {
    try {
      const res = await axios.get(`${API_BASE}/market/prices`);
      if (res.data && Array.isArray(res.data)) {
        this.marketPrices = res.data;
      }
    } catch {
      // fallback to local
    }
  }

  async fetchLeaderboard() {
    try {
      const res = await axios.get(`${API_BASE}/leaderboard`);
      return res.data;
    } catch {
      return [];
    }
  }

  placeSellOrder(ore: OreType, amount: number) {
    const priceObj = this.marketPrices.find(p => p.ore === ore);
    if (!priceObj) return;

    const totalPrice = Math.floor(priceObj.price * amount * 0.95);
    const order = {
      ore,
      amount,
      price: priceObj.price,
      time: Date.now(),
    };
    this.sellOrders.push(order);

    for (let i = 0; i < amount; i++) {
      const idx = this.cargo.indexOf(ore);
      if (idx >= 0) this.cargo.splice(idx, 1);
    }

    this.credits += totalPrice;
    this.game.events.emit('cargo-updated', this.cargo, this.cargoCapacity);
    this.game.events.emit('stats-updated', this.level, this.credits, this.totalOreMined);

    this.time.addEvent({
      delay: 86400000,
      callback: () => {
        const idx = this.sellOrders.indexOf(order);
        if (idx >= 0) this.sellOrders.splice(idx, 1);
      },
    });

    try {
      axios.post(`${API_BASE}/market/sell`, { ore, amount });
    } catch {
      // offline
    }
  }

  placeOreInSmelter(slotIndex: number, ore: OreType) {
    const slot = this.smelterSlots[slotIndex];
    if (slot.ore || slot.smelting) return;

    const cargoIdx = this.cargo.indexOf(ore);
    if (cargoIdx < 0) return;

    this.cargo.splice(cargoIdx, 1);
    slot.ore = ore;
    slot.progress = 0;
    slot.smelting = false;

    this.game.events.emit('cargo-updated', this.cargo, this.cargoCapacity);
    this.game.events.emit('smelter-updated', slotIndex, ore);
  }
}
