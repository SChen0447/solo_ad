export interface CompositionEntry {
  element: string;
  percentage: number;
}

export interface StarLayerData {
  name: string;
  radiusFraction: number;
  temperature: number;
  density: number;
  composition: CompositionEntry[];
  color: string;
  emissiveColor: string;
}

export interface StarData {
  id: string;
  name: string;
  type: string;
  description: string;
  radius: number;
  displayRadius: number;
  layers: StarLayerData[];
}

export function calculateTemperatureGradient(
  coreTemp: number,
  surfaceTemp: number,
  radiusFraction: number
): number {
  const r = Math.max(0, Math.min(1, radiusFraction));
  return coreTemp * Math.pow(1 - r * 0.95, 1.5) + surfaceTemp * (1 - Math.pow(1 - r * 0.95, 1.5));
}

export function calculateDensityGradient(
  coreDensity: number,
  surfaceDensity: number,
  radiusFraction: number
): number {
  const r = Math.max(0, Math.min(1, radiusFraction));
  return coreDensity * Math.exp(-5 * r) + surfaceDensity;
}

export function calculateLuminosity(mass: number, radius: number): number {
  return Math.pow(mass, 3.5) * Math.pow(radius, 0.5);
}
