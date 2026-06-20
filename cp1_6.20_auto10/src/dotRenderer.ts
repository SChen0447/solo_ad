export interface BeatPoint {
  readonly x: number;
  readonly y: number;
  readonly time: number;
}

export interface DotState {
  x: number;
  y: number;
  targetIndex: number;
  prevIndex: number;
}

interface StarParticle {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  twinkleSpeed: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface RenderMetrics {
  readonly dotSize: number;
  readonly pathRange: number;
  readonly isMobile: boolean;
}

const DOT_COLOR = '#ffe066';
const DOT_GLOW_COLOR = '#fff4a3';
const PATH_POINT_COLOR = 'rgba(255, 224, 102, 0.35)';
const PATH_LINE_COLOR = 'rgba(124, 77, 255, 0.25)';
const CURSOR_COLOR = 'rgba(255, 255, 255, 0.7)';

export class DotRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private stars: StarParticle[] = [];
  private trail: TrailPoint[] = [];
  private beatPoints: BeatPoint[] = [];
  private cursorX = 0;
  private cursorY = 0;
  private hasCursor = false;
  private dotSize = 18;
  private pathRange = 1.0;
  private isMobile = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.resize();
    this.initStars();
    this.initCursorListeners();
  }

  public get metrics(): RenderMetrics {
    return {
      dotSize: this.dotSize,
      pathRange: this.pathRange,
      isMobile: this.isMobile
    };
  }

  public get cursor(): { x: number; y: number; active: boolean } {
    return {
      x: this.cursorX,
      y: this.cursorY,
      active: this.hasCursor
    };
  }

  public resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.isMobile = this.width < 640 || 'ontouchstart' in window;
    this.dotSize = this.isMobile ? 14 : 18;
    this.pathRange = this.isMobile ? 0.85 : 1.0;

    if (this.stars.length > 0) {
      this.initStars();
    }
  }

  private initStars(): void {
    const starCount = this.isMobile
      ? Math.floor((this.width * this.height) / 12000)
      : Math.floor((this.width * this.height) / 8000);
    const count = Math.max(60, Math.min(starCount, 200));

    this.stars = new Array(count).fill(0).map(() => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      size: 0.4 + Math.random() * 1.8,
      baseAlpha: 0.15 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.6 + Math.random() * 2.0
    }));
  }

  private initCursorListeners(): void {
    const updateCursor = (clientX: number, clientY: number): void => {
      const rect = this.canvas.getBoundingClientRect();
      this.cursorX = clientX - rect.left;
      this.cursorY = clientY - rect.top;
      this.hasCursor = true;
    };

    this.canvas.addEventListener('mousemove', (e) => {
      updateCursor(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        updateCursor(e.touches[0].clientX, e.touches[0].clientY);
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        updateCursor(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    this.canvas.addEventListener('mouseleave', () => {
      this.hasCursor = false;
    });
  }

  public generatePath(beatTimes: number[], duration: number): BeatPoint[] {
    if (beatTimes.length === 0) {
      this.beatPoints = [];
      return [];
    }

    const paddingX = this.width * 0.12;
    const paddingY = this.height * 0.15;
    const usableW = (this.width - paddingX * 2) * this.pathRange;
    const usableH = (this.height - paddingY * 2) * this.pathRange;
    const offsetX = (this.width - usableW) / 2;
    const offsetY = (this.height - usableH) / 2;

    const numSegments = 5;
    const anchors: { x: number; y: number }[] = [];

    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      let ax: number;
      let ay: number;

      if (i === 0) {
        ax = offsetX + usableW * 0.1;
        ay = offsetY + usableH * (0.3 + Math.random() * 0.4);
      } else if (i === numSegments) {
        ax = offsetX + usableW * 0.9;
        ay = offsetY + usableH * (0.3 + Math.random() * 0.4);
      } else {
        const patternType = Math.floor(Math.random() * 4);
        switch (patternType) {
          case 0:
            ax = offsetX + usableW * (0.2 + t * 0.6 + (Math.random() - 0.5) * 0.2);
            ay = offsetY + usableH * (0.15 + Math.abs(Math.sin(t * Math.PI * 3)) * 0.7);
            break;
          case 1:
            ax = offsetX + usableW * (0.15 + Math.abs(Math.cos(t * Math.PI * 2.5)) * 0.7);
            ay = offsetY + usableH * (0.2 + t * 0.6 + (Math.random() - 0.5) * 0.15);
            break;
          case 2:
            ax = offsetX + usableW * (0.1 + (0.5 + 0.4 * Math.sin(t * Math.PI * 4)) * 0.9);
            ay = offsetY + usableH * (0.15 + (0.5 + 0.35 * Math.cos(t * Math.PI * 3)) * 0.85);
            break;
          default:
            ax = offsetX + usableW * (0.15 + t * 0.7 + (Math.sin(t * Math.PI * 5) * 0.12));
            ay = offsetY + usableH * (0.5 + Math.sin(t * Math.PI * 6 + 0.5) * 0.35);
        }
      }
      anchors.push({ x: ax, y: ay });
    }

    const points: BeatPoint[] = new Array(beatTimes.length);

    for (let i = 0; i < beatTimes.length; i++) {
      const globalT = duration > 0 ? beatTimes[i] / duration : 0;
      const segProgress = globalT * numSegments;
      const segIndex = Math.min(Math.floor(segProgress), numSegments - 1);
      const localT = segProgress - segIndex;

      const p0 = anchors[segIndex];
      const p1 = anchors[Math.min(segIndex + 1, numSegments)];

      const wobbleAmp = Math.min(usableW, usableH) * 0.08;
      const wobbleX = Math.sin(i * 0.7 + segIndex * 2.3) * wobbleAmp * 0.5;
      const wobbleY = Math.cos(i * 0.5 + segIndex * 1.7) * wobbleAmp * 0.5;

      const easeT = localT * localT * (3 - 2 * localT);

      points[i] = {
        x: p0.x + (p1.x - p0.x) * easeT + wobbleX,
        y: p0.y + (p1.y - p0.y) * easeT + wobbleY,
        time: beatTimes[i]
      };
    }

    this.beatPoints = points;
    return points;
  }

  public computeDotPosition(currentTime: number): DotState {
    if (this.beatPoints.length === 0) {
      return { x: this.width / 2, y: this.height / 2, targetIndex: 0, prevIndex: 0 };
    }

    let targetIndex = 0;
    while (
      targetIndex < this.beatPoints.length &&
      this.beatPoints[targetIndex].time <= currentTime
    ) {
      targetIndex++;
    }

    if (targetIndex === 0) {
      const first = this.beatPoints[0];
      const preTime = 1.2;
      if (currentTime < 0) {
        return {
          x: first.x - (first.x - this.width / 2) * 0.5,
          y: first.y - (first.y - this.height / 2) * 0.5,
          targetIndex: 0,
          prevIndex: 0
        };
      }
      const t = Math.min(currentTime / preTime, 1);
      const easeT = t * t * (3 - 2 * t);
      return {
        x: this.width / 2 + (first.x - this.width / 2) * easeT,
        y: this.height / 2 + (first.y - this.height / 2) * easeT,
        targetIndex: 0,
        prevIndex: 0
      };
    }

    if (targetIndex >= this.beatPoints.length) {
      const last = this.beatPoints[this.beatPoints.length - 1];
      return {
        x: last.x,
        y: last.y,
        targetIndex: this.beatPoints.length - 1,
        prevIndex: this.beatPoints.length - 1
      };
    }

    const prev = this.beatPoints[targetIndex - 1];
    const next = this.beatPoints[targetIndex];
    const interval = next.time - prev.time;
    const rawT = interval > 0 ? (currentTime - prev.time) / interval : 1;
    const t = Math.max(0, Math.min(rawT, 1));
    const easeT = t * t * (3 - 2 * t);

    return {
      x: prev.x + (next.x - prev.x) * easeT,
      y: prev.y + (next.y - prev.y) * easeT,
      targetIndex,
      prevIndex: targetIndex - 1
    };
  }

  public computeHitScore(dotX: number, dotY: number, cursorActive: boolean): {
    distance: number;
    normalizedDistance: number;
  } {
    if (!cursorActive) {
      return { distance: Infinity, normalizedDistance: Infinity };
    }
    const dx = dotX - this.cursorX;
    const dy = dotY - this.cursorY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const hitRadius = this.dotSize * 3.2;
    return {
      distance,
      normalizedDistance: distance / hitRadius
    };
  }

  public render(
    time: number,
    dot: DotState,
    currentTime: number,
    lookaheadSeconds: number = 3.5
  ): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    this.renderStars(time);

    this.renderPath(currentTime, lookaheadSeconds);

    this.renderBeatMarkers(currentTime, lookaheadSeconds);

    this.updateTrail(dot.x, dot.y);
    this.renderTrail();

    this.renderDot(dot.x, dot.y, dot.targetIndex, currentTime);

    this.renderCursor();
  }

  private renderStars(time: number): void {
    const ctx = this.ctx;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const alpha = star.baseAlpha * (0.45 + 0.55 * Math.abs(Math.sin(time * star.twinkleSpeed + star.phase)));

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
      ctx.fill();

      if (star.size > 1.2 && alpha > 0.4) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
        glow.addColorStop(0, `rgba(200, 220, 255, ${alpha * 0.25})`);
        glow.addColorStop(1, 'rgba(200, 220, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fill();
      }
    }
  }

  private renderPath(currentTime: number, lookaheadSeconds: number): void {
    if (this.beatPoints.length < 2) return;

    const ctx = this.ctx;
    const showUntil = currentTime + lookaheadSeconds;
    const showFrom = Math.max(0, currentTime - 0.5);

    let startIdx = 0;
    while (startIdx < this.beatPoints.length - 1 && this.beatPoints[startIdx + 1].time < showFrom) {
      startIdx++;
    }

    let endIdx = startIdx;
    while (endIdx < this.beatPoints.length && this.beatPoints[endIdx].time <= showUntil) {
      endIdx++;
    }
    endIdx = Math.min(endIdx, this.beatPoints.length - 1);

    if (endIdx - startIdx < 1) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = startIdx; i < endIdx; i++) {
      const p0 = this.beatPoints[i];
      const p1 = this.beatPoints[i + 1];
      const timeUntil = Math.max(0, p0.time - currentTime);
      const alpha = Math.max(0.08, 0.38 - (timeUntil / lookaheadSeconds) * 0.3);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = PATH_LINE_COLOR.replace('0.25', alpha.toFixed(3));
      ctx.lineWidth = this.isMobile ? 1.5 : 2;
      ctx.stroke();
    }
  }

  private renderBeatMarkers(currentTime: number, lookaheadSeconds: number): void {
    if (this.beatPoints.length === 0) return;

    const ctx = this.ctx;
    const showUntil = currentTime + lookaheadSeconds;

    for (let i = 0; i < this.beatPoints.length; i++) {
      const p = this.beatPoints[i];
      if (p.time < currentTime - 0.1 || p.time > showUntil) continue;

      const timeUntil = p.time - currentTime;
      const proximity = 1 - Math.min(1, Math.max(0, timeUntil / lookaheadSeconds));
      const pulseSize = 1 + Math.sin(currentTime * 6 + i) * 0.08;

      let markerSize: number;
      let markerAlpha: number;

      if (timeUntil <= 0.35 && timeUntil >= -0.15) {
        markerSize = this.dotSize * 0.95 * (1.1 + proximity * 0.5) * pulseSize;
        markerAlpha = 0.75 + proximity * 0.25;
      } else {
        markerSize = this.dotSize * 0.5 * (0.7 + proximity * 0.7) * pulseSize;
        markerAlpha = 0.25 + proximity * 0.35;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, markerSize, 0, Math.PI * 2);
      ctx.fillStyle = PATH_POINT_COLOR.replace('0.35', markerAlpha.toFixed(3));
      ctx.fill();

      if (timeUntil <= 0.35 && timeUntil >= -0.1) {
        const ringR = markerSize * 1.8 + (1 - Math.max(0, Math.min(1, timeUntil / 0.35))) * this.dotSize * 2;
        const ringAlpha = Math.max(0, 0.45 - (ringR - markerSize) / (this.dotSize * 2) * 0.45);
        ctx.beginPath();
        ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 224, 102, ${ringAlpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  private updateTrail(x: number, y: number): void {
    this.trail.push({ x, y, alpha: 1 });

    const maxPoints = this.isMobile ? 18 : 26;
    if (this.trail.length > maxPoints) {
      this.trail.splice(0, this.trail.length - maxPoints);
    }

    for (let i = 0; i < this.trail.length; i++) {
      const t = i / this.trail.length;
      this.trail[i].alpha = t * t;
    }
  }

  private renderTrail(): void {
    if (this.trail.length < 2) return;

    const ctx = this.ctx;

    for (let i = 1; i < this.trail.length; i++) {
      const p0 = this.trail[i - 1];
      const p1 = this.trail[i];
      const alpha = p1.alpha * 0.55;
      const size = this.dotSize * 0.25 + p1.alpha * this.dotSize * 0.45;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = `rgba(255, 224, 102, ${alpha})`;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  private renderDot(
    x: number,
    y: number,
    targetIndex: number,
    currentTime: number
  ): void {
    const ctx = this.ctx;

    let nextBeatProgress = 0;
    if (targetIndex < this.beatPoints.length) {
      const prevTime = targetIndex > 0 ? this.beatPoints[targetIndex - 1].time : currentTime - 0.5;
      const nextTime = this.beatPoints[targetIndex].time;
      const interval = nextTime - prevTime;
      nextBeatProgress = interval > 0
        ? Math.max(0, Math.min(1, 1 - (nextTime - currentTime) / interval))
        : 0;
    }
    const pulse = 1 + Math.sin(nextBeatProgress * Math.PI * 2) * 0.18;
    const size = this.dotSize * pulse;

    const glowLayers = [
      { r: size * 4.5, c: 'rgba(255, 224, 102, 0.07)' },
      { r: size * 3, c: 'rgba(255, 224, 102, 0.14)' },
      { r: size * 2, c: 'rgba(255, 244, 163, 0.25)' },
      { r: size * 1.35, c: 'rgba(255, 244, 163, 0.42)' }
    ];

    for (const layer of glowLayers) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, layer.r);
      g.addColorStop(0, layer.c);
      g.addColorStop(1, 'rgba(255, 224, 102, 0)');
      ctx.beginPath();
      ctx.arc(x, y, layer.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    const coreGrad = ctx.createRadialGradient(
      x - size * 0.3, y - size * 0.3, 0,
      x, y, size
    );
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.35, DOT_GLOW_COLOR);
    coreGrad.addColorStop(1, DOT_COLOR);

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();
  }

  private renderCursor(): void {
    if (!this.hasCursor) return;

    const ctx = this.ctx;
    const size = (this.isMobile ? 22 : 26);

    ctx.save();
    ctx.translate(this.cursorX, this.cursorY);

    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.strokeStyle = CURSOR_COLOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(-size * 0.6, 0);
    ctx.lineTo(-size * 0.2, 0);
    ctx.moveTo(size * 0.2, 0);
    ctx.lineTo(size * 0.6, 0);
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(0, -size * 0.2);
    ctx.moveTo(0, size * 0.2);
    ctx.lineTo(0, size * 0.6);
    ctx.strokeStyle = CURSOR_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.trail = [];
    this.beatPoints = [];
  }
}
