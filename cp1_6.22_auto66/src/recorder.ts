// recorder.ts - 核心功能模块
// 管理录音机状态（待机、播放、录音、快进、倒带）
// 内部操作模拟音频缓冲区（Web Audio API AudioBuffer）
// 数据流向：ui.ts -> recorder.ts（控制方法调用）-> recorder.ts 更新状态 -> 回调通知 ui.ts 重绘

export type RecorderState = 'idle' | 'playing' | 'recording' | 'fastForward' | 'rewinding';

export interface RecorderCallbacks {
  onStateChange?: (state: RecorderState) => void;
  onWaveformUpdate?: () => void;
  onError?: (message: string) => void;
}

const MAX_DURATION = 5;
const SAMPLE_RATE = 22050;
const WAVEFORM_BUFFER_SIZE = 1024;

export class TapeRecorder {
  private audioContext: AudioContext | null = null;
  private masterBuffer: AudioBuffer | null = null;
  private recordedSamples: Float32Array;
  private recordWriteIndex = 0;
  private playSourceNode: AudioBufferSourceNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private oscillatorNode: OscillatorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStream: MediaStream | null = null;
  private gainNode: GainNode | null = null;

  private currentState: RecorderState = 'idle';
  private playPosition = 0;
  private playStartTime = 0;
  private playStartPosition = 0;
  private callbacks: RecorderCallbacks;
  private liveWaveform: Uint8Array;
  private lastFrameTime = 0;
  private animationId: number | null = null;
  private recordedDuration = 0;
  private scanDirection = 1;

  constructor(callbacks: RecorderCallbacks = {}) {
    this.callbacks = callbacks;
    this.recordedSamples = new Float32Array(SAMPLE_RATE * MAX_DURATION);
    this.liveWaveform = new Uint8Array(WAVEFORM_BUFFER_SIZE);
  }

  async init(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      });

      this.masterBuffer = this.audioContext.createBuffer(
        1,
        SAMPLE_RATE * MAX_DURATION,
        SAMPLE_RATE
      );

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = WAVEFORM_BUFFER_SIZE * 2;
      this.analyserNode.smoothingTimeConstant = 0.6;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.7;
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.connect(this.analyserNode);

      this.startAnimationLoop();
    } catch (e) {
      this.notifyError('音频上下文初始化失败');
    }
  }

  getState(): RecorderState {
    return this.currentState;
  }

  getPlayPosition(): number {
    if (this.recordedDuration === 0) return 0;
    return Math.min(1, this.playPosition / this.recordedDuration);
  }

  getPlayPositionSeconds(): number {
    return this.playPosition;
  }

  getRecordedDuration(): number {
    return this.recordedDuration;
  }

  getWaveform(): Uint8Array {
    if (this.currentState === 'recording' || this.currentState === 'playing') {
      if (this.analyserNode) {
        const data = new Uint8Array(WAVEFORM_BUFFER_SIZE);
        this.analyserNode.getByteTimeDomainData(data);
        this.liveWaveform.set(data);
      }
    } else if (this.currentState === 'fastForward' || this.currentState === 'rewinding') {
      this.updateScanWaveform();
    } else if (this.recordedDuration > 0) {
      this.buildStaticWaveform();
    }
    return this.liveWaveform;
  }

  async togglePlayPause(): Promise<void> {
    if (this.currentState === 'playing') {
      this.stop();
    } else {
      await this.startPlay();
    }
  }

  async startPlay(): Promise<void> {
    if (!this.audioContext || !this.masterBuffer) return;
    if (this.recordedDuration <= 0.05) {
      this.notifyError('没有可播放的录音');
      return;
    }

    this.stopAll();

    if (this.playPosition >= this.recordedDuration) {
      this.playPosition = 0;
    }

    try {
      this.playSourceNode = this.audioContext.createBufferSource();
      const playBuffer = this.audioContext.createBuffer(
        1,
        Math.ceil(this.recordedDuration * SAMPLE_RATE),
        SAMPLE_RATE
      );
      const srcData = this.masterBuffer.getChannelData(0);
      const dstData = playBuffer.getChannelData(0);
      const samples = Math.ceil(this.recordedDuration * SAMPLE_RATE);
      for (let i = 0; i < samples; i++) {
        dstData[i] = srcData[i] || 0;
      }

      this.playSourceNode.buffer = playBuffer;
      this.playSourceNode.loop = false;

      if (this.gainNode) {
        this.playSourceNode.connect(this.gainNode);
      }

      const offset = this.playPosition;
      this.playStartTime = this.audioContext.currentTime;
      this.playStartPosition = offset;

      this.playSourceNode.onended = () => {
        if (this.currentState === 'playing') {
          this.playPosition = this.recordedDuration;
          this.setState('idle');
          this.playSourceNode = null;
        }
      };

      this.playSourceNode.start(0, offset);
      this.setState('playing');
    } catch (e) {
      this.notifyError('播放失败');
    }
  }

  async startRecord(): Promise<void> {
    if (!this.audioContext || !this.analyserNode) return;

    this.stopAll();
    this.playPosition = 0;
    this.recordWriteIndex = 0;
    this.recordedDuration = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.setupRecordingProcessor();
      this.mediaStreamSource.connect(this.analyserNode);
      this.setState('recording');
    } catch (e) {
      this.startFallbackRecording();
    }
  }

  private startFallbackRecording(): void {
    if (!this.audioContext || !this.analyserNode) return;

    this.oscillatorNode = this.audioContext.createOscillator();
    this.oscillatorNode.type = 'sine';
    this.oscillatorNode.frequency.setValueAtTime(440, this.audioContext.currentTime);

    const oscGain = this.audioContext.createGain();
    oscGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);

    const lfo = this.audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(3, this.audioContext.currentTime);
    const lfoGain = this.audioContext.createGain();
    lfoGain.gain.setValueAtTime(220, this.audioContext.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.oscillatorNode.frequency);

    this.oscillatorNode.connect(oscGain);
    oscGain.connect(this.analyserNode);
    if (this.gainNode) {
      oscGain.connect(this.gainNode);
    }

    this.setupRecordingProcessor(true);

    lfo.start();
    this.oscillatorNode.start();
    this.setState('recording');
  }

  private setupRecordingProcessor(useOscillator: boolean = false): void {
    if (!this.audioContext) return;

    this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.scriptProcessor.onaudioprocess = (e) => {
      if (this.currentState !== 'recording') return;

      const input = e.inputBuffer.getChannelData(0);
      const maxSamples = this.recordedSamples.length;

      for (let i = 0; i < input.length && this.recordWriteIndex < maxSamples; i++) {
        let sample = input[i];
        if (useOscillator) {
          sample = input[i] * 0.6;
        }
        this.recordedSamples[this.recordWriteIndex++] = sample;
      }

      this.recordedDuration = this.recordWriteIndex / SAMPLE_RATE;

      if (this.masterBuffer) {
        const bufData = this.masterBuffer.getChannelData(0);
        bufData.set(this.recordedSamples.slice(0, this.recordWriteIndex));
      }

      if (this.recordWriteIndex >= maxSamples) {
        this.stop();
      }
    };

    if (this.mediaStreamSource) {
      this.mediaStreamSource.connect(this.scriptProcessor);
    } else if (this.oscillatorNode) {
      const connectGain = this.audioContext.createGain();
      connectGain.gain.value = 1;
      this.oscillatorNode.connect(connectGain);
      connectGain.connect(this.scriptProcessor);
    }
    this.scriptProcessor.connect(this.audioContext.destination);
  }

  startFastForward(): void {
    if (this.currentState === 'recording') return;
    if (this.recordedDuration <= 0.05) {
      this.notifyError('没有可快进的内容');
      return;
    }

    this.stopAll();
    this.scanDirection = 1;
    this.setState('fastForward');
  }

  startRewind(): void {
    if (this.currentState === 'recording') return;
    if (this.recordedDuration <= 0.05) {
      this.notifyError('没有可倒带的内容');
      return;
    }

    this.stopAll();
    this.scanDirection = -1;
    this.setState('rewinding');
  }

  stop(): void {
    this.stopAll();
    if (this.currentState === 'recording') {
      const bufData = this.masterBuffer?.getChannelData(0);
      if (bufData && this.recordWriteIndex > 0) {
        bufData.set(this.recordedSamples.slice(0, this.recordWriteIndex));
      }
    }
    this.setState('idle');
  }

  private stopAll(): void {
    if (this.playSourceNode) {
      try {
        const elapsed = (this.audioContext?.currentTime || 0) - this.playStartTime;
        this.playPosition = Math.min(this.recordedDuration, this.playStartPosition + elapsed);
        this.playSourceNode.onended = null;
        this.playSourceNode.stop();
      } catch (e) { /* ignore */ }
      this.playSourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.mediaStreamSource) {
      try { this.mediaStreamSource.disconnect(); } catch (e) { /* ignore */ }
      this.mediaStreamSource = null;
    }

    if (this.oscillatorNode) {
      try { this.oscillatorNode.stop(); } catch (e) { /* ignore */ }
      try { this.oscillatorNode.disconnect(); } catch (e) { /* ignore */ }
      this.oscillatorNode = null;
    }

    if (this.scriptProcessor) {
      try { this.scriptProcessor.disconnect(); } catch (e) { /* ignore */ }
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }
  }

  private setState(state: RecorderState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.callbacks.onStateChange?.(state);
    this.callbacks.onWaveformUpdate?.();
  }

  private notifyError(msg: string): void {
    this.callbacks.onError?.(msg);
  }

  private startAnimationLoop(): void {
    const tick = (now: number) => {
      const dt = this.lastFrameTime ? (now - this.lastFrameTime) / 1000 : 0.016;
      this.lastFrameTime = now;

      if (this.currentState === 'playing') {
        const elapsed = (this.audioContext?.currentTime || 0) - this.playStartTime;
        this.playPosition = Math.min(this.recordedDuration, this.playStartPosition + elapsed);
        if (this.playPosition >= this.recordedDuration - 0.01) {
          this.playPosition = this.recordedDuration;
        }
      } else if (this.currentState === 'fastForward') {
        this.playPosition = Math.min(this.recordedDuration, this.playPosition + dt * 4);
        if (this.playPosition >= this.recordedDuration) {
          this.playPosition = this.recordedDuration;
        }
      } else if (this.currentState === 'rewinding') {
        this.playPosition = Math.max(0, this.playPosition - dt * 4);
        if (this.playPosition <= 0) {
          this.playPosition = 0;
        }
      }

      this.callbacks.onWaveformUpdate?.();
      this.animationId = requestAnimationFrame(tick);
    };

    this.animationId = requestAnimationFrame(tick);
  }

  private updateScanWaveform(): void {
    const data = this.liveWaveform;
    const samples = Math.min(2048, this.recordedSamples.length);
    const pos = Math.floor(this.playPosition * SAMPLE_RATE);
    const scanSpeed = this.currentState === 'fastForward' ? 8 : -8;

    for (let i = 0; i < data.length; i++) {
      const idx = Math.floor(pos + i * scanSpeed + (Date.now() / 8 + i * 7)) % samples;
      const safeIdx = Math.max(0, Math.min(samples - 1, idx));
      const sample = this.recordedSamples[safeIdx] || 0;
      const modulated = sample * (0.5 + 0.5 * Math.sin(i * 0.3 + Date.now() / 150));
      data[i] = Math.max(0, Math.min(255, 128 + modulated * 120));
    }
  }

  private buildStaticWaveform(): void {
    const data = this.liveWaveform;
    const samples = this.recordedSamples.length;
    const durationSamples = Math.ceil(this.recordedDuration * SAMPLE_RATE);
    if (durationSamples === 0) return;

    const step = Math.max(1, Math.floor(durationSamples / data.length));
    for (let i = 0; i < data.length; i++) {
      const start = Math.min(durationSamples - 1, i * step);
      const end = Math.min(durationSamples, start + step);
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += Math.abs(this.recordedSamples[j] || 0);
        count++;
      }
      const avg = count > 0 ? sum / count : 0;
      data[i] = 128 + Math.floor(avg * 100 * Math.sin(i * 0.1));
    }
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.stopAll();
    if (this.analyserNode) {
      try { this.analyserNode.disconnect(); } catch (e) { /* ignore */ }
      this.analyserNode = null;
    }
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch (e) { /* ignore */ }
      this.gainNode = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) { /* ignore */ }
      this.audioContext = null;
    }
  }
}
