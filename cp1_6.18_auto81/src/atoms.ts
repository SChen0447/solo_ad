import * as THREE from 'three';

export type AtomType = 'carbon' | 'oxygen' | 'hydrogen' | 'nitrogen';

export interface AtomConfig {
  color: number;
  emissive: number;
  radius: number;
  rotationSpeed: number;
  label: string;
}

export interface Atom {
  id: string;
  type: AtomType;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  baseScale: number;
  targetScale: number;
  rotationSpeed: THREE.Vector3;
  vibrating: boolean;
  vibOffset: number;
}

export const ATOM_CONFIGS: Record<AtomType, AtomConfig> = {
  carbon: {
    color: 0x4a4a4a,
    emissive: 0x1a1a1a,
    radius: 0.8,
    rotationSpeed: 0.3,
    label: '碳 C'
  },
  oxygen: {
    color: 0xff4040,
    emissive: 0x661010,
    radius: 0.7,
    rotationSpeed: 0.4,
    label: '氧 O'
  },
  hydrogen: {
    color: 0xffffff,
    emissive: 0x404040,
    radius: 0.45,
    rotationSpeed: 0.6,
    label: '氢 H'
  },
  nitrogen: {
    color: 0x4070ff,
    emissive: 0x102060,
    radius: 0.75,
    rotationSpeed: 0.35,
    label: '氮 N'
  }
};

type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Record<string, EventCallback[]> = {};

  on(event: string, callback: EventCallback): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(cb => cb(...args));
  }
}

export const eventBus = new EventBus();

export class AtomManager {
  private atoms: Atom[] = [];
  private container: THREE.Object3D;
  private idCounter = 0;
  private glowIntensity = 0.5;

  constructor(container: THREE.Object3D) {
    this.container = container;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('atom:create', (type: AtomType, position: THREE.Vector3) => {
      this.createAtom(type, position);
    });

    eventBus.on('atom:remove', (id: string) => {
      this.removeAtom(id);
    });

    eventBus.on('atom:position', (id: string, position: THREE.Vector3) => {
      this.setAtomPosition(id, position);
    });

    eventBus.on('glow:intensity', (value: number) => {
      this.glowIntensity = value / 100;
      this.updateGlowIntensity();
    });
  }

  createAtom(type: AtomType, position: THREE.Vector3): Atom {
    const config = ATOM_CONFIGS[type];
    const id = `atom_${++this.idCounter}`;

    const geometry = new THREE.SphereGeometry(config.radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: config.color,
      emissive: config.emissive,
      shininess: 100,
      specular: 0x444444
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = { atomId: id, atomType: type };
    mesh.castShadow = true;

    const glowGeometry = new THREE.SphereGeometry(config.radius * 1.4, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: this.glowIntensity * 0.3,
      side: THREE.BackSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(position);

    const atom: Atom = {
      id,
      type,
      position: position.clone(),
      mesh,
      glowMesh,
      baseScale: 1,
      targetScale: 0,
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * config.rotationSpeed,
        config.rotationSpeed,
        (Math.random() - 0.5) * config.rotationSpeed * 0.5
      ),
      vibrating: false,
      vibOffset: Math.random() * Math.PI * 2
    };

    this.atoms.push(atom);
    this.container.add(mesh);
    this.container.add(glowMesh);

    eventBus.emit('atoms:changed', this.atoms.length);

    return atom;
  }

  removeAtom(id: string): void {
    const index = this.atoms.findIndex(a => a.id === id);
    if (index === -1) return;

    const atom = this.atoms[index];
    this.container.remove(atom.mesh);
    this.container.remove(atom.glowMesh);
    atom.mesh.geometry.dispose();
    (atom.mesh.material as THREE.Material).dispose();
    atom.glowMesh.geometry.dispose();
    (atom.glowMesh.material as THREE.Material).dispose();

    this.atoms.splice(index, 1);
    eventBus.emit('atoms:changed', this.atoms.length);
    eventBus.emit('atom:removed', id);
  }

  getAtom(id: string): Atom | undefined {
    return this.atoms.find(a => a.id === id);
  }

  getAtomByMesh(mesh: THREE.Mesh): Atom | undefined {
    return this.atoms.find(a => a.mesh === mesh);
  }

  getAllAtoms(): Atom[] {
    return this.atoms;
  }

  setAtomPosition(id: string, position: THREE.Vector3): void {
    const atom = this.getAtom(id);
    if (!atom) return;
    atom.position.copy(position);
    atom.mesh.position.copy(position);
    atom.glowMesh.position.copy(position);
    eventBus.emit('atom:moved', id, position);
  }

  setAtomScale(id: string, scale: number): void {
    const atom = this.getAtom(id);
    if (!atom) return;
    atom.targetScale = scale;
  }

  popAnimation(id: string): void {
    const atom = this.getAtom(id);
    if (!atom) return;
    atom.targetScale = 1;
    atom.mesh.scale.setScalar(0);
    atom.glowMesh.scale.setScalar(0);
  }

  private updateGlowIntensity(): void {
    this.atoms.forEach(atom => {
      const material = atom.glowMesh.material as THREE.MeshBasicMaterial;
      material.opacity = this.glowIntensity * 0.3;
    });
  }

  update(delta: number, vibrationAmount: number): void {
    const vibScale = vibrationAmount / 100;

    this.atoms.forEach(atom => {
      atom.mesh.rotation.x += atom.rotationSpeed.x * delta;
      atom.mesh.rotation.y += atom.rotationSpeed.y * delta;
      atom.mesh.rotation.z += atom.rotationSpeed.z * delta;

      const currentScale = atom.mesh.scale.x;
      const newScale = currentScale + (atom.targetScale - currentScale) * 8 * delta;
      atom.mesh.scale.setScalar(newScale);
      atom.glowMesh.scale.setScalar(newScale * 1.4);

      if (vibScale > 0) {
        const vibY = Math.sin(Date.now() * 0.003 + atom.vibOffset) * 0.05 * vibScale;
        const vibX = Math.sin(Date.now() * 0.0025 + atom.vibOffset * 1.5) * 0.03 * vibScale;
        atom.mesh.position.y = atom.position.y + vibY;
        atom.mesh.position.x = atom.position.x + vibX;
        atom.glowMesh.position.copy(atom.mesh.position);
      }

      const pulseScale = 1 + Math.sin(Date.now() * 0.002 + atom.vibOffset) * 0.05 * this.glowIntensity;
      atom.glowMesh.scale.setScalar(newScale * 1.4 * pulseScale);
    });
  }

  dispose(): void {
    this.atoms.forEach(atom => {
      this.container.remove(atom.mesh);
      this.container.remove(atom.glowMesh);
      atom.mesh.geometry.dispose();
      (atom.mesh.material as THREE.Material).dispose();
      atom.glowMesh.geometry.dispose();
      (atom.glowMesh.material as THREE.Material).dispose();
    });
    this.atoms = [];
  }
}
