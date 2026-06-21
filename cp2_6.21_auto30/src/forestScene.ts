import * as THREE from 'three';
import { TreeGenerator, TreeParams, TreeRuleType, TreeData, FoliagePulseData } from './treeGenerator';

export interface TreeInstance {
  id: number;
  position: THREE.Vector3;
  scale: number;
  rotation: number;
  swayOffset: number;
  swayFrequency: number;
  swayAmplitude: number;
  group: THREE.Group;
  foliageParticles: THREE.Points;
  foliagePulseData: FoliagePulseData;
}

export interface ForestConfig {
  treeCount: number;
  forestRadius: number;
}

export interface CameraState {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  speed: number;
}

export class ForestScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private treeGenerator: TreeGenerator;
  private trees: TreeInstance[] = [];
  private forestConfig: ForestConfig;

  private cameraState: CameraState = {
    position: new THREE.Vector3(0, 1.7, 10),
    yaw: 0,
    pitch: -0.1,
    speed: 1.0
  };

  private keys: Record<string, boolean> = {};
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private ground!: THREE.Mesh;
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private sunPosition: THREE.Vector3 = new THREE.Vector3(50, 30, 20);

  private onSpeedChangeCallback?: (speedRatio: number, moveDirection: THREE.Vector2) => void;
  private onTreeCountChangeCallback?: (count: number) => void;

  private currentParams: TreeParams;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    initialParams: TreeParams,
    forestConfig: ForestConfig = { treeCount: 60, forestRadius: 30 }
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.treeGenerator = new TreeGenerator(initialParams);
    this.forestConfig = forestConfig;
    this.currentParams = initialParams;

    this.initGround();
    this.initLights();
    this.initControls();
    this.generateForest();
  }

  private initGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const positions = groundGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.3 + Math.random() * 0.1;
      positions.setZ(i, z);
    }
    groundGeometry.computeVertexNormals();

    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x2E7D32
    });

    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512;
    groundCanvas.height = 512;
    const ctx = groundCanvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(0.5, '#388E3C');
    gradient.addColorStop(1, '#1B5E20');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 3 + 1;
      const green = 100 + Math.random() * 100;
      ctx.fillStyle = `rgba(${Math.floor(green * 0.3)}, ${green}, ${Math.floor(green * 0.2)}, ${Math.random() * 0.5})`;
      ctx.fillRect(x, y, size, size);
    }

    const groundTexture = new THREE.CanvasTexture(groundCanvas);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(20, 20);
    (groundMaterial as THREE.MeshLambertMaterial).map = groundTexture;
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xFF9800, 0.4);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    this.directionalLight.position.copy(this.sunPosition);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    this.scene.add(this.directionalLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.3);
    this.scene.add(hemiLight);
  }

  private initControls(): void {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    document.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.cameraState.yaw -= deltaX * 0.003;
      this.cameraState.pitch -= deltaY * 0.003;
      this.cameraState.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraState.pitch));

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.cameraState.speed = Math.max(0.5, Math.min(3.0, this.cameraState.speed + delta));
    }, { passive: false });
  }

  private generateForest(): void {
    for (const tree of this.trees) {
      this.scene.remove(tree.group);
    }
    this.trees = [];

    const { treeCount, forestRadius } = this.forestConfig;

    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * forestRadius;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const scale = 0.7 + Math.random() * 0.8;
      const rotation = Math.random() * Math.PI * 2;

      const treeData = this.treeGenerator.generateTree(i + Math.random() * 1000);

      treeData.group.position.set(x, 0, z);
      treeData.group.scale.setScalar(scale);
      treeData.group.rotation.y = rotation;

      const swayOffset = Math.random() * Math.PI * 2;
      const swayFrequency = 0.3 + Math.random() * 0.5;
      const swayAmplitude = 0.02 + Math.random() * 0.03;

      const treeInstance: TreeInstance = {
        id: i,
        position: new THREE.Vector3(x, 0, z),
        scale,
        rotation,
        swayOffset,
        swayFrequency,
        swayAmplitude,
        group: treeData.group,
        foliageParticles: treeData.foliageParticles,
        foliagePulseData: treeData.foliagePulseData
      };

      this.trees.push(treeInstance);
      this.scene.add(treeData.group);
    }

    if (this.onTreeCountChangeCallback) {
      this.onTreeCountChangeCallback(this.trees.length);
    }
  }

  public updateParams(params: Partial<TreeParams>): void {
    this.currentParams = { ...this.currentParams, ...params };
    this.treeGenerator.updateParams(params);
    this.animateTreeMorph();
  }

  public updateRuleType(ruleType: TreeRuleType): void {
    this.currentParams = { ...this.currentParams, ruleType };
    this.treeGenerator.updateParams({ ruleType });
    this.animateTreeMorph();
  }

  private animateTreeMorph(): void {
    const duration = 0.8;
    const startTime = performance.now();

    const oldGroups = this.trees.map(t => t.group);
    const oldTrees = [...this.trees];

    for (let i = 0; i < this.trees.length; i++) {
      const newTreeData = this.treeGenerator.generateTree(i + Math.random() * 1000);
      newTreeData.group.position.copy(this.trees[i].position);
      newTreeData.group.scale.setScalar(this.trees[i].scale);
      newTreeData.group.rotation.y = this.trees[i].rotation;
      newTreeData.group.scale.multiplyScalar(0.01);

      this.trees[i].group = newTreeData.group;
      this.trees[i].foliageParticles = newTreeData.foliageParticles;
      this.scene.add(newTreeData.group);
    }

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      for (let i = 0; i < this.trees.length; i++) {
        const newGroup = this.trees[i].group;
        const oldGroup = oldGroups[i];

        const newScale = this.trees[i].scale * (0.01 + eased * 0.99);
        newGroup.scale.setScalar(newScale);

        newGroup.traverse((child) => {
          const mesh = child as THREE.Mesh;
          const points = child as THREE.Points;
          if (mesh.material) {
            const mat = mesh.material as THREE.Material;
            mat.opacity = eased;
            mat.transparent = true;
          }
          if (points.material) {
            const mat = points.material as THREE.Material;
            mat.opacity = eased * 0.9;
            mat.transparent = true;
          }
        });

        const oldScale = this.trees[i].scale * (1 - eased * 0.99);
        oldGroup.scale.setScalar(oldScale);
        oldGroup.traverse((child) => {
          const mesh = child as THREE.Mesh;
          const points = child as THREE.Points;
          if (mesh.material) {
            const mat = mesh.material as THREE.Material;
            mat.opacity = 1 - eased;
            mat.transparent = true;
          }
          if (points.material) {
            const mat = points.material as THREE.Material;
            mat.opacity = (1 - eased) * 0.9;
            mat.transparent = true;
          }
        });
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        for (const oldGroup of oldGroups) {
          this.scene.remove(oldGroup);
          oldGroup.traverse((child) => {
            if ((child as THREE.Mesh).geometry) {
              (child as THREE.Mesh).geometry.dispose();
            }
            if ((child as THREE.Mesh).material) {
              const mat = (child as THREE.Mesh).material as THREE.Material;
              mat.dispose();
            }
          });
        }
      }
    };

    animate();
  }

  public update(deltaTime: number, time: number): void {
    this.updateCamera(deltaTime, time);
    this.updateTreeSway(time);
    this.updateFoliagePulse(time);
  }

  private updateCamera(deltaTime: number, time: number): void {
    const speed = this.cameraState.speed * 5 * deltaTime;
    const forward = new THREE.Vector3(
      -Math.sin(this.cameraState.yaw) * Math.cos(this.cameraState.pitch),
      Math.sin(this.cameraState.pitch),
      -Math.cos(this.cameraState.yaw) * Math.cos(this.cameraState.pitch)
    );
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let isMoving = false;

    if (this.keys['KeyW']) {
      this.cameraState.position.add(forward.clone().multiplyScalar(speed));
      isMoving = true;
    }
    if (this.keys['KeyS']) {
      this.cameraState.position.add(forward.clone().multiplyScalar(-speed));
      isMoving = true;
    }
    if (this.keys['KeyA']) {
      this.cameraState.position.add(right.clone().multiplyScalar(-speed));
      isMoving = true;
    }
    if (this.keys['KeyD']) {
      this.cameraState.position.add(right.clone().multiplyScalar(speed));
      isMoving = true;
    }

    const forestRadius = this.forestConfig.forestRadius + 5;
    const dist = Math.sqrt(
      this.cameraState.position.x ** 2 +
      this.cameraState.position.z ** 2
    );
    if (dist > forestRadius) {
      const angle = Math.atan2(this.cameraState.position.z, this.cameraState.position.x);
      this.cameraState.position.x = Math.cos(angle) * forestRadius;
      this.cameraState.position.z = Math.sin(angle) * forestRadius;
    }

    this.camera.position.copy(this.cameraState.position);
    this.camera.position.y = 1.7 + Math.sin(time * 0.5) * 0.02 * (isMoving ? 1 : 0);

    const lookDir = new THREE.Vector3(
      -Math.sin(this.cameraState.yaw) * Math.cos(this.cameraState.pitch),
      Math.sin(this.cameraState.pitch),
      -Math.cos(this.cameraState.yaw) * Math.cos(this.cameraState.pitch)
    );
    this.camera.lookAt(this.camera.position.clone().add(lookDir));

    if (this.onSpeedChangeCallback) {
      const speedRatio = isMoving ? (this.cameraState.speed - 0.5) / 2.5 : 0;
      const moveDir = new THREE.Vector2();
      if (this.keys['KeyW']) moveDir.y += 1;
      if (this.keys['KeyS']) moveDir.y -= 1;
      if (this.keys['KeyA']) moveDir.x -= 1;
      if (this.keys['KeyD']) moveDir.x += 1;
      if (moveDir.length() > 0) moveDir.normalize();
      this.onSpeedChangeCallback(speedRatio, moveDir);
    }
  }

  private updateTreeSway(time: number): void {
    for (const tree of this.trees) {
      const sway = Math.sin(time * tree.swayFrequency + tree.swayOffset) * tree.swayAmplitude;
      const swaySide = Math.cos(time * tree.swayFrequency * 0.7 + tree.swayOffset) * tree.swayAmplitude * 0.5;

      tree.group.rotation.x = sway;
      tree.group.rotation.z = swaySide;
    }
  }

  private updateFoliagePulse(time: number): void {
    for (const tree of this.trees) {
      const material = tree.foliageParticles.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.uTime) {
        material.uniforms.uTime.value = time;
      }
    }
  }

  public setSunPosition(position: THREE.Vector3): void {
    this.directionalLight.position.copy(position);
    this.sunPosition.copy(position);
  }

  public setAmbientColor(color: THREE.Color, intensity: number): void {
    this.ambientLight.color.copy(color);
    this.ambientLight.intensity = intensity;
  }

  public setFog(color: THREE.Color, near: number, far: number): void {
    this.scene.fog = new THREE.Fog(color, near, far);
    this.scene.background = color;
  }

  public getCameraSpeed(): number {
    return this.cameraState.speed;
  }

  public getTreeCount(): number {
    return this.trees.length;
  }

  public getTrees(): TreeInstance[] {
    return this.trees;
  }

  public onSpeedChange(callback: (speedRatio: number, moveDirection: THREE.Vector2) => void): void {
    this.onSpeedChangeCallback = callback;
  }

  public onTreeCountChange(callback: (count: number) => void): void {
    this.onTreeCountChangeCallback = callback;
  }

  public getCurrentParams(): TreeParams {
    return { ...this.currentParams };
  }
}
