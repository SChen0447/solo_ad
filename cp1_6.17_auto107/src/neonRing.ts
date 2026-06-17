export class NeonRing {
  private x: number;
  private y: number;
  private baseRadius: number;
  private baseHue: number;
  private saturation: number = 90;
  private rotation: number = 0;
  private rotationSpeed: number = 0;

  private energy: number = 0;
  private targetEnergy: number = 0;
  private energySmoothing: number = 0.15;

  private minWidth: number = 2;
  private maxWidth: number = 12;
  private minLightness: number = 20;
  private maxLightness: number = 100;
  private maxExpansion: number = 0.1;

  private isBreathing: boolean = false;
  private breathStartTime: number = 0;
  private breathDuration: number = 300;
  private breathOpacity: number = 1;

  private pixelSegments: number = 24;
  private segmentGaps: number[] = [];

  constructor(x: number, y: number, baseRadius: number, baseHue: number, direction: number = 1) {
    this.x = x;
    this.y = y;
    this.baseRadius = baseRadius;
    this.baseHue = baseHue;
    this.rotationSpeed = 0.002 * direction;

    for (let i = 0; i < this.pixelSegments; i++) {
      this.segmentGaps.push(Math.random() * 0.1 + 0.02);
    }
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public setBaseRadius(radius: number): void {
    this.baseRadius = radius;
  }

  public setEnergy(energy: number): void {
    this.targetEnergy = Math.max(0, Math.min(1, energy));
  }

  public triggerBeat(): void {
    this.isBreathing = true;
    this.breathStartTime = performance.now();
    this.rotation += (15 * Math.PI) / 180;
  }

  public update(deltaTime: number): void {
    this.energy += (this.targetEnergy - this.energy) * this.energySmoothing;

    this.rotation += this.rotationSpeed * deltaTime * (0.5 + this.energy * 0.5);

    if (this.isBreathing) {
      const elapsed = performance.now() - this.breathStartTime;
      const progress = Math.min(elapsed / this.breathDuration, 1);

      if (progress < 0.5) {
        const t = progress / 0.5;
        this.breathOpacity = 1 - 0.7 * t;
      } else {
        const t = (progress - 0.5) / 0.5;
        this.breathOpacity = 0.3 + 0.7 * t;
      }

      if (progress >= 1) {
        this.isBreathing = false;
        this.breathOpacity = 1;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const currentRadius = this.baseRadius * (1 + this.energy * this.maxExpansion);
    const currentWidth = this.minWidth + (this.maxWidth - this.minWidth) * this.energy;
    const currentLightness = this.minLightness + (this.maxLightness - this.minLightness) * this.energy;
    const opacity = this.isBreathing ? this.breathOpacity : 1;

    const color = `hsla(${this.baseHue}, ${this.saturation}%, ${currentLightness}%, ${opacity})`;
    const glowColor = `hsla(${this.baseHue}, ${this.saturation}%, ${currentLightness}%, ${opacity * 0.8})`;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowBlur = 15;
    ctx.shadowColor = glowColor;

    this.drawPixelatedRing(ctx, currentRadius, currentWidth, color);

    ctx.restore();
  }

  private drawPixelatedRing(
    ctx: CanvasRenderingContext2D,
    radius: number,
    width: number,
    color: string
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';

    const segmentAngle = (Math.PI * 2) / this.pixelSegments;

    for (let i = 0; i < this.pixelSegments; i++) {
      const startAngle = i * segmentAngle + this.segmentGaps[i] * segmentAngle;
      const endAngle = (i + 1) * segmentAngle - this.segmentGaps[i] * segmentAngle;
      const arcRadius = radius + (i % 2 === 0 ? 0 : -2);

      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, startAngle, endAngle);
      ctx.stroke();
    }
  }

  public getBaseRadius(): number {
    return this.baseRadius;
  }

  public getEnergy(): number {
    return this.energy;
  }
}
