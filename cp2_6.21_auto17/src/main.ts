import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  StructureType,
  StructureParams,
  getDefaultParams,
  createStructure,
  updateStructure,
  sampleGeodesicPath,
  getVertexCount,
} from './structures';
import {
  ControlsHandle,
  createControls,
  createGeodesicLine,
  updateGeodesicLine,
  fadeGeodesicLine,
} from './controls';
import { ProjectionHandle, createProjection } from './projection';

const MORPH_DURATION = 0.5;
const GEODESIC_FADE_DURATION = 1.0;

class NonEuclidApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private controlsHandle: ControlsHandle;
  private projectionHandle: ProjectionHandle;

  private mesh: THREE.Mesh;
  private wireframe: THREE.LineSegments;
  private geodesicLine: THREE.Line;
  private geodesicGlowLine: THREE.Line;

  private currentType: StructureType = 'mobius';
  private currentParams: StructureParams;
  private targetGeometry: THREE.BufferGeometry | null = null;
  private sourceGeometry: THREE.BufferGeometry | null = null;

  private isMorphing = false;
  private morphProgress = 0;

  private geodesicTimer = 0;
  private geodesicVisible = false;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private clock = new THREE.Clock();

  private gridHelper: THREE.GridHelper;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private pointLight: THREE.PointLight;

  constructor() {
    this.currentParams = getDefaultParams();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x111118, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(4, 3, 5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 20;

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(5, 8, 5);
    this.scene.add(this.directionalLight);

    this.pointLight = new THREE.PointLight(0x6C63FF, 0.8, 15);
    this.pointLight.position.set(-3, 2, -3);
    this.scene.add(this.pointLight);

    const backLight = new THREE.DirectionalLight(0xA78BFA, 0.3);
    backLight.position.set(-5, -2, -5);
    this.scene.add(backLight);

    this.gridHelper = new THREE.GridHelper(20, 40, 0x222233, 0x1a1a28);
    this.gridHelper.position.y = -2.5;
    this.scene.add(this.gridHelper);

    const initialGeometry = createStructure(this.currentType, this.currentParams);
    const material = this.createMaterial(this.currentType);
    this.mesh = new THREE.Mesh(initialGeometry, material);
    this.scene.add(this.mesh);

    const wireGeo = new THREE.WireframeGeometry(initialGeometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x6C63FF,
      transparent: true,
      opacity: 0.06,
    });
    this.wireframe = new THREE.LineSegments(wireGeo, wireMat);
    this.scene.add(this.wireframe);

    this.geodesicLine = createGeodesicLine();
    this.scene.add(this.geodesicLine);
    this.geodesicLine.visible = false;

    const glowMat = new THREE.LineBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.4,
      linewidth: 2,
    });
    const glowGeo = new THREE.BufferGeometry();
    this.geodesicGlowLine = new THREE.Line(glowGeo, glowMat);
    this.scene.add(this.geodesicGlowLine);
    this.geodesicGlowLine.visible = false;

    this.controlsHandle = createControls(this.currentType, this.currentParams);
    this.controlsHandle.onChange(this.onControlChange.bind(this));

    this.projectionHandle = createProjection();

    this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private createMaterial(type: StructureType): THREE.MeshStandardMaterial {
    if (type === 'hyperbolic') {
      return new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        metalness: 0.2,
        roughness: 0.6,
        transparent: true,
        opacity: 0.92,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: 0x8888cc,
      side: THREE.DoubleSide,
      metalness: 0.35,
      roughness: 0.5,
      transparent: true,
      opacity: 0.88,
    });
  }

  private onControlChange(type: StructureType, params: StructureParams): void {
    const typeChanged = type !== this.currentType;
    this.currentType = type;
    this.currentParams = { ...params };

    if (typeChanged) {
      this.startMorph();
      this.projectionHandle.triggerEnterAnimation();
    } else {
      this.updateCurrentGeometry();
    }

    this.projectionHandle.update(type, params);
  }

  private startMorph(): void {
    this.sourceGeometry = this.mesh.geometry.clone();
    this.targetGeometry = createStructure(this.currentType, this.currentParams);

    this.mesh.material = this.createMaterial(this.currentType);
    this.isMorphing = true;
    this.morphProgress = 0;
  }

  private updateCurrentGeometry(): void {
    updateStructure(this.mesh.geometry, this.currentType, this.currentParams);
    this.mesh.geometry.computeVertexNormals();

    this.wireframe.geometry.dispose();
    this.wireframe.geometry = new THREE.WireframeGeometry(this.mesh.geometry);
  }

  private updateMorph(delta: number): void {
    if (!this.isMorphing || !this.targetGeometry) return;

    this.morphProgress += delta / MORPH_DURATION;

    if (this.morphProgress >= 1) {
      this.morphProgress = 1;
      this.isMorphing = false;

      this.mesh.geometry.dispose();
      this.mesh.geometry = this.targetGeometry;
      this.targetGeometry = null;

      if (this.sourceGeometry) {
        this.sourceGeometry.dispose();
        this.sourceGeometry = null;
      }

      this.wireframe.geometry.dispose();
      this.wireframe.geometry = new THREE.WireframeGeometry(this.mesh.geometry);
      return;
    }

    const t = this.easeInOutCubic(this.morphProgress);
    this.interpolateGeometry(t);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private interpolateGeometry(t: number): void {
    if (!this.sourceGeometry || !this.targetGeometry) return;

    const srcPos = this.sourceGeometry.getAttribute('position') as THREE.BufferAttribute;
    const tgtPos = this.targetGeometry.getAttribute('position') as THREE.BufferAttribute;
    const curPos = this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;

    const maxCount = Math.max(srcPos.count, tgtPos.count);

    if (curPos.count !== maxCount) {
      this.mesh.geometry.dispose();
      const newGeo = this.targetGeometry.clone();
      const posAttr = newGeo.getAttribute('position') as THREE.BufferAttribute;
      const newPositions = new Float32Array(maxCount * 3);
      for (let i = 0; i < maxCount * 3; i++) {
        const sv = i < srcPos.array.length ? srcPos.array[i] : 0;
        const tv = i < tgtPos.array.length ? tgtPos.array[i] : 0;
        newPositions[i] = sv + (tv - sv) * t;
      }
      newGeo.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
      this.mesh.geometry = newGeo;
    } else {
      const positions = curPos.array as Float32Array;
      for (let i = 0; i < positions.length; i++) {
        const sv = i < srcPos.array.length ? srcPos.array[i] : 0;
        const tv = i < tgtPos.array.length ? tgtPos.array[i] : 0;
        positions[i] = sv + (tv - sv) * t;
      }
      curPos.needsUpdate = true;
    }

    this.mesh.geometry.computeVertexNormals();
  }

  private onCanvasClick(event: MouseEvent): void {
    if (this.isMorphing) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.mesh);

    if (intersects.length > 0) {
      const uv = intersects[0].uv;
      if (uv) {
        this.showGeodesic(uv.x, uv.y);
      }
    }
  }

  private showGeodesic(u: number, v: number): void {
    const points = sampleGeodesicPath(
      this.mesh.geometry,
      this.currentType,
      this.currentParams,
      u,
      (v - 0.5) * 2
    );

    updateGeodesicLine(this.geodesicLine, points);
    updateGeodesicLine(this.geodesicGlowLine, points);

    this.geodesicLine.visible = true;
    this.geodesicGlowLine.visible = true;
    this.geodesicTimer = GEODESIC_FADE_DURATION;
    this.geodesicVisible = true;
  }

  private updateGeodesic(delta: number): void {
    if (!this.geodesicVisible) return;

    this.geodesicTimer -= delta;

    if (this.geodesicTimer <= 0) {
      this.geodesicLine.visible = false;
      this.geodesicGlowLine.visible = false;
      this.geodesicVisible = false;
      return;
    }

    const fadeRatio = this.geodesicTimer / GEODESIC_FADE_DURATION;
    (this.geodesicLine.material as THREE.LineBasicMaterial).opacity = fadeRatio;
    (this.geodesicGlowLine.material as THREE.LineBasicMaterial).opacity = fadeRatio * 0.4;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.controls.update();

    this.updateMorph(delta);
    this.updateGeodesic(delta);

    if (!this.isMorphing) {
      this.mesh.rotation.y += delta * 0.08;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new NonEuclidApp();
