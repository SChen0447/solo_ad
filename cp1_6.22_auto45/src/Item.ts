export interface Star {
  x: number;
  y: number;
  size: number;
  rotation: number;
  scale: number;
  collected: boolean;
  animTimer: number;
}

export interface Spike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ItemManager {
  stars: Star[] = [];
  spikes: Spike[] = [];
  scrollSpeed: number = 160;
  starSpawnTimer: number = 0;
  starSpawnInterval: number = 2.5;
  spikeSpawnTimer: number = 0;
  spikeSpawnIntervalMin: number = 8;
  spikeSpawnIntervalMax: number = 10;
  nextSpikeTime: number = 9;
  tileSize: number = 30;

  constructor() {
    this.nextSpikeTime = this.spikeSpawnIntervalMin +
      Math.random() * (this.spikeSpawnIntervalMax - this.spikeSpawnIntervalMin);
  }

  spawnStar(x: number, y: number): void {
    this.stars.push({
      x: x,
      y: y,
      size: 8,
      rotation: 0,
      scale: 1,
      collected: false,
      animTimer: 0
    });
  }

  spawnSpike(x: number, groundY: number): void {
    this.spikes.push({
      x: x,
      y: groundY - 12,
      width: 12,
      height: 12
    });
  }

  trySpawnStar(tiles: { x: number; y: number; type: string; width: number }[]): void {
    this.starSpawnTimer += 1;
    if (this.starSpawnTimer >= 3) {
      this.starSpawnTimer = 0;
      const validTiles = tiles.filter(t => t.type === 'flat' && t.x > 700);
      if (validTiles.length > 0) {
        const tile = validTiles[Math.floor(Math.random() * validTiles.length)];
        this.spawnStar(tile.x + tile.width / 2 - 4, tile.y - 25);
      }
    }
  }

  update(deltaTime: number, speed: number, groundTiles: { x: number; y: number; type: string; width: number }[]): void {
    this.scrollSpeed = speed;

    for (const star of this.stars) {
      star.x -= this.scrollSpeed * deltaTime;
      star.animTimer += deltaTime;
      star.rotation += deltaTime * 2;
      star.scale = 1 + Math.sin(star.animTimer * (Math.PI * 2 / 1.2)) * 0.15;
    }
    this.stars = this.stars.filter(s => s.x > -20 && !s.collected);

    for (const spike of this.spikes) {
      spike.x -= this.scrollSpeed * deltaTime;
    }
    this.spikes = this.spikes.filter(s => s.x > -20);

    this.starSpawnTimer -= deltaTime;
    if (this.starSpawnTimer <= 0) {
      this.starSpawnTimer = 1.5 + Math.random() * 1.5;
      const validTiles = groundTiles.filter(t =>
        t.type === 'flat' && t.x > 750 && t.x < 900
      );
      if (validTiles.length > 0) {
        const tile = validTiles[Math.floor(Math.random() * validTiles.length)];
        this.spawnStar(tile.x + tile.width / 2 - 4, tile.y - 30);
      }
    }

    this.spikeSpawnTimer += deltaTime;
    if (this.spikeSpawnTimer >= this.nextSpikeTime) {
      this.spikeSpawnTimer = 0;
      this.nextSpikeTime = this.spikeSpawnIntervalMin +
        Math.random() * (this.spikeSpawnIntervalMax - this.spikeSpawnIntervalMin);

      const validTiles = groundTiles.filter(t =>
        t.type === 'flat' && t.x > 780
      );
      if (validTiles.length > 0) {
        const tile = validTiles[Math.floor(Math.random() * validTiles.length)];
        this.spawnSpike(tile.x + tile.width / 2 - 6, tile.y);
      }
    }
  }

  checkStarCollision(playerBounds: { x: number; y: number; width: number; height: number }): boolean {
    for (const star of this.stars) {
      if (star.collected) continue;

      const starCenterX = star.x + star.size / 2;
      const starCenterY = star.y + star.size / 2;
      const playerCenterX = playerBounds.x + playerBounds.width / 2;
      const playerCenterY = playerBounds.y + playerBounds.height / 2;

      const dx = starCenterX - playerCenterX;
      const dy = starCenterY - playerCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 12) {
        star.collected = true;
        return true;
      }
    }
    return false;
  }

  checkSpikeCollision(playerBounds: { x: number; y: number; width: number; height: number }): boolean {
    for (const spike of this.spikes) {
      if (playerBounds.x < spike.x + spike.width &&
          playerBounds.x + playerBounds.width > spike.x &&
          playerBounds.y < spike.y + spike.height &&
          playerBounds.y + playerBounds.height > spike.y) {
        return true;
      }
    }
    return false;
  }

  reset(): void {
    this.stars = [];
    this.spikes = [];
    this.starSpawnTimer = 0;
    this.spikeSpawnTimer = 0;
    this.nextSpikeTime = this.spikeSpawnIntervalMin +
      Math.random() * (this.spikeSpawnIntervalMax - this.spikeSpawnIntervalMin);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      if (star.collected) continue;

      ctx.save();
      ctx.translate(star.x + star.size / 2, star.y + star.size / 2);
      ctx.rotate(star.rotation);
      ctx.scale(star.scale, star.scale);

      ctx.fillStyle = '#ffd700';
      const s = star.size / 2;

      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 2 * Math.PI / 5) - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        const outerX = Math.cos(outerAngle) * s;
        const outerY = Math.sin(outerAngle) * s;
        const innerX = Math.cos(innerAngle) * (s * 0.4);
        const innerY = Math.sin(innerAngle) * (s * 0.4);
        if (i === 0) {
          ctx.moveTo(outerX, outerY);
        } else {
          ctx.lineTo(outerX, outerY);
        }
        ctx.lineTo(innerX, innerY);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff8dc';
      ctx.fillRect(-1, -s * 0.6, 2, 2);

      ctx.restore();
    }

    for (const spike of this.spikes) {
      ctx.fillStyle = '#1a1a1a';
      const sx = Math.floor(spike.x);
      const sy = Math.floor(spike.y);

      ctx.beginPath();
      ctx.moveTo(sx, sy + spike.height);
      ctx.lineTo(sx + spike.width / 2, sy);
      ctx.lineTo(sx + spike.width, sy + spike.height);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(sx + 3, sy + spike.height);
      ctx.lineTo(sx + spike.width / 2, sy + 4);
      ctx.lineTo(sx + spike.width / 2, sy + spike.height);
      ctx.closePath();
      ctx.fill();
    }
  }
}
