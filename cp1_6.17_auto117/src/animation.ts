export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'shatter' | 'firework' | 'spark';
  rotation?: number;
  rotationSpeed?: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  life: number;
  maxLife: number;
  startY: number;
  targetY: number;
}

export interface SelectionHalo {
  x: number;
  y: number;
  cellSize: number;
  time: number;
  period: number;
}

export interface Firework {
  particles: Particle[];
  x: number;
  y: number;
  launched: boolean;
  launchProgress: number;
}

export class AnimationManager {
  particles: Particle[];
  floatingTexts: FloatingText[];
  fireworkParticles: Particle[];
  halos: Map<string, SelectionHalo>;
  fireworks: Firework[];
  dimmed: boolean;
  dimmedProgress: number;

  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.fireworkParticles = [];
    this.halos = new Map();
    this.fireworks = [];
    this.dimmed = false;
    this.dimmedProgress = 0;
  }

  spawnShatterParticles(
    centerX: number,
    centerY: number,
    color: string,
    count: number = 15
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 60 + Math.random() * 120;
      const size = 2 + Math.random() * 4;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        color,
        size,
        life: 0.3,
        maxLife: 0.3,
        type: 'shatter',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 20
      });
    }
  }

  spawnFloatingText(
    x: number,
    y: number,
    text: string,
    color: string = '#ffffff',
    fontSize: number = 20
  ): void {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      fontSize,
      life: 0.5,
      maxLife: 0.5,
      startY: y,
      targetY: y - 50
    });
  }

  setSelectionHalo(
    key: string,
    x: number,
    y: number,
    cellSize: number
  ): void {
    this.halos.set(key, {
      x,
      y,
      cellSize,
      time: 0,
      period: 0.8
    });
  }

  clearSelectionHalo(key: string): void {
    this.halos.delete(key);
  }

  clearAllHalos(): void {
    this.halos.clear();
  }

  spawnVictoryFireworks(
    boardWidth: number,
    boardHeight: number,
    boardX: number,
    boardY: number,
    count: number = 15
  ): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.launchSingleFirework(boardWidth, boardHeight, boardX, boardY);
      }, i * 200);
    }
  }

  private launchSingleFirework(
    boardWidth: number,
    boardHeight: number,
    boardX: number,
    boardY: number
  ): void {
    const targetX = boardX + Math.random() * boardWidth;
    const targetY = boardY + boardHeight * 0.2 + Math.random() * boardHeight * 0.3;

    const colors = ['#ffd700', '#ffec8b', '#ffea00', '#fff59d', '#ffeb3b', '#fff176'];
    const baseColor = colors[Math.floor(Math.random() * colors.length)];

    const particleCount = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.2;
      const speed = 40 + Math.random() * 80;
      this.fireworkParticles.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: baseColor,
        size: 2 + Math.random() * 3,
        life: 2.5 + Math.random() * 2,
        maxLife: 4.5,
        type: 'firework'
      });
    }
  }

  setDimmed(dimmed: boolean): void {
    this.dimmed = dimmed;
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed * dt;
      }
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life -= dt;
      const progress = 1 - t.life / t.maxLife;
      t.y = t.startY + (t.targetY - t.startY) * easeOutQuad(progress);
      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    for (let i = this.fireworkParticles.length - 1; i >= 0; i--) {
      const p = this.fireworkParticles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      p.vx *= 0.98;
      if (p.life <= 0) {
        this.fireworkParticles.splice(i, 1);
      }
    }

    for (const halo of this.halos.values()) {
      halo.time += dt;
      if (halo.time >= halo.period) {
        halo.time -= halo.period;
      }
    }

    if (this.dimmed) {
      this.dimmedProgress = Math.min(1, this.dimmedProgress + dt * 2);
    } else {
      this.dimmedProgress = Math.max(0, this.dimmedProgress - dt * 2);
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getFireworkParticles(): Particle[] {
    return this.fireworkParticles;
  }

  getFloatingTexts(): FloatingText[] {
    return this.floatingTexts;
  }

  getHalo(key: string): SelectionHalo | undefined {
    return this.halos.get(key);
  }

  getDimProgress(): number {
    return this.dimmedProgress;
  }

  reset(): void {
    this.particles = [];
    this.floatingTexts = [];
    this.fireworkParticles = [];
    this.halos.clear();
    this.fireworks = [];
    this.dimmed = false;
    this.dimmedProgress = 0;
  }

  hasActiveAnimations(): boolean {
    return (
      this.particles.length > 0 ||
      this.floatingTexts.length > 0 ||
      this.fireworkParticles.length > 0
    );
  }
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}
