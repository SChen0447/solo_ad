import {
  Molecule,
  Chain,
  Residue,
  Atom,
  Bond,
  ResidueType,
  RESIDUE_PROPERTIES,
  ElementType,
  MutationResult,
} from '@/types';
import * as _ from 'lodash';

const INSULIN_SEQUENCE_A: ResidueType[] = [
  'GLY', 'ILE', 'VAL', 'GLU', 'GLN', 'CYS', 'CYS', 'THR', 'SER', 'ILE',
  'CYS', 'SER', 'LEU', 'TYR', 'GLN', 'LEU', 'GLU', 'ASN', 'TYR', 'CYS',
  'ASN',
];

const INSULIN_SEQUENCE_B: ResidueType[] = [
  'PHE', 'VAL', 'ASN', 'GLN', 'HIS', 'LEU', 'CYS', 'GLY', 'SER', 'HIS',
  'LEU', 'VAL', 'GLU', 'ALA', 'LEU', 'TYR', 'LEU', 'VAL', 'CYS', 'GLY',
  'GLU', 'ARG', 'GLY', 'PHE', 'PHE', 'TYR', 'THR', 'PRO', 'LYS', 'ALA',
];

const HEMOGLOBIN_ALPHA: ResidueType[] = [
  'VAL', 'LEU', 'SER', 'PRO', 'ALA', 'ASP', 'LYS', 'THR', 'ASN', 'VAL',
  'LYS', 'ALA', 'ALA', 'TRP', 'GLY', 'LYS', 'VAL', 'GLY', 'HIS', 'ALA',
  'GLY', 'GLU', 'TYR', 'GLY', 'ALA', 'GLU', 'ALA', 'LEU', 'GLU', 'ARG',
  'MET', 'PHE', 'LEU', 'SER', 'PHE', 'PRO', 'THR', 'THR', 'LYS', 'THR',
];

const HEMOGLOBIN_BETA: ResidueType[] = [
  'HIS', 'LEU', 'THR', 'PRO', 'GLU', 'GLU', 'LYS', 'SER', 'ALA', 'VAL',
  'THR', 'ALA', 'LEU', 'TRP', 'GLY', 'LYS', 'VAL', 'ASN', 'VAL', 'ASP',
  'GLU', 'VAL', 'GLY', 'GLY', 'GLU', 'ALA', 'LEU', 'GLY', 'ARG', 'LEU',
  'LEU', 'VAL', 'VAL', 'TYR', 'PRO', 'TRP', 'THR', 'GLN', 'ARG', 'PHE',
];

const GFP_SEQUENCE: ResidueType[] = [
  'SER', 'LYS', 'GLY', 'GLU', 'GLU', 'PHE', 'LEU', 'VAL', 'PRO', 'ILE',
  'GLU', 'LEU', 'ASP', 'GLY', 'VAL', 'PRO', 'TRP', 'PRO', 'ASN', 'LEU',
  'LEU', 'GLY', 'VAL', 'GLN', 'CYS', 'PHE', 'SER', 'TYR', 'ALA', 'VAL',
  'PRO', 'THR', 'GLY', 'LEU', 'GLU', 'LEU', 'GLN', 'PHE', 'ALA', 'THR',
  'GLY', 'ASP', 'VAL', 'GLN', 'HIS', 'ILE', 'ASP', 'SER', 'THR', 'ASP',
  'TYR', 'LYS', 'SER', 'PHE', 'ILE', 'ARG', 'ALA', 'THR', 'ALA', 'ILE',
  'GLY', 'VAL', 'GLU', 'GLN', 'ALA', 'ASP', 'GLY', 'GLY', 'ALA', 'TYR',
  'ALA', 'THR', 'ALA', 'ILE', 'THR', 'SER', 'LEU', 'LYS', 'GLU', 'PHE',
  'LYS', 'THR', 'ILE', 'PRO', 'ASP', 'GLY', 'MET', 'PRO', 'VAL', 'GLU',
  'LEU', 'ASP', 'GLU', 'TYR', 'VAL', 'HIS', 'PHE', 'LYS', 'VAL', 'ARG',
  'ALA', 'ASP', 'ILE', 'ALA', 'TYR', 'LYS', 'GLY', 'ILE', 'THR', 'GLU',
  'PHE', 'ASP', 'LEU', 'ASP', 'GLY', 'THR', 'HIS', 'TYR', 'ALA', 'GLN',
  'LYS', 'ALA', 'VAL', 'VAL', 'PRO', 'ALA', 'LEU', 'ALA', 'GLN', 'ASP',
  'GLY', 'ILE', 'GLN', 'GLY', 'HIS', 'LEU', 'ASN', 'TYR', 'ILE', 'ALA',
  'LYS', 'THR', 'ILE', 'SER', 'SER', 'GLY', 'VAL', 'GLY', 'ILE', 'ALA',
  'PHE', 'GLU', 'LYS', 'ASP', 'PHE', 'ALA', 'GLU', 'ARG', 'PHE', 'VAL',
  'ASN', 'GLY', 'ILE', 'VAL', 'ASP', 'THR', 'THR', 'LEU', 'VAL', 'THR',
  'TRP', 'SER', 'GLN', 'SER', 'GLY', 'PRO', 'MET', 'GLY', 'LEU', 'CYS',
  'ALA', 'TYR', 'VAL', 'LYS', 'ALA', 'LYS', 'LEU', 'ARG', 'VAL', 'THR',
  'TYR', 'TYR', 'ASP', 'PRO', 'ASP', 'GLY', 'MET', 'GLN', 'LEU', 'GLY',
  'GLU', 'ILE', 'LEU', 'THR', 'ALA', 'CYS', 'MET', 'ASP', 'PHE', 'GLY',
  'VAL', 'TYR', 'VAL', 'GLN', 'ARG', 'THR', 'ILE', 'GLN', 'LEU', 'LYS',
  'GLU', 'TYR', 'ILE', 'PRO', 'ASN', 'MET', 'GLU', 'LYS', 'VAL', 'ASP',
  'GLU', 'GLN', 'LYS', 'ASP', 'ALA', 'GLY', 'VAL', 'THR', 'ALA', 'PHE',
  'GLU', 'ALA', 'GLU', 'LYS', 'LEU', 'ASP', 'LEU', 'GLY', 'ILE', 'THR',
  'PHE', 'ASN', 'GLN', 'TYR', 'VAL', 'ASN', 'HIS', 'VAL', 'ALA', 'GLY',
  'GLY', 'PHE', 'MET', 'GLN', 'LYS', 'GLU', 'ILE', 'ALA', 'LYS', 'LEU',
  'LYS', 'THR', 'TYR', 'TRP', 'ASN', 'GLU', 'LEU', 'ARG', 'ASN', 'PRO',
  'ILE', 'PRO', 'GLY', 'VAL', 'TRP', 'ILE', 'LYS', 'GLN', 'LEU', 'ALA',
  'SER', 'LYS', 'GLY', 'THR', 'PHE', 'VAL', 'PRO', 'ALA', 'GLY', 'MET',
  'GLY', 'ALA', 'THR', 'GLY', 'LEU', 'THR', 'LEU', 'SER', 'VAL', 'GLU',
  'GLU',
];

const SIDE_CHAIN_ATOMS: Record<ResidueType, Array<{element: ElementType; dx: number; dy: number; dz: number; isSideChain: boolean; name?: string}>> = {
  ALA: [{ element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' }],
  ARG: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'C', dx: 4.0, dy: 0, dz: 0.5, isSideChain: true, name: 'CD' },
    { element: 'N', dx: 5.2, dy: 0.5, dz: 0, isSideChain: true, name: 'NE' },
    { element: 'C', dx: 6.0, dy: 0, dz: 0.5, isSideChain: true, name: 'CZ' },
    { element: 'N', dx: 6.8, dy: 0.5, dz: 0, isSideChain: true, name: 'NH1' },
    { element: 'N', dx: 6.8, dy: -0.5, dz: 0, isSideChain: true, name: 'NH2' },
  ],
  ASN: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'O', dx: 3.5, dy: 0, dz: 0.8, isSideChain: true, name: 'OD1' },
    { element: 'N', dx: 3.5, dy: 0, dz: -0.8, isSideChain: true, name: 'ND2' },
  ],
  ASP: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'O', dx: 3.5, dy: 0, dz: 0.8, isSideChain: true, name: 'OD1' },
    { element: 'O', dx: 3.5, dy: 0, dz: -0.8, isSideChain: true, name: 'OD2' },
  ],
  CYS: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'S', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'SG' },
  ],
  GLN: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'C', dx: 4.0, dy: 0, dz: 0.5, isSideChain: true, name: 'CD' },
    { element: 'O', dx: 4.8, dy: 0.5, dz: 0, isSideChain: true, name: 'OE1' },
    { element: 'N', dx: 4.8, dy: -0.5, dz: 0, isSideChain: true, name: 'NE2' },
  ],
  GLU: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'C', dx: 4.0, dy: 0, dz: 0.5, isSideChain: true, name: 'CD' },
    { element: 'O', dx: 4.8, dy: 0.5, dz: 0, isSideChain: true, name: 'OE1' },
    { element: 'O', dx: 4.8, dy: -0.5, dz: 0, isSideChain: true, name: 'OE2' },
  ],
  GLY: [],
  HIS: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.5, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'N', dx: 3.2, dy: 0, dz: 0.8, isSideChain: true, name: 'ND1' },
    { element: 'C', dx: 4.0, dy: 0.5, dz: 0.5, isSideChain: true, name: 'CD2' },
    { element: 'C', dx: 3.8, dy: 0, dz: -0.5, isSideChain: true, name: 'CE1' },
    { element: 'N', dx: 4.5, dy: 0, dz: -0.2, isSideChain: true, name: 'NE2' },
  ],
  ILE: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.8, dy: 0.5, dz: 0.5, isSideChain: true, name: 'CG1' },
    { element: 'C', dx: 2.8, dy: -0.5, dz: -0.5, isSideChain: true, name: 'CG2' },
    { element: 'C', dx: 4.0, dy: 1.0, dz: 0.5, isSideChain: true, name: 'CD' },
  ],
  LEU: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'C', dx: 4.0, dy: 0, dz: 0.8, isSideChain: true, name: 'CD1' },
    { element: 'C', dx: 4.0, dy: 0, dz: -0.8, isSideChain: true, name: 'CD2' },
  ],
  LYS: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'C', dx: 4.0, dy: 0, dz: 0.5, isSideChain: true, name: 'CD' },
    { element: 'C', dx: 5.2, dy: 0.5, dz: 0, isSideChain: true, name: 'CE' },
    { element: 'N', dx: 6.4, dy: 0, dz: 0.5, isSideChain: true, name: 'NZ' },
  ],
  MET: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'S', dx: 4.0, dy: 0, dz: 0.5, isSideChain: true, name: 'SD' },
    { element: 'C', dx: 5.2, dy: 0.5, dz: 0, isSideChain: true, name: 'CE' },
  ],
  PHE: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.5, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'C', dx: 3.2, dy: 0, dz: 0.8, isSideChain: true, name: 'CD1' },
    { element: 'C', dx: 3.2, dy: 0, dz: -0.8, isSideChain: true, name: 'CD2' },
    { element: 'C', dx: 4.4, dy: 0.5, dz: 0.8, isSideChain: true, name: 'CE1' },
    { element: 'C', dx: 4.4, dy: 0.5, dz: -0.8, isSideChain: true, name: 'CE2' },
    { element: 'C', dx: 5.0, dy: 0, dz: 0, isSideChain: true, name: 'CZ' },
  ],
  PRO: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.5, dy: 0.8, dz: -0.5, isSideChain: true, name: 'CG' },
    { element: 'C', dx: 2.0, dy: 0.5, dz: -1.8, isSideChain: true, name: 'CD' },
  ],
  SER: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'O', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'OG' },
  ],
  THR: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'O', dx: 2.8, dy: 0.5, dz: 0, isSideChain: true, name: 'OG1' },
    { element: 'C', dx: 2.5, dy: -0.5, dz: -0.8, isSideChain: true, name: 'CG2' },
  ],
  TRP: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.5, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'C', dx: 3.2, dy: 0, dz: 0.8, isSideChain: true, name: 'CD1' },
    { element: 'C', dx: 3.2, dy: 0, dz: -0.8, isSideChain: true, name: 'CD2' },
    { element: 'N', dx: 4.0, dy: 0.5, dz: 0.5, isSideChain: true, name: 'NE1' },
    { element: 'C', dx: 4.5, dy: 0.5, dz: -0.8, isSideChain: true, name: 'CE2' },
    { element: 'C', dx: 5.0, dy: 0, dz: 1.0, isSideChain: true, name: 'CE3' },
    { element: 'C', dx: 5.5, dy: 0, dz: 0, isSideChain: true, name: 'CZ2' },
    { element: 'C', dx: 5.5, dy: 0, dz: -1.0, isSideChain: true, name: 'CZ3' },
    { element: 'C', dx: 6.5, dy: 0, dz: 0, isSideChain: true, name: 'CH2' },
  ],
  TYR: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.5, dy: 0.5, dz: 0, isSideChain: true, name: 'CG' },
    { element: 'C', dx: 3.2, dy: 0, dz: 0.8, isSideChain: true, name: 'CD1' },
    { element: 'C', dx: 3.2, dy: 0, dz: -0.8, isSideChain: true, name: 'CD2' },
    { element: 'C', dx: 4.4, dy: 0.5, dz: 0.8, isSideChain: true, name: 'CE1' },
    { element: 'C', dx: 4.4, dy: 0.5, dz: -0.8, isSideChain: true, name: 'CE2' },
    { element: 'C', dx: 5.0, dy: 0, dz: 0, isSideChain: true, name: 'CZ' },
    { element: 'O', dx: 6.0, dy: 0.5, dz: 0, isSideChain: true, name: 'OH' },
  ],
  VAL: [
    { element: 'C', dx: 1.5, dy: 0, dz: 0, isSideChain: true, name: 'CB' },
    { element: 'C', dx: 2.8, dy: 0.5, dz: 0.5, isSideChain: true, name: 'CG1' },
    { element: 'C', dx: 2.8, dy: -0.5, dz: -0.5, isSideChain: true, name: 'CG2' },
  ],
};

function createResidueBackbone(
  cx: number,
  cy: number,
  cz: number,
  residueType: ResidueType,
  residueNum: number,
  chainId: string,
): { atoms: Atom[]; bonds: Bond[]; position: { x: number; y: number; z: number } } {
  const residueId = `${chainId}_${residueNum}`;
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];

  const nAtom: Atom = {
    id: `${residueId}_N`,
    element: 'N',
    x: cx - 1.2,
    y: cy,
    z: cz,
    residueId,
    chainId,
    isBackbone: true,
    isSideChain: false,
    name: 'N',
  };
  const caAtom: Atom = {
    id: `${residueId}_CA`,
    element: 'C',
    x: cx,
    y: cy,
    z: cz,
    residueId,
    chainId,
    isBackbone: true,
    isSideChain: false,
    name: 'CA',
  };
  const cAtom: Atom = {
    id: `${residueId}_C`,
    element: 'C',
    x: cx + 1.2,
    y: cy + 0.3,
    z: cz,
    residueId,
    chainId,
    isBackbone: true,
    isSideChain: false,
    name: 'C',
  };
  const oAtom: Atom = {
    id: `${residueId}_O`,
    element: 'O',
    x: cx + 1.2,
    y: cy + 1.3,
    z: cz,
    residueId,
    chainId,
    isBackbone: true,
    isSideChain: false,
    name: 'O',
  };

  atoms.push(nAtom, caAtom, cAtom, oAtom);

  bonds.push(
    { id: `${residueId}_N_CA`, atom1: nAtom.id, atom2: caAtom.id, order: 1 },
    { id: `${residueId}_CA_C`, atom1: caAtom.id, atom2: cAtom.id, order: 1 },
    { id: `${residueId}_C_O`, atom1: cAtom.id, atom2: oAtom.id, order: 2 },
  );

  const sideChainDefs = SIDE_CHAIN_ATOMS[residueType] || [];
  let prevSideAtomId = caAtom.id;
  sideChainDefs.forEach((sc, idx) => {
    const scAtom: Atom = {
      id: `${residueId}_SC${idx}`,
      element: sc.element as ElementType,
      x: cx + sc.dx,
      y: cy + sc.dy,
      z: cz + sc.dz,
      residueId,
      chainId,
      isBackbone: false,
      isSideChain: true,
      name: sc.name,
    };
    atoms.push(scAtom);
    bonds.push({
      id: `${residueId}_bond_SC${idx}`,
      atom1: prevSideAtomId,
      atom2: scAtom.id,
      order: 1,
    });
    prevSideAtomId = scAtom.id;
  });

  return {
    atoms,
    bonds,
    position: { x: cx, y: cy, z: cz },
  };
}

function createChain(
  chainId: string,
  chainName: string,
  sequence: ResidueType[],
  startX: number,
  startY: number,
  startZ: number,
  helixParams?: { rise: number; radius: number; angleStep: number },
): Chain {
  const residues: Residue[] = [];
  const rise = helixParams?.rise ?? 1.5;
  const radius = helixParams?.radius ?? 2.0;
  const angleStep = helixParams?.angleStep ?? 100;

  for (let i = 0; i < sequence.length; i++) {
    const angle = (i * angleStep * Math.PI) / 180;
    const x = startX + Math.cos(angle) * radius;
    const y = startY + i * rise;
    const z = startZ + Math.sin(angle) * radius;

    const residueType = sequence[i];
    const props = RESIDUE_PROPERTIES[residueType];
    const { atoms, bonds, position } = createResidueBackbone(x, y, z, residueType, i + 1, chainId);

    const residue: Residue = {
      id: `${chainId}_${i + 1}`,
      name: residueType,
      sequenceNumber: i + 1,
      chainId,
      atoms,
      bonds,
      position,
      sideChainType: props.sideChainType,
      hydrophobicity: props.hydrophobicity,
      phi: -60 + (Math.random() * 30 - 15),
      psi: -45 + (Math.random() * 30 - 15),
    };
    residues.push(residue);
  }

  return { id: chainId, name: chainName, residues };
}

function finalizeMolecule(id: string, name: string, description: string, chains: Chain[]): Molecule {
  const allAtoms: Atom[] = [];
  const allBonds: Bond[] = [];

  for (const chain of chains) {
    for (const residue of chain.residues) {
      allAtoms.push(...residue.atoms);
      allBonds.push(...residue.bonds);
    }

    for (let i = 0; i < chain.residues.length - 1; i++) {
      const curr = chain.residues[i];
      const next = chain.residues[i + 1];
      const cAtom = curr.atoms.find((a) => a.name === 'C');
      const nAtom = next.atoms.find((a) => a.name === 'N');
      if (cAtom && nAtom) {
        allBonds.push({
          id: `pep_${chain.id}_${i}`,
          atom1: cAtom.id,
          atom2: nAtom.id,
          order: 1,
        });
      }
    }
  }

  let sumX = 0,
    sumY = 0,
    sumZ = 0;
  let maxDist = 0;

  for (const atom of allAtoms) {
    sumX += atom.x;
    sumY += atom.y;
    sumZ += atom.z;
  }
  const cx = sumX / allAtoms.length;
  const cy = sumY / allAtoms.length;
  const cz = sumZ / allAtoms.length;

  for (const atom of allAtoms) {
    const dx = atom.x - cx;
    const dy = atom.y - cy;
    const dz = atom.z - cz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDist) maxDist = dist;
  }

  return {
    id,
    name,
    description,
    chains,
    allAtoms,
    allBonds,
    center: { x: cx, y: cy, z: cz },
    radius: maxDist + 2,
  };
}

export function generateInsulin(): Molecule {
  const chainA = createChain('A', 'Insulin A', INSULIN_SEQUENCE_A, 0, 0, 0, { rise: 1.5, radius: 2, angleStep: 100 });
  const chainB = createChain('B', 'Insulin B', INSULIN_SEQUENCE_B, 8, 0, 0, { rise: 1.5, radius: 2, angleStep: -95 });
  return finalizeMolecule('insulin', '胰岛素 (Insulin)', '由A、B两条链组成的多肽激素，调节血糖代谢', [chainA, chainB]);
}

export function generateHemoglobin(): Molecule {
  const chainA1 = createChain('A1', 'Hb α1', HEMOGLOBIN_ALPHA, 0, 0, 0, { rise: 1.5, radius: 2.5, angleStep: 100 });
  const chainB1 = createChain('B1', 'Hb β1', HEMOGLOBIN_BETA, 12, 0, 5, { rise: 1.5, radius: 2.5, angleStep: -100 });
  const chainA2 = createChain('A2', 'Hb α2', HEMOGLOBIN_ALPHA, 0, 0, 15, { rise: 1.5, radius: 2.5, angleStep: 95 });
  const chainB2 = createChain('B2', 'Hb β2', HEMOGLOBIN_BETA, 12, 0, 20, { rise: 1.5, radius: 2.5, angleStep: -95 });
  return finalizeMolecule('hemoglobin', '血红蛋白 (Hemoglobin)', '由四个亚基组成的氧运输蛋白', [chainA1, chainB1, chainA2, chainB2]);
}

export function generateGFP(): Molecule {
  const chain = createChain('A', 'GFP', GFP_SEQUENCE, 0, 0, 0, { rise: 1.2, radius: 8, angleStep: 20 });
  return finalizeMolecule('gfp', '绿色荧光蛋白 (GFP)', '源自水母的荧光报告蛋白', [chain]);
}

export function generateAllMolecules(): Molecule[] {
  return [generateInsulin(), generateHemoglobin(), generateGFP()];
}

export function applyMutationToResidue(
  molecule: Molecule,
  chainId: string,
  residueId: string,
  newResidueType: ResidueType,
): MutationResult {
  const chain = molecule.chains.find((c) => c.id === chainId);
  if (!chain) return { success: false, message: '链未找到' };

  const residueIdx = chain.residues.findIndex((r) => r.id === residueId);
  if (residueIdx === -1) return { success: false, message: '残基未找到' };

  const residue = chain.residues[residueIdx];
  if (residue.name === newResidueType) return { success: false, message: '残基类型未改变' };

  const props = RESIDUE_PROPERTIES[newResidueType];
  const { atoms, bonds, position } = createResidueBackbone(
    residue.position.x,
    residue.position.y,
    residue.position.z,
    newResidueType,
    residue.sequenceNumber,
    chainId,
  );

  const updatedResidue: Residue = {
    ...residue,
    name: newResidueType,
    atoms,
    bonds,
    sideChainType: props.sideChainType,
    hydrophobicity: props.hydrophobicity,
    isMutated: true,
    position,
  };

  const newChains = molecule.chains.map((c) => {
    if (c.id !== chainId) return c;
    const newResidues = [...c.residues];
    newResidues[residueIdx] = updatedResidue;
    return { ...c, residues: newResidues };
  });

  const allAtoms: Atom[] = [];
  const allBonds: Bond[] = [];
  for (const ch of newChains) {
    for (const r of ch.residues) {
      allAtoms.push(...r.atoms);
      allBonds.push(...r.bonds);
    }
    for (let i = 0; i < ch.residues.length - 1; i++) {
      const curr = ch.residues[i];
      const next = ch.residues[i + 1];
      const cAtom = curr.atoms.find((a) => a.name === 'C');
      const nAtom = next.atoms.find((a) => a.name === 'N');
      if (cAtom && nAtom) {
        const bondExists = allBonds.some(
          (b) =>
            (b.atom1 === cAtom.id && b.atom2 === nAtom.id) ||
            (b.atom1 === nAtom.id && b.atom2 === cAtom.id),
        );
        if (!bondExists) {
          allBonds.push({
            id: `pep_${ch.id}_${i}`,
            atom1: cAtom.id,
            atom2: nAtom.id,
            order: 1,
          });
        }
      }
    }
  }

  const updatedMolecule: Molecule = {
    ...molecule,
    chains: newChains,
    allAtoms,
    allBonds,
  };

  return {
    success: true,
    affectedResidueIds: [residueId],
    newAtoms: atoms,
    newBonds: bonds,
  };
}

export function revertMutation(
  molecule: Molecule,
  chainId: string,
  snapshotResidue: Residue,
): MutationResult {
  const chain = molecule.chains.find((c) => c.id === chainId);
  if (!chain) return { success: false, message: '链未找到' };

  const residueIdx = chain.residues.findIndex((r) => r.id === snapshotResidue.id);
  if (residueIdx === -1) return { success: false, message: '残基未找到' };

  const restored = { ...snapshotResidue, isMutated: false };

  const newChains = molecule.chains.map((c) => {
    if (c.id !== chainId) return c;
    const newResidues = [...c.residues];
    newResidues[residueIdx] = restored;
    return { ...c, residues: newResidues };
  });

  const allAtoms: Atom[] = [];
  const allBonds: Bond[] = [];
  for (const ch of newChains) {
    for (const r of ch.residues) {
      allAtoms.push(...r.atoms);
      allBonds.push(...r.bonds);
    }
    for (let i = 0; i < ch.residues.length - 1; i++) {
      const curr = ch.residues[i];
      const next = ch.residues[i + 1];
      const cAtom = curr.atoms.find((a) => a.name === 'C');
      const nAtom = next.atoms.find((a) => a.name === 'N');
      if (cAtom && nAtom) {
        const bondExists = allBonds.some(
          (b) =>
            (b.atom1 === cAtom.id && b.atom2 === nAtom.id) ||
            (b.atom1 === nAtom.id && b.atom2 === cAtom.id),
        );
        if (!bondExists) {
          allBonds.push({
            id: `pep_${ch.id}_${i}`,
            atom1: cAtom.id,
            atom2: nAtom.id,
            order: 1,
          });
        }
      }
    }
  }

  const updatedMolecule: Molecule = {
    ...molecule,
    chains: newChains,
    allAtoms,
    allBonds,
  };

  return {
    success: true,
    affectedResidueIds: [snapshotResidue.id],
    newAtoms: snapshotResidue.atoms,
    newBonds: snapshotResidue.bonds,
  };
}

export function moleculeToPDB(molecule: Molecule): string {
  const lines: string[] = [];
  lines.push(`HEADER    PROTEIN`);
  lines.push(`TITLE     ${molecule.name}`);
  lines.push(`REMARK   Generated by Molecule Visualization Lab`);

  let atomSerial = 1;
  for (const chain of molecule.chains) {
    for (const residue of chain.residues) {
      for (const atom of residue.atoms) {
        const x = atom.x.toFixed(3).padStart(8);
        const y = atom.y.toFixed(3).padStart(8);
        const z = atom.z.toFixed(3).padStart(8);
        const name = (atom.name || 'X').padEnd(4);
        const resName = residue.name.padEnd(3);
        const chainId = chain.id.charAt(0).toUpperCase();
        const resSeq = String(residue.sequenceNumber).padStart(4);
        lines.push(
          `ATOM  ${String(atomSerial).padStart(5)} ${name}${resName} ${chainId}${resSeq}    ${x}${y}${z}  1.00  0.00           ${atom.element}`,
        );
        atomSerial++;
      }
    }
  }
  lines.push('END');
  return lines.join('\n');
}
