import * as THREE from 'three';
import { ForestScene } from './forestScene';

const DUSK_ORANGE = new THREE.Color(0xFF9800);
const DUSK_PINK = new THREE.Color(0xFF6B9D);
const TWILIGHT_PURPLE = new THREE.Color(0x7B1FA2);
const NIGHT_DEEP_BLUE = new THREE.Color(0x0D47A1);
const NIGHT_BLUE_PURPLE = new THREE.Color(0x1A237E);
const CYCLE_DURATION = 180;

export class AnimationController {
  private forestScene: ForestScene;
  private time: number = 0;
  private cycleTime: number = 0;

  private sunBasePosition: THREE.Vector3 = new THREE.Vector3(50, 30, 20);
  private sunRotationSpeed: number = 0.02;

  private cloudTime: number = 0;

  constructor(forestScene: ForestScene) {
    this.forestScene = forestScene;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.cycleTime = (this.cycleTime + deltaTime) % CYCLE_DURATION;
    this.cloudTime += deltaTime;

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

    const baseColor = this.getMultiStopGradient(easedT);

    const cloudVariation = Math.sin(this.cloudTime * 0.1) * 0.03 + Math.sin(this.cloudTime * 0.23 + 1.5) * 0.02;
    const finalColor = baseColor.clone();
    finalColor.offsetHSL(cloudVariation * 0.1, 0, cloudVariation * 0.05);

    const ambientIntensity = 0.2 + (1 - easedT) * 0.3;

    this.forestScene.setAmbientColor(finalColor, ambientIntensity);

    const fogColor = finalColor.clone().multiplyScalar(0.8);
    this.forestScene.setFog(fogColor, 10, 60);
  }

  private getMultiStopGradient(t: number): THREE.Color {
    const stops = [
      { pos: 0.0, color: DUSK_ORANGE },
      { pos: 0.2, color: DUSK_PINK },
      { pos: 0.45, color: TWILIGHT_PURPLE },
      { pos: 0.7, color: NIGHT_DEEP_BLUE },
      { pos: 1.0, color: NIGHT_BLUE_PURPLE }
    ];

    if (t <= stops[0].pos) return stops[0].color.clone();
    if (t >= stops[stops.length - 1].pos) return stops[stops.length - 1].color.clone();

    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].pos && t <= stops[i + 1].pos) {
        const range = stops[i + 1].pos - stops[i].pos;
        const localT = (t - stops[i].pos) / range;
        return new THREE.Color().lerpColors(stops[i].color, stops[i + 1].color, localT);
      }
    }

    return stops[0].color.clone();
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
    return this.getMultiStopGradient(easedT);
  }
}
