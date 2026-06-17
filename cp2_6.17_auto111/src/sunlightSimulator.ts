import * as THREE from 'three';

export interface SunlightParams {
  azimuth: number;
  altitude: number;
  month: number;
}

export interface SunlightUpdateResult {
  intensity: number;
  intensityPercent: number;
  sunDirection: THREE.Vector3;
  dateTime: Date;
}

export class SunlightSimulator {
  private scene: THREE.Scene;
  private directionalLight: THREE.DirectionalLight;
  private sunArrowHelper: THREE.ArrowHelper;
  private ambientLight: THREE.AmbientLight;
  private hemisphereLight: THREE.HemisphereLight;
  private currentParams: SunlightParams;
  private readonly SHADOW_MAP_SIZE = 2048;
  private readonly LIGHT_DISTANCE = 80;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentParams = {
      azimuth: 180,
      altitude: 45,
      month: 6
    };

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x4a4a4a, 0.4);
    this.scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = this.SHADOW_MAP_SIZE;
    this.directionalLight.shadow.mapSize.height = this.SHADOW_MAP_SIZE;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 200;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02;
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);

    const arrowDir = new THREE.Vector3(0, -1, 0);
    const arrowOrigin = new THREE.Vector3(0, 30, 0);
    this.sunArrowHelper = new THREE.ArrowHelper(
      arrowDir,
      arrowOrigin,
      12,
      0xffaa00,
      3,
      1.5
    );
    this.scene.add(this.sunArrowHelper);

    this.updateLight(this.currentParams);
  }

  private computeSunDirection(azimuthDeg: number, altitudeDeg: number): THREE.Vector3 {
    const azimuthRad = (azimuthDeg * Math.PI) / 180;
    const altitudeRad = (altitudeDeg * Math.PI) / 180;

    const cosAlt = Math.cos(altitudeRad);
    const x = cosAlt * Math.sin(azimuthRad);
    const y = Math.sin(altitudeRad);
    const z = cosAlt * Math.cos(azimuthRad);

    return new THREE.Vector3(x, y, z).normalize();
  }

  private computeIntensity(altitudeDeg: number): { value: number; percent: number } {
    const clampedAlt = Math.max(0, Math.min(90, altitudeDeg));
    const percent = clampedAlt / 90;
    const minIntensity = 0.05;
    const maxIntensity = 1.3;
    const value = minIntensity + (maxIntensity - minIntensity) * percent;
    return { value, percent: percent * 100 };
  }

  private computeDateTime(month: number): Date {
    const safeMonth = Math.max(1, Math.min(12, month));
    const year = new Date().getFullYear();
    const day = 15;
    const hour = 12;
    const minute = 0;
    return new Date(year, safeMonth - 1, day, hour, minute, 0, 0);
  }

  public updateLight(params: Partial<SunlightParams>): SunlightUpdateResult {
    this.currentParams = { ...this.currentParams, ...params };

    const { azimuth, altitude, month } = this.currentParams;
    const sunDir = this.computeSunDirection(azimuth, altitude);
    const { value: intensityValue, percent: intensityPercent } = this.computeIntensity(altitude);
    const dateTime = this.computeDateTime(month);

    const lightTarget = new THREE.Vector3(0, 5, 0);
    this.directionalLight.position.copy(lightTarget).add(sunDir.clone().multiplyScalar(this.LIGHT_DISTANCE));
    this.directionalLight.target.position.copy(lightTarget);
    this.directionalLight.intensity = intensityValue;

    const warmColor = this.computeSunColor(altitude, intensityPercent);
    this.directionalLight.color.copy(warmColor);

    const arrowOrigin = new THREE.Vector3(0, 32, 0);
    const arrowDir = sunDir.clone().negate();
    const arrowLength = 14;
    this.sunArrowHelper.position.copy(arrowOrigin);
    this.sunArrowHelper.setDirection(arrowDir);
    this.sunArrowHelper.setLength(arrowLength, 3, 1.5);
    this.sunArrowHelper.setColor(altitude < 15 ? 0xff6600 : 0xffcc00);

    this.directionalLight.shadow.needsUpdate = true;
    this.directionalLight.target.updateMatrixWorld();

    const ambientFactor = 0.2 + (intensityPercent / 100) * 0.25;
    this.ambientLight.intensity = ambientFactor;

    return {
      intensity: intensityValue,
      intensityPercent,
      sunDirection: sunDir,
      dateTime
    };
  }

  private computeSunColor(altitudeDeg: number, intensityPercent: number): THREE.Color {
    const noonColor = new THREE.Color(0xfffaf0);
    const sunsetColor = new THREE.Color(0xff8844);
    const nightColor = new THREE.Color(0x3a4a6a);

    let resultColor: THREE.Color;

    if (altitudeDeg <= 0) {
      resultColor = nightColor.clone();
    } else if (altitudeDeg < 20) {
      const t = altitudeDeg / 20;
      resultColor = sunsetColor.clone().lerp(noonColor, t);
    } else {
      resultColor = noonColor.clone();
    }

    const dimFactor = Math.max(0.3, intensityPercent / 100);
    resultColor.multiplyScalar(0.5 + dimFactor * 0.5);

    return resultColor;
  }

  public getDirectionalLight(): THREE.DirectionalLight {
    return this.directionalLight;
  }

  public getCurrentParams(): SunlightParams {
    return { ...this.currentParams };
  }
}

export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}
