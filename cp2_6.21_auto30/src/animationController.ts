import * as THREE from 'three';
import { ForestScene } from './forestScene';

const DUSK_COLOR = new THREE.Color(0xFF9800);
const NIGHT_COLOR = new THREE.Color(0x1A237E);
const CYCLE_DURATION = 180;

export class AnimationController {
  private forestScene: ForestScene;
  private time: number = 0;
  private cycleTime: number = 0;

  private sunBasePosition: THREE.Vector3 = new THREE.Vector3(50, 30, 20);
  private sunRotationSpeed: number = 0.02;

  constructor(forestScene: ForestScene) {
    this.forestScene = forestScene;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.cycleTime = (this.cycleTime + deltaTime) % CYCLE_DURATION;

    this.updateSunPosition();
    this.updateSkyColor();
  }

  private updateSunPosition(): void {
    const angle = this.time * this.sunRotationSpeed;
    const radius = 50;
    const height = 20 + Math.sin(angle * 0.5) * 15;

    const sunPos = new THREE.Vector3(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius * 0.5
    );

    this.forestScene.setSunPosition(sunPos);
  }

  private updateSkyColor(): void {
    const t = this.cycleTime / CYCLE_DURATION;
    const easedT = 0.5 - Math.cos(t * Math.PI * 2) * 0.5;

    const skyColor = new THREE.Color().lerpColors(
      DUSK_COLOR,
      NIGHT_COLOR,
      easedT
    );

    const ambientIntensity = 0.2 + (1 - easedT) * 0.3;

    this.forestScene.setAmbientColor(skyColor, ambientIntensity);
    this.forestScene.setFog(skyColor, 10, 60);
  }

  public getTime(): number {
    return this.time;
  }

  public getCycleProgress(): number {
    return this.cycleTime / CYCLE_DURATION;
  }

  public getCurrentSkyColor(): THREE.Color {
    const t = this.cycleTime / CYCLE_DURATION;
    const easedT = 0.5 - Math.cos(t * Math.PI * 2) * 0.5;
    return new THREE.Color().lerpColors(DUSK_COLOR, NIGHT_COLOR, easedT);
  }
}
