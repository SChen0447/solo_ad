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
          bonds.push({
            atom1: parseInt(parts[1], 10),
            atom2: parseInt(parts[2], 10),
            bondType: parseInt(parts[3], 10)
          });
          bondsParsed++;
        }
      }
    }

    if (bonds.length === 0 && atoms.length > 1) {
      return {
        atoms,
        bonds: this.generateBondsFromDistance(atoms)
      };
    }

    return { atoms, bonds };
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
      bonds: this.generateBondsFromDistance(atoms)
    };
  }

  private static extractElement(name: string): string {
    const match = name.match(/^([A-Za-z]+)/);
    return match ? match[1].toUpperCase().charAt(0) + match[1].slice(1).toLowerCase() : 'C';
  }

  private static generateBondsFromDistance(atoms: AtomData[]): BondData[] {
    const bonds: BondData[] = [];
    const covalentRadii: Record<string, number> = {
      'H': 0.31, 'He': 0.28, 'Li': 1.28, 'Be': 0.96, 'B': 0.84, 'C': 0.76,
      'N': 0.71, 'O': 0.66, 'F': 0.57, 'Ne': 0.58, 'Na': 1.66, 'Mg': 1.41,
      'Al': 1.21, 'Si': 1.11, 'P': 1.07, 'S': 1.05, 'Cl': 1.02, 'Ar': 1.06,
      'K': 2.03, 'Ca': 1.76, 'Fe': 1.32, 'Cu': 1.32, 'Zn': 1.22, 'Br': 1.20,
      'I': 1.39
    };

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const dx = atoms[i].x - atoms[j].x;
        const dy = atoms[i].y - atoms[j].y;
        const dz = atoms[i].z - atoms[j].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const r1 = covalentRadii[atoms[i].element] ?? 1.0;
        const r2 = covalentRadii[atoms[j].element] ?? 1.0;
        const threshold = (r1 + r2) * 1.3;

        if (distance < threshold) {
          bonds.push({
            atom1: atoms[i].id,
            atom2: atoms[j].id,
            bondType: 1
          });
        }
      }
    }
    return bonds;
  }
}
