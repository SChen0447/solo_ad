interface KeyFrame {
  timestamp: number;
  state: Float32Array;
  stats: {
    avgSpeed: number;
    turbulenceIntensity: number;
  };
}

interface PlaybackState {
  frames: KeyFrame[];
  currentTime: number;
  isPlaying: boolean;
  animationId: number;
  startTime: number;
  pausedTime: number;
  onFrameCallback: ((state: Float32Array) => void) | null;
}

export class Recorder {
  private canvas: HTMLCanvasElement;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecordingFlag: boolean = false;
  private startTime: number = 0;
  private timerInterval: number | null = null;
  private keyFrames: KeyFrame[] = [];
  private lastKeyFrameTime: number = 0;
  private videoBlob: Blob | null = null;
  private particleStateCallback: ((state: Float32Array) => void) | null = null;
  private getParticleState: (() => Float32Array) | null = null;

  private playbackState: PlaybackState = {
    frames: [],
    currentTime: 0,
    isPlaying: false,
    animationId: 0,
    startTime: 0,
    pausedTime: 0,
    onFrameCallback: null
  };

  private panel: HTMLDivElement | null = null;
  private timeline: HTMLDivElement | null = null;
  private recordingIndicator: HTMLDivElement | null = null;
  private timerDisplay: HTMLDivElement | null = null;
  private progressBar: HTMLDivElement | null = null;
  private progressFill: HTMLDivElement | null = null;
  private playBtn: HTMLButtonElement | null = null;
  private pauseBtn: HTMLButtonElement | null = null;
  private stopBtn: HTMLButtonElement | null = null;
  private exportBtn: HTMLButtonElement | null = null;
  private frameDisplay: HTMLDivElement | null = null;
  private statsOverlay: HTMLDivElement | null = null;
  private speedCanvas: HTMLCanvasElement | null = null;
  private turbulenceCanvas: HTMLCanvasElement | null = null;
  private playhead: HTMLDivElement | null = null;

  private static readonly MAX_DURATION = 30000;
  private static readonly KEYFRAME_INTERVAL = 100;
  private static readonly FPS = 60;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.createUI();
    this.injectStyles();
  }

  setParticleStateCallback(callback: (state: Float32Array) => void): void {
    this.particleStateCallback = callback;
  }

  setGetParticleStateCallback(callback: () => Float32Array): void {
    this.getParticleState = callback;
  }

  start(): void {
    if (this.isRecordingFlag) return;

    this.stopPlayback();
    this.recordedChunks = [];
    this.keyFrames = [];
    this.videoBlob = null;
    this.lastKeyFrameTime = 0;

    this.stream = this.canvas.captureStream(Recorder.FPS);
    
    const mimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    
    let selectedMimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMimeType || undefined,
        videoBitsPerSecond: 5000000
      });
    } catch (e) {
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.videoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
      this.downloadVideo();
      this.updateStatsCurves();
    };

    this.mediaRecorder.start();
    this.isRecordingFlag = true;
    this.startTime = performance.now();
    this.showRecordingIndicator();
    this.startTimer();
  }

  stop(): void {
    if (!this.isRecordingFlag || !this.mediaRecorder) return;

    this.isRecordingFlag = false;
    this.mediaRecorder.stop();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.hideRecordingIndicator();
    this.stopTimer();
  }

  isRecording(): boolean {
    return this.isRecordingFlag;
  }

  onFrame(stats: { avgSpeed: number; turbulenceIntensity: number }): void {
    if (!this.isRecordingFlag) return;

    const currentTime = performance.now() - this.startTime;
    
    if (currentTime >= Recorder.MAX_DURATION) {
      this.stop();
      return;
    }

    if (currentTime - this.lastKeyFrameTime >= Recorder.KEYFRAME_INTERVAL) {
      if (this.getParticleState) {
        const state = this.getParticleState();
        this.keyFrames.push({
          timestamp: currentTime,
          state: new Float32Array(state),
          stats: {
            avgSpeed: stats.avgSpeed,
            turbulenceIntensity: stats.turbulenceIntensity
          }
        });
        this.lastKeyFrameTime = currentTime;
      }
    }

    this.updateProgress(currentTime);
  }

  getRecordedData(): { frames: KeyFrame[]; videoBlob: Blob | null } {
    return {
      frames: [...this.keyFrames],
      videoBlob: this.videoBlob
    };
  }

  playback(frames: KeyFrame[], onFrame: (state: Float32Array) => void): void {
    if (this.isRecordingFlag) this.stop();
    this.stopPlayback();

    this.playbackState = {
      frames: [...frames],
      currentTime: 0,
      isPlaying: true,
      animationId: 0,
      startTime: performance.now(),
      pausedTime: 0,
      onFrameCallback: onFrame
    };

    this.keyFrames = [...frames];
    this.updateStatsCurves();
    this.playbackLoop();
    this.updatePlaybackUI();
  }

  pausePlayback(): void {
    if (!this.playbackState.isPlaying) return;
    
    this.playbackState.isPlaying = false;
    this.playbackState.pausedTime = this.playbackState.currentTime;
    cancelAnimationFrame(this.playbackState.animationId);
    this.updatePlaybackUI();
  }

  stopPlayback(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.frames = [];
    this.playbackState.currentTime = 0;
    this.playbackState.pausedTime = 0;
    cancelAnimationFrame(this.playbackState.animationId);
    this.updatePlaybackUI();
    this.updatePlayhead(0);
  }

  resumePlayback(): void {
    if (this.playbackState.isPlaying || this.playbackState.frames.length === 0) return;
    
    this.playbackState.isPlaying = true;
    this.playbackState.startTime = performance.now() - this.playbackState.pausedTime;
    this.playbackLoop();
    this.updatePlaybackUI();
  }

  seekTo(time: number): void {
    if (this.playbackState.frames.length === 0) return;
    
    const maxTime = this.playbackState.frames[this.playbackState.frames.length - 1].timestamp;
    this.playbackState.currentTime = Math.max(0, Math.min(time, maxTime));
    
    if (!this.playbackState.isPlaying) {
      this.playbackState.pausedTime = this.playbackState.currentTime;
    } else {
      this.playbackState.startTime = performance.now() - this.playbackState.currentTime;
    }

    this.renderFrame(this.playbackState.currentTime);
    this.updatePlayhead(this.playbackState.currentTime);
  }

  private playbackLoop(): void {
    if (!this.playbackState.isPlaying) return;

    this.playbackState.currentTime = performance.now() - this.playbackState.startTime;
    
    const maxTime = this.playbackState.frames[this.playbackState.frames.length - 1].timestamp;
    
    if (this.playbackState.currentTime >= maxTime) {
      this.playbackState.currentTime = maxTime;
      this.playbackState.isPlaying = false;
      this.playbackState.pausedTime = maxTime;
      this.renderFrame(maxTime);
      this.updatePlayhead(maxTime);
      this.updatePlaybackUI();
      return;
    }

    this.renderFrame(this.playbackState.currentTime);
    this.updatePlayhead(this.playbackState.currentTime);
    this.playbackState.animationId = requestAnimationFrame(() => this.playbackLoop());
  }

  private renderFrame(time: number): void {
    const frames = this.playbackState.frames;
    if (frames.length < 2) {
      if (frames.length === 1 && this.playbackState.onFrameCallback) {
        this.playbackState.onFrameCallback(frames[0].state);
      }
      return;
    }

    let index = 0;
    while (index < frames.length && frames[index].timestamp < time) {
      index++;
    }

    if (index === 0) {
      if (this.playbackState.onFrameCallback) {
        this.playbackState.onFrameCallback(frames[0].state);
      }
      this.updateCurrentStats(frames[0].stats);
      return;
    }

    if (index >= frames.length) {
      if (this.playbackState.onFrameCallback) {
        this.playbackState.onFrameCallback(frames[frames.length - 1].state);
      }
      this.updateCurrentStats(frames[frames.length - 1].stats);
      return;
    }

    const prevFrame = frames[index - 1];
    const nextFrame = frames[index];
    const t = (time - prevFrame.timestamp) / (nextFrame.timestamp - prevFrame.timestamp);

    const interpolatedState = new Float32Array(prevFrame.state.length);
    for (let i = 0; i < prevFrame.state.length; i++) {
      interpolatedState[i] = prevFrame.state[i] + (nextFrame.state[i] - prevFrame.state[i]) * t;
    }

    if (this.playbackState.onFrameCallback) {
      this.playbackState.onFrameCallback(interpolatedState);
    }

    if (this.particleStateCallback) {
      this.particleStateCallback(interpolatedState);
    }

    const interpolatedStats = {
      avgSpeed: prevFrame.stats.avgSpeed + (nextFrame.stats.avgSpeed - prevFrame.stats.avgSpeed) * t,
      turbulenceIntensity: prevFrame.stats.turbulenceIntensity + (nextFrame.stats.turbulenceIntensity - prevFrame.stats.turbulenceIntensity) * t
    };
    this.updateCurrentStats(interpolatedStats);
  }

  private createUI(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'recorder-panel';
    this.panel.innerHTML = `
      <div class="recorder-header">
        <div class="recording-status">
          <div class="recording-indicator"></div>
          <div class="timer-display">00:00.00</div>
        </div>
        <div class="frame-display">Frame: 0 / 0</div>
      </div>
      <div class="timeline">
        <div class="stats-overlay">
          <canvas class="speed-canvas"></canvas>
          <canvas class="turbulence-canvas"></canvas>
        </div>
        <div class="progress-bar">
          <div class="progress-fill"></div>
          <div class="playhead"></div>
        </div>
        <div class="timeline-ticks">
          <span>0s</span>
          <span>10s</span>
          <span>20s</span>
          <span>30s</span>
        </div>
      </div>
      <div class="controls">
        <button class="control-btn play-btn" title="播放">▶</button>
        <button class="control-btn pause-btn" title="暂停">⏸</button>
        <button class="control-btn stop-btn" title="停止">⏹</button>
        <button class="control-btn export-btn" title="导出WebM">⬇</button>
      </div>
    `;

    document.body.appendChild(this.panel);

    this.recordingIndicator = this.panel.querySelector('.recording-indicator');
    this.timerDisplay = this.panel.querySelector('.timer-display');
    this.frameDisplay = this.panel.querySelector('.frame-display');
    this.timeline = this.panel.querySelector('.timeline');
    this.progressBar = this.panel.querySelector('.progress-bar');
    this.progressFill = this.panel.querySelector('.progress-fill');
    this.playhead = this.panel.querySelector('.playhead');
    this.playBtn = this.panel.querySelector('.play-btn');
    this.pauseBtn = this.panel.querySelector('.pause-btn');
    this.stopBtn = this.panel.querySelector('.stop-btn');
    this.exportBtn = this.panel.querySelector('.export-btn');
    this.statsOverlay = this.panel.querySelector('.stats-overlay');
    this.speedCanvas = this.panel.querySelector('.speed-canvas');
    this.turbulenceCanvas = this.panel.querySelector('.turbulence-canvas');

    this.setupEventListeners();
    this.updatePlaybackUI();
  }

  private setupEventListeners(): void {
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        if (this.playbackState.frames.length > 0 && !this.playbackState.isPlaying) {
          if (this.playbackState.currentTime > 0) {
            this.resumePlayback();
          } else {
            const onFrame = this.playbackState.onFrameCallback || ((state) => {
              if (this.particleStateCallback) this.particleStateCallback(state);
            });
            this.playback(this.keyFrames, onFrame);
          }
        }
      });
    }

    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => {
        if (this.playbackState.isPlaying) {
          this.pausePlayback();
        }
      });
    }

    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', () => {
        if (this.isRecordingFlag) {
          this.stop();
        } else {
          this.stopPlayback();
        }
      });
    }

    if (this.exportBtn) {
      this.exportBtn.addEventListener('click', () => {
        if (this.videoBlob) {
          this.downloadVideo();
        }
      });
    }

    if (this.progressBar) {
      this.progressBar.addEventListener('click', (e) => {
        if (this.keyFrames.length === 0) return;
        
        const rect = this.progressBar!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const maxTime = this.keyFrames[this.keyFrames.length - 1].timestamp;
        const seekTime = percentage * maxTime;
        this.seekTo(seekTime);
      });

      let isDragging = false;
      this.progressBar.addEventListener('mousedown', (e) => {
        if (this.keyFrames.length === 0) return;
        isDragging = true;
        const wasPlaying = this.playbackState.isPlaying;
        if (wasPlaying) this.pausePlayback();
        
        const onMove = (moveEvent: MouseEvent) => {
          if (!isDragging) return;
          const rect = this.progressBar!.getBoundingClientRect();
          const x = moveEvent.clientX - rect.left;
          const percentage = Math.max(0, Math.min(1, x / rect.width));
          const maxTime = this.keyFrames[this.keyFrames.length - 1].timestamp;
          const seekTime = percentage * maxTime;
          this.seekTo(seekTime);
        };

        const onUp = () => {
          isDragging = false;
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .recorder-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background: rgba(11, 12, 16, 0.85);
        backdrop-filter: blur(20px);
        border-top: 1px solid rgba(69, 162, 158, 0.3);
        padding: 16px 24px;
        font-family: 'Orbitron', sans-serif;
      }

      .recorder-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .recording-status {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .recording-indicator {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #333;
        transition: all 0.3s ease;
      }

      .recording-indicator.active {
        background: #ff4444;
        box-shadow: 0 0 10px #ff4444, 0 0 20px #ff4444;
        animation: pulse 1s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .timer-display {
        color: #45A29E;
        font-size: 16px;
        font-weight: 600;
        text-shadow: 0 0 10px rgba(69, 162, 158, 0.5);
        min-width: 100px;
      }

      .frame-display {
        color: #66FCF1;
        font-size: 14px;
        font-weight: 500;
      }

      .timeline {
        position: relative;
        height: 80px;
        margin-bottom: 12px;
      }

      .stats-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 20px;
        pointer-events: none;
      }

      .speed-canvas,
      .turbulence-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0.6;
      }

      .turbulence-canvas {
        opacity: 0.4;
      }

      .progress-bar {
        position: absolute;
        bottom: 20px;
        left: 0;
        right: 0;
        height: 6px;
        background: rgba(69, 162, 158, 0.2);
        border-radius: 3px;
        cursor: pointer;
        transition: height 0.2s ease;
      }

      .progress-bar:hover {
        height: 10px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #45A29E, #66FCF1);
        border-radius: 3px;
        width: 0%;
        box-shadow: 0 0 10px rgba(69, 162, 158, 0.5);
        transition: width 0.1s linear;
      }

      .playhead {
        position: absolute;
        top: 50%;
        left: 0;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        background: #66FCF1;
        border-radius: 50%;
        box-shadow: 0 0 15px #66FCF1;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .playhead.active {
        opacity: 1;
      }

      .timeline-ticks {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-between;
        color: rgba(69, 162, 158, 0.6);
        font-size: 11px;
        padding: 0 4px;
      }

      .controls {
        display: flex;
        gap: 12px;
        justify-content: center;
        align-items: center;
      }

      .control-btn {
        width: 44px;
        height: 44px;
        border: 1px solid rgba(69, 162, 158, 0.5);
        background: rgba(69, 162, 158, 0.1);
        color: #45A29E;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .control-btn:hover:not(:disabled) {
        background: rgba(69, 162, 158, 0.3);
        box-shadow: 0 0 20px rgba(69, 162, 158, 0.4);
        border-color: #66FCF1;
        color: #66FCF1;
      }

      .control-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .control-btn.active {
        background: rgba(69, 162, 158, 0.4);
        box-shadow: 0 0 15px rgba(69, 162, 158, 0.5);
      }

      .export-btn {
        font-size: 18px;
      }

      .stats-tooltip {
        position: absolute;
        top: -60px;
        background: rgba(11, 12, 16, 0.95);
        border: 1px solid #45A29E;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        color: #66FCF1;
        pointer-events: none;
        transform: translateX(-50%);
        white-space: nowrap;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }

      .stats-tooltip .label {
        color: #45A29E;
        margin-right: 8px;
      }

      .stats-tooltip .value {
        color: #66FCF1;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }

  private showRecordingIndicator(): void {
    if (this.recordingIndicator) {
      this.recordingIndicator.classList.add('active');
    }
  }

  private hideRecordingIndicator(): void {
    if (this.recordingIndicator) {
      this.recordingIndicator.classList.remove('active');
    }
  }

  private startTimer(): void {
    this.updateTimerDisplay(0);
    this.timerInterval = window.setInterval(() => {
      const elapsed = performance.now() - this.startTime;
      this.updateTimerDisplay(elapsed);
    }, 10);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimerDisplay(elapsed: number): void {
    if (!this.timerDisplay) return;
    
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const milliseconds = Math.floor((elapsed % 1000) / 10);
    
    this.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
  }

  private updateProgress(currentTime: number): void {
    const percentage = (currentTime / Recorder.MAX_DURATION) * 100;
    if (this.progressFill) {
      this.progressFill.style.width = `${percentage}%`;
    }
    
    const currentFrame = Math.floor(currentTime / Recorder.KEYFRAME_INTERVAL);
    const maxFrames = Math.floor(Recorder.MAX_DURATION / Recorder.KEYFRAME_INTERVAL);
    if (this.frameDisplay) {
      this.frameDisplay.textContent = `Frame: ${currentFrame} / ${maxFrames}`;
    }
  }

  private updatePlayhead(time: number): void {
    if (!this.playhead || !this.progressBar || this.keyFrames.length === 0) return;
    
    const maxTime = this.keyFrames[this.keyFrames.length - 1].timestamp;
    const percentage = (time / maxTime) * 100;
    this.playhead.style.left = `${percentage}%`;
    this.playhead.classList.add('active');

    if (this.progressFill) {
      this.progressFill.style.width = `${percentage}%`;
    }

    const currentFrameIndex = this.findFrameIndex(time);
    if (this.frameDisplay) {
      this.frameDisplay.textContent = `Frame: ${currentFrameIndex} / ${this.keyFrames.length}`;
    }
  }

  private findFrameIndex(time: number): number {
    for (let i = 0; i < this.keyFrames.length; i++) {
      if (this.keyFrames[i].timestamp >= time) {
        return i;
      }
    }
    return this.keyFrames.length - 1;
  }

  private updateCurrentStats(stats: { avgSpeed: number; turbulenceIntensity: number }): void {
    if (!this.progressBar) return;

    const existingTooltip = this.progressBar.querySelector('.stats-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const maxTime = this.keyFrames.length > 0 ? this.keyFrames[this.keyFrames.length - 1].timestamp : 1;
    const percentage = (this.playbackState.currentTime / maxTime) * 100;

    const tooltip = document.createElement('div');
    tooltip.className = 'stats-tooltip';
    tooltip.style.left = `${percentage}%`;
    tooltip.innerHTML = `
      <div><span class="label">速度:</span><span class="value">${stats.avgSpeed.toFixed(2)}</span></div>
      <div><span class="label">湍流:</span><span class="value">${stats.turbulenceIntensity.toFixed(3)}</span></div>
    `;
    this.progressBar.appendChild(tooltip);
  }

  private updateStatsCurves(): void {
    if (!this.speedCanvas || !this.turbulenceCanvas || this.keyFrames.length < 2) return;

    const width = this.speedCanvas.offsetWidth;
    const height = this.speedCanvas.offsetHeight;
    
    this.speedCanvas.width = width * window.devicePixelRatio;
    this.speedCanvas.height = height * window.devicePixelRatio;
    this.turbulenceCanvas.width = width * window.devicePixelRatio;
    this.turbulenceCanvas.height = height * window.devicePixelRatio;

    const speedCtx = this.speedCanvas.getContext('2d');
    const turbCtx = this.turbulenceCanvas.getContext('2d');
    
    if (!speedCtx || !turbCtx) return;

    speedCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    turbCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    speedCtx.clearRect(0, 0, width, height);
    turbCtx.clearRect(0, 0, width, height);

    const maxTime = this.keyFrames[this.keyFrames.length - 1].timestamp;
    const maxSpeed = Math.max(...this.keyFrames.map(f => f.stats.avgSpeed)) * 1.1;
    const maxTurbulence = Math.max(...this.keyFrames.map(f => f.stats.turbulenceIntensity)) * 1.1;

    speedCtx.strokeStyle = '#66FCF1';
    speedCtx.lineWidth = 2;
    speedCtx.beginPath();
    
    turbCtx.strokeStyle = '#FF6B6B';
    turbCtx.lineWidth = 2;
    turbCtx.beginPath();

    this.keyFrames.forEach((frame, index) => {
      const x = (frame.timestamp / maxTime) * width;
      const y1 = height - (frame.stats.avgSpeed / maxSpeed) * height;
      const y2 = height - (frame.stats.turbulenceIntensity / maxTurbulence) * height;

      if (index === 0) {
        speedCtx.moveTo(x, y1);
        turbCtx.moveTo(x, y2);
      } else {
        speedCtx.lineTo(x, y1);
        turbCtx.lineTo(x, y2);
      }
    });

    speedCtx.stroke();
    turbCtx.stroke();

    speedCtx.globalAlpha = 0.2;
    speedCtx.fillStyle = '#66FCF1';
    speedCtx.lineTo(width, height);
    speedCtx.lineTo(0, height);
    speedCtx.closePath();
    speedCtx.fill();

    turbCtx.globalAlpha = 0.15;
    turbCtx.fillStyle = '#FF6B6B';
    turbCtx.lineTo(width, height);
    turbCtx.lineTo(0, height);
    turbCtx.closePath();
    turbCtx.fill();
  }

  private updatePlaybackUI(): void {
    if (this.playBtn) {
      this.playBtn.disabled = this.keyFrames.length === 0 || this.playbackState.isPlaying;
      if (this.playbackState.isPlaying) {
        this.playBtn.classList.remove('active');
      } else if (this.keyFrames.length > 0) {
        this.playBtn.classList.add('active');
      }
    }

    if (this.pauseBtn) {
      this.pauseBtn.disabled = !this.playbackState.isPlaying;
      this.pauseBtn.classList.toggle('active', this.playbackState.isPlaying);
    }

    if (this.stopBtn) {
      this.stopBtn.disabled = !this.playbackState.isPlaying && this.keyFrames.length === 0 && !this.isRecordingFlag;
      this.stopBtn.classList.toggle('active', this.playbackState.isPlaying || this.isRecordingFlag);
    }

    if (this.exportBtn) {
      this.exportBtn.disabled = !this.videoBlob;
    }

    if (this.playhead) {
      if (this.keyFrames.length > 0 && (this.playbackState.isPlaying || this.playbackState.currentTime > 0)) {
        this.playhead.classList.add('active');
      } else {
        this.playhead.classList.remove('active');
      }
    }
  }

  private downloadVideo(): void {
    if (!this.videoBlob) return;

    const url = URL.createObjectURL(this.videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
