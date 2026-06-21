import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import type { 
  MoleculeData, 
  AtomData, 
  BondData, 
  MoleculeRenderData, 
  AtomRenderData, 
  BondRenderData, 
  BondAngleData 
} from '../types';
import { ELEMENT_COLORS, ELEMENT_RADII } from '../types';

export class MoleculeParser {
  static parseFromAPI(data: MoleculeData): MoleculeRenderData {
    const atomMap = new Map<string, AtomData>();
    data.atoms.forEach(atom => atomMap.set(atom.id, atom));
    
    const atoms: AtomRenderData[] = data.atoms.map(atom => ({
      ...atom,
      color: ELEMENT_COLORS[atom.element],
      radius: ELEMENT_RADII[atom.element],
    }));
    
    const bonds: BondRenderData[] = data.bonds.map(bond => {
      const atom1 = atomMap.get(bond.atom1Id)!;
      const atom2 = atomMap.get(bond.atom2Id)!;
      const length = this.calculateDistance(atom1, atom2);
      
      return {
        ...bond,
        atom1,
        atom2,
        length,
      };
    });
    
    const bondAngles = this.calculateBondAngles(data.atoms, data.bonds);
    
    return {
      atoms,
      bonds,
      bondAngles,
    };
  }

  static parseFromJSON(jsonData: string): MoleculeRenderData {
    const data: MoleculeData = JSON.parse(jsonData);
    return this.parseFromAPI(data);
  }

  private static calculateDistance(atom1: AtomData, atom2: AtomData): number {
    const dx = atom2.x - atom1.x;
    const dy = atom2.y - atom1.y;
    const dz = atom2.z - atom1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  static calculateBondAngles(
    atoms: AtomData[],
    bonds: BondData[]
  ): BondAngleData[] {
    const bondAngles: BondAngleData[] = [];
    const atomBonds = new Map<string, BondData[]>();
    
    atoms.forEach(atom => {
      atomBonds.set(atom.id, []);
    });
    
    bonds.forEach(bond => {
      atomBonds.get(bond.atom1Id)?.push(bond);
      atomBonds.get(bond.atom2Id)?.push(bond);
    });
    
    const atomMap = new Map<string, AtomData>();
    atoms.forEach(atom => atomMap.set(atom.id, atom));
    
    const processedAngles = new Set<string>();
    
    atoms.forEach(centralAtom => {
      const connectedBonds = atomBonds.get(centralAtom.id) || [];
      
      if (connectedBonds.length >= 2) {
        const connectedAtomIds = new Set<string>();
        connectedBonds.forEach(bond => {
          if (bond.atom1Id !== centralAtom.id) {
            connectedAtomIds.add(bond.atom1Id);
          }
          if (bond.atom2Id !== centralAtom.id) {
            connectedAtomIds.add(bond.atom2Id);
          }
        });
        
        const connectedAtoms = Array.from(connectedAtomIds)
          .map(id => atomMap.get(id)!)
          .filter(Boolean);
        
        for (let i = 0; i < connectedAtoms.length; i++) {
          for (let j = i + 1; j < connectedAtoms.length; j++) {
            const atom1 = connectedAtoms[i];
            const atom2 = connectedAtoms[j];
            
            const angleKey = [atom1.id, centralAtom.id, atom2.id].sort().join('-');
            
            if (!processedAngles.has(angleKey)) {
              processedAngles.add(angleKey);
              
              const angle = this.calculateAngle(atom1, centralAtom, atom2);
              
              bondAngles.push({
                id: uuidv4(),
                atom1,
                centralAtom,
                atom2,
                angle,
              });
            }
          }
        }
      }
    });
    
    return bondAngles;
  }

  private static calculateAngle(
    atom1: AtomData,
    centralAtom: AtomData,
    atom2: AtomData
  ): number {
    const v1 = new THREE.Vector3(
      atom1.x - centralAtom.x,
      atom1.y - centralAtom.y,
      atom1.z - centralAtom.z
    );
    
    const v2 = new THREE.Vector3(
      atom2.x - centralAtom.x,
      atom2.y - centralAtom.y,
      atom2.z - centralAtom.z
    );
    
    const dotProduct = v1.dot(v2);
    const magnitude1 = v1.length();
    const magnitude2 = v2.length();
    
    const cosAngle = dotProduct / (magnitude1 * magnitude2);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    
    const angleRad = Math.acos(clampedCos);
    const angleDeg = (angleRad * 180) / Math.PI;
    
    return angleDeg;
  }

  static validateMoleculeData(data: unknown): data is MoleculeData {
    if (typeof data !== 'object' || data === null) return false;
    
    const mol = data as MoleculeData;
    
    if (typeof mol.id !== 'string') return false;
    if (typeof mol.name !== 'string') return false;
    if (typeof mol.formula !== 'string') return false;
    if (!Array.isArray(mol.atoms)) return false;
    if (!Array.isArray(mol.bonds)) return false;
    
    const validElements = ['C', 'H', 'O', 'N'];
    for (const atom of mol.atoms) {
      if (typeof atom.id !== 'string') return false;
      if (!validElements.includes(atom.element)) return false;
      if (typeof atom.x !== 'number') return false;
      if (typeof atom.y !== 'number') return false;
      if (typeof atom.z !== 'number') return false;
      if (typeof atom.index !== 'number') return false;
    }
    
    const atomIds = new Set(mol.atoms.map(a => a.id));
    for (const bond of mol.bonds) {
      if (typeof bond.id !== 'string') return false;
      if (!atomIds.has(bond.atom1Id)) return false;
      if (!atomIds.has(bond.atom2Id)) return false;
      if (typeof bond.order !== 'number') return false;
    }
    
    return true;
  }
}
