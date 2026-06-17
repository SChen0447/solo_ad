import Phaser from 'phaser';
import axios from 'axios';

const API_BASE = '/api';

interface HexCell {
  row: number;
  col: number;
  row_offset: number;
  ore_type: string;
  color: string;
  glow: string;
  value: number;
  smelt_time: number;
  mined: boolean;
  graphics?: Phaser.GameObjects.Graphics;
  glowGraphics?: Phaser.GameObjects.Graphics;
  text?: Phaser.GameObjects.Text;
}

interface AsteroidData {
  id: string;
  x: number;
  y: number;
  zone: string;
  grid_size: number;
  hex_grid: HexCell[];
  total_value: number;
  ore_distribution: Record<string, number>;
  mined_out: boolean;
}

interface PlayerData {
  id: string;
  name: string;
  level: number;
  credits: number;
  cargo_capacity: number;
  engine_speed: number;
  smelt_efficiency: number;
  cargo: Record<string, number>;
  ingots: Record<string, number>;
  unlocked_alloys: string[];
  unlocked_upgrades: string[];
  total_earned: number;
  total_mined: number;
}

interface SmelterSlot {
  ore_type: string | null;
  progress: number;
  smelt_time: number;
  is_alloy: boolean;
  alloy_name: string | null;
  ingredients: Record<string, number> | null;
  fire_particles: Phaser.GameObjects.Particles.ParticleEmitter | null;
}

const ORE_COLORS: Record<string, number> = {
  iron: 0x8B8B8B,
  copper: 0xCD7F32,
  silver: 0xC0C0C0,
  gold: 0xFFD700,
  crystal: 0x9B59B6,
};

const ORE_GLOW: Record<string, number> = {
  iron: 0xaaaaaa,
  copper: 0xe8a84c,
  silver: 0xe0e0ff,
  gold: 0xffe44d,
  crystal: 0xd4a5ff,
};

const SMELT_TIMES: Record<string, number> = {
  iron: 3,
  copper: 4,
  silver: 6,
  gold: 10,
  crystal: 12,
};

const ALLOY_RECIPES: Record<string, { ingredients: Record<string, number>; smelt_time: number; value: number }> = {
  bronze: { ingredients: { copper: 2, iron: 1 }, smelt_time: 8, value: 40 },
  electrum: { ingredients: { gold: 1, silver: 2 }, smelt_time: 12, value: 100 },
  stellarite: { ingredients: { crystal: 1, gold: 1 }, smelt_time: 18, value: 250 },
  dark_matter: { ingredients: { crystal: 2, silver: 3 }, smelt_time: 25, value: 500 },
};

export class GameScene extends Phaser.Scene {
  player!: PlayerData;
  playerId: string = '';
  ship!: Phaser.GameObjects.Graphics;
  shipX: number = 0;
  shipY: number = 0;
  shipAngle: number = -Math.PI / 2;
  shipSpeed: number = 200;
  docked: boolean = false;
  dockedAsteroid: AsteroidData | null = null;

  asteroids: AsteroidData[] = [];
  asteroidSprites: Map<string, Phaser.GameObjects.Graphics> = new Map();

  keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  hexContainer!: Phaser.GameObjects.Container;
  hexCells: HexCell[] = [];
  conveyorPath: HexCell[] = [];
  isDrawingPath: boolean = false;
  hexGroup!: Phaser.GameObjects.Graphics;

  smelterSlots: SmelterSlot[] = [];
  smelterContainer!: Phaser.GameObjects.Container;
  SMELTER_SLOT_COUNT = 6;

  starField!: Phaser.GameObjects.Graphics;
  nebulaParticles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter | null;
  dockPulse: number = 0;

  marketData: any = null;
  saveTimer: number = 0;
  autoSaveInterval: number = 30000;

  isInitializing: boolean = true;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // nothing external to load
  }

  async create() {
    this.playerId = 'player_' + Math.random().toString(36).substring(2, 10);

    this.createStarField();
    this.createNebulaLayer();
    this.createShip();
    this.setupInput();
    this.createHexOverlay();
    this.createSmelterUI();
    this.initSmelterSlots();

    try {
      await this.loadPlayerData();
      await this.loadAsteroids();
      await this.loadMarketData();
    } catch (e) {
      console.warn('Backend not available, using defaults', e);
      this.initDefaultPlayer();
      this.generateLocalAsteroids();
    }

    this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    this.setupCameraControls();
    this.emitPlayerUpdate();

    this.isInitializing = false;
  }

  createStarField() {
    this.starField = this.add.graphics();
    this.starField.setScrollFactor(0.3);
    this.drawStars();
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.twinkleStars(),
    });
  }

  drawStars() {
    const w = 4000;
    const h = 4000;
    this.starField.clear();
    for (let i = 0; i < 500; i++) {
      const x = Phaser.Math.Between(-w / 2, w / 2);
      const y = Phaser.Math.Between(-h / 2, h / 2);
      const size = Math.random() * 2.5 + 0.5;
      const alpha = Math.random() * 0.7 + 0.3;
      this.starField.fillStyle(0xffffff, alpha);
      this.starField.fillCircle(x, y, size);
    }
  }

  twinkleStars() {
    if (!this.starField) return;
    for (let i = 0; i < 3; i++) {
      const x = Phaser.Math.Between(-2000, 2000);
      const y = Phaser.Math.Between(-2000, 2000);
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.6 + 0.4;
      this.starField.fillStyle(0xffffff, alpha);
      this.starField.fillCircle(x, y, size);
    }
  }

  createNebulaLayer() {
    for (let i = 0; i < 3; i++) {
      const g = this.add.graphics();
      g.setScrollFactor(0.15);
      const cx = Phaser.Math.Between(-1000, 1000);
      const cy = Phaser.Math.Between(-1000, 1000);
      const colors = [0x1a0a3e, 0x0a2a4e, 0x2a0a2e];
      g.fillStyle(colors[i], 0.15);
      g.fillCircle(cx, cy, Phaser.Math.Between(200, 500));
      this.tweens.add({
        targets: g,
        angle: 360,
        duration: 120000 + i * 40000,
        repeat: -1,
      });
    }
  }

  createShip() {
    this.shipX = 0;
    this.shipY = 0;
    this.ship = this.add.graphics();
    this.drawShip();
    this.ship.setPosition(this.shipX, this.shipY);
    this.ship.setDepth(10);
  }

  drawShip() {
    this.ship.clear();
    this.ship.fillStyle(0x00d4ff, 1);
    this.ship.beginPath();
    this.ship.moveTo(20, 0);
    this.ship.lineTo(-14, -12);
    this.ship.lineTo(-8, 0);
    this.ship.lineTo(-14, 12);
    this.ship.closePath();
    this.ship.fillPath();
    this.ship.lineStyle(2, 0x00ffff, 0.8);
    this.ship.strokePath();
  }

  setupInput() {
    if (this.input.keyboard) {
      this.keys = {
        W: this.input.keyboard.addKey('W'),
        A: this.input.keyboard.addKey('A'),
        S: this.input.keyboard.addKey('S'),
        D: this.input.keyboard.addKey('D'),
      };
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.docked && this.dockedAsteroid) {
        this.handleHexClick(pointer);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDrawingPath && this.docked && this.dockedAsteroid) {
        this.handleHexHover(pointer);
      }
    });

    this.input.on('pointerup', () => {
      if (this.isDrawingPath) {
        this.finalizeConveyorPath();
      }
    });
  }

  setupCameraControls() {
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.3, 2.5);
      cam.setZoom(newZoom);
    });

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let camStartX = 0;
    let camStartY = 0;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        isDragging = true;
        dragStartX = pointer.x;
        dragStartY = pointer.y;
        camStartX = this.cameras.main.scrollX;
        camStartY = this.cameras.main.scrollY;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        const dx = pointer.x - dragStartX;
        const dy = pointer.y - dragStartY;
        this.cameras.main.scrollX = camStartX - dx / this.cameras.main.zoom;
        this.cameras.main.scrollY = camStartY - dy / this.cameras.main.zoom;
      }
    });

    this.input.on('pointerup', () => {
      isDragging = false;
    });
  }

  update(_time: number, delta: number) {
    if (this.isInitializing) return;
    const dt = delta / 1000;

    this.updateShipMovement(dt);
    this.updateTrail(dt);
    this.updateDockPulse(dt);
    this.updateSmelting(dt);
    this.updateAutoSave(dt);
    this.checkProximity();
  }

  updateShipMovement(dt: number) {
    if (this.docked) return;

    let dx = 0;
    let dy = 0;
    if (this.keys.W.isDown) dy -= 1;
    if (this.keys.S.isDown) dy += 1;
    if (this.keys.A.isDown) dx -= 1;
    if (this.keys.D.isDown) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      const speed = this.shipSpeed * (this.player?.engine_speed || 1);
      this.shipX += dx * speed * dt;
      this.shipY += dy * speed * dt;
      this.shipAngle = Math.atan2(dy, dx);
    }

    this.ship.setPosition(this.shipX, this.shipY);
    this.ship.setRotation(this.shipAngle);
  }

  updateTrail(dt: number) {
    if (!this.ship) return;

    if (this.trailEmitter) {
      this.trailEmitter.setPosition(this.shipX, this.shipY);
    }

    const isMoving = this.keys && (this.keys.W.isDown || this.keys.A.isDown || this.keys.S.isDown || this.keys.D.isDown);
    if (isMoving && !this.docked) {
      if (!this.trailEmitter) {
        const trailGfx = this.add.graphics();
        trailGfx.fillStyle(0x00d4ff, 0.6);
        trailGfx.fillCircle(2, 2, 2);
        trailGfx.generateTexture('trailParticle', 4, 4);
        trailGfx.destroy();

        const particles = this.add.particles(this.shipX, this.shipY, 'trailParticle', {
          speed: { min: 10, max: 30 },
          scale: { start: 0.8, end: 0 },
          lifespan: { min: 200, max: 500 },
          alpha: { start: 0.6, end: 0 },
          blendMode: 'ADD',
          emitting: true,
          quantity: 2,
          angle: {
            onEmit: () => {
              return (this.shipAngle * 180 / Math.PI) + 180 + Phaser.Math.Between(-30, 30);
            }
          },
        });
        particles.setDepth(9);
        this.trailEmitter = particles;
      }
      this.trailEmitter.emitting = true;
    } else if (this.trailEmitter) {
      this.trailEmitter.emitting = false;
    }
  }

  updateDockPulse(dt: number) {
    if (!this.docked || !this.ship) return;
    this.dockPulse += dt * 4;
    const scale = 1 + Math.sin(this.dockPulse * Math.PI) * 0.08;
    this.ship.setScale(scale);
    const alpha = 0.3 + Math.sin(this.dockPulse * Math.PI) * 0.3;

    // We just redraw with glow effect
    this.ship.clear();
    this.ship.fillStyle(0x00d4ff, alpha);
    this.ship.fillCircle(0, 5, 18);
    this.ship.fillStyle(0x00d4ff, 1);
    this.ship.beginPath();
    this.ship.moveTo(20, 0);
    this.ship.lineTo(-14, -12);
    this.ship.lineTo(-8, 0);
    this.ship.lineTo(-14, 12);
    this.ship.closePath();
    this.ship.fillPath();
    this.ship.lineStyle(2, 0x00ffff, 0.8);
    this.ship.strokePath();
  }

  checkProximity() {
    if (this.docked) return;

    const dockRange = 80;
    for (const ast of this.asteroids) {
      const dx = this.shipX - ast.x;
      const dy = this.shipY - ast.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < dockRange) {
        this.dockToAsteroid(ast);
        return;
      }
    }
  }

  dockToAsteroid(asteroid: AsteroidData) {
    this.docked = true;
    this.dockedAsteroid = asteroid;
    this.conveyorPath = [];
    this.isDrawingPath = false;

    if (this.trailEmitter) {
      this.trailEmitter.emitting = false;
    }

    this.showHexGrid(asteroid);

    this.events.emit('docked', asteroid);
  }

  undock() {
    this.docked = false;
    this.dockedAsteroid = null;
    this.conveyorPath = [];
    this.isDrawingPath = false;
    this.dockPulse = 0;

    this.hideHexGrid();
    this.drawShip();
    this.ship.setScale(1);

    this.events.emit('undocked');
  }

  createHexOverlay() {
    this.hexContainer = this.add.container(0, 0);
    this.hexContainer.setDepth(20);
    this.hexContainer.setVisible(false);
    this.hexGroup = this.add.graphics();
    this.hexGroup.setDepth(20);
    this.hexGroup.setVisible(false);
  }

  showHexGrid(asteroid: AsteroidData) {
    this.hexContainer.removeAll(true);
    this.hexCells = [];
    this.hexGroup.clear();
    this.hexGroup.setVisible(true);
    this.hexContainer.setVisible(true);

    const hexSize = 36;
    const grid = asteroid.hex_grid;
    const astX = asteroid.x;
    const astY = asteroid.y;

    for (const cell of grid) {
      const offsetX = cell.row_offset * hexSize * 0.5;
      const cx = astX + (cell.col * hexSize * 1.5) + offsetX - (asteroid.grid_size * hexSize * 0.75);
      const cy = astY + (cell.row * hexSize * Math.sqrt(3) * 0.5) - (asteroid.grid_size * hexSize * 0.5);

      const cellData: HexCell = { ...cell };
      cellData.graphics = this.hexGroup;

      const gfx = this.add.graphics();
      gfx.setDepth(20);

      this.drawHexCell(gfx, cx, cy, hexSize, cell.ore_type, false);

      const label = this.add.text(cx, cy, cell.ore_type.substring(0, 2).toUpperCase(), {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
      });
      label.setOrigin(0.5, 0.5);
      label.setDepth(21);

      this.hexContainer.add(gfx);
      this.hexContainer.add(label);

      (cellData as any)._cx = cx;
      (cellData as any)._cy = cy;
      (cellData as any)._size = hexSize;
      (cellData as any)._gfx = gfx;

      this.hexCells.push(cellData);
    }
  }

  drawHexCell(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, oreType: string, highlight: boolean) {
    gfx.clear();
    const color = ORE_COLORS[oreType] || 0x8B8B8B;
    const glowColor = ORE_GLOW[oreType] || 0xaaaaaa;

    if (highlight) {
      gfx.fillStyle(glowColor, 0.4);
      gfx.lineStyle(2, 0x00d4ff, 1);
    } else {
      gfx.fillStyle(color, 0.7);
      gfx.lineStyle(1, glowColor, 0.5);
    }

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

    if (oreType === 'crystal' || oreType === 'gold') {
      gfx.fillStyle(glowColor, 0.3);
      gfx.fillCircle(cx, cy, size * 0.6);
    }
  }

  hideHexGrid() {
    this.hexContainer.removeAll(true);
    this.hexContainer.setVisible(false);
    this.hexGroup.clear();
    this.hexGroup.setVisible(false);
    this.hexCells = [];
  }

  handleHexClick(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    for (const cell of this.hexCells) {
      if (cell.mined) continue;
      const cx = (cell as any)._cx;
      const cy = (cell as any)._cy;
      const size = (cell as any)._size;
      const dist = Math.sqrt((worldPoint.x - cx) ** 2 + (worldPoint.y - cy) ** 2);
      if (dist < size * 0.85) {
        if (this.conveyorPath.length === 0 || this.isAdjacent(this.conveyorPath[this.conveyorPath.length - 1], cell)) {
          if (!this.conveyorPath.includes(cell)) {
            this.conveyorPath.push(cell);
            this.isDrawingPath = true;
            this.updateConveyorVisuals();
          }
        }
        return;
      }
    }
  }

  handleHexHover(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    for (const cell of this.hexCells) {
      if (cell.mined || this.conveyorPath.includes(cell)) continue;
      const cx = (cell as any)._cx;
      const cy = (cell as any)._cy;
      const size = (cell as any)._size;
      const dist = Math.sqrt((worldPoint.x - cx) ** 2 + (worldPoint.y - cy) ** 2);
      if (dist < size * 0.85) {
        if (this.conveyorPath.length > 0 && this.isAdjacent(this.conveyorPath[this.conveyorPath.length - 1], cell)) {
          this.conveyorPath.push(cell);
          this.updateConveyorVisuals();
        }
        return;
      }
    }
  }

  isAdjacent(a: HexCell, b: HexCell): boolean {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    if (dr === 0 && dc === 1) return true;
    if (dr === 1 && dc === 0) return true;
    if (dr === 1 && a.row_offset !== b.row_offset && dc === 1) return true;
    return false;
  }

  updateConveyorVisuals() {
    for (const cell of this.hexCells) {
      const gfx: Phaser.GameObjects.Graphics = (cell as any)._gfx;
      const cx = (cell as any)._cx;
      const cy = (cell as any)._cy;
      const size = (cell as any)._size;
      const inPath = this.conveyorPath.includes(cell);
      this.drawHexCell(gfx, cx, cy, size, cell.ore_type, inPath);
    }

    // Draw conveyor belt lines
    this.hexGroup.clear();
    this.hexGroup.setVisible(true);
    if (this.conveyorPath.length > 1) {
      this.hexGroup.lineStyle(3, 0x00d4ff, 0.8);
      this.hexGroup.beginPath();
      const first = this.conveyorPath[0] as any;
      this.hexGroup.moveTo(first._cx, first._cy);
      for (let i = 1; i < this.conveyorPath.length; i++) {
        const c = this.conveyorPath[i] as any;
        this.hexGroup.lineTo(c._cx, c._cy);
      }
      this.hexGroup.strokePath();
    }
  }

  finalizeConveyorPath() {
    this.isDrawingPath = false;
    if (this.conveyorPath.length === 0) return;

    this.startMiningConveyor();
  }

  startMiningConveyor() {
    const path = [...this.conveyorPath];
    let idx = 0;

    const mineNext = () => {
      if (idx >= path.length) {
        this.conveyorPath = [];
        if (this.dockedAsteroid) {
          this.checkAsteroidMinedOut();
        }
        return;
      }

      const cell = path[idx];
      if (cell.mined) {
        idx++;
        mineNext();
        return;
      }

      const collectTime = 800;
      this.flashCellMining(cell, collectTime);

      this.time.delayedCall(collectTime, () => {
        cell.mined = true;
        this.addOreToCargo(cell.ore_type);
        this.animateOreFlyToShip(cell);

        const gfx: Phaser.GameObjects.Graphics = (cell as any)._gfx;
        const cx = (cell as any)._cx;
        const cy = (cell as any)._cy;
        const size = (cell as any)._size;
        gfx.clear();
        gfx.fillStyle(0x1a1a2e, 0.5);
        gfx.lineStyle(1, 0x333355, 0.3);
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

        this.events.emit('cargo-updated', this.player.cargo, this.player.cargo_capacity);
        idx++;
        mineNext();
      });
    };

    mineNext();
  }

  flashCellMining(cell: HexCell, duration: number) {
    const gfx: Phaser.GameObjects.Graphics = (cell as any)._gfx;
    const cx = (cell as any)._cx;
    const cy = (cell as any)._cy;
    const size = (cell as any)._size;

    const flashGfx = this.add.graphics();
    flashGfx.setDepth(22);
    let elapsed = 0;
    const flashInterval = 100;
    let on = true;

    const timer = this.time.addEvent({
      delay: flashInterval,
      repeat: Math.floor(duration / flashInterval),
      callback: () => {
        elapsed += flashInterval;
        flashGfx.clear();
        if (on) {
          flashGfx.fillStyle(0x00d4ff, 0.4);
          flashGfx.fillCircle(cx, cy, size * 0.5);
        }
        on = !on;
        if (elapsed >= duration) {
          flashGfx.destroy();
        }
      },
    });
  }

  addOreToCargo(oreType: string) {
    if (!this.player) return;

    const totalItems = Object.values(this.player.cargo).reduce((a, b) => a + b, 0);
    if (totalItems >= this.player.cargo_capacity) {
      this.events.emit('cargo-full');
      return;
    }

    this.player.cargo[oreType] = (this.player.cargo[oreType] || 0) + 1;
    this.player.total_mined += 1;

    this.updatePlayerLevel();
    this.emitPlayerUpdate();
  }

  animateOreFlyToShip(cell: HexCell) {
    const cx = (cell as any)._cx;
    const cy = (cell as any)._cy;
    const oreGfx = this.add.graphics();
    oreGfx.setDepth(25);
    const color = ORE_COLORS[cell.ore_type] || 0xffffff;
    oreGfx.fillStyle(color, 1);
    oreGfx.fillCircle(0, 0, 6);

    const targetX = this.shipX;
    const targetY = this.shipY;
    const midX = (cx + targetX) / 2;
    const midY = Math.min(cy, targetY) - 60;

    this.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: 400,
      ease: 'Quad.easeOut',
      onUpdate: (_tween, target) => {
        const t = target.t;
        const x = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * midX + t * t * targetX;
        const y = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * midY + t * t * targetY;
        oreGfx.setPosition(x, y);
      },
      onComplete: () => {
        oreGfx.destroy();
      },
    });
  }

  checkAsteroidMinedOut() {
    if (!this.dockedAsteroid) return;
    const allMined = this.dockedAsteroid.hex_grid.every(c => c.mined);
    if (allMined) {
      this.dockedAsteroid.mined_out = true;
      const sprite = this.asteroidSprites.get(this.dockedAsteroid.id);
      if (sprite) {
        sprite.clear();
        sprite.fillStyle(0x333333, 0.3);
        sprite.fillCircle(0, 0, 30);
      }
    }
  }

  updatePlayerLevel() {
    const mined = this.player.total_mined;
    this.player.level = Math.floor(mined / 20) + 1;
  }

  createSmelterUI() {
    this.smelterContainer = this.add.container(0, 0);
    this.smelterContainer.setDepth(30);
    this.smelterContainer.setScrollFactor(0);
    this.smelterContainer.setVisible(false);
  }

  initSmelterSlots() {
    this.smelterSlots = [];
    for (let i = 0; i < this.SMELTER_SLOT_COUNT; i++) {
      this.smelterSlots.push({
        ore_type: null,
        progress: 0,
        smelt_time: 0,
        is_alloy: false,
        alloy_name: null,
        ingredients: null,
        fire_particles: null,
      });
    }
  }

  showSmelter() {
    this.smelterContainer.setVisible(true);
    this.smelterContainer.removeAll(true);

    const cam = this.cameras.main;
    const baseX = cam.width / 2 - (this.SMELTER_SLOT_COUNT * 65) / 2;
    const baseY = cam.height - 80;

    const bg = this.add.graphics();
    bg.setScrollFactor(0);
    bg.fillStyle(0x1a1a2e, 0.85);
    bg.fillRoundedRect(baseX - 15, baseY - 25, this.SMELTER_SLOT_COUNT * 65 + 30, 70, 8);
    bg.lineStyle(2, 0x00d4ff, 0.6);
    bg.strokeRoundedRect(baseX - 15, baseY - 25, this.SMELTER_SLOT_COUNT * 65 + 30, 70, 8);
    this.smelterContainer.add(bg);

    const label = this.add.text(cam.width / 2, baseY - 15, '熔炼炉', {
      fontSize: '12px', color: '#00d4ff', fontFamily: 'sans-serif',
    });
    label.setOrigin(0.5, 0.5);
    label.setScrollFactor(0);
    this.smelterContainer.add(label);

    for (let i = 0; i < this.SMELTER_SLOT_COUNT; i++) {
      const slotX = baseX + i * 65 + 30;
      const slotY = baseY + 15;

      const slotBg = this.add.graphics();
      slotBg.setScrollFactor(0);
      slotBg.fillStyle(0x0a0a2a, 0.9);
      slotBg.fillRoundedRect(slotX - 25, slotY - 20, 50, 40, 4);
      slotBg.lineStyle(1, 0x00d4ff, 0.4);
      slotBg.strokeRoundedRect(slotX - 25, slotY - 20, 50, 40, 4);

      const slot = this.smelterSlots[i];
      if (slot.ore_type) {
        const oreColor = slot.is_alloy ? 0x00ff88 : (ORE_COLORS[slot.ore_type] || 0xffffff);
        slotBg.fillStyle(oreColor, 0.6);
        slotBg.fillRoundedRect(slotX - 22, slotY - 17, 44 * (slot.progress / slot.smelt_time), 34, 3);

        const slotLabel = this.add.text(slotX, slotY, slot.is_alloy ? (slot.alloy_name || '').substring(0, 3) : slot.ore_type.substring(0, 2).toUpperCase(), {
          fontSize: '11px', color: '#ffffff', fontFamily: 'monospace',
        });
        slotLabel.setOrigin(0.5, 0.5);
        slotLabel.setScrollFactor(0);
        this.smelterContainer.add(slotLabel);
      } else {
        const plusLabel = this.add.text(slotX, slotY, '+', {
          fontSize: '16px', color: '#334466', fontFamily: 'sans-serif',
        });
        plusLabel.setOrigin(0.5, 0.5);
        plusLabel.setScrollFactor(0);
        this.smelterContainer.add(plusLabel);
      }

      this.smelterContainer.add(slotBg);
    }
  }

  hideSmelter() {
    this.smelterContainer.setVisible(false);
  }

  startSmelting(oreType: string, isAlloy: boolean = false, alloyName: string | null = null, ingredients: Record<string, number> | null = null) {
    const emptySlot = this.smelterSlots.find(s => s.ore_type === null);
    if (!emptySlot) {
      this.events.emit('smelter-full');
      return;
    }

    const smeltTime = isAlloy && alloyName && ALLOY_RECIPES[alloyName]
      ? ALLOY_RECIPES[alloyName].smelt_time
      : (SMELT_TIMES[oreType] || 5);

    const efficiency = this.player?.smelt_efficiency || 1;
    const adjustedTime = smeltTime * efficiency;

    emptySlot.ore_type = oreType;
    emptySlot.progress = 0;
    emptySlot.smelt_time = adjustedTime;
    emptySlot.is_alloy = isAlloy;
    emptySlot.alloy_name = alloyName;
    emptySlot.ingredients = ingredients;

    this.showSmelter();
    this.events.emit('smelt-started', oreType, adjustedTime);
  }

  updateSmelting(dt: number) {
    let anyActive = false;
    for (const slot of this.smelterSlots) {
      if (slot.ore_type && slot.progress < slot.smelt_time) {
        slot.progress += dt;
        anyActive = true;

        if (slot.progress >= slot.smelt_time) {
          this.completeSmelting(slot);
        }
      }
    }
    if (anyActive) {
      this.showSmelter();
    }
  }

  completeSmelting(slot: SmelterSlot) {
    const product = slot.is_alloy ? (slot.alloy_name || 'alloy') : (slot.ore_type + '_ingot');
    this.player.ingots[product] = (this.player.ingots[product] || 0) + 1;

    this.events.emit('smelt-complete', product);
    this.events.emit('ingots-updated', this.player.ingots);

    slot.ore_type = null;
    slot.progress = 0;
    slot.smelt_time = 0;
    slot.is_alloy = false;
    slot.alloy_name = null;
    slot.ingredients = null;
  }

  async loadPlayerData() {
    const resp = await axios.get(`${API_BASE}/player/${this.playerId}`);
    this.player = resp.data;
  }

  async savePlayerData() {
    if (!this.player) return;
    try {
      await axios.post(`${API_BASE}/player/${this.playerId}`, this.player);
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  async loadAsteroids() {
    const resp = await axios.get(`${API_BASE}/asteroids`, { params: { seed: 42, count: 15 } });
    this.asteroids = resp.data;
    this.renderAsteroids();
  }

  async loadMarketData() {
    try {
      const resp = await axios.get(`${API_BASE}/market`);
      this.marketData = resp.data;
      this.events.emit('market-updated', this.marketData);
    } catch (e) {
      console.warn('Market load failed', e);
    }
  }

  initDefaultPlayer() {
    this.player = {
      id: this.playerId,
      name: 'Pilot_' + this.playerId.substring(0, 6),
      level: 1,
      credits: 100,
      cargo_capacity: 10,
      engine_speed: 1.0,
      smelt_efficiency: 1.0,
      cargo: {},
      ingots: {},
      unlocked_alloys: [],
      unlocked_upgrades: [],
      total_earned: 0,
      total_mined: 0,
    };
  }

  generateLocalAsteroids() {
    this.asteroids = [];
    const oreTypes = ['iron', 'copper', 'silver', 'gold', 'crystal'];
    const probs = [0.35, 0.25, 0.20, 0.12, 0.08];

    for (let i = 0; i < 15; i++) {
      const gridSize = i < 5 ? 4 : 6;
      const hexGrid: HexCell[] = [];
      const oreDist: Record<string, number> = {};

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const r = Math.random();
          let cumProb = 0;
          let ore = 'iron';
          for (let oi = 0; oi < oreTypes.length; oi++) {
            cumProb += probs[oi];
            if (r <= cumProb) {
              ore = oreTypes[oi];
              break;
            }
          }
          oreDist[ore] = (oreDist[ore] || 0) + 1;
          hexGrid.push({
            row, col, row_offset: row % 2,
            ore_type: ore,
            color: '',
            glow: '',
            value: [5, 10, 20, 50, 100][oreTypes.indexOf(ore)],
            smelt_time: [3, 4, 6, 10, 12][oreTypes.indexOf(ore)],
            mined: false,
          });
        }
      }

      const angle = (i / 15) * Math.PI * 2;
      const dist = 300 + Math.random() * 1500;
      this.asteroids.push({
        id: `ast_${i.toString().padStart(3, '0')}`,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        zone: i < 5 ? 'inner' : i < 10 ? 'middle' : 'outer',
        grid_size: gridSize,
        hex_grid: hexGrid,
        total_value: hexGrid.reduce((a, h) => a + h.value, 0),
        ore_distribution: oreDist,
        mined_out: false,
      });
    }

    this.renderAsteroids();
  }

  renderAsteroids() {
    for (const [id, sprite] of this.asteroidSprites) {
      sprite.destroy();
    }
    this.asteroidSprites.clear();

    for (const ast of this.asteroids) {
      const gfx = this.add.graphics();
      gfx.setPosition(ast.x, ast.y);
      gfx.setDepth(5);

      const rarity = ast.zone === 'outer' ? 0.7 : ast.zone === 'middle' ? 0.5 : 0.3;
      const baseAlpha = 0.6 + rarity * 0.3;
      const baseColor = ast.zone === 'outer' ? 0x6a3a8a : ast.zone === 'middle' ? 0x5a6a8a : 0x6a7a7a;

      gfx.fillStyle(baseColor, baseAlpha);
      gfx.fillCircle(0, 0, 30 + ast.grid_size * 2);
      gfx.lineStyle(1, 0x00d4ff, 0.2);
      gfx.strokeCircle(0, 0, 30 + ast.grid_size * 2);

      const ringColor = ast.zone === 'outer' ? 0xd4a5ff : ast.zone === 'middle' ? 0xe0e0ff : 0xaaaaaa;
      gfx.lineStyle(1, ringColor, 0.15);
      gfx.strokeCircle(0, 0, 40 + ast.grid_size * 2);

      if (ast.mined_out) {
        gfx.clear();
        gfx.fillStyle(0x333333, 0.3);
        gfx.fillCircle(0, 0, 30);
      }

      this.asteroidSprites.set(ast.id, gfx);
    }
  }

  updateAutoSave(dt: number) {
    this.saveTimer += dt * 1000;
    if (this.saveTimer >= this.autoSaveInterval) {
      this.saveTimer = 0;
      this.savePlayerData();
    }
  }

  emitPlayerUpdate() {
    if (!this.player) return;
    this.events.emit('player-updated', {
      level: this.player.level,
      credits: this.player.credits,
      totalMined: this.player.total_mined,
      cargo: this.player.cargo,
      cargo_capacity: this.player.cargo_capacity,
      ingots: this.player.ingots,
      engine_speed: this.player.engine_speed,
      smelt_efficiency: this.player.smelt_efficiency,
      unlocked_alloys: this.player.unlocked_alloys,
      unlocked_upgrades: this.player.unlocked_upgrades,
    });
  }

  getPlayerData() { return this.player; }
  getAsteroids() { return this.asteroids; }
  getMarketData() { return this.marketData; }
  getSmelterSlots() { return this.smelterSlots; }
  isDocked() { return this.docked; }
  getDockedAsteroid() { return this.dockedAsteroid; }
  getShipPosition() { return { x: this.shipX, y: this.shipY, angle: this.shipAngle }; }
}
