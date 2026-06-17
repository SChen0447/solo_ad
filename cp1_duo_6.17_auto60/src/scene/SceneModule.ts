import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { ModelPreset, TransformParams, computeCombinedMatrix } from '../types';
import { transformStore } from '../store/useTransformStore';

const LERP_DURATION = 300;
const MODEL_TRANSITION_DURATION = 1000;
const MATRIX_UPDATE_THROTTLE_MS = 20;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type InterpolationState = {
  startParams: TransformParams;
  targetParams: TransformParams;
  startTime: number;
  active: boolean;
};

type ModelTransitionState = {
  phase: 'idle' | 'fadeOut' | 'fadeIn';
  startTime: number;
  fromModel: ModelPreset | null;
  toModel: ModelPreset | null;
  startScale: number;
  targetScale: number;
  startOpacity: number;
  targetOpacity: number;
};

type GeometryCache = Record<ModelPreset, THREE.BufferGeometry[]>;
type MaterialCache = Record<ModelPreset, THREE.MeshPhongMaterial | THREE.MeshPhongMaterial[]>;

export class SceneModule {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private transformControls: TransformControls;
  private modelGroup: THREE.Group;
  private wireframeGroup: THREE.Group;
  private currentModel: ModelPreset;
  private interp: InterpolationState;
  private modelTransition: ModelTransitionState;
  private animationId: number = 0;
  private gridHelper: THREE.GridHelper;
  private axesGroup: THREE.Group;
  private container: HTMLElement;
  private geometryCache: GeometryCache;
  private materialCache: MaterialCache;
  private lastMatrixUpdate: number = 0;
  private transformControlsEnabled: boolean = false;
  private transformControlsEnabledTime: number = 0;
  private conflictWarningShown: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.currentModel = ModelPreset.Cube;
    this.interp = { startParams: { translateX: 0, rotateY: 0, scale: 1, shearX: 0 }, targetParams: { translateX: 0, rotateY: 0, scale: 1, shearX: 0 }, startTime: 0, active: false };
    this.modelTransition = { phase: 'idle', startTime: 0, fromModel: null, toModel: null, startScale: 1, targetScale: 1, startOpacity: 1, targetOpacity: 1 };

    this.scene = new THREE.Scene();

    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    this.camera.position.set(5, 4, 7);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0, 0);

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value;
    });
    this.transformControls.addEventListener('objectChange', () => {
      this.onTransformControlsChange();
    });

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 8, 5);
    this.scene.add(directional);
    const backLight = new THREE.DirectionalLight(0x6c6cff, 0.3);
    backLight.position.set(-5, -3, -5);
    this.scene.add(backLight);

    this.gridHelper = this.createGrid();
    this.scene.add(this.gridHelper);

    this.axesGroup = this.createAxes();
    this.scene.add(this.axesGroup);

    this.modelGroup = new THREE.Group();
    this.wireframeGroup = new THREE.Group();
    this.scene.add(this.modelGroup);
    this.scene.add(this.wireframeGroup);

    this.geometryCache = this.precomputeGeometries();
    this.materialCache = this.precomputeMaterials();

    this.loadModel(ModelPreset.Cube);
    this.applyTransformImmediate(transformStore.getState().params);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);

    this.animate();
  }

  private precomputeGeometries(): GeometryCache {
    return {
      [ModelPreset.Cube]: [new THREE.BoxGeometry(2, 2, 2)],
      [ModelPreset.Icosahedron]: [new THREE.IcosahedronGeometry(1.4, 0)],
      [ModelPreset.TorusKnot]: [new THREE.TorusKnotGeometry(1, 0.35, 100, 16)],
      [ModelPreset.Compound]: [
        new THREE.OctahedronGeometry(0.9, 0),
        new THREE.TetrahedronGeometry(0.7, 0),
        new THREE.DodecahedronGeometry(0.6, 0),
      ],
    };
  }

  private precomputeMaterials(): MaterialCache {
    const colored = () => [
      new THREE.MeshPhongMaterial({ color: 0xff4444, shininess: 60 }),
      new THREE.MeshPhongMaterial({ color: 0x44ff44, shininess: 60 }),
      new THREE.MeshPhongMaterial({ color: 0x4444ff, shininess: 60 }),
      new THREE.MeshPhongMaterial({ color: 0xffff44, shininess: 60 }),
      new THREE.MeshPhongMaterial({ color: 0xff44ff, shininess: 60 }),
      new THREE.MeshPhongMaterial({ color: 0x44ffff, shininess: 60 }),
    ];
    return {
      [ModelPreset.Cube]: colored(),
      [ModelPreset.Icosahedron]: colored(),
      [ModelPreset.TorusKnot]: new THREE.MeshPhongMaterial({
        color: 0x6c6cff,
        shininess: 80,
        specular: 0xffffff,
      }),
      [ModelPreset.Compound]: [
        new THREE.MeshPhongMaterial({ color: 0xff6644, shininess: 60 }),
        new THREE.MeshPhongMaterial({ color: 0x44ff88, shininess: 60 }),
        new THREE.MeshPhongMaterial({ color: 0x4488ff, shininess: 60 }),
      ],
    };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 't' || e.key === 'T') {
      this.toggleTransformControls();
    }
  };

  private toggleTransformControls(): void {
    this.transformControlsEnabled = !this.transformControlsEnabled;
    if (this.transformControlsEnabled) {
      if (this.modelGroup.children.length > 0) {
        this.transformControls.attach(this.modelGroup);
        this.scene.add(this.transformControls as unknown as THREE.Object3D);
      }
      this.transformControlsEnabledTime = performance.now();
      if (!this.conflictWarningShown) {
        console.warn('[TransformControls] 已激活。注意：TransformControls 与自定义滑块控制可能存在冲突，因为两者都会修改模型的变换矩阵。当用户使用 TransformControls 拖拽时，滑块值不会自动同步；反之亦然。建议同一时间只使用一种控制方式。按 T 键可切换。');
        this.conflictWarningShown = true;
      }
    } else {
      this.transformControls.detach();
      this.scene.remove(this.transformControls as unknown as THREE.Object3D);
    }
  }

  private onTransformControlsChange(): void {
    if (!this.transformControlsEnabled) return;
    const now = performance.now();
    if (now - this.transformControlsEnabledTime < 500) return;
    const mat = this.modelGroup.matrix;
    const elements = mat.elements;
    const scaleX = Math.sqrt(elements[0] * elements[0] + elements[1] * elements[1] + elements[2] * elements[2]);
    const scaleY = Math.sqrt(elements[4] * elements[4] + elements[5] * elements[5] + elements[6] * elements[6]);
    const scaleZ = Math.sqrt(elements[8] * elements[8] + elements[9] * elements[9] + elements[10] * elements[10]);
    if (Math.abs(scaleX - scaleY) > 0.01 || Math.abs(scaleY - scaleZ) > 0.01) {
      console.warn('[TransformControls Conflict] 检测到非均匀缩放或错切。TransformControls 无法完全表示所有参数化变换，自定义滑块将不会自动同步。这是预期的行为差异。');
    }
  }

  private createGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(20, 20, 0xffffff, 0xffffff);
    const mat = grid.material as THREE.Material;
    mat.opacity = 0.15;
    mat.transparent = true;
    mat.depthWrite = false;
    return grid;
  }

  private createAxes(): THREE.Group {
    const group = new THREE.Group();
    const axisLen = 6;

    const axisData: [THREE.Color, THREE.Vector3][] = [
      [new THREE.Color(0xff0000), new THREE.Vector3(axisLen, 0, 0)],
      [new THREE.Color(0x00ff00), new THREE.Vector3(0, axisLen, 0)],
      [new THREE.Color(0x0000ff), new THREE.Vector3(0, 0, axisLen)],
    ];

    for (const [color, end] of axisData) {
      const dir = end.clone().normalize();
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), axisLen, color.getHex(), 0.3, 0.15);
      group.add(arrow);

      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        end,
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color, opacity: 0.6, transparent: true });
      group.add(new THREE.Line(lineGeom, lineMat));
    }

    return group;
  }

  private createWireframe(geometry: THREE.BufferGeometry): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(geometry, 15);
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true });
    return new THREE.LineSegments(edges, mat);
  }

  private loadModel(preset: ModelPreset): void {
    this.clearModelGroup();

    const geometries = this.geometryCache[preset];
    const materials = this.materialCache[preset];
    const materialArr = Array.isArray(materials) ? materials : [materials];

    if (preset === ModelPreset.Compound) {
      const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1.2, 0, 0),
        new THREE.Vector3(-0.8, 0.9, 0.3),
      ];
      for (let i = 0; i < geometries.length; i++) {
        const geom = geometries[i];
        const mat = materialArr[i % materialArr.length];
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(positions[i]);
        this.modelGroup.add(mesh);

        const wf = this.createWireframe(geom);
        wf.position.copy(positions[i]);
        this.wireframeGroup.add(wf);
      }
    } else {
      const mesh = new THREE.Mesh(geometries[0], materials);
      this.modelGroup.add(mesh);
      this.wireframeGroup.add(this.createWireframe(geometries[0]));
    }

    this.currentModel = preset;
  }

  private clearModelGroup(): void {
    while (this.modelGroup.children.length > 0) {
      this.modelGroup.children[0];
      this.modelGroup.remove(this.modelGroup.children[0]);
    }
    while (this.wireframeGroup.children.length > 0) {
      this.wireframeGroup.remove(this.wireframeGroup.children[0]);
    }
  }

  applyTransform(params: TransformParams): void {
    const now = performance.now();
    if (this.interp.active) {
      const elapsed = now - this.interp.startTime;
      const t = Math.min(elapsed / LERP_DURATION, 1);
      const currentParams = this.lerpParams(this.interp.startParams, this.interp.targetParams, t);
      this.interp.startParams = currentParams;
    }
    this.interp.targetParams = { ...params };
    this.interp.startTime = now;
    this.interp.active = true;
  }

  applyTransformImmediate(params: TransformParams): void {
    this.interp.active = false;
    this.applyMatrixFromParams(params);
  }

  switchModel(model: ModelPreset): void {
    if (model === this.currentModel && this.modelTransition.phase === 'idle') return;
    const now = performance.now();
    const currentScale = this.modelGroup.scale.x;
    const currentOpacity = this.getCurrentOpacity();

    if (this.modelTransition.phase !== 'idle') {
      if (this.modelTransition.toModel) {
        this.loadModel(this.modelTransition.toModel);
        this.currentModel = this.modelTransition.toModel;
        const storeParams = transformStore.getState().params;
        this.applyTransformImmediate(storeParams);
      }
      this.modelGroup.scale.setScalar(1);
      this.wireframeGroup.scale.setScalar(1);
      this.setModelOpacity(1);
    }

    this.modelTransition = {
      phase: 'fadeOut',
      startTime: now,
      fromModel: this.currentModel,
      toModel: model,
      startScale: currentScale,
      targetScale: 0,
      startOpacity: currentOpacity,
      targetOpacity: 0,
    };
  }

  private getCurrentOpacity(): number {
    if (this.modelGroup.children.length === 0) return 1;
    const first = this.modelGroup.children[0];
    if (first instanceof THREE.Mesh) {
      const mat = first.material;
      const m = Array.isArray(mat) ? mat[0] : mat;
      return m.opacity;
    }
    return 1;
  }

  private lerpParams(a: TransformParams, b: TransformParams, t: number): TransformParams {
    return {
      translateX: a.translateX + (b.translateX - a.translateX) * t,
      rotateY: a.rotateY + (b.rotateY - a.rotateY) * t,
      scale: a.scale + (b.scale - a.scale) * t,
      shearX: a.shearX + (b.shearX - a.shearX) * t,
    };
  }

  private applyMatrixFromParams(params: TransformParams): void {
    const now = performance.now();
    if (now - this.lastMatrixUpdate < MATRIX_UPDATE_THROTTLE_MS) return;
    this.lastMatrixUpdate = now;

    const m4 = computeCombinedMatrix(params);
    const matrix = new THREE.Matrix4();
    matrix.set(
      m4[0][0], m4[0][1], m4[0][2], m4[0][3],
      m4[1][0], m4[1][1], m4[1][2], m4[1][3],
      m4[2][0], m4[2][1], m4[2][2], m4[2][3],
      m4[3][0], m4[3][1], m4[3][2], m4[3][3]
    );
    this.modelGroup.matrix.copy(matrix);
    this.modelGroup.matrixAutoUpdate = false;
    this.wireframeGroup.matrix.copy(matrix);
    this.wireframeGroup.matrixAutoUpdate = false;
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const now = performance.now();

    if (this.interp.active) {
      const elapsed = now - this.interp.startTime;
      const rawT = Math.min(elapsed / LERP_DURATION, 1);
      const t = easeOutCubic(rawT);
      const currentParams = this.lerpParams(this.interp.startParams, this.interp.targetParams, t);
      this.applyMatrixFromParams(currentParams);
      if (rawT >= 1) {
        this.interp.active = false;
      }
    }

    if (this.modelTransition.phase === 'fadeOut') {
      const elapsed = now - this.modelTransition.startTime;
      const rawT = Math.min(elapsed / MODEL_TRANSITION_DURATION, 1);
      const t = easeInOutCubic(rawT);
      const currentScale = this.modelTransition.startScale + (this.modelTransition.targetScale - this.modelTransition.startScale) * t;
      const currentOpacity = this.modelTransition.startOpacity + (this.modelTransition.targetOpacity - this.modelTransition.startOpacity) * t;
      this.modelGroup.scale.setScalar(Math.max(currentScale, 0.001));
      this.wireframeGroup.scale.setScalar(Math.max(currentScale, 0.001));
      this.setModelOpacity(currentOpacity);
      if (rawT >= 1) {
        if (this.modelTransition.toModel) {
          this.loadModel(this.modelTransition.toModel);
          this.currentModel = this.modelTransition.toModel;
          const storeParams = transformStore.getState().params;
          this.applyTransformImmediate(storeParams);
        }
        this.modelTransition = {
          phase: 'fadeIn',
          startTime: now,
          fromModel: this.modelTransition.fromModel,
          toModel: this.modelTransition.toModel,
          startScale: 0,
          targetScale: 1,
          startOpacity: 0,
          targetOpacity: 1,
        };
      }
    }

    if (this.modelTransition.phase === 'fadeIn') {
      const elapsed = now - this.modelTransition.startTime;
      const rawT = Math.min(elapsed / MODEL_TRANSITION_DURATION, 1);
      const t = easeOutCubic(rawT);
      const currentScale = this.modelTransition.startScale + (this.modelTransition.targetScale - this.modelTransition.startScale) * t;
      const currentOpacity = this.modelTransition.startOpacity + (this.modelTransition.targetOpacity - this.modelTransition.startOpacity) * t;
      this.modelGroup.scale.setScalar(Math.max(currentScale, 0.001));
      this.wireframeGroup.scale.setScalar(Math.max(currentScale, 0.001));
      this.setModelOpacity(currentOpacity);
      if (rawT >= 1) {
        this.modelGroup.scale.setScalar(1);
        this.wireframeGroup.scale.setScalar(1);
        this.modelTransition = {
          phase: 'idle',
          startTime: 0,
          fromModel: null,
          toModel: null,
          startScale: 1,
          targetScale: 1,
          startOpacity: 1,
          targetOpacity: 1,
        };
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private setModelOpacity(opacity: number): void {
    this.modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material;
        const mats = Array.isArray(mat) ? mat : [mat];
        for (const m of mats) {
          m.transparent = true;
          m.opacity = opacity;
        }
      }
    });
    this.wireframeGroup.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        const m = child.material as THREE.LineBasicMaterial;
        m.opacity = 0.5 * opacity;
      }
    });
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    this.controls.dispose();
    this.transformControls.dispose();
    this.renderer.dispose();
    this.clearModelGroup();
    for (const key of Object.keys(this.geometryCache) as ModelPreset[]) {
      this.geometryCache[key].forEach((g) => g.dispose());
    }
    for (const key of Object.keys(this.materialCache) as ModelPreset[]) {
      const mat = this.materialCache[key];
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    }
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
