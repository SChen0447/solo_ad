import { SPECIES, CultivationSlot } from '../types';

export class CultivationChamber {
  private slots: CultivationSlot[];
  private temperature: number = 25;
  private humidity: number = 55;
  private light: number = 50;
  private onUpdate: (() => void) | null = null;
  private growthTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.slots = [];
    for (let i = 0; i < 9; i++) {
      this.slots.push({
        speciesId: null,
        startTime: null,
        growthProgress: 0,
        isComplete: false,
      });
    }
  }

  setOnUpdate(cb: () => void): void {
    this.onUpdate = cb;
  }

  startGrowthCycle(): void {
    this.growthTimer = setInterval(() => {
      this.updateGrowth();
    }, 30000);
  }

  stopGrowthCycle(): void {
    if (this.growthTimer) {
      clearInterval(this.growthTimer);
      this.growthTimer = null;
    }
  }

  setTemperature(value: number): void {
    this.temperature = Math.max(10, Math.min(40, value));
    if (this.onUpdate) this.onUpdate();
  }

  setHumidity(value: number): void {
    this.humidity = Math.max(20, Math.min(90, value));
    if (this.onUpdate) this.onUpdate();
  }

  setLight(value: number): void {
    this.light = Math.max(0, Math.min(100, value));
    if (this.onUpdate) this.onUpdate();
  }

  getTemperature(): number { return this.temperature; }
  getHumidity(): number { return this.humidity; }
  getLight(): number { return this.light; }

  getSlots(): CultivationSlot[] {
    return this.slots.map(s => ({ ...s }));
  }

  placeSpore(slotIndex: number, speciesId: number): boolean {
    if (slotIndex < 0 || slotIndex >= 9) return false;
    const slot = this.slots[slotIndex];
    if (slot.speciesId !== null) return false;

    this.slots[slotIndex] = {
      speciesId,
      startTime: Date.now(),
      growthProgress: 0,
      isComplete: false,
    };
    if (this.onUpdate) this.onUpdate();
    return true;
  }

  harvestMushroom(slotIndex: number): number | null {
    if (slotIndex < 0 || slotIndex >= 9) return null;
    const slot = this.slots[slotIndex];
    if (!slot.isComplete || slot.speciesId === null) return null;

    const speciesId = slot.speciesId;
    this.slots[slotIndex] = {
      speciesId: null,
      startTime: null,
      growthProgress: 0,
      isComplete: false,
    };
    if (this.onUpdate) this.onUpdate();
    return speciesId;
  }

  removeSpore(slotIndex: number): number | null {
    if (slotIndex < 0 || slotIndex >= 9) return null;
    const slot = this.slots[slotIndex];
    if (slot.speciesId === null) return null;
    if (slot.isComplete) return this.harvestMushroom(slotIndex);

    const speciesId = slot.speciesId;
    this.slots[slotIndex] = {
      speciesId: null,
      startTime: null,
      growthProgress: 0,
      isComplete: false,
    };
    if (this.onUpdate) this.onUpdate();
    return speciesId;
  }

  private updateGrowth(): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.speciesId === null || slot.isComplete) continue;

      const species = SPECIES[slot.speciesId];
      const growthRate = this.calculateGrowthRate(slot.speciesId);
      const increment = growthRate * (30 / species.growthDuration);

      slot.growthProgress = Math.min(1.0, slot.growthProgress + increment);

      if (slot.growthProgress >= 1.0) {
        slot.isComplete = true;
      }
    }
    if (this.onUpdate) this.onUpdate();
  }

  calculateGrowthRate(speciesId: number): number {
    const species = SPECIES[speciesId];
    const tempFit = this.getParameterFit(this.temperature, species.optimalTemp);
    const humidFit = this.getParameterFit(this.humidity, species.optimalHumidity);
    const lightFit = this.getParameterFit(this.light, species.optimalLight);

    return tempFit * humidFit * lightFit;
  }

  private getParameterFit(value: number, optimal: [number, number]): number {
    if (value >= optimal[0] && value <= optimal[1]) return 1.0;

    const dist = value < optimal[0]
      ? optimal[0] - value
      : value - optimal[1];

    const range = optimal[1] - optimal[0];
    const maxDist = Math.max(range, 10);

    if (dist <= maxDist * 0.5) return 1.0 - (dist / (maxDist * 0.5)) * 0.5;
    if (dist <= maxDist) return 0.5 - (dist - maxDist * 0.5) / (maxDist * 0.5) * 0.3;
    return Math.max(0.05, 0.2 - (dist - maxDist) / maxDist * 0.15);
  }

  getEnvironmentStatus(speciesId: number): 'optimal' | 'warning' | 'danger' {
    const rate = this.calculateGrowthRate(speciesId);
    if (rate >= 0.7) return 'optimal';
    if (rate >= 0.4) return 'warning';
    return 'danger';
  }
}
