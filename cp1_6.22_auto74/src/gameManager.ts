import { CropSystem } from './cropSystem';
import {
  CropType,
  DecorationType,
  Inventory,
  CROP_CONFIGS,
  INITIAL_SEEDS,
  INITIAL_COINS,
  DECORATION_CONFIGS,
} from './types';

export class GameManager {
  coins: number = INITIAL_COINS;
  inventory: Inventory;
  cropSystem: CropSystem;
  selectedTile: { col: number; row: number } | null = null;
  showCropPanel: boolean = false;
  showShopPanel: boolean = false;

  constructor() {
    this.cropSystem = new CropSystem();
    this.inventory = {
      seeds: { ...INITIAL_SEEDS },
      decorations: [],
    };
  }

  update(dt: number): void {
    this.cropSystem.update(dt);
  }

  handleTileClick(col: number, row: number): void {
    const tile = this.cropSystem.getTile(col, row);
    if (!tile) return;

    if (this.cropSystem.canHarvest(col, row)) {
      const reward = this.cropSystem.harvestCrop(col, row);
      this.coins += reward;
      this.selectedTile = null;
      this.showCropPanel = false;
      return;
    }

    if (this.cropSystem.canWater(col, row)) {
      this.cropSystem.waterCrop(col, row);
      return;
    }

    if (this.cropSystem.canPlant(col, row)) {
      this.selectedTile = { col, row };
      this.showCropPanel = true;
      this.showShopPanel = false;
      return;
    }

    this.selectedTile = null;
    this.showCropPanel = false;
  }

  selectCrop(cropType: CropType): boolean {
    if (!this.selectedTile) return false;
    const { col, row } = this.selectedTile;
    const config = CROP_CONFIGS[cropType];
    const seedCount = this.inventory.seeds[cropType];

    if (seedCount === 0) return false;
    if (this.coins < config.seedPrice) return false;

    if (this.cropSystem.plantCrop(col, row, cropType)) {
      this.coins -= config.seedPrice;
      if (seedCount > 0) {
        this.inventory.seeds[cropType] = seedCount - 1;
      }
      this.selectedTile = null;
      this.showCropPanel = false;
      return true;
    }
    return false;
  }

  buySeed(cropType: CropType): boolean {
    const config = CROP_CONFIGS[cropType];
    const price = config.seedPrice;
    if (this.coins < price) return false;
    this.coins -= price;
    if (this.inventory.seeds[cropType] >= 0) {
      this.inventory.seeds[cropType] += 1;
    }
    return true;
  }

  buyDecoration(decorationType: DecorationType): boolean {
    const config = DECORATION_CONFIGS[decorationType];
    if (this.coins < config.price) return false;
    if (this.cropSystem.placeDecoration(decorationType)) {
      this.coins -= config.price;
      this.inventory.decorations.push(decorationType);
      return true;
    }
    return false;
  }

  getSeedCount(cropType: CropType): number {
    const count = this.inventory.seeds[cropType];
    return count;
  }

  closePanels(): void {
    this.selectedTile = null;
    this.showCropPanel = false;
    this.showShopPanel = false;
  }

  toggleShop(): void {
    this.showShopPanel = !this.showShopPanel;
    this.showCropPanel = false;
    this.selectedTile = null;
  }
}
