import type { Molecule, Atom, Bond, Residue, Chain } from '@/types';

const ELEMENTS: Record<string, { atomicNumber: number; mass: number; radius: number }> = {
  C: { atomicNumber: 6, mass: 12.011, radius: 0.7 },
  O: { atomicNumber: 8, mass: 15.999, radius: 0.66 },
  N: { atomicNumber: 7, mass: 14.007, radius: 0.65 },
  S: { atomicNumber: 16, mass: 32.06, radius: 1.0 },
  P: { atomicNumber: 15, mass: 30.974, radius: 1.0 },
  H: { atomicNumber: 1, mass: 1.008, radius: 0.31 },
};

const RESIDUE_NAMES = [
  'ALA', 'ARG', 'ASN', 'ASP', 'CYS', 'GLN', 'GLU', 'GLY', 'HIS', 'ILE',
  'LEU', 'LYS', 'MET', 'PHE', 'PRO', 'SER', 'THR', 'TRP', 'TYR', 'VAL',
];

const HYDROPHOBICITY: Record<string, number> = {
  ALA: 0.62, ARG: 0.04, ASN: 0.23, ASP: 0.14, CYS: 0.68,
  GLN: 0.25, GLU: 0.16, GLY: 0.48, HIS: 0.17, ILE: 0.94,
  LEU: 0.94, LYS: 0.07, MET: 0.72, PHE: 0.92, PRO: 0.36,
  SER: 0.34, THR: 0.45, TRP: 0.78, TYR: 0.57, VAL: 0.86,
};

function generateResidueAtoms(
  startId: number,
  residueId: number,
  chainId: string,
  centerX: number,
  centerY: number,
  centerZ: number,
): { atoms: Atom[]; bonds: Bond[] } {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  let atomId = startId;

  const residueName = RESIDUE_NAMES[Math.floor(Math.random() * RESIDUE_NAMES.length)];
  const baseAtoms = [
    { element: 'N', name: 'N', dx: -0.5, dy: 0, dz: 0 },
    { element: 'C', name: 'CA', dx: 0, dy: 0, dz: 0 },
    { element: 'C', name: 'C', dx: 0.5, dy: 0, dz: 0 },
    { element: 'O', name: 'O', dx: 0.8, dy: 0.3, dz: 0 },
  ];

  const sideChainAtoms = [
    { element: 'C', name: 'CB', dx: 0, dy: -0.5, dz: 0 },
    { element: 'C', name: 'CG', dx: 0, dy: -1.0, dz: 0 },
    { element: 'N', name: 'NE', dx: 0, dy: -1.5, dz: 0.3 },
  ];

  const allAtoms = [...baseAtoms, ...sideChainAtoms.slice(0, Math.floor(Math.random() * 3) + 1)];

  allAtoms.forEach((atomDef, idx) => {
    atoms.push({
      id: atomId,
      element: atomDef.element,
      atomicNumber: ELEMENTS[atomDef.element].atomicNumber,
      name: atomDef.name,
      x: centerX + atomDef.dx + (Math.random() - 0.5) * 0.1,
      y: centerY + atomDef.dy + (Math.random() - 0.5) * 0.1,
      z: centerZ + atomDef.dz + (Math.random() - 0.5) * 0.1,
      radius: ELEMENTS[atomDef.element].radius,
      mass: ELEMENTS[atomDef.element].mass,
      residueId,
      chainId,
    });

    if (idx > 0) {
      const dx = atoms[idx].x - atoms[0].x;
      const dy = atoms[idx].y - atoms[0].y;
      const dz = atoms[idx].z - atoms[0].z;
      bonds.push({
        id: bonds.length + startId,
        atom1Id: atoms[0].id,
        atom2Id: atoms[idx].id,
        type: idx === 3 ? 'double' : 'single',
        length: Math.sqrt(dx * dx + dy * dy + dz * dz),
      });
    }

    if (idx > 1 && idx < allAtoms.length - 1) {
      const dx = atoms[idx + 1].x - atoms[idx].x;
      const dy = atoms[idx + 1].y - atoms[idx].y;
      const dz = atoms[idx + 1].z - atoms[idx].z;
      bonds.push({
        id: bonds.length + startId,
        atom1Id: atoms[idx].id,
        atom2Id: atoms[idx + 1].id,
        type: 'single',
        length: Math.sqrt(dx * dx + dy * dy + dz * dz),
      });
    }

    atomId++;
  });

  return { atoms, bonds };
}

function generateProteinStructure(
  id: string,
  name: string,
  pdbId: string,
  numResidues: number,
  numChains: number,
): Molecule {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const residues: Residue[] = [];
  const chains: Chain[] = [];

  let atomId = 0;
  let bondId = 0;
  let residueId = 0;

  const residuesPerChain = Math.floor(numResidues / numChains);

  for (let c = 0; c < numChains; c++) {
    const chainId = String.fromCharCode(65 + c);
    const chain: Chain = {
      id: chainId,
      name: `Chain ${chainId}`,
      residueIds: [],
    };

    const helixRegions: [number, number][] = [];
    const sheetRegions: [number, number][] = [];
    
    let pos = 0;
    while (pos < residuesPerChain) {
      const segType = Math.random();
      if (segType < 0.3 && pos + 10 < residuesPerChain) {
        const len = 10 + Math.floor(Math.random() * 15);
        helixRegions.push([pos, Math.min(pos + len, residuesPerChain)]);
        pos += len;
      } else if (segType < 0.5 && pos + 5 < residuesPerChain) {
        const len = 5 + Math.floor(Math.random() * 8);
        sheetRegions.push([pos, Math.min(pos + len, residuesPerChain)]);
        pos += len;
      } else {
        pos += 1 + Math.floor(Math.random() * 3);
      }
    }

    const chainOffsetX = (c - numChains / 2) * 8;
    const chainOffsetZ = (c % 2 === 0 ? 1 : -1) * 2;

    for (let r = 0; r < residuesPerChain && residueId < numResidues; r++) {
      const helixRegion = helixRegions.find(([s, e]) => r >= s && r < e);
      const sheetRegion = sheetRegions.find(([s, e]) => r >= s && r < e);
      const secondaryStructure: 'helix' | 'sheet' | 'coil' = 
        helixRegion ? 'helix' : sheetRegion ? 'sheet' : 'coil';

      let x, y, z;
      if (helixRegion) {
        const localR = r - helixRegion[0];
        const angle = localR * 1.2;
        const radius = 2.5;
        x = chainOffsetX + Math.cos(angle) * radius;
        y = localR * 0.6 - residuesPerChain * 0.3;
        z = chainOffsetZ + Math.sin(angle) * radius;
      } else if (sheetRegion) {
        const localR = r - sheetRegion[0];
        const strand = Math.floor(localR / 4);
        const posInStrand = localR % 4;
        x = chainOffsetX + (strand - 1) * 5;
        y = posInStrand * 0.8 - residuesPerChain * 0.3;
        z = chainOffsetZ + (posInStrand % 2 === 0 ? 1.5 : -1.5);
      } else {
        x = chainOffsetX + (Math.random() - 0.5) * 6;
        y = r * 0.5 - residuesPerChain * 0.3;
        z = chainOffsetZ + (Math.random() - 0.5) * 4;
      }

      const residueName = RESIDUE_NAMES[Math.floor(Math.random() * RESIDUE_NAMES.length)];
      const { atoms: resAtoms, bonds: resBonds } = generateResidueAtoms(
        atomId,
        residueId,
        chainId,
        x,
        y,
        z,
      );

      atoms.push(...resAtoms);
      bonds.push(...resBonds.map(b => ({ ...b, id: bondId++ })));

      const cartoonPosition: [number, number, number] = [x, y, z];

      residues.push({
        id: residueId,
        name: residueName,
        sequenceNumber: r + 1,
        chainId,
        atomIds: resAtoms.map(a => a.id),
        secondaryStructure,
        hydrophobicity: HYDROPHOBICITY[residueName] || 0.5,
        cartoonPosition,
      });

      chain.residueIds.push(residueId);

      if (r > 0) {
        const prevLastAtom = atoms[atomId - resAtoms.length - 1];
        const currFirstAtom = resAtoms[0];
        const dx = currFirstAtom.x - prevLastAtom.x;
        const dy = currFirstAtom.y - prevLastAtom.y;
        const dz = currFirstAtom.z - prevLastAtom.z;
        bonds.push({
          id: bondId++,
          atom1Id: prevLastAtom.id,
          atom2Id: currFirstAtom.id,
          type: 'single',
          length: Math.sqrt(dx * dx + dy * dy + dz * dz),
        });
      }

      atomId += resAtoms.length;
      residueId++;
    }

    chains.push(chain);
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
    id,
    name,
    pdbId,
    atoms,
    bonds,
    chains,
    residues,
    center,
    atomCount: atoms.length,
    residueCount: residues.length,
  };
}

export const HEMOGLOBIN = generateProteinStructure(
  'hemoglobin',
  '血红蛋白 (Hemoglobin)',
  '1A3N',
  574,
  4,
);

export const INSULIN = generateProteinStructure(
  'insulin',
  '胰岛素 (Insulin)',
  '2HIU',
  51,
  2,
);

export const GFP = generateProteinStructure(
  'gfp',
  '绿色荧光蛋白 (GFP)',
  '1GFL',
  238,
  1,
);

export const LYSOZYME = generateProteinStructure(
  'lysozyme',
  '溶菌酶 (Lysozyme)',
  '1LSE',
  129,
  1,
);

export const MOLECULES: Molecule[] = [HEMOGLOBIN, INSULIN, GFP, LYSOZYME];

export const MOLECULE_THUMBNAILS: Record<string, string> = {
  hemoglobin: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="#1a202c"/>
      <circle cx="32" cy="32" r="20" fill="#e53e3e" opacity="0.8"/>
      <circle cx="22" cy="24" r="6" fill="#808080"/>
      <circle cx="42" cy="24" r="6" fill="#808080"/>
      <circle cx="32" cy="40" r="6" fill="#808080"/>
      <circle cx="22" cy="24" r="3" fill="#ff0000"/>
      <circle cx="42" cy="24" r="3" fill="#0000ff"/>
    </svg>
  `),
  insulin: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="#1a202c"/>
      <ellipse cx="32" cy="32" rx="22" ry="18" fill="#f6ad55" opacity="0.8"/>
      <circle cx="22" cy="28" r="5" fill="#808080"/>
      <circle cx="42" cy="28" r="5" fill="#808080"/>
      <circle cx="32" cy="38" r="5" fill="#808080"/>
      <line x1="22" y1="28" x2="42" y2="28" stroke="#a0aec0" stroke-width="2"/>
      <line x1="22" y1="28" x2="32" y2="38" stroke="#a0aec0" stroke-width="2"/>
    </svg>
  `),
  gfp: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="#1a202c"/>
      <circle cx="32" cy="32" r="22" fill="#48bb78" opacity="0.6"/>
      <polygon points="32,10 45,30 32,54 19,30" fill="#68d391" opacity="0.8"/>
      <circle cx="32" cy="32" r="8" fill="#9ae6b4"/>
      <circle cx="25" cy="25" r="3" fill="#808080"/>
      <circle cx="39" cy="25" r="3" fill="#808080"/>
    </svg>
  `),
  lysozyme: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="#1a202c"/>
      <path d="M10,32 Q32,10 54,32 Q32,54 10,32" fill="#4299e1" opacity="0.8"/>
      <circle cx="22" cy="26" r="5" fill="#808080"/>
      <circle cx="42" cy="26" r="5" fill="#808080"/>
      <circle cx="32" cy="38" r="5" fill="#808080"/>
      <circle cx="28" cy="32" r="2" fill="#ffff00"/>
      <circle cx="36" cy="32" r="2" fill="#ff0000"/>
    </svg>
  `),
};
