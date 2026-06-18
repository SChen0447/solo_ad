import type { Atom, Bond } from '../../store/useStore'

const PEPTIDE_PDB = `HEADER    PEPTIDE
TITLE     Tetrapeptide Ala-Ser-Gly-Val
ATOM      1  N   ALA A   1       0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  ALA A   1       1.450   0.000   0.000  1.00  0.00           C
ATOM      3  C   ALA A   1       2.000   1.420   0.000  1.00  0.00           C
ATOM      4  O   ALA A   1       1.200   2.400   0.000  1.00  0.00           O
ATOM      5  CB  ALA A   1       2.000  -0.750   1.200  1.00  0.00           C
ATOM      6  N   SER A   2       3.300   1.500   0.000  1.00  0.00           N
ATOM      7  CA  SER A   2       3.900   2.850   0.000  1.00  0.00           C
ATOM      8  C   SER A   2       5.400   2.800   0.000  1.00  0.00           C
ATOM      9  O   SER A   2       6.000   3.800   0.000  1.00  0.00           O
ATOM     10  CB  SER A   2       3.400   3.500   1.200  1.00  0.00           C
ATOM     11  OG  SER A   2       3.900   3.000   2.500  1.00  0.00           O
ATOM     12  N   GLY A   3       6.000   1.600   0.000  1.00  0.00           N
ATOM     13  CA  GLY A   3       7.450   1.500   0.000  1.00  0.00           C
ATOM     14  C   GLY A   3       8.000   2.920   0.000  1.00  0.00           C
ATOM     15  O   GLY A   3       7.200   3.900   0.000  1.00  0.00           O
ATOM     16  N   VAL A   4       9.300   3.000   0.000  1.00  0.00           N
ATOM     17  CA  VAL A   4       9.900   4.350   0.000  1.00  0.00           C
ATOM     18  C   VAL A   4      11.400   4.300   0.000  1.00  0.00           C
ATOM     19  O   VAL A   4      12.000   5.300   0.000  1.00  0.00           O
ATOM     20  CB  VAL A   4       9.400   5.000   1.300  1.00  0.00           C
ATOM     21  CG1 VAL A   4      10.000   4.500   2.600  1.00  0.00           C
ATOM     22  CG2 VAL A   4       7.900   5.100   1.500  1.00  0.00           C
ATOM     23  OXT VAL A   4      12.000   3.200   0.000  1.00  0.00           O
ATOM     24  H   ALA A   1      -0.400   0.800   0.000  1.00  0.00           H
ATOM     25  HA  ALA A   1       1.650  -0.400  -0.900  1.00  0.00           H
ATOM     26  HB1 ALA A   1       1.600  -1.700   1.200  1.00  0.00           H
ATOM     27  HB2 ALA A   1       1.700  -0.200   2.100  1.00  0.00           H
ATOM     28  HB3 ALA A   1       3.100  -0.850   1.200  1.00  0.00           H
ATOM     29  H   SER A   2       3.500   0.600   0.000  1.00  0.00           H
ATOM     30  HA  SER A   2       3.600   3.300  -0.900  1.00  0.00           H
ATOM     31  HB2 SER A   2       2.300   3.500   1.200  1.00  0.00           H
ATOM     32  HG  SER A   2       4.800   2.800   2.500  1.00  0.00           H
ATOM     33  H   GLY A   3       5.500   0.800   0.000  1.00  0.00           H
ATOM     34  HA2 GLY A   3       7.600   1.000  -0.900  1.00  0.00           H
ATOM     35  HA3 GLY A   3       7.850   1.000   0.900  1.00  0.00           H
ATOM     36  H   VAL A   4       9.700   2.100   0.000  1.00  0.00           H
ATOM     37  HA  VAL A   4       9.700   4.900  -0.900  1.00  0.00           H
ATOM     38  HB  VAL A   4       9.700   6.000   1.200  1.00  0.00           H
ATOM     39  HG11VAL A   4      11.100   4.600   2.600  1.00  0.00           H
ATOM     40  HG12VAL A   4       9.700   4.900   3.500  1.00  0.00           H
ATOM     41  HG13VAL A   4       9.700   3.400   2.700  1.00  0.00           H
ATOM     42  HG21VAL A   4       7.500   4.600   2.400  1.00  0.00           H
ATOM     43  HG22VAL A   4       7.600   6.100   1.600  1.00  0.00           H
ATOM     44  HG23VAL A   4       7.500   4.600   0.600  1.00  0.00           H
END
`

const WATER_PDB = `HEADER    WATER
TITLE     Single Water Molecule
ATOM      1  O   HOH W   1       0.000   0.000   0.000  1.00  0.00           O
ATOM      2  H1  HOH W   1       0.958   0.000   0.000  1.00  0.00           H
ATOM      3  H2  HOH W   1      -0.239   0.927   0.000  1.00  0.00           H
END
`

const BENZENE_PDB = `HEADER    BENZENE
TITLE     Benzene Ring
ATOM      1  C1  BEN A   1       0.000   1.397   0.000  1.00  0.00           C
ATOM      2  C2  BEN A   1       1.209   0.698   0.000  1.00  0.00           C
ATOM      3  C3  BEN A   1       1.209  -0.698   0.000  1.00  0.00           C
ATOM      4  C4  BEN A   1       0.000  -1.397   0.000  1.00  0.00           C
ATOM      5  C5  BEN A   1      -1.209  -0.698   0.000  1.00  0.00           C
ATOM      6  C6  BEN A   1      -1.209   0.698   0.000  1.00  0.00           C
ATOM      7  H1  BEN A   1       0.000   2.480   0.000  1.00  0.00           H
ATOM      8  H2  BEN A   1       2.148   1.240   0.000  1.00  0.00           H
ATOM      9  H3  BEN A   1       2.148  -1.240   0.000  1.00  0.00           H
ATOM     10  H4  BEN A   1       0.000  -2.480   0.000  1.00  0.00           H
ATOM     11  H5  BEN A   1      -2.148  -1.240   0.000  1.00  0.00           H
ATOM     12  H6  BEN A   1      -2.148   1.240   0.000  1.00  0.00           H
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
`

export const MoleculeData: Record<string, string> = {
  peptide: PEPTIDE_PDB,
  water: WATER_PDB,
  benzene: BENZENE_PDB
}

export function parsePDB(pdbString: string): { atoms: Atom[]; bonds: Bond[] } {
  const lines = pdbString.split('\n')
  const atoms: Atom[] = []
  const bonds: Bond[] = []
  let atomIdCounter = 0
  let bondIdCounter = 0
  const atomSerialToId = new Map<number, number>()

  for (const line of lines) {
    const recordType = line.substring(0, 6).trim()

    if (recordType === 'ATOM' || recordType === 'HETATM') {
      const serial = parseInt(line.substring(6, 11).trim(), 10)
      const name = line.substring(12, 16).trim()
      const resName = line.substring(17, 20).trim()
      const resNum = parseInt(line.substring(22, 26).trim(), 10)
      const x = parseFloat(line.substring(30, 38).trim())
      const y = parseFloat(line.substring(38, 46).trim())
      const z = parseFloat(line.substring(46, 54).trim())
      let element = line.substring(76, 78).trim()

      if (!element) {
        element = name.charAt(0)
      }

      atomIdCounter++
      atomSerialToId.set(serial, atomIdCounter)

      atoms.push({
        id: atomIdCounter,
        type: element.toUpperCase(),
        x,
        y,
        z,
        residue: resName,
        residueNumber: resNum
      })
    }

    if (recordType === 'CONECT') {
      const parts = line.substring(6).trim().split(/\s+/).map(Number)
      if (parts.length >= 2) {
        const atom1Serial = parts[0]
        for (let i = 1; i < parts.length; i++) {
          const atom2Serial = parts[i]
          const atom1Id = atomSerialToId.get(atom1Serial)
          const atom2Id = atomSerialToId.get(atom2Serial)
          if (atom1Id !== undefined && atom2Id !== undefined && atom1Id < atom2Id) {
            bondIdCounter++
            bonds.push({
              id: bondIdCounter,
              atom1: atom1Id,
              atom2: atom2Id
            })
          }
        }
      }
    }
  }

  if (bonds.length === 0 && atoms.length > 0) {
    bonds.push(...inferBonds(atoms))
  }

  return { atoms, bonds }
}

function inferBonds(atoms: Atom[]): Bond[] {
  const bonds: Bond[] = []
  let bondId = 0
  const bondThreshold = 1.7

  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const a = atoms[i]
      const b = atoms[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dz = a.z - b.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist < bondThreshold) {
        bondId++
        bonds.push({
          id: bondId,
          atom1: a.id,
          atom2: b.id
        })
      }
    }
  }

  return bonds
}

export function loadMolecule(name: string): { atoms: Atom[]; bonds: Bond[] } {
  const pdb = MoleculeData[name]
  if (!pdb) {
    throw new Error(`Molecule ${name} not found`)
  }
  return parsePDB(pdb)
}
