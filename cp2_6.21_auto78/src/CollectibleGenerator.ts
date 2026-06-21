import { Collectible, GameState } from './types';

export class CollectibleGenerator {
  private collectibles: Collectible[] = [];
  private spawnTimer: number = 0;
  private waveTimer: number = 0;
  private readonly MAX_COLLECTIBLES = 20;
  private readonly WAVE_INTERVAL = 2.0;
  private readonly SPACING = 80;
  private canvasWidth: number;
  private canvasHeight: number;
  private groupIdCounter = 0;
  private onCollectCallback: (count: number) => void = () => {};
  private collectedInWave: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public setOnCollectCallback(callback: (count: number) => void): void {
    this.onCollectCallback = callback;
  }

  public getCollectibles(): Collectible[] {
    return this.collectibles;
  }

  public getCollectedCount(): number {
    return this.collectedInWave;
  }

  public clear(): void {
    this.collectibles = [];
    this.spawnTimer = 0;
    this.waveTimer = 0;
    this.collectedInWave = 0;
  }

  public resetCollectedCount(): void {
    this.collectedInWave = 0;
  }

  public update(
    dt: number,
    scrollSpeed: number,
    playerState: GameState['player'],
    obstacles: GameState['obstacles']
  ): void {
    this.waveTimer += dt;
    if (this.waveTimer >= this.WAVE_INTERVAL) {
      this.waveTimer = 0;
      this.spawnWave(obstacles);
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      c.x -= scrollSpeed * dt;
      c.pulsePhase += dt * Math.PI * 2;
      if (c.x + c.radius < 0) {
        this.collectibles.splice(i, 1);
        continue;
      }
      if (!c.collected && this.checkCollision(c, playerState)) {
        c.collected = true;
        this.collectedInWave++;
        this.onCollectCallback(1);
        this.collectibles.splice(i, 1);
      }
    }
  }

  private spawnWave(obstacles: GameState['obstacles']): void {
    if (this.collectibles.length >= this.MAX_COLLECTIBLES) return;
    const groupId = this.groupIdCounter++;
    const count = 4 + Math.floor(Math.random() * 4);
    const topMargin = 100;
    const bottomMargin = 80;
    const useArc = Math.random() < 0.5;
    let attempts = 0;
    let baseY = topMargin + Math.random() * (this.canvasHeight - topMargin - bottomMargin);
    const startX = this.canvasWidth + 40;
    const amplitude = 40;

    while (attempts < 5) {
      let valid = true;
      for (let i = 0; i < count; i++) {
        let y = baseY;
        if (useArc) {
          const t = i / (count - 1);
          y = baseY + Math.sin(t * Math.PI) * amplitude;
        }
        const x = startX + i * this.SPACING;
        if (this.circleRectsOverlap(x, y, 14, obstacles)) {
          valid = false;
          break;
        }
      }
      if (valid) break;
      baseY = topMargin + Math.random() * (this.canvasHeight - topMargin - bottomMargin);
      attempts++;
    }

    for (let i = 0; i < count; i++) {
      let y = baseY;
      if (useArc) {
        const t = i / (count - 1);
        y = baseY + Math.sin(t * Math.PI) * amplitude;
      }
      const x = startX + i * this.SPACING;
      if (this.collectibles.length < this.MAX_COLLECTIBLES) {
        this.collectibles.push({
          x,
          y,
          radius: 10,
          collected: false,
          pulsePhase: Math.random() * Math.PI * 2,
          groupId
        });
      }
    }
  }

  private circleRectsOverlap(
    cx: number,
    cy: number,
    cr: number,
    obstacles: GameState['obstacles']
  ): boolean {
    for (const o of obstacles) {
      if (o.x + o.width < cx - cr) continue;
      if (o.x > cx + cr) continue;
      const closestX = Math.max(o.x, Math.min(cx, o.x + o.width));
      const closestY = Math.max(o.y, Math.min(cy, o.y + o.height));
      const dx = cx - closestX;
      const dy = cy - closestY;
      if (dx * dx + dy * dy < cr * cr) {
        return true;
      }
    }
    return false;
  }

  private checkCollision(c: Collectible, p: GameState['player']): boolean {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const r = p.radius + c.radius;
    return (dx * dx + dy * dy) < (r * r);
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
