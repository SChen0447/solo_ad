import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MoleculeLoader, ELEMENT_PROPERTIES } from './MoleculeLoader';

export interface AtomInfo {
  element: string;
  elementName: string;
  index: number;
  position: THREE.Vector3;
}

export class MoleculeViewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private moleculeLoader: MoleculeLoader;
  private currentMolecule: THREE.Group | null = null;
  private hoveredAtom: THREE.Mesh | null = null;
  private atomMeshes: THREE.Mesh[] = [];

  private container: HTMLElement;
  private zoomIndicator: HTMLElement;
  private atomInfoPanel: HTMLElement;
  private atomNameEl: HTMLElement;
  private atomIndexEl: HTMLElement;
  private atomXEl: HTMLElement;
  private atomYEl: HTMLElement;
  private atomZEl: HTMLElement;

  private defaultCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 2, 6);
  private defaultTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private onAtomHoverCallback: ((info: AtomInfo | null) => void) | null = null;
  private zoomIndicatorTimeout: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.moleculeLoader = new MoleculeLoader();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.zoomIndicator = document.getElementById('zoomIndicator')!;
    this.atomInfoPanel = document.getElementById('atomInfoPanel')!;
    this.atomNameEl = document.getElementById('atomName')!;
    this.atomIndexEl = document.getElementById('atomIndex')!;
    this.atomXEl = document.getElementById('atomX')!;
    this.atomYEl = document.getElementById('atomY')!;
    this.atomZEl = document.getElementById('atomZ')!;

    this.scene = new THREE.Scene();
    this.setupBackground();
    this.setupLights();
    this.setupGrid();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.defaultCameraPosition);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupControls();

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(0.5, '#1a1040');
    gradient.addColorStop(1, '#0d0820');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-5, 8, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4a9eff, 0.2);
    fillLight.position.set(5, -2, -5);
    this.scene.add(fillLight);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
    const gridMaterial = gridHelper.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.3;
    gridHelper.position.y = -3;
    this.scene.add(gridHelper);
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 20;
    this.controls.minZoom = 0.3;
    this.controls.maxZoom = 3;
    this.controls.enablePan = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.target.copy(this.defaultTarget);
    this.controls.addEventListener('change', this.onControlsChange.bind(this));
  }

  private onControlsChange(): void {
    const distance = this.camera.position.distanceTo(this.controls.target);
    const defaultDistance = this.defaultCameraPosition.distanceTo(this.defaultTarget);
    const zoomScale = defaultDistance / distance;
    const clampedZoom = Math.max(0.3, Math.min(3, zoomScale));
    this.updateZoomIndicator(clampedZoom);
  }

  private updateZoomIndicator(zoom: number): void {
    this.zoomIndicator.textContent = `缩放: ${zoom.toFixed(2)}x`;
    this.zoomIndicator.classList.add('visible');

    if (this.zoomIndicatorTimeout) {
      clearTimeout(this.zoomIndicatorTimeout);
    }
    this.zoomIndicatorTimeout = window.setTimeout(() => {
      this.zoomIndicator.classList.remove('visible');
    }, 1000);
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkHover();
  }

  private checkHover(): void {
    if (!this.currentMolecule || this.atomMeshes.length === 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.atomMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (mesh !== this.hoveredAtom) {
        this.setHoveredAtom(mesh);
      }
    } else if (this.hoveredAtom) {
      this.clearHoveredAtom();
    }
  }

  private setHoveredAtom(mesh: THREE.Mesh): void {
    if (this.hoveredAtom) {
      this.restoreAtomAppearance(this.hoveredAtom);
    }

    this.hoveredAtom = mesh;
    this.highlightAtom(mesh);

    const userData = mesh.userData;
    const element = userData.element as string;
    const props = ELEMENT_PROPERTIES[element];
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);

    const localPos = mesh.position.clone();

    const info: AtomInfo = {
      element,
      elementName: props.name,
      index: userData.atomIndex as number,
      position: localPos,
    };

    this.showAtomInfo(info);

    if (this.onAtomHoverCallback) {
      this.onAtomHoverCallback(info);
    }
  }

  private clearHoveredAtom(): void {
    if (this.hoveredAtom) {
      this.restoreAtomAppearance(this.hoveredAtom);
      this.hoveredAtom = null;
    }
    this.hideAtomInfo();

    if (this.onAtomHoverCallback) {
      this.onAtomHoverCallback(null);
    }
  }

  private highlightAtom(mesh: THREE.Mesh): void {
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.emissive = new THREE.Color(0x4a9eff);
    material.emissiveIntensity = 0.5;
    mesh.scale.setScalar(1.15);
  }

  private restoreAtomAppearance(mesh: THREE.Mesh): void {
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.emissive = new THREE.Color(0x000000);
    material.emissiveIntensity = 0;
    mesh.scale.setScalar(1);
  }

  private showAtomInfo(info: AtomInfo): void {
    this.atomNameEl.textContent = info.elementName;
    this.atomIndexEl.textContent = `${info.index + 1} (${info.element})`;
    this.atomXEl.textContent = info.position.x.toFixed(2);
    this.atomYEl.textContent = info.position.y.toFixed(2);
    this.atomZEl.textContent = info.position.z.toFixed(2);
    this.atomInfoPanel.classList.add('visible');
  }

  private hideAtomInfo(): void {
    this.atomInfoPanel.classList.remove('visible');
  }

  loadMolecule(key: string, animate: boolean = true): void {
    if (this.currentMolecule) {
      this.scene.remove(this.currentMolecule);
    }

    const molecule = this.moleculeLoader.loadMolecule(key);
    this.currentMolecule = molecule;

    const atomsGroup = molecule.getObjectByName('atoms') as THREE.Group;
    this.atomMeshes = atomsGroup ? (atomsGroup.children as THREE.Mesh[]) : [];

    if (animate) {
      molecule.rotation.y = -Math.PI;
      molecule.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = 0;
        }
      });

      const startTime = performance.now();
      const duration = 500;

      const animateIn = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        molecule.rotation.y = -Math.PI * (1 - eased);

        molecule.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            mat.opacity = eased;
          }
        });

        if (progress < 1) {
          requestAnimationFrame(animateIn);
        } else {
          molecule.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.MeshStandardMaterial;
              if (child.geometry.type !== 'CylinderGeometry') {
                mat.transparent = false;
              }
              mat.opacity = 1;
            }
          });
          molecule.rotation.y = 0;
        }
      };
      animateIn();
    }

    this.scene.add(molecule);
  }

  resetCamera(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPos = this.defaultCameraPosition.clone();
    const endTarget = this.defaultTarget.clone();

    const startTime = performance.now();
    const duration = 1000;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPos, endPos, eased);
      this.controls.target.lerpVectors(startTarget, endTarget, eased);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  setOnAtomHover(callback: (info: AtomInfo | null) => void): void {
    this.onAtomHoverCallback = callback;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
