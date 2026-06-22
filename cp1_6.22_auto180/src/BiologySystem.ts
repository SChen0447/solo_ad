import type { DNA, Traits, EnvParams, Organism } from './types';

const BASES = ['A', 'C', 'G', 'T'] as const;
const INITIAL_DNA_LENGTH = 256;
const MIN_DNA_LENGTH = 128;
const MAX_DNA_LENGTH = 512;
const MUTATION_RATE = 0.001;

function generateId(): string {
  return 'org_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function randBase(): string {
  return BASES[Math.floor(Math.random() * 4)];
}

export function generateInitialDNA(): DNA {
  let seq = '';
  for (let i = 0; i < INITIAL_DNA_LENGTH; i++) {
    seq += randBase();
  }
  return { sequence: seq, length: INITIAL_DNA_LENGTH };
}

function hashWindow(seq: string, start: number, len: number): number {
  let gc = 0;
  let at = 0;
  const end = Math.min(start + len, seq.length);
  for (let i = start; i < end; i++) {
    const c = seq[i];
    if (c === 'G' || c === 'C') gc++;
    else at++;
  }
  const total = Math.max(1, end - start);
  const gcRatio = gc / total;
  const atRatio = at / total;
  return (gcRatio * 0.7 + atRatio * 0.3 + (start % 17) / 100) % 1;
}

export function decodeDNA(dna: DNA): Traits {
  const seq = dna.sequence;
  const len = seq.length;
  const windowSize = Math.max(21, Math.floor(len / 10));
  return {
    bodySize: hashWindow(seq, windowSize * 0, windowSize),
    heatTolerance: hashWindow(seq, windowSize * 1, windowSize),
    coldTolerance: hashWindow(seq, windowSize * 2, windowSize),
    humidityAffinity: hashWindow(seq, windowSize * 3, windowSize),
    radiationResistance: hashWindow(seq, windowSize * 4, windowSize),
    metabolism: hashWindow(seq, windowSize * 5, windowSize),
    lifespan: 20 + Math.floor(hashWindow(seq, windowSize * 6, windowSize) * 80)
  };
}

export function calcFitness(traits: Traits, env: EnvParams): number {
  const tempNorm = (env.temperature + 10) / 60;
  const heatDiff = Math.abs(traits.heatTolerance - Math.max(0, tempNorm - 0.4) * 1.67);
  const coldDiff = Math.abs(traits.coldTolerance - Math.max(0, (0.6 - tempNorm)) * 1.67);
  const tempScore = 1 - (heatDiff + coldDiff) * 0.5;

  const humidDiff = Math.abs(traits.humidityAffinity - env.humidity);
  const humidScore = 1 - humidDiff;

  const radNorm = env.radiation / 10;
  const radScore = 1 - radNorm * (1 - traits.radiationResistance);

  const metaScore = 0.5 + traits.metabolism * 0.5;

  const raw = (
    tempScore * 0.35 +
    humidScore * 0.25 +
    radScore * 0.2 +
    metaScore * 0.2
  );
  return Math.max(0, Math.min(1, raw));
}

export function mutate(dna: DNA, rate: number = MUTATION_RATE): DNA {
  const arr = dna.sequence.split('');
  const result: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (Math.random() < rate) {
      const r = Math.random();
      if (r < 0.7) {
        let nb = randBase();
        while (nb === arr[i]) nb = randBase();
        result.push(nb);
      } else if (r < 0.85) {
        result.push(arr[i]);
        result.push(randBase());
      }
    } else {
      result.push(arr[i]);
    }
  }
  if (result.length < MIN_DNA_LENGTH) {
    while (result.length < MIN_DNA_LENGTH) result.push(randBase());
  }
  if (result.length > MAX_DNA_LENGTH) {
    result.length = MAX_DNA_LENGTH;
  }
  return { sequence: result.join(''), length: result.length };
}

export function crossover(parentA: DNA, parentB: DNA): DNA {
  const shorter = Math.min(parentA.length, parentB.length);
  const point = Math.floor(Math.random() * shorter);
  const head = parentA.sequence.slice(0, point);
  const tail = parentB.sequence.slice(point);
  const seq = head + tail;
  const len = Math.max(MIN_DNA_LENGTH, Math.min(MAX_DNA_LENGTH, seq.length));
  return { sequence: seq.slice(0, len), length: len };
}

export function calcSimilarity(dnaA: DNA, dnaB: DNA): number {
  const len = Math.min(dnaA.length, dnaB.length);
  if (len === 0) return 0;
  let matches = 0;
  for (let i = 0; i < len; i++) {
    if (dnaA.sequence[i] === dnaB.sequence[i]) matches++;
  }
  return matches / len;
}

export function createOrganism(
  generation: number,
  dna: DNA,
  env: EnvParams,
  parentIds: string[],
  centerX: number,
  centerY: number,
  spread: number
): Organism {
  const traits = decodeDNA(dna);
  const fitness = calcFitness(traits, env);
  const hue = 200 + (1 - traits.heatTolerance) * 80;
  return {
    id: generateId(),
    generation,
    dna,
    traits,
    fitness,
    energy: 0.5 + Math.random() * 0.5,
    age: 0,
    x: centerX + (Math.random() - 0.5) * spread,
    y: centerY + (Math.random() - 0.5) * spread,
    parentIds,
    colorHue: hue
  };
}

export function reproduce(
  parentA: Organism,
  parentB: Organism,
  env: EnvParams,
  generation: number
): Organism {
  const crossedDNA = crossover(parentA.dna, parentB.dna);
  const mutatedDNA = mutate(crossedDNA, MUTATION_RATE);
  const cx = (parentA.x + parentB.x) / 2;
  const cy = (parentA.y + parentB.y) / 2;
  return createOrganism(generation, mutatedDNA, env, [parentA.id, parentB.id], cx, cy, 60);
}

export function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function calcGeneDiversity(population: Organism[]): number {
  if (population.length < 2) return 0;
  const samples = Math.min(population.length, 30);
  const step = Math.floor(population.length / samples);
  let totalSim = 0;
  let count = 0;
  for (let i = 0; i < samples; i++) {
    for (let j = i + 1; j < samples; j++) {
      totalSim += calcSimilarity(population[i * step].dna, population[j * step].dna);
      count++;
    }
  }
  const avgSim = count > 0 ? totalSim / count : 1;
  return Math.max(0, Math.min(1, 1 - avgSim));
}
