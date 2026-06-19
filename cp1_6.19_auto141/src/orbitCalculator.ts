export type StarType = "main-sequence" | "red-giant" | "white-dwarf";

export interface StarConfig {
  type: StarType;
  label: string;
  mass: number;
  radius: number;
  color: string;
  glowColor: string;
}

export interface PlanetOrbitParams {
  name: string;
  color: string;
  radius: number;
  orbitRadius: number;
  period: number;
  eccentricity: number;
  inclination: number;
  description: string;
}

export interface OrbitalSystemParams {
  star: StarConfig;
  planets: PlanetOrbitParams[];
}

const STAR_CONFIGS: Record<StarType, StarConfig> = {
  "main-sequence": {
    type: "main-sequence",
    label: "主序星",
    mass: 1.0,
    radius: 1.5,
    color: "#FFF5E0",
    glowColor: "#FFD700",
  },
  "red-giant": {
    type: "red-giant",
    label: "红巨星",
    mass: 1.5,
    radius: 3.0,
    color: "#FF6B35",
    glowColor: "#FF4500",
  },
  "white-dwarf": {
    type: "white-dwarf",
    label: "白矮星",
    mass: 0.6,
    radius: 0.5,
    color: "#E8E8FF",
    glowColor: "#AAAAFF",
  },
};

interface PlanetBaseData {
  name: string;
  color: string;
  radius: number;
  baseOrbitRadius: number;
  basePeriod: number;
  eccentricity: number;
  description: string;
}

const PLANET_BASE_DATA: PlanetBaseData[] = [
  {
    name: "水星型",
    color: "#A0A0A0",
    radius: 0.3,
    baseOrbitRadius: 4,
    basePeriod: 88,
    eccentricity: 0.205,
    description: "最靠近恒星的岩石行星，表面温差极大，无大气层保护，公转速度最快。",
  },
  {
    name: "金星型",
    color: "#DAA520",
    radius: 0.5,
    baseOrbitRadius: 6,
    basePeriod: 225,
    eccentricity: 0.007,
    description: "被浓密大气包裹的行星，温室效应导致表面温度极高，逆向自转。",
  },
  {
    name: "地球型",
    color: "#4488FF",
    radius: 0.55,
    baseOrbitRadius: 8,
    basePeriod: 365,
    eccentricity: 0.017,
    description: "位于宜居带的行星，拥有液态水和适宜大气，是生命存在的理想环境。",
  },
  {
    name: "火星型",
    color: "#CC4422",
    radius: 0.4,
    baseOrbitRadius: 10,
    basePeriod: 687,
    eccentricity: 0.093,
    description: "红色荒漠行星，拥有太阳系最高的火山和最深的峡谷，可能曾有液态水。",
  },
  {
    name: "海王星型",
    color: "#00CED1",
    radius: 0.7,
    baseOrbitRadius: 14,
    basePeriod: 60190,
    eccentricity: 0.009,
    description: "遥远的冰巨星，拥有超音速风暴和美丽的蓝色大气，公转周期极长。",
  },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function calculateKeplerPeriod(
  starMass: number,
  orbitRadius: number,
  basePeriod: number
): number {
  const baseMass = 1.0;
  const massRatio = starMass / baseMass;
  const scaledPeriod = basePeriod / Math.sqrt(massRatio);
  return Math.round(scaledPeriod * 100) / 100;
}

export function calculateOrbitRadiusScale(starMass: number): number {
  return Math.pow(starMass, 1 / 3);
}

export function calculateOrbitalSystem(
  starType: StarType
): OrbitalSystemParams {
  const star = STAR_CONFIGS[starType];
  const radiusScale = calculateOrbitRadiusScale(star.mass);
  const rand = seededRandom(42);

  const planets: PlanetOrbitParams[] = PLANET_BASE_DATA.map((base) => {
    const inclination = -5 + rand() * 20;
    const scaledOrbitRadius = base.baseOrbitRadius * radiusScale;
    const period = calculateKeplerPeriod(
      star.mass,
      scaledOrbitRadius,
      base.basePeriod
    );

    return {
      name: base.name,
      color: base.color,
      radius: base.radius,
      orbitRadius: Math.round(scaledOrbitRadius * 100) / 100,
      period,
      eccentricity: base.eccentricity,
      inclination: Math.round(inclination * 100) / 100,
      description: base.description,
    };
  });

  return { star, planets };
}
