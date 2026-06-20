import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParsedData, BubbleConfig, BubbleData } from './types';

interface BubbleMesh extends THREE.Mesh {
  userData: {
    bubbleData: BubbleData;
    originalScale: number;
    targetPosition: THREE.Vector3;
    targetScale: number;
  };
}

export class SceneRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private bubbleGroup: THREE.Group;
  private bubbleDataMap: Map<THREE.Mesh, BubbleData> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private animationFrameId: number = 0;
  private selectedBubbleMesh: THREE.Mesh | null = null;
  private selectedPointLight: THREE.PointLight | null = null;
  private pulsePhase: number = 0;
  private clock: THREE.Clock;
  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;
  private currentFps: number = 0;
  private fpsElement: HTMLElement | null = null;
  private onBubbleClick: (data: BubbleData) => void;
  private container: HTMLElement;
  private isTransitioning: boolean = false;
  private transitionStartTime: number = 0;
  private transitionDuration: number = 500;
  private oldPositions: Map<THREE.Mesh, THREE.Vector3> = new Map();
  private isTimelinePlaying: boolean = false;
  private timelineFrame: number = 0;
  private timelineStartTime: number = 0;
  private timelineFrameRate: number = 1000 / 30;
  private onTimelineFrame: ((frame: number) => void) | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private resizeHandler: () => void;

  constructor(container: HTMLElement, onBubbleClick: (data: BubbleData) => void) {
    this.container = container;
    this.onBubbleClick = onBubbleClick;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.bubbleGroup = new THREE.Group();

    this.scene = new THREE.Scene();
    this.createBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 12, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enableAutoRotate = false;
    this.controls.autoRotateSpeed = 1.0;

    this.addLights();
    this.addGrid();

    this.scene.add(this.bubbleGroup);

    this.createFpsElement();

    this.resizeHandler = this.onResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
    this.renderer.domElement.addEventListener('click', this.handleClick.bind(this));

    this.animate();
  }

  private createBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#0a0a23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x6366f1, 0.3);
    backLight.position.set(-10, 5, -10);
    this.scene.add(backLight);
  }

  private addGrid(): void {
    this.gridHelper = new THREE.GridHelper(40, 40, 0x2d2d5e, 0x2d2d5e);
    const material = this.gridHelper.material as THREE.Material;
    material.transparent = true;
    material.opacity = 0.1;
    this.gridHelper.position.y = -5;
    this.scene.add(this.gridHelper);
  }

  private createFpsElement(): void {
    this.fpsElement = document.createElement('div');
    this.fpsElement.style.cssText =
      'position:absolute;bottom:12px;left:12px;font-family:monospace;font-size:12px;color:#94a3b8;background:rgba(0,0,0,0.4);padding:4px 8px;border-radius:4px;pointer-events:none;z-index:10;';
    this.container.appendChild(this.fpsElement);
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  drawBubbleMatrix(data: ParsedData, config: BubbleConfig, animate: boolean = true): void {
    const oldMeshes = new Map<THREE.Mesh, THREE.Vector3>();
    if (animate) {
      this.bubbleGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          oldMeshes.set(child, child.position.clone());
        }
      });
    }

    this.clearBubbles();
    this.bubbleDataMap.clear();

    if (!config.xAxis || !config.yAxis || !config.zAxis || !config.sizeColumn) {
      return;
    }

    const rows = data.rows;
    const xValues = rows.map((r) => Number(r[config.xAxis]) || 0);
    const yValues = rows.map((r) => Number(r[config.yAxis]) || 0);
    const zValues = rows.map((r) => Number(r[config.zAxis]) || 0);
    const sizeValues = rows.map((r) => Number(r[config.sizeColumn]) || 0);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const zMin = Math.min(...zValues);
    const zMax = Math.max(...zValues);
    const sMin = Math.min(...sizeValues);
    const sMax = Math.max(...sizeValues);

    const range = 10;
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const zRange = zMax - zMin || 1;
    const sRange = sMax - sMin || 1;

    const maxRadius = config.maxRadius;
    const minSpacing = maxRadius * 2;

    const positions: [number, number, number][] = [];
    const meshes: BubbleMesh[] = [];

    const geometry = new THREE.SphereGeometry(1, 32, 24);

    rows.forEach((row, i) => {
      const nx = (xValues[i] - xMin) / xRange;
      const ny = (yValues[i] - yMin) / yRange;
      const nz = (zValues[i] - zMin) / zRange;
      const ns = (sizeValues[i] - sMin) / sRange;

      const x = (nx - 0.5) * range * 2;
      const y = (ny - 0.5) * range * 2;
      const z = (nz - 0.5) * range * 2;

      let finalX = x;
      let finalY = y;
      let finalZ = z;

      for (const pos of positions) {
        const dx = finalX - pos[0];
        const dy = finalY - pos[1];
        const dz = finalZ - pos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < minSpacing) {
          const pushDist = (minSpacing - dist) / 2;
          const pushX = dist > 0 ? (dx / dist) * pushDist : pushDist;
          const pushY = dist > 0 ? (dy / dist) * pushDist : 0;
          const pushZ = dist > 0 ? (dz / dist) * pushDist : pushDist;
          finalX += pushX;
          finalY += pushY;
          finalZ += pushZ;
        }
      }

      positions.push([finalX, finalY, finalZ]);

      const radius = config.minRadius + ns * (config.maxRadius - config.minRadius);
      const color = this.interpolateColor(config.colorGradient, ns);

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.85,
        roughness: 0.2,
        metalness: 0.1,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.08,
      });

      const mesh = new THREE.Mesh(geometry, material) as BubbleMesh;
      mesh.scale.set(radius, radius, radius);
      mesh.position.set(finalX, finalY, finalZ);

      const bubbleData: BubbleData = {
        position: [finalX, finalY, finalZ],
        radius,
        color,
        values: row,
        matrixIndex: [
          Math.round(nx * 10),
          Math.round(ny * 10),
          Math.round(nz * 10),
        ],
      };

      mesh.userData = {
        bubbleData,
        originalScale: radius,
        targetPosition: new THREE.Vector3(finalX, finalY, finalZ),
        targetScale: radius,
      };

      this.bubbleDataMap.set(mesh, bubbleData);
      this.bubbleGroup.add(mesh);
      meshes.push(mesh);
    });

    if (animate && oldMeshes.size > 0) {
      this.startTransition(meshes, oldMeshes);
    }
  }

  private startTransition(
    newMeshes: BubbleMesh[],
    oldPositions: Map<THREE.Mesh, THREE.Vector3>
  ): void {
    const meshArray = Array.from(oldPositions.keys());
    newMeshes.forEach((newMesh, i) => {
      if (i < meshArray.length) {
        const oldPos = oldPositions.get(meshArray[i]);
        if (oldPos) {
          const targetPos = newMesh.position.clone();
          newMesh.position.copy(oldPos);
          (newMesh as any)._transitionFrom = oldPos.clone();
          (newMesh as any)._transitionTo = targetPos.clone();
        }
      }
    });

    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
  }

  private updateTransition(): void {
    if (!this.isTransitioning) return;

    const elapsed = performance.now() - this.transitionStartTime;
    let t = Math.min(elapsed / this.transitionDuration, 1);
    t = 1 - Math.pow(1 - t, 3);

    this.bubbleGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as any;
        if (mesh._transitionFrom && mesh._transitionTo) {
          child.position.lerpVectors(mesh._transitionFrom, mesh._transitionTo, t);
          if (t >= 1) {
            delete mesh._transitionFrom;
            delete mesh._transitionTo;
          }
        }
      }
    });

    if (t >= 1) {
      this.isTransitioning = false;
    }
  }

  setSelectedBubble(bubble: BubbleData | null): void {
    if (this.selectedBubbleMesh) {
      const mesh = this.selectedBubbleMesh as BubbleMesh;
      mesh.scale.set(mesh.userData.originalScale, mesh.userData.originalScale, mesh.userData.originalScale);
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.08;
      this.selectedBubbleMesh = null;
    }

    if (this.selectedPointLight) {
      this.scene.remove(this.selectedPointLight);
      this.selectedPointLight.dispose();
      this.selectedPointLight = null;
    }

    if (bubble) {
      this.bubbleGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          const data = this.bubbleDataMap.get(child);
          if (data && data === bubble) {
            this.selectedBubbleMesh = child;
            const bMesh = child as BubbleMesh;
            const s = bMesh.userData.originalScale * 1.5;
            bMesh.scale.set(s, s, s);
            (bMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;

            this.selectedPointLight = new THREE.PointLight(0xffffff, 0.3, 5);
            this.selectedPointLight.position.copy(child.position);
            this.scene.add(this.selectedPointLight);
            this.pulsePhase = 0;
          }
        }
      });
    }

    this.bubbleGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (bubble) {
          if (child === this.selectedBubbleMesh) {
            mat.opacity = 0.85;
          } else {
            mat.opacity = 0.15;
          }
        } else {
          mat.opacity = 0.85;
        }
      }
    });
  }

  playTimeline(
    data: ParsedData,
    config: BubbleConfig,
    onFrame: (frame: number) => void
  ): void {
    if (!config.timeColumn) return;

    const timeValues = [
      ...new Set(
        data.rows
          .map((r) => r[config.timeColumn])
          .filter((v) => v != null && v !== '')
      ),
    ].sort();

    if (timeValues.length === 0) return;

    this.isTimelinePlaying = true;
    this.timelineFrame = 0;
    this.timelineStartTime = performance.now();
    this.onTimelineFrame = onFrame;

    const animateTimeline = () => {
      if (!this.isTimelinePlaying) return;

      const elapsed = performance.now() - this.timelineStartTime;
      const frameIndex = Math.floor(elapsed / this.timelineFrameRate);

      if (frameIndex >= timeValues.length) {
        this.isTimelinePlaying = false;
        this.timelineFrame = timeValues.length - 1;
        if (this.onTimelineFrame) {
          this.onTimelineFrame(this.timelineFrame);
        }
        return;
      }

      if (frameIndex !== this.timelineFrame) {
        this.timelineFrame = frameIndex;
        const currentTimeValue = timeValues[frameIndex];
        const frameRows = data.rows.filter(
          (r) => String(r[config.timeColumn]) === String(currentTimeValue)
        );
        const frameData: ParsedData = {
          rows: frameRows,
          columns: data.columns,
          headers: data.headers,
        };
        this.drawBubbleMatrix(frameData, config, true);
        if (this.onTimelineFrame) {
          this.onTimelineFrame(frameIndex);
        }
      }

      requestAnimationFrame(animateTimeline);
    };

    requestAnimationFrame(animateTimeline);
  }

  stopTimeline(): void {
    this.isTimelinePlaying = false;
  }

  private handleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.bubbleGroup.children);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const data = this.bubbleDataMap.get(mesh);
      if (data) {
        this.onBubbleClick(data);
      }
    }
  }

  private interpolateColor(gradient: [string, string], t: number): string {
    const start = new THREE.Color(gradient[0]);
    const end = new THREE.Color(gradient[1]);
    const result = start.clone().lerp(end, t);
    return '#' + result.getHexString();
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();
    this.updateTransition();
    this.updatePulseLight(elapsed);
    this.updateFps();

    this.renderer.render(this.scene, this.camera);
  }

  private updatePulseLight(elapsed: number): void {
    if (this.selectedPointLight && this.selectedBubbleMesh) {
      this.pulsePhase += 0.1;
      const intensity = 0.3 + Math.sin(this.pulsePhase) * 0.15;
      this.selectedPointLight.intensity = intensity;
      this.selectedPointLight.position.copy(this.selectedBubbleMesh.position);
    }
  }

  private updateFps(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 1000) {
      this.currentFps = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsLastTime = now;
      if (this.fpsElement) {
        this.fpsElement.textContent = `${this.currentFps} FPS`;
      }
    }
  }

  private clearBubbles(): void {
    while (this.bubbleGroup.children.length > 0) {
      const child = this.bubbleGroup.children[0];
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.Material).dispose();
      }
      this.bubbleGroup.remove(child);
    }
    this.bubbleDataMap.clear();
  }

  setAutoRotate(enabled: boolean): void {
    this.controls.enableAutoRotate = enabled;
  }

  getTimelineFrames(data: ParsedData, timeColumn: string): string[] {
    if (!timeColumn) return [];
    return [
      ...new Set(
        data.rows
          .map((r) => r[timeColumn])
          .filter((v) => v != null && v !== '')
      ),
    ].sort() as string[];
  }

  dispose(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.renderer.domElement.removeEventListener('click', this.handleClick.bind(this));
    cancelAnimationFrame(this.animationFrameId);
    this.clearBubbles();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.fpsElement && this.fpsElement.parentNode) {
      this.fpsElement.parentNode.removeChild(this.fpsElement);
    }
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
