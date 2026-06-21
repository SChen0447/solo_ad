export type CellType = 'wall' | 'floor' | 'exit';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface Door {
  id: string;
  position: Position;
  color: string;
  isOpen: boolean;
}

export interface Key {
  id: string;
  position: Position;
  color: string;
  collected: boolean;
}

export interface Switch {
  id: string;
  position: Position;
  targetDoorId: string;
  activated: boolean;
}

export interface GameMap {
  width: number;
  height: number;
  cells: CellType[][];
  playerStart: Position;
  exit: Position;
  keys: Key[];
  doors: Door[];
  switches: Switch[];
}

export interface GameState {
  map: GameMap;
  playerPos: Position;
  steps: number;
  collectedKeys: string[];
  openedDoors: string[];
  activatedSwitches: string[];
  isCompleted: boolean;
}

export type Rating = 'S' | 'A' | 'B' | 'C';

export interface LevelRecord {
  level: number;
  rating: Rating;
  steps: number;
  timeLeft: number;
}

const COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

export function generateMap(minSize: number = 8, maxSize: number = 12): GameMap {
  const width = randomInt(minSize, maxSize);
  const height = randomInt(minSize, maxSize);

  const cells: CellType[][] = [];
  for (let y = 0; y < height; y++) {
    const row: CellType[] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        row.push('wall');
      } else {
        row.push('floor');
      }
    }
    cells.push(row);
  }

  const wallDensity = 0.15 + Math.random() * 0.1;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (Math.random() < wallDensity) {
        cells[y][x] = 'wall';
      }
    }
  }

  const playerStart: Position = { x: 1, y: 1 };
  cells[playerStart.y][playerStart.x] = 'floor';

  const exit: Position = { x: width - 2, y: height - 2 };
  cells[exit.y][exit.x] = 'exit';

  const keys: Key[] = [];
  const doors: Door[] = [];
  const switches: Switch[] = [];

  const numKeys = randomInt(1, 3);
  const shuffledColors = shuffle(COLORS);

  const floorPositions: Position[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (cells[y][x] === 'floor' &&
          !(x === playerStart.x && y === playerStart.y) &&
          !(x === exit.x && y === exit.y)) {
        floorPositions.push({ x, y });
      }
    }
  }

  const shuffledFloors = shuffle(floorPositions);

  for (let i = 0; i < numKeys && i < shuffledFloors.length; i++) {
    const keyPos = shuffledFloors[i];
    keys.push({
      id: `key-${i}`,
      position: keyPos,
      color: shuffledColors[i % shuffledColors.length],
      collected: false,
    });
  }

  const numDoors = numKeys;
  let doorIndex = 0;
  for (let y = 1; y < height - 1 && doorIndex < numDoors; y++) {
    for (let x = 1; x < width - 1 && doorIndex < numDoors; x++) {
      if (cells[y][x] === 'wall') {
        const hasFloorLeft = x > 0 && cells[y][x - 1] === 'floor';
        const hasFloorRight = x < width - 1 && cells[y][x + 1] === 'floor';
        const hasFloorUp = y > 0 && cells[y - 1][x] === 'floor';
        const hasFloorDown = y < height - 1 && cells[y + 1][x] === 'floor';

        if ((hasFloorLeft && hasFloorRight) || (hasFloorUp && hasFloorDown)) {
          if (Math.random() < 0.3) {
            cells[y][x] = 'floor';
            doors.push({
              id: `door-${doorIndex}`,
              position: { x, y },
              color: shuffledColors[doorIndex % shuffledColors.length],
              isOpen: false,
            });
            doorIndex++;
          }
        }
      }
    }
  }

  return {
    width,
    height,
    cells,
    playerStart,
    exit,
    keys,
    doors,
    switches,
  };
}

export function isWalkable(map: GameMap, pos: Position, openedDoors: string[]): boolean {
  if (pos.x < 0 || pos.x >= map.width || pos.y < 0 || pos.y >= map.height) {
    return false;
  }
  if (map.cells[pos.y][pos.x] === 'wall') {
    return false;
  }
  const door = map.doors.find(d => d.position.x === pos.x && d.position.y === pos.y);
  if (door && !openedDoors.includes(door.id)) {
    return false;
  }
  return true;
}

export function movePlayer(state: GameState, direction: Direction): GameState {
  if (state.isCompleted) return state;

  const delta: Record<Direction, Position> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const newPos = {
    x: state.playerPos.x + delta[direction].x,
    y: state.playerPos.y + delta[direction].y,
  };

  if (!isWalkable(state.map, newPos, state.openedDoors)) {
    return state;
  }

  let collectedKeys = [...state.collectedKeys];
  let openedDoors = [...state.openedDoors];
  let activatedSwitches = [...state.activatedSwitches];
  let isCompleted: boolean = state.isCompleted;

  const key = state.map.keys.find(
    k => k.position.x === newPos.x && k.position.y === newPos.y && !collectedKeys.includes(k.id)
  );
  if (key) {
    collectedKeys.push(key.id);
    const matchingDoor = state.map.doors.find(d => d.color === key.color && !openedDoors.includes(d.id));
    if (matchingDoor) {
      openedDoors.push(matchingDoor.id);
    }
  }

  const sw = state.map.switches.find(
    s => s.position.x === newPos.x && s.position.y === newPos.y && !activatedSwitches.includes(s.id)
  );
  if (sw) {
    activatedSwitches.push(sw.id);
    if (!openedDoors.includes(sw.targetDoorId)) {
      openedDoors.push(sw.targetDoorId);
    }
  }

  if (newPos.x === state.map.exit.x && newPos.y === state.map.exit.y) {
    isCompleted = true;
  }

  return {
    ...state,
    playerPos: newPos,
    steps: state.steps + 1,
    collectedKeys,
    openedDoors,
    activatedSwitches,
    isCompleted,
  };
}

export function createInitialState(map: GameMap): GameState {
  return {
    map,
    playerPos: { ...map.playerStart },
    steps: 0,
    collectedKeys: [],
    openedDoors: [],
    activatedSwitches: [],
    isCompleted: false,
  };
}

export function hasSolution(map: GameMap, timeoutMs: number = 500): boolean {
  const startTime = Date.now();

  const visited = new Set<string>();
  const queue: { pos: Position; keys: Set<string>; doors: Set<string> }[] = [
    { pos: { ...map.playerStart }, keys: new Set(), doors: new Set() },
  ];

  while (queue.length > 0) {
    if (Date.now() - startTime > timeoutMs) {
      return false;
    }

    const current = queue.shift()!;
    const stateKey = `${current.pos.x},${current.pos.y},${[...current.keys].sort().join('|')}`;

    if (visited.has(stateKey)) continue;
    visited.add(stateKey);

    if (current.pos.x === map.exit.x && current.pos.y === map.exit.y) {
      return true;
    }

    const directions: Position[] = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const dir of directions) {
      const newPos = { x: current.pos.x + dir.x, y: current.pos.y + dir.y };

      if (newPos.x < 0 || newPos.x >= map.width || newPos.y < 0 || newPos.y >= map.height) continue;
      if (map.cells[newPos.y][newPos.x] === 'wall') continue;

      const door = map.doors.find(d => d.position.x === newPos.x && d.position.y === newPos.y);
      if (door && !current.doors.has(door.id)) continue;

      const newKeys = new Set(current.keys);
      const newDoors = new Set(current.doors);

      const key = map.keys.find(k => k.position.x === newPos.x && k.position.y === newPos.y);
      if (key && !newKeys.has(key.id)) {
        newKeys.add(key.id);
        const matchingDoor = map.doors.find(d => d.color === key.color);
        if (matchingDoor) {
          newDoors.add(matchingDoor.id);
        }
      }

      queue.push({ pos: newPos, keys: newKeys, doors: newDoors });
    }
  }

  return false;
}

export function generateSolvableMap(minSize: number = 8, maxSize: number = 12, maxAttempts: number = 50): { map: GameMap; attempts: number } {
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;
    const map = generateMap(minSize, maxSize);
    if (hasSolution(map, 100)) {
      return { map, attempts };
    }
  }
  const fallbackMap = generateMap(minSize, maxSize);
  for (let y = 1; y < fallbackMap.height - 1; y++) {
    for (let x = 1; x < fallbackMap.width - 1; x++) {
      if (fallbackMap.cells[y][x] === 'wall') {
        fallbackMap.cells[y][x] = 'floor';
      }
    }
  }
  fallbackMap.doors = [];
  fallbackMap.keys = [];
  return { map: fallbackMap, attempts };
}

export function calculateRating(timeLeft: number, steps: number, totalTime: number = 90): Rating {
  const timeRatio = timeLeft / totalTime;
  
  if (timeLeft > 60 && steps < 10) {
    return 'S';
  }
  if (timeRatio > 0.5 && steps < 20) {
    return 'A';
  }
  if (timeRatio > 0.25 && steps < 40) {
    return 'B';
  }
  return 'C';
}
