import { BeatData, BeatEvent, BeatCallback, PERFECT_WINDOW } from '../types';
import { AudioLoader } from '../audio/AudioLoader';

interface BeatCache {
  trackId: string;
  beatData: BeatData;
  lastAccessed: number;
}

export class BeatEngine {
  private audioLoader: AudioLoader;
  private beatCache: Map<string, BeatCache> = new Map();
  private currentTrackId: string | null = null;
  private currentBeatData: BeatData | null = null;
  private callbacks: Set<BeatCallback> = new Set();
  private animationFrameId: number | null = null;
  private lastBeatIndex: number = -1;
  private startTime: number = 0;
  private isRunning: boolean = false;
  private maxCacheSize: number = 10;

  constructor(audioLoader: AudioLoader) {
    this.audioLoader = audioLoader;
  }

  async loadTrack(trackId: string, path: string, name: string, bpm: number): Promise<BeatData> {
    const cached = this.beatCache.get(trackId);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.beatData;
    }

    await this.audioLoader.loadTrack(trackId, path, name, bpm);
    const beatData = this.audioLoader.getBeatData(trackId);
    
    if (!beatData) {
      throw new Error(`Failed to generate beat data for track ${trackId}`);
    }

    this.cacheBeatData(trackId, beatData);
    return beatData;
  }

  private cacheBeatData(trackId: string, beatData: BeatData): void {
    if (this.beatCache.size >= this.maxCacheSize) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      this.beatCache.forEach((cache, key) => {
        if (cache.lastAccessed < oldestTime) {
          oldestTime = cache.lastAccessed;
          oldestKey = key;
        }
      });

      if (oldestKey) {
        this.beatCache.delete(oldestKey);
      }
    }

    this.beatCache.set(trackId, {
      trackId,
      beatData,
      lastAccessed: Date.now()
    });
  }

  setTrack(trackId: string): boolean {
    const cached = this.beatCache.get(trackId);
    if (!cached) {
      console.warn(`Track ${trackId} not loaded in BeatEngine`);
      return false;
    }

    this.currentTrackId = trackId;
    this.currentBeatData = cached.beatData;
    this.lastBeatIndex = -1;
    return true;
  }

  start(): void {
    if (this.isRunning || !this.currentBeatData) return;

    this.isRunning = true;
    this.startTime = performance.now();
    this.lastBeatIndex = -1;
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = (): void => {
    if (!this.isRunning || !this.currentBeatData || !this.currentTrackId) {
      return;
    }

    const currentAudioTime = this.audioLoader.getCurrentTime(this.currentTrackId) * 1000;
    const { beatTimes, bpm } = this.currentBeatData;

    for (let i = this.lastBeatIndex + 1; i < beatTimes.length; i++) {
      const beatTime = beatTimes[i];
      const timeDiff = currentAudioTime - beatTime;

      if (timeDiff >= 0 && timeDiff < 50) {
        const isPerfect = timeDiff <= PERFECT_WINDOW;
        
        const event: BeatEvent = {
          beatIndex: i,
          timestamp: performance.now(),
          bpm,
          isPerfect
        };

        this.emitBeat(event);
        this.lastBeatIndex = i;
        break;
      } else if (timeDiff > 50) {
        this.lastBeatIndex = i;
      } else {
        break;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private emitBeat(event: BeatEvent): void {
    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in beat callback:', error);
      }
    });
  }

  onBeat(callback: BeatCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  offBeat(callback: BeatCallback): void {
    this.callbacks.delete(callback);
  }

  getTimeUntilNextBeat(): number {
    if (!this.currentBeatData || !this.currentTrackId) return Infinity;

    const currentAudioTime = this.audioLoader.getCurrentTime(this.currentTrackId) * 1000;
    const { beatTimes } = this.currentBeatData;

    for (let i = this.lastBeatIndex + 1; i < beatTimes.length; i++) {
      if (beatTimes[i] > currentAudioTime) {
        return beatTimes[i] - currentAudioTime;
      }
    }

    return Infinity;
  }

  getProgressToNextBeat(): number {
    if (!this.currentBeatData || !this.currentTrackId) return 0;

    const currentAudioTime = this.audioLoader.getCurrentTime(this.currentTrackId) * 1000;
    const { beatTimes, bpm } = this.currentBeatData;
    const beatInterval = 60000 / bpm;

    for (let i = this.lastBeatIndex + 1; i < beatTimes.length; i++) {
      if (beatTimes[i] > currentAudioTime) {
        const timeSinceLastBeat = i > 0 
          ? currentAudioTime - beatTimes[i - 1] 
          : currentAudioTime;
        return Math.min(1, timeSinceLastBeat / beatInterval);
      }
    }

    return 0;
  }

  getCurrentBeatIndex(): number {
    return this.lastBeatIndex;
  }

  getCurrentBPM(): number {
    return this.currentBeatData?.bpm || 0;
  }

  isTrackLoaded(trackId: string): boolean {
    return this.beatCache.has(trackId);
  }

  getBeatData(trackId: string): BeatData | null {
    return this.beatCache.get(trackId)?.beatData || null;
  }

  clearCache(): void {
    this.beatCache.clear();
  }

  destroy(): void {
    this.stop();
    this.callbacks.clear();
    this.clearCache();
  }
}

export default BeatEngine;
