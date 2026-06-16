import type { FoldResponse, KeyFrame } from './backend';
import type { FrameData } from './sceneManager';

export type AnimationStatus = 'idle' | 'playing' | 'paused' | 'finished';

export type AnimationStateListener = (state: {
  status: AnimationStatus;
  progress: number;
  speed: number;
}) => void;

export type FrameListener = (frame: FrameData) => void;

export class AnimationController {
  private foldData: FoldResponse | null = null;
  private keyframes: KeyFrame[] = [];

  private _status: AnimationStatus = 'idle';
  private _progress = 0;
  private _speed = 1.0;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private totalDurationMs = 8000;

  private stateListeners: AnimationStateListener[] = [];
  private frameListeners: FrameListener[] = [];

  get status(): AnimationStatus { return this._status; }
  get progress(): number { return this._progress; }
  get speed(): number { return this._speed; }
  get hasData(): boolean { return this.foldData !== null; }
  get foldDataSnapshot(): FoldResponse | null { return this.foldData; }

  loadData(data: FoldResponse): void {
    this.reset();
    this.foldData = data;
    this.keyframes = [...data.keyframes].sort((a, b) => a.progress - b.progress);
    this._status = 'idle';
    this._progress = 0;
    this.emitState();
    this.emitFrame(this.generateFrame(0));
  }

  play(): void {
    if (!this.foldData) return;
    if (this._status === 'playing') return;
    if (this._status === 'finished' || this._progress >= 1) {
      this._progress = 0;
    }
    this._status = 'playing';
    this.lastTimestamp = performance.now();
    this.emitState();
    this.tick();
  }

  pause(): void {
    if (this._status !== 'playing') return;
    this._status = 'paused';
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.emitState();
  }

  togglePlay(): void {
    if (this._status === 'playing') this.pause();
    else this.play();
  }

  reset(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this._progress = 0;
    this._status = this.foldData ? 'idle' : 'idle';
    if (this.foldData) {
      this.emitFrame(this.generateFrame(0));
    }
    this.emitState();
  }

  seek(progress: number): void {
    if (!this.foldData) return;
    this._progress = Math.max(0, Math.min(1, progress));
    this.emitFrame(this.generateFrame(this._progress));
    this.emitState();
    if (this._progress >= 1 && this._status === 'playing') {
      this._status = 'finished';
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.emitState();
    }
  }

  setSpeed(speed: number): void {
    this._speed = Math.max(0.1, Math.min(5.0, speed));
    this.emitState();
  }

  onStateChange(callback: AnimationStateListener): () => void {
    this.stateListeners.push(callback);
    return () => {
      const idx = this.stateListeners.indexOf(callback);
      if (idx >= 0) this.stateListeners.splice(idx, 1);
    };
  }

  onFrame(callback: FrameListener): () => void {
    this.frameListeners.push(callback);
    return () => {
      const idx = this.frameListeners.indexOf(callback);
      if (idx >= 0) this.frameListeners.splice(idx, 1);
    };
  }

  private tick = (): void => {
    if (this._status !== 'playing' || !this.foldData) return;

    const now = performance.now();
    const delta = now - this.lastTimestamp;
    this.lastTimestamp = now;

    const deltaProgress = (delta / this.totalDurationMs) * this._speed;
    this._progress = Math.min(1, this._progress + deltaProgress);

    this.emitFrame(this.generateFrame(this._progress));
    this.emitState();

    if (this._progress >= 1) {
      this._status = 'finished';
      this.emitState();
      return;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private generateFrame(progress: number): FrameData {
    if (this.keyframes.length === 0) {
      return { caCoords: [], sidechainCoords: [], progress: 0, phis: [], psis: [] };
    }

    if (progress <= this.keyframes[0].progress) {
      return this.keyframeToFrame(this.keyframes[0]);
    }
    if (progress >= this.keyframes[this.keyframes.length - 1].progress) {
      return this.keyframeToFrame(this.keyframes[this.keyframes.length - 1]);
    }

    let lower = 0;
    let upper = this.keyframes.length - 1;
    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (progress >= this.keyframes[i].progress && progress <= this.keyframes[i + 1].progress) {
        lower = i;
        upper = i + 1;
        break;
      }
    }

    const kfLower = this.keyframes[lower];
    const kfUpper = this.keyframes[upper];
    const range = kfUpper.progress - kfLower.progress;
    const t = range > 0 ? (progress - kfLower.progress) / range : 0;
    const smoothT = this.smoothstep(t);

    return this.interpolateFrames(kfLower, kfUpper, smoothT, progress);
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private keyframeToFrame(kf: KeyFrame): FrameData {
    return {
      caCoords: kf.ca_coords.map(c => [...c]),
      sidechainCoords: kf.sidechain_coords.map(c => [...c]),
      progress: kf.progress,
      phis: [...kf.phis],
      psis: [...kf.psis],
    };
  }

  private interpolateFrames(a: KeyFrame, b: KeyFrame, t: number, actualProgress: number): FrameData {
    const n = a.ca_coords.length;
    const caCoords: number[][] = [];
    const sidechainCoords: number[][] = [];
    const phis: number[] = [];
    const psis: number[] = [];

    for (let i = 0; i < n; i++) {
      caCoords.push([
        a.ca_coords[i][0] + (b.ca_coords[i][0] - a.ca_coords[i][0]) * t,
        a.ca_coords[i][1] + (b.ca_coords[i][1] - a.ca_coords[i][1]) * t,
        a.ca_coords[i][2] + (b.ca_coords[i][2] - a.ca_coords[i][2]) * t,
      ]);
      sidechainCoords.push([
        a.sidechain_coords[i][0] + (b.sidechain_coords[i][0] - a.sidechain_coords[i][0]) * t,
        a.sidechain_coords[i][1] + (b.sidechain_coords[i][1] - a.sidechain_coords[i][1]) * t,
        a.sidechain_coords[i][2] + (b.sidechain_coords[i][2] - a.sidechain_coords[i][2]) * t,
      ]);
      phis.push(this.interpolateAngle(a.phis[i], b.phis[i], t));
      psis.push(this.interpolateAngle(a.psis[i], b.psis[i], t));
    }

    return { caCoords, sidechainCoords, progress: actualProgress, phis, psis };
  }

  private interpolateAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return a + diff * t;
  }

  private emitState(): void {
    const state = { status: this._status, progress: this._progress, speed: this._speed };
    this.stateListeners.forEach(cb => cb(state));
  }

  private emitFrame(frame: FrameData): void {
    this.frameListeners.forEach(cb => cb(frame));
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.stateListeners = [];
    this.frameListeners = [];
  }
}
