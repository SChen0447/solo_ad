export interface AudioPositions {
  playerX: number;
  playerZ: number;
  playerRotY: number;
  hunterX: number;
  hunterZ: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private listener: AudioListener | null = null;
  private masterGain: GainNode | null = null;

  private footstepPanner: PannerNode | null = null;
  private footstepSource: AudioBufferSourceNode | null = null;
  private footstepGain: GainNode | null = null;
  private footstepBuffer: AudioBuffer | null = null;
  private footstepInterval: number | null = null;

  private windPanner: PannerNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windBuffer: AudioBuffer | null = null;

  private heartbeatOsc: OscillatorNode | null = null;
  private heartbeatGain: GainNode | null = null;
  private heartbeatPanner: PannerNode | null = null;
  private heartbeatLfo: OscillatorNode | null = null;
  private heartbeatLfoGain: GainNode | null = null;

  private victoryOsc: OscillatorNode | null = null;
  private victoryGain: GainNode | null = null;

  private maxHearDistance = 10;
  private cellSize: number;
  private initialized = false;
  private gameActive = false;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    this.ctx = new AudioContext();
    this.listener = this.ctx.listener;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ctx.destination);

    this.footstepBuffer = this.createNoiseBuffer(0.08);
    this.windBuffer = this.createNoiseBuffer(2.0);

    this.setupFootsteps();
    this.setupWind();
    this.setupHeartbeat();

    this.initialized = true;
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private setupFootsteps(): void {
    const ctx = this.ctx!;
    this.footstepPanner = ctx.createPanner();
    this.footstepPanner.panningModel = 'HRTF';
    this.footstepPanner.distanceModel = 'inverse';
    this.footstepPanner.refDistance = 1;
    this.footstepPanner.maxDistance = this.maxHearDistance * this.cellSize;
    this.footstepPanner.rolloffFactor = 1.5;
    this.footstepPanner.coneInnerAngle = 360;
    this.footstepPanner.coneOuterAngle = 360;
    this.footstepPanner.connect(this.masterGain!);

    this.footstepGain = ctx.createGain();
    this.footstepGain.gain.value = 0;
    this.footstepGain.connect(this.footstepPanner);
  }

  private setupWind(): void {
    const ctx = this.ctx!;
    this.windPanner = ctx.createPanner();
    this.windPanner.panningModel = 'HRTF';
    this.windPanner.distanceModel = 'inverse';
    this.windPanner.refDistance = 1;
    this.windPanner.maxDistance = 50;
    this.windPanner.rolloffFactor = 0.5;
    this.windPanner.coneInnerAngle = 90;
    this.windPanner.coneOuterAngle = 270;
    this.windPanner.coneOuterGain = 0.2;
    this.windPanner.connect(this.masterGain!);

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 600;
    windFilter.Q.value = 0.5;
    windFilter.connect(this.windPanner);

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.15;
    this.windGain.connect(windFilter);

    this.windSource = ctx.createBufferSource();
    this.windSource.buffer = this.windBuffer;
    this.windSource.loop = true;
    this.windSource.connect(this.windGain!);
    this.windSource.start();
  }

  private setupHeartbeat(): void {
    const ctx = this.ctx!;

    this.heartbeatPanner = ctx.createPanner();
    this.heartbeatPanner.panningModel = 'HRTF';
    this.heartbeatPanner.distanceModel = 'inverse';
    this.heartbeatPanner.refDistance = 1;
    this.heartbeatPanner.maxDistance = 8 * this.cellSize;
    this.heartbeatPanner.rolloffFactor = 1;
    this.heartbeatPanner.coneInnerAngle = 360;
    this.heartbeatPanner.coneOuterAngle = 360;
    this.heartbeatPanner.connect(this.masterGain!);

    this.heartbeatGain = ctx.createGain();
    this.heartbeatGain.gain.value = 0;
    this.heartbeatGain.connect(this.heartbeatPanner);

    this.heartbeatOsc = ctx.createOscillator();
    this.heartbeatOsc.type = 'sine';
    this.heartbeatOsc.frequency.value = 60;
    this.heartbeatOsc.connect(this.heartbeatGain);
    this.heartbeatOsc.start();

    this.heartbeatLfoGain = ctx.createGain();
    this.heartbeatLfoGain.gain.value = 30;
    this.heartbeatLfoGain.connect(this.heartbeatOsc.frequency);

    this.heartbeatLfo = ctx.createOscillator();
    this.heartbeatLfo.type = 'sine';
    this.heartbeatLfo.frequency.value = 1;
    this.heartbeatLfo.connect(this.heartbeatLfoGain);
    this.heartbeatLfo.start();
  }

  startGame(): void {
    this.gameActive = true;
    this.startFootstepLoop();
  }

  stopGame(): void {
    this.gameActive = false;
    this.stopFootstepLoop();
    if (this.heartbeatGain) this.heartbeatGain.gain.value = 0;
    if (this.windGain) this.windGain.gain.value = 0;
  }

  private startFootstepLoop(): void {
    this.stopFootstepLoop();
    const play = () => {
      if (!this.gameActive || !this.ctx || !this.footstepBuffer || !this.footstepGain) return;
      const source = this.ctx.createBufferSource();
      source.buffer = this.footstepBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 200 + Math.random() * 300;
      filter.Q.value = 1;

      source.connect(filter);
      filter.connect(this.footstepGain);
      source.start();

      this.footstepSource = source;
    };

    play();
    this.footstepInterval = window.setInterval(play, 500);
  }

  private stopFootstepLoop(): void {
    if (this.footstepInterval !== null) {
      clearInterval(this.footstepInterval);
      this.footstepInterval = null;
    }
    if (this.footstepSource) {
      try { this.footstepSource.stop(); } catch (_) { /* already stopped */ }
      this.footstepSource = null;
    }
  }

  update(positions: AudioPositions): void {
    if (!this.ctx || !this.listener || !this.initialized) return;

    const { playerX, playerZ, playerRotY, hunterX, hunterZ } = positions;
    const t = this.ctx.currentTime;

    const forwardX = -Math.sin(playerRotY);
    const forwardZ = -Math.cos(playerRotY);
    this.listener.positionX.setValueAtTime(playerX, t);
    this.listener.positionY.setValueAtTime(1.6, t);
    this.listener.positionZ.setValueAtTime(playerZ, t);
    this.listener.forwardX.setValueAtTime(forwardX, t);
    this.listener.forwardY.setValueAtTime(0, t);
    this.listener.forwardZ.setValueAtTime(forwardZ, t);
    this.listener.upX.setValueAtTime(0, t);
    this.listener.upY.setValueAtTime(1, t);
    this.listener.upZ.setValueAtTime(0, t);

    const dx = hunterX - playerX;
    const dz = hunterZ - playerZ;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const distCells = distance / this.cellSize;

    if (this.footstepPanner) {
      this.footstepPanner.positionX.setValueAtTime(hunterX, t);
      this.footstepPanner.positionY.setValueAtTime(0, t);
      this.footstepPanner.positionZ.setValueAtTime(hunterZ, t);
    }

    if (this.footstepGain) {
      const vol = distCells <= this.maxHearDistance
        ? Math.max(0, 1 - distCells / this.maxHearDistance) * 0.8
        : 0;
      this.footstepGain.gain.setTargetAtTime(vol, t, 0.05);
    }

    if (this.windPanner) {
      const windX = playerX + dx * 0.3;
      const windZ = playerZ + dz * 0.3;
      this.windPanner.positionX.setValueAtTime(windX, t);
      this.windPanner.positionY.setValueAtTime(2, t);
      this.windPanner.positionZ.setValueAtTime(windZ, t);
    }

    if (this.heartbeatPanner) {
      this.heartbeatPanner.positionX.setValueAtTime(hunterX, t);
      this.heartbeatPanner.positionY.setValueAtTime(1, t);
      this.heartbeatPanner.positionZ.setValueAtTime(hunterZ, t);
    }

    if (this.heartbeatGain && this.heartbeatLfo) {
      if (distCells < 8) {
        const intensity = Math.max(0, 1 - distCells / 8);
        const bpm = distCells < 3 ? 3 + intensity * 4 : 0.5 + intensity * 2;
        this.heartbeatLfo.frequency.setTargetAtTime(bpm, t, 0.1);
        this.heartbeatGain.gain.setTargetAtTime(intensity * 0.5, t, 0.1);
      } else {
        this.heartbeatGain.gain.setTargetAtTime(0, t, 0.2);
      }
    }
  }

  playVictory(): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.3, t + i * 0.2 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.2);
      osc.stop(t + i * 0.2 + 0.6);
    });
  }

  playCaught(): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.8);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 1);
  }

  destroy(): void {
    this.stopGame();
    if (this.heartbeatOsc) { try { this.heartbeatOsc.stop(); } catch (_) {} }
    if (this.heartbeatLfo) { try { this.heartbeatLfo.stop(); } catch (_) {} }
    if (this.windSource) { try { this.windSource.stop(); } catch (_) {} }
    if (this.ctx) { this.ctx.close(); }
  }
}
