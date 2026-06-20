import {
  GRID_SIZE,
  CELL_SIZE,
  TOWER_COLORS,
  generateTerrain,
  bfsPath,
  TerrainType,
  Point,
} from './utils';

export type BuildingType = 'tower' | 'workerHut' | 'crystalTower' | null;
export type ResourceType = 'wood' | 'stone' | 'crystal';

export interface Cell {
  x: number;
  y: number;
  terrain: TerrainType;
  building: BuildingType;
  buildingLevel: number;
  cooldown: number;
}

export interface Tower {
  x: number;
  y: number;
  level: number;
  range: number;
  fireInterval: number;
  lastFireTime: number;
}

export interface Monster {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  currentSpeed: number;
  speedBoostCount: number;
  path: Point[];
  pathIndex: number;
  lastSpeedBoostTime: number;
}

export interface Projectile {
  x: number;
  y: number;
  targetMonsterId: string;
  speed: number;
  color: string;
  towerLevel: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface FoamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface Resources {
  wood: number;
  stone: number;
  crystal: number;
}

export interface GameCallbacks {
  onStateChange: () => void;
}

export interface GameState {
  cells: Cell[][];
  towers: Tower[];
  monsters: Monster[];
  projectiles: Projectile[];
  particles: Particle[];
  foamParticles: FoamParticle[];
  resources: Resources;
  crystalTowerHp: number;
  crystalTowerMaxHp: number;
  waveNumber: number;
  lastWaveTime: number;
  lastResourceTime: number;
  gameTime: number;
  gameOver: boolean;
  selectedBuilding: 'tower' | 'workerHut' | null;
  upgradeTarget: Tower | null;
  terrain: TerrainType[][];
  buildings: BuildingType[][];
}

const WAVE_INTERVAL = 15000;
const MONSTERS_PER_WAVE_MIN = 5;
const MONSTERS_PER_WAVE_MAX = 8;
const SPEED_BOOST_INTERVAL = 5000;
const MAX_SPEED_BOOST = 1;
const MONSTER_BASE_SPEED = 60;
const TOWER_RANGE = 60;
const TOWER_FIRE_INTERVAL = 400;
const PROJECTILE_SPEED = 200;
const RESOURCE_INTERVAL = 3000;
const CRYSTAL_TOWER_HP = 100;
const MONSTER_DAMAGE = 10;
const TERRAIN_COOLDOWNS: Record<TerrainType, number> = {
  sand: 2000,
  grass: 1000,
  rock: 3000,
  shallowWater: 0,
};

const UPGRADE_COSTS: Record<number, Resources> = {
  2: { wood: 5, stone: 5, crystal: 2 },
  3: { wood: 10, stone: 10, crystal: 5 },
};

const BUILDING_COSTS: Record<string, Resources> = {
  tower: { wood: 3, stone: 3, crystal: 0 },
  workerHut_wood: { wood: 2, stone: 1, crystal: 0 },
  workerHut_stone: { wood: 1, stone: 2, crystal: 0 },
  workerHut_crystal: { wood: 1, stone: 1, crystal: 1 },
};

let monsterIdCounter = 0;

export function createGameState(callbacks: GameCallbacks): GameState {
  const terrain = generateTerrain(Date.now() % 10000);
  const cells: Cell[][] = [];
  const buildings: BuildingType[][] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    cells[y] = [];
    buildings[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      cells[y][x] = {
        x,
        y,
        terrain: terrain[y][x],
        building: null,
        buildingLevel: 0,
        cooldown: 0,
      };
      buildings[y][x] = null;
    }
  }

  const cx = Math.floor(GRID_SIZE / 2);
  const cy = Math.floor(GRID_SIZE / 2);
  cells[cy][cx].building = 'crystalTower';
  cells[cy][cx].buildingLevel = 1;
  buildings[cy][cx] = 'crystalTower';

  return {
    cells,
    towers: [],
    monsters: [],
    projectiles: [],
    particles: [],
    foamParticles: [],
    resources: { wood: 10, stone: 10, crystal: 3 },
    crystalTowerHp: CRYSTAL_TOWER_HP,
    crystalTowerMaxHp: CRYSTAL_TOWER_HP,
    waveNumber: 0,
    lastWaveTime: 0,
    lastResourceTime: 0,
    gameTime: 0,
    gameOver: false,
    selectedBuilding: 'tower',
    upgradeTarget: null,
    terrain,
    buildings,
  };
}

export function placeBuilding(
  state: GameState,
  gx: number,
  gy: number,
  type: 'tower' | 'workerHut',
  resourceType: ResourceType = 'wood'
): boolean {
  if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return false;
  const cell = state.cells[gy][gx];
  if (cell.building !== null) return false;
  if (cell.terrain === 'shallowWater') return false;
  if (cell.cooldown > 0) return false;

  const costKey = type === 'workerHut' ? `workerHut_${resourceType}` : type;
  const cost = BUILDING_COSTS[costKey];
  if (!cost) return false;

  if (
    state.resources.wood < cost.wood ||
    state.resources.stone < cost.stone ||
    state.resources.crystal < cost.crystal
  ) {
    return false;
  }

  state.resources.wood -= cost.wood;
  state.resources.stone -= cost.stone;
  state.resources.crystal -= cost.crystal;

  cell.building = type;
  cell.buildingLevel = 1;
  cell.cooldown = TERRAIN_COOLDOWNS[cell.terrain];
  state.buildings[gy][gx] = type;

  if (type === 'tower') {
    state.towers.push({
      x: gx,
      y: gy,
      level: 1,
      range: TOWER_RANGE,
      fireInterval: TOWER_FIRE_INTERVAL,
      lastFireTime: 0,
    });
  }

  return true;
}

export function upgradeTower(state: GameState, tower: Tower): boolean {
  if (tower.level >= 3) return false;
  const nextLevel = tower.level + 1;
  const cost = UPGRADE_COSTS[nextLevel];
  if (!cost) return false;

  if (
    state.resources.wood < cost.wood ||
    state.resources.stone < cost.stone ||
    state.resources.crystal < cost.crystal
  ) {
    return false;
  }

  state.resources.wood -= cost.wood;
  state.resources.stone -= cost.stone;
  state.resources.crystal -= cost.crystal;

  tower.level = nextLevel;
  state.cells[tower.y][tower.x].buildingLevel = nextLevel;

  return true;
}

function getSpawnPosition(): Point {
  const side = Math.floor(Math.random() * 4);
  const pos = Math.floor(Math.random() * GRID_SIZE);
  switch (side) {
    case 0: return { x: pos, y: 0 };
    case 1: return { x: pos, y: GRID_SIZE - 1 };
    case 2: return { x: 0, y: pos };
    case 3: return { x: GRID_SIZE - 1, y: pos };
    default: return { x: 0, y: 0 };
  }
}

function findNearestLandSpawn(terrain: TerrainType[][]): Point {
  for (let attempts = 0; attempts < 20; attempts++) {
    const p = getSpawnPosition();
    if (terrain[p.y][p.x] !== 'shallowWater') return p;
  }
  return { x: Math.floor(GRID_SIZE / 2), y: 0 };
}

export function spawnWave(state: GameState): void {
  const cx = Math.floor(GRID_SIZE / 2);
  const cy = Math.floor(GRID_SIZE / 2);
  const count =
    MONSTERS_PER_WAVE_MIN +
    Math.floor(Math.random() * (MONSTERS_PER_WAVE_MAX - MONSTERS_PER_WAVE_MIN + 1));

  state.waveNumber++;

  for (let i = 0; i < count; i++) {
    const spawn = findNearestLandSpawn(state.terrain);
    const path = bfsPath(spawn, { x: cx, y: cy }, state.terrain, state.buildings);
    if (!path) continue;

    const hpBonus = state.waveNumber * 5;
    const monster: Monster = {
      id: `m_${monsterIdCounter++}`,
      x: spawn.x * CELL_SIZE + CELL_SIZE / 2,
      y: spawn.y * CELL_SIZE + CELL_SIZE / 2,
      hp: 30 + hpBonus,
      maxHp: 30 + hpBonus,
      baseSpeed: MONSTER_BASE_SPEED,
      currentSpeed: MONSTER_BASE_SPEED,
      speedBoostCount: 0,
      path,
      pathIndex: 1,
      lastSpeedBoostTime: state.gameTime,
    };
    state.monsters.push(monster);
  }
}

export function updateBattle(state: GameState, dt: number): void {
  if (state.gameOver) return;

  state.gameTime += dt;

  if (state.gameTime - state.lastWaveTime >= WAVE_INTERVAL || state.waveNumber === 0) {
    spawnWave(state);
    state.lastWaveTime = state.gameTime;
  }

  updateMonsters(state, dt);
  updateTowers(state);
  updateProjectiles(state, dt);
  updateParticles(state, dt);
  updateCooldowns(state, dt);
}

function updateMonsters(state: GameState, dt: number): void {
  const cx = Math.floor(GRID_SIZE / 2);
  const cy = Math.floor(GRID_SIZE / 2);
  const targetX = cx * CELL_SIZE + CELL_SIZE / 2;
  const targetY = cy * CELL_SIZE + CELL_SIZE / 2;

  for (let i = state.monsters.length - 1; i >= 0; i--) {
    const m = state.monsters[i];

    if (state.gameTime - m.lastSpeedBoostTime >= SPEED_BOOST_INTERVAL) {
      if (m.speedBoostCount < Math.floor(MAX_SPEED_BOOST / 0.1)) {
        m.speedBoostCount++;
        m.currentSpeed = m.baseSpeed * (1 + m.speedBoostCount * 0.1);
        if (m.currentSpeed > m.baseSpeed * 2) {
          m.currentSpeed = m.baseSpeed * 2;
        }
      }
      m.lastSpeedBoostTime = state.gameTime;
    }

    if (m.pathIndex < m.path.length) {
      const nextPoint = m.path[m.pathIndex];
      const npx = nextPoint.x * CELL_SIZE + CELL_SIZE / 2;
      const npy = nextPoint.y * CELL_SIZE + CELL_SIZE / 2;
      const dx = npx - m.x;
      const dy = npy - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        m.pathIndex++;
      } else {
        const move = m.currentSpeed * (dt / 1000);
        m.x += (dx / dist) * move;
        m.y += (dy / dist) * move;
      }
    }

    const dtCenter = Math.sqrt(
      (m.x - targetX) * (m.x - targetX) + (m.y - targetY) * (m.y - targetY)
    );
    if (dtCenter < CELL_SIZE / 2) {
      state.crystalTowerHp -= MONSTER_DAMAGE;
      spawnParticles(state, m.x, m.y, '#ff4444', 4);
      state.monsters.splice(i, 1);
      if (state.crystalTowerHp <= 0) {
        state.crystalTowerHp = 0;
        state.gameOver = true;
      }
      continue;
    }

    if (m.hp <= 0) {
      const color = TOWER_COLORS[1];
      spawnParticles(state, m.x, m.y, color, Math.floor(4 + Math.random() * 3));
      state.monsters.splice(i, 1);
    }
  }
}

function updateTowers(state: GameState): void {
  for (const tower of state.towers) {
    if (state.gameTime - tower.lastFireTime < tower.fireInterval) continue;

    const tx = tower.x * CELL_SIZE + CELL_SIZE / 2;
    const ty = tower.y * CELL_SIZE + CELL_SIZE / 2;

    let closestMonster: Monster | null = null;
    let closestDist = Infinity;

    for (const m of state.monsters) {
      const dx = m.x - tx;
      const dy = m.y - ty;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= tower.range && dist < closestDist) {
        closestDist = dist;
        closestMonster = m;
      }
    }

    if (closestMonster) {
      tower.lastFireTime = state.gameTime;
      state.projectiles.push({
        x: tx,
        y: ty,
        targetMonsterId: closestMonster.id,
        speed: PROJECTILE_SPEED,
        color: TOWER_COLORS[tower.level] || TOWER_COLORS[1],
        towerLevel: tower.level,
      });
    }
  }
}

function updateProjectiles(state: GameState, dt: number): void {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    const target = state.monsters.find((m) => m.id === p.targetMonsterId);

    if (!target) {
      state.projectiles.splice(i, 1);
      continue;
    }

    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      const damage = p.towerLevel * 10;
      target.hp -= damage;
      spawnParticles(state, p.x, p.y, p.color, Math.floor(4 + Math.random() * 3));
      state.projectiles.splice(i, 1);
      continue;
    }

    const move = p.speed * (dt / 1000);
    p.x += (dx / dist) * move;
    p.y += (dy / dist) * move;
  }
}

function spawnParticles(
  state: GameState,
  x: number,
  y: number,
  color: string,
  count: number
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3,
      maxLife: 0.3,
      size: 2 + Math.random() * 2,
      color,
    });
  }
}

function updateParticles(state: GameState, dt: number): void {
  const dtSec = dt / 1000;
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.life -= dtSec;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function updateCooldowns(state: GameState, dt: number): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (state.cells[y][x].cooldown > 0) {
        state.cells[y][x].cooldown = Math.max(0, state.cells[y][x].cooldown - dt);
      }
    }
  }
}

export function updateResources(state: GameState, dt: number): void {
  if (state.gameOver) return;

  state.lastResourceTime += dt;
  if (state.lastResourceTime >= RESOURCE_INTERVAL) {
    state.lastResourceTime -= RESOURCE_INTERVAL;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = state.cells[y][x];
        if (cell.building === 'workerHut') {
          const terrain = cell.terrain;
          if (terrain === 'sand' || terrain === 'grass') {
            state.resources.wood += 1;
          } else if (terrain === 'rock') {
            state.resources.stone += 1;
          }
          if (cell.buildingLevel >= 2) {
            state.resources.crystal += 1;
          }
        }
      }
    }
  }
}

export function canAfford(state: GameState, cost: Resources): boolean {
  return (
    state.resources.wood >= cost.wood &&
    state.resources.stone >= cost.stone &&
    state.resources.crystal >= cost.crystal
  );
}

export function getWorkerHutResourceType(cell: Cell): ResourceType {
  if (cell.terrain === 'rock') return 'stone';
  if (cell.buildingLevel >= 2) return 'crystal';
  return 'wood';
}
