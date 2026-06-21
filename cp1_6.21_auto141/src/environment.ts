import * as THREE from 'three';
import { getSunPosition, getAmbientIntensity, getFogParams } from './season';

export class Environment {
  public scene: THREE.Scene;
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;
  public ground: THREE.Mesh;
  public currentMonth: number = 1;
  private targetMonth: number = 1;
  private targetSunColor: THREE.Color;
  private currentSunColor: THREE.Color;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xbde4ff, 0x5a6b3a, 0.35);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 150;
    this.sunLight.shadow.camera.left = -40;
    this.sunLight.shadow.camera.right = 40;
    this.sunLight.shadow.camera.top = 40;
    this.sunLight.shadow.camera.bottom = -40;
    this.sunLight.shadow.bias = -0.0008;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.createGround();

    const initialFog = getFogParams(1);
    this.scene.fog = new THREE.Fog(initialFog.color, initialFog.near, initialFog.far);
    this.scene.background = initialFog.color;

    this.currentSunColor = new THREE.Color(0xfff4e0);
    this.targetSunColor = new THREE.Color(0xfff4e0);
  }

  private createGround(): void {
    const size = 60;
    const segments = 60;

    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i);
      const dist = Math.sqrt(x * x + z * z);
      const noise = (Math.sin(x * 0.35) + Math.cos(z * 0.4)) * 0.15
        + (Math.sin(x * 0.8 + z * 0.5) * 0.08)
        - dist * 0.003;
      positions.setZ(i, noise);
    }
    geo.computeVertexNormals();

    const colors: number[] = [];
    const green = new THREE.Color(0x5a8a3a);
    const brown = new THREE.Color(0x7a6548);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const t = Math.min(1, dist / 28);
      const noise = (Math.sin(x * 1.2) + Math.cos(y * 1.5)) * 0.15 + Math.random() * 0.08;
      const mixT = Math.max(0, Math.min(1, t + noise));
      const c = green.clone().lerp(brown, mixT);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.02,
      flatShading: true
    });

    this.ground = new THREE.Mesh(geo, mat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.addGridLines();
  }

  private addGridLines(): void {
    const size = 60;
    const step = 3;
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x3a5a2a,
      transparent: true,
      opacity: 0.15
    });
    const points: THREE.Vector3[] = [];
    for (let i = -size / 2; i <= size / 2; i += step) {
      points.push(new THREE.Vector3(i, 0.02, -size / 2));
      points.push(new THREE.Vector3(i, 0.02, size / 2));
      points.push(new THREE.Vector3(-size / 2, 0.02, i));
      points.push(new THREE.Vector3(size / 2, 0.02, i));
    }
    const gridGeo = new THREE.BufferGeometry().setFromPoints(points);
    const grid = new THREE.LineSegments(gridGeo, gridMat);
    this.scene.add(grid);
  }

  public setMonth(month: number): void {
    this.targetMonth = month;
  }

  public update(delta: number): void {
    const lerpFactor = Math.min(1, delta * 3);
    this.currentMonth += (this.targetMonth - this.currentMonth) * lerpFactor;

    const sun = getSunPosition(this.currentMonth);
    const elevationRad = (sun.elevation * Math.PI) / 180;
    const azimuthRad = (sun.azimuth * Math.PI) / 180;
    const dist = 35;
    this.sunLight.position.x = Math.sin(azimuthRad) * Math.cos(elevationRad) * dist;
    this.sunLight.position.y = Math.sin(elevationRad) * dist;
    this.sunLight.position.z = Math.cos(azimuthRad) * Math.cos(elevationRad) * dist;
    this.sunLight.target.position.set(0, 2, 0);
    this.sunLight.target.updateMatrixWorld();

    const warmth = Math.max(0, Math.sin(((this.currentMonth - 1) / 11) * Math.PI * 2 - Math.PI / 2));
    this.targetSunColor.setRGB(
      1.0,
      0.94 - warmth * 0.02,
      0.82 + warmth * 0.05
    );
    this.currentSunColor.lerp(this.targetSunColor, 0.04);
    this.sunLight.color.copy(this.currentSunColor);
    this.sunLight.intensity = sun.intensity;

    this.ambientLight.intensity = getAmbientIntensity(this.currentMonth);

    const fog = getFogParams(this.currentMonth);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.lerp(fog.color, 0.03);
      this.scene.fog.near += (fog.near - this.scene.fog.near) * 0.03;
      this.scene.fog.far += (fog.far - this.scene.fog.far) * 0.03;
    }
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(fog.color, 0.03);
    }
  }
}
