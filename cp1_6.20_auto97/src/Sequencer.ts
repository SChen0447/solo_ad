import { AudioEngine } from './AudioEngine';
import { PianoKeyboard } from './PianoKeyboard';

interface NoteEvent {
  note: string;
  octave: number;
  startTime: number;
  duration: number;
}

interface Track {
  id: string;
  name: string;
  notes: NoteEvent[];
  muted: boolean;
  color: string;
}

interface OngoingNote {
  note: string;
  octave: number;
  startTime: number;
}

export class Sequencer {
  private audioEngine: AudioEngine;
  private keyboard: PianoKeyboard;
  private timelineContainer: HTMLElement;
  private playhead: HTMLElement;
  private trackListContainer: HTMLElement;
  private trackCountElement: HTMLElement;

  private tracks: Track[] = [];
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private playbackSpeed: number = 1;
  private recordingStartTime: number = 0;
  private ongoingNotes: Map<string, OngoingNote> = new Map();
  private scheduledEvents: { event: string; note: string; octave: number; scheduledTime: number }[] = [];

  private animationFrameId: number | null = null;
  private playStartTime: number = 0;
  private playStartContextTime: number = 0;
  private maxDuration: number = 8;

  private onTracksChanged: (() => void) | null = null;
  private onRecordingStateChanged: ((isRecording: boolean) => void) | null = null;
  private onPlayStateChanged: ((isPlaying: boolean) => void) | null = null;

  constructor(
    audioEngine: AudioEngine,
    keyboard: PianoKeyboard,
    timelineContainer: HTMLElement,
    playhead: HTMLElement,
    trackListContainer: HTMLElement,
    trackCountElement: HTMLElement
  ) {
    this.audioEngine = audioEngine;
    this.keyboard = keyboard;
    this.timelineContainer = timelineContainer;
    this.playhead = playhead;
    this.trackListContainer = trackListContainer;
    this.trackCountElement = trackCountElement;

    this.updateTrackList();
    this.updateTimeline();
  }

  public startRecording(): void {
    if (this.isRecording) return;
    if (this.tracks.length >= 4) return;

    this.audioEngine.resume();

    const trackId = `track-${Date.now()}`;
    const trackIndex = this.tracks.length;
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];

    const track: Track = {
      id: trackId,
      name: `音轨 ${trackIndex + 1}`,
      notes: [],
      muted: false,
      color: colors[trackIndex % colors.length]
    };

    this.tracks.push(track);

    this.isRecording = true;
    this.recordingStartTime = this.audioEngine.getContextTime();
    this.ongoingNotes.clear();

    this.updateTrackList();

    if (this.onRecordingStateChanged) {
      this.onRecordingStateChanged(true);
    }
  }

  public stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;
    const now = this.audioEngine.getContextTime();
    const recordDuration = now - this.recordingStartTime;

    const currentTrack = this.tracks[this.tracks.length - 1];

    this.ongoingNotes.forEach((ongoing) => {
      const startTime = ongoing.startTime - this.recordingStartTime;
      const duration = now - ongoing.startTime;
      currentTrack.notes.push({
        note: ongoing.note,
        octave: ongoing.octave,
        startTime,
        duration
      });
    });

    this.ongoingNotes.clear();

    if (currentTrack.notes.length === 0 && recordDuration < 0.1) {
      this.tracks.pop();
    } else {
      this.maxDuration = Math.max(this.maxDuration, recordDuration + 2);
    }

    this.updateTrackList();
    this.updateTimeline();

    if (this.onTracksChanged) {
      this.onTracksChanged();
    }

    if (this.onRecordingStateChanged) {
      this.onRecordingStateChanged(false);
    }
  }

  public recordNoteOn(note: string, octave: number): void {
    if (!this.isRecording) return;

    const noteKey = `${note}${octave}`;
    if (this.ongoingNotes.has(noteKey)) return;

    const now = this.audioEngine.getContextTime();
    this.ongoingNotes.set(noteKey, {
      note,
      octave,
      startTime: now
    });
  }

  public recordNoteOff(note: string, octave: number): void {
    if (!this.isRecording) return;

    const noteKey = `${note}${octave}`;
    const ongoing = this.ongoingNotes.get(noteKey);
    if (!ongoing || this.tracks.length === 0) {
      this.ongoingNotes.delete(noteKey);
      return;
    }

    const now = this.audioEngine.getContextTime();
    const startTime = ongoing.startTime - this.recordingStartTime;
    const duration = now - ongoing.startTime;

    const currentTrack = this.tracks[this.tracks.length - 1];
    currentTrack.notes.push({
      note,
      octave,
      startTime,
      duration
    });

    this.ongoingNotes.delete(noteKey);
    this.updateTimeline();
  }

  public startPlayback(): void {
    if (this.isPlaying) return;
    if (this.tracks.length === 0) return;

    this.audioEngine.resume();
    this.isPlaying = true;
    this.playStartTime = this.currentTime;
    this.playStartContextTime = this.audioEngine.getContextTime();

    this.scheduleNotes();

    if (this.onPlayStateChanged) {
      this.onPlayStateChanged(true);
    }

    this.animationLoop();
  }

  private scheduleNotes(): void {
    const ctx = this.audioEngine.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const startTime = this.currentTime;

    this.scheduledEvents = [];

    this.tracks.forEach((track) => {
      if (track.muted) return;

      track.notes.forEach((noteEvent) => {
        const noteStartTime = noteEvent.startTime / this.playbackSpeed;
        if (noteStartTime + noteEvent.duration / this.playbackSpeed < startTime) return;
        if (noteStartTime < startTime) {
          const remainingDuration = noteEvent.duration - (startTime - noteStartTime) * this.playbackSpeed;
          if (remainingDuration <= 0) return;
          const scheduledTime = now + 0.05;
          this.scheduledEvents.push({
            event: 'on',
            note: noteEvent.note,
            octave: noteEvent.octave,
            scheduledTime
          });
          this.scheduledEvents.push({
            event: 'off',
            note: noteEvent.note,
            octave: noteEvent.octave,
            scheduledTime: scheduledTime + remainingDuration / this.playbackSpeed
          });
        } else {
          const offset = noteStartTime - startTime;
          const scheduledTime = now + offset + 0.05;
          this.scheduledEvents.push({
            event: 'on',
            note: noteEvent.note,
            octave: noteEvent.octave,
            scheduledTime
          });
          this.scheduledEvents.push({
            event: 'off',
            note: noteEvent.note,
            octave: noteEvent.octave,
            scheduledTime: scheduledTime + noteEvent.duration / this.playbackSpeed
          });
        }
      });
    });

    this.scheduledEvents.sort((a, b) => a.scheduledTime - b.scheduledTime);

    this.scheduledEvents.forEach((evt) => {
      if (evt.event === 'on') {
        this.audioEngine.noteOn(evt.note, evt.octave);
        const delay = evt.scheduledTime - now;
        setTimeout(() => {
          if (this.isPlaying) {
            this.keyboard.pressKey(evt.note, evt.octave);
          }
        }, delay * 1000);
      } else {
        const delay = evt.scheduledTime - now;
        setTimeout(() => {
          this.audioEngine.noteOff(evt.note, evt.octave);
          this.keyboard.releaseKey(evt.note, evt.octave);
        }, delay * 1000);
      }
    });
  }

  private animationLoop(): void {
    if (!this.isPlaying) return;

    const ctxTime = this.audioEngine.getContextTime();
    const elapsed = (ctxTime - this.playStartContextTime) * this.playbackSpeed;
    this.currentTime = this.playStartTime + elapsed;

    const maxTime = this.getTotalDuration();
    if (this.currentTime >= maxTime) {
      this.stopPlayback();
      return;
    }

    const playheadLeft = (this.currentTime / this.maxDuration) * 100;
    this.playhead.style.left = `${playheadLeft}%`;

    this.animationFrameId = requestAnimationFrame(() => this.animationLoop());
  }

  public stopPlayback(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.audioEngine.allNotesOff();
    this.keyboard.releaseAllKeys();

    this.scheduledEvents = [];

    if (this.onPlayStateChanged) {
      this.onPlayStateChanged(false);
    }
  }

  public setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
  }

  public setCurrentTime(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.getTotalDuration()));
    const playheadLeft = (this.currentTime / this.maxDuration) * 100;
    this.playhead.style.left = `${playheadLeft}%`;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getTotalDuration(): number {
    let max = 0;
    this.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const end = note.startTime + note.duration;
        if (end > max) max = end;
      });
    });
    return Math.max(max, this.maxDuration);
  }

  public getTracks(): Track[] {
    return this.tracks;
  }

  public toggleMute(trackId: string): void {
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.muted = !track.muted;
      this.updateTrackList();
      this.updateTimeline();
    }
  }

  public deleteTrack(trackId: string): void {
    const index = this.tracks.findIndex((t) => t.id === trackId);
    if (index !== -1) {
      this.tracks.splice(index, 1);
      this.updateTrackList();
      this.updateTimeline();

      if (this.tracks.length === 0) {
        this.stopPlayback();
        this.currentTime = 0;
        this.playhead.style.left = '0%';
      }

      if (this.onTracksChanged) {
        this.onTracksChanged();
      }
    }
  }

  public renameTrack(trackId: string, name: string): void {
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.name = name;
      this.updateTrackList();
    }
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getMaxTracks(): number {
    return 4;
  }

  public setOnTracksChanged(callback: () => void): void {
    this.onTracksChanged = callback;
  }

  public setOnRecordingStateChanged(callback: (isRecording: boolean) => void): void {
    this.onRecordingStateChanged = callback;
  }

  public setOnPlayStateChanged(callback: (isPlaying: boolean) => void): void {
    this.onPlayStateChanged = callback;
  }

  private updateTrackList(): void {
    this.trackCountElement.textContent = `${this.tracks.length} / 4`;

    if (this.tracks.length === 0) {
      this.trackListContainer.innerHTML = '<div class="empty-tracks">暂无音轨，点击录音开始录制</div>';
      return;
    }

    this.trackListContainer.innerHTML = '';

    this.tracks.forEach((track) => {
      const card = document.createElement('div');
      card.className = 'track-card';

      const header = document.createElement('h4');

      const colorIndicator = document.createElement('span');
      colorIndicator.className = 'track-color-indicator';
      colorIndicator.style.backgroundColor = track.color;

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = track.name;
      nameInput.addEventListener('change', (e) => {
        this.renameTrack(track.id, (e.target as HTMLInputElement).value);
      });

      header.appendChild(colorIndicator);
      header.appendChild(nameInput);

      const controls = document.createElement('div');
      controls.className = 'track-controls';

      const muteBtn = document.createElement('button');
      muteBtn.className = `track-btn ${track.muted ? 'muted' : ''}`;
      muteBtn.textContent = track.muted ? '🔇 静音' : '🔊 播放';
      muteBtn.addEventListener('click', () => {
        this.toggleMute(track.id);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'track-btn delete-btn';
      deleteBtn.textContent = '🗑 删除';
      deleteBtn.addEventListener('click', () => {
        if (confirm(`确定要删除"${track.name}"吗？`)) {
          this.deleteTrack(track.id);
        }
      });

      controls.appendChild(muteBtn);
      controls.appendChild(deleteBtn);

      card.appendChild(header);
      card.appendChild(controls);

      this.trackListContainer.appendChild(card);
    });
  }

  private updateTimeline(): void {
    const existingNotes = this.timelineContainer.querySelectorAll('.timeline-track, .timeline-note');
    existingNotes.forEach((el) => el.remove());

    const allNotes = new Set<string>();

    this.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        allNotes.add(`${note.note}${note.octave}`);
      });
    });

    const sortedNotes = Array.from(allNotes).sort((a, b) => {
      const noteOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const aMatch = a.match(/^([A-G]#?)(\d)$/);
      const bMatch = b.match(/^([A-G]#?)(\d)$/);
      if (!aMatch || !bMatch) return 0;
      const aOct = parseInt(aMatch[2], 10);
      const bOct = parseInt(bMatch[2], 10);
      if (aOct !== bOct) return aOct - bOct;
      return noteOrder.indexOf(aMatch[1]) - noteOrder.indexOf(bMatch[1]);
    });

    const trackHeight = 24;
    const containerHeight = this.timelineContainer.clientHeight || 120;
    const numTracks = Math.max(sortedNotes.length, 1);
    const trackTop = (containerHeight - numTracks * trackHeight) / 2;

    sortedNotes.forEach((_noteKey, index) => {
      const trackEl = document.createElement('div');
      trackEl.className = 'timeline-track';
      trackEl.style.top = `${trackTop + index * trackHeight}px`;
      this.timelineContainer.appendChild(trackEl);
    });

    this.tracks.forEach((track) => {
      if (track.muted) return;

      track.notes.forEach((noteEvent) => {
        const noteKey = `${noteEvent.note}${noteEvent.octave}`;
        const noteIndex = sortedNotes.indexOf(noteKey);
        if (noteIndex === -1) return;

        const noteEl = document.createElement('div');
        noteEl.className = 'timeline-note';
        const leftPercent = (noteEvent.startTime / this.maxDuration) * 100;
        const widthPercent = (noteEvent.duration / this.maxDuration) * 100;
        noteEl.style.left = `${leftPercent}%`;
        noteEl.style.width = `${widthPercent}%`;
        noteEl.style.top = `${trackTop + noteIndex * trackHeight + 2}px`;
        noteEl.style.backgroundColor = track.color;
        noteEl.title = `${noteEvent.note}${noteEvent.octave}`;
        this.timelineContainer.appendChild(noteEl);
      });
    });
  }

  public refreshTimeline(): void {
    this.updateTimeline();
  }
}
