import { DrawAction, replayAction } from './tools';

export interface RecordedAction {
  action: DrawAction;
  startTime: number;
  endTime: number;
}

export type PlaybackSpeed = 1 | 1.5 | 2;

export class RecordSession {
  private actions: RecordedAction[] = [];
  private isRecording: boolean = false;
  private sessionStartTime: number = 0;
  private currentActionStart: number = 0;
  private isPlaying: boolean = false;
  private playbackSpeed: PlaybackSpeed = 1;
  private animationFrameId: number | null = null;
  private playbackStartTime: number = 0;
  private totalDuration: number = 0;
  private currentActionIndex: number = 0;
  private onProgress: ((progress: number) => void) | null = null;
  private onPlaybackEnd: (() => void) | null = null;
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  startRecording() {
    if (this.isRecording) return;
    this.actions = [];
    this.isRecording = true;
    this.sessionStartTime = performance.now();
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.actions.length > 0) {
      this.totalDuration = this.actions[this.actions.length - 1].endTime;
    }
  }

  addAction(action: DrawAction) {
    if (!this.isRecording) return;

    const now = performance.now() - this.sessionStartTime;
    const recorded: RecordedAction = {
      action,
      startTime: this.currentActionStart,
      endTime: now,
    };
    this.actions.push(recorded);
    this.currentActionStart = now;
  }

  startAction() {
    if (!this.isRecording) return;
    this.currentActionStart = performance.now() - this.sessionStartTime;
  }

  isRecordingActive(): boolean {
    return this.isRecording;
  }

  hasRecording(): boolean {
    return this.actions.length > 0;
  }

  setPlaybackSpeed(speed: PlaybackSpeed) {
    this.playbackSpeed = speed;
  }

  setOnProgress(callback: (progress: number) => void) {
    this.onProgress = callback;
  }

  setOnPlaybackEnd(callback: () => void) {
    this.onPlaybackEnd = callback;
  }

  startPlayback() {
    if (this.isPlaying || this.actions.length === 0) return;

    this.isPlaying = true;
    this.currentActionIndex = 0;
    this.playbackStartTime = performance.now();
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.playbackLoop();
  }

  stopPlayback() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  isPlayingBack(): boolean {
    return this.isPlaying;
  }

  private playbackLoop() {
    if (!this.isPlaying) return;

    const elapsed = (performance.now() - this.playbackStartTime) * this.playbackSpeed;
    const progress = this.totalDuration > 0 ? Math.min(1, elapsed / this.totalDuration) : 0;

    if (this.onProgress) {
      this.onProgress(progress);
    }

    while (
      this.currentActionIndex < this.actions.length &&
      this.actions[this.currentActionIndex].startTime <= elapsed
    ) {
      const recorded = this.actions[this.currentActionIndex];
      replayAction(this.ctx, recorded.action);
      this.currentActionIndex++;
    }

    if (elapsed >= this.totalDuration) {
      this.isPlaying = false;
      if (this.onProgress) {
        this.onProgress(1);
      }
      if (this.onPlaybackEnd) {
        this.onPlaybackEnd();
      }
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => this.playbackLoop());
  }

  getActions(): RecordedAction[] {
    return [...this.actions];
  }

  getTotalDuration(): number {
    return this.totalDuration;
  }
}
