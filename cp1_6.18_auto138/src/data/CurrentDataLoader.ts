export interface OceanCurrentData {
  id: string;
  name: string;
  nameZh: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  speed: number;
  direction: string;
  directionZh: string;
  type: 'warm' | 'cold';
  waypoints: { lat: number; lng: number }[];
}

const MAJOR_CURRENTS: OceanCurrentData[] = [
  {
    id: 'gulf-stream',
    name: 'Gulf Stream',
    nameZh: '湾流',
    startLat: 25,
    startLng: -80,
    endLat: 45,
    endLng: -30,
    speed: 2.5,
    direction: 'NE',
    directionZh: '东北',
    type: 'warm',
    waypoints: [
      { lat: 25, lng: -80 },
      { lat: 30, lng: -75 },
      { lat: 35, lng: -68 },
      { lat: 40, lng: -55 },
      { lat: 45, lng: -30 },
    ],
  },
  {
    id: 'kuroshio',
    name: 'Kuroshio Current',
    nameZh: '日本暖流',
    startLat: 20,
    startLng: 125,
    endLat: 40,
    endLng: 160,
    speed: 2.0,
    direction: 'NE',
    directionZh: '东北',
    type: 'warm',
    waypoints: [
      { lat: 20, lng: 125 },
      { lat: 25, lng: 130 },
      { lat: 30, lng: 138 },
      { lat: 35, lng: 148 },
      { lat: 40, lng: 160 },
    ],
  },
  {
    id: 'peru',
    name: 'Peru Current',
    nameZh: '秘鲁寒流',
    startLat: -45,
    startLng: -80,
    endLat: -5,
    endLng: -80,
    speed: 1.2,
    direction: 'N',
    directionZh: '北',
    type: 'cold',
    waypoints: [
      { lat: -45, lng: -80 },
      { lat: -35, lng: -78 },
      { lat: -25, lng: -76 },
      { lat: -15, lng: -78 },
      { lat: -5, lng: -80 },
    ],
  },
  {
    id: 'north-atlantic',
    name: 'North Atlantic Current',
    nameZh: '北大西洋暖流',
    startLat: 45,
    startLng: -30,
    endLat: 60,
    endLng: 10,
    speed: 1.8,
    direction: 'NE',
    directionZh: '东北',
    type: 'warm',
    waypoints: [
      { lat: 45, lng: -30 },
      { lat: 50, lng: -20 },
      { lat: 55, lng: -5 },
      { lat: 58, lng: 5 },
      { lat: 60, lng: 10 },
    ],
  },
  {
    id: 'benguela',
    name: 'Benguela Current',
    nameZh: '本格拉寒流',
    startLat: -35,
    startLng: 15,
    endLat: -15,
    endLng: 10,
    speed: 1.0,
    direction: 'N',
    directionZh: '北',
    type: 'cold',
    waypoints: [
      { lat: -35, lng: 15 },
      { lat: -30, lng: 14 },
      { lat: -25, lng: 12 },
      { lat: -20, lng: 11 },
      { lat: -15, lng: 10 },
    ],
  },
  {
    id: 'antarctic-circumpolar',
    name: 'Antarctic Circumpolar Current',
    nameZh: '南极绕极流',
    startLat: -55,
    startLng: -180,
    endLat: -55,
    endLng: 180,
    speed: 1.5,
    direction: 'E',
    directionZh: '东',
    type: 'cold',
    waypoints: [
      { lat: -55, lng: -180 },
      { lat: -53, lng: -120 },
      { lat: -56, lng: -60 },
      { lat: -52, lng: 0 },
      { lat: -55, lng: 60 },
      { lat: -53, lng: 120 },
      { lat: -55, lng: 180 },
    ],
  },
  {
    id: 'agulhas',
    name: 'Agulhas Current',
    nameZh: '厄加勒斯暖流',
    startLat: -15,
    startLng: 45,
    endLat: -35,
    endLng: 25,
    speed: 2.2,
    direction: 'SW',
    directionZh: '西南',
    type: 'warm',
    waypoints: [
      { lat: -15, lng: 45 },
      { lat: -20, lng: 42 },
      { lat: -25, lng: 38 },
      { lat: -30, lng: 32 },
      { lat: -35, lng: 25 },
    ],
  },
  {
    id: 'brazil',
    name: 'Brazil Current',
    nameZh: '巴西暖流',
    startLat: -10,
    startLng: -35,
    endLat: -40,
    endLng: -50,
    speed: 1.3,
    direction: 'SW',
    directionZh: '西南',
    type: 'warm',
    waypoints: [
      { lat: -10, lng: -35 },
      { lat: -18, lng: -38 },
      { lat: -25, lng: -42 },
      { lat: -33, lng: -47 },
      { lat: -40, lng: -50 },
    ],
  },
  {
    id: 'california',
    name: 'California Current',
    nameZh: '加利福尼亚寒流',
    startLat: 48,
    startLng: -128,
    endLat: 25,
    endLng: -118,
    speed: 0.9,
    direction: 'S',
    directionZh: '南',
    type: 'cold',
    waypoints: [
      { lat: 48, lng: -128 },
      { lat: 42, lng: -126 },
      { lat: 36, lng: -123 },
      { lat: 30, lng: -120 },
      { lat: 25, lng: -118 },
    ],
  },
  {
    id: 'east-australian',
    name: 'East Australian Current',
    nameZh: '东澳大利亚暖流',
    startLat: -12,
    startLng: 155,
    endLat: -38,
    endLng: 150,
    speed: 1.7,
    direction: 'S',
    directionZh: '南',
    type: 'warm',
    waypoints: [
      { lat: -12, lng: 155 },
      { lat: -18, lng: 154 },
      { lat: -25, lng: 153 },
      { lat: -32, lng: 152 },
      { lat: -38, lng: 150 },
    ],
  },
];

export function loadOceanCurrentData(): OceanCurrentData[] {
  return MAJOR_CURRENTS.map((current) => ({
    ...current,
    waypoints: current.waypoints.map((wp) => ({
      lat: parseFloat(wp.lat.toFixed(2)),
      lng: parseFloat(wp.lng.toFixed(2)),
    })),
  }));
}

export function findNearestCurrent(
  lat: number,
  lng: number,
  currents: OceanCurrentData[]
): { current: OceanCurrentData; distance: number } | null {
  let nearest: { current: OceanCurrentData; distance: number } | null = null;

  for (const current of currents) {
    for (const wp of current.waypoints) {
      const dLat = wp.lat - lat;
      const dLng = wp.lng - lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (!nearest || dist < nearest.distance) {
        nearest = { current, distance: dist };
      }
    }
  }

  return nearest;
}
