import { Howl, HowlOptions } from 'howler';
import { BeatData } from '../types';

interface TrackInfo {
  id: string;
  path: string;
  name: string;
  bpm: number;
  duration: number;
  howl: Howl | null;
  isLoaded: boolean;
}

export class AudioLoader {
  private tracks: Map<string, TrackInfo> = new Map();
  private currentTrackId: string | null = null;
  private volume: number = 0.7;
  private masterVolume: number = 1.0;

  constructor() {}

  async loadTrack(id: string, path: string, name: string, bpm: number): Promise<TrackInfo> {
    return new Promise((resolve, reject) => {
      const howlOptions: HowlOptions = {
        src: [path],
        html5: true,
        volume: this.volume * this.masterVolume,
        onload: () => {
          const duration = howl.duration();
          const trackInfo: TrackInfo = {
            id,
            path,
            name,
            bpm,
            duration,
            howl,
            isLoaded: true
          };
          this.tracks.set(id, trackInfo);
          resolve(trackInfo);
        },
        onloaderror: (_id, error) => {
          reject(new Error(`Failed to load audio: ${error}`));
        }
      };

      const howl = new Howl(howlOptions);
    });
  }

  play(trackId: string, loop: boolean = false): void {
    const track = this.tracks.get(trackId);
    if (!track || !track.howl) {
      console.warn(`Track ${trackId} not loaded`);
      return;
    }

    if (this.currentTrackId && this.currentTrackId !== trackId) {
      this.stop(this.currentTrackId);
    }

    track.howl.loop(loop);
    track.howl.play();
    this.currentTrackId = trackId;
  }

  pause(trackId?: string): void {
    const id = trackId || this.currentTrackId;
    if (!id) return;

    const track = this.tracks.get(id);
    if (track?.howl) {
      track.howl.pause();
    }
  }

  resume(trackId?: string): void {
    const id = trackId || this.currentTrackId;
    if (!id) return;

    const track = this.tracks.get(id);
    if (track?.howl) {
      track.howl.play();
    }
  }

  stop(trackId?: string): void {
    const id = trackId || this.currentTrackId;
    if (!id) return;

    const track = this.tracks.get(id);
    if (track?.howl) {
      track.howl.stop();
    }
    if (id === this.currentTrackId) {
      this.currentTrackId = null;
    }
  }

  seek(trackId: string, position: number): void {
    const track = this.tracks.get(trackId);
    if (track?.howl) {
      track.howl.seek(position);
    }
  }

  getCurrentTime(trackId?: string): number {
    const id = trackId || this.currentTrackId;
    if (!id) return 0;

    const track = this.tracks.get(id);
    if (track?.howl) {
      return track.howl.seek() as number;
    }
    return 0;
  }

  getDuration(trackId?: string): number {
    const id = trackId || this.currentTrackId;
    if (!id) return 0;

    const track = this.tracks.get(id);
    if (track) {
      return track.duration;
    }
    return 0;
  }

  setVolume(volume: number, trackId?: string): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (trackId) {
      const track = this.tracks.get(trackId);
      if (track?.howl) {
        track.howl.volume(clampedVolume * this.masterVolume);
      }
    } else {
      this.volume = clampedVolume;
      this.tracks.forEach(track => {
        if (track.howl) {
          track.howl.volume(this.volume * this.masterVolume);
        }
      });
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.tracks.forEach(track => {
      if (track.howl) {
        track.howl.volume(this.volume * this.masterVolume);
      }
    });
  }

  isPlaying(trackId?: string): boolean {
    const id = trackId || this.currentTrackId;
    if (!id) return false;

    const track = this.tracks.get(id);
    return track?.howl?.playing() || false;
  }

  getTrackInfo(trackId: string): TrackInfo | undefined {
    return this.tracks.get(trackId);
  }

  getBeatData(trackId: string): BeatData | null {
    const track = this.tracks.get(trackId);
    if (!track) return null;

    const beatInterval = 60000 / track.bpm;
    const beatTimes: number[] = [];
    
    for (let time = 0; time <= track.duration * 1000; time += beatInterval) {
      beatTimes.push(time);
    }

    return {
      bpm: track.bpm,
      beatTimes,
      duration: track.duration * 1000
    };
  }

  unload(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (track?.howl) {
      track.howl.unload();
    }
    this.tracks.delete(trackId);
  }

  unloadAll(): void {
    this.tracks.forEach((track) => {
      if (track.howl) {
        track.howl.unload();
      }
    });
    this.tracks.clear();
    this.currentTrackId = null;
  }
}

export default AudioLoader;
