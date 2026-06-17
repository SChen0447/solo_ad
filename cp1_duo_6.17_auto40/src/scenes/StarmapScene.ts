import Phaser from 'phaser';
import { fleetManager, ShipData, StarSystem } from '../data/FleetManager';
import { commandPanel } from '../ui/CommandPanel';

interface ShipSprite {
  id: string;
  sprite: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  ghost: Phaser.GameObjects.Graphics | null;
  trailParticles: Phaser.GameObjects.Particles.ParticleEmitter | null;
  lastGhostTime: number;
  lastTrailTime: number;
  prevX: number;
  prevY: number;
  alpha: number;
  dying: boolean;
  deathTimer: number;
}

export class StarmapScene extends Phaser.Scene {
  private starSystems: StarSystem[] = [];
  private systemGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private connectionGraphics: Phaser.GameObjects.Graphics | null = null;
  private shipSprites: Map<string, ShipSprite> = new Map();
  private enemySprites: Map<string, ShipSprite> = new Map();
  private pathPreview: Phaser.GameObjects.Graphics | null = null;
  private explosionParticles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private selectedSystemId: string | null = null;
  private pollTimer: number = 0;
  private pathDots: { x: number; y: number; offset: number }[] = [];
  private pathDotTimer: number = 0;

  constructor() {
    super('StarmapScene');
  }

  create(): void {
    this.starSystems = fleetManager.getStarSystems();
    this.drawConnections();
    this.drawStarSystems();
    this.createShips();
    this.createEnemyShips();
    this.setupInput();

    fleetManager.subscribe(() => this.onDataUpdate());
    this.scale.on('resize', () => this.onResize());
  }

  update(time: number, delta: number): void {
    this.pollTimer += delta;
    if (this.pollTimer >= 2000) {
      this.pollTimer = 0;
      fleetManager.queryStatus();
    }

    this.updateShipPositions(delta);
    this.updatePathAnimation(delta);
    this.updateExplosions();
    this.checkBattleEffects();
  }

  private drawConnections(): void {
    if (this.connectionGraphics) {
      this.connectionGraphics.destroy();
    }
    this.connectionGraphics = this.add.graphics();
    this.connectionGraphics.setDepth(0);

    const drawn = new Set<string>();

    for (const sys of this.starSystems) {
      for (const connId of sys.connections) {
        const key = [sys.id, connId].sort().join('-');
        if (drawn.has(key)) continue;
        drawn.add(key);

        const target = this.starSystems.find(s => s.id === connId);
        if (!target) continue;

        this.connectionGraphics.lineStyle(1, 0xa8d8ea, 0.3);
        this.connectionGraphics.beginPath();
        const dx = target.x - sys.x;
        const dy = target.y - sys.y;
        const segments = 20;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const x = sys.x + dx * t;
          const y = sys.y + dy * t;
          if (i % 2 === 0) {
            this.connectionGraphics.moveTo(x, y);
          } else {
            this.connectionGraphics.lineTo(x, y);
          }
        }
        this.connectionGraphics.strokePath();
      }
    }
  }

  private drawStarSystems(): void {
    for (const [, g] of this.systemGraphics) {
      g.destroy();
    }
    this.systemGraphics.clear();

    for (const sys of this.starSystems) {
      const g = this.add.graphics();
      g.setDepth(1);
      this.drawSystemNode(g, sys);
      this.systemGraphics.set(sys.id, g);

      g.setInteractive(
        new Phaser.Geom.Circle(sys.x, sys.y, 25),
        Phaser.Geom.Circle.Contains
      );

      g.on('pointerdown', () => this.onSystemClick(sys));
      g.on('pointerover', () => this.onSystemHover(sys, true));
      g.on('pointerout', () => this.onSystemHover(sys, false));

      const text = this.add.text(sys.x, sys.y + 30, sys.name, {
        fontSize: '11px',
        color: '#a8d8ea',
        align: 'center'
      }).setOrigin(0.5).setDepth(1);
      this.systemGraphics.set(sys.id + '_text', text as unknown as Phaser.GameObjects.Graphics);
    }
  }

  private drawSystemNode(g: Phaser.GameObjects.Graphics, sys: StarSystem): void {
    const colorMap: Record<string, number> = {
      home: 0xf0d060,
      mining: 0xc0c0d0,
      outpost: 0x4488ff
    };
    const color = colorMap[sys.type] || 0xffffff;

    g.clear();

    g.lineStyle(2, color, 0.3);
    g.strokeCircle(sys.x, sys.y, 22);

    g.lineStyle(2, color, 0.6);
    g.strokeCircle(sys.x, sys.y, 16);

    g.fillStyle(color, 1);
    g.fillCircle(sys.x, sys.y, 10);

    g.fillStyle(color, 0.3);
    g.fillCircle(sys.x, sys.y, 18);
  }

  private createShips(): void {
    const ships = fleetManager.getShips();
    for (const ship of ships) {
      const s = this.createShipSprite(ship, 0x44ff88);
      this.shipSprites.set(ship.id, s);
    }
  }

  private createEnemyShips(): void {
    const enemies = fleetManager.getEnemyShips();
    for (const enemy of enemies) {
      const s = this.createShipSprite(enemy, 0xff4444);
      this.enemySprites.set(enemy.id, s);
    }
  }

  private createShipSprite(ship: ShipData, color: number): ShipSprite {
    const sprite = this.add.graphics();
    sprite.setDepth(10);
    this.drawShipIcon(sprite, ship.x, ship.y, color, ship.stars);

    const glow = this.add.graphics();
    glow.setDepth(9);

    const shipSprite: ShipSprite = {
      id: ship.id,
      sprite,
      glow,
      ghost: null,
      trailParticles: null,
      lastGhostTime: 0,
      lastTrailTime: 0,
      prevX: ship.x,
      prevY: ship.y,
      alpha: 1,
      dying: false,
      deathTimer: 0
    };

    sprite.setInteractive(
      new Phaser.Geom.Circle(0, 0, 15),
      Phaser.Geom.Circle.Contains
    );

    sprite.on('pointerdown', () => {
      if (ship.faction === 'player' && ship.alive) {
        const selected = fleetManager.getSelectedShip();
        if (selected && selected.id === ship.id) {
          fleetManager.setSelectedShip(null);
        } else {
          fleetManager.setSelectedShip(ship.id);
        }
      }
    });

    return shipSprite;
  }

  private drawShipIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, stars: number): void {
    g.clear();
    g.savePosition();
    g.x = x;
    g.y = y;

    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(8, 8);
    g.lineTo(0, 4);
    g.lineTo(-8, 8);
    g.closePath();
    g.fillPath();

    g.lineStyle(1, color, 0.6);
    g.strokePath();

    const glowSize = 6 + stars * 1.5;
    g.fillStyle(color, 0.2);
    g.fillCircle(0, 0, glowSize);
  }

  private setupInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleHover(pointer);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.downElement === this.game.canvas) {
      }
    });
  }

  private handleHover(pointer: Phaser.Input.Pointer): void {
    // Handle connection hover effects
  }

  private onSystemClick(sys: StarSystem): void {
    this.selectedSystemId = sys.id;
    commandPanel.setTargetSystem(sys.id, sys.name);
    this.updatePathPreview();
    this.highlightSystem(sys.id);
  }

  private onSystemHover(sys: StarSystem, over: boolean): void {
    const g = this.systemGraphics.get(sys.id);
    if (!g) return;

    if (over) {
      this.game.canvas.style.cursor = 'pointer';
    } else {
      this.game.canvas.style.cursor = 'default';
    }
  }

  private highlightSystem(systemId: string): void {
    for (const [id, g] of this.systemGraphics) {
      if (id.endsWith('_text')) continue;
      const sys = this.starSystems.find(s => s.id === id);
      if (!sys) continue;

      if (id === systemId) {
        const colorMap: Record<string, number> = {
          home: 0xf0d060,
          mining: 0xc0c0d0,
          outpost: 0x4488ff
        };
        const color = colorMap[sys.type] || 0xffffff;
        g.clear();
        g.lineStyle(3, 0xf0d060, 0.8);
        g.strokeCircle(sys.x, sys.y, 28);
        g.lineStyle(2, color, 0.6);
        g.strokeCircle(sys.x, sys.y, 16);
        g.fillStyle(color, 1);
        g.fillCircle(sys.x, sys.y, 10);
        g.fillStyle(color, 0.3);
        g.fillCircle(sys.x, sys.y, 18);
      } else {
        this.drawSystemNode(g, sys);
      }
    }
  }

  private async updatePathPreview(): Promise<void> {
    const selectedShip = fleetManager.getSelectedShip();
    if (!selectedShip || !this.selectedSystemId) {
      this.clearPathPreview();
      return;
    }

    const nearest = fleetManager.findNearestSystem(selectedShip.x, selectedShip.y);
    if (!nearest) return;

    const path = await fleetManager.findPath(nearest.id, this.selectedSystemId);
    this.drawPathPreview(path);
  }

  private clearPathPreview(): void {
    if (this.pathPreview) {
      this.pathPreview.destroy();
      this.pathPreview = null;
    }
    this.pathDots = [];
  }

  private drawPathPreview(path: StarSystem[]): void {
    this.clearPathPreview();
    if (path.length < 2) return;

    this.pathPreview = this.add.graphics();
    this.pathPreview.setDepth(2);

    this.pathDots = [];
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.floor(dist / 15);
      for (let j = 0; j < steps; j++) {
        const t = j / steps;
        this.pathDots.push({
          x: from.x + dx * t,
          y: from.y + dy * t,
          offset: j
        });
      }
    }
  }

  private updatePathAnimation(delta: number): void {
    if (!this.pathPreview || this.pathDots.length === 0) return;

    this.pathDotTimer += delta;
    const phase = (this.pathDotTimer % 1000) / 1000;

    this.pathPreview.clear();

    for (let i = 0; i < this.pathDots.length; i++) {
      const dot = this.pathDots[i];
      const t = ((dot.offset * 0.1 + phase) % 1);
      const alpha = Math.sin(t * Math.PI);
      this.pathPreview.fillStyle(0x44ff66, alpha * 0.8);
      this.pathPreview.fillCircle(dot.x, dot.y, 2);
    }
  }

  private updateShipPositions(delta: number): void {
    const ships = fleetManager.getShips();
    const enemies = fleetManager.getEnemyShips();

    const now = this.time.now;

    for (const ship of ships) {
      const sprite = this.shipSprites.get(ship.id);
      if (!sprite) continue;
      this.updateSingleShip(sprite, ship, delta, now, 0x44ff88);
    }

    for (const enemy of enemies) {
      const sprite = this.enemySprites.get(enemy.id);
      if (!sprite) continue;
      this.updateSingleShip(sprite, enemy, delta, now, 0xff4444);
    }

    this.updateSelectionGlow();
  }

  private updateSingleShip(
    sprite: ShipSprite,
    ship: ShipData,
    delta: number,
    now: number,
    color: number
  ): void {
    if (!ship.alive && !sprite.dying) {
      sprite.dying = true;
      sprite.deathTimer = 0;
      this.spawnExplosion(ship.x, ship.y);
    }

    if (sprite.dying) {
      sprite.deathTimer += delta;
      const t = sprite.deathTimer / 500;
      sprite.alpha = Math.max(0, 1 - t);
      sprite.sprite.alpha = sprite.alpha;
      sprite.glow.alpha = sprite.alpha;
      if (sprite.deathTimer >= 500) {
        sprite.sprite.setVisible(false);
        sprite.glow.setVisible(false);
      }
      return;
    }

    const moving = ship.status === 'moving' || ship.status === 'patrol';
    if (moving && now - sprite.lastGhostTime > 2000) {
      sprite.lastGhostTime = now;
      this.createGhost(sprite, ship, color);
    }

    if (moving && now - sprite.lastTrailTime > 80) {
      sprite.lastTrailTime = now;
      this.spawnTrailParticle(ship.x, ship.y, color);
    }

    sprite.prevX = sprite.sprite.x;
    sprite.prevY = sprite.sprite.y;
    sprite.sprite.x = ship.x;
    sprite.sprite.y = ship.y;
  }

  private createGhost(sprite: ShipSprite, ship: ShipData, color: number): void {
    if (sprite.ghost) {
      sprite.ghost.destroy();
    }

    const ghost = this.add.graphics();
    ghost.setDepth(8);
    ghost.x = ship.x;
    ghost.y = ship.y;
    ghost.alpha = 0.3;

    ghost.fillStyle(color, 0.3);
    ghost.beginPath();
    ghost.moveTo(0, -12);
    ghost.lineTo(8, 8);
    ghost.lineTo(0, 4);
    ghost.lineTo(-8, 8);
    ghost.closePath();
    ghost.fillPath();

    sprite.ghost = ghost;

    this.tweens.add({
      targets: ghost,
      x: ship.x + 10,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        ghost.destroy();
        if (sprite.ghost === ghost) {
          sprite.ghost = null;
        }
      }
    });
  }

  private spawnTrailParticle(x: number, y: number, color: number): void {
    const particle = this.add.graphics();
    particle.setDepth(7);
    particle.x = x;
    particle.y = y;
    particle.fillStyle(0x88ccff, 0.3);
    particle.fillCircle(0, 0, 3);

    this.tweens.add({
      targets: particle,
      alpha: 0,
      scale: 0.5,
      duration: 500,
      onComplete: () => particle.destroy()
    });
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15 + Math.random() * 0.5;
      const speed = 30 + Math.random() * 50;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 2 + Math.random() * 2;
      const life = 800 + Math.random() * 400;

      const p = this.add.graphics();
      p.setDepth(15);
      p.x = x;
      p.y = y;
      const color = Math.random() > 0.5 ? 0xffcc00 : 0xff6600;
      p.fillStyle(color, 1);
      p.fillCircle(0, 0, size);

      const startTime = this.time.now;
      const updateExplosionParticle = () => {
        const elapsed = this.time.now - startTime;
        if (elapsed > life) {
          p.destroy();
          return;
        }
        const t = elapsed / life;
        p.x = x + vx * t;
        p.y = y + vy * t;
        p.alpha = 1 - t;
        p.scale = 1 - t * 0.5;
        requestAnimationFrame(updateExplosionParticle);
      };
      updateExplosionParticle();
    }
  }

  private updateExplosions(): void {
    // Explosions are handled via individual tweens
  }

  private checkBattleEffects(): void {
    const ships = fleetManager.getShips();
    const enemies = fleetManager.getEnemyShips();

    for (const ship of ships) {
      if (!ship.alive || ship.status !== 'battle') continue;
      for (const enemy of enemies) {
        if (!enemy.alive || enemy.status !== 'battle') continue;
        const dist = Math.sqrt((ship.x - enemy.x) ** 2 + (ship.y - enemy.y) ** 2);
        if (dist < 80) {
          if (Math.random() < 0.1) {
            const midX = (ship.x + enemy.x) / 2;
            const midY = (ship.y + enemy.y) / 2;
            this.spawnBattleSpark(midX, midY);
          }
        }
      }
    }
  }

  private spawnBattleSpark(x: number, y: number): void {
    const p = this.add.graphics();
    p.setDepth(12);
    p.x = x + (Math.random() - 0.5) * 30;
    p.y = y + (Math.random() - 0.5) * 30;
    p.fillStyle(0xffaa00, 1);
    p.fillCircle(0, 0, 2 + Math.random() * 2);

    this.tweens.add({
      targets: p,
      alpha: 0,
      y: p.y + 10,
      duration: 600,
      onComplete: () => p.destroy()
    });
  }

  private updateSelectionGlow(): void {
    const selected = fleetManager.getSelectedShip();

    for (const [id, sprite] of this.shipSprites) {
      const ship = fleetManager.getShips().find(s => s.id === id);
      if (!ship) continue;

      sprite.glow.clear();

      if (selected && selected.id === id) {
        sprite.glow.lineStyle(2, 0xf0d060, 0.8);
        sprite.glow.strokeCircle(ship.x, ship.y, 18);
        sprite.glow.lineStyle(1, 0xf0d060, 0.4);
        sprite.glow.strokeCircle(ship.x, ship.y, 22);
      }
    }
  }

  private onDataUpdate(): void {
    const newSystems = fleetManager.getStarSystems();
    if (newSystems.length !== this.starSystems.length) {
      this.starSystems = newSystems;
      this.drawConnections();
      this.drawStarSystems();
    }

    const ships = fleetManager.getShips();
    for (const ship of ships) {
      if (!this.shipSprites.has(ship.id)) {
        const s = this.createShipSprite(ship, 0x44ff88);
        this.shipSprites.set(ship.id, s);
      }
    }

    const enemies = fleetManager.getEnemyShips();
    for (const enemy of enemies) {
      if (!this.enemySprites.has(enemy.id)) {
        const s = this.createShipSprite(enemy, 0xff4444);
        this.enemySprites.set(enemy.id, s);
      }
    }
  }

  private onResize(): void {
    this.cameras.main.setSize(
      this.game.scale.width,
      this.game.scale.height
    );
  }
}
