export class ResourceManager {
  energy: number = 50;
  private lowEnergyThreshold: number = 10;
  private flashTimer: number = 0;

  canAfford(cost: number): boolean {
    return this.energy >= cost;
  }

  spend(cost: number): boolean {
    if (this.energy >= cost) {
      this.energy -= cost;
      return true;
    }
    return false;
  }

  add(amount: number): void {
    this.energy += amount;
  }

  isLow(): boolean {
    return this.energy < this.lowEnergyThreshold;
  }

  updateFlash(deltaMs: number): void {
    this.flashTimer += deltaMs;
  }

  shouldFlashRed(): boolean {
    if (!this.isLow()) return false;
    return Math.floor(this.flashTimer / 400) % 2 === 0;
  }
}
