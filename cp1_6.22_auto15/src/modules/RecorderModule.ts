export interface TrackPoint {
  timestamp: number;
  x: number;
  y: number;
}

export interface CollisionEvent {
  timestamp: number;
  x: number;
  y: number;
}

interface Recording {
  duration: number;
  track: TrackPoint[];
  collisions: CollisionEvent[];
}

export class RecorderModule {
  private recording: Recording | null = null;
  private isRecordingFlag: boolean = false;
  private isReplayingFlag: boolean = false;
  private recordStartTime: number = 0;
  private recordDuration: number = 0;
  private replayTime: number = 0;
  private replaySpeed: number = 1;
  private readonly MAX_RECORD_DURATION: number = 60;
  private readonly TRACK_SAMPLE_INTERVAL: number = 0.05;
  private lastSampleTime: number = 0;
  private currentTrackIndex: number = 0;
  private isPaused: boolean = false;

  startRecord(): void {
    this.recording = {
      duration: 0,
      track: [],
      collisions: []
    };
    this.isRecordingFlag = true;
    this.recordStartTime = 0;
    this.recordDuration = 0;
    this.lastSampleTime = 0;
  }

  stopRecord(): void {
    if (this.recording) {
      this.recording.duration = this.recordDuration;
    }
    this.isRecordingFlag = false;
  }

  replay(speed: number = 1): void {
    if (!this.recording || this.recording.track.length === 0) return;

    this.isReplayingFlag = true;
    this.replayTime = 0;
    this.replaySpeed = speed;
    this.currentTrackIndex = 0;
    this.isPaused = false;
  }

  pauseReplay(): void {
    this.isPaused = !this.isPaused;
  }

  stopReplay(): void {
    this.isReplayingFlag = false;
    this.replayTime = 0;
    this.currentTrackIndex = 0;
    this.isPaused = false;
  }

  setReplaySpeed(speed: number): void {
    this.replaySpeed = speed;
  }

  isRecording(): boolean {
    return this.isRecordingFlag;
  }

  isReplaying(): boolean {
    return this.isReplayingFlag;
  }

  isReplayPaused(): boolean {
    return this.isPaused;
  }

  getRecordDuration(): number {
    return this.recordDuration;
  }

  getMaxRecordDuration(): number {
    return this.MAX_RECORD_DURATION;
  }

  getReplayDuration(): number {
    return this.recording?.duration || 0;
  }

  getReplayProgress(): number {
    if (!this.recording || this.recording.duration === 0) return 0;
    return this.replayTime / this.recording.duration;
  }

  hasRecording(): boolean {
    return this.recording !== null && this.recording.track.length > 0;
  }

  getCurrentTrackPoint(): TrackPoint | null {
    if (!this.isReplayingFlag || !this.recording || this.recording.track.length === 0) {
      return null;
    }

    const targetTime = this.replayTime;
    while (
      this.currentTrackIndex < this.recording.track.length - 1 &&
      this.recording.track[this.currentTrackIndex + 1].timestamp <= targetTime
    ) {
      this.currentTrackIndex++;
    }

    const currentPoint = this.recording.track[this.currentTrackIndex];
    const nextPoint = this.recording.track[this.currentTrackIndex + 1];

    if (!nextPoint) {
      return currentPoint;
    }

    const segmentDuration = nextPoint.timestamp - currentPoint.timestamp;
    if (segmentDuration === 0) return currentPoint;

    const t = (targetTime - currentPoint.timestamp) / segmentDuration;
    return {
      timestamp: targetTime,
      x: currentPoint.x + (nextPoint.x - currentPoint.x) * t,
      y: currentPoint.y + (nextPoint.y - currentPoint.y) * t
    };
  }

  getReplayCollisions(): CollisionEvent[] {
    if (!this.recording) return [];
    return this.recording.collisions.filter(c => c.timestamp <= this.replayTime);
  }

  getFullTrack(): TrackPoint[] {
    return this.recording?.track || [];
  }

  getFullCollisions(): CollisionEvent[] {
    return this.recording?.collisions || [];
  }

  recordCollision(x: number, y: number): void {
    if (!this.isRecordingFlag || !this.recording) return;

    this.recording.collisions.push({
      timestamp: this.recordDuration,
      x,
      y
    });
  }

  update(deltaTime: number, playerX: number, playerY: number, isColliding: boolean): void {
    if (this.isRecordingFlag) {
      this.recordDuration += deltaTime;

      if (this.recordDuration >= this.MAX_RECORD_DURATION) {
        this.stopRecord();
        return;
      }

      this.lastSampleTime += deltaTime;
      if (this.lastSampleTime >= this.TRACK_SAMPLE_INTERVAL) {
        this.lastSampleTime = 0;
        this.recording?.track.push({
          timestamp: this.recordDuration,
          x: playerX,
          y: playerY
        });
      }

      if (isColliding) {
        this.recordCollision(playerX, playerY);
      }
    }

    if (this.isReplayingFlag && !this.isPaused) {
      this.replayTime += deltaTime * this.replaySpeed;

      if (this.recording && this.replayTime >= this.recording.duration) {
        this.replayTime = this.recording.duration;
        this.isReplayingFlag = false;
      }
    }
  }

  reset(): void {
    this.stopReplay();
    this.recording = null;
    this.isRecordingFlag = false;
    this.recordDuration = 0;
  }
}
