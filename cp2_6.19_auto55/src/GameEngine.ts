export type BuildingType = 'fisherman' | 'hotel' | 'restaurant' | 'lighthouse' | 'garden';

export const BUILDING_TYPES: BuildingType[] = ['fisherman', 'hotel', 'restaurant', 'lighthouse', 'garden'];

export const BUILDING_COLORS: Record<BuildingType, string> = {
  fisherman: '#8B4513',
  hotel: '#CD5C5C',
  restaurant: '#FF8C00',
  lighthouse: '#F5F5DC',
  garden: '#32CD32',
};

export const BUILDING_NAMES: Record<BuildingType, string> = {
  fisherman: '渔屋',
  hotel: '旅馆',
  restaurant: '餐厅',
  lighthouse: '灯塔',
  garden: '花圃',
};

export const BUILDING_DARK_COLORS: Record<BuildingType, string> = {
  fisherman: '#5C3317',
  hotel: '#8B3A3A',
  restaurant: '#CC7000',
  lighthouse: '#C8C8A0',
  garden: '#228B22',
};

export const GRID_SIZE = 20;
export const MAX_BUILDINGS = 50;
export const MAX_TOURISTS = 30;
export const DOCK_COLUMN = 0;

const GOLD_RATES: Record<BuildingType, number[]> = {
  fisherman: [5, 10, 15, 20, 25],
  hotel: [0, 0, 0, 0, 0],
  restaurant: [8, 16, 24, 32, 40],
  lighthouse: [0, 0, 0, 0, 0],
  garden: [3, 6, 9, 12, 15],
};

const CAPACITIES: Record<BuildingType, number[]> = {
  fisherman: [0, 0, 0, 0, 0],
  hotel: [3, 6, 9, 12, 15],
  restaurant: [0, 0, 0, 0, 0],
  lighthouse: [0, 0, 0, 0, 0],
  garden: [0, 0, 0, 0, 0],
};

export const TOURIST_COLORS = ['#FF4444', '#FFD700', '#4488FF', '#44DD44'];
const TOURIST_CONSUME_TIME = 1.5;
const TOURIST_SPAWN_INTERVAL = 3;

export interface Building {
  id: number;
  type: BuildingType;
  gridX: number;
  gridY: number;
  level: number;
  isUpgrading: boolean;
  upgradeProgress: number;
  upgradeStartTime: number;
  placeAnimStartTime: number;
  selected: boolean;
}

export interface Tourist {
  id: number;
  x: number;
  y: number;
  color: number;
  targetBuildingId: number;
  path: { x: number; y: number }[];
  pathIndex: number;
  isConsuming: boolean;
  consumeTimer: number;
  bobPhase: number;
  coinBubble: CoinBubble | null;
  speed: number;
  alive: boolean;
  fadeOut: boolean;
  fadeTimer: number;
}

export interface CoinBubble {
  startTime: number;
  amount: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Transaction {
  timestamp: number;
  buildingType: BuildingType;
  amount: number;
  touristColor: number;
  slideProgress: number;
}

export class GameEngine {
  grid: (number | null)[][];
  buildings: Map<number, Building>;
  tourists: Tourist[];
  particles: Particle[];
  transactions: Transaction[];

  gold = 0;
  todayTourists = 0;
  totalIncome = 0;

  selectedBuildingId: number | null = null;
  showStats = false;
  showUpgradeMenu = false;
  upgradeMenuBuildingId = -1;
  statsOpenTime = 0;

  private nextBuildingId = 1;
  private nextTouristId = 1;
  private touristSpawnTimer = 0;
  private goldAccumulator: Map<number, number> = new Map();
  private audioManager: { playPlaceSound(): void; playUpgradeSound(): void; playCoinSound(): void } | null = null;
  private lastTime = 0;
  private justCompletedUpgrades: { buildingId: number; gx: number; gy: number; color: string }[] = [];

  constructor() {
    this.grid = Array.from({ length: GRID_SIZE }, () => Array<number | null>(GRID_SIZE).fill(null));
    this.buildings = new Map();
    this.tourists = [];
    this.particles = [];
    this.transactions = [];
    this.lastTime = performance.now();
  }

  setAudioManager(am: { playPlaceSound(): void; playUpgradeSound(): void; playCoinSound(): void }): void {
    this.audioManager = am;
  }

  getBuildingGoldRate(b: Building): number {
    const base = GOLD_RATES[b.type][b.level - 1];
    let bonus = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = b.gridX + dx;
        const ny = b.gridY + dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const adjId = this.grid[ny][nx];
        if (adjId !== null) {
          const adj = this.buildings.get(adjId);
          if (adj && adj.type === 'lighthouse') {
            bonus += adj.level * 0.1;
          }
        }
      }
    }
    return base * (1 + bonus);
  }

  getBuildingCapacity(b: Building): number {
    return CAPACITIES[b.type][b.level - 1];
  }

  getTotalTouristCapacity(): number {
    let cap = 0;
    this.buildings.forEach(b => {
      if (b.type === 'hotel') cap += this.getBuildingCapacity(b);
    });
    return cap;
  }

  canPlaceBuilding(gridX: number, gridY: number): boolean {
    if (gridX <= DOCK_COLUMN || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) return false;
    if (this.grid[gridY][gridX] !== null) return false;
    if (this.buildings.size >= MAX_BUILDINGS) return false;
    return true;
  }

  placeBuilding(type: BuildingType, gridX: number, gridY: number): Building | null {
    if (!this.canPlaceBuilding(gridX, gridY)) return null;
    const id = this.nextBuildingId++;
    const now = performance.now();
    const building: Building = {
      id, type, gridX, gridY,
      level: 1,
      isUpgrading: false,
      upgradeProgress: 0,
      upgradeStartTime: 0,
      placeAnimStartTime: now,
      selected: false,
    };
    this.buildings.set(id, building);
    this.grid[gridY][gridX] = id;
    this.goldAccumulator.set(id, 0);
    if (this.audioManager) this.audioManager.playPlaceSound();
    return building;
  }

  moveBuilding(buildingId: number, newGridX: number, newGridY: number): boolean {
    const b = this.buildings.get(buildingId);
    if (!b) return false;
    if (newGridX === b.gridX && newGridY === b.gridY) return true;
    if (!this.canPlaceBuilding(newGridX, newGridY)) return false;
    this.grid[b.gridY][b.gridX] = null;
    b.gridX = newGridX;
    b.gridY = newGridY;
    b.placeAnimStartTime = performance.now();
    this.grid[newGridY][newGridX] = buildingId;
    return true;
  }

  startUpgrade(buildingId: number): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || b.level >= 5 || b.isUpgrading) return false;
    const cost = this.getUpgradeCost(buildingId);
    if (this.gold < cost) return false;
    this.gold -= cost;
    b.isUpgrading = true;
    b.upgradeProgress = 0;
    b.upgradeStartTime = performance.now();
    if (this.audioManager) this.audioManager.playUpgradeSound();
    this.showUpgradeMenu = false;
    this.upgradeMenuBuildingId = -1;
    return true;
  }

  getUpgradeCost(buildingId: number): number {
    const b = this.buildings.get(buildingId);
    if (!b) return Infinity;
    return b.level * 20;
  }

  selectBuilding(id: number | null): void {
    if (this.selectedBuildingId !== null) {
      const prev = this.buildings.get(this.selectedBuildingId);
      if (prev) prev.selected = false;
    }
    this.selectedBuildingId = id;
    if (id !== null) {
      const b = this.buildings.get(id);
      if (b) b.selected = true;
    }
  }

  toggleStats(): void {
    this.showStats = !this.showStats;
    if (this.showStats) {
      this.statsOpenTime = performance.now();
    }
  }

  showUpgradeMenuFor(buildingId: number): void {
    this.showUpgradeMenu = true;
    this.upgradeMenuBuildingId = buildingId;
  }

  closeUpgradeMenu(): void {
    this.showUpgradeMenu = false;
    this.upgradeMenuBuildingId = -1;
  }

  getBuildingAt(gridX: number, gridY: number): Building | null {
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) return null;
    const id = this.grid[gridY][gridX];
    if (id === null) return null;
    return this.buildings.get(id) || null;
  }

  getBuildingProductionByType(): Record<BuildingType, number> {
    const result: Record<BuildingType, number> = { fisherman: 0, hotel: 0, restaurant: 0, lighthouse: 0, garden: 0 };
    this.buildings.forEach(b => { result[b.type] += this.getBuildingGoldRate(b); });
    return result;
  }

  consumeJustCompletedUpgrades(): { buildingId: number; gx: number; gy: number; color: string }[] {
    const result = this.justCompletedUpgrades;
    this.justCompletedUpgrades = [];
    return result;
  }

  private spawnTourist(): void {
    if (this.tourists.filter(t => t.alive).length >= MAX_TOURISTS) return;
    if (this.tourists.filter(t => t.alive).length >= this.getTotalTouristCapacity()) return;
    const targets: Building[] = [];
    this.buildings.forEach(b => {
      if (b.type === 'hotel' || b.type === 'restaurant') targets.push(b);
    });
    if (targets.length === 0) return;
    const target = targets[Math.floor(Math.random() * targets.length)];
    let spawnY = -1;
    for (let attempt = 0; attempt < 20; attempt++) {
      const y = Math.floor(Math.random() * GRID_SIZE);
      if (this.grid[y][1] === null) { spawnY = y; break; }
    }
    if (spawnY === -1) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (this.grid[y][1] === null) { spawnY = y; break; }
      }
    }
    if (spawnY === -1) return;
    const path = this.findPath(1, spawnY, target.gridX, target.gridY);
    if (!path || path.length === 0) return;
    const tourist: Tourist = {
      id: this.nextTouristId++,
      x: 0.5,
      y: spawnY,
      color: Math.floor(Math.random() * 4),
      targetBuildingId: target.id,
      path,
      pathIndex: 0,
      isConsuming: false,
      consumeTimer: 0,
      bobPhase: Math.random() * Math.PI * 2,
      coinBubble: null,
      speed: 1.5 + Math.random() * 1.0,
      alive: true,
      fadeOut: false,
      fadeTimer: 0,
    };
    this.tourists.push(tourist);
    this.todayTourists++;
  }

  private findPath(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number }[] | null {
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    const parent: ({ x: number; y: number } | null)[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    const queue: { x: number; y: number }[] = [{ x: fromX, y: fromY }];
    visited[fromY][fromX] = true;
    const isWalkable = (x: number, y: number): boolean => {
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
      if (x === toX && y === toY) return true;
      if (x === DOCK_COLUMN) return true;
      return this.grid[y][x] === null;
    };
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.x === toX && curr.y === toY) {
        const path: { x: number; y: number }[] = [];
        let node: { x: number; y: number } | null = curr;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          const p = parent[node.y][node.x];
          node = p;
        }
        return path;
      }
      for (const [dx, dy] of dirs) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        if (visited[ny][nx]) continue;
        if (!isWalkable(nx, ny)) continue;
        visited[ny][nx] = true;
        parent[ny][nx] = curr;
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  private spawnUpgradeParticles(gx: number, gy: number, color: string): void {
    const cx = gx + 0.5;
    const cy = gy + 0.5;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5;
      const spd = 1.5 + Math.random() * 2;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        color,
        size: 1.5 + Math.random() * 1.5,
      });
    }
  }

  update(currentTime: number): void {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.buildings.forEach(b => {
      if (b.isUpgrading) {
        b.upgradeProgress = Math.min(1, (currentTime - b.upgradeStartTime) / 1000);
        if (b.upgradeProgress >= 1) {
          b.level++;
          b.isUpgrading = false;
          b.upgradeProgress = 0;
          this.justCompletedUpgrades.push({ buildingId: b.id, gx: b.gridX, gy: b.gridY, color: BUILDING_COLORS[b.type] });
        }
      }
    });

    const completedUpgrades = this.consumeJustCompletedUpgrades();
    for (const u of completedUpgrades) {
      this.spawnUpgradeParticles(u.gx, u.gy, u.color);
    }

    this.buildings.forEach(b => {
      const rate = this.getBuildingGoldRate(b);
      if (rate > 0) {
        const goldThisFrame = (rate / 60) * dt;
        let acc = this.goldAccumulator.get(b.id) || 0;
        acc += goldThisFrame;
        if (acc >= 1) {
          const whole = Math.floor(acc);
          this.gold += whole;
          this.totalIncome += whole;
          acc -= whole;
        }
        this.goldAccumulator.set(b.id, acc);
      }
    });

    this.touristSpawnTimer += dt;
    if (this.touristSpawnTimer >= TOURIST_SPAWN_INTERVAL) {
      this.touristSpawnTimer -= TOURIST_SPAWN_INTERVAL;
      this.spawnTourist();
    }

    for (const t of this.tourists) {
      if (!t.alive && !t.fadeOut) continue;

      t.bobPhase += dt * 8;

      if (t.coinBubble) {
        const elapsed = (currentTime - t.coinBubble.startTime) / 300;
        if (elapsed >= 1) t.coinBubble = null;
      }

      if (t.fadeOut) {
        t.fadeTimer += dt;
        if (t.fadeTimer >= 0.5) t.alive = false;
        continue;
      }

      if (t.isConsuming) {
        t.consumeTimer -= dt;
        if (t.consumeTimer <= 0) {
          const b = this.buildings.get(t.targetBuildingId);
          if (b) {
            const amount = this.getBuildingGoldRate(b) > 0 ? Math.max(1, Math.ceil(this.getBuildingGoldRate(b) / 5)) : 3;
            t.coinBubble = { startTime: currentTime, amount };
            this.gold += amount;
            this.totalIncome += amount;
            this.transactions.push({
              timestamp: Date.now(),
              buildingType: b.type,
              amount,
              touristColor: t.color,
              slideProgress: 0,
            });
            if (this.transactions.length > 10) this.transactions.shift();
            if (this.audioManager) this.audioManager.playCoinSound();
          }
          t.fadeOut = true;
          t.fadeTimer = 0;
        }
        continue;
      }

      if (t.pathIndex < t.path.length - 1) {
        const target = t.path[t.pathIndex + 1];
        const tx = target.x + 0.5;
        const ty = target.y + 0.5;
        const dx = tx - t.x;
        const dy = ty - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.05) {
          t.x = tx;
          t.y = ty;
          t.pathIndex++;
          if (t.pathIndex >= t.path.length - 1) {
            t.isConsuming = true;
            t.consumeTimer = TOURIST_CONSUME_TIME;
          }
        } else {
          const moveAmount = t.speed * dt;
          if (moveAmount >= dist) {
            t.x = tx;
            t.y = ty;
          } else {
            t.x += (dx / dist) * moveAmount;
            t.y += (dy / dist) * moveAmount;
          }
        }
      }
    }

    this.tourists = this.tourists.filter(t => t.alive || (t.coinBubble !== null));

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 3 * dt;
      p.life -= dt / p.maxLife;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const tx of this.transactions) {
      if (tx.slideProgress < 1) {
        tx.slideProgress = Math.min(1, tx.slideProgress + dt * 4);
      }
    }
  }
}
