import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MOLECULES, MoleculeData, ELEMENT_PROPERTIES } from './models/MoleculeData';
import {
  MoleculeMesh,
  buildMoleculeMesh,
  animateTransition,
  highlightAtom,
  highlightBond,
  flashAtom
} from './models/MoleculeLoader';
import { InfoPanel, AtomInfo } from './ui/InfoPanel';
import { ForceGraph } from './ui/ForceGraph';

class MoleculeViewerApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private currentMolecule: MoleculeMesh | null = null;
  private currentMoleculeData: MoleculeData | null = null;
  private currentMoleculeKey: string = 'caffeine';

  private infoPanel: InfoPanel;
  private forceGraph: ForceGraph;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredAtom: MoleculeMesh['atoms'][0] | null = null;
  private hoveredBond: MoleculeMesh['bonds'][0] | null = null;
  private selectedAtom: MoleculeMesh['atoms'][0] | null = null;

  private tooltip: HTMLElement;
  private selectElement: HTMLSelectElement;

  private rotationEnabled: boolean = true;
  private isTransitioning: boolean = false;

  private cameraTarget: THREE.Vector3 | null = null;
  private cameraPosition: THREE.Vector3 | null = null;
  private cameraTransitionProgress: number = 0;
  private cameraTransitionStartPos: THREE.Vector3 | null = null;
  private cameraTransitionStartTarget: THREE.Vector3 | null = null;
  private cameraTransitionDuration: number = 500;
  private cameraTransitionStartTime: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.tooltip = document.getElementById('tooltip')!;
    this.selectElement = document.getElementById('molecule-select') as HTMLSelectElement;

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.5;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 5;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();
    this.setupEventListeners();

    this.infoPanel = new InfoPanel('info-panel');
    this.forceGraph = new ForceGraph('force-graph');

    this.forceGraph.setOnAtomClick((atomId: number) => {
      this.focusOnAtom(atomId);
    });

    this.loadMolecule('caffeine');
    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0A0A2A');
    gradient.addColorStop(1, '#1A1A3E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupLights(): void {
    const light1 = new THREE.PointLight(0xFFFFFF, 1, 100);
    light1.position.set(5, 5, 5);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0xFFE4B5, 0.8, 100);
    light2.position.set(-5, 2, -3);
    this.scene.add(light2);

    const light3 = new THREE.PointLight(0xADD8E6, 0.6, 100);
    light3.position.set(3, -4, 2);
    this.scene.add(light3);

    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    this.renderer.domElement.addEventListener('mouseleave', () => this.onMouseLeave());
    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    this.selectElement.addEventListener('change', () => {
      const value = this.selectElement.value;
      this.loadMolecule(value);
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (!this.currentMolecule) return;

    const allMeshes: THREE.Object3D[] = [];
    this.currentMolecule.atoms.forEach((a) => allMeshes.push(a.mesh));
    this.currentMolecule.bonds.forEach((b) => b.meshes.forEach((m) => allMeshes.push(m)));

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    let atomHit: MoleculeMesh['atoms'][0] | null = null;
    let bondHit: MoleculeMesh['bonds'][0] | null = null;

    for (const inter of intersects) {
      const obj = inter.object;
      if (obj.userData?.type === 'atom') {
        atomHit = this.currentMolecule.atoms.find((a) => a.mesh === obj) || null;
        break;
      } else if (obj.userData?.type === 'bond') {
        bondHit = this.currentMolecule.bonds.find((b) => b.meshes.includes(obj as THREE.Mesh)) || null;
        break;
      }
    }

    if (this.hoveredAtom && this.hoveredAtom !== atomHit && this.hoveredAtom !== this.selectedAtom) {
      highlightAtom(this.hoveredAtom, false);
    }
    if (this.hoveredBond && this.hoveredBond !== bondHit) {
      highlightBond(this.hoveredBond, false);
    }

    if (atomHit && atomHit !== this.selectedAtom) {
      highlightAtom(atomHit, true);
      const props = ELEMENT_PROPERTIES[atomHit.data.element];
      this.showTooltip(event.clientX, event.clientY, `${props.name} ${atomHit.data.element}`);
    } else if (bondHit) {
      highlightBond(bondHit, true);
      this.showTooltip(event.clientX, event.clientY, `键长 ${bondHit.length.toFixed(2)} Å`);
    } else {
      this.hideTooltip();
    }

    this.hoveredAtom = atomHit;
    this.hoveredBond = bondHit;
  }

  private onClick(_event: MouseEvent): void {
    if (!this.currentMolecule) return;

    const allMeshes: THREE.Object3D[] = [];
    this.currentMolecule.atoms.forEach((a) => allMeshes.push(a.mesh));
    this.currentMolecule.bonds.forEach((b) => b.meshes.forEach((m) => allMeshes.push(m)));

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    for (const inter of intersects) {
      const obj = inter.object;
      if (obj.userData?.type === 'atom') {
        const atomHit = this.currentMolecule.atoms.find((a) => a.mesh === obj);
        if (atomHit) {
          if (this.selectedAtom && this.selectedAtom !== atomHit) {
            highlightAtom(this.selectedAtom, false);
          }
          this.selectedAtom = atomHit;
          highlightAtom(atomHit, true);
          this.showAtomInfo(atomHit);
          this.forceGraph.highlightAtom(atomHit.data.id);
          return;
        }
      } else if (obj.userData?.type === 'bond') {
        const bondHit = this.currentMolecule.bonds.find((b) => b.meshes.includes(obj as THREE.Mesh));
        if (bondHit) {
          if (this.selectedAtom) {
            highlightAtom(this.selectedAtom, false);
            this.selectedAtom = null;
          }
          this.infoPanel.showBondInfo(bondHit.data, bondHit.atom1, bondHit.atom2);
          return;
        }
      }
    }

    if (this.selectedAtom) {
      highlightAtom(this.selectedAtom, false);
      this.selectedAtom = null;
    }
    this.infoPanel.showEmpty();
  }

  private onMouseLeave(): void {
    if (this.hoveredAtom && this.hoveredAtom !== this.selectedAtom) {
      highlightAtom(this.hoveredAtom, false);
    }
    if (this.hoveredBond) {
      highlightBond(this.hoveredBond, false);
    }
    this.hoveredAtom = null;
    this.hoveredBond = null;
    this.hideTooltip();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      this.rotationEnabled = !this.rotationEnabled;
    }
  }

  private showTooltip(x: number, y: number, text: string): void {
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${x + 15}px`;
    this.tooltip.style.top = `${y + 15}px`;
    this.tooltip.textContent = text;
  }

  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }

  private showAtomInfo(atomEntry: MoleculeMesh['atoms'][0]): void {
    if (!this.currentMoleculeData) return;

    const atom = atomEntry.data;
    const neighbors: AtomInfo['neighbors'] = [];

    this.currentMoleculeData.bonds.forEach((bond) => {
      let neighborId: number | null = null;
      if (bond.atom1 === atom.id) neighborId = bond.atom2;
      else if (bond.atom2 === atom.id) neighborId = bond.atom1;

      if (neighborId !== null) {
        const neighborAtom = this.currentMoleculeData!.atoms.find((a) => a.id === neighborId)!;
        neighbors.push({
          atom: neighborAtom,
          bond,
          length: Math.sqrt(
            Math.pow(neighborAtom.x - atom.x, 2) +
            Math.pow(neighborAtom.y - atom.y, 2) +
            Math.pow(neighborAtom.z - atom.z, 2)
          )
        });
      }
    });

    this.infoPanel.showAtomInfo({ atom, neighbors }, this.currentMoleculeData);
  }

  private async loadMolecule(key: string): Promise<void> {
    if (this.isTransitioning || key === this.currentMoleculeKey) return;

    this.isTransitioning = true;
    const data = MOLECULES[key];
    if (!data) {
      this.isTransitioning = false;
      return;
    }

    if (this.currentMolecule) {
      await animateTransition(this.currentMolecule.group, 'out', 600);
      this.scene.remove(this.currentMolecule.group);
      this.disposeMolecule(this.currentMolecule);
    }

    const newMolecule = buildMoleculeMesh(data);
    this.centerMolecule(newMolecule);
    newMolecule.group.scale.setScalar(0.5);
    this.scene.add(newMolecule.group);

    this.currentMolecule = newMolecule;
    this.currentMoleculeData = data;
    this.currentMoleculeKey = key;
    this.selectedAtom = null;
    this.hoveredAtom = null;
    this.hoveredBond = null;

    this.infoPanel.showEmpty();
    this.forceGraph.update(data);

    await animateTransition(newMolecule.group, 'in', 600);
    this.isTransitioning = false;
  }

  private centerMolecule(molecule: MoleculeMesh): void {
    const box = new THREE.Box3().setFromObject(molecule.group);
    const center = new THREE.Vector3();
    box.getCenter(center);
    molecule.group.position.sub(center);
  }

  private disposeMolecule(molecule: MoleculeMesh): void {
    molecule.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  private focusOnAtom(atomId: number): void {
    if (!this.currentMolecule) return;

    const atomEntry = this.currentMolecule.atoms.find((a) => a.data.id === atomId);
    if (!atomEntry) return;

    flashAtom(atomEntry);

    const worldPos = new THREE.Vector3();
    atomEntry.mesh.getWorldPosition(worldPos);

    this.cameraTransitionStartPos = this.camera.position.clone();
    this.cameraTransitionStartTarget = this.controls.target.clone();

    const direction = worldPos.clone().sub(this.camera.position).normalize();
    this.cameraTarget = worldPos.clone();
    this.cameraPosition = worldPos.clone().add(direction.multiplyScalar(-2));

    this.cameraTransitionStartTime = performance.now();
    this.cameraTransitionProgress = 0;

    if (this.selectedAtom && this.selectedAtom !== atomEntry) {
      highlightAtom(this.selectedAtom, false);
    }
    this.selectedAtom = atomEntry;
    highlightAtom(atomEntry, true);
    this.showAtomInfo(atomEntry);
  }

  private updateCameraTransition(): void {
    if (this.cameraTransitionProgress >= 1 || !this.cameraPosition || !this.cameraTarget) {
      return;
    }

    const elapsed = performance.now() - this.cameraTransitionStartTime;
    const t = Math.min(elapsed / this.cameraTransitionDuration, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    if (this.cameraTransitionStartPos && this.cameraPosition) {
      this.camera.position.lerpVectors(this.cameraTransitionStartPos, this.cameraPosition, eased);
    }
    if (this.cameraTransitionStartTarget && this.cameraTarget) {
      this.controls.target.lerpVectors(this.cameraTransitionStartTarget, this.cameraTarget, eased);
    }

    this.cameraTransitionProgress = eased;

    if (eased >= 1) {
      this.cameraPosition = null;
      this.cameraTarget = null;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    if (this.currentMolecule && this.rotationEnabled && !this.isTransitioning) {
      this.currentMolecule.group.rotation.y += 0.01;
    }

    this.updateCameraTransition();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new MoleculeViewerApp();
});
