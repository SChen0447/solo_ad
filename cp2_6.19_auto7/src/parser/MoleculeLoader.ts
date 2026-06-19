import * as THREE from 'three';
import { MoleculeData, AtomData, BondData, getMolecule } from './SampleData';
import { ModelManager } from '../engine/ModelManager';

export interface ParsedAtom {
  index: number;
  element: string;
  position: THREE.Vector3;
  neighborCount: number;
}

export interface ParsedBond {
  atom1: number;
  atom2: number;
  atom1Pos: THREE.Vector3;
  atom2Pos: THREE.Vector3;
  order: number;
}

export interface ParsedMolecule {
  name: string;
  formula: string;
  atoms: ParsedAtom[];
  bonds: ParsedBond[];
  center: THREE.Vector3;
  group: THREE.Group;
}

export class MoleculeLoader {
  private modelManager: ModelManager;

  constructor() {
    this.modelManager = new ModelManager();
  }

  public loadMolecule(key: string, mode: 'ballstick' | 'wireframe' = 'ballstick'): ParsedMolecule | null {
    const data = getMolecule(key);
    if (!data) return null;
    return this.parseMolecule(data, mode);
  }

  public parseMolecule(data: MoleculeData, mode: 'ballstick' | 'wireframe' = 'ballstick'): ParsedMolecule {
    const atoms: ParsedAtom[] = [];
    const bonds: ParsedBond[] = [];
    const positions: THREE.Vector3[] = [];
    const neighborCounts = new Map<number, number>();

    data.bonds.forEach((bond: BondData) => {
      neighborCounts.set(bond.atom1, (neighborCounts.get(bond.atom1) || 0) + 1);
      neighborCounts.set(bond.atom2, (neighborCounts.get(bond.atom2) || 0) + 1);
    });

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    data.atoms.forEach((atom: AtomData, index: number) => {
      const pos = new THREE.Vector3(atom.x, atom.y, atom.z);
      positions.push(pos);
      atoms.push({
        index,
        element: atom.element,
        position: pos,
        neighborCount: neighborCounts.get(index) || 0
      });
      minX = Math.min(minX, atom.x);
      minY = Math.min(minY, atom.y);
      minZ = Math.min(minZ, atom.z);
      maxX = Math.max(maxX, atom.x);
      maxY = Math.max(maxY, atom.y);
      maxZ = Math.max(maxZ, atom.z);
    });

    data.bonds.forEach((bond: BondData) => {
      bonds.push({
        atom1: bond.atom1,
        atom2: bond.atom2,
        atom1Pos: positions[bond.atom1].clone(),
        atom2Pos: positions[bond.atom2].clone(),
        order: bond.order
      });
    });

    const center = new THREE.Vector3(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2
    );

    const centeredAtoms = atoms.map(a => ({
      ...a,
      position: a.position.clone().sub(center)
    }));

    const centeredBonds = bonds.map(b => ({
      ...b,
      atom1Pos: b.atom1Pos.clone().sub(center),
      atom2Pos: b.atom2Pos.clone().sub(center)
    }));

    const group = this.modelManager.createModel(centeredAtoms, centeredBonds, mode);

    return {
      name: data.name,
      formula: data.formula,
      atoms: centeredAtoms,
      bonds: centeredBonds,
      center: new THREE.Vector3(0, 0, 0),
      group
    };
  }

  public updateMode(parsed: ParsedMolecule, mode: 'ballstick' | 'wireframe'): void {
    this.modelManager.updateMode(parsed.group, mode);
  }

  public getModelManager(): ModelManager {
    return this.modelManager;
  }
}
