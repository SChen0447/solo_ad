import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ROOM,
  COLORS,
  PARTITION_WALLS,
  FURNITURE,
  INITIAL_LIGHTS,
  MAX_LIGHTS,
  InitialLight,
} from './roomData';

export interface LightEntry {
  id: string;
  name: string;
  type: 'point' | 'spot';
  light: THREE.PointLight | THREE.SpotLight;
  helper: THREE.Mesh;
  target?: THREE.Object3D;
}

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  lights: LightEntry[] = [];
  ambientLight: THREE.AmbientLight;
  isNight: boolean = false;
  private animationId: number = 0;
  private nightMix: number = 0;
  private targetNightMix: number = 0;
  private dayAmbientColor = new THREE.Color(COLORS.dayAmbient);
  private nightAmbientColor = new THREE.Color(COLORS.nightAmbient);
  private daySkyColor = new THREE.Color(COLORS.daySky);
  private nightSkyColor = new THREE.Color(COLORS.nightSky);
  private skyMesh: THREE.Mesh;
  private starField: THREE.Points;
  private onLightChange?: () => void;

  constructor(container: HTMLElement, onLightChange?: () => void) {
    this.onLightChange = onLightChange;

    this.scene = new THREE.Scene();
    this.scene.background = this.daySkyColor.clone();

    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(6, 5, 6);
    this.camera.lookAt(ROOM.width / 2, 1, ROOM.depth / 2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(ROOM.width / 2, 1, ROOM.depth / 2);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.update();

    this.ambientLight = new THREE.AmbientLight(this.dayAmbientColor, 0.4);
    this.scene.add(this.ambientLight);

    this.skyMesh = this.createSkyDome();
    this.scene.add(this.skyMesh);

    this.starField = this.createStarField();
    this.starField.visible = false;
    this.scene.add(this.starField);

    this.buildRoom();
    this.addInitialLights();

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private createSkyDome(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(40, 32, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: COLORS.daySky,
      side: THREE.BackSide,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createStarField(): THREE.Points {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const r = 38;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) + ROOM.width / 2;
      positions[i * 3 + 1] = r * Math.cos(phi) + 3;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) + ROOM.depth / 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }

  private buildRoom() {
    const w = ROOM.width;
    const d = ROOM.depth;
    const h = ROOM.height;

    const floorGeo = new THREE.PlaneGeometry(w, d);
    const floorMat = new THREE.MeshStandardMaterial({
      color: COLORS.floor,
      roughness: 0.8,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(w / 2, 0, d / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceilGeo = new THREE.PlaneGeometry(w, d);
    const ceilMat = new THREE.MeshStandardMaterial({
      color: COLORS.ceiling,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(w / 2, h, d / 2);
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);

    const wallMat = new THREE.MeshStandardMaterial({
      color: COLORS.wall,
      roughness: 0.85,
      metalness: 0.0,
    });

    const backWallGeo = new THREE.PlaneGeometry(w, h);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(w / 2, h / 2, 0);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const frontWallGeo = new THREE.PlaneGeometry(w, h);
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat.clone());
    frontWall.position.set(w / 2, h / 2, d);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    this.scene.add(frontWall);

    const leftWallGeo = new THREE.PlaneGeometry(d, h);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat.clone());
    leftWall.position.set(0, h / 2, d / 2);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWallGeo = new THREE.PlaneGeometry(d, h);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat.clone());
    rightWall.position.set(w, h / 2, d / 2);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    for (const pw of PARTITION_WALLS) {
      const pwGeo = new THREE.BoxGeometry(pw.width, pw.height, pw.depth);
      const pwMat = new THREE.MeshStandardMaterial({
        color: pw.color,
        roughness: 0.85,
        metalness: 0.0,
      });
      const pwMesh = new THREE.Mesh(pwGeo, pwMat);
      pwMesh.position.set(pw.x, pw.height / 2, pw.z);
      pwMesh.castShadow = true;
      pwMesh.receiveShadow = true;
      this.scene.add(pwMesh);
    }

    for (const f of FURNITURE) {
      const fGeo = new THREE.PlaneGeometry(f.width, f.depth);
      const fMat = new THREE.MeshStandardMaterial({
        color: f.color,
        transparent: true,
        opacity: f.opacity,
        roughness: 0.7,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });
      const fMesh = new THREE.Mesh(fGeo, fMat);
      fMesh.rotation.x = -Math.PI / 2;
      fMesh.position.set(f.x, 0.005, f.z);
      fMesh.receiveShadow = true;
      this.scene.add(fMesh);

      const boxGeo = new THREE.BoxGeometry(f.width, 0.05, f.depth);
      const boxMat = new THREE.MeshStandardMaterial({
        color: f.color,
        transparent: true,
        opacity: f.opacity * 0.6,
        roughness: 0.7,
        metalness: 0.0,
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.position.set(f.x, 0.025, f.z);
      boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      this.scene.add(boxMesh);
    }
  }

  private addInitialLights() {
    for (const il of INITIAL_LIGHTS) {
      this.addLight(il);
    }
  }

  addLight(config: InitialLight): LightEntry | null {
    if (this.lights.length >= MAX_LIGHTS) return null;

    const id = `light_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    if (config.type === 'spot') {
      const spotLight = new THREE.SpotLight(config.color, config.intensity * 50, 10, Math.PI / 6, 0.3, 1);
      spotLight.position.set(config.x, config.y, config.z);
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 1024;
      spotLight.shadow.mapSize.height = 1024;
      spotLight.shadow.camera.near = 0.1;
      spotLight.shadow.camera.far = 10;
      spotLight.shadow.bias = -0.001;

      const target = new THREE.Object3D();
      target.position.set(config.x, 0, config.z);
      this.scene.add(target);
      spotLight.target = target;
      this.scene.add(spotLight);

      const helperGeo = new THREE.ConeGeometry(0.08, 0.2, 8);
      const helperMat = new THREE.MeshBasicMaterial({ color: config.color });
      const helper = new THREE.Mesh(helperGeo, helperMat);
      helper.position.set(config.x, config.y, config.z);
      this.scene.add(helper);

      const entry: LightEntry = { id, name: config.name, type: 'spot', light: spotLight, helper, target };
      this.lights.push(entry);
      return entry;
    } else {
      const pointLight = new THREE.PointLight(config.color, config.intensity * 50, 8, 1.5);
      pointLight.position.set(config.x, config.y, config.z);
      pointLight.castShadow = true;
      pointLight.shadow.mapSize.width = 1024;
      pointLight.shadow.mapSize.height = 1024;
      pointLight.shadow.camera.near = 0.1;
      pointLight.shadow.camera.far = 8;
      pointLight.shadow.bias = -0.001;
      this.scene.add(pointLight);

      const helperGeo = new THREE.SphereGeometry(0.06, 16, 8);
      const helperMat = new THREE.MeshBasicMaterial({ color: config.color });
      const helper = new THREE.Mesh(helperGeo, helperMat);
      helper.position.set(config.x, config.y, config.z);
      this.scene.add(helper);

      const entry: LightEntry = { id, name: config.name, type: 'point', light: pointLight, helper };
      this.lights.push(entry);
      return entry;
    }
  }

  removeLight(id: string) {
    const idx = this.lights.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const entry = this.lights[idx];
    this.scene.remove(entry.light);
    this.scene.remove(entry.helper);
    if (entry.target) this.scene.remove(entry.target);
    entry.light.dispose();
    (entry.helper.material as THREE.Material).dispose();
    entry.helper.geometry.dispose();
    this.lights.splice(idx, 1);
    this.onLightChange?.();
  }

  updateLightPosition(id: string, x: number, y: number, z: number) {
    const entry = this.lights.find((l) => l.id === id);
    if (!entry) return;
    entry.light.position.set(x, y, z);
    entry.helper.position.set(x, y, z);
    if (entry.type === 'spot' && entry.target) {
      entry.target.position.set(x, 0, z);
    }
  }

  updateLightColor(id: string, color: string) {
    const entry = this.lights.find((l) => l.id === id);
    if (!entry) return;
    entry.light.color.set(color);
    (entry.helper.material as THREE.MeshBasicMaterial).color.set(color);
  }

  updateLightIntensity(id: string, intensity: number) {
    const entry = this.lights.find((l) => l.id === id);
    if (!entry) return;
    entry.light.intensity = intensity * 50;
  }

  setNightMode(night: boolean) {
    this.isNight = night;
    this.targetNightMix = night ? 1 : 0;
  }

  toggleNightMode() {
    this.setNightMode(!this.isNight);
  }

  private updateDayNightTransition() {
    const speed = 1 / 1.5 / 60;
    if (Math.abs(this.nightMix - this.targetNightMix) < speed) {
      this.nightMix = this.targetNightMix;
    } else {
      this.nightMix += this.targetNightMix > this.nightMix ? speed : -speed;
    }

    const ambColor = this.dayAmbientColor.clone().lerp(this.nightAmbientColor, this.nightMix);
    this.ambientLight.color.copy(ambColor);

    const skyColor = this.daySkyColor.clone().lerp(this.nightSkyColor, this.nightMix);
    (this.skyMesh.material as THREE.MeshBasicMaterial).color.copy(skyColor);
    this.scene.background = skyColor;

    this.starField.visible = this.nightMix > 0.01;
    (this.starField.material as THREE.PointsMaterial).opacity = this.nightMix;

    this.ambientLight.intensity = THREE.MathUtils.lerp(0.4, 0.15, this.nightMix);
  }

  exportSnapshot(): Promise<void> {
    return new Promise((resolve) => {
      this.renderer.render(this.scene, this.camera);
      const dataUrl = this.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `lighting-snapshot-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setTimeout(resolve, 500);
    });
  }

  private onResize = () => {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  };

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.updateDayNightTransition();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
