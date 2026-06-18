import { PlayerState, INITIAL_PLAYER_STATE } from './types';
import { WeatherEffects } from '../weather/types';
import { inventoryManager } from './inventory';

const HUNGER_DECAY_RATE = 0.5;
const HEALTH_REGEN_RATE = 0.1;
const HEALTH_HUNGER_PENALTY_THRESHOLD = 20;
const HEALTH_HUNGER_PENALTY_RATE = 0.2;

export class PlayerStateManager {
  private state: PlayerState;
  private listeners: Set<(state: PlayerState) => void> = new Set();
  private weatherEffects: WeatherEffects = {
    healthRate: 0,
    hungerMultiplier: 1,
    speedMultiplier: 1,
  };

  constructor() {
    this.state = { ...INITIAL_PLAYER_STATE };
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  setWeatherEffects(effects: WeatherEffects): void {
    this.weatherEffects = effects;
    this.updateSpeedMultiplier();
  }

  private updateSpeedMultiplier(): void {
    const weatherSpeed = this.weatherEffects.speedMultiplier;
    const weightSpeed = inventoryManager.getWeightMultiplier();
    this.state.speedMultiplier = weatherSpeed * weightSpeed;
  }

  update(deltaTime: number): void {
    this.updateHunger(deltaTime);
    this.updateHealth(deltaTime);
    this.updateSpeedMultiplier();
    this.notifyListeners();
  }

  private updateHunger(deltaTime: number): void {
    const decayRate = HUNGER_DECAY_RATE * this.weatherEffects.hungerMultiplier;
    this.state.hunger = Math.max(0, this.state.hunger - decayRate * deltaTime);
  }

  private updateHealth(deltaTime: number): void {
    let healthChange = this.weatherEffects.healthRate * deltaTime;

    if (this.state.hunger <= 0) {
      healthChange -= 0.3 * deltaTime;
    } else if (this.state.hunger < HEALTH_HUNGER_PENALTY_THRESHOLD) {
      healthChange -= HEALTH_HUNGER_PENALTY_RATE * deltaTime;
    }

    if (this.state.hunger > 50 && this.weatherEffects.healthRate >= 0) {
      healthChange += HEALTH_REGEN_RATE * deltaTime;
    }

    this.state.health = Math.max(0, Math.min(100, this.state.health + healthChange));
  }

  restoreHealth(amount: number): void {
    this.state.health = Math.min(100, this.state.health + amount);
    this.notifyListeners();
  }

  restoreHunger(amount: number): void {
    this.state.hunger = Math.min(100, this.state.hunger + amount);
    this.notifyListeners();
  }

  setTemperature(temp: number): void {
    this.state.temperature = temp;
    this.notifyListeners();
  }

  reset(): void {
    this.state = { ...INITIAL_PLAYER_STATE };
    this.notifyListeners();
  }

  subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }
}

export const playerStateManager = new PlayerStateManager();
