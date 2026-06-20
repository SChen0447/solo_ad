export interface StrokePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
  startTime: number;
  endTime: number;
}

export interface RecordingData {
  strokes: Stroke[];
  totalDuration: number;
}

type PlaybackSpeed = 0.5 | 1 | 2;

export class Recorder {
  private strokes: Stroke[] = [];
  private currentStroke: Stroke | null = null;
  private isRecording: boolean = false;
  private startTime: number = 0;

  startRecording(): void {
    this.strokes = [];
    this.currentStroke = null;
    this.isRecording = true;
    this.startTime = performance.now();
  }

  stopRecording(): RecordingData {
    this.isRecording = false;
    if (this.currentStroke) {
      this.strokes.push(this.currentStroke);
      this.currentStroke = null;
    }
    
    const totalDuration = this.strokes.length > 0 
      ? this.strokes[this.strokes.length - 1].endTime - this.startTime 
      : 0;
    
    return {
      strokes: JSON.parse(JSON.stringify(this.strokes)),
      totalDuration
    };
  }

  beginStroke(color: string, width: number): void {
    if (!this.isRecording) return;
    
    const now = performance.now() - this.startTime;
    this.currentStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: [],
      color,
      width,
      startTime: now,
      endTime: now
    };
  }

  addPoint(x: number, y: number): void {
    if (!this.isRecording || !this.currentStroke) return;
    
    const now = performance.now() - this.startTime;
    this.currentStroke.points.push({ x, y, timestamp: now });
    this.currentStroke.endTime = now;
  }

  endStroke(): void {
    if (!this.isRecording || !this.currentStroke) return;
    
    const now = performance.now() - this.startTime;
    this.currentStroke.endTime = now;
    this.strokes.push(this.currentStroke);
    this.currentStroke = null;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getStrokes(): Stroke[] {
    return [...this.strokes];
  }
}

export class Player {
  private recording: RecordingData | null = null;
  private playbackSpeed: PlaybackSpeed = 1;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private onUpdate: ((time: number, activeStrokes: Stroke[]) => void) | null = null;
  private onEnd: (() => void) | null = null;

  setRecording(recording: RecordingData): void {
    this.recording = recording;
    this.currentTime = 0;
    this.stop();
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.playbackSpeed = speed;
  }

  getSpeed(): PlaybackSpeed {
    return this.playbackSpeed;
  }

  setOnUpdate(callback: (time: number, activeStrokes: Stroke[]) => void): void {
    this.onUpdate = callback;
  }

  setOnEnd(callback: () => void): void {
    this.onEnd = callback;
  }

  play(): void {
    if (this.isPlaying || !this.recording) return;
    
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  stop(): void {
    this.pause();
    this.currentTime = 0;
    if (this.onUpdate) {
      this.onUpdate(0, []);
    }
  }

  seek(time: number): void {
    if (!this.recording) return;
    
    this.currentTime = Math.max(0, Math.min(time, this.getScaledDuration()));
    
    if (!this.isPlaying && this.onUpdate) {
      const activeStrokes = this.getActiveStrokesAtTime(this.currentTime);
      this.onUpdate(this.currentTime, activeStrokes);
    }
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getScaledDuration(): number {
    if (!this.recording) return 0;
    return this.recording.totalDuration / 3;
  }

  getOriginalDuration(): number {
    if (!this.recording) return 0;
    return this.recording.totalDuration;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private animate(): void {
    if (!this.isPlaying || !this.recording) return;
    
    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000 * this.playbackSpeed;
    this.lastFrameTime = now;
    
    this.currentTime += deltaTime * 1000;
    
    const scaledDuration = this.getScaledDuration();
    if (this.currentTime >= scaledDuration) {
      this.currentTime = scaledDuration;
      this.isPlaying = false;
      
      if (this.onUpdate) {
        const activeStrokes = this.getActiveStrokesAtTime(scaledDuration);
        this.onUpdate(scaledDuration, activeStrokes);
      }
      
      if (this.onEnd) {
        this.onEnd();
      }
      return;
    }
    
    if (this.onUpdate) {
      const activeStrokes = this.getActiveStrokesAtTime(this.currentTime);
      this.onUpdate(this.currentTime, activeStrokes);
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  private getActiveStrokesAtTime(scaledTime: number): Stroke[] {
    if (!this.recording) return [];
    
    const originalTime = scaledTime * 3;
    const result: Stroke[] = [];
    
    for (const stroke of this.recording.strokes) {
      if (stroke.startTime <= originalTime) {
        const partialStroke: Stroke = {
          ...stroke,
          points: []
        };
        
        for (const point of stroke.points) {
          if (point.timestamp <= originalTime) {
            partialStroke.points.push(point);
          } else {
            break;
          }
        }
        
        if (partialStroke.points.length > 0) {
          result.push(partialStroke);
        }
      }
    }
    
    return result;
  }

  destroy(): void {
    this.pause();
    this.onUpdate = null;
    this.onEnd = null;
  }
}
