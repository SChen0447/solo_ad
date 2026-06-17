export const BOARD_SIZE = 8;
export const GEM_TYPES = 6;

export type GemColor = 0 | 1 | 2 | 3 | 4 | 5;
export type GemShape = 'diamond' | 'triangle' | 'square' | 'hexagon' | 'star' | 'circle';
export type PowerUpType = 'bomb' | 'lightning' | 'rainbow';

export interface Gem {
  id: number;
  color: GemColor;
  shape: GemShape;
  powerUp: PowerUpType | null;
  isFalling: boolean;
  fallTargetY: number;
  fallProgress: number;
  isNew: boolean;
  spawnDelay: number;
  x: number;
  y: number;
}

export interface RockObstacle {
  id: number;
  hp: number;
  x: number;
  y: number;
}

export interface BlockedCell {
  x: number;
  y: number;
  duration: number;
  elapsed: number;
}

export interface Match {
  cells: Array<{ x: number; y: number }>;
  length: number;
  direction: 'horizontal' | 'vertical';
}

export interface EliminationResult {
  eliminatedGems: Array<{ x: number; y: number; color: GemColor; shape: GemShape; powerUp: PowerUpType | null }>;
  eliminatedCount: number;
  generatedPowerUp: PowerUpType | null;
  powerUpPosition: { x: number; y: number } | null;
  chains: number;
}

export interface SwapResult {
  success: boolean;
  chainedEliminations: EliminationResult[];
}

export const GEM_COLORS: GemColor[] = [0, 1, 2, 3, 4, 5];
export const GEM_SHAPES: Record<GemColor, GemShape> = {
  0: 'diamond',
  1: 'triangle',
  2: 'square',
  3: 'hexagon',
  4: 'star',
  5: 'circle'
};

export const COLOR_HEX: Record<GemColor, string> = {
  0: '#ff4d6d',
  1: '#4dff88',
  2: '#4da6ff',
  3: '#ffd24d',
  4: '#e04dff',
  5: '#4dffe0'
};

let gemIdCounter = 0;
let rockIdCounter = 0;

export function createGem(x: number, y: number, color?: GemColor): Gem {
  const c: GemColor = color !== undefined ? color : (Math.floor(Math.random() * GEM_TYPES) as GemColor);
  return {
    id: ++gemIdCounter,
    color: c,
    shape: GEM_SHAPES[c],
    powerUp: null,
    isFalling: false,
    fallTargetY: y,
    fallProgress: 1,
    isNew: false,
    spawnDelay: 0,
    x,
    y
  };
}

export function createRock(x: number, y: number): RockObstacle {
  return {
    id: ++rockIdCounter,
    hp: 3,
    x,
    y
  };
}

export class Board {
  grid: (Gem | null)[][];
  rocks: RockObstacle[];
  blocked: BlockedCell[];
  size: number;
  isAnimating: boolean;

  constructor() {
    this.size = BOARD_SIZE;
    this.grid = [];
    this.rocks = [];
    this.blocked = [];
    this.isAnimating = false;
    this.initGrid();
  }

  private initGrid(): void {
    for (let y = 0; y < this.size; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.size; x++) {
        this.grid[y][x] = this.createNonMatchingGem(x, y);
      }
    }
  }

  private createNonMatchingGem(x: number, y: number): Gem {
    let attempts = 0;
    while (attempts < 50) {
      const gem = createGem(x, y);
      let match = false;
      if (x >= 2 && this.grid[y][x - 1]?.color === gem.color && this.grid[y][x - 2]?.color === gem.color) {
        match = true;
      }
      if (!match && y >= 2 && this.grid[y - 1]?.[x]?.color === gem.color && this.grid[y - 2]?.[x]?.color === gem.color) {
        match = true;
      }
      if (!match) return gem;
      attempts++;
    }
    return createGem(x, y);
  }

  getGem(x: number, y: number): Gem | null {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return null;
    return this.grid[y][x];
  }

  getRock(x: number, y: number): RockObstacle | null {
    return this.rocks.find(r => r.x === x && r.y === y) || null;
  }

  isBlocked(x: number, y: number): boolean {
    return this.blocked.some(b => b.x === x && b.y === y);
  }

  isSwappable(x: number, y: number): boolean {
    if (!this.getGem(x, y)) return false;
    if (this.getRock(x, y)) return false;
    if (this.isBlocked(x, y)) return false;
    return true;
  }

  areAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  swap(x1: number, y1: number, x2: number, y2: number): void {
    const g1 = this.grid[y1][x1];
    const g2 = this.grid[y2][x2];
    if (g1) { g1.x = x2; g1.y = y2; }
    if (g2) { g2.x = x1; g2.y = y1; }
    this.grid[y1][x1] = g2;
    this.grid[y2][x2] = g1;
  }

  findMatches(): Match[] {
    const matches: Match[] = [];
    const visited: boolean[][] = Array(this.size).fill(null).map(() => Array(this.size).fill(false));

    for (let y = 0; y < this.size; y++) {
      let x = 0;
      while (x < this.size) {
        const gem = this.grid[y][x];
        if (!gem || visited[y][x]) { x++; continue; }
        const color = gem.color;
        let endX = x;
        while (endX + 1 < this.size && this.grid[y][endX + 1]?.color === color && !visited[y][endX + 1]) {
          endX++;
        }
        const length = endX - x + 1;
        if (length >= 3) {
          const cells: Array<{ x: number; y: number }> = [];
          for (let i = x; i <= endX; i++) {
            cells.push({ x: i, y });
            visited[y][i] = true;
          }
          matches.push({ cells, length, direction: 'horizontal' });
        }
        x = endX + 1;
      }
    }

    for (let x = 0; x < this.size; x++) {
      let y = 0;
      while (y < this.size) {
        const gem = this.grid[y][x];
        if (!gem || !visited[y][x]) {
          const color = gem?.color;
          if (gem && color !== undefined) {
            let endY = y;
            while (endY + 1 < this.size && this.grid[endY + 1][x]?.color === color && !visited[endY + 1][x]) {
              endY++;
            }
            const length = endY - y + 1;
            if (length >= 3) {
              const cells: Array<{ x: number; y: number }> = [];
              for (let i = y; i <= endY; i++) {
                cells.push({ x, y: i });
                visited[i][x] = true;
              }
              matches.push({ cells, length, direction: 'vertical' });
            }
            y = endY + 1;
          } else {
            y++;
          }
        } else {
          y++;
        }
      }
    }

    const merged = this.mergeOverlappingMatches(matches);
    return merged;
  }

  private mergeOverlappingMatches(matches: Match[]): Match[] {
    const result: Match[] = [];
    const usedCells = new Set<string>();

    for (const m of matches) {
      const cellSet = new Set(m.cells.map(c => `${c.x},${c.y}`));
      const overlaps = m.cells.some(c => usedCells.has(`${c.x},${c.y}`));
      if (!overlaps) {
        result.push(m);
        cellSet.forEach(k => usedCells.add(k));
      } else {
        const newCells: Array<{ x: number; y: number }> = [];
        for (const c of m.cells) {
          if (!usedCells.has(`${c.x},${c.y}`)) {
            newCells.push(c);
            usedCells.add(`${c.x},${c.y}`);
          }
        }
        if (newCells.length >= 1) {
          result.push({
            cells: newCells,
            length: newCells.length,
            direction: m.direction
          });
        }
      }
    }
    return result;
  }

  triggerPowerUp(x: number, y: number, powerUp: PowerUpType): Array<{ x: number; y: number }> {
    const affected: Array<{ x: number; y: number }> = [];

    if (powerUp === 'bomb') {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
            if (this.grid[ny][nx] || this.getRock(nx, ny)) {
              affected.push({ x: nx, y: ny });
            }
          }
        }
      }
    } else if (powerUp === 'lightning') {
      const isRow = Math.random() > 0.5;
      if (isRow) {
        for (let i = 0; i < this.size; i++) {
          if (this.grid[y][i] || this.getRock(i, y)) {
            affected.push({ x: i, y });
          }
        }
      } else {
        for (let i = 0; i < this.size; i++) {
          if (this.grid[i][x] || this.getRock(x, i)) {
            affected.push({ x, y: i });
          }
        }
      }
    } else if (powerUp === 'rainbow') {
      const centerGem = this.grid[y][x];
      if (centerGem) {
        const targetColor: GemColor = Math.floor(Math.random() * GEM_TYPES) as GemColor;
        for (let ny = 0; ny < this.size; ny++) {
          for (let nx = 0; nx < this.size; nx++) {
            const g = this.grid[ny][nx];
            if (g && g.color === targetColor) {
              affected.push({ x: nx, y: ny });
            }
          }
        }
        affected.push({ x, y });
      }
    }

    return affected;
  }

  eliminateCells(cells: Array<{ x: number; y: number }>): EliminationResult {
    const result: EliminationResult = {
      eliminatedGems: [],
      eliminatedCount: 0,
      generatedPowerUp: null,
      powerUpPosition: null,
      chains: 1
    };

    const cellsToCheck = [...cells];
    const processedCells = new Set<string>();
    const allEliminated: Array<{ x: number; y: number }> = [];

    while (cellsToCheck.length > 0) {
      const cell = cellsToCheck.pop()!;
      const key = `${cell.x},${cell.y}`;
      if (processedCells.has(key)) continue;
      processedCells.add(key);

      const gem = this.grid[cell.y][cell.x];
      const rock = this.getRock(cell.x, cell.y);

      if (gem) {
        result.eliminatedGems.push({
          x: cell.x,
          y: cell.y,
          color: gem.color,
          shape: gem.shape,
          powerUp: gem.powerUp
        });
        result.eliminatedCount++;
        allEliminated.push(cell);

        if (gem.powerUp) {
          const powerCells = this.triggerPowerUp(cell.x, cell.y, gem.powerUp);
          for (const pc of powerCells) {
            if (!processedCells.has(`${pc.x},${pc.y}`)) {
              cellsToCheck.push(pc);
            }
          }
        }
        this.grid[cell.y][cell.x] = null;
      } else if (rock) {
        rock.hp--;
        allEliminated.push(cell);
        if (rock.hp <= 0) {
          this.rocks = this.rocks.filter(r => r.id !== rock.id);
        }
      }
    }

    this.damageAdjacentRocks(allEliminated);

    const matchLengths: number[] = [];
    let current = 0;
    for (const m of this.findMatches()) {
      matchLengths.push(m.length);
      current = Math.max(current, m.length);
    }

    if (cells.length >= 5) {
      result.generatedPowerUp = 'rainbow';
    } else if (cells.length >= 4) {
      result.generatedPowerUp = Math.random() > 0.5 ? 'bomb' : 'lightning';
    }

    if (result.generatedPowerUp && cells.length > 0) {
      result.powerUpPosition = cells[Math.floor(cells.length / 2)];
    }

    return result;
  }

  private damageAdjacentRocks(eliminated: Array<{ x: number; y: number }>): void {
    const damagedRocks = new Set<number>();
    for (const c of eliminated) {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dx, dy] of dirs) {
        const nx = c.x + dx;
        const ny = c.y + dy;
        const rock = this.getRock(nx, ny);
        if (rock && !damagedRocks.has(rock.id)) {
          damagedRocks.add(rock.id);
          rock.hp--;
          if (rock.hp <= 0) {
            this.rocks = this.rocks.filter(r => r.id !== rock.id);
          }
        }
      }
    }
  }

  applyGravity(): void {
    for (let x = 0; x < this.size; x++) {
      let writeY = this.size - 1;
      for (let y = this.size - 1; y >= 0; y--) {
        if (this.getRock(x, y)) {
          if (writeY < y) {
            for (let yy = writeY + 1; yy < y; yy++) {
              if (!this.grid[yy][x]) {
                // skip
              }
            }
          }
          writeY = y - 1;
          continue;
        }
        if (this.grid[y][x]) {
          if (y !== writeY) {
            const gem = this.grid[y][x]!;
            gem.isFalling = true;
            gem.fallTargetY = writeY;
            gem.fallProgress = 0;
            gem.y = writeY;
            this.grid[writeY][x] = gem;
            this.grid[y][x] = null;
          }
          writeY--;
        }
      }
      let spawnY = writeY;
      let spawnIndex = 0;
      while (spawnY >= 0) {
        if (!this.getRock(x, spawnY)) {
          const newGem = createGem(x, spawnY);
          newGem.isNew = true;
          newGem.isFalling = true;
          newGem.fallProgress = 0;
          newGem.fallTargetY = spawnY;
          newGem.spawnDelay = spawnIndex * 0.05;
          this.grid[spawnY][x] = newGem;
          spawnIndex++;
          spawnY--;
        } else {
          spawnY--;
        }
      }
    }
  }

  trySwap(x1: number, y1: number, x2: number, y2: number): SwapResult {
    if (!this.isSwappable(x1, y1) || !this.isSwappable(x2, y2)) {
      return { success: false, chainedEliminations: [] };
    }
    if (!this.areAdjacent(x1, y1, x2, y2)) {
      return { success: false, chainedEliminations: [] };
    }

    const chainedEliminations: EliminationResult[] = [];

    this.swap(x1, y1, x2, y2);
    const initialMatches = this.findMatches();

    if (initialMatches.length === 0) {
      this.swap(x1, y1, x2, y2);
      return { success: false, chainedEliminations: [] };
    }

    let chainCount = 0;
    let matches = initialMatches;

    while (matches.length > 0 && chainCount < 20) {
      const allCells: Array<{ x: number; y: number }> = [];
      let maxMatchLen = 0;
      for (const m of matches) {
        for (const c of m.cells) allCells.push(c);
        maxMatchLen = Math.max(maxMatchLen, m.length);
      }

      const elim = this.eliminateCells(allCells);
      elim.chains = chainCount + 1;

      if (maxMatchLen >= 5) {
        elim.generatedPowerUp = 'rainbow';
      } else if (maxMatchLen >= 4) {
        elim.generatedPowerUp = Math.random() > 0.5 ? 'bomb' : 'lightning';
      }

      if (elim.generatedPowerUp && matches.length > 0) {
        const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
        const pos = longestMatch.cells[Math.floor(longestMatch.cells.length / 2)];
        if (!this.getRock(pos.x, pos.y)) {
          elim.powerUpPosition = pos;
        }
      }

      chainedEliminations.push(elim);

      this.applyGravity();
      matches = this.findMatches();
      chainCount++;
    }

    return { success: true, chainedEliminations };
  }

  dropRocks(count: number): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const available: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x] && !this.getRock(x, y)) {
          available.push({ x, y });
        }
      }
    }
    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      const pos = available.splice(idx, 1)[0];
      const gem = this.grid[pos.y][pos.x];
      if (gem) {
        this.grid[pos.y][pos.x] = null;
        this.rocks.push(createRock(pos.x, pos.y));
        positions.push(pos);
      }
    }
    if (positions.length > 0) {
      this.applyGravity();
    }
    return positions;
  }

  blockRandomCells(count: number, duration: number): BlockedCell[] {
    const blocked: BlockedCell[] = [];
    const available: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.isBlocked(x, y) && !this.getRock(x, y)) {
          available.push({ x, y });
        }
      }
    }
    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      const pos = available.splice(idx, 1)[0];
      const bc: BlockedCell = { x: pos.x, y: pos.y, duration, elapsed: 0 };
      this.blocked.push(bc);
      blocked.push(bc);
    }
    return blocked;
  }

  update(dt: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const gem = this.grid[y][x];
        if (gem && gem.isFalling) {
          gem.fallProgress = Math.min(1, gem.fallProgress + dt * 4);
          if (gem.fallProgress >= 1) {
            gem.isFalling = false;
          }
        }
        if (gem && gem.isNew && gem.spawnDelay > 0) {
          gem.spawnDelay = Math.max(0, gem.spawnDelay - dt);
        }
      }
    }

    for (let i = this.blocked.length - 1; i >= 0; i--) {
      this.blocked[i].elapsed += dt;
      if (this.blocked[i].elapsed >= this.blocked[i].duration) {
        this.blocked.splice(i, 1);
      }
    }
  }

  hasFallingGems(): boolean {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x]?.isFalling) return true;
      }
    }
    return false;
  }

  placePowerUp(x: number, y: number, type: PowerUpType): void {
    if (this.grid[y][x] && !this.getRock(x, y)) {
      this.grid[y][x]!.powerUp = type;
    }
  }

  reset(): void {
    this.grid = [];
    this.rocks = [];
    this.blocked = [];
    this.isAnimating = false;
    this.initGrid();
  }
}
