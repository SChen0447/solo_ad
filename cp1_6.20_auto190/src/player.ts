import { CharacterAction, Track, PixelFrame } from './types';
import { getFrameAtPosition, getTotalFrames } from './frameEngine';

export interface PlayerState {
  currentFrame: number;
  isPlaying: boolean;
  progress: number;
  totalFrames: number;
}

export interface PlayerCallbacks {
  onFrameChange: (frame: number, frames: PixelFrame[]) => void;
  onStateChange: (state: PlayerState) => void;
}

export class AnimationPlayer {
  private fps: number;
  private isPlaying: boolean;
  private currentFrame: number;
  private totalFrames: number;
  private animationFrameId: number | null;
  private lastFrameTime: number;
  private frameInterval: number;
  private callbacks: PlayerCallbacks;
  private actions: CharacterAction[];
  private tracks: Track[];

  constructor(
    actions: CharacterAction[],
    tracks: Track[],
    fps: number,
    callbacks: PlayerCallbacks
  ) {
    this.fps = fps;
    this.isPlaying = false;
    this.currentFrame = 0;
    this.totalFrames = getTotalFrames(tracks);
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / fps;
    this.callbacks = callbacks;
    this.actions = actions;
    this.tracks = tracks;
  }

  setFps(fps: number): void {
    this.fps = fps;
    this.frameInterval = 1000 / fps;
  }

  setData(actions: CharacterAction[], tracks: Track[]): void {
    this.actions = actions;
    this.tracks = tracks;
    this.totalFrames = getTotalFrames(tracks);
    if (this.currentFrame >= this.totalFrames) {
      this.currentFrame = 0;
    }
    this.emitState();
  }

  play(): void {
    if (this.isPlaying) return;
    if (this.totalFrames <= 1) {
      this.totalFrames = Math.max(this.totalFrames, 60);
    }
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.animationLoop();
    this.emitState();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.emitState();
  }

  stop(): void {
    this.pause();
    this.currentFrame = 0;
    this.emitFrames();
    this.emitState();
  }

  seekTo(frame: number): void {
    const clampedFrame = Math.max(0, Math.min(frame, this.totalFrames - 1));
    this.currentFrame = clampedFrame;
    this.emitFrames();
    this.emitState();
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getTotalFrames(): number {
    return this.totalFrames;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private animationLoop = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;

    if (delta >= this.frameInterval) {
      const framesToAdvance = Math.floor(delta / this.frameInterval);
      this.currentFrame =
        (this.currentFrame + framesToAdvance) % this.totalFrames;
      this.lastFrameTime = now - (delta % this.frameInterval);

      this.emitFrames();
      this.emitState();
    }

    this.animationFrameId = requestAnimationFrame(this.animationLoop);
  };

  private getFramesForCurrentFrame(): PixelFrame[] {
    const frames: PixelFrame[] = [];
    const actionMap = new Map(this.actions.map((a) => [a.id, a]));

    for (const track of this.tracks) {
      for (const clip of track.clips) {
        const action = actionMap.get(clip.actionId);
        if (!action) continue;

        const frame = getFrameAtPosition(clip, action, this.currentFrame);
        if (frame) {
          frames.push(frame);
        }
      }
    }

    return frames;
  }

  private emitFrames(): void {
    const frames = this.getFramesForCurrentFrame();
    this.callbacks.onFrameChange(this.currentFrame, frames);
  }

  private emitState(): void {
    const progress =
      this.totalFrames > 0 ? this.currentFrame / this.totalFrames : 0;
    this.callbacks.onStateChange({
      currentFrame: this.currentFrame,
      isPlaying: this.isPlaying,
      progress,
      totalFrames: this.totalFrames,
    });
  }

  destroy(): void {
    this.pause();
  }
}

export const createPlayer = (
  actions: CharacterAction[],
  tracks: Track[],
  fps: number,
  callbacks: PlayerCallbacks
): AnimationPlayer => {
  return new AnimationPlayer(actions, tracks, fps, callbacks);
};
