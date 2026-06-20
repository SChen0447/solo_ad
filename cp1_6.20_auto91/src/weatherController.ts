import * as THREE from 'three';
import { BuildingData, setWindowOpacity } from './cityGenerator';
import { ParticleSystem, WeatherType } from './particleSystem';

export interface WeatherState {
  timeOfDay: number;
  weatherType: WeatherType;
  skyColor: THREE.Color;
  ambientIntensity: number;
  directionalIntensity: number;
}

export class WeatherController {
  private scene: THREE.Scene;
  private buildings: BuildingData[];
  private particleSystem: ParticleSystem;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  private timeOfDay: number = 6;
  private weatherType: WeatherType = 'sunny';

  private skyColor: THREE.Color = new THREE.Color();

  private sliderElement: HTMLInputElement | null = null;
  private sliderThumb: HTMLElement | null = null;
  private sliderFill: HTMLElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private weatherDisplay: HTMLElement | null = null;
  private weatherButtons: HTMLElement[] = [];

  private isDragging: boolean = false;

  constructor(
    scene: THREE.Scene,
    buildings: BuildingData[],
    particleSystem: ParticleSystem,
    ambientLight: THREE.AmbientLight,
    directionalLight: THREE.DirectionalLight
  ) {
    this.scene = scene;
    this.buildings = buildings;
    this.particleSystem = particleSystem;
    this.ambientLight = ambientLight;
    this.directionalLight = directionalLight;

    this.initUI();
    this.updateScene(0);
  }

  private initUI(): void {
    this.sliderElement = document.getElementById('time-slider') as HTMLInputElement;
    this.sliderThumb = document.getElementById('slider-thumb');
    this.sliderFill = document.getElementById('slider-fill');
    this.timeDisplay = document.getElementById('time-display');
    this.weatherDisplay = document.getElementById('weather-display');

    const buttons = document.querySelectorAll('.weather-btn');
    buttons.forEach((btn) => {
      this.weatherButtons.push(btn as HTMLElement);
      btn.addEventListener('click', () => {
        const weather = (btn as HTMLElement).dataset.weather as WeatherType;
        if (weather) {
          this.setWeatherType(weather);
        }
      });
    });

    if (this.sliderElement) {
      this.sliderElement.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.setTimeOfDay(value);
      });
    }

    this.updateSliderUI();
    this.updateWeatherButtons();
  }

  public setTimeOfDay(time: number): void {
    this.timeOfDay = Math.max(0, Math.min(24, time));
    if (this.sliderElement) {
      this.sliderElement.value = this.timeOfDay.toString();
    }
    this.updateSliderUI();
  }

  public setWeatherType(type: WeatherType): void {
    this.weatherType = type;
    this.particleSystem.setWeather(type);
    this.updateWeatherButtons();
  }

  public getState(): WeatherState {
    return {
      timeOfDay: this.timeOfDay,
      weatherType: this.weatherType,
      skyColor: this.skyColor.clone(),
      ambientIntensity: this.ambientLight.intensity,
      directionalIntensity: this.directionalLight.intensity,
    };
  }

  public update(deltaTime: number): void {
    this.updateSkyColor();
    this.updateLighting();
    this.updateWindows(deltaTime);
    this.particleSystem.update(deltaTime, this.timeOfDay);
    this.updateTimeDisplay();
  }

  private updateSkyColor(): void {
    const time = this.timeOfDay;
    let color: THREE.Color;

    if (time >= 6 && time <= 18) {
      const dayProgress = (time - 6) / 12;
      if (dayProgress < 0.5) {
        const t = dayProgress * 2;
        color = this.lerpColor(
          new THREE.Color(0x87ceeb),
          new THREE.Color(0x87ceeb),
          t
        );
      } else {
        const t = (dayProgress - 0.5) * 2;
        color = this.lerpColor(
          new THREE.Color(0x87ceeb),
          new THREE.Color(0x4a90d9),
          t
        );
      }
    } else {
      let nightProgress: number;
      if (time >= 18) {
        nightProgress = (time - 18) / 12;
      } else {
        nightProgress = (time + 6) / 12;
      }
      if (nightProgress < 0.5) {
        const t = nightProgress * 2;
        color = this.lerpColor(
          new THREE.Color(0x0a0a2e),
          new THREE.Color(0x000000),
          t
        );
      } else {
        const t = (nightProgress - 0.5) * 2;
        color = this.lerpColor(
          new THREE.Color(0x000000),
          new THREE.Color(0x0a0a2e),
          t
        );
      }
    }

    this.skyColor.copy(color);
    this.scene.background = this.skyColor;
  }

  private updateLighting(): void {
    const time = this.timeOfDay;

    if (time >= 6 && time <= 18) {
      const dayProgress = (time - 6) / 12;
      const intensity = 0.3 + Math.sin(dayProgress * Math.PI) * 0.7;
      this.directionalLight.intensity = intensity;
      this.ambientLight.intensity = 0.4 + intensity * 0.3;

      const sunAngle = (time - 6) / 12 * Math.PI;
      this.directionalLight.position.set(
        Math.cos(sunAngle) * 30,
        Math.sin(sunAngle) * 30 + 10,
        20
      );
    } else {
      this.directionalLight.intensity = 0.05;
      this.ambientLight.intensity = 0.15;
    }
  }

  private updateWindows(deltaTime: number): void {
    const time = this.timeOfDay;
    const isNight = time < 6 || time > 18;

    let targetOpacity: number;
    if (time >= 17 && time <= 19) {
      const duskProgress = (time - 17) / 2;
      targetOpacity = duskProgress;
    } else if (time >= 5 && time <= 7) {
      const dawnProgress = (time - 5) / 2;
      targetOpacity = 1 - dawnProgress;
    } else if (isNight) {
      targetOpacity = 1;
    } else {
      targetOpacity = 0;
    }

    this.buildings.forEach((building) => {
      building.windows.forEach((windowMesh, index) => {
        const mat = windowMesh.material as THREE.MeshBasicMaterial;
        const target = building.windowOpacityTargets[index] * targetOpacity;
        const speed = 1 / 1 * deltaTime;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, target, speed);
      });
    });
  }

  private lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
    const result = color1.clone();
    result.lerp(color2, t);
    return result;
  }

  private updateSliderUI(): void {
    if (!this.sliderThumb && !this.sliderFill) return;

    const percentage = (this.timeOfDay / 24) * 100;
    if (this.sliderThumb) {
      this.sliderThumb.style.bottom = `calc(${percentage}% - 12px)`;
    }
    if (this.sliderFill) {
      this.sliderFill.style.height = `${percentage}%`;
    }
  }

  private updateTimeDisplay(): void {
    if (!this.timeDisplay) return;

    const hours = Math.floor(this.timeOfDay);
    const minutes = Math.floor((this.timeOfDay - hours) * 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    this.timeDisplay.textContent = timeStr;
  }

  private updateWeatherButtons(): void {
    this.weatherButtons.forEach((btn) => {
      const weather = btn.dataset.weather as WeatherType;
      if (weather === this.weatherType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (this.weatherDisplay) {
      const weatherNames: Record<WeatherType, string> = {
        sunny: '晴天',
        rainy: '雨天',
        cloudy: '阴天',
      };
      this.weatherDisplay.textContent = weatherNames[this.weatherType];
    }
  }

  private updateScene(deltaTime: number): void {
    this.updateSkyColor();
    this.updateLighting();
    this.updateWindows(deltaTime);
  }
}
