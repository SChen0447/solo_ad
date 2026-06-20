import { useRef, useCallback } from 'react';
import type { Track, Effect } from '../types';

interface TrackGraph {
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  filterNodes: Map<string, AudioNode>;
}

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const trackGraphsRef = useRef<Map<string, TrackGraph>>(new Map());
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 44100 });
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.value = 1;
      masterGainRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const decodeAudioFile = useCallback(async (file: File): Promise<{ audioBuffer: AudioBuffer; waveformData: number[] }> => {
    const ctx = initAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    const samples = 500;
    const blockSize = Math.floor(channelData.length / samples);
    const waveformData: number[] = [];

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j]);
      }
      waveformData.push(sum / blockSize);
    }

    const max = Math.max(...waveformData);
    const normalized = waveformData.map(v => v / max);

    return { audioBuffer, waveformData: normalized };
  }, [initAudioContext]);

  const createReverbImpulse = useCallback((ctx: AudioContext, decayTime: number): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * decayTime;
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }

    return impulse;
  }, []);

  const connectEffect = useCallback((
    ctx: AudioContext,
    effect: Effect,
    inputNode: AudioNode,
    outputNode: AudioNode
  ): AudioNode => {
    if (!effect.enabled) {
      inputNode.connect(outputNode);
      return inputNode;
    }

    switch (effect.type) {
      case 'reverb': {
        const convolver = ctx.createConvolver();
        convolver.buffer = createReverbImpulse(ctx, effect.params.decayTime || 2);
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        dryGain.gain.value = 0.7;
        wetGain.gain.value = 0.3;

        inputNode.connect(dryGain);
        inputNode.connect(convolver);
        convolver.connect(wetGain);
        dryGain.connect(outputNode);
        wetGain.connect(outputNode);
        return convolver;
      }

      case 'delay': {
        const delay = ctx.createDelay(5);
        delay.delayTime.value = 0.3;
        const feedback = ctx.createGain();
        feedback.gain.value = effect.params.feedback || 0.3;
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.5;

        inputNode.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetGain);
        wetGain.connect(outputNode);
        inputNode.connect(outputNode);
        return delay;
      }

      case 'lowpass': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = effect.params.cutoff || 2000;
        filter.Q.value = 1;
        inputNode.connect(filter);
        filter.connect(outputNode);
        return filter;
      }

      default:
        inputNode.connect(outputNode);
        return inputNode;
    }
  }, [createReverbImpulse]);

  const addTrack = useCallback((track: Track) => {
    const ctx = initAudioContext();
    if (!ctx || !masterGainRef.current || !track.audioBuffer) return;

    const gainNode = ctx.createGain();
    gainNode.gain.value = track.muted ? 0 : track.volume / 100;

    const filterNodes = new Map<string, AudioNode>();
    let lastNode: AudioNode = gainNode;

    track.effects.forEach(effect => {
      const node = connectEffect(ctx, effect, lastNode, masterGainRef.current!);
      filterNodes.set(effect.id, node);
    });

    if (filterNodes.size === 0) {
      gainNode.connect(masterGainRef.current);
    }

    trackGraphsRef.current.set(track.id, {
      source: null,
      gainNode,
      filterNodes
    });
  }, [initAudioContext, connectEffect]);

  const removeTrack = useCallback((trackId: string) => {
    const graph = trackGraphsRef.current.get(trackId);
    if (graph) {
      if (graph.source) {
        try { graph.source.stop(); } catch (e) { /* no-op */ }
        graph.source.disconnect();
      }
      graph.gainNode.disconnect();
      graph.filterNodes.forEach(node => node.disconnect());
      trackGraphsRef.current.delete(trackId);
    }
  }, []);

  const updateTrackVolume = useCallback((trackId: string, volume: number, muted: boolean) => {
    const graph = trackGraphsRef.current.get(trackId);
    if (graph) {
      graph.gainNode.gain.setTargetAtTime(
        muted ? 0 : volume / 100,
        audioContextRef.current?.currentTime || 0,
        0.01
      );
    }
  }, []);

  const applyEffect = useCallback((trackId: string, effect: Effect, tracks: Track[]) => {
    const ctx = initAudioContext();
    const graph = trackGraphsRef.current.get(trackId);
    const track = tracks.find(t => t.id === trackId);

    if (!ctx || !graph || !masterGainRef.current || !track) return;

    graph.gainNode.disconnect();
    graph.filterNodes.forEach(node => node.disconnect());
    graph.filterNodes.clear();

    let lastNode: AudioNode = graph.gainNode;

    track.effects.forEach(eff => {
      const node = connectEffect(ctx, eff, lastNode, masterGainRef.current!);
      graph.filterNodes.set(eff.id, node);
    });

    if (graph.filterNodes.size === 0) {
      graph.gainNode.connect(masterGainRef.current);
    }
  }, [initAudioContext, connectEffect]);

  const startPlayback = useCallback((startTime: number, tracks: Track[]) => {
    const ctx = initAudioContext();
    if (!ctx || !masterGainRef.current) return;

    const hasSolo = tracks.some(t => t.solo);

    tracks.forEach(track => {
      if (!track.audioBuffer) return;

      const graph = trackGraphsRef.current.get(track.id);
      if (!graph) return;

      if (graph.source) {
        try { graph.source.stop(); } catch (e) { /* no-op */ }
        graph.source.disconnect();
      }

      const source = ctx.createBufferSource();
      source.buffer = track.audioBuffer;
      graph.source = source;

      const shouldPlay = hasSolo ? track.solo : !track.muted;
      graph.gainNode.gain.setTargetAtTime(
        shouldPlay ? track.volume / 100 : 0,
        ctx.currentTime,
        0.01
      );

      source.connect(graph.gainNode);

      const offset = Math.max(0, startTime - track.startTime);
      if (offset < track.audioBuffer.duration) {
        source.start(ctx.currentTime, offset);
      }
    });

    startTimeRef.current = ctx.currentTime - startTime;
  }, [initAudioContext]);

  const stopPlayback = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return 0;

    trackGraphsRef.current.forEach(graph => {
      if (graph.source) {
        try { graph.source.stop(); } catch (e) { /* no-op */ }
        graph.source.disconnect();
        graph.source = null;
      }
    });

    pauseTimeRef.current = ctx.currentTime - startTimeRef.current;
    return pauseTimeRef.current;
  }, []);

  const getCurrentTime = useCallback((): number => {
    const ctx = audioContextRef.current;
    if (!ctx) return 0;
    return ctx.currentTime - startTimeRef.current;
  }, []);

  const getAudioContext = useCallback(() => audioContextRef.current, []);
  const getMasterGain = useCallback(() => masterGainRef.current, []);

  return {
    initAudioContext,
    decodeAudioFile,
    addTrack,
    removeTrack,
    updateTrackVolume,
    applyEffect,
    startPlayback,
    stopPlayback,
    getCurrentTime,
    getAudioContext,
    getMasterGain
  };
}
