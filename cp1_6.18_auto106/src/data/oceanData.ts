export interface OceanCurrentDef {
  id: string;
  name: string;
  nameCN: string;
  path: [number, number][];
  temperatureRange: [number, number];
  speedRange: [number, number];
  seasonOffset: [number, number][];
  description: string;
}

export interface ParticleData {
  currentId: string;
  position: [number, number, number];
  velocity: [number, number, number];
  temperature: number;
  speed: number;
  latitude: number;
  longitude: number;
  salinity: number;
  pathProgress: number;
  trailAlpha: number;
}

export const EARTH_RADIUS = 5;

const currents: OceanCurrentDef[] = [
  {
    id: 'kuroshio',
    name: 'Kuroshio Current',
    nameCN: '黑潮',
    path: [
      [12, 130], [16, 128], [20, 126], [24, 125], [28, 126],
      [32, 131], [35, 137], [38, 143], [42, 150],
    ],
    temperatureRange: [20, 30],
    speedRange: [0.8, 2.5],
    seasonOffset: [[0, 0], [0.5, 0.5], [1, 1], [0.5, 0.5]],
    description: '太平洋西部强暖流，起源于北赤道暖流',
  },
  {
    id: 'gulf_stream',
    name: 'Gulf Stream',
    nameCN: '湾流',
    path: [
      [22, -80], [26, -78], [30, -76], [34, -73], [38, -68],
      [42, -55], [46, -40], [50, -25],
    ],
    temperatureRange: [22, 30],
    speedRange: [1.0, 2.8],
    seasonOffset: [[0, 0], [0.3, 0.3], [0.6, 0.6], [0.3, 0.3]],
    description: '大西洋西部强暖流，影响北美和西欧气候',
  },
  {
    id: 'elnino',
    name: 'El Nino',
    nameCN: '厄尔尼诺',
    path: [
      [-5, -160], [-3, -150], [-1, -140], [1, -130],
      [3, -120], [5, -110], [3, -100],
    ],
    temperatureRange: [24, 32],
    speedRange: [0.3, 1.5],
    seasonOffset: [[0, 0], [0, 2], [0, 4], [0, 2]],
    description: '赤道太平洋异常暖流事件，每2-7年发生一次',
  },
  {
    id: 'north_atlantic',
    name: 'North Atlantic Current',
    nameCN: '北大西洋洋流',
    path: [
      [48, -25], [50, -20], [52, -15], [54, -10],
      [56, -5], [58, 0], [60, 5], [62, 10],
    ],
    temperatureRange: [8, 16],
    speedRange: [0.3, 1.0],
    seasonOffset: [[0, 0], [0.5, 0.2], [1, 0.4], [0.5, 0.2]],
    description: '湾流延伸，温暖北欧海域',
  },
  {
    id: 'antarctic_circumpolar',
    name: 'Antarctic Circumpolar Current',
    nameCN: '南极绕极流',
    path: [
      [-55, -180], [-56, -150], [-57, -120], [-58, -90],
      [-57, -60], [-56, -30], [-55, 0], [-54, 30],
      [-55, 60], [-57, 90], [-58, 120], [-57, 150], [-55, 180],
    ],
    temperatureRange: [-2, 6],
    speedRange: [0.2, 0.8],
    seasonOffset: [[0, 0], [0.2, 0.1], [0.4, 0.2], [0.2, 0.1]],
    description: '全球最强洋流，环绕南极洲自西向东流动',
  },
  {
    id: 'california',
    name: 'California Current',
    nameCN: '加利福尼亚洋流',
    path: [
      [48, -128], [44, -126], [40, -124], [36, -122],
      [32, -120], [28, -118], [24, -116],
    ],
    temperatureRange: [8, 18],
    speedRange: [0.2, 0.7],
    seasonOffset: [[0, 0], [0.3, 0.3], [0.6, 0.6], [0.3, 0.3]],
    description: '北太平洋东部寒流，带来冷水上涌',
  },
  {
    id: 'benguela',
    name: 'Benguela Current',
    nameCN: '本格拉洋流',
    path: [
      [-34, 16], [-30, 14], [-26, 12], [-22, 10],
      [-18, 8], [-14, 6], [-10, 4],
    ],
    temperatureRange: [4, 16],
    speedRange: [0.2, 0.6],
    seasonOffset: [[0, 0], [0.2, 0.1], [0.4, 0.2], [0.2, 0.1]],
    description: '南大西洋东部寒流，引发沿岸上涌',
  },
  {
    id: 'south_equatorial',
    name: 'South Equatorial Current',
    nameCN: '南赤道洋流',
    path: [
      [-2, -30], [-3, -50], [-4, -70], [-5, -90],
      [-5, -110], [-4, -130], [-3, -150], [-2, -170],
    ],
    temperatureRange: [24, 30],
    speedRange: [0.4, 1.2],
    seasonOffset: [[0, 0], [0.3, 0.5], [0.6, 1.0], [0.3, 0.5]],
    description: '赤道以南自东向西的暖流',
  },
  {
    id: 'north_equatorial',
    name: 'North Equatorial Current',
    nameCN: '北赤道洋流',
    path: [
      [12, -120], [13, -135], [14, -150], [14, -165],
      [13, 180], [13, 165], [14, 150], [14, 135],
    ],
    temperatureRange: [24, 30],
    speedRange: [0.3, 1.0],
    seasonOffset: [[0, 0], [0.4, 0.3], [0.8, 0.6], [0.4, 0.3]],
    description: '赤道以北自东向西的暖流',
  },
  {
    id: 'peru',
    name: 'Peru Current',
    nameCN: '秘鲁洋流',
    path: [
      [-45, -76], [-40, -75], [-35, -74], [-30, -73],
      [-25, -72], [-20, -71], [-15, -76], [-10, -78],
    ],
    temperatureRange: [6, 18],
    speedRange: [0.2, 0.7],
    seasonOffset: [[0, 0], [0.3, 0.2], [0.6, 0.4], [0.3, 0.2]],
    description: '南太平洋东部寒流，厄尔尼诺影响区',
  },
  {
    id: 'brazil',
    name: 'Brazil Current',
    nameCN: '巴西洋流',
    path: [
      [-5, -34], [-10, -36], [-15, -38], [-20, -40],
      [-25, -42], [-30, -46], [-35, -50],
    ],
    temperatureRange: [18, 28],
    speedRange: [0.4, 1.2],
    seasonOffset: [[0, 0], [0.2, 0.2], [0.4, 0.4], [0.2, 0.2]],
    description: '南大西洋西部暖流，向南流动',
  },
  {
    id: 'agulhas',
    name: 'Agulhas Current',
    nameCN: '厄加勒斯洋流',
    path: [
      [-15, 42], [-18, 40], [-22, 37], [-26, 34],
      [-30, 31], [-34, 28], [-38, 24],
    ],
    temperatureRange: [20, 28],
    speedRange: [0.6, 2.0],
    seasonOffset: [[0, 0], [0.3, 0.3], [0.6, 0.6], [0.3, 0.3]],
    description: '印度洋西部强暖流，世界最强西部边界流之一',
  },
];

export function getCurrents(): OceanCurrentDef[] {
  return currents;
}

export function getCurrentById(id: string): OceanCurrentDef | undefined {
  return currents.find((c) => c.id === id);
}

export function latLonToVec3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

export function vec3ToLatLon(
  x: number,
  y: number,
  z: number,
  radius: number,
): [number, number] {
  const lat = 90 - Math.acos(y / radius) * (180 / Math.PI);
  const lon = ((Math.atan2(z, -x) * 180) / Math.PI) - 180;
  return [lat, lon];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getSeasonFactor(month: number): number {
  return (month % 12) / 12;
}

export function interpolatePath(
  path: [number, number][],
  t: number,
  seasonFactor: number,
  seasonOffsets: [number, number][],
): [number, number] {
  const totalSegments = path.length - 1;
  const scaledT = t * totalSegments;
  const segIndex = Math.min(Math.floor(scaledT), totalSegments - 1);
  const segT = scaledT - segIndex;

  const p0 = path[segIndex];
  const p1 = path[Math.min(segIndex + 1, path.length - 1)];

  const offsetIndex = Math.min(segIndex, seasonOffsets.length - 1);
  const offset = seasonOffsets[offsetIndex];

  const lat = lerp(p0[0], p1[0], segT) + offset[0] * Math.sin(seasonFactor * Math.PI * 2);
  const lon = lerp(p0[1], p1[1], segT) + offset[1] * Math.sin(seasonFactor * Math.PI * 2);

  return [lat, lon];
}

export function getTemperature(
  current: OceanCurrentDef,
  t: number,
  month: number,
): number {
  const seasonFactor = getSeasonFactor(month);
  const tempVariation = Math.sin(seasonFactor * Math.PI * 2) * 2;
  const baseTemp = lerp(current.temperatureRange[0], current.temperatureRange[1], t);
  return baseTemp + tempVariation;
}

export function getSpeed(
  current: OceanCurrentDef,
  t: number,
  month: number,
): number {
  const seasonFactor = getSeasonFactor(month);
  const speedVariation = Math.sin(seasonFactor * Math.PI * 2) * 0.3;
  const baseSpeed = lerp(current.speedRange[0], current.speedRange[1], 0.5 + 0.5 * Math.sin(t * Math.PI));
  return Math.max(0.1, baseSpeed + speedVariation);
}

export function getSalinity(temperature: number, latitude: number): number {
  const baseSalinity = 35;
  const tempEffect = (temperature - 15) * 0.05;
  const latEffect = Math.abs(latitude) < 10 ? -0.5 : Math.abs(latitude) > 50 ? -0.3 : 0;
  return baseSalinity + tempEffect + latEffect;
}

export function temperatureToColor(temp: number): [number, number, number] {
  const minTemp = -2;
  const maxTemp = 32;
  const t = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));

  if (t < 0.25) {
    const s = t / 0.25;
    return [0, s * 0.3, 0.6 + s * 0.4];
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0, 0.3 + s * 0.7, 1 - s * 0.3];
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [s, 1 - s * 0.3, 0.7 - s * 0.7];
  } else {
    const s = (t - 0.75) / 0.25;
    return [1, 0.7 - s * 0.5, 0];
  }
}

export interface CurrentLabelData {
  currentId: string;
  nameCN: string;
  avgSpeed: number;
  avgTemp: number;
  position: [number, number, number];
}

export function getCurrentLabels(month: number): CurrentLabelData[] {
  return currents.map((c) => {
    const midT = 0.5;
    const seasonFactor = getSeasonFactor(month);
    const [lat, lon] = interpolatePath(c.path, midT, seasonFactor, c.seasonOffset);
    const pos = latLonToVec3(lat, lon, EARTH_RADIUS + 0.15);
    const avgSpeed = getSpeed(c, midT, month);
    const avgTemp = getTemperature(c, midT, month);
    return {
      currentId: c.id,
      nameCN: c.nameCN,
      avgSpeed,
      avgTemp,
      position: pos,
    };
  });
}
