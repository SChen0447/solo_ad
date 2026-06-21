import { v4 as uuidv4 } from 'uuid';

export type NoteColor = 'red' | 'blue' | 'green';

export interface NoteData {
  id: string;
  color: NoteColor;
  beatPosition: number;
}

export interface LevelData {
  id: string;
  name: string;
  bpm: number;
  measures: number;
  notes: NoteData[];
}

export interface GameResultData {
  score: number;
  maxCombo: number;
  rating: string;
  accuracy: number;
}

type EventCallback = (data?: unknown) => void;

const STORAGE_KEY = 'rhythm_levels';

function generatePresetNotes(
  bpm: number,
  measures: number,
  difficulty: 'easy' | 'medium' | 'hard'
): NoteData[] {
  const notes: NoteData[] = [];
  const totalSixteenths = measures * 16;
  const colors: NoteColor[] = ['red', 'blue', 'green'];
  let step: number;
  let useDoubleColor = false;

  switch (difficulty) {
    case 'easy':
      step = 8;
      break;
    case 'medium':
      step = 4;
      useDoubleColor = true;
      break;
    case 'hard':
      step = 2;
      useDoubleColor = true;
      break;
  }

  for (let i = 0; i < totalSixteenths; i += step) {
    notes.push({
      id: uuidv4(),
      color: colors[Math.floor(Math.random() * 3)],
      beatPosition: i,
    });
    if (useDoubleColor && i + step / 2 < totalSixteenths && Math.random() > 0.5) {
      notes.push({
        id: uuidv4(),
        color: colors[Math.floor(Math.random() * 3)],
        beatPosition: i + step / 2,
      });
    }
  }

  return notes;
}

export class BeatDataManager {
  private static instance: BeatDataManager;
  private listeners: Map<string, EventCallback[]> = new Map();
  private levels: LevelData[] = [];
  private currentLevelId: string | null = null;
  private editingLevelId: string | null = null;
  private isTrialMode = false;

  private constructor() {
    this.loadFromStorage();
    if (this.levels.length === 0) {
      this.initPresets();
    }
  }

  static getInstance(): BeatDataManager {
    if (!BeatDataManager.instance) {
      BeatDataManager.instance = new BeatDataManager();
    }
    return BeatDataManager.instance;
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const idx = callbacks.indexOf(callback);
      if (idx > -1) callbacks.splice(idx, 1);
    }
  }

  emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  getLevels(): LevelData[] {
    return [...this.levels];
  }

  getLevel(id: string): LevelData | undefined {
    return this.levels.find(l => l.id === id);
  }

  getCurrentLevel(): LevelData | undefined {
    if (!this.currentLevelId) return undefined;
    return this.getLevel(this.currentLevelId);
  }

  getEditingLevel(): LevelData | undefined {
    if (!this.editingLevelId) return undefined;
    return this.getLevel(this.editingLevelId);
  }

  setCurrentLevel(id: string): void {
    this.currentLevelId = id;
    const level = this.getLevel(id);
    if (level) this.emit('level:loaded', level);
  }

  setEditingLevel(id: string): void {
    this.editingLevelId = id;
  }

  getIsTrialMode(): boolean {
    return this.isTrialMode;
  }

  setTrialMode(val: boolean): void {
    this.isTrialMode = val;
  }

  createLevel(name: string, bpm: number, measures: number): LevelData {
    const level: LevelData = {
      id: uuidv4(),
      name,
      bpm,
      measures,
      notes: [],
    };
    this.levels.push(level);
    this.saveToStorage();
    this.emit('level:created', level);
    return level;
  }

  updateLevel(id: string, updates: Partial<Omit<LevelData, 'id'>>): void {
    const level = this.getLevel(id);
    if (level) {
      Object.assign(level, updates);
      this.saveToStorage();
      this.emit('level:updated', level);
    }
  }

  deleteLevel(id: string): void {
    this.levels = this.levels.filter(l => l.id !== id);
    this.saveToStorage();
    this.emit('level:deleted', id);
  }

  addNote(levelId: string, note: Omit<NoteData, 'id'>): NoteData {
    const level = this.getLevel(levelId);
    if (!level) throw new Error('Level not found');
    const newNote: NoteData = { ...note, id: uuidv4() };
    level.notes.push(newNote);
    level.notes.sort((a, b) => a.beatPosition - b.beatPosition);
    this.saveToStorage();
    this.emit('level:updated', level);
    return newNote;
  }

  removeNote(levelId: string, noteId: string): void {
    const level = this.getLevel(levelId);
    if (level) {
      level.notes = level.notes.filter(n => n.id !== noteId);
      this.saveToStorage();
      this.emit('level:updated', level);
    }
  }

  updateNote(levelId: string, noteId: string, updates: Partial<Omit<NoteData, 'id'>>): void {
    const level = this.getLevel(levelId);
    if (level) {
      const note = level.notes.find(n => n.id === noteId);
      if (note) {
        Object.assign(note, updates);
        level.notes.sort((a, b) => a.beatPosition - b.beatPosition);
        this.saveToStorage();
        this.emit('level:updated', level);
      }
    }
  }

  calculateRating(accuracy: number): string {
    if (accuracy >= 0.95) return 'S';
    if (accuracy >= 0.85) return 'A';
    if (accuracy >= 0.70) return 'B';
    if (accuracy >= 0.50) return 'C';
    return 'D';
  }

  calculateDifficulty(level: LevelData): string {
    const totalBeats = level.measures * 4;
    const duration = (totalBeats / level.bpm) * 60;
    const density = level.notes.length / duration;
    if (density < 1) return '简单';
    if (density < 2) return '普通';
    if (density < 3.5) return '困难';
    return '地狱';
  }

  calculateDensity(level: LevelData): number {
    const totalBeats = level.measures * 4;
    const duration = (totalBeats / level.bpm) * 60;
    return duration > 0 ? level.notes.length / duration : 0;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.levels));
    } catch {
      // storage full or unavailable
    }
  }

  private loadFromStorage(): void {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        this.levels = JSON.parse(data);
      } catch {
        this.levels = [];
      }
    }
  }

  private initPresets(): void {
    this.levels = [
      {
        id: uuidv4(),
        name: '初学者之路',
        bpm: 80,
        measures: 8,
        notes: generatePresetNotes(80, 8, 'easy'),
      },
      {
        id: uuidv4(),
        name: '节拍风暴',
        bpm: 120,
        measures: 12,
        notes: generatePresetNotes(120, 12, 'medium'),
      },
      {
        id: uuidv4(),
        name: '极速狂飙',
        bpm: 150,
        measures: 16,
        notes: generatePresetNotes(150, 16, 'hard'),
      },
    ];
    this.saveToStorage();
  }
}
