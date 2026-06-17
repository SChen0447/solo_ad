import Phaser from 'phaser';
import { fleetManager, Ship, StarSystem } from '../data/FleetManager';

export class StarmapScene extends Phaser.Scene {
  private selectedShipId: string | null = null;
  private selectedTargetNode: number | null = null;
  private currentPath: number[] = [];
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private flowGraphics!: Phaser.GameObjects.Graphics;
  private routeGraphics!: Phaser.GameObjects.Graphics;
  private highlightRouteGraphics!: Phaser.GameObjects.Graphics;
  private nodeSprites: Map<number, Phaser.GameObjects.Arc> = new Map();
  private nodeGlows: Map<number, Phaser.GameObjects.Arc> = new Map();
  private shipSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private enemySprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private statusDots: Map<string, Phaser.GameObjects.Arc> = new Map();
  private trailEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
  private explosionEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private ghostSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private starSystems: StarSystem[] = [];
  private routes: [number, number][] = [];
  private pollingTimer?: Phaser.Time.TimerEvent;
  private ghostTimer?: Phaser.Time.TimerEvent;
  private flowOffset: number = 0;
  private combatPositions: { x: number; y: number; timer: number }[] = [];
  private prevShipStatuses: Map<string, string> = new Map();
  private hoveredRoute: [number, number] | null = null;

  constructor() {
    super({ key: 'StarmapScene' });
  }

  async create(): Promise<void> {
    this.pathGraphics = this.add.graphics();
    this.flowGraphics = this.add.graphics();
    this.routeGraphics = this.add.graphics();
    this.highlightRouteGraphics = this.add.graphics();

    this.drawStarfield();

    try {
      const data = await fleetManager.initFleet();
      this.starSystems = data.star_systems;
      this.routes = data.routes as [number, number][];
      this.drawRoutes();
      this.drawNodes();
      this.createShipSprites(data.fleet);
      this.createEnemySprites(data.enemy_fleet);
    } catch (e) {
      console.error('Failed to init fleet:', e);
      return;
    }

    this.pollingTimer = this.time.addEvent({
      delay: 2000,
      callback: this.pollStatus,
      callbackScope: this,
      loop: true,
    });

    this.ghostTimer = this.time.addEvent({
      delay: 2000,
      callback: this.createGhostImages,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: 16,
      callback: this.updateAnimations,
      callbackScope: this,
      loop: true,
    });

    this.scale.on('resize', this.handleResize, this);

    this.input.on('gameobjectdown', this.handleObjectClick, this);
    this.input.on('pointermove', this.handlePointerMove, this);
  }

  private drawStarfield(): void {
    const g = this.add.graphics();
    for (let i = 0; i < 300; i++) {
      const x = Phaser.Math.Between(0, 2000);
      const y = Phaser.Math.Between(0, 1200);
      const a = Phaser.Math.FloatBetween(0.1, 0.6);
      const r = Phaser.Math.Between(0, 2);
      g.fillStyle(0xa8d8ea, a);
      g.fillCircle(x, y, r);
    }
  }

  private drawRoutes(): void {
    this.routeGraphics.clear();
    this.routeGraphics.lineStyle(1, 0xffffff, 0.15);
    for (const [a, b] of this.routes) {
      const sa = this.starSystems[a];
      const sb = this.starSystems[b];
      if (!sa || !sb) continue;
      this.routeGraphics.lineBetween(sa.x, sa.y, sb.x, sb.y);
    }
  }

  private drawHighlightRoute(a: number, b: number): void {
    this.highlightRouteGraphics.clear();
    const sa = this.starSystems[a];
    const sb = this.starSystems[b];
    if (!sa || !sb) return;
    this.highlightRouteGraphics.lineStyle(2, 0xffffff, 0.6);
    this.highlightRouteGraphics.lineBetween(sa.x, sa.y, sb.x, sb.y);
  }

  private clearHighlightRoute(): void {
    this.highlightRouteGraphics.clear();
  }

  private drawNodes(): void {
    for (const sys of this.starSystems) {
      let color = 0xa8d8ea;
      if (sys.type === 'home') color = 0xf0d060;
      else if (sys.type === 'mineral') color = 0xc0c0c0;
      else if (sys.type === 'outpost') color = 0x4488ff;

      const glow = this.add.circle(sys.x, sys.y, 18, color, 0.15);
      this.nodeGlows.set(sys.id, glow);

      const node = this.add.circle(sys.x, sys.y, 10, color, 0.8);
      node.setStrokeStyle(2, color, 1);
      node.setInteractive({ useHandCursor: true });
      node.setData('nodeId', sys.id);
      this.nodeSprites.set(sys.id, node);

      const label = this.add.text(sys.x, sys.y + 20, sys.name, {
        fontSize: '10px',
        color: '#a8d8ea',
        align: 'center',
      }).setOrigin(0.5);
    }
  }

  private createShipSprite(ship: Ship, isEnemy: boolean): Phaser.GameObjects.Container {
    const color = isEnemy ? 0xff4444 : 0x44ff88;
    const container = this.add.container(ship.x, ship.y);

    const body = this.add.triangle(0, 0, 0, -8, -6, 6, 6, 6, color);
    container.add(body);

    const glow = this.add.circle(0, 0, 12, color, 0);
    container.add(glow);
    container.setData('glow', glow);
    container.setData('shipId', ship.id);
    container.setData('isEnemy', isEnemy);

    const nameText = this.add.text(0, -18, ship.name, {
      fontSize: '9px',
      color: isEnemy ? '#ff6666' : '#a8d8ea',
    }).setOrigin(0.5);
    container.add(nameText);

    container.setSize(16, 16);
    if (!isEnemy) {
      container.setInteractive({ useHandCursor: true });
      container.setData('clickable', true);
    }

    return container;
  }

  private createShipSprites(fleet: Ship[]): void {
    for (const ship of fleet) {
      const sprite = this.createShipSprite(ship, false);
      this.shipSprites.set(ship.id, sprite);
      this.createTrailEmitter(ship.id, ship.x, ship.y, false);
    }
  }

  private createEnemySprites(enemyFleet: Ship[]): void {
    for (const ship of enemyFleet) {
      const sprite = this.createShipSprite(ship, true);
      this.enemySprites.set(ship.id, sprite);
      this.createTrailEmitter(ship.id, ship.x, ship.y, true);
    }
  }

  private createTrailEmitter(shipId: string, x: number, y: number, isEnemy: boolean): void {
    const color = isEnemy ? 0xff4444 : 0x88ccff;
    const textureKey = `trail_${shipId}`;
    const g = this.add.graphics();
    g.fillStyle(color, 0.3);
    g.fillCircle(3, 3, 3);
    g.generateTexture(textureKey, 6, 6);
    g.destroy();

    const emitter = this.add.particles(x, y, textureKey, {
      speed: { min: 5, max: 20 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: 500,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      quantity: 2,
    });
    this.trailEmitters.set(shipId, emitter);
  }

  private createExplosionAt(x: number, y: number): void {
    const textureKey = `explosion_${Date.now()}_${Math.random()}`;
    const g = this.add.graphics();
    g.fillStyle(0xff8800, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture(textureKey, 4, 4);
    g.destroy();

    const emitter = this.add.particles(x, y, textureKey, {
      speed: { min: 20, max: 80 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      quantity: 8,
    });
    emitter.explode(8);
    this.explosionEmitters.push(emitter);

    this.time.delayedCall(1500, () => {
      emitter.destroy();
      this.explosionEmitters = this.explosionEmitters.filter(e => e !== emitter);
    });
  }

  private async pollStatus(): Promise<void> {
    try {
      const data = await fleetManager.queryStatus();
      this.updateShipPositions(data.fleet, false);
      this.updateShipPositions(data.enemy_fleet, true);
      this.checkCombatEffects(data.fleet, data.enemy_fleet);
    } catch (e) {
      console.error('Poll status failed:', e);
    }
  }

  private updateShipPositions(ships: Ship[], isEnemy: boolean): void {
    const spriteMap = isEnemy ? this.enemySprites : this.shipSprites;
    for (const ship of ships) {
      const sprite = spriteMap.get(ship.id);
      if (!sprite) continue;

      if (ship.hp <= 0) {
        this.tweens.add({
          targets: sprite,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            sprite.destroy();
            spriteMap.delete(ship.id);
            const emitter = this.trailEmitters.get(ship.id);
            if (emitter) {
              emitter.destroy();
              this.trailEmitters.delete(ship.id);
            }
          },
        });
        continue;
      }

      const dx = ship.x - sprite.x;
      const dy = ship.y - sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        this.tweens.add({
          targets: sprite,
          x: ship.x,
          y: ship.y,
          duration: 1800,
          ease: 'Linear',
        });

        const emitter = this.trailEmitters.get(ship.id);
        if (emitter && ship.status === 'moving') {
          emitter.setPosition(ship.x, ship.y);
          emitter.start();
          this.time.delayedCall(2000, () => {
            if (emitter && emitter.active) emitter.stop();
          });
        }
      }

      const glow = sprite.getData('glow') as Phaser.GameObjects.Arc;
      if (glow) {
        if (this.selectedShipId === ship.id) {
          glow.setAlpha(0.3 + Math.sin(this.time.now / 300) * 0.15);
        } else {
          glow.setAlpha(0);
        }
      }
    }
  }

  private checkCombatEffects(fleet: Ship[], enemyFleet: Ship[]): void {
    for (const ps of fleet) {
      if (ps.hp <= 0) continue;
      for (const es of enemyFleet) {
        if (es.hp <= 0) continue;
        const dist = Math.sqrt((ps.x - es.x) ** 2 + (ps.y - es.y) ** 2);
        if (dist < 80) {
          const mx = (ps.x + es.x) / 2;
          const my = (ps.y + es.y) / 2;
          const existing = this.combatPositions.find(
            c => Math.abs(c.x - mx) < 40 && Math.abs(c.y - my) < 40
          );
          if (!existing) {
            this.combatPositions.push({ x: mx, y: my, timer: this.time.now });
          }
        }
      }
    }

    this.combatPositions = this.combatPositions.filter(c => this.time.now - c.timer < 3000);
  }

  private createGhostImages(): void {
    const allSprites = new Map([...this.shipSprites, ...this.enemySprites]);
    for (const [id, sprite] of allSprites) {
      const ship = fleetManager.getShipById(id);
      if (!ship || ship.status !== 'moving') continue;

      if (this.ghostSprites.has(id)) {
        const old = this.ghostSprites.get(id)!;
        old.destroy();
        this.ghostSprites.delete(id);
      }

      const color = ship.faction === 'enemy' ? 0xff4444 : 0x44ff88;
      const ghost = this.add.triangle(
        sprite.x - 10,
        sprite.y,
        0, -8, -6, 6, 6, 6,
        color
      );
      ghost.setAlpha(0.3);
      this.ghostSprites.set(id, ghost);

      this.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          ghost.destroy();
          this.ghostSprites.delete(id);
        },
      });
    }
  }

  private updateAnimations(): void {
    this.flowOffset += 0.05;
    this.drawFlowingPath();

    if (this.combatPositions.length > 0) {
      for (const cp of this.combatPositions) {
        if (Math.random() < 0.15) {
          this.createExplosionAt(
            cp.x + Phaser.Math.Between(-20, 20),
            cp.y + Phaser.Math.Between(-20, 20)
          );
        }
      }
    }

    this.updateNodeGlows();
  }

  private drawFlowingPath(): void {
    this.flowGraphics.clear();
    if (this.currentPath.length < 2) return;

    this.flowGraphics.lineStyle(2, 0x44ff88, 0.6);
    for (let i = 0; i < this.currentPath.length - 1; i++) {
      const a = this.starSystems[this.currentPath[i]];
      const b = this.starSystems[this.currentPath[i + 1]];
      if (!a || !b) continue;
      this.flowGraphics.lineBetween(a.x, a.y, b.x, b.y);
    }

    for (let i = 0; i < this.currentPath.length - 1; i++) {
      const a = this.starSystems[this.currentPath[i]];
      const b = this.starSystems[this.currentPath[i + 1]];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.floor(dist / 20);
      for (let s = 0; s < steps; s++) {
        const t = ((s / steps) + this.flowOffset) % 1;
        const px = a.x + dx * t;
        const py = a.y + dy * t;
        this.flowGraphics.fillStyle(0x44ff88, 0.8);
        this.flowGraphics.fillCircle(px, py, 2);
      }
    }
  }

  private updateNodeGlows(): void {
    for (const [id, glow] of this.nodeGlows) {
      const baseAlpha = 0.15;
      const pulse = Math.sin(this.time.now / 800 + id) * 0.05;
      glow.setAlpha(baseAlpha + pulse);
    }
  }

  private handleObjectClick(
    pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject
  ): void {
    const nodeId = gameObject.getData('nodeId');
    const shipId = gameObject.getData('shipId');
    const isEnemy = gameObject.getData('isEnemy');

    if (nodeId !== undefined && nodeId !== null) {
      this.handleNodeClick(nodeId);
    } else if (shipId !== undefined && !isEnemy) {
      this.handleShipClick(shipId);
    }
  }

  private handleShipClick(shipId: string): void {
    if (this.selectedShipId === shipId) {
      this.selectedShipId = null;
      this.currentPath = [];
      this.flowGraphics.clear();
    } else {
      this.selectedShipId = shipId;
      this.currentPath = [];
      this.flowGraphics.clear();
    }
    this.updateShipSelection();
  }

  private async handleNodeClick(nodeId: number): Promise<void> {
    if (!this.selectedShipId) return;

    const ship = fleetManager.getShipById(this.selectedShipId);
    if (!ship) return;

    this.selectedTargetNode = nodeId;

    try {
      const path = await fleetManager.calcPath(ship.system_id, nodeId);
      this.currentPath = path;
    } catch (e) {
      console.error('Path calculation failed:', e);
      this.currentPath = [ship.system_id, nodeId];
    }
  }

  private updateShipSelection(): void {
    for (const [id, sprite] of this.shipSprites) {
      const glow = sprite.getData('glow') as Phaser.GameObjects.Arc;
      if (glow) {
        if (this.selectedShipId === id) {
          glow.setAlpha(0.3);
        } else {
          glow.setAlpha(0);
        }
      }
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    let foundRoute: [number, number] | null = null;
    for (const [a, b] of this.routes) {
      const sa = this.starSystems[a];
      const sb = this.starSystems[b];
      if (!sa || !sb) continue;
      const dist = this.pointToLineDistance(pointer.x, pointer.y, sa.x, sa.y, sb.x, sb.y);
      if (dist < 10) {
        foundRoute = [a, b];
        break;
      }
    }
    if (foundRoute) {
      if (!this.hoveredRoute || this.hoveredRoute[0] !== foundRoute[0] || this.hoveredRoute[1] !== foundRoute[1]) {
        this.hoveredRoute = foundRoute;
        this.drawHighlightRoute(foundRoute[0], foundRoute[1]);
      }
    } else if (this.hoveredRoute) {
      this.hoveredRoute = null;
      this.clearHighlightRoute();
    }
  }

  private pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    param = Math.max(0, Math.min(1, param));
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
  }

  public getSelectedShipId(): string | null {
    return this.selectedShipId;
  }

  public getCurrentPath(): number[] {
    return this.currentPath;
  }

  public setSelectedShipId(id: string | null): void {
    this.selectedShipId = id;
    this.currentPath = [];
    this.flowGraphics.clear();
    this.updateShipSelection();
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
  }

  update(): void {}
}
