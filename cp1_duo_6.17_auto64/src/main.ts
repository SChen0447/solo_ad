import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomManager, RoomShape } from './roomManager';
import { RayTracer, ReflectedPath, RayTraceParams } from './rayTracer';
import { UIController, UIParams } from './uiController';

interface PathVisual {
  line: THREE.Line;
  dots: THREE.Mesh[];
  dotProgress: number[];
  path: ReflectedPath;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private roomManager: RoomManager;
  private rayTracer: RayTracer;
  private uiController: UIController;

  private sourceMesh!: THREE.Mesh;
  private receiverMesh!: THREE.Mesh;
  private sourcePulse!: THREE.Mesh;
  private sourceRing!: THREE.Mesh;
  private receiverRing!: THREE.Mesh;
  private sourceAxes!: THREE.Group;
  private receiverAxes!: THREE.Group;

  private pathGroup: THREE.Group = new THREE.Group();
  private pathVisuals: PathVisual[] = [];

  private sourcePosition: THREE.Vector3 = new THREE.Vector3(2, 1.5, 2);
  private receiverPosition: THREE.Vector3 = new THREE.Vector3(-2, 1.5, -2);

  private reflectionRate: number = 0.8;
  private airAbsorption: number = 0.05;
  private readonly maxReflections: number = 5;

  private isDraggingSource: boolean = false;
  private isDraggingReceiver: boolean = false;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragOffset: THREE.Vector3 = new THREE.Vector3();

  private redrawPending: boolean = false;
  private redrawTimer: number | null = null;
  private readonly REDRAW_DELAY = 500;

  private readonly DOT_SPEED = 0.8;
  private readonly DEFAULT_CAMERA_POSITION = new THREE.Vector3(15, 12, 15);
  private readonly DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 2, 0);
  private readonly REFLECTION_COLORS: number[] = [
    0xffffff,
    0xff4444,
    0xff8800,
    0xffcc00,
    0x44cc44,
    0x4488ff
  ];

  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;

  private pulseAnimation: { active: boolean; startTime: number; scale: number } = {
    active: false,
    startTime: 0,
    scale: 0
  };

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 12, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 2, 0);

    this.roomManager = new RoomManager(this.scene);
    this.rayTracer = new RayTracer(this.roomManager);

    this.setupLighting();
    this.createSourceAndReceiver();
    this.createDragHandles();
    this.createAxisHelper();
    this.scene.add(this.pathGroup);

    const initialParams: UIParams = {
      roomShape: 'rectangle',
      sourcePosition: this.sourcePosition.clone(),
      receiverPosition: this.receiverPosition.clone(),
      reflectionRate: this.reflectionRate,
      airAbsorption: this.airAbsorption
    };

    this.uiController = new UIController({
      onRoomShapeChange: (shape: RoomShape) => this.handleRoomShapeChange(shape),
      onSourcePositionChange: (pos: THREE.Vector3) => this.handleSourcePositionChange(pos),
      onReceiverPositionChange: (pos: THREE.Vector3) => this.handleReceiverPositionChange(pos),
      onParamsChange: (reflectionRate: number, airAbsorption: number) => 
        this.handleParamsChange(reflectionRate, airAbsorption),
      onRedrawRequest: () => this.scheduleRedraw(),
      onResetView: () => this.resetCameraView()
    }, initialParams);

    this.bindInputEvents();
    window.addEventListener('resize', () => this.onWindowResize());

    this.scheduleRedraw();
    this.animate();
    this.startPulseAnimation();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x6688ff, 0.3);
    fillLight.position.set(-10, 5, -10);
    this.scene.add(fillLight);
  }

  private createSourceAndReceiver(): void {
    const sourceGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const sourceMaterial = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.7
    });
    this.sourceMesh = new THREE.Mesh(sourceGeometry, sourceMaterial);
    this.sourceMesh.position.copy(this.sourcePosition);
    this.sourceMesh.castShadow = true;
    this.sourceMesh.userData.isSource = true;
    this.scene.add(this.sourceMesh);

    const pulseGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.6
    });
    this.sourcePulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    this.sourcePulse.position.copy(this.sourcePosition);
    this.sourcePulse.visible = false;
    this.scene.add(this.sourcePulse);

    const receiverGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const receiverMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.7,
      emissive: 0xaa8800,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.3
    });
    this.receiverMesh = new THREE.Mesh(receiverGeometry, receiverMaterial);
    this.receiverMesh.position.copy(this.receiverPosition);
    this.receiverMesh.castShadow = true;
    this.receiverMesh.userData.isReceiver = true;
    this.scene.add(this.receiverMesh);
  }

  private createDragHandles(): void {
    const ringGeometry = new THREE.TorusGeometry(0.35, 0.02, 8, 32);

    const sourceRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    this.sourceRing = new THREE.Mesh(ringGeometry, sourceRingMaterial);
    this.sourceRing.position.copy(this.sourcePosition);
    this.sourceRing.rotation.x = Math.PI / 2;
    this.sourceRing.userData.isDragHandle = true;
    this.scene.add(this.sourceRing);

    const receiverRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    this.receiverRing = new THREE.Mesh(ringGeometry.clone(), receiverRingMaterial);
    this.receiverRing.position.copy(this.receiverPosition);
    this.receiverRing.rotation.x = Math.PI / 2;
    this.receiverRing.userData.isDragHandle = true;
    this.scene.add(this.receiverRing);

    this.sourceAxes = this.createMiniAxes(0x4488ff);
    this.sourceAxes.position.copy(this.sourcePosition);
    this.scene.add(this.sourceAxes);

    this.receiverAxes = this.createMiniAxes(0xffcc00);
    this.receiverAxes.position.copy(this.receiverPosition);
    this.scene.add(this.receiverAxes);
  }

  private createMiniAxes(tint: number): THREE.Group {
    const group = new THREE.Group();
    const axisLength = 0.5;
    const colors = [0xff4444, 0x44ff44, 0x4444ff];
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1)
    ];

    for (let i = 0; i < 3; i++) {
      const origin = new THREE.Vector3(0, 0, 0);
      const dir = directions[i].clone().multiplyScalar(axisLength);
      const points = [origin, dir];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.5
      });
      const line = new THREE.Line(geometry, material);
      group.add(line);

      const coneGeometry = new THREE.ConeGeometry(0.04, 0.12, 6);
      const coneMaterial = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.5
      });
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.copy(dir);
      if (i === 0) cone.rotation.z = -Math.PI / 2;
      else if (i === 2) cone.rotation.x = Math.PI / 2;
      group.add(cone);
    }

    const tintMaterial = new THREE.MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity: 0.15
    });
    const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const tintSphere = new THREE.Mesh(sphereGeometry, tintMaterial);
    group.add(tintSphere);

    return group;
  }

  private createAxisHelper(): void {
    const axisGroup = new THREE.Group();
    const axisLength = 2.5;
    const colors = [0xff4444, 0x44ff44, 0x4444ff];
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1)
    ];

    for (let i = 0; i < 3; i++) {
      const origin = new THREE.Vector3(0, 0, 0);
      const dir = directions[i].clone().multiplyScalar(axisLength);
      const points = [origin, dir];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.6
      });
      const line = new THREE.Line(geometry, material);
      axisGroup.add(line);

      const coneGeometry = new THREE.ConeGeometry(0.08, 0.24, 8);
      const coneMaterial = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.6
      });
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.copy(dir);
      if (i === 0) cone.rotation.z = -Math.PI / 2;
      else if (i === 2) cone.rotation.x = Math.PI / 2;
      axisGroup.add(cone);
    }

    axisGroup.position.set(0, 0.01, 0);
    this.scene.add(axisGroup);
  }

  private resetCameraView(): void {
    this.camera.position.copy(this.DEFAULT_CAMERA_POSITION);
    this.controls.target.copy(this.DEFAULT_CAMERA_TARGET);
    this.controls.update();
  }

  private updateDragHandlePositions(): void {
    this.sourceRing.position.copy(this.sourcePosition);
    this.receiverRing.position.copy(this.receiverPosition);
    this.sourceAxes.position.copy(this.sourcePosition);
    this.receiverAxes.position.copy(this.receiverPosition);
  }

  private bindInputEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('mouseleave', () => this.onMouseUp());
  }

  private onMouseDown(e: MouseEvent): void {
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects([
      this.sourceMesh,
      this.receiverMesh,
      this.sourceRing,
      this.receiverRing
    ]);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object === this.sourceMesh || object === this.sourceRing) {
        this.isDraggingSource = true;
        this.controls.enabled = false;
        this.setupDragPlane(intersects[0].point);
      } else if (object === this.receiverMesh || object === this.receiverRing) {
        this.isDraggingReceiver = true;
        this.controls.enabled = false;
        this.setupDragPlane(intersects[0].point);
      }
      return;
    }

    if (e.button === 0) {
      const point = this.getIntersectionPointWithY(1.5);
      if (point && this.roomManager.isPointInsideRoom(point)) {
        this.sourcePosition.copy(this.roomManager.clampPointToRoom(point));
        this.sourceMesh.position.copy(this.sourcePosition);
        this.sourcePulse.position.copy(this.sourcePosition);
        this.uiController.updateSourcePosition(this.sourcePosition);
        this.updateDragHandlePositions();
        this.scheduleRedraw();
        this.startPulseAnimation();
      }
    } else if (e.button === 2) {
      const point = this.getIntersectionPointWithY(1.5);
      if (point && this.roomManager.isPointInsideRoom(point)) {
        this.receiverPosition.copy(this.roomManager.clampPointToRoom(point));
        this.receiverMesh.position.copy(this.receiverPosition);
        this.uiController.updateReceiverPosition(this.receiverPosition);
        this.updateDragHandlePositions();
        this.scheduleRedraw();
      }
    }
  }

  private setupDragPlane(intersectPoint: THREE.Vector3): void {
    const normal = new THREE.Vector3(0, 1, 0);
    this.dragPlane.setFromNormalAndCoplanarPoint(normal, intersectPoint);
    
    if (this.isDraggingSource) {
      this.dragOffset.copy(intersectPoint).sub(this.sourcePosition);
    } else {
      this.dragOffset.copy(intersectPoint).sub(this.receiverPosition);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDraggingSource && !this.isDraggingReceiver) return;

    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      const newPos = intersection.sub(this.dragOffset);
      const clampedPos = this.roomManager.clampPointToRoom(newPos);

      if (this.isDraggingSource) {
        this.sourcePosition.copy(clampedPos);
        this.sourceMesh.position.copy(clampedPos);
        this.sourcePulse.position.copy(clampedPos);
        this.uiController.updateSourcePosition(clampedPos);
      } else {
        this.receiverPosition.copy(clampedPos);
        this.receiverMesh.position.copy(clampedPos);
        this.uiController.updateReceiverPosition(clampedPos);
      }

      this.updateDragHandlePositions();
      this.scheduleRedraw();
    }
  }

  private onMouseUp(_e?: MouseEvent): void {
    if (this.isDraggingSource || this.isDraggingReceiver) {
      this.isDraggingSource = false;
      this.isDraggingReceiver = false;
      this.controls.enabled = true;
      this.forceRedraw();
    }
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectionPointWithY(y: number): THREE.Vector3 | null {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, intersection)) {
      return intersection;
    }
    return null;
  }

  private handleRoomShapeChange(shape: RoomShape): void {
    this.roomManager.setShape(shape);
    this.sourcePosition.copy(this.roomManager.clampPointToRoom(this.sourcePosition));
    this.receiverPosition.copy(this.roomManager.clampPointToRoom(this.receiverPosition));
    this.sourceMesh.position.copy(this.sourcePosition);
    this.sourcePulse.position.copy(this.sourcePosition);
    this.receiverMesh.position.copy(this.receiverPosition);
    this.uiController.updateSourcePosition(this.sourcePosition);
    this.uiController.updateReceiverPosition(this.receiverPosition);
    this.updateDragHandlePositions();
    this.scheduleRedraw();
  }

  private handleSourcePositionChange(pos: THREE.Vector3): void {
    const clamped = this.roomManager.clampPointToRoom(pos);
    this.sourcePosition.copy(clamped);
    this.sourceMesh.position.copy(clamped);
    this.sourcePulse.position.copy(clamped);
    this.updateDragHandlePositions();
    this.scheduleRedraw();
  }

  private handleReceiverPositionChange(pos: THREE.Vector3): void {
    const clamped = this.roomManager.clampPointToRoom(pos);
    this.receiverPosition.copy(clamped);
    this.receiverMesh.position.copy(clamped);
    this.updateDragHandlePositions();
    this.scheduleRedraw();
  }

  private handleParamsChange(reflectionRate: number, airAbsorption: number): void {
    this.reflectionRate = reflectionRate;
    this.airAbsorption = airAbsorption;
    this.updatePathVisuals();
  }

  private scheduleRedraw(): void {
    this.redrawPending = true;
    if (this.redrawTimer !== null) {
      window.clearTimeout(this.redrawTimer);
    }
    this.redrawTimer = window.setTimeout(() => {
      if (this.redrawPending) {
        this.forceRedraw();
      }
    }, this.REDRAW_DELAY);
  }

  private forceRedraw(): void {
    this.redrawPending = false;
    if (this.redrawTimer !== null) {
      window.clearTimeout(this.redrawTimer);
      this.redrawTimer = null;
    }
    this.calculateAndRenderPaths();
  }

  private calculateAndRenderPaths(): void {
    const startTime = performance.now();

    const params: RayTraceParams = {
      maxReflections: this.maxReflections,
      reflectionRate: this.reflectionRate,
      airAbsorption: this.airAbsorption
    };

    const paths = this.rayTracer.tracePaths(
      this.sourcePosition,
      this.receiverPosition,
      params
    );

    this.clearPathVisuals();
    this.createPathVisuals(paths);

    const calcTime = performance.now() - startTime;
    console.log(`Path calculation: ${calcTime.toFixed(1)}ms, paths: ${paths.length}`);
  }

  private clearPathVisuals(): void {
    for (const visual of this.pathVisuals) {
      this.pathGroup.remove(visual.line);
      visual.line.geometry.dispose();
      (visual.line.material as THREE.Material).dispose();
      
      for (const dot of visual.dots) {
        this.pathGroup.remove(dot);
        dot.geometry.dispose();
        (dot.material as THREE.Material).dispose();
      }
    }
    this.pathVisuals = [];
  }

  private createPathVisuals(paths: ReflectedPath[]): void {
    for (const path of paths) {
      if (path.reflectionCount === 0) continue;

      const visual = this.createSinglePathVisual(path);
      this.pathVisuals.push(visual);
      this.pathGroup.add(visual.line);
      for (const dot of visual.dots) {
        this.pathGroup.add(dot);
      }
    }
  }

  private createSinglePathVisual(path: ReflectedPath): PathVisual {
    const colorIndex = Math.min(path.reflectionCount, this.REFLECTION_COLORS.length - 1);
    const baseColor = this.REFLECTION_COLORS[colorIndex];
    
    const opacity = 1.0 - (path.reflectionCount - 1) * 0.175;
    const finalOpacity = Math.max(0.3, opacity);

    const lineWidth = Math.max(0.5, 2 + path.energy * 6);

    const points = path.points;
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const material = new THREE.LineBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: finalOpacity,
      linewidth: 1
    });

    const line = new THREE.Line(geometry, material);
    line.userData.pathData = {
      baseColor,
      opacity: finalOpacity,
      energy: path.energy,
      lineWidth
    };

    const dots: THREE.Mesh[] = [];
    const dotProgress: number[] = [];
    const numDots = Math.max(1, Math.floor(path.totalLength / 2));

    for (let i = 0; i < numDots; i++) {
      const dotGeometry = new THREE.SphereGeometry(0.05 + path.energy * 0.1, 8, 8);
      const dotMaterial = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: finalOpacity
      });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dots.push(dot);
      dotProgress.push(i / numDots);
    }

    return { line, dots, dotProgress, path };
  }

  private updatePathVisuals(): void {
    const params: RayTraceParams = {
      maxReflections: this.maxReflections,
      reflectionRate: this.reflectionRate,
      airAbsorption: this.airAbsorption
    };

    const paths = this.rayTracer.tracePaths(
      this.sourcePosition,
      this.receiverPosition,
      params
    );

    const pathMap = new Map<string, ReflectedPath>();
    for (const path of paths) {
      const key = this.getPathKey(path);
      pathMap.set(key, path);
    }

    for (const visual of this.pathVisuals) {
      const key = this.getPathKey(visual.path);
      const updatedPath = pathMap.get(key);
      
      if (updatedPath) {
        this.updateSinglePathVisual(visual, updatedPath);
      }
    }
  }

  private getPathKey(path: ReflectedPath): string {
    return path.points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`).join('|');
  }

  private updateSinglePathVisual(visual: PathVisual, updatedPath: ReflectedPath): void {
    const material = visual.line.material as THREE.LineBasicMaterial;
    const pathData = visual.line.userData.pathData;

    const targetLineWidth = Math.max(0.5, 2 + updatedPath.energy * 6);
    pathData.lineWidth = targetLineWidth;
    pathData.energy = updatedPath.energy;

    const color = new THREE.Color(pathData.baseColor);
    const brightness = 0.3 + updatedPath.energy * 0.7;
    color.multiplyScalar(brightness);
    material.color.copy(color);

    for (let i = 0; i < visual.dots.length; i++) {
      const dotMaterial = visual.dots[i].material as THREE.MeshBasicMaterial;
      dotMaterial.color.copy(color);
      visual.dots[i].scale.setScalar(1 + updatedPath.energy * 1.5);
    }
  }

  private updateDotPositions(deltaTime: number): void {
    for (const visual of this.pathVisuals) {
      const path = visual.path;
      const points = path.points;
      const totalLength = path.totalLength;

      for (let i = 0; i < visual.dots.length; i++) {
        visual.dotProgress[i] += (this.DOT_SPEED * deltaTime) / totalLength;
        if (visual.dotProgress[i] >= 1) {
          visual.dotProgress[i] -= 1;
        }

        const distance = visual.dotProgress[i] * totalLength;
        const pos = this.getPositionAlongPath(points, distance);
        if (pos) {
          visual.dots[i].position.copy(pos);
        }
      }
    }
  }

  private getPositionAlongPath(points: THREE.Vector3[], distance: number): THREE.Vector3 | null {
    let accumulated = 0;
    
    for (let i = 0; i < points.length - 1; i++) {
      const segmentLength = points[i].distanceTo(points[i + 1]);
      
      if (accumulated + segmentLength >= distance) {
        const t = (distance - accumulated) / segmentLength;
        return new THREE.Vector3().lerpVectors(points[i], points[i + 1], t);
      }
      
      accumulated += segmentLength;
    }
    
    return points[points.length - 1].clone();
  }

  private startPulseAnimation(): void {
    this.pulseAnimation.active = true;
    this.pulseAnimation.startTime = performance.now();
    this.pulseAnimation.scale = 0;
    this.sourcePulse.visible = true;
  }

  private updatePulseAnimation(time: number): void {
    if (!this.pulseAnimation.active) return;

    const elapsed = (time - this.pulseAnimation.startTime) / 1000;
    const pulseDuration = 0.5;
    
    if (elapsed < pulseDuration) {
      const t = elapsed / pulseDuration;
      this.pulseAnimation.scale = t * 3;
      const material = this.sourcePulse.material as THREE.MeshBasicMaterial;
      material.opacity = 0.6 * (1 - t);
      this.sourcePulse.scale.setScalar(1 + this.pulseAnimation.scale);
    } else {
      this.pulseAnimation.active = false;
      this.sourcePulse.visible = false;
    }
  }

  private onWindowResize(): void {
    const container = document.getElementById('canvas-container')!;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const time = performance.now();
    const deltaTime = Math.min((time - (this.lastFpsUpdate || time)) / 1000, 0.1);

    this.frameCount++;
    if (time - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount * 1000 / (time - this.lastFpsUpdate);
      this.uiController.updateFPS(this.currentFps);
      this.frameCount = 0;
      this.lastFpsUpdate = time;
    }

    this.updateDotPositions(deltaTime);
    this.updatePulseAnimation(time);
    this.sourceRing.lookAt(this.camera.position);
    this.receiverRing.lookAt(this.camera.position);
    this.sourceAxes.lookAt(this.camera.position);
    this.receiverAxes.lookAt(this.camera.position);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
