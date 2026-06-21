import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { Atom, Bond, Residue } from '@/types';

interface BondMeshProps {
  bonds: Bond[];
  atoms: Atom[];
  residues: Residue[];
  transitionProgress: number;
}

export function BondMesh({ bonds, atoms, residues, transitionProgress }: BondMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const atomMap = useMemo(() => new Map(atoms.map(a => [a.id, a])), [atoms]);
  const residueMap = useMemo(() => new Map(residues.map(r => [r.id, r])), [residues]);

  const bondData = useMemo(() => {
    return bonds.map(bond => {
      const atom1 = atomMap.get(bond.atom1Id);
      const atom2 = atomMap.get(bond.atom2Id);
      if (!atom1 || !atom2) return null;

      const residue1 = residueMap.get(atom1.residueId);
      const residue2 = residueMap.get(atom2.residueId);

      let x1 = atom1.x, y1 = atom1.y, z1 = atom1.z;
      let x2 = atom2.x, y2 = atom2.y, z2 = atom2.z;

      if (residue1 && residue1.cartoonPosition) {
        const t = transitionProgress;
        x1 = atom1.x + (residue1.cartoonPosition[0] - atom1.x) * t;
        y1 = atom1.y + (residue1.cartoonPosition[1] - atom1.y) * t;
        z1 = atom1.z + (residue1.cartoonPosition[2] -