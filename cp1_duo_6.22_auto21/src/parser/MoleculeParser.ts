export interface AtomData {
  id: number;
  element: string;
  x: number;
  y: number;
  z: number;
  name?: string;
}

export interface BondData {
  atom1: number;
  atom2: number;
  bondType?: number;
}

export interface MoleculeData {
  atoms: AtomData[];
  bonds: BondData[];
}

const COVALENT_RADII: Record<string, number> = {
  'H': 0.31, 'He': 0.28, 'Li': 1.28, 'Be': 0.96, 'B': 0.84, 'C': 0.76,
  'N': 0.71, 'O': 0.66, 'F': 0.57, 'Ne': 0.58, 'Na': 1.66, 'Mg': 1.41,
  'Al': 1.21, 'Si': 1.11, 'P': 1.07, 'S': 1.05, 'Cl': 1.02, 'Ar': 1.06,
  'K': 2.03, 'Ca': 1.76, 'Fe': 1.32, 'Cu': 1.32, 'Zn': 1.22, 'Br': 1.20,
  'I': 1.39
};

const MAX_VALENCE: Record<string, number> = {
  'H': 1, 'He': 0, 'Li': 1, 'Be': 2, 'B': 3, 'C': 4,
  'N': 3, 'O': 2, 'F': 1, 'Ne': 0, 'Na': 1, 'Mg': 2,
  'Al': 3, 'Si': 4, 'P': 5, 'S': 6, 'Cl': 1, 'Ar': 0,
  'K': 1, 'Ca': 2, 'Fe': 6, 'Cu': 2, 'Zn': 2, 'Br': 1, 'I': 1
};

const BOND_DISTANCE_TOLERANCE: Record<string, number> = {
  'H': 0.35, 'C': 0.20, 'N': 0.20, 'O': 0.20, 'F': 0.15,
  'S': 0.25, 'P': 0.25, 'Cl': 0.20, 'Br': 0.20, 'I': 0.25,
  'Si': 0.25, 'B': 0.25
};

interface BondCandidate {
  atom1Index: number;
  atom2Index: number;
  distance: number;
  expectedSingleBond: number;
}

export class MoleculeParser {
  public static parse(content: string, filename: string): MoleculeData {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'mol2') {
      return this.parseMol2(content);
    } else if (ext === 'xyz') {
      return this.parseXYZ(content);
    }
    throw new Error(`不支持的文件格式: ${ext}`);
  }

  private static parseMol2(content: string): MoleculeData {
    const lines = content.split(/\r?\n/);
    const atoms: AtomData[] = [];
    const bonds: BondData[] = [];

    let mode: 'none' | 'atoms' | 'bonds' = 'none';
    let atomCount = 0;
    let bondCount = 0;
    let atomsParsed = 0;
    let bondsParsed = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('@<TRIPOS>MOLECULE')) {
        mode = 'none';
        continue;
      }
      if (trimmed.startsWith('@<TRIPOS>ATOM')) {
        mode = 'atoms';
        continue;
      }
      if (trimmed.startsWith('@<TRIPOS>BOND')) {
        mode = 'bonds';
        continue;
      }
      if (trimmed.startsWith('@<TRIPOS>')) {
        mode = 'none';
        continue;
      }

      if (mode === 'none' && atomCount === 0 && /^\d+\s+\d+/.test(trimmed)) {
        const counts = trimmed.split(/\s+/);
        atomCount = parseInt(counts[0], 10);
        bondCount = parseInt(counts[1], 10);
        continue;
      }

      if (mode === 'atoms' && trimmed.length > 0 && atomsParsed < atomCount) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 6) {
          const element = this.extractElement(parts[1]);
          atoms.push({
            id: parseInt(parts[0], 10),
            element: element,
            x: parseFloat(parts[2]),
            y: parseFloat(parts[3]),
            z: parseFloat(parts[4]),
            name: parts[1]
          });
          atomsParsed++;
        }
      }

      if (mode === 'bonds' && trimmed.length > 0 && bondsParsed < bondCount) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4) {
          const bondType = this.parseMol2BondType(parts[3]);
          bonds.push({
            atom1: parseInt(parts[1], 10),
            atom2: parseInt(parts[2], 10),
            bondType: bondType
          });
          bondsParsed++;
        }
      }
    }

    if (bonds.length === 0 && atoms.length > 1) {
      return {
        atoms,
        bonds: this.inferBondsFromTopology(atoms)
      };
    }

    return { atoms, bonds };
  }

  private static parseMol2BondType(typeStr: string): number {
    if (typeStr === 'ar') return 4;
    if (typeStr === 'am') return 1;
    const num = parseInt(typeStr, 10);
    return isNaN(num) ? 1 : num;
  }

  private static parseXYZ(content: string): MoleculeData {
    const lines = content.split(/\r?\n/);
    const atoms: AtomData[] = [];

    let atomCount = 0;
    let dataStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.length === 0) continue;
      if (/^\d+$/.test(trimmed)) {
        atomCount = parseInt(trimmed, 10);
        dataStart = i + 2;
        break;
      }
    }

    for (let i = dataStart; i < Math.min(dataStart + atomCount, lines.length); i++) {
      const trimmed = lines[i].trim();
      if (trimmed.length === 0) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const element = this.extractElement(parts[0]);
        atoms.push({
          id: atoms.length + 1,
          element: element,
          x: parseFloat(parts[1]),
          y: parseFloat(parts[2]),
          z: parseFloat(parts[3]),
          name: `${element}${atoms.length + 1}`
        });
      }
    }

    return {
      atoms,
      bonds: this.inferBondsFromTopology(atoms)
    };
  }

  private static extractElement(name: string): string {
    const match = name.match(/^([A-Za-z]+)/);
    return match ? match[1].toUpperCase().charAt(0) + match[1].slice(1).toLowerCase() : 'C';
  }

  private static getDistance(a1: AtomData, a2: AtomData): number {
    const dx = a1.x - a2.x;
    const dy = a1.y - a2.y;
    const dz = a1.z - a2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private static inferBondsFromTopology(atoms: AtomData[]): BondData[] {
    const candidates: BondCandidate[] = [];

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const dist = this.getDistance(atoms[i], atoms[j]);
        const r1 = COVALENT_RADII[atoms[i].element] ?? 1.0;
        const r2 = COVALENT_RADII[atoms[j].element] ?? 1.0;
        const expectedSingleBond = r1 + r2;

        const tol1 = BOND_DISTANCE_TOLERANCE[atoms[i].element] ?? 0.20;
        const tol2 = BOND_DISTANCE_TOLERANCE[atoms[j].element] ?? 0.20;
        const tolerance = (tol1 + tol2) / 2;

        const maxBondDist = expectedSingleBond + tolerance;

        if (dist <= maxBondDist) {
          candidates.push({
            atom1Index: i,
            atom2Index: j,
            distance: dist,
            expectedSingleBond: expectedSingleBond
          });
        }
      }
    }

    candidates.sort((a, b) => {
      const ratioA = a.distance / a.expectedSingleBond;
      const ratioB = b.distance / b.expectedSingleBond;
      return ratioA - ratioB;
    });

    const currentValence: number[] = new Array(atoms.length).fill(0);
    const maxValence = atoms.map(a => MAX_VALENCE[a.element] ?? 4);

    const adjacency = new Map<number, Set<number>>();
    for (let i = 0; i < atoms.length; i++) {
      adjacency.set(i, new Set());
    }

    const acceptedBonds: BondCandidate[] = [];

    for (const candidate of candidates) {
      const { atom1Index: idx1, atom2Index: idx2 } = candidate;

      if (currentValence[idx1] >= maxValence[idx1] &&
          currentValence[idx2] >= maxValence[idx2]) {
        continue;
      }

      if (currentValence[idx1] >= maxValence[idx1] && !this.hasRingPath(adjacency, idx1, idx2, atoms.length)) {
        continue;
      }
      if (currentValence[idx2] >= maxValence[idx2] && !this.hasRingPath(adjacency, idx2, idx1, atoms.length)) {
        continue;
      }

      const remainingValence1 = maxValence[idx1] - currentValence[idx1];
      const remainingValence2 = maxValence[idx2] - currentValence[idx2];

      if (remainingValence1 <= 0 && remainingValence2 <= 0) {
        if (!this.hasRingPath(adjacency, idx1, idx2, atoms.length)) {
          continue;
        }
      }

      adjacency.get(idx1)!.add(idx2);
      adjacency.get(idx2)!.add(idx1);
      currentValence[idx1] += 1;
      currentValence[idx2] += 1;
      acceptedBonds.push(candidate);
    }

    const bonds: BondData[] = [];
    for (const bond of acceptedBonds) {
      const bondType = this.inferBondOrder(
        atoms[bond.atom1Index],
        atoms[bond.atom2Index],
        bond.distance,
        bond.expectedSingleBond,
        currentValence,
        bond.atom1Index,
        bond.atom2Index,
        maxValence
      );

      bonds.push({
        atom1: atoms[bond.atom1Index].id,
        atom2: atoms[bond.atom2Index].id,
        bondType: bondType
      });

      if (bondType > 1) {
        currentValence[bond.atom1Index] += bondType - 1;
        currentValence[bond.atom2Index] += bondType - 1;
      }
    }

    return bonds;
  }

  private static inferBondOrder(
    atom1: AtomData,
    atom2: AtomData,
    distance: number,
    expectedSingleBond: number,
    currentValence: number[],
    idx1: number,
    idx2: number,
    maxValence: number[]
  ): number {
    const ratio = distance / expectedSingleBond;

    if (ratio < 0.72) return 3;
    if (ratio < 0.84) return 2;
    if (ratio > 1.05) return 1;

    const isMultiBondCapable1 = ['C', 'N', 'O', 'S', 'P'].includes(atom1.element);
    const isMultiBondCapable2 = ['C', 'N', 'O', 'S', 'P'].includes(atom2.element);

    if (!isMultiBondCapable1 || !isMultiBondCapable2) return 1;

    if (ratio < 0.92) {
      const remaining1 = maxValence[idx1] - currentValence[idx1];
      const remaining2 = maxValence[idx2] - currentValence[idx2];

      if (remaining1 >= 2 && remaining2 >= 2) return 2;
    }

    return 1;
  }

  private static hasRingPath(
    adjacency: Map<number, Set<number>>,
    start: number,
    target: number,
    atomCount: number
  ): boolean {
    const visited = new Uint8Array(atomCount);
    const queue: number[] = [start];
    visited[start] = 1;
    let depth = 0;
    const maxDepth = 8;

    while (queue.length > 0 && depth < maxDepth) {
      const size = queue.length;
      depth++;

      for (let i = 0; i < size; i++) {
        const current = queue.shift()!;
        const neighbors = adjacency.get(current);

        if (neighbors) {
          for (const neighbor of neighbors) {
            if (neighbor === target && depth >= 3) {
              return true;
            }
            if (!visited[neighbor]) {
              visited[neighbor] = 1;
              queue.push(neighbor);
            }
          }
        }
      }
    }

    return false;
  }
}
