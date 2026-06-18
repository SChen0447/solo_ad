import { NotePitch, NOTE_FREQUENCIES, Note } from '@/types';

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: Map<string, { osc: OscillatorNode; gain: GainNode }> = new Map();
  private playTimeouts: NodeJS.Timeout[] = [];

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playNote(pitch: NotePitch, duration: number = 0.5, velocity: number = 0.7): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    const frequency = NOTE_FREQUENCIES[pitch];
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.Q.setValueAtTime(1, now);

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(frequency, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, now);

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(frequency * 3, now);

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();

    gain1.gain.setValueAtTime(0.6 * velocity, now);
    gain2.gain.setValueAtTime(0.2 * velocity, now);
    gain3.gain.setValueAtTime(0.1 * velocity, now);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);
    gain1.connect(filter);
    gain2.connect(filter);
    gain3.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const attackTime = 0.005;
    const decayTime = 0.1;
    const sustainLevel = 0.4;
    const releaseTime = Math.min(duration * 0.8, 0.5);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(velocity, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(velocity * sustainLevel, now + attackTime + decayTime);
    gainNode.gain.setValueAtTime(velocity * sustainLevel, now + duration);
    gainNode.gain.linearRampToValueAtTime(0, now + duration + releaseTime);

    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.linearRampToValueAtTime(1500, now + duration + releaseTime);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + duration + releaseTime + 0.05);
    osc2.stop(now + duration + releaseTime + 0.05);
    osc3.stop(now + duration + releaseTime + 0.05);
  }

  startNote(pitch: NotePitch, id: string, velocity: number = 0.7): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    this.stopNote(id);

    const frequency = NOTE_FREQUENCIES[pitch];
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.5, now + 0.005);

    osc.start(now);
    this.activeOscillators.set(id, { osc, gain: gainNode });
  }

  stopNote(id: string): void {
    const entry = this.activeOscillators.get(id);
    if (entry && this.audioContext) {
      const now = this.audioContext.currentTime;
      entry.gain.gain.cancelScheduledValues(now);
      entry.gain.gain.setValueAtTime(entry.gain.gain.value, now);
      entry.gain.gain.linearRampToValueAtTime(0, now + 0.1);
      entry.osc.stop(now + 0.15);
      this.activeOscillators.delete(id);
    }
  }

  stopAllNotes(): void {
    this.activeOscillators.forEach((_, id) => this.stopNote(id));
    this.playTimeouts.forEach(t => clearTimeout(t));
    this.playTimeouts = [];
  }

  playScore(
    notes: Note[],
    bpm: number,
    onNoteStart: (noteId: string) => void,
    onNoteEnd: (noteId: string) => void,
    onComplete: () => void
  ): void {
    this.stopAllNotes();
    if (notes.length === 0) {
      onComplete();
      return;
    }

    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    const beatDuration = 60 / bpm;
    const maxEndTime = Math.max(...notes.map(n => n.startTime + n.duration));

    sortedNotes.forEach(note => {
      const startDelay = note.startTime * beatDuration * 1000;
      const durationMs = note.duration * beatDuration * 1000;

      const startTimeout = setTimeout(() => {
        this.playNote(note.pitch, note.duration * beatDuration, note.velocity);
        onNoteStart(note.id);
      }, startDelay);

      const endTimeout = setTimeout(() => {
        onNoteEnd(note.id);
      }, startDelay + durationMs);

      this.playTimeouts.push(startTimeout, endTimeout);
    });

    const completeTimeout = setTimeout(() => {
      onComplete();
    }, maxEndTime * beatDuration * 1000 + 500);
    this.playTimeouts.push(completeTimeout);
  }

  exportToMIDI(notes: Note[], bpm: number): Uint8Array {
    const ticksPerBeat = 480;
    const microsecondsPerBeat = Math.round(60000000 / bpm);

    const bytes: number[] = [];

    const writeVarLength = (value: number): void => {
      let buffer = value & 0x7f;
      while ((value >>= 7) > 0) {
        buffer <<= 8;
        buffer |= 0x80;
        buffer += value & 0x7f;
      }
      while (true) {
        bytes.push(buffer & 0xff);
        if (buffer & 0x80) {
          buffer >>= 8;
        } else {
          break;
        }
      }
    };

    const writeUint16 = (value: number): void => {
      bytes.push((value >> 8) & 0xff);
      bytes.push(value & 0xff);
    };

    const writeUint32 = (value: number): void => {
      bytes.push((value >> 24) & 0xff);
      bytes.push((value >> 16) & 0xff);
      bytes.push((value >> 8) & 0xff);
      bytes.push(value & 0xff);
    };

    const headerChunk: number[] = [];
    headerChunk.push(0x4d, 0x54, 0x68, 0x64);
    headerChunk.push(0, 0, 0, 6);
    headerChunk.push(0, 0);
    headerChunk.push(0, 1);
    headerChunk.push((ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff);
    bytes.push(...headerChunk);

    const trackBytes: number[] = [];
    trackBytes.push(0, 0xff, 0x51, 0x03);
    trackBytes.push((microsecondsPerBeat >> 16) & 0xff);
    trackBytes.push((microsecondsPerBeat >> 8) & 0xff);
    trackBytes.push(microsecondsPerBeat & 0xff);

    const pitchToMidi = (pitch: NotePitch): number => {
      const noteMap: Record<string, number> = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
      const match = pitch.match(/^([A-G]#?)(\d)$/);
      if (!match) return 60;
      const note = match[1];
      const octave = parseInt(match[2]);
      return noteMap[note] + (octave + 1) * 12;
    };

    const events: { tick: number; type: 'on' | 'off'; note: number; velocity: number }[] = [];
    notes.forEach(note => {
      const midiNote = pitchToMidi(note.pitch);
      const startTick = Math.round(note.startTime * ticksPerBeat);
      const endTick = Math.round((note.startTime + note.duration) * ticksPerBeat);
      events.push({ tick: startTick, type: 'on', note: midiNote, velocity: Math.round(note.velocity * 127) });
      events.push({ tick: endTick, type: 'off', note: midiNote, velocity: 0 });
    });
    events.sort((a, b) => a.tick - b.tick);

    let lastTick = 0;
    events.forEach(event => {
      const delta = event.tick - lastTick;
      const temp: number[] = [];
      const writeVar = (value: number): void => {
        let buf = value & 0x7f;
        while ((value >>= 7) > 0) {
          buf <<= 8;
          buf |= 0x80;
          buf += value & 0x7f;
        }
        while (true) {
          temp.push(buf & 0xff);
          if (buf & 0x80) buf >>= 8;
          else break;
        }
      };
      writeVar(delta);
      trackBytes.push(...temp);
      if (event.type === 'on') {
        trackBytes.push(0x90, event.note, event.velocity);
      } else {
        trackBytes.push(0x80, event.note, 0);
      }
      lastTick = event.tick;
    });

    trackBytes.push(0, 0xff, 0x2f, 0x00);

    const trackChunk: number[] = [];
    trackChunk.push(0x4d, 0x54, 0x72, 0x6b);
    trackChunk.push((trackBytes.length >> 24) & 0xff);
    trackChunk.push((trackBytes.length >> 16) & 0xff);
    trackChunk.push((trackBytes.length >> 8) & 0xff);
    trackChunk.push(trackBytes.length & 0xff);
    trackChunk.push(...trackBytes);

    bytes.push(...trackChunk);

    return new Uint8Array(bytes);
  }

  destroy(): void {
    this.stopAllNotes();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioEngine = new AudioEngine();
