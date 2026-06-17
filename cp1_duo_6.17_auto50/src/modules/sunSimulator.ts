import * as THREE from 'three';
import type { SceneContext } from './sceneSetup';

const TEMP_WARM = 2700;
const TEMP_COOL = 6500;

export class SunSimulator {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private currentHour = 12;

  private readonly shadowMapSize = 1024;

  constructor(ctx: SceneContext) {
    this.scene = ctx.scene;

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sunLight.castShadow = true;

    this.sunLight.shadow.mapSize.width = this.shadowMapSize;
    this.sunLight.shadow.mapSize.height = this.shadowMapSize;

    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.camera.left = -60;
    this.sunLight.shadow.camera.right = 60;
    this.sunLight.shadow.camera.top = 60;
    this.sunLight.shadow.camera.bottom = -60;

    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.sunLight.shadow.radius = 2;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.setTime(12);
  }

  private kelvinToColor(kelvin: number): THREE.Color {
    const temp = kelvin / 100;
    let r: number, g: number, b: number;

    if (temp <= 66) {
      r = 255;
      g = 99.4708025861 * Math.log(temp) - 161.1195681661;
      if (temp <= 19) {
        b = 0;
      } else {
        b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
      }
    } else {
      r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
      g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
      b = 255;
    }

    return new THREE.Color(
      THREE.MathUtils.clamp(r / 255, 0, 1),
      THREE.MathUtils.clamp(g / 255, 0, 1),
      THREE.MathUtils.clamp(b / 255, 0, 1)
    );
  }

  private lerpColorByTime(hour: number): THREE.Color {
    const normalizedDay = Math.max(0, Math.min(1, (hour - 6) / 12));
    const temp = TEMP_WARM + (TEMP_COOL - TEMP_WARM) * normalizedDay;
    return this.kelvinToColor(temp);
  }

  setTime(hour: number): void {
    this.currentHour = THREE.MathUtils.clamp(hour, 0, 24);

    const angle = ((this.currentHour - 6) / 12) * Math.PI;
    const sunDistance = 80;
    const sunX = Math.cos(angle) * sunDistance;
    const sunY = Math.max(Math.sin(angle) * sunDistance, -10);
    const sunZ = 15;

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.set(0, 0, 0);

    const dayFactor = Math.max(Math.sin(angle), 0);
    const intensity = 0.15 + dayFactor * 1.85;
    this.sunLight.intensity = intensity;

    const sunColor = this.lerpColorByTime(this.currentHour);

    const nightFactor = 1 - dayFactor;
    if (nightFactor > 0) {
      const nightColor = new THREE.Color(0x1a1a3e);
      sunColor.lerp(nightColor, nightFactor * 0.7);
    }

    this.sunLight.color.copy(sunColor);

    if (this.sunLight.shadow.camera) {
      this.sunLight.shadow.camera.updateProjectionMatrix();
    }
  }

  getHour(): number {
    return this.currentHour;
  }

  getSunLight(): THREE.DirectionalLight {
    return this.sunLight;
  }

  getShadowMapSize(): number {
    return this.shadowMapSize;
  }
}
