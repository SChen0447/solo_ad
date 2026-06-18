import { MapGrid } from './MapGrid';
import { SPECIES, SYMBIOSIS_COMBOS, ColonyData, GrowthStage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class EcosystemManager {
  private mapGrid: MapGrid;
  private colonies: ColonyData[] = [];
  private evolveTimer: ReturnType<typeof setInterval> | null = null;
  private onUpdate: (() => void) | null = null;

  constructor(mapGrid: MapGrid) {
    this.mapGrid = mapGrid;
  }

  initialize(): void {
    this.generateInitialColonies();
  }

  startEvolution(onUpdate: () => void): void {
    this.onUpdate = onUpdate;
    this.evolveTimer = setInterval(() => {
      this.evolve();
    }, 2000);
  }

  stopEvolution(): void {
    if (this.evolveTimer) {
      clearInterval(this.evolveTimer);
      this.evolveTimer = null;
    }
  }

  private generateInitialColonies(): void {
    const usedPositions = new Set<string>();
    const speciesUsed = new Set<number>();

    for (let i = 0; i < 8; i++) {
      const speciesId = i % SPECIES.length;
      speciesUsed.add(speciesId);

      let cx: number, cy: number;
      let attempts = 0;
      do {
        cx = 10 + Math.floor(Math.random() * 80);
        cy = 10 + Math.floor(Math.random() * 80);
        attempts++;
      } while (usedPositions.has(`${cx},${cy}`) && attempts < 100);

      const colonySize = 5 + Math.floor(Math.random() * 11);
      const colonyId = this.generateColonyId();
      const cells: { x: number; y: number }[] = [];

      const queue: { x: number; y: number }[] = [{ x: cx, y: cy }];
      const visited = new Set<string>();

      while (cells.length < colonySize && queue.length > 0) {
        const idx = Math.floor(Math.random() * Math.min(queue.length, 3));
        const pos = queue.splice(idx, 1)[0];
        const key = `${pos.x},${pos.y}`;

        if (visited.has(key)) continue;
        if (pos.x < 0 || pos.x >= 100 || pos.y < 0 || pos.y >= 100) continue;
        if (usedPositions.has(key)) continue;

        visited.add(key);
        usedPositions.add(key);

        const growthStage = cells.length < colonySize * 0.3 ? 2 : (cells.length < colonySize * 0.7 ? 2 : 1);
        const growthProgress = growthStage === 2 ? 0.8 : 0.4;

        this.mapGrid.setCell(pos.x, pos.y, {
          speciesId,
          growthStage: growthStage as GrowthStage,
          colonyId,
          lastCollected: 0,
          growthProgress,
        });

        cells.push(pos);

        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dx, dy] of dirs) {
          const nx = pos.x + dx;
          const ny = pos.y + dy;
          if (!visited.has(`${nx},${ny}`) && Math.random() < 0.7) {
            queue.push({ x: nx, y: ny });
          }
        }
      }

      this.colonies.push({
        id: colonyId,
        speciesId,
        cells,
        hasSymbiosis: false,
      });
    }
  }

  private generateColonyId(): number {
    return Math.floor(Math.random() * 1000000);
  }

  evolve(): void {
    const startTime = performance.now();

    this.mapGrid.regenerateCells(Date.now());
    this.advanceGrowthStages();
    this.mergeAdjacentSameSpecies();
    this.competeAtBorders();
    this.checkSymbiosis();
    this.expandColonies();

    if (this.onUpdate) this.onUpdate();

    const elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      console.warn(`Ecosystem evolution took ${elapsed.toFixed(1)}ms (budget: 50ms)`);
    }
  }

  private advanceGrowthStages(): void {
    const grid = this.mapGrid.getAllCells();
    for (let y = 0; y < this.mapGrid.height; y++) {
      for (let x = 0; x < this.mapGrid.width; x++) {
        const cell = grid[y][x];
        if (cell.speciesId === null) continue;
        const progress = cell.growthProgress + 0.05;
        let stage = cell.growthStage;
        if (progress >= 1.0) {
          stage = Math.min(stage + 1, 3) as GrowthStage;
          this.mapGrid.setCell(x, y, {
            growthStage: stage,
            growthProgress: stage >= 3 ? 1.0 : 0.0,
          });
        } else {
          this.mapGrid.setCell(x, y, { growthProgress: progress });
        }
      }
    }
  }

  private mergeAdjacentSameSpecies(): void {
    const merged = new Set<number>();
    for (let i = 0; i < this.colonies.length; i++) {
      if (merged.has(i)) continue;
      for (let j = i + 1; j < this.colonies.length; j++) {
        if (merged.has(j)) continue;
        const a = this.colonies[i];
        const b = this.colonies[j];
        if (a.speciesId !== b.speciesId) continue;

        const adjacent = this.areColoniesAdjacent(a, b);
        if (adjacent) {
          for (const cell of b.cells) {
            this.mapGrid.setCell(cell.x, cell.y, { colonyId: a.id });
          }
          a.cells.push(...b.cells);
          b.cells = [];
          merged.add(j);
        }
      }
    }
    this.colonies = this.colonies.filter((_, i) => !merged.has(i));
  }

  private areColoniesAdjacent(a: ColonyData, b: ColonyData): boolean {
    const bSet = new Set(b.cells.map(c => `${c.x},${c.y}`));
    for (const cell of a.cells) {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dx, dy] of dirs) {
        if (bSet.has(`${cell.x + dx},${cell.y + dy}`)) return true;
      }
    }
    return false;
  }

  private competeAtBorders(): void {
    const borderConflicts: { weakColony: ColonyData; x: number; y: number }[] = [];

    for (const colony of this.colonies) {
      for (const cell of colony.cells) {
        const neighbors = this.mapGrid.getCardinalNeighbors(cell.x, cell.y);
        for (const neighbor of neighbors) {
          if (neighbor.cell.speciesId !== null && neighbor.cell.speciesId !== colony.speciesId) {
            const myComp = SPECIES[colony.speciesId].competitiveness;
            const theirComp = SPECIES[neighbor.cell.speciesId].competitiveness;

            if (theirComp > myComp && Math.random() < 0.05) {
              borderConflicts.push({
                weakColony: colony,
                x: cell.x,
                y: cell.y,
              });
            }
          }
        }
      }
    }

    for (const conflict of borderConflicts) {
      const cell = this.mapGrid.getCell(conflict.x, conflict.y);
      if (cell && cell.speciesId === conflict.weakColony.speciesId) {
        this.mapGrid.setCell(conflict.x, conflict.y, {
          speciesId: null,
          growthStage: 0,
          colonyId: null,
          lastCollected: Date.now(),
          growthProgress: 0,
        });
        conflict.weakColony.cells = conflict.weakColony.cells.filter(
          c => !(c.x === conflict.x && c.y === conflict.y)
        );
      }
    }

    this.colonies = this.colonies.filter(c => c.cells.length > 0);
  }

  private checkSymbiosis(): void {
    for (const combo of SYMBIOSIS_COMBOS) {
      const speciesSet = new Set(combo.species);

      for (const colony of this.colonies) {
        if (!speciesSet.has(colony.speciesId)) continue;

        const neighborSpecies = new Set<number>();
        for (const cell of colony.cells) {
          const neighbors = this.mapGrid.getCardinalNeighbors(cell.x, cell.y);
          for (const n of neighbors) {
            if (n.cell.speciesId !== null && n.cell.speciesId !== colony.speciesId) {
              neighborSpecies.add(n.cell.speciesId);
            }
          }
        }

        const allPresent = combo.species.every(s => {
          return s === colony.speciesId || neighborSpecies.has(s);
        });

        colony.hasSymbiosis = allPresent;
      }
    }
  }

  private expandColonies(): void {
    for (const colony of this.colonies) {
      if (colony.cells.length === 0) continue;

      const expansionCandidates: { x: number; y: number }[] = [];
      const colonyCellSet = new Set(colony.cells.map(c => `${c.x},${c.y}`));

      for (const cell of colony.cells) {
        const neighbors = this.mapGrid.getCardinalNeighbors(cell.x, cell.y);
        for (const n of neighbors) {
          if (n.cell.speciesId === null && !colonyCellSet.has(`${n.x},${n.y}`)) {
            expansionCandidates.push({ x: n.x, y: n.y });
          }
        }
      }

      let spreadProbability = 0.03;
      if (colony.hasSymbiosis) {
        spreadProbability += 0.1;
      }

      for (const candidate of expansionCandidates) {
        if (Math.random() < spreadProbability) {
          this.mapGrid.setCell(candidate.x, candidate.y, {
            speciesId: colony.speciesId,
            growthStage: 1 as GrowthStage,
            colonyId: colony.id,
            lastCollected: 0,
            growthProgress: 0.0,
          });
          colony.cells.push(candidate);
          colonyCellSet.add(`${candidate.x},${candidate.y}`);
        }
      }
    }
  }

  getColonies(): ColonyData[] {
    return this.colonies;
  }
}
