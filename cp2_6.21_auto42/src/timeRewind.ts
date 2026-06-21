import * as THREE from 'three';
import { Player, PlayerState } from './player';
import { Level, PlatformState } from './level';

export interface FrameData {
  playerState: PlayerState;
  platformStates: PlatformState[];
  timestamp: number;
}

export interface AfterimageData {
  x: number;
  y: number;
  facingRight: boolean;
  createdAt: number;
}

export class TimeRewind {
  private maxFrames: number = 120;
  private maxDuration: number = 2000;
  private frames: FrameData[] = [];
  private isRewinding: boolean = false;
  private rewindStartTime: number = 0;
  private rewindDuration: number = 2000;
  private rewindProgress: number = 0;

  private rewindUses: number = 3;
  private maxRewindUses: number = 3;

  private rewindTintProgress: number = 0;
  private tintTransitionDuration: number = 500;
  private targetTintColor: string = '#4A90D9';

  private afterimageTimer: number = 0;
  private afterimageInterval: number = 100;

  private isRecording: boolean = true;

  constructor() {}

  public startRewind(): boolean {
    if (this.isRewinding || this.rewindUses <= 0 || this.frames.length === 0) {
      return false;
    }

    this.isRewinding = true;
    this.rewindStartTime = performance.now();
    this.rewindProgress = 0;
    this.rewindUses--;
    this.isRecording = false;

    return true;
  }

  public stopRewind(): void {
    this.isRewinding = false;
    this.isRecording = true;
  }

  public update(
    dt: number,
    player: Player,
    level: Level,
    scene: THREE.Scene
  ): void {
    if (this.isRewinding) {
      this.updateRewind(dt, player, level, scene);
    } else {
      this.updateRecording(dt, player, level, scene);
    }

    this.updateTint(dt);
  }

  private updateRecording(
    dt: number,
    player: Player,
    level: Level,
    scene: THREE.Scene
  ): void {
    const now = performance.now();

    const frame: FrameData = {
      playerState: { ...player.getState() },
      platformStates: level.getState(),
      timestamp: now
    };

    this.frames.push(frame);

    while (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }

    if (this.frames.length > 0) {
      const oldestTime = this.frames[0].timestamp;
      while (this.frames.length > 1 && now - oldestTime > this.maxDuration) {
        this.frames.shift();
      }
    }

    this.afterimageTimer += dt * 1000;
    if (this.afterimageTimer >= this.afterimageInterval) {
      this.afterimageTimer = 0;
      player.createAfterimage(scene);
    }

    player.updateAfterimages(scene);
  }

  private updateRewind(
    dt: number,
    player: Player,
    level: Level,
    scene: THREE.Scene
  ): void {
    const now = performance.now();
    const elapsed = now - this.rewindStartTime;

    this.rewindProgress = Math.min(elapsed / this.rewindDuration, 1);

    const targetIndex = Math.floor(
      this.frames.length * (1 - this.rewindProgress)
    );
    const clampedIndex = Math.max(0, Math.min(this.frames.length - 1, targetIndex));

    if (clampedIndex >= 0 && clampedIndex < this.frames.length) {
      const frame = this.frames[clampedIndex];
      player.setState(frame.playerState);
      level.setState(frame.platformStates);
    }

    this.afterimageTimer += dt * 1000;
    if (this.afterimageTimer >= this.afterimageInterval) {
      this.afterimageTimer = 0;
      player.createAfterimage(scene);
    }

    player.updateAfterimages(scene);

    if (this.rewindProgress >= 1) {
      this.stopRewind();
      this.frames = [];
    }
  }

  private updateTint(dt: number): void {
    const target = this.isRewinding ? 1 : 0;
    const speed = 1 / (this.tintTransitionDuration / 1000);

    if (this.rewindTintProgress < target) {
      this.rewindTintProgress = Math.min(target, this.rewindTintProgress + speed * dt);
    } else if (this.rewindTintProgress > target) {
      this.rewindTintProgress = Math.max(target, this.rewindTintProgress - speed * dt);
    }
  }

  public getTintProgress(): number {
    return this.rewindTintProgress;
  }

  public getTintColor(): THREE.Color {
    return new THREE.Color(this.targetTintColor);
  }

  public getIsRewinding(): boolean {
    return this.isRewinding;
  }

  public getRewindUses(): number {
    return this.rewindUses;
  }

  public getMaxRewindUses(): number {
    return this.maxRewindUses;
  }

  public setRewindUses(count: number): void {
    this.rewindUses = Math.max(0, Math.min(this.maxRewindUses, count));
  }

  public reset(): void {
    this.frames = [];
    this.isRewinding = false;
    this.rewindProgress = 0;
    this.rewindUses = this.maxRewindUses;
    this.rewindTintProgress = 0;
    this.isRecording = true;
  }

  public getAvailableRewindTime(): number {
    if (this.frames.length === 0) return 0;
    const now = performance.now();
    const oldestTime = this.frames[0].timestamp;
    return Math.min(this.maxDuration, now - oldestTime);
  }

  public getRewindProgress(): number {
    return this.rewindProgress;
  }
}
