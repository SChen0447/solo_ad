export interface DNA {
  sequence: string;
  length: number;
}

export interface Traits {
  bodySize: number;
  heatTolerance: number;
  coldTolerance: number;
  humidityAffinity: number;
  radiationResistance: number;
  metabolism: number;
  lifespan: number;
}

export interface Organism {
  id: string;
  generation: number;
  dna: DNA;
  traits: Traits;
  fitness: number;
  energy: number;
  age: number;
  x: number;
  y: number;
  parentIds: string[];
  colorHue: number;
}

export interface EnvParams {
  temperature: number;
  humidity: number;
  radiation: number;
}

export interface Statistics {
  totalPopulation: number;
  avgBodySize: number;
  avgLifespan: number;
  geneDiversity: number;
  avgFitness: number;
  bestFitness: number;
  history: Array<{
    generation: number;
    population: number;
    avgFitness: number;
    bestFitness: number;
  }>;
}

export interface EvolutionNode {
  organismId: string;
  generation: number;
  fitness: number;
  similarity: number;
  parentId: string | null;
  x: number;
  y: number;
}

export interface GameState {
  generation: number;
  generationPerSecond: number;
  isPaused: boolean;
  speedMultiplier: 0 | 1 | 2 | 5 | 10;
  environment: EnvParams;
  targetEnvironment: EnvParams;
  population: Organism[];
  statistics: Statistics;
  evolutionTree: EvolutionNode[];
  bestOrganism: Organism | null;
  hoveredOrganism: Organism | null;
}

export type SpeedMultiplier = 0 | 1 | 2 | 5 | 10;

export interface HoverInfo {
  organism: Organism | null;
  screenX: number;
  screenY: number;
}
