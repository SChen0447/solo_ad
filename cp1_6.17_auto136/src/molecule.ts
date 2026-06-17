import * as THREE from 'three';
import { Atom, ATOM_DATA, AtomData } from './atom';
import { Bond, BondOrder } from './bond';

export interface GroupPreset {
  name: string;
  formula: string;
  atoms: { symbol: string; x: number; y: number; z: number }[];
  bonds: { a: number; b: number; order: BondOrder }[];
}

export const GROUP_PRESETS: Record<string, GroupPreset> = {
  methyl: {
    name: '甲基',
    formula: '-CH₃',
    atoms: [
      { symbol: 'C', x: 0, y: 0, z: 0 },
      { symbol: 'H', x: 1.0, y: 0.7, z: 0.7 },
      { symbol: 'H', x: -1.0, y: 0.7, z: 0.7 },
      { symbol: 'H', x: 0, y: 0.7, z: -1.0 }
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 }
    ]
  },
  phenyl: {
    name: '苯环',
    formula: '-C₆H₅',
    atoms: [
      { symbol: 'C', x: 0, y: 0, z: 1.4 },
      { symbol: 'C', x: 1.21, y: 0, z: 0.7 },
      { symbol: 'C', x: 1.21, y: 0, z: -0.7 },
      { symbol: 'C', x: 0, y: 0, z: -1.4 },
      { symbol: 'C', x: -1.21, y: 0, z: -0.7 },
      { symbol: 'C', x: -1.21, y: 0, z: 0.7 },
      { symbol: 'H', x: 0, y: 0, z: 2.5 },
      { symbol: 'H', x: 2.17, y: 0, z: 1.25 },
      { symbol: 'H', x: 2.17, y: 0, z: -1.25 },
      { symbol: 'H', x: 0, y: 0, z: -2.5 },
      { symbol: 'H', x: -2.17, y: 0, z: -1.25 }
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 2 },
      { a: 3, b: 4, order: 1 },
      { a: 4, b: 5, order: 2 },
      { a: 5, b: 0, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
      { a: 2, b: 8, order: 1 },
      { a: 3, b: 9, order: 1 },
      { a: 4, b: 10, order: 1 }
    ]
  },
  hydroxyl: {
    name: '羟基',
    formula: '-OH',
    atoms: [
      { symbol: 'O', x: 0, y: 0, z: 0 },
      { symbol: 'H', x: 0, y: 0, z: 1.0 }
    ],
    bonds: [
      { a: 0, b: 1, order: 1 }
    ]
  },
  carboxyl: {
    name: '羧基',
    formula: '-COOH',
    atoms: [
      { symbol: 'C', x: 0, y: 0, z: 0 },
      { symbol: 'O', x: 1.2, y: 0, z: 0 },
      { symbol: 'O', x: -0.6, y: 0, z: 1.0 },
      { symbol: 'H', x: -0.6, y: 0, z: 2.0 }
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 1 },
      { a: 2, b: 3, order: 1 }
    ]
  }
};

export const BOND_LENGTH = 2.0;
export const MAX_ATOMS = 50;
export const MAX_BONDS = 80;

export class MoleculeManager {
  public atoms: Map<string, Atom> = new Map();
  public bonds: Map<string, Bond> = new Map();
  public scene: THREE.Scene;
  public moleculeGroup: THREE.Group;

  public onStructureChange?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);
  }

  public addAtom(symbol: string, position: THREE.Vector3): Atom | null {
    if (this.atoms.size >= MAX_ATOMS) return null;

    const atom = new Atom(symbol, position);
    this.atoms.set(atom.id, atom);
    this.moleculeGroup.add(atom.mesh);
    this.notifyChange();
    return atom;
  }

  public removeAtom(atomId: string): void {
    const atom = this.atoms.get(atomId);
    if (!atom) return;

    const bondIdsToRemove: string[] = [];
    this.bonds.forEach(bond => {
      if (bond.involves(atomId)) {
        bondIdsToRemove.push(bond.id);
        const otherId = bond.getOtherAtomId(atomId);
        const other = this.atoms.get(otherId);
        if (other) other.connectedBonds.delete(bond.id);
      }
    });

    bondIdsToRemove.forEach(id => this.removeBond(id));

    this.moleculeGroup.remove(atom.mesh);
    atom.dispose();
    this.atoms.delete(atomId);
    this.notifyChange();
  }

  public addBond(atom1Id: string, atom2Id: string, order: BondOrder = 1): Bond | null {
    if (atom1Id === atom2Id) return null;
    if (this.bonds.size >= MAX_BONDS) return null;

    const existing = this.findBond(atom1Id, atom2Id);
    if (existing) return null;

    const atom1 = this.atoms.get(atom1Id);
    const atom2 = this.atoms.get(atom2Id);
    if (!atom1 || !atom2) return null;

    if (atom1.getAvailableValence() < order || atom2.getAvailableValence() < order) {
      return null;
    }

    const bond = new Bond(atom1Id, atom2Id, atom1.position, atom2.position, order);
    this.bonds.set(bond.id, bond);
    atom1.connectedBonds.add(bond.id);
    atom2.connectedBonds.add(bond.id);
    this.moleculeGroup.add(bond.mesh);

    this.adjustAtomPositionsForBond(atom1, atom2);
    this.notifyChange();
    return bond;
  }

  public removeBond(bondId: string): void {
    const bond = this.bonds.get(bondId);
    if (!bond) return;

    const a1 = this.atoms.get(bond.atom1Id);
    const a2 = this.atoms.get(bond.atom2Id);
    if (a1) a1.connectedBonds.delete(bondId);
    if (a2) a2.connectedBonds.delete(bondId);

    this.moleculeGroup.remove(bond.mesh);
    bond.dispose();
    this.bonds.delete(bondId);
    this.notifyChange();
  }

  public findBond(atom1Id: string, atom2Id: string): Bond | null {
    for (const bond of this.bonds.values()) {
      if ((bond.atom1Id === atom1Id && bond.atom2Id === atom2Id) ||
          (bond.atom1Id === atom2Id && bond.atom2Id === atom1Id)) {
        return bond;
      }
    }
    return null;
  }

  public cycleBondOrder(atom1Id: string, atom2Id: string): Bond | null {
    const bond = this.findBond(atom1Id, atom2Id);
    if (!bond) return this.addBond(atom1Id, atom2Id, 1);

    if (bond.order < 3) {
      const a1 = this.atoms.get(bond.atom1Id);
      const a2 = this.atoms.get(bond.atom2Id);
      if (!a1 || !a2) return null;

      const needed = 1;
      if (a1.getAvailableValence() >= needed && a2.getAvailableValence() >= needed) {
        bond.increaseOrder();
        this.notifyChange();
        return bond;
      }
    } else {
      this.removeBond(bond.id);
      return null;
    }
    return bond;
  }

  private adjustAtomPositionsForBond(atom1: Atom, atom2: Atom): void {
    const dir = new THREE.Vector3().subVectors(atom2.position, atom1.position);
    const currentLen = dir.length();
    if (currentLen < 0.001) {
      dir.set(1, 0, 0);
    } else {
      dir.normalize();
    }

    const totalRadius = atom1.data.radius + atom2.data.radius;
    const targetLen = Math.max(BOND_LENGTH, totalRadius * 1.2);

    if (Math.abs(currentLen - targetLen) > 0.01) {
      const mid = new THREE.Vector3().addVectors(atom1.position, atom2.position).multiplyScalar(0.5);
      const half = targetLen / 2;
      atom1.updatePosition(mid.clone().add(dir.clone().multiplyScalar(-half)));
      atom2.updatePosition(mid.clone().add(dir.clone().multiplyScalar(half)));
      this.updateBondsForAtoms([atom1.id, atom2.id]);
    }
  }

  public updateBondsForAtoms(atomIds: string[]): void {
    this.bonds.forEach(bond => {
      if (atomIds.some(id => bond.involves(id))) {
        const a1 = this.atoms.get(bond.atom1Id);
        const a2 = this.atoms.get(bond.atom2Id);
        if (a1 && a2) {
          bond.updatePosition(a1.position, a2.position);
        }
      }
    });
  }

  public addGroup(groupKey: string, center: THREE.Vector3): Atom[] | null {
    const preset = GROUP_PRESETS[groupKey];
    if (!preset) return null;

    if (this.atoms.size + preset.atoms.length > MAX_ATOMS) return null;
    if (this.bonds.size + preset.bonds.length > MAX_BONDS) return null;

    const createdAtoms: Atom[] = [];
    const idMap: Map<number, string> = new Map();

    preset.atoms.forEach((a, idx) => {
      const pos = new THREE.Vector3(a.x, a.y, a.z).add(center);
      const atom = this.addAtom(a.symbol, pos);
      if (atom) {
        createdAtoms.push(atom);
        idMap.set(idx, atom.id);
      }
    });

    preset.bonds.forEach(b => {
      const a1Id = idMap.get(b.a);
      const a2Id = idMap.get(b.b);
      if (a1Id && a2Id) {
        this.addBond(a1Id, a2Id, b.order);
      }
    });

    return createdAtoms;
  }

  public clear(): void {
    this.bonds.forEach(bond => {
      this.moleculeGroup.remove(bond.mesh);
      bond.dispose();
    });
    this.bonds.clear();

    this.atoms.forEach(atom => {
      this.moleculeGroup.remove(atom.mesh);
      atom.dispose();
    });
    this.atoms.clear();
    this.notifyChange();
  }

  public getFormula(): string {
    const counts: Record<string, number> = {};
    this.atoms.forEach(atom => {
      const sym = atom.data.symbol;
      counts[sym] = (counts[sym] || 0) + 1;
    });

    const order = ['C', 'H', 'N', 'O', 'P', 'S'];
    const parts: string[] = [];
    order.forEach(sym => {
      if (counts[sym]) {
        parts.push(sym + (counts[sym] > 1 ? counts[sym] : ''));
      }
    });
    Object.keys(counts).forEach(sym => {
      if (!order.includes(sym)) {
        parts.push(sym + (counts[sym] > 1 ? counts[sym] : ''));
      }
    });

    return parts.length > 0 ? parts.join('') : '-';
  }

  public getMolecularMass(): number {
    let mass = 0;
    this.atoms.forEach(atom => {
      mass += atom.data.mass;
    });
    return mass;
  }

  public isStructureComplete(): boolean {
    for (const atom of this.atoms.values()) {
      if (atom.getAvailableValence() > 0) return false;
    }
    return true;
  }

  public updateIncompleteMarkers(): void {
    this.atoms.forEach(atom => {
      atom.setIncomplete(atom.getAvailableValence() > 0);
    });
  }

  public async optimizeStructure(): Promise<void> {
    if (this.atoms.size < 2) return;

    const steps = 60;
    const springK = 0.08;
    const repulsionStrength = 0.5;
    const targetBondLength = BOND_LENGTH;

    const originalPositions: Map<string, THREE.Vector3> = new Map();
    this.atoms.forEach(a => originalPositions.set(a.id, a.position.clone()));

    for (let step = 0; step < steps; step++) {
      const forces: Map<string, THREE.Vector3> = new Map();
      this.atoms.forEach(a => forces.set(a.id, new THREE.Vector3()));

      this.bonds.forEach(bond => {
        const a1 = this.atoms.get(bond.atom1Id);
        const a2 = this.atoms.get(bond.atom2Id);
        if (!a1 || !a2) return;

        const diff = new THREE.Vector3().subVectors(a2.position, a1.position);
        const dist = diff.length();
        if (dist < 0.001) return;

        const displacement = dist - targetBondLength;
        const forceMag = -springK * displacement;
        const force = diff.normalize().multiplyScalar(forceMag);

        forces.get(a1.id)!.sub(force);
        forces.get(a2.id)!.add(force);
      });

      const atomArr = Array.from(this.atoms.values());
      for (let i = 0; i < atomArr.length; i++) {
        for (let j = i + 1; j < atomArr.length; j++) {
          const a1 = atomArr[i];
          const a2 = atomArr[j];
          const diff = new THREE.Vector3().subVectors(a2.position, a1.position);
          const dist = diff.length();
          if (dist < 0.5 || dist > 8) continue;

          const minDist = a1.data.radius + a2.data.radius + 0.5;
          if (dist < minDist * 1.5) {
            const forceMag = repulsionStrength / (dist * dist);
            const force = diff.normalize().multiplyScalar(forceMag);
            forces.get(a1.id)!.sub(force);
            forces.get(a2.id)!.add(force);
          }
        }
      }

      this.atoms.forEach(atom => {
        const force = forces.get(atom.id)!;
        const maxMove = 0.3;
        if (force.length() > maxMove) force.normalize().multiplyScalar(maxMove);
        atom.updatePosition(atom.position.clone().add(force));
      });

      this.updateBondsForAtoms(Array.from(this.atoms.keys()));

      await new Promise(resolve => setTimeout(resolve, 16));
    }

    this.centerMolecule();
    this.notifyChange();
  }

  public centerMolecule(): void {
    if (this.atoms.size === 0) return;

    const center = new THREE.Vector3();
    this.atoms.forEach(a => center.add(a.position));
    center.divideScalar(this.atoms.size);

    this.atoms.forEach(a => {
      a.updatePosition(a.position.clone().sub(center));
    });
    this.updateBondsForAtoms(Array.from(this.atoms.keys()));
  }

  public getCenter(): THREE.Vector3 {
    const center = new THREE.Vector3();
    if (this.atoms.size === 0) return center;
    this.atoms.forEach(a => center.add(a.position));
    center.divideScalar(this.atoms.size);
    return center;
  }

  private notifyChange(): void {
    this.updateIncompleteMarkers();
    if (this.onStructureChange) this.onStructureChange();
  }

  public deselectAll(): void {
    this.atoms.forEach(atom => atom.setSelected(false));
  }

  public getAtomById(id: string): Atom | undefined {
    return this.atoms.get(id);
  }
}
