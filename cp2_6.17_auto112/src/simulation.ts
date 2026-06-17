import {
  Organism,
  Food,
  SpeciesColor,
  createOrganism,
  createFood,
  resetOrganismIds,
  resetFoodIds,
  ORGANISM_SIZE,
  FOOD_RADIUS,
  SCENE_WIDTH,
  SCENE_HEIGHT,
  INITIAL_ORGANISMS_PER_SPECIES,
  INITIAL_FOOD_COUNT,
  MAX_ENERGY,
  ENERGY_FROM_FOOD,
  ENERGY_PER_FRAME,
  BREED_ENERGY_THRESHOLD,
  BREED_ENERGY_COST,
  VISION_RANGE,
} from './entities';

export interface SimulationStats {
  redCount: number;
  blueCount: number;
  greenCount: number;
  totalCount: number;
  averageEnergy: number;
  foodCount: number;
  elapsedTime: number;
}

export interface PopulationSample {
  time: number;
  red: number;
  blue: number;
  green: number;
}

export interface SimulationParams {
  foodSpawnInterval: number;
  moveSpeed: number;
  mutationRate: number;
}

export class Simulation {
  organisms: Organism[] = [];
  foods: Food[] = [];
  params: SimulationParams;
  elapsedFrames: number = 0;
  fps: number = 30;
  elapsedTime: number = 0;
  lastFoodSpawn: number = 0;
  lastSampleTime: number = 0;
  populationHistory: PopulationSample[] = [];
  readonly HISTORY_WINDOW = 60;
  readonly SAMPLE_INTERVAL = 5;

  readonly BREED_INTERVAL = 5;

  constructor(params?: Partial<SimulationParams>) {
    this.params = {
      foodSpawnInterval: 15,
      moveSpeed: 2,
      mutationRate: 0.02,
      ...params,
    };
    this.reset();
  }

  reset(): void {
    resetOrganismIds();
    resetFoodIds();
    this.organisms = [];
    this.foods = [];
    this.elapsedFrames = 0;
    this.elapsedTime = 0;
    this.lastFoodSpawn = 0;
    this.lastSampleTime = 0;
    this.populationHistory = [];

    const species: SpeciesColor[] = ['red', 'blue', 'green'];
    for (const color of species) {
      for (let i = 0; i < INITIAL_ORGANISMS_PER_SPECIES; i++) {
        this.organisms.push(createOrganism(color));
      }
    }

    for (let i = 0; i < INITIAL_FOOD_COUNT; i++) {
      this.foods.push(createFood());
    }

    const counts = this.countSpecies();
    this.populationHistory.push({
      time: 0,
      red: counts.red,
      blue: counts.blue,
      green: counts.green,
    });
  }

  setParams(params: Partial<SimulationParams>): void {
    this.params = { ...this.params, ...params };
  }

  step(): void {
    this.elapsedFrames++;
    const deltaTime = 1 / this.fps;
    this.elapsedTime = this.elapsedFrames / this.fps;

    this.updateMovement();
    this.updateEating();
    this.updateEnergy();
    this.updateBreeding();
    this.updateDeath();
    this.updateFoodSpawn();
    this.updateHistory();
  }

  private updateMovement(): void {
    for (const org of this.organisms) {
      const nearestFood = this.findNearestFood(org);
      const hasFoodInVision = nearestFood !== null;
      const r = Math.random();

      if (hasFoodInVision) {
        if (r < 0.5) {
          const food = nearestFood!;
          const dx = food.x - org.x;
          const dy = food.y - org.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            org.vx = (dx / dist) * this.params.moveSpeed;
            org.vy = (dy / dist) * this.params.moveSpeed;
          } else {
            org.vx = 0;
            org.vy = 0;
          }
        } else if (r < 0.8) {
          this.randomWalk(org);
        } else {
          org.vx = 0;
          org.vy = 0;
        }
      } else {
        if (r < 0.3) {
          this.randomWalk(org);
        } else {
          org.vx = 0;
          org.vy = 0;
        }
      }

      org.x = Math.max(ORGANISM_SIZE / 2, Math.min(SCENE_WIDTH - ORGANISM_SIZE / 2, org.x + org.vx));
      org.y = Math.max(ORGANISM_SIZE / 2, Math.min(SCENE_HEIGHT - ORGANISM_SIZE / 2, org.y + org.vy));
    }
  }

  private randomWalk(org: Organism): void {
    const angle = Math.random() * Math.PI * 2;
    org.vx = Math.cos(angle) * this.params.moveSpeed;
    org.vy = Math.sin(angle) * this.params.moveSpeed;
  }

  private findNearestFood(org: Organism): Food | null {
    let nearest: Food | null = null;
    let minDist = VISION_RANGE;

    for (const food of this.foods) {
      const dx = food.x - org.x;
      const dy = food.y - org.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = food;
      }
    }
    return nearest;
  }

  private updateEating(): void {
    const foodsToRemove = new Set<number>();

    for (const org of this.organisms) {
      for (const food of this.foods) {
        if (foodsToRemove.has(food.id)) continue;

        const dx = food.x - org.x;
        const dy = food.y - org.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ORGANISM_SIZE / 2 + FOOD_RADIUS) {
          org.energy = Math.min(MAX_ENERGY, org.energy + ENERGY_FROM_FOOD);
          foodsToRemove.add(food.id);
        }
      }
    }

    if (foodsToRemove.size > 0) {
      this.foods = this.foods.filter((f) => !foodsToRemove.has(f.id));
    }
  }

  private updateEnergy(): void {
    for (const org of this.organisms) {
      org.energy -= ENERGY_PER_FRAME;
      org.age++;
    }
  }

  private updateBreeding(): void {
    const newOrganisms: Organism[] = [];

    for (const org of this.organisms) {
      const timeSinceBreed = this.elapsedTime - org.lastBreedTime;
      if (org.energy > BREED_ENERGY_THRESHOLD && timeSinceBreed >= this.BREED_INTERVAL) {
        org.energy -= BREED_ENERGY_COST;
        org.lastBreedTime = this.elapsedTime;

        const child = createOrganism(
          org.color,
          org.x + (Math.random() - 0.5) * ORGANISM_SIZE * 2,
          org.y + (Math.random() - 0.5) * ORGANISM_SIZE * 2,
          this.params.mutationRate,
          org.colorRGB,
          this.elapsedTime
        );
        newOrganisms.push(child);
      }
    }

    this.organisms.push(...newOrganisms);
  }

  private updateDeath(): void {
    this.organisms = this.organisms.filter((org) => org.energy > 0);
  }

  private updateFoodSpawn(): void {
    if (this.elapsedTime - this.lastFoodSpawn >= this.params.foodSpawnInterval) {
      const shortage = Math.max(0, INITIAL_FOOD_COUNT - this.foods.length);
      for (let i = 0; i < shortage; i++) {
        this.foods.push(createFood());
      }
      this.lastFoodSpawn = this.elapsedTime;
    }
  }

  private updateHistory(): void {
    if (this.elapsedTime - this.lastSampleTime >= this.SAMPLE_INTERVAL) {
      const counts = this.countSpecies();
      this.populationHistory.push({
        time: this.elapsedTime,
        red: counts.red,
        blue: counts.blue,
        green: counts.green,
      });

      const cutoff = this.elapsedTime - this.HISTORY_WINDOW;
      while (this.populationHistory.length > 1 && this.populationHistory[0].time < cutoff) {
        this.populationHistory.shift();
      }

      this.lastSampleTime = this.elapsedTime;
    }
  }

  private countSpecies(): { red: number; blue: number; green: number } {
    let red = 0,
      blue = 0,
      green = 0;
    for (const org of this.organisms) {
      switch (org.color) {
        case 'red':
          red++;
          break;
        case 'blue':
          blue++;
          break;
        case 'green':
          green++;
          break;
      }
    }
    return { red, blue, green };
  }

  getStats(): SimulationStats {
    const counts = this.countSpecies();
    let totalEnergy = 0;
    for (const org of this.organisms) {
      totalEnergy += org.energy;
    }
    const avgEnergy = this.organisms.length > 0 ? totalEnergy / this.organisms.length : 0;

    return {
      redCount: counts.red,
      blueCount: counts.blue,
      greenCount: counts.green,
      totalCount: this.organisms.length,
      averageEnergy: avgEnergy,
      foodCount: this.foods.length,
      elapsedTime: this.elapsedTime,
    };
  }

  getPopulationHistory(): PopulationSample[] {
    return this.populationHistory;
  }
}
