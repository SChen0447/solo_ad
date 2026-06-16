import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FoldResponse, ResidueInfo } from './backend';

export interface FrameData {
  caCoords: number[][];
  sidechainCoords: number[][];
  progress: number;
  phis: number[];
  psis: number[];
}

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number | null = null;

  private moleculeGroup: THREE.Group;
  private caAtoms: THREE.Mesh[] = [];
  private backboneBonds: THREE.Mesh[] = [];
  private sidechainBonds: THREE.Mesh[] = [];
  private sidechainAtoms: THREE.Mesh[] = [];

  private residues: ResidueInfo[] = [];
  private nResidues = 0;

  private CA_RADIUS = 0.5;
  private BACKBONE_RADIUS = 0.18;
  private SIDECHAIN_ATOM_RADIUS = 0.3;
  private SIDECHAIN_BOND_RADIUS = 0.12;

  private frameListeners: ((frame: FrameData) => void)[] = [];

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;

    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);

    this.setupLights();
    this.setupGrid();
    this.animate();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 20);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.35);
    fillLight.position.set(-15, 10, -15);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff66aa, 0.25);
    rimLight.position.set(0, -10, -20);
    this.scene.add(rimLight);
  }

  private setupGrid(): void {
    const grid = new THREE.GridHelper(100, 50, 0x444466, 0x2a2a44);
    (grid.material as THREE.Material).opacity = 0.3;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -8;
    this.scene.add(grid);
  }

  buildMolecule(data: FoldResponse): void {
    this.clearMolecule();
    this.residues = data.residues;
    this.nResidues = data.n_residues;

    const firstFrame = data.keyframes[0];
    const initialCoords = firstFrame.ca_coords;
    const initialSidechains = firstFrame.sidechain_coords;

    for (let i = 0; i < this.nResidues; i++) {
      const t = i / Math.max(1, this.nResidues - 1);
      const backboneColor = new THREE.Color().lerpColors(
        new THREE.Color(0x2255ff),
        new THREE.Color(0xff3344),
        t
      );

      const caGeo = new THREE.SphereGeometry(this.CA_RADIUS, 24, 24);
      const caMat = new THREE.MeshPhongMaterial({
        color: backboneColor,
        shininess: 80,
        specular: 0x444444,
      });
      const caAtom = new THREE.Mesh(caGeo, caMat);
      caAtom.castShadow = true;
      caAtom.receiveShadow = true;
      caAtom.position.set(initialCoords[i][0], initialCoords[i][1], initialCoords[i][2]);
      this.moleculeGroup.add(caAtom);
      this.caAtoms.push(caAtom);

      const scColor = new THREE.Color(
        this.residues[i].sidechain_color[0],
        this.residues[i].sidechain_color[1],
        this.residues[i].sidechain_color[2]
      );

      if (this.residues[i].name !== 'GLY') {
        const bondDir = new THREE.Vector3(
          initialSidechains[i][0] - initialCoords[i][0],
          initialSidechains[i][1] - initialCoords[i][1],
          initialSidechains[i][2] - initialCoords[i][2]
        );
        const bondLen = bondDir.length();
        const scBondGeo = new THREE.CylinderGeometry(
          this.SIDECHAIN_BOND_RADIUS,
          this.SIDECHAIN_BOND_RADIUS,
          bondLen,
          12
        );
        const scBondMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, shininess: 60 });
        const scBond = new THREE.Mesh(scBondGeo, scBondMat);
        alignCylinder(scBond,
          new THREE.Vector3(...(initialCoords[i] as [number, number, number])),
          new THREE.Vector3(...(initialSidechains[i] as [number, number, number]))
        );
        scBond.castShadow = true;
        this.moleculeGroup.add(scBond);
        this.sidechainBonds.push(scBond);

        const scAtomGeo = new THREE.SphereGeometry(this.SIDECHAIN_ATOM_RADIUS, 20, 20);
        const scAtomMat = new THREE.MeshPhongMaterial({
          color: scColor,
          shininess: 70,
          specular: 0x333333,
        });
        const scAtom = new THREE.Mesh(scAtomGeo, scAtomMat);
        scAtom.castShadow = true;
        scAtom.position.set(initialSidechains[i][0], initialSidechains[i][1], initialSidechains[i][2]);
        this.moleculeGroup.add(scAtom);
        this.sidechainAtoms.push(scAtom);
      } else {
        this.sidechainBonds.push(null as unknown as THREE.Mesh);
        this.sidechainAtoms.push(null as unknown as THREE.Mesh);
      }
    }

    for (let i = 0; i < this.nResidues - 1; i++) {
      const from = new THREE.Vector3(
        initialCoords[i][0], initialCoords[i][1], initialCoords[i][2]
      );
      const to = new THREE.Vector3(
        initialCoords[i + 1][0], initialCoords[i + 1][1], initialCoords[i + 1][2]
      );
      const dist = from.distanceTo(to);
      const bondGeo = new THREE.CylinderGeometry(
        this.BACKBONE_RADIUS, this.BACKBONE_RADIUS, dist, 16
      );
      const midColor = new THREE.Color().lerpColors(
        (this.caAtoms[i].material as THREE.MeshPhongMaterial).color,
        (this.caAtoms[i + 1].material as THREE.MeshPhongMaterial).color,
        0.5
      );
      const bondMat = new THREE.MeshPhongMaterial({
        color: midColor,
        shininess: 90,
        specular: 0x555555,
      });
      const bond = new THREE.Mesh(bondGeo, bondMat);
      alignCylinder(bond, from, to);
      bond.castShadow = true;
      bond.receiveShadow = true;
      this.moleculeGroup.add(bond);
      this.backboneBonds.push(bond);
    }

    this.centerCamera();
  }

  updateFrame(frame: FrameData): void {
    const { caCoords, sidechainCoords } = frame;

    for (let i = 0; i < this.nResidues; i++) {
      this.caAtoms[i].position.set(caCoords[i][0], caCoords[i][1], caCoords[i][2]);

      if (this.sidechainAtoms[i]) {
        this.sidechainAtoms[i].position.set(
          sidechainCoords[i][0], sidechainCoords[i][1], sidechainCoords[i][2]
        );
      }
      if (this.sidechainBonds[i]) {
        alignCylinder(this.sidechainBonds[i],
          new THREE.Vector3(caCoords[i][0], caCoords[i][1], caCoords[i][2]),
          new THREE.Vector3(sidechainCoords[i][0], sidechainCoords[i][1], sidechainCoords[i][2])
        );
      }
    }

    for (let i = 0; i < this.nResidues - 1; i++) {
      alignCylinder(this.backboneBonds[i],
        new THREE.Vector3(caCoords[i][0], caCoords[i][1], caCoords[i][2]),
        new THREE.Vector3(caCoords[i + 1][0], caCoords[i + 1][1], caCoords[i + 1][2])
      );
    }

    this.frameListeners.forEach(cb => cb(frame));
  }

  private centerCamera(): void {
    const box = new THREE.Box3().setFromObject(this.moleculeGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const camDist = (maxDim / 2) / Math.tan(fov / 2) * 1.8;

    const isoDir = new THREE.Vector3(1, 0.7, 1).normalize();
    this.camera.position.copy(center).add(isoDir.multiplyScalar(camDist));
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  resetToInitial(data: FoldResponse): void {
    const firstFrame = data.keyframes[0];
    this.updateFrame({
      caCoords: firstFrame.ca_coords,
      sidechainCoords: firstFrame.sidechain_coords,
      progress: 0,
      phis: firstFrame.phis,
      psis: firstFrame.psis,
    });
  }

  private clearMolecule(): void {
    this.caAtoms.forEach(a => {
      a.geometry.dispose();
      (a.material as THREE.Material).dispose();
    });
    this.backboneBonds.forEach(b => {
      b.geometry.dispose();
      (b.material as THREE.Material).dispose();
    });
    this.sidechainBonds.forEach(b => {
      if (b) {
        b.geometry.dispose();
        (b.material as THREE.Material).dispose();
      }
    });
    this.sidechainAtoms.forEach(a => {
      if (a) {
        a.geometry.dispose();
        (a.material as THREE.Material).dispose();
      }
    });
    this.caAtoms = [];
    this.backboneBonds = [];
    this.sidechainBonds = [];
    this.sidechainAtoms = [];
    while (this.moleculeGroup.children.length > 0) {
      this.moleculeGroup.remove(this.moleculeGroup.children[0]);
    }
  }

  onFrameUpdate(callback: (frame: FrameData) => void): void {
    this.frameListeners.push(callback);
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.controls.dispose();
    this.clearMolecule();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function alignCylinder(
  cylinder: THREE.Mesh,
  from: THREE.Vector3,
  to: THREE.Vector3
): void {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  if (length < 0.0001) return;

  cylinder.position.copy(from).add(to).multiplyScalar(0.5);

  const up = new THREE.Vector3(0, 1, 0);
  const dirNorm = direction.clone().normalize();

  if (Math.abs(up.dot(dirNorm)) > 0.9999) {
    if (up.dot(dirNorm) < 0) {
      cylinder.rotation.x = Math.PI;
    }
    return;
  }

  const axis = new THREE.Vector3().crossVectors(up, dirNorm).normalize();
  const angle = Math.acos(up.dot(dirNorm));

  cylinder.quaternion.setFromAxisAngle(axis, angle);
}
