import { Atom, Bond, MoleculeData } from '@/types';

export function parsePDB(pdbText: string, name: string = 'Unknown'): MoleculeData {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const atomMap = new Map<number, number>();

  const lines = pdbText.split('\n');
  let atomIndex = 0;

  for (const line of lines) {
    if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      const serial = parseInt(line.substring(6, 11).trim(), 10);
      const type = line.substring(12, 16).trim().replace(/[^A-Za-z]/g, '');
      const element = type.charAt(0).toUpperCase();
      const x = parseFloat(line.substring(30, 38).trim());
      const y = parseFloat(line.substring(38, 46).trim());
      const z = parseFloat(line.substring(46, 54).trim());

      atomMap.set(serial, atomIndex);
      atoms.push({
        type: element,
        x,
        y,
        z,
        index: atomIndex,
      });
      atomIndex++;
    } else if (line.startsWith('CONECT')) {
      const parts = line.substring(6).trim().split(/\s+/).map(s => parseInt(s, 10));
      const atom1 = parts[0];
      for (let i = 1; i < parts.length; i++) {
        const atom2 = parts[i];
        if (atomMap.has(atom1) && atomMap.has(atom2)) {
          const idx1 = atomMap.get(atom1)!;
          const idx2 = atomMap.get(atom2)!;
          if (idx1 < idx2) {
            bonds.push({ atom1: idx1, atom2: idx2 });
          }
        }
      }
    }
  }

  if (bonds.length === 0) {
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const dist = Math.sqrt(
          Math.pow(atoms[i].x - atoms[j].x, 2) +
          Math.pow(atoms[i].y - atoms[j].y, 2) +
          Math.pow(atoms[i].z - atoms[j].z, 2)
        );
        if (dist < 1.8) {
          bonds.push({ atom1: i, atom2: j });
        }
      }
    }
  }

  return { name, atoms, bonds };
}

export const WATER_PDB = `ATOM      1  O   HOH     1       0.000   0.000   0.000  1.00  0.00           O
ATOM      2  H   HOH     1       0.957   0.000   0.000  1.00  0.00           H
ATOM      3  H   HOH     1      -0.239   0.927   0.000  1.00  0.00           H
CONECT    1    2    3
CONECT    2    1
CONECT    3    1
END
`;

export const BENZENE_PDB = `ATOM      1  C   BEN     1       0.000   1.397   0.000  1.00  0.00           C
ATOM      2  C   BEN     1       1.210   0.698   0.000  1.00  0.00           C
ATOM      3  C   BEN     1       1.210  -0.698   0.000  1.00  0.00           C
ATOM      4  C   BEN     1       0.000  -1.397   0.000  1.00  0.00           C
ATOM      5  C   BEN     1      -1.210  -0.698   0.000  1.00  0.00           C
ATOM      6  C   BEN     1      -1.210   0.698   0.000  1.00  0.00           C
ATOM      7  H   BEN     1       0.000   2.479   0.000  1.00  0.00           H
ATOM      8  H   BEN     1       2.146   1.239   0.000  1.00  0.00           H
ATOM      9  H   BEN     1       2.146  -1.239   0.000  1.00  0.00           H
ATOM     10  H   BEN     1       0.000  -2.479   0.000  1.00  0.00           H
ATOM     11  H   BEN     1      -2.146  -1.239   0.000  1.00  0.00           H
ATOM     12  H   BEN     1      -2.146   1.239   0.000  1.00  0.00           H
CONECT    1    2    6    7
CONECT    2    1    3    8
CONECT    3    2    4    9
CONECT    4    3    5   10
CONECT    5    4    6   11
CONECT    6    5    1   12
CONECT    7    1
CONECT    8    2
CONECT    9    3
CONECT   10    4
CONECT   11    5
CONECT   12    6
END
`;
