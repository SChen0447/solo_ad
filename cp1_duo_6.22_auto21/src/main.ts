import * as THREE from 'three';
import GUI from 'lil-gui';
import { MoleculeParser, type MoleculeData } from './parser/MoleculeParser';
import { AtomRenderer, type AtomMesh } from './renderer/AtomRenderer';
import { BondRenderer } from './renderer/BondRenderer';
import { InfoPanel } from './ui/InfoPanel';
import { OrbitControlsWrapper } from './ui/OrbitControlsWrapper';

const BG_COLOR = 0x0a0a1a;

class MoleculeViewerApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controlsWrapper: OrbitControlsWrapper;
  private atomRenderer: AtomRenderer;
  private bondRenderer: BondRenderer;
  private infoPanel: InfoPanel;
  private gui!: GUI;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private prevMouse: THREE.Vector2;
  private mouseDirty: boolean = false;
  private hoveredAtom: AtomMesh | null = null;
  private selectedAtom: AtomMesh | null = null;
  private clock: THREE.Clock;
  private starsScene: THREE.Scene;
  private starsCamera: THREE.PerspectiveCamera;
  private currentMoleculeData: MoleculeData | null = null;

  private settings = {
    autoRotate: false,
    rotateSpeed: 0.5,
    showBonds: true,
    atomScale: 1.0,
    backgroundColor: '#0a0a1a',
    loadFile: () => this.triggerFileInput(),
    loadSampleBenzene: () => this.loadSampleBenzene(),
    loadSampleWater: () => this.loadSampleWater(),
    loadSampleCaffeine: () => this.loadSampleCaffeine()
  };

  private fileInput: HTMLInputElement;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100vh';
    this.container.style.overflow = 'hidden';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);
    this.scene.fog = new THREE.FogExp2(BG_COLOR, 0.002);

    this.starsScene = new THREE.Scene();
    this.starsCamera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.starsCamera.position.set(0, 0, 0);
    this.starsCamera.lookAt(0, 0, -1);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(10, 8, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;
    this.container.appendChild(this.renderer.domElement);

    this.controlsWrapper = new OrbitControlsWrapper(this.camera, this.renderer.domElement);

    this.atomRenderer = new AtomRenderer(this.scene, this.container);
    this.bondRenderer = new BondRenderer(this.scene);
    this.infoPanel = new InfoPanel(this.container);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.prevMouse = new THREE.Vector2(-999, -999);
    this.mouseDirty = false;

    this.clock = new THREE.Clock();

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.mol2,.xyz';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', (e) => this.onFileChange(e as any));
    this.container.appendChild(this.fileInput);

    this.setupLights();
    this.setupStarfield();
    this.setupGUI();
    this.setupEventListeners();

    this.loadSampleBenzene();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    mainLight.position.set(-10, 10, 8);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.8);
    fillLight.position.set(10, -5, -8);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffffff, 0.5, 100);
    rimLight.position.set(0, 0, -20);
    this.scene.add(rimLight);
  }

  private setupStarfield(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const radius = 200 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      color.setHSL(210 / 360 + Math.random() * 0.1, 0.3 + Math.random() * 0.4, brightness);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.starsScene.add(stars);
  }

  private setupGUI(): void {
    this.gui = new GUI({ title: '控制面板' });
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '20px';
    this.gui.domElement.style.left = '20px';
    this.gui.domElement.style.right = 'auto';

    const fileFolder = this.gui.addFolder('文件加载');
    fileFolder.add(this.settings, 'loadFile').name('上传分子文件');
    fileFolder.add(this.settings, 'loadSampleBenzene').name('示例: 苯 (C6H6)');
    fileFolder.add(this.settings, 'loadSampleWater').name('示例: 水 (H2O)');
    fileFolder.add(this.settings, 'loadSampleCaffeine').name('示例: 咖啡因');
    fileFolder.open();

    const viewFolder = this.gui.addFolder('视图设置');
    viewFolder.add(this.settings, 'autoRotate').name('自动旋转').onChange((v: boolean) => {
      this.controlsWrapper.setAutoRotate(v);
    });
    viewFolder.add(this.settings, 'rotateSpeed', 0.1, 3.0, 0.1).name('旋转速度').onChange((v: number) => {
      this.controlsWrapper.setAutoRotateSpeed(v);
    });
    viewFolder.add(this.settings, 'showBonds').name('显示化学键').onChange((v: boolean) => {
      this.bondRenderer.group.visible = v;
    });
    viewFolder.add(this.settings, 'atomScale', 0.3, 2.5, 0.05).name('原子大小').onChange((v: number) => {
      for (const mesh of this.atomRenderer.atomMeshes) {
        const radius = this.atomRenderer.getElementRadius(mesh.userData.atomData.element);
        mesh.userData.originalScale = radius * v;
        if (!mesh.userData.isHighlighted) {
          mesh.scale.setScalar(radius * v);
        }
        if (mesh.userData.glowMesh) {
          mesh.userData.glowMesh.scale.setScalar(1.5);
        }
      }
    });
    viewFolder.addColor(this.settings, 'backgroundColor').name('背景颜色').onChange((v: string | number | THREE.Color) => {
      this.scene.background = new THREE.Color(v);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color = new THREE.Color(v);
      }
    });
    viewFolder.open();

    const infoFolder = this.gui.addFolder('信息');
    infoFolder.add({ reset: () => this.resetView() }, 'reset').name('重置视角');
    infoFolder.open();
  }

  private resetView(): void {
    this.controlsWrapper.reset();
    const radius = this.atomRenderer.getBoundingRadius() * 2.5 || 15;
    this.camera.position.set(radius * 0.7, radius * 0.6, radius * 0.9);
    this.controlsWrapper.setTarget(new THREE.Vector3(0, 0, 0));
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('mouseleave', () => this.onMouseLeave());
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.starsCamera.aspect = width / height;
    this.starsCamera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.atomRenderer.onResize(width, height);
  }

  private onMouseMove(event: MouseEvent): void {
    const nx = (event.clientX / window.innerWidth) * 2 - 1;
    const ny = -(event.clientY / window.innerHeight) * 2 + 1;
    if (Math.abs(nx - this.mouse.x) > 1e-6 || Math.abs(ny - this.mouse.y) > 1e-6) {
      this.mouse.x = nx;
      this.mouse.y = ny;
      this.mouseDirty = true;
    }
  }

  private onMouseLeave(): void {
    this.mouse.set(-999, -999);
    this.mouseDirty = true;
  }

  private performRaycast(): void {
    if (!this.mouseDirty) return;
    this.mouseDirty = false;

    if (this.mouse.x < -1 || this.mouse.x > 1) {
      if (this.hoveredAtom && this.hoveredAtom !== this.selectedAtom) {
        this.atomRenderer.unhighlightAtom(this.hoveredAtom);
        this.hoveredAtom = null;
        this.renderer.domElement.style.cursor = 'grab';
      }
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.atomRenderer.atomMeshes, false);

    let newHovered: AtomMesh | null = null;
    if (intersects.length > 0) {
      newHovered = intersects[0].object as AtomMesh;
    }

    if (newHovered !== this.hoveredAtom) {
      if (this.hoveredAtom && this.hoveredAtom !== this.selectedAtom) {
        this.atomRenderer.unhighlightAtom(this.hoveredAtom);
      }
      if (newHovered) {
        this.atomRenderer.highlightAtom(newHovered);
      }
      this.hoveredAtom = newHovered;

      if (newHovered) {
        this.infoPanel.updateAtomPositions(this.atomRenderer.atomMeshes);
        this.infoPanel.update(newHovered);
      } else {
        if (this.selectedAtom) {
          this.infoPanel.update(this.selectedAtom);
        } else {
          this.infoPanel.update(null);
        }
      }

      this.renderer.domElement.style.cursor = newHovered ? 'pointer' : 'grab';
    }
  }

  private triggerFileInput(): void {
    this.fileInput.click();
  }

  private onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    const file = target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const moleculeData = MoleculeParser.parse(content, file.name);
        this.renderMolecule(moleculeData);
      } catch (err) {
        console.error('解析文件错误:', err);
        alert('文件解析失败: ' + (err as Error).message);
      }
    };

    reader.readAsText(file);
    target.value = '';
  }

  private loadSampleWater(): void {
    const waterXyz = `3
Water molecule
O    0.000000    0.000000    0.000000
H    0.758602    0.000000    0.504284
H    0.758602    0.000000   -0.504284
`;
    const data = MoleculeParser.parse(waterXyz, 'water.xyz');
    this.renderMolecule(data);
  }

  private loadSampleBenzene(): void {
    const benzeneMol2 = `@<TRIPOS>MOLECULE
Benzene
12 12 0 0 0
SMALL
NO_CHARGES
@<TRIPOS>ATOM
1 C1    0.0000    1.3990    0.0000 C.ar 1 BENZENE 0.0000
2 C2    1.2114    0.6995    0.0000 C.ar 1 BENZENE 0.0000
3 C3    1.2114   -0.6995    0.0000 C.ar 1 BENZENE 0.0000
4 C4    0.0000   -1.3990    0.0000 C.ar 1 BENZENE 0.0000
5 C5   -1.2114   -0.6995    0.0000 C.ar 1 BENZENE 0.0000
6 C6   -1.2114    0.6995    0.0000 C.ar 1 BENZENE 0.0000
7 H7    0.0000    2.4810    0.0000 H    1 BENZENE 0.0000
8 H8    2.1504    1.2405    0.0000 H    1 BENZENE 0.0000
9 H9    2.1504   -1.2405    0.0000 H    1 BENZENE 0.0000
10 H10   0.0000   -2.4810    0.0000 H   1 BENZENE 0.0000
11 H11  -2.1504   -1.2405    0.0000 H   1 BENZENE 0.0000
12 H12  -2.1504    1.2405    0.0000 H   1 BENZENE 0.0000
@<TRIPOS>BOND
1 1 2 ar
2 2 3 ar
3 3 4 ar
4 4 5 ar
5 5 6 ar
6 6 1 ar
7 1 7 1
8 2 8 1
9 3 9 1
10 4 10 1
11 5 11 1
12 6 12 1
`;
    const data = MoleculeParser.parse(benzeneMol2, 'benzene.mol2');
    this.renderMolecule(data);
  }

  private loadSampleCaffeine(): void {
    const caffeineMol2 = `@<TRIPOS>MOLECULE
Caffeine
24 25 0 0 0
SMALL
NO_CHARGES
@<TRIPOS>ATOM
1 N1   -0.4709    1.3926   -0.1388 N.am 1 CAFF 0.0000
2 C2    0.8136    1.8328   -0.0440 C.2  1 CAFF 0.0000
3 N3    1.5448    0.7312    0.3226 N.am 1 CAFF 0.0000
4 C4    0.6763   -0.2242    0.4238 C.2  1 CAFF 0.0000
5 C5   -0.7341    0.0268    0.0729 C.2  1 CAFF 0.0000
6 C6   -1.2747   -1.3140    0.1536 C.3  1 CAFF 0.0000
7 N7    0.7935   -1.6217    0.7865 N.am 1 CAFF 0.0000
8 C8    2.1913   -1.5588    0.8127 C.3  1 CAFF 0.0000
9 C9    2.1702    1.9311   -0.3357 C.3  1 CAFF 0.0000
10 N10 -1.7300    2.1037   -0.4398 N.am 1 CAFF 0.0000
11 O11  1.1175    2.8737   -0.3238 O.2  1 CAFF 0.0000
12 O12  0.0123   -2.4271    0.7069 O.2  1 CAFF 0.0000
13 C13 -2.7789    1.1426   -0.4188 C.3  1 CAFF 0.0000
14 H14  1.5022   -2.4291    1.2833 H    1 CAFF 0.0000
15 H15  2.7374   -2.1736    1.5324 H    1 CAFF 0.0000
16 H16  2.6610   -1.9596   -0.1170 H    1 CAFF 0.0000
17 H17  2.6955    2.9078   -0.2975 H    1 CAFF 0.0000
18 H18  2.7614    1.1871    0.2483 H    1 CAFF 0.0000
19 H19  2.2203    1.8576   -1.4317 H    1 CAFF 0.0000
20 H20 -0.9237   -1.9368   -0.6181 H    1 CAFF 0.0000
21 H21 -1.3059   -1.8999    1.0875 H    1 CAFF 0.0000
22 H22 -2.2354   -1.2794   -0.1109 H    1 CAFF 0.0000
23 H23 -3.6047    1.5518   -0.0257 H    1 CAFF 0.0000
24 H24 -2.8822    0.7858   -1.4524 H    1 CAFF 0.0000
@<TRIPOS>BOND
1 1 2 2
2 2 3 1
3 3 4 2
4 4 5 1
5 5 1 2
6 5 6 1
7 4 7 1
8 7 8 1
9 2 9 1
10 1 10 1
11 2 11 2
12 7 12 2
13 10 13 1
14 7 14 1
15 8 15 1
16 8 16 1
17 8 17 1
18 9 18 1
19 9 19 1
20 9 20 1
21 6 21 1
22 6 22 1
23 13 23 1
24 13 24 1
`;
    const data = MoleculeParser.parse(caffeineMol2, 'caffeine.mol2');
    this.renderMolecule(data);
  }

  private renderMolecule(moleculeData: MoleculeData): void {
    if (this.selectedAtom) {
      this.atomRenderer.unhighlightAtom(this.selectedAtom);
      this.selectedAtom = null;
    }
    if (this.hoveredAtom) {
      this.atomRenderer.unhighlightAtom(this.hoveredAtom);
      this.hoveredAtom = null;
    }
    this.infoPanel.update(null);

    this.currentMoleculeData = moleculeData;
    this.infoPanel.setMoleculeData(moleculeData);

    this.bondRenderer.clear();
    const atomMeshes = this.atomRenderer.render(moleculeData, this.settings.atomScale);
    this.bondRenderer.render(moleculeData, atomMeshes);

    const center = new THREE.Vector3();
    const boundingRadius = this.atomRenderer.getBoundingRadius();
    this.controlsWrapper.setTarget(center);

    const distance = boundingRadius * 2.5;
    this.camera.position.set(distance * 0.7, distance * 0.6, distance * 0.9);
    this.camera.lookAt(center);
    this.controlsWrapper.setTarget(center);

    this.controlsWrapper.controls.minDistance = boundingRadius * 0.5;
    this.controlsWrapper.controls.maxDistance = boundingRadius * 10;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const deltaMs = delta * 1000;

    this.controlsWrapper.update(deltaMs);

    this.performRaycast();

    this.renderer.clear();
    this.renderer.render(this.starsScene, this.starsCamera);
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);

    this.atomRenderer.updateLabels(this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new MoleculeViewerApp();
});
