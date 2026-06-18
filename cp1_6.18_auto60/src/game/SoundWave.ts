import {
  Pulse,
  PulseWave,
  Vec2,
  PULSE_SPEED,
  PULSE_INITIAL_RADIUS,
  PULSE_MAX_BOUNCES,
  PULSE_BOUNCE_DECAY,
  PULSE_WAVE_DURATION,
  CELL_SIZE,
  PULSE_COOLDOWN,
} from './types';
import { WorldModel } from './WorldModel';

export class SoundWaveSystem {
  private world: WorldModel;
  private currentTime: number = 0;
  private waveEmitTimer: number = 0;
  private onPulseBounce: (() => void) | null = null;

  constructor(world: WorldModel) {
    this.world = world;
  }

  public setCallback(onPulseBounce: () => void): void {
    this.onPulseBounce = onPulseBounce;
  }

  public update(delta: number): void {
    this.currentTime += delta;
    this.waveEmitTimer += delta;

    const pulses = this.world.getPulses();

    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i];
      if (!pulse.alive) {
        this.world.removePulse(pulse.id);
        continue;
      }

      this.updatePulse(pulse, delta);

      if (this.waveEmitTimer >= 0.02) {
        this.emitWave(pulse);
      }
    }

    if (this.waveEmitTimer >= 0.02) {
      this.waveEmitTimer = 0;
    }

    this.cleanupExpiredWaves();
  }

  private updatePulse(pulse: Pulse, delta: number): void {
    const oldPos = { ...pulse.position };
    const moveDist = pulse.speed * delta;

    let remaining = moveDist;
    const maxIterations = 8;
    let iter = 0;

    while (remaining > 0.1 && iter < maxIterations && pulse.alive) {
      iter++;
      const step = Math.min(remaining, CELL_SIZE * 0.3);
      const nextX = pulse.position.x + pulse.direction.x * step;
      const nextY = pulse.position.y + pulse.direction.y * step;

      if (this.checkWallCollision(nextX, nextY)) {
        const result = this.calculateBounce(pulse.position, pulse.direction, step);
        if (result.hit && pulse.bouncesRemaining > 0) {
          pulse.position = result.position;
          pulse.direction = result.normal;
          pulse.intensity *= PULSE_BOUNCE_DECAY;
          pulse.bouncesRemaining--;
          if (this.onPulseBounce) this.onPulseBounce();
          remaining -= result.traveled;
        } else if (pulse.bouncesRemaining <= 0) {
          pulse.alive = false;
          remaining = 0;
        } else {
          remaining = 0;
        }
      } else {
        pulse.position.x = nextX;
        pulse.position.y = nextY;
        remaining -= step;
      }
    }

    pulse.radius += pulse.speed * delta;

    if (pulse.bouncesRemaining <= 0 && pulse.radius > pulse.maxRadius * 1.2) {
      pulse.alive = false;
    }
  }

  private checkWallCollision(x: number, y: number): boolean {
    return this.world.isWall(x, y);
  }

  private calculateBounce(
    pos: Vec2,
    dir: Vec2,
    maxStep: number,
  ): { hit: boolean; position: Vec2; normal: Vec2; traveled: number } {
    const stepSize = 1;
    let traveled = 0;
    let current = { ...pos };

    while (traveled < maxStep) {
      const next = {
        x: current.x + dir.x * stepSize,
        y: current.y + dir.y * stepSize,
      };

      if (this.world.isWall(next.x, next.y)) {
        const normal = this.findNormal(current);
        return {
          hit: true,
          position: { ...current },
          normal: this.reflect(dir, normal),
          traveled,
        };
      }

      current = next;
      traveled += stepSize;
    }

    return { hit: false, position: pos, normal: dir, traveled };
  }

  private findNormal(pos: Vec2): Vec2 {
    const checks = [
      { x: pos.x + 2, y: pos.y, nx: -1, ny: 0 },
      { x: pos.x - 2, y: pos.y, nx: 1, ny: 0 },
      { x: pos.x, y: pos.y + 2, nx: 0, ny: -1 },
      { x: pos.x, y: pos.y - 2, nx: 0, ny: 1 },
      { x: pos.x + 2, y: pos.y + 2, nx: -0.707, ny: -0.707 },
      { x: pos.x - 2, y: pos.y + 2, nx: 0.707, ny: -0.707 },
      { x: pos.x + 2, y: pos.y - 2, nx: -0.707, ny: 0.707 },
      { x: pos.x - 2, y: pos.y - 2, nx: 0.707, ny: 0.707 },
    ];

    for (const c of checks) {
      if (this.world.isWall(c.x, c.y)) {
        return { x: c.nx, y: c.ny };
      }
    }

    return { x: -dirSign(pos.x), y: 0 };
  }

  private reflect(dir: Vec2, normal: Vec2): Vec2 {
    const dot = dir.x * normal.x + dir.y * normal.y;
    return {
      x: dir.x - 2 * dot * normal.x,
      y: dir.y - 2 * dot * normal.y,
    };
  }

  private dirSign(v: number): number {
    return v >= 0 ? 1 : -1;
  }

  private emitWave(pulse: Pulse): void {
    const wave: PulseWave = {
      id: this.world.generateWaveId(),
      timestamp: this.currentTime,
      position: { ...pulse.position },
      radius: pulse.radius,
      alpha: 0.6 * pulse.intensity,
    };
    pulse.waves.push(wave);
  }

  private cleanupExpiredWaves(): void {
    const pulses = this.world.getPulses();
    for (const pulse of pulses) {
      pulse.waves = pulse.waves.filter(
        w => this.currentTime - w.timestamp < PULSE_WAVE_DURATION,
      );
    }
  }

  public firePulse(
    origin: Vec2,
    direction: Vec2,
    speedMultiplier: number = 1.0,
    extraBounces: number = 0,
  ): void {
    const dirLen = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    const normalizedDir =
      dirLen > 0
        ? { x: direction.x / dirLen, y: direction.y / dirLen }
        : { x: 1, y: 0 };

    this.world.addPulse({
      origin: { ...origin },
      position: { ...origin },
      direction: normalizedDir,
      radius: PULSE_INITIAL_RADIUS,
      speed: PULSE_SPEED * speedMultiplier,
      intensity: 1.0,
      bouncesRemaining: PULSE_MAX_BOUNCES + extraBounces,
      maxRadius: 300,
    });
  }

  public getWaveOpacity(wave: PulseWave): number {
    const age = this.currentTime - wave.timestamp;
    const progress = Math.min(1, age / PULSE_WAVE_DURATION);
    return wave.alpha * (1 - progress);
  }

  public getWaveExpandedRadius(wave: PulseWave): number {
    const age = this.currentTime - wave.timestamp;
    return wave.radius + age * PULSE_SPEED * 0.5;
  }
}
