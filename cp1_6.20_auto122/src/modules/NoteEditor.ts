export interface Note {
  id: string;
  pitch: string;
  beat: number;
  duration: NoteDuration;
}

export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export const DURATION_VALUES: Record<NoteDuration, number> = {
  whole: 4.0,
  half: 2.0,
  quarter: 1.0,
  eighth: 0.5,
  sixteenth: 0.25,
};

export const DURATION_NAMES: Record<NoteDuration, string> = {
  whole: '全音符',
  half: '二分音符',
  quarter: '四分音符',
  eighth: '八分音符',
  sixteenth: '十六分音符',
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const STAFF_PITCHES: string[] = [
  'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'
];

const generateId = (): string => {
  return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const noteToMidi = (pitch: string): number => {
  if (pitch.length < 2) return 60;
  const name = pitch.slice(0, -1);
  const octave = parseInt(pitch.slice(-1));
  const noteIndex = NOTE_NAMES.indexOf(name);
  if (noteIndex === -1) return 60;
  return noteIndex + (octave + 1) * 12;
};

export const midiToNote = (midi: number): string => {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
};

export const getPitchFromY = (y: number, staffHeight: number): string => {
  const lineCount = 5;
  const lineSpacing = staffHeight / (lineCount + 3);
  const topY = lineSpacing * 2;
  const bottomY = staffHeight - lineSpacing * 2;
  
  const clampedY = Math.max(topY, Math.min(bottomY, y));
  const relativeY = bottomY - clampedY;
  const pitchIndex = Math.round(relativeY / (lineSpacing / 2));
  const clampedIndex = Math.max(0, Math.min(STAFF_PITCHES.length - 1, pitchIndex));
  
  return STAFF_PITCHES[clampedIndex];
};

export const getYFromPitch = (pitch: string, staffHeight: number): number => {
  const lineCount = 5;
  const lineSpacing = staffHeight / (lineCount + 3);
  const bottomY = staffHeight - lineSpacing * 2;
  
  const pitchIndex = STAFF_PITCHES.indexOf(pitch);
  if (pitchIndex === -1) {
    return bottomY;
  }
  
  return bottomY - pitchIndex * (lineSpacing / 2);
};

export const getBeatFromX = (x: number, staffWidth: number, totalBeats: number): number => {
  const beatWidth = staffWidth / totalBeats;
  const beat = Math.floor(x / beatWidth * 4) / 4;
  return Math.max(0, Math.min(totalBeats - 0.25, beat));
};

export const getXFromBeat = (beat: number, staffWidth: number, totalBeats: number): number => {
  const beatWidth = staffWidth / totalBeats;
  return beat * beatWidth;
};

export class NoteEditor {
  private notes: Note[] = [];
  private totalBeats: number = 16;
  private selectedNoteId: string | null = null;

  constructor(initialNotes?: Note[]) {
    if (initialNotes) {
      this.notes = initialNotes;
    }
  }

  getNotes(): Note[] {
    return [...this.notes].sort((a, b) => a.beat - b.beat);
  }

  getTotalBeats(): number {
    return this.totalBeats;
  }

  setTotalBeats(beats: number): void {
    this.totalBeats = Math.max(4, beats);
  }

  addNote(pitch: string, beat: number, duration: NoteDuration = 'quarter'): Note {
    const note: Note = {
      id: generateId(),
      pitch,
      beat,
      duration,
    };
    this.notes.push(note);
    return note;
  }

  deleteNote(noteId: string): boolean {
    const index = this.notes.findIndex(n => n.id === noteId);
    if (index !== -1) {
      this.notes.splice(index, 1);
      if (this.selectedNoteId === noteId) {
        this.selectedNoteId = null;
      }
      return true;
    }
    return false;
  }

  updateNotePitch(noteId: string, pitch: string): boolean {
    const note = this.notes.find(n => n.id === noteId);
    if (note) {
      note.pitch = pitch;
      return true;
    }
    return false;
  }

  updateNoteBeat(noteId: string, beat: number): boolean {
    const note = this.notes.find(n => n.id === noteId);
    if (note) {
      note.beat = Math.max(0, Math.min(this.totalBeats - DURATION_VALUES[note.duration], beat));
      return true;
    }
    return false;
  }

  updateNoteDuration(noteId: string, duration: NoteDuration): boolean {
    const note = this.notes.find(n => n.id === noteId);
    if (note) {
      note.duration = duration;
      note.beat = Math.min(note.beat, this.totalBeats - DURATION_VALUES[duration]);
      return true;
    }
    return false;
  }

  updateNotePosition(noteId: string, pitch: string, beat: number): boolean {
    const note = this.notes.find(n => n.id === noteId);
    if (note) {
      note.pitch = pitch;
      note.beat = Math.max(0, Math.min(this.totalBeats - DURATION_VALUES[note.duration], beat));
      return true;
    }
    return false;
  }

  getSelectedNote(): Note | null {
    if (!this.selectedNoteId) return null;
    return this.notes.find(n => n.id === this.selectedNoteId) || null;
  }

  setSelectedNote(noteId: string | null): void {
    this.selectedNoteId = noteId;
  }

  getNoteAt(beat: number, pitch: string): Note | null {
    const tolerance = 0.25;
    return this.notes.find(n => 
      Math.abs(n.beat - beat) < tolerance && n.pitch === pitch
    ) || null;
  }

  getNotesInRange(startBeat: number, endBeat: number): Note[] {
    return this.notes.filter(n => 
      n.beat >= startBeat && n.beat < endBeat);
  }

  clearAll(): void {
    this.notes = [];
    this.selectedNoteId = null;
  }

  exportToJSON(): string {
    return JSON.stringify({
      version: '1.0',
      notes: this.getNotes(),
      totalBeats: this.totalBeats,
      createdAt: new Date().toISOString(),
    }, null, 2);
  }

  importFromJSON(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (data.notes && Array.isArray(data.notes)) {
        this.notes = data.notes.map((n: Note) => ({
          ...n,
          id: n.id || generateId(),
        }));
        this.totalBeats = data.totalBeats || 16;
        return true;
      }
      return false;
    } catch (e) {
      console.error('导入失败:', e);
      return false;
    }
  }

  getMaxBeat(): number {
    if (this.notes.length === 0) return 0;
    return Math.max(...this.notes.map(n => n.beat + DURATION_VALUES[n.duration]));
  }

  snapToGrid(beat: number, gridSize: number = 0.25): number {
    return Math.round(beat / gridSize) * gridSize;
  }
}

export default NoteEditor;
