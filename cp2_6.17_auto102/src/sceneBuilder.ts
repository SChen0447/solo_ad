import * as THREE from 'three';
import type { SceneData, SceneObject } from './textParser';

export interface ObjectInfo {
  id: string;
  type: string;
  color: string;
  position: { x: number; y: number; z: number };
}

interface AnimatedObject {
  root: THREE.Object3D;
  data: SceneObject;
  targetPosition: THREE.Vector3;
  startPosition: THREE.Vector3;
  animationStartTime: number;
  animationDuration: number;
  animationType: 'drop' | 'move' | 'none';
  isPulsating: boolean;
  baseScale: THREE.Vector3;
  pulsePhase: number;
  glowMesh?: THREE.Mesh;
}

type OnSelectCallback = (info: ObjectInfo | null) => void;
type OnFpsUpdateCallback = (fps: number) => void;

interface CompositePart {
  geometry: 'box' | 'sphere' | 'cylinder' | 'cone';
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  colorOffset?: string;
  emissive?: string;
  emissiveIntensity?: number;
}

interface CompositeTemplate {
  type: string;
  parts: CompositePart[];
}

const COMPOSITE_TEMPLATES: Record<string, CompositeTemplate> = {
  '树木': {
    type: '树木',
    parts: [
      {
        geometry: 'cylinder',
        position: { x: 0, y: 0.5, z: 0 },
        scale: { x: 0.15, y: 1, z: 0.15 },
        colorOffset: '#8b5a2b',
      },
      {
        geometry: 'cone',
        position: { x: 0, y: 1.3, z: 0 },
        scale: { x: 0.8, y: 1.2, z: 0.8 },
      },
      {
        geometry: 'cone',
        position: { x: 0, y: 1.7, z: 0 },
        scale: { x: 0.6, y: 0.9, z: 0.6 },
      },
      {
        geometry: 'cone',
        position: { x: 0, y: 2.0, z: 0 },
        scale: { x: 0.4, y: 0.6, z: 0.4 },
      },
    ],
  },
  '房屋': {
    type: '房屋',
    parts: [
      {
        geometry: 'box',
        position: { x: 0, y: 0.6, z: 0 },
        scale: { x: 1.2, y: 1.2, z: 1 },
      },
      {
        geometry: 'cone',
        position: { x: 0, y: 1.7, z: 0 },
        scale: { x: 1.5, y: 0.9, z: 1.3 },
        colorOffset: '#8b3a3a',
      },
    ],
  },
  '城堡': {
    type: '城堡',
    parts: [
      { geometry: 'box', position: { x: 0, y: 0.9, z: 0 }, scale: { x: 1.6, y: 1.8, z: 1.2 } },
      { geometry: 'cylinder', position: { x: -1.1, y: 1.2, z: 0 }, scale: { x: 0.4, y: 2.4, z: 0.4 } },
      { geometry: 'cylinder', position: { x: 1.1, y: 1.2, z: 0 }, scale: { x: 0.4, y: 2.4, z: 0.4 } },
      { geometry: 'cone', position: { x: -1.1, y: 2.7, z: 0 }, scale: { x: 0.6, y: 0.6, z: 0.6 }, colorOffset: '#8b3a3a' },
      { geometry: 'cone', position: { x: 1.1, y: 2.7, z: 0 }, scale: { x: 0.6, y: 0.6, z: 0.6 }, colorOffset: '#8b3a3a' },
    ],
  },
  '萤火虫': {
    type: '萤火虫',
    parts: [
      {
        geometry: 'sphere',
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
    ],
  },
  '山峰': {
    type: '山峰',
    parts: [
      {
        geometry: 'cone',
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
    ],
  },
};

const PULSATING_TYPES = new Set(['萤火虫', '星星', '太阳', '月亮']);

export class SceneBuilder {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private animatedObjects: Map<string, AnimatedObject> = new Map();
  private selectedId: string | null = null;
  private onSelect: OnSelectCallback = () => {};
  private onFpsUpdate: OnFpsUpdateCallback = () => {};

  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 4 };
  private cameraDistance = 10;
  private cameraTarget = new THREE.Vector3(0, 0.5, 0);

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private clock = new THREE.Clock();
  private frameCount = 0;
  private fpsTime = 0;
  private currentFps = 60;

  private ground: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper | null = null;

  private animationId: number | null = null;
  private isRunning = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    this.init();
  }

  private init(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x000000, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 8, 5);
    this.scene.add(dirLight);

    this.createGround();
    this.updateCamera();
    this.bindEvents();
  }

  private createGround(): void {
    const groundGeo = new THREE.PlaneGeometry(8, 8);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x333344,
      transparent: true,
      opacity: 0.4,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.scene.add(this.ground);

    this.gridHelper = new THREE.GridHelper(8, 8, 0x555555, 0x555555);
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.5;
    this.gridHelper.position.y = 0.001;
    this.scene.add(this.gridHelper);
  }

  private updateCamera(): void {
    const { theta, phi } = this.cameraAngle;
    const x = this.cameraTarget.x + this.cameraDistance * Math.sin(phi) * Math.sin(theta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(phi);
    const z = this.cameraTarget.z + this.cameraDistance * Math.sin(phi) * Math.cos(theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('click', this.onClick);
    window.addEventListener('resize', this.onResize);
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.previousMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouse.x;
    const deltaY = e.clientY - this.previousMouse.y;

    this.cameraAngle.theta -= deltaX * 0.01;
    this.cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.cameraAngle.phi + deltaY * 0.01));

    this.previousMouse = { x: e.clientX, y: e.clientY };
    this.updateCamera();
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.5 : -0.5;
    this.cameraDistance = Math.max(3, Math.min(20, this.cameraDistance + delta));
    this.updateCamera();
  };

  private onClick = (e: MouseEvent): void => {
    if (this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes: THREE.Mesh[] = [];
    this.animatedObjects.forEach((animObj) => {
      animObj.root.traverse((child) => {
        if (child instanceof THREE.Mesh && child !== animObj.glowMesh) {
          meshes.push(child);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      let obj = intersects[0].object as THREE.Object3D;
      while (obj.parent && !this.animatedObjects.has(obj.userData.rootId)) {
        obj = obj.parent;
      }
      const rootId = obj.userData.rootId;
      if (rootId && this.animatedObjects.has(rootId)) {
        this.selectObject(rootId);
        return;
      }
    }

    this.selectObject(null);
  };

  private onResize = (): void => {
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
  };

  private selectObject(id: string | null): void {
    if (this.selectedId && this.selectedId !== id) {
      const prevAnim = this.animatedObjects.get(this.selectedId);
      if (prevAnim && prevAnim.glowMesh) {
        prevAnim.glowMesh.visible = false;
      }
    }

    this.selectedId = id;

    if (id) {
      const animObj = this.animatedObjects.get(id);
      if (animObj) {
        if (animObj.glowMesh) {
          animObj.glowMesh.visible = true;
        }
        const info: ObjectInfo = {
          id: id,
          type: animObj.data.type,
          color: animObj.data.color,
          position: { ...animObj.data.position },
        };
        this.onSelect(info);
      }
    } else {
      this.onSelect(null);
    }
  }

  setOnSelect(callback: OnSelectCallback): void {
    this.onSelect = callback;
  }

  setOnFpsUpdate(callback: OnFpsUpdateCallback): void {
    this.onFpsUpdate = callback;
  }

  buildScene(sceneData: SceneData): void {
    this.clearScene();

    if (sceneData.fog) {
      this.scene.fog = new THREE.Fog(
        new THREE.Color(sceneData.fog.color),
        sceneData.fog.near,
        sceneData.fog.far
      );
    } else {
      this.scene.fog = null;
    }

    if (sceneData.ambientLight) {
      const ambientLight = this.scene.children.find(
        (c) => c instanceof THREE.AmbientLight
      ) as THREE.AmbientLight;
      if (ambientLight) {
        ambientLight.color.set(sceneData.ambientLight.color);
        ambientLight.intensity = sceneData.ambientLight.intensity;
      }
    }

    sceneData.objects.forEach((objData, index) => {
      setTimeout(() => {
        this.createObject(objData);
      }, index * 50);
    });
  }

  private clearScene(): void {
    this.selectedId = null;
    this.animatedObjects.forEach((animObj) => {
      this.scene.remove(animObj.root);
      this.disposeObject(animObj.root);
    });
    this.animatedObjects.clear();
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  private createObject(objData: SceneObject): void {
    const template = COMPOSITE_TEMPLATES[objData.type];
    const isPulsating = PULSATING_TYPES.has(objData.type) || objData.emissive !== undefined;

    const group = new THREE.Group();
    group.userData.rootId = objData.id;

    if (template && objData.geometry === 'group' && objData.children) {
      objData.children.forEach((childData) => {
        const mesh = this.createMeshFromData(childData, objData.color);
        group.add(mesh);
      });
    } else if (template && template.parts.length > 0) {
      template.parts.forEach((part) => {
        const partColor = part.colorOffset || objData.color;
        const mesh = this.createMesh(
          part.geometry,
          partColor,
          objData.emissive,
          objData.emissiveIntensity
        );
        mesh.position.set(part.position.x, part.position.y, part.position.z);
        mesh.scale.set(part.scale.x, part.scale.y, part.scale.z);
        if (part.rotation) {
          mesh.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);
        }
        group.add(mesh);
      });
    } else if (objData.children && objData.children.length > 0) {
      objData.children.forEach((childData) => {
        const mesh = this.createMeshFromData(childData, objData.color);
        group.add(mesh);
      });
    } else {
      const mesh = this.createMesh(
        objData.geometry,
        objData.color,
        objData.emissive,
        objData.emissiveIntensity
      );
      group.add(mesh);
    }

    group.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
    group.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);

    const dropHeight = 5;
    const startY = objData.position.y + dropHeight;
    group.position.set(objData.position.x, startY, objData.position.z);

    const glowMesh = this.createGlowMesh(group);
    if (glowMesh) {
      group.add(glowMesh);
      glowMesh.visible = false;
    }

    this.scene.add(group);

    const startPos = new THREE.Vector3(objData.position.x, startY, objData.position.z);
    const targetPos = new THREE.Vector3(
      objData.position.x,
      objData.position.y,
      objData.position.z
    );

    const animObj: AnimatedObject = {
      root: group,
      data: { ...objData, position: { ...objData.position } },
      targetPosition: targetPos,
      startPosition: startPos,
      animationStartTime: performance.now(),
      animationDuration: 800,
      animationType: 'drop',
      isPulsating,
      baseScale: new THREE.Vector3(objData.scale.x, objData.scale.y, objData.scale.z),
      pulsePhase: Math.random() * Math.PI * 2,
      glowMesh: glowMesh ?? undefined,
    };

    this.animatedObjects.set(objData.id, animObj);
  }

  private createMeshFromData(childData: SceneObject, parentColor: string): THREE.Mesh {
    const color = childData.color || parentColor;
    const mesh = this.createMesh(
      childData.geometry,
      color,
      childData.emissive,
      childData.emissiveIntensity
    );
    mesh.position.set(childData.position.x, childData.position.y, childData.position.z);
    mesh.scale.set(childData.scale.x, childData.scale.y, childData.scale.z);
    mesh.rotation.set(childData.rotation.x, childData.rotation.y, childData.rotation.z);
    return mesh;
  }

  private createMesh(
    geometryType: string,
    color: string,
    emissive?: string,
    emissiveIntensity?: number
  ): THREE.Mesh {
    let geometry: THREE.BufferGeometry;

    switch (geometryType) {
      case 'box':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 16, 16);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 16);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.7,
      metalness: 0.1,
    });

    if (emissive) {
      material.emissive = new THREE.Color(emissive);
      material.emissiveIntensity = emissiveIntensity ?? 0.5;
    }

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createGlowMesh(root: THREE.Group): THREE.Mesh | null {
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return null;

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxSize = Math.max(size.x, size.y, size.z);

    const glowGeo = new THREE.SphereGeometry(maxSize * 0.7, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });

    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    const center = new THREE.Vector3();
    box.getCenter(center);
    glowMesh.position.copy(center);
    glowMesh.scale.set(1.3, 1.3, 1.3);

    return glowMesh;
  }

  reshuffle(): void {
    this.animatedObjects.forEach((animObj, id) => {
      const newX = (Math.random() - 0.5) * 6;
      const newZ = (Math.random() - 0.5) * 6;
      const newY = animObj.targetPosition.y;

      animObj.startPosition.copy(animObj.root.position);
      animObj.targetPosition.set(newX, newY, newZ);
      animObj.animationStartTime = performance.now();
      animObj.animationDuration = 500;
      animObj.animationType = 'move';

      animObj.data.position.x = newX;
      animObj.data.position.y = newY;
      animObj.data.position.z = newZ;
    });

    if (this.selectedId) {
      const animObj = this.animatedObjects.get(this.selectedId);
      if (animObj) {
        this.onSelect({
          id: this.selectedId,
          type: animObj.data.type,
          color: animObj.data.color,
          position: { ...animObj.data.position },
        });
      }
    }
  }

  updateObjectColor(id: string, color: string): void {
    const animObj = this.animatedObjects.get(id);
    if (!animObj) return;

    animObj.data.color = color;

    animObj.root.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== animObj.glowMesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.color) {
          const startColor = mat.color.clone();
          const endColor = new THREE.Color(color);
          const startTime = performance.now();
          const duration = 300;

          const animateColor = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            mat.color.lerpColors(startColor, endColor, t);
            if (t < 1) {
              requestAnimationFrame(animateColor);
            }
          };
          animateColor();
        }
      }
    });
  }

  updateObjectPosition(id: string, x: number, y: number, z: number): void {
    const animObj = this.animatedObjects.get(id);
    if (!animObj) return;

    animObj.startPosition.copy(animObj.root.position);
    animObj.targetPosition.set(x, y, z);
    animObj.animationStartTime = performance.now();
    animObj.animationDuration = 1000;
    animObj.animationType = 'move';

    animObj.data.position.x = x;
    animObj.data.position.y = y;
    animObj.data.position.z = z;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const now = performance.now();

    this.frameCount++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
      this.onFpsUpdate(this.currentFps);
    }

    this.animatedObjects.forEach((animObj) => {
      if (animObj.animationType !== 'none') {
        const elapsed = now - animObj.animationStartTime;
        const t = Math.min(elapsed / animObj.animationDuration, 1);

        if (animObj.animationType === 'drop') {
          const eased = this.easeOutBounce(t);
          animObj.root.position.lerpVectors(
            animObj.startPosition,
            animObj.targetPosition,
            eased
          );
        } else if (animObj.animationType === 'move') {
          const eased = this.easeInOutQuad(t);
          animObj.root.position.lerpVectors(
            animObj.startPosition,
            animObj.targetPosition,
            eased
          );
        }

        if (t >= 1) {
          animObj.animationType = 'none';
          animObj.root.position.copy(animObj.targetPosition);
        }
      }

      if (animObj.isPulsating) {
        const pulseTime = now / 1000;
        const pulse = 1 + 0.3 * Math.sin(pulseTime * (Math.PI * 2 / 1.5) + animObj.pulsePhase);
        animObj.root.scale.setScalar(animObj.baseScale.x * pulse);
      }
    });

    this.renderer.render(this.scene, this.camera);
  };

  private easeOutBounce(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  dispose(): void {
    this.stop();
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('click', this.onClick);
    window.removeEventListener('resize', this.onResize);

    this.clearScene();
    this.renderer.dispose();
  }
}
