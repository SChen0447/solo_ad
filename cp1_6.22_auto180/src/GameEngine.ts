import type {
  GameState,
  EnvParams,
  Organism,
  Statistics,
  EvolutionNode,
  SpeedMultiplier,
  HoverInfo
} from './types';
import {
  generateInitialDNA,
  createOrganism,
  reproduce,
  weightedPick,
  calcGeneDiversity,
  calcSimilarity,
  calcFitness,
  decodeDNA
} from './BiologySystem';

const INITIAL_POPULATION = 50;
const DEFAULT_TEMPERATURE = 22;
const DEFAULT_HUMIDITY = 0.5;
const DEFAULT_RADIATION = 0.5;
const MAX_POPULATION_HARD = 5000;
const GENERATION_PER_SECOND_BASE = 0.8;
const ENV_SMOOTHING = 0.04;
const EVOLUTION_TREE_MAX_GENS = 50;
const UPDATE_EVENT_THROTTLE = 100;
const FRAME_MS = 1000 / 60;
const GENERATIONS_PER_FRAME_BASE = GENERATION_PER_SECOND_BASE / 60;

type EngineUpdateEvent = CustomEvent<GameState>;
type HoverUpdateEvent = CustomEvent<HoverInfo>;

declare global {
  interface HTMLElementEventMap {
    'engine:update': EngineUpdateEvent;
    'engine:hover': HoverUpdateEvent;
  }
}

export class GameEngine extends EventTarget {
  private state: GameState;
  private rafId: number | null = null;
  private lastTs = 0;
  private generationAccumulator = 0;
  private lastDispatchTime = 0;
  private generationsWindow: { ts: number; count: number }[] = [];
  private canvasWidth = 800;
  private canvasHeight = 600;

  constructor() {
    super();
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const environment: EnvParams = {
      temperature: DEFAULT_TEMPERATURE,
      humidity: DEFAULT_HUMIDITY,
      radiation: DEFAULT_RADIATION
    };
    const population: Organism[] = [];
    for (let i = 0; i < INITIAL_POPULATION; i++) {
      const dna = generateInitialDNA();
      const org = createOrganism(
        0,
        dna,
        environment,
        [],
        400 + (Math.random() - 0.5) * 300,
        300 + (Math.random() - 0.5) * 200,
        100
      );
      population.push(org);
    }
    const stats = this.computeStatistics(population, []);
    const bestOrganism = this.findBest(population);
    const tree = this.buildInitialTree(population);
    return {
      generation: 0,
      generationPerSecond: GENERATION_PER_SECOND_BASE,
      isPaused: false,
      speedMultiplier: 1,
      environment: { ...environment },
      targetEnvironment: { ...environment },
      population,
      statistics: stats,
      evolutionTree: tree,
      bestOrganism,
      hoveredOrganism: null
    };
  }

  private buildInitialTree(population: Organism[]): EvolutionNode[] {
    const nodes: EvolutionNode[] = [];
    const count = Math.min(population.length, 12);
    for (let i = 0; i < count; i++) {
      const org = population[i];
      nodes.push({
        organismId: org.id,
        generation: 0,
        fitness: org.fitness,
        similarity: 1,
        parentId: null,
        x: 20 + (i / Math.max(1, count - 1)) * 240,
        y: 320
      });
    }
    return nodes;
  }

  setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  setEnvironment(params: Partial<EnvParams>): void {
    if (params.temperature !== undefined) {
      this.state.targetEnvironment.temperature = Math.max(-10, Math.min(50, params.temperature));
    }
    if (params.humidity !== undefined) {
      this.state.targetEnvironment.humidity = Math.max(0, Math.min(1, params.humidity));
    }
    if (params.radiation !== undefined) {
      this.state.targetEnvironment.radiation = Math.max(0, Math.min(10, params.radiation));
    }
    this.dispatchUpdate(true);
  }

  setSpeed(multiplier: SpeedMultiplier): void {
    this.state.speedMultiplier = multiplier;
    this.state.isPaused = multiplier === 0;
    this.dispatchUpdate(true);
  }

  getState(): GameState {
    return this.state;
  }

  setHovered(info: HoverInfo): void {
    this.state.hoveredOrganism = info.organism;
    this.dispatchEvent(new CustomEvent('engine:hover', { detail: info }));
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTs = performance.now();
    const loop = (ts: number) => {
      this.tick(ts);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick(ts: number): void {
    const dt = Math.min(100, ts - this.lastTs);
    this.lastTs = ts;

    this.smoothEnvironment();

    if (!this.state.isPaused) {
      const steps = Math.max(1, Math.round(dt / FRAME_MS));
      for (let i = 0; i < steps; i++) {
        this.generationAccumulator +=
          GENERATIONS_PER_FRAME_BASE * this.state.speedMultiplier;
        while (this.generationAccumulator >= 1) {
          this.evolveGeneration();
          this.generationAccumulator -= 1;
        }
      }
      this.updateGenerationPerSecond(ts);
    }
    this.dispatchUpdate();
  }

  private smoothEnvironment(): void {
    const cur = this.state.environment;
    const tgt = this.state.targetEnvironment;
    cur.temperature += (tgt.temperature - cur.temperature) * ENV_SMOOTHING;
    cur.humidity += (tgt.humidity - cur.humidity) * ENV_SMOOTHING;
    cur.radiation += (tgt.radiation - cur.radiation) * ENV_SMOOTHING;
  }

  private evolveGeneration(): void {
    this.state.generation += 1;
    const gen = this.state.generation;
    const env = this.state.environment;
    const pop = this.state.population;

    for (let i = 0; i < pop.length; i++) {
      pop[i].fitness = calcFitness(pop[i].traits, env);
      pop[i].age += 1;
      pop[i].colorHue = 200 + (1 - pop[i].traits.heatTolerance) * 80;
    }

    pop.sort((a, b) => b.fitness - a.fitness);
    const median = pop[Math.floor(pop.length / 2)]?.fitness ?? 0.5;
    const threshold = median * 0.5;
    const survivors: Organism[] = [];
    for (let i = 0; i < pop.length; i++) {
      if (pop[i].fitness >= threshold && pop[i].age < pop[i].traits.lifespan) {
        survivors.push(pop[i]);
      }
    }
    if (survivors.length < 8 && pop.length > 0) {
      survivors.length = 0;
      for (let i = 0; i < Math.min(pop.length, 10); i++) survivors.push(pop[i]);
    }

    const targetSize = Math.max(
      20,
      Math.min(
        MAX_POPULATION_HARD,
        Math.floor(survivors.length * 1.4 + 5)
      )
    );

    const offspring: Organism[] = survivors.slice();
    const weights = survivors.map((o) => Math.max(0.05, o.fitness));

    while (offspring.length < targetSize && survivors.length >= 2) {
      const idxA = Math.floor(Math.random() * survivors.length);
      const pa = weightedPick(survivors, weights);
      let pb = weightedPick(survivors, weights);
      let attempts = 0;
      while (pb.id === pa.id && survivors.length > 1 && attempts < 5) {
        pb = weightedPick(survivors, weights);
        attempts++;
      }
      if (pb.id === pa.id) {
        pb = survivors[(idxA + 1) % survivors.length];
      }
      const child = reproduce(pa, pb, env, gen);
      child.x = Math.max(20, Math.min(this.canvasWidth - 20, child.x));
      child.y = Math.max(20, Math.min(this.canvasHeight - 20, child.y));
      offspring.push(child);

      if (this.state.evolutionTree.length < 1500) {
        const parentSim = calcSimilarity(pa.dna, child.dna);
        const lastGenNodes = this.state.evolutionTree.filter(
          (n) => n.organismId === pa.id || n.organismId === pb.id
        );
        let parentNode: EvolutionNode | null = lastGenNodes[0] ?? null;
        if (!parentNode) {
          const genNodes = this.state.evolutionTree.filter(
            (n) => n.generation === child.generation - 1
          );
          if (genNodes.length > 0) {
            parentNode = genNodes[Math.floor(genNodes.length / 2)];
          }
        }
        const prevY = parentNode ? parentNode.y : 320;
        const prevX = parentNode ? parentNode.x : 140;
        const newY = Math.max(20, prevY - 6);
        if (newY >= 10) {
          this.state.evolutionTree.push({
            organismId: child.id,
            generation: gen,
            fitness: child.fitness,
            similarity: parentSim,
            parentId: parentNode ? parentNode.organismId : null,
            x: Math.max(10, Math.min(270, prevX + (Math.random() - 0.5) * 30)),
            y: newY
          });
        }
      }
    }

    this.trimEvolutionTree(gen);

    for (let i = 0; i < offspring.length; i++) {
      const org = offspring[i];
      org.x += (Math.random() - 0.5) * 4;
      org.y += (Math.random() - 0.5) * 4;
      org.x = Math.max(15, Math.min(this.canvasWidth - 15, org.x));
      org.y = Math.max(15, Math.min(this.canvasHeight - 15, org.y));
      if (org.generation !== gen) {
        const updatedTraits = decodeDNA(org.dna);
        Object.assign(org.traits, updatedTraits);
        org.fitness = calcFitness(org.traits, env);
      }
    }

    this.state.population = offspring;
    this.cullIfNeeded();
    this.state.statistics = this.computeStatistics(
      this.state.population,
      this.state.statistics.history
    );
    this.state.bestOrganism = this.findBest(this.state.population);
  }

  private trimEvolutionTree(currentGen: number): void {
    const minGen = Math.max(0, currentGen - EVOLUTION_TREE_MAX_GENS);
    this.state.evolutionTree = this.state.evolutionTree.filter(
      (n) => n.generation >= minGen
    );
    if (this.state.evolutionTree.length > 1200) {
      this.state.evolutionTree = this.state.evolutionTree.slice(-1200);
    }
  }

  private cullIfNeeded(): void {
    const pop = this.state.population;
    if (pop.length > MAX_POPULATION_HARD) {
      pop.sort((a, b) => b.fitness - a.fitness);
      const removeCount = Math.ceil(pop.length * 0.1);
      pop.splice(pop.length - removeCount, removeCount);
    }
  }

  private computeStatistics(
    population: Organism[],
    history: Statistics['history']
  ): Statistics {
    const n = population.length;
    let sumSize = 0;
    let sumLife = 0;
    let sumFit = 0;
    let best = 0;
    for (let i = 0; i < n; i++) {
      sumSize += population[i].traits.bodySize;
      sumLife += population[i].traits.lifespan;
      sumFit += population[i].fitness;
      if (population[i].fitness > best) best = population[i].fitness;
    }
    const newHistory = [...history];
    if (this.state.generation % 10 === 0 || newHistory.length === 0) {
      newHistory.push({
        generation: this.state.generation,
        population: n,
        avgFitness: n > 0 ? sumFit / n : 0,
        bestFitness: best
      });
      if (newHistory.length > 20) newHistory.shift();
    }
    return {
      totalPopulation: n,
      avgBodySize: n > 0 ? sumSize / n : 0,
      avgLifespan: n > 0 ? sumLife / n : 0,
      geneDiversity: calcGeneDiversity(population),
      avgFitness: n > 0 ? sumFit / n : 0,
      bestFitness: best,
      history: newHistory
    };
  }

  private findBest(population: Organism[]): Organism | null {
    if (population.length === 0) return null;
    let best = population[0];
    for (let i = 1; i < population.length; i++) {
      if (population[i].fitness > best.fitness) best = population[i];
    }
    return best;
  }

  private updateGenerationPerSecond(ts: number): void {
    this.generationsWindow.push({ ts, count: 1 });
    while (
      this.generationsWindow.length > 0 &&
      ts - this.generationsWindow[0].ts > 1500
    ) {
      this.generationsWindow.shift();
    }
    if (this.generationsWindow.length > 1) {
      const total = this.generationsWindow.reduce((s, g) => s + g.count, 0);
      const span =
        (this.generationsWindow[this.generationsWindow.length - 1].ts -
          this.generationsWindow[0].ts) /
        1000;
      if (span > 0.1) {
        this.state.generationPerSecond = total / span;
      }
    }
  }

  private dispatchUpdate(force: boolean = false): void {
    const now = performance.now();
    if (!force && now - this.lastDispatchTime < UPDATE_EVENT_THROTTLE) return;
    this.lastDispatchTime = now;
    this.dispatchEvent(
      new CustomEvent('engine:update', { detail: { ...this.state } })
    );
  }
}
