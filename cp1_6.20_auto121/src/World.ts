import * as THREE from 'three';
import { BuildingManager } from './BuildingManager';
import { ViewMode } from './UIController';

export class World {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public buildingManager: BuildingManager;

  private baseRadius: number = 200;
  private baseMesh: THREE.Mesh | null = null;

  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private sunMesh: THREE.Mesh;
  private sunLightGroup: THREE.Group;

  private skyMesh: THREE.Mesh;
  private skyUniforms: {
    topColor: THREE.IUniform<THREE.Color>;
    bottomColor: THREE.IUniform<THREE.Color>;
    offset: THREE.IUniform<number>;
    exponent: THREE.IUniform<number>;
  };

  private currentHour: number = 12;

  private viewMode: ViewMode = 'top';

  private keys: Set<string> = new Set();
  private topCameraHeight: number = 80;
  private topViewOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private topZoom: number = 1;

  private fpsYaw: number = 0;
  private fpsPitch: number = 0;
  private fpsPosition: THREE.Vector3 = new THREE.Vector3(0, 2, 80);
  private isPointerLocked: boolean = false;
  private fpsWalkTime: number = 0;

  private lastCameraState: { mode: ViewMode } | null = null;
  private cameraTransitionStart: number = 0;
  private cameraTransitioning: boolean = false;
  private cameraStartPos: THREE.Vector3 = new THREE.Vector3();
  private cameraStartQuat: THREE.Quaternion = new THREE.Quaternion();
  private cameraTargetPos: THREE.Vector3 = new THREE.Vector3();
  private cameraTargetQuat: THREE.Quaternion = new THREE.Quaternion();

  private moveSpeed: number = 40;
  private mouseDownPos: THREE.Vector2 | null = null;
  private mouseIsDown: boolean = false;
  private mouseDownTime: number = 0;

  private canvas: HTMLCanvasElement;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, this.topCameraHeight, 100);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;

    this.camera.userData.canvasRect = this.canvas.getBoundingClientRect();

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(100, 150, 100);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 800;
    this.directionalLight.shadow.camera.left = -250;
    this.directionalLight.shadow.camera.right = 250;
    this.directionalLight.shadow.camera.top = 250;
    this.directionalLight.shadow.camera.bottom = -250;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);

    const sunGeo = new THREE.SphereGeometry(6, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd93d });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunLightGroup = new THREE.Group();
    this.sunLightGroup.add(this.sunMesh);
    this.scene.add(this.sunLightGroup);

    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x87ceeb) },
      bottomColor: { value: new THREE.Color(0xffffff) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };
    const skyGeo = new THREE.SphereGeometry(1000, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          float t = max(pow(max(h, 0.0), exponent), 0.0);
          vec3 color = mix(bottomColor, topColor, t);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);

    this.buildingManager = new BuildingManager(this.scene, this.camera);

    this.createBase();
    this.bindInputEvents(container);
    this.updateDayNightCycle(this.currentHour);
    this.setupTopViewCamera();
  }

  private createBase(): void {
    const radius = this.baseRadius;

    const baseShape = new THREE.Shape();
    baseShape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, radius - 2, 0, Math.PI * 2, true);
    baseShape.holes.push(hole);
    const ringGeo = new THREE.ExtrudeGeometry(baseShape, { depth: 0.5, bevelEnabled: false });
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x2d3436,
      transparent: true,
      opacity: 0.8,
      roughness: 0.6,
      metalness: 0.3
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -0.25;
    ringMesh.receiveShadow = true;
    this.scene.add(ringMesh);

    const plateGeo = new THREE.CircleGeometry(radius - 2, 96);
    const plateUniforms = {
      edgeColor: { value: new THREE.Color('#4a90d9') },
      centerColor: { value: new THREE.Color('#1a1a3e') },
      gridColor: { value: new THREE.Color('#4a90d9') },
      radius: { value: radius - 2 }
    };
    const plateMat = new THREE.ShaderMaterial({
      uniforms: plateUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        varying vec2 vWorldPos;
        void main() {
          vUv = uv;
          vWorldPos = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 edgeColor;
        uniform vec3 centerColor;
        uniform vec3 gridColor;
        uniform float radius;
        varying vec2 vUv;
        varying vec2 vWorldPos;

        float getGrid(float pos, float gridSize) {
          float g = abs(fract(pos / gridSize - 0.5) - 0.5);
          float width = fwidth(pos / gridSize) * 1.5;
          return smoothstep(0.0, width, g);
        }

        void main() {
          float dist = length(vWorldPos);
          float t = clamp(dist / radius, 0.0, 1.0);
          vec3 bgColor = mix(centerColor, edgeColor, pow(t, 1.2));

          float grid1 = getGrid(vWorldPos.x, 10.0) * getGrid(vWorldPos.y, 10.0);
          float grid2 = getGrid(vWorldPos.x, 50.0) * getGrid(vWorldPos.y, 50.0);
          float gridMix = min(grid1, grid2 * 0.6);
          vec3 finalColor = mix(gridColor, bgColor, gridMix);

          float edgeFade = smoothstep(radius - 3.0, radius, dist);
          float alpha = 0.3 * (1.0 - edgeFade * 0.5);

          if (dist >= radius - 0.5) {
            finalColor = edgeColor;
            alpha = 0.9;
          }

          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.rotation.x = -Math.PI / 2;
    plateMesh.position.y = 0.01;
    plateMesh.receiveShadow = true;
    this.scene.add(plateMesh);
    this.baseMesh = plateMesh;
    this.buildingManager.setGroundMesh(plateMesh);

    const outerRingGeo = new THREE.RingGeometry(radius - 2.5, radius - 2, 96);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00cec9,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.02;
    this.scene.add(outerRing);
  }

  private bindInputEvents(container: HTMLElement): void {
    window.addEventListener('resize', () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.camera.userData.canvasRect = this.canvas.getBoundingClientRect();
    });

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      this.mouseDownPos = new THREE.Vector2(e.clientX, e.clientY);
      this.mouseIsDown = true;
      this.mouseDownTime = performance.now();
      this.buildingManager.handlePointerDown(e);

      if (this.viewMode === 'fps') {
        this.canvas.requestPointerLock();
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      this.camera.userData.canvasRect = this.canvas.getBoundingClientRect();
      this.buildingManager.handlePointerMove(e);

      if (this.viewMode === 'fps' && this.isPointerLocked) {
        this.fpsYaw -= e.movementX * 0.002;
        this.fpsPitch -= e.movementY * 0.002;
        this.fpsPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.fpsPitch));
      }

      if (this.viewMode === 'top' && this.mouseIsDown && this.mouseDownPos) {
        const dx = e.clientX - this.mouseDownPos.x;
        const dy = e.clientY - this.mouseDownPos.y;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          const panScale = 0.15 * this.topZoom;
          this.topViewOffset.x -= dx * panScale;
          this.topViewOffset.z -= dy * panScale;
          const maxOffset = this.baseRadius * 0.8;
          this.topViewOffset.x = Math.max(-maxOffset, Math.min(maxOffset, this.topViewOffset.x));
          this.topViewOffset.z = Math.max(-maxOffset, Math.min(maxOffset, this.topViewOffset.z));
          this.mouseDownPos.set(e.clientX, e.clientY);
        }
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      this.buildingManager.handlePointerUp(e);
      this.mouseIsDown = false;
      this.mouseDownPos = null;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.viewMode === 'top') {
        const factor = e.deltaY > 0 ? 1.1 : 0.9;
        this.topZoom = Math.max(0.3, Math.min(5.0, this.topZoom * factor));
      } else {
        const moveDelta = e.deltaY > 0 ? 5 : -5;
        const forward = this.getFPSForward();
        this.fpsPosition.addScaledVector(forward, moveDelta * 0.1);
        this.constrainFPSPosition();
      }
    }, { passive: false });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private getFPSForward(): THREE.Vector3 {
    const forward = new THREE.Vector3(
      -Math.sin(this.fpsYaw) * Math.cos(this.fpsPitch),
      Math.sin(this.fpsPitch),
      -Math.cos(this.fpsYaw) * Math.cos(this.fpsPitch)
    );
    return forward.normalize();
  }

  private getFPSRight(): THREE.Vector3 {
    const right = new THREE.Vector3(
      Math.cos(this.fpsYaw),
      0,
      -Math.sin(this.fpsYaw)
    );
    return right.normalize();
  }

  private constrainFPSPosition(): void {
    const maxR = this.baseRadius - 5;
    const d = Math.sqrt(this.fpsPosition.x ** 2 + this.fpsPosition.z ** 2);
    if (d > maxR) {
      this.fpsPosition.x *= maxR / d;
      this.fpsPosition.z *= maxR / d;
    }
  }

  public getBuildingManager(): BuildingManager {
    return this.buildingManager;
  }

  public setViewMode(mode: ViewMode): void {
    if (this.viewMode === mode && !this.cameraTransitioning) return;

    const wasTop = this.viewMode === 'top';
    this.viewMode = mode;

    if (this.isPointerLocked && mode === 'top') {
      document.exitPointerLock();
    }

    this.cameraStartPos.copy(this.camera.position);
    this.cameraStartQuat.copy(this.camera.quaternion);

    if (mode === 'top') {
      this.setupTopViewCamera(true);
      this.cameraTargetPos.copy(this.camera.position);
      this.cameraTargetQuat.copy(this.camera.quaternion);
      this.camera.position.copy(this.cameraStartPos);
      this.camera.quaternion.copy(this.cameraStartQuat);
    } else {
      if (wasTop) {
        const avgPos = this.getAverageBuildingPosition();
        this.fpsPosition.set(avgPos.x, 2, avgPos.z + 30);
        this.constrainFPSPosition();
        this.fpsYaw = Math.PI;
        this.fpsPitch = -0.1;
      }
      this.applyFPSCamera();
      this.cameraTargetPos.copy(this.camera.position);
      this.cameraTargetQuat.copy(this.camera.quaternion);
      this.camera.position.copy(this.cameraStartPos);
      this.camera.quaternion.copy(this.cameraStartQuat);
    }

    this.cameraTransitioning = true;
    this.cameraTransitionStart = performance.now();
    this.lastCameraState = { mode };
    void wasTop;
  }

  private getAverageBuildingPosition(): THREE.Vector3 {
    const result = new THREE.Vector3(0, 0, 0);
    let count = 0;
    const bm = this.buildingManager as BuildingManager;
    const anyBM = bm as unknown as { buildings: Map<number, unknown> };
    if (anyBM.buildings) {
      for (const b of anyBM.buildings.values()) {
        const bd = b as { position: THREE.Vector3 };
        result.add(bd.position);
        count++;
      }
    }
    if (count > 0) {
      result.divideScalar(count);
    }
    return result;
  }

  private setupTopViewCamera(startTransition: boolean = false): void {
    void startTransition;
    const h = this.topCameraHeight / this.topZoom;
    this.camera.position.set(
      this.topViewOffset.x,
      h,
      this.topViewOffset.z + h * 0.6
    );
    this.camera.lookAt(this.topViewOffset.x, 0, this.topViewOffset.z);
  }

  private applyFPSCamera(): void {
    this.camera.position.copy(this.fpsPosition);
    const lookDir = this.getFPSForward();
    this.camera.lookAt(
      this.fpsPosition.x + lookDir.x,
      this.fpsPosition.y + lookDir.y,
      this.fpsPosition.z + lookDir.z
    );
  }

  public setDayNightTime(hour: number): void {
    this.currentHour = hour;
    this.updateDayNightCycle(hour);
  }

  private updateDayNightCycle(hour: number): void {
    const t = (hour / 24) * Math.PI * 2 - Math.PI / 2;
    const sunRadius = 280;
    const sunX = Math.cos(t) * sunRadius;
    const sunY = Math.sin(t) * sunRadius;
    const sunZ = Math.sin(t * 0.5) * 80;

    this.sunLightGroup.position.set(0, 0, 0);
    this.sunMesh.position.set(sunX, Math.max(sunY, -200), sunZ);

    const lightDir = new THREE.Vector3(-sunX, -Math.max(sunY, 50), -sunZ).normalize();
    this.directionalLight.position.copy(lightDir).multiplyScalar(200);
    this.directionalLight.target.position.set(0, 0, 0);
    this.scene.updateMatrixWorld();

    let sunHeight = sunY / sunRadius;

    const dayColor = new THREE.Color('#ffeedd');
    const duskColor = new THREE.Color('#ff7b54');
    const nightColor = new THREE.Color('#1a1a2e');

    let lightColor: THREE.Color;
    let ambientColor: THREE.Color;
    let dirIntensity: number;
    let ambientIntensity: number;
    let exposure: number;

    if (sunHeight > 0.25) {
      const t1 = (sunHeight - 0.25) / 0.75;
      const eased = 1 - Math.pow(1 - t1, 2);
      lightColor = duskColor.clone().lerp(dayColor, eased);
      ambientColor = new THREE.Color('#b4d6ea').lerp(new THREE.Color('#ffffff'), eased);
      dirIntensity = 0.8 + eased * 0.6;
      ambientIntensity = 0.45 + eased * 0.25;
      exposure = 0.9 + eased * 0.3;
    } else if (sunHeight > 0.05) {
      const t1 = (sunHeight - 0.05) / 0.2;
      lightColor = nightColor.clone().lerp(duskColor, t1);
      ambientColor = new THREE.Color('#2c3e50').lerp(new THREE.Color('#b4856b'), t1);
      dirIntensity = 0.2 + t1 * 0.6;
      ambientIntensity = 0.15 + t1 * 0.3;
      exposure = 0.6 + t1 * 0.3;
    } else if (sunHeight > -0.1) {
      const t1 = (sunHeight + 0.1) / 0.15;
      lightColor = nightColor.clone().lerp(new THREE.Color('#2d1f3d'), t1);
      ambientColor = new THREE.Color('#0a0a1a').lerp(new THREE.Color('#2c3e50'), t1);
      dirIntensity = 0.05 + t1 * 0.15;
      ambientIntensity = 0.08 + t1 * 0.07;
      exposure = 0.5 + t1 * 0.1;
    } else {
      lightColor = nightColor.clone();
      ambientColor = new THREE.Color('#0a0a1a');
      dirIntensity = 0.05;
      ambientIntensity = 0.08;
      exposure = 0.5;
    }

    this.directionalLight.color.copy(lightColor);
    this.directionalLight.intensity = dirIntensity;
    this.ambientLight.color.copy(ambientColor);
    this.ambientLight.intensity = ambientIntensity;
    this.renderer.toneMappingExposure = exposure;

    const sunMat = this.sunMesh.material as THREE.MeshBasicMaterial;
    if (sunHeight > 0.1) {
      sunMat.color.copy(dayColor);
      sunMat.opacity = 1;
      sunMat.transparent = false;
    } else if (sunHeight > -0.05) {
      const t1 = Math.max(0, (sunHeight + 0.05) / 0.15);
      sunMat.color.copy(duskColor).lerp(new THREE.Color('#ff6b35'), 1 - t1);
      sunMat.transparent = true;
      sunMat.opacity = 0.3 + t1 * 0.7;
    } else {
      sunMat.transparent = true;
      sunMat.opacity = 0;
    }

    const skyTopDay = new THREE.Color('#87ceeb');
    const skyTopDusk = new THREE.Color('#ff7b54');
    const skyTopNight = new THREE.Color('#0a0a2e');
    const skyBotDay = new THREE.Color('#e0f6ff');
    const skyBotDusk = new THREE.Color('#ffa07a');
    const skyBotNight = new THREE.Color('#050510');

    let skyTop: THREE.Color, skyBot: THREE.Color;
    if (sunHeight > 0.25) {
      const t1 = (sunHeight - 0.25) / 0.75;
      skyTop = skyTopDusk.clone().lerp(skyTopDay, t1);
      skyBot = skyBotDusk.clone().lerp(skyBotDay, t1);
    } else if (sunHeight > 0.0) {
      const t1 = sunHeight / 0.25;
      skyTop = skyTopNight.clone().lerp(skyTopDusk, t1);
      skyBot = skyBotNight.clone().lerp(skyBotDusk, t1);
    } else if (sunHeight > -0.1) {
      const t1 = (sunHeight + 0.1) / 0.1;
      skyTop = skyTopNight.clone();
      skyBot = skyBotNight.clone();
    } else {
      skyTop = skyTopNight.clone();
      skyBot = skyBotNight.clone();
    }

    this.skyUniforms.topColor.value.copy(skyTop);
    this.skyUniforms.bottomColor.value.copy(skyBot);
  }

  public update(deltaTime: number, now: number): void {
    this.buildingManager.update(deltaTime);

    if (this.cameraTransitioning) {
      const elapsed = now - this.cameraTransitionStart;
      const duration = 800;
      if (elapsed >= duration) {
        this.camera.position.copy(this.cameraTargetPos);
        this.camera.quaternion.copy(this.cameraTargetQuat);
        this.cameraTransitioning = false;
      } else {
        const t = elapsed / duration;
        const eased = 1 - Math.pow(1 - t, 3);
        this.camera.position.lerpVectors(this.cameraStartPos, this.cameraTargetPos, eased);
        THREE.Quaternion.slerp(
          this.cameraStartQuat,
          this.cameraTargetQuat,
          this.camera.quaternion,
          eased
        );
      }
    } else {
      if (this.viewMode === 'top') {
        this.updateTopView(deltaTime);
      } else {
        this.updateFPSView(deltaTime);
      }
    }

    this.camera.userData.canvasRect = this.canvas.getBoundingClientRect();
  }

  private updateTopView(deltaTime: number): void {
    const panSpeed = 80 * this.topZoom;
    if (this.keys.has('w')) this.topViewOffset.z -= panSpeed * deltaTime;
    if (this.keys.has('s')) this.topViewOffset.z += panSpeed * deltaTime;
    if (this.keys.has('a')) this.topViewOffset.x -= panSpeed * deltaTime;
    if (this.keys.has('d')) this.topViewOffset.x += panSpeed * deltaTime;

    const maxOffset = this.baseRadius * 0.85;
    this.topViewOffset.x = Math.max(-maxOffset, Math.min(maxOffset, this.topViewOffset.x));
    this.topViewOffset.z = Math.max(-maxOffset, Math.min(maxOffset, this.topViewOffset.z));

    this.setupTopViewCamera();
  }

  private updateFPSView(deltaTime: number): void {
    const forward = this.getFPSForward();
    forward.y = 0;
    forward.normalize();
    const right = this.getFPSRight();

    let speed = this.moveSpeed;
    if (this.keys.has('shift')) speed *= 2;

    let moved = false;
    const move = new THREE.Vector3();

    if (this.keys.has('w')) { move.add(forward); moved = true; }
    if (this.keys.has('s')) { move.sub(forward); moved = true; }
    if (this.keys.has('a')) { move.sub(right); moved = true; }
    if (this.keys.has('d')) { move.add(right); moved = true; }

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * deltaTime);
      this.fpsPosition.add(move);
      this.constrainFPSPosition();
    }

    if (moved) {
      this.fpsWalkTime += deltaTime * 8;
    } else {
      this.fpsWalkTime *= 0.9;
    }

    const bobOffset = Math.sin(this.fpsWalkTime) * 0.08;
    const baseY = 2;
    const camPos = this.camera.position;
    camPos.set(this.fpsPosition.x, baseY + bobOffset, this.fpsPosition.z);

    const lookDir = this.getFPSForward();
    this.camera.lookAt(
      camPos.x + lookDir.x,
      camPos.y + lookDir.y,
      camPos.z + lookDir.z
    );
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
