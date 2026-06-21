import * as THREE from 'three';

export interface SunlightParams {
  azimuth: number;
  altitude: number;
}

export class ShadowSystem {
  public sunLight: THREE.DirectionalLight;
  public sunHelper: THREE.DirectionalLightHelper;
  private target: THREE.Object3D;
  private scene: THREE.Scene;
  private currentAzimuth: number = 45;
  private currentAltitude: number = 45;
  private shadowCameraSize: number = 60;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.target = new THREE.Object3D();
    this.target.position.set(0, 0, 0);
    this.scene.add(this.target);

    this.sunLight = this.createSunLight();
    this.sunHelper = new THREE.DirectionalLightHelper(this.sunLight, 3, 0xFFD700);
    this.sunHelper.visible = false;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunHelper);

    this.updateSunlight(this.currentAzimuth, this.currentAltitude);
  }

  private createSunLight(): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(0xffffff, 1.4);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 200;
    light.shadow.camera.left = -this.shadowCameraSize;
    light.shadow.camera.right = this.shadowCameraSize;
    light.shadow.camera.top = this.shadowCameraSize;
    light.shadow.camera.bottom = -this.shadowCameraSize;
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.02;
    light.shadow.radius = 4;
    light.target = this.target;
    return light;
  }

  public updateSunlight(azimuth: number, altitude: number): void {
    this.currentAzimuth = THREE.MathUtils.clamp(azimuth, 0, 360);
    this.currentAltitude = THREE.MathUtils.clamp(altitude, 5, 85);

    const azimuthRad = THREE.MathUtils.degToRad(this.currentAzimuth);
    const altitudeRad = THREE.MathUtils.degToRad(this.currentAltitude);

    const distance = 80;
    const sunX = distance * Math.cos(altitudeRad) * Math.sin(azimuthRad);
    const sunY = distance * Math.sin(altitudeRad);
    const sunZ = distance * Math.cos(altitudeRad) * Math.cos(azimuthRad);

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target = this.target;
    this.sunLight.target.position.set(0, 0, 0);

    const altitudeFactor = this.currentAltitude / 85;
    const colorTemperature = this.getSunColor(this.currentAltitude);
    this.sunLight.color.copy(colorTemperature);
    this.sunLight.intensity = 0.6 + altitudeFactor * 1.0;

    this.sunLight.shadow.bias = -0.0003 - altitudeFactor * 0.0003;
    this.sunLight.shadow.radius = 2 + (1 - altitudeFactor) * 6;

    this.sunLight.shadow.camera.updateProjectionMatrix();
    this.sunHelper.update();
  }

  private getSunColor(altitude: number): THREE.Color {
    const t = altitude / 85;
    const sunrise = new THREE.Color(0xFF9966);
    const midday = new THREE.Color(0xFFF5E6);
    const sunset = new THREE.Color(0xFF7744);

    if (t < 0.15) {
      const blend = t / 0.15;
      return sunrise.clone().lerp(midday, blend);
    } else if (t > 0.85) {
      const blend = (t - 0.85) / 0.15;
      return midday.clone().lerp(sunset, blend);
    }
    return midday.clone();
  }

  public getMaterialShininessFactor(): number {
    const altitudeFactor = this.currentAltitude / 85;
    return 0.15 + altitudeFactor * 0.35;
  }

  public getSunlightParams(): SunlightParams {
    return {
      azimuth: this.currentAzimuth,
      altitude: this.currentAltitude
    };
  }

  public updateTarget(position: THREE.Vector3): void {
    this.target.position.copy(position);
  }

  public dispose(): void {
    this.scene.remove(this.sunLight);
    this.scene.remove(this.sunHelper);
    this.scene.remove(this.target);
    this.sunLight.dispose();
    this.sunHelper.dispose();
  }
}
