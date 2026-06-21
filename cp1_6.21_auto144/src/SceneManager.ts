import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MaterialType,
  EnvironmentPreset,
  EnvironmentConfig,
  LightingParams,
  GeometryMaterials,
  ENVIRONMENT_PRESETS
} from './types';

type GeometryKey = 'sphere' | 'cube' | 'torusKnot';

interface MaterialState {
  target: MaterialType;
  current: MaterialType;
  blend: number;
  matA: THREE.Material;
  matB: THREE.Material;
}

interface SceneLights {
  mainLight: THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight;
  ambient: THREE.AmbientLight;
  secondary: THREE.Light[];
  hemi?: THREE.HemisphereLight;
}

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private clock: THREE.Clock;
  private frameId: number = 0;
  private disposed: boolean = false;

  private geometries: Record<GeometryKey, THREE.Mesh> = {} as Record<GeometryKey, THREE.Mesh>;
  private materialStates: Record<GeometryKey, MaterialState> = {} as Record<GeometryKey, MaterialState>;

  private lights!: SceneLights;
  private currentEnv: EnvironmentPreset;
  private currentLightColor: THREE.Color;
  private currentAmbientColor: THREE.Color;
  private targetLightColor: THREE.Color;
  private targetAmbientColor: THREE.Color;
  private shadowBlend: { value: number };
  private colorBalanceBlend: { value: number };
  private backgroundBlend: { top: THREE.Color; bottom: THREE.Color };

  private customLighting: LightingParams;
  private baseLightPosition: THREE.Vector3;

  private onFpsUpdate?: (fps: number) => void;
  private fpsFrames = 0;
  private fpsTime = 0;

  private envMap: THREE.Texture | null = null;

  constructor(container: HTMLElement, onFpsUpdate?: (fps: number) => void) {
    this.container = container;
    this.onFpsUpdate = onFpsUpdate;
    this.clock = new THREE.Clock();

    this.currentEnv = EnvironmentPreset.OUTDOOR_NOON;
    const initEnv = ENVIRONMENT_PRESETS[this.currentEnv];

    this.currentLightColor = new THREE.Color(initEnv.colorHex);
    this.currentAmbientColor = new THREE.Color(initEnv.ambientColor);
    this.targetLightColor = this.currentLightColor.clone();
    this.targetAmbientColor = this.currentAmbientColor.clone();
    this.shadowBlend = { value: initEnv.shadowIntensity };
    this.colorBalanceBlend = { value: 1 };
    this.backgroundBlend = {
      top: new THREE.Color('#2a2a2a'),
      bottom: new THREE.Color('#0d0d0d')
    };

    this.customLighting = {
      horizontalAngle: 45,
      elevationAngle: 45,
      lightIntensity: 100,
      ambientIntensity: 100
    };

    this.baseLightPosition = new THREE.Vector3(
      initEnv.lightPosition.x,
      initEnv.lightPosition.y,
      initEnv.lightPosition.z
    );

    this.scene = new THREE.Scene();
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
    this.createEnvMap();
    this.setupGroundAndLights();
    this.createGeometries();
    this.animate();
    window.addEventListener('resize', this.handleResize);
  }

  private setupCamera(): void {
    const { clientWidth, clientHeight } = this.container;
    this.camera = new THREE.PerspectiveCamera(
      50,
      clientWidth / clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 4, 10);
    this.camera.lookAt(0, 0, 0);
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.updateBackgroundGradient();
    this.container.appendChild(this.renderer.domElement);
  }

  private updateBackgroundGradient(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#' + this.backgroundBlend.top.getHexString());
    gradient.addColorStop(1, '#' + this.backgroundBlend.bottom.getHexString());
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = texture;
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 25;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.target.set(0, 0.5, 0);
  }

  private createEnvMap(): void {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const geo = new THREE.SphereGeometry(50, 32, 32);
    const envMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      side: THREE.BackSide
    });
    const envMesh = new THREE.Mesh(geo, envMat);
    envScene.add(envMesh);

    const light1 = new THREE.PointLight(0xffffff, 1, 0);
    light1.position.set(10, 10, 10);
    envScene.add(light1);

    const light2 = new THREE.PointLight(0x4488ff, 0.5, 0);
    light2.position.set(-10, 5, -10);
    envScene.add(light2);

    this.envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
    this.scene.environment = this.envMap;
    pmremGenerator.dispose();
  }

  private setupGroundAndLights(): void {
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e1e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const env = ENVIRONMENT_PRESETS[this.currentEnv];
    this.lights = {
      mainLight: this.createLight(env),
      ambient: new THREE.AmbientLight(this.currentAmbientColor, env.ambientIntensity),
      secondary: [],
      hemi: new THREE.HemisphereLight(0x606080, 0x202030, 0.3)
    };

    this.scene.add(this.lights.mainLight);
    this.scene.add(this.lights.ambient);
    if (this.lights.hemi) this.scene.add(this.lights.hemi);

    if (env.secondaryLights) {
      for (const sl of env.secondaryLights) {
        const l = this.createSecondaryLight(sl);
        this.lights.secondary.push(l);
        this.scene.add(l);
      }
    }

    this.updateLightPositionFromAngles();
  }

  private createLight(env: EnvironmentConfig): THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight {
    let light: THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight;

    switch (env.lightType) {
      case 'point':
        light = new THREE.PointLight(this.currentLightColor, env.lightIntensity, 50, 2);
        (light as THREE.PointLight).castShadow = true;
        (light as THREE.PointLight).shadow.mapSize.set(1024, 1024);
        (light as THREE.PointLight).shadow.bias = -0.0005;
        break;
      case 'spot':
        light = new THREE.SpotLight(this.currentLightColor, env.lightIntensity, 30, Math.PI / 6, 0.4, 1.5);
        (light as THREE.SpotLight).castShadow = true;
        (light as THREE.SpotLight).shadow.mapSize.set(2048, 2048);
        (light as THREE.SpotLight).shadow.bias = -0.0005;
        break;
      default:
        light = new THREE.DirectionalLight(this.currentLightColor, env.lightIntensity);
        (light as THREE.DirectionalLight).castShadow = true;
        (light as THREE.DirectionalLight).shadow.mapSize.set(2048, 2048);
        (light as THREE.DirectionalLight).shadow.camera.near = 0.5;
        (light as THREE.DirectionalLight).shadow.camera.far = 50;
        (light as THREE.DirectionalLight).shadow.camera.left = -10;
        (light as THREE.DirectionalLight).shadow.camera.right = 10;
        (light as THREE.DirectionalLight).shadow.camera.top = 10;
        (light as THREE.DirectionalLight).shadow.camera.bottom = -10;
        (light as THREE.DirectionalLight).shadow.bias = -0.0005;
    }

    light.position.set(env.lightPosition.x, env.lightPosition.y, env.lightPosition.z);
    return light;
  }

  private createSecondaryLight(config: NonNullable<EnvironmentConfig['secondaryLights']>[number]): THREE.Light {
    let light: THREE.Light;
    const color = new THREE.Color(config.color);
    switch (config.type) {
      case 'point':
        light = new THREE.PointLight(color, config.intensity, 40, 2);
        break;
      case 'spot':
        light = new THREE.SpotLight(color, config.intensity, 25, Math.PI / 5, 0.5, 1.2);
        (light as THREE.SpotLight).castShadow = false;
        break;
      default:
        light = new THREE.DirectionalLight(color, config.intensity);
    }
    light.position.set(config.position.x, config.position.y, config.position.z);
    return light;
  }

  private generateBumpMap(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(512, 512);
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const idx = (y * 512 + x) * 4;
        const noise = this.perlinNoise(x / 32, y / 32);
        const val = Math.floor((noise * 0.5 + 0.5) * 255);
        imgData.data[idx] = val;
        imgData.data[idx + 1] = val;
        imgData.data[idx + 2] = val;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  private perlinNoise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const aa = this.hash(xi, yi);
    const ab = this.hash(xi, yi + 1);
    const ba = this.hash(xi + 1, yi);
    const bb = this.hash(xi + 1, yi + 1);
    const x1 = aa + u * (ba - aa);
    const x2 = ab + u * (bb - ab);
    return x1 + v * (x2 - x1);
  }

  private hash(x: number, y: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  private createMaterial(type: MaterialType, color: THREE.ColorRepresentation = 0x8888aa): THREE.Material {
    const bumpMap = this.generateBumpMap();

    switch (type) {
      case MaterialType.DIFFUSE:
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.95,
          metalness: 0.02,
          envMapIntensity: 0.3
        });
      case MaterialType.SPECULAR:
        return new THREE.MeshPhysicalMaterial({
          color: 0xcccccc,
          roughness: 0.05,
          metalness: 1.0,
          envMapIntensity: 1.5,
          reflectivity: 1.0,
          clearcoat: 0.3,
          clearcoatRoughness: 0.05
        });
      case MaterialType.TRANSPARENT:
        return new THREE.MeshPhysicalMaterial({
          color: 0xaaddff,
          roughness: 0.05,
          metalness: 0.0,
          transmission: 0.95,
          thickness: 0.8,
          ior: 1.5,
          transparent: true,
          opacity: 0.95,
          envMapIntensity: 1.0,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          side: THREE.DoubleSide
        });
      case MaterialType.BUMP:
        return new THREE.MeshStandardMaterial({
          color: 0xb0b0c0,
          roughness: 0.85,
          metalness: 0.1,
          bumpMap: bumpMap,
          bumpScale: 0.15,
          envMapIntensity: 0.5
        });
      default:
        return new THREE.MeshStandardMaterial({ color });
    }
  }

  private createGeometries(): void {
    const geomConfigs: Array<{
      key: GeometryKey;
      geometry: THREE.BufferGeometry;
      position: THREE.Vector3;
      defaultMat: MaterialType;
    }> = [
      {
        key: 'sphere',
        geometry: new THREE.SphereGeometry(1.2, 64, 64),
        position: new THREE.Vector3(-3.5, 0.2, 0),
        defaultMat: MaterialType.DIFFUSE
      },
      {
        key: 'cube',
        geometry: new THREE.BoxGeometry(1.8, 1.8, 1.8),
        position: new THREE.Vector3(0, 0.4, 0),
        defaultMat: MaterialType.SPECULAR
      },
      {
        key: 'torusKnot',
        geometry: new THREE.TorusKnotGeometry(0.9, 0.32, 160, 32),
        position: new THREE.Vector3(3.5, 0.2, 0),
        defaultMat: MaterialType.TRANSPARENT
      }
    ];

    for (const cfg of geomConfigs) {
      const mat = this.createMaterial(cfg.defaultMat);
      const mesh = new THREE.Mesh(cfg.geometry, mat);
      mesh.position.copy(cfg.position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.geometries[cfg.key] = mesh;

      const matB = this.createMaterial(cfg.defaultMat);
      this.materialStates[cfg.key] = {
        target: cfg.defaultMat,
        current: cfg.defaultMat,
        blend: 1,
        matA: mat,
        matB: matB
      };
    }
  }

  public setGeometryMaterial(key: GeometryKey, type: MaterialType): void {
    const state = this.materialStates[key];
    if (!state || state.target === type) return;

    const currentColor = this.extractMaterialColor(state.matA);
    state.matB = state.matA;
    state.matA = this.createMaterial(type, currentColor);
    state.target = type;
    state.blend = 0;

    const highlight = { value: 0 };
    new TWEEN.Tween({ blend: 0, hl: 0 })
      .to({ blend: 1, hl: 1 }, 500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        state.blend = obj.blend;
        highlight.value = obj.hl;
        this.updateMeshMaterial(key, state, highlight.value);
      })
      .onComplete(() => {
        state.current = type;
        state.blend = 1;
        this.updateMeshMaterial(key, state, 1);
      })
      .start();
  }

  private extractMaterialColor(material: THREE.Material): THREE.ColorRepresentation {
    const m = material as THREE.MeshStandardMaterial;
    return m.color ? m.color.getHex() : 0x8888aa;
  }

  private updateMeshMaterial(key: GeometryKey, state: MaterialState, highlight: number): void {
    const mesh = this.geometries[key];
    if (state.blend >= 0.999) {
      mesh.material = state.matA;
      return;
    }

    const matA = state.matA as THREE.MeshStandardMaterial;
    const matB = state.matB as THREE.MeshStandardMaterial;
    const t = state.blend;

    if (matA.color && matB.color) {
      const r = matB.color.r + (matA.color.r - matB.color.r) * t;
      const g = matB.color.g + (matA.color.g - matB.color.g) * t;
      const b = matB.color.b + (matA.color.b - matB.color.b) * t;
      const highlightBoost = 1 + highlight * 0.3;
      const blended = new THREE.Color(
        Math.min(1, r * highlightBoost),
        Math.min(1, g * highlightBoost),
        Math.min(1, b * highlightBoost)
      );

      if (mesh.material instanceof THREE.MeshStandardMaterial ||
          mesh.material instanceof THREE.MeshPhysicalMaterial) {
        (mesh.material as THREE.MeshStandardMaterial).color.copy(blended);
        (mesh.material as THREE.MeshStandardMaterial).roughness =
          matB.roughness + (matA.roughness - matB.roughness) * t;
        (mesh.material as THREE.MeshStandardMaterial).metalness =
          matB.metalness + (matA.metalness - matB.metalness) * t;
      }
    }
  }

  public setEnvironment(preset: EnvironmentPreset): void {
    const env = ENVIRONMENT_PRESETS[preset];
    this.currentEnv = preset;

    this.targetLightColor = new THREE.Color(env.colorHex);
    this.targetAmbientColor = new THREE.Color(env.ambientColor);

    new TWEEN.Tween(this.colorBalanceBlend)
      .to({ value: 0 }, 800)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
        this.baseLightPosition.set(env.lightPosition.x, env.lightPosition.y, env.lightPosition.z);
        this.updateLightPositionFromAngles();
        if (this.lights.mainLight instanceof THREE.DirectionalLight) {
          this.lights.mainLight.intensity = env.lightIntensity;
        } else if (this.lights.mainLight instanceof THREE.PointLight ||
                   this.lights.mainLight instanceof THREE.SpotLight) {
          this.lights.mainLight.intensity = env.lightIntensity;
        }

        for (const l of this.lights.secondary) {
          this.scene.remove(l);
        }
        this.lights.secondary = [];
        if (env.secondaryLights) {
          for (const sl of env.secondaryLights) {
            const l = this.createSecondaryLight(sl);
            this.lights.secondary.push(l);
            this.scene.add(l);
          }
        }

        new TWEEN.Tween(this.colorBalanceBlend)
          .to({ value: 1 }, 800)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .start();
      })
      .start();

    const startShadow = this.shadowBlend.value;
    new TWEEN.Tween({ s: 0 })
      .to({ s: 1 }, 800)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate((obj) => {
        const t = obj.s;
        this.shadowBlend.value = startShadow + (env.shadowIntensity - startShadow) * t;
        this.updateShadowIntensity();
      })
      .start();

    const startLight = this.currentLightColor.clone();
    const startAmbient = this.currentAmbientColor.clone();
    new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 800)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate((obj) => {
        const tt = obj.t;
        this.currentLightColor.copy(startLight).lerp(this.targetLightColor, tt);
        this.currentAmbientColor.copy(startAmbient).lerp(this.targetAmbientColor, tt);
        this.updateLightColors();
      })
      .start();
  }

  private updateShadowIntensity(): void {
    const intensity = this.shadowBlend.value;
    const mainLight = this.lights.mainLight as THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight;
    if (mainLight.shadow) {
      (mainLight.shadow as unknown as { intensity: number }).intensity = intensity;
    }
  }

  private updateLightColors(): void {
    const balance = this.colorBalanceBlend.value;
    const lc = this.currentLightColor.clone().multiplyScalar(balance);
    const ac = this.currentAmbientColor.clone().multiplyScalar(balance);

    if (this.lights.mainLight instanceof THREE.DirectionalLight ||
        this.lights.mainLight instanceof THREE.PointLight ||
        this.lights.mainLight instanceof THREE.SpotLight) {
      this.lights.mainLight.color.copy(lc);
    }
    this.lights.ambient.color.copy(ac);
  }

  public setCustomLighting(params: Partial<LightingParams>): void {
    const oldAngles = {
      h: this.customLighting.horizontalAngle,
      e: this.customLighting.elevationAngle
    };

    Object.assign(this.customLighting, params);

    const targetAngles = {
      h: this.customLighting.horizontalAngle,
      e: this.customLighting.elevationAngle
    };

    new TWEEN.Tween(oldAngles)
      .to(targetAngles, 300)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        this.customLighting.horizontalAngle = oldAngles.h;
        this.customLighting.elevationAngle = oldAngles.e;
        this.updateLightPositionFromAngles();
      })
      .start();

    if (params.lightIntensity !== undefined || params.ambientIntensity !== undefined) {
      this.updateLightIntensities();
    }
  }

  private updateLightPositionFromAngles(): void {
    const h = (this.customLighting.horizontalAngle * Math.PI) / 180;
    const e = (this.customLighting.elevationAngle * Math.PI) / 180;
    const radius = this.baseLightPosition.length();

    const x = radius * Math.cos(e) * Math.cos(h);
    const y = radius * Math.sin(e);
    const z = radius * Math.cos(e) * Math.sin(h);

    this.lights.mainLight.position.set(x, y, z);

    if (this.lights.mainLight instanceof THREE.SpotLight ||
        this.lights.mainLight instanceof THREE.DirectionalLight) {
      this.lights.mainLight.target.position.set(0, 0, 0);
      if (this.lights.mainLight.target.parent) {
        this.lights.mainLight.target.parent.updateMatrixWorld();
      }
    }
  }

  private updateLightIntensities(): void {
    const env = ENVIRONMENT_PRESETS[this.currentEnv];
    const lightMult = this.customLighting.lightIntensity / 100;
    const ambMult = this.customLighting.ambientIntensity / 100;

    const mainLightInt = env.lightIntensity * lightMult;
    const ambInt = env.ambientIntensity * ambMult;

    const tweenObj = { ml: 0, am: 0 };
    const startML = this.lights.mainLight instanceof THREE.DirectionalLight ||
                    this.lights.mainLight instanceof THREE.PointLight ||
                    this.lights.mainLight instanceof THREE.SpotLight
                    ? (this.lights.mainLight as any).intensity : 0;
    const startAM = this.lights.ambient.intensity;

    new TWEEN.Tween(tweenObj)
      .to({ ml: 1, am: 1 }, 300)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        const mlInt = startML + (mainLightInt - startML) * tweenObj.ml;
        const amInt = startAM + (ambInt - startAM) * tweenObj.am;
        if (this.lights.mainLight instanceof THREE.DirectionalLight ||
            this.lights.mainLight instanceof THREE.PointLight ||
            this.lights.mainLight instanceof THREE.SpotLight) {
          (this.lights.mainLight as any).intensity = mlInt;
        }
        this.lights.ambient.intensity = amInt;
      })
      .start();
  }

  public getCurrentEnvColor(): string {
    return ENVIRONMENT_PRESETS[this.currentEnv].colorHex;
  }

  public getCurrentEnvName(): string {
    return ENVIRONMENT_PRESETS[this.currentEnv].name;
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private animate = (): void => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    TWEEN.update();
    this.controls.update();

    for (const key of Object.keys(this.geometries) as GeometryKey[]) {
      this.geometries[key].rotation.y += delta * 0.2;
    }

    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsTime);
      this.onFpsUpdate?.(fps);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.controls.dispose();
    this.renderer.dispose();
    this.envMap?.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
