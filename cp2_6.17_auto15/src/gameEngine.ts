import {
  Car,
  CarModel,
  Particle,
  Track,
  TrackType,
  InputState,
  BackgroundElement,
  TrackSegment,
  SpoilerType,
  TireType
} from './types';

const PIXEL_SIZE = 2;
const BASE_MAX_SPEED = 150;
const ACCELERATION = 60;
const DECELERATION = 100;
const MAX_STEER_ANGLE = Math.PI / 6;
const STEER_SPEED = Math.PI * 1.5;
const DRIFT_TILT = 15 * Math.PI / 180;
const TRACK_LENGTH = 2000;
const TRACK_WIDTH = 120;

const CAR_COLORS: Record<CarModel, string> = {
  redLightning: '#ff3333',
  blueGale: '#3366ff',
  greenHawk: '#33cc33'
};

const CAR_NAMES: Record<CarModel, string> = {
  redLightning: '红色闪电',
  blueGale: '蓝色疾风',
  greenHawk: '绿色飞鹰'
};

const SPOILER_STATS: Record<SpoilerType, { speedBonus: number; steerPenalty: number }> = {
  normal: { speedBonus: 1.05, steerPenalty: 0.95 },
  turbo: { speedBonus: 1.10, steerPenalty: 0.95 },
  rocket: { speedBonus: 1.15, steerPenalty: 0.95 }
};

const TIRE_GRIP: Record<TireType, number> = {
  road: 1.0,
  drift: 0.7,
  rain: 1.3
};

export class GameEngine {
  public car: Car;
  public track: Track | null = null;
  public particles: Particle[] = [];
  public backgroundElements: BackgroundElement[] = [];
  public bgScrollX: number = 0;
  public lapProgress: number = 0;
  public lapStartTime: number = 0;
  public lapTime: number = 0;
  public maxSpeedReached: number = 0;
  public perfectDriftTimer: number = 0;
  public perfectDriftActive: boolean = false;
  public perfectDriftCount: number = 0;
  public goldFlashTimer: number = 0;
  public raceFinished: boolean = false;
  public canvasWidth: number = 800;
  public canvasHeight: number = 600;

  private input: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    shift: false
  };

  private lastFrameTime: number = 0;

  constructor() {
    this.car = this.createDefaultCar('redLightning', CAR_COLORS.redLightning);
  }

  createDefaultCar(model: CarModel, color: string, spoiler: SpoilerType = 'normal', tire: TireType = 'road'): Car {
    return {
      x: 100,
      y: 0,
      angle: 0,
      tiltAngle: 0,
      speed: 0,
      maxSpeed: BASE_MAX_SPEED * SPOILER_STATS[spoiler].speedBonus,
      acceleration: ACCELERATION,
      deceleration: DECELERATION,
      steeringSpeed: STEER_SPEED * SPOILER_STATS[spoiler].steerPenalty,
      maxSteerAngle: MAX_STEER_ANGLE,
      currentSteerAngle: 0,
      grip: TIRE_GRIP[tire],
      friction: 0.98,
      width: 60,
      height: 40,
      color: color,
      baseColor: CAR_COLORS[model],
      model: model,
      spoiler: spoiler,
      tire: tire,
      isDrifting: false,
      driftTime: 0,
      boostTimer: 0,
      boostMultiplier: 1,
      warningTimer: 0,
      slideInertiaTimer: 0
    };
  }

  applyModifications(model: CarModel, color: string, spoiler: SpoilerType, tire: TireType): void {
    const newCar = this.createDefaultCar(model, color, spoiler, tire);
    newCar.x = this.car.x;
    newCar.y = this.car.y;
    newCar.angle = this.car.angle;
    this.car = newCar;
  }

  setInput(input: InputState): void {
    this.input = { ...input };
  }

  generateTrack(type: TrackType): Track {
    const segments: TrackSegment[] = [];
    let pos = 0;
    const segLength = 250;

    while (pos < TRACK_LENGTH) {
      if (type === 'circuit') {
        segments.push({ start: pos, end: pos + segLength, type: 'straight' });
        pos += segLength;
        if (pos < TRACK_LENGTH) {
          segments.push({ start: pos, end: pos + segLength, type: 'curve', radius: 100, direction: (segments.length % 2 === 0 ? 1 : -1) as 1 | -1 });
          pos += segLength;
        }
      } else if (type === 'mountain') {
        const terrainType = segments.length % 4;
        if (terrainType === 0) {
          segments.push({ start: pos, end: pos + segLength, type: 'straight' });
        } else if (terrainType === 1) {
          segments.push({ start: pos, end: pos + segLength, type: 'uphill' });
        } else if (terrainType === 2) {
          segments.push({ start: pos, end: pos + segLength, type: 'curve', radius: 100, direction: 1 });
        } else {
          segments.push({ start: pos, end: pos + segLength, type: 'downhill' });
        }
        pos += segLength;
      } else {
        segments.push({ start: pos, end: pos + segLength * 1.5, type: 'straight' });
        pos += segLength * 1.5;
        if (pos < TRACK_LENGTH) {
          segments.push({ start: pos, end: pos + segLength, type: 'curve', radius: 150, direction: (segments.length % 2 === 0 ? 1 : -1) as 1 | -1 });
          pos += segLength;
        }
      }
    }

    const bgColors: Record<TrackType, string> = {
      circuit: '#2d5a2d',
      mountain: '#6b6b6b',
      snow: '#e8e8e8'
    };

    const frictionMult: Record<TrackType, number> = {
      circuit: 1.0,
      mountain: 1.0,
      snow: 0.6
    };

    return {
      type,
      length: TRACK_LENGTH,
      width: TRACK_WIDTH,
      segments,
      bgColor: bgColors[type],
      frictionMultiplier: frictionMult[type],
      checkpoints: [TRACK_LENGTH * 0.25, TRACK_LENGTH * 0.5, TRACK_LENGTH * 0.75]
    };
  }

  startRace(trackType: TrackType, carModel: CarModel, carColor: string, spoiler: SpoilerType, tire: TireType): void {
    this.applyModifications(carModel, carColor, spoiler, tire);
    this.track = this.generateTrack(trackType);
    this.car.x = 150;
    this.car.y = this.canvasHeight / 2;
    this.car.angle = 0;
    this.car.speed = 0;
    this.lapProgress = 0;
    this.lapStartTime = performance.now();
    this.lapTime = 0;
    this.maxSpeedReached = 0;
    this.perfectDriftCount = 0;
    this.perfectDriftActive = false;
    this.goldFlashTimer = 0;
    this.raceFinished = false;
    this.particles = [];
    this.generateBackground();
    this.lastFrameTime = performance.now();
  }

  generateBackground(): void {
    this.backgroundElements = [];
    const colors = this.getTrackColors();

    for (let i = 0; i < 8; i++) {
      this.backgroundElements.push({
        x: i * 300 + Math.random() * 100,
        y: this.canvasHeight * 0.2 + Math.random() * 50,
        type: 'mountain',
        width: 200 + Math.random() * 100,
        height: 120 + Math.random() * 60,
        color: colors.mountain
      });
    }

    for (let i = 0; i < 15; i++) {
      this.backgroundElements.push({
        x: i * 150 + Math.random() * 80,
        y: this.canvasHeight * 0.35 + Math.random() * 40,
        type: 'tree',
        width: 24,
        height: 40,
        color: colors.tree
      });
    }

    for (let i = 0; i < 6; i++) {
      this.backgroundElements.push({
        x: i * 200 + Math.random() * 100,
        y: 30 + Math.random() * 40,
        type: 'cloud',
        width: 80 + Math.random() * 40,
        height: 24,
        color: '#ffffff'
      });
    }
  }

  private getTrackColors(): { mountain: string; tree: string; road: string } {
    if (!this.track) return { mountain: '#5a5a7a', tree: '#2d7a2d', road: '#444444' };
    switch (this.track.type) {
      case 'circuit':
        return { mountain: '#4a6a4a', tree: '#1f5f1f', road: '#444444' };
      case 'mountain':
        return { mountain: '#7a7a7a', tree: '#4a6a4a', road: '#555555' };
      case 'snow':
        return { mountain: '#c8d0e0', tree: '#8aa0a0', road: '#a0a0b0' };
      default:
        return { mountain: '#5a5a7a', tree: '#2d7a2d', road: '#444444' };
    }
  }

  update(): void {
    if (this.raceFinished || !this.track) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;

    this.lapTime = (now - this.lapStartTime) / 1000;

    this.updateCarPhysics(dt);
    this.updateDrift(dt);
    this.updateBoost(dt);
    this.checkCollision();
    this.updateParticles(dt);
    this.updateBackground(dt);
    this.checkLapCompletion();

    if (this.car.speed > this.maxSpeedReached) {
      this.maxSpeedReached = this.car.speed;
    }

    if (this.goldFlashTimer > 0) {
      this.goldFlashTimer -= dt;
    }
    if (this.car.warningTimer > 0) {
      this.car.warningTimer -= dt;
    }
    if (this.car.slideInertiaTimer > 0) {
      this.car.slideInertiaTimer -= dt;
    }
  }

  private updateCarPhysics(dt: number): void {
    const car = this.car;
    const input = this.input;

    const effectiveMaxSpeed = car.maxSpeed * car.boostMultiplier;
    const trackSpeedMod = this.getTrackSpeedModifier();

    if (input.up) {
      car.speed = Math.min(car.speed + car.acceleration * dt, effectiveMaxSpeed * trackSpeedMod);
    } else if (input.down) {
      car.speed = Math.max(car.speed - car.deceleration * dt, 0);
    } else {
      const friction = car.friction * (this.track?.frictionMultiplier || 1) * car.grip;
      car.speed *= Math.pow(friction, dt * 60);
    }

    let steerInput = 0;
    if (input.left) steerInput -= 1;
    if (input.right) steerInput += 1;

    if (car.isDrifting) {
      steerInput *= 1.5;
    }

    const targetSteer = steerInput * car.maxSteerAngle;
    car.currentSteerAngle += (targetSteer - car.currentSteerAngle) * Math.min(dt * 8, 1);

    const speedFactor = Math.min(car.speed / 50, 1);
    car.angle += car.currentSteerAngle * speedFactor * (car.speed > 0 ? 1 : 0) * dt;

    const moveX = Math.cos(car.angle) * car.speed * dt;
    const moveY = Math.sin(car.angle) * car.speed * dt;
    car.x += moveX;
    car.y += moveY;

    this.lapProgress += Math.sqrt(moveX * moveX + moveY * moveY);

    const targetTilt = car.isDrifting ? (steerInput * DRIFT_TILT) : 0;
    if (car.slideInertiaTimer > 0) {
      car.tiltAngle += (targetTilt * 0.3 - car.tiltAngle) * Math.min(dt * 3, 1);
    } else {
      car.tiltAngle += (targetTilt - car.tiltAngle) * Math.min(dt * 10, 1);
    }
  }

  private getTrackSpeedModifier(): number {
    if (!this.track) return 1;
    const seg = this.getCurrentSegment();
    if (seg.type === 'uphill') return 0.8;
    if (seg.type === 'downhill') return 1.2;
    return 1;
  }

  private getCurrentSegment(): TrackSegment {
    if (!this.track) return { start: 0, end: 1, type: 'straight' };
    const prog = this.lapProgress % this.track.length;
    for (const seg of this.track.segments) {
      if (prog >= seg.start && prog < seg.end) return seg;
    }
    return this.track.segments[0];
  }

  private updateDrift(dt: number): void {
    const car = this.car;
    const input = this.input;

    const wasDrifting = car.isDrifting;
    car.isDrifting = input.shift && (input.left || input.right) && car.speed > 30;

    if (car.isDrifting) {
      car.driftTime += dt;
      this.spawnDriftParticles();

      if (car.driftTime > 3 && !this.perfectDriftActive) {
        this.triggerPerfectDrift();
      }
    } else {
      if (wasDrifting) {
        car.slideInertiaTimer = 0.3;
      }
      car.driftTime = 0;
    }
  }

  private spawnDriftParticles(): void {
    const car = this.car;
    const rearX = car.x - Math.cos(car.angle) * (car.width / 2);
    const rearY = car.y - Math.sin(car.angle) * (car.width / 2);
    const perpX = -Math.sin(car.angle);
    const perpY = Math.cos(car.angle);

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const offset = (car.height / 2 - 4) * side;
      for (let j = 0; j < 2; j++) {
        const life = 0.3 + Math.random() * 0.2;
        this.particles.push({
          x: rearX + perpX * offset + (Math.random() - 0.5) * 6,
          y: rearY + perpY * offset + (Math.random() - 0.5) * 6,
          vx: -Math.cos(car.angle) * (20 + Math.random() * 30) + (Math.random() - 0.5) * 20,
          vy: -Math.sin(car.angle) * (20 + Math.random() * 30) + (Math.random() - 0.5) * 20,
          life: life,
          maxLife: life,
          size: 6 + Math.random() * 6,
          color: '#ff6600'
        });
      }
    }
  }

  private triggerPerfectDrift(): void {
    this.perfectDriftActive = true;
    this.perfectDriftTimer = 4;
    this.car.boostMultiplier = 1.15;
    this.goldFlashTimer = 0.8;
    this.perfectDriftCount++;
  }

  private updateBoost(dt: number): void {
    if (this.perfectDriftTimer > 0) {
      this.perfectDriftTimer -= dt;
      if (this.perfectDriftTimer <= 0) {
        this.car.boostMultiplier = 1;
        this.perfectDriftActive = false;
      }
    }
  }

  private checkCollision(): void {
    if (!this.track) return;
    const car = this.car;
    const trackCenterY = this.canvasHeight / 2;
    const trackHalfWidth = this.track.width / 2;

    if (car.y < trackCenterY - trackHalfWidth + 8 || car.y > trackCenterY + trackHalfWidth - 8) {
      if (car.warningTimer <= 0) {
        car.speed *= 0.7;
        car.warningTimer = 0.5;
      }
      car.y = Math.max(trackCenterY - trackHalfWidth + 8, Math.min(trackCenterY + trackHalfWidth - 8, car.y));
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateBackground(dt: number): void {
    this.bgScrollX += this.car.speed * dt * 0.6 + 2;
  }

  private checkLapCompletion(): void {
    if (!this.track) return;
    if (this.lapProgress >= this.track.length) {
      this.raceFinished = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.renderBackground(ctx);
    this.renderTrack(ctx);
    this.renderParticles(ctx);
    this.renderCar(ctx);

    if (this.goldFlashTimer > 0) {
      ctx.fillStyle = `rgba(255, 215, 0, ${0.3 * (this.goldFlashTimer / 0.8)})`;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    if (this.car.warningTimer > 0 && Math.floor(this.car.warningTimer * 20) % 2 === 0) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, this.canvasWidth - 4, this.canvasHeight - 4);
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const colors = this.getTrackColors();
    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight * 0.5);
    skyGradient.addColorStop(0, '#1a1a3e');
    skyGradient.addColorStop(1, '#2a2a4e');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight * 0.5);

    ctx.fillStyle = colors.mountain.substring(0, 1) + '8' + colors.mountain.substring(2);
    for (const el of this.backgroundElements) {
      if (el.type !== 'mountain') continue;
      const sx = ((el.x - this.bgScrollX * 0.3) % (this.canvasWidth + 400)) - 200;
      this.drawPixelMountain(ctx, sx, el.y, el.width, el.height, colors.mountain);
    }

    for (const el of this.backgroundElements) {
      if (el.type !== 'cloud') continue;
      const sx = ((el.x - this.bgScrollX * 0.1) % (this.canvasWidth + 300)) - 150;
      this.drawPixelCloud(ctx, sx, el.y, el.width, el.height);
    }

    for (const el of this.backgroundElements) {
      if (el.type !== 'tree') continue;
      const sx = ((el.x - this.bgScrollX * 0.5) % (this.canvasWidth + 200)) - 100;
      this.drawPixelTree(ctx, sx, el.y, colors.tree);
    }
  }

  private drawPixelMountain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
    const p = PIXEL_SIZE;
    ctx.fillStyle = color;
    const baseY = y + h;
    for (let i = 0; i < w / p; i++) {
      const px = x + i * p;
      const progress = i / (w / p);
      const peakHeight = Math.sin(progress * Math.PI) * h;
      const ph = Math.floor(peakHeight / p) * p;
      ctx.fillRect(Math.floor(px / p) * p, baseY - ph, p, ph);
    }
  }

  private drawPixelTree(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    const p = PIXEL_SIZE;
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(x + 4 * p, y + 8 * p, 4 * p, 6 * p);
    ctx.fillStyle = color;
    for (let row = 0; row < 8; row++) {
      const width = (10 - row) * p;
      ctx.fillRect(x + (10 - row / 2) * p - width / 2, y + row * p, width, p);
    }
  }

  private drawPixelCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const p = PIXEL_SIZE;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const px = Math.floor(x / p) * p;
    const py = Math.floor(y / p) * p;
    for (let i = 0; i < w / p; i++) {
      for (let j = 0; j < h / p; j++) {
        const distX = Math.abs(i - (w / p) / 2) / ((w / p) / 2);
        const distY = Math.abs(j - (h / p) / 2) / ((h / p) / 2);
        if (distX * distX * 2 + distY * distY < 1) {
          ctx.fillRect(px + i * p, py + j * p, p, p);
        }
      }
    }
  }

  private renderTrack(ctx: CanvasRenderingContext2D): void {
    if (!this.track) return;
    const colors = this.getTrackColors();
    const p = PIXEL_SIZE;
    const trackY = this.canvasHeight / 2;
    const halfW = this.track.width / 2;

    ctx.fillStyle = this.track.bgColor;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = colors.road;
    ctx.fillRect(0, Math.floor((trackY - halfW) / p) * p, this.canvasWidth, Math.floor(this.track.width / p) * p);

    ctx.fillStyle = '#666666';
    for (let i = 0; i < this.canvasWidth / (40 * p); i++) {
      const dashX = Math.floor(((i * 40 * p) - (this.bgScrollX * 2) % (40 * p)) / p) * p;
      ctx.fillRect(dashX, trackY - p, 20 * p, 2 * p);
    }

    ctx.fillStyle = '#ff3333';
    const kerbSize = 8 * p;
    for (let i = 0; i < this.canvasWidth / kerbSize + 1; i++) {
      const kx = Math.floor(((i * kerbSize) - (this.bgScrollX * 2) % (kerbSize * 2)) / p) * p;
      if (i % 2 === 0) {
        ctx.fillRect(kx, Math.floor((trackY - halfW) / p) * p, kerbSize, p * 2);
        ctx.fillRect(kx, Math.floor((trackY + halfW - 2 * p) / p) * p, kerbSize, p * 2);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(kx, Math.floor((trackY - halfW) / p) * p, kerbSize, p * 2);
        ctx.fillRect(kx, Math.floor((trackY + halfW - 2 * p) / p) * p, kerbSize, p * 2);
        ctx.fillStyle = '#ff3333';
      }
    }

    const seg = this.getCurrentSegment();
    if (seg.type === 'curve') {
      ctx.fillStyle = '#ffff00';
      for (let i = 0; i < 3; i++) {
        const arrowX = this.canvasWidth - 60 + i * 15;
        const dir = seg.direction || 1;
        this.drawArrow(ctx, arrowX, this.canvasHeight / 2 + dir * 40, dir > 0 ? 1 : -1);
      }
    }
    if (seg.type === 'uphill') {
      ctx.fillStyle = '#ff9900';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('▲▲ 上坡', this.canvasWidth - 100, 60);
    }
    if (seg.type === 'downhill') {
      ctx.fillStyle = '#00ccff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('▼▼ 下坡', this.canvasWidth - 100, 60);
    }
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number): void {
    const p = PIXEL_SIZE;
    for (let i = 0; i < 4; i++) {
      const w = (4 - i) * p;
      ctx.fillRect(x + i * p * dir, y - w / 2, p, w);
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const size = p.size * (0.5 + alpha * 0.5);
      ctx.fillStyle = this.hexToRgba(p.color, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private renderCar(ctx: CanvasRenderingContext2D): void {
    const car = this.car;
    const p = PIXEL_SIZE;

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.rotate(car.tiltAngle);

    const w = car.width;
    const h = car.height;

    ctx.fillStyle = car.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    ctx.fillStyle = this.darkenColor(car.color, 0.7);
    ctx.fillRect(-w / 2, -h / 2, w, p * 2);
    ctx.fillRect(-w / 2, h / 2 - p * 2, w, p * 2);

    ctx.fillStyle = this.lightenColor(car.color, 1.3);
    ctx.fillRect(-w / 2, -h / 2, p * 2, h);

    ctx.fillStyle = '#88ccff';
    ctx.fillRect(w / 2 - p * 10, -h / 4, p * 8, h / 2);

    ctx.fillStyle = '#222222';
    ctx.fillRect(-w / 2 + p * 4, -h / 2 - p * 2, p * 10, p * 4);
    ctx.fillRect(-w / 2 + p * 4, h / 2 - p * 2, p * 10, p * 4);
    ctx.fillRect(w / 2 - p * 14, -h / 2 - p * 2, p * 10, p * 4);
    ctx.fillRect(w / 2 - p * 14, h / 2 - p * 2, p * 10, p * 4);

    ctx.fillStyle = '#ffff00';
    ctx.fillRect(w / 2 - p * 2, -h / 3, p * 2, p * 3);
    ctx.fillRect(w / 2 - p * 2, h / 3 - p * 3, p * 2, p * 3);

    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-w / 2, -h / 3, p * 2, p * 3);
    ctx.fillRect(-w / 2, h / 3 - p * 3, p * 2, p * 3);

    if (car.spoiler === 'turbo') {
      ctx.fillStyle = '#444444';
      ctx.fillRect(-w / 2 - p * 4, -h / 3, p * 4, p * 2);
      ctx.fillRect(-w / 2 - p * 4, h / 3 - p * 2, p * 4, p * 2);
      ctx.fillRect(-w / 2 - p * 2, -h / 2 + p * 2, p * 2, h - p * 4);
    } else if (car.spoiler === 'rocket') {
      ctx.fillStyle = '#333333';
      ctx.fillRect(-w / 2 - p * 6, -h / 3 - p, p * 6, p * 4);
      ctx.fillRect(-w / 2 - p * 6, h / 3 - p * 3, p * 6, p * 4);
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(-w / 2 - p * 4, -h / 6, p * 2, p * 3);
      ctx.fillRect(-w / 2 - p * 4, h / 6 - p * 3, p * 2, p * 3);
    }

    if (car.boostMultiplier > 1) {
      ctx.fillStyle = '#ffcc00';
      ctx.globalAlpha = 0.5 + Math.random() * 0.3;
      ctx.fillRect(-w / 2 - p * 6 - Math.random() * p * 4, -h / 4, p * 4 + Math.random() * p * 4, h / 2);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private darkenColor(hex: string, factor: number): string {
    const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
    const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
    const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private lightenColor(hex: string, factor: number): string {
    const r = Math.min(255, Math.floor(parseInt(hex.slice(1, 3), 16) * factor));
    const g = Math.min(255, Math.floor(parseInt(hex.slice(3, 5), 16) * factor));
    const b = Math.min(255, Math.floor(parseInt(hex.slice(5, 7), 16) * factor));
    return `rgb(${r}, ${g}, ${b})`;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    if (this.track) {
      this.generateBackground();
    }
  }

  static getCarName(model: CarModel): string {
    return CAR_NAMES[model];
  }

  static getCarColor(model: CarModel): string {
    return CAR_COLORS[model];
  }
}
