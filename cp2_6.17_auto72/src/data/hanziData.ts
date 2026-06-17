export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
}

export interface HanziData {
  char: string;
  strokeCount: number;
  strokes: Stroke[];
}

export const hanziDatabase: HanziData[] = [
  {
    char: '永',
    strokeCount: 5,
    strokes: [
      { points: [{ x: 50, y: 10 }, { x: 48, y: 18 }, { x: 46, y: 26 }, { x: 44, y: 34 }] },
      { points: [{ x: 44, y: 34 }, { x: 38, y: 42 }, { x: 30, y: 52 }, { x: 20, y: 62 }] },
      { points: [{ x: 44, y: 34 }, { x: 52, y: 44 }, { x: 62, y: 54 }, { x: 75, y: 64 }] },
      { points: [{ x: 35, y: 45 }, { x: 40, y: 58 }, { x: 45, y: 72 }, { x: 48, y: 88 }] },
      { points: [{ x: 55, y: 55 }, { x: 48, y: 68 }, { x: 42, y: 78 }, { x: 30, y: 88 }] }
    ]
  },
  {
    char: '中',
    strokeCount: 4,
    strokes: [
      { points: [{ x: 25, y: 25 }, { x: 35, y: 22 }, { x: 55, y: 22 }, { x: 75, y: 25 }] },
      { points: [{ x: 28, y: 25 }, { x: 26, y: 45 }, { x: 26, y: 65 }, { x: 28, y: 80 }] },
      { points: [{ x: 72, y: 25 }, { x: 74, y: 45 }, { x: 74, y: 65 }, { x: 72, y: 80 }] },
      { points: [{ x: 50, y: 10 }, { x: 50, y: 35 }, { x: 50, y: 65 }, { x: 50, y: 92 }] }
    ]
  },
  {
    char: '国',
    strokeCount: 8,
    strokes: [
      { points: [{ x: 20, y: 18 }, { x: 30, y: 15 }, { x: 55, y: 15 }, { x: 80, y: 18 }] },
      { points: [{ x: 22, y: 18 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 22, y: 85 }] },
      { points: [{ x: 78, y: 18 }, { x: 80, y: 40 }, { x: 80, y: 60 }, { x: 78, y: 85 }] },
      { points: [{ x: 20, y: 82 }, { x: 40, y: 85 }, { x: 60, y: 85 }, { x: 80, y: 82 }] },
      { points: [{ x: 35, y: 35 }, { x: 42, y: 32 }, { x: 58, y: 32 }, { x: 65, y: 35 }] },
      { points: [{ x: 50, y: 32 }, { x: 50, y: 48 }, { x: 50, y: 60 }, { x: 50, y: 70 }] },
      { points: [{ x: 35, y: 52 }, { x: 45, y: 55 }, { x: 55, y: 55 }, { x: 65, y: 52 }] },
      { points: [{ x: 38, y: 68 }, { x: 45, y: 72 }, { x: 55, y: 72 }, { x: 62, y: 68 }] }
    ]
  },
  {
    char: '人',
    strokeCount: 2,
    strokes: [
      { points: [{ x: 50, y: 12 }, { x: 45, y: 32 }, { x: 35, y: 55 }, { x: 18, y: 85 }] },
      { points: [{ x: 50, y: 12 }, { x: 58, y: 32 }, { x: 68, y: 55 }, { x: 85, y: 85 }] }
    ]
  },
  {
    char: '大',
    strokeCount: 3,
    strokes: [
      { points: [{ x: 15, y: 35 }, { x: 35, y: 32 }, { x: 65, y: 32 }, { x: 85, y: 35 }] },
      { points: [{ x: 50, y: 12 }, { x: 48, y: 35 }, { x: 40, y: 58 }, { x: 20, y: 88 }] },
      { points: [{ x: 50, y: 32 }, { x: 58, y: 50 }, { x: 68, y: 68 }, { x: 85, y: 88 }] }
    ]
  },
  {
    char: '山',
    strokeCount: 3,
    strokes: [
      { points: [{ x: 50, y: 12 }, { x: 50, y: 35 }, { x: 50, y: 60 }, { x: 50, y: 88 }] },
      { points: [{ x: 20, y: 40 }, { x: 20, y: 58 }, { x: 20, y: 75 }, { x: 22, y: 88 }] },
      { points: [{ x: 80, y: 40 }, { x: 80, y: 58 }, { x: 80, y: 75 }, { x: 78, y: 88 }] }
    ]
  },
  {
    char: '水',
    strokeCount: 4,
    strokes: [
      { points: [{ x: 50, y: 10 }, { x: 50, y: 32 }, { x: 50, y: 55 }, { x: 50, y: 88 }] },
      { points: [{ x: 48, y: 35 }, { x: 38, y: 42 }, { x: 28, y: 52 }, { x: 15, y: 60 }] },
      { points: [{ x: 45, y: 55 }, { x: 35, y: 68 }, { x: 25, y: 80 }, { x: 12, y: 90 }] },
      { points: [{ x: 52, y: 50 }, { x: 62, y: 62 }, { x: 72, y: 75 }, { x: 88, y: 90 }] }
    ]
  },
  {
    char: '火',
    strokeCount: 4,
    strokes: [
      { points: [{ x: 28, y: 48 }, { x: 32, y: 55 }, { x: 36, y: 62 }, { x: 40, y: 70 }] },
      { points: [{ x: 72, y: 48 }, { x: 68, y: 55 }, { x: 64, y: 62 }, { x: 60, y: 70 }] },
      { points: [{ x: 50, y: 15 }, { x: 45, y: 38 }, { x: 38, y: 62 }, { x: 22, y: 88 }] },
      { points: [{ x: 50, y: 35 }, { x: 58, y: 55 }, { x: 66, y: 72 }, { x: 82, y: 88 }] }
    ]
  },
  {
    char: '木',
    strokeCount: 4,
    strokes: [
      { points: [{ x: 15, y: 35 }, { x: 35, y: 32 }, { x: 65, y: 32 }, { x: 85, y: 35 }] },
      { points: [{ x: 50, y: 10 }, { x: 50, y: 35 }, { x: 50, y: 60 }, { x: 50, y: 92 }] },
      { points: [{ x: 50, y: 50 }, { x: 40, y: 65 }, { x: 30, y: 78 }, { x: 15, y: 90 }] },
      { points: [{ x: 50, y: 50 }, { x: 60, y: 65 }, { x: 70, y: 78 }, { x: 85, y: 90 }] }
    ]
  },
  {
    char: '金',
    strokeCount: 8,
    strokes: [
      { points: [{ x: 34, y: 12 }, { x: 42, y: 18 }, { x: 50, y: 22 }, { x: 50, y: 22 }] },
      { points: [{ x: 66, y: 12 }, { x: 58, y: 18 }, { x: 50, y: 22 }, { x: 50, y: 22 }] },
      { points: [{ x: 15, y: 35 }, { x: 35, y: 32 }, { x: 65, y: 32 }, { x: 85, y: 35 }] },
      { points: [{ x: 50, y: 22 }, { x: 50, y: 35 }, { x: 50, y: 45 }, { x: 50, y: 45 }] },
      { points: [{ x: 22, y: 55 }, { x: 40, y: 52 }, { x: 60, y: 52 }, { x: 78, y: 55 }] },
      { points: [{ x: 50, y: 52 }, { x: 50, y: 65 }, { x: 50, y: 78 }, { x: 50, y: 78 }] },
      { points: [{ x: 50, y: 70 }, { x: 40, y: 80 }, { x: 30, y: 88 }, { x: 18, y: 94 }] },
      { points: [{ x: 50, y: 70 }, { x: 60, y: 80 }, { x: 70, y: 88 }, { x: 82, y: 94 }] }
    ]
  }
];

export function getHanziByChar(char: string): HanziData | undefined {
  return hanziDatabase.find(item => item.char === char);
}

export function getAllChars(): string[] {
  return hanziDatabase.map(item => item.char);
}
