export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerConfig {
  size: number;
  speed: number;
  color: string;
}

const DEFAULT_CONFIG: PlayerConfig = {
  size: 20,
  speed: 3,
  color: '#4acc4a'
};

export class Player {
  public x: number;
  public y: number;
  public size: number;
  public speed: number;
  public color: string;

  private keys: Set<string> = new Set();

  constructor(x: number, y: number, config?: Partial<PlayerConfig>) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    this.x = x;
    this.y = y;
    this.size = cfg.size;
    this.speed = cfg.speed;
    this.color = cfg.color;
  }

  public handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  public handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  public update(canvasWidth: number, canvasHeight: number): void {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w')) dy -= 1;
    if (this.keys.has('s')) dy += 1;
    if (this.keys.has('a')) dx -= 1;
    if (this.keys.has('d')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }

    this.x += dx * this.speed;
    this.y += dy * this.speed;

    const halfSize = this.size / 2;
    this.x = Math.max(halfSize, Math.min(canvasWidth - halfSize, this.x));
    this.y = Math.max(halfSize, Math.min(canvasHeight - halfSize, this.y));
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const half = this.size / 2;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#2a9a2a';
    ctx.lineWidth = 2;
    ctx.fillRect(this.x - half, this.y - half, this.size, this.size);
    ctx.strokeRect(this.x - half, this.y - half, this.size, this.size);
    ctx.restore();
  }

  public getPosition(): Vector2 {
    return { x: this.x, y: this.y };
  }
}
