import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ILyricLine, ILyricWord, IProject, IProjectMetadata, ISynthPreset } from './modules/shared/types';
import { DEFAULT_PRESETS, synthEngine } from './modules/audio/SynthEngine';
import { audioEngine } from './modules/audio/AudioEngine';

function createDefaultWord(text: string, startTime: number, duration: number = 300): ILyricWord {
  return {
    id: uuidv4(),
    text,
    startTime,
    duration,
    pitchOffset: 0,
    volumeGain: 1,
    synthPresetId: 'baritone',
  };
}

function parseTextToWords(text: string, baseStart: number): ILyricWord[] {
  const tokens = text
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  let t = baseStart;
  return tokens.map((token) => {
    const w = createDefaultWord(token, t, Math.max(200, token.length * 80));
    t += w.duration + 50;
    return w;
  });
}

export type ImportMode = 'overwrite' | 'append';

interface ILyricStore {
  metadata: IProjectMetadata;
  lines: ILyricLine[];
  selectedLineId: string | null;
  selectedWordId: string | null;
  synthPresets: ISynthPreset[];
  setMetadata: (patch: Partial<IProjectMetadata>) => void;
  addLine: (text?: string) => void;
  removeLine: (id: string) => void;
  setSelectedLine: (id: string | null) => void;
  setSelectedWord: (id: string | null) => void;
  insertTimestampAtCurrentPosition: () => void;
  updateWordStartTime: (wordId: string, newTimeMs: number) => void;
  updateWordDuration: (wordId: string, newDurationMs: number) => void;
  updateWordPitch: (wordId: string, pitch: number) => void;
  updateWordVolume: (wordId: string, gain: number) => void;
  updateWordPreset: (wordId: string, presetId: string) => void;
  updateWordText: (wordId: string, text: string) => void;
  updateLineText: (lineId: string, text: string) => void;
  resynth: () => void;
  exportProject: () => IProject;
  importProject: (project: IProject, mode: ImportMode) => void;
}

export const useLyricStore = create<ILyricStore>((set, get) => ({
  metadata: {
    title: 'Untitled',
    bpm: 120,
    key: 'C',
  },
  lines: [],
  selectedLineId: null,
  selectedWordId: null,
  synthPresets: DEFAULT_PRESETS,

  setMetadata: (patch) =>
    set((s) => ({ metadata: { ...s.metadata, ...patch } })),

  addLine: (text) => {
    set((s) => {
      const lines = s.lines;
      const nextNum = lines.length + 1;
      const lastWord = lines
        .flatMap((l) => l.words)
        .sort((a, b) => a.startTime - b.startTime)
        .slice(-1)[0];
      const baseStart = lastWord ? lastWord.startTime + lastWord.duration + 200 : 0;
      const lineText = text ?? '';
      const words = lineText ? parseTextToWords(lineText, baseStart) : [];
      const newLine: ILyricLine = {
        id: uuidv4(),
        lineNumber: nextNum,
        words,
      };
      return { lines: [...lines, newLine], selectedLineId: newLine.id };
    });
    setTimeout(() => get().resynth(), 0);
  },

  removeLine: (id) => {
    set((s) => {
      const filtered = s.lines.filter((l) => l.id !== id);
      const renumbered = filtered.map((l, idx) => ({ ...l, lineNumber: idx + 1 }));
      return { lines: renumbered };
    });
    setTimeout(() => get().resynth(), 0);
  },

  setSelectedLine: (id) => set({ selectedLineId: id }),
  setSelectedWord: (id) => set({ selectedWordId: id }),

  insertTimestampAtCurrentPosition: () => {
    const currentTime = audioEngine.getCurrentTime();
    const state = get();
    const words = state.lines
      .flatMap((l) => l.words)
      .sort((a, b) => a.startTime - b.startTime);
    if (words.length === 0) return;
    let targetWord: ILyricWord | null = null;
    for (const w of words) {
      if (w.startTime <= currentTime && w.startTime + w.duration >= currentTime) {
        targetWord = w;
        break;
      }
    }
    if (!targetWord) {
      for (const w of words) {
        if (w.startTime >= currentTime) {
          targetWord = w;
          break;
        }
      }
    }
    if (targetWord) {
      get().updateWordStartTime(targetWord.id, currentTime);
    }
  },

  updateWordStartTime: (wordId, newTimeMs) => {
    const state = get();
    const allWords = state.lines
      .flatMap((l) => l.words)
      .sort((a, b) => a.startTime - b.startTime);
    const idx = allWords.findIndex((w) => w.id === wordId);
    if (idx === -1) return;

    const currentWord = allWords[idx];
    const prevWord = idx > 0 ? allWords[idx - 1] : null;
    const nextWord = idx < allWords.length - 1 ? allWords[idx + 1] : null;

    const prevEnd = prevWord ? prevWord.startTime + prevWord.duration : 0;
    const adjustedNewStart = Math.max(prevEnd, newTimeMs);
    const oldStart = currentWord.startTime;
    const delta = adjustedNewStart - oldStart;

    const newStart = adjustedNewStart;
    const oldNextStart = nextWord ? nextWord.startTime : oldStart + currentWord.duration + 100;
    const oldInterval = Math.max(1, oldNextStart - oldStart);
    const newInterval = Math.max(1, oldNextStart + delta - newStart);

    const ratio = newInterval / oldInterval;

    set((s) => {
      const newLines = s.lines.map((line) => ({
        ...line,
        words: line.words.map((w) => {
          if (w.id === wordId) {
            return { ...w, startTime: newStart };
          }
          if (w.startTime > oldStart) {
            const localOffset = w.startTime - oldStart;
            const newLocalOffset = localOffset * ratio;
            const deltaDiff = newLocalOffset - localOffset;
            const newW = { ...w, startTime: w.startTime + delta + deltaDiff };
            return newW;
          }
          return w;
        }),
      }));
      return { lines: newLines };
    });

    setTimeout(() => get().resynth(), 0);
  },

  updateWordDuration: (wordId, newDurationMs) => {
    const dur = Math.max(50, newDurationMs);
    set((s) => ({
      lines: s.lines.map((l) => ({
        ...l,
        words: l.words.map((w) => (w.id === wordId ? { ...w, duration: dur } : w)),
      })),
    }));
    synthEngine.markWordDirty(wordId);
    setTimeout(() => get().resynth(), 0);
  },

  updateWordPitch: (wordId, pitch) => {
    const clamped = Math.max(-12, Math.min(12, pitch));
    const state = get();
    let targetWord: ILyricWord | undefined;
    for (const line of state.lines) {
      for (const w of line.words) {
        if (w.id === wordId) {
          targetWord = { ...w, pitchOffset: clamped };
        }
      }
    }
    set((s) => ({
      lines: s.lines.map((l) => ({
        ...l,
        words: l.words.map((w) => (w.id === wordId ? { ...w, pitchOffset: clamped } : w)),
      })),
    }));
    if (targetWord) {
      synthEngine.updateWordLocal(targetWord, get().lines);
    }
  },

  updateWordVolume: (wordId, gain) => {
    const clamped = Math.max(0, Math.min(2, gain));
    const state = get();
    let targetWord: ILyricWord | undefined;
    for (const line of state.lines) {
      for (const w of line.words) {
        if (w.id === wordId) {
          targetWord = { ...w, volumeGain: clamped };
        }
      }
    }
    set((s) => ({
      lines: s.lines.map((l) => ({
        ...l,
        words: l.words.map((w) => (w.id === wordId ? { ...w, volumeGain: clamped } : w)),
      })),
    }));
    if (targetWord) {
      synthEngine.updateWordLocal(targetWord, get().lines);
    }
  },

  updateWordPreset: (wordId, presetId) => {
    const state = get();
    let targetWord: ILyricWord | undefined;
    for (const line of state.lines) {
      for (const w of line.words) {
        if (w.id === wordId) {
          targetWord = { ...w, synthPresetId: presetId };
        }
      }
    }
    set((s) => ({
      lines: s.lines.map((l) => ({
        ...l,
        words: l.words.map((w) => (w.id === wordId ? { ...w, synthPresetId: presetId } : w)),
      })),
    }));
    if (targetWord) {
      synthEngine.updateWordLocal(targetWord, get().lines);
    }
  },

  updateWordText: (wordId, text) => {
    set((s) => ({
      lines: s.lines.map((l) => ({
        ...l,
        words: l.words.map((w) => (w.id === wordId ? { ...w, text } : w)),
      })),
    }));
    synthEngine.markWordDirty(wordId);
    setTimeout(() => get().resynth(), 0);
  },

  updateLineText: (lineId, text) => {
    set((s) => {
      const lines = s.lines;
      const target = lines.find((l) => l.id === lineId);
      if (!target) return s;
      const targetIdx = lines.indexOf(target);
      const prevWords = lines
        .slice(0, targetIdx)
        .flatMap((l) => l.words);
      const lastPrev = prevWords.sort((a, b) => a.startTime - b.startTime).slice(-1)[0];
      const baseStart = lastPrev ? lastPrev.startTime + lastPrev.duration + 200 : 0;
      const words = parseTextToWords(text, baseStart);
      const newLines = lines.map((l) => (l.id === lineId ? { ...l, words } : l));
      return { lines: newLines };
    });
    setTimeout(() => get().resynth(), 0);
  },

  resynth: () => {
    synthEngine.renderFullBuffer(get().lines);
  },

  exportProject: (): IProject => {
    const s = get();
    return {
      version: '1.0.0',
      metadata: s.metadata,
      lines: s.lines,
      synthPresets: s.synthPresets,
    };
  },

  importProject: (project: IProject, mode: ImportMode) => {
    if (mode === 'overwrite') {
      set({
        metadata: project.metadata,
        lines: project.lines.map((l) => ({ ...l })),
        synthPresets: project.synthPresets?.length ? project.synthPresets : DEFAULT_PRESETS,
        selectedLineId: project.lines[0]?.id ?? null,
        selectedWordId: null,
      });
    } else {
      const s = get();
      const baseNum = s.lines.length;
      const appendedLines = project.lines.map((l, idx) => ({
        ...l,
        lineNumber: baseNum + idx + 1,
      }));
      set({
        lines: [...s.lines, ...appendedLines],
      });
    }
    setTimeout(() => get().resynth(), 0);
  },
}));

export function formatTimestamp(ms: number): string {
  const total = Math.max(0, ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = Math.floor(total % 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function parseTimestamp(str: string): number | null {
  const m = str.match(/^(\d{1,2}):(\d{1,2})\.(\d{1,3})$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const sec = parseInt(m[2], 10);
  const ms = parseInt(m[3].padEnd(3, '0'), 10);
  return min * 60000 + sec * 1000 + ms;
}
