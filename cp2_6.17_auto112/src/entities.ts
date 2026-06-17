export type SpeciesColor = 'red' | 'blue' | 'green';

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface Organism {
  id: number;
  x: number;
  y: number;
  energy: number;
  color: SpeciesColor;
  colorRGB: ColorRGB;
  age: number;
  breedCooldown: number;
  lastBreedTime: number;
  vx: number;
  vy: number;
}

export interface Food {
  id: number;
  x: number;
  y: number;
  remaining: number;
}

const SPECIES_BASE_COLORS: Record<SpeciesColor, ColorRGB> = {
  red: { r: 239, g: 68, b: 68 },
  blue: { r: 59, g: 130, b: 246 },
  green: { r: 34, g: 197, b: 94 },
};

let nextOrganismId = 1;
let nextFoodId = 1;

export const ORGANISM_SIZE = 16;
export const FOOD_RADIUS = 6;
export const SCENE_WIDTH = 800;
export const SCENE_HEIGHT = 600;
export const INITIAL_ORGANISMS_PER_SPECIES = 10;
export const INITIAL_FOOD_COUNT = 30;
export const MAX_ENERGY = 100;
export const ENERGY_FROM_FOOD = 8;
export const ENERGY_PER_FRAME = 0.5;
export const BREED_ENERGY_THRESHOLD = 60;
export const BREED_ENERGY_COST = 15;
export const VISION_RANGE = 100;
export const BREED_COOLDOWN_FRAMES = 300;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createOrganism(color: SpeciesColor, x?: number, y?: number, mutationRate = 0.02, parentColor?: ColorRGB, currentTime = 0): Organism {
  const baseColor = parentColor ?? SPECIES_BASE_COLORS[color];
  let finalColor: ColorRGB = { ...baseColor };

  if (Math.random() < mutationRate) {
    const offset = 5;
    finalColor = {
      r: clamp(baseColor.r + rand(-offset, offset), 0, 255),
      g: clamp(baseColor.g + rand(-offset, offset), 0, 255),
      b: clamp(baseColor.b + rand(-offset, offset), 0, 255),
    };
  }

  return {
    id: nextOrganismId++,
    x: x ?? rand(ORGANISM_SIZE, SCENE_WIDTH - ORGANISM_SIZE),
    y: y ?? rand(ORGANISM_SIZE, SCENE_HEIGHT - ORGANISM_SIZE),
    energy: 50,
    color,
    colorRGB: finalColor,
    age: 0,
    breedCooldown: 0,
    lastBreedTime: currentTime,
    vx: 0,
    vy: 0,
  };
}

export function resetOrganismIds(): void {
  nextOrganismId = 1;
}

export function createFood(): Food {
  return {
    id: nextFoodId++,
    x: rand(FOOD_RADIUS * 2, SCENE_WIDTH - FOOD_RADIUS * 2),
    y: rand(FOOD_RADIUS * 2, SCENE_HEIGHT - FOOD_RADIUS * 2),
    remaining: 1,
  };
}

export function resetFoodIds(): void {
  nextFoodId = 1;
}

export function getBaseColor(color: SpeciesColor): ColorRGB {
  return SPECIES_BASE_COLORS[color];
}

export function rgbToString(rgb: ColorRGB, alpha = 1): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}
