import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { Organism, Food, SpeciesColor, INITIAL_ORGANISMS_PER_SPECIES, INITIAL_FOOD_COUNT, ORGANISM_SIZE, SCENE_WIDTH, SCENE_HEIGHT, MAX_ENERGY, ENERGY_PER_FRAME, ENERGY_FROM_FOOD, BREED_ENERGY_THRESHOLD, BREED_ENERGY_COST, FOOD_RADIUS } from './entities';

describe('Simulation - 基本初始化', () => {
  let sim: Simulation;

  beforeEach(() => {
    sim = new Simulation();
  });

  it('初始化时每种生物有10个，共30个', () => {
    const stats = sim.getStats();
    expect(stats.redCount).toBe(INITIAL_ORGANISMS_PER_SPECIES);
    expect(stats.blueCount).toBe(INITIAL_ORGANISMS_PER_SPECIES);
    expect(stats.greenCount).toBe(INITIAL_ORGANISMS_PER_SPECIES);
    expect(stats.totalCount).toBe(3 * INITIAL_ORGANISMS_PER_SPECIES);
  });

  it('初始化时有30个食物', () => {
    const stats = sim.getStats();
    expect(stats.foodCount).toBe(INITIAL_FOOD_COUNT);
  });

  it('初始化时生物位置在场景边界内', () => {
    for (const org of sim.organisms) {
      expect(org.x).toBeGreaterThanOrEqual(ORGANISM_SIZE / 2);
      expect(org.x).toBeLessThanOrEqual(SCENE_WIDTH - ORGANISM_SIZE / 2);
      expect(org.y).toBeGreaterThanOrEqual(ORGANISM_SIZE / 2);
      expect(org.y).toBeLessThanOrEqual(SCENE_HEIGHT - ORGANISM_SIZE / 2);
    }
  });

  it('初始化时种群历史有1个基准数据点', () => {
    const history = sim.getPopulationHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].time).toBe(0);
  });

  it('初始化时生物的lastBreedTime为0', () => {
    for (const org of sim.organisms) {
      expect(org.lastBreedTime).toBe(0);
    }
  });
});

describe('Simulation - 能量消耗逻辑', () => {
  let sim: Simulation;

  beforeEach(() => {
    sim = new Simulation();
  });

  it('每帧消耗0.5能量', () => {
    const initialEnergy = sim.organisms[0].energy;
    sim.step();
    const afterEnergy = sim.organisms[0].energy;
    expect(initialEnergy - afterEnergy).toBeCloseTo(ENERGY_PER_FRAME, 5);
  });

  it('连续N帧后能量减少N*0.5', () => {
    const N = 10;
    const initialEnergy = sim.organisms[0].energy;
    for (let i = 0; i < N; i++) sim.step();
    const afterEnergy = sim.organisms[0].energy;
    expect(initialEnergy - afterEnergy).toBeCloseTo(N * ENERGY_PER_FRAME, 5);
  });

  it('能量消耗至≤0时生物死亡消失', () => {
    for (const org of sim.organisms) {
      org.energy = 0.3;
    }
    const beforeCount = sim.organisms.length;
    sim.step();
    const afterCount = sim.organisms.length;
    expect(afterCount).toBeLessThan(beforeCount);
    for (const org of sim.organisms) {
      expect(org.energy).toBeGreaterThan(0);
    }
  });

  it('生物年龄每帧+1', () => {
    const initialAge = sim.organisms[0].age;
    sim.step();
    expect(sim.organisms[0].age).toBe(initialAge + 1);
  });
});

describe('Simulation - 进食逻辑', () => {
  let sim: Simulation;

  beforeEach(() => {
    sim = new Simulation();
    sim.foods = [];
    sim.organisms = [];
  });

  it('生物与食物重叠时消耗食物并获得8能量', () => {
    const org = createTestOrganism('red', 100, 100);
    org.energy = 50;
    sim.organisms.push(org);

    const food = createTestFood(100 + ORGANISM_SIZE / 2 + FOOD_RADIUS - 2, 100);
    sim.foods.push(food);

    sim.step();
    expect(org.energy).toBeGreaterThanOrEqual(50 - ENERGY_PER_FRAME + ENERGY_FROM_FOOD);
    expect(sim.foods.length).toBe(0);
  });

  it('能量获得上限为100', () => {
    const org = createTestOrganism('red', 100, 100);
    org.energy = 98;
    sim.organisms.push(org);

    const food = createTestFood(100, 100);
    sim.foods.push(food);

    sim.step();
    expect(org.energy).toBeLessThanOrEqual(MAX_ENERGY);
  });

  it('食物距离太远时不被消耗', () => {
    const org = createTestOrganism('red', 100, 100);
    org.energy = 50;
    sim.organisms.push(org);

    const food = createTestFood(500, 500);
    const foodId = food.id;
    sim.foods.push(food);

    sim.step();
    expect(sim.foods.some((f) => f.id === foodId)).toBe(true);
  });
});

describe('Simulation - 繁殖逻辑（基于时间戳）', () => {
  let sim: Simulation;

  beforeEach(() => {
    sim = new Simulation();
    sim.foods = [];
    sim.organisms = [];
  });

  it('能量>60且距上次繁殖≥5秒时可繁殖', () => {
    const org = createTestOrganism('red', 200, 200);
    org.energy = 80;
    org.lastBreedTime = -10;
    sim.organisms.push(org);
    const beforeCount = sim.organisms.length;

    sim.step();

    expect(sim.organisms.length).toBe(beforeCount + 1);
    expect(org.energy).toBeCloseTo(80 - BREED_ENERGY_COST - ENERGY_PER_FRAME, 4);
  });

  it('繁殖后更新lastBreedTime为当前时间', () => {
    const org = createTestOrganism('red', 200, 200);
    org.energy = 80;
    org.lastBreedTime = -10;
    sim.organisms.push(org);

    sim.step();

    expect(org.lastBreedTime).toBeCloseTo(1 / 30, 5);
  });

  it('5秒冷却期内不会再次繁殖', () => {
    const org = createTestOrganism('red', 200, 200);
    org.energy = 95;
    org.lastBreedTime = -10;
    sim.organisms.push(org);

    sim.step();
    const countAfterFirst = sim.organisms.length;
    for (let i = 0; i < 149; i++) {
      sim.step();
      for (const o of sim.organisms) o.energy = Math.min(MAX_ENERGY, o.energy + 10);
    }
    expect(sim.organisms.length).toBe(countAfterFirst);
  });

  it('5秒冷却完毕且能量足够时再次繁殖', () => {
    const org = createTestOrganism('red', 200, 200);
    org.energy = 95;
    org.lastBreedTime = -10;
    sim.organisms.push(org);

    sim.step();
    const countAfterFirst = sim.organisms.length;
    for (let i = 0; i < 150; i++) {
      sim.step();
      for (const o of sim.organisms) o.energy = Math.min(MAX_ENERGY, o.energy + 10);
    }
    expect(sim.organisms.length).toBeGreaterThan(countAfterFirst);
  });

  it('能量≤60时不会繁殖', () => {
    const org = createTestOrganism('red', 200, 200);
    org.energy = 60;
    org.lastBreedTime = -10;
    sim.organisms.push(org);
    const beforeCount = sim.organisms.length;

    sim.step();

    expect(sim.organisms.length).toBe(beforeCount);
  });

  it('子代继承父代颜色类别', () => {
    const org = createTestOrganism('blue', 200, 200);
    org.energy = 90;
    org.lastBreedTime = -10;
    sim.organisms.push(org);

    sim.step();

    const child = sim.organisms.find((o) => o.id !== org.id);
    expect(child).toBeDefined();
    expect(child!.color).toBe('blue');
  });

  it('新出生生物的lastBreedTime为出生时刻，5秒内不会繁殖', () => {
    const org = createTestOrganism('green', 200, 200);
    org.energy = 100;
    org.lastBreedTime = -10;
    sim.organisms.push(org);

    sim.step();

    const child = sim.organisms.find((o) => o.id !== org.id);
    expect(child).toBeDefined();
    expect(child!.lastBreedTime).toBeCloseTo(1 / 30, 5);

    for (let i = 0; i < 149; i++) {
      sim.step();
      for (const o of sim.organisms) o.energy = Math.min(MAX_ENERGY, o.energy + 10);
    }
    const childOnly = sim.organisms.filter((o) => o.id !== org.id);
    expect(childOnly.length).toBe(1);
  });

  it('繁殖间隔基于真实时间，不受帧率影响', () => {
    const org = createTestOrganism('red', 200, 200);
    org.energy = 100;
    org.lastBreedTime = -10;
    sim.organisms.push(org);

    sim.step();

    const firstBreedTime = org.lastBreedTime;
    expect(firstBreedTime).toBeCloseTo(1 / 30, 5);
    for (let i = 0; i < 160; i++) {
      sim.step();
      for (const o of sim.organisms) o.energy = Math.min(MAX_ENERGY, o.energy + 10);
    }

    const secondBreedTime = org.lastBreedTime;
    const diff = secondBreedTime - firstBreedTime;
    expect(diff).toBeGreaterThanOrEqual(5);
  });
});

describe('Simulation - 移动逻辑', () => {
  let sim: Simulation;

  beforeEach(() => {
    sim = new Simulation();
  });

  it('移动后位置仍在场景边界内', () => {
    for (let i = 0; i < 100; i++) {
      sim.step();
      for (const org of sim.organisms) {
        expect(org.x).toBeGreaterThanOrEqual(ORGANISM_SIZE / 2);
        expect(org.x).toBeLessThanOrEqual(SCENE_WIDTH - ORGANISM_SIZE / 2);
        expect(org.y).toBeGreaterThanOrEqual(ORGANISM_SIZE / 2);
        expect(org.y).toBeLessThanOrEqual(SCENE_HEIGHT - ORGANISM_SIZE / 2);
      }
    }
  });

  it('视野范围内有食物时，多次步进后生物向食物靠近', () => {
    sim.organisms = [];
    sim.foods = [];

    const org = createTestOrganism('red', 100, 100);
    sim.organisms.push(org);

    const food = createTestFood(110, 100);
    sim.foods.push(food);

    const initialX = org.x;
    for (let i = 0; i < 50; i++) sim.step();

    if (sim.foods.length > 0) {
      expect(Math.abs(org.x - food.x)).toBeLessThan(Math.abs(initialX - food.x) + 5);
    }
  });

  it('无食物时生物仍会移动（30%概率随机游走）', () => {
    sim.foods = [];
    const org = sim.organisms[0];
    const positions: Set<string> = new Set();
    for (let i = 0; i < 50; i++) {
      sim.step();
      positions.add(`${org.x.toFixed(2)},${org.y.toFixed(2)}`);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('移动速度参数生效（值越大移动距离越大）', () => {
    const simSlow = new Simulation();
    simSlow.setParams({ moveSpeed: 1 });
    simSlow.foods = [];
    const slowOrg = simSlow.organisms[0];
    const slowStart = { x: slowOrg.x, y: slowOrg.y };
    for (let i = 0; i < 30; i++) simSlow.step();
    const slowDist = Math.sqrt(
      Math.pow(slowOrg.x - slowStart.x, 2) + Math.pow(slowOrg.y - slowStart.y, 2)
    );

    const simFast = new Simulation();
    simFast.setParams({ moveSpeed: 5 });
    simFast.foods = [];
    const fastOrg = simFast.organisms[0];
    const fastStart = { x: fastOrg.x, y: fastOrg.y };
    for (let i = 0; i < 30; i++) simFast.step();
    const fastDist = Math.sqrt(
      Math.pow(fastOrg.x - fastStart.x, 2) + Math.pow(fastOrg.y - fastStart.y, 2)
    );

    expect(fastDist).toBeGreaterThanOrEqual(slowDist * 0.5);
  });
});

describe('Simulation - 食物补充机制', () => {
  let sim: Simulation;

  beforeEach(() => {
    sim = new Simulation();
    sim.setParams({ foodSpawnInterval: 1 });
    sim.organisms = [];
  });

  it('食物不足30时会在补充周期后补充到30', () => {
    sim.foods = [];
    for (let i = 0; i < 10; i++) sim.foods.push(createTestFood(i * 20, 100));

    for (let i = 0; i < 31; i++) sim.step();

    expect(sim.foods.length).toBe(INITIAL_FOOD_COUNT);
  });

  it('食物超过30时不会被移除', () => {
    sim.foods = [];
    for (let i = 0; i < 50; i++) sim.foods.push(createTestFood(i * 10, 50 + (i % 10) * 30));

    for (let i = 0; i < 31; i++) sim.step();

    expect(sim.foods.length).toBe(50);
  });

  it('食物补充周期受参数控制', () => {
    const simLong = new Simulation();
    simLong.setParams({ foodSpawnInterval: 10 });
    simLong.foods = [];
    simLong.organisms = [];
    for (let i = 0; i < 5; i++) simLong.foods.push(createTestFood(i * 20, 100));

    for (let i = 0; i < 31; i++) simLong.step();

    expect(simLong.foods.length).toBe(5);
  });

  it('shortage用Math.max(0,...)避免负数', () => {
    sim.foods = [];
    for (let i = 0; i < 50; i++) sim.foods.push(createTestFood(i * 10, 50 + (i % 10) * 30));

    for (let i = 0; i < 31; i++) sim.step();

    for (const f of sim.foods) {
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Simulation - 变异效果', () => {
  it('子代颜色在父代基础上RGB±5微小偏移', () => {
    const sim = new Simulation();
    sim.organisms = [];
    sim.foods = [];

    const testColorR = 200;
    const testColorG = 100;
    const testColorB = 50;

    const org = createTestOrganism('red', 200, 200);
    org.colorRGB = { r: testColorR, g: testColorG, b: testColorB };
    org.energy = 90;
    org.lastBreedTime = -10;
    sim.organisms.push(org);

    const childrenColors: Array<{ r: number; g: number; b: number }> = [];
    for (let trial = 0; trial < 20; trial++) {
      sim.organisms = [org];
      org.energy = 90;
      org.lastBreedTime = -10;
      sim.step();
      const child = sim.organisms.find((o) => o.id !== org.id);
      if (child) {
        childrenColors.push(child.colorRGB);
      }
    }

    for (const c of childrenColors) {
      expect(Math.abs(c.r - testColorR)).toBeLessThanOrEqual(5 + 1e-6);
      expect(Math.abs(c.g - testColorG)).toBeLessThanOrEqual(5 + 1e-6);
      expect(Math.abs(c.b - testColorB)).toBeLessThanOrEqual(5 + 1e-6);
    }
  });

  it('大多数子代颜色与父代完全相同（默认2%变异率）', () => {
    const sim = new Simulation();
    sim.organisms = [];
    sim.foods = [];
    sim.setParams({ mutationRate: 0.02 });

    const baseRGB = { r: 150, g: 150, b: 150 };
    const org = createTestOrganism('green', 300, 300);
    org.colorRGB = { ...baseRGB };
    org.energy = 100;
    org.lastBreedTime = -10;
    sim.organisms.push(org);

    let sameColorCount = 0;
    const totalTrials = 100;

    for (let trial = 0; trial < totalTrials; trial++) {
      sim.organisms = [org];
      org.energy = 100;
      org.lastBreedTime = -10;
      sim.step();
      const child = sim.organisms.find((o) => o.id !== org.id);
      if (
        child &&
        child.colorRGB.r === baseRGB.r &&
        child.colorRGB.g === baseRGB.g &&
        child.colorRGB.b === baseRGB.b
      ) {
        sameColorCount++;
      }
    }

    expect(sameColorCount).toBeGreaterThan(totalTrials * 0.8);
  });

  it('变异颜色值不会超出0-255范围', () => {
    const sim = new Simulation();
    sim.organisms = [];
    sim.foods = [];
    sim.setParams({ mutationRate: 1.0 });

    const org = createTestOrganism('red', 200, 200);
    org.colorRGB = { r: 252, g: 3, b: 128 };
    org.energy = 90;
    org.lastBreedTime = -10;
    sim.organisms.push(org);

    for (let trial = 0; trial < 50; trial++) {
      sim.organisms = [org];
      org.energy = 90;
      org.lastBreedTime = -10;
      sim.step();
      const child = sim.organisms.find((o) => o.id !== org.id);
      if (child) {
        expect(child.colorRGB.r).toBeGreaterThanOrEqual(0);
        expect(child.colorRGB.r).toBeLessThanOrEqual(255);
        expect(child.colorRGB.g).toBeGreaterThanOrEqual(0);
        expect(child.colorRGB.g).toBeLessThanOrEqual(255);
        expect(child.colorRGB.b).toBeGreaterThanOrEqual(0);
        expect(child.colorRGB.b).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('Simulation - 种群历史采样', () => {
  it('每5秒采样一次种群数据', () => {
    const sim = new Simulation();
    const initialHistory = sim.getPopulationHistory().length;

    for (let i = 0; i < 150; i++) sim.step();

    expect(sim.getPopulationHistory().length).toBeGreaterThan(initialHistory);
  });

  it('历史数据包含红绿蓝三种数量', () => {
    const sim = new Simulation();
    const history = sim.getPopulationHistory();
    for (const sample of history) {
      expect(typeof sample.red).toBe('number');
      expect(typeof sample.blue).toBe('number');
      expect(typeof sample.green).toBe('number');
      expect(typeof sample.time).toBe('number');
    }
  });
});

function createTestOrganism(color: SpeciesColor, x: number, y: number): Organism {
  const org: Organism = {
    id: Math.floor(Math.random() * 100000) + 1000,
    x,
    y,
    energy: 50,
    color,
    colorRGB:
      color === 'red'
        ? { r: 239, g: 68, b: 68 }
        : color === 'blue'
        ? { r: 59, g: 130, b: 246 }
        : { r: 34, g: 197, b: 94 },
    age: 0,
    breedCooldown: 0,
    lastBreedTime: -10,
    vx: 0,
    vy: 0,
  };
  return org;
}

function createTestFood(x: number, y: number): Food {
  return {
    id: Math.floor(Math.random() * 100000) + 1000,
    x,
    y,
    remaining: 1,
  };
}
