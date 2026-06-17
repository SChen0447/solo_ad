import * as THREE from 'three';
import {
  MoleculeData,
  Atom,
  Bond,
  DataService,
  ELEMENT_COLORS,
  ELEMENT_RADII,
  BOND_COLORS
} from '../service/DataService.js';

export interface AtomMeshInfo {
  index: number;
  atom: Atom;
  mesh: THREE.Mesh;
  haloMesh?: THREE.Mesh;
}

export type TransitionCallback = () => void;

export class MolecularModel {
  public group: THREE.Group;
  public atomMeshes: AtomMeshInfo[] = [];
  public bondMeshes: THREE.Mesh[] = [];
  public haloMeshes: THREE.Mesh[] = [];
  private particleGroup: THREE.Group;
  private particleSystems: THREE.Points[] = [];
  private dataService: DataService;
  private currentData: MoleculeData | null = null;
  private isAnimating: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 0.8;
  private transitionStartTime: number = 0;
  private fadeOutTarget: MoleculeData | null = null;
  private fadeInTarget: MoleculeData | null = null;
  private onTransitionComplete: TransitionCallback | null = null;
  private spinAngle: number = 0;
  private particleCount: number = 50;

  constructor(dataService: DataService) {
    this.dataService = dataService;
    this.group = new THREE.Group();
    this.group.name = 'MolecularModel';
    this.particleGroup = new THREE.Group();
    this.particleGroup.name = 'Particles';
    this.group.add(this.particleGroup);
  }

  public getAtomInfos(): AtomMeshInfo[] {
    return this.atomMeshes;
  }

  public getCurrentData(): MoleculeData | null {
    return this.currentData;
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public loadMolecule(data: MoleculeData, onComplete?: TransitionCallback): void {
    if (this.isAnimating && this.fadeInTarget) {
      this.clearAll();
      this.isAnimating = false;
    }
    this.onTransitionComplete = onComplete || null;

    if (this.currentData && this.atomMeshes.length > 0) {
      this.fadeOutTarget = this.currentData;
      this.fadeInTarget = data;
      this.startTransition();
    } else {
      this.currentData = data;
      this.buildModel(data);
      this.playIntroAnimation();
      if (this.onTransitionComplete) {
        this.onTransitionComplete();
      }
    }
  }

  private startTransition(): void {
    this.isAnimating = true;
    this.transitionProgress = 0;
    this.transitionStartTime = performance.now();
    this.spawnTransitionParticles();
  }

  private spawnTransitionParticles(): void {
    const colors: number[] = [];
    if (this.fadeOutTarget) {
      const uniqueElements = new Set(this.fadeOutTarget.atoms.map(a => a.element));
      uniqueElements.forEach(el => colors.push(this.dataService.getElementColor(el)));
    }
    if (this.fadeInTarget) {
      const uniqueElements = new Set(this.fadeInTarget.atoms.map(a => a.element));
      uniqueElements.forEach(el => colors.push(this.dataService.getElementColor(el)));
    }

    let avgColor = 0x8888ff;
    if (colors.length > 0) {
      let r = 0, g = 0, b = 0;
      colors.forEach(c => {
        r += (c >> 16) & 255;
        g += (c >> 8) & 255;
        b += c & 255;
      });
      r = Math.floor(r / colors.length);
      g = Math.floor(g / colors.length);
      b = Math.floor(b / colors.length);
      avgColor = (r << 16) | (g << 8) | b;
    }

    const positions = new Float32Array(this.particleCount * 3);
    const velocities: THREE.Vector3[] = [];
    const origin = new THREE.Vector3();

    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = Math.random() * 2;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const speed = 0.5 + Math.random() * 1;
      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      velocities.push(vel);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    (geometry as any)._velocities = velocities;
    (geometry as any)._origin = origin;
    (geometry as any)._birthTime = performance.now();
    (geometry as any)._lifetime = 600;

    const material = new THREE.PointsMaterial({
      color: avgColor,
      size: 0.08,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    this.particleGroup.add(points);
    this.particleSystems.push(points);

    setTimeout(() => {
      if (this.particleGroup.children.includes(points)) {
        this.particleGroup.remove(points);
        geometry.dispose();
        material.dispose();
        const idx = this.particleSystems.indexOf(points);
        if (idx >= 0) this.particleSystems.splice(idx, 1);
      }
    }, 800);
  }

  public update(delta: number): void {
    if (this.isAnimating) {
      this.updateTransition();
    }
    this.updateParticles();
  }

  private updateParticles(): void {
    const now = performance.now();
    for (let i = this.particleSystems.length - 1; i >= 0; i--) {
      const points = this.particleSystems[i];
      const geo = points.geometry as any;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const velocities: THREE.Vector3[] = geo._velocities;
      const birthTime: number = geo._birthTime;
      const lifetime: number = geo._lifetime;
      const elapsed = now - birthTime;
      const t = elapsed / lifetime;

      for (let j = 0; j < this.particleCount; j++) {
        positions[j * 3] += velocities[j].x * delta;
        positions[j * 3 + 1] += velocities[j].y * delta;
        positions[j * 3 + 2] += velocities[j].z * delta;
      }
      posAttr.needsUpdate = true;

      const mat = points.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 1 - t);
    }
  }

  private updateTransition(): void {
    const now = performance.now();
    const elapsed = now - this.transitionStartTime;
    const total = this.transitionDuration * 1000;
    const halfTime = total * 0.5;

    if (elapsed < halfTime) {
      const t = elapsed / halfTime;
      const ease = this.easeInOutQuad(t);
      this.setModelOpacity(1 - ease);
      this.group.scale.setScalar(1 - ease * 0.3);
      this.transitionProgress = ease * 0.5;
    } else if (this.fadeInTarget && this.fadeOutTarget) {
      if (!this.atomMeshes.some(a => {
        const atom = this.fadeInTarget!.atoms[0];
        return Math.abs(a.mesh.position.x - atom.x) < 0.001 &&
               Math.abs(a.mesh.position.y - atom.y) < 0.001;
      })) {
        this.clearModelOnly();
        this.currentData = this.fadeInTarget;
        this.buildModel(this.fadeInTarget);
        this.setModelOpacity(0);
      }

      const t = (elapsed - halfTime) / halfTime;
      const ease = this.easeInOutQuad(t);
      this.setModelOpacity(ease);
      this.group.scale.setScalar(0.7 + ease * 0.3);
      this.group.rotation.y = (1 - ease) * Math.PI * 0.5;
      this.transitionProgress = 0.5 + ease * 0.5;

      if (t >= 1) {
        this.finishTransition();
      }
    } else {
      this.finishTransition();
    }
  }

  private finishTransition(): void {
    this.isAnimating = false;
    this.setModelOpacity(1);
    this.group.scale.setScalar(1);
    this.group.rotation.y = 0;
    this.transitionProgress = 1;
    this.fadeOutTarget = null;
    this.fadeInTarget = null;
    if (this.onTransitionComplete) {
      const cb = this.onTransitionComplete;
      this.onTransitionComplete = null;
      cb();
    }
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private setModelOpacity(opacity: number): void {
    this.atomMeshes.forEach(info => {
      const mat = info.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
    });
    this.bondMeshes.forEach(mesh => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = opacity * 0.7;
      mat.transparent = true;
    });
  }

  private buildModel(data: MoleculeData): void {
    data.atoms.forEach((atom, index) => {
      const atomMesh = this.createAtomMesh(atom, index);
      this.atomMeshes.push({ index, atom, mesh: atomMesh });
      this.group.add(atomMesh);
    });

    data.bonds.forEach((bond, index) => {
      const bondMesh = this.createBondMesh(
        data.atoms[bond.from],
        data.atoms[bond.to],
        bond.type
      );
      this.bondMeshes.push(bondMesh);
      this.group.add(bondMesh);
    });

    this.centerModel();
  }

  private createAtomMesh(atom: Atom, index: number): THREE.Mesh {
    const radius = this.dataService.getElementRadius(atom.element);
    const color = this.dataService.getElementColor(atom.element);

    const geometry = new THREE.SphereGeometry(radius, 32, 24);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.4,
      transparent: false,
      opacity: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(atom.x, atom.y, atom.z);
    mesh.userData = { type: 'atom', atomIndex: index, element: atom.element };
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  public createHaloForAtom(atomInfo: AtomMeshInfo): THREE.Mesh | null {
    if (atomInfo.haloMesh) return atomInfo.haloMesh;

    const radius = this.dataService.getElementRadius(atomInfo.atom.element) * 1.2;
    const color = this.dataService.getElementColor(atomInfo.atom.element);

    const haloGeo = new THREE.SphereGeometry(radius, 24, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(atomInfo.mesh.position);
    halo.userData = { type: 'halo', atomIndex: atomInfo.index };
    this.group.add(halo);
    atomInfo.haloMesh = halo;
    this.haloMeshes.push(halo);

    this.animateHaloIn(halo);
    return halo;
  }

  private animateHaloIn(halo: THREE.Mesh): void {
    const mat = halo.material as THREE.MeshBasicMaterial;
    const start = performance.now();
    const duration = 300;
    const animate = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      mat.opacity = 0.3 * t;
      halo.scale.setScalar(0.8 + t * 0.2);
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  public removeHalo(atomInfo: AtomMeshInfo): void {
    if (!atomInfo.haloMesh) return;
    const halo = atomInfo.haloMesh;
    const mat = halo.material as THREE.MeshBasicMaterial;
    const start = performance.now();
    const duration = 300;
    const startOpacity = mat.opacity;
    const animate = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      mat.opacity = startOpacity * (1 - t);
      if (t >= 1) {
        this.group.remove(halo);
        halo.geometry.dispose();
        mat.dispose();
        const idx = this.haloMeshes.indexOf(halo);
        if (idx >= 0) this.haloMeshes.splice(idx, 1);
        atomInfo.haloMesh = undefined;
      } else {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  public removeAllHalos(): void {
    [...this.atomMeshes].forEach(info => {
      if (info.haloMesh) this.removeHalo(info);
    });
  }

  private createBondMesh(from: Atom, to: Atom, bondType: number): THREE.Mesh {
    const start = new THREE.Vector3(from.x, from.y, from.z);
    const end = new THREE.Vector3(to.x, to.y, to.z);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    const fromRadius = this.dataService.getElementRadius(from.element);
    const toRadius = this.dataService.getElementRadius(to.element);
    const startOffset = fromRadius * 0.5;
    const endOffset = toRadius * 0.5;
    const adjustedLength = Math.max(0.01, length - startOffset - endOffset);

    const cylinderRadius = 0.08 + (bondType - 1) * 0.03;
    const geometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, adjustedLength, 12);

    const color = BOND_COLORS[bondType] || 0x888888;
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.2,
      roughness: 0.6,
      transparent: true,
      opacity: 0.7
    });

    const mesh = new THREE.Mesh(geometry, material);

    const directionNorm = direction.clone().normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), directionNorm);
    mesh.quaternion.copy(quaternion);

    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mesh.position.copy(midPoint);
    mesh.userData = { type: 'bond', bondType };
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private centerModel(): void {
    const box = new THREE.Box3();
    this.atomMeshes.forEach(info => box.expandByPoint(info.mesh.position));
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.atomMeshes.forEach(info => info.mesh.position.sub(center));
    this.bondMeshes.forEach(mesh => mesh.position.sub(center));
  }

  private playIntroAnimation(): void {
    this.setModelOpacity(0);
    this.group.scale.setScalar(0.1);

    const start = performance.now();
    const duration = 800;
    const animate = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = this.easeOutBack(t);

      this.group.scale.setScalar(0.1 + ease * 0.9);
      this.setModelOpacity(ease);
      this.group.rotation.y = (1 - ease) * Math.PI * 0.3;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.group.rotation.y = 0;
      }
    };
    animate();
  }

  private easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  private clearModelOnly(): void {
    this.atomMeshes.forEach(info => {
      this.group.remove(info.mesh);
      info.mesh.geometry.dispose();
      (info.mesh.material as THREE.Material).dispose();
    });
    this.atomMeshes = [];

    this.bondMeshes.forEach(mesh => {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.bondMeshes = [];

    this.haloMeshes.forEach(halo => {
      this.group.remove(halo);
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
    });
    this.haloMeshes = [];
  }

  private clearAll(): void {
    this.clearModelOnly();

    this.particleSystems.forEach(points => {
      this.particleGroup.remove(points);
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    });
    this.particleSystems = [];

    this.currentData = null;
  }

  public dispose(): void {
    this.clearAll();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }

  public getAtomByMesh(mesh: THREE.Mesh): AtomMeshInfo | null {
    return this.atomMeshes.find(info => info.mesh === mesh) || null;
  }

  public getAtomWorldPosition(index: number): THREE.Vector3 | null {
    const info = this.atomMeshes[index];
    if (!info) return null;
    const pos = new THREE.Vector3();
    info.mesh.getWorldPosition(pos);
    return pos;
  }

  public getAtomLocalPosition(index: number): THREE.Vector3 | null {
    const info = this.atomMeshes[index];
    if (!info) return null;
    return info.mesh.position.clone();
  }
}
