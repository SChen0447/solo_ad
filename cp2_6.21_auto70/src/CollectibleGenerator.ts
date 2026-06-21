import { Player } from './Player';

export interface Collectible {
  x: number;
  y: number;
  radius: number;
  pulsePhase: number;
  active: boolean;
}

export class CollectibleGenerator {
  collectibles: Collectible[] = [];
  spawnTimer = 0;
  spawnInterval = 2.0;
  private onCollectCallback: ((count: number) => void) | null = null;
  private patternIndex = 0;

  onCollect(cb: (count: number) => void) {
    this.onCollectCallback = cb;
  }

  update(dt: number, scrollSpeed: number, canvasWidth: number, canvasHeight: number, time: number, maxObjects: number) {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval && this.getTotalActive() + this.collectibles.length < maxObjects) {
      this.spawnTimer = 0;
      this.spawnPattern(canvasWidth, canvasHeight);
      this.patternIndex++;
    }

    for (const col of this.collectibles) {
      col.x -= scrollSpeed * dt;
      col.pulsePhase += dt * Math.PI * 2;
    }

    this.collectibles = this.collectibles.filter(col => col.x + col.radius > -10 && col.active);
  }

  private spawnPattern(canvasWidth: number, canvasHeight: number) {
    const count = 5 + Math.floor(Math.random() * 3);
    const isArc = this.patternIndex % 2 === 0;
    const centerY = canvasHeight * 0.5;

    for (let i = 0; i < count; i++) {
      const xOff = i * 80;
      let yOff = 0;
      if (isArc) {
        yOff = Math.sin(i * 0.8) * 80;
      }
      this.collectibles.push({
        x: canvasWidth + 50 + xOff,
        y: centerY + yOff,
        radius: 10,
        pulsePhase: Math.random() * Math.PI * 2,
        active: true
      });
    }
  }

  checkCollection(player: Player): number {
    let collected = 0;
    for (const col of this.collectibles) {
      if (!col.active) continue;
      const dx = player.x - col.x;
      const dy = player.y - col.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pulseScale = 1 + 0.2 * Math.sin(col.pulsePhase);
      const effectiveRadius = col.radius * pulseScale;
      if (dist < player.radius + effectiveRadius) {
        col.active = false;
        collected++;
      }
    }
    return collected;
  }

  private getTotalActive(): number {
    return this.collectibles.filter(c => c.active).length;
  }

  reset() {
    this.collectibles = [];
    this.spawnTimer = 0;
    this.patternIndex = 0;
  }
}
