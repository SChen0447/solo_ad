import Phaser from 'phaser';
import {
  GRID_COLS,
  GRID_ROWS,
  HEX_SIZE,
  HEX_WIDTH,
  HEX_HEIGHT,
  HEX_HORIZ_SPACING,
  HEX_VERT_SPACING,
  hexToPixel,
  pixelToHex,
  isValidHex,
  getHexCorners,
  getGridPixelWidth,
  getGridPixelHeight,
  HexCoord,
} from '../utils/GridUtils';
import { Tower, TowerType, TOWER_CONFIGS, TowerConfig } from '../entities/Tower';
import { Enemy } from '../entities/Enemy';

interface LaserBeam {
  graphic: Phaser.GameObjects.Graphics;
  startTime: number;
  duration: number;
}

interface PulseEffect {
  graphic: Phaser.GameObjects.Graphics;
  position: number;
  speed: number;
}

type EditorMode = 'tower' | 'path' | 'simulate';

export class GameScene extends Phaser.Scene {
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;
  private mapAreaWidth: number = 0;

  private towers: Map<string, Tower> = new Map();
  private enemies: Enemy[] = [];
  private pathPoints: { x: number; y: number }[] = [];
  private pathHexes: HexCoord[] = [];
  private laserBeams: LaserBeam[] = [];
  private pulseEffects: PulseEffect[] = [];

  private selectedTowerType: TowerType | null = TowerType.Arrow;
  private selectedTower: Tower | null = null;
  private editorMode: EditorMode = 'tower';
  private simulating: boolean = false;
  private enemySpawnTimer: number = 0;
  private enemiesSpawned: number = 0;
  private totalEnemiesToSpawn: number = 10;

  private gridGraphics!: Phaser.GameObjects.Graphics;
  private previewGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private pulseGraphics!: Phaser.GameObjects.Graphics;
  private bgSprite!: Phaser.GameObjects.Image;

  private hoveredHex: HexCoord | null = null;
  private isDrawingPath: boolean = false;

  private fpsText!: Phaser.GameObjects.Text;
  private fpsHistory: number[] = [];

  private toolbarEl!: HTMLElement;
  private propertyPanelEl!: HTMLElement;
  private towerButtons: Map<TowerType, HTMLElement> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.mapAreaWidth = this.scale.width * 0.7;
    const gridW = getGridPixelWidth();
    const gridH = getGridPixelHeight();
    this.gridOffsetX = (this.mapAreaWidth - gridW) / 2 + HEX_WIDTH / 2;
    this.gridOffsetY = (this.scale.height - gridH) / 2 + HEX_HEIGHT / 2;

    this.createBackground();
    this.createHexGrid();
    this.createPreview();
    this.createPathGraphics();
    this.setupToolbar();
    this.setupPropertyPanel();
    this.setupFPSDisplay();
    this.setupInput();
  }

  private createBackground(): void {
    const w = this.mapAreaWidth;
    const h = this.scale.height;
    const key = 'bg-gradient';
    if (!this.textures.exists(key)) {
      const canvasTexture = this.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
      if (!canvasTexture) return;
      const ctx = canvasTexture.getContext();
      const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.5);
      gradient.addColorStop(0, '#1b3a2a');
      gradient.addColorStop(1, '#0a1a10');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      canvasTexture.refresh();
    }
    this.bgSprite = this.add.image(w / 2, h / 2, key);
    this.bgSprite.setDisplaySize(w, h);
    this.bgSprite.setDepth(-10);
  }

  private createHexGrid(): void {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(0);

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const pos = this.hexToWorld(col, row);
        const corners = getHexCorners(pos.x, pos.y, HEX_SIZE);

        this.gridGraphics.lineStyle(1, 0x88aacc, 0.15);
        this.gridGraphics.beginPath();
        this.gridGraphics.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          this.gridGraphics.lineTo(corners[i].x, corners[i].y);
        }
        this.gridGraphics.closePath();
        this.gridGraphics.strokePath();

        this.gridGraphics.fillStyle(0xaaddff, 0.06);
        this.gridGraphics.fillCircle(pos.x, pos.y, 2);
      }
    }
  }

  private createPreview(): void {
    this.previewGraphics = this.add.graphics();
    this.previewGraphics.setDepth(5);
  }

  private createPathGraphics(): void {
    this.pathGraphics = this.add.graphics();
    this.pathGraphics.setDepth(1);
    this.pulseGraphics = this.add.graphics();
    this.pulseGraphics.setDepth(2);
  }

  private setupToolbar(): void {
    this.toolbarEl = document.getElementById('toolbar')!;
    const towerTypes: TowerType[] = [TowerType.Arrow, TowerType.Cannon, TowerType.Magic, TowerType.Slow];
    const icons: Record<TowerType, string> = {
      [TowerType.Arrow]: '▲',
      [TowerType.Cannon]: '■',
      [TowerType.Magic]: '◆',
      [TowerType.Slow]: '⬡',
    };

    for (const type of towerTypes) {
      const config = TOWER_CONFIGS[type];
      const btn = document.createElement('button');
      btn.className = 'tower-btn';
      btn.dataset.type = type;
      const colorHex = '#' + config.color.toString(16).padStart(6, '0');
      btn.innerHTML = `<span class="btn-icon" style="color:${colorHex}">${icons[type]}</span><span class="btn-label">${config.name}</span><span class="btn-cost">$${config.cost}</span>`;
      btn.addEventListener('click', () => {
        this.selectedTowerType = type;
        this.editorMode = 'tower';
        this.updateToolbarSelection();
      });
      this.toolbarEl.appendChild(btn);
      this.towerButtons.set(type, btn);
    }

    const pathBtn = document.createElement('button');
    pathBtn.className = 'tool-btn';
    pathBtn.id = 'path-btn';
    pathBtn.innerHTML = '<span class="btn-icon">✎</span><span class="btn-label">绘制路径</span>';
    pathBtn.addEventListener('click', () => {
      this.editorMode = 'path';
      this.updateToolbarSelection();
    });
    this.toolbarEl.appendChild(pathBtn);

    const simBtn = document.createElement('button');
    simBtn.className = 'tool-btn accent';
    simBtn.id = 'sim-btn';
    simBtn.innerHTML = '<span class="btn-icon">▶</span><span class="btn-label">开始模拟</span>';
    simBtn.addEventListener('click', () => this.startSimulation());
    this.toolbarEl.appendChild(simBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'tool-btn danger';
    resetBtn.id = 'reset-btn';
    resetBtn.innerHTML = '<span class="btn-icon">↺</span><span class="btn-label">重置</span>';
    resetBtn.addEventListener('click', () => this.resetAll());
    this.toolbarEl.appendChild(resetBtn);

    this.updateToolbarSelection();
  }

  private setupPropertyPanel(): void {
    this.propertyPanelEl = document.getElementById('property-panel')!;
    this.updatePropertyPanel();
  }

  private setupFPSDisplay(): void {
    this.fpsText = this.add.text(8, 8, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#66ffaa',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 },
    });
    this.fpsText.setDepth(1000);
    this.fpsText.setScrollFactor(0);
  }

  private setupInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerMove(pointer);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });

    this.input.on('pointerup', () => {
      this.isDrawingPath = false;
    });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const worldPos = this.screenToWorld(pointer.x, pointer.y);
    if (!worldPos) {
      this.hoveredHex = null;
      this.previewGraphics.clear();
      return;
    }

    const hex = pixelToHex(worldPos.x - this.gridOffsetX, worldPos.y - this.gridOffsetY);
    if (!isValidHex(hex.col, hex.row)) {
      this.hoveredHex = null;
      this.previewGraphics.clear();
      return;
    }

    this.hoveredHex = hex;

    if (this.editorMode === 'tower' && this.selectedTowerType) {
      this.drawTowerPreview(hex);
    } else {
      this.previewGraphics.clear();
    }

    if (this.editorMode === 'path' && this.isDrawingPath) {
      this.addPathPoint(hex);
    }

    this.handleTowerHover(worldPos);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const worldPos = this.screenToWorld(pointer.x, pointer.y);
    if (!worldPos) return;

    const hex = pixelToHex(worldPos.x - this.gridOffsetX, worldPos.y - this.gridOffsetY);
    if (!isValidHex(hex.col, hex.row)) return;

    if (this.editorMode === 'tower') {
      this.handleTowerClick(hex);
    } else if (this.editorMode === 'path') {
      this.isDrawingPath = true;
      this.pathPoints = [];
      this.pathHexes = [];
      this.pathGraphics.clear();
      this.addPathPoint(hex);
    }
  }

  private handleTowerClick(hex: HexCoord): void {
    const key = `${hex.col},${hex.row}`;
    const existing = this.towers.get(key);

    if (existing) {
      this.selectTower(existing);
      return;
    }

    if (this.selectedTowerType) {
      this.placeTower(hex, this.selectedTowerType);
    }
  }

  private handleTowerHover(worldPos: { x: number; y: number }): void {
    for (const tower of this.towers.values()) {
      const tx = tower.getWorldX();
      const ty = tower.getWorldY();
      const dist = Phaser.Math.Distance.Between(worldPos.x, worldPos.y, tx, ty);
      if (dist < HEX_SIZE * 0.8) {
        tower.showRange();
      } else {
        tower.hideRange();
      }
    }
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } | null {
    if (sx > this.mapAreaWidth) return null;
    return { x: sx, y: sy };
  }

  private hexToWorld(col: number, row: number): { x: number; y: number } {
    const local = hexToPixel(col, row);
    return {
      x: local.x + this.gridOffsetX,
      y: local.y + this.gridOffsetY,
    };
  }

  private drawTowerPreview(hex: HexCoord): void {
    this.previewGraphics.clear();
    if (!this.selectedTowerType) return;

    const pos = this.hexToWorld(hex.col, hex.row);
    const corners = getHexCorners(pos.x, pos.y, HEX_SIZE);
    const key = `${hex.col},${hex.row}`;
    const occupied = this.towers.has(key);
    const config = TOWER_CONFIGS[this.selectedTowerType];
    const color = occupied ? 0xff3333 : config.color;

    this.previewGraphics.fillStyle(color, 0.2);
    this.previewGraphics.beginPath();
    this.previewGraphics.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      this.previewGraphics.lineTo(corners[i].x, corners[i].y);
    }
    this.previewGraphics.closePath();
    this.previewGraphics.fillPath();

    this.previewGraphics.lineStyle(2, color, 0.6);
    this.previewGraphics.beginPath();
    this.previewGraphics.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      this.previewGraphics.lineTo(corners[i].x, corners[i].y);
    }
    this.previewGraphics.closePath();
    this.previewGraphics.strokePath();

    if (!occupied) {
      this.previewGraphics.fillStyle(color, 0.4);
      this.previewGraphics.fillCircle(pos.x, pos.y, 6);
    }
  }

  private placeTower(hex: HexCoord, type: TowerType): void {
    const key = `${hex.col},${hex.row}`;
    if (this.towers.has(key)) return;

    const pos = this.hexToWorld(hex.col, hex.row);
    const tower = new Tower(this, hex.col, hex.row, type, pos.x, pos.y);
    tower.container.setDepth(10);
    this.towers.set(key, tower);

    tower.container.setInteractive(new Phaser.Geom.Circle(0, 0, HEX_SIZE), Phaser.Geom.Circle.Contains);
    tower.container.on('pointerdown', () => {
      this.selectTower(tower);
    });

    if (this.hoveredHex && this.hoveredHex.col === hex.col && this.hoveredHex.row === hex.row) {
      this.drawTowerPreview(this.hoveredHex);
    }
  }

  private removeTower(tower: Tower): void {
    const key = `${tower.col},${tower.row}`;
    this.towers.delete(key);
    tower.destroy();
    if (this.selectedTower === tower) {
      this.selectedTower = null;
      this.updatePropertyPanel();
    }
  }

  private selectTower(tower: Tower): void {
    if (this.selectedTower === tower) {
      this.removeTower(tower);
      return;
    }
    this.selectedTower = tower;
    this.updatePropertyPanel();
  }

  private addPathPoint(hex: HexCoord): void {
    if (this.pathHexes.length > 0) {
      const last = this.pathHexes[this.pathHexes.length - 1];
      if (last.col === hex.col && last.row === hex.row) return;
    }
    this.pathHexes.push(hex);
    const pos = this.hexToWorld(hex.col, hex.row);
    this.pathPoints.push({ x: pos.x, y: pos.y });
    this.drawPath();
  }

  private drawPath(): void {
    this.pathGraphics.clear();
    if (this.pathPoints.length < 2) {
      if (this.pathPoints.length === 1) {
        this.pathGraphics.fillStyle(0xffcc00, 0.8);
        this.pathGraphics.fillCircle(this.pathPoints[0].x, this.pathPoints[0].y, 5);
      }
      return;
    }

    this.pathGraphics.lineStyle(3, 0xffcc00, 0.7);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
    for (let i = 1; i < this.pathPoints.length; i++) {
      this.pathGraphics.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
    }
    this.pathGraphics.strokePath();

    this.pathGraphics.fillStyle(0xffcc00, 0.9);
    this.pathGraphics.fillCircle(this.pathPoints[0].x, this.pathPoints[0].y, 5);

    this.pathGraphics.fillStyle(0xff4444, 0.9);
    this.pathGraphics.fillCircle(this.pathPoints[this.pathPoints.length - 1].x, this.pathPoints[this.pathPoints.length - 1].y, 5);

    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i];
      const p2 = this.pathPoints[i + 1];
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      this.pathGraphics.save();
      this.pathGraphics.translateCanvas(mx, my);
      this.pathGraphics.rotateCanvas(angle);
      this.pathGraphics.fillStyle(0xffcc00, 0.9);
      this.pathGraphics.fillTriangle(8, 0, -4, -4, -4, 4);
      this.pathGraphics.restore();
    }
  }

  private startSimulation(): void {
    if (this.pathPoints.length < 2) return;
    if (this.simulating) return;

    this.simulating = true;
    this.editorMode = 'simulate';
    this.enemiesSpawned = 0;
    this.enemySpawnTimer = 0;
    this.updateToolbarSelection();

    const simBtn = document.getElementById('sim-btn');
    if (simBtn) simBtn.innerHTML = '<span class="btn-icon">■</span><span class="btn-label">模拟中...</span>';
  }

  private spawnEnemy(): void {
    if (this.enemiesSpawned >= this.totalEnemiesToSpawn) return;
    const hp = 80 + this.enemiesSpawned * 10;
    const speed = 60 + Math.random() * 20;
    const enemy = new Enemy(this, this.pathPoints, hp, speed, this.enemiesSpawned, this.totalEnemiesToSpawn);
    enemy.container.setDepth(15);
    this.enemies.push(enemy);
    this.enemiesSpawned++;
  }

  private resetAll(): void {
    this.simulating = false;
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies = [];
    for (const beam of this.laserBeams) {
      beam.graphic.destroy();
    }
    this.laserBeams = [];
    for (const tower of this.towers.values()) {
      tower.destroy();
    }
    this.towers.clear();
    this.pathPoints = [];
    this.pathHexes = [];
    this.pathGraphics.clear();
    this.pulseGraphics.clear();
    this.selectedTower = null;
    this.selectedTowerType = TowerType.Arrow;
    this.editorMode = 'tower';
    this.enemiesSpawned = 0;
    this.updatePropertyPanel();
    this.updateToolbarSelection();

    const simBtn = document.getElementById('sim-btn');
    if (simBtn) simBtn.innerHTML = '<span class="btn-icon">▶</span><span class="btn-label">开始模拟</span>';
  }

  private updateToolbarSelection(): void {
    const towerTypes: TowerType[] = [TowerType.Arrow, TowerType.Cannon, TowerType.Magic, TowerType.Slow];
    for (const type of towerTypes) {
      const btn = this.towerButtons.get(type);
      if (btn) {
        btn.classList.toggle('active', this.editorMode === 'tower' && this.selectedTowerType === type);
      }
    }

    const pathBtn = document.getElementById('path-btn');
    if (pathBtn) pathBtn.classList.toggle('active', this.editorMode === 'path');

    const simBtn = document.getElementById('sim-btn');
    if (simBtn) simBtn.classList.toggle('active', this.editorMode === 'simulate');
  }

  private updatePropertyPanel(): void {
    if (!this.propertyPanelEl) return;

    if (this.selectedTower) {
      const config = this.selectedTower.config;
      const colorHex = '#' + config.color.toString(16).padStart(6, '0');
      this.propertyPanelEl.innerHTML = `
        <div class="prop-header">
          <span class="prop-dot" style="background:${colorHex}"></span>
          <span class="prop-name">${config.name}</span>
        </div>
        <div class="prop-row"><span class="prop-label">攻击力</span><span class="prop-value">${this.selectedTower.attack}</span></div>
        <div class="prop-row"><span class="prop-label">射程</span><span class="prop-value">${this.selectedTower.range}px</span></div>
        <div class="prop-row"><span class="prop-label">造价</span><span class="prop-value">$${this.selectedTower.cost}</span></div>
        <div class="prop-row"><span class="prop-label">攻速</span><span class="prop-value">${this.selectedTower.fireRate}ms</span></div>
        <div class="prop-row"><span class="prop-label">位置</span><span class="prop-value">(${this.selectedTower.col}, ${this.selectedTower.row})</span></div>
        <button class="remove-btn" id="remove-tower-btn">移除此塔</button>
      `;
      const removeBtn = document.getElementById('remove-tower-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          if (this.selectedTower) {
            this.removeTower(this.selectedTower);
          }
        });
      }
    } else {
      this.propertyPanelEl.innerHTML = `
        <div class="prop-empty">
          <div class="prop-empty-icon">Tower</div>
          <div class="prop-empty-text">点击地图上的防御塔查看属性</div>
          <div class="prop-empty-hint">再次点击可移除</div>
        </div>
      `;
    }
  }

  update(time: number, delta: number): void {
    this.updateFPS(delta);

    if (!this.simulating) return;

    this.enemySpawnTimer += delta;
    if (this.enemySpawnTimer >= 500 && this.enemiesSpawned < this.totalEnemiesToSpawn) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
    }

    for (const enemy of this.enemies) {
      enemy.update(delta);
    }

    this.handleTowerAttacks(time);

    this.updateLaserBeams(time);
    this.updatePulseEffects(time, delta);

    this.enemies = this.enemies.filter((e) => {
      if (!e.alive) {
        e.destroy();
        return false;
      }
      if (e.reachedEnd) {
        e.destroy();
        return false;
      }
      return true;
    });

    if (this.enemies.length === 0 && this.enemiesSpawned >= this.totalEnemiesToSpawn) {
      this.simulating = false;
      this.editorMode = 'tower';
      this.updateToolbarSelection();
      const simBtn = document.getElementById('sim-btn');
      if (simBtn) simBtn.innerHTML = '<span class="btn-icon">▶</span><span class="btn-label">开始模拟</span>';
    }
  }

  private handleTowerAttacks(time: number): void {
    for (const tower of this.towers.values()) {
      if (!tower.canFire(time)) continue;

      let closestEnemy: Enemy | null = null;
      let closestDist = Infinity;

      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.reachedEnd) continue;
        const dist = Phaser.Math.Distance.Between(
          tower.getWorldX(),
          tower.getWorldY(),
          enemy.getWorldX(),
          enemy.getWorldY()
        );
        if (dist <= tower.range && dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }

      if (closestEnemy) {
        tower.fire(time);
        closestEnemy.takeDamage(tower.attack);

        if (tower.towerType === TowerType.Slow) {
          closestEnemy.applySlow(0.5, 2000);
        }

        this.createLaserBeam(
          tower.getWorldX(),
          tower.getWorldY(),
          closestEnemy.getWorldX(),
          closestEnemy.getWorldY(),
          time
        );
      }
    }
  }

  private createLaserBeam(x1: number, y1: number, x2: number, y2: number, time: number): void {
    const graphic = this.add.graphics();
    graphic.setDepth(20);
    graphic.lineStyle(2, 0xffffff, 0.9);
    graphic.beginPath();
    graphic.moveTo(x1, y1);
    graphic.lineTo(x2, y2);
    graphic.strokePath();

    graphic.lineStyle(4, 0xffffff, 0.3);
    graphic.beginPath();
    graphic.moveTo(x1, y1);
    graphic.lineTo(x2, y2);
    graphic.strokePath();

    this.laserBeams.push({ graphic, startTime: time, duration: 150 });
  }

  private updateLaserBeams(time: number): void {
    this.laserBeams = this.laserBeams.filter((beam) => {
      const elapsed = time - beam.startTime;
      if (elapsed >= beam.duration) {
        beam.graphic.destroy();
        return false;
      }
      const alpha = 1 - elapsed / beam.duration;
      beam.graphic.setAlpha(alpha);
      return true;
    });
  }

  private updatePulseEffects(time: number, delta: number): void {
    this.pulseGraphics.clear();

    if (this.pathPoints.length < 2) return;

    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.reachedEnd) continue;
      const ex = enemy.getWorldX();
      const ey = enemy.getWorldY();

      this.pulseGraphics.lineStyle(5, 0xffcc00, 0.4);
      this.pulseGraphics.strokeCircle(ex, ey, 12 + Math.sin(time * 0.008) * 3);

      for (let i = 0; i < this.pathPoints.length - 1; i++) {
        const p1 = this.pathPoints[i];
        const p2 = this.pathPoints[i + 1];
        const segLen = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        const t1 = Phaser.Math.Distance.Between(ex, ey, p1.x, p1.y);
        const t2 = Phaser.Math.Distance.Between(ex, ey, p2.x, p2.y);

        if (t1 < 60 || t2 < 60 || (t1 + t2 - segLen) < 15) {
          this.pulseGraphics.lineStyle(4, 0xffcc00, 0.5);
          this.pulseGraphics.beginPath();
          this.pulseGraphics.moveTo(p1.x, p1.y);
          this.pulseGraphics.lineTo(p2.x, p2.y);
          this.pulseGraphics.strokePath();
        }
      }
    }
  }

  private updateFPS(delta: number): void {
    if (delta > 0) {
      const fps = 1000 / delta;
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 60) this.fpsHistory.shift();
    }
    if (this.fpsHistory.length > 0 && this.time.now % 200 < delta) {
      const avg = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      const color = avg >= 55 ? '#66ffaa' : avg >= 30 ? '#ffcc44' : '#ff4444';
      this.fpsText.setColor(color);
      this.fpsText.setText(`FPS: ${Math.round(avg)}`);
    }
  }
}
