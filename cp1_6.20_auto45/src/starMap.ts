export interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  phase: number;
  period: number;
}

export interface Planet {
  orbitX: number;
  orbitY: number;
  orbitRadius: number;
  angle: number;
  orbitSpeed: number;
  size: number;
  color: string;
}

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export class StarMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private planets: Planet[] = [];
  public camera: Camera = { x: 0, y: 0, scale: 1 };
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private cameraStart = { x: 0, y: 0 };
  public readonly worldWidth: number;
  public readonly worldHeight: number;
  private readonly MIN_SCALE = 0.2;
  private readonly MAX_SCALE = 2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.worldWidth = canvas.width * 3;
    this.worldHeight = canvas.height * 3;
    this.generateStars();
    this.generatePlanets();
    this.bindEvents();
    this.centerCamera();
  }

  private centerCamera(): void {
    this.camera.x = this.worldWidth / 2 - this.canvas.width / 2;
    this.camera.y = this.worldHeight / 2 - this.canvas.height / 2;
  }

  private generateStars(): void {
    const count = 300;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.worldWidth,
        y: Math.random() * this.worldHeight,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random(),
        phase: Math.random() * Math.PI * 2,
        period: 2000 + Math.random() * 2000
      });
    }
  }

  private generatePlanets(): void {
    const count = 5;
    const colors = ['#4a90d9', '#d94a6b', '#4ad98b', '#d9a84a', '#9b4ad9'];
    for (let i = 0; i < count; i++) {
      this.planets.push({
        orbitX: Math.random() * this.worldWidth,
        orbitY: Math.random() * this.worldHeight,
        orbitRadius: 80 + Math.random() * 120,
        angle: Math.random() * Math.PI * 2,
        orbitSpeed: (Math.random() * 0.0002 + 0.0001) * (Math.random() > 0.5 ? 1 : -1),
        size: 6 + Math.random() * 10,
        color: colors[i % colors.length]
      });
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  public isCameraDragging(): boolean {
    return this.isDragging;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.cameraStart = { x: this.camera.x, y: this.camera.y };
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const dx = (e.clientX - this.dragStart.x) / this.camera.scale;
      const dy = (e.clientY - this.dragStart.y) / this.camera.scale;
      this.camera.x = this.cameraStart.x - dx;
      this.camera.y = this.cameraStart.y - dy;
      this.clampCamera();
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = this.screenToWorldX(mouseX);
    const worldY = this.screenToWorldY(mouseY);
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, this.camera.scale + delta));
    this.camera.scale = newScale;
    this.camera.x = worldX - mouseX / newScale;
    this.camera.y = worldY - mouseY / newScale;
    this.clampCamera();
  }

  private clampCamera(): void {
    const minX = -this.worldWidth * 0.3;
    const maxX = this.worldWidth * 0.7;
    const minY = -this.worldHeight * 0.3;
    const maxY = this.worldHeight * 0.7;
    this.camera.x = Math.max(minX, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(minY, Math.min(maxY, this.camera.y));
  }

  public screenToWorldX(sx: number): number {
    return sx / this.camera.scale + this.camera.x;
  }

  public screenToWorldY(sy: number): number {
    return sy / this.camera.scale + this.camera.y;
  }

  public worldToScreenX(wx: number): number {
    return (wx - this.camera.x) * this.camera.scale;
  }

  public worldToScreenY(wy: number): number {
    return (wy - this.camera.y) * this.camera.scale;
  }

  public update(deltaTime: number): void {
    const now = performance.now();
    for (const star of this.stars) {
      star.brightness = 0.4 + 0.6 * Math.abs(Math.sin(now / star.period * Math.PI + star.phase));
    }
    for (const planet of this.planets) {
      planet.angle += planet.orbitSpeed * deltaTime;
    }
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.scale(this.camera.scale, this.camera.scale);
    ctx.translate(-this.camera.x, -this.camera.y);

    for (const star of this.stars) {
      const alpha = star.brightness;
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), Math.ceil(star.size), Math.ceil(star.size));
      if (star.size > 1.5) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), 1, 1);
      }
    }

    for (const planet of this.planets) {
      const px = planet.orbitX + Math.cos(planet.angle) * planet.orbitRadius;
      const py = planet.orbitY + Math.sin(planet.angle) * planet.orbitRadius;

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(planet.orbitX, planet.orbitY, planet.orbitRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = planet.color;
      ctx.beginPath();
      ctx.arc(px, py, planet.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(px - planet.size * 0.3, py - planet.size * 0.3, planet.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
