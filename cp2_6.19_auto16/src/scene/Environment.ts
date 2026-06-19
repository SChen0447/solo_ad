import * as THREE from 'three';
import { SunPosition, LightParams, LATITUDE } from '../types';

export class Environment {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private ground: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private sunPosition: SunPosition = { azimuth: 180, elevation: 45 };
  private lightParams: LightParams = {
    position: { x: 0, y: 100, z: 0 },
    intensity: 1,
    color: 0xffffff,
    direction: { x: 0, y: -1, z: 0 }
  };

  private onLightChange?: (params: LightParams) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sunLight = this.createSunLight();
    this.ambientLight = this.createAmbientLight();
    this.ground = this.createGround();
    this.gridHelper = this.createGrid();
    
    this.scene.add(this.sunLight);
    this.scene.add(this.ambientLight);
    this.scene.add(this.ground);
    this.scene.add(this.gridHelper);
    
    this.setupBackground();
  }

  private createSunLight(): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(100, 100, 50);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = -200;
    light.shadow.camera.right = 200;
    light.shadow.camera.top = 200;
    light.shadow.camera.bottom = -200;
    light.shadow.bias = -0.0001;
    return light;
  }

  private createAmbientLight(): THREE.AmbientLight {
    return new THREE.AmbientLight(0x404060, 0.4);
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(500, 500);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    return ground;
  }

  private createGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(500, 50, 0x333344, 0x222233);
    grid.position.y = 0.01;
    return grid;
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  public calculateSunPosition(date: string, hour: number): SunPosition {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
    const hourAngle = 15 * (hour - 12);
    
    const latRad = LATITUDE * Math.PI / 180;
    const decRad = declination * Math.PI / 180;
    const haRad = hourAngle * Math.PI / 180;
    
    const sinElevation = Math.sin(latRad) * Math.sin(decRad) + 
                        Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation))) * 180 / Math.PI;
    
    const cosAzimuth = (Math.sin(decRad) * Math.cos(latRad) - Math.cos(decRad) * Math.sin(latRad) * Math.cos(haRad)) / 
                       Math.cos(elevation * Math.PI / 180);
    const sinAzimuth = Math.cos(decRad) * Math.sin(haRad) / Math.cos(elevation * Math.PI / 180);
    
    let azimuth = Math.atan2(sinAzimuth, cosAzimuth) * 180 / Math.PI;
    azimuth = (azimuth + 360) % 360;
    
    return { azimuth, elevation: Math.max(0, elevation) };
  }

  public updateSun(date: string, hour: number): void {
    this.sunPosition = this.calculateSunPosition(date, hour);
    
    const elevationRad = this.sunPosition.elevation * Math.PI / 180;
    const azimuthRad = this.sunPosition.azimuth * Math.PI / 180;
    
    const distance = 200;
    const x = distance * Math.sin(azimuthRad) * Math.cos(elevationRad);
    const y = distance * Math.sin(elevationRad);
    const z = distance * Math.cos(azimuthRad) * Math.cos(elevationRad);
    
    this.sunLight.position.set(x, y, z);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.target.updateMatrixWorld();
    
    const normalizedElevation = Math.max(0, this.sunPosition.elevation) / 90;
    this.sunLight.intensity = 0.2 + normalizedElevation * 1.3;
    this.ambientLight.intensity = 0.2 + normalizedElevation * 0.4;
    
    let lightColor: number;
    if (normalizedElevation < 0.2) {
      lightColor = 0xffaa66;
    } else if (normalizedElevation < 0.4) {
      lightColor = 0xffddaa;
    } else {
      lightColor = 0xffffff;
    }
    this.sunLight.color.setHex(lightColor);
    
    const dir = new THREE.Vector3(-x, -y, -z).normalize();
    this.lightParams = {
      position: { x, y, z },
      intensity: this.sunLight.intensity,
      color: lightColor,
      direction: { x: dir.x, y: dir.y, z: dir.z }
    };
    
    if (this.onLightChange) {
      this.onLightChange(this.lightParams);
    }
  }

  public getSunPosition(): SunPosition {
    return { ...this.sunPosition };
  }

  public getLightParams(): LightParams {
    return { ...this.lightParams };
  }

  public setOnLightChange(callback: (params: LightParams) => void): void {
    this.onLightChange = callback;
  }

  public getSunLight(): THREE.DirectionalLight {
    return this.sunLight;
  }

  public getGround(): THREE.Mesh {
    return this.ground;
  }
}
