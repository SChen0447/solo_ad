export interface PlanetData {
  name: string;
  nameEn: string;
  mass: number;
  radius: number;
  orbitRadius: number;
  orbitalPeriod: number;
  orbitalVelocity: number;
  color: string;
}

export interface PlanetConfig {
  name: string;
  nameEn: string;
  mass: number;
  radius: number;
  orbitRadius: number;
  orbitalPeriod: number;
  color: string;
}

export const SUN_MASS = 333000;
export const G = 6.674e-11;
export const AU_IN_METERS = 1.496e11;
export const EARTH_MASS_KG = 5.972e24;
export const SECONDS_PER_YEAR = 365.25 * 24 * 3600;

export const BASE_PLANETS: Record<string, PlanetConfig> = {
  mercury: {
    name: '水星',
    nameEn: 'mercury',
    mass: 0.055,
    radius: 0.38,
    orbitRadius: 0.39,
    orbitalPeriod: 0.24,
    color: '#b5b5b5'
  },
  venus: {
    name: '金星',
    nameEn: 'venus',
    mass: 0.815,
    radius: 0.95,
    orbitRadius: 0.72,
    orbitalPeriod: 0.62,
    color: '#e6c87a'
  },
  earth: {
    name: '地球',
    nameEn: 'earth',
    mass: 1.0,
    radius: 1.0,
    orbitRadius: 1.0,
    orbitalPeriod: 1.0,
    color: '#6b93d6'
  },
  mars: {
    name: '火星',
    nameEn: 'mars',
    mass: 0.107,
    radius: 0.53,
    orbitRadius: 1.52,
    orbitalPeriod: 1.88,
    color: '#c1440e'
  }
};

export function calculateOrbitalVelocity(orbitRadiusAu: number, centralMassEarth: number): number {
  const orbitRadiusMeters = orbitRadiusAu * AU_IN_METERS;
  const centralMassKg = centralMassEarth * EARTH_MASS_KG;
  const velocity = Math.sqrt(G * centralMassKg / orbitRadiusMeters);
  return velocity / 1000;
}

export function calculateOrbitalPeriod(orbitRadiusAu: number, centralMassEarth: number): number {
  const orbitRadiusMeters = orbitRadiusAu * AU_IN_METERS;
  const centralMassKg = centralMassEarth * EARTH_MASS_KG;
  const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(orbitRadiusMeters, 3) / (G * centralMassKg));
  return periodSeconds / SECONDS_PER_YEAR;
}

export function getOrbitPosition(orbitRadius: number, angle: number): { x: number; y: number; z: number } {
  return {
    x: Math.cos(angle) * orbitRadius,
    y: 0,
    z: Math.sin(angle) * orbitRadius
  };
}

export function getAngularVelocity(orbitalPeriodYears: number, timeScale: number = 1): number {
  const radiansPerSecond = (2 * Math.PI) / (orbitalPeriodYears * SECONDS_PER_YEAR);
  return radiansPerSecond * timeScale;
}

export function calculateUpdatedOrbit(
  planetKey: string,
  massMultiplier: number,
  radiusMultiplier: number
): PlanetData {
  const basePlanet = BASE_PLANETS[planetKey];
  if (!basePlanet) {
    throw new Error(`Unknown planet: ${planetKey}`);
  }

  const newOrbitRadius = basePlanet.orbitRadius * radiusMultiplier;
  const newMass = basePlanet.mass * massMultiplier;
  const totalMass = SUN_MASS + newMass;
  
  const newOrbitalVelocity = calculateOrbitalVelocity(newOrbitRadius, totalMass);
  const newOrbitalPeriod = calculateOrbitalPeriod(newOrbitRadius, totalMass);

  return {
    name: basePlanet.name,
    nameEn: basePlanet.nameEn,
    mass: newMass,
    radius: basePlanet.radius,
    orbitRadius: newOrbitRadius,
    orbitalPeriod: newOrbitalPeriod,
    orbitalVelocity: newOrbitalVelocity,
    color: basePlanet.color
  };
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
