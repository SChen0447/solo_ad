import type { SoundSourceMeta, PresetSoundscape, SoundSourceType } from './types';

export const SOUND_SOURCE_META: Record<SoundSourceType, SoundSourceMeta> = {
  piano: {
    type: 'piano',
    name: '钢琴',
    color: '#ff8c42',
    pulseFrequency: 2
  },
  bass: {
    type: 'bass',
    name: '贝斯',
    color: '#7b2cbf',
    pulseFrequency: 1
  },
  drums: {
    type: 'drums',
    name: '鼓点',
    color: '#e63946',
    pulseFrequency: 4
  },
  birds: {
    type: 'birds',
    name: '鸟鸣',
    color: '#2ec4b6',
    pulseFrequency: 3
  },
  rain: {
    type: 'rain',
    name: '雨声',
    color: '#4cc9f0',
    pulseFrequency: 8
  },
  synth: {
    type: 'synth',
    name: '电子脉冲',
    color: '#ff006e',
    pulseFrequency: 6
  }
};

export const PRESET_SOUNDSCAPES: PresetSoundscape[] = [
  {
    id: 'forest',
    name: '清晨森林',
    config: {
      version: '1.0',
      timestamp: Date.now(),
      masterVolume: 0.7,
      reverbEnabled: true,
      sources: [
        { type: 'birds', position: { x: -5, y: 3, z: -5 }, volume: 0.6 },
        { type: 'birds', position: { x: 6, y: 4, z: -3 }, volume: 0.4 },
        { type: 'rain', position: { x: 0, y: 8, z: 0 }, volume: 0.3 },
        { type: 'piano', position: { x: 3, y: 1, z: 4 }, volume: 0.5 }
      ]
    }
  },
  {
    id: 'city',
    name: '雨夜城市',
    config: {
      version: '1.0',
      timestamp: Date.now(),
      masterVolume: 0.75,
      reverbEnabled: true,
      sources: [
        { type: 'rain', position: { x: 0, y: 10, z: 0 }, volume: 0.6 },
        { type: 'bass', position: { x: -6, y: 1, z: -4 }, volume: 0.5 },
        { type: 'drums', position: { x: 5, y: 1, z: 3 }, volume: 0.4 },
        { type: 'synth', position: { x: -3, y: 2, z: 5 }, volume: 0.3 }
      ]
    }
  },
  {
    id: 'dance',
    name: '电子舞池',
    config: {
      version: '1.0',
      timestamp: Date.now(),
      masterVolume: 0.8,
      reverbEnabled: false,
      sources: [
        { type: 'drums', position: { x: 0, y: 1, z: 0 }, volume: 0.7 },
        { type: 'bass', position: { x: -4, y: 1, z: -4 }, volume: 0.6 },
        { type: 'synth', position: { x: 4, y: 2, z: -3 }, volume: 0.5 },
        { type: 'synth', position: { x: -5, y: 3, z: 4 }, volume: 0.4 },
        { type: 'piano', position: { x: 5, y: 2, z: 5 }, volume: 0.3 }
      ]
    }
  }
];

export const MAX_SOURCES = 8;
export const TRAIL_LENGTH = 120;
export const MOVEMENT_SPEED = 5;
export const BEAT_BPM = 120;
