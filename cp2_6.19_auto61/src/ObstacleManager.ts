export type ObstacleType = 'spike' | 'lowWall' | 'horizontalBar';
export type CoinType = 'normal' | 'beat';
export type EntityType = ObstacleType | CoinType;

export type GameEntity = {
  id: number;
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  spawnTime: number;
  warningDuration: number;
  entityDuration: number;
  state: 'warning' | 'active' | 'expired';
  collected: boolean;
  rotation: number;
  particles: Particle[];
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
};

export type ScorePopup = {
  id: number;
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
  alpha: number;
};

type ObstaclePattern = {
  obstacles: ObstacleType[];
  coins: { type: CoinType; offsetY: number }[];
};

export class ObstacleManager {
  private entities: GameEntity[] = [];
  private scorePopups: ScorePopup[] = [];
  private nextEntityId: number = 0;
  private nextPopupId: number = 0;
  private gameSpeed: number = 300;
  private groundY: number = 0;
  private canvasWidth: number = 800;
  private beatInterval: number = 0.5;
  private warningLeadTime: number = 0.1;
  private warningDuration: number = 0.3;
  private lastBeatIndex: number = -1;
  private spawnX: number = 0;
  private maxParticles: number = 50;

  private patterns: ObstaclePattern[] = [
    { obstacles: ['spike'], coins: [{ type: 'normal', offsetY: -100 }] },
    { obstacles: ['lowWall'], coins: [] },
    { obstacles: ['horizontalBar'], coins: [{ type: 'normal', offsetY: -20 }] },
    { obstacles: [], coins: [{ type: 'normal', offsetY: -60 }] },
    { obstacles: ['spike', 'lowWall'], coins: [] },
    { obstacles: [], coins: [{ type: 'beat', offsetY: -80 }] },
    { obstacles: ['spike'], coins: [{ type: 'beat', offsetY: -120 }] },
  ];

  constructor(canvasWidth: number = 800, groundY: number = 0) {
    this.canvasWidth = canvasWidth;
    this.groundY = groundY;
    this.spawnX = canvasWidth + 100;
  }

  public setCanvasSize(width: number, groundY: number): void {
    this.canvasWidth = width;
    this.groundY = groundY;
    this.spawnX = width + 100;
  }

  public setGameSpeed(speed: number): void {
    this.gameSpeed = speed;
  }

  public setMaxParticles(count: number): void {
    this.maxParticles = count;
  }

  public setBeatInterval(interval: number): void {
    this.beatInterval = interval;
  }

  public update(dt: number, currentTime: number): void {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      entity.x -= this.gameSpeed * dt;

      const age = currentTime - entity.spawnTime;
      if (age < entity.warningDuration) {
        entity.state = 'warning';
      } else {
        entity.state = 'active';
      }

      if (entity.type === 'normal' || entity.type === 'beat') {
        entity.rotation += dt * 3;
      }

      this.updateEntityParticles(entity, dt);

      if (entity.x < -200) {
        this.entities.splice(i, 1);
      }
    }

    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const popup = this.scorePopups[i];
      popup.life -= dt;
      popup.y -= 50 * dt;
      popup.alpha = popup.life / popup.maxLife;
      if (popup.life <= 0) {
        this.scorePopups.splice(i, 1);
      }
    }
  }

  private updateEntityParticles(entity: GameEntity, dt: number): void {
    for (let i = entity.particles.length - 1; i >= 0; i--) {
      const p = entity.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
      p.alpha = p.life / p.maxLife;
      if (p.life <= 0) {
        entity.particles.splice(i, 1);
      }
    }
  }

  public onBeat(beatIndex: number, beatTime: number): void {
    if (beatIndex <= this.lastBeatIndex) return;
    this.lastBeatIndex = beatIndex;

    if (beatIndex < 2) return;

    const pattern = this.selectPattern(beatIndex);

    pattern.obstacles.forEach((type, index) => {
      const offsetX = index * 80;
      this.spawnObstacle(type, beatTime, offsetX);
    });

    pattern.coins.forEach(coin => {
      this.spawnCoin(coin.type, beatTime, coin.offsetY);
    });
  }

  private selectPattern(beatIndex: number): ObstaclePattern {
    const difficulty = Math.min(1, beatIndex / 40);

    if (beatIndex % 8 === 0 && Math.random() < 0.4) {
      return this.patterns[5];
    }

    if (difficulty > 0.3 && Math.random() < 0.2) {
      return this.patterns[4];
    }

    const availablePatterns = this.patterns.filter((_, i) => i !== 4 || difficulty > 0.3);
    return availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
  }

  private spawnObstacle(type: ObstacleType, beatTime: number, offsetX: number = 0): void {
    let width = 40;
    let height = 40;
    let y = this.groundY;

    switch (type) {
      case 'spike':
        width = 30;
        height = 40;
        y = this.groundY;
        break;
      case 'lowWall':
        width = 50;
        height = 50;
        y = this.groundY;
        break;
      case 'horizontalBar':
        width = 80;
        height = 25;
        y = this.groundY - 40;
        break;
    }

    const entity: GameEntity = {
      id: this.nextEntityId++,
      type,
      x: this.spawnX + offsetX,
      y,
      width,
      height,
      spawnTime: beatTime - this.warningLeadTime,
      warningDuration: this.warningDuration,
      entityDuration: 3,
      state: 'warning',
      collected: false,
      rotation: 0,
      particles: []
    };

    this.entities.push(entity);
  }

  private spawnCoin(type: CoinType, beatTime: number, offsetY: number = -60): void {
    const size = type === 'beat' ? 30 : 24;

    const entity: GameEntity = {
      id: this.nextEntityId++,
      type,
      x: this.spawnX,
      y: this.groundY + offsetY,
      width: size,
      height: size,
      spawnTime: beatTime - this.warningLeadTime,
      warningDuration: this.warningDuration,
      entityDuration: 3,
      state: 'warning',
      collected: false,
      rotation: 0,
      particles: []
    };

    if (type === 'beat') {
      for (let i = 0; i < 8 && this.maxParticles > 10; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        entity.particles.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * 80,
          vy: Math.sin(angle) * 80,
          life: 0.3,
          maxLife: 0.3,
          size: 4,
          color: '#a855f7',
          alpha: 1
        });
      }
    }

    this.entities.push(entity);
  }

  public checkCollisions(
    playerHitbox: { x: number; y: number; width: number; height: number }
  ): { hit: boolean; coinCollected: boolean; beatCoinCollected: boolean; coinX: number; coinY: number } {
    let hit = false;
    let coinCollected = false;
    let beatCoinCollected = false;
    let coinX = 0;
    let coinY = 0;

    for (const entity of this.entities) {
      if (entity.state !== 'active' || entity.collected) continue;

      const entityHitbox = this.getEntityHitbox(entity);

      if (this.isColliding(playerHitbox, entityHitbox)) {
        if (entity.type === 'normal') {
          entity.collected = true;
          coinCollected = true;
          coinX = entity.x + entity.width / 2;
          coinY = entity.y;
          this.addScorePopup(10, entity.x, entity.y);
        } else if (entity.type === 'beat') {
          entity.collected = true;
          beatCoinCollected = true;
          coinX = entity.x + entity.width / 2;
          coinY = entity.y;
          this.addScorePopup(50, entity.x, entity.y);
          this.spawnBeatCoinParticles(entity);
        } else {
          hit = true;
        }
      }
    }

    return { hit, coinCollected, beatCoinCollected, coinX, coinY };
  }

  private getEntityHitbox(entity: GameEntity): { x: number; y: number; width: number; height: number } {
    if (entity.type === 'spike') {
      return {
        x: entity.x + entity.width * 0.2,
        y: entity.y - entity.height * 0.8,
        width: entity.width * 0.6,
        height: entity.height * 0.8
      };
    }
    if (entity.type === 'horizontalBar') {
      return {
        x: entity.x,
        y: entity.y - entity.height,
        width: entity.width,
        height: entity.height
      };
    }
    if (entity.type === 'lowWall') {
      return {
        x: entity.x,
        y: entity.y - entity.height,
        width: entity.width,
        height: entity.height
      };
    }
    return {
      x: entity.x,
      y: entity.y - entity.height,
      width: entity.width,
      height: entity.height
    };
  }

  private isColliding(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private addScorePopup(value: number, x: number, y: number): void {
    this.scorePopups.push({
      id: this.nextPopupId++,
      x,
      y,
      value,
      life: 0.5,
      maxLife: 0.5,
      alpha: 1
    });
  }

  private spawnBeatCoinParticles(entity: GameEntity): void {
    for (let i = 0; i < 12 && this.maxParticles > 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 100;
      entity.particles.push({
        x: entity.width / 2,
        y: entity.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        size: 3 + Math.random() * 4,
        color: '#a855f7',
        alpha: 1
      });
    }
  }

  public getEntities(): GameEntity[] {
    return this.entities;
  }

  public getScorePopups(): ScorePopup[] {
    return this.scorePopups;
  }

  public getWarningLeadTime(): number {
    return this.warningLeadTime;
  }

  public reset(): void {
    this.entities = [];
    this.scorePopups = [];
    this.lastBeatIndex = -1;
    this.nextEntityId = 0;
    this.nextPopupId = 0;
  }
}
