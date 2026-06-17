export interface Stroke {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface HanziData {
  character: string;
  strokeCount: number;
  strokes: Stroke[];
}

export const hanziDataList: HanziData[] = [
  {
    character: '永',
    strokeCount: 5,
    strokes: [
      { startX: 50, startY: 10, endX: 50, endY: 90 },
      { startX: 20, startY: 30, endX: 80, endY: 30 },
      { startX: 30, startY: 50, endX: 70, endY: 50 },
      { startX: 15, startY: 65, endX: 45, endY: 85 },
      { startX: 85, startY: 65, endX: 55, endY: 85 },
    ],
  },
  {
    character: '中',
    strokeCount: 4,
    strokes: [
      { startX: 25, startY: 20, endX: 25, endY: 80 },
      { startX: 25, startY: 20, endX: 75, endY: 20 },
      { startX: 75, startY: 20, endX: 75, endY: 80 },
      { startX: 50, startY: 10, endX: 50, endY: 90 },
    ],
  },
  {
    character: '国',
    strokeCount: 8,
    strokes: [
      { startX: 20, startY: 15, endX: 20, endY: 85 },
      { startX: 20, startY: 15, endX: 80, endY: 15 },
      { startX: 80, startY: 15, endX: 80, endY: 85 },
      { startX: 20, startY: 85, endX: 80, endY: 85 },
      { startX: 35, startY: 30, endX: 65, endY: 30 },
      { startX: 50, startY: 30, endX: 50, endY: 70 },
      { startX: 35, startY: 50, endX: 65, endY: 50 },
      { startX: 35, startY: 70, endX: 65, endY: 70 },
    ],
  },
  {
    character: '人',
    strokeCount: 2,
    strokes: [
      { startX: 50, startY: 15, endX: 20, endY: 85 },
      { startX: 50, startY: 15, endX: 80, endY: 85 },
    ],
  },
  {
    character: '大',
    strokeCount: 3,
    strokes: [
      { startX: 15, startY: 35, endX: 85, endY: 35 },
      { startX: 50, startY: 15, endX: 20, endY: 85 },
      { startX: 50, startY: 35, endX: 80, endY: 85 },
    ],
  },
  {
    character: '山',
    strokeCount: 3,
    strokes: [
      { startX: 50, startY: 15, endX: 50, endY: 85 },
      { startX: 20, startY: 45, endX: 20, endY: 85 },
      { startX: 80, startY: 45, endX: 80, endY: 85 },
    ],
  },
  {
    character: '水',
    strokeCount: 4,
    strokes: [
      { startX: 50, startY: 15, endX: 50, endY: 85 },
      { startX: 45, startY: 35, endX: 20, endY: 55 },
      { startX: 55, startY: 35, endX: 80, endY: 55 },
      { startX: 40, startY: 70, endX: 60, endY: 85 },
    ],
  },
  {
    character: '火',
    strokeCount: 4,
    strokes: [
      { startX: 30, startY: 40, endX: 25, endY: 60 },
      { startX: 70, startY: 40, endX: 75, endY: 60 },
      { startX: 50, startY: 20, endX: 25, endY: 85 },
      { startX: 50, startY: 20, endX: 75, endY: 85 },
    ],
  },
  {
    character: '木',
    strokeCount: 4,
    strokes: [
      { startX: 15, startY: 35, endX: 85, endY: 35 },
      { startX: 50, startY: 15, endX: 50, endY: 85 },
      { startX: 50, startY: 50, endX: 20, endY: 85 },
      { startX: 50, startY: 50, endX: 80, endY: 85 },
    ],
  },
  {
    character: '金',
    strokeCount: 8,
    strokes: [
      { startX: 30, startY: 15, endX: 70, endY: 15 },
      { startX: 35, startY: 15, endX: 50, endY: 30 },
      { startX: 65, startY: 15, endX: 50, endY: 30 },
      { startX: 20, startY: 40, endX: 80, endY: 40 },
      { startX: 50, startY: 40, endX: 50, endY: 70 },
      { startX: 30, startY: 55, endX: 70, endY: 55 },
      { startX: 20, startY: 70, endX: 45, endY: 90 },
      { startX: 80, startY: 70, endX: 55, endY: 90 },
    ],
  },
];

export const getHanziData = (character: string): HanziData | undefined => {
  return hanziDataList.find((h) => h.character === character);
};
