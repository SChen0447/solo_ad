import type { Annotation, ReplayState } from '../types';

export interface ReplayAnnotation extends Annotation {
  relativeTime: number;
}

export interface ReplayData {
  sessionId: string;
  totalDuration: number;
  annotations: ReplayAnnotation[];
  shareLink: string;
}

export interface ReplayEngineOptions {
  onTick?: (visibleAnnotations: string[], currentTime: number) => void;
  onComplete?: () => void;
  fps?: number;
}

export class ReplayEngine {
  private annotations: ReplayAnnotation[] = [];
  private totalDuration: number = 0;
  private currentTime: number = 0;
  private speed: number = 1;
  private isPlaying: boolean = false;
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private fps: number = 60;
  private frameInterval: number = 1000 / 60;
  
  private onTick?: (visibleAnnotations: string[], currentTime: number) => void;
  private onComplete?: () => void;

  constructor(options: ReplayEngineOptions = {}) {
    this.onTick = options.onTick;
    this.onComplete = options.onComplete;
    this.fps = options.fps || 60;
    this.frameInterval = 1000 / this.fps;
  }

  loadData(data: ReplayData): void {
    this.annotations = [...data.annotations].sort((a, b) => a.relativeTime - b.relativeTime);
    this.totalDuration = data.totalDuration;
    this.currentTime = 0;
    this.isPlaying = false;
    this.lastTimestamp = 0;
    this.notifyTick();
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(16, speed));
  }

  getSpeed(): number {
    return this.speed;
  }

  play(): void {
    if (this.isPlaying) return;
    if (this.currentTime >= this.totalDuration) {
      this.currentTime = 0;
    }
    this.isPlaying = true;
    this.lastTimestamp = performance.now();
    this.animationLoop();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(this.totalDuration, time));
    this.notifyTick();
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getTotalDuration(): number {
    return this.totalDuration;
  }

  getVisibleAnnotations(): string[] {
    return this.annotations
      .filter(a => a.relativeTime <= this.currentTime)
      .map(a => a.id);
  }

  getState(): ReplayState {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      totalDuration: this.totalDuration,
      speed: this.speed,
      visibleAnnotations: this.getVisibleAnnotations(),
    };
  }

  getAnnotations(): ReplayAnnotation[] {
    return this.annotations;
  }

  destroy(): void {
    this.pause();
    this.onTick = undefined;
    this.onComplete = undefined;
  }

  private animationLoop = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = now - this.lastTimestamp;

    if (delta >= this.frameInterval) {
      this.currentTime += delta * this.speed;
      this.lastTimestamp = now - (delta % this.frameInterval);

      if (this.currentTime >= this.totalDuration) {
        this.currentTime = this.totalDuration;
        this.isPlaying = false;
        this.notifyTick();
        this.onComplete?.();
        return;
      }

      this.notifyTick();
    }

    this.animationFrameId = requestAnimationFrame(this.animationLoop);
  };

  private notifyTick(): void {
    const visible = this.getVisibleAnnotations();
    this.onTick?.(visible, this.currentTime);
  }
}

export async function fetchReplayData(sessionId: string): Promise<ReplayData> {
  const response = await fetch(`/api/sessions/${sessionId}/replay`);
  if (!response.ok) {
    throw new Error('Failed to fetch replay data');
  }
  return response.json();
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const millis = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
}
