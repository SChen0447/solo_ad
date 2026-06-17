import * as THREE from 'three';

export interface AtomData {
  symbol: string;
  name: string;
  color: number;
  radius: number;
  valence: number;
  mass: number;
}

export const ATOM_DATA: Record<string, AtomData> = {
  H: { symbol: 'H', name: '氢', color: 0xffffff, radius: 0.4, valence: 1, mass: 1.008 },
  C: { symbol: 'C', name: '碳', color: 0x808080, radius: 0.7, valence: 4, mass: 12.011 },
  N: { symbol: 'N', name: '氮', color: 0x4363d8, radius: 0.65, valence: 3, mass: 14.007 },
  O: { symbol: 'O', name: '氧', color: 0xe6194b, radius: 0.6, valence: 2, mass: 15.999 },
  P: { symbol: 'P', name: '磷', color: 0xff7f00, radius: 0.8, valence: 5, mass: 30.974 },
  S: { symbol: 'S', name: '硫', color: 0xffe119, radius: 0.75, valence: 6, mass: 32.06 }
};

export class Atom {
  public mesh: THREE.Group;
  public sphere: THREE.Mesh;
  public glowMesh: THREE.Mesh;
  public selectionRing: THREE.Mesh;
  public incompleteRing: THREE.Mesh;
  public data: AtomData;
  public position: THREE.Vector3;
  public connectedBonds: Set<string> = new Set();
  public id: string;
  public isSelected: boolean = false;
  public isHovered: boolean = false;

  private static atomIdCounter: number = 0;

  constructor(symbol: string, position: THREE.Vector3) {
    this.data = ATOM_DATA[symbol];
    if (!this.data) {
      throw new Error(`Unknown atom symbol: ${symbol}`);
    }

    this.id = `atom_${Atom.atomIdCounter++}`;
    this.position = position.clone();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    this.sphere = this.createSphere();
    this.glowMesh = this.createGlowMesh();
    this.selectionRing = this.createSelectionRing();
    this.incompleteRing = this.createIncompleteRing();

    this.mesh.add(this.sphere);
    this.mesh.add(this.glowMesh);
    this.mesh.add(this.selectionRing);
    this.mesh.add(this.incompleteRing);

    this.glowMesh.visible = false;
    this.selectionRing.visible = false;
    this.incompleteRing.visible = false;

    this.mesh.userData.atom = this;
  }

  private createSphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.data.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: this.data.color,
      roughness: 0.7,
      metalness: 0.1,
      emissive: new THREE.Color(this.data.color).multiplyScalar(0.05)
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    return sphere;
  }

  private createGlowMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.data.radius * 1.15, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: this.data.color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(geometry, material);
    return glow;
  }

  private createSelectionRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(this.data.radius * 1.3, this.data.radius * 1.45, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x3fb950,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    return ring;
  }

  private createIncompleteRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(this.data.radius * 1.2, this.data.radius * 1.35, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xf85149,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    return ring;
  }

  public setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.selectionRing.visible = selected;
  }

  public setHovered(hovered: boolean): void {
    this.isHovered = hovered;
    this.glowMesh.visible = hovered;
  }

  public setIncomplete(incomplete: boolean): void {
    this.incompleteRing.visible = incomplete;
  }

  public getCurrentValence(): number {
    return this.connectedBonds.size;
  }

  public getAvailableValence(): number {
    return this.data.valence - this.getCurrentValence();
  }

  public updatePosition(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.mesh.position.copy(pos);
  }

  public dispose(): void {
    this.sphere.geometry.dispose();
    (this.sphere.material as THREE.Material).dispose();
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
    this.selectionRing.geometry.dispose();
    (this.selectionRing.material as THREE.Material).dispose();
    this.incompleteRing.geometry.dispose();
    (this.incompleteRing.material as THREE.Material).dispose();
  }
}
