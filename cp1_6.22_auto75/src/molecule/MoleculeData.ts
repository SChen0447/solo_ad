export interface AtomData {
  element: string;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
}

export interface BondData {
  atom1: number;
  atom2: number;
}

export interface MoleculeData {
  atoms: AtomData[];
  bonds: BondData[];
}

const ELEMENT_PROPS: Record<string, { radius: number; color: string; name: string }> = {
  C: { radius: 0.4, color: '#808080', name: '碳' },
  H: { radius: 0.25, color: '#ffffff', name: '氢' },
  O: { radius: 0.35, color: '#ff0000', name: '氧' },
  N: { radius: 0.35, color: '#0000ff', name: '氮' }
};

function createAtom(element: string, x: number, y: number, z: number, index: number): AtomData {
  const props = ELEMENT_PROPS[element];
  return {
    element,
    name: `${props.name}${index}`,
    x,
    y,
    z,
    radius: props.radius,
    color: props.color
  };
}

export const CAFFEINE_MOLECULE: MoleculeData = (() => {
  const atoms: AtomData[] = [];
  let cIdx = 1, hIdx = 1, nIdx = 1, oIdx = 1;

  const addAtom = (element: string, x: number, y: number, z: number): number => {
    let idx: number;
    if (element === 'C') idx = cIdx++;
    else if (element === 'H') idx = hIdx++;
    else if (element === 'N') idx = nIdx++;
    else idx = oIdx++;
    atoms.push(createAtom(element, x, y, z, idx));
    return atoms.length - 1;
  };

  // 咖啡因分子 (C8H10N4O2) - 优化的3D坐标
  // 嘌呤双环系统 + 两个羰基氧 + 三个甲基

  // 六元环 (嘧啶环) - 原子 N1, C2, N3, C4, C5, C6
  const N1  = addAtom('N',  0.000,  1.350,  0.000);
  const C2  = addAtom('C',  1.200,  0.800,  0.000);
  const N3  = addAtom('N',  1.200, -0.600,  0.000);
  const C4  = addAtom('C',  0.000, -1.200,  0.000);
  const C5  = addAtom('C', -1.200, -0.600,  0.000);
  const C6  = addAtom('C', -1.200,  0.800,  0.000);

  // 五元环 (咪唑环) - 原子 N7, C8, N9 (连接C4, C5)
  const N7  = addAtom('N', -2.400,  1.400,  0.100);
  const C8  = addAtom('C', -2.300, -1.300, -0.100);
  const N9  = addAtom('N', -1.000, -2.200, -0.100);

  // 甲基和羰基取代基
  const C10 = addAtom('C',  0.000,  2.850,  0.050); // N1上的甲基
  const C11 = addAtom('C',  2.550, -1.200,  0.000); // N3上的甲基
  const C12 = addAtom('C', -3.750, -0.800, -0.150); // N9上的甲基
  const O13 = addAtom('O',  2.250,  1.500,  0.050); // C2上的羰基氧
  const O14 = addAtom('O', -2.100, -3.300, -0.200); // C8上的羰基氧

  // N1甲基上的氢
  addAtom('H',  0.900,  3.250, -0.450);
  addAtom('H', -0.050,  3.300,  1.050);
  addAtom('H', -0.900,  3.200, -0.500);

  // N3甲基上的氢
  addAtom('H',  2.550, -2.200, -0.400);
  addAtom('H',  3.150, -0.500, -0.550);
  addAtom('H',  2.900, -1.250,  1.000);

  // N9甲基上的氢
  addAtom('H', -4.300, -1.500,  0.500);
  addAtom('H', -4.150, -0.900, -1.150);
  addAtom('H', -3.800,  0.200,  0.350);

  // C6上的氢 (连接N7的碳)
  addAtom('H', -0.500,  1.550,  0.000);

  // 化学键
  const bonds: BondData[] = [
    // 六元环
    { atom1: N1, atom2: C2 },
    { atom1: C2, atom2: N3 },
    { atom1: N3, atom2: C4 },
    { atom1: C4, atom2: C5 },
    { atom1: C5, atom2: C6 },
    { atom1: C6, atom2: N1 },
    // 五元环
    { atom1: C4, atom2: N9 },
    { atom1: N9, atom2: C8 },
    { atom1: C8, atom2: N7 },
    { atom1: N7, atom2: C6 },
    { atom1: C5, atom2: C8 },
    // 甲基
    { atom1: N1, atom2: C10 },
    { atom1: N3, atom2: C11 },
    { atom1: N9, atom2: C12 },
    // 羰基
    { atom1: C2, atom2: O13 },
    { atom1: C8, atom2: O14 },
    // N1甲基氢
    { atom1: C10, atom2: 14 },
    { atom1: C10, atom2: 15 },
    { atom1: C10, atom2: 16 },
    // N3甲基氢
    { atom1: C11, atom2: 17 },
    { atom1: C11, atom2: 18 },
    { atom1: C11, atom2: 19 },
    // N9甲基氢
    { atom1: C12, atom2: 20 },
    { atom1: C12, atom2: 21 },
    { atom1: C12, atom2: 22 },
    // C6氢
    { atom1: N7, atom2: 23 }
  ];

  return { atoms, bonds };
})();
