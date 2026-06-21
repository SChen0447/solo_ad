interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
  layer: 'near' | 'far';
  active: boolean;
}

export class Background {
  private stars: Star[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private nearSpawnTimer: number = 0;
  private farSpawnTimer: number = 0;
  private nearSpawnInterval: number = 1.5;
  private farSpawnInterval: number = 2.5;
  private maxStars: number = 50;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    for (let i = 0; i < 20; i++) {
      this.stars.push(this.createStar('near', Math.random() * canvasWidth));
      this.stars.push(this.createStar('far', Math.random() * canvasWidth));
    }
  }

  private createStar(layer: 'near' | 'far', startX?: number): Star {
    if (layer === 'near') {
      return {
        x: startX !== undefined ? startX : this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: 2,
        speed: 30,
        color: '#FFFFFF',
        layer: 'near',
        active: true
      };
    } else {
      return {
        x: startX !== undefined ? startX : this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: 3,
        speed: 60,
        color: '#87CEEB',
        layer: 'far',
        active: true
      };
    }
  }

  public update(dt: number): void {
    this.nearSpawnTimer += dt;
    this.farSpawnTimer += dt;

    if (this.nearSpawnTimer >= this.nearSpawnInterval) {
      this.nearSpawnTimer = 0;
      if (this.stars.filter(s => s.layer === 'near' && s.active).length < 30) {
        this.stars.push(this.createStar('near'));
      }
    }

    if (this.farSpawnTimer >= this.farSpawnInterval) {
      this.farSpawnTimer = 0;
      if (this.stars.filter(s => s.layer === 'far' && s.active).length < 30) {
        this.stars.push(this.createStar('far'));
      }
    }

    for (const star of this.stars) {
      if (!star.active) continue;
      star.x -= star.speed * dt;
      if (star.x < -star.size) {
        star.active = false;
      }
    }

    this.stars = this.stars.filter(s => s.active);
    if (this.stars.length > this.maxStars) {
      const excess = this.stars.length - this.maxStars;
      this.stars.splice(0, excess);
    }
  }

  public getStars(): Star[] {
    return this.stars;
  }

  public reset(): void {
    this.stars = [];
    this.nearSpawnTimer = 0;
    this.farSpawnTimer = 0;
    for (let i = 0; i < 20; i++) {
      this.stars.push(this.createStar('near', Math.random() * this.canvasWidth));
      this.stars.push(this.createStar('far', Math.random() * this.canvasWidth));
    }
  }
}
