import { StarMap } from './starMap';

export interface Ship {
  id: number;
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  speed: number;
  health: number;
  maxHealth: number;
  armor: number;
  attack: number;
  selected: boolean;
  isEnemy: boolean;
  shape: number;
  hitFlash: number;
  lastShot: number;
  angle: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
  duration: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}

export class FleetControl {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private starMap: StarMap;
  public ships: Ship[] = [];
  private nextShipId = 1;
  public selectionBox: SelectionBox = { startX: 0, startY: 0, endX: 0, endY: 0, active: false };
  public ripples: Ripple[] = [];
  public defensiveMode = false;
  private isSelecting = false;

  constructor(canvas: HTMLCanvasElement, starMap: StarMap) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.starMap = starMap;
    this.spawnInitialFleet();
    this.bindEvents();
  }

  private spawnInitialFleet(): void {
    const cx = this.starMap.worldWidth / 2;
    const cy = this.starMap.worldHeight / 2;
    const formations = [
      { x: -60, y: -40 }, { x: 0, y: -50 }, { x: 60, y: -40 },
      { x: -80, y: 0 }, { x: -20, y: -10 }, { x: 20, y: -10 }, { x: 80, y: 0 },
      { x: -60, y: 40 }, { x: 0, y: 50 }, { x: 60, y: 40 }
    ];
    for (let i = 0; i < 10; i++) {
      this.ships.push(this.createShip(cx + formations[i].x, cy + formations[i].y, false));
    }
  }

  public createShip(x: number, y: number, isEnemy: boolean): Ship {
    return {
      id: this.nextShipId++,
      x,
      y,
      targetX: null,
      targetY: null,
      speed: isEnemy ? 30 : 50,
      health: isEnemy ? 40 : 80,
      maxHealth: isEnemy ? 40 : 80,
      armor: isEnemy ? 2 : 5,
      attack: isEnemy ? 5 : 10,
      selected: false,
      isEnemy,
      shape: Math.floor(Math.random() * 4),
      hitFlash: 0,
      lastShot: 0,
      angle: isEnemy ? Math.PI : 0
    };
  }

  public selectAll(): void {
    for (const ship of this.ships) {
      if (!ship.isEnemy) ship.selected = true;
    }
  }

  public deselectAll(): void {
    for (const ship of this.ships) {
      ship.selected = false;
    }
  }

  public toggleDefensiveMode(): void {
    this.defensiveMode = !this.defensiveMode;
  }

  public retreatAll(): void {
    const cx = this.starMap.worldWidth / 2;
    const cy = this.starMap.worldHeight / 2;
    for (const ship of this.ships) {
      if (!ship.isEnemy && ship.selected) {
        ship.targetX = cx + (Math.random() - 0.5) * 100;
        ship.targetY = cy + (Math.random() - 0.5) * 100;
      }
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0 && !e.altKey && e.button !== 1) {
      this.isSelecting = true;
      this.selectionBox.startX = e.clientX;
      this.selectionBox.startY = e.clientY;
      this.selectionBox.endX = e.clientX;
      this.selectionBox.endY = e.clientY;
      this.selectionBox.active = true;
      if (!e.shiftKey) {
        this.deselectAll();
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isSelecting) {
      this.selectionBox.endX = e.clientX;
      this.selectionBox.endY = e.clientY;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0 && this.isSelecting) {
      this.isSelecting = false;
      this.applySelection();
      this.selectionBox.active = false;
    }
    if (e.button === 2) {
      this.issueMoveCommand(e.clientX, e.clientY);
    }
  }

  private applySelection(): void {
    const rect = this.canvas.getBoundingClientRect();
    let sx = Math.min(this.selectionBox.startX, this.selectionBox.endX) - rect.left;
    let sy = Math.min(this.selectionBox.startY, this.selectionBox.endY) - rect.top;
    let ex = Math.max(this.selectionBox.startX, this.selectionBox.endX) - rect.left;
    let ey = Math.max(this.selectionBox.startY, this.selectionBox.endY) - rect.top;

    const pixelThreshold = 5;
    if (Math.abs(ex - sx) < pixelThreshold && Math.abs(ey - sy) < pixelThreshold) {
      const wx = this.starMap.screenToWorldX(sx);
      const wy = this.starMap.screenToWorldY(sy);
      for (const ship of this.ships) {
        if (!ship.isEnemy) {
          const dx = ship.x - wx;
          const dy = ship.y - wy;
          if (dx * dx + dy * dy < 400) {
            ship.selected = !ship.selected;
            return;
          }
        }
      }
      return;
    }

    const w1x = this.starMap.screenToWorldX(sx);
    const w1y = this.starMap.screenToWorldY(sy);
    const w2x = this.starMap.screenToWorldX(ex);
    const w2y = this.starMap.screenToWorldY(ey);

    for (const ship of this.ships) {
      if (!ship.isEnemy) {
        if (ship.x >= Math.min(w1x, w2x) && ship.x <= Math.max(w1x, w2x) &&
            ship.y >= Math.min(w1y, w2y) && ship.y <= Math.max(w1y, w2y)) {
          ship.selected = true;
        }
      }
    }
  }

  private issueMoveCommand(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const wx = this.starMap.screenToWorldX(sx);
    const wy = this.starMap.screenToWorldY(sy);

    this.ripples.push({
      x: wx,
      y: wy,
      radius: 0,
      maxRadius: 30,
      alpha: 1,
      startTime: performance.now(),
      duration: 500
    });

    const selectedShips = this.ships.filter(s => s.selected && !s.isEnemy);
    if (selectedShips.length === 0) return;

    let centerX = 0, centerY = 0;
    for (const s of selectedShips) {
      centerX += s.x;
      centerY += s.y;
    }
    centerX /= selectedShips.length;
    centerY /= selectedShips.length;

    for (const ship of selectedShips) {
      const offsetX = ship.x - centerX;
      const offsetY = ship.y - centerY;
      ship.targetX = wx + offsetX;
      ship.targetY = wy + offsetY;
    }
  }

  public getSelectedShips(): Ship[] {
    return this.ships.filter(s => s.selected && !s.isEnemy);
  }

  public getFriendlyShips(): Ship[] {
    return this.ships.filter(s => !s.isEnemy);
  }

  public getEnemyShips(): Ship[] {
    return this.ships.filter(s => s.isEnemy);
  }

  public update(deltaTime: number): void {
    const now = performance.now();

    this.ripples = this.ripples.filter(r => {
      const elapsed = now - r.startTime;
      const t = elapsed / r.duration;
      if (t >= 1) return false;
      r.radius = r.maxRadius * t;
      r.alpha = 1 - t;
      return true;
    });

    for (const ship of this.ships) {
      if (ship.hitFlash > 0) {
        ship.hitFlash -= deltaTime;
      }

      if (ship.targetX !== null && ship.targetY !== null) {
        const dx = ship.targetX - ship.x;
        const dy = ship.targetY - ship.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 3) {
          ship.targetX = null;
          ship.targetY = null;
        } else {
          const moveDist = ship.speed * (deltaTime / 1000);
          ship.angle = Math.atan2(dy, dx);
          ship.x += (dx / dist) * Math.min(moveDist, dist);
          ship.y += (dy / dist) * Math.min(moveDist, dist);
        }
      }
    }

    this.ships = this.ships.filter(s => s.health > 0);
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.starMap.camera.scale, this.starMap.camera.scale);
    ctx.translate(-this.starMap.camera.x, -this.starMap.camera.y);

    for (const ripple of this.ripples) {
      ctx.strokeStyle = `rgba(100, 200, 255, ${ripple.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const ship of this.ships) {
      this.renderShip(ship);
    }

    ctx.restore();

    if (this.selectionBox.active) {
      this.renderSelectionBox();
    }
  }

  private renderShip(ship: Ship): void {
    const ctx = this.ctx;
    const scale = this.starMap.camera.scale;

    if (ship.selected && !ship.isEnemy) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 500 * Math.PI * 2);
      ctx.strokeStyle = `rgba(100, 200, 255, ${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    const flashing = ship.hitFlash > 0 && Math.floor(ship.hitFlash / 100) % 2 === 0;
    const baseColor = ship.isEnemy ? '#ff4444' : (flashing ? '#ff8888' : '#44aaff');
    const accentColor = ship.isEnemy ? '#ff8800' : '#ffd700';

    ctx.fillStyle = baseColor;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;

    const s = 8;
    switch (ship.shape % 4) {
      case 0:
        ctx.beginPath();
        ctx.moveTo(s, 0);
        ctx.lineTo(-s * 0.7, -s * 0.7);
        ctx.lineTo(-s * 0.4, 0);
        ctx.lineTo(-s * 0.7, s * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 1:
        ctx.fillRect(-s * 0.6, -s * 0.5, s * 1.2, s);
        ctx.strokeRect(-s * 0.6, -s * 0.5, s * 1.2, s);
        ctx.fillStyle = accentColor;
        ctx.fillRect(s * 0.4, -s * 0.25, s * 0.4, s * 0.5);
        break;
      case 2:
        ctx.beginPath();
        ctx.moveTo(s, 0);
        ctx.lineTo(-s, -s * 0.6);
        ctx.lineTo(-s * 0.5, 0);
        ctx.lineTo(-s, s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const r = i % 2 === 0 ? s : s * 0.6;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = accentColor;
    ctx.fillRect(-s * 0.2, -s * 0.2, s * 0.4, s * 0.4);

    ctx.restore();

    const barW = 20;
    const barH = 3;
    const barY = ship.y - 18;
    const healthPct = ship.health / ship.maxHealth;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(ship.x - barW / 2, barY, barW, barH);
    ctx.fillStyle = ship.isEnemy ? '#ff4444' : '#44ff44';
    ctx.fillRect(ship.x - barW / 2, barY, barW * healthPct, barH);
  }

  private renderSelectionBox(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const sx = Math.min(this.selectionBox.startX, this.selectionBox.endX) - rect.left;
    const sy = Math.min(this.selectionBox.startY, this.selectionBox.endY) - rect.top;
    const w = Math.abs(this.selectionBox.endX - this.selectionBox.startX);
    const h = Math.abs(this.selectionBox.endY - this.selectionBox.startY);

    const dashOffset = (performance.now() / 100) % 10;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = dashOffset;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeRect(sx, sy, w, h);
    ctx.restore();
  }
}
