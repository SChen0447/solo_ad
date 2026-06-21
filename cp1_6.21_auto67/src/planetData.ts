export interface PlanetData {
  name: string;
  nameZh: string;
  radiusScale: number;
  orbitRadiusScale: number;
  orbitalSpeed: number;
  color: number;
  orbitalPeriod: number;
  distanceFromSun: number;
}

export const PLANET_DATA: PlanetData[] = [
  {
    name: 'Mercury',
    nameZh: '水星',
    radiusScale: 0.38,
    orbitRadiusScale: 8,
    orbitalSpeed: 4.15,
    color: 0x8c8c8c,
    orbitalPeriod: 88,
    distanceFromSun: 0.39
  },
  {
    name: 'Venus',
    nameZh: '金星',
    radiusScale: 0.95,
    orbitRadiusScale: 12,
    orbitalSpeed: 1.62,
    color: 0xe6c87a,
    orbitalPeriod: 225,
    distanceFromSun: 0.72
  },
  {
    name: 'Earth',
    nameZh: '地球',
    radiusScale: 1,
    orbitRadiusScale: 16,
    orbitalSpeed: 1,
    color: 0x4a90d9,
    orbitalPeriod: 365,
    distanceFromSun: 1
  },
  {
    name: 'Mars',
    nameZh: '火星',
    radiusScale: 0.53,
    orbitRadiusScale: 21,
    orbitalSpeed: 0.53,
    color: 0xc1440e,
    orbitalPeriod: 687,
    distanceFromSun: 1.52
  },
  {
    name: 'Jupiter',
    nameZh: '木星',
    radiusScale: 3.2,
    orbitRadiusScale: 32,
    orbitalSpeed: 0.084,
    color: 0xd2a679,
    orbitalPeriod: 4333,
    distanceFromSun: 5.2
  },
  {
    name: 'Saturn',
    nameZh: '土星',
    radiusScale: 2.7,
    orbitRadiusScale: 44,
    orbitalSpeed: 0.034,
    color: 0xf4d59e,
    orbitalPeriod: 10759,
    distanceFromSun: 9.58
  },
  {
    name: 'Uranus',
    nameZh: '天王星',
    radiusScale: 1.8,
    orbitRadiusScale: 56,
    orbitalSpeed: 0.012,
    color: 0x8fd3e8,
    orbitalPeriod: 30687,
    distanceFromSun: 19.22
  },
  {
    name: 'Neptune',
    nameZh: '海王星',
    radiusScale: 1.7,
    orbitRadiusScale: 68,
    orbitalSpeed: 0.006,
    color: 0x4b70dd,
    orbitalPeriod: 60190,
    distanceFromSun: 30.05
  }
];

export const SUN_DATA = {
  radius: 4,
  color: 0xffdd00,
  emissive: 0xffaa00,
  intensity: 2
};

export const ASTEROID_BELT_DATA = {
  count: 200,
  minRadius: 0.05,
  maxRadius: 0.15,
  minOrbit: 25,
  maxOrbit: 28,
  speed: 0.3
};
