import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { MixerState, Track, EffectChain } from '@/types';

const defaultEffects: EffectChain = {
  delay: { enabled: false, delayTime: 300, feedback: 0.4 },
  reverb: { enabled: false, decayTime: 1.5 },
};

function createEmptyTrack(id: string, name: string): Track {
  return {
    id,
    name,
    volume: -6,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    effects: { ...defaultEffects, delay: { ...defaultEffects.delay }, reverb: { ...defaultEffects.reverb } },
    audioBuffer: null,
  };
}

export const useMixerStore = create<MixerState>((set, get) => ({
  tracks: [],
  isPlaying: false,
  connectionStatus: 'initializing',
  exportState: { isExporting: false, progress: 0 },
  currentTime: 0,
  userId: uuidv4(),

  addTrack: async (file: File) => {
    const state = get();
    if (state.tracks.length >= 8) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 44100 });
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch {
      audioContext.close();
      return;
    }
    audioContext.close();

    const trackId = uuidv4();
    const trackName = file.name.replace(/\.[^/.]+$/, '');
    const newTrack: Track = {
      ...createEmptyTrack(trackId, trackName),
      audioBuffer,
    };

    set((s) => ({ tracks: [...s.tracks, newTrack] }));
  },

  removeTrack: (trackId: string) => {
    set((s) => ({ tracks: s.tracks.filter((t) => t.id !== trackId) }));
  },

  setTrackVolume: (trackId: string, volume: number) => {
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, volume } : t)),
    }));
  },

  setTrackEQ: (trackId: string, band: 'eqLow' | 'eqMid' | 'eqHigh', value: number) => {
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId ? { ...t, [band]: value } : t
      ),
    }));
  },

  setTrackEffect: (trackId: string, effectType: 'delay' | 'reverb', params: Partial<import('@/types').DelayEffect | import('@/types').ReverbEffect>) => {
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              effects: {
                ...t.effects,
                [effectType]: { ...t.effects[effectType], ...params },
              },
            }
          : t
      ),
    }));
  },

  setPlaying: (playing: boolean) => {
    set({ isPlaying: playing, currentTime: playing ? get().currentTime : 0 });
  },

  setConnectionStatus: (status) => {
    set({ connectionStatus: status });
  },

  setExportState: (state) => {
    set((s) => ({ exportState: { ...s.exportState, ...state } }));
  },

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },

  applyRemoteUpdate: (trackId: string, params: Partial<import('@/types').TrackParams>) => {
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId ? { ...t, ...params, audioBuffer: t.audioBuffer } : t
      ),
    }));
  },
}));
