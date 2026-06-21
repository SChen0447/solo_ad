import * as THREE from 'three';
import { Furniture } from '../models/Furniture';

export class LightManager {
  private scene: THREE.Scene;

  public ambientLight: THREE.AmbientLight;
  public spotLight: THREE.SpotLight;
  public spotLightTarget: THREE.Object3D;
  public pointLight: THREE.PointLight;

  private pointLightEnabled: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.spotLightTarget = new THREE.Object3D();
    this.spotLightTarget.position.set(0, 0, 0);
    this.scene.add(this.spotLightTarget);

    this.spotLight = new THREE.SpotLight(0xffffff, 1.0);
    this.spotLight.position.set(0, 2.9, 0);
    this.spotLight.target = this.spotLightTarget;
    this.spotLight.angle = Math.PI / 4;
    this.spotLight.penumbra = 0.3;
    this.spotLight.decay = 1;
    this.spotLight.distance = 10;
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 2048;
    this.spotLight.shadow.mapSize.height = 2048;
    this.spotLight.shadow.camera.near = 0.1;
    this.spotLight.shadow.camera.far = 20;
    this.scene.add(this.spotLight);

    this.pointLight = new THREE.PointLight(0xffe4b5, 0.6, 5, 1);
    this.pointLight.position.set(0, 1.7, 0);
    this.pointLight.castShadow = true;
    this.pointLight.shadow.mapSize.width = 2048;
    this.pointLight.shadow.mapSize.height = 2048;
    this.pointLight.shadow.camera.near = 0.1;
    this.pointLight.shadow.camera.far = 20;
    this.scene.add(this.pointLight);
  }

  public addPointLight(position: THREE.Vector3, color: number = 0xffffff, intensity: number = 1.0): THREE.PointLight {
    const light = new THREE.PointLight(color, intensity, 5, 1);
    light.position.copy(position);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    this.scene.add(light);
    return light;
  }

  public adjustLightIntensity(light: THREE.Light, intensity: number): void {
    light.intensity = intensity;
    if (light === this.pointLight) {
      this.pointLight.visible = intensity > 0;
    }
  }

  public removeLight(light: THREE.Light): void {
    this.scene.remove(light);
  }

  public setSpotLightIntensity(value: number): void {
    this.spotLight.intensity = value;
  }

  public setSpotLightAngle(degrees: number): void {
    this.spotLight.angle = (degrees * Math.PI) / 180;
  }

  public setSpotLightColor(color: string): void {
    this.spotLight.color.set(color);
  }

  public setSpotLightPosition(x: number, y: number, z: number): void {
    this.spotLight.position.set(x, y + 3, z);
    this.spotLightTarget.position.set(x, 0.5, z);
  }

  public setPointLightEnabled(enabled: boolean): void {
    this.pointLightEnabled = enabled;
    this.pointLight.visible = enabled;
  }

  public isPointLightEnabled(): boolean {
    return this.pointLightEnabled;
  }

  public setPointLightIntensity(value: number): void {
    this.pointLight.intensity = value;
    if (value > 0 && this.pointLightEnabled) {
      this.pointLight.visible = true;
    }
  }

  public setPointLightColor(color: string): void {
    this.pointLight.color.set(color);
  }

  public setAmbientIntensity(value: number): void {
    this.ambientLight.intensity = value;
  }

  public updateFloorLampLight(furnitureList: Furniture[]): void {
    const floorLamps = furnitureList.filter(f => f.type === 'floorLamp');
    if (floorLamps.length > 0) {
      const lamp = floorLamps[0];
      this.pointLight.position.set(
        lamp.group.position.x,
        lamp.group.position.y + lamp.size.y + 0.1,
        lamp.group.position.z
      );
    } else {
      this.pointLight.position.set(0, 1.7, 0);
    }
  }

  public getSpotLightPosition(): { x: number; y: number; z: number } {
    return {
      x: this.spotLight.position.x,
      y: this.spotLight.position.y - 3,
      z: this.spotLight.position.z
    };
  }
}
