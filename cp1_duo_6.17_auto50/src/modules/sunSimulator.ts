import * as THREE from 'three';
import type { SceneContext } from './sceneSetup';

export class SunSimulator {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private currentHour = 12;

  constructor(ctx: SceneContext) {
    this.scene = ctx.scene;

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.setTime(12);
  }

  setTime(hour: number): void {
    this.currentHour = THREE.MathUtils.clamp(hour, 0, 24);

    const angle = ((this.currentHour - 6) / 12) * Math.PI;
    const sunX = Math.cos(angle) * 80;
    const sunY = Math.max(Math.sin(angle) * 80, -10);
    const sunZ = 20;

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.set(0, 0, 0);

    const dayFactor = Math.max(Math.sin(angle), 0);
    const intensity = 0.2 + dayFactor * 2.0;
    this.sunLight.intensity = intensity;

    const color = this.getColorTemperature(dayFactor);
    this.sunLight.color.copy(color);

    if (this.sunLight.shadow.camera) {
      this.sunLight.shadow.camera.updateProjectionMatrix();
    }
  }

  private getColorTemperature(dayFactor: number): THREE.Color {
    const t = dayFactor;

    if (t < 0.15) {
      return new THREE.Color(0x1a1a3e);
    } else if (t < 0.35) {
      const f = (t - 0.15) / 0.2;
      const r = 0.1 + f * 0.9;
      const g = 0.1 + f * 0.4;
      const b = 0.24 - f * 0.05;
      return new THREE.Color(r, g, b);
    } else if (t < 0.6) {
      const f = (t - 0.35) / 0.25;
      const r = 1.0 - f * 0.2;
      const g = 0.5 + f * 0.4;
      const b = 0.19 + f * 0.6;
      return new THREE.Color(r, g, b);
    } else {
      const f = (t - 0.6) / 0.4;
      const r = 0.8 + f * 0.2;
      const g = 0.9 + f * 0.1;
      const b = 0.79 + f * 0.21;
      return new THREE.Color(r, g, b);
    }
  }

  getHour(): number {
    return this.currentHour;
  }

  getSunLight(): THREE.DirectionalLight {
    return this.sunLight;
  }
}
