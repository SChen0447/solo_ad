export type StageName = 'seed' | 'sprout' | 'seedling' | 'mature' | 'flowering' | 'fruiting';

export interface StageConfig {
  name: StageName;
  minDuration: number;
  maxDuration: number;
  stemHeight: number;
  leafCount: number;
  budSize: number;
  fruitSize: number;
}

export interface SpeciesColors {
  stem: string;
  stemMature: string;
  leaf: string;
  leafMature: string;
  flower: string;
  flowerCenter: string;
  fruit: string;
}

export interface SpeciesMorphology {
  maxStemHeight: number;
  stemRadius: number;
  petalCount: number;
  flowerRadius: number;
  leafWidth: number;
  leafLength: number;
  spineLength: number;
  vineCurve: number;
}

export interface SpeciesData {
  id: string;
  name: string;
  stages: StageConfig[];
  colors: SpeciesColors;
  morphology: SpeciesMorphology;
}

export interface MorphParams {
  stemHeight: number;
  stemRadius: number;
  leafCount: number;
  leafScale: number;
  budSize: number;
  fruitSize: number;
  stemColor: string;
  leafColor: string;
  flowerColor: string;
  fruitColor: string;
  swayAngle: number;
  leafPhase: number[];
}

const STAGE_NAMES: StageName[] = ['seed', 'sprout', 'seedling', 'mature', 'flowering', 'fruiting'];

const STAGE_LABELS: Record<StageName, string> = {
  seed: '种子',
  sprout: '发芽',
  seedling: '幼苗',
  mature: '成株',
  flowering: '开花',
  fruiting: '结果'
};

function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getStageProgressFactor(stage: StageName, env: { light: number; water: number; nutrient: number }): number {
  const baseFactor = (env.light * 0.4 + env.water * 0.35 + env.nutrient * 0.25) / 100;
  const stageBonus: Record<StageName, number> = {
    seed: 0.3,
    sprout: 0.6,
    seedling: 0.8,
    mature: 1.0,
    flowering: 0.9,
    fruiting: 0.7
  };
  return Math.max(0.1, baseFactor * stageBonus[stage]);
}

function getRandomDuration(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export interface GrowthState {
  currentStage: StageName;
  stageIndex: number;
  stageProgress: number;
  stageDuration: number;
  stageElapsed: number;
  overallProgress: number;
  isComplete: boolean;
}

export class PlantGrowth {
  private species: SpeciesData;
  private stageIndex: number = 0;
  private stageElapsed: number = 0;
  private stageDuration: number = 0;
  private isComplete: boolean = false;
  private leafPhases: number[] = [];
  private listeners: Map<string, Array<(...args: unknown[]) => void>> = new Map();

  constructor(species: SpeciesData) {
    this.species = species;
    this.stageDuration = getRandomDuration(
      species.stages[0].minDuration,
      species.stages[0].maxDuration
    );
    this.leafPhases = Array.from({ length: 20 }, () => Math.random() * Math.PI * 2);
  }

  reset(species?: SpeciesData): void {
    if (species) this.species = species;
    this.stageIndex = 0;
    this.stageElapsed = 0;
    this.isComplete = false;
    this.stageDuration = getRandomDuration(
      this.species.stages[0].minDuration,
      this.species.stages[0].maxDuration
    );
    this.leafPhases = Array.from({ length: 20 }, () => Math.random() * Math.PI * 2);
    this.emit('stageChange', this.getState());
  }

  update(deltaSeconds: number, env: { light: number; water: number; nutrient: number }): void {
    if (this.isComplete) return;

    const stage = this.species.stages[this.stageIndex];
    const factor = getStageProgressFactor(stage.name, env);
    const adjustedDelta = deltaSeconds * factor;

    this.stageElapsed += adjustedDelta;

    if (this.stageElapsed >= this.stageDuration) {
      if (this.stageIndex < this.species.stages.length - 1) {
        this.stageIndex++;
        this.stageElapsed = 0;
        this.stageDuration = getRandomDuration(
          this.species.stages[this.stageIndex].minDuration,
          this.species.stages[this.stageIndex].maxDuration
        );
        this.emit('stageChange', this.getState());
      } else {
        this.stageElapsed = this.stageDuration;
        this.isComplete = true;
        this.emit('growthComplete', this.getState());
      }
    }
  }

  getState(): GrowthState {
    const progress = Math.min(this.stageElapsed / this.stageDuration, 1);
    const overallProgress =
      (this.stageIndex + progress) / this.species.stages.length;
    return {
      currentStage: this.species.stages[this.stageIndex].name,
      stageIndex: this.stageIndex,
      stageProgress: progress,
      stageDuration: this.stageDuration,
      stageElapsed: this.stageElapsed,
      overallProgress,
      isComplete: this.isComplete,
    };
  }

  getMorphParams(env: { light: number; water: number; nutrient: number }): MorphParams {
    const state = this.getState();
    const { stageIndex, stageProgress } = state;
    const current = this.species.stages[stageIndex];
    const next = this.species.stages[Math.min(stageIndex + 1, this.species.stages.length - 1)];

    const t = easeInOutCubic(stageProgress);

    const envFactor = (env.light * 0.4 + env.water * 0.35 + env.nutrient * 0.25) / 100;
    const sizeFactor = 0.5 + envFactor * 0.5;

    const stemHeight = cubicBezier(t, 0, current.stemHeight * 0.3, next.stemHeight * 0.7, lerp(current.stemHeight, next.stemHeight, t)) * sizeFactor;
    const leafCount = Math.round(lerp(current.leafCount, next.leafCount, t));
    const budSize = lerp(current.budSize, next.budSize, t) * sizeFactor;
    const fruitSize = lerp(current.fruitSize, next.fruitSize, t) * sizeFactor;

    const overallT = state.overallProgress;
    const stemColor = lerpColor(this.species.colors.stem, this.species.colors.stemMature, overallT);
    const leafColor = lerpColor(this.species.colors.leaf, this.species.colors.leafMature, overallT);

    return {
      stemHeight: Math.max(0.01, stemHeight) / 10,
      stemRadius: this.species.morphology.stemRadius * sizeFactor * 0.1,
      leafCount,
      leafScale: (0.5 + envFactor * 0.5) * 0.3,
      budSize: Math.max(0, budSize) * 0.1,
      fruitSize: Math.max(0, fruitSize) * 0.1,
      stemColor,
      leafColor,
      flowerColor: this.species.colors.flower,
      fruitColor: this.species.colors.fruit,
      swayAngle: Math.sin(Date.now() * 0.001 * Math.PI) * 2 * (Math.PI / 180),
      leafPhase: this.leafPhases,
    };
  }

  getSpecies(): SpeciesData {
    return this.species;
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(callback);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach((cb) => cb(...args));
    }
  }
}

export { STAGE_NAMES, STAGE_LABELS, lerpColor, easeInOutCubic };
