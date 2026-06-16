import * as THREE from 'three';
import { Building } from './Building';
import type { CityData, WeatherType } from '../data/Simulator';

export class CityGenerator {
  public group: THREE.Group;
  public ground: THREE.Mesh;
  public gridHelper: THREE.GridHelper;
  private buildings: Building[] = [];
  private weatherParticles: THREE.Points | null = null;
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private sunLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;
  private fog: THREE.Fog;
  private readonly citySize: number = 60;
  private readonly minBuildings: number = 500;
  private readonly maxBuildings: number = 900;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.group = new THREE.Group();
    scene.add(this.group);

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d3a, 0.4);
    scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(50, 80, 30);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.left = -80;
    this.directionalLight.shadow.camera.right = 80;
    this.directionalLight.shadow.camera.top = 80;
    this.directionalLight.shadow.camera.bottom = -80;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 300;
    this.directionalLight.shadow.bias = -0.001;
    scene.add(this.directionalLight);

    this.sunLight = new THREE.DirectionalLight(0xffaa55, 0);
    this.sunLight.position.set(-30, 40, -50);
    scene.add(this.sunLight);

    const groundGeom = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1d3a,
      roughness: 0.9,
      metalness: 0.1
    });
    this.ground = new THREE.Mesh(groundGeom, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    scene.add(this.ground);

    this.gridHelper = new THREE.GridHelper(200, 40, 0x00d4ff, 0x1a2040);
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.25;
    this.gridHelper.position.y = 0.01;
    scene.add(this.gridHelper);

    this.fog = new THREE.Fog(0x0a0e27, 60, 180);
    scene.fog = this.fog;
    scene.background = new THREE.Color(0x0a0e27);

    this.generateInitialBuildings();
  }

  private generateInitialBuildings(): void {
    const count = this.minBuildings + Math.floor(Math.random() * (this.maxBuildings - this.minBuildings + 1));
    const halfSize = this.citySize / 2;

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * this.citySize;
      const z = (Math.random() - 0.5) * this.citySize;
      const distFromCenter = Math.sqrt(x * x + z * z) / halfSize;

      const width = 1 + Math.random() * 2.5;
      const depth = 1 + Math.random() * 2.5;
      const baseHeight = 2 + Math.random() * 18 * (1 - distFromCenter * 0.4);

      const building = new Building({
        position: new THREE.Vector3(x, 0, z),
        baseWidth: width,
        baseDepth: depth,
        baseHeight: baseHeight,
        seed: Math.random()
      });

      this.buildings.push(building);
      this.group.add(building.mesh);
    }
  }

  public updateCity(data: CityData): void {
    for (const building of this.buildings) {
      building.updateTarget(data);
    }
    this.updateLighting(data);
    this.updateWeatherParticles(data.weather);
  }

  public animate(deltaTime: number): void {
    for (const building of this.buildings) {
      building.animate(deltaTime);
    }
    this.animateWeatherParticles(deltaTime);
  }

  private updateLighting(data: CityData): void {
    const time = data.time;
    const sunAngle = ((time - 6) / 24) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 80;
    const sunY = Math.max(5, sunHeight * 80);
    const sunZ = Math.sin(sunAngle) * 40;

    this.directionalLight.position.set(sunX, sunY, sunZ);

    const dayFactor = Math.max(0, Math.min(1, (sunHeight + 0.2) * 1.5));
    const twilightFactor = Math.max(0, 1 - Math.abs(sunHeight) * 3);

    const dayColor = new THREE.Color(0xffffff);
    const sunsetColor = new THREE.Color(0xff7733);
    const nightColor = new THREE.Color(0x223355);

    let lightColor: THREE.Color;
    if (dayFactor > 0.3) {
      lightColor = dayColor.clone().lerp(sunsetColor, twilightFactor * 0.5);
    } else {
      lightColor = sunsetColor.clone().lerp(nightColor, 1 - dayFactor * 3);
    }

    this.directionalLight.color.copy(lightColor);
    this.directionalLight.intensity = 0.2 + dayFactor * 1.0;

    this.sunLight.color.copy(sunsetColor);
    this.sunLight.intensity = twilightFactor * 0.8;

    const skyDay = new THREE.Color(0x87ceeb);
    const skySunset = new THREE.Color(0xff6b35);
    const skyNight = new THREE.Color(0x0a0e27);

    let skyColor: THREE.Color;
    if (dayFactor > 0.3) {
      skyColor = skyDay.clone().lerp(skySunset, twilightFactor);
    } else {
      skyColor = skySunset.clone().lerp(skyNight, 1 - dayFactor * 3);
    }

    if (data.weather === 'cloudy') {
      skyColor.lerp(new THREE.Color(0x556677), 0.5);
    } else if (data.weather === 'rainy') {
      skyColor.lerp(new THREE.Color(0x334455), 0.6);
    } else if (data.weather === 'snowy') {
      skyColor.lerp(new THREE.Color(0xaaaacc), 0.4);
    }

    (this.scene.background as THREE.Color).copy(skyColor);
    this.fog.color.copy(skyColor);

    this.ambientLight.color.copy(lightColor).multiplyScalar(0.5);
    this.ambientLight.intensity = 0.2 + dayFactor * 0.5;

    this.hemisphereLight.intensity = 0.2 + dayFactor * 0.4;
  }

  private updateWeatherParticles(weather: WeatherType): void {
    this.clearWeatherParticles();

    if (weather === 'sunny' || weather === 'cloudy') return;

    const particleCount = weather === 'rainy' ? 3000 : 1500;
    const positions = new Float32Array(particleCount * 3);
    const half = this.citySize / 2 + 10;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * half * 2;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * half * 2;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const color = weather === 'rainy' ? 0x88ccff : 0xffffff;
    const mat = new THREE.PointsMaterial({
      color,
      size: weather === 'rainy' ? 0.15 : 0.4,
      transparent: true,
      opacity: weather === 'rainy' ? 0.6 : 0.85,
      sizeAttenuation: true
    });

    this.weatherParticles = new THREE.Points(geom, mat);
    this.scene.add(this.weatherParticles);
  }

  private animateWeatherParticles(deltaTime: number): void {
    if (!this.weatherParticles) return;

    const positions = this.weatherParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;
    const count = positions.count;
    const speed = this.weatherParticles.material instanceof THREE.PointsMaterial
      && (this.weatherParticles.material.color.getHex() === 0x88ccff) ? 40 : 8;
    const half = this.citySize / 2 + 10;

    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speed * deltaTime;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 60;
        arr[i * 3] = (Math.random() - 0.5) * half * 2;
        arr[i * 3 + 2] = (Math.random() - 0.5) * half * 2;
      }
    }
    positions.needsUpdate = true;
  }

  private clearWeatherParticles(): void {
    if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles);
      const geom = this.weatherParticles.geometry as THREE.BufferGeometry;
      geom.dispose();
      (this.weatherParticles.material as THREE.Material).dispose();
      this.weatherParticles = null;
    }
  }

  public getBuildingCount(): number {
    return this.buildings.length;
  }

  public getTriangleCount(): number {
    let count = 0;
    for (const b of this.buildings) {
      count += 12;
      if (b.windows) count += 12;
    }
    count += 2;
    return count;
  }

  public dispose(): void {
    for (const b of this.buildings) {
      this.group.remove(b.mesh);
      b.dispose();
    }
    this.buildings = [];
    this.clearWeatherParticles();
  }
}
