export class GameLoop {
  private ctx: CanvasRenderingContext2D;
  private running: boolean = false;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private onUpdate: (dt: number) => void;
  private onDraw: (ctx: CanvasRenderingContext2D) => void;

  constructor(
    ctx: CanvasRenderingContext2D,
    onUpdate: (dt: number) => void,
    onDraw: (ctx: CanvasRenderingContext2D) => void
  ) {
    this.ctx = ctx;
    this.onUpdate = onUpdate;
    this.onDraw = onDraw;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.running = false;
    if (this.animFrameId !== 0) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.033);
    this.lastTime = now;

    this.onUpdate(dt);

    const width = this.ctx.canvas.width;
    const height = this.ctx.canvas.height;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#0f0f1a';
    this.ctx.fillRect(0, 0, width, height);

    this.onDraw(this.ctx);

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}
