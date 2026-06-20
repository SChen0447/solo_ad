export class Recorder {
  private canvas: HTMLCanvasElement;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private videoUrl: string = '';
  private startTime: number = 0;
  private timerInterval: number | null = null;
  private maxDuration: number = 60000;
  private onTimeUpdate: ((time: number) => void) | null = null;
  private onStop: ((url: string) => void) | null = null;
  private isRecording: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  setOnTimeUpdate(callback: (time: number) => void): void {
    this.onTimeUpdate = callback;
  }

  setOnStop(callback: (url: string) => void): void {
    this.onStop = callback;
  }

  start(): boolean {
    if (this.isRecording) return false;

    try {
      const stream = this.canvas.captureStream(30);
      this.stream = stream;

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        if (this.videoUrl) {
          URL.revokeObjectURL(this.videoUrl);
        }
        this.videoUrl = URL.createObjectURL(blob);
        this.isRecording = false;
        if (this.onStop) {
          this.onStop(this.videoUrl);
        }
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;
      this.startTime = Date.now();
      this.startTimer();

      setTimeout(() => {
        if (this.isRecording) {
          this.stop();
        }
      }, this.maxDuration);

      return true;
    } catch (e) {
      console.error('Failed to start recording:', e);
      return false;
    }
  }

  stop(): void {
    if (!this.isRecording || !this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.stopTimer();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  getVideoUrl(): string {
    return this.videoUrl;
  }

  getRecording(): boolean {
    return this.isRecording;
  }

  download(): void {
    if (!this.videoUrl) return;

    const a = document.createElement('a');
    a.href = this.videoUrl;
    a.download = `recording_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private startTimer(): void {
    this.timerInterval = window.setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.maxDuration) {
        this.stop();
        return;
      }
      if (this.onTimeUpdate) {
        this.onTimeUpdate(elapsed);
      }
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  static formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  dispose(): void {
    if (this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
    }
    this.stopTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}
