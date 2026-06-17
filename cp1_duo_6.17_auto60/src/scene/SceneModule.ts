import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ModelPreset, TransformParams, computeCombinedMatrix } from '../types';
import { useTransformStore } from '../store/useTransformStore';

const LERP_DURATION = 300;
const MODEL_TRANSITION_DURATION = 1000;

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
};

export class SceneModule {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private modelGroup: THREE.Group;
  private wireframeGroup: THREE.Group;
  private currentModel: ModelPreset;
  private interp: InterpolationState;
  private modelTransition: ModelTransitionState;
  private animationId: number = 0;
  private gridHelper: THREE.GridHelper;
  private axesGroup: THREE.Group;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.currentModel = ModelPreset.Cube;
    this.interp = { startParams: { translateX: 0, rotateY: 0, scale: 1, shearX: 0 }, targetParams: { translateX: 0, rotateY: 0, scale: 1, shearX: 0 }, startTime: 0, active: false };
    this.modelTransition = { phase: 'idle', startTime: 0, fromModel: null, toModel: null };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a2e);

    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    this.camera.position.set(5, 4, 7);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x0a0a2e);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0, 0);

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

    this.loadModel(ModelPreset.Cube);
    this.applyTransformImmediate(useTransformStore.getState().params);

    window.addEventListener('resize', this.onResize);

    this.animate();
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

  private createColoredMaterial(): THREE.MeshPhongMaterial[] {
    return [
      new THREE.MeshPhongMaterial({ color: 0xff4444, shininess: 60 }),
      new THREE.MeshPhongMaterial({ color: 0x44ff44, shininess: 60 }),
      new THREE.MeshPhongMaterial({ color: 0x4444ff, shininess: 60 }),
      new THREE.MeshPhongMaterial({ color: 0xffff44, shininess: 60 }),
      new THREE.MeshPhongMaterial({ color: 0xff44ff, shininess: 60 }),
      new THREE.MeshPhongMaterial({ color: 0x44ffff, shininess: 60 }),
    ];
  }

  private createWireframe(geometry: THREE.BufferGeometry): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(geometry, 15);
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true });
    return new THREE.LineSegments(edges, mat);
  }

  private loadModel(preset: ModelPreset): void {
    this.clearModelGroup();

    let geometry: THREE.BufferGeometry;
    let mesh: THREE.Mesh;

    switch (preset) {
      case ModelPreset.Cube:
        geometry = new THREE.BoxGeometry(2, 2, 2);
        mesh = new THREE.Mesh(geometry, this.createColoredMaterial());
        break;

      case ModelPreset.Icosahedron:
        geometry = new THREE.IcosahedronGeometry(1.4, 0);
        mesh = new THREE.Mesh(geometry, this.createColoredMaterial());
        break;

      case ModelPreset.TorusKnot:
        geometry = new THREE.TorusKnotGeometry(1, 0.35, 100, 16);
        mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
          color: 0x6c6cff,
          shininess: 80,
          specular: 0xffffff,
        }));
        break;

      case ModelPreset.Compound: {
        const g1 = new THREE.OctahedronGeometry(0.9, 0);
        const m1 = new THREE.Mesh(g1, new THREE.MeshPhongMaterial({ color: 0xff6644, shininess: 60 }));
        this.modelGroup.add(m1);

        const g2 = new THREE.TetrahedronGeometry(0.7, 0);
        const m2 = new THREE.Mesh(g2, new THREE.MeshPhongMaterial({ color: 0x44ff88, shininess: 60 }));
        m2.position.set(1.2, 0, 0);
        this.modelGroup.add(m2);

        const g3 = new THREE.DodecahedronGeometry(0.6, 0);
        const m3 = new THREE.Mesh(g3, new THREE.MeshPhongMaterial({ color: 0x4488ff, shininess: 60 }));
        m3.position.set(-0.8, 0.9, 0.3);
        this.modelGroup.add(m3);

        this.wireframeGroup.add(this.createWireframe(g1));
        const wf2 = this.createWireframe(g2);
        wf2.position.copy(m2.position);
        this.wireframeGroup.add(wf2);
        const wf3 = this.createWireframe(g3);
        wf3.position.copy(m3.position);
        this.wireframeGroup.add(wf3);

        this.currentModel = preset;
        return;
      }

      default:
        geometry = new THREE.BoxGeometry(2, 2, 2);
        mesh = new THREE.Mesh(geometry, this.createColoredMaterial());
    }

    this.modelGroup.add(mesh);
    this.wireframeGroup.add(this.createWireframe(geometry));
    this.currentModel = preset;
  }

  private clearModelGroup(): void {
    while (this.modelGroup.children.length > 0) {
      const child = this.modelGroup.children[0];
      this.modelGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const mat = child.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    }
    while (this.wireframeGroup.children.length > 0) {
      const child = this.wireframeGroup.children[0];
      this.wireframeGroup.remove(child);
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        child.material.dispose();
      }
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
    this.modelTransition = {
      phase: 'fadeOut',
      startTime: now,
      fromModel: this.currentModel,
      toModel: model,
    };
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
      const t = Math.min(elapsed / LERP_DURATION, 1);
      const currentParams = this.lerpParams(this.interp.startParams, this.interp.targetParams, t);
      this.applyMatrixFromParams(currentParams);
      if (t >= 1) {
        this.interp.active = false;
      }
    }

    if (this.modelTransition.phase === 'fadeOut') {
      const elapsed = now - this.modelTransition.startTime;
      const t = Math.min(elapsed / MODEL_TRANSITION_DURATION, 1);
      const s = 1 - t;
      this.modelGroup.scale.setScalar(Math.max(s, 0.001));
      this.wireframeGroup.scale.setScalar(Math.max(s, 0.001));
      this.setModelOpacity(1 - t);
      if (t >= 1) {
        if (this.modelTransition.toModel) {
          this.loadModel(this.modelTransition.toModel);
          this.currentModel = this.modelTransition.toModel;
          const storeParams = useTransformStore.getState().params;
          this.applyTransformImmediate(storeParams);
        }
        this.modelTransition.phase = 'fadeIn';
        this.modelTransition.startTime = now;
      }
    }

    if (this.modelTransition.phase === 'fadeIn') {
      const elapsed = now - this.modelTransition.startTime;
      const t = Math.min(elapsed / MODEL_TRANSITION_DURATION, 1);
      this.modelGroup.scale.setScalar(t);
      this.wireframeGroup.scale.setScalar(t);
      this.setModelOpacity(t);
      if (t >= 1) {
        this.modelGroup.scale.setScalar(1);
        this.wireframeGroup.scale.setScalar(1);
        this.modelTransition.phase = 'idle';
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
    this.controls.dispose();
    this.renderer.dispose();
    this.clearModelGroup();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
