import { v4 as uuidv4 } from 'uuid';

export interface TreeConfig {
  growthSpeedMultiplier: number;
  nutrientExchangeRate: number;
  maxTreeCount: number;
  connectionDistance: number;
  initialNutrients: number;
  wiltThreshold: number;
  wiltDeathTime: number;
}

export const DEFAULT_TREE_CONFIG: TreeConfig = {
  growthSpeedMultiplier: 1,
  nutrientExchangeRate: 0.2,
  maxTreeCount: 100,
  connectionDistance: 80,
  initialNutrients: 100,
  wiltThreshold: 20,
  wiltDeathTime: 30,
};

export interface TreeData {
  id: string;
  x: number;
  y: number;
  age: number;
  growthProgress: number;
  nutrients: number;
  maxHeight: number;
  maxCanopyRadius: number;
  isWilting: boolean;
  wiltTime: number;
  isDead: boolean;
  trunkBranches: number;
  readonly currentHeight: number;
  readonly currentCanopyRadius: number;
  readonly colorGreen: string;
  readonly colorDarkGreen: string;
  readonly wiltColorShift: { r: number; g: number; b: number };
  getLeafOpacity(): number;
  getLeafCount(): number;
}

export interface NutrientParticleData {
  id: string;
  fromTreeId: string;
  toTreeId: string;
  progress: number;
  speed: number;
}

export interface ConnectionData {
  treeAId: string;
  treeBId: string;
  distance: number;
}

class Tree implements TreeData {
  id: string;
  x: number;
  y: number;
  age: number;
  growthProgress: number;
  nutrients: number;
  maxHeight: number;
  maxCanopyRadius: number;
  isWilting: boolean;
  wiltTime: number;
  isDead: boolean;
  trunkBranches: number;
  seedDelay: number;

  constructor(x: number, y: number, initialNutrients: number) {
    this.id = uuidv4();
    this.x = x;
    this.y = y;
    this.age = 0;
    this.growthProgress = 0;
    this.nutrients = initialNutrients;
    this.maxHeight = 60 + Math.random() * 40;
    this.maxCanopyRadius = 25 + Math.random() * 20;
    this.isWilting = false;
    this.wiltTime = 0;
    this.isDead = false;
    this.trunkBranches = Math.floor(2 + Math.random() * 3);
    this.seedDelay = Math.random() * 0.5;
  }

  get currentHeight(): number {
    const progress = Math.min(1, Math.max(0, this.growthProgress));
    const eased = 1 - Math.pow(1 - progress, 3);
    return this.maxHeight * eased;
  }

  get currentCanopyRadius(): number {
    const progress = Math.min(1, Math.max(0, this.growthProgress));
    const eased = 1 - Math.pow(1 - progress, 2);
    return this.maxCanopyRadius * eased;
  }

  get colorGreen(): string {
    const progress = Math.min(1, this.growthProgress);
    const r = Math.floor(80 + (1 - progress) * 80);
    const g = Math.floor(160 + progress * 60);
    const b = Math.floor(60 + (1 - progress) * 20);
    return `rgb(${r}, ${g}, ${b})`;
  }

  get colorDarkGreen(): string {
    const progress = Math.min(1, this.growthProgress);
    const r = Math.floor(40 + (1 - progress) * 40);
    const g = Math.floor(100 + progress * 30);
    const b = Math.floor(30 + (1 - progress) * 10);
    return `rgb(${r}, ${g}, ${b})`;
  }

  get wiltColorShift(): { r: number; g: number; b: number } {
    if (!this.isWilting) return { r: 0, g: 0, b: 0 };
    const wiltProgress = Math.min(1, this.wiltTime / 5);
    return {
      r: Math.floor(100 * wiltProgress),
      g: Math.floor(80 * wiltProgress),
      b: -Math.floor(30 * wiltProgress),
    };
  }

  update(deltaTime: number, growthMultiplier: number, wiltThreshold: number): void {
    if (this.isDead) return;

    this.age += deltaTime;

    if (this.growthProgress < 1) {
      const growthRate = (1 / 7) * growthMultiplier;
      this.growthProgress = Math.min(1, this.growthProgress + growthRate * deltaTime);
    }

    if (this.nutrients < wiltThreshold) {
      if (!this.isWilting) {
        this.isWilting = true;
        this.wiltTime = 0;
      }
      this.wiltTime += deltaTime;
    } else {
      if (this.isWilting && this.nutrients >= wiltThreshold * 1.5) {
        this.isWilting = false;
        this.wiltTime = 0;
      }
    }
  }

  checkDeath(wiltDeathTime: number): boolean {
    if (this.isWilting && this.wiltTime >= wiltDeathTime) {
      this.isDead = true;
      return true;
    }
    return false;
  }

  getLeafOpacity(): number {
    if (!this.isWilting) return 1;
    const fadeProgress = Math.min(1, this.wiltTime / 30);
    return 1 - fadeProgress * 0.5;
  }

  getLeafCount(): number {
    const baseCount = Math.floor(8 + this.growthProgress * 12);
    if (!this.isWilting) return baseCount;
    const fadeProgress = Math.min(1, this.wiltTime / 20);
    return Math.max(2, Math.floor(baseCount * (1 - fadeProgress * 0.7)));
  }
}

class NutrientParticle implements NutrientParticleData {
  id: string;
  fromTreeId: string;
  toTreeId: string;
  progress: number;
  speed: number;
  active: boolean;

  constructor(fromTreeId: string, toTreeId: string) {
    this.id = uuidv4();
    this.fromTreeId = fromTreeId;
    this.toTreeId = toTreeId;
    this.progress = 0;
    this.speed = 0.3 + Math.random() * 0.4;
    this.active = true;
  }
}

export class TreeEngine {
  private trees: Map<string, Tree> = new Map();
  private particles: NutrientParticle[] = [];
  private particlePool: NutrientParticle[] = [];
  private connections: ConnectionData[] = [];
  private config: TreeConfig;
  private lastParticleSpawn: Map<string, number> = new Map();

  constructor(config: Partial<TreeConfig> = {}) {
    this.config = { ...DEFAULT_TREE_CONFIG, ...config };
  }

  updateConfig(config: Partial<TreeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): TreeConfig {
    return { ...this.config };
  }

  addTree(x: number, y: number): TreeData | null {
    if (this.trees.size >= this.config.maxTreeCount) {
      return null;
    }
    const tree = new Tree(x, y, this.config.initialNutrients);
    this.trees.set(tree.id, tree);
    return tree;
  }

  removeTree(id: string): boolean {
    return this.trees.delete(id);
  }

  getTree(id: string): TreeData | undefined {
    return this.trees.get(id);
  }

  getAllTrees(): TreeData[] {
    return Array.from(this.trees.values());
  }

  getTreeCount(): number {
    return this.trees.size;
  }

  getConnections(): ConnectionData[] {
    return this.connections;
  }

  getParticles(): NutrientParticleData[] {
    return this.particles.filter(p => p.active);
  }

  getNeighbors(treeId: string): TreeData[] {
    const tree = this.trees.get(treeId);
    if (!tree) return [];
    return this.connections
      .filter(c => c.treeAId === treeId || c.treeBId === treeId)
      .map(c => {
        const neighborId = c.treeAId === treeId ? c.treeBId : c.treeAId;
        return this.trees.get(neighborId)!;
      })
      .filter(Boolean);
  }

  update(deltaTime: number): void {
    const treesArray = Array.from(this.trees.values());

    for (const tree of treesArray) {
      tree.update(deltaTime, this.config.growthSpeedMultiplier, this.config.wiltThreshold);
    }

    this.updateConnections();
    this.exchangeNutrients(deltaTime);
    this.updateParticles(deltaTime);

    for (const tree of treesArray) {
      if (tree.checkDeath(this.config.wiltDeathTime)) {
        this.trees.delete(tree.id);
      }
    }
  }

  private updateConnections(): void {
    this.connections = [];
    const treesArray = Array.from(this.trees.values());

    for (let i = 0; i < treesArray.length; i++) {
      for (let j = i + 1; j < treesArray.length; j++) {
      const treeA = treesArray[i];
      const treeB = treesArray[j];
      const dx = treeA.x - treeB.x;
      const dy = treeA.y - treeB.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.config.connectionDistance) {
        this.connections.push({
          treeAId: treeA.id,
          treeBId: treeB.id,
          distance,
        });
      }
    }
    }
  }

  private exchangeNutrients(deltaTime: number): void {
    const rate = this.config.nutrientExchangeRate * deltaTime * 60;

    for (const conn of this.connections) {
      const treeA = this.trees.get(conn.treeAId);
      const treeB = this.trees.get(conn.treeBId);
      if (!treeA || !treeB || treeA.isDead || treeB.isDead) continue;

      const diff = treeA.nutrients - treeB.nutrients;
      const transfer = diff * rate * 0.5;

      if (Math.abs(transfer) > 0.01) {
        treeA.nutrients -= transfer;
        treeB.nutrients += transfer;

        const fromTree = diff > 0 ? treeA : treeB;
        const toTree = diff > 0 ? treeB : treeA;
        const connKey = `${fromTree.id}-${toTree.id}`;
        const lastSpawn = this.lastParticleSpawn.get(connKey) || 0;

        if (Date.now() - lastSpawn > 800 + Math.random() * 400) {
          this.spawnParticle(fromTree.id, toTree.id);
          this.lastParticleSpawn.set(connKey, Date.now());
        }
      }
    }
  }

  private spawnParticle(fromId: string, toId: string): void {
    let particle: NutrientParticle;
    if (this.particlePool.length > 0) {
      particle = this.particlePool.pop()!;
      particle.fromTreeId = fromId;
      particle.toTreeId = toId;
      particle.progress = 0;
      particle.speed = 0.3 + Math.random() * 0.4;
      particle.active = true;
    } else {
      particle = new NutrientParticle(fromId, toId);
    }
    this.particles.push(particle);
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (!particle.active) continue;

      particle.progress += particle.speed * deltaTime;

      if (particle.progress >= 1) {
        particle.active = false;
        this.particles.splice(i, 1);
        if (this.particlePool.length < 50) {
          this.particlePool.push(particle);
        }
      }
    }
  }

  findTreeAtPosition(x: number, y: number): TreeData | null {
    for (const tree of this.trees.values()) {
      if (tree.isDead) continue;
      const dx = x - tree.x;
      const dy = y - (tree.y - tree.currentHeight);
      const canopyRadius = tree.currentCanopyRadius;

      if (dx * dx + dy * dy < canopyRadius * canopyRadius) {
        return tree;
      }

      const trunkWidth = 4 + tree.growthProgress * 6;
      if (Math.abs(dx) < trunkWidth && y > tree.y - tree.currentHeight && y < tree.y) {
        return tree;
      }
    }
    return null;
  }
}
