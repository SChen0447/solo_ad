import axios from 'axios';
import type { Molecule, Atom, Residue } from '@/types';
import { MOLECULES, MOLECULE_THUMBNAILS } from '@/data/molecules';

export class MoleculeDataService {
  private static cache: Map<string, Molecule> = new Map();
  private static loadingPromises: Map<string, Promise<Molecule>> = new Map();

  static async getMoleculeById(id: string): Promise<Molecule> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id)!;
    }

    const loadPromise = new Promise<Molecule>((resolve) => {
      setTimeout(() => {
        const molecule = MOLECULES.find(m => m.id === id);
        if (molecule) {
          this.cache.set(id, molecule);
          resolve(molecule);
        } else {
          throw new Error(`Molecule with id ${id} not found`);
        }
      }, 100);
    });

    this.loadingPromises.set(id, loadPromise);
    return loadPromise;
  }

  static async getAllMolecules(): Promise<Molecule[]> {
    return Promise.all(MOLECULES.map(m => this.getMoleculeById(m.id)));
  }

  static getMoleculeThumbnail(id: string): string {
    return MOLECULE_THUMBNAILS[id] || '';
  }

  static getMoleculeList(): Array<{ id: string; name: string; pdbId: string }> {
    return MOLECULES.map(m => ({
      id: m.id,
      name: m.name,
      pdbId: m.pdbId,
    }));
  }

  static async getAtomById(moleculeId: string, atomId: number): Promise<Atom | undefined> {
    const molecule = await this.getMoleculeById(moleculeId);
    return molecule.atoms.find(a => a.id === atomId);
  }

  static async getResidueById(moleculeId: string, residueId: number): Promise<Residue | undefined> {
    const molecule = await this.getMoleculeById(moleculeId);
    return molecule.residues.find(r => r.id === residueId);
  }

  static async getAtomsByResidue(moleculeId: string, residueId: number): Promise<Atom[]> {
    const molecule = await this.getMoleculeById(moleculeId);
    const residue = molecule.residues.find(r => r.id === residueId);
    if (!residue) return [];
    return molecule.atoms.filter(a => residue.atomIds.includes(a.id));
  }

  static async getAtomsByChain(moleculeId: string, chainId: string): Promise<Atom[]> {
    const molecule = await this.getMoleculeById(moleculeId);
    return molecule.atoms.filter(a => a.chainId === chainId);
  }

  static async fetchRemoteMolecule(pdbId: string): Promise<Molecule | null> {
    try {
      const response = await axios.get(`https://files.rcsb.org/download/${pdbId}.pdb`, {
        timeout: 10000,
      });
      if (response.status === 200) {
        return this.parsePDBData(response.data, pdbId);
      }
      return null;
    } catch {
      console.warn(`Failed to fetch PDB ${pdbId} from remote, using local data`);
      return null;
    }
  }

  private static parsePDBData(pdbContent: string, pdbId: string): Molecule {
    const atoms: Atom[] = [];
    const bonds: Array<{ atom1Id: number; atom2Id: number; type: 'single' | 'double' | 'triple' | 'aromatic' }> = [];
    const residues: Map<string, Residue> = new Map();
    const chains: Map<string, number[]> = new Map();

    let atomId = 0;
    let residueId = 0;

    const lines = pdbContent.split('\n');
    for (const line of lines) {
      const recordType = line.substring(0, 6).trim();

      if (recordType === 'ATOM' || recordType === 'HETATM') {
        const x = parseFloat(line.substring(30, 38));
        const y = parseFloat(line.substring(38, 46));
        const z = parseFloat(line.substring(46, 54));
        const element = line.substring(76, 78).trim() || 'C';
        const atomName = line.substring(12, 16).trim();
        const residueName = line.substring(17, 20).trim();
        const chainId = line.substring(21, 22).trim() || 'A';
        const residueSeq = parseInt(line.substring(22, 26).trim()) || 0;

        const residueKey = `${chainId}_${residueSeq}`;
        if (!residues.has(residueKey)) {
          residues.set(residueKey, {
            id: residueId,
            name: residueName,
            sequenceNumber: residueSeq,
            chainId,
            atomIds: [],
            secondaryStructure: 'coil',
            hydrophobicity: 0.5,
            cartoonPosition: [0, 0, 0],
          });
          residueId++;
        }

        const residue = residues.get(residueKey)!;
        residue.atomIds.push(atomId);
        residue.cartoonPosition = [
          (residue.cartoonPosition![0] * (residue.atomIds.length - 1) + x) / residue.atomIds.length,
          (residue.cartoonPosition![1] * (residue.atomIds.length - 1) + y) / residue.atomIds.length,
          (residue.cartoonPosition![2] * (residue.atomIds.length - 1) + z) / residue.atomIds.length,
        ];

        if (!chains.has(chainId)) {
          chains.set(chainId, []);
        }
        if (!chains.get(chainId)!.includes(residue.id)) {
          chains.get(chainId)!.push(residue.id);
        }

        const elementProps = this.getElementProperties(element);
        atoms.push({
          id: atomId,
          element,
          atomicNumber: elementProps.atomicNumber,
          name: atomName,
          x,
          y,
          z,
          radius: elementProps.radius,
          mass: elementProps.mass,
          residueId: residue.id,
          chainId,
        });

        atomId++;
      }

      if (recordType === 'CONECT') {
        const atom1 = parseInt(line.substring(6, 11).trim()) - 1;
        const atom2 = parseInt(line.substring(11, 16).trim()) - 1;
        if (atom1 >= 0 && atom2 >= 0 && atom1 < atoms.length && atom2 < atoms.length) {
          bonds.push({ atom1Id: atom1, atom2Id: atom2, type: 'single' });
        }
      }

      if (recordType === 'HELIX') {
        const chainId = line.substring(19, 20).trim();
        const startSeq = parseInt(line.substring(21, 25).trim());
        const endSeq = parseInt(line.substring(33, 37).trim());
        for (let s = startSeq; s <= endSeq; s++) {
          const key = `${chainId}_${s}`;
          if (residues.has(key)) {
            residues.get(key)!.secondaryStructure = 'helix';
          }
        }
      }

      if (recordType === 'SHEET') {
        const chainId = line.substring(21, 22).trim();
        const startSeq = parseInt(line.substring(22, 26).trim());
        const endSeq = parseInt(line.substring(33, 37).trim());
        for (let s = startSeq; s <= endSeq; s++) {
          const key = `${chainId}_${s}`;
          if (residues.has(key)) {
            residues.get(key)!.secondaryStructure = 'sheet';
          }
        }
      }
    }

    let sumX = 0, sumY = 0, sumZ = 0;
    atoms.forEach(a => {
      sumX += a.x;
      sumY += a.y;
      sumZ += a.z;
    });
    const center: [number, number, number] = [
      sumX / atoms.length,
      sumY / atoms.length,
      sumZ / atoms.length,
    ];

    return {
      id: pdbId.toLowerCase(),
      name: `PDB: ${pdbId}`,
      pdbId,
      atoms,
      bonds: bonds.map((b, i) => ({ ...b, id: i, length: 0 })),
      chains: Array.from(chains.entries()).map(([id, residueIds]) => ({
        id,
        name: `Chain ${id}`,
        residueIds,
      })),
      residues: Array.from(residues.values()),
      center,
      atomCount: atoms.length,
      residueCount: residues.size,
    };
  }

  private static getElementProperties(element: string): { atomicNumber: number; mass: number; radius: number } {
    const props: Record<string, { atomicNumber: number; mass: number; radius: number }> = {
      H: { atomicNumber: 1, mass: 1.008, radius: 0.31 },
      C: { atomicNumber: 6, mass: 12.011, radius: 0.7 },
      N: { atomicNumber: 7, mass: 14.007, radius: 0.65 },
      O: { atomicNumber: 8, mass: 15.999, radius: 0.66 },
      S: { atomicNumber: 16, mass: 32.06, radius: 1.0 },
      P: { atomicNumber: 15, mass: 30.974, radius: 1.0 },
    };
    return props[element] || props.C;
  }

  static clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}
