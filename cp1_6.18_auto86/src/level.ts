import type { LevelData, NoteData, NoteColor } from './types';

const COLORS: NoteColor[] = ['red', 'blue', 'green'];

function pickColor(idx: number): NoteColor {
  return COLORS[idx % COLORS.length];
}

export function generateLevel(): LevelData {
  const duration = 30000;
  const notes: NoteData[] = [];

  const timings = [
    1500, 2500, 3500, 4800, 6000,
    7200, 8000, 9500, 10800, 12000,
    13200, 14500, 15600, 16800, 18000,
    19200, 20500, 21800, 23000, 25000
  ];

  timings.forEach((time, idx) => {
    notes.push({
      id: idx,
      time,
      color: pickColor(idx),
      hit: false,
      judged: false
    });
  });

  return { duration, notes };
}
