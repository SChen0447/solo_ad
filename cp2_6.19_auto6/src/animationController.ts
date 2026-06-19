export interface SpringAnim {
  buildingId: string;
  startTime: number;
  duration: number;
  fromY: number;
  toY: number;
  done: boolean;
}

export interface StarParticle {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  driftX: number;
  driftY: number;
}

export interface WindowState {
  row: number;
  col: number;
  lit: boolean;
  color: string;
  flickerPhase: number;
  flickerSpeed: number;
}

export class AnimationController {
  private springAnims: SpringAnim[] = [];
  private stars: StarParticle[] = [];
  private windowStates: Map<string, WindowState[]> = new Map();
  private warningPhase: number = 0;
  private time: number = 0;
  private lastTimestamp: number = 0;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.lastTimestamp = performance.now();
    this.initStars(120);
  }

  updateSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.initStars(120);
  }

  private initStars(count: number): void {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight * 0.55,
        size: 0.5 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.15,
        driftY: (Math.random() - 0.5) * 0.05,
      });
    }
  }

  addSpringAnim(buildingId: string, fromY: number, toY: number): void {
    this.springAnims = this.springAnims.filter(a => a.buildingId !== buildingId || !a.done);
    this.springAnims.push({
      buildingId,
      startTime: this.time,
      duration: 0.7,
      fromY,
      toY,
      done: false,
    });
  }

  getSpringOffset(buildingId: string): number {
    const anim = this.springAnims.find(a => a.buildingId === buildingId && !a.done);
    if (!anim) return 0;
    const elapsed = this.time - anim.startTime;
    if (elapsed >= anim.duration) {
      anim.done = true;
      return 0;
    }
    const t = elapsed / anim.duration;
    const amplitude = anim.fromY - anim.toY;
    const damping = 8;
    const frequency = 12;
    const springValue =
      amplitude * Math.exp(-damping * t) * Math.cos(frequency * t);
    return springValue;
  }

  initWindowsForBuilding(buildingId: string, rows: number, cols: number): void {
    if (this.windowStates.has(buildingId)) return;
    const windows: WindowState[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isLit = Math.random() < 0.55;
        const pickBlue = Math.random() < 0.5;
        windows.push({
          row: r,
          col: c,
          lit: isLit,
          color: pickBlue ? '#7ec8e3' : '#f5a623',
          flickerPhase: Math.random() * Math.PI * 2,
          flickerSpeed: 0.2 + Math.random() * 0.8,
        });
      }
    }
    this.windowStates.set(buildingId, windows);
  }

  removeWindowsForBuilding(buildingId: string): void {
    this.windowStates.delete(buildingId);
  }

  getWindowStates(buildingId: string): WindowState[] {
    return this.windowStates.get(buildingId) || [];
  }

  getWarningLightAlpha(height: number): number {
    if (height < 200) return 0;
    const cycle = (Math.sin(this.warningPhase) + 1) / 2;
    return cycle > 0.6 ? 1 : 0.1;
  }

  getStarBrightness(star: StarParticle): number {
    const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset);
    return star.brightness * (0.5 + 0.5 * twinkle);
  }

  update(timestamp: number): void {
    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    this.time += dt;

    this.warningPhase += dt * 4;

    for (const star of this.stars) {
      star.x += star.driftX;
      star.y += star.driftY;
      if (star.x < 0) star.x = this.canvasWidth;
      if (star.x > this.canvasWidth) star.x = 0;
      if (star.y < 0) star.y = this.canvasHeight * 0.55;
      if (star.y > this.canvasHeight * 0.55) star.y = 0;
    }

    for (const [_id, windows] of this.windowStates) {
      for (const w of windows) {
        if (w.lit && Math.random() < 0.001) {
          w.lit = false;
        } else if (!w.lit && Math.random() < 0.0005) {
          w.lit = true;
        }
      }
    }
  }

  drawStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      const alpha = this.getStarBrightness(star);
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  drawWindows(
    ctx: CanvasRenderingContext2D,
    buildingId: string,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    windowRows: number,
    windowCols: number,
  ): void {
    const windows = this.getWindowStates(buildingId);
    if (windows.length === 0) return;

    const padX = bw * 0.1;
    const padY = bh * 0.06;
    const areaW = bw - padX * 2;
    const areaH = bh - padY * 2;
    const cellW = areaW / windowCols;
    const cellH = areaH / windowRows;
    const winW = cellW * 0.55;
    const winH = cellH * 0.45;

    for (const w of windows) {
      if (!w.lit) continue;
      const wx = bx + padX + w.col * cellW + (cellW - winW) / 2;
      const wy = by + padY + w.row * cellH + (cellH - winH) / 2;

      const flicker = 0.7 + 0.3 * Math.sin(this.time * w.flickerSpeed + w.flickerPhase);
      ctx.globalAlpha = flicker;
      ctx.fillStyle = w.color;
      ctx.fillRect(wx, wy, winW, winH);

      ctx.globalAlpha = flicker * 0.3;
      ctx.fillStyle = w.color;
      ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
    }
    ctx.globalAlpha = 1;
  }

  drawWarningLight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    height: number,
  ): void {
    if (height < 200) return;
    const alpha = this.getWarningLightAlpha(height);
    if (alpha < 0.05) return;

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 30, 30, ${alpha})`;
    ctx.fill();

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
    gradient.addColorStop(0, `rgba(255, 30, 30, ${alpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(255, 30, 30, 0)');
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}
