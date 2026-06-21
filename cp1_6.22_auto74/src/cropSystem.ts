import {
  CropType,
  GrowthStage,
  Tile,
  CROP_CONFIGS,
  GRID_COLS,
  GRID_ROWS,
  Particle,
  FloatingText,
  SoundText,
  COLORS,
} from './types';

export class CropSystem {
  tiles: Tile[][] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];
  soundTexts: SoundText[] = [];

  constructor() {
    this.initTiles();
  }

  initTiles(): void {
    this.tiles = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      const rowTiles: Tile[] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        rowTiles.push({
          col,
          row,
          crop: null,
          watered: false,
          decoration: null,
          waterAnimation: 0,
          harvestAnimation: 0,
          pressed: 0,
        });
      }
      this.tiles.push(rowTiles);
    }
  }

  getTile(col: number, row: number): Tile | null {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      return null;
    }
    return this.tiles[row][col];
  }

  canPlant(col: number, row: number): boolean {
    const tile = this.getTile(col, row);
    return tile !== null && tile.crop === null && tile.decoration === null;
  }

  plantCrop(col: number, row: number, cropType: CropType): boolean {
    const tile = this.getTile(col, row);
    if (!tile || !this.canPlant(col, row)) {
      return false;
    }
    const config = CROP_CONFIGS[cropType];
    tile.crop = {
      type: cropType,
      stage: 0,
      growthProgress: 0,
      totalTime: config.growthTime,
      remainingTime: config.growthTime,
    };
    tile.pressed = 0.15;
    this.addSoundText(col, row, '噗');
    return true;
  }

  canWater(col: number, row: number): boolean {
    const tile = this.getTile(col, row);
    return tile !== null && tile.crop !== null && !tile.watered && tile.crop.stage < 2;
  }

  waterCrop(col: number, row: number): boolean {
    const tile = this.getTile(col, row);
    if (!tile || !this.canWater(col, row)) {
      return false;
    }
    tile.watered = true;
    if (tile.crop) {
      tile.crop.remainingTime = tile.crop.remainingTime * 0.5;
    }
    tile.waterAnimation = 0.5;
    tile.pressed = 0.15;
    this.addWaterParticles(col, row);
    this.addSoundText(col, row, '滴');
    return true;
  }

  canHarvest(col: number, row: number): boolean {
    const tile = this.getTile(col, row);
    return tile !== null && tile.crop !== null && tile.crop.stage === 2;
  }

  harvestCrop(col: number, row: number): number {
    const tile = this.getTile(col, row);
    if (!tile || !tile.crop || tile.crop.stage !== 2) {
      return 0;
    }
    const reward = CROP_CONFIGS[tile.crop.type].harvestReward;
    tile.harvestAnimation = 0.4;
    tile.pressed = 0.15;
    this.addCoinParticles(col, row);
    this.addFloatingText(col, row, `+${reward}`, COLORS.gold);
    this.addSoundText(col, row, '叮');
    tile.crop = null;
    tile.watered = false;
    return reward;
  }

  updateGrowth(dt: number): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.tiles[row][col];
        if (tile.crop && tile.crop.stage < 2) {
          tile.crop.remainingTime = Math.max(0, tile.crop.remainingTime - dt);
          tile.crop.growthProgress = 1 - tile.crop.remainingTime / tile.crop.totalTime;
          const newStage = Math.min(2, Math.floor(tile.crop.growthProgress * 3)) as GrowthStage;
          tile.crop.stage = newStage;
        }
        if (tile.waterAnimation > 0) {
          tile.waterAnimation = Math.max(0, tile.waterAnimation - dt);
        }
        if (tile.harvestAnimation > 0) {
          tile.harvestAnimation = Math.max(0, tile.harvestAnimation - dt);
        }
        if (tile.pressed > 0) {
          tile.pressed = Math.max(0, tile.pressed - dt);
        }
      }
    }
  }

  updateParticles(dt: number): void {
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      return p.life > 0;
    });

    this.floatingTexts = this.floatingTexts.filter((t) => {
      t.life -= dt;
      t.y += t.vy * dt;
      return t.life > 0;
    });

    this.soundTexts = this.soundTexts.filter((t) => {
      t.life -= dt;
      return t.life > 0;
    });
  }

  update(dt: number): void {
    this.updateGrowth(dt);
    this.updateParticles(dt);
  }

  private addWaterParticles(col: number, row: number): void {
    const cx = col + 0.5;
    const cy = row + 0.5;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push({
        x: cx,
        y: cy - 0.3,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40 - 60,
        life: 0.5,
        maxLife: 0.5,
        type: 'water',
        color: COLORS.water,
        size: 3,
      });
    }
    this.particles.push({
      x: cx,
      y: cy - 0.8,
      vx: 0,
      vy: 200,
      life: 0.3,
      maxLife: 0.3,
      type: 'water',
      color: COLORS.water,
      size: 5,
    });
  }

  private addCoinParticles(col: number, row: number): void {
    const cx = col + 0.5;
    const cy = row + 0.3;
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 80 + Math.random() * 60;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        maxLife: 0.4,
        type: 'coin',
        color: COLORS.gold,
        size: 4,
      });
    }
  }

  private addFloatingText(col: number, row: number, text: string, color: string): void {
    this.floatingTexts.push({
      x: col + 0.5,
      y: row,
      vy: -30,
      text,
      life: 0.4,
      maxLife: 0.4,
      color,
    });
  }

  private addSoundText(col: number, row: number, text: string): void {
    this.soundTexts.push({
      x: col + 0.5,
      y: row + 0.8,
      text,
      life: 0.3,
      maxLife: 0.3,
    });
  }

  placeDecoration(decoration: string): boolean {
    const edgeTiles: { col: number; row: number }[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const isEdge =
          row === 0 || row === GRID_ROWS - 1 || col === 0 || col === GRID_COLS - 1;
        const tile = this.tiles[row][col];
        if (isEdge && tile.decoration === null && tile.crop === null) {
          edgeTiles.push({ col, row });
        }
      }
    }
    if (edgeTiles.length === 0) return false;
    const pos = edgeTiles[Math.floor(Math.random() * edgeTiles.length)];
    this.tiles[pos.row][pos.col].decoration = decoration as 'scarecrow' | 'fence' | 'windmill';
    return true;
  }
}
