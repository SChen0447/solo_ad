import * as Tone from 'tone';
import { FLOOR } from '../types';
import type { AIState, AudioSource, Player, Vec2 } from '../types';

const MAX_AUDIO_DISTANCE = 20;
const MIN_AUDIO_DISTANCE = 1;
const SOUND_SPEED = 343;
const DOPPLER_STRENGTH = 0.03;

export interface LoudestSource {
  x: number;
  y: number;
  state: AIState | 'vent' | 'door';
  volume: number;
}

export class SpatialAudioEngine {
  private context: AudioContext | null = null;
  private masterGain: Tone.Gain | null = null;
  private ventOscillators: Map<string, { osc: Tone.Oscillator; gain: Tone.Gain; panner: Tone.Panner3D }> = new Map();
  private footstepNoise: Tone.Noise | null = null;
  private initialized = false;
  private playerPos: Vec2 = { x: 0, y: 0 };
  private playerFacing: number = 0;
  private loudestSource: LoudestSource | null = null;
  private sourceVolumes: Map<string, { volume: number; state: AIState | 'vent' | 'door'; x: number; y: number }> = new Map();

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();
    this.context = Tone.getContext().rawContext as AudioContext;

    this.masterGain = new Tone.Gain(0.8).toDestination();
    this.footstepNoise = new Tone.Noise('brown');
    this.footstepNoise.start();

    this.initialized = true;
  }

  setPlayerPosition(pos: Vec2, facing: number): void {
    this.playerPos = { ...pos };
    this.playerFacing = facing;
    const listener = Tone.getContext().listener as any;
    if (listener && listener.positionX) {
      listener.positionX.value = pos.x;
      listener.positionY.value = pos.y;
      listener.positionZ.value = 1.5;
      const upX = -Math.sin(facing);
      const upY = Math.cos(facing);
      if (listener.forwardX) {
        listener.forwardX.value = Math.cos(facing);
        listener.forwardY.value = Math.sin(facing);
        listener.forwardZ.value = 0;
      }
      if (listener.upX) {
        listener.upX.value = 0;
        listener.upY.value = 0;
        listener.upZ.value = 1;
      }
    }
  }

  private calculateVolume(sourceX: number, sourceY: number): number {
    const dist = Math.hypot(sourceX - this.playerPos.x, sourceY - this.playerPos.y);
    if (dist <= MIN_AUDIO_DISTANCE) return 1.0;
    if (dist >= MAX_AUDIO_DISTANCE) return 0.0;
    return 1 - (dist - MIN_AUDIO_DISTANCE) / (MAX_AUDIO_DISTANCE - MIN_AUDIO_DISTANCE);
  }

  private calculateDoppler(sourceX: number, sourceY: number, state?: AIState): number {
    const dx = sourceX - this.playerPos.x;
    const dy = sourceY - this.playerPos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.01) return 1;

    const dirX = dx / dist;
    const dirY = dy / dist;

    let sourceSpeed = 0;
    if (state === 'patrol') sourceSpeed = 0.5;
    else if (state === 'chase') sourceSpeed = 1.2;

    const approachRate = (dirX * Math.cos(this.playerFacing) + dirY * Math.sin(this.playerFacing)) * sourceSpeed;
    const dopplerShift = 1 + (approachRate / SOUND_SPEED) * DOPPLER_STRENGTH * 1000;

    return Math.max(0.8, Math.min(1.2, dopplerShift));
  }

  private createPanner(x: number, y: number): Tone.Panner3D {
    const panner = new Tone.Panner3D({
      positionX: x,
      positionY: y,
      positionZ: 0,
      panningModel: 'HRTF',
      distanceModel: 'linear',
      refDistance: MIN_AUDIO_DISTANCE,
      maxDistance: MAX_AUDIO_DISTANCE,
      rolloffFactor: 1,
    });
    panner.connect(this.masterGain!);
    return panner;
  }

  playFootstep(source: AudioSource): void {
    if (!this.initialized || !this.footstepNoise) return;

    const vol = this.calculateVolume(source.x, source.y);
    if (vol <= 0) return;

    const doppler = this.calculateDoppler(source.x, source.y, source.state);

    const filter = new Tone.Filter({
      frequency: source.floorType === FLOOR.CARPET ? 4000 * doppler : 2000 * doppler,
      type: source.floorType === FLOOR.CARPET ? 'highpass' : 'lowpass',
      Q: 1,
    });

    const gain = new Tone.Gain({
      gain: 0,
    });

    const panner = this.createPanner(source.x, source.y);

    const env = new Tone.AmplitudeEnvelope({
      attack: 0.005,
      decay: 0.05,
      sustain: 0,
      release: 0.02,
    });

    this.footstepNoise.connect(filter);
    filter.connect(env);
    env.connect(gain);
    gain.connect(panner);

    gain.gain.value = vol * 0.6;
    env.triggerAttackRelease(0.1);

    this.sourceVolumes.set(source.id, {
      volume: vol,
      state: source.state || 'patrol',
      x: source.x,
      y: source.y,
    });
    this.updateLoudestSource();

    setTimeout(() => {
      filter.disconnect();
      env.disconnect();
      gain.disconnect();
      panner.disconnect();
      this.sourceVolumes.delete(source.id);
      this.updateLoudestSource();
    }, 300);
  }

  playDoorSound(source: AudioSource): void {
    if (!this.initialized) return;

    const vol = this.calculateVolume(source.x, source.y);
    if (vol <= 0) return;

    const osc1 = new Tone.Oscillator({ frequency: 200, type: 'sawtooth' });
    const osc2 = new Tone.Oscillator({ frequency: 300, type: 'square' });
    const lfo = new Tone.LFO({ frequency: 8, min: 180, max: 220 });
    const gain = new Tone.Gain({ gain: 0 });
    const filter = new Tone.Filter({ frequency: 800, type: 'lowpass' });
    const panner = this.createPanner(source.x, source.y);

    lfo.connect(osc1.frequency);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(panner);

    const now = Tone.now();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.4, now + 0.05);
    gain.gain.linearRampToValueAtTime(vol * 0.2, now + 0.3);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
    lfo.stop(now + 0.5);

    this.sourceVolumes.set(source.id, {
      volume: vol,
      state: 'door',
      x: source.x,
      y: source.y,
    });
    this.updateLoudestSource();

    setTimeout(() => {
      osc1.disconnect();
      osc2.disconnect();
      lfo.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
      this.sourceVolumes.delete(source.id);
      this.updateLoudestSource();
    }, 600);
  }

  playVentSound(x: number, y: number): void {
    if (!this.initialized) return;

    const key = `vent_${x}_${y}`;
    if (this.ventOscillators.has(key)) return;

    const noise = new Tone.Noise('pink');
    const filter = new Tone.Filter({ frequency: 150, type: 'lowpass', Q: 2 });
    const gain = new Tone.Gain({ gain: 0 });
    const panner = this.createPanner(x, y);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(panner);

    const vol = this.calculateVolume(x, y);
    gain.gain.value = vol * 0.15;

    noise.start();

    this.ventOscillators.set(key, { osc: noise as unknown as Tone.Oscillator, gain, panner });

    this.sourceVolumes.set(key, {
      volume: vol * 0.5,
      state: 'vent',
      x,
      y,
    });
    this.updateLoudestSource();
  }

  stopVentSound(x: number, y: number): void {
    const key = `vent_${x}_${y}`;
    const vent = this.ventOscillators.get(key);
    if (vent) {
      (vent.osc as unknown as Tone.Noise).stop();
      vent.osc.disconnect();
      vent.gain.disconnect();
      vent.panner.disconnect();
      this.ventOscillators.delete(key);
    }
    this.sourceVolumes.delete(key);
    this.updateLoudestSource();
  }

  updateVentVolumes(vents: { x: number; y: number }[]): void {
    for (const { x, y } of vents) {
      const key = `vent_${x}_${y}`;
      const vent = this.ventOscillators.get(key);
      if (vent) {
        const vol = this.calculateVolume(x, y);
        vent.gain.gain.rampTo(vol * 0.15, 0.1);
        if (this.sourceVolumes.has(key)) {
          const src = this.sourceVolumes.get(key)!;
          src.volume = vol * 0.5;
        }
      }
    }
    this.updateLoudestSource();
  }

  playUISound(type: 'alert' | 'door_ui' | 'success'): void {
    if (!this.initialized) return;

    const osc = new Tone.Oscillator();
    const gain = new Tone.Gain({ gain: 0 });
    osc.connect(gain);
    gain.connect(this.masterGain!);

    let freq = 440;
    let dur = 0.1;
    if (type === 'alert') {
      freq = 880;
      dur = 0.15;
    } else if (type === 'door_ui') {
      freq = 600;
      dur = 0.08;
    } else if (type === 'success') {
      freq = 1200;
      dur = 0.12;
    }

    osc.frequency.value = freq;
    const now = Tone.now();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.05);

    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, (dur + 0.1) * 1000);
  }

  private updateLoudestSource(): void {
    let maxVol = 0;
    let maxSrc: { volume: number; state: AIState | 'vent' | 'door'; x: number; y: number } | null = null;

    for (const src of this.sourceVolumes.values()) {
      if (src.volume > maxVol) {
        maxVol = src.volume;
        maxSrc = src;
      }
    }

    if (maxSrc && maxVol > 0.05) {
      this.loudestSource = {
        x: maxSrc.x,
        y: maxSrc.y,
        state: maxSrc.state,
        volume: maxVol,
      };
    } else {
      this.loudestSource = null;
    }
  }

  getLoudestSource(): LoudestSource | null {
    return this.loudestSource;
  }

  handleAudioSource(source: AudioSource): void {
    switch (source.type) {
      case 'footstep':
        this.playFootstep(source);
        break;
      case 'door':
        this.playDoorSound(source);
        break;
      case 'vent':
        this.playVentSound(source.x, source.y);
        break;
    }
  }

  dispose(): void {
    for (const vent of this.ventOscillators.values()) {
      try {
        (vent.osc as unknown as Tone.Noise).stop();
        vent.osc.disconnect();
        vent.gain.disconnect();
        vent.panner.disconnect();
      } catch (_e) { /* ignore */ }
    }
    this.ventOscillators.clear();
    if (this.footstepNoise) {
      this.footstepNoise.stop();
      this.footstepNoise.disconnect();
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
    }
  }
}
