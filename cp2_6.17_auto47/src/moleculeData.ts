import { Atom, Bond, Molecule, ElementSymbol, BondType, ELEMENT_INFO } from './types';

let atomIdCounter = 0;
let bondIdCounter = 0;

function nextAtomId(): number {
  return ++atomIdCounter;
}

function nextBondId(): number {
  return ++bondIdCounter;
}

function resetCounters(): void {
  atomIdCounter = 0;
  bondIdCounter = 0;
}

function createAtom(element: ElementSymbol, x: number, y: number, z: number): Atom {
  return { id: nextAtomId(), element, x, y, z };
}

function createBond(atom1: number, atom2: number, type: BondType = 'single'): Bond {
  return { id: nextBondId(), atom1, atom2, type };
}

export const WATER_MOLECULE: Molecule = (() => {
  resetCounters();
  const atoms: Atom[] = [
    createAtom('O', 0, 0, 0),
    createAtom('H', 0.757, 0.586, 0),
    createAtom('H', -0.757, 0.586, 0),
  ];
  const bonds: Bond[] = [
    createBond(atoms[0].id, atoms[1].id, 'single'),
    createBond(atoms[0].id, atoms[2].id, 'single'),
  ];
  return { name: '水', atoms, bonds };
})();

export const CAFFEINE_MOLECULE: Molecule = (() => {
  resetCounters();
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];

  const addAtom = (el: ElementSymbol, x: number, y: number, z: number) => {
    const a = createAtom(el, x, y, z);
    atoms.push(a);
    return a.id;
  };

  const addBond = (a1: number, a2: number, t: BondType = 'single') => {
    bonds.push(createBond(a1, a2, t));
  };

  const n1 = addAtom('N', 0, 1.5, 0);
  const c2 = addAtom('C', 1.2, 1.0, 0);
  const n3 = addAtom('N', 1.8, 0, 0);
  const c4 = addAtom('C', 1.2, -1.2, 0);
  const c5 = addAtom('C', 0, -1.5, 0);
  const c6 = addAtom('C', -1.2, -1.0, 0);
  const n7 = addAtom('N', -1.8, 0, 0);
  const c8 = addAtom('C', -1.2, 1.2, 0);
  const o9 = addAtom('O', -2.0, 2.2, 0);
  const c10 = addAtom('C', 2.2, -2.0, 0);
  const n11 = addAtom('N', 0.8, -2.4, 0);
  const c12 = addAtom('C', 0, -3.0, 0);
  const c13 = addAtom('C', -2.2, -2.0, 0);
  const o14 = addAtom('O', -2.2, -3.2, 0);
  const c15 = addAtom('C', 2.8, 0.8, 0);
  const c16 = addAtom('C', -2.8, 0.8, 0);

  addBond(n1, c2, 'aromatic');
  addBond(c2, n3, 'single');
  addBond(n3, c4, 'aromatic');
  addBond(c4, c5, 'single');
  addBond(c5, c6, 'aromatic');
  addBond(c6, n7, 'single');
  addBond(n7, c8, 'aromatic');
  addBond(c8, n1, 'single');
  addBond(c8, o9, 'double');
  addBond(c4, c10, 'single');
  addBond(c5, n11, 'single');
  addBond(n11, c12, 'single');
  addBond(c6, c13, 'single');
  addBond(c13, o14, 'double');
  addBond(n3, c15, 'single');
  addBond(n7, c16, 'single');

  const hydrogens: [number, number, number][] = [
    [2.8, 0.8, 0.0], [2.8, 1.3, 0.6], [2.8, 1.3, -0.6], [3.5, 0.3, 0],
    [-2.8, 0.8, 0.0], [-2.8, 1.3, 0.6], [-2.8, 1.3, -0.6], [-3.5, 0.3, 0],
    [2.2, -2.8, 0], [2.8, -1.6, 0.6], [2.8, -1.6, -0.6],
    [0, -3.5, 0.6], [0, -3.5, -0.6], [-0.8, -2.8, 0],
  ];
  const hParents = [c15, c15, c15, c15, c16, c16, c16, c16, c10, c10, c10, c12, c12, n11];

  hydrogens.forEach(([x, y, z], i) => {
    const h = addAtom('H', x, y, z);
    addBond(hParents[i], h, 'single');
  });

  return { name: '咖啡因', atoms, bonds };
})();

export const GLUCOSE_MOLECULE: Molecule = (() => {
  resetCounters();
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];

  const addAtom = (el: ElementSymbol, x: number, y: number, z: number) => {
    const a = createAtom(el, x, y, z);
    atoms.push(a);
    return a.id;
  };

  const addBond = (a1: number, a2: number, t: BondType = 'single') => {
    bonds.push(createBond(a1, a2, t));
  };

  const r = 1.5;
  const c1 = addAtom('C', r * Math.cos(0), r * Math.sin(0), 0);
  const c2 = addAtom('C', r * Math.cos(Math.PI / 3), r * Math.sin(Math.PI / 3), 0.3);
  const c3 = addAtom('C', r * Math.cos(2 * Math.PI / 3), r * Math.sin(2 * Math.PI / 3), -0.3);
  const c4 = addAtom('C', r * Math.cos(Math.PI), r * Math.sin(Math.PI), 0.3);
  const c5 = addAtom('C', r * Math.cos(4 * Math.PI / 3), r * Math.sin(4 * Math.PI / 3), -0.3);
  const o5 = addAtom('O', r * Math.cos(5 * Math.PI / 3), r * Math.sin(5 * Math.PI / 3), 0);

  addBond(c1, c2);
  addBond(c2, c3);
  addBond(c3, c4);
  addBond(c4, c5);
  addBond(c5, o5);
  addBond(o5, c1);

  const o1 = addAtom('O', r * Math.cos(0) + 0.5, r * Math.sin(0) + 0.5, 1.0);
  const o2 = addAtom('O', r * Math.cos(Math.PI / 3) + 1.0, r * Math.sin(Math.PI / 3) + 0.3, 0.3);
  const o3 = addAtom('O', r * Math.cos(2 * Math.PI / 3) - 1.0, r * Math.sin(2 * Math.PI / 3) + 0.3, -0.3);
  const o4 = addAtom('O', r * Math.cos(Math.PI) - 0.5, r * Math.sin(Math.PI) + 0.5, 0.3);
  const o6 = addAtom('O', r * Math.cos(4 * Math.PI / 3) - 0.8, r * Math.sin(4 * Math.PI / 3) - 0.3, -1.0);
  const c6 = addAtom('C', r * Math.cos(4 * Math.PI / 3) - 0.3, r * Math.sin(4 * Math.PI / 3) - 0.5, -1.8);

  addBond(c1, o1);
  addBond(c2, o2);
  addBond(c3, o3);
  addBond(c4, o4);
  addBond(c5, c6);
  addBond(c6, o6);

  const hydroxylH = [
    [o1, r * Math.cos(0) + 0.8, r * Math.sin(0) + 0.8, 1.5],
    [o2, r * Math.cos(Math.PI / 3) + 1.6, r * Math.sin(Math.PI / 3) + 0.5, 0.6],
    [o3, r * Math.cos(2 * Math.PI / 3) - 1.6, r * Math.sin(2 * Math.PI / 3) + 0.5, -0.6],
    [o4, r * Math.cos(Math.PI) - 0.8, r * Math.sin(Math.PI) + 0.8, 0.6],
    [o6, r * Math.cos(4 * Math.PI / 3) - 1.3, r * Math.sin(4 * Math.PI / 3) - 0.1, -1.0],
  ] as const;

  hydroxylH.forEach(([parent, x, y, z]) => {
    const h = addAtom('H', x, y, z);
    addBond(parent, h);
  });

  const ringH = [
    [c1, r * Math.cos(0) + 0.3, r * Math.sin(0) - 0.5, -0.8],
    [c2, r * Math.cos(Math.PI / 3) + 0.3, r * Math.sin(Math.PI / 3) - 0.3, -0.8],
    [c3, r * Math.cos(2 * Math.PI / 3) + 0.3, r * Math.sin(2 * Math.PI / 3) - 0.3, -1.2],
    [c4, r * Math.cos(Math.PI) + 0.3, r * Math.sin(Math.PI) - 0.3, -0.8],
    [c5, r * Math.cos(4 * Math.PI / 3) + 0.3, r * Math.sin(4 * Math.PI / 3) + 0.3, 0.5],
    [c6, r * Math.cos(4 * Math.PI / 3) - 0.1, r * Math.sin(4 * Math.PI / 3) - 1.2, -2.2],
    [c6, r * Math.cos(4 * Math.PI / 3) + 0.5, r * Math.sin(4 * Math.PI / 3) - 0.1, -2.2],
  ] as const;

  ringH.forEach(([parent, x, y, z]) => {
    const h = addAtom('H', x, y, z);
    addBond(parent, h);
  });

  return { name: '葡萄糖', atoms, bonds };
})();

interface ParsedAtom {
  element: ElementSymbol;
  index: number;
  bonds: ParsedBond[];
}

interface ParsedBond {
  toIndex: number;
  type: BondType;
}

function isUpperCase(ch: string): boolean {
  return ch >= 'A' && ch <= 'Z';
}

function isLowerCase(ch: string): boolean {
  return ch >= 'a' && ch <= 'z';
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

export function parseSMILES(smiles: string): Molecule {
  resetCounters();
  const atoms: ParsedAtom[] = [];
  const ringClosures: Record<number, { atomIndex: number; type: BondType }> = {};
  let bondType: BondType = 'single';

  const addAtom = (element: ElementSymbol): number => {
    const idx = atoms.length;
    atoms.push({ element, index: idx, bonds: [] });
    return idx;
  };

  const addBond = (from: number, to: number, type: BondType) => {
    if (from === to) return;
    const exists = atoms[from].bonds.some(b => b.toIndex === to);
    if (!exists) {
      atoms[from].bonds.push({ toIndex: to, type });
      atoms[to].bonds.push({ toIndex: from, type });
    }
  };

  const stack: number[] = [];
  let previousAtom = -1;
  let i = 0;

  while (i < smiles.length) {
    const ch = smiles[i];

    if (ch === '(') {
      stack.push(previousAtom);
      i++;
    } else if (ch === ')') {
      previousAtom = stack.pop() ?? -1;
      i++;
    } else if (ch === '=') {
      bondType = 'double';
      i++;
    } else if (ch === '#') {
      bondType = 'double';
      i++;
    } else if (ch === ':') {
      bondType = 'aromatic';
      i++;
    } else if (isDigit(ch)) {
      const ringNum = parseInt(ch);
      if (ringClosures[ringNum] !== undefined) {
        const closure = ringClosures[ringNum];
        addBond(previousAtom, closure.atomIndex, bondType === 'single' ? closure.type : bondType);
        delete ringClosures[ringNum];
      } else {
        ringClosures[ringNum] = { atomIndex: previousAtom, type: bondType };
      }
      bondType = 'single';
      i++;
    } else if (isUpperCase(ch)) {
      let element = ch;
      let j = i + 1;
      if (j < smiles.length && isLowerCase(smiles[j])) {
        element += smiles[j];
        j++;
      }

      if (element === 'Cl' || element === 'Br') {
        // handle
      } else if (element.length > 1) {
        const lower = element.toLowerCase();
        if (lower === 'c') element = 'C';
        else if (lower === 'n') element = 'N';
        else if (lower === 'o') element = 'O';
        else if (lower === 's') element = 'S';
        else if (lower === 'p') element = 'P';
        else if (lower === 'f') element = 'F';
      }

      const aromatic = element === element.toLowerCase() || isLowerCase(smiles[i]);
      const el = element.toUpperCase() as ElementSymbol;
      const idx = addAtom(el);

      if (previousAtom >= 0) {
        const bType = aromatic && bondType === 'single' ? 'aromatic' : bondType;
        addBond(previousAtom, idx, bType);
      }

      previousAtom = idx;
      bondType = 'single';
      i = j;
    } else if (isLowerCase(ch)) {
      const aromaticElement = ch.toUpperCase() as ElementSymbol;
      const idx = addAtom(aromaticElement);

      if (previousAtom >= 0) {
        addBond(previousAtom, idx, 'aromatic');
      }

      previousAtom = idx;
      bondType = 'single';
      i++;
    } else if (ch === '[') {
      let j = i + 1;
      while (j < smiles.length && smiles[j] !== ']') j++;
      const inside = smiles.substring(i + 1, j);
      let element = inside[0];
      if (inside.length > 1 && isLowerCase(inside[1])) {
        element = inside.substring(0, 2);
      }
      const el = element.toUpperCase() as ElementSymbol;
      const idx = addAtom(el);

      if (previousAtom >= 0) {
        addBond(previousAtom, idx, bondType);
      }

      previousAtom = idx;
      bondType = 'single';
      i = j + 1;
    } else {
      i++;
    }
  }

  const atomMap = new Map<number, Atom>();
  const resultAtoms: Atom[] = [];
  const positions = generate3DPositions(atoms);

  atoms.forEach((parsed, idx) => {
    const pos = positions[idx];
    const a = createAtom(parsed.element, pos.x, pos.y, pos.z);
    atomMap.set(idx, a);
    resultAtoms.push(a);
  });

  const resultBonds: Bond[] = [];
  const added = new Set<string>();

  atoms.forEach((parsed, fromIdx) => {
    parsed.bonds.forEach(bond => {
      const key = [Math.min(fromIdx, bond.toIndex), Math.max(fromIdx, bond.toIndex)].join('-');
      if (!added.has(key)) {
        added.add(key);
        const a1 = atomMap.get(fromIdx)!;
        const a2 = atomMap.get(bond.toIndex)!;
        resultBonds.push(createBond(a1.id, a2.id, bond.type));
      }
    });
  });

  return { name: 'SMILES分子', atoms: resultAtoms, bonds: resultBonds };
}

function generate3DPositions(atoms: ParsedAtom[]): { x: number; y: number; z: number }[] {
  const positions: { x: number; y: number; z: number }[] = atoms.map(() => ({ x: 0, y: 0, z: 0 }));
  const bondLength = 2.0;
  const visited = new Set<number>();

  if (atoms.length === 0) return positions;

  const queue: number[] = [0];
  visited.add(0);
  positions[0] = { x: 0, y: 0, z: 0 };

  const angles: Record<number, number> = {};
  angles[0] = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = atoms[current].bonds
      .map(b => b.toIndex)
      .filter(n => !visited.has(n));

    const baseAngle = angles[current] ?? 0;
    const angleStep = (2 * Math.PI) / Math.max(neighbors.length, 1);

    neighbors.forEach((neighbor, idx) => {
      const angle = baseAngle + idx * angleStep + Math.PI / 2;
      const parentPos = positions[current];

      positions[neighbor] = {
        x: parentPos.x + bondLength * Math.cos(angle),
        y: parentPos.y + bondLength * Math.sin(angle),
        z: parentPos.z + (Math.random() - 0.5) * 0.5,
      };

      angles[neighbor] = angle + Math.PI;
      visited.add(neighbor);
      queue.push(neighbor);
    });
  }

  relaxPositions(positions, atoms, 50);

  const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
  const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
  const cz = positions.reduce((s, p) => s + p.z, 0) / positions.length;
  positions.forEach(p => {
    p.x -= cx;
    p.y -= cy;
    p.z -= cz;
  });

  return positions;
}

function relaxPositions(
  positions: { x: number; y: number; z: number }[],
  atoms: ParsedAtom[],
  iterations: number
) {
  const idealBondLength = 2.0;
  const k = 0.1;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = positions.map(() => ({ x: 0, y: 0, z: 0 }));

    atoms.forEach((atom, i) => {
      atom.bonds.forEach(bond => {
        const j = bond.toIndex;
        if (i < j) {
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const dz = positions[j].z - positions[i].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
          const diff = dist - idealBondLength;
          const fx = (dx / dist) * diff * k;
          const fy = (dy / dist) * diff * k;
          const fz = (dz / dist) * diff * k;

          forces[i].x += fx;
          forces[i].y += fy;
          forces[i].z += fz;
          forces[j].x -= fx;
          forces[j].y -= fy;
          forces[j].z -= fz;
        }
      });
    });

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dz = positions[j].z - positions[i].z;
        const dist2 = dx * dx + dy * dy + dz * dz;
        const minDist2 = 1.5 * 1.5;

        if (dist2 < minDist2 && dist2 > 0.0001) {
          const dist = Math.sqrt(dist2);
          const repel = (minDist2 - dist2) / minDist2 * 0.05;
          const fx = (dx / dist) * repel;
          const fy = (dy / dist) * repel;
          const fz = (dz / dist) * repel;

          forces[i].x -= fx;
          forces[i].y -= fy;
          forces[i].z -= fz;
          forces[j].x += fx;
          forces[j].y += fy;
          forces[j].z += fz;
        }
      }
    }

    positions.forEach((pos, i) => {
      pos.x += forces[i].x;
      pos.y += forces[i].y;
      pos.z += forces[i].z;
    });
  }
}

export function calculateFormula(atoms: Atom[]): string {
  const count: Record<string, number> = {};
  atoms.forEach(a => {
    count[a.element] = (count[a.element] ?? 0) + 1;
  });

  const order = ['C', 'H', 'N', 'O', 'S', 'P', 'F', 'Cl'];
  let formula = '';
  order.forEach(el => {
    if (count[el]) {
      formula += el + (count[el] > 1 ? count[el] : '');
    }
  });

  Object.keys(count).forEach(el => {
    if (!order.includes(el)) {
      formula += el + (count[el] > 1 ? count[el] : '');
    }
  });

  return formula;
}

export function calculateMass(atoms: Atom[]): number {
  return atoms.reduce((sum, a) => sum + ELEMENT_INFO[a.element].mass, 0);
}
