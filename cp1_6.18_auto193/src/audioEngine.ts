import * as Tone from 'tone';
import { HandData, DrumType, DrumZone, AppEvent } from './types';
import { eventBus, useAppStore, DRUM_ZONES } from './store';

interface FingerState {
  lastX: number;
  lastY: number;
  lastTimestamp: number;
  lastDrumHit: Record<DrumType, number>;
}

export class AudioEngine {
  private kickSynth: Tone.MembraneSynth | null = null;
  private snareSynth: Tone.NoiseSynth | null = null;
  private tomSynth: Tone.MembraneSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private crashSynth: Tone.MetalSynth | null = null;
  private masterGain: Tone.Gain | null = null;
  private isInitialized: boolean = false;
  private fingerStates: Map<string, FingerState> = new Map();
  private unsubscribeHandData: (() => void) | null = null;
  private hitThreshold: number = 20;
  private debounceTime: number = 100;

  async init(): Promise<void> {
    try {
      await Tone.start();

      this.masterGain = new Tone.Gain(0.7).toDestination();

      this.kickSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: {
          type: 'sine',
        },
        envelope: {
          attack: 0.001,
          decay: 0.3,
          sustain: 0,
          release: 0.05,
        },
      }).connect(this.masterGain);

      this.snareSynth = new Tone.NoiseSynth({
        noise: {
          type: 'white',
        },
        envelope: {
          attack: 0.001,
          decay: 0.2,
          sustain: 0,
          release: 0.05,
        },
        filter: {
          type: 'highpass',
          frequency: 1000,
          rolloff: -12,
          Q: 1,
        },
      }).connect(this.masterGain);

      this.tomSynth = new Tone.MembraneSynth({
        pitchDecay: 0.1,
        octaves: 6,
        oscillator: {
          type: 'triangle',
        },
        envelope: {
          attack: 0.001,
          decay: 0.15,
          sustain: 0,
          release: 0.05,
        },
      }).connect(this.masterGain);
      this.tomSynth.frequency.value = 200;

      this.hihatSynth = new Tone.MetalSynth({
        envelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0,
          release: 0.05,
        },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      }).connect(this.masterGain);
      this.hihatSynth.frequency.value = 200;
      this.hihatSynth.volume.value = -15;

      this.crashSynth = new Tone.MetalSynth({
        envelope: {
          attack: 0.001,
          decay: 0.8,
          sustain: 0.1,
          release: 0.5,
        },
        harmonicity: 8,
        modulationIndex: 20,
        resonance: 3000,
        octaves: 1,
      }).connect(this.masterGain);
      this.crashSynth.frequency.value = 300;
      this.crashSynth.volume.value = -12;

      this.isInitialized = true;
      useAppStore.getState().setAudioInitialized(true);

      this.subscribeToEvents();
    } catch (error) {
      console.error('Audio engine initialization failed:', error);
      throw error;
    }
  }

  private subscribeToEvents(): void {
    this.unsubscribeHandData = eventBus.on('handData', (event: AppEvent) => {
      if (event.type === 'handData') {
        this.processHandData(event.data);
      }
    });
  }

  private processHandData(handDataList: HandData[]): void {
    if (!this.isInitialized) return;

    const { canvasSize } = useAppStore.getState();
    const muted = useAppStore.getState().audioState.muted;

    if (muted) return;

    handDataList.forEach((handData) => {
      const indexTip = handData.landmarks[8];
      if (!indexTip) return;

      const x = indexTip.x * canvasSize.width;
      const y = indexTip.y * canvasSize.height;
      const timestamp = handData.timestamp;

      let fingerState = this.fingerStates.get(handData.id);
      if (!fingerState) {
        fingerState = {
          lastX: x,
          lastY: y,
          lastTimestamp: timestamp,
          lastDrumHit: {
            kick: 0,
            snare: 0,
            tom: 0,
            hihat: 0,
            crash: 0,
          },
        };
        this.fingerStates.set(handData.id, fingerState);
        return;
      }

      const deltaY = y - fingerState.lastY;
      const deltaTime = timestamp - fingerState.lastTimestamp;

      if (deltaY > this.hitThreshold && deltaTime < 200) {
        DRUM_ZONES.forEach((drum) => {
          if (this.isPointInDrum(x, y, drum, canvasSize)) {
            const now = Date.now();
            if (now - fingerState!.lastDrumHit[drum.id] < this.debounceTime) {
              return;
            }

            const velocity = this.calculateVelocity(x, y, drum, canvasSize);
            fingerState!.lastDrumHit[drum.id] = now;

            const centerX = (drum.x / 100) * canvasSize.width;
            const centerY = (drum.y / 100) * canvasSize.height;

            useAppStore.getState().triggerDrumHit(
              drum.id,
              velocity,
              centerX,
              centerY,
              timestamp
            );

            this.playDrum(drum.id, velocity);
          }
        });
      }

      fingerState.lastX = x;
      fingerState.lastY = y;
      fingerState.lastTimestamp = timestamp;
    });

    const activeHandIds = new Set(handDataList.map((h) => h.id));
    this.fingerStates.forEach((_, id) => {
      if (!activeHandIds.has(id)) {
        this.fingerStates.delete(id);
      }
    });
  }

  private isPointInDrum(
    x: number,
    y: number,
    drum: DrumZone,
    canvasSize: { width: number; height: number }
  ): boolean {
    const centerX = (drum.x / 100) * canvasSize.width;
    const centerY = (drum.y / 100) * canvasSize.height;
    const halfWidth = (drum.width / 100) * canvasSize.width / 2;
    const halfHeight = (drum.height / 100) * canvasSize.height / 2;

    if (drum.shape === 'circle' || drum.shape === 'ellipse') {
      const normalizedX = (x - centerX) / halfWidth;
      const normalizedY = (y - centerY) / halfHeight;
      return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
    } else {
      return (
        x >= centerX - halfWidth &&
        x <= centerX + halfWidth &&
        y >= centerY - halfHeight &&
        y <= centerY + halfHeight
      );
    }
  }

  private calculateVelocity(
    x: number,
    y: number,
    drum: DrumZone,
    canvasSize: { width: number; height: number }
  ): number {
    const centerX = (drum.x / 100) * canvasSize.width;
    const centerY = (drum.y / 100) * canvasSize.height;
    const halfWidth = (drum.width / 100) * canvasSize.width / 2;
    const halfHeight = (drum.height / 100) * canvasSize.height / 2;

    const dx = x - centerX;
    const dy = y - centerY;

    const normalizedDistance = Math.sqrt(
      (dx * dx) / (halfWidth * halfWidth) + (dy * dy) / (halfHeight * halfHeight)
    );

    const velocity = Math.max(0, Math.min(1, 1 - normalizedDistance));
    return velocity;
  }

  private playDrum(drumId: DrumType, velocity: number): void {
    if (!this.isInitialized || !this.masterGain) return;

    const scaledVelocity = Math.max(0.1, velocity);
    const now = Tone.now();

    switch (drumId) {
      case 'kick':
        if (this.kickSynth) {
          this.kickSynth.volume.value = Tone.gainToDb(scaledVelocity * 0.7);
          this.kickSynth.triggerAttackRelease('C1', 0.3, now);
        }
        break;
      case 'snare':
        if (this.snareSynth) {
          this.snareSynth.volume.value = Tone.gainToDb(scaledVelocity * 0.5);
          this.snareSynth.triggerAttackRelease('C4', 0.2, now);
        }
        break;
      case 'tom':
        if (this.tomSynth) {
          this.tomSynth.volume.value = Tone.gainToDb(scaledVelocity * 0.6);
          this.tomSynth.triggerAttackRelease('C3', 0.15, now);
        }
        break;
      case 'hihat':
        if (this.hihatSynth) {
          this.hihatSynth.volume.value = Tone.gainToDb(scaledVelocity * 0.3) - 15;
          this.hihatSynth.triggerAttackRelease('C5', 0.1, now);
        }
        break;
      case 'crash':
        if (this.crashSynth) {
          this.crashSynth.volume.value = Tone.gainToDb(scaledVelocity * 0.4) - 12;
          this.crashSynth.triggerAttackRelease('C4', 0.8, now);
        }
        break;
    }
  }

  setMuted(muted: boolean): void {
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 0.7;
    }
    useAppStore.getState().setAudioMuted(muted);
  }

  toggleMute(): boolean {
    const currentMuted = useAppStore.getState().audioState.muted;
    const newMuted = !currentMuted;
    this.setMuted(newMuted);
    return newMuted;
  }

  destroy(): void {
    if (this.unsubscribeHandData) {
      this.unsubscribeHandData();
    }

    if (this.kickSynth) this.kickSynth.dispose();
    if (this.snareSynth) this.snareSynth.dispose();
    if (this.tomSynth) this.tomSynth.dispose();
    if (this.hihatSynth) this.hihatSynth.dispose();
    if (this.crashSynth) this.crashSynth.dispose();
    if (this.masterGain) this.masterGain.dispose();

    this.isInitialized = false;
    this.fingerStates.clear();
  }
}

export async function createAudioEngine(): Promise<AudioEngine> {
  const engine = new AudioEngine();
  await engine.init();
  return engine;
}
