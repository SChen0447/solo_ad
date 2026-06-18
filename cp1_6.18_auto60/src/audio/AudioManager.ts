import { WorldModel } from '../game/WorldModel';
import { CELL_SIZE, GUARD_SIGHT_RADIUS } from '../game/types';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private world: WorldModel;
  private initialized: boolean = false;
  private guardHumOsc: OscillatorNode | null = null;
  private guardHumGain: GainNode | null = null;
  private guardHumActive: boolean = false;

  constructor(world: WorldModel) {
    this.world = world;
  }

  public init(): void {
    if (this.initialized) return;
    try {
      const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new CtxClass();
      this.masterGain = this.audioContext!.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext!.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  public ensureInitialized(): void {
    if (!this.initialized || !this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playPulseSound(intensity: number = 1, speedMul: number = 1): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000 * speedMul, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.3);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880 * speedMul, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.4);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35 * intensity, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playBounceSound(intensity: number = 1): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2 * intensity, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playCoinSound(): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    const osc1 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.setValueAtTime(1600, now + 0.05);
    osc1.frequency.setValueAtTime(2000, now + 0.1);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.25);
  }

  public playGuardAlertSound(): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const start = now + i * 0.15;
      osc.type = 'square';
      osc.frequency.setValueAtTime(700, start);
      osc.frequency.linearRampToValueAtTime(500, start + 0.12);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.14);
    }
  }

  public updateGuardProximity(delta: number): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const playerPos = this.world.getPlayerPosition();
    const guards = this.world.getGuards();
    let nearestDist = Infinity;
    let anyChasing = false;

    for (const guard of guards) {
      const dx = guard.position.x - playerPos.x;
      const dy = guard.position.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      nearestDist = Math.min(nearestDist, dist);
      if (guard.state === 'CHASE') anyChasing = true;
    }

    const warnRadius = GUARD_SIGHT_RADIUS * 0.7;
    const shouldHum = nearestDist < warnRadius;
    const intensity = Math.max(0, 1 - nearestDist / warnRadius);

    if (shouldHum || anyChasing) {
      if (!this.guardHumActive) {
        this.startGuardHum();
      }
      if (this.guardHumGain && this.guardHumOsc) {
        const freq = anyChasing ? 90 : 55;
        const vol = anyChasing ? 0.08 + intensity * 0.12 : 0.03 + intensity * 0.08;
        const now = this.audioContext.currentTime;
        this.guardHumOsc.frequency.linearRampToValueAtTime(freq + intensity * 30, now + 0.2);
        this.guardHumGain.gain.linearRampToValueAtTime(vol, now + 0.2);
      }
      this.guardHumActive = true;
    } else {
      if (this.guardHumActive) {
        this.stopGuardHum();
      }
    }
  }

  private startGuardHum(): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    this.guardHumOsc = this.audioContext.createOscillator();
    this.guardHumGain = this.audioContext.createGain();

    this.guardHumOsc.type = 'sawtooth';
    this.guardHumOsc.frequency.value = 55;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;

    this.guardHumGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.guardHumGain.gain.linearRampToValueAtTime(0.03, this.audioContext.currentTime + 0.3);

    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 2;
    lfoGain.gain.value = 8;
    lfo.connect(lfoGain);
    lfoGain.connect(this.guardHumOsc.frequency);
    lfo.start();
    (this.guardHumOsc as any)._lfo = lfo;

    this.guardHumOsc.connect(filter);
    filter.connect(this.guardHumGain);
    this.guardHumGain.connect(this.masterGain);

    this.guardHumOsc.start();
  }

  private stopGuardHum(): void {
    if (!this.guardHumOsc || !this.guardHumGain || !this.audioContext) {
      this.guardHumActive = false;
      return;
    }

    const now = this.audioContext.currentTime;
    this.guardHumGain.gain.cancelScheduledValues(now);
    this.guardHumGain.gain.linearRampToValueAtTime(0, now + 0.4);

    const osc = this.guardHumOsc;
    const lfo = (osc as any)._lfo;
    setTimeout(() => {
      try {
        osc.stop();
        if (lfo) lfo.stop();
      } catch (e) {}
    }, 500);

    this.guardHumOsc = null;
    this.guardHumGain = null;
    this.guardHumActive = false;
  }

  public playVictorySound(): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];

    for (let i = 0; i < notes.length; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const t = now + i * 0.12;
      osc.type = 'triangle';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.5);
    }
  }

  public playGameOverSound(): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const notes = [440, 349.23, 293.66, 220];

    for (let i = 0; i < notes.length; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const t = now + i * 0.18;
      osc.type = 'sawtooth';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.6);
    }
  }

  public playAbilitySound(): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  public setMasterVolume(value: number): void {
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1, value)),
        this.audioContext.currentTime + 0.1
      );
    }
  }

  public destroy(): void {
    this.stopGuardHum();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
