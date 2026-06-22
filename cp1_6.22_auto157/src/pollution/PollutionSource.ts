export interface PollutionSourceConfig {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  emissionRate: number;
  initialColor: string;
  windMultiplier: number;
}

export interface PollutionSourceJSON {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  emissionRate?: number;
  initialColor?: string;
  windMultiplier?: number;
}

export const DEFAULT_POLLUTION_SOURCES: PollutionSourceConfig[] = [
  {
    id: 'source-1',
    name: '工厂烟囱 A',
    position: { x: -30, y: 10, z: -20 },
    emissionRate: 20,
    initialColor: '#ff3333',
    windMultiplier: 1.0
  },
  {
    id: 'source-2',
    name: '交通枢纽 B',
    position: { x: 25, y: 5, z: 15 },
    emissionRate: 15,
    initialColor: '#ff3333',
    windMultiplier: 1.0
  },
  {
    id: 'source-3',
    name: '工业区 C',
    position: { x: 10, y: 12, z: -35 },
    emissionRate: 25,
    initialColor: '#ff3333',
    windMultiplier: 1.0
  },
  {
    id: 'source-4',
    name: '发电厂 D',
    position: { x: -20, y: 8, z: 25 },
    emissionRate: 18,
    initialColor: '#ff3333',
    windMultiplier: 1.0
  }
];

export function parsePollutionSources(json: PollutionSourceJSON[]): PollutionSourceConfig[] {
  return json.map((item) => ({
    id: item.id,
    name: item.name,
    position: {
      x: item.x,
      y: item.y,
      z: item.z
    },
    emissionRate: item.emissionRate ?? 20,
    initialColor: item.initialColor ?? '#ff3333',
    windMultiplier: item.windMultiplier ?? 1.0
  }));
}

export function createSourceConfig(
  id: string,
  name: string,
  x: number,
  y: number,
  z: number,
  emissionRate: number = 20,
  initialColor: string = '#ff3333'
): PollutionSourceConfig {
  return {
    id,
    name,
    position: { x, y, z },
    emissionRate,
    initialColor,
    windMultiplier: 1.0
  };
}
