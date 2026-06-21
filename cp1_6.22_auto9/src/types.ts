export type Color = string;

export type PixelBoard = (Color | null)[][];

export type ToolType = 'pencil' | 'eraser' | 'eyedropper' | 'fill';

export type AnimalPresetKey = 'cat' | 'dog' | 'rabbit' | 'fox' | 'bear';

export type EmotionPresetKey = 'smile' | 'cool' | 'surprised' | 'wink' | 'tongue';

export type ExportSize = 64 | 128 | 256;

export interface PresetData {
  key: AnimalPresetKey | EmotionPresetKey;
  name: string;
  icon: string;
  pattern: (Color | null)[][];
}

export interface HistoryEntry {
  board: PixelBoard;
  timestamp: number;
}

export const BOARD_SIZE = 16;
export const PRESET_SIZE = 14;
export const PRESET_OFFSET = 1;
export const MAX_HISTORY = 30;
export const RECENT_COLORS_COUNT = 5;
export const EXPORT_SIZES: ExportSize[] = [64, 128, 256];

export const DEFAULT_PALETTE: Color[] = [
  '#000000', '#ffffff', '#7f7f7f', '#c3c3c3',
  '#880015', '#ed1c24', '#ff7f27', '#fff200',
  '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
  '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0',
  '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7',
  '#f44336', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
  '#009688', '#4caf50', '#8bc34a', '#cddc39',
];

export const DEFAULT_FOREGROUND = '#ffffff';
export const DEFAULT_BACKGROUND = '#000000';

export function createEmptyBoard(): PixelBoard {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function cloneBoard(board: PixelBoard): PixelBoard {
  return board.map((row) => row.slice());
}
