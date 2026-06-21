import { ElementType, Cell, GridState, Ripple, Particle, GRID_WIDTH, GRID_HEIGHT, ELEMENT_INFO } from './type';
import { PhysicsEngine } from './PhysicsEngine';

export class ElementManager {
  private grid: GridState;
  private physicsEngine: PhysicsEngine;
  private ripples: Ripple[] = [];
  private particles: Particle[] = [];

  constructor() {
    this.physicsEngine = new PhysicsEngine();
    this.grid = this.createEmptyGrid();
  }

  private createEmptyGrid(): GridState {
    const cells: Cell[][] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        row.push({
          type: ElementType.EMPTY,
          lifetime: 0,
          burnTimer: 0,
          updated: false,
          velocityX: 0,
          velocityY: 0,
          opacity: 0
        });
      }
      cells.push(row);
    }
    return { width: GRID_WIDTH, height: GRID_HEIGHT, cells };
  }

  public getGrid(): GridState {
    return this.grid;
  }

  public getRipples(): Ripple[] {
    return this.ripples;
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public setElement(x: number, y: number, type: ElementType): void {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;

    const cell = this.grid.cells[y][x];
    cell.type = type;
    cell.lifetime = 0;
    cell.burnTimer = 0;
    cell.velocityX = 0;
    cell.velocityY = 0;
    cell.opacity = type === ElementType.EMPTY ? 0 : 1;
    cell.updated = true;

    if (type !== ElementType.EMPTY) {
      this.createPlacementParticles(x, y, type);
    }
  }

  private createPlacementParticles(x: number, y: number, type: ElementType): void {
    const info = ELEMENT_INFO[type];
    const count = 6 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x: x + 0.5,
        y: y + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500,
        maxLife: 500,
        color: info.color,
        size: 1 + Math.random() * 2
      });
    }
  }

  public update(deltaTime: number): void {
    const newRipples = this.physicsEngine.update(this.grid, deltaTime);
    this.ripples = [...this.ripples, ...newRipples];
    this.ripples = this.physicsEngine.updateRipples(this.ripples, deltaTime);
    this.particles = this.updateParticles(this.particles, deltaTime);
  }

  private updateParticles(particles: Particle[], deltaTime: number): Particle[] {
    return particles
      .map(p => ({
        ...p,
        x: p.x + p.vx * deltaTime / 16,
        y: p.y + p.vy * deltaTime / 16,
        vy: p.vy + 0.1 * deltaTime / 16,
        life: p.life - deltaTime
      }))
      .filter(p => p.life > 0);
  }

  public getElementCounts(): Record<ElementType, number> {
    const counts: Record<ElementType, number> = {
      [ElementType.EMPTY]: 0,
      [ElementType.WATER]: 0,
      [ElementType.SAND]: 0,
      [ElementType.WOOD]: 0,
      [ElementType.FIRE]: 0,
      [ElementType.SMOKE]: 0,
      [ElementType.STEAM]: 0,
      [ElementType.ASH]: 0
    };

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const type = this.grid.cells[y][x].type;
        counts[type]++;
      }
    }

    return counts;
  }

  public clearGrid(): void {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        this.grid.cells[y][x] = {
          type: ElementType.EMPTY,
          lifetime: 0,
          burnTimer: 0,
          updated: false,
          velocityX: 0,
          velocityY: 0,
          opacity: 0
        };
      }
    }
    this.ripples = [];
    this.particles = [];
  }
}
