export interface TrackState {
  id: number;
  name: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  audioBuffer: AudioBuffer | null;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  analyser: AnalyserNode;
  startTime: number;
  pauseTime: number;
  isPlaying: boolean;
}

export class AudioEngine {
  audioContext: AudioContext;
  masterGain: GainNode;
  masterAnalyser: AnalyserNode;
  tracks: TrackState[] = [];
  isPlaying: boolean = false;
  bpm: number = 120;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private trackCount: number = 4;

  constructor(trackCount: number = 4) {
    this.trackCount = trackCount;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterAnalyser = this.audioContext.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.audioContext.destination);

    for (let i = 0; i < trackCount; i++) {
      this.initTrack(i);
    }
  }

  private initTrack(index: number): void {
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0.7;

    const panNode = this.audioContext.createStereoPanner();
    panNode.pan.value = 0;

    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 2048;

    gainNode.connect(panNode);
    panNode.connect(analyser);
    analyser.connect(this.masterGain);

    this.tracks[index] = {
      id: index,
      name: `Track ${index + 1}`,
      volume: 70,
      pan: 0,
      muted: false,
      solo: false,
      audioBuffer: null,
      sourceNode: null,
      gainNode,
      panNode,
      analyser,
      startTime: 0,
      pauseTime: 0,
      isPlaying: false
    };
  }

  async loadAudio(file: File, trackIndex: number): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.tracks[trackIndex].audioBuffer = audioBuffer;
    this.tracks[trackIndex].name = file.name;
  }

  start(): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const hasSolo = this.tracks.some(t => t.solo && t.audioBuffer);
    const offset = this.pauseTime;

    this.tracks.forEach((track) => {
      if (!track.audioBuffer) return;
      if (hasSolo && !track.solo) return;
      if (track.muted) return;

      this.playTrack(track, offset);
    });

    this.startTime = this.audioContext.currentTime - offset;
    this.pauseTime = 0;
    this.isPlaying = true;
  }

  private playTrack(track: TrackState, offset: number = 0): void {
    if (track.sourceNode) {
      track.sourceNode.stop();
      track.sourceNode.disconnect();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = track.audioBuffer;
    source.loop = true;
    source.connect(track.gainNode);
    source.start(0, offset);
    track.sourceNode = source;
    track.isPlaying = true;
  }

  stop(): void {
    this.pauseTime = this.getCurrentTime();

    this.tracks.forEach((track) => {
      if (track.sourceNode) {
        track.sourceNode.stop();
        track.sourceNode.disconnect();
        track.sourceNode = null;
      }
      track.isPlaying = false;
    });

    this.isPlaying = false;
  }

  setVolume(trackIndex: number, value: number): void {
    this.tracks[trackIndex].volume = value;
    const normalized = value / 100;
    this.tracks[trackIndex].gainNode.gain.value = this.tracks[trackIndex].muted ? 0 : normalized;
  }

  setPan(trackIndex: number, value: number): void {
    this.tracks[trackIndex].pan = value;
    const normalized = value / 50;
    this.tracks[trackIndex].panNode.pan.value = Math.max(-1, Math.min(1, normalized));
  }

  setMasterVolume(value: number): void {
    this.masterGain.gain.value = value / 100;
  }

  toggleMute(trackIndex: number): void {
    const track = this.tracks[trackIndex];
    track.muted = !track.muted;
    track.gainNode.gain.value = track.muted ? 0 : track.volume / 100;
    this.updateSoloState();
  }

  toggleSolo(trackIndex: number): void {
    this.tracks[trackIndex].solo = !this.tracks[trackIndex].solo;
    this.updateSoloState();
  }

  private updateSoloState(): void {
    if (!this.isPlaying) return;

    const hasSolo = this.tracks.some(t => t.solo && t.audioBuffer);

    this.tracks.forEach((track) => {
      if (!track.audioBuffer) return;

      const shouldPlay = track.muted ? false : (hasSolo ? track.solo : true);

      if (shouldPlay && !track.isPlaying) {
        this.playTrack(track, this.getCurrentTime());
      } else if (!shouldPlay && track.isPlaying && track.sourceNode) {
        track.sourceNode.stop();
        track.sourceNode.disconnect();
        track.sourceNode = null;
        track.isPlaying = false;
      }
    });
  }

  setBPM(bpm: number): void {
    this.bpm = bpm;
  }

  getCurrentTime(): number {
    if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pauseTime;
  }

  getDuration(): number {
    const durations = this.tracks
      .filter(t => t.audioBuffer)
      .map(t => t.audioBuffer?.duration || 0);
    return durations.length > 0 ? Math.max(...durations) : 60;
  }

  seek(time: number): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stop();
    }
    this.pauseTime = Math.max(0, time);
    if (wasPlaying) {
      this.start();
    }
  }

  getAnalyser(trackIndex: number): AnalyserNode {
    return this.tracks[trackIndex].analyser;
  }

  getMasterAnalyser(): AnalyserNode {
    return this.masterAnalyser;
  }

  reorderTracks(fromIndex: number, toIndex: number): void {
    const [removed] = this.tracks.splice(fromIndex, 1);
    this.tracks.splice(toIndex, 0, removed);
    this.tracks.forEach((track, idx) => {
      track.id = idx;
    });
  }
}
