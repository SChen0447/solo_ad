import {
  WeatherType,
  WeatherState,
  WeatherEffects,
  WEATHER_CONFIG,
  TRANSITION_DURATION,
} from './types';

export class WeatherManager {
  private state: WeatherState;
  private listeners: Set<(state: WeatherState) => void> = new Set();
  private timeAccumulator: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): WeatherState {
    const initialType = WeatherType.Sunny;
    const config = WEATHER_CONFIG[initialType];
    return {
      type: initialType,
      intensity: 0.5,
      temperature: (config.minTemp + config.maxTemp) / 2,
      duration: this.randomInRange(config.minDuration, config.maxDuration),
      isTransitioning: false,
      transitionProgress: 0,
      transitionDuration: TRANSITION_DURATION,
    };
  }

  private randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private selectNextWeather(): WeatherType {
    const types = Object.values(WeatherType);
    const totalProbability = types.reduce(
      (sum, type) => sum + WEATHER_CONFIG[type].baseProbability,
      0
    );
    let random = Math.random() * totalProbability;

    for (const type of types) {
      random -= WEATHER_CONFIG[type].baseProbability;
      if (random <= 0) {
        return type;
      }
    }
    return WeatherType.Sunny;
  }

  getState(): WeatherState {
    return { ...this.state };
  }

  getEffects(): WeatherEffects {
    const currentEffects = WEATHER_CONFIG[this.state.type].effects;

    if (!this.state.isTransitioning || !this.state.nextWeather) {
      return currentEffects;
    }

    const nextEffects = WEATHER_CONFIG[this.state.nextWeather].effects;
    const progress = this.state.transitionProgress;

    return {
      healthRate: this.lerp(currentEffects.healthRate, nextEffects.healthRate, progress),
      hungerMultiplier: this.lerp(
        currentEffects.hungerMultiplier,
        nextEffects.hungerMultiplier,
        progress
      ),
      speedMultiplier: this.lerp(
        currentEffects.speedMultiplier,
        nextEffects.speedMultiplier,
        progress
      ),
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  update(deltaTime: number): void {
    if (this.state.isTransitioning) {
      this.updateTransition(deltaTime);
    } else {
      this.updateDuration(deltaTime);
    }
    this.notifyListeners();
  }

  private updateTransition(deltaTime: number): void {
    this.state.transitionProgress += deltaTime / this.state.transitionDuration;

    if (this.state.transitionProgress >= 1) {
      this.state.transitionProgress = 1;
      this.completeTransition();
    }

    this.updateTemperatureDuringTransition();
  }

  private completeTransition(): void {
    if (!this.state.nextWeather) return;

    this.state.type = this.state.nextWeather;
    this.state.intensity = this.state.nextWeatherIntensity ?? 0.5;
    this.state.isTransitioning = false;
    this.state.transitionProgress = 0;

    const config = WEATHER_CONFIG[this.state.type];
    this.state.temperature = this.randomInRange(config.minTemp, config.maxTemp);
    this.state.duration = this.randomInRange(config.minDuration, config.maxDuration);
    this.state.nextWeather = undefined;
    this.state.nextWeatherIntensity = undefined;
  }

  private updateTemperatureDuringTransition(): void {
    if (!this.state.nextWeather) return;

    const currentConfig = WEATHER_CONFIG[this.state.type];
    const nextConfig = WEATHER_CONFIG[this.state.nextWeather];
    const progress = this.state.transitionProgress;

    const currentTemp = this.state.temperature;
    const targetTemp = this.randomInRange(nextConfig.minTemp, nextConfig.maxTemp);

    this.state.temperature = this.lerp(currentTemp, targetTemp, progress);
  }

  private updateDuration(deltaTime: number): void {
    this.state.duration -= deltaTime;

    if (this.state.duration <= 0) {
      this.startTransition();
    }
  }

  private startTransition(): void {
    this.state.nextWeather = this.selectNextWeather();
    this.state.nextWeatherIntensity = Math.random();
    this.state.isTransitioning = true;
    this.state.transitionProgress = 0;
    this.state.transitionDuration = TRANSITION_DURATION;
  }

  skipTime(seconds: number): void {
    this.timeAccumulator += seconds;
    const stepSize = 1;
    
    while (this.timeAccumulator >= stepSize) {
      this.update(stepSize);
      this.timeAccumulator -= stepSize;
    }
    
    if (this.timeAccumulator > 0) {
      this.update(this.timeAccumulator);
      this.timeAccumulator = 0;
    }
  }

  subscribe(listener: (state: WeatherState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }
}

export const weatherManager = new WeatherManager();
