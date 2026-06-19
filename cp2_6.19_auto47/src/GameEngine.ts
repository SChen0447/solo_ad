import {
  Building,
  BuildingType,
  BUILDING_CONFIGS,
  GameStats,
  GRID_SIZE,
  Particle,
  Transaction,
  Visitor,
  VisitorColor
} from './types';

export class GameEngine {
  grid: Array<Array<Building | null>>;
  buildings: Building[];
  visitors: Visitor[];
  particles: Particle[];
  coins: number;
  stats: GameStats;
  selectedBuildingId: number | null;
  nextBuildingId: number;
  nextVisitorId: number;
  nextTransactionId: number;
  visitorSpawnTimer: number;
  lastFrameTime: number;
  totalVisitorCap: number;
  sidebarOpen: boolean;
  draggingNewBuilding: BuildingType | null;
  isMobile: boolean;
  cellSize: number;
  upgradeMenuOpenFor: number | null;
  bottomMenuOpen: boolean;
  statsPanelAnimProgress: number;
  statsPanelTargetOpen: boolean;
  newTransactionAnim: number;

  constructor() {
    this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    this.buildings = [];
    this.visitors = [];
    this.particles = [];
    this.coins = 100;
    this.stats = {
      todayVisitors: 0,
      totalIncome: 0,
      buildingIncome: { fishery: 0, hotel: 0, restaurant: 0, lighthouse: 0, garden: 0 },
      recentTransactions: []
    };
    this.selectedBuildingId = null;
    this.nextBuildingId = 1;
    this.nextVisitorId = 1;
    this.nextTransactionId = 1;
    this.visitorSpawnTimer = 0;
    this.lastFrameTime = performance.now();
    this.totalVisitorCap = 0;
    this.sidebarOpen = false;
    this.draggingNewBuilding = null;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    this.cellSize = this.isMobile ? 24 : 32;
    this.upgradeMenuOpenFor = null;
    this.bottomMenuOpen = false;
    this.statsPanelAnimProgress = 0;
    this.statsPanelTargetOpen = false;
    this.newTransactionAnim = -1;
  }

  placeBuilding(type: BuildingType, gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) return false;
    if (this.grid[gridY][gridX] !== null) return false;

    const building: Building = {
      id: this.nextBuildingId++,
      type,
      gridX,
      gridY,
      level: 1,
      scale: 1.2,
      shakeOffset: { x: 0, y: 0 },
      isPlacing: true,
      placeTimer: 0,
      upgrading: false,
      upgradeProgress: 0,
      dragOffsetX: 0,
      dragOffsetY: 0,
      isDragging: false,
      lastCoinTime: performance.now()
    };

    this.grid[gridY][gridX] = building;
    this.buildings.push(building);
    this.updateVisitorCap();
    return true;
  }

  removeBuilding(id: number): boolean {
    const b = this.buildings.find(b => b.id === id);
    if (!b) return false;
    this.grid[b.gridY][b.gridX] = null;
    this.buildings = this.buildings.filter(x => x.id !== id);
    if (this.selectedBuildingId === id) this.selectedBuildingId = null;
    if (this.upgradeMenuOpenFor === id) this.upgradeMenuOpenFor = null;
    this.updateVisitorCap();
    return true;
  }

  moveBuilding(id: number, newGridX: number, newGridY: number): boolean {
    if (newGridX < 0 || newGridX >= GRID_SIZE || newGridY < 0 || newGridY >= GRID_SIZE) return false;
    const b = this.buildings.find(b => b.id === id);
    if (!b) return false;
    if (this.grid[newGridY][newGridX] !== null && this.grid[newGridY][newGridX]?.id !== id) return false;

    this.grid[b.gridY][b.gridX] = null;
    b.gridX = newGridX;
    b.gridY = newGridY;
    this.grid[newGridY][newGridX] = b;
    return true;
  }

  upgradeBuilding(id: number): boolean {
    const b = this.buildings.find(b => b.id === id);
    if (!b || b.level >= 5 || b.upgrading) return false;

    const cost = b.level * 50;
    if (this.coins < cost) return false;

    this.coins -= cost;
    b.upgrading = true;
    b.upgradeProgress = 0;

    this.spawnUpgradeParticles(b);
    this.updateVisitorCap();
    return true;
  }

  private spawnUpgradeParticles(b: Building) {
    const cx = (b.gridX + 0.5) * this.cellSize;
    const cy = (b.gridY + 0.5) * this.cellSize;
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#FFE4B5', '#FFFF00'];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3
      });
    }
  }

  private updateVisitorCap() {
    this.totalVisitorCap = this.buildings.reduce((sum, b) => {
      if (b.type === 'hotel') {
        const cfg = BUILDING_CONFIGS.hotel;
        const cap = cfg.baseVisitorCap + (cfg.maxVisitorCap - cfg.baseVisitorCap) * ((b.level - 1) / 4);
        return sum + Math.floor(cap);
      }
      return sum;
    }, 0);
  }

  private spawnVisitor() {
    if (this.visitors.length >= 30 || this.visitors.length >= this.totalVisitorCap) return;

    const targetBuildings = this.buildings.filter(b => b.type === 'hotel' || b.type === 'restaurant');
    if (targetBuildings.length === 0) return;

    const target = targetBuildings[Math.floor(Math.random() * targetBuildings.length)];
    const colors: VisitorColor[] = ['red', 'yellow', 'blue', 'green'];
    const startX = -2;
    const startY = Math.floor(GRID_SIZE / 2);

    const visitor: Visitor = {
      id: this.nextVisitorId++,
      x: startX * this.cellSize + this.cellSize / 2,
      y: startY * this.cellSize + this.cellSize / 2,
      targetX: (target.gridX + 0.5) * this.cellSize,
      targetY: (target.gridY + 0.5) * this.cellSize,
      color: colors[Math.floor(Math.random() * colors.length)],
      bobOffset: 0,
      bobTimer: Math.random() * Math.PI * 2,
      state: 'walking',
      currentTargetBuilding: target.id,
      pathIndex: 0,
      path: this.buildPath(startX, startY, target.gridX, target.gridY),
      consumeTimer: 0,
      showingCoin: false,
      coinScale: 0,
      coinTimer: 0
    };

    this.visitors.push(visitor);
    this.stats.todayVisitors++;
  }

  private buildPath(fromX: number, fromY: number, toX: number, toY: number): Array<{ x: number; y: number }> {
    const path: Array<{ x: number; y: number }> = [];
    let cx = fromX;
    let cy = fromY;
    while (cx !== toX || cy !== toY) {
      if (cx < toX) cx++;
      else if (cx > toX) cx--;
      else if (cy < toY) cy++;
      else if (cy > toY) cy--;
      path.push({ x: cx, y: cy });
    }
    return path;
  }

  addTransaction(amount: number, source: BuildingType) {
    const tx: Transaction = {
      id: this.nextTransactionId++,
      amount,
      source: BUILDING_CONFIGS[source].name,
      timestamp: Date.now()
    };
    this.stats.recentTransactions.unshift(tx);
    if (this.stats.recentTransactions.length > 10) {
      this.stats.recentTransactions.pop();
    }
    this.stats.buildingIncome[source] += amount;
    this.stats.totalIncome += amount;
    this.newTransactionAnim = 0;
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (const b of this.buildings) {
      if (b.isPlacing) {
        b.placeTimer += deltaTime;
        const t = Math.min(b.placeTimer / 200, 1);
        const easeT = 1 - Math.pow(1 - t, 3);
        b.scale = 1.2 - 0.2 * easeT;
        b.shakeOffset.x = t < 1 ? (Math.random() - 0.5) * 3 * (1 - t) : 0;
        b.shakeOffset.y = t < 1 ? (Math.random() - 0.5) * 3 * (1 - t) : 0;
        if (t >= 1) {
          b.isPlacing = false;
          b.scale = 1;
          b.shakeOffset = { x: 0, y: 0 };
        }
      }

      if (b.upgrading) {
        b.upgradeProgress += deltaTime / 1000;
        if (b.upgradeProgress >= 1) {
          b.upgrading = false;
          b.upgradeProgress = 0;
          b.level++;
        }
      }

      const cfg = BUILDING_CONFIGS[b.type];
      const coinRate = cfg.baseCoinPerMin + (cfg.maxCoinPerMin - cfg.baseCoinPerMin) * ((b.level - 1) / 4);
      const interval = 60000 / coinRate;
      const now = performance.now();
      if (now - b.lastCoinTime >= interval) {
        const gain = 1;
        this.coins += gain;
        this.addTransaction(gain, b.type);
        b.lastCoinTime = now;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= dt * 1.5;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.visitorSpawnTimer += deltaTime;
    if (this.visitorSpawnTimer >= 3000) {
      this.visitorSpawnTimer = 0;
      this.spawnVisitor();
    }

    for (let i = this.visitors.length - 1; i >= 0; i--) {
      const v = this.visitors[i];
      v.bobTimer += dt * 8;
      v.bobOffset = Math.sin(v.bobTimer) * 2;

      if (v.state === 'walking') {
        if (v.pathIndex < v.path.length) {
          const next = v.path[v.pathIndex];
          const targetX = (next.x + 0.5) * this.cellSize;
          const targetY = (next.y + 0.5) * this.cellSize;
          const dx = targetX - v.x;
          const dy = targetY - v.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 40 * dt;
          if (dist < speed) {
            v.x = targetX;
            v.y = targetY;
            v.pathIndex++;
          } else {
            v.x += (dx / dist) * speed;
            v.y += (dy / dist) * speed;
          }
        } else {
          v.state = 'consuming';
          v.consumeTimer = 0;
          v.showingCoin = true;
          v.coinTimer = 0;
          v.coinScale = 0;

          const b = this.buildings.find(x => x.id === v.currentTargetBuilding);
          if (b) {
            const gain = 2 + b.level;
            this.coins += gain;
            this.addTransaction(gain, b.type);
          }
        }
      } else if (v.state === 'consuming') {
        v.consumeTimer += deltaTime;
        if (v.showingCoin) {
          v.coinTimer += deltaTime / 300;
          if (v.coinTimer < 0.5) {
            v.coinScale = 0.5 + 0.6 * (v.coinTimer / 0.5);
          } else if (v.coinTimer < 1) {
            const t = (v.coinTimer - 0.5) / 0.5;
            v.coinScale = 1.1 - 0.1 * t;
          } else {
            v.coinScale = 1;
          }
          if (v.coinTimer >= 1) {
            v.showingCoin = false;
          }
        }
        if (v.consumeTimer >= 2000) {
          v.state = 'leaving';
          v.path = this.buildPath(
            Math.floor(v.x / this.cellSize),
            Math.floor(v.y / this.cellSize),
            -2,
            Math.floor(GRID_SIZE / 2)
          );
          v.pathIndex = 0;
        }
      } else if (v.state === 'leaving') {
        if (v.pathIndex < v.path.length) {
          const next = v.path[v.pathIndex];
          const targetX = (next.x + 0.5) * this.cellSize;
          const targetY = (next.y + 0.5) * this.cellSize;
          const dx = targetX - v.x;
          const dy = targetY - v.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 40 * dt;
          if (dist < speed) {
            v.x = targetX;
            v.y = targetY;
            v.pathIndex++;
          } else {
            v.x += (dx / dist) * speed;
            v.y += (dy / dist) * speed;
          }
        } else {
          this.visitors.splice(i, 1);
        }
      }
    }

    if (this.newTransactionAnim >= 0) {
      this.newTransactionAnim += deltaTime / 500;
      if (this.newTransactionAnim >= 1) this.newTransactionAnim = -1;
    }

    const targetProgress = this.statsPanelTargetOpen ? 1 : 0;
    if (this.statsPanelAnimProgress !== targetProgress) {
      const diff = targetProgress - this.statsPanelAnimProgress;
      this.statsPanelAnimProgress += Math.sign(diff) * Math.min(Math.abs(diff), dt * 3);
      if (Math.abs(this.statsPanelAnimProgress - targetProgress) < 0.001) {
        this.statsPanelAnimProgress = targetProgress;
      }
    }
  }

  toggleStatsPanel(): void {
    this.statsPanelTargetOpen = !this.statsPanelTargetOpen;
  }

  getCoinRateForBuilding(b: Building): number {
    const cfg = BUILDING_CONFIGS[b.type];
    return cfg.baseCoinPerMin + (cfg.maxCoinPerMin - cfg.baseCoinPerMin) * ((b.level - 1) / 4);
  }

  getUpgradeCost(b: Building): number {
    return b.level * 50;
  }
}
