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
  private transitionStartTime: number = 0;
  private transitionDuration: number = 1500;
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
    this.scene.add(this.starField);

    this.buildRoom();
    this.addInitialLights();

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private createSkyDome(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(50, 32, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: COLORS.daySky,
      side: THREE.BackSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(ROOM.width / 2, 0, ROOM.depth / 2);
    return mesh;
  }

  private createStarField(): THREE.Points {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45 + 0.05;
      const r = 45 + Math.random() * 3;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = Math.random() * 0.15 + 0.05;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.12,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
    });
    const stars = new THREE.Points(geo, mat);
    stars.position.set(ROOM.width / 2, 0, ROOM.depth / 2);
    return stars;
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
    backWall.castShadow = true;
    this.scene.add(backWall);

    const frontWallGeo = new THREE.PlaneGeometry(w, h);
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat.clone());
    frontWall.position.set(w / 2, h / 2, d);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    frontWall.castShadow = true;
    this.scene.add(frontWall);

    const leftWallGeo = new THREE.PlaneGeometry(d, h);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat.clone());
    leftWall.position.set(0, h / 2, d / 2);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    this.scene.add(leftWall);

    const rightWallGeo = new THREE.PlaneGeometry(d, h);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat.clone());
    rightWall.position.set(w, h / 2, d / 2);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
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
      const shape = new THREE.Shape();
      shape.moveTo(-f.width / 2, -f.depth / 2);
      shape.lineTo(f.width / 2, -f.depth / 2);
      shape.lineTo(f.width / 2, f.depth / 2);
      shape.lineTo(-f.width / 2, f.depth / 2);
      shape.lineTo(-f.width / 2, -f.depth / 2);

      const fGeo = new THREE.ShapeGeometry(shape);
      const fMat = new THREE.MeshStandardMaterial({
        color: f.color,
        transparent: true,
        opacity: f.opacity,
        roughness: 0.7,
        metalness: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const fMesh = new THREE.Mesh(fGeo, fMat);
      fMesh.rotation.x = -Math.PI / 2;
      fMesh.position.set(f.x, 0.008, f.z);
      fMesh.receiveShadow = true;
      this.scene.add(fMesh);

      const edgePoints = [
        new THREE.Vector3(-f.width / 2, 0, -f.depth / 2),
        new THREE.Vector3(f.width / 2, 0, -f.depth / 2),
        new THREE.Vector3(f.width / 2, 0, f.depth / 2),
        new THREE.Vector3(-f.width / 2, 0, f.depth / 2),
        new THREE.Vector3(-f.width / 2, 0, -f.depth / 2),
      ];
      const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
      const edgeMat = new THREE.LineBasicMaterial({
        color: f.color,
        transparent: true,
        opacity: Math.min(1, f.opacity + 0.2),
      });
      const edgeLine = new THREE.Line(edgeGeo, edgeMat);
      edgeLine.rotation.x = -Math.PI / 2;
      edgeLine.position.set(f.x, 0.01, f.z);
      this.scene.add(edgeLine);

      const blockGeo = new THREE.BoxGeometry(f.width, 0.08, f.depth);
      const blockMat = new THREE.MeshStandardMaterial({
        color: f.color,
        transparent: true,
        opacity: f.opacity * 0.5,
        roughness: 0.7,
        metalness: 0.0,
      });
      const blockMesh = new THREE.Mesh(blockGeo, blockMat);
      blockMesh.position.set(f.x, 0.04, f.z);
      blockMesh.castShadow = true;
      blockMesh.receiveShadow = true;
      this.scene.add(blockMesh);
    }
  }

  private addInitialLights() {
    for (const il of INITIAL_LIGHTS) {
      const entry = this.addLight(il);
      if (entry) {
        this.setNameById(entry.id, il.name);
      }
    }
  }

  private setNameById(id: string, name: string) {
    const entry = this.lights.find((l) => l.id === id);
    if (entry) entry.name = name;
  }

  addLight(config: InitialLight): LightEntry | null {
    if (this.lights.length >= MAX_LIGHTS) return null;

    const id = `light_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    if (config.type === 'spot') {
      const spotLight = new THREE.SpotLight(
        config.color,
        config.intensity * 50,
        12,
        Math.PI / 5,
        0.4,
        1.2
      );
      spotLight.position.set(config.x, config.y, config.z);
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 1024;
      spotLight.shadow.mapSize.height = 1024;
      spotLight.shadow.camera.near = 0.1;
      spotLight.shadow.camera.far = 12;
      spotLight.shadow.camera.fov = 45;
      spotLight.shadow.bias = -0.0005;
      spotLight.shadow.normalBias = 0.02;

      const target = new THREE.Object3D();
      target.position.set(config.x, 0, config.z);
      this.scene.add(target);
      spotLight.target = target;
      this.scene.add(spotLight);

      const helperGeo = new THREE.ConeGeometry(0.1, 0.25, 12);
      const helperMat = new THREE.MeshBasicMaterial({ color: config.color });
      const helper = new THREE.Mesh(helperGeo, helperMat);
      helper.position.set(config.x, config.y, config.z);
      helper.rotation.x = Math.PI;
      this.scene.add(helper);

      const entry: LightEntry = {
        id,
        name: config.name,
        type: 'spot',
        light: spotLight,
        helper,
        target,
      };
      this.lights.push(entry);
      this.onLightChange?.();
      return entry;
    } else {
      const pointLight = new THREE.PointLight(
        config.color,
        config.intensity * 50,
        10,
        1.5
      );
      pointLight.position.set(config.x, config.y, config.z);
      pointLight.castShadow = true;
      pointLight.shadow.mapSize.width = 1024;
      pointLight.shadow.mapSize.height = 1024;
      pointLight.shadow.camera.near = 0.1;
      pointLight.shadow.camera.far = 10;
      pointLight.shadow.bias = -0.0005;
      pointLight.shadow.normalBias = 0.02;
      this.scene.add(pointLight);

      const helperGeo = new THREE.SphereGeometry(0.08, 20, 12);
      const helperMat = new THREE.MeshBasicMaterial({ color: config.color });
      const helper = new THREE.Mesh(helperGeo, helperMat);
      helper.position.set(config.x, config.y, config.z);
      this.scene.add(helper);

      const entry: LightEntry = {
        id,
        name: config.name,
        type: 'point',
        light: pointLight,
        helper,
      };
      this.lights.push(entry);
      this.onLightChange?.();
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

  convertLightType(id: string, newType: 'point' | 'spot'): LightEntry | null {
    const entry = this.lights.find((l) => l.id === id);
    if (!entry || entry.type === newType) return entry;

    const config: InitialLight = {
      name: entry.name,
      type: newType,
      x: entry.light.position.x,
      y: entry.light.position.y,
      z: entry.light.position.z,
      color: `#${entry.light.color.getHexString()}`,
      intensity: entry.light.intensity / 50,
    };

    const idx = this.lights.findIndex((l) => l.id === id);
    this.scene.remove(entry.light);
    this.scene.remove(entry.helper);
    if (entry.target) this.scene.remove(entry.target);
    entry.light.dispose();
    (entry.helper.material as THREE.Material).dispose();
    entry.helper.geometry.dispose();
    this.lights.splice(idx, 1);

    const newEntry = this.addLight(config);
    if (newEntry) {
      newEntry.name = config.name;
      const newIdx = this.lights.findIndex((l) => l.id === newEntry.id);
      if (newIdx !== -1) this.lights[newIdx].name = config.name;
    }
    this.onLightChange?.();
    return newEntry;
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
    this.transitionStartTime = performance.now();
  }

  toggleNightMode() {
    this.setNightMode(!this.isNight);
  }

  private updateDayNightTransition() {
    const now = performance.now();
    const elapsed = now - this.transitionStartTime;
    const t = Math.min(elapsed / this.transitionDuration, 1);
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    if (this.targetNightMix === 1) {
      this.nightMix = easeT;
    } else {
      this.nightMix = 1 - easeT;
    }

    if (t >= 1) {
      this.nightMix = this.targetNightMix;
    }

    const ambColor = this.dayAmbientColor.clone().lerp(this.nightAmbientColor, this.nightMix);
    this.ambientLight.color.copy(ambColor);

    const skyColor = this.daySkyColor.clone().lerp(this.nightSkyColor, this.nightMix);
    (this.skyMesh.material as THREE.MeshBasicMaterial).color.copy(skyColor);
    this.scene.background = skyColor;

    (this.starField.material as THREE.PointsMaterial).opacity = this.nightMix;

    this.ambientLight.intensity = THREE.MathUtils.lerp(0.4, 0.15, this.nightMix);
  }

  exportSnapshot(width = 1920, height = 1080): Promise<void> {
    return new Promise((resolve) => {
      const prevSize = {
        w: this.renderer.domElement.width,
        h: this.renderer.domElement.height,
      };
      const prevPixelRatio = this.renderer.getPixelRatio();

      this.renderer.setPixelRatio(1);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);

      const dataUrl = this.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `lighting-snapshot-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        this.renderer.setPixelRatio(prevPixelRatio);
        const container = this.renderer.domElement.parentElement;
        if (container) {
          this.renderer.setSize(container.clientWidth, container.clientHeight);
          this.camera.aspect = container.clientWidth / container.clientHeight;
          this.camera.updateProjectionMatrix();
        }
        this.renderer.render(this.scene, this.camera);
        resolve();
      }, 100);
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
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
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
