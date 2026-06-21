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
} from './controls';
import { ProjectionHandle, createProjection } from './projection';

const MORPH_DURATION = 0.5;
const GEODESIC_FADE_DURATION = 1.0;
const GEODESIC_LINE_RADIUS = 0.025;
const GEODESIC_GLOW_RADIUS = 0.06;
const AUTO_ROTATE_SPEED = 0.5;
const AUTO_ROTATE_RESUME_DELAY = 2.0;

class NonEuclidApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private controlsHandle: ControlsHandle;
  private projectionHandle: ProjectionHandle;

  private mesh: THREE.Mesh;
  private wireframe: THREE.LineSegments;
  private geodesicMesh: THREE.Mesh;
  private geodesicGlowMesh: THREE.Mesh;

  private currentType: StructureType = 'mobius';
  private currentParams: StructureParams;
  private targetGeometry: THREE.BufferGeometry | null = null;
  private sourceGeometry: THREE.BufferGeometry | null = null;

  private isMorphing = false;
  private morphProgress = 0;

  private geodesicTimer = 0;
  private geodesicVisible = false;

  private autoRotateEnabled = false;
  private autoRotatePaused = false;
  private autoRotateResumeTimer = 0;

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

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 1,
    });
    this.geodesicMesh = new THREE.Mesh(new THREE.BufferGeometry(), coreMat);
    this.geodesicMesh.visible = false;
    this.scene.add(this.geodesicMesh);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff5533,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.geodesicGlowMesh = new THREE.Mesh(new THREE.BufferGeometry(), glowMat);
    this.geodesicGlowMesh.visible = false;
    this.scene.add(this.geodesicGlowMesh);

    this.controlsHandle = createControls(this.currentType, this.currentParams);
    this.controlsHandle.onChange(this.onControlChange.bind(this));
    this.controlsHandle.onAutoRotateChange(this.onAutoRotateChange.bind(this));

    this.controls.addEventListener('start', this.onControlsStart.bind(this));
    this.controls.addEventListener('end', this.onControlsEnd.bind(this));

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
        metalness: 0.15,
        roughness: 0.7,
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

    this.hideGeodesic();
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

  private buildTubeGeometry(points: THREE.Vector3[], radius: number): THREE.BufferGeometry {
    if (points.length < 2) return new THREE.BufferGeometry();

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const tubeGeo = new THREE.TubeGeometry(curve, Math.min(200, points.length * 2), radius, 8, false);
    return tubeGeo;
  }

  private showGeodesic(u: number, v: number): void {
    const points = sampleGeodesicPath(
      this.currentType,
      this.currentParams,
      u,
      (v - 0.5) * 2
    );

    if (points.length < 2) return;

    this.geodesicMesh.geometry.dispose();
    this.geodesicMesh.geometry = this.buildTubeGeometry(points, GEODESIC_LINE_RADIUS);

    this.geodesicGlowMesh.geometry.dispose();
    this.geodesicGlowMesh.geometry = this.buildTubeGeometry(points, GEODESIC_GLOW_RADIUS);

    this.geodesicMesh.visible = true;
    this.geodesicGlowMesh.visible = true;
    (this.geodesicMesh.material as THREE.MeshBasicMaterial).opacity = 1;
    (this.geodesicGlowMesh.material as THREE.MeshBasicMaterial).opacity = 0.45;

    this.geodesicTimer = GEODESIC_FADE_DURATION;
    this.geodesicVisible = true;
  }

  private hideGeodesic(): void {
    this.geodesicMesh.visible = false;
    this.geodesicGlowMesh.visible = false;
    this.geodesicVisible = false;
    this.geodesicTimer = 0;
  }

  private updateGeodesic(delta: number): void {
    if (!this.geodesicVisible) return;

    this.geodesicTimer -= delta;

    if (this.geodesicTimer <= 0) {
      this.hideGeodesic();
      return;
    }

    const fadeRatio = this.geodesicTimer / GEODESIC_FADE_DURATION;
    (this.geodesicMesh.material as THREE.MeshBasicMaterial).opacity = fadeRatio;
    (this.geodesicGlowMesh.material as THREE.MeshBasicMaterial).opacity = fadeRatio * 0.45;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onAutoRotateChange(enabled: boolean): void {
    this.autoRotateEnabled = enabled;
    if (!enabled) {
      this.autoRotatePaused = false;
      this.autoRotateResumeTimer = 0;
    }
  }

  private onControlsStart(): void {
    if (this.autoRotateEnabled) {
      this.autoRotatePaused = true;
      this.autoRotateResumeTimer = 0;
    }
  }

  private onControlsEnd(): void {
    if (this.autoRotateEnabled) {
      this.autoRotateResumeTimer = AUTO_ROTATE_RESUME_DELAY;
    }
  }

  private updateAutoRotate(delta: number): void {
    if (!this.autoRotateEnabled) return;

    if (this.autoRotatePaused && this.autoRotateResumeTimer > 0) {
      this.autoRotateResumeTimer -= delta;
      if (this.autoRotateResumeTimer <= 0) {
        this.autoRotatePaused = false;
      }
    }

    if (!this.autoRotatePaused && !this.isMorphing) {
      const rot = delta * AUTO_ROTATE_SPEED;
      this.mesh.rotation.y += rot;
      this.projectionHandle.setRotation(this.mesh.rotation.y);
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.controls.update();

    this.updateMorph(delta);
    this.updateGeodesic(delta);
    this.updateAutoRotate(delta);

    if (!this.isMorphing && this.geodesicVisible) {
      this.geodesicMesh.quaternion.copy(this.mesh.quaternion);
      this.geodesicGlowMesh.quaternion.copy(this.mesh.quaternion);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new NonEuclidApp();
