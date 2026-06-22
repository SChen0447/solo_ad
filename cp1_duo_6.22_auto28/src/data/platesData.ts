export interface PlateKeyframe {
  time: number;
  vertices: [number, number][];
}

export interface PlateData {
  id: string;
  name: string;
  nameCN: string;
  color: string;
  area: number;
  keyframes: PlateKeyframe[];
}

export interface GeologicalPeriod {
  name: string;
  nameCN: string;
  start: number;
  end: number;
}

export const KEYFRAME_TIMES = [-250, -200, -145, -66, -23, -2.6, 0];

export const GEOLOGICAL_PERIODS: GeologicalPeriod[] = [
  { name: 'Permian', nameCN: '二叠纪末', start: -260, end: -250 },
  { name: 'Triassic', nameCN: '三叠纪', start: -250, end: -200 },
  { name: 'Jurassic', nameCN: '侏罗纪', start: -200, end: -145 },
  { name: 'Cretaceous', nameCN: '白垩纪', start: -145, end: -66 },
  { name: 'Paleogene', nameCN: '古近纪', start: -66, end: -23 },
  { name: 'Neogene', nameCN: '新近纪', start: -23, end: -2.6 },
  { name: 'Quaternary', nameCN: '第四纪', start: -2.6, end: 0 },
];

function panga() { return [
  [-0.8, 1.2], [-0.4, 1.5], [0.1, 1.6], [0.5, 1.4], [0.9, 1.1],
  [1.0, 0.7], [0.8, 0.3], [0.5, 0.0], [0.2, -0.2], [-0.1, -0.3],
  [-0.5, -0.2], [-0.8, 0.0], [-1.0, 0.3], [-1.1, 0.7], [-1.0, 1.0],
] as [number, number][]; }

function laurasia(t: number) {
  const s = (t + 250) / 250;
  const ox = s * 1.8;
  const oy = s * 0.4;
  return [
    [-1.2 + ox, 1.0 + oy], [-0.8 + ox, 1.5 + oy], [-0.3 + ox, 1.7 + oy],
    [0.2 + ox, 1.5 + oy], [0.6 + ox, 1.2 + oy], [0.8 + ox, 0.8 + oy],
    [0.7 + ox, 0.4 + oy], [0.4 + ox, 0.2 + oy], [0.0 + ox, 0.1 + oy],
    [-0.4 + ox, 0.15 + oy], [-0.8 + ox, 0.3 + oy], [-1.1 + ox, 0.5 + oy],
  ] as [number, number][];
}

function gondwana(t: number) {
  const s = (t + 250) / 250;
  const ox = s * 1.0;
  const oy = -s * 0.8;
  return [
    [-0.6 + ox, -0.1 + oy], [-0.2 + ox, 0.1 + oy], [0.2 + ox, 0.0 + oy],
    [0.5 + ox, -0.2 + oy], [0.7 + ox, -0.5 + oy], [0.6 + ox, -0.9 + oy],
    [0.3 + ox, -1.1 + oy], [-0.1 + ox, -1.0 + oy], [-0.5 + ox, -0.8 + oy],
    [-0.7 + ox, -0.5 + oy], [-0.75 + ox, -0.3 + oy],
  ] as [number, number][];
}

export const PLATES_DATA: PlateData[] = [
  {
    id: 'north-america',
    name: 'North American Plate',
    nameCN: '北美洲板块',
    color: '#4a90d9',
    area: 75.9,
    keyframes: [
      { time: -250, vertices: panga().slice(0, 8).map(([x, y]: [number, number]) => [x - 0.15, y + 0.15] as [number, number]) },
      { time: -200, vertices: [[-1.0, 1.2], [-0.6, 1.5], [-0.1, 1.5], [0.3, 1.3], [0.5, 0.9], [0.4, 0.5], [0.0, 0.3], [-0.5, 0.5]] },
      { time: -145, vertices: [[-1.3, 1.3], [-0.8, 1.6], [-0.2, 1.6], [0.3, 1.3], [0.5, 0.9], [0.3, 0.4], [-0.2, 0.3], [-0.8, 0.5]] },
      { time: -66, vertices: [[-1.8, 1.5], [-1.3, 1.8], [-0.7, 1.7], [-0.3, 1.3], [-0.1, 0.8], [-0.3, 0.3], [-0.9, 0.4], [-1.5, 0.7]] },
      { time: -23, vertices: [[-2.0, 1.5], [-1.5, 1.8], [-0.9, 1.7], [-0.5, 1.2], [-0.4, 0.7], [-0.6, 0.2], [-1.2, 0.3], [-1.7, 0.6]] },
      { time: -2.6, vertices: [[-2.2, 1.4], [-1.7, 1.7], [-1.1, 1.6], [-0.6, 1.1], [-0.5, 0.6], [-0.7, 0.1], [-1.3, 0.2], [-1.9, 0.5]] },
      { time: 0, vertices: [[-2.3, 1.3], [-1.8, 1.6], [-1.2, 1.5], [-0.7, 1.0], [-0.6, 0.5], [-0.8, 0.0], [-1.4, 0.1], [-2.0, 0.4]] },
    ],
  },
  {
    id: 'south-america',
    name: 'South American Plate',
    nameCN: '南美洲板块',
    color: '#e8a838',
    area: 43.6,
    keyframes: [
      { time: -250, vertices: [[-0.3, -0.1], [0.1, 0.1], [0.4, -0.1], [0.5, -0.4], [0.4, -0.8], [0.1, -1.0], [-0.3, -0.8], [-0.4, -0.4]] },
      { time: -200, vertices: [[-0.2, -0.2], [0.2, 0.0], [0.5, -0.2], [0.5, -0.6], [0.3, -1.0], [0.0, -1.1], [-0.4, -0.9], [-0.5, -0.5]] },
      { time: -145, vertices: [[-0.3, -0.3], [0.1, -0.1], [0.4, -0.3], [0.4, -0.7], [0.2, -1.1], [-0.1, -1.2], [-0.5, -1.0], [-0.6, -0.6]] },
      { time: -66, vertices: [[-0.8, -0.2], [-0.4, 0.0], [0.0, -0.3], [0.0, -0.7], [-0.2, -1.2], [-0.5, -1.4], [-0.9, -1.2], [-1.0, -0.6]] },
      { time: -23, vertices: [[-1.1, -0.2], [-0.7, 0.0], [-0.3, -0.3], [-0.3, -0.8], [-0.5, -1.3], [-0.8, -1.5], [-1.2, -1.3], [-1.3, -0.7]] },
      { time: -2.6, vertices: [[-1.3, -0.2], [-0.9, 0.0], [-0.5, -0.4], [-0.5, -0.9], [-0.7, -1.4], [-1.0, -1.6], [-1.4, -1.4], [-1.5, -0.8]] },
      { time: 0, vertices: [[-1.4, -0.2], [-1.0, 0.0], [-0.6, -0.4], [-0.6, -0.9], [-0.8, -1.4], [-1.1, -1.6], [-1.5, -1.4], [-1.6, -0.8]] },
    ],
  },
  {
    id: 'africa',
    name: 'African Plate',
    nameCN: '非洲板块',
    color: '#5cb85c',
    area: 61.3,
    keyframes: [
      { time: -250, vertices: [[0.0, -0.1], [0.4, 0.1], [0.7, -0.1], [0.8, -0.4], [0.7, -0.8], [0.4, -1.0], [0.0, -0.9], [-0.2, -0.5]] },
      { time: -200, vertices: [[0.2, -0.1], [0.6, 0.1], [0.9, -0.1], [0.9, -0.5], [0.7, -0.9], [0.4, -1.1], [0.0, -1.0], [-0.1, -0.5]] },
      { time: -145, vertices: [[0.4, -0.2], [0.8, 0.0], [1.1, -0.2], [1.0, -0.6], [0.8, -1.0], [0.5, -1.2], [0.1, -1.1], [0.1, -0.6]] },
      { time: -66, vertices: [[0.7, -0.2], [1.1, 0.0], [1.3, -0.3], [1.2, -0.7], [1.0, -1.1], [0.6, -1.3], [0.2, -1.2], [0.3, -0.6]] },
      { time: -23, vertices: [[0.8, -0.3], [1.2, 0.0], [1.4, -0.4], [1.3, -0.8], [1.0, -1.2], [0.6, -1.4], [0.2, -1.3], [0.4, -0.7]] },
      { time: -2.6, vertices: [[0.9, -0.3], [1.3, 0.0], [1.5, -0.4], [1.4, -0.9], [1.1, -1.3], [0.7, -1.5], [0.3, -1.4], [0.4, -0.8]] },
      { time: 0, vertices: [[0.9, -0.4], [1.3, -0.1], [1.5, -0.5], [1.4, -1.0], [1.1, -1.3], [0.7, -1.5], [0.3, -1.4], [0.4, -0.8]] },
    ],
  },
  {
    id: 'europe',
    name: 'Eurasian Plate',
    nameCN: '欧亚板块',
    color: '#d9534f',
    area: 67.8,
    keyframes: [
      { time: -250, vertices: [[0.2, 1.0], [0.5, 1.3], [0.9, 1.2], [1.0, 0.8], [0.9, 0.4], [0.6, 0.2], [0.2, 0.3], [-0.1, 0.6]] },
      { time: -200, vertices: [[0.5, 1.1], [0.9, 1.4], [1.3, 1.3], [1.4, 0.9], [1.2, 0.5], [0.8, 0.3], [0.4, 0.4], [0.2, 0.7]] },
      { time: -145, vertices: [[0.8, 1.2], [1.2, 1.5], [1.7, 1.4], [1.9, 0.9], [1.6, 0.5], [1.2, 0.3], [0.7, 0.4], [0.5, 0.8]] },
      { time: -66, vertices: [[1.2, 1.3], [1.7, 1.6], [2.3, 1.5], [2.6, 1.0], [2.2, 0.5], [1.7, 0.3], [1.2, 0.5], [0.9, 0.9]] },
      { time: -23, vertices: [[1.4, 1.3], [1.9, 1.7], [2.5, 1.6], [2.9, 1.0], [2.5, 0.5], [1.9, 0.3], [1.4, 0.5], [1.1, 0.9]] },
      { time: -2.6, vertices: [[1.5, 1.3], [2.0, 1.7], [2.7, 1.6], [3.0, 1.0], [2.6, 0.5], [2.0, 0.3], [1.5, 0.5], [1.2, 0.9]] },
      { time: 0, vertices: [[1.5, 1.3], [2.1, 1.7], [2.7, 1.6], [3.1, 1.0], [2.7, 0.5], [2.1, 0.3], [1.5, 0.5], [1.2, 0.9]] },
    ],
  },
  {
    id: 'india',
    name: 'Indian Plate',
    nameCN: '印度板块',
    color: '#f0ad4e',
    area: 11.8,
    keyframes: [
      { time: -250, vertices: [[0.5, -0.3], [0.7, -0.1], [0.9, -0.3], [0.8, -0.6], [0.6, -0.7], [0.4, -0.5]] },
      { time: -200, vertices: [[0.7, -0.3], [0.9, -0.1], [1.1, -0.3], [1.0, -0.6], [0.8, -0.7], [0.6, -0.5]] },
      { time: -145, vertices: [[0.9, -0.3], [1.1, -0.1], [1.3, -0.2], [1.2, -0.5], [1.0, -0.6], [0.8, -0.5]] },
      { time: -66, vertices: [[1.2, -0.1], [1.4, 0.1], [1.5, -0.1], [1.4, -0.3], [1.3, -0.4], [1.1, -0.3]] },
      { time: -23, vertices: [[1.5, 0.1], [1.7, 0.3], [1.8, 0.1], [1.7, -0.1], [1.6, -0.2], [1.4, -0.1]] },
      { time: -2.6, vertices: [[1.6, 0.2], [1.8, 0.4], [1.9, 0.2], [1.8, 0.0], [1.7, -0.1], [1.5, 0.0]] },
      { time: 0, vertices: [[1.6, 0.3], [1.8, 0.5], [1.9, 0.3], [1.8, 0.1], [1.7, 0.0], [1.5, 0.1]] },
    ],
  },
  {
    id: 'antarctica',
    name: 'Antarctic Plate',
    nameCN: '南极洲板块',
    color: '#9b59b6',
    area: 60.9,
    keyframes: [
      { time: -250, vertices: [[-0.5, -1.1], [0.0, -1.0], [0.5, -1.1], [0.7, -1.3], [0.5, -1.5], [0.0, -1.6], [-0.5, -1.5], [-0.7, -1.3]] },
      { time: -200, vertices: [[-0.5, -1.2], [0.0, -1.1], [0.5, -1.2], [0.8, -1.4], [0.5, -1.6], [0.0, -1.7], [-0.5, -1.6], [-0.8, -1.4]] },
      { time: -145, vertices: [[-0.6, -1.3], [0.0, -1.2], [0.6, -1.3], [0.9, -1.5], [0.6, -1.7], [0.0, -1.8], [-0.6, -1.7], [-0.9, -1.5]] },
      { time: -66, vertices: [[-1.0, -1.5], [-0.3, -1.3], [0.5, -1.4], [1.0, -1.6], [0.8, -1.8], [0.0, -1.9], [-0.8, -1.9], [-1.2, -1.7]] },
      { time: -23, vertices: [[-1.2, -1.6], [-0.4, -1.4], [0.4, -1.5], [1.1, -1.7], [0.9, -1.9], [0.0, -2.0], [-1.0, -2.0], [-1.4, -1.8]] },
      { time: -2.6, vertices: [[-1.3, -1.7], [-0.5, -1.5], [0.3, -1.6], [1.2, -1.8], [1.0, -2.0], [0.0, -2.1], [-1.1, -2.1], [-1.5, -1.9]] },
      { time: 0, vertices: [[-1.4, -1.7], [-0.5, -1.5], [0.3, -1.6], [1.2, -1.8], [1.0, -2.0], [0.0, -2.1], [-1.1, -2.1], [-1.5, -1.9]] },
    ],
  },
  {
    id: 'australia',
    name: 'Australian Plate',
    nameCN: '澳大利亚板块',
    color: '#3498db',
    area: 47.2,
    keyframes: [
      { time: -250, vertices: [[0.5, -0.8], [0.8, -0.6], [1.0, -0.8], [0.9, -1.1], [0.6, -1.2], [0.4, -1.0]] },
      { time: -200, vertices: [[0.7, -0.9], [1.0, -0.7], [1.2, -0.9], [1.1, -1.2], [0.8, -1.3], [0.6, -1.1]] },
      { time: -145, vertices: [[1.0, -1.0], [1.3, -0.8], [1.6, -1.0], [1.5, -1.3], [1.2, -1.4], [0.9, -1.2]] },
      { time: -66, vertices: [[1.5, -1.1], [1.9, -0.9], [2.2, -1.1], [2.1, -1.4], [1.7, -1.5], [1.4, -1.3]] },
      { time: -23, vertices: [[1.8, -1.2], [2.2, -0.9], [2.5, -1.2], [2.4, -1.5], [2.0, -1.6], [1.7, -1.4]] },
      { time: -2.6, vertices: [[2.0, -1.3], [2.4, -1.0], [2.7, -1.3], [2.6, -1.6], [2.2, -1.7], [1.9, -1.5]] },
      { time: 0, vertices: [[2.1, -1.3], [2.5, -1.0], [2.8, -1.3], [2.7, -1.6], [2.3, -1.7], [2.0, -1.5]] },
    ],
  },
  {
    id: 'pacific',
    name: 'Pacific Plate',
    nameCN: '太平洋板块',
    color: '#1abc9c',
    area: 103.3,
    keyframes: [
      { time: -250, vertices: [[-1.5, 0.5], [-1.2, 0.9], [-0.8, 1.0], [-0.5, 0.7], [-0.6, 0.2], [-1.0, -0.1], [-1.4, 0.1]] },
      { time: -200, vertices: [[-1.8, 0.5], [-1.5, 0.9], [-1.1, 1.0], [-0.7, 0.7], [-0.8, 0.2], [-1.3, -0.1], [-1.7, 0.1]] },
      { time: -145, vertices: [[-2.2, 0.5], [-1.8, 1.0], [-1.4, 1.0], [-1.0, 0.7], [-1.1, 0.1], [-1.7, -0.2], [-2.1, 0.0]] },
      { time: -66, vertices: [[-2.8, 0.4], [-2.3, 1.0], [-1.8, 1.0], [-1.3, 0.6], [-1.5, 0.0], [-2.2, -0.3], [-2.7, -0.1]] },
      { time: -23, vertices: [[-3.2, 0.3], [-2.6, 1.0], [-2.1, 1.0], [-1.6, 0.5], [-1.8, -0.1], [-2.6, -0.4], [-3.1, -0.2]] },
      { time: -2.6, vertices: [[-3.5, 0.2], [-2.9, 0.9], [-2.3, 0.9], [-1.8, 0.4], [-2.0, -0.2], [-2.9, -0.5], [-3.4, -0.3]] },
      { time: 0, vertices: [[-3.6, 0.1], [-3.0, 0.8], [-2.4, 0.8], [-1.9, 0.3], [-2.1, -0.3], [-3.0, -0.6], [-3.5, -0.4]] },
    ],
  },
];

export function getCurrentPeriod(time: number): GeologicalPeriod {
  for (let i = GEOLOGICAL_PERIODS.length - 1; i >= 0; i--) {
    if (time <= GEOLOGICAL_PERIODS[i].end && time >= GEOLOGICAL_PERIODS[i].start) {
      return GEOLOGICAL_PERIODS[i];
    }
  }
  return GEOLOGICAL_PERIODS[GEOLOGICAL_PERIODS.length - 1];
}

export function formatTimeAgo(time: number): string {
  const years = Math.abs(time);
  if (years < 1) {
    return `距今${Math.round(years * 100)}万年`;
  }
  return `距今${Math.round(years)}亿年`;
}

export function interpolateVertices(
  from: [number, number][],
  to: [number, number][],
  t: number
): [number, number][] {
  const len = Math.min(from.length, to.length);
  const result: [number, number][] = [];
  for (let i = 0; i < len; i++) {
    result.push([
      from[i][0] + (to[i][0] - from[i][0]) * t,
      from[i][1] + (to[i][1] - from[i][1]) * t,
    ]);
  }
  return result;
}

export function getInterpolatedPlateData(plate: PlateData, time: number): [number, number][] {
  const kfs = plate.keyframes;
  if (time <= kfs[0].time) return kfs[0].vertices;
  if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].vertices;

  for (let i = 0; i < kfs.length - 1; i++) {
    if (time >= kfs[i].time && time <= kfs[i + 1].time) {
      const t = (time - kfs[i].time) / (kfs[i + 1].time - kfs[i].time);
      const smooth = t * t * (3 - 2 * t);
      return interpolateVertices(kfs[i].vertices, kfs[i + 1].vertices, smooth);
    }
  }
  return kfs[kfs.length - 1].vertices;
}
