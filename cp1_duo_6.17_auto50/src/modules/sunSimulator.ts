import * as THREE from 'three';
import type { SceneContext } from './sceneSetup';
import { SHADOW_MAP_WIDTH, SHADOW_MAP_HEIGHT } from './sceneSetup';

const COLOR_2700K = new THREE.Color(1.0, 0.612, 0.337);
const COLOR_6500K = new THREE.Color(0.956, 0.968, 1.0);

export class SunSimulator {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private currentHour = 12;

  constructor(ctx: SceneContext) {
    this.scene = ctx.scene;

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sunLight.castShadow = true;

    this.sunLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    this.sunLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

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

  private lerpColorByTime(hour: number): THREE.Color {
    const normalizedDay = Math.max(0, Math.min(1, (hour - 6) / 12));

    const result = COLOR_2700K.clone();
    result.lerp(COLOR_6500K, normalizedDay);
    return result;
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
    return SHADOW_MAP_WIDTH;
  }
}
